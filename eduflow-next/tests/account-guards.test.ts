/**
 * TASK-0002 Q2c — R2-B2 follow-up (ADR-AUTH-001 A3/A5 · security-auth C8 / ASVS 5.0 §7.4.2)
 * (1) C8 active-actor guard: ผู้ถูกระงับที่ UI ยังถือ object เดิม → API เขียนทุกตัว = forbidden · store/audit ไม่เปลี่ยน · เปิดใช้แล้วทำได้
 * (2) admin ที่ถูกระงับ: setUserStatus / inviteUser / approveAccessRequest / setUserRoles = forbidden
 * (3) markRead ของผู้ถูกระงับ = no-op เงียบ (ไม่ throw) · readAt ไม่เปลี่ยน
 * (4) actor ที่ไม่มีแถวใน store → authz เดิม (can()) ตัดสิน
 * (5) setUserRoles: scope ข้าม uni / programme ไม่มีจริง / role code มั่ว = invalid + roles เดิมไม่เปลี่ยน · field แปลกถูกตัด
 * (6) กรรมการที่ถูกระงับไม่ขวาง assessed / preflight / todo start_assessment
 * (7) chairsOf(cycle): ประธาน uni อื่น (scope university ของตัว) ไม่ได้แจ้งเตือนของรอบ uni-demo
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load, save } from '@/lib/api/db';
import { getUsers, saveUsers } from '@/lib/api/auth.api';
import { notify } from '@/lib/api/notification.store';
import type { ActionItem, AppNotification, AppUser, AuditLog, Comment, Evidence, RoleAssignment, SarSection } from '@/lib/types';
import { CYCLE, PROG, addEvidence, driveToAssessment, driveToLocked, freshSeededDemo, user } from './helpers';

const PW = 'secret-pass-8';
const DOMAIN = 'sample-uni.example';
const STAFF: RoleAssignment[] = [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }];

const raw = (username: string) => getUsers().find(u => u.username === username)!;
const audits = () => load<AuditLog>(KEYS.audit);
/** code ของ error (sync หรือ async) — 'ok' เมื่อไม่ throw */
async function code(fn: () => unknown): Promise<string> {
  try { await fn(); return 'ok'; } catch (e: any) { return e?.code ?? String(e); }
}
/** snapshot ของ store ที่ API เขียน (เทียบว่าไม่เปลี่ยน) */
const snap = () => JSON.stringify({
  sections: load<SarSection>(KEYS.sections), comments: load<Comment>(KEYS.comments), evidence: load<Evidence>(KEYS.evidence),
  actions: load<ActionItem>(KEYS.actionItems), users: getUsers(), audit: audits().length,
});
const suspend = (target: string, by = 'uadmin') => api.setUserStatus(user(by), raw(target).id, 'suspended');
const reactivate = (target: string, by = 'uadmin') => api.setUserStatus(user(by), raw(target).id, 'active');

beforeEach(async () => { await freshSeededDemo(); api.logoutUser(); });
afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════ (1) C8 ต่อ API ════════════════════
describe('C8 active-actor guard — object ผู้ใช้เก่าหลังถูกระงับ', () => {
  it('chair1 ถูกระงับ → saveSection / addComment / createEvidence / runSarDrafter / createActionItem = forbidden · store + audit ไม่เปลี่ยน', async () => {
    const held = user('chair1');               // object ที่ UI ถือไว้ก่อนถูกระงับ (status ยังไม่มี = active)
    suspend('chair1');
    expect(held.status).toBeUndefined();       // ยืนยันว่าเป็น object เก่าจริง (guard ต้องอ่านจาก store)
    const before = snap();
    expect(await code(() => api.saveSection(held, CYCLE, '3.6', { narrativeTh: 'แก้หลังถูกระงับ' }, 'manual'))).toBe('forbidden');
    expect(await code(() => api.addComment(held, CYCLE, '3.6', 'ความเห็นหลังถูกระงับ'))).toBe('forbidden');
    expect(await code(() => addEvidence(held))).toBe('forbidden');
    expect(await code(() => api.runSarDrafter(held, CYCLE, '3.6'))).toBe('forbidden');
    expect(await code(() => api.createActionItem(held, { programmeId: PROG, requirementId: '3.6', description: 'แผนหลังถูกระงับ' }))).toBe('forbidden');
    expect(snap()).toBe(before);
  });

  it('เปิดใช้อีกครั้ง → object เดิมเขียนได้ตามสิทธิ์เดิม (guard ไม่ปิดถาวร)', async () => {
    const held = user('chair1');
    suspend('chair1');
    expect(await code(() => api.saveSection(held, CYCLE, '3.6', { narrativeTh: 'x' }, 'manual'))).toBe('forbidden');
    reactivate('chair1');
    const s = api.saveSection(held, CYCLE, '3.6', { narrativeTh: 'เขียนได้หลังเปิดใช้' }, 'manual');
    expect(s.narrativeTh).toBe('เขียนได้หลังเปิดใช้');
    expect(api.addComment(held, CYCLE, '3.6', 'ความเห็นหลังเปิดใช้').body).toBe('ความเห็นหลังเปิดใช้');
    expect(api.createActionItem(held, { programmeId: PROG, requirementId: '3.6', description: 'แผนหลังเปิดใช้' }).description).toBe('แผนหลังเปิดใช้');
  });

  it('isActorActive อ่านจาก store ไม่เชื่อ status ใน object: object บอก active แต่ store suspended = false · กลับกัน = true', () => {
    const held = user('lect1');
    suspend('lect1');
    expect(api.isActorActive({ ...held, status: 'active' })).toBe(false);
    reactivate('lect1');
    expect(api.isActorActive({ ...held, status: 'suspended' })).toBe(true);
    expect(api.isActorActive(null)).toBe(false);
    expect(() => api.requireActiveActor(undefined)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
});

// ════════════════════ (2) admin ที่ถูกระงับ ════════════════════
describe('C8 admin ที่ถูกระงับ', () => {
  it('uadmin ถูก sadmin ระงับ → setUserStatus / inviteUser / approveAccessRequest / setUserRoles = forbidden · ไม่มี audit/ผู้ใช้ใหม่', async () => {
    await api.submitAccessRequest({
      fullName: 'สมมติ ขอใช้', email: `req.guard@${DOMAIN}`, username: 'reqguard', password: PW, reason: 'ทดสอบ', consent: true,
    } as api.AccessRequestInput);
    const pendingId = raw('reqguard').id;
    const held = user('uadmin');
    suspend('uadmin', 'sadmin');
    const before = snap();
    const invBefore = JSON.stringify(load(KEYS.invitations));
    expect(await code(() => api.setUserStatus(held, raw('staff1').id, 'suspended'))).toBe('forbidden');
    expect(await code(() => api.inviteUser(held, { username: 'newbie', email: `newbie@${DOMAIN}`, fullName: 'น้องใหม่ ทดสอบ', roles: STAFF }))).toBe('forbidden');
    expect(await code(() => api.approveAccessRequest(held, pendingId, STAFF))).toBe('forbidden');
    expect(await code(() => api.setUserRoles(held, raw('staff1').id, STAFF))).toBe('forbidden');
    expect(snap()).toBe(before);
    expect(JSON.stringify(load(KEYS.invitations))).toBe(invBefore);
    expect(raw('reqguard').status).toBe('pending');
    // เปิดใช้แล้ว (sadmin) → uadmin อนุมัติคำขอได้
    reactivate('uadmin', 'sadmin');
    expect(api.approveAccessRequest(held, pendingId, STAFF).status).toBe('active');
  });
});

// ════════════════════ (3) markRead ════════════════════
describe('C8 markRead ของผู้ถูกระงับ', () => {
  it('ไม่ throw และ readAt ไม่เปลี่ยน (ทั้งรายตัวและทั้งหมด) · เปิดใช้แล้วอ่านได้', () => {
    const held = user('staff1');
    const n = notify({ userId: held.id, kind: 'comment', messageTh: 'ทดสอบ', messageEn: 'Test', target: { type: 'home' } })!;
    expect(n).toBeTruthy();
    suspend('staff1');
    expect(() => api.markRead(held, n.id)).not.toThrow();
    expect(() => api.markRead(held)).not.toThrow();
    const row = () => load<AppNotification>(KEYS.notifications).find(x => x.id === n.id)!;
    expect(row().readAt).toBeUndefined();
    reactivate('staff1');
    api.markRead(held, n.id);
    expect(typeof row().readAt).toBe('number');
  });
});

// ════════════════════ (4) actor ที่ไม่มีแถวใน store ════════════════════
describe('actor ที่ไม่อยู่ใน store → authz เดิม', () => {
  const ghost = (roles: RoleAssignment[], status?: AppUser['status']): AppUser =>
    ({ id: 'u-ghost', username: 'ghost', password: '', universityId: 'uni-demo', email: 'g@g.g', fullName: 'G', roles, status });

  it('super_admin สมมติ (ไม่มีแถว) resetDemo ผ่าน · ไม่มีบทบาท = forbidden จาก can() · object ระบุ suspended เองและไม่มีแถว = ไม่ active', async () => {
    const sup = ghost([{ role: 'super_admin', scopeType: 'university', scopeId: '*' }]);
    expect(api.isActorActive(sup)).toBe(true);
    await expect(api.resetDemo(sup)).resolves.toBeUndefined();
    await expect(api.resetDemo(ghost([]))).rejects.toMatchObject({ code: 'forbidden' });
    expect(api.isActorActive(ghost([], 'suspended'))).toBe(false);
  });
});

// ════════════════════ (5) setUserRoles scope ════════════════════
describe('setUserRoles — validateRoleScopes + sanitize', () => {
  const bad: Array<[string, RoleAssignment[]]> = [
    ['scope university ข้าม uni', [{ role: 'programme_chair', scopeType: 'university', scopeId: 'uni-demo-2' }]],
    ['programme ไม่มีจริง', [{ role: 'programme_staff', scopeType: 'programme', scopeId: 'prog-nope' }]],
    ['role code มั่ว', [{ role: 'god' as RoleAssignment['role'], scopeType: 'programme', scopeId: PROG }]],
    ['scopeType มั่ว', [{ role: 'programme_staff', scopeType: 'planet' as RoleAssignment['scopeType'], scopeId: PROG }]],
    ['cycle ของ uni อื่น/ไม่มีจริง', [{ role: 'assessor', scopeType: 'cycle', scopeId: 'cycle-nope' }]],
  ];
  for (const [name, roles] of bad) {
    it(`${name} = invalid · roles เดิมไม่เปลี่ยน · ไม่มี audit`, async () => {
      const id = raw('staff1').id;
      const rolesBefore = JSON.stringify(raw('staff1').roles);
      const n = audits().length;
      expect(await code(() => api.setUserRoles(user('uadmin'), id, roles))).toBe('invalid');
      expect(JSON.stringify(raw('staff1').roles)).toBe(rolesBefore);
      expect(audits().length).toBe(n);
    });
  }

  it('scope หลักสูตรใน uni ตัวเอง = ผ่าน · field แปลกใน role ถูกตัดทิ้ง (store + audit after)', () => {
    const id = raw('staff1').id;
    const dirty = [{ role: 'programme_chair', scopeType: 'programme', scopeId: PROG, isAdmin: true, extra: 'x' }] as unknown as RoleAssignment[];
    api.setUserRoles(user('uadmin'), id, dirty);
    expect(raw('staff1').roles).toEqual([{ role: 'programme_chair', scopeType: 'programme', scopeId: PROG }]);
    expect(Object.keys(raw('staff1').roles[0]).sort()).toEqual(['role', 'scopeId', 'scopeType']);
    expect(JSON.stringify(audits().at(-1))).not.toContain('isAdmin');
  });
});

// ════════════════════ (6) กรรมการที่ถูกระงับ ════════════════════
async function addAssessor2(): Promise<AppUser> {
  return api.createUser(user('uadmin'), {
    username: 'assess2', password: PW, email: `assess2@${DOMAIN}`, fullName: 'ผู้ประเมินคนที่สอง ทดสอบ',
    roles: [{ role: 'assessor', scopeType: 'cycle', scopeId: CYCLE }],
  });
}
async function rateAllAndVerdict(a: AppUser) {
  for (const c of api.listCriteria()) api.setCriterionRating(a, CYCLE, c.no, 5, 'เหตุผลทดสอบ');
  api.setVerdict(a, CYCLE, 5, 'ทดสอบ');
}

describe('กรรมการที่ไม่ active ไม่ถูกนับ', () => {
  it('2 กรรมการ: assess1 ครบ + verdict, assess2 ยังไม่ให้ → assessed = invalid · ระงับ assess2 → preflight ไม่มี blocker และ assessed ผ่าน', async () => {
    await driveToAssessment();
    const a2 = await addAssessor2();
    const a1 = user('assess1');
    await rateAllAndVerdict(a1);
    const pre1 = api.getTransitionPreflight(a1, CYCLE, 'assessed');
    expect(pre1.blockers.join(' ')).toContain(a2.fullName);
    await expect(api.transitionCycle(a1, CYCLE, 'assessed')).rejects.toMatchObject({ code: 'invalid' });
    expect(api.getCycle(a1, CYCLE).status).toBe('under_assessment');

    suspend('assess2');
    expect(api.getTransitionPreflight(a1, CYCLE, 'assessed').blockers).toEqual([]);
    expect((await api.transitionCycle(a1, CYCLE, 'assessed')).status).toBe('assessed');
  });

  it('negative: ระงับ assess1 (คนเดียวที่ให้คะแนน) แล้วเหลือ assess2 ที่ยังไม่ให้ → ยังปิดไม่ได้', async () => {
    await driveToAssessment();
    const a2 = await addAssessor2();
    await rateAllAndVerdict(user('assess1'));
    suspend('assess1');
    // ผู้ถูกระงับเรียกเองไม่ได้ (C8) · assess2 ที่ active ยังขาดคะแนน → invalid
    await expect(api.transitionCycle(user('assess1'), CYCLE, 'assessed')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.transitionCycle(a2, CYCLE, 'assessed')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('final_approved: กรรมการคนเดียวถูกระงับ → preflight under_assessment มี warning no_assessor · todo start_assessment detail "ยังไม่ได้มอบหมายกรรมการประเมิน"', async () => {
    await driveToLocked();
    const fqa = user('fqa1');
    const todo = () => api.listMyTodos(fqa).find(t => t.kind === 'start_assessment');
    expect(api.getTransitionPreflight(fqa, CYCLE, 'under_assessment').warnings.map(w => w.code)).not.toContain('no_assessor');
    expect(todo()).toBeTruthy();
    expect(todo()!.detailTh).toBeUndefined();
    suspend('assess1');
    expect(api.getTransitionPreflight(fqa, CYCLE, 'under_assessment').warnings.map(w => w.code)).toContain('no_assessor');
    expect(todo()!.detailTh).toBe('ยังไม่ได้มอบหมายกรรมการประเมิน');
  });
});

// ════════════════════ (7) chairsOf tenant ════════════════════
/** fixture: ใส่ผู้ใช้ตรงลง store (ข้าม validate โดยตั้งใจ — จำลองข้อมูลที่ scope university ของ uni ตัวเอง) */
function injectChair(id: string, universityId: string): AppUser {
  const u: AppUser = {
    id, username: id, password: '', universityId, email: `${id}@x.example`, fullName: `ประธาน ${id}`, status: 'active',
    roles: [{ role: 'programme_chair', scopeType: 'university', scopeId: universityId }],
  };
  saveUsers([...getUsers(), u]);
  return u;
}
const notesOf = (id: string) => load<AppNotification>(KEYS.notifications).filter(n => n.userId === id);

describe('chairsOf(cycle) กรอง tenant', () => {
  it('ส่งตรวจข้อ (ready_for_review): ประธาน uni-demo-2 (scope university ของตัว) ไม่ได้ · ประธาน uni-demo scope university ได้ (control)', async () => {
    const other = injectChair('u-chair-uni2', 'uni-demo-2');
    const same = injectChair('u-chair-unidemo', 'uni-demo');
    save(KEYS.notifications, []);
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    api.saveSection(staff, CYCLE, '3.6', { narrativeTh: 'เนื้อหาทดสอบสำหรับส่งตรวจ' }, 'manual');
    api.submitSection(staff, CYCLE, '3.6');
    expect(notesOf(chair.id).some(n => n.requirementId === '3.6')).toBe(true);
    expect(notesOf(same.id).some(n => n.requirementId === '3.6')).toBe(true);
    expect(notesOf(other.id)).toEqual([]);
  });

  it('assessed: ประธาน uni-demo-2 ไม่ได้แจ้งเตือนผลประเมินของรอบ uni-demo · chair1 ได้', async () => {
    await driveToAssessment();
    const other = injectChair('u-chair-uni2', 'uni-demo-2');
    save(KEYS.notifications, []);
    const a1 = user('assess1');
    await rateAllAndVerdict(a1);
    await api.transitionCycle(a1, CYCLE, 'assessed');
    expect(notesOf(user('chair1').id).some(n => n.target?.type === 'assess')).toBe(true);
    expect(notesOf(other.id)).toEqual([]);
  });
});
