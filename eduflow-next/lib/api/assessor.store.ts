/**
 * Assessor workspace (M12) — Appendix B (findings ต่อข้อ), คะแนนกรรมการรายเกณฑ์, overall verdict
 * กฎ: กรรมการ read-only ต่อ SAR/หลักฐาน (แก้ได้เฉพาะข้อมูลของตน) · คะแนนกรรมการเป็นแถวแยก raterType 'committee' ไม่ทับ self
 *     verdict เลือกเองเท่านั้น (ไม่มีฟังก์ชันคำนวณ/เฉลี่ย/เสนอ) · เขียนได้เฉพาะรอบที่อยู่ในขั้น under_assessment
 *     หลักสูตรเห็นผลของกรรมการเมื่อรอบเป็น assessed/closed เท่านั้น
 * TODO(PostgreSQL): assessment_findings, assessment_verdicts, ratings(rater_type='committee') + trigger เช็ก role assessor ของรอบ
 */
import type { AppUser, AssessmentCycle, AssessmentFinding, AssessmentVerdict, Rating } from '../types';
import { newId } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { getRequirement, listCriteria } from './framework';
import { can, isAssessorOf } from './rbac';
import { cycleScope, getCycleRaw } from './workflow';

export const RATING_SCALE: { score: number; nameEn: string; nameTh: string }[] = [
  { score: 1, nameEn: 'Absolutely Inadequate', nameTh: 'ไม่เพียงพออย่างยิ่ง' },
  { score: 2, nameEn: 'Inadequate and Improvement is Necessary', nameTh: 'ไม่เพียงพอ ต้องปรับปรุง' },
  { score: 3, nameEn: 'Inadequate but Minor Improvement Will Make It Adequate', nameTh: 'ยังไม่เพียงพอ แต่ปรับเล็กน้อยก็เพียงพอ' },
  { score: 4, nameEn: 'Adequate as Expected', nameTh: 'เพียงพอตามที่คาดหวัง' },
  { score: 5, nameEn: 'Better Than Adequate', nameTh: 'ดีกว่าเพียงพอ' },
  { score: 6, nameEn: 'Example of Best Practices', nameTh: 'เป็นแบบอย่างที่ดี' },
  { score: 7, nameEn: 'Excellent (World-class)', nameTh: 'ยอดเยี่ยมระดับโลก' },
];
export const scaleLabel = (score: number) => RATING_SCALE.find(s => s.score === score);

const MAX_FIELD = 5000;

export const isAssessmentReleased = (c: AssessmentCycle): boolean => c.status === 'assessed' || c.status === 'closed';

function readCycle(user: AppUser, cycleId: string): AssessmentCycle {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึงรอบประเมินนี้');
  return c;
}
/** ผลของกรรมการเห็นได้: กรรมการของรอบ (ทุกคนในรอบ) หรือเมื่อรอบ assessed/closed */
export function canSeeAssessment(user: AppUser, c: AssessmentCycle): boolean {
  return isAssessorOf(user, c.id) || isAssessmentReleased(c);
}
function assertAssessorWrite(actor: AppUser, cycleId: string, action: 'finding.write' | 'rating.committee'): AssessmentCycle {
  const c = getCycleRaw(cycleId);
  if (!can(actor, action, cycleScope(c))) throw new AunqaError('forbidden', 'เฉพาะกรรมการที่ได้รับมอบหมายเท่านั้น');
  if (c.status !== 'under_assessment') throw new AunqaError('invalid', 'บันทึกได้เฉพาะรอบที่อยู่ในขั้นการประเมิน (under_assessment)');
  return c;
}
function field(v: string | undefined, label: string): string {
  const t = (v ?? '').trim();
  if (t.length > MAX_FIELD) throw new AunqaError('invalid', `${label}ยาวเกินไป (ไม่เกิน ${MAX_FIELD} ตัวอักษร)`);
  return t;
}

// ─── Findings (Appendix B) ───────────────────────────────────────────────
export function listFindings(user: AppUser, cycleId: string, requirementId?: string): AssessmentFinding[] {
  const c = readCycle(user, cycleId);
  if (!canSeeAssessment(user, c)) return [];
  return load<AssessmentFinding>(KEYS.findings)
    .filter(f => f.cycleId === cycleId && (!requirementId || f.requirementId === requirementId))
    .sort((a, b) => a.requirementId.localeCompare(b.requirementId, undefined, { numeric: true }) || a.assessorUserId.localeCompare(b.assessorUserId));
}

export interface FindingInput { strengths?: string; afi?: string; interviewQuestions?: string; sourcesOfEvidence?: string }

/** บันทึก/แก้ Appendix B ของข้อหนึ่ง (upsert ต่อกรรมการ) */
export function upsertFinding(actor: AppUser, cycleId: string, requirementId: string, input: FindingInput): AssessmentFinding {
  const cycle = assertAssessorWrite(actor, cycleId, 'finding.write');
  if (!getRequirement(requirementId)) throw new AunqaError('not_found', 'ไม่พบข้อ');
  const body = {
    strengths: field(input.strengths, 'Strengths'), afi: field(input.afi, 'AFI'),
    interviewQuestions: field(input.interviewQuestions, 'Interview questions'), sourcesOfEvidence: field(input.sourcesOfEvidence, 'Sources of evidence'),
  };
  const rows = load<AssessmentFinding>(KEYS.findings);
  const cur = rows.find(f => f.cycleId === cycleId && f.requirementId === requirementId && f.assessorUserId === actor.id);
  const next: AssessmentFinding = cur
    ? { ...cur, ...body, updatedAt: Date.now() }
    : { id: newId('fnd'), cycleId, requirementId, assessorUserId: actor.id, ...body, updatedAt: Date.now() };
  save(KEYS.findings, cur ? rows.map(f => (f.id === cur.id ? next : f)) : [...rows, next]);
  appendAudit(actor, {
    action: 'finding.save', targetType: 'finding', targetId: next.id, programmeId: cycle.programmeId,
    before: cur ? { afi: cur.afi.length, strengths: cur.strengths.length } : undefined, after: { requirementId, afi: body.afi.length, strengths: body.strengths.length },
  });
  return next;
}

// ─── Committee rating (รายเกณฑ์) ─────────────────────────────────────────
function checkScore(score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 7) throw new AunqaError('invalid', 'คะแนนต้องเป็นจำนวนเต็ม 1–7');
}

/** คะแนนกรรมการรายเกณฑ์ 1–8 (requirementId = `C<no>`, criterionNo) — แยกแถวจาก self เสมอ */
export function setCriterionRating(actor: AppUser, cycleId: string, criterionNo: number, score: number, rationale = ''): Rating {
  checkScore(score);
  if (!listCriteria().some(c => c.no === criterionNo)) throw new AunqaError('not_found', 'ไม่พบเกณฑ์');
  const cycle = assertAssessorWrite(actor, cycleId, 'rating.committee');
  const why = field(rationale, 'เหตุผล');
  const rows = load<Rating>(KEYS.ratings);
  const cur = rows.find(r => r.cycleId === cycleId && r.raterType === 'committee' && r.criterionNo === criterionNo && r.raterUserId === actor.id);
  const next: Rating = cur
    ? { ...cur, score, rationale: why, at: Date.now() }
    : { id: newId('rat'), cycleId, requirementId: `C${criterionNo}`, criterionNo, raterType: 'committee', raterUserId: actor.id, score, rationale: why, at: Date.now() };
  save(KEYS.ratings, cur ? rows.map(r => (r.id === cur.id ? next : r)) : [...rows, next]);
  appendAudit(actor, {
    action: 'rating.committee', targetType: 'criterion', targetId: `${cycleId}::C${criterionNo}`, programmeId: cycle.programmeId,
    before: cur ? { score: cur.score } : undefined, after: { score },
  });
  return next;
}

/** คะแนนกรรมการรายเกณฑ์ที่ผู้ใช้มองเห็นได้ */
export function listCriterionRatings(user: AppUser, cycleId: string): Rating[] {
  const c = readCycle(user, cycleId);
  if (!canSeeAssessment(user, c)) return [];
  return load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'committee' && r.criterionNo !== undefined)
    .sort((a, b) => (a.criterionNo! - b.criterionNo!) || a.raterUserId.localeCompare(b.raterUserId));
}

// ─── Verdict (เลือกเอง ไม่คำนวณ) ──────────────────────────────────────────
/** overall verdict 1–7 ที่กรรมการ "เลือกเอง" — ระบบไม่คำนวณ/ไม่เฉลี่ย/ไม่เสนอค่า */
export function setVerdict(actor: AppUser, cycleId: string, verdict: number, rationale = ''): AssessmentVerdict {
  checkScore(verdict);
  const cycle = assertAssessorWrite(actor, cycleId, 'rating.committee');
  const why = field(rationale, 'เหตุผลประกอบ verdict');
  const rows = load<AssessmentVerdict>(KEYS.verdicts);
  const cur = rows.find(v => v.cycleId === cycleId && v.assessorUserId === actor.id);
  const next: AssessmentVerdict = cur
    ? { ...cur, verdict, rationale: why, at: Date.now() }
    : { id: newId('vrd'), cycleId, assessorUserId: actor.id, verdict, rationale: why, at: Date.now() };
  save(KEYS.verdicts, cur ? rows.map(v => (v.id === cur.id ? next : v)) : [...rows, next]);
  appendAudit(actor, {
    action: 'verdict.set', targetType: 'cycle', targetId: cycleId, programmeId: cycle.programmeId,
    before: cur ? { verdict: cur.verdict } : undefined, after: { verdict },
  });
  return next;
}

export function listVerdicts(user: AppUser, cycleId: string): AssessmentVerdict[] {
  const c = readCycle(user, cycleId);
  if (!canSeeAssessment(user, c)) return [];
  return load<AssessmentVerdict>(KEYS.verdicts).filter(v => v.cycleId === cycleId).sort((a, b) => a.assessorUserId.localeCompare(b.assessorUserId));
}

/** ความคืบหน้าของกรรมการคนนี้ (ใช้เปิดปุ่ม "เสร็จสิ้นการประเมิน" = transitionCycle → assessed) */
export function getAssessorProgress(user: AppUser, cycleId: string): {
  ratedCriteria: number[]; missingCriteria: number[]; hasVerdict: boolean; findingCount: number; canFinish: boolean;
} {
  const c = readCycle(user, cycleId);
  if (!isAssessorOf(user, c.id)) throw new AunqaError('forbidden', 'เฉพาะกรรมการของรอบนี้');
  const rated = load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'committee' && r.raterUserId === user.id && r.criterionNo !== undefined)
    .map(r => r.criterionNo!);
  const missing = listCriteria().map(x => x.no).filter(n => !rated.includes(n));
  const hasVerdict = load<AssessmentVerdict>(KEYS.verdicts).some(v => v.cycleId === cycleId && v.assessorUserId === user.id);
  const findingCount = load<AssessmentFinding>(KEYS.findings).filter(f => f.cycleId === cycleId && f.assessorUserId === user.id).length;
  return { ratedCriteria: rated.sort((a, b) => a - b), missingCriteria: missing, hasVerdict, findingCount, canFinish: c.status === 'under_assessment' && !missing.length && hasVerdict };
}
