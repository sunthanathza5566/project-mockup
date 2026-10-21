/**
 * Offline deterministic provider — ไม่ใช้เครือข่าย/LLM · ผลลัพธ์เหมือนเดิมทุกครั้งสำหรับ input เดียวกัน
 * ใช้เดโม่และเป็น fallback เมื่อไม่มี API key · ทุกข้อความที่สร้างมาจาก input เท่านั้น (extractive/template)
 */
import type { PdcaStage, Requirement } from '../../types';
import { extractCitations, splitSentences, uncitedSentences } from '../../utils/text';
import { BLOOM_NAME_EN, BLOOM_NAME_TH, analyzeVerbs, suggestVerbs } from './bloom';
import type {
  AiProvider, DraftInput, DraftOutput, EvidenceDigest, FiveW1H, InterviewGroup, ReviewInput, ReviewOutput, SummaryInput,
  SummaryOutput, TagInput, TagOutput, TranslateInput, TranslateOutput, VerbInput, VerbOutput,
} from './provider';
import { applyGlossary } from './glossary';

// ─── tokenize ────────────────────────────────────────────────────────────
type Segmenter = new (l: string, o: object) => { segment(s: string): Iterable<{ segment: string; isWordLike?: boolean }> };

export function tokenize(text: string): string[] {
  const t = (text || '').toLowerCase().replace(/\[e-\d+\.\d+-\d{2,}\]/g, ' ');
  const Seg = (Intl as unknown as { Segmenter?: Segmenter }).Segmenter;
  let raw: string[];
  if (Seg) {
    raw = [];
    for (const s of new Seg('th', { granularity: 'word' }).segment(t)) if (s.isWordLike) raw.push(s.segment);
  } else raw = t.split(/[^\p{L}\p{N}]+/u);
  return raw.filter(w => w.length >= 2 && !/\d/.test(w));
}

// ─── AI-1 tagging ────────────────────────────────────────────────────────
interface Profile { req: Requirement; weights: Map<string, number> }
const profileCache = new WeakMap<Requirement[], { profiles: Profile[]; idf: Map<string, number> }>();

function buildProfiles(reqs: Requirement[]) {
  const hit = profileCache.get(reqs);
  if (hit) return hit;
  const profiles: Profile[] = reqs.map(req => {
    const w = new Map<string, number>();
    const add = (text: string, weight: number) => tokenize(text).forEach(t => w.set(t, Math.max(w.get(t) ?? 0, weight)));
    req.suggestedEvidence.forEach(s => add(s, 3));
    add(req.textTh, 1.5); add(req.textEn, 1.5); add(req.plainTh, 1.5);
    req.diagnosticQuestions.forEach(q => add(q, 1));
    add(req.tipTh, 0.5);
    return { req, weights: w };
  });
  const df = new Map<string, number>();
  profiles.forEach(p => p.weights.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const idf = new Map<string, number>();
  df.forEach((n, t) => idf.set(t, Math.log(1 + reqs.length / n)));
  const built = { profiles, idf };
  profileCache.set(reqs, built);
  return built;
}

const PDCA_KEYWORDS: Record<PdcaStage, string[]> = {
  P: ['นโยบาย', 'แผน', 'วัตถุประสงค์', 'กำหนด', 'ยุทธศาสตร์', 'ประกาศ', 'plan', 'policy', 'objective', 'strategy', 'จัดทำแผน', 'เป้าหมาย'],
  D: ['ดำเนินการ', 'จัดกิจกรรม', 'อบรม', 'ประชุม', 'โครงการ', 'implemented', 'conducted', 'workshop', 'จัดการเรียน', 'ปฏิบัติ'],
  C: ['ผลการประเมิน', 'ผลสำรวจ', 'ความพึงพอใจ', 'ติดตาม', 'ตรวจสอบ', 'ทบทวน', 'สถิติ', 'survey', 'evaluation', 'review', 'monitor', 'ร้อยละ', 'วิเคราะห์'],
  A: ['ปรับปรุง', 'แก้ไข', 'พัฒนา', 'ข้อเสนอแนะ', 'improvement', 'action', 'revised', 'ปรับแผน', 'ปรับหลักสูตร', 'นำผล'],
};
const PDCA_LABEL_TH: Record<PdcaStage, string> = { P: 'วางแผน (Plan)', D: 'ดำเนินการ (Do)', C: 'ตรวจสอบ (Check)', A: 'ปรับปรุง (Act)' };
const PDCA_LABEL_EN: Record<PdcaStage, string> = { P: 'Plan', D: 'Do', C: 'Check', A: 'Act' };

function extractiveSummary(text: string, title: string): string {
  const sents = splitSentences(text).filter(s => s.length >= 15);
  if (!sents.length) return title ? `หลักฐาน: ${title}` : 'ไม่มีข้อความให้สรุป';
  let out = '';
  for (const s of sents.slice(0, 3)) { if ((out + ' ' + s).length > 320) break; out = (out ? out + ' ' : '') + s; }
  return out || sents[0].slice(0, 320);
}

async function tagEvidence(i: TagInput): Promise<TagOutput> {
  const { profiles, idf } = buildProfiles(i.requirements);
  const docTokens = new Set(tokenize(`${i.title} ${i.title} ${i.text}`));
  const scored = profiles.map(p => {
    let score = 0; const hits: [string, number][] = [];
    docTokens.forEach(t => {
      const w = p.weights.get(t);
      if (w) { const s = w * (idf.get(t) ?? 1); score += s; hits.push([t, s]); }
    });
    hits.sort((a, b) => b[1] - a[1]);
    return { id: p.req.id, score, terms: hits.slice(0, 3).map(h => h[0]) };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true }));

  const suggestions = scored.slice(0, 3).map(s => ({
    requirementId: s.id,
    confidence: Math.round(Math.min(0.95, s.score / (s.score + 8)) * 100) / 100, // heuristic
    reasons: [`คำที่ตรงกับข้อ ${s.id}: ${s.terms.join(', ')}`],
  }));

  const lower = `${i.title} ${i.text}`.toLowerCase();
  const counts = (Object.keys(PDCA_KEYWORDS) as PdcaStage[]).map(st => ({ st, n: PDCA_KEYWORDS[st].filter(k => lower.includes(k)).length }));
  const best = counts.reduce((a, b) => (b.n > a.n ? b : a), { st: i.currentPdca, n: 0 });
  return {
    summary: extractiveSummary(i.text, i.title), suggestions,
    pdcaStage: best.n > 0 ? best.st : i.currentPdca,
    pdcaReason: best.n > 0 ? `พบคำที่บ่งชี้ขั้น ${best.st} จำนวน ${best.n} คำ` : 'ไม่พบคำบ่งชี้ชัดเจน คงขั้นเดิมที่ระบุไว้',
  };
}

// ─── AI-2 drafting ───────────────────────────────────────────────────────
const ORDER: PdcaStage[] = ['P', 'D', 'C', 'A'];

function oneSentence(ev: EvidenceDigest): string {
  const base = (ev.summary || ev.title).replace(/\[E-\d+\.\d+-\d{2,}\]/g, '').replace(/\s+/g, ' ').trim();
  const first = splitSentences(base)[0] ?? base;
  return first.length > 240 ? first.slice(0, 240).trimEnd() + '…' : first;
}

async function draftSar(i: DraftInput): Promise<DraftOutput> {
  const lines: string[] = [];
  const missing: string[] = [];
  const used: string[] = [];
  const th = i.language === 'th';
  for (const st of ORDER) {
    const evs = i.evidence.filter(e => e.pdca === st);
    if (!evs.length) {
      missing.push(th ? `ยังไม่มีหลักฐานขั้น ${PDCA_LABEL_TH[st]}` : `No evidence yet for ${PDCA_LABEL_EN[st]}`);
      continue;
    }
    const label = th ? PDCA_LABEL_TH[st] : PDCA_LABEL_EN[st];
    evs.forEach((e, idx) => {
      lines.push(`${idx === 0 ? label + ': ' : ''}${oneSentence(e)} [${e.code}]`);
      used.push(e.code);
    });
  }
  // metric: ใส่เฉพาะเมื่อมีหลักฐานสถิติรองรับ (ต้องอ้างรหัสได้)
  const stat = i.evidence.find(e => e.kind === 'statistics');
  if (i.metrics.length) {
    if (stat) {
      i.metrics.slice(0, 6).forEach(m =>
        lines.push(th ? `ตัวชี้วัด ${m.nameTh} ปี ${m.period} เท่ากับ ${m.value} ${m.unit} [${stat.code}]`
                      : `Indicator ${m.code} for ${m.period} is ${m.value} ${m.unit} [${stat.code}]`));
      if (!used.includes(stat.code)) used.push(stat.code);
    } else missing.push(th ? 'มีข้อมูล metric แต่ไม่มีหลักฐานประเภทสถิติรองรับ จึงยังไม่ใส่ในร่าง' : 'Metrics exist but no statistics evidence to cite');
  }
  // หลักฐานแนะนำที่ยังไม่พบ (เทียบด้วยคำ)
  const evTokens = new Set(tokenize(i.evidence.map(e => `${e.title} ${e.summary}`).join(' ')));
  for (const sug of i.requirement.suggestedEvidence) {
    const toks = tokenize(sug);
    if (toks.length && !toks.some(t => evTokens.has(t))) missing.push(th ? `หลักฐานแนะนำที่ยังไม่พบ: ${sug}` : `Suggested evidence not found: ${sug}`);
  }
  if (!lines.length) missing.unshift(th ? 'ยังไม่มีหลักฐานผูกกับข้อนี้ จึงไม่สามารถร่างได้' : 'No evidence linked; cannot draft');
  return { draft: lines.join('\n'), missing, usedEvidence: used };
}

// ─── AI-3 reviewing ──────────────────────────────────────────────────────
async function reviewSar(i: ReviewInput): Promise<ReviewOutput> {
  const nTokens = new Set(tokenize(i.narrative));
  const unanswered: string[] = [];
  for (const q of i.requirement.diagnosticQuestions.slice(0, 6)) {
    const qt = Array.from(new Set(tokenize(q)));
    if (!qt.length) continue;
    const cov = qt.filter(t => nTokens.has(t)).length / qt.length;
    if (cov < 0.25) unanswered.push(q);
  }
  const unc = uncitedSentences(i.narrative).slice(0, 5);
  const suggestions: string[] = [];
  const pd = i.pdca;
  const stages: [boolean, PdcaStage][] = [[pd.plan, 'P'], [pd.do, 'D'], [pd.check, 'C'], [pd.act, 'A']];
  stages.forEach(([flag, st]) => {
    const has = i.evidence.some(e => e.pdca === st);
    if (flag && !has) suggestions.push(`ติ๊ก ${PDCA_LABEL_TH[st]} ไว้ แต่ยังไม่มีหลักฐานขั้นนี้ผูกอยู่`);
    if (!flag && has) suggestions.push(`มีหลักฐานขั้น ${PDCA_LABEL_TH[st]} แล้ว แต่ narrative/เช็กลิสต์ยังไม่ครอบคลุมขั้นนี้`);
  });
  // ใช้ผล gap rules ของข้อนี้
  i.gaps.forEach(g => suggestions.push(`[${g.ruleId}] ${g.messageTh}`));
  const cited = extractCitations(i.narrative);
  if (i.narrative.trim() && cited.length === 0) suggestions.push('narrative ยังไม่อ้างรหัสหลักฐาน [E-…] เลย');
  return { unanswered, uncitedSentences: unc, suggestions };
}

// ─── AI-7 verb checker ───────────────────────────────────────────────────
async function checkVerbs(i: VerbInput): Promise<VerbOutput> {
  return {
    results: i.items.map(it => {
      const a = analyzeVerbs(it.textTh, it.textEn);
      const base = { id: it.id, code: it.code, kind: it.kind, verbs: a.hits.map(h => h.verb), detectedLevels: a.levels, declaredLevel: it.declaredLevel, measurable: a.measurable };
      if (!a.measurable) {
        return { ...base, levelMatch: null, suggestions: suggestVerbs(it.declaredLevel),
          note: a.vague.length ? `พบคำที่วัดผลยาก (${a.vague.join(', ')}) และไม่พบคำกริยาตามระดับ Bloom` : 'ไม่พบคำกริยาตามระดับ Bloom ในข้อความ' };
      }
      const match = a.levels.includes(it.declaredLevel);
      if (!match) {
        return { ...base, levelMatch: false, suggestions: suggestVerbs(it.declaredLevel),
          note: `ระดับที่ระบุ ${it.declaredLevel} (${BLOOM_NAME_TH[it.declaredLevel] ?? '-'}) แต่คำกริยาที่พบอยู่ระดับ ${a.levels.join(', ')}` };
      }
      if (a.vague.length) {
        return { ...base, levelMatch: true, suggestions: suggestVerbs(it.declaredLevel),
          note: `ระดับตรงกัน แต่มีคำที่วัดผลยาก (${a.vague.join(', ')}) ควรใช้คำกริยาที่วัดได้` };
      }
      return { ...base, levelMatch: true, suggestions: [], note: `คำกริยาตรงกับระดับ ${it.declaredLevel} (${BLOOM_NAME_EN[it.declaredLevel] ?? '-'})` };
    }),
  };
}

// ─── AI-9 assessor summary + interview questions ─────────────────────────
const W_ORDER: FiveW1H[] = ['What', 'Why', 'Who', 'When', 'Where', 'How'];
const GROUPS: InterviewGroup[] = ['lecturer', 'student', 'alumni', 'employer'];

/** แม่แบบคำถามต่อกลุ่มผู้ให้ข้อมูล — {t} = ใจความของข้อ (plainTh ที่อยู่ใน input) */
const Q_TEMPLATE: Record<InterviewGroup, Record<FiveW1H, string>> = {
  lecturer: {
    What: 'หลักสูตรมีนโยบายหรือแผนอะไรในเรื่อง "{t}" และอาจารย์นำไปปฏิบัติอย่างไร',
    Why: 'เหตุใดหลักสูตรจึงเลือกแนวทางนี้ในเรื่อง "{t}" มีข้อมูลหรือข้อเสนอแนะใดรองรับ',
    Who: 'ใครเป็นผู้รับผิดชอบเรื่อง "{t}" และมีส่วนร่วมของผู้เกี่ยวข้องอย่างไร',
    When: 'เรื่อง "{t}" ทบทวนหรือปรับปรุงล่าสุดเมื่อใด และมีรอบการทบทวนอย่างไร',
    Where: 'ขอดูหลักฐานของเรื่อง "{t}" ได้จากที่ใด และเก็บไว้ที่ใด',
    How: 'ติดตามผลเรื่อง "{t}" อย่างไร และนำผลไปปรับปรุงอย่างไร (Check/Act)',
  },
  student: {
    What: 'นักศึกษาได้รับรู้หรือได้รับสิ่งใดเกี่ยวกับเรื่อง "{t}" บ้าง',
    Why: 'นักศึกษาเห็นว่าสิ่งที่หลักสูตรทำในเรื่อง "{t}" มีประโยชน์ต่อการเรียนอย่างไร',
    Who: 'นักศึกษาติดต่อใครเมื่อมีปัญหาเกี่ยวกับเรื่อง "{t}"',
    When: 'นักศึกษาได้รับข้อมูลหรือความช่วยเหลือเรื่อง "{t}" เมื่อใด ทันเวลาหรือไม่',
    Where: 'นักศึกษาหาข้อมูลเรื่อง "{t}" ได้จากช่องทางใด',
    How: 'เคยให้ข้อเสนอแนะเรื่อง "{t}" อย่างไร และเห็นการปรับปรุงหรือไม่',
  },
  alumni: {
    What: 'สิ่งที่เรียนในหลักสูตรเกี่ยวกับเรื่อง "{t}" ช่วยการทำงานของศิษย์เก่าอย่างไร',
    Why: 'เหตุใดศิษย์เก่าเห็นว่าเรื่อง "{t}" ควรคงไว้หรือปรับปรุง',
    Who: 'หลักสูตรเคยสอบถามความเห็นศิษย์เก่าเรื่อง "{t}" จากใครบ้าง',
    When: 'ศิษย์เก่าได้ให้ความเห็นเรื่อง "{t}" กับหลักสูตรครั้งล่าสุดเมื่อใด',
    Where: 'ศิษย์เก่านำสิ่งที่เรียนเรื่อง "{t}" ไปใช้ในที่ทำงานตรงจุดใด',
    How: 'ศิษย์เก่าเห็นว่าหลักสูตรควรปรับปรุงเรื่อง "{t}" อย่างไร',
  },
  employer: {
    What: 'บัณฑิตที่ทำงานกับท่านมีความสามารถที่เกี่ยวกับเรื่อง "{t}" อย่างไร',
    Why: 'เหตุใดท่านจึงเห็นว่าเรื่อง "{t}" สำคัญต่อสถานประกอบการ',
    Who: 'ใครในองค์กรประเมินบัณฑิตในเรื่อง "{t}" และใช้เกณฑ์อะไร',
    When: 'หลักสูตรสอบถามความเห็นของท่านเรื่อง "{t}" บ่อยแค่ไหน ครั้งล่าสุดเมื่อใด',
    Where: 'ท่านพบช่องว่างของบัณฑิตเรื่อง "{t}" ในงานด้านใดบ้าง',
    How: 'ท่านอยากให้หลักสูตรปรับปรุงเรื่อง "{t}" อย่างไร',
  },
};

async function summarizeCriterion(i: SummaryInput): Promise<SummaryOutput> {
  const summaries = i.requirements.map(r => {
    const sents = splitSentences(r.narrative).filter(s => s.length >= 10);
    const summary = sents.length ? sents.slice(0, 2).join(' ') : 'ยังไม่มี narrative ในข้อนี้';
    const strengths: string[] = [];
    const concerns: string[] = [];
    const stages: [boolean, PdcaStage][] = [[r.pdca.plan, 'P'], [r.pdca.do, 'D'], [r.pdca.check, 'C'], [r.pdca.act, 'A']];
    const covered = stages.filter(([f, st]) => f && r.evidence.some(e => e.pdca === st)).map(([, st]) => PDCA_LABEL_TH[st]);
    if (covered.length) strengths.push(`มีทั้งเช็กลิสต์และหลักฐานรองรับขั้น ${covered.join(', ')}`);
    if (r.evidence.length && extractCitations(r.narrative).length) strengths.push('narrative อ้างรหัสหลักฐานได้');
    stages.filter(([f, st]) => !r.evidence.some(e => e.pdca === st) && f).forEach(([, st]) => concerns.push(`ติ๊ก ${PDCA_LABEL_TH[st]} แต่ไม่พบหลักฐานขั้นนี้`));
    if (!r.evidence.length) concerns.push('ไม่มีหลักฐานผูกกับข้อนี้');
    r.gaps.forEach(g => concerns.push(g));
    return { requirementId: r.id, summary, strengths, concerns };
  });
  const questions = GROUPS.map((group, gi) => ({
    group,
    items: i.requirements.map((r, ri) => {
      const w = W_ORDER[(ri + gi) % W_ORDER.length];
      return { w, requirementId: r.id, question: `ข้อ ${r.id}: ${Q_TEMPLATE[group][w].replace('{t}', (r.plainTh || r.textTh).replace(/[".]+$/g, '').slice(0, 120))}` };
    }),
  }));
  // ข้อที่มี gap ด้านหลักฐาน → ถามอาจารย์เพิ่มเรื่องหลักฐาน (ใช้ diagnostic question เดิมของข้อ)
  i.requirements.filter(r => r.gaps.length && r.diagnosticQuestions.length).forEach(r =>
    questions[0].items.push({ w: 'How', requirementId: r.id, question: `ข้อ ${r.id}: ${r.diagnosticQuestions[0]}` }));
  return { summaries, questions };
}

// ─── AI-4 translate (offline: แทนศัพท์ glossary เท่านั้น ไม่แต่งเนื้อหา) ───
export const OFFLINE_TRANSLATE_LABEL = '[ต้องแปลต่อโดยผู้ใช้ — แทนเฉพาะศัพท์ AUN-QA / needs human translation; glossary terms only]';

async function translate(i: TranslateInput): Promise<TranslateOutput> {
  const r = applyGlossary(i.text, i.from);
  return { translation: `${OFFLINE_TRANSLATE_LABEL}
${r.text}`, needsHumanTranslation: true };
}

export const offlineProvider: AiProvider = {
  id: 'offline', model: 'offline-deterministic', promptVersion: 'offline-v2',
  tagEvidence, draftSar, reviewSar, checkVerbs, summarizeCriterion, translate,
};
