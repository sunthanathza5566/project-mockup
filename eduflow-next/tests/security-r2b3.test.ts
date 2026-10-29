/**
 * TASK-0002 เฟส 6 — ครอบรอบแก้ R2-B3 (security audit S-01 / S-04 / S-05 / S-06)
 * - S-01 ปฏิเสธคำขอ / ลบผู้ขอ pending → แจ้งเตือน N12 ที่มีชื่อผู้ขอหายจากผู้รับทุกคน (รวมแถวเก่าไม่มี dedupeKey) · อนุมัติ = คง N12
 * - S-04 ผู้เชิญถูกระงับ / ถูกถอนสิทธิ์ user.manage → คำเชิญใช้ไม่ได้ (ข้อความเดียว) · เปิดใช้อีกครั้ง → ใช้ได้
 * - S-05 helper ไม่มี guard (`revokeInvitationsOf`, `purgeAccessRequestNotices`) ไม่อยู่ใน facade `@/lib/api`
 * - S-06 ค่าคืนของ write API ผู้ใช้ไม่มี key `password` (แต่ store ยังเก็บ hash)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load, save } from '@/lib/api/db';
import { getUsers } from '@/lib/api/auth.api';
import type { AppNotification, RoleAssignment } from '@/lib/types';
import { PROG, freshSeededDemo, user } from './helpers';

const PW = 'secret-pass-8';
const DOMAIN = 'sample-uni.example';
const STAFF: RoleAssignment[] = [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }];
const MSG = api.INVITE_INVALID_MESSAGE;
const notes = () => load<AppNotification>(KEYS.notifications);
const n12Of = (fullName: string) => notes().filter(n => n.kind === 'access_request' && n.messageTh.includes(fullName));
const raw = (username: string) => getUsers().find(u => u.username === username);
function storageText(): string {
  let s = '';
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; s += localStorage.getItem(k) + '\n'; }
  return s;
}
const A = { fullName: 'สมมติ ผู้ขอหนึ่ง', email: `req.one@${DOMAIN}`, username: 'reqone' };
const B = { fullName: 'สมมติ ผู้ขอสอง', email: `req.two@${DOMAIN}`, username: 'reqtwo' };
async function request(p: typeof A) {
  await api.submitAccessRequest({ ...p, password: PW, reason: 'ช่วยเขียน SAR', consent: true });
  return raw(p.username)!.id;
}

beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); save(KEYS.notifications, []); });
afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════ S-01 ════════════════════
describe('S-01 ปฏิเสธ/ลบคำขอ → N12 ของผู้ขอหายจากผู้รับทุกคน', () => {
  it('N12 ใหม่มี dedupeKey access_request:<id> ส่งถึง uadmin + sadmin', async () => {
    const id = await request(A);
    const rows = n12Of(A.fullName);
    expect(rows.map(n => n.userId).sort()).toEqual(['u-super', 'u-uniadm']);
    for (const n of rows) expect(n.dedupeKey).toBe(`access_request:${id}`);
  });

  it('reject → N12 ของผู้ขอหายทุกผู้รับ · storage ไม่มีชื่อ/อีเมลผู้ขอ · N12 ของคำขออื่นยังอยู่', async () => {
    const idA = await request(A);
    await request(B);
    expect(n12Of(A.fullName)).toHaveLength(2);
    api.rejectAccessRequest(user('uadmin'), idA, 'ไม่ใช่บุคลากร');
    expect(n12Of(A.fullName)).toEqual([]);
    const s = storageText();
    expect(s).not.toContain(A.fullName);
    expect(s).not.toContain(A.email);
    expect(n12Of(B.fullName)).toHaveLength(2);
  });

  it('reject โดย super_admin ก็ลบจากทุกผู้รับเหมือนกัน (รวมกล่องของ uadmin)', async () => {
    const idA = await request(A);
    api.rejectAccessRequest(user('sadmin'), idA);
    expect(n12Of(A.fullName)).toEqual([]);
    expect(notes().filter(n => n.userId === 'u-uniadm' && n.kind === 'access_request')).toEqual([]);
  });

  it('deleteUser ผู้ขอ pending → N12 หาย + storage ไม่มีชื่อ/อีเมล · N12 ของคำขออื่นยังอยู่', async () => {
    const idA = await request(A);
    await request(B);
    api.deleteUser(user('uadmin'), idA);
    expect(raw(A.username)).toBeUndefined();
    expect(n12Of(A.fullName)).toEqual([]);
    expect(storageText()).not.toContain(A.email);
    expect(n12Of(B.fullName)).toHaveLength(2);
  });

  it('approve → N12 คงอยู่ (ผู้ขอเป็นผู้ใช้ active)', async () => {
    const idA = await request(A);
    api.approveAccessRequest(user('uadmin'), idA, STAFF);
    expect(n12Of(A.fullName)).toHaveLength(2);
  });

  it('แถว N12 legacy (ไม่มี dedupeKey) ที่ข้อความตรงชื่อผู้ขอถูกลบด้วย · แถว legacy ของชื่ออื่นไม่ถูกแตะ', async () => {
    const idA = await request(A);
    const legacy = (id: string, name: string, userId: string): AppNotification => ({
      id, universityId: 'x', userId, kind: 'access_request', messageTh: `มีคำขอเข้าใช้งานใหม่จาก ${name}`, createdAt: 1,
    });
    save(KEYS.notifications, [
      ...notes().map(({ dedupeKey: _d, ...n }) => n as AppNotification), // จำลองแถวเก่าทั้งหมด
      legacy('legacy-other', 'คนอื่น ทดสอบ', 'u-uniadm'),
    ]);
    expect(notes().every(n => !n.dedupeKey)).toBe(true);
    api.rejectAccessRequest(user('uadmin'), idA);
    expect(n12Of(A.fullName)).toEqual([]);
    expect(notes().map(n => n.id)).toEqual(['legacy-other']);
  });
});

describe('S-01 (ตาม probe P22) ปฏิเสธคำขอหนึ่ง ลบเฉพาะ N12 ของผู้ขอนั้น', () => {
  it('แถวทั้งหมดเป็น legacy (ไม่มี dedupeKey) · reject A → ไม่มีชื่อ A ใน storage · N12 ของ B ครบ 2 ผู้รับ ข้อความเดิม', async () => {
    const idA = await request(A);
    await request(B);
    save(KEYS.notifications, notes().map(({ dedupeKey: _d, ...n }) => n as AppNotification));
    const bBefore = JSON.stringify(n12Of(B.fullName));
    api.rejectAccessRequest(user('uadmin'), idA);
    expect(storageText()).not.toContain(A.fullName);
    expect(n12Of(B.fullName)).toHaveLength(2);
    expect(JSON.stringify(n12Of(B.fullName))).toBe(bBefore);
  });
  it('แถวมี dedupeKey · reject B → N12 ของ A ไม่ถูกแตะ (ทั้งสองผู้รับ)', async () => {
    const idA = await request(A);
    const idB = await request(B);
    api.rejectAccessRequest(user('sadmin'), idB);
    expect(n12Of(B.fullName)).toEqual([]);
    expect(n12Of(A.fullName).map(n => [n.userId, n.dedupeKey]).sort()).toEqual([
      ['u-super', `access_request:${idA}`], ['u-uniadm', `access_request:${idA}`],
    ]);
  });
});

// ════════════════════ S-04 ════════════════════
describe('S-04 คำเชิญขึ้นกับสถานะ+สิทธิ์ผู้เชิญ ณ เวลาที่ใช้', () => {
  const invite = (username = 'newbie') =>
    api.inviteUser(user('uadmin'), { username, email: `${username}@${DOMAIN}`, fullName: 'น้องใหม่ ทดสอบ', roles: STAFF });

  it('ผู้เชิญถูกระงับ → peek = null · accept = invalid + INVITE_INVALID_MESSAGE · ผู้รับเชิญยัง invited', async () => {
    const r = await invite();
    api.setUserStatus(user('sadmin'), 'u-uniadm', 'suspended');
    expect(await api.peekInvitation(r.token)).toBeNull();
    await expect(api.acceptInvitation(r.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
    expect(raw('newbie')!.status).toBe('invited');
  });

  it('ระงับ → เปิดใช้ผู้เชิญอีกครั้ง → คำเชิญเดิม (ยังไม่หมดอายุ) ใช้ได้ · login ได้', async () => {
    const r = await invite();
    api.setUserStatus(user('sadmin'), 'u-uniadm', 'suspended');
    await expect(api.acceptInvitation(r.token, PW)).rejects.toMatchObject({ code: 'invalid' });
    api.setUserStatus(user('sadmin'), 'u-uniadm', 'active');
    expect(await api.peekInvitation(r.token)).not.toBeNull();
    const res = await api.acceptInvitation(r.token, PW);
    expect(res.success).toBe(true);
    expect(raw('newbie')!.status).toBe('active');
  });

  it('ถอน uni_admin ของผู้เชิญ (ไม่มี user.manage แล้ว) → invalid ข้อความเดียว', async () => {
    const r = await invite();
    api.setUserRoles(user('sadmin'), 'u-uniadm', STAFF);
    expect(await api.peekInvitation(r.token)).toBeNull();
    await expect(api.acceptInvitation(r.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
  });

  it('ผู้เชิญไม่มีในระบบ (แถวหาย) → fail-closed invalid', async () => {
    const r = await invite();
    // จำลองแถวผู้เชิญหาย (ลบผ่าน API ไม่ได้เพราะเคยใช้งาน) — เขียน store ตรง
    save(KEYS.users, load<{ id: string }>(KEYS.users).filter(u => u.id !== 'u-uniadm'));
    await expect(api.acceptInvitation(r.token, PW)).rejects.toMatchObject({ code: 'invalid', message: MSG });
  });

  it('(ตาม probe P25) ผู้เชิญถูกถอนสิทธิ์ / ผู้เชิญไม่มีในระบบ → error เดียวกับ token สุ่ม (code+message) · reissue โดยผู้ดูแล active → ใช้ได้', async () => {
    const errOf = (p: Promise<unknown>) => p.then(() => null, (e: any) => ({ code: e?.code, message: e?.message }));
    const random = await errOf(api.acceptInvitation('A'.repeat(43), PW));
    const malformed = await errOf(api.acceptInvitation('not-a-token', PW));
    expect(random).toEqual({ code: 'invalid', message: MSG });
    expect(malformed).toEqual(random);

    const sa = user('sadmin');
    const peer = await api.createUser(sa, {
      username: 'uadm2', password: PW, email: `uadm2@${DOMAIN}`, fullName: 'ผู้ดูแล คนที่สอง',
      roles: [{ role: 'uni_admin', scopeType: 'university', scopeId: user('uadmin').universityId }],
    });
    const r1 = await api.inviteUser(user('uadm2'), { username: 'iv1', email: `iv1@${DOMAIN}`, fullName: 'ผู้รับเชิญ หนึ่ง', roles: STAFF });
    api.setUserRoles(sa, peer.id, STAFF); // ถอน uni_admin ของผู้เชิญ
    expect(await errOf(api.acceptInvitation(r1.token, PW))).toEqual(random);
    expect(await api.peekInvitation(r1.token)).toBeNull();
    const re = await api.reissueInvitation(user('uadmin'), raw('iv1')!.id);
    expect((await api.acceptInvitation(re.token, PW)).success).toBe(true);

    const r3 = await api.inviteUser(user('uadmin'), { username: 'iv3', email: `iv3@${DOMAIN}`, fullName: 'ผู้รับเชิญ สาม', roles: STAFF });
    save(KEYS.invitations, load<{ userId: string; createdBy: string }>(KEYS.invitations)
      .map(i => (i.userId === r3.user.id ? { ...i, createdBy: 'u-ghost' } : i)));
    expect(await errOf(api.acceptInvitation(r3.token, PW))).toEqual(random);
    expect(await api.peekInvitation(r3.token)).toBeNull();
  });

  it('ควบคุม: ผู้เชิญ active ปกติ → รับเชิญได้', async () => {
    const r = await invite();
    expect((await api.acceptInvitation(r.token, PW)).success).toBe(true);
  });
});

// ════════════════════ S-05 ════════════════════
describe('S-05 helper ไม่มี guard ไม่หลุดออก facade', () => {
  it.each(['revokeInvitationsOf', 'purgeAccessRequestNotices', 'accessRequestNoticeKey'])('%s ไม่อยู่ใน @/lib/api', name => {
    expect(name in api).toBe(false);
  });
  it('module internal ยังมีฟังก์ชันจริง (กันเทสต์ผ่านเพราะพิมพ์ชื่อผิด)', async () => {
    const inv = await import('@/lib/api/invitation.internal');
    const noti = await import('@/lib/api/notification.internal');
    expect(typeof inv.revokeInvitationsOf).toBe('function');
    expect(typeof noti.purgeAccessRequestNotices).toBe('function');
  });
});

// ════════════════════ S-06 ════════════════════
describe('S-06 ค่าคืนของ write API ไม่มี password', () => {
  const noPw = (o: object) => expect(Object.keys(o)).not.toContain('password');

  it('createUser → ไม่มี password · store ยังมี hash', async () => {
    const u = await api.createUser(user('uadmin'), { username: 'made1', password: PW, email: `made1@${DOMAIN}`, fullName: 'สร้าง ทดสอบ', roles: STAFF });
    noPw(u);
    expect(raw('made1')!.password).toBeTruthy();
    expect(raw('made1')!.password).not.toBe(PW);
  });

  it('setUserRoles → ไม่มี password และไม่ใช่ reference ของแถวใน store', () => {
    const u = api.setUserRoles(user('uadmin'), raw('staff1')!.id, STAFF);
    noPw(u);
    expect(raw('staff1')!.password).toBeTruthy();
  });

  it('setUserStatus (ระงับ + เปิดใช้) → ไม่มี password', () => {
    const id = raw('staff1')!.id;
    noPw(api.setUserStatus(user('uadmin'), id, 'suspended'));
    noPw(api.setUserStatus(user('uadmin'), id, 'active'));
    expect(raw('staff1')!.password).toBeTruthy();
  });

  it('approveAccessRequest → ไม่มี password · store ยังมี hash', async () => {
    const id = await request(A);
    noPw(api.approveAccessRequest(user('uadmin'), id, STAFF));
    expect(raw(A.username)!.password).toBeTruthy();
  });

  it('inviteUser / reissueInvitation → user ไม่มี password', async () => {
    const r = await api.inviteUser(user('uadmin'), { username: 'inv1', email: `inv1@${DOMAIN}`, fullName: 'เชิญ ทดสอบ', roles: STAFF });
    noPw(r.user);
    noPw((await api.reissueInvitation(user('uadmin'), r.user.id)).user);
  });
});
