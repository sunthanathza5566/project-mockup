/**
 * RBAC (spec 3.2) — ตรวจสิทธิ์ที่ชั้น store ทุก write ไม่ใช่แค่ซ่อนปุ่ม
 * TODO(PostgreSQL): บังคับซ้ำด้วย RLS (university_id = current_user_university()) + role_assignments
 */
import type { AppUser, RoleAssignment, RoleCode } from '../types';

export type Action =
  | 'university.manage' | 'user.manage'
  | 'cycle.create' | 'cycle.assign' | 'cycle.submit' | 'assessor.assign'
  | 'sar.write' | 'sar.review' | 'sar.approve' | 'sar.return'
  | 'evidence.write' | 'evidence.verify'
  | 'metric.write'
  | 'ai.use' | 'ai.check' | 'ai.summarize'
  | 'rating.self' | 'rating.committee' | 'finding.write'
  | 'curriculum.write' | 'action.write' | 'action.verify'
  | 'comment'
  | 'approve.faculty' | 'approve.final' | 'cycle.close' | 'cycle.reopen'
  | 'audit.view' | 'read';

/** ขอบเขตของ resource ที่กำลังทำ action */
export interface Scope {
  universityId: string;
  facultyId?: string;
  programmeId?: string;
  cycleId?: string;
  /** เจ้าของ section — ใช้กับ programme_staff (เฉพาะข้อที่ได้รับ) */
  ownerUserId?: string;
}

/** ตาราง role → action (สอดคล้องตาราง 3.2) · 'own' = ต้องเป็นเจ้าของข้อ */
const POLICY: Record<RoleCode, Partial<Record<Action, true | 'own'>>> = {
  super_admin: { 'university.manage': true, 'user.manage': true, 'audit.view': true, read: true },
  uni_admin: {
    'user.manage': true, 'cycle.create': true, 'assessor.assign': true, 'cycle.close': true,
    'audit.view': true, read: true,
  },
  programme_chair: {
    'cycle.create': true, 'cycle.assign': true, 'cycle.submit': true, 'cycle.close': true,
    'sar.write': true, 'sar.review': true, 'sar.approve': true, 'sar.return': true,
    'evidence.write': true, 'evidence.verify': true,
    'metric.write': true, 'ai.use': true, 'ai.check': true, 'rating.self': true, comment: true,
    'curriculum.write': true, 'action.write': true, 'action.verify': true,
    'audit.view': true, read: true,
  },
  programme_staff: {
    'sar.write': 'own', 'evidence.write': true, 'ai.use': true, 'ai.check': true,
    'rating.self': 'own', 'curriculum.write': true, 'action.write': 'own', read: true,
  },
  data_staff: { 'evidence.write': true, 'metric.write': true, 'ai.check': true, read: true },
  faculty_qa: {
    comment: true, 'sar.review': true, 'sar.return': true, 'approve.faculty': true, 'assessor.assign': true,
    'evidence.verify': true, 'ai.use': true, 'ai.check': true, 'cycle.close': true, 'action.verify': true,
    'audit.view': true, read: true,
  },
  dean: { comment: true, 'sar.review': true, 'sar.return': true, 'approve.final': true, 'cycle.reopen': true, 'audit.view': true, read: true },
  assessor: {
    comment: true, 'rating.committee': true, 'finding.write': true, 'ai.summarize': true, read: true,
  },
};

/** assignment นี้ครอบคลุม scope ที่ขอหรือไม่ */
function covers(a: RoleAssignment, s: Scope): boolean {
  switch (a.scopeType) {
    case 'university': return a.scopeId === s.universityId || a.scopeId === '*';
    case 'faculty':    return !!s.facultyId && a.scopeId === s.facultyId;
    case 'programme':  return !!s.programmeId && a.scopeId === s.programmeId;
    case 'cycle':      return !!s.cycleId && a.scopeId === s.cycleId;
  }
}

export function can(user: AppUser | null | undefined, action: Action, scope: Scope): boolean {
  if (!user) return false;
  const isSuper = user.roles.some(r => r.role === 'super_admin');
  // multi-tenant: ทุก role ยกเว้น super_admin เห็นเฉพาะ university ตน
  if (!isSuper && user.universityId !== scope.universityId) return false;

  for (const a of user.roles) {
    const rule = POLICY[a.role]?.[action];
    if (!rule) continue;
    if (a.role === 'super_admin') return true;
    // assessor: เห็น/ทำได้เฉพาะ cycle ที่ได้รับมอบหมายเท่านั้น (scopeType 'cycle')
    if (a.role === 'assessor') {
      if (a.scopeType === 'cycle' && scope.cycleId === a.scopeId) return true;
      continue;
    }
    if (!covers(a, scope)) continue;
    if (rule === 'own' && scope.ownerUserId !== user.id) continue;
    return true;
  }
  return false;
}

export function hasRole(user: AppUser | null | undefined, role: RoleCode): boolean {
  return !!user && user.roles.some(r => r.role === role);
}

/** assessor ที่ถูกมอบหมายให้ cycle นี้หรือไม่ */
export function isAssessorOf(user: AppUser | null | undefined, cycleId: string): boolean {
  return !!user && user.roles.some(r => r.role === 'assessor' && r.scopeType === 'cycle' && r.scopeId === cycleId);
}
