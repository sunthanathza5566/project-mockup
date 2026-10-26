/**
 * TASK-0002 Q2b — ADR-AUTH-001 (unit)
 * - AC-26 เชิญ (O1): token ครั้งเดียว, เก็บแค่ hash, invited login ไม่ได้, รับเชิญได้ role/scope ตรง, ใช้ซ้ำ/หมดอายุ/reissue/cancel = ข้อความเดียว, สิทธิ์
 * - AC-27 ขอเข้าใช้งาน (O2): โดเมน, mass assignment, pending login, list/count/approve/reject, ข้าม uni, audit ไม่มีข้อมูลลับ
 * - AC-28 ระงับบัญชี + C8 (ASVS 7.4.2): session ที่เปิดค้างตายเมื่อระงับ/ลบ
 * - AC-29 รหัสผ่าน 8–128 ทุกทาง ไม่บังคับผสมอักขระ ไม่ trim
 * - AC-30 deleteUser conflict / resetDemo super only
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import { getUsers, saveUsers } from '@/lib/api/auth.api';
import type { AppUser, AuditLog, Invitation, RoleAssignment } from '@/lib/types';
import { CYCLE, PROG, freshSeededDemo, user } from './helpers';

const PW = 'secret-pass-8';
const SEED_PW = 'demo1234';
const DOMAIN = 'sample-uni.example';
const STAFF: RoleAssignment[] = [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }];
const MSG = api.INVITE_INVALID_MESSAGE;

const raw = (username: string) => getUsers().find(u => u.username === username);
const audits = () => load<AuditLog>(KEYS.audit);
const auditOf = (action: string) => audits().filter(a => a.action === action);
const invitations = () => load<Invitation>(KEYS.invitations);
/** ทุกค่าใน localStorage ต่อกัน (ตรวจว่าไม่มี token ดิบ) */
function storageText(): string {
  let s = '';
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; s += k + '=' + localStorage.getItem(k) + '\n'; }
  return s;
}
const code = (p: Promise<unknown> | (() => unknown)) =>
  typeof p === 'function'
    ? (() => { try { p(); return 'ok'; } catch (e: any) { return e?.code ?? String(e); } })()
    : p.then(() => 'ok', (e: any) => e?.code ?? String(e));
async function invite(actor: AppUser = user('uadmin'), over: Partial<api.InviteInput> = {}) {
  return api.inviteUser(actor, { username: 'newbie', email: `newbie@${DOMAIN}`, fullName: 'น้องใหม่ ทดสอบ', roles: STAFF, ...over });
}
const reqInput = (over: Record<string, unknown> = {}) => ({
  fullName: 'สมมติ ขอใช้', email: `req.one@${DOMAIN}`, username: 'reqone', password: PW,
  reason: 'ช่วยเขียน SAR', consent: true, ...over,
}) as api.AccessRequestInput;

beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); });
afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════ AC-26 เชิญ ════════════════════
describe('AC-26 เชิญ (O1)', () => {
  it('inviteUser → token 43 ตัว base64url คืนครั้งเดียว · เก็บแค่ tokenHash · user invited ไม่มีรหัส · expiresAt = +7 วัน', async () => {
    const t0 = 1_900_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    const r = await invite();
    expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(r.expiresAt).toBe(t0 + api.INVITE_TTL_MS);
    expect(api.INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(r.user).not.toHaveProperty('password');
    expect(r.user).toMatchObject({ username: 'newbie', status: 'invited', universityId: 'uni-demo', roles: STAFF });
    const u = raw('newbie')!;
    expect(u).toMatchObject({ status: 'invited', password: '' });
    const [inv] = invitations();
    expect(inv).toMatchObject({ userId: u.id, createdBy: 'u-uniadm', createdAt: t0, expiresAt: t0 + api.INVITE_TTL_MS });
    expect(inv.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(inv).not.toHaveProperty('token');
    expect(storageText()).not.toContain(r.token);
    // invited อยู่ใน listUsers (admin เห็นในตาราง)
    expect(api.listUsers('uni-demo').some(x => x.id === u.id)).toBe(true);
  });

  it('token สองครั้งไม่ซ้ำกัน (CSPRNG)', async () => {
    const a = await invite();
    const b = await invite(user('uadmin'), { username: 'newbie2', email: `newbie2@${DOMAIN}` });
    expect(a.token).not.toBe(b.token);
  });

  it('invited login ไม่ได้ = invalid (นับครั้งผิดเหมือนรหัสผิด ไม่เผยว่ามีบัญชี)', async () => {
    await invite();
    const before = api.remainingAttempts('newbie');
    const r = await api.loginUser('newbie', PW);
    expect(r).toMatchObject({ success: false, error: 'invalid' });
    expect(api.remainingAttempts('newbie')).toBe(before - 1);
    expect(api.getSession()).toBeNull();
  });

  it('peekInvitation → preview · acceptInvitation(8 ตัว) → login ด้วย role/scope ที่เชิญเท่านั้น', async () => {
    const r = await invite();
    const p = await api.peekInvitation(r.token);
    expect(p).toMatchObject({ fullName: 'น้องใหม่ ทดสอบ', username: 'newbie', roles: ['programme_staff'], expiresAt: r.expiresAt });
    expect(p!.universityNameTh.length).toBeGreaterThan(0);
    const res = await api.acceptInvitation(r.token, 'abcdefgh');
    expect(res.success).toBe(true);
    const me = api.getCurrentUser()!;
    expect(me.username).toBe('newbie');
    expect(me.status).toBe('active');
    expect(me.roles).toEqual(STAFF);
    expect(api.getSession()!.roles).toEqual(STAFF);
    expect(invitations()[0].usedAt).toBeTypeOf('number');
    // login ใหม่ด้วยรหัสที่ตั้งเองได้
    api.logoutUser();
    expect((await api.loginUser('newbie', 'abcdefgh')).success).toBe(true);
  });

  it('ใช้ token ซ้ำ / หมดอายุ / หลัง reissue / หลัง cancel / token มั่ว → ข้อความเดียวกันทุกกรณี + peek = null', async () => {
    const ua = user('uadmin');
    const expectBad = async (token: string) => {
      await expect(api.acceptInvitation(token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
      expect(await api.peekInvitation(token)).toBeNull();
    };
    // ใช้ซ้ำ
    const r1 = await invite();
    await api.acceptInvitation(r1.token, PW);
    api.logoutUser();
    await expectBad(r1.token);
    // หลัง reissue: token เก่าใช้ไม่ได้ ใหม่ใช้ได้
    const r2 = await invite(ua, { username: 'newbie2', email: `newbie2@${DOMAIN}` });
    const r2b = await api.reissueInvitation(ua, r2.user.id);
    expect(r2b.token).not.toBe(r2.token);
    await expectBad(r2.token);
    expect(invitations().filter(i => i.userId === r2.user.id && i.revokedAt)).toHaveLength(1);
    expect((await api.acceptInvitation(r2b.token, PW)).success).toBe(true);
    api.logoutUser();
    // หลัง cancel: user ถูกลบ
    const r3 = await invite(ua, { username: 'newbie3', email: `newbie3@${DOMAIN}` });
    api.cancelInvitation(ua, r3.user.id);
    expect(raw('newbie3')).toBeUndefined();
    await expectBad(r3.token);
    // token มั่ว / รูปแบบผิด / ว่าง
    await expectBad('A'.repeat(43));
    await expectBad('not-a-token');
    await expectBad('');
  });

  it('หมดอายุ: ณ expiresAt − 1 ใช้ได้ · ณ expiresAt และหลัง 7 วัน = ข้อความเดียว', async () => {
    const t0 = 1_900_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const a = await invite();
    const b = await invite(user('uadmin'), { username: 'newbie2', email: `newbie2@${DOMAIN}` });
    now.mockReturnValue(t0 + api.INVITE_TTL_MS);
    await expect(api.acceptInvitation(a.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
    now.mockReturnValue(t0 + api.INVITE_TTL_MS + 86_400_000);
    await expect(api.acceptInvitation(a.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
    now.mockReturnValue(t0 + api.INVITE_TTL_MS - 1);
    expect((await api.acceptInvitation(b.token, PW)).success).toBe(true);
  });

  it('acceptInvitation ตรวจรหัสก่อน token: 7 ตัว = รหัสผ่านต้องยาว 8–128 (token ยังใช้ได้ต่อ)', async () => {
    const r = await invite();
    await expect(api.acceptInvitation(r.token, '1234567')).rejects.toMatchObject({ code: 'invalid', message: 'รหัสผ่านต้องยาว 8–128 ตัวอักษร' });
    expect(await api.peekInvitation(r.token)).not.toBeNull();
  });

  it('สิทธิ์: chair เชิญ = forbidden · uadmin เชิญ super_admin = forbidden · scope ข้าม uni / scope ไม่มีจริง = invalid · roles ว่าง = invalid', async () => {
    expect(await code(invite(user('chair1')))).toBe('forbidden');
    expect(await code(invite(user('uadmin'), { roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }] }))).toBe('forbidden');
    expect(await code(invite(user('uadmin'), { roles: [{ role: 'uni_admin', scopeType: 'university', scopeId: 'uni-demo-2' }] }))).toBe('invalid');
    expect(await code(invite(user('uadmin2'), { roles: STAFF }))).toBe('invalid'); // PROG อยู่ uni-demo
    expect(await code(invite(user('uadmin'), { roles: [{ role: 'programme_staff', scopeType: 'programme', scopeId: 'prog-nope' }] }))).toBe('invalid');
    expect(await code(invite(user('uadmin'), { roles: [{ role: 'hacker' as any, scopeType: 'university', scopeId: 'uni-demo' }] }))).toBe('invalid');
    expect(await code(invite(user('uadmin'), { roles: [] }))).toBe('invalid');
    expect(getUsers().some(u => u.username === 'newbie')).toBe(false);
    expect(invitations()).toEqual([]);
    // super_admin ให้ super_admin ได้
    expect(await code(invite(user('sadmin'), { roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }] }))).toBe('ok');
  });

  it('username/อีเมลซ้ำ (ไม่แยกตัวพิมพ์) = duplicate · อีเมลผิดรูปแบบ / username ผิด = invalid', async () => {
    expect(await code(invite(user('uadmin'), { username: 'CHAIR1' }))).toBe('duplicate');
    expect(await code(invite(user('uadmin'), { email: `CHAIR.CS@${DOMAIN.toUpperCase()}` }))).toBe('duplicate');
    expect(await code(invite(user('uadmin'), { email: 'no-at-sign' }))).toBe('invalid');
    expect(await code(invite(user('uadmin'), { username: 'a b' }))).toBe('invalid');
  });

  it('reissue/cancel: uni อื่น = forbidden · เป้าหมายไม่ใช่ invited = invalid', async () => {
    const r = await invite();
    expect(await code(api.reissueInvitation(user('uadmin2'), r.user.id))).toBe('forbidden');
    expect(code(() => api.cancelInvitation(user('uadmin2'), r.user.id))).toBe('forbidden');
    expect(await code(api.reissueInvitation(user('uadmin'), 'u-lect1'))).toBe('invalid');
    expect(code(() => api.cancelInvitation(user('uadmin'), 'u-lect1'))).toBe('invalid');
    expect(raw('lect1')).toBeTruthy();
  });

  it('audit user.invite / invite_reissue / invite_cancel / invite_accept มี และไม่มี token/hash/รหัสผ่าน', async () => {
    const ua = user('uadmin');
    const r = await invite();
    const rb = await api.reissueInvitation(ua, r.user.id);
    await api.acceptInvitation(rb.token, PW);
    const c = await invite(ua, { username: 'newbie2', email: `newbie2@${DOMAIN}` });
    api.cancelInvitation(ua, c.user.id);
    expect(auditOf('user.invite')).toHaveLength(2);
    expect(auditOf('user.invite')[0]).toMatchObject({ actorId: 'u-uniadm', targetId: r.user.id, after: { username: 'newbie', roles: STAFF } });
    expect(auditOf('user.invite_reissue')).toHaveLength(1);
    expect(auditOf('user.invite_cancel')[0]).toMatchObject({ before: { username: 'newbie2' } });
    expect(auditOf('user.invite_accept')[0]).toMatchObject({ actorId: r.user.id, targetId: r.user.id });
    const text = JSON.stringify(audits());
    const secrets = [r.token, rb.token, c.token, ...invitations().map(i => i.tokenHash), raw('newbie')!.password, PW];
    for (const s of secrets) expect(text).not.toContain(s);
  });
});

// ════════════════════ AC-27 ขอเข้าใช้งาน ════════════════════
describe('AC-27 ขอเข้าใช้งาน (O2)', () => {
  it('findUniversityByEmail: โดเมนตรง/ตัวใหญ่/subdomain = uni · โดเมนที่แค่ลงท้ายเหมือน / อื่น = null', () => {
    expect(api.findUniversityByEmail(`a@${DOMAIN}`)?.id).toBe('uni-demo');
    expect(api.findUniversityByEmail(`a@${DOMAIN.toUpperCase()}`)?.id).toBe('uni-demo');
    expect(api.findUniversityByEmail(`a@cs.${DOMAIN}`)?.id).toBe('uni-demo');
    expect(api.findUniversityByEmail('a@test-uni.example')?.id).toBe('uni-demo-2');
    expect(api.findUniversityByEmail(`a@evil${DOMAIN}`)).toBeNull();
    expect(api.findUniversityByEmail('a@gmail.com')).toBeNull();
    expect(api.findUniversityByEmail('no-at')).toBeNull();
  });

  it('อีเมลโดเมนอื่น → invalid ไม่สร้างแถว', async () => {
    await expect(api.submitAccessRequest(reqInput({ email: 'x@gmail.com' })))
      .rejects.toMatchObject({ code: 'invalid', message: 'อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้' });
    expect(raw('reqone')).toBeUndefined();
  });

  it('mass assignment: roles/status/universityId/id ที่แนบมาถูกละเลย → roles [] / pending / uni จากโดเมน', async () => {
    const r = await api.submitAccessRequest(reqInput({
      roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }], status: 'active',
      universityId: 'uni-demo-2', id: 'u-evil', isAdmin: true, password: PW,
    }));
    expect(r).toEqual({ username: 'reqone' });
    const u = raw('reqone')!;
    expect(u.roles).toEqual([]);
    expect(u.status).toBe('pending');
    expect(u.universityId).toBe('uni-demo');
    expect(u.id).not.toBe('u-evil');
    expect(u).not.toHaveProperty('isAdmin');
    expect(u.password).not.toBe(PW);
    expect(u.accessRequest).toMatchObject({ reason: 'ช่วยเขียน SAR' });
    expect(getUsers().some(x => x.id === 'u-evil')).toBe(false);
  });

  it('ตรวจข้อมูล: consent ≠ true / reason ว่าง หรือ 501 / position 101 / หลักสูตรผิดคณะหรือ uni / ชื่อว่าง = invalid · อีเมล/username ซ้ำ = duplicate', async () => {
    const bad = async (over: Record<string, unknown>) => code(api.submitAccessRequest(reqInput(over)));
    expect(await bad({ consent: false })).toBe('invalid');
    expect(await bad({ consent: 'true' })).toBe('invalid');
    expect(await bad({ reason: '   ' })).toBe('invalid');
    expect(await bad({ reason: 'ก'.repeat(501) })).toBe('invalid');
    expect(await bad({ positionText: 'ก'.repeat(101) })).toBe('invalid');
    expect(await bad({ programmeId: 'prog-nope' })).toBe('invalid');
    expect(await bad({ programmeId: PROG, facultyId: 'fac-other' })).toBe('invalid');
    expect(await bad({ facultyId: 'fac-other' })).toBe('invalid');
    expect(await bad({ fullName: '' })).toBe('invalid');
    expect(await bad({ email: `CHAIR.CS@${DOMAIN}` })).toBe('duplicate');
    expect(await bad({ username: 'Chair1' })).toBe('duplicate');
    expect(getUsers().filter(u => u.status === 'pending')).toEqual([]);
    expect(await bad({ reason: 'ก'.repeat(500), programmeId: PROG, facultyId: 'fac-demo-sci', positionText: 'อาจารย์' })).toBe('ok');
  });

  it('login pending: รหัสถูก → error pending ไม่มี session · รหัสผิด → invalid (ไม่เผยสถานะ)', async () => {
    await api.submitAccessRequest(reqInput());
    expect(await api.loginUser('reqone', 'wrong-pass-xx')).toMatchObject({ success: false, error: 'invalid' });
    expect(await api.loginUser('reqone', PW)).toEqual({ success: false, error: 'pending' });
    expect(api.getSession()).toBeNull();
    expect(api.remainingAttempts('reqone')).toBe(api.remainingAttempts('nobody-here'));
  });

  it('list/count: uadmin + sadmin เห็น · uadmin2 เห็น 0 · chair = forbidden/0 · listUsers ไม่รวม pending', async () => {
    await api.submitAccessRequest(reqInput());
    const u = raw('reqone')!;
    expect(api.listAccessRequests(user('uadmin')).map(x => x.userId)).toEqual([u.id]);
    expect(api.listAccessRequests(user('uadmin'))[0]).not.toHaveProperty('password');
    expect(api.listAccessRequests(user('sadmin')).map(x => x.userId)).toEqual([u.id]);
    expect(api.listAccessRequests(user('uadmin2'))).toEqual([]);
    expect(code(() => api.listAccessRequests(user('chair1')))).toBe('forbidden');
    expect(api.countPendingAccessRequests(user('uadmin'))).toBe(1);
    expect(api.countPendingAccessRequests(user('uadmin2'))).toBe(0);
    expect(api.countPendingAccessRequests(user('chair1'))).toBe(0);
    expect(api.countPendingAccessRequests(null)).toBe(0);
    expect(api.listUsers('uni-demo').some(x => x.id === u.id)).toBe(false);
  });

  it('list เรียงเก่า → ใหม่ · คำขอของ uni-demo-2 เห็นเฉพาะ uadmin2 + sadmin', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    await api.submitAccessRequest(reqInput());
    now.mockReturnValue(1_900_000_100_000);
    await api.submitAccessRequest(reqInput({ username: 'reqtwo', email: 'req.two@test-uni.example' }));
    now.mockReturnValue(1_900_000_200_000);
    await api.submitAccessRequest(reqInput({ username: 'reqthree', email: `req.three@${DOMAIN}` }));
    expect(api.listAccessRequests(user('uadmin')).map(x => x.username)).toEqual(['reqone', 'reqthree']);
    expect(api.listAccessRequests(user('uadmin2')).map(x => x.username)).toEqual(['reqtwo']);
    expect(api.listAccessRequests(user('sadmin')).map(x => x.username)).toEqual(['reqone', 'reqtwo', 'reqthree']);
  });

  it('approve(role) → active + roles + ลบ accessRequest → login ได้ · approve ซ้ำ = invalid', async () => {
    await api.submitAccessRequest(reqInput());
    const id = raw('reqone')!.id;
    const out = api.approveAccessRequest(user('uadmin'), id, STAFF);
    expect(out).toMatchObject({ status: 'active', roles: STAFF });
    const u = raw('reqone')!;
    expect(u.status).toBe('active');
    expect(u.accessRequest).toBeUndefined();
    const r = await api.loginUser('reqone', PW);
    expect(r.success).toBe(true);
    expect(api.getCurrentUser()!.roles).toEqual(STAFF);
    expect(code(() => api.approveAccessRequest(user('uadmin'), id, STAFF))).toBe('invalid');
    expect(auditOf('user.approve')[0]).toMatchObject({ before: { status: 'pending' }, after: { status: 'active', roles: STAFF } });
  });

  it('approve สิทธิ์: uadmin2 = forbidden · ให้ super_admin = forbidden · roles ว่าง/scope ข้าม uni = invalid · chair = forbidden', async () => {
    await api.submitAccessRequest(reqInput());
    const id = raw('reqone')!.id;
    expect(code(() => api.approveAccessRequest(user('uadmin2'), id, STAFF))).toBe('forbidden');
    expect(code(() => api.rejectAccessRequest(user('uadmin2'), id))).toBe('forbidden');
    expect(code(() => api.approveAccessRequest(user('chair1'), id, STAFF))).toBe('forbidden');
    expect(code(() => api.approveAccessRequest(user('uadmin'), id, [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }]))).toBe('forbidden');
    expect(code(() => api.approveAccessRequest(user('uadmin'), id, []))).toBe('invalid');
    expect(code(() => api.approveAccessRequest(user('uadmin'), id, [{ role: 'uni_admin', scopeType: 'university', scopeId: 'uni-demo-2' }]))).toBe('invalid');
    expect(raw('reqone')!.status).toBe('pending');
    // ผู้ใช้ที่ active อยู่แล้วไม่ใช่คำขอ
    expect(code(() => api.approveAccessRequest(user('uadmin'), 'u-lect1', STAFF))).toBe('invalid');
  });

  it('reject → ลบแถวทันที · audit user.reject มีแค่โดเมน ไม่มีชื่อ/อีเมลเต็ม · audit user.request ไม่มีรหัสผ่าน/hash', async () => {
    await api.submitAccessRequest(reqInput({ programmeId: PROG }));
    const u = raw('reqone')!;
    const hash = u.password;
    api.rejectAccessRequest(user('uadmin'), u.id, 'ไม่ใช่บุคลากร');
    expect(raw('reqone')).toBeUndefined();
    expect(api.countPendingAccessRequests(user('uadmin'))).toBe(0);
    const rej = auditOf('user.reject')[0];
    expect(rej).toMatchObject({ actorId: 'u-uniadm', before: { emailDomain: DOMAIN, programmeId: PROG }, after: { note: 'ไม่ใช่บุคลากร' } });
    const req = auditOf('user.request')[0];
    expect(req).toMatchObject({ actorName: 'system', universityId: 'uni-demo', targetId: u.id });
    // uadmin เห็น audit ของคำขอใน uni ตน
    expect(api.listAudit(user('uadmin')).some(a => a.action === 'user.request')).toBe(true);
    const text = JSON.stringify(audits().filter(a => a.action.startsWith('user.')));
    for (const s of [PW, hash, `req.one@${DOMAIN}`, 'สมมติ ขอใช้']) expect(text).not.toContain(s);
    // ขอใหม่ด้วยอีเมลเดิมได้หลังถูกปฏิเสธ
    expect(await code(api.submitAccessRequest(reqInput()))).toBe('ok');
  });
});

// ════════════════════ AC-28 ระงับ + C8 ════════════════════
describe('AC-28 ระงับบัญชี + C8 (ASVS 7.4.2)', () => {
  it('ระงับ lect1 → login = suspended (เมื่อรหัสถูก) · รหัสผิด = invalid · เปิดใช้ → login ได้', async () => {
    const ua = user('uadmin');
    const s = api.setUserStatus(ua, 'u-lect1', 'suspended', 'ลาออก');
    expect(s.status).toBe('suspended');
    expect(await api.loginUser('lect1', SEED_PW)).toEqual({ success: false, error: 'suspended' });
    expect(await api.loginUser('lect1', 'wrong-pass-xx')).toMatchObject({ success: false, error: 'invalid' });
    expect(api.getSession()).toBeNull();
    api.setUserStatus(ua, 'u-lect1', 'active');
    expect((await api.loginUser('lect1', SEED_PW)).success).toBe(true);
    const a = audits().filter(x => x.targetId === 'u-lect1' && x.action.startsWith('user.'));
    expect(a.map(x => x.action)).toEqual(['user.suspend', 'user.reactivate']);
    expect(a[0]).toMatchObject({ before: { status: 'active' }, after: { status: 'suspended', reason: 'ลาออก' } });
  });

  it('C8: session ของ lect1 ที่เปิดค้าง → ระงับ → getCurrentUser null + session ถูกล้าง (local+session storage)', async () => {
    expect((await api.loginUser('lect1', SEED_PW)).success).toBe(true);
    expect(api.getCurrentUser()?.id).toBe('u-lect1');
    api.setUserStatus(user('uadmin'), 'u-lect1', 'suspended');
    expect(api.getCurrentUser()).toBeNull();
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
    expect(sessionStorage.getItem(KEYS.session)).toBeNull();
    // เปิดใช้อีกครั้งไม่ฟื้น session เดิม — ต้อง login ใหม่
    api.setUserStatus(user('uadmin'), 'u-lect1', 'active');
    expect(api.getCurrentUser()).toBeNull();
  });

  it('C8: แถวผู้ใช้ถูกลบระหว่างมี session → getCurrentUser null + session ถูกล้าง', async () => {
    expect((await api.loginUser('lect1', SEED_PW)).success).toBe(true);
    saveUsers(getUsers().filter(u => u.id !== 'u-lect1'));
    expect(api.getCurrentUser()).toBeNull();
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem(KEYS.session)).toBeNull();
  });

  it('C8: สถานะเปลี่ยนเป็น pending/invited ภายหลัง (ข้อมูลถูกแก้) → session ใช้ไม่ได้เช่นกัน', async () => {
    for (const st of ['pending', 'invited'] as const) {
      await freshSeededDemo();
      expect((await api.loginUser('lect1', SEED_PW)).success).toBe(true);
      saveUsers(getUsers().map(u => (u.id === 'u-lect1' ? { ...u, status: st } : u)));
      expect(api.getCurrentUser(), st).toBeNull();
      expect(api.getSession(), st).toBeNull();
    }
  });

  it('ผู้ถูกระงับไม่อยู่ใน listAssignableUsers · มอบหมาย/แต่งตั้งกรรมการ = invalid · เปิดใช้แล้วกลับมา · listUsers ยังเห็น', () => {
    const chair = user('chair1');
    const ids = () => api.listAssignableUsers(chair, CYCLE).map(x => x.id);
    expect(ids()).toContain('u-lect1');
    api.setUserStatus(user('uadmin'), 'u-lect1', 'suspended');
    expect(ids()).not.toContain('u-lect1');
    expect(code(() => api.assignSections(chair, CYCLE, ['1.1'], 'u-lect1'))).toBe('invalid');
    expect(code(() => api.assignAssessor(user('fqa1'), CYCLE, 'u-lect1'))).toBe('invalid');
    expect(api.listUsers('uni-demo').find(x => x.id === 'u-lect1')?.status).toBe('suspended');
    api.setUserStatus(user('uadmin'), 'u-lect1', 'active');
    expect(ids()).toContain('u-lect1');
    expect(code(() => api.assignSections(chair, CYCLE, ['1.1'], 'u-lect1'))).toBe('ok');
  });

  it('สิทธิ์: ระงับตัวเอง = invalid · uadmin ระงับ sadmin = forbidden · uadmin2/chair = forbidden · sadmin ระงับ uadmin ได้', () => {
    const ua = user('uadmin');
    expect(code(() => api.setUserStatus(ua, ua.id, 'suspended'))).toBe('invalid');
    expect(code(() => api.setUserStatus(ua, 'u-super', 'suspended'))).toBe('forbidden');
    expect(code(() => api.setUserStatus(user('uadmin2'), 'u-lect1', 'suspended'))).toBe('forbidden');
    expect(code(() => api.setUserStatus(user('chair1'), 'u-lect1', 'suspended'))).toBe('forbidden');
    expect(code(() => api.setUserStatus(ua, 'u-nope', 'suspended'))).toBe('not_found');
    expect(raw('sadmin')!.status ?? 'active').toBe('active');
    expect(code(() => api.setUserStatus(user('sadmin'), 'u-uniadm', 'suspended'))).toBe('ok');
    expect(auditOf('user.suspend')).toHaveLength(1);
  });

  it('เปลี่ยนได้เฉพาะ active ↔ suspended: ซ้ำสถานะ / invited / pending / สถานะอื่น = invalid · reason > 500 = invalid', async () => {
    const ua = user('uadmin');
    expect(code(() => api.setUserStatus(ua, 'u-lect1', 'active'))).toBe('invalid');
    api.setUserStatus(ua, 'u-lect1', 'suspended');
    expect(code(() => api.setUserStatus(ua, 'u-lect1', 'suspended'))).toBe('invalid');
    const inv = await invite();
    expect(code(() => api.setUserStatus(ua, inv.user.id, 'suspended'))).toBe('invalid');
    expect(code(() => api.setUserStatus(ua, inv.user.id, 'active'))).toBe('invalid'); // ข้ามการตั้งรหัสไม่ได้
    await api.submitAccessRequest(reqInput());
    expect(code(() => api.setUserStatus(ua, raw('reqone')!.id, 'active'))).toBe('invalid'); // ข้ามการอนุมัติไม่ได้
    expect(code(() => api.setUserStatus(ua, 'u-lect2', 'pending' as any))).toBe('invalid');
    expect(code(() => api.setUserStatus(ua, 'u-lect2', 'suspended', 'ก'.repeat(501)))).toBe('invalid');
    expect(raw('lect2')!.status ?? 'active').toBe('active');
  });
});

// ════════════════════ AC-29 รหัสผ่าน ════════════════════
describe('AC-29 รหัสผ่าน 8–128 ทุกทาง', () => {
  const lens = [[7, 'invalid'], [8, 'ok'], [64, 'ok'], [128, 'ok'], [129, 'invalid']] as const;
  it('ค่าคงที่ PASSWORD_MIN/MAX = 8/128', () => {
    expect(api.PASSWORD_MIN).toBe(8);
    expect(api.PASSWORD_MAX).toBe(128);
  });

  it('createUser: 7 = invalid · 8/64/128 ผ่าน · 129 = invalid · aaaaaaaa ผ่าน (ไม่มีกฎผสมอักขระ)', async () => {
    let i = 0;
    for (const [n, want] of lens) {
      i++;
      const got = await code(api.createUser(user('uadmin'), { username: `pw${i}`, password: 'x'.repeat(n), email: `pw${i}@${DOMAIN}`, fullName: 'ทดสอบ', roles: STAFF }));
      expect(got, `len ${n}`).toBe(want);
    }
    expect(await code(api.createUser(user('uadmin'), { username: 'pwa', password: 'aaaaaaaa', email: `pwa@${DOMAIN}`, fullName: 'ทดสอบ', roles: STAFF }))).toBe('ok');
    expect((await api.loginUser('pwa', 'aaaaaaaa')).success).toBe(true);
    expect(raw('pwa')!.status).toBe('active');
  });

  it('createUser: scope ข้าม uni = invalid (validateRoleScopes) · id ไม่ชน seed', async () => {
    expect(await code(api.createUser(user('uadmin'), { username: 'xuni', password: PW, email: `xuni@${DOMAIN}`, fullName: 'ท', roles: [{ role: 'uni_admin', scopeType: 'university', scopeId: 'uni-demo-2' }] }))).toBe('invalid');
    const u = await api.createUser(user('uadmin'), { username: 'chair', password: PW, email: `chairx@${DOMAIN}`, fullName: 'ท', roles: STAFF });
    expect(u.id).not.toBe('u-chair');
    expect(raw('chair1')!.id).toBe('u-chair');
  });

  it('acceptInvitation: 7 = invalid · 8/64/128 ผ่าน · 129 = invalid', async () => {
    let i = 0;
    for (const [n, want] of lens) {
      i++;
      const r = await invite(user('uadmin'), { username: `inv${i}`, email: `inv${i}@${DOMAIN}` });
      expect(await code(api.acceptInvitation(r.token, 'y'.repeat(n))), `len ${n}`).toBe(want);
      api.logoutUser();
    }
  });

  it('submitAccessRequest: 7 = invalid · 8/64/128 ผ่าน · 129 = invalid', async () => {
    let i = 0;
    for (const [n, want] of lens) {
      i++;
      expect(await code(api.submitAccessRequest(reqInput({ username: `rq${i}`, email: `rq${i}@${DOMAIN}`, password: 'z'.repeat(n) }))), `len ${n}`).toBe(want);
    }
    expect(await code(api.submitAccessRequest(reqInput({ password: 12345678 })))).toBe('invalid'); // ไม่ใช่ string
  });

  it('ไม่ trim รหัสผ่าน: " abcdef " (8 ตัวรวมช่องว่าง) ใช้ได้ และต้องพิมพ์ช่องว่างตรงตัว', async () => {
    const r = await invite();
    expect((await api.acceptInvitation(r.token, ' abcdef ')).success).toBe(true);
    api.logoutUser();
    expect((await api.loginUser('newbie', 'abcdef')).success).toBe(false);
    expect((await api.loginUser('newbie', ' abcdef ')).success).toBe(true);
  });
});

// ════════════════════ AC-30 บั๊กที่แก้ ════════════════════
describe('AC-30 deleteUser / resetDemo', () => {
  it('resetDemo: uadmin/chair = forbidden (ข้อมูลไม่ถูกล้าง) · sadmin ผ่าน', async () => {
    await api.submitAccessRequest(reqInput());
    await expect(api.resetDemo(user('uadmin'))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.resetDemo(user('chair1'))).rejects.toMatchObject({ code: 'forbidden' });
    expect(raw('reqone')).toBeTruthy();
    await expect(api.resetDemo(user('sadmin'))).resolves.toBeUndefined();
    expect(raw('reqone')).toBeUndefined();
  });

  it('deleteUser: active (seed ไม่มี status) = conflict · suspended = conflict · ตัวเอง = invalid · super โดย uadmin = forbidden', () => {
    const ua = user('uadmin');
    expect(() => api.deleteUser(ua, 'u-lect1')).toThrowError(expect.objectContaining({ code: 'conflict', message: 'ผู้ใช้นี้เคยใช้งานแล้ว ให้ระงับบัญชีแทนการลบ' }));
    api.setUserStatus(ua, 'u-lect1', 'suspended');
    expect(code(() => api.deleteUser(ua, 'u-lect1'))).toBe('conflict');
    expect(code(() => api.deleteUser(ua, ua.id))).toBe('invalid');
    expect(code(() => api.deleteUser(ua, 'u-super'))).toBe('forbidden');
    expect(raw('lect1')).toBeTruthy();
    expect(auditOf('user.delete')).toEqual([]);
  });

  it('deleteUser: invited = ลบได้ + revoke คำเชิญ (token ใช้ไม่ได้) · pending = ลบได้', async () => {
    const ua = user('uadmin');
    const r = await invite();
    api.deleteUser(ua, r.user.id);
    expect(raw('newbie')).toBeUndefined();
    expect(invitations()[0].revokedAt).toBeTypeOf('number');
    await expect(api.acceptInvitation(r.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
    await api.submitAccessRequest(reqInput());
    api.deleteUser(ua, raw('reqone')!.id);
    expect(raw('reqone')).toBeUndefined();
    expect(auditOf('user.delete')).toHaveLength(2);
  });
});
