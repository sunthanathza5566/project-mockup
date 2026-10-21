/**
 * AI service กลาง (spec 7): redact → provider → post-check → บันทึก AiRun → ผู้ใช้กดยอมรับ (acceptAiRun)
 * ข้อห้าม (บังคับด้วยโครงสร้างโค้ด):
 *  - ไฟล์นี้ไม่ import transitionCycle/transitionSection/setCommitteeRating → AI เปลี่ยน state/ให้คะแนนไม่ได้
 *  - ข้อมูลที่ส่งเข้า provider ผ่าน redactDeep เสมอ
 *  - ผลลัพธ์เป็น "ข้อเสนอ" จนกว่า acceptAiRun โดยมนุษย์ที่มีสิทธิ์
 * เคารพ university.aiEnabled
 * Provider: Claude (ผ่าน app/api/ai เมื่อ server มี ANTHROPIC_API_KEY) → ไม่มี/ล้มเหลว = offline เสมอ · post-check ทำที่นี่เหมือนกันทุก provider
 * TODO(PostgreSQL): ai_runs
 */
import type {
  AiFeature, AiRun, AppUser, Evidence, EvidenceLink, Gap, MetricValue, PdcaStage, PostCheckResult, Rating, SarSection,
} from '../types';
import { newId, sha256Hex, stableStringify } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { extractedTextOf as getExtractedText } from './evidence-text.internal';
import { linkEvidence, setAiSummary } from './evidence.store';
import { loadCurriculumRaw } from './curriculum-data.internal';
import { loadGapInput } from './dashboard';
import { getMetricDefinition } from './metrics.store';
import { getRequirement, listCriteria, listRequirements } from './framework';
import { computeGaps } from './gap';
import { getProgramme, getUniversity, programmeScope } from './org.store';
import { can } from './rbac';
import { citableCodes, saveSection, sectionIdOf } from './sar.store';
import { cycleScope, getCycleRaw } from './workflow';
import { redactDeep } from './ai/redact';
import { findGlossaryHits } from './ai/glossary';
import { extractCitations, extractNumbers } from '../utils/text';
import { mergePostChecks, postCheckText, stripJudgement } from './ai/postcheck';
import { claudeProvider, shouldUseClaude } from './ai/claude';
import { offlineProvider } from './ai/offline';
import type {
  AiProvider, DraftOutput, EvidenceDigest, TranslateInput, TranslateOutput, MetricDigest, ReviewOutput, SummaryInput, SummaryOutput, TagOutput, VerbInput, VerbItem, VerbOutput,
} from './ai/provider';

/** browser จริง → claudeProvider (fallback offline ในตัวเมื่อ server ไม่มี key/ล้มเหลว) · test/SSR → offline */
export function getProvider(): AiProvider { return shouldUseClaude() ? claudeProvider : offlineProvider; }

function assertAiEnabled(universityId: string) {
  if (getUniversity(universityId)?.aiEnabled === false)
    throw new AunqaError('ai_disabled', 'มหาวิทยาลัยของคุณปิดการใช้ AI อยู่');
}

function saveRun(run: AiRun): AiRun {
  const rows = load<AiRun>(KEYS.aiRuns);
  rows.push(run);
  save(KEYS.aiRuns, rows);
  return run;
}

/** programmeId ของ run (จาก cycle ก่อน ไม่งั้นจาก evidence) — ให้ audit.view ระดับหลักสูตรมองเห็น */
function programmeOfRun(refs: { cycleId?: string; evidenceId?: string; programmeId?: string }): string | undefined {
  if (refs.programmeId) return refs.programmeId;
  if (refs.cycleId) return getCycleRaw(refs.cycleId).programmeId;
  if (refs.evidenceId) return load<Evidence>(KEYS.evidence).find(e => e.id === refs.evidenceId)?.programmeId;
  return undefined;
}

async function finalize(
  actor: AppUser, feature: AiFeature, universityId: string, ctx: Record<string, unknown>,
  refs: { cycleId?: string; requirementId?: string; evidenceId?: string; programmeId?: string; codes: string[] },
  redactionCount: number, output: unknown, postCheck: PostCheckResult, started: number,
): Promise<AiRun> {
  const p = getProvider();
  const run = saveRun({
    id: newId('air'), universityId, feature, promptVersion: p.promptVersion, model: p.model,
    cycleId: refs.cycleId, requirementId: refs.requirementId, evidenceId: refs.evidenceId, programmeId: refs.programmeId, inputRefs: refs.codes,
    redactedInputHash: await sha256Hex(stableStringify(ctx)), redactionCount,
    output, postCheck, createdBy: actor.id, createdAt: Date.now(), accepted: false, latencyMs: Date.now() - started,
  });
  appendAudit(actor, {
    action: `ai.run.${feature}`, targetType: 'ai_run', targetId: run.id,
    programmeId: programmeOfRun(refs),
    after: { feature, redactionCount, ok: postCheck.ok },
  });
  return run;
}

/** กฎ 7.3 ในโค้ด: ตัดประโยคที่เข้ารูปให้คะแนน/ตัดสิน แล้วรวมเป็นธงใน postCheck (B4) */
function judgementFilter() {
  const removed: string[] = [];
  return {
    clean(t: string): string { const r = stripJudgement(t); removed.push(...r.removed); return r.text; },
    apply(pc: PostCheckResult): PostCheckResult {
      return removed.length ? { ...pc, ok: false, flaggedSentences: [...pc.flaggedSentences, ...removed] } : pc;
    },
  };
}

function digestOf(e: Evidence, redact: { count: number }): EvidenceDigest {
  const r = redactDeep({ title: e.title, summary: e.aiSummary || e.description || getExtractedText(e.id).slice(0, 400) });
  redact.count += r.count;
  return { code: e.code, title: r.value.title, kind: e.kind, pdca: e.pdcaStage, summary: r.value.summary };
}

/** หลักฐานของข้อหนึ่งในรอบหนึ่ง */
function evidenceForRequirement(cycleId: string, requirementId: string): Evidence[] {
  const ids = new Set(load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId && l.requirementId === requirementId).map(l => l.evidenceId));
  return load<Evidence>(KEYS.evidence).filter(e => ids.has(e.id)).sort((a, b) => a.code.localeCompare(b.code));
}

function metricDigests(programmeId: string, relatedCodes: string[]): MetricDigest[] {
  return load<MetricValue>(KEYS.metrics)
    .filter(m => m.programmeId === programmeId && relatedCodes.includes(m.code))
    .sort((a, b) => a.code.localeCompare(b.code) || a.period - b.period)
    .map(m => {
      const d = getMetricDefinition(m.code);
      return { code: m.code, nameTh: d?.nameTh ?? m.code, period: m.period, value: m.value, unit: d?.unit ?? '' };
    });
}

// ─── AI-1 ────────────────────────────────────────────────────────────────
export async function runEvidenceTagger(actor: AppUser, evidenceId: string, cycleId?: string): Promise<AiRun> {
  const started = Date.now();
  const ev = load<Evidence>(KEYS.evidence).find(e => e.id === evidenceId);
  if (!ev) throw new AunqaError('not_found', 'ไม่พบหลักฐาน');
  if (!can(actor, 'ai.check', programmeScope(ev.programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI');
  assertAiEnabled(ev.universityId);
  const redaction = { count: 0 };
  const r = redactDeep({ title: ev.title, text: `${ev.description}\n${getExtractedText(ev.id)}` });
  redaction.count += r.count;
  const reqs = listRequirements();
  const out = await getProvider().tagEvidence({ title: r.value.title, text: r.value.text, requirements: reqs, currentPdca: ev.pdcaStage });

  // post-check: summary/เหตุผลต้องไม่มีตัวเลขนอก input · ข้อที่แนะนำต้องมีใน framework
  const inputContext = `${r.value.title}\n${r.value.text}\n${reqs.map(q => q.id).join(' ')}`;
  const pc = postCheckText(out.summary, { allowedCodes: new Set(), inputContext, dropUnsafe: true });
  const reasonChecks = out.suggestions.map(s => postCheckText(s.reasons.join(' '), { allowedCodes: new Set(), inputContext }));
  const cleaned: TagOutput = {
    ...out, summary: pc.text || `หลักฐาน: ${r.value.title}`,
    suggestions: out.suggestions.filter(s => !!getRequirement(s.requirementId))
      .map(s => ({ ...s, confidence: Number.isFinite(s.confidence) ? Math.min(1, Math.max(0, s.confidence)) : 0 })), // B5: clamp 0–1
  };
  return finalize(actor, 'AI-1', ev.universityId, { t: r.value, ids: reqs.length }, { evidenceId, cycleId, codes: [ev.code] },
    redaction.count, cleaned, mergePostChecks([pc.result, ...reasonChecks.map(c => c.result)]), started);
}

// ─── AI-2 ────────────────────────────────────────────────────────────────
export async function runSarDrafter(actor: AppUser, cycleId: string, requirementId: string, language: 'th' | 'en' = 'th'): Promise<AiRun> {
  const started = Date.now();
  const cycle = getCycleRaw(cycleId);
  const req = getRequirement(requirementId);
  if (!req) throw new AunqaError('not_found', 'ไม่พบข้อ');
  const sec = load<SarSection>(KEYS.sections).find(s => s.id === sectionIdOf(cycleId, requirementId));
  if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  if (!can(actor, 'ai.use', cycleScope(cycle, { ownerUserId: sec.ownerUserId }))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI');
  assertAiEnabled(cycle.universityId);

  const redaction = { count: 0 };
  const evs = evidenceForRequirement(cycleId, requirementId).map(e => digestOf(e, redaction));
  const metrics = metricDigests(cycle.programmeId, req.relatedMetrics);
  const input = { requirement: req, language, evidence: evs, metrics };
  const out = await getProvider().draftSar(input);

  const inputContext = stableStringify(input);
  const pc = postCheckText(out.draft, { allowedCodes: citableCodes(cycleId), inputContext, dropUnsafe: true });
  const cleaned: DraftOutput = { ...out, draft: pc.text, usedEvidence: out.usedEvidence.filter(c => citableCodes(cycleId).has(c)) };
  return finalize(actor, 'AI-2', cycle.universityId, input as unknown as Record<string, unknown>,
    { cycleId, requirementId, codes: evs.map(e => e.code) }, redaction.count, { ...cleaned, language }, pc.result, started);
}

// ─── AI-3 ────────────────────────────────────────────────────────────────
export async function runSarReviewer(actor: AppUser, cycleId: string, requirementId: string, language: 'th' | 'en' = 'th'): Promise<AiRun> {
  const started = Date.now();
  const cycle = getCycleRaw(cycleId);
  const req = getRequirement(requirementId);
  if (!req) throw new AunqaError('not_found', 'ไม่พบข้อ');
  const sec = load<SarSection>(KEYS.sections).find(s => s.id === sectionIdOf(cycleId, requirementId));
  if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  if (!can(actor, 'ai.use', cycleScope(cycle, { ownerUserId: sec.ownerUserId }))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI');
  assertAiEnabled(cycle.universityId);

  const redaction = { count: 0 };
  const evidenceRows = evidenceForRequirement(cycleId, requirementId);
  const links = load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId);
  const gaps: Gap[] = computeGaps({
    requirements: [req], sections: [sec], links, evidence: load<Evidence>(KEYS.evidence).filter(e => e.programmeId === cycle.programmeId),
    metrics: load<MetricValue>(KEYS.metrics).filter(m => m.programmeId === cycle.programmeId),
    ratings: [], academicYear: cycle.academicYear,
  });
  const narrative = language === 'th' ? sec.narrativeTh : sec.narrativeEn;
  const nr = redactDeep(narrative); redaction.count += nr.count;
  const input = { requirement: req, narrative: nr.value, pdca: sec.pdca, evidence: evidenceRows.map(e => digestOf(e, redaction)), gaps, language };
  const out = await getProvider().reviewSar(input);

  const inputContext = stableStringify(input);
  const checks = [
    ...out.unanswered.map(t => postCheckText(t, { allowedCodes: new Set(), inputContext })),
    ...out.suggestions.map(t => postCheckText(t, { allowedCodes: new Set(), inputContext })),
  ];
  const jf = judgementFilter();
  const cleaned: ReviewOutput = {
    ...out,
    unanswered: out.unanswered.map(jf.clean).filter(Boolean),
    suggestions: out.suggestions.map(jf.clean).filter(Boolean),
  };
  return finalize(actor, 'AI-3', cycle.universityId, input as unknown as Record<string, unknown>,
    { cycleId, requirementId, codes: input.evidence.map(e => e.code) }, redaction.count, cleaned,
    jf.apply(mergePostChecks(checks.map(c => c.result))), started);
}

// ─── AI-4: translator TH↔EN (M8) ─────────────────────────────────────────
export interface TranslateRunOutput {
  translation: string; from: 'th' | 'en'; to: 'th' | 'en'; sectionId: string;
  /** offline: แทนศัพท์ glossary เท่านั้น ต้องแปลต่อโดยผู้ใช้ */
  needsHumanTranslation: boolean;
  glossaryHits: string[];
}

/** นับซ้ำ (multiset) ของรายการ → ที่ขาดไปใน b เมื่อเทียบกับ a */
function missingFrom(a: string[], b: string[]): string[] {
  const left = new Map<string, number>();
  b.forEach(x => left.set(x, (left.get(x) ?? 0) + 1));
  const miss: string[] = [];
  for (const x of a) {
    const n = left.get(x) ?? 0;
    if (n > 0) left.set(x, n - 1); else miss.push(x);
  }
  return miss;
}

/**
 * แปลบทความของข้อ (sectionId = `cycleId::reqId`) ไปภาษา `to` จากอีกภาษา · ผลเป็นข้อเสนอจนกว่า acceptAiRun (เขียนลง narrativeEn/narrativeTh)
 * post-check: [E-…] และตัวเลขต้องคงครบเท่าต้นฉบับ (ขาด/เกิน = ติดธง ok=false)
 */
export async function runTranslate(actor: AppUser, sectionId: string, to: 'en' | 'th'): Promise<AiRun> {
  const started = Date.now();
  if (to !== 'en' && to !== 'th') throw new AunqaError('invalid', 'ภาษาปลายทางไม่ถูกต้อง');
  const sec = load<SarSection>(KEYS.sections).find(s => s.id === sectionId);
  if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  const cycle = getCycleRaw(sec.cycleId);
  if (!can(actor, 'ai.use', cycleScope(cycle, { ownerUserId: sec.ownerUserId }))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI');
  assertAiEnabled(cycle.universityId);
  const from: 'th' | 'en' = to === 'en' ? 'th' : 'en';
  const source = from === 'th' ? sec.narrativeTh : sec.narrativeEn;
  if (!source.trim()) throw new AunqaError('invalid', from === 'th' ? 'ยังไม่มีเนื้อหาภาษาไทยให้แปล' : 'ยังไม่มีเนื้อหาภาษาอังกฤษให้แปล');
  if (source.length > 20000) throw new AunqaError('invalid', 'ข้อความยาวเกินไปสำหรับการแปลครั้งเดียว');

  const redaction = { count: 0 };
  const sr = redactDeep(source); redaction.count += sr.count;
  const hits = findGlossaryHits(sr.value, from);
  const input: TranslateInput = { text: sr.value, from, to, glossary: hits.map(h => ({ th: h.th, en: h.en })) };
  const out: TranslateOutput = await getProvider().translate(input);
  const offline = getProvider().model === offlineProvider.model;

  const srcCodes = extractCitations(sr.value);
  const pc = postCheckText(out.translation, { allowedCodes: new Set(srcCodes), inputContext: sr.value });
  // ความครบถ้วน: [E-…] และตัวเลขของต้นฉบับต้องอยู่ในคำแปลครบ (ตรวจจาก output ก่อนถูก post-check ตัดรหัสปลอม)
  const lostCodes = missingFrom(srcCodes, extractCitations(pc.text));
  const lostNums = missingFrom(extractNumbers(sr.value), extractNumbers(pc.text));
  const completeness: PostCheckResult = {
    ok: !lostCodes.length && !lostNums.length, removedCitations: [], unknownNumbers: [],
    flaggedSentences: [...lostCodes.map(c => `คำแปลขาดรหัสอ้างอิง [${c}]`), ...lostNums.map(n => `คำแปลขาดตัวเลข ${n}`)],
  };
  const cleaned: TranslateRunOutput = {
    translation: pc.text, from, to, sectionId, needsHumanTranslation: offline && out.needsHumanTranslation === true,
    glossaryHits: hits.map(h => (to === 'en' ? h.en : h.th)),
  };
  return finalize(actor, 'AI-4', cycle.universityId, input as unknown as Record<string, unknown>,
    { cycleId: sec.cycleId, requirementId: sec.requirementId, codes: Array.from(new Set(srcCodes)) }, redaction.count, cleaned,
    mergePostChecks([pc.result, completeness]), started);
}

// ─── AI-7: PLO/CLO verb checker (M4) ─────────────────────────────────────
const BLOOM_CONTEXT = '1 2 3 4 5 6'; // ระดับ Bloom ที่อนุญาตให้ปรากฏในข้อความผลลัพธ์

/** ตรวจคำกริยา PLO/CLO ของหลักสูตรตามระดับ Bloom (ทั้งหมด หรือเฉพาะ ids ที่ระบุ) — ข้อเสนอเท่านั้น ไม่แก้ PLO/CLO เอง */
export async function runVerbChecker(actor: AppUser, programmeId: string, ids?: string[]): Promise<AiRun> {
  const started = Date.now();
  const prog = getProgramme(programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(actor, 'ai.use', programmeScope(programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI');
  assertAiEnabled(prog.universityId);
  const cur = loadCurriculumRaw(programmeId);
  const want = ids ? new Set(ids) : null;
  const redaction = { count: 0 };
  const items: VerbItem[] = [
    ...cur.plos.map(p => ({ id: p.id, code: p.code, kind: 'plo' as const, textTh: p.textTh, textEn: p.textEn, declaredLevel: p.bloomLevel })),
    ...cur.clos.map(c => ({ id: c.id, code: c.code, kind: 'clo' as const, textTh: c.textTh, textEn: c.textEn ?? '', declaredLevel: c.bloomLevel })),
  ].filter(it => !want || want.has(it.id)).map(it => {
    const r = redactDeep({ textTh: it.textTh, textEn: it.textEn }); redaction.count += r.count;
    return { ...it, textTh: r.value.textTh, textEn: r.value.textEn };
  });
  if (!items.length) throw new AunqaError('invalid', 'ไม่พบ PLO/CLO ให้ตรวจ');
  const input: VerbInput = { items };
  const out: VerbOutput = await getProvider().checkVerbs(input);

  // ผลต้องอ้างอิงเฉพาะ item ที่ส่งเข้าไป · ข้อความอธิบายต้องไม่มีตัวเลขนอก input (ยกเว้นระดับ Bloom 1–6)
  const known = new Map(items.map(i => [i.id, i]));
  const inputContext = `${stableStringify(input)} ${BLOOM_CONTEXT}`;
  const checks = out.results.map(r => postCheckText(`${r.note} ${r.suggestions.join(' ')}`, { allowedCodes: new Set(), inputContext }));
  // B5: ค่าที่ระบบรู้อยู่แล้ว (code/kind/declaredLevel) ใช้จาก input เสมอ ไม่เชื่อ Claude · detectedLevels ต้องอยู่ 1–6
  const cleaned: VerbOutput = {
    results: out.results.filter(r => known.has(r.id)).map(r => {
      const k = known.get(r.id)!;
      return {
        ...r, code: k.code, kind: k.kind, declaredLevel: k.declaredLevel,
        detectedLevels: Array.from(new Set(r.detectedLevels.filter(n => Number.isInteger(n) && n >= 1 && n <= 6))).sort((a, b) => a - b),
      };
    }),
  };
  return finalize(actor, 'AI-7', prog.universityId, input as unknown as Record<string, unknown>,
    { programmeId, codes: items.map(i => i.code) }, redaction.count, cleaned,
    mergePostChecks(checks.map(c => c.result)), started);
}

// ─── AI-9: assessor summary + interview questions (M12) ──────────────────
/** สรุป SAR รายเกณฑ์ + คำถามสัมภาษณ์ 5W1H แยกกลุ่ม — เฉพาะกรรมการของรอบ (ai.summarize) · ไม่ให้คะแนน */
export async function runAssessorSummary(actor: AppUser, cycleId: string, criterionNo: number): Promise<AiRun> {
  const started = Date.now();
  const cycle = getCycleRaw(cycleId);
  if (!can(actor, 'ai.summarize', cycleScope(cycle))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ใช้ AI สรุป');
  assertAiEnabled(cycle.universityId);
  const criterion = listCriteria().find(c => c.no === criterionNo);
  if (!criterion) throw new AunqaError('invalid', 'ไม่พบเกณฑ์');

  const redaction = { count: 0 };
  const reqs = listRequirements(criterionNo);
  const gapInput = loadGapInput(cycleId);
  const gaps = computeGaps(gapInput);
  const secs = gapInput.sections;
  const selfRatings = load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'self');
  const input: SummaryInput = {
    criterion: { no: criterion.no, nameTh: criterion.nameTh, nameEn: criterion.nameEn },
    requirements: reqs.map(r => {
      const sec = secs.find(s => s.requirementId === r.id);
      const nr = redactDeep(sec?.narrativeTh.trim() ? sec.narrativeTh : sec?.narrativeEn ?? ''); redaction.count += nr.count;
      return {
        id: r.id, textTh: r.textTh, plainTh: r.plainTh, narrative: nr.value,
        pdca: sec?.pdca ?? { plan: false, do: false, check: false, act: false },
        selfScore: selfRatings.find(x => x.requirementId === r.id)?.score,
        evidence: evidenceForRequirement(cycleId, r.id).map(e => digestOf(e, redaction)),
        gaps: gaps.filter(g => g.requirementId === r.id).map(g => g.messageTh),
        diagnosticQuestions: r.diagnosticQuestions,
      };
    }),
  };
  const out: SummaryOutput = await getProvider().summarizeCriterion(input);

  const inputContext = `${stableStringify(input)} 1 2 3 4 5 6 7 8 9`;
  const allowed = citableCodes(cycleId);
  const reqIds = new Set(reqs.map(r => r.id));
  const checks: PostCheckResult[] = [];
  const jf = judgementFilter();
  const clean = (t: string) => jf.clean(postCheckText(t, { allowedCodes: allowed, inputContext, dropUnsafe: true }).text);
  const summaries = out.summaries.filter(s => reqIds.has(s.requirementId)).map(s => {
    const pc = postCheckText(s.summary, { allowedCodes: allowed, inputContext, dropUnsafe: true });
    checks.push(pc.result);
    return {
      ...s, summary: jf.clean(pc.text) || '(ข้อความสรุปไม่ผ่านการตรวจ — ใช้ SAR ต้นฉบับ)',
      strengths: s.strengths.map(clean).filter(Boolean), concerns: s.concerns.map(clean).filter(Boolean),
    };
  });
  const questions = out.questions.map(g => ({
    ...g, items: g.items.filter(it => reqIds.has(it.requirementId)).map(it => {
      const pc = postCheckText(it.question, { allowedCodes: new Set<string>(), inputContext, dropUnsafe: true });
      checks.push(pc.result);
      return { ...it, question: jf.clean(pc.text) };
    }).filter(it => it.question),
  }));
  const cleaned: SummaryOutput = { summaries, questions };
  return finalize(actor, 'AI-9', cycle.universityId, input as unknown as Record<string, unknown>,
    { cycleId, codes: input.requirements.flatMap(r => r.evidence.map(e => e.code)) }, redaction.count, cleaned,
    jf.apply(mergePostChecks(checks)), started);
}

// ─── Accept / list ───────────────────────────────────────────────────────
export interface AcceptOptions {
  /** AI-1: เลือกข้อที่ต้องการผูก (default = ทั้งหมดที่ AI เสนอ) */
  requirementIds?: string[];
  /** AI-1: นำขั้น PDCA ที่เสนอไปใช้ (default true) */
  applyPdca?: boolean;
  /** AI-2: วิธีใส่ร่าง (default append) */
  mode?: 'append' | 'replace';
}

/** มนุษย์กดยอมรับ → ข้อเสนอจึงเข้าเอกสาร (ผ่านสิทธิ์/ตรวจ citation/lock ของ store ปกติ) */
export function acceptAiRun(actor: AppUser, runId: string, opts: AcceptOptions = {}): AiRun {
  const rows = load<AiRun>(KEYS.aiRuns);
  const run = rows.find(r => r.id === runId);
  if (!run) throw new AunqaError('not_found', 'ไม่พบผลลัพธ์ AI');
  if (actor.universityId !== run.universityId) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์');
  if (run.accepted) throw new AunqaError('invalid', 'ยอมรับผลลัพธ์นี้ไปแล้ว');

  if (run.feature === 'AI-1') {
    const out = run.output as TagOutput;
    const ev = load<Evidence>(KEYS.evidence).find(e => e.id === run.evidenceId);
    if (!ev) throw new AunqaError('not_found', 'ไม่พบหลักฐาน');
    setAiSummary(actor, ev.id, out.summary, opts.applyPdca === false ? undefined : (out.pdcaStage as PdcaStage));
    if (run.cycleId) {
      const wanted = new Set(opts.requirementIds ?? out.suggestions.map(s => s.requirementId));
      out.suggestions.filter(s => wanted.has(s.requirementId)).forEach(s =>
        linkEvidence(actor, ev.id, run.cycleId!, [s.requirementId], 'ai', s.confidence, actor.id));
    }
  } else if (run.feature === 'AI-2') {
    const out = run.output as DraftOutput & { language: 'th' | 'en' };
    if (!out.draft.trim()) throw new AunqaError('invalid', 'ร่างว่าง ไม่มีอะไรให้ใส่');
    const sec = load<SarSection>(KEYS.sections).find(s => s.id === sectionIdOf(run.cycleId!, run.requirementId!));
    if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
    const cur = out.language === 'th' ? sec.narrativeTh : sec.narrativeEn;
    const next = opts.mode === 'replace' || !cur.trim() ? out.draft : `${cur.trimEnd()}\n\n${out.draft}`;
    saveSection(actor, run.cycleId!, run.requirementId!, out.language === 'th' ? { narrativeTh: next } : { narrativeEn: next }, 'ai_accept');
  } else if (run.feature === 'AI-4') {
    const out = run.output as TranslateRunOutput;
    if (!out.translation.trim()) throw new AunqaError('invalid', 'คำแปลว่าง ไม่มีอะไรให้ใส่');
    const sec = load<SarSection>(KEYS.sections).find(s => s.id === out.sectionId);
    if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
    const cur = out.to === 'th' ? sec.narrativeTh : sec.narrativeEn;
    const next = opts.mode === 'replace' || !cur.trim() ? out.translation : `${cur.trimEnd()}

${out.translation}`;
    saveSection(actor, sec.cycleId, sec.requirementId, out.to === 'th' ? { narrativeTh: next } : { narrativeEn: next }, 'ai_accept');
  }
  // AI-3 / AI-7 / AI-9: เป็นคำแนะนำล้วน — การยอมรับ = รับทราบ (ไม่แก้เอกสาร/PLO/ผลประเมิน ผู้ใช้นำไปแก้เองผ่านหน้าปกติ)

  run.accepted = true; run.acceptedBy = actor.id; run.acceptedAt = Date.now();
  save(KEYS.aiRuns, rows);
  appendAudit(actor, { action: 'ai.accept', targetType: 'ai_run', targetId: run.id, after: { feature: run.feature }, programmeId: programmeOfRun(run) });
  return run;
}

export function listAiRuns(user: AppUser, filter: { cycleId?: string; requirementId?: string; evidenceId?: string; programmeId?: string } = {}): AiRun[] {
  return load<AiRun>(KEYS.aiRuns)
    .filter(r => r.universityId === user.universityId
      && (!filter.cycleId || r.cycleId === filter.cycleId)
      && (!filter.requirementId || r.requirementId === filter.requirementId)
      && (!filter.evidenceId || r.evidenceId === filter.evidenceId)
      && (!filter.programmeId || r.programmeId === filter.programmeId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function isAiEnabled(universityId: string): boolean {
  return getUniversity(universityId)?.aiEnabled !== false;
}
