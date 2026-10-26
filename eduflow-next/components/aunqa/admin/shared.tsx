'use client';

/**
 * ของใช้ร่วมของหน้า `/app/admin` (friendly-spec §F8 · saas-spec §P18/C2/C5/C11)
 * - ตัวเลือกขอบเขตบทบาท (มหาวิทยาลัย/คณะ/หลักสูตร/รอบ) ต่อมหาวิทยาลัย — super_admin อนุมัติคำขอข้ามมหาวิทยาลัยได้
 *   จึงสร้างรายการตาม `universityId` ของเป้าหมาย ไม่ใช่ของผู้ใช้ปัจจุบัน
 * - บทบาทที่ให้ได้: ทุก role ยกเว้น `super_admin` (เว้นผู้ให้เป็น super_admin) — ตรงกับกฎ backend (ADR-AUTH-001 A4)
 * - ป้ายสถานะบัญชี (สี + ไอคอน + ข้อความ) · class ของตารางแบบซ้อนการ์ดบนมือถือ (§C5)
 * - R2-F10 (BUG-0002-P2): ตัวเลือก "ขอบเขต" ทุกจุด (อนุมัติคำขอ / เพิ่มผู้ใช้ / เพิ่มบทบาท) แสดงเฉพาะระดับที่ใช้ได้กับ
 *   บทบาทที่เลือก — ใช้ `allowedScopeTypes` ของ backend (R2-B4) เป็นแหล่งเดียว ผ่าน `scopesForRole` / `pickScope`
 * - R2-F10 (ui m5): ป้ายขอบเขตไม่ซ้ำคำ ("คณะวิทยาศาสตร์…" ไม่ใช่ "คณะ คณะวิทยาศาสตร์…") และไม่มี scopeType อังกฤษดิบ
 */
import type { AppUser, AssessmentCycle, RoleAssignment, RoleCode, UserStatus } from '@/lib/types';
import { allowedScopeTypes, getFaculties, getProgrammes, hasRole } from '@/lib/api';
import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/lib/ui/status';
import { ROLE_TH } from '@/lib/ui/aunqa';
import { Badge } from '@/components/aunqa/common';

export interface ScopeOption { key: string; label: string }

/** ป้ายคณะ: ชื่อที่ขึ้นต้นด้วย "คณะ" อยู่แล้วไม่เติมซ้ำ (ui m5) */
export function facultyLabel(nameTh: string): string {
  return nameTh.startsWith('คณะ') ? nameTh : `คณะ ${nameTh}`;
}

/** ขอบเขตที่เลือกได้ในมหาวิทยาลัยหนึ่ง — ค่า `<scopeType>:<scopeId>` (ป้ายเดิมของหน้า admin) */
export function scopeOptions(universityId: string, cycles: AssessmentCycle[]): ScopeOption[] {
  return [
    { key: `university:${universityId}`, label: 'ทั้งมหาวิทยาลัย' },
    ...getFaculties(universityId).map(f => ({ key: `faculty:${f.id}`, label: facultyLabel(f.nameTh) })),
    ...getProgrammes(universityId).map(p => ({ key: `programme:${p.id}`, label: `หลักสูตร ${p.code}` })),
    ...cycles.filter(c => c.universityId === universityId)
      .map(c => ({ key: `cycle:${c.id}`, label: `รอบ ${c.academicYear} (${c.id})` })),
  ];
}

export function parseScope(key: string): Pick<RoleAssignment, 'scopeType' | 'scopeId'> {
  const i = key.indexOf(':');
  return { scopeType: key.slice(0, i) as RoleAssignment['scopeType'], scopeId: key.slice(i + 1) };
}

export function scopeKey(r: Pick<RoleAssignment, 'scopeType' | 'scopeId'>): string {
  return `${r.scopeType}:${r.scopeId}`;
}

/** BUG-0002-P2: ตัวเลือกขอบเขตที่ใช้ได้กับบทบาทนี้ (ลำดับเดิมของ scopeOptions) — กติกาจาก backend `allowedScopeTypes` */
export function scopesForRole(scopes: ScopeOption[], role: RoleCode): ScopeOption[] {
  const types = allowedScopeTypes(role);
  return scopes.filter(s => types.includes(parseScope(s.key).scopeType));
}

/**
 * เลือกค่าขอบเขตหลังเปลี่ยนบทบาท: คงค่าเดิมถ้ายังใช้ได้ → ค่าที่แนะนำตัวแรกที่อยู่ในรายการ → ตัวแรกของรายการ
 * `fallbackFirst=false` = ไม่เดา (คืน '' ให้ผู้ใช้เลือกเอง) — ใช้ตอนอนุมัติคำขอ กันให้สิทธิ์ผิดหน่วยงานโดยไม่ตั้งใจ
 */
export function pickScope(options: ScopeOption[], current: string, prefer: string[] = [], fallbackFirst = true): string {
  if (current && options.some(o => o.key === current)) return current;
  const hit = prefer.find(k => options.some(o => o.key === k));
  if (hit) return hit;
  return fallbackFirst ? options[0]?.key ?? '' : '';
}

/** ป้ายขอบเขตของบทบาทที่มีอยู่ — ไม่พบในรายการ (เช่น super_admin `*`) ใช้คำไทยตามระดับ ไม่แสดงรหัสอังกฤษ (P4/m5) */
export function scopeLabel(r: Pick<RoleAssignment, 'scopeType' | 'scopeId'>, scopes: ScopeOption[]): string {
  const hit = scopes.find(s => s.key === scopeKey(r));
  if (hit) return hit.label;
  if (r.scopeType === 'university') return r.scopeId === '*' ? 'ทุกมหาวิทยาลัย' : 'ทั้งมหาวิทยาลัย';
  return { faculty: 'คณะ', programme: 'หลักสูตร', cycle: 'รอบประเมิน' }[r.scopeType];
}

/** ข้อความในช่องขอบเขตเมื่อยังไม่มีตัวเลือกที่ใช้ได้ (เช่น กรรมการแต่ยังไม่มีรอบประเมิน) */
export function emptyScopeText(role: RoleCode): string {
  return allowedScopeTypes(role).includes('cycle') ? 'ยังไม่มีรอบประเมินให้เลือก' : 'ไม่มีขอบเขตที่ใช้ได้';
}

export const isSuperAdmin = (u: AppUser): boolean => hasRole(u, 'super_admin');

/** บทบาทที่ผู้ใช้นี้มอบให้คนอื่นได้ (non-super ให้ super_admin ไม่ได้ — backend ตรวจซ้ำ) */
export function grantableRoles(actor: AppUser): RoleCode[] {
  const all = Object.keys(ROLE_TH) as RoleCode[];
  return isSuperAdmin(actor) ? all : all.filter(r => r !== 'super_admin');
}

const STATUS_VIEW: Record<UserStatus, { label: string; tone: Tone; icon: IconName }> = {
  active: { label: 'ใช้งานอยู่', tone: 'ok', icon: 'check-circle' },
  invited: { label: 'รอตั้งรหัสผ่าน', tone: 'info', icon: 'clock' },
  pending: { label: 'รออนุมัติ', tone: 'info', icon: 'clock' },
  suspended: { label: 'ระงับ', tone: 'warn', icon: 'lock' },
};

export function UserStatusBadge({ status, testId }: { status: UserStatus; testId?: string }) {
  const v = STATUS_VIEW[status];
  return <Badge tone={v.tone} icon={v.icon} testId={testId}>{v.label}</Badge>;
}

/** คำแนะนำระบบสาธิตเรื่องลิงก์เชิญ (U2) — ใช้ทั้งกล่องผลเชิญฝั่งผู้ดูแลและหน้า /invite ให้ข้อความตรงกัน */
export const INVITE_DEMO_NOTE =
  'ระบบสาธิต: ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น — ต้องเปิดลิงก์เชิญในเบราว์เซอร์เดียวกับที่ผู้ดูแลใช้สร้างคำเชิญ ถ้าเปิดจากเครื่องหรือเบราว์เซอร์อื่น ลิงก์จะใช้ไม่ได้';

/** recipe กลางของหน้า (friendly-spec §F13: การ์ด rounded-xl, ระยะ p-5 md:p-6) */
export const CARD = 'rounded-xl border bg-card p-5 text-card-foreground shadow-sm dark:shadow-none md:p-6';
export const LABEL = 'block text-base font-medium text-foreground';

/** §C5 ตารางซ้อนเป็นการ์ดบนมือถือ (<768) — ป้ายคอลัมน์มาจาก `data-label` ของ td */
export const STACK = {
  table: 'max-md:block',
  thead: 'max-md:sr-only',
  tbody: 'max-md:block',
  tr: 'max-md:block max-md:px-4 max-md:py-3',
  td: 'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium ' +
    'max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]',
} as const;
