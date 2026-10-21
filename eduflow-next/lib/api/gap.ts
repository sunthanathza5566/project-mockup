/**
 * Gap analysis R1–R10 (spec M9) + readiness
 * Pure functions: รับข้อมูลเข้ามา ไม่อ่าน storage เอง → unit test ง่าย
 */
import type {
  Evidence, EvidenceLink, Gap, GapRuleId, GapSeverity, HeatCell, HeatLevel, MetricValue, PendingWork, Rating,
  Readiness, Requirement, SarSection, SectionStatus,
} from '../types';
import { uncitedSentences } from '../utils/text';

export interface GapInput {
  requirements: Requirement[];
  sections: SarSection[];
  /** ลิงก์ของรอบนี้เท่านั้น */
  links: EvidenceLink[];
  evidence: Evidence[];
  metrics: MetricValue[];
  /** ratings ของรอบนี้ (ใช้เฉพาะ self สำหรับ R10) */
  ratings: Rating[];
  /** ปีการศึกษาของรอบ (พ.ศ.) ใช้คำนวณอายุหลักฐาน/ปีล่าสุด */
  academicYear: number;
  /** R5: เก่ากว่า N ปี (default 3) */
  evidenceMaxAgeYears?: number;
  /** R3: ต้องมีข้อมูลอย่างน้อยกี่ปี (default 3) */
  minTrendYears?: number;
  /** R4: narrative ต้องมีอย่างน้อยกี่คำ (default 100) */
  minWords?: number;
}

export const SEVERITY_ORDER: GapSeverity[] = ['critical', 'high', 'medium', 'low'];

interface Ctx {
  inp: GapInput; maxAge: number; minYears: number; minWords: number;
  evById: Map<string, Evidence>;
  evFor(reqId: string): Evidence[];
  secFor(reqId: string): SarSection | undefined;
}

function mkCtx(inp: GapInput): Ctx {
  const evById = new Map(inp.evidence.map(e => [e.id, e]));
  const byReq = new Map<string, Evidence[]>();
  for (const l of inp.links) {
    const e = evById.get(l.evidenceId);
    if (!e) continue;
    const arr = byReq.get(l.requirementId) ?? [];
    if (!arr.some(x => x.id === e.id)) arr.push(e);
    byReq.set(l.requirementId, arr);
  }
  const secBy = new Map(inp.sections.map(s => [s.requirementId, s]));
  return {
    inp, maxAge: inp.evidenceMaxAgeYears ?? 3, minYears: inp.minTrendYears ?? 3, minWords: inp.minWords ?? 100,
    evById, evFor: id => byReq.get(id) ?? [], secFor: id => secBy.get(id),
  };
}

const gap = (ruleId: GapRuleId, severity: GapSeverity, requirementId: string, messageTh: string, extra: Partial<Gap> = {}): Gap =>
  ({ id: `${ruleId}:${requirementId}${extra.evidenceId ? ':' + extra.evidenceId : ''}${extra.metricCode ? ':' + extra.metricCode : ''}`, ruleId, severity, requirementId, messageTh, ...extra });

// ─── Rules ───────────────────────────────────────────────────────────────
/** R1 (Critical): ข้อนี้ไม่มี evidence ผูก */
export function ruleR1(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  return inp.requirements.filter(r => c.evFor(r.id).length === 0)
    .map(r => gap('R1', 'critical', r.id, `ข้อ ${r.id} ยังไม่มีหลักฐานผูก`));
}

/** R2 (High): มีหลักฐานแล้วแต่ไม่มีขั้น Check หรือ Act (ขาดตัวใดตัวหนึ่ง) — ถ้าไม่มีหลักฐานเลยให้ R1 รายงาน */
export function ruleR2(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements) {
    const ev = c.evFor(r.id);
    if (!ev.length) continue;
    const missing = (['C', 'A'] as const).filter(st => !ev.some(e => e.pdcaStage === st));
    if (missing.length) out.push(gap('R2', 'high', r.id, `ข้อ ${r.id} ยังไม่มีหลักฐานขั้น ${missing.map(m => (m === 'C' ? 'Check' : 'Act')).join(' และ ')}`));
  }
  return out;
}

/** R3 (High): metric ที่ข้อนี้ต้องใช้ (เฉพาะข้อที่ needsTrend) มีข้อมูล < 3 ปี */
export function ruleR3(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements) {
    if (!r.needsTrend) continue;
    for (const code of r.relatedMetrics) {
      const periods = new Set(inp.metrics.filter(m => m.code === code).map(m => m.period));
      if (periods.size < c.minYears)
        out.push(gap('R3', 'high', r.id, `ข้อ ${r.id}: metric "${code}" มีข้อมูล ${periods.size} ปี (ต้องการอย่างน้อย ${c.minYears} ปี)`, { metricCode: code }));
    }
  }
  return out;
}

/** R4 (Medium): narrative ว่าง หรือ < 100 คำ (ใช้คำนวณจาก wordCount ของ section) */
export function ruleR4(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  return inp.requirements.filter(r => (c.secFor(r.id)?.wordCount ?? 0) < c.minWords)
    .map(r => {
      const n = c.secFor(r.id)?.wordCount ?? 0;
      return gap('R4', 'medium', r.id, n === 0 ? `ข้อ ${r.id} ยังไม่มี narrative` : `ข้อ ${r.id} narrative สั้นเกินไป (${n} คำ ต้องการอย่างน้อย ${c.minWords})`);
    });
}

/** R5 (Medium): หลักฐานที่ผูกอยู่เก่ากว่า N ปี (นับจากปีการศึกษาของรอบ) */
export function ruleR5(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements) {
    for (const e of c.evFor(r.id))
      if (inp.academicYear - e.academicYear > c.maxAge)
        out.push(gap('R5', 'medium', r.id, `หลักฐาน ${e.code} (ปี ${e.academicYear}) เก่ากว่า ${c.maxAge} ปี`, { evidenceId: e.id }));
  }
  return out;
}

/** R6 (High): หลักฐานที่ผูกอยู่ติดธง PII และยังไม่จัดการ */
export function ruleR6(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements)
    for (const e of c.evFor(r.id))
      if (e.containsPii && !e.piiResolved)
        out.push(gap('R6', 'high', r.id, `หลักฐาน ${e.code} มีข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ`, { evidenceId: e.id }));
  return out;
}

/**
 * R7 (High): PLO ไม่มีวิชารับผิดชอบ / ไม่มีวิธีวัด (C1, C2, C4)
 * Phase B: ต้องรอ M4 Curriculum Mapping (PLO/CLO/courses) — ตอนนี้ยังไม่มีข้อมูลจึงคืน []
 */
export function ruleR7(_inp: GapInput): Gap[] {
  return [];
}

/** R8 (Medium): ข้อที่ต้อง benchmark แต่ไม่มีค่าเทียบเคียง (metric ที่เกี่ยวข้อง หรือหลักฐานที่พูดถึง benchmark) */
export function ruleR8(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements) {
    if (!r.needsBenchmark) continue;
    const metricOk = r.relatedMetrics.some(code => inp.metrics.some(m => m.code === code && m.benchmarkValue !== undefined));
    const evidenceOk = c.evFor(r.id).some(e => /benchmark|เทียบเคียง|เปรียบเทียบ/i.test(`${e.title} ${e.description}`));
    if (!metricOk && !evidenceOk) out.push(gap('R8', 'medium', r.id, `ข้อ ${r.id} ต้องมีการเทียบเคียง (benchmark) แต่ยังไม่มีข้อมูล`));
  }
  return out;
}

/** R9 (Low): มีประโยคใน narrative ที่ไม่มีการอ้าง [E-…] (รายงานหนึ่งรายการต่อข้อ) */
export function ruleR9(inp: GapInput): Gap[] {
  const c = mkCtx(inp);
  const out: Gap[] = [];
  for (const r of inp.requirements) {
    const s = c.secFor(r.id);
    if (!s) continue;
    const n = uncitedSentences(s.narrativeTh).length + uncitedSentences(s.narrativeEn).length;
    if (n > 0) out.push(gap('R9', 'low', r.id, `ข้อ ${r.id} มี ${n} ประโยคที่ไม่ได้อ้างหลักฐาน`));
  }
  return out;
}

/** R10 (High): self-rating ≥ 4 แต่ R1 หรือ R2 ของข้อนั้นยังเปิดอยู่ */
export function ruleR10(inp: GapInput): Gap[] {
  const open = new Set([...ruleR1(inp), ...ruleR2(inp)].map(g => g.requirementId));
  const out: Gap[] = [];
  for (const rt of inp.ratings) {
    if (rt.raterType !== 'self' || rt.score < 4 || !open.has(rt.requirementId)) continue;
    out.push(gap('R10', 'high', rt.requirementId, `ข้อ ${rt.requirementId} ให้คะแนนตนเอง ${rt.score} แต่หลักฐานยังไม่ครบ (ขาดหลักฐาน/ขั้น Check-Act)`));
  }
  return out;
}

export const ALL_RULES: Record<GapRuleId, (i: GapInput) => Gap[]> = {
  R1: ruleR1, R2: ruleR2, R3: ruleR3, R4: ruleR4, R5: ruleR5, R6: ruleR6, R7: ruleR7, R8: ruleR8, R9: ruleR9, R10: ruleR10,
};

export function computeGaps(inp: GapInput): Gap[] {
  const gaps = (Object.keys(ALL_RULES) as GapRuleId[]).flatMap(k => ALL_RULES[k](inp));
  return gaps.sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
    a.requirementId.localeCompare(b.requirementId, undefined, { numeric: true }));
}

// ─── Readiness ───────────────────────────────────────────────────────────
/**
 * คะแนนต่อข้อ = ฐานตามสถานะ section × (1 − ค่าปรับจาก gap)
 *   ฐาน: not_started 0 · drafting 50 · changes_requested 40 · ready_for_review 90 · approved 100
 *   ค่าปรับ: critical 0.5 · high 0.25 · medium 0.1 · low 0.03 (รวมไม่เกิน 1)
 * % พร้อมรวม = ค่าเฉลี่ยของทุกข้อ (รอบที่ยังไม่เริ่ม = 0%)
 */
const STATUS_BASE: Record<SectionStatus, number> = { not_started: 0, drafting: 50, changes_requested: 40, ready_for_review: 90, approved: 100 };
const PENALTY: Record<GapSeverity, number> = { critical: 0.5, high: 0.25, medium: 0.1, low: 0.03 };

const zeroCounts = (): Record<GapSeverity, number> => ({ critical: 0, high: 0, medium: 0, low: 0 });

function levelOf(status: SectionStatus, counts: Record<GapSeverity, number>): HeatLevel {
  if (status === 'not_started' && counts.critical > 0) return 'empty';
  if (counts.critical > 0) return 'critical';
  if (counts.high > 0 || counts.medium > 0) return 'warning';
  if (status === 'approved') return 'approved';
  if (status === 'ready_for_review') return 'ready';
  return 'ok';
}

export function readiness(inp: GapInput & { now?: number }): Readiness {
  const gaps = computeGaps(inp);
  const secBy = new Map(inp.sections.map(s => [s.requirementId, s]));
  const gapCounts = zeroCounts();
  gaps.forEach(g => gapCounts[g.severity]++);

  const heatmap: HeatCell[] = inp.requirements.map(r => {
    const status: SectionStatus = secBy.get(r.id)?.status ?? 'not_started';
    const counts = zeroCounts();
    gaps.filter(g => g.requirementId === r.id).forEach(g => counts[g.severity]++);
    const pen = Math.min(1, SEVERITY_ORDER.reduce((s, k) => s + counts[k] * PENALTY[k], 0));
    return { requirementId: r.id, criterionNo: r.criterionNo, sectionStatus: status, level: levelOf(status, counts), score: Math.round(STATUS_BASE[status] * (1 - pen)), gaps: counts };
  });
  const percent = heatmap.length ? Math.round(heatmap.reduce((s, c) => s + c.score, 0) / heatmap.length) : 0;
  return { percent, heatmap, gapCounts, gaps, pending: pendingByOwner(inp.sections, inp.now) };
}

/** งานค้างรายคน (section ที่ยังไม่ approved) + เลยกำหนดกี่ข้อ */
export function pendingByOwner(sections: SarSection[], now = Date.now()): PendingWork[] {
  const map = new Map<string, PendingWork>();
  const today = new Date(now).toISOString().slice(0, 10);
  for (const s of sections) {
    if (s.status === 'approved' || !s.ownerUserId) continue;
    const p = map.get(s.ownerUserId) ?? { userId: s.ownerUserId, open: 0, overdue: 0, requirementIds: [] };
    p.open++; p.requirementIds.push(s.requirementId);
    if (s.due) {
      if (s.due < today) p.overdue++;
      if (!p.nextDue || s.due < p.nextDue) p.nextDue = s.due;
    }
    map.set(s.ownerUserId, p);
  }
  return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue || b.open - a.open);
}
