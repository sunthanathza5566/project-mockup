/**
 * TASK-0002 Q2b — AC-25 (ส่วน backend): แจ้งเตือนทุกจุด notify (ADR-AUTH-001 A6 N1–N14)
 * - ทุกแถวที่สร้างมี `target` ตามตาราง + `messageEn` ไม่ว่าง · `messageTh` เดิมทุกตัวอักษร
 * - ผู้รับที่ไม่ active (invited / pending / suspended) ไม่ได้แจ้งเตือน
 * - Q2c: `notificationHref` ทุก type + แถวเก่า + กัน open redirect · `notificationText` · `relativeTime`/`groupByDay` (lib/ui/notification.ts — ท้ายไฟล์)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load, save } from '@/lib/api/db';
import { getUsers, saveUsers } from '@/lib/api/auth.api';
import { notify } from '@/lib/api/notification.store';
import type { AppNotification, AppUser, AssessmentCycle, NotificationTarget, SarSection } from '@/lib/types';
import { NOTI_KIND_EN, groupByDay, notificationHref, notificationText, relativeTime } from '@/lib/ui/notification';
import { CYCLE, PROG, driveToAssessment, driveToLocked, freshDemo, freshSeededDemo, user } from './helpers';

const PW = 'secret-pass-8';
const DOMAIN = 'sample-uni.example';
const notesOf = (u: AppUser | string) => {
  const id = typeof u === 'string' ? u : u.id;
  return load<AppNotification>(KEYS.notifications).filter(n => n.userId === id);
};
const clear = () => save(KEYS.notifications, []);
const allNotes = () => load<AppNotification>(KEYS.notifications);
const sectionsRaw = () => load<SarSection>(KEYS.sections);
function patchSection(rid: string, patch: Partial<SarSection>) {
  save(KEYS.sections, sectionsRaw().map(s => (s.id === `${CYCLE}::${rid}` ? { ...s, ...patch } : s)));
}
const year = () => load<AssessmentCycle>(KEYS.cycles).find(c => c.id === CYCLE)!.academicYear;
const toCycle = { type: 'cycle', cycleId: CYCLE };
const toAssess = { type: 'assess', cycleId: CYCLE };
const toSec = (rid: string, extra: object = {}) => ({ type: 'section', cycleId: CYCLE, requirementId: rid, ...extra });
/** ทุกแถวแจ้งเตือนใน store มี target + messageEn ไม่ว่าง (AC-25) */
function expectAllRowsTargeted() {
  const rows = allNotes();
  for (const n of rows) {
    expect(n.target, `target หาย: ${n.messageTh}`).toBeTruthy();
    expect(typeof n.target!.type).toBe('string');
    expect((n.messageEn ?? '').trim().length, `messageEn ว่าง: ${n.messageTh}`).toBeGreaterThan(0);
    expect(n.messageTh.trim().length).toBeGreaterThan(0);
  }
  return rows.length;
}
function approveAllDemo() {
  const chair = user('chair1'); const staff = user('staff1');
  for (const s of api.listSections(chair, CYCLE)) {
    if (s.status === 'approved') continue;
    if (s.status === 'drafting' || s.status === 'not_started') {
      api.assignSections(chair, CYCLE, [s.requirementId], staff.id);
      if (s.status === 'not_started') api.saveSection(staff, CYCLE, s.requirementId, { narrativeTh: 'เนื้อหาทดสอบสำหรับส่งตรวจ' }, 'manual');
      api.submitSection(staff, CYCLE, s.requirementId);
    }
    api.approveSection(chair, CYCLE, s.requirementId);
  }
}
async function rateAll(assessor: AppUser) {
  for (const c of api.listCriteria()) api.setCriterionRating(assessor, CYCLE, c.no, 5, 'เหตุผลทดสอบ');
}

afterEach(() => { vi.restoreAllMocks(); });

// ════════════════════ N1–N5, N8: งานรายข้อ ════════════════════
describe('AC-25 N1–N5, N8 แจ้งเตือนรายข้อ', () => {
  beforeEach(async () => { await freshDemo(); clear(); });

  it('N1 assignSections 1 ข้อ → target section · หลายข้อ → my_work · messageTh เดิม', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['1.1'], staff.id);
    let [n] = notesOf(staff);
    expect(n).toMatchObject({
      kind: 'assigned', cycleId: CYCLE, requirementId: '1.1', target: toSec('1.1'),
      messageTh: 'คุณได้รับมอบหมายข้อ 1.1', messageEn: 'You were assigned requirement 1.1',
    });
    clear();
    api.assignSections(chair, CYCLE, ['1.2', '1.3'], staff.id);
    [n] = notesOf(staff);
    expect(n).toMatchObject({
      kind: 'assigned', target: { type: 'my_work' },
      messageTh: 'คุณได้รับมอบหมายข้อ 1.2, 1.3', messageEn: 'You were assigned requirements 1.2, 1.3',
    });
  });

  it('N1 มีกำหนดส่ง → ข้อความ TH/EN ต่อท้ายวันที่', () => {
    const c = load<AssessmentCycle>(KEYS.cycles).find(x => x.id === CYCLE)!;
    const due = c.submissionDue ?? '2099-12-31';
    api.assignSections(user('chair1'), CYCLE, ['2.1'], user('staff1').id, due);
    expect(notesOf('u-staff1')[0]).toMatchObject({
      messageTh: `คุณได้รับมอบหมายข้อ 2.1 กำหนดส่ง ${due}`, messageEn: `You were assigned requirement 2.1 — due ${due}`,
    });
  });

  it('N5 ส่งตรวจ → ประธาน target section · N4 ส่งกลับ → เจ้าของ · N3 อนุมัติ → เจ้าของ', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['1.4'], staff.id);
    api.saveSection(staff, CYCLE, '1.4', { narrativeTh: 'เนื้อหาทดสอบ' }, 'manual');
    clear();
    api.submitSection(staff, CYCLE, '1.4');
    expect(notesOf(chair)).toEqual([expect.objectContaining({
      kind: 'cycle_status', target: toSec('1.4'),
      messageTh: 'ข้อ 1.4 ส่งตรวจแล้ว รอประธานอนุมัติ',
      messageEn: 'Requirement 1.4 was submitted for review — awaiting chair approval',
    })]);
    clear();
    api.returnSection(chair, CYCLE, '1.4', 'เพิ่มหลักฐาน');
    expect(notesOf(staff)).toEqual([expect.objectContaining({
      kind: 'changes_requested', target: toSec('1.4'),
      messageTh: 'ข้อ 1.4 ถูกส่งกลับแก้: เพิ่มหลักฐาน', messageEn: 'Requirement 1.4 was returned for changes: เพิ่มหลักฐาน',
    })]);
    api.submitSection(staff, CYCLE, '1.4');
    clear();
    api.approveSection(chair, CYCLE, '1.4');
    expect(notesOf(staff)).toEqual([expect.objectContaining({
      kind: 'approved', target: toSec('1.4'),
      messageTh: 'ข้อ 1.4 ได้รับการอนุมัติแล้ว', messageEn: 'Requirement 1.4 was approved',
    })]);
    expectAllRowsTargeted();
  });

  it('N8 addComment → เจ้าของข้อ target section + panel comments', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['1.1'], staff.id);
    clear();
    api.addComment(chair, CYCLE, '1.1', 'ช่วยเพิ่มตัวอย่าง');
    expect(notesOf(staff)).toEqual([expect.objectContaining({
      kind: 'comment', target: toSec('1.1', { panel: 'comments' }),
      messageTh: 'มี comment ใหม่ที่ข้อ 1.1', messageEn: 'New comment on requirement 1.1',
    })]);
  });

  it('target เป็นสำเนา (แก้ object ที่ส่งเข้า notify ภายหลังไม่กระทบแถว)', () => {
    const t = { type: 'section' as const, cycleId: CYCLE, requirementId: '1.1' };
    notify({ userId: 'u-staff1', kind: 'assigned', messageTh: 'x', messageEn: 'x', target: t });
    t.requirementId = '9.9';
    expect(notesOf('u-staff1')[0].target).toEqual(toSec('1.1'));
  });
});

// ════════════════════ N2, N6, N7: รอบประเมิน ════════════════════
describe('AC-25 N2, N6a–f, N7 แจ้งเตือนระดับรอบ', () => {
  beforeEach(async () => { await freshSeededDemo(); clear(); });
  const code = () => api.getProgrammes().find(p => p.id === PROG)!.code;

  it('N2 assignAssessor → target assess (ไม่ใช่หน้า cycle)', () => {
    api.assignAssessor(user('fqa1'), CYCLE, 'u-lect2');
    expect(notesOf('u-lect2')).toEqual([expect.objectContaining({
      kind: 'assigned', cycleId: CYCLE, target: toAssess,
      messageTh: `คุณได้รับมอบหมายเป็นกรรมการประเมินรอบ ${year()}`,
      messageEn: `You were appointed as an assessor for the ${year()} assessment cycle`,
    })]);
  });

  it('N6a under_review → fqa1 target cycle · N7 เจ้าของข้อ target cycle ข้อความเดิม', async () => {
    approveAllDemo(); clear();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    const y = year(); const c = code();
    expect(notesOf('u-fqa')).toEqual([expect.objectContaining({
      kind: 'cycle_status', target: toCycle,
      messageEn: `Cycle ${y} (${c}) was submitted for faculty QA review — awaiting your decision`,
    })]);
    expect(notesOf('u-staff1')).toEqual([expect.objectContaining({
      target: toCycle, messageTh: `รอบประเมิน ${y} ส่งให้ QA คณะตรวจ`, messageEn: `Assessment cycle ${y} was sent to faculty QA`,
    })]);
    expectAllRowsTargeted();
  });

  it('N7 revision_requested (changes_requested) และกลับ in_progress → target cycle', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    clear();
    const fqa = user('fqa1');
    await api.transitionCycle(fqa, CYCLE, 'revision_requested', 'แก้ข้อ 1.1');
    const y = year();
    expect(notesOf('u-staff1')).toEqual([expect.objectContaining({
      kind: 'changes_requested', target: toCycle,
      messageTh: `รอบ ${y} ถูกส่งกลับแก้ (โดย ${fqa.fullName}): แก้ข้อ 1.1`,
      messageEn: `Cycle ${y} was returned for revision (by ${fqa.fullName}): แก้ข้อ 1.1`,
    })]);
    expect(notesOf('u-chair')[0]?.target).toEqual(toCycle);
    clear();
    await api.transitionCycle(user('chair1'), CYCLE, 'in_progress');
    expect(notesOf('u-staff1')).toEqual([expect.objectContaining({
      kind: 'cycle_status', target: toCycle,
      messageTh: `รอบประเมิน ${y} เริ่มดำเนินการ`, messageEn: `Assessment cycle ${y} has started`,
    })]);
    expectAllRowsTargeted();
  });

  it('N6b faculty_approved → dean · N6c final_approved → assessor.assign · N7 ข้อความเดิมถึงประธาน', async () => {
    approveAllDemo();
    await api.transitionCycle(user('chair1'), CYCLE, 'under_review');
    clear();
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    const y = year(); const c = code();
    expect(notesOf('u-dean')).toEqual([expect.objectContaining({
      target: toCycle, messageEn: `Faculty QA approved cycle ${y} (${c}) — awaiting the dean's final approval`,
    })]);
    expect(notesOf('u-chair')).toEqual([expect.objectContaining({
      kind: 'approved', target: toCycle, messageTh: `QA คณะอนุมัติรอบ ${y} แล้ว รอคณบดี`, messageEn: `Faculty QA approved cycle ${y} — awaiting the dean`,
    })]);
    expectAllRowsTargeted();
    clear();
    await api.transitionCycle(user('dean1'), CYCLE, 'final_approved');
    for (const id of ['u-uniadm', 'u-fqa']) expect(notesOf(id), id).toEqual([expect.objectContaining({
      target: toCycle,
      messageEn: `Cycle ${y} (${c}) received final approval and is locked — you can start the assessment and appoint assessors`,
    })]);
    expect(notesOf('u-chair')).toEqual([expect.objectContaining({
      target: toCycle, messageTh: `คณบดีอนุมัติสุดท้ายและล็อกรอบ ${y} แล้ว`, messageEn: `The dean gave final approval and locked cycle ${y}`,
    })]);
    expectAllRowsTargeted();
  });

  it('N6e under_assessment → กรรมการ target assess · N6d เจ้าของ/ประธาน target cycle', async () => {
    await driveToLocked(); clear();
    await api.transitionCycle(user('fqa1'), CYCLE, 'under_assessment');
    const y = year(); const c = code();
    expect(notesOf('u-assess')).toEqual([expect.objectContaining({
      target: toAssess, messageEn: `Cycle ${y} (${c}) is open for assessment — start scoring in the assessor workspace`,
    })]);
    for (const id of ['u-chair', 'u-staff1']) expect(notesOf(id), id).toEqual([expect.objectContaining({
      target: toCycle, messageTh: `รอบ ${y} เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว`, messageEn: `Cycle ${y} has entered the assessment stage`,
    })]);
    expectAllRowsTargeted();
  });

  it('N6f assessed → ประธาน/fqa/uadmin target assess', async () => {
    await driveToAssessment();
    const ass = user('assess1');
    await rateAll(ass);
    api.setVerdict(ass, CYCLE, 5, 'เหตุผลประกอบ');
    clear();
    await api.transitionCycle(ass, CYCLE, 'assessed');
    const y = year(); const c = code();
    for (const id of ['u-chair', 'u-fqa', 'u-uniadm']) expect(notesOf(id), id).toEqual([expect.objectContaining({
      kind: 'cycle_status', target: toAssess,
      messageEn: `Assessors submitted results for cycle ${y} (${c}) — see the assessment results page`,
    })]);
    expectAllRowsTargeted();
  });
});

// ════════════════════ N9–N11 ════════════════════
describe('AC-25 N9–N11 action item + deadline', () => {
  beforeEach(async () => { await freshDemo(); clear(); });

  it('N9 createActionItem → target action (actionId) · N10 verified → target action', () => {
    const chair = user('chair1'); const staff = user('staff1');
    const a = api.createActionItem(chair, { programmeId: PROG, requirementId: '3.6', description: 'ปรับปรุง', ownerUserId: staff.id, due: '2570-03-01' });
    expect(notesOf(staff)).toEqual([expect.objectContaining({
      kind: 'assigned', target: { type: 'action', actionId: a.id },
      messageTh: 'คุณได้รับมอบหมาย action item ข้อ 3.6 กำหนดเสร็จ 2570-03-01',
      messageEn: 'You were assigned an action item for requirement 3.6 — due 2570-03-01',
    })]);
    api.setActionStatus(staff, a.id, 'in_progress');
    api.setActionStatus(staff, a.id, 'done');
    clear();
    api.setActionStatus(chair, a.id, 'verified');
    expect(notesOf(staff)).toEqual([expect.objectContaining({
      kind: 'approved', target: { type: 'action', actionId: a.id },
      messageTh: 'action item ข้อ 3.6 ได้รับการยืนยันแล้ว', messageEn: 'The action item for requirement 3.6 was verified',
    })]);
  });

  it('N11 deadline 1 ข้อ → section · หลายข้อ → my_work · overdue', () => {
    const staff = user('staff1');
    const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const soon = day(2); const late = day(-3);
    patchSection('1.1', { ownerUserId: staff.id, due: soon, status: 'drafting' });
    patchSection('2.1', { ownerUserId: staff.id, due: late, status: 'drafting' });
    patchSection('2.2', { ownerUserId: staff.id, due: late, status: 'drafting' });
    api.syncDeadlineNotifications(staff);
    const rows = notesOf(staff).filter(n => n.kind === 'deadline');
    const one = rows.find(n => n.requirementId === '1.1')!;
    expect(one).toMatchObject({
      target: toSec('1.1'),
      messageTh: `ข้อ 1.1 ใกล้ถึงกำหนดส่ง (${soon}) — เหลือไม่เกิน 3 วัน`,
      messageEn: `Requirement 1.1 is due soon (${soon}) — 3 days or less left`,
    });
    const many = rows.find(n => n.messageTh.includes('2.1'))!;
    expect(many).toMatchObject({
      target: { type: 'my_work' },
      messageTh: `ข้อ 2.1, 2.2 เลยกำหนดส่งแล้ว (${late})`,
      messageEn: `Requirements 2.1, 2.2 are past due (${late})`,
    });
    expectAllRowsTargeted();
  });
});

// ════════════════════ N12–N14 onboarding ════════════════════
describe('AC-25 N12–N14 onboarding', () => {
  beforeEach(async () => { await freshSeededDemo(); clear(); });
  const req = (over: object = {}) => ({
    fullName: 'สมมติ ขอใช้', email: `req.one@${DOMAIN}`, username: 'reqone', password: PW,
    reason: 'ช่วยเขียน SAR', consent: true, ...over,
  });

  it('N12 ขอเข้าใช้งาน → ผู้มี user.manage ของ uni (uadmin + sadmin) target admin/requests · uadmin2 ไม่ได้', async () => {
    await api.submitAccessRequest(req());
    for (const id of ['u-uniadm', 'u-super']) expect(notesOf(id), id).toEqual([expect.objectContaining({
      kind: 'access_request', target: { type: 'admin', tab: 'requests' },
      messageTh: 'มีคำขอเข้าใช้งานใหม่จาก สมมติ ขอใช้', messageEn: 'New access request from สมมติ ขอใช้',
    })]);
    expect(notesOf('u-uniadm2')).toEqual([]);
    expect(notesOf('u-chair')).toEqual([]);
  });

  it('N12 ข้ามผู้อนุมัติที่ถูกระงับ', async () => {
    api.setUserStatus(user('sadmin'), 'u-uniadm', 'suspended');
    await api.submitAccessRequest(req());
    expect(notesOf('u-uniadm')).toEqual([]);
    expect(notesOf('u-super')).toHaveLength(1);
  });

  it('N13 อนุมัติ → ผู้ขอ target home', async () => {
    await api.submitAccessRequest(req());
    const pending = getUsers().find(u => u.username === 'reqone')!;
    clear();
    api.approveAccessRequest(user('uadmin'), pending.id, [{ role: 'programme_staff', scopeType: 'programme', scopeId: PROG }]);
    expect(notesOf(pending.id)).toEqual([expect.objectContaining({
      kind: 'account', target: { type: 'home' },
      messageTh: 'บัญชีของคุณได้รับอนุมัติแล้ว เริ่มใช้งานได้เลย',
      messageEn: 'Your account has been approved — you can start using the system',
    })]);
  });

  it('N14 รับเชิญ → ผู้เชิญ target admin/users · ผู้เชิญถูกระงับแล้ว = คำเชิญใช้ไม่ได้ (S-04) และไม่ส่ง', async () => {
    const ua = user('uadmin');
    const roles = [{ role: 'programme_staff' as const, scopeType: 'programme' as const, scopeId: PROG }];
    const r1 = await api.inviteUser(ua, { username: 'newbie1', email: `newbie1@${DOMAIN}`, fullName: 'น้องใหม่ หนึ่ง', roles });
    await api.acceptInvitation(r1.token, PW);
    expect(notesOf(ua)).toEqual([expect.objectContaining({
      kind: 'account', target: { type: 'admin', tab: 'users' },
      messageTh: 'น้องใหม่ หนึ่ง ตั้งรหัสผ่านและเริ่มใช้งานแล้ว', messageEn: 'น้องใหม่ หนึ่ง has set a password and joined',
    })]);
    clear();
    const r2 = await api.inviteUser(ua, { username: 'newbie2', email: `newbie2@${DOMAIN}`, fullName: 'น้องใหม่ สอง', roles });
    api.setUserStatus(user('sadmin'), ua.id, 'suspended');
    await expect(api.acceptInvitation(r2.token, PW)).rejects.toMatchObject({ code: 'invalid', message: api.INVITE_INVALID_MESSAGE });
    expect(notesOf(ua)).toEqual([]);
  });
});

// ════════════════════ ผู้รับที่ไม่ active ════════════════════
describe('AC-25 / AC-28 notify ข้ามผู้รับที่ไม่ active', () => {
  beforeEach(async () => { await freshDemo(); clear(); });

  it('notify() ตรง: suspended / invited / pending → null และไม่มีแถว · active → แถว', () => {
    const base = { kind: 'assigned' as const, messageTh: 'ท', messageEn: 'e', target: { type: 'home' as const } };
    saveUsers(getUsers().map(u => (u.id === 'u-lect1' ? { ...u, status: 'suspended' as const }
      : u.id === 'u-lect2' ? { ...u, status: 'invited' as const }
      : u.id === 'u-data' ? { ...u, status: 'pending' as const } : u)));
    for (const id of ['u-lect1', 'u-lect2', 'u-data', 'u-ghost']) expect(notify({ ...base, userId: id }), id).toBeNull();
    expect(allNotes()).toEqual([]);
    expect(notify({ ...base, userId: 'u-staff1' })).toMatchObject({ userId: 'u-staff1', target: { type: 'home' } });
  });

  it('comment บนข้อที่เจ้าของถูกระงับ → ไม่สร้างแจ้งเตือน · มอบหมายผู้ถูกระงับ = invalid', () => {
    const chair = user('chair1');
    api.assignSections(chair, CYCLE, ['1.1'], 'u-lect1');
    api.setUserStatus(user('uadmin'), 'u-lect1', 'suspended');
    clear();
    api.addComment(chair, CYCLE, '1.1', 'ความเห็น');
    expect(notesOf('u-lect1')).toEqual([]);
    expect(() => api.assignSections(chair, CYCLE, ['1.2'], 'u-lect1')).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(() => api.createActionItem(chair, { programmeId: PROG, requirementId: '3.6', description: 'x', ownerUserId: 'u-lect1' }))
      .toThrowError(expect.objectContaining({ code: 'invalid' }));
  });

  it('syncDeadlineNotifications ของผู้ถูกระงับไม่สร้างแถว', () => {
    const due = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    patchSection('1.1', { ownerUserId: 'u-lect1', due, status: 'drafting' });
    api.setUserStatus(user('uadmin'), 'u-lect1', 'suspended');
    expect(api.syncDeadlineNotifications(user('lect1'))).toBe(0);
    expect(notesOf('u-lect1')).toEqual([]);
  });
});

// ════════════════════ Q2c: lib/ui/notification.ts (friendly-spec §F3) ════════════════════
describe('notificationHref — ปลายทางตาม §F3.3 (ทุก type + แถวเก่า)', () => {
  const href = (target?: NotificationTarget, legacy: { cycleId?: string; requirementId?: string } = {}) =>
    notificationHref({ target, ...legacy });
  const SEC = `/app/sections/${encodeURIComponent(`${CYCLE}::3.6`)}`;

  it('section → หน้าข้อ · panel comments → #comments', () => {
    expect(href(toSec('3.6') as NotificationTarget)).toBe(SEC);
    expect(href(toSec('3.6', { panel: 'comments' }) as NotificationTarget)).toBe(`${SEC}#comments`);
  });
  it('my_work → /app#mywork · cycle → แดชบอร์ดรอบ · assess → หน้าประเมิน · home → /app', () => {
    expect(href({ type: 'my_work' } as NotificationTarget)).toBe('/app#mywork');
    expect(href(toCycle as NotificationTarget)).toBe(`/app/cycles/${CYCLE}`);
    expect(href(toAssess as NotificationTarget)).toBe(`/app/cycles/${CYCLE}/assess`);
    expect(href({ type: 'home' } as NotificationTarget)).toBe('/app');
  });
  it('action → /app/actions#action-{id} (encode)', () => {
    expect(href({ type: 'action', actionId: 'act-1' } as NotificationTarget)).toBe('/app/actions#action-act-1');
    expect(href({ type: 'action', actionId: 'a b/../x' } as NotificationTarget)).toBe(`/app/actions#action-${encodeURIComponent('a b/../x')}`);
  });
  it('admin → tab requests / users · tab ที่ไม่รู้จัก → users', () => {
    expect(href({ type: 'admin', tab: 'requests' } as NotificationTarget)).toBe('/app/admin?tab=requests');
    expect(href({ type: 'admin', tab: 'users' } as NotificationTarget)).toBe('/app/admin?tab=users');
    expect(href({ type: 'admin', tab: 'evil"><script>' } as unknown as NotificationTarget)).toBe('/app/admin?tab=users');
  });
  it('แถวเก่าไม่มี target: cycleId+requirementId → section · cycleId → รอบ · ไม่มีอะไร → /app', () => {
    expect(href(undefined, { cycleId: CYCLE, requirementId: '3.6' })).toBe(SEC);
    expect(href(undefined, { cycleId: CYCLE })).toBe(`/app/cycles/${CYCLE}`);
    expect(href(undefined)).toBe('/app');
  });
  it('กัน open redirect: id ที่มี "//", "https:" ถูก encode อยู่ใต้ /app เสมอ', () => {
    const evil = 'https://evil.example/x';
    const outs = [
      href({ type: 'cycle', cycleId: evil } as NotificationTarget),
      href({ type: 'assess', cycleId: '//evil.example' } as NotificationTarget),
      href({ type: 'section', cycleId: evil, requirementId: '//x' } as NotificationTarget),
      href(undefined, { cycleId: evil }),
    ];
    for (const o of outs) {
      expect(o.startsWith('/app')).toBe(true);
      expect(o.startsWith('//')).toBe(false);
      expect(o).not.toContain('://');
    }
  });
  it('type ที่ไม่รู้จัก (ข้อมูลเสีย) → ตกไปกติกาแถวเก่า ไม่ throw', () => {
    expect(href({ type: 'weird' } as unknown as NotificationTarget, { cycleId: CYCLE })).toBe(`/app/cycles/${CYCLE}`);
    expect(href({ type: 'weird' } as unknown as NotificationTarget)).toBe('/app');
  });
  it('ทุกแถวที่ backend สร้างจริง (เดินจน lock) แปลงเป็น path ภายใน /app ได้', async () => {
    await driveToLocked();
    const rows = allNotes();
    expect(rows.length).toBeGreaterThan(0);
    for (const n of rows) expect(notificationHref(n)).toMatch(/^\/app(\/|#|\?|$)/);
  });
});

describe('notificationText / NOTI_KIND_EN', () => {
  const base = { kind: 'comment' as const, messageTh: 'มีความเห็นใหม่' };
  it('th = messageTh · en = messageEn → NOTI_KIND_EN[kind] → messageTh', () => {
    expect(notificationText({ ...base, messageEn: 'New comment on 1.1' }, 'th')).toBe('มีความเห็นใหม่');
    expect(notificationText({ ...base, messageEn: 'New comment on 1.1' }, 'en')).toBe('New comment on 1.1');
    expect(notificationText({ ...base, messageEn: '' }, 'en')).toBe(NOTI_KIND_EN.comment);
    expect(notificationText({ kind: 'nope' as never, messageTh: 'ไทยล้วน' }, 'en')).toBe('ไทยล้วน');
  });
  it('NOTI_KIND_EN ครบทุก kind และไม่มีอักษรไทย', () => {
    const kinds = ['assigned', 'comment', 'changes_requested', 'approved', 'cycle_status', 'deadline', 'access_request', 'account'];
    expect(Object.keys(NOTI_KIND_EN).sort()).toEqual([...kinds].sort());
    for (const v of Object.values(NOTI_KIND_EN)) expect(v).not.toMatch(/[฀-๿]/);
  });
});

describe('relativeTime / groupByDay (now คงที่ — เวลาท้องถิ่น)', () => {
  const NOW = new Date(2026, 9, 26, 15, 30, 0).getTime(); // 26 ต.ค. 2026 15:30 ท้องถิ่น
  const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m, 0).getTime();

  it('< 1 นาที / < 60 นาที / วันนี้ / เมื่อวาน / เก่ากว่า (th + en)', () => {
    expect(relativeTime(NOW - 30_000, NOW)).toBe('เมื่อสักครู่');
    expect(relativeTime(NOW - 30_000, NOW, 'en')).toBe('Just now');
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe('5 นาทีที่แล้ว');
    expect(relativeTime(NOW - 59 * 60_000, NOW, 'en')).toBe('59 min ago');
    expect(relativeTime(at(26, 9, 5), NOW)).toBe('วันนี้ 09:05');
    expect(relativeTime(at(26, 9, 5), NOW, 'en')).toBe('Today 09:05');
    expect(relativeTime(at(25, 23, 59), NOW)).toBe('เมื่อวาน 23:59');
    expect(relativeTime(at(25, 0, 0), NOW, 'en')).toBe('Yesterday 00:00');
    const old = relativeTime(at(24, 23, 59), NOW);
    expect(old).not.toMatch(/^(วันนี้|เมื่อวาน)/);
    expect(old.length).toBeGreaterThan(0);
    expect(relativeTime(at(24, 23, 59), NOW, 'en')).not.toMatch(/[฀-๿]/);
  });
  it('ขอบเที่ยงคืน: 00:00 วันนี้ = วันนี้ · 1 วินาทีก่อนเที่ยงคืน = เมื่อวาน · อนาคต = เมื่อสักครู่', () => {
    expect(relativeTime(at(26, 0, 0), NOW)).toBe('วันนี้ 00:00');
    expect(relativeTime(at(26, 0, 0) - 1000, NOW)).toBe('เมื่อวาน 23:59');
    expect(relativeTime(NOW + 60_000, NOW)).toBe('เมื่อสักครู่');
  });
  it('groupByDay: ลำดับ วันนี้/เมื่อวาน/ก่อนหน้านี้ · คงลำดับในกลุ่ม · ข้ามกลุ่มว่าง · ป้าย th/en', () => {
    const items = [
      { id: 'a', createdAt: at(26, 15) }, { id: 'b', createdAt: at(25, 10) }, { id: 'c', createdAt: at(26, 1) },
      { id: 'd', createdAt: at(1, 1) }, { id: 'e', createdAt: at(26, 0) - 1 },
    ];
    const g = groupByDay(items, NOW);
    expect(g.map(x => x.key)).toEqual(['today', 'yesterday', 'earlier']);
    expect(g[0].items.map(x => x.id)).toEqual(['a', 'c']);
    expect(g[1].items.map(x => x.id)).toEqual(['b', 'e']);
    expect(g[2].items.map(x => x.id)).toEqual(['d']);
    expect(g.map(x => [x.labelTh, x.labelEn])).toEqual([['วันนี้', 'Today'], ['เมื่อวาน', 'Yesterday'], ['ก่อนหน้านี้', 'Earlier']]);
    expect(groupByDay([{ createdAt: at(1, 1) }], NOW).map(x => x.key)).toEqual(['earlier']);
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
