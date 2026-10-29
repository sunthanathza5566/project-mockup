/** Organization (M1) — read-only getters ของ university/faculty/programme/user (เขียนผ่าน init/users.store) */
import type { AppUser, Faculty, Programme, University } from '../types';
import { KEYS, load } from './db';
import type { Scope } from './rbac';

export function getUniversities(): University[] { return load<University>(KEYS.universities); }
export function getUniversity(id: string): University | undefined { return getUniversities().find(u => u.id === id); }
export function getFaculties(universityId?: string): Faculty[] {
  const all = load<Faculty>(KEYS.faculties);
  return universityId ? all.filter(f => f.universityId === universityId) : all;
}
export function getProgrammes(universityId?: string): Programme[] {
  const all = load<Programme>(KEYS.programmes);
  return universityId ? all.filter(p => p.universityId === universityId) : all;
}
export function getProgramme(id: string): Programme | undefined { return load<Programme>(KEYS.programmes).find(p => p.id === id); }
export function getAllUsers(): AppUser[] { return load<AppUser>(KEYS.users); }
export function getUserById(id: string): AppUser | undefined { return getAllUsers().find(u => u.id === id); }

/**
 * users ใน university เดียวกัน (ไม่รวม password) — รวม active/invited/suspended
 * ไม่รวม pending (คำขอเข้าใช้งานอยู่ที่ listAccessRequests) — ADR-AUTH-001 A5
 */
export function listUsers(universityId: string): Omit<AppUser, 'password'>[] {
  return getAllUsers()
    .filter(u => u.universityId === universityId && u.status !== 'pending')
    .map(({ password: _pw, ...rest }) => rest);
}

/**
 * มหาวิทยาลัยจากโดเมนอีเมล: โดเมนหลัง @ (ตัวเล็ก) = emailDomain หรือเป็น subdomain (*.emailDomain) · ไม่พบ = null
 * ใช้จำกัดผู้ขอเข้าใช้งานให้เป็นบุคลากรของมหาวิทยาลัยที่ใช้ระบบ (ADR-AUTH-001 A3)
 */
export function findUniversityByEmail(email: string): University | null {
  if (typeof email !== 'string') return null;
  const at = email.trim().lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.trim().slice(at + 1).toLowerCase();
  if (!domain) return null;
  return getUniversities().find(u => {
    const d = (u.emailDomain || '').toLowerCase();
    return !!d && (domain === d || domain.endsWith(`.${d}`));
  }) ?? null;
}

/** สร้าง Scope ของ programme (เติม facultyId/universityId ให้ครบ) */
export function programmeScope(programmeId: string, extra: Partial<Scope> = {}): Scope {
  const p = getProgramme(programmeId);
  if (!p) return { universityId: '', ...extra };
  return { universityId: p.universityId, facultyId: p.facultyId, programmeId: p.id, ...extra };
}
