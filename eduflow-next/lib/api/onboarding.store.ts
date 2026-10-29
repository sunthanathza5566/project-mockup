/**
 * Onboarding (ADR-AUTH-001) — เพิ่มผู้ใช้ 2 ทางใหม่ นอกจาก createUser (ตั้งรหัสให้)
 *   O1 เชิญ: ผู้มี user.manage ล็อกบทบาทไว้ตอนเชิญ → ได้ token ใช้ครั้งเดียว (7 วัน) → ผู้ใช้ตั้งรหัสเองที่ /invite#t=
 *   O2 ขอเข้าใช้งาน: หน้า public ไม่มีช่องบทบาท → status 'pending' → ผู้มี user.manage อนุมัติ (กำหนดบทบาท) / ปฏิเสธ (ลบแถว)
 *
 * ความปลอดภัย (A7): สร้าง object จาก allowlist field เท่านั้น (ไม่ spread input) · token 256 bit จาก CSPRNG เก็บแค่ hash
 *   error ของลิงก์เชิญเป็นข้อความเดียวทุกกรณี · audit ไม่มี password/hash/token/tokenHash
 * ข้อจำกัด: ทุกอย่างอยู่ใน localStorage ของเบราว์เซอร์เดียว — การตรวจทั้งหมดเป็นแบบจำลอง
 * TODO(PostgreSQL): Supabase Auth inviteUserByEmail (server, service-role key) + ยืนยันอีเมล
 */
import type {
  AccessRequestInfo, AccessRequestView, AppUser, Invitation, InvitePreview, RoleAssignment, University,
} from '../types';
import { newId, sha256Hex } from '../utils/hash';
import { appendAudit } from './audit.store';
import {
  EMAIL_RE, INVITE_TTL_MS, USERNAME_INVALID_MESSAGE, USERNAME_RE, getUsers, hashPassword, isActiveUser, loginUser, requireActiveActor,
  sanitizeRoles, saveUsers, userStatus, validatePassword, validateRoleScopes, withoutPassword, type LoginResult,
} from './auth.api';
import { AunqaError, KEYS, load, save } from './db';
import { revokeInvitationsOf } from './invitation.internal';
import { notify } from './notification.store';
import { accessRequestNoticeKey, markAccessRequestNoticesRead, purgeAccessRequestNotices } from './notification.internal';
import { findUniversityByEmail, getFaculties, getProgramme, getUniversity } from './org.store';
import { can } from './rbac';

// ─── Types (contract A3) ─────────────────────────────────────────────────
export interface InviteInput { username: string; email: string; fullName: string; roles: RoleAssignment[] }
export interface InviteResult { user: Omit<AppUser, 'password'>; token: string; expiresAt: number }
export interface AccessRequestInput {
  fullName: string; email: string; username: string; password: string;
  programmeId?: string; facultyId?: string; positionText?: string; reason: string; consent: boolean;
}

/** ข้อความเดียวทุกกรณีที่ลิงก์เชิญใช้ไม่ได้ (ไม่บอกว่าหมดอายุ/ใช้แล้ว/ยกเลิก — กัน enumeration) */
export const INVITE_INVALID_MESSAGE = 'ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว — ขอลิงก์ใหม่จากผู้ดูแลระบบ';
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_POSITION = 100;
const MAX_REASON = 500;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

// ─── helpers ─────────────────────────────────────────────────────────────
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const isSuper = (u: AppUser) => u.roles.some(r => r.role === 'super_admin');

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function base64url(b: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < b.length; i += 3) {
    const n = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63] + B64URL[n & 63];
  }
  if (b.length - i === 2) {
    const n = (b[i] << 16) | (b[i + 1] << 8);
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63];
  } else if (b.length - i === 1) {
    const n = b[i] << 16;
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63];
  }
  return out;
}
/** token 256 bit จาก CSPRNG → base64url 43 ตัว (ห้าม Math.random) */
function newInviteToken(): string { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
function hashInviteToken(token: string): Promise<string> { return sha256Hex(`aunqa-invite::${token}`); }

function validateIdentity(username: string, email: string, fullName: string): void {
  if (!USERNAME_RE.test(username)) throw new AunqaError('invalid', USERNAME_INVALID_MESSAGE);
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) throw new AunqaError('invalid', 'รูปแบบอีเมลไม่ถูกต้อง');
  if (!fullName || fullName.length > MAX_NAME) throw new AunqaError('invalid', 'กรุณากรอกชื่อ (ไม่เกิน 100 ตัวอักษร)');
}
function assertUnique(users: AppUser[], username: string, email: string, emailMessage: string): void {
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new AunqaError('duplicate', 'Username นี้ถูกใช้แล้ว');
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new AunqaError('duplicate', emailMessage);
}
/** บทบาทที่ผู้ดูแลกำหนด (เชิญ/อนุมัติ): ≥1 · non-super ห้าม super_admin · scope อยู่ใน university นั้น */
function validateGrantedRoles(actor: AppUser, universityId: string, roles: RoleAssignment[]): RoleAssignment[] {
  if (!Array.isArray(roles) || roles.length === 0) throw new AunqaError('invalid', 'ต้องกำหนดบทบาทอย่างน้อย 1 บทบาท');
  if (!isSuper(actor) && roles.some(r => r?.role === 'super_admin')) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ให้บทบาท super_admin');
  validateRoleScopes(universityId, roles);
  return sanitizeRoles(roles);
}
/** หาเป้าหมาย + ตรวจสิทธิ์ user.manage ของ university เป้าหมาย + สถานะที่คาด */
function managedTarget(actor: AppUser, userId: string, expect: 'invited' | 'pending'): AppUser {
  requireActiveActor(actor);
  const target = getUsers().find(u => u.id === userId);
  if (!target) throw new AunqaError('not_found', expect === 'pending' ? 'ไม่พบคำขอเข้าใช้งาน' : 'ไม่พบผู้ใช้');
  if (!can(actor, 'user.manage', { universityId: target.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  if (userStatus(target) !== expect)
    throw new AunqaError('invalid', expect === 'pending' ? 'ไม่พบคำขอที่รอการอนุมัติ' : 'ผู้ใช้นี้ไม่ได้อยู่ในสถานะรอรับคำเชิญ');
  if (!isSuper(actor) && isSuper(target)) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้บัญชี super_admin');
  return target;
}

async function createInvitation(actor: AppUser, user: AppUser, now: number): Promise<{ inv: Invitation; token: string }> {
  const token = newInviteToken();
  const inv: Invitation = {
    id: newId('inv'), universityId: user.universityId, userId: user.id, tokenHash: await hashInviteToken(token),
    createdBy: actor.id, createdAt: now, expiresAt: now + INVITE_TTL_MS,
  };
  return { inv, token };
}

/**
 * token ใช้ได้ = มี Invitation ที่ hash ตรง, ไม่ used/revoked, ยังไม่หมดอายุ, user ยัง 'invited'
 * และ (S-04) ผู้เชิญ ณ เวลาที่ใช้ยัง active และยังมี user.manage ของมหาวิทยาลัยนั้น
 *   — อำนาจของคำเชิญมาจากผู้เชิญ ตรวจตอนใช้ตามหลักเดียวกับ requireActiveActor (C8: อ่านสถานะจาก store จริง)
 *   — ไม่ revoke ตอนระงับ: ระงับ↔เปิดใช้ย้อนกลับได้ (A3) และ setUserStatus ไม่มีผลข้างเคียงอื่นตาม contract
 *     → เปิดใช้ผู้เชิญอีกครั้ง คำเชิญที่ยังไม่หมดอายุกลับมาใช้ได้ · ผู้เชิญไม่พบในระบบ = ใช้ไม่ได้ (fail-closed)
 *   — ผลลัพธ์ = null เหมือนกรณีอื่น (ข้อความเดียว INVITE_INVALID_MESSAGE ไม่บอกเหตุผล กัน enumeration)
 */
async function findValidInvitation(token: unknown): Promise<{ inv: Invitation; user: AppUser } | null> {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const h = await hashInviteToken(token);
  const now = Date.now();
  const inv = load<Invitation>(KEYS.invitations).find(i => i.tokenHash === h);
  if (!inv || inv.usedAt || inv.revokedAt || !(inv.expiresAt > now)) return null;
  const users = getUsers();
  const user = users.find(u => u.id === inv.userId);
  if (!user || userStatus(user) !== 'invited') return null;
  const inviter = users.find(u => u.id === inv.createdBy);
  if (!inviter || !isActiveUser(inviter) || !can(inviter, 'user.manage', { universityId: user.universityId })) return null;
  return { inv, user };
}

// ─── O1: เชิญ ────────────────────────────────────────────────────────────
/** เชิญผู้ใช้ใหม่ — บทบาทล็อกโดยผู้เชิญ · คืน token ดิบครั้งเดียว (ผู้ดูแลคัดลอกลิงก์ไปส่งเอง) */
export async function inviteUser(actor: AppUser, input: InviteInput): Promise<InviteResult> {
  requireActiveActor(actor);
  if (!can(actor, 'user.manage', { universityId: actor.universityId })) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  const username = str(input?.username);
  const email = str(input?.email);
  const fullName = str(input?.fullName);
  validateIdentity(username, email, fullName);
  assertUnique(getUsers(), username, email, 'อีเมลนี้ถูกใช้แล้ว');
  const roles = validateGrantedRoles(actor, actor.universityId, input?.roles);
  const now = Date.now();
  const user: AppUser = {
    id: newId('u'), username, password: '', universityId: actor.universityId, email, fullName, roles, status: 'invited',
  };
  const { inv, token } = await createInvitation(actor, user, now);
  // หลัง await: อ่านใหม่และตรวจซ้ำ (กันกดซ้ำ/แท็บอื่นสร้างชื่อเดียวกันระหว่างรอ hash)
  const users = getUsers();
  assertUnique(users, username, email, 'อีเมลนี้ถูกใช้แล้ว');
  saveUsers([...users, user]);
  save(KEYS.invitations, [...load<Invitation>(KEYS.invitations), inv]);
  appendAudit(actor, {
    action: 'user.invite', targetType: 'user', targetId: user.id,
    after: { username, roles: sanitizeRoles(roles), expiresAt: inv.expiresAt },
  });
  return { user: withoutPassword(user), token, expiresAt: inv.expiresAt };
}

/** ออกลิงก์เชิญใหม่ (ลิงก์เดิมที่ยังใช้ได้ถูกยกเลิก) */
export async function reissueInvitation(actor: AppUser, userId: string): Promise<InviteResult> {
  const target = managedTarget(actor, userId, 'invited');
  const now = Date.now();
  const { inv, token } = await createInvitation(actor, target, now);
  // หลัง await: ตรวจสถานะซ้ำ (อาจถูกยกเลิก/รับเชิญไปแล้วระหว่างรอ)
  const fresh = managedTarget(actor, userId, 'invited');
  revokeInvitationsOf(userId, now);
  save(KEYS.invitations, [...load<Invitation>(KEYS.invitations), inv]);
  appendAudit(actor, {
    action: 'user.invite_reissue', targetType: 'user', targetId: userId,
    after: { username: fresh.username, expiresAt: inv.expiresAt },
  });
  return { user: withoutPassword(fresh), token, expiresAt: inv.expiresAt };
}

/** ยกเลิกคำเชิญ — revoke + ลบแถวผู้ใช้ที่ยังไม่เคยใช้งาน */
export function cancelInvitation(actor: AppUser, userId: string): void {
  const target = managedTarget(actor, userId, 'invited');
  revokeInvitationsOf(userId);
  saveUsers(getUsers().filter(u => u.id !== userId));
  appendAudit(actor, { action: 'user.invite_cancel', targetType: 'user', targetId: userId, before: { username: target.username } });
}

/** สาธารณะ — ข้อมูลสำหรับหน้า /invite (อ่านอย่างเดียว) · ใช้ไม่ได้ = null */
export async function peekInvitation(token: string): Promise<InvitePreview | null> {
  const found = await findValidInvitation(token);
  if (!found) return null;
  const uni = getUniversity(found.user.universityId);
  return {
    fullName: found.user.fullName, username: found.user.username,
    universityNameTh: uni?.nameTh ?? '', universityNameEn: uni?.nameEn ?? '',
    roles: Array.from(new Set(found.user.roles.map(r => r.role))), expiresAt: found.inv.expiresAt,
  };
}

/** สาธารณะ — ตั้งรหัสผ่านจากลิงก์เชิญ แล้วเข้าสู่ระบบทันที (session + audit auth.login ตาม loginUser) */
export async function acceptInvitation(token: string, password: string): Promise<LoginResult> {
  validatePassword(password);
  const found = await findValidInvitation(token);
  if (!found) throw new AunqaError('invalid', INVITE_INVALID_MESSAGE);
  const hash = await hashPassword(password);
  // หลัง await: ตรวจซ้ำว่ายังใช้ได้ (กันกดยืนยันซ้ำสองครั้ง)
  const again = await findValidInvitation(token);
  if (!again || again.inv.id !== found.inv.id) throw new AunqaError('invalid', INVITE_INVALID_MESSAGE);
  const now = Date.now();
  const activated: AppUser = { ...again.user, password: hash, status: 'active' };
  saveUsers(getUsers().map(u => (u.id === activated.id ? activated : u)));
  save(KEYS.invitations, load<Invitation>(KEYS.invitations).map(i => (i.id === again.inv.id ? { ...i, usedAt: now } : i)));
  appendAudit(activated, { action: 'user.invite_accept', targetType: 'user', targetId: activated.id, after: { invitationId: again.inv.id } });
  // N14 → ผู้เชิญ (notify ข้ามเองถ้าผู้เชิญไม่ active แล้ว)
  notify({
    userId: again.inv.createdBy, kind: 'account',
    messageTh: `${activated.fullName} ตั้งรหัสผ่านและเริ่มใช้งานแล้ว`,
    messageEn: `${activated.fullName} has set a password and joined`,
    target: { type: 'admin', tab: 'users' },
  });
  return loginUser(activated.username, password);
}

// ─── O2: ขอเข้าใช้งาน ─────────────────────────────────────────────────────
/**
 * สาธารณะ — ส่งคำขอเข้าใช้งาน (ไม่มีช่องบทบาท: roles [] / status 'pending' ตายตัว)
 * อ่านเฉพาะ field ใน allowlist — roles/status/อื่น ๆ ที่แนบมาถูกละเลย (mass assignment)
 */
export async function submitAccessRequest(input: AccessRequestInput): Promise<{ username: string }> {
  const fullName = str(input?.fullName);
  const email = str(input?.email);
  const username = str(input?.username);
  const password: unknown = input?.password;
  const programmeId = str(input?.programmeId) || undefined;
  const facultyId = str(input?.facultyId) || undefined;
  const positionText = str(input?.positionText) || undefined;
  const reason = str(input?.reason);

  if (!fullName || fullName.length > MAX_NAME) throw new AunqaError('invalid', 'กรุณากรอกชื่อ-นามสกุล (ไม่เกิน 100 ตัวอักษร)');
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) throw new AunqaError('invalid', 'รูปแบบอีเมลไม่ถูกต้อง');
  const uni: University | null = findUniversityByEmail(email);
  if (!uni) throw new AunqaError('invalid', 'อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้');
  if (!USERNAME_RE.test(username)) throw new AunqaError('invalid', USERNAME_INVALID_MESSAGE);
  assertUnique(getUsers(), username, email, 'อีเมลนี้มีบัญชีหรือคำขออยู่แล้ว');
  validatePassword(password);
  if (programmeId) {
    const p = getProgramme(programmeId);
    if (!p || p.universityId !== uni.id || (facultyId && p.facultyId !== facultyId)) throw new AunqaError('invalid', 'หน่วยงานที่เลือกไม่ถูกต้อง');
  }
  if (facultyId && !getFaculties(uni.id).some(f => f.id === facultyId)) throw new AunqaError('invalid', 'หน่วยงานที่เลือกไม่ถูกต้อง');
  if (positionText && positionText.length > MAX_POSITION) throw new AunqaError('invalid', 'ตำแหน่ง/หน้าที่ต้องไม่เกิน 100 ตัวอักษร');
  if (!reason || reason.length > MAX_REASON) throw new AunqaError('invalid', 'กรุณาระบุเหตุผล (ไม่เกิน 500 ตัวอักษร)');
  if (input?.consent !== true) throw new AunqaError('invalid', 'กรุณายืนยันการรับทราบวัตถุประสงค์การใช้ข้อมูล');

  const hash = await hashPassword(password as string);
  const users = getUsers();
  assertUnique(users, username, email, 'อีเมลนี้มีบัญชีหรือคำขออยู่แล้ว');
  const accessRequest: AccessRequestInfo = { reason, requestedAt: Date.now() };
  if (programmeId) accessRequest.programmeId = programmeId;
  if (facultyId) accessRequest.facultyId = facultyId;
  if (positionText) accessRequest.positionText = positionText;
  const user: AppUser = {
    id: newId('u'), username, password: hash, universityId: uni.id, email, fullName,
    roles: [], status: 'pending', accessRequest,
  };
  saveUsers([...users, user]);
  appendAudit(null, {
    action: 'user.request', targetType: 'user', targetId: user.id, after: { programmeId, facultyId },
  }, uni.id);
  // N12 → ผู้มี user.manage ของมหาวิทยาลัยนั้น (รวม super_admin) ที่ active
  // dedupeKey ผูกกับผู้ขอ → ปฏิเสธ/ลบคำขอแล้วลบแจ้งเตือนนี้ของทุกผู้รับได้ (S-01) · ข้อความเดิมไม่เปลี่ยน
  users.filter(u => isActiveUser(u) && can(u, 'user.manage', { universityId: uni.id })).forEach(u => notify({
    userId: u.id, kind: 'access_request',
    messageTh: `มีคำขอเข้าใช้งานใหม่จาก ${fullName}`,
    messageEn: `New access request from ${fullName}`,
    target: { type: 'admin', tab: 'requests' },
    dedupeKey: accessRequestNoticeKey(user.id),
  }));
  return { username };
}

function pendingVisibleTo(actor: AppUser): AppUser[] | null {
  if (isSuper(actor)) return getUsers().filter(u => userStatus(u) === 'pending');
  if (!can(actor, 'user.manage', { universityId: actor.universityId })) return null;
  return getUsers().filter(u => userStatus(u) === 'pending' && u.universityId === actor.universityId);
}

/** คำขอที่รออนุมัติ (super = ทุกมหาวิทยาลัย, อื่น = มหาวิทยาลัยตน) เรียงเก่า → ใหม่ */
export function listAccessRequests(actor: AppUser): AccessRequestView[] {
  const rows = pendingVisibleTo(actor);
  if (!rows) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์จัดการผู้ใช้');
  return rows
    .map(u => {
      const r = u.accessRequest;
      const v: AccessRequestView = {
        userId: u.id, username: u.username, fullName: u.fullName, email: u.email, universityId: u.universityId,
        reason: r?.reason ?? '', requestedAt: r?.requestedAt ?? 0,
      };
      if (r?.programmeId) v.programmeId = r.programmeId;
      if (r?.facultyId) v.facultyId = r.facultyId;
      if (r?.positionText) v.positionText = r.positionText;
      return v;
    })
    .sort((a, b) => a.requestedAt - b.requestedAt);
}

/** ตัวนับเมนู/แท็บ — ไม่มีสิทธิ์ = 0 */
export function countPendingAccessRequests(actor: AppUser | null | undefined): number {
  if (!actor) return 0;
  return pendingVisibleTo(actor)?.length ?? 0;
}

/**
 * อนุมัติคำขอ: กำหนดบทบาท → active · แจ้งผู้ขอ (N13)
 * N12 ของผู้ดูแลคงไว้ (ต่างจาก reject): ผู้ขอกลายเป็นผู้ใช้ active ชื่อ-สกุลยังใช้อยู่ในระบบตามวัตถุประสงค์
 * และแจ้งเตือนเป็นประวัติว่าใครส่งคำขอ — ไม่มีการเก็บเกินจำเป็น
 */
export function approveAccessRequest(actor: AppUser, userId: string, roles: RoleAssignment[]): Omit<AppUser, 'password'> {
  const target = managedTarget(actor, userId, 'pending');
  const granted = validateGrantedRoles(actor, target.universityId, roles);
  const { accessRequest: _req, ...rest } = target;
  const approved: AppUser = { ...rest, roles: granted, status: 'active' };
  saveUsers(getUsers().map(u => (u.id === userId ? approved : u)));
  appendAudit(actor, {
    action: 'user.approve', targetType: 'user', targetId: userId,
    before: { status: 'pending' }, after: { status: 'active', roles: sanitizeRoles(granted) },
  });
  markAccessRequestNoticesRead(userId); // R2-B4 (P7): งานจัดการแล้ว ไม่ค้าง "ใหม่" ที่กระดิ่งผู้ดูแล
  notify({
    userId, kind: 'account',
    messageTh: 'บัญชีของคุณได้รับอนุมัติแล้ว เริ่มใช้งานได้เลย',
    messageEn: 'Your account has been approved — you can start using the system',
    target: { type: 'home' },
  });
  return withoutPassword(approved);
}

/**
 * ปฏิเสธคำขอ: ลบแถวผู้ใช้ทันที (ลดข้อมูลส่วนบุคคล) — audit เก็บแค่โดเมนอีเมล + หน่วยงาน
 * S-01: ลบแจ้งเตือน N12 ที่มีชื่อผู้ขอออกจากผู้รับทุกคนด้วย (ตรงประกาศ "ถูกปฏิเสธ = ลบทันที")
 */
export function rejectAccessRequest(actor: AppUser, userId: string, note?: string): void {
  const target = managedTarget(actor, userId, 'pending');
  const why = str(note);
  if (why.length > MAX_REASON) throw new AunqaError('invalid', 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร');
  saveUsers(getUsers().filter(u => u.id !== userId));
  purgeAccessRequestNotices(userId, target.fullName);
  const at = target.email.lastIndexOf('@');
  appendAudit(actor, {
    action: 'user.reject', targetType: 'user', targetId: userId,
    before: {
      emailDomain: at >= 0 ? target.email.slice(at + 1).toLowerCase() : '',
      programmeId: target.accessRequest?.programmeId, facultyId: target.accessRequest?.facultyId,
    },
    after: { note: why || undefined },
  });
}
