/**
 * Auth API — ตอนนี้ใช้ localStorage, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * PostgreSQL schema (อนาคต):
 *   CREATE TABLE users (
 *     id          SERIAL PRIMARY KEY,
 *     username    VARCHAR(8)  UNIQUE NOT NULL,
 *     password    VARCHAR(255) NOT NULL,  -- bcrypt hash
 *     role        VARCHAR(20) NOT NULL,
 *     name        TEXT NOT NULL,
 *     school      TEXT,
 *     student_code VARCHAR(10),
 *     class       VARCHAR(10),
 *     child_code  VARCHAR(10),
 *     child_name  TEXT,
 *     created_at  TIMESTAMP DEFAULT NOW()
 *   );
 */

import type { User, Session, Permissions } from '../types';
import { SEEDED_USERS, DEFAULT_PERMISSIONS } from '../mock-data';

const AUTH_KEY        = 'eduflow_users';
const SESSION_KEY     = 'eduflow_session';
const ATTEMPTS_KEY    = 'eduflow_attempts';
const PERMISSIONS_KEY = 'eduflow_permissions';
const WEBADMIN_LOG_KEY = 'eduflow_webadmin_log';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

// ─── User Store (localStorage → PostgreSQL) ──────────────────────────────
// TODO(PostgreSQL): SELECT * FROM users
export function getUsers(): User[] {
  if (typeof window === 'undefined') return SEEDED_USERS;
  return JSON.parse(localStorage.getItem(AUTH_KEY) || JSON.stringify(SEEDED_USERS));
}

// TODO(PostgreSQL): INSERT/UPDATE users
export function saveUsers(users: User[]): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}

// ─── Permissions ─────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM role_permissions
export function getPermissions(): Permissions {
  if (typeof window === 'undefined') return DEFAULT_PERMISSIONS;
  return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || JSON.stringify(DEFAULT_PERMISSIONS));
}

// TODO(PostgreSQL): UPDATE role_permissions SET allowed = $1 WHERE role = $2 AND permission = $3
export function savePermissions(perms: Permissions): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
}

// ─── Session ─────────────────────────────────────────────────────────────
// TODO(PostgreSQL): ใช้ JWT หรือ next-auth session แทน sessionStorage
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
}

export function setSession(user: User): void {
  const session: Session = {
    username: user.username, role: user.role, name: user.name,
    school: user.school || '', code: user.code || '',
    childCode: user.childCode || '', childName: user.childName || '',
    class: user.class || '',
    loginAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Validation ───────────────────────────────────────────────────────────
export function isValidFormat(str: string): boolean {
  return /^[a-zA-Z0-9]{1,8}$/.test(str);
}

// ─── Password Hashing ─────────────────────────────────────────────────────
// รหัสผ่านเก็บเป็น SHA-256 hash — ไม่เก็บ plaintext
// TODO(PostgreSQL): เปลี่ยนเป็น bcrypt ฝั่ง server (bcrypt.hash / bcrypt.compare)
const HASH_PREFIX = 'sha256:';

export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(`eduflow::${pw}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return HASH_PREFIX + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** รองรับทั้ง hash ใหม่ และบัญชีเก่าที่ยังเป็น plaintext (จะถูก upgrade อัตโนมัติเมื่อ login สำเร็จ) */
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith(HASH_PREFIX)) return (await hashPassword(pw)) === stored;
  return pw === stored;
}

// ─── Lockout ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): บันทึก attempts ใน table: login_attempts
function getAttempts(username: string): { count: number; lockUntil: number } {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  return all[username] || { count: 0, lockUntil: 0 };
}

function saveAttempts(username: string, rec: { count: number; lockUntil: number }): void {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  all[username] = rec;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
}

export function getLockUntil(username: string): number {
  const rec = getAttempts(username);
  return rec.lockUntil && Date.now() < rec.lockUntil ? rec.lockUntil : 0;
}

export function recordFail(username: string): { count: number; lockUntil: number } {
  const rec = getAttempts(username);
  rec.count = (rec.count || 0) + 1;
  if (rec.count >= MAX_ATTEMPTS) { rec.lockUntil = Date.now() + LOCKOUT_MS; rec.count = 0; }
  saveAttempts(username, rec);
  return rec;
}

export function clearAttempts(username: string): void {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  delete all[username];
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
}

export function remainingAttempts(username: string): number {
  return MAX_ATTEMPTS - (getAttempts(username).count || 0);
}

// ─── Web Admin Log ────────────────────────────────────────────────────────
// TODO(PostgreSQL): INSERT INTO admin_logs (username, action, timestamp)
export function logWebAdminLogin(username: string): void {
  const log = JSON.parse(localStorage.getItem(WEBADMIN_LOG_KEY) || '{"admins":[],"loginHistory":[]}');
  log.loginHistory.push({ username, timestamp: new Date().toLocaleString('th-TH'), action: 'LOGIN' });
  localStorage.setItem(WEBADMIN_LOG_KEY, JSON.stringify(log));
}

export function getWebAdminLog(): { admins: { username:string; name:string; addedAt:string; addedBy:string }[]; loginHistory: { username:string; timestamp:string; action:string }[] } {
  return JSON.parse(localStorage.getItem(WEBADMIN_LOG_KEY) || '{"admins":[{"username":"webadmin","name":"ผู้ดูแลระบบหลัก","addedAt":"2567-01-01","addedBy":"SYSTEM"}],"loginHistory":[]}');
}

// ─── Init (seed localStorage on first load) ───────────────────────────────
// TODO(PostgreSQL): ลบ initAuth() ออก — ข้อมูลจะอยู่ใน DB แล้ว
export function initAuth(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(AUTH_KEY)) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(SEEDED_USERS));
  } else {
    const users = getUsers();
    if (!users.some(u => u.role === 'web_admin' && u.seeded)) {
      users.unshift(SEEDED_USERS[0]);
      saveUsers(users);
    }
  }
  if (!localStorage.getItem(PERMISSIONS_KEY))
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(DEFAULT_PERMISSIONS));
  if (!localStorage.getItem(WEBADMIN_LOG_KEY))
    localStorage.setItem(WEBADMIN_LOG_KEY, JSON.stringify({
      admins: [{ username: 'webadmin', name: 'ผู้ดูแลระบบหลัก', addedAt: '2567-01-01', addedBy: 'SYSTEM' }],
      loginHistory: [],
    }));
}

// ─── Login ────────────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   const user = await db.query(
//     'SELECT * FROM users WHERE username = $1', [username]
//   );
//   const valid = await bcrypt.compare(password, user.password_hash);
export interface LoginResult {
  success: boolean;
  user?: User;
  error?: 'format' | 'locked' | 'invalid' | 'unverified';
  lockUntil?: number;
  remaining?: number;
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  if (!isValidFormat(username) || !isValidFormat(password))
    return { success: false, error: 'format' };

  const lockUntil = getLockUntil(username);
  if (lockUntil) return { success: false, error: 'locked', lockUntil };

  const user = getUsers().find(u => u.username === username);
  const valid = user ? await verifyPassword(password, user.password) : false;
  if (!user || !valid) {
    recordFail(username);
    const nowLocked = getLockUntil(username);
    if (nowLocked) return { success: false, error: 'locked', lockUntil: nowLocked };
    return { success: false, error: 'invalid', remaining: remainingAttempts(username) };
  }

  // บัญชีที่สมัครใหม่ต้องกดลิงก์ยืนยันอีเมลก่อน (บัญชีเก่า/seed ไม่มี field นี้ = ผ่าน)
  if (user.emailVerified === false) return { success: false, error: 'unverified' };

  // upgrade บัญชีเก่า plaintext → hash โดยอัตโนมัติเมื่อ login สำเร็จ
  if (!user.password.startsWith('sha256:')) {
    const users = getUsers();
    const target = users.find(u => u.username === username);
    if (target) { target.password = await hashPassword(password); saveUsers(users); }
  }

  clearAttempts(username);
  setSession(user);
  if (user.role === 'web_admin') logWebAdminLogin(username);
  return { success: true, user };
}

// ─── Register ─────────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   const hash = await bcrypt.hash(password, 12);
//   await db.query(
//     'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)',
//     [username, hash, role, name]
//   );
export interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerUser(
  role: string, firstName: string, lastName: string, email: string,
  username: string, password: string, confirm: string
): Promise<RegisterResult> {
  if (!role)      return { success: false, error: 'กรุณาเลือกประเภทบัญชี' };
  if (!firstName) return { success: false, error: 'กรุณากรอกชื่อ' };
  if (!lastName)  return { success: false, error: 'กรุณากรอกนามสกุล' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com' };
  if (!isValidFormat(username)) return { success: false, error: `Username ต้องเป็นภาษาอังกฤษ/ตัวเลข 1–8 ตัว (ตอนนี้ ${username.length} ตัว)` };
  if (!isValidFormat(password)) return { success: false, error: `รหัสผ่านต้องเป็นภาษาอังกฤษ/ตัวเลข 1–8 ตัว (ตอนนี้ ${password.length} ตัว)` };
  if (password !== confirm) return { success: false, error: 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง' };
  if (getUsers().some(u => u.username === username)) return { success: false, error: 'Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username ใหม่' };
  if (getUsers().some(u => u.email === email)) return { success: false, error: 'อีเมลนี้ถูกใช้สมัครไปแล้ว' };

  const users = getUsers();
  users.push({
    username,
    password: await hashPassword(password), // เก็บเป็น hash ไม่เก็บ plaintext
    role: role as User['role'],
    name: `${firstName} ${lastName}`,
    email,
    emailVerified: false, // ต้องกดลิงก์ยืนยันก่อนถึงจะ login ได้
    createdAt: new Date().toLocaleString('th-TH'),
  });
  saveUsers(users);
  return { success: true };
}

/**
 * ยืนยันอีเมล — ตอนนี้จำลองการกดลิงก์ในกล่องจดหมาย (ไม่มีค่าใช้จ่าย)
 * TODO(Production): ส่งอีเมลจริงด้วยบริการฟรี เช่น Resend free tier / Nodemailer + Gmail SMTP
 *   โดยแนบ token ใน URL: /verify?token=xxx แล้วตรวจ token ฝั่ง server
 */
export function verifyEmail(username: string): boolean {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return false;
  user.emailVerified = true;
  saveUsers(users);
  return true;
}

// ─── Delete User ──────────────────────────────────────────────────────────
// TODO(PostgreSQL): DELETE FROM users WHERE username = $1
export function deleteUser(username: string): void {
  saveUsers(getUsers().filter(u => u.username !== username));
}

// ─── Toggle Permission ────────────────────────────────────────────────────
// TODO(PostgreSQL): UPDATE role_permissions SET allowed = $1 WHERE role = $2 AND permission_key = $3
export function togglePermission(role: string, perm: string, val: boolean): void {
  const perms = getPermissions();
  if (!perms[role as keyof Permissions]) return;
  (perms[role as keyof Permissions] as Record<string, boolean>)[perm] = val;
  savePermissions(perms);
}
