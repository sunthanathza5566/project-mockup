/**
 * Preflight ก่อนเปลี่ยนสถานะรอบ (ADR-UI-001 B4) — อ่านอย่างเดียว ไม่เขียน store/audit
 * ใช้แสดงคำเตือน (gap วิกฤต/PII/คำแปล/ยังไม่ประเมินตนเอง/ไม่มีกรรมการ) ก่อนกด และใน dialog ยืนยัน
 * คำเตือนไม่บล็อก — ผู้มีอำนาจตัดสิน · `transitionCycle` ไม่ถูกเปลี่ยน
 * blockers = เงื่อนไขเดียวกับที่ transitionCycle จะ throw (ต้องแก้คู่กันถ้าเปลี่ยนเงื่อนไขใน workflow.ts)
 */
import type {
  AppUser, AssessmentVerdict, CycleStatus, GapSeverity, PreflightWarning, Rating, SarSection, TransitionPreflight,
} from '../types';
import { getCycle } from './cycle.store';
import { KEYS, load } from './db';
import { compareReqId, listCriteria } from './framework';
import { getGaps } from './dashboard';
import { can, isAssessorOf } from './rbac';
import { isActiveUser } from './auth.api';
import { CYCLE_TRANSITIONS, cycleScope } from './workflow';

const GAP_WARNING_TARGETS: CycleStatus[] = ['under_review', 'faculty_approved', 'final_approved'];

const uniqSorted = (ids: string[]) => Array.from(new Set(ids)).sort(compareReqId);

export function getTransitionPreflight(user: AppUser, cycleId: string, to: CycleStatus): TransitionPreflight {
  const cycle = getCycle(user, cycleId); // throw forbidden / not_found เดิม
  const rule = CYCLE_TRANSITIONS.find(t => t.from === cycle.status && t.to === to);
  const allowed = !!rule && can(user, rule.action, cycleScope(cycle));

  const sections = load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId);
  const approvedCount = sections.filter(s => s.status === 'approved').length;

  // ── blockers (ต้องตรงกับ transitionCycle) ──
  const blockers: string[] = [];
  if (to === 'under_review' || to === 'faculty_approved') {
    const open = sections.length - approvedCount;
    if (open) blockers.push(`ยังมี ${open} ข้อที่ไม่ผ่านการอนุมัติ`);
  }
  if (to === 'assessed') {
    const criteriaNos = listCriteria().map(c => c.no);
    const assessors = load<AppUser>(KEYS.users).filter(u => isActiveUser(u) && isAssessorOf(u, cycleId));
    const committee = load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'committee');
    const waiting = assessors
      .map(u => ({ name: u.fullName, missing: criteriaNos.filter(n => !committee.some(r => r.raterUserId === u.id && r.criterionNo === n)) }))
      .filter(w => w.missing.length);
    if (waiting.length) blockers.push(`ยังรอกรรมการให้คะแนนรายเกณฑ์ให้ครบ: ${waiting.map(w => `${w.name} (ขาด ${w.missing.length} เกณฑ์)`).join(', ')}`);
    if (!load<AssessmentVerdict>(KEYS.verdicts).some(v => v.cycleId === cycleId)) blockers.push('ยังไม่มีกรรมการเลือก verdict');
  }

  // ── gap counts + warnings ──
  const gaps = getGaps(user, cycleId);
  const gapCounts: Record<GapSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  gaps.forEach(g => { gapCounts[g.severity]++; });

  const warnings: PreflightWarning[] = [];
  const push = (code: PreflightWarning['code'], count: number, messageTh: string, requirementIds: string[]) => {
    if (count > 0) warnings.push({ code, count, messageTh, requirementIds: uniqSorted(requirementIds) });
  };
  if (GAP_WARNING_TARGETS.includes(to)) {
    const crit = gaps.filter(g => g.severity === 'critical');
    push('critical_gaps', crit.length, `ยังมีช่องว่างระดับวิกฤต ${crit.length} รายการ`, crit.map(g => g.requirementId));
    const high = gaps.filter(g => g.severity === 'high');
    push('high_gaps', high.length, `ยังมีช่องว่างระดับสูง ${high.length} รายการ`, high.map(g => g.requirementId));
    const pii = gaps.filter(g => g.ruleId === 'R6');
    push('pii_unresolved', pii.length, `หลักฐานที่มีข้อมูลส่วนบุคคลยังไม่ได้จัดการ ${pii.length} รายการ`, pii.map(g => g.requirementId));
    const tr = gaps.filter(g => g.ruleId === 'R11');
    push('translation_review', tr.length, `คำแปลที่ยังไม่ได้ตรวจยืนยัน ${tr.length} รายการ`, tr.map(g => g.requirementId));
    const selfRated = new Set(load<Rating>(KEYS.ratings)
      .filter(r => r.cycleId === cycleId && r.raterType === 'self').map(r => r.requirementId));
    const noSelf = sections.filter(s => !selfRated.has(s.requirementId)).map(s => s.requirementId);
    push('missing_self_rating', noSelf.length, `ยังไม่ได้ประเมินตนเอง ${noSelf.length} ข้อ`, noSelf);
  }
  if (to === 'under_assessment' && !load<AppUser>(KEYS.users).some(u => isActiveUser(u) && isAssessorOf(u, cycleId))) {
    push('no_assessor', 1, 'ยังไม่ได้มอบหมายกรรมการประเมิน', []);
  }

  return { to, allowed, blockers, warnings, gapCounts, approvedCount, totalSections: sections.length };
}
