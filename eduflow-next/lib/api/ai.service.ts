/**
 * AI service กลาง (spec 7): redact → provider → post-check → บันทึก AiRun → ผู้ใช้กดยอมรับ (acceptAiRun)
 * ข้อห้าม (บังคับด้วยโครงสร้างโค้ด):
 *  - ไฟล์นี้ไม่ import transitionCycle/transitionSection/setCommitteeRating → AI เปลี่ยน state/ให้คะแนนไม่ได้
 *  - ข้อมูลที่ส่งเข้า provider ผ่าน redactDeep เสมอ
 *  - ผลลัพธ์เป็น "ข้อเสนอ" จนกว่า acceptAiRun โดยมนุษย์ที่มีสิทธิ์
 * เคารพ university.aiEnabled
 * TODO(PostgreSQL): ai_runs · Phase B: Claude provider ผ่าน Route Handler app/api/ai/**
 */
import type {
  AiFeature, AiRun, AppUser, Evidence, EvidenceLink, Gap, MetricValue, PdcaStage, PostCheckResult, SarSection,
} from '../types';
import { newId, sha256Hex, stableStringify } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { extractedTextOf as getExtractedText, linkEvidence, setAiSummary } from './evidence.store';
import { getMetricDefinition } from './metrics.store';
import { getRequirement, listRequirements } from './framework';
import { computeGaps } from './gap';
import { getUniversity, programmeScope } from './org.store';
import { can } from './rbac';
import { citableCodes, saveSection, sectionIdOf } from './sar.store';
import { cycleScope, getCycleRaw } from './workflow';
import { redactDeep } from './ai/redact';
import { mergePostChecks, postCheckText } from './ai/postcheck';
import { offlineProvider } from './ai/offline';
import type { AiProvider, DraftOutput, EvidenceDigest, MetricDigest, ReviewOutput, TagOutput } from './ai/provider';

/** Phase B: เลือก Claude provider เมื่อมี key (ฝั่ง server) — ตอนนี้ offline เสมอ */
export function getProvider(): AiProvider { return offlineProvider; }

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
function programmeOfRun(refs: { cycleId?: string; evidenceId?: string }): string | undefined {
  if (refs.cycleId) return getCycleRaw(refs.cycleId).programmeId;
  if (refs.evidenceId) return load<Evidence>(KEYS.evidence).find(e => e.id === refs.evidenceId)?.programmeId;
  return undefined;
}

async function finalize(
  actor: AppUser, feature: AiFeature, universityId: string, ctx: Record<string, unknown>,
  refs: { cycleId?: string; requirementId?: string; evidenceId?: string; codes: string[] },
  redactionCount: number, output: unknown, postCheck: PostCheckResult, started: number,
): Promise<AiRun> {
  const p = getProvider();
  const run = saveRun({
    id: newId('air'), universityId, feature, promptVersion: p.promptVersion, model: p.model,
    cycleId: refs.cycleId, requirementId: refs.requirementId, evidenceId: refs.evidenceId, inputRefs: refs.codes,
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
    suggestions: out.suggestions.filter(s => !!getRequirement(s.requirementId)),
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
  const cleaned: ReviewOutput = out;
  return finalize(actor, 'AI-3', cycle.universityId, input as unknown as Record<string, unknown>,
    { cycleId, requirementId, codes: input.evidence.map(e => e.code) }, redaction.count, cleaned,
    mergePostChecks(checks.map(c => c.result)), started);
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
  }
  // AI-3: เป็นคำแนะนำล้วน — การยอมรับ = รับทราบ (ไม่แก้เอกสาร)

  run.accepted = true; run.acceptedBy = actor.id; run.acceptedAt = Date.now();
  save(KEYS.aiRuns, rows);
  appendAudit(actor, { action: 'ai.accept', targetType: 'ai_run', targetId: run.id, after: { feature: run.feature }, programmeId: programmeOfRun(run) });
  return run;
}

export function listAiRuns(user: AppUser, filter: { cycleId?: string; requirementId?: string; evidenceId?: string } = {}): AiRun[] {
  return load<AiRun>(KEYS.aiRuns)
    .filter(r => r.universityId === user.universityId
      && (!filter.cycleId || r.cycleId === filter.cycleId)
      && (!filter.requirementId || r.requirementId === filter.requirementId)
      && (!filter.evidenceId || r.evidenceId === filter.evidenceId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function isAiEnabled(universityId: string): boolean {
  return getUniversity(universityId)?.aiEnabled !== false;
}
