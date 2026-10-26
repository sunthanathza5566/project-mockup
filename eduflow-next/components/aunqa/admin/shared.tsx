'use client';

/**
 * ของใช้ร่วมของหน้า `/app/admin` (friendly-spec §F8 · saas-spec §P18/C2/C5/C11)
 * - ตัวเลือกขอบเขตบทบาท (มหาวิทยาลัย/คณะ/หลักสูตร/รอบ) ต่อมหาวิทยาลัย — super_admin อนุมัติคำขอข้ามมหาวิทยาลัยได้
 *   จึงสร้างรายการตาม `universityId` ของเป้าหมาย ไม่ใช่ของผู้ใช้ปัจจุบัน
 * - บทบาทที่ให้ได้: ทุก role ยกเว้น `super_admin` (เว้นผู้ให้เป็น super_admin) — ตรงกับกฎ backend (ADR-AUTH-001 A4)
 * - ป้ายสถานะบัญชี (สี + ไอคอน + ข้อความ) · class ของตารางแบบซ้อนการ์ดบนมือถือ (§C5)
 */
import type { AppUser, AssessmentCycle, RoleAssignment, RoleCode, UserStatus } from '@/lib/types';
import { getFaculties, getProgrammes, hasRole } from '@/lib/api';
import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/lib/ui/status';
import { ROLE_TH } from '@/lib/ui/aunqa';
import { Badge } from '@/components/aunqa/common';

export interface ScopeOption { key: string; label: string }

/** ขอบเขตที่เลือกได้ในมหาวิทยาลัยหนึ่ง — ค่า `<scopeType>:<scopeId>` (ป้ายเดิมของหน้า admin) */
export function scopeOptions(universityId: string, cycles: AssessmentCycle[]): ScopeOption[] {
  return [
    { key: `university:${universityId}`, label: 'ทั้งมหาวิทยาลัย' },
    ...getFaculties(universityId).map(f => ({ key: `faculty:${f.id}`, label: `คณะ ${f.nameTh}` })),
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
