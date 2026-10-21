/** ป้ายข้อความ/สีกลางของ AUN-QA Copilot (ไทย) — ใช้ร่วมกันทุกหน้า */
import type {
  AppUser, CycleStatus, EvidenceKind, GapSeverity, HeatLevel, PdcaStage, RoleCode, SectionStatus,
} from '@/lib/types';
import { AunqaError, can, getProgrammes, programmeScope, type Action } from '@/lib/api';

export const ROLE_TH: Record<RoleCode, string> = {
  super_admin: 'ผู้ดูแลระบบสูงสุด', uni_admin: 'ผู้ดูแลมหาวิทยาลัย', programme_chair: 'ประธานหลักสูตร',
  programme_staff: 'อาจารย์/เจ้าหน้าที่หลักสูตร', data_staff: 'เจ้าหน้าที่ข้อมูล', faculty_qa: 'QA คณะ',
  dean: 'คณบดี', assessor: 'กรรมการประเมิน',
};

export const CYCLE_STATUS_TH: Record<CycleStatus, string> = {
  draft: 'ร่าง', in_progress: 'กำลังดำเนินการ', under_review: 'รอ QA คณะตรวจ', revision_requested: 'ส่งกลับแก้ไข',
  faculty_approved: 'QA คณะอนุมัติ รอคณบดี', final_approved: 'อนุมัติสุดท้าย (ล็อกแล้ว)',
  under_assessment: 'อยู่ระหว่างประเมิน', assessed: 'ประเมินแล้ว', closed: 'ปิดรอบ',
};

/** ชื่อปุ่มตอนเปลี่ยนสถานะรอบ (ไปยังสถานะ ...) */
export const CYCLE_ACTION_TH: Record<CycleStatus, string> = {
  draft: 'ย้อนเป็นร่าง', in_progress: 'เริ่ม/กลับไปดำเนินการ', under_review: 'ส่งให้ QA คณะตรวจ',
  revision_requested: 'ส่งกลับแก้ไข', faculty_approved: 'อนุมัติ (QA คณะ)', final_approved: 'อนุมัติสุดท้ายและล็อก',
  under_assessment: 'เริ่มการประเมิน', assessed: 'บันทึกว่าประเมินแล้ว', closed: 'ปิดรอบ',
};

export const SECTION_STATUS_TH: Record<SectionStatus, string> = {
  not_started: 'ยังไม่เริ่ม', drafting: 'กำลังเขียน', ready_for_review: 'รอตรวจ',
  changes_requested: 'ส่งกลับแก้', approved: 'อนุมัติแล้ว',
};

export const HEAT_TH: Record<HeatLevel, string> = {
  empty: 'ว่าง', critical: 'วิกฤต', warning: 'เตือน', ok: 'พอใช้', ready: 'พร้อม', approved: 'อนุมัติ',
};

export const SEVERITY_TH: Record<GapSeverity, string> = {
  critical: 'วิกฤต', high: 'สูง', medium: 'กลาง', low: 'ต่ำ',
};
export const SEVERITY_ORDER: GapSeverity[] = ['critical', 'high', 'medium', 'low'];

export const KIND_TH: Record<EvidenceKind, string> = {
  policy: 'นโยบาย/ระเบียบ', plan: 'แผน', minutes: 'รายงานการประชุม', survey: 'แบบสำรวจ',
  statistics: 'สถิติ/ข้อมูล', photo: 'ภาพถ่าย', publication: 'ผลงานเผยแพร่', other: 'อื่น ๆ',
};
export const KIND_LIST = Object.keys(KIND_TH) as EvidenceKind[];

export const PDCA_TH: Record<PdcaStage, string> = { P: 'P วางแผน', D: 'D ดำเนินการ', C: 'C ตรวจสอบ', A: 'A ปรับปรุง' };

export const CRITERION_GROUP_TH = { design: 'การออกแบบ', resource: 'ทรัพยากร', output: 'ผลลัพธ์' } as const;

/** ข้อความ error ที่แสดงผู้ใช้ได้ — AunqaError มีข้อความไทยอยู่แล้ว */
export function errMsg(e: unknown): string {
  if (e instanceof AunqaError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
}

export function fmtDate(iso?: string | number): string {
  if (!iso) return '—';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function initials(name: string): string {
  return name.replace(/\s+/g, '').substring(0, 2);
}

/** ชื่อบทบาทหลักของ user (ไว้โชว์บน nav) */
export function primaryRoleTh(u: Pick<AppUser, 'roles'>): string {
  const r = u.roles[0]?.role;
  return r ? ROLE_TH[r] : '—';
}

/** ลิงก์ไปหน้า SAR editor ของข้อหนึ่ง (id = `${cycleId}::${requirementId}`) */
export function sectionHref(cycleId: string, requirementId: string): string {
  return `/app/sections/${encodeURIComponent(`${cycleId}::${requirementId}`)}`;
}

/** อ่าน id จาก useParams (อาจยังเป็น encoded) */
export function decodeParam(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return '';
  try { return decodeURIComponent(s); } catch { return s; }
}

// ─── สิทธิ์ (ใช้ซ่อนเมนู/ปุ่มเท่านั้น — store ตรวจซ้ำเสมอ) ───

/** user มี action นี้ในหลักสูตรใดหลักสูตรหนึ่ง (หรือระดับมหาวิทยาลัย) หรือไม่ */
export function canAny(user: AppUser, action: Action): boolean {
  if (can(user, action, { universityId: user.universityId })) return true;
  return getProgrammes(user.universityId).some(p => can(user, action, programmeScope(p.id)));
}

/** user นี้เป็นกรรมการประเมินล้วน ๆ (read-only ทั้งระบบ) */
export function isAssessorOnly(user: AppUser): boolean {
  return user.roles.length > 0 && user.roles.every(r => r.role === 'assessor');
}
