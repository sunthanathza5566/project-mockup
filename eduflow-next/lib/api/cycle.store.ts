/**
 * Assessment cycle & assignment (M3)
 * TODO(PostgreSQL): assessment_cycles + sar_sections (INSERT 53 แถวใน transaction เดียว)
 */
import type { AppUser, AssessmentCycle, EvidenceLink, SarSection } from '../types';
import { newId } from '../utils/hash';
import { materializeActionEvidence } from './action.store';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { FRAMEWORK_CODE, compareReqId, listRequirements } from './framework';
import { notify } from './notification.store';
import { getAllUsers, getProgramme, getUserById, programmeScope } from './org.store';
import { can } from './rbac';
import { assertCycleWritable, cycleScope, getCycleRaw, saveCycle } from './workflow';
import { saveUsers } from './auth.api';

export const sectionId = (cycleId: string, requirementId: string) => `${cycleId}::${requirementId}`;

const EMPTY_PDCA = { plan: false, do: false, check: false, act: false };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function checkDate(d: string | undefined, label: string) {
  if (d !== undefined && d !== '' && !ISO_DATE.test(d)) throw new AunqaError('invalid', `${label} ต้องเป็นรูปแบบ YYYY-MM-DD`);
}

export interface CreateCycleInput {
  programmeId: string; academicYear: number; submissionDue?: string; assessmentDate?: string;
  /** ดึงร่าง + ลิงก์หลักฐานจากรอบก่อน (หลักฐานต้นฉบับไม่ถูกแตะ/ไม่ copy) */
  copyFromCycleId?: string;
  /** สำหรับ seed เท่านั้น เช่น 'cycle-demo-2569' */
  id?: string;
}

export function createCycle(actor: AppUser, input: CreateCycleInput): AssessmentCycle {
  const prog = getProgramme(input.programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(actor, 'cycle.create', programmeScope(prog.id))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์สร้างรอบประเมิน');
  if (!Number.isInteger(input.academicYear) || input.academicYear < 2400 || input.academicYear > 2700)
    throw new AunqaError('invalid', 'ปีการศึกษาไม่ถูกต้อง (พ.ศ.)');
  checkDate(input.submissionDue, 'วันส่ง'); checkDate(input.assessmentDate, 'วันประเมิน');
  const cycles = load<AssessmentCycle>(KEYS.cycles);
  if (cycles.some(c => c.programmeId === prog.id && c.academicYear === input.academicYear))
    throw new AunqaError('duplicate', 'หลักสูตรนี้มีรอบประเมินปีการศึกษานี้อยู่แล้ว');

  let prev: AssessmentCycle | undefined;
  if (input.copyFromCycleId) {
    prev = cycles.find(c => c.id === input.copyFromCycleId);
    if (!prev || prev.programmeId !== prog.id) throw new AunqaError('invalid', 'รอบก่อนหน้าต้องเป็นของหลักสูตรเดียวกัน');
  }

  const now = Date.now();
  const cycle: AssessmentCycle = {
    id: input.id ?? newId('cyc'), universityId: prog.universityId, programmeId: prog.id, frameworkCode: FRAMEWORK_CODE,
    academicYear: input.academicYear, status: 'draft', submissionDue: input.submissionDue || undefined,
    assessmentDate: input.assessmentDate || undefined, revision: 1, copiedFromCycleId: prev?.id,
    createdAt: now, createdBy: actor.id, updatedAt: now,
  };
  cycles.push(cycle);
  save(KEYS.cycles, cycles);

  // 53 sections อัตโนมัติ
  const prevSections = prev ? load<SarSection>(KEYS.sections).filter(s => s.cycleId === prev!.id) : [];
  const sections: SarSection[] = listRequirements().slice().sort((a, b) => compareReqId(a.id, b.id)).map(r => {
    const p = prevSections.find(s => s.requirementId === r.id);
    const hasText = !!p && !!(p.narrativeTh.trim() || p.narrativeEn.trim());
    return {
      id: sectionId(cycle.id, r.id), cycleId: cycle.id, requirementId: r.id,
      ownerUserId: p?.ownerUserId, due: undefined,
      status: hasText ? 'drafting' : 'not_started',
      narrativeTh: p?.narrativeTh ?? '', narrativeEn: p?.narrativeEn ?? '', lastAuthorId: p?.lastAuthorId,
      pdca: p ? { ...p.pdca } : { ...EMPTY_PDCA }, wordCount: p?.wordCount ?? 0, updatedAt: now,
    };
  });
  save(KEYS.sections, [...load<SarSection>(KEYS.sections), ...sections]);

  if (prev) {
    // ผูกลิงก์หลักฐานเดิมเข้ารอบใหม่ (row ใหม่ · evidence ต้นฉบับไม่ถูกแก้)
    const links = load<EvidenceLink>(KEYS.links);
    const copied = links.filter(l => l.cycleId === prev!.id)
      .map(l => ({ ...l, id: newId('lnk'), cycleId: cycle.id, at: now }));
    save(KEYS.links, [...links, ...copied]);
  }
  // M14: action ที่ done/verified ของหลักสูตร → หลักฐานขั้น Act ผูกกับข้อเดิมในรอบใหม่ (ไม่ว่าจะ copy จากรอบก่อนหรือไม่)
  const actionEvidence = materializeActionEvidence(actor, cycle);
  appendAudit(actor, {
    action: 'cycle.create', targetType: 'cycle', targetId: cycle.id, programmeId: prog.id,
    after: { academicYear: cycle.academicYear, copiedFrom: prev?.id ?? null, sections: sections.length, actionEvidence: actionEvidence.length },
  });
  return cycle;
}

/** รอบที่ user มองเห็น (multi-tenant + assessor เห็นเฉพาะรอบที่ได้รับมอบหมาย) */
export function listCycles(user: AppUser, programmeId?: string): AssessmentCycle[] {
  return load<AssessmentCycle>(KEYS.cycles)
    .filter(c => (!programmeId || c.programmeId === programmeId) && can(user, 'read', cycleScope(c)))
    .sort((a, b) => b.academicYear - a.academicYear);
}

export function getCycle(user: AppUser, id: string): AssessmentCycle {
  const c = getCycleRaw(id);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึงรอบประเมินนี้');
  return c;
}

export function listSections(user: AppUser, cycleId: string): SarSection[] {
  const c = getCycle(user, cycleId);
  return load<SarSection>(KEYS.sections).filter(s => s.cycleId === c.id)
    .sort((a, b) => compareReqId(a.requirementId, b.requirementId));
}

export function getSection(user: AppUser, cycleId: string, requirementId: string): SarSection {
  getCycle(user, cycleId);
  const s = load<SarSection>(KEYS.sections).find(x => x.id === sectionId(cycleId, requirementId));
  if (!s) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  return s;
}

export function updateCycleDates(actor: AppUser, cycleId: string, dates: { submissionDue?: string; assessmentDate?: string }): AssessmentCycle {
  const c = getCycleRaw(cycleId);
  if (!can(actor, 'cycle.assign', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้วันที่ของรอบ');
  assertCycleWritable(c);
  checkDate(dates.submissionDue, 'วันส่ง'); checkDate(dates.assessmentDate, 'วันประเมิน');
  const before = { submissionDue: c.submissionDue, assessmentDate: c.assessmentDate };
  const next = { ...c, ...dates, updatedAt: Date.now() };
  saveCycle(next);
  appendAudit(actor, { action: 'cycle.update_dates', targetType: 'cycle', targetId: c.id, programmeId: c.programmeId, before, after: dates });
  return next;
}

/** มอบหมายเจ้าของ + deadline รายข้อ (requirementIds) — ใช้ได้ทั้งรายข้อและรายเกณฑ์ผ่าน assignCriterion */
export function assignSections(
  actor: AppUser, cycleId: string, requirementIds: string[], ownerUserId: string | null, due?: string,
): SarSection[] {
  const c = getCycleRaw(cycleId);
  if (!can(actor, 'cycle.assign', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์มอบหมายงาน');
  assertCycleWritable(c);
  checkDate(due, 'กำหนดส่ง');
  if (due && c.submissionDue && due > c.submissionDue) throw new AunqaError('invalid', 'กำหนดส่งรายข้อต้องไม่เกินวันส่งของรอบ');
  let owner: AppUser | undefined;
  if (ownerUserId) {
    owner = getUserById(ownerUserId);
    if (!owner || owner.universityId !== c.universityId) throw new AunqaError('invalid', 'ผู้รับผิดชอบไม่ถูกต้อง');
    if (!can(owner, 'sar.write', cycleScope(c, { ownerUserId: owner.id }))) throw new AunqaError('invalid', 'ผู้ใช้นี้ไม่มีสิทธิ์เขียน SAR ของหลักสูตรนี้');
  }
  const rows = load<SarSection>(KEYS.sections);
  const changed: SarSection[] = [];
  const audits: Array<Parameters<typeof appendAudit>[1]> = [];
  // validate ทุกข้อก่อน mutate (cache คืน reference ร่วม) และ audit หลัง save สำเร็จ
  const targets = requirementIds.map(rid => {
    const s = rows.find(x => x.id === sectionId(cycleId, rid));
    if (!s) throw new AunqaError('not_found', `ไม่พบข้อ ${rid}`);
    return s;
  });
  for (const s of targets) {
    const before = { ownerUserId: s.ownerUserId, due: s.due };
    s.ownerUserId = ownerUserId ?? undefined;
    if (due !== undefined) s.due = due || undefined;
    s.updatedAt = Date.now();
    changed.push(s);
    audits.push({
      action: 'section.assign', targetType: 'section', targetId: s.id, programmeId: c.programmeId,
      before, after: { ownerUserId: s.ownerUserId, due: s.due },
    });
  }
  save(KEYS.sections, rows);
  audits.forEach(a => appendAudit(actor, a));
  if (owner && owner.id !== actor.id && changed.length) {
    notify({
      userId: owner.id, kind: 'assigned', cycleId,
      messageTh: `คุณได้รับมอบหมายข้อ ${changed.map(s => s.requirementId).join(', ')}${due ? ` กำหนดส่ง ${due}` : ''}`,
      requirementId: changed[0].requirementId,
    });
  }
  return changed;
}

export function assignCriterion(actor: AppUser, cycleId: string, criterionNo: number, ownerUserId: string | null, due?: string): SarSection[] {
  const ids = listRequirements(criterionNo).map(r => r.id);
  if (!ids.length) throw new AunqaError('invalid', 'ไม่พบเกณฑ์');
  return assignSections(actor, cycleId, ids, ownerUserId, due);
}

/** QA คณะ/uni_admin มอบหมายกรรมการ (assessor) เข้ารอบ — read-only ต่อ SAR/หลักฐาน */
export function assignAssessor(actor: AppUser, cycleId: string, assessorUserId: string): void {
  const c = getCycleRaw(cycleId);
  if (!can(actor, 'assessor.assign', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์มอบหมายกรรมการ');
  const users = getAllUsers();
  const target = users.find(u => u.id === assessorUserId);
  if (!target || target.universityId !== c.universityId) throw new AunqaError('invalid', 'ผู้ใช้ไม่ถูกต้อง');
  if (target.roles.some(r => r.role === 'assessor' && r.scopeType === 'cycle' && r.scopeId === cycleId)) return;
  const before = target.roles;
  target.roles = [...target.roles, { role: 'assessor', scopeType: 'cycle', scopeId: cycleId }];
  saveUsers(users);
  appendAudit(actor, { action: 'cycle.assign_assessor', targetType: 'cycle', targetId: cycleId, programmeId: c.programmeId, before: { roles: before.length }, after: { assessorUserId } });
  notify({ userId: target.id, kind: 'assigned', cycleId, messageTh: `คุณได้รับมอบหมายเป็นกรรมการประเมินรอบ ${c.academicYear}` });
}

/** ผู้ใช้ที่มอบหมายงานเขียน SAR ให้ได้ในหลักสูตรนี้ (สำหรับ dropdown) */
export function listAssignableUsers(actor: AppUser, cycleId: string): { id: string; fullName: string; email: string }[] {
  const c = getCycle(actor, cycleId);
  return getAllUsers()
    .filter(u => u.universityId === c.universityId && can(u, 'sar.write', cycleScope(c, { ownerUserId: u.id })))
    .map(u => ({ id: u.id, fullName: u.fullName, email: u.email }));
}
