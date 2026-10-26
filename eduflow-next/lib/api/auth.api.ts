/**
 * Auth API (M1) — localStorage, พร้อมเปลี่ยนเป็น PostgreSQL/Supabase Auth
 * reuse จาก EduFlow เดิม: SHA-256 hash, lockout 5 ครั้ง/5 นาที
 * Phase U (ADR-UI-001 B1): session ย้ายจาก sessionStorage → localStorage (ข้ามแท็บ) + หมดอายุ idle/absolute
 *   username เทียบแบบไม่แยกตัวพิมพ์ทั้ง login / lockout / createUser
 *
 * PostgreSQL (อนาคต): users(id, university_id, email, full_name, locale) + role_assignments
 *   รหัสผ่าน → Supabase Auth / bcrypt ฝั่ง server
 */
import type { AppUser, AssessmentCycle, RoleAssignment, RoleCode, Session, UserStatus } from '../types';
import { AunqaError, KEYS, load, save } from './db';
import { readJSON, writeJSON } from './storage-cache';
import { appendAudit } from './audit.store';
import { newId, sha256Hex } from '../utils/hash';
import { can } from './rbac';
import { getFaculties, getProgrammes } from './org.store';
import { revokeInvitationsOf } from './invitation.internal';
import { purgeAccessRequestNotices } from './notification.internal';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const HASH_PREFIX = 'sha256:';

// ─── นโยบายบัญชี (ADR-AUTH-001 A3) ─────────────────────────────────────────
/** รหัสผ่าน 8–128 ตัว ไม่บังคับผสมชนิดอักขระ (NIST 800-63B) — 128 = เพดาน login เดิม */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
/** อายุลิงก์เชิญ 7 วัน */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_CODES: readonly RoleCode[] = ['super_admin', 'uni_admin', 'programme_chair', 'programme_staff', 'data_staff', 'faculty_qa', 'dean', 'assessor'];

/** สถานะบัญชี — ไม่มี field = 'active' (ข้อมูลเดิม/seed) */
export function userStatus(u: Pick<AppUser, 'status'>): UserStatus { return u.status ?? 'active'; }
export function isActiveUser(u: Pick<AppUser, 'status'> | null | undefined): boolean { return !!u && userStatus(u) === 'active'; }

/**
 * C8 / ASVS 5.0 §7.4.2: ผู้กระทำของ API ที่เขียนข้อมูลต้องยัง active ตาม store จริง
 * (UI อาจถือ object ผู้ใช้เก่าไว้หลังถูกระงับ) → อ่านสถานะจากแถวใน store ไม่เชื่อ field ใน object ที่ส่งมา
 * ใช้เฉพาะ status — role/สิทธิ์ยังตัดสินด้วย can() ตามเดิม
 * ไม่พบแถว = fail-open โดยตั้งใจ (review minor #4 — security-auditor ไม่ยกเป็น finding จึงคงไว้):
 *   - แถวที่ลบได้มีแค่ invited/pending (A8.2) ซึ่งไม่เคยมี session → ผู้กระทำจริงที่ไม่มีแถวเกิดได้เฉพาะ
 *     หลัง resetDemo (แท็บอื่นถือ object ของผู้ใช้ที่สร้างหลัง seed) หรือเทสต์ที่ส่ง actor สังเคราะห์
 *   - กรณีนั้นยังโดน can() ตาม role ใน object และ getCurrentUser() ตัด session ในการ render ถัดไป
 *   - fail-closed จะทำให้เทสต์/flow ที่ใช้ actor นอก store พังทั้งชุด โดยไม่ได้เพิ่มความปลอดภัยจริง
 *     เพราะ RBAC ทั้งหมดอยู่ในเบราว์เซอร์ (ข้อจำกัด MVP — ระบบจริงต้องอ่าน actor จาก session ฝั่ง server เท่านั้น)
 * ข้อจำกัดนี้บันทึกไว้ใน TASK-0002 Log (R2-B3) ให้ thesis-writer ใส่บท 5
 */
export function isActorActive(actor: Pick<AppUser, 'id' | 'status'> | null | undefined): boolean {
  if (!actor) return false;
  const row = getUsers().find(u => u.id === actor.id);
  return isActiveUser(row ?? actor);
}
export function requireActiveActor(actor: Pick<AppUser, 'id' | 'status'> | null | undefined): void {
  if (!isActorActive(actor)) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์');
}

export function validatePassword(pw: unknown): void {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX)
    throw new AunqaError('invalid', 'รหัสผ่านต้องยาว 8–128 ตัวอักษร');
}

export type ScopeType = RoleAssignment['scopeType'];

/**
 * R2-B4 (BUG-0002-P2): ระดับขอบเขตที่ใช้ได้ต่อบทบาท — ตรงตาราง docs/guide/16-uni-admin.md
 * "ขอบเขตที่ควรใช้กับแต่ละบทบาท" และ rbac.can (assessor ใช้ได้เฉพาะ scope 'cycle')
 * ตารางเดียวใช้ทั้งบังคับใน validateRoleScopes และกรองตัวเลือกขอบเขตใน UI
 */
export const ROLE_SCOPE_TYPES: Readonly<Record<RoleCode, readonly ScopeType[]>> = {
  super_admin: ['university'],
  uni_admin: ['university'],
  programme_chair: ['programme'],
  programme_staff: ['programme'],
  data_staff: ['faculty'],
  faculty_qa: ['faculty'],
  dean: ['faculty'],
  assessor: ['cycle'],
};

/** ระดับขอบเขตที่บทบาทนี้ใช้ได้ (UI ใช้กรอง dropdown) · role ที่ไม่รู้จัก = [] */
export function allowedScopeTypes(role: RoleCode): readonly ScopeType[] {
  return ROLE_SCOPE_TYPES[role] ?? [];
}
export function isRoleScopeCompatible(role: RoleCode, scopeType: ScopeType): boolean {
  return allowedScopeTypes(role).includes(scopeType);
}

const sameAssignment = (a: RoleAssignment, b: RoleAssignment) =>
  a.role === b.role && a.scopeType === b.scopeType && a.scopeId === b.scopeId;

/**
 * ทุก assignment ต้องอยู่ใน university นั้น: university → scopeId === universityId (super_admin ใช้ '*' ได้)
 * faculty/programme/cycle → มีจริงและ universityId ตรง · role ต้องเป็นค่าที่รู้จัก
 * R2-B4: ระดับ scope ต้องเข้ากับ role ตาม ROLE_SCOPE_TYPES — `existing` (บทบาทเดิมของผู้ใช้ใน setUserRoles)
 *   ได้รับยกเว้นเฉพาะการตรวจความเข้ากัน (ข้อมูลเก่าก่อนกติกานี้ยังคงไว้/ถอดได้) แต่ยังตรวจ tenant ตามเดิม
 */
export function validateRoleScopes(universityId: string, roles: RoleAssignment[], existing: RoleAssignment[] = []): void {
  const bad = () => new AunqaError('invalid', 'ขอบเขตบทบาทไม่ถูกต้อง');
  if (!Array.isArray(roles)) throw bad();
  for (const r of roles) {
    if (!r || typeof r !== 'object' || !ROLE_CODES.includes(r.role) || typeof r.scopeId !== 'string') throw bad();
    switch (r.scopeType) {
      case 'university':
        if (!(r.scopeId === universityId || (r.role === 'super_admin' && r.scopeId === '*'))) throw bad();
        break;
      case 'faculty':
        if (!getFaculties(universityId).some(f => f.id === r.scopeId)) throw bad();
        break;
      case 'programme':
        if (!getProgrammes(universityId).some(p => p.id === r.scopeId)) throw bad();
        break;
      case 'cycle':
        if (!load<AssessmentCycle>(KEYS.cycles).some(c => c.id === r.scopeId && c.universityId === universityId)) throw bad();
        break;
      default: throw bad();
    }
    // ตรวจหลัง tenant/การมีอยู่จริง — scopeType แปลกปลอมจึงได้ข้อความเดิม "ขอบเขตบทบาทไม่ถูกต้อง"
    if (!isRoleScopeCompatible(r.role, r.scopeType) && !existing.some(e => sameAssignment(e, r)))
      throw new AunqaError('invalid', 'ขอบเขตไม่ตรงกับบทบาท (หลักสูตร: ประธาน/อาจารย์ · คณะ: เจ้าหน้าที่ข้อมูล/QA คณะ/คณบดี · รอบประเมิน: กรรมการ · ทั้งมหาวิทยาลัย: ผู้ดูแล)');
  }
}

/**
 * Security S-06 (ASVS 15.3.1): ค่าที่คืนให้ UI ห้ามมี password hash — สำเนาใหม่ (ไม่ใช่ reference ของ cache)
 * pure function ไม่เขียน store จึงอยู่ใน facade ได้
 */
export function withoutPassword({ password: _pw, ...rest }: AppUser): Omit<AppUser, 'password'> {
  return { ...rest, roles: sanitizeRoles(rest.roles) };
}

/** สำเนา role ที่มีเฉพาะ field ที่รู้จัก (กัน field แปลกปลอมติดเข้า store) */
export function sanitizeRoles(roles: RoleAssignment[]): RoleAssignment[] {
  return roles.map(r => ({ role: r.role, scopeType: r.scopeType, scopeId: r.scopeId }));
}

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
// key ของ attempts/lockout = username ตัวพิมพ์เล็ก (P7: username ไม่แยกตัวพิมพ์ — กันเลี่ยง lockout ด้วยการสลับตัวพิมพ์)
type Attempts = Record<string, { count: number; lockUntil: number }>;
const attemptKey = (u: string) => (u || '').trim().toLowerCase();
function getAttempts(u: string) { return { ...(readJSON<Attempts>(KEYS.attempts, {})[attemptKey(u)] || { count: 0, lockUntil: 0 }) }; }
function setAttempts(u: string, rec: { count: number; lockUntil: number } | null) {
  const all = { ...readJSON<Attempts>(KEYS.attempts, {}) };
  if (rec) all[attemptKey(u)] = rec; else delete all[attemptKey(u)];
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

// ─── Session (ADR-UI-001 B1) ─────────────────────────────────────────────
// เก็บใน localStorage เพื่อให้แท็บใหม่ใช้ session เดียวกัน + หมดอายุ idle 4 ชม. / สูงสุด 12 ชม.
// TODO(PostgreSQL): โหมดเดโม่เท่านั้น — session ใน localStorage อ่านได้จาก JS ทุกแท็บของ origin เดียวกัน
//   ระบบจริงต้องใช้ httpOnly + Secure + SameSite cookie ที่ออกโดย server (Supabase Auth) และตรวจหมดอายุฝั่ง server
export const SESSION_IDLE_MS = 4 * 60 * 60 * 1000;      // 4 ชม. ไม่มีการใช้งาน
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 ชม. นับจาก login
const TOUCH_THROTTLE_MS = 60_000;

const hasWindow = () => typeof window !== 'undefined';

function isSessionShape(s: unknown): s is Session {
  const x = s as Session | null;
  return !!x && typeof x === 'object' && typeof x.userId === 'string'
    && typeof x.loginAt === 'number' && typeof x.lastActiveAt === 'number' && typeof x.expiresAt === 'number';
}

/** อ่าน session ที่ยังไม่หมดอายุ ณ เวลา now · หมดอายุ/รูปแบบเสีย → clearSession() แล้วคืน null */
function readSession(now: number): Session | null {
  if (!hasWindow()) return null;
  // session เดิมจาก sessionStorage (ก่อน Phase U) → ลบทิ้ง ไม่ย้าย (ผู้ใช้ล็อกอินใหม่ 1 ครั้ง)
  try { if (sessionStorage.getItem(KEYS.session) !== null) sessionStorage.removeItem(KEYS.session); } catch { /* ignore */ }
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEYS.session); } catch { return null; }
  if (!raw) return null;
  let s: unknown;
  try { s = JSON.parse(raw); } catch { s = null; }
  if (!isSessionShape(s) || now > s.expiresAt || now - s.lastActiveAt > SESSION_IDLE_MS) {
    clearSession();
    return null;
  }
  return s;
}

export function getSession(): Session | null { return readSession(Date.now()); }

function setSession(u: AppUser): void {
  const now = Date.now();
  const s: Session = {
    userId: u.id, username: u.username, fullName: u.fullName, universityId: u.universityId, roles: u.roles,
    loginAt: now, lastActiveAt: now, expiresAt: now + SESSION_ABSOLUTE_MS,
  };
  localStorage.setItem(KEYS.session, JSON.stringify(s));
}

export function clearSession(): void {
  if (!hasWindow()) return;
  try { localStorage.removeItem(KEYS.session); } catch { /* ignore */ }
  try { sessionStorage.removeItem(KEYS.session); } catch { /* ignore */ }
}

/**
 * บันทึกการใช้งาน: อัปเดต lastActiveAt เมื่อห่างจากค่าเดิม > 60 วินาที (กันเขียนถี่) หรือ force
 * ไม่มี session = no-op · ไม่ขยาย expiresAt (absolute)
 */
export function touchSession(now: number = Date.now(), opts: { force?: boolean } = {}): void {
  const s = readSession(now);
  if (!s) return;
  if (!opts.force && now - s.lastActiveAt <= TOUCH_THROTTLE_MS) return;
  const next: Session = { ...s, lastActiveAt: now };
  localStorage.setItem(KEYS.session, JSON.stringify(next));
}

/** ms ที่เหลือก่อนหมดอายุ = min(expiresAt, lastActiveAt + SESSION_IDLE_MS) − now · ไม่มี session (รวมหมดอายุแล้ว) = null */
export function sessionTimeLeft(now: number = Date.now()): number | null {
  const s = readSession(now);
  if (!s) return null;
  return Math.min(s.expiresAt, s.lastActiveAt + SESSION_IDLE_MS) - now;
}

/** เกณฑ์ไหนจะหมดก่อน: 'idle' (ไม่มีการใช้งาน — ต่ออายุได้) / 'absolute' (ครบ 12 ชม. — ต่อไม่ได้) · ไม่มี session = null */
export function sessionExpiryKind(now: number = Date.now()): 'idle' | 'absolute' | null {
  const s = readSession(now);
  if (!s) return null;
  return s.expiresAt <= s.lastActiveAt + SESSION_IDLE_MS ? 'absolute' : 'idle';
}

/**
 * ฟังการเปลี่ยน session จากแท็บอื่น (window 'storage' เฉพาะ key session) — cb ได้ session ปัจจุบันหรือ null (ออกจากระบบ/หมดอายุ)
 * หมายเหตุ: อีเวนต์ 'storage' ไม่ยิงในแท็บที่เป็นคนเขียนเอง · touchSession ของแท็บอื่นก็ยิง (cb ได้ session ที่ไม่ใช่ null)
 * คืน unsubscribe · SSR = no-op
 */
export function subscribeSession(cb: (s: Session | null) => void): () => void {
  if (!hasWindow() || typeof window.addEventListener !== 'function') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEYS.session) return;
    cb(getSession());
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/**
 * user ปัจจุบัน (อ่านซ้ำจาก store เพื่อให้สิทธิ์ล่าสุดมีผลทันที) · มี session = นับเป็นการใช้งาน (touchSession)
 * บัญชีที่ไม่ active แล้ว (เช่นถูกระงับระหว่างใช้งาน) → ล้าง session แล้วคืน null (ADR-AUTH-001 A5)
 */
export function getCurrentUser(): AppUser | null {
  const s = getSession();
  if (!s) return null;
  const u = getUsers().find(x => x.id === s.userId) ?? null;
  // ASVS 5.0 §7.4.2: บัญชีถูกลบ/ไม่ active → session ที่เปิดค้างหมดผลทันทีในการเรียกครั้งถัดไป
  if (!u || !isActiveUser(u)) { clearSession(); return null; }
  touchSession();
  return u;
}

// ─── Login ───────────────────────────────────────────────────────────────
export interface LoginResult {
  success: boolean;
  user?: AppUser;
  /** 'pending' / 'suspended' บอกเฉพาะเมื่อรหัสผ่านถูก (ADR-AUTH-001 A5/A7) */
  error?: 'format' | 'locked' | 'invalid' | 'pending' | 'suspended';
  lockUntil?: number;
  remaining?: number;
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const un = (username || '').trim();
  if (!un || !password || un.length > 64 || password.length > 128) return { success: false, error: 'format' };

  const lock = getLockUntil(un);
  if (lock) return { success: false, error: 'locked', lockUntil: lock };

  const users = getUsers();
  const unLower = un.toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === unLower);
  // invited = ยังไม่ได้ตั้งรหัสผ่าน → นับเหมือนรหัสผิด (ไม่บอกว่ามีบัญชีรอรับเชิญ)
  const status = user ? userStatus(user) : 'active';
  const valid = user && status !== 'invited' && user.password ? await verifyPassword(password, user.password) : false;
  if (!user || !valid) {
    recordFail(un);
    const nowLocked = getLockUntil(un);
    if (nowLocked) return { success: false, error: 'locked', lockUntil: nowLocked };
    return { success: false, error: 'invalid', remaining: remainingAttempts(un) };
  }
  // รหัสถูกแต่บัญชียังใช้ไม่ได้: บอกสถานะ, ล้างตัวนับผิด, ไม่สร้าง session
  if (status === 'pending' || status === 'suspended') {
    setAttempts(un, null);
    return { success: false, error: status };
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

export async function createUser(actor: AppUser, input: NewUserInput): Promise<Omit<AppUser, 'password'>> {
  requireActiveActor(actor);
  const scope = { universityId: actor.universityId };
  if (!can(actor, 'user.manage', scope)) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  const username = input.username.trim();
  if (!USERNAME_RE.test(username)) throw new AunqaError('invalid', 'Username ต้องเป็น a-z, 0-9, . _ - ยาว 3–32 ตัว');
  validatePassword(input.password); // ADR-AUTH-001 A8.1: 6 → 8 (ตรงกับ UI)
  if (!EMAIL_RE.test(input.email)) throw new AunqaError('invalid', 'รูปแบบอีเมลไม่ถูกต้อง');
  if (!input.fullName.trim()) throw new AunqaError('invalid', 'กรุณากรอกชื่อ');
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new AunqaError('duplicate', 'Username นี้ถูกใช้แล้ว');
  if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase())) throw new AunqaError('duplicate', 'อีเมลนี้ถูกใช้แล้ว');
  // ห้าม uni_admin สร้าง super_admin (ยกระดับสิทธิ์)
  const isSuper = actor.roles.some(r => r.role === 'super_admin');
  if (!isSuper && input.roles.some(r => r.role === 'super_admin'))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์สร้างบัญชี super_admin');
  validateRoleScopes(actor.universityId, input.roles);
  const password = await hashPassword(input.password);
  // id เดิม `u-<username>` อาจชน id ของ seed (เช่น username "chair" → u-chair ของ chair1) → ใช้ id สุ่มแทนเมื่อชน
  const fresh = getUsers();
  if (fresh.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new AunqaError('duplicate', 'Username นี้ถูกใช้แล้ว');
  const id = fresh.some(u => u.id === `u-${username}`) ? newId('u') : `u-${username}`;
  const user: AppUser = {
    id, username, password,
    universityId: actor.universityId, email: input.email, fullName: input.fullName.trim(), roles: sanitizeRoles(input.roles),
    status: 'active',
  };
  saveUsers([...fresh, user]);
  appendAudit(actor, { action: 'user.create', targetType: 'user', targetId: user.id, after: { username, roles: user.roles } });
  return withoutPassword(user);
}

export function setUserRoles(actor: AppUser, userId: string, roles: RoleAssignment[]): Omit<AppUser, 'password'> {
  requireActiveActor(actor);
  const users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) throw new AunqaError('not_found', 'ไม่พบผู้ใช้');
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  const isSuper = actor.roles.some(r => r.role === 'super_admin');
  // R2-B4 (BUG-0002-P4): ตรวจ "เป้าหมายเป็น super_admin" ก่อน — เดิมรายการ roles ที่ส่งมามี super_admin เดิมของเป้าหมายติดมา
  //   จึงได้ข้อความ "ไม่มีสิทธิ์ให้บทบาท super_admin" ผิดเรื่อง
  if (!isSuper && target.id === actor.id) throw new AunqaError('forbidden', 'แก้บทบาทของตัวเองไม่ได้');
  if (!isSuper && target.roles.some(r => r.role === 'super_admin')) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้บัญชี super_admin');
  if (!isSuper && roles.some(r => r.role === 'super_admin')) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ให้บทบาท super_admin');
  // R2-B2: ขอบเขตต้องอยู่ใน uni ของผู้ใช้เป้าหมาย (เหมือน createUser/invite) — ตรวจก่อนแก้ object ใน cache
  // R2-B4: บทบาทเดิมที่ยังคงไว้ได้รับยกเว้นการตรวจ role↔ระดับ scope (ข้อมูลก่อนกติกา) — บทบาทใหม่ต้องเข้ากัน
  validateRoleScopes(target.universityId, roles, target.roles);
  const before = target.roles;
  const next = sanitizeRoles(roles);
  target.roles = next;
  saveUsers(users);
  appendAudit(actor, { action: 'user.set_roles', targetType: 'user', targetId: userId, before, after: next });
  return withoutPassword(target);
}

export function deleteUser(actor: AppUser, userId: string): void {
  requireActiveActor(actor);
  const users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return;
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  if (target.id === actor.id) throw new AunqaError('invalid', 'ลบบัญชีตัวเองไม่ได้');
  if (!actor.roles.some(r => r.role === 'super_admin') && target.roles.some(r => r.role === 'super_admin'))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ลบบัญชี super_admin');
  // ADR-AUTH-001 A8.2: ลบได้เฉพาะบัญชีที่ไม่เคยใช้งาน (ไม่มีการอ้างอิงลอย) — อื่นให้ระงับแทน
  const st = userStatus(target);
  if (st !== 'invited' && st !== 'pending') throw new AunqaError('conflict', 'ผู้ใช้นี้เคยใช้งานแล้ว ให้ระงับบัญชีแทนการลบ');
  saveUsers(users.filter(u => u.id !== userId));
  revokeInvitationsOf(userId);
  // S-01: ลบคำขอ pending = ชื่อผู้ขอต้องไม่ค้างในแจ้งเตือน N12 ของผู้ดูแล (เหมือน rejectAccessRequest)
  if (st === 'pending') purgeAccessRequestNotices(userId, target.fullName);
  appendAudit(actor, { action: 'user.delete', targetType: 'user', targetId: userId, before: { username: target.username, roles: target.roles } });
}

/**
 * ระงับ / เปิดใช้บัญชี (ADR-AUTH-001 A3) — เปลี่ยนได้เฉพาะ active ↔ suspended
 * ห้ามตัวเอง · non-super แตะบัญชี super_admin ไม่ได้ · session ของผู้ถูกระงับหมดผลที่ getCurrentUser ครั้งถัดไป
 */
export function setUserStatus(actor: AppUser, userId: string, status: 'active' | 'suspended', reason?: string): Omit<AppUser, 'password'> {
  requireActiveActor(actor);
  const users = getUsers();
  const target = users.find(u => u.id === userId);
  if (!target) throw new AunqaError('not_found', 'ไม่พบผู้ใช้');
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  if (target.id === actor.id) throw new AunqaError('invalid', 'เปลี่ยนสถานะบัญชีของตัวเองไม่ได้');
  if (!actor.roles.some(r => r.role === 'super_admin') && target.roles.some(r => r.role === 'super_admin'))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้บัญชี super_admin');
  const from = userStatus(target);
  const ok = (from === 'active' && status === 'suspended') || (from === 'suspended' && status === 'active');
  if (!ok) throw new AunqaError('invalid', 'เปลี่ยนสถานะได้เฉพาะระหว่าง "ใช้งาน" กับ "ระงับ"');
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (why.length > 500) throw new AunqaError('invalid', 'เหตุผลต้องไม่เกิน 500 ตัวอักษร');
  const updated: AppUser = { ...target, status };
  saveUsers(users.map(u => (u.id === userId ? updated : u)));
  appendAudit(actor, {
    action: status === 'suspended' ? 'user.suspend' : 'user.reactivate', targetType: 'user', targetId: userId,
    before: { status: from }, after: { status, reason: why || undefined },
  });
  return withoutPassword(updated);
}

/** รายชื่อผู้ใช้สำหรับ dropdown มอบหมาย (ไม่มี password) */
export function hasRoleCode(u: AppUser, role: RoleCode): boolean { return u.roles.some(r => r.role === role); }
