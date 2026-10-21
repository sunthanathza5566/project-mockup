/**
 * Auth API (M1) — localStorage + sessionStorage, พร้อมเปลี่ยนเป็น PostgreSQL/Supabase Auth
 * reuse จาก EduFlow เดิม: SHA-256 hash, lockout 5 ครั้ง/5 นาที, session ใน sessionStorage
 *
 * PostgreSQL (อนาคต): users(id, university_id, email, full_name, locale) + role_assignments
 *   รหัสผ่าน → Supabase Auth / bcrypt ฝั่ง server
 */
import type { AppUser, RoleAssignment, RoleCode, Session } from '../types';
import { AunqaError, KEYS, load, save } from './db';
import { readJSON, writeJSON } from './storage-cache';
import { appendAudit } from './audit.store';
import { sha256Hex } from '../utils/hash';
import { can } from './rbac';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const HASH_PREFIX = 'sha256:';

// ─── Password hashing ────────────────────────────────────────────────────
// TODO(PostgreSQL): เปลี่ยนเป็น bcrypt/argon2 ฝั่ง server
export async function hashPassword(pw: string): Promise<string> {
  return HASH_PREFIX + await sha256Hex(`aunqa::${pw}`);
}

/** รองรับ hash และ plaintext จาก seed (upgrade เป็น hash อัตโนมัติเมื่อ login สำเร็จ) */
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith(HASH_PREFIX)) return (await hashPassword(pw)) === stored;
  return pw === stored;
}

// ─── Users ───────────────────────────────────────────────────────────────
export function getUsers(): AppUser[] { return load<AppUser>(KEYS.users); }
export function saveUsers(users: AppUser[]): void { save(KEYS.users, users); }

// ─── Lockout ─────────────────────────────────────────────────────────────
type Attempts = Record<string, { count: number; lockUntil: number }>;
function getAttempts(u: string) { return readJSON<Attempts>(KEYS.attempts, {})[u] || { count: 0, lockUntil: 0 }; }
function setAttempts(u: string, rec: { count: number; lockUntil: number } | null) {
  const all = { ...readJSON<Attempts>(KEYS.attempts, {}) };
  if (rec) all[u] = rec; else delete all[u];
  writeJSON(KEYS.attempts, all);
}
export function getLockUntil(username: string): number {
  const rec = getAttempts(username);
  return rec.lockUntil && Date.now() < rec.lockUntil ? rec.lockUntil : 0;
}
function recordFail(username: string) {
  const rec = getAttempts(username);
  rec.count = (rec.count || 0) + 1;
  if (rec.count >= MAX_ATTEMPTS) { rec.lockUntil = Date.now() + LOCKOUT_MS; rec.count = 0; }
  setAttempts(username, rec);
}
export function remainingAttempts(username: string): number { return MAX_ATTEMPTS - (getAttempts(username).count || 0); }

// ─── Session ─────────────────────────────────────────────────────────────
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(sessionStorage.getItem(KEYS.session) || 'null'); } catch { return null; }
}
function setSession(u: AppUser): void {
  const s: Session = { userId: u.id, username: u.username, fullName: u.fullName, universityId: u.universityId, roles: u.roles, loginAt: Date.now() };
  sessionStorage.setItem(KEYS.session, JSON.stringify(s));
}
export function clearSession(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(KEYS.session);
}

/** user ปัจจุบัน (อ่านซ้ำจาก store เพื่อให้สิทธิ์ล่าสุดมีผลทันที) */
export function getCurrentUser(): AppUser | null {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) ?? null;
}

// ─── Login ───────────────────────────────────────────────────────────────
export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: 'format' | 'locked' | 'invalid';
  lockUntil?: number;
  remaining?: number;
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const un = (username || '').trim();
  if (!un || !password || un.length > 64 || password.length > 128) return { success: false, error: 'format' };

  const lock = getLockUntil(un);
  if (lock) return { success: false, error: 'locked', lockUntil: lock };

  const users = getUsers();
  const user = users.find(u => u.username === un);
  const valid = user ? await verifyPassword(password, user.password) : false;
  if (!user || !valid) {
    recordFail(un);
    const nowLocked = getLockUntil(un);
    if (nowLocked) return { success: false, error: 'locked', lockUntil: nowLocked };
    return { success: false, error: 'invalid', remaining: remainingAttempts(un) };
  }
  if (!user.password.startsWith(HASH_PREFIX)) {
    user.password = await hashPassword(password);
    saveUsers(users);
  }
  setAttempts(un, null);
  setSession(user);
  appendAudit(user, { action: 'auth.login', targetType: 'user', targetId: user.id });
  return { success: true, user };
}

export function logoutUser(): void {
  const u = getCurrentUser();
  if (u) appendAudit(u, { action: 'auth.logout', targetType: 'user', targetId: u.id });
  clearSession();
}

// ─── User management (super_admin / uni_admin) ───────────────────────────
export interface NewUserInput { username: string; password: string; email: string; fullName: string; roles: RoleAssignment[] }

export async function createUser(actor: AppUser, input: NewUserInput): Promise<AppUser> {
  const scope = { universityId: actor.universityId };
  if (!can(actor, 'user.manage', scope)) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  const username = input.username.trim();
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) throw new AunqaError('invalid', 'Username ต้องเป็น a-z, 0-9, . _ - ยาว 3–32 ตัว');
  if (input.password.length < 6) throw new AunqaError('invalid', 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new AunqaError('invalid', 'รูปแบบอีเมลไม่ถูกต้อง');
  if (!input.fullName.trim()) throw new AunqaError('invalid', 'กรุณากรอกชื่อ');
  const users = getUsers();
  if (users.some(u => u.username === username)) throw new AunqaError('duplicate', 'Username นี้ถูกใช้แล้ว');
  if (users.some(u => u.email === input.email)) throw new AunqaError('duplicate', 'อีเมลนี้ถูกใช้แล้ว');
  // ห้าม uni_admin สร้าง super_admin (ยกระดับสิทธิ์)
  const isSuper = actor.roles.some(r => r.role === 'super_admin');
  if (!isSuper && input.roles.some(r => r.role === 'super_admin'))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์สร้างบัญชี super_admin');
  const user: AppUser = {
    id: `u-${username}`, username, password: await hashPassword(input.password),
    universityId: actor.universityId, email: input.email, fullName: input.fullName.trim(), roles: input.roles,
  };
  users.push(user);
  saveUsers(users);
  appendAudit(actor, { action: 'user.create', targetType: 'user', targetId: user.id, after: { username, roles: user.roles } });
  return user;
}

export function setUserRoles(actor: AppUser, userId: string, roles: RoleAssignment[]): AppUser {
  const users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) throw new AunqaError('not_found', 'ไม่พบผู้ใช้');
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  const isSuper = actor.roles.some(r => r.role === 'super_admin');
  if (!isSuper && roles.some(r => r.role === 'super_admin')) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ให้บทบาท super_admin');
  if (!isSuper && target.id === actor.id) throw new AunqaError('forbidden', 'แก้บทบาทของตัวเองไม่ได้');
  if (!isSuper && target.roles.some(r => r.role === 'super_admin')) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้บัญชี super_admin');
  const before = target.roles;
  target.roles = roles;
  saveUsers(users);
  appendAudit(actor, { action: 'user.set_roles', targetType: 'user', targetId: userId, before, after: roles });
  return target;
}

export function deleteUser(actor: AppUser, userId: string): void {
  const users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return;
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  if (target.id === actor.id) throw new AunqaError('invalid', 'ลบบัญชีตัวเองไม่ได้');
  if (!actor.roles.some(r => r.role === 'super_admin') && target.roles.some(r => r.role === 'super_admin'))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ลบบัญชี super_admin');
  saveUsers(users.filter(u => u.id !== userId));
  appendAudit(actor, { action: 'user.delete', targetType: 'user', targetId: userId, before: { username: target.username, roles: target.roles } });
}

/** รายชื่อผู้ใช้สำหรับ dropdown มอบหมาย (ไม่มี password) */
export function hasRoleCode(u: AppUser, role: RoleCode): boolean { return u.roles.some(r => r.role === role); }
