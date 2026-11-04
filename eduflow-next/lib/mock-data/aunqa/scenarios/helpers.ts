/**
 * TASK-0003 S4 — ตัวช่วยของ scenario seed (ข้อมูลสมมติทั้งหมด · รหัสผ่านทุกบัญชี demo1234)
 * กติกา: สร้างข้อมูลผ่าน API จริงของ lib/api เท่านั้น (ให้แจ้งเตือน / review event / audit / version เกิดครบเหมือนผู้ใช้กด)
 *   ข้อยกเว้นเดียว: โครงสร้างองค์กรของ uni ที่ 2 (คณะ/หลักสูตร) ไม่มี API สร้าง → เขียนผ่าน save() แบบเดียวกับ lib/api/init.ts (ดู tenant.ts)
 */
import * as api from '../../../api';
import { KEYS, load } from '../../../api/db';
import type { AppNotification, AppUser, CycleStatus, RoleAssignment } from '../../../types';

export const PW = 'demo1234';
export const UNI = 'uni-demo';
export const FAC = 'fac-demo-sci';
export const CS = 'prog-demo-cs';
export const DS = 'prog-demo-ds';
export const DEMO_CYCLE = 'cycle-demo-2569';
export const DOMAIN = 'sample-uni.example';
const DAY = 86_400_000;

/** วันที่ ISO (YYYY-MM-DD) ห่างจากวันนี้ n วัน (ลบ = ย้อนหลัง) */
export function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

/** ผู้ใช้จาก store ตาม username (ใช้เป็น actor) */
export function u(username: string): AppUser {
  const x = api.getAllUsers().find(r => r.username.toLowerCase() === username.toLowerCase());
  if (!x) throw new Error(`[scenario] ไม่พบผู้ใช้ ${username}`);
  return x;
}
export function maybeUser(username: string): AppUser | undefined {
  return api.getAllUsers().find(r => r.username.toLowerCase() === username.toLowerCase());
}

/** สร้างผู้ใช้ผ่าน createUser ถ้ายังไม่มี (idempotent) */
export async function ensureUser(
  actor: AppUser, username: string, fullName: string, roles: RoleAssignment[], email?: string,
): Promise<AppUser> {
  const have = maybeUser(username);
  if (have) return have;
  await api.createUser(actor, { username, password: PW, fullName, roles, email: email ?? `${username}@${DOMAIN}` });
  return u(username);
}

export const staffOf = (programmeId: string): RoleAssignment => ({ role: 'programme_staff', scopeType: 'programme', scopeId: programmeId });
export const chairOf = (programmeId: string): RoleAssignment => ({ role: 'programme_chair', scopeType: 'programme', scopeId: programmeId });

export function allRequirementIds(): string[] {
  return api.listRequirements().map(r => r.id).sort(api.compareReqId);
}

/** ข้อความ narrative สั้น ๆ (สมมติ) — ไม่อ้าง [E-…] จึงไม่ติด validateCitations */
export function shortNarrative(requirementId: string, year: number): string {
  return `ผลการดำเนินงานข้อ ${requirementId} ปีการศึกษา ${year} (ข้อมูลทดสอบ scenario): หลักสูตรวางแผน ดำเนินการ ติดตามผล และนำผลไปปรับปรุงตามวงจร PDCA`;
}

export function cycleExists(id: string): boolean {
  return load<{ id: string }>(KEYS.cycles).some(c => c.id === id);
}

/**
 * แจ้งเตือนของรอบนี้ที่สร้างก่อน `before` → อ่านแล้ว (ผ่าน markRead ของผู้รับแต่ละคน)
 * ใช้กับรอบย้อนหลัง: ประวัติยังอยู่ครบในกระดิ่ง แต่ไม่ท่วมตัวนับ "ยังไม่อ่าน" ของบัญชีเดโม่
 * อ่าน store ตรงเพื่อหา id เท่านั้น (ไม่เรียก listNotifications เพราะมันสร้างแจ้งเตือน deadline เป็นผลข้างเคียง)
 */
export function markCycleNoticesRead(cycleId: string, before: number): number {
  const rows = load<AppNotification>(KEYS.notifications).filter(n => n.cycleId === cycleId && !n.readAt && n.createdAt < before);
  const byUser = new Map<string, string[]>();
  rows.forEach(n => byUser.set(n.userId, [...(byUser.get(n.userId) ?? []), n.id]));
  let count = 0;
  byUser.forEach((ids, uid) => {
    const who = api.getAllUsers().find(x => x.id === uid);
    if (!who) return;
    ids.forEach(id => { api.markRead(who, id); count++; });
  });
  return count;
}

/** รอให้ Date.now() เดินอย่างน้อย 1 ms — กันแจ้งเตือนขั้นสุดท้ายมี createdAt เท่ากับประวัติ (markCycleNoticesRead ใช้ <) */
export async function tick(): Promise<number> {
  const t = Date.now();
  while (Date.now() <= t) await new Promise(r => setTimeout(r, 1));
  return Date.now();
}

/**
 * รันฟังก์ชันโดยให้ Date.now() ย้อนหลัง `days` วัน (ใช้สร้างลิงก์เชิญที่หมดอายุแล้วผ่าน inviteUser จริง)
 * คืนค่าเดิมเสมอ (finally) — ใช้กับข้อมูลเดโม่เท่านั้น
 */
export async function withClockShift<T>(days: number, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  const shift = days * DAY;
  Date.now = () => real() + shift;
  try { return await fn(); } finally { Date.now = real; }
}

export type BuildTarget = CycleStatus | 'revision_2';
