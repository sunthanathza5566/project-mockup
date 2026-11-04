/**
 * TASK-0003 F3 — การส่งตรวจรายข้อบอกได้ว่ามีผู้รับแจ้งเตือนกี่คน (ย้ายจาก .agents/playtest/TASK-0003/chair-notify.repro.test.ts)
 * - submitSectionWithNotice(actor, cycleId, requirementId) → { section, notifiedCount, selfReview }
 * - previewSubmitRecipients(cycleId, requirementId, actor) → จำนวนประธานที่จะได้แจ้งเตือน (ไม่รวม actor)
 * - submitSection / transitionSection เดิมยังคืน SarSection (เทสต์เดิมใช้ .status)
 * ข้อมูลทดสอบเป็นข้อมูลสมมติ (seed เดโม่)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import { DEMO_UNIVERSITY } from '@/lib/mock-data/aunqa/org';
import type { AppNotification, SarSection } from '@/lib/types';
import { CYCLE, PROG, freshSeededDemo, user } from './helpers';

const notesOf = (uid: string) => load<AppNotification>(KEYS.notifications).filter(n => n.userId === uid);
const allNotes = () => load<AppNotification>(KEYS.notifications);
const sec = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::${rid}`)!;
const append = (rid: string, actorName: string, extra: string) =>
  api.saveSection(user(actorName), CYCLE, rid, { narrativeTh: sec(rid).narrativeTh + extra }, 'manual');

async function addSecondChair() {
  await api.createUser(user('uadmin'), {
    username: 'chair2', password: 'secret-pass-8', email: `chair2@${DEMO_UNIVERSITY.emailDomain}`,
    fullName: 'ประธานสำรอง สมมติ', roles: [{ role: 'programme_chair', scopeType: 'programme', scopeId: PROG }],
  });
  return user('chair2');
}

beforeEach(async () => { await freshSeededDemo(); });

describe('F3 staff ส่งตรวจ → ประธานได้แจ้งเตือน', () => {
  it('notifiedCount 1 · selfReview false · ประธานได้ 1 แถว + deep link ไปที่ข้อ · อนุมัติได้', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const unreadBefore = api.unreadCount(chair);
    expect(api.previewSubmitRecipients(CYCLE, '3.6', staff)).toBe(1);
    append('3.6', 'staff1', ' (staff)');
    const r = api.submitSectionWithNotice(staff, CYCLE, '3.6');
    expect(r.section.status).toBe('ready_for_review');
    expect(r.notifiedCount).toBe(1);
    expect(r.selfReview).toBe(false);

    const got = notesOf('u-chair').filter(n => n.requirementId === '3.6');
    expect(got).toHaveLength(1);
    expect(got[0].messageTh).toBe('ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ');
    expect(got[0].target).toEqual({ type: 'section', cycleId: CYCLE, requirementId: '3.6' });
    expect(api.unreadCount(chair)).toBe(unreadBefore + 1);
    expect(api.approveSection(chair, CYCLE, '3.6').status).toBe('approved');
    expect(notesOf('u-staff1').some(n => n.kind === 'approved' && n.requirementId === '3.6')).toBe(true);
  });

  it('section ที่คืนเป็นข้อมูลเดียวกับ store (status/updatedBy ตรงกัน)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const r = api.submitSectionWithNotice(staff, CYCLE, '3.6');
    expect(r.section.status).toBe(sec('3.6').status);
    expect(r.section.updatedBy).toBe(staff.id);
  });
});

describe('F3 ประธานส่งตรวจเอง (บั๊กที่เจ้าของเจอ)', () => {
  it('notifiedCount 0 · selfReview true · ไม่มีแจ้งเตือนใหม่ทั้งระบบ · preview = 0', () => {
    const chair = user('chair1');
    expect(api.previewSubmitRecipients(CYCLE, '3.6', chair)).toBe(0);
    append('3.6', 'chair1', ' เพิ่มเติม');
    const before = allNotes().length;
    const r = api.submitSectionWithNotice(chair, CYCLE, '3.6');
    expect(r.section.status).toBe('ready_for_review');
    expect(r.notifiedCount).toBe(0);
    expect(r.selfReview).toBe(true);
    expect(allNotes().length).toBe(before);
  });

  it('ต่อจากนั้นประธานอนุมัติข้อที่ตัวเองเขียนไม่ได้ (segregation) และ role อื่นอนุมัติไม่ได้', () => {
    const chair = user('chair1');
    append('3.6', 'chair1', ' เพิ่มเติม');
    api.submitSectionWithNotice(chair, CYCLE, '3.6');
    expect(() => api.approveSection(chair, CYCLE, '3.6')).toThrow(/ผู้เขียนล่าสุด/);
    for (const u of ['fqa1', 'dean1', 'uadmin', 'staff1']) expect(() => api.approveSection(user(u), CYCLE, '3.6')).toThrow();
  });

  it('มีประธานคนที่สอง → notifiedCount 1 (ประธานคนที่สองได้) · ผู้ส่งไม่ได้แจ้งตัวเอง · preview = 1', async () => {
    const chair = user('chair1');
    const chair2 = await addSecondChair();
    expect(api.previewSubmitRecipients(CYCLE, '3.6', chair)).toBe(1);
    const r = api.submitSectionWithNotice(chair, CYCLE, '3.6');
    expect(r.notifiedCount).toBe(1);
    expect(r.selfReview).toBe(true);
    expect(notesOf(chair2.id).filter(n => n.requirementId === '3.6')).toHaveLength(1);
    expect(notesOf('u-chair').filter(n => n.requirementId === '3.6')).toHaveLength(0);
  });

  it('staff ส่งเมื่อมีประธาน 2 คน → notifiedCount 2', async () => {
    const chair = user('chair1'); const staff = user('staff1');
    await addSecondChair();
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    expect(api.previewSubmitRecipients(CYCLE, '3.6', staff)).toBe(2);
    expect(api.submitSectionWithNotice(staff, CYCLE, '3.6').notifiedCount).toBe(2);
  });
});

describe('F3 กรณีอื่น', () => {
  it('"บันทึก" อย่างเดียว (ไม่กดส่งตรวจ) ไม่แจ้งใคร — by design', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const before = allNotes().length;
    append('3.6', 'staff1', ' (staff)');
    expect(allNotes().length).toBe(before);
  });

  it('รอบส่งกลับ: ส่งกลับ → แก้ → ส่งตรวจซ้ำ → notifiedCount 1 ทั้งสองครั้ง (ไม่มี dedupe)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    expect(api.submitSectionWithNotice(staff, CYCLE, '3.6').notifiedCount).toBe(1);
    api.returnSection(chair, CYCLE, '3.6', 'เติมหลักฐาน');
    expect(notesOf('u-staff1').some(n => n.kind === 'changes_requested')).toBe(true);
    append('3.6', 'staff1', ' แก้แล้ว');
    expect(api.submitSectionWithNotice(staff, CYCLE, '3.6').notifiedCount).toBe(1);
    expect(notesOf('u-chair').filter(n => n.requirementId === '3.6' && /ส่งตรวจแล้ว/.test(n.messageTh))).toHaveLength(2);
  });

  it('ประธานถูกระงับ → notifiedCount 0 และ preview = 0 (นับเฉพาะบัญชี active)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    api.setUserStatus(user('uadmin'), chair.id, 'suspended');
    expect(api.previewSubmitRecipients(CYCLE, '3.6', staff)).toBe(0);
    const before = notesOf('u-chair').length;
    const r = api.submitSectionWithNotice(staff, CYCLE, '3.6');
    expect(r.notifiedCount).toBe(0);
    expect(r.selfReview).toBe(false);
    expect(notesOf('u-chair').length).toBe(before);
  });

  it('submitSection / transitionSection เดิมยังคืน SarSection (ไม่เปลี่ยน API)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const s = api.submitSection(staff, CYCLE, '3.6');
    expect(s.status).toBe('ready_for_review');
    expect('notifiedCount' in s).toBe(false);
    const t = api.transitionSection(chair, `${CYCLE}::3.6`, 'changes_requested', 'แก้');
    expect(t.status).toBe('changes_requested');
    expect('notified' in t).toBe(false);
  });

  it('guard เหมือน submitSection: staff ที่ไม่ใช่เจ้าของส่งไม่ได้ และไม่มีแจ้งเตือนเกิด', () => {
    const before = allNotes().length;
    // 5.1 ไม่มีเจ้าของใน seed มาตรฐาน (3.6 มอบให้ staff1 แล้วตั้งแต่ F4 ของ TASK-0003)
    expect(() => api.submitSectionWithNotice(user('staff1'), CYCLE, '5.1')).toThrow(/ไม่มีสิทธิ์/);
    expect(sec('5.1').status).not.toBe('ready_for_review');
    expect(allNotes().length).toBe(before);
  });

  it('previewSubmitRecipients: ข้อที่ไม่มี → not_found · ผู้ใช้ต่าง tenant → forbidden', () => {
    expect(() => api.previewSubmitRecipients(CYCLE, '99.9', user('chair1'))).toThrow(/ไม่พบ/);
    const outsider = { ...user('chair1'), id: 'u-x', universityId: 'uni-other' };
    try { api.previewSubmitRecipients(CYCLE, '3.6', outsider); throw new Error('should throw'); }
    catch (e: any) { expect(['forbidden', 'unauthorized', 'inactive']).toContain(e?.code); }
  });

  it('helper ภายใน (transitionSectionCounted / submitRecipientsOf) ไม่หลุดออก facade', () => {
    expect('transitionSectionCounted' in api).toBe(false);
    expect('submitRecipientsOf' in api).toBe(false);
    expect('submitSectionCore' in api).toBe(false);
    expect(typeof api.submitSectionWithNotice).toBe('function');
    expect(typeof api.previewSubmitRecipients).toBe('function');
  });
});
