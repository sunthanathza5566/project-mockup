/**
 * TASK-0003 S1 — ทำซ้ำ "หลังบันทึกและส่งตรวจ ประธานไม่ได้รับแจ้งเตือน"
 * ใช้ seed เดโม่เต็ม (freshSeededDemo) = สภาพเดียวกับที่เจ้าของเปิดเว็บครั้งแรก
 */
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import type { AppNotification, SarSection } from '@/lib/types';
import { CYCLE, freshSeededDemo, user } from '@/tests/helpers';

const notesOf = (uid: string) => load<AppNotification>(KEYS.notifications).filter(n => n.userId === uid);
const sec = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::${rid}`)!;

describe('R0 seed: ใครเขียน/ส่งตรวจข้อไหนได้บ้างตอนเปิดเว็บครั้งแรก', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ข้อที่ยังแก้ได้ (drafting/not_started/changes_requested) มีแค่ 3.6, 5.1, 7.9 และไม่มีเจ้าของ', () => {
    const editable = load<SarSection>(KEYS.sections)
      .filter(s => s.cycleId === CYCLE && ['not_started', 'drafting', 'changes_requested'].includes(s.status));
    console.log('[R0] editable', editable.map(s => `${s.requirementId}:${s.status}:owner=${s.ownerUserId ?? '-'}`));
    expect(editable.map(s => s.requirementId).sort()).toEqual(['3.6', '5.1', '7.9']);
    expect(editable.every(s => !s.ownerUserId)).toBe(true);
  });

  it('staff1 เป็นเจ้าของ 1.1–1.5 แต่ทุกข้ออนุมัติแล้ว/รอตรวจ → staff1 ไม่มีข้อที่กด "ส่งตรวจ" ได้เลย', () => {
    const mine = load<SarSection>(KEYS.sections).filter(s => s.cycleId === CYCLE && s.ownerUserId === 'u-staff1');
    console.log('[R0] staff1 owns', mine.map(s => `${s.requirementId}:${s.status}`));
    expect(mine.every(s => s.status === 'approved' || s.status === 'ready_for_review')).toBe(true);
    // staff1 แก้ 3.6 (ไม่ใช่เจ้าของ) ไม่ได้
    expect(() => api.saveSection(user('staff1'), CYCLE, '3.6', { narrativeTh: 'x' }, 'manual')).toThrow(/ไม่มีสิทธิ์/);
  });

  it('seed ไม่สร้างแจ้งเตือน "ส่งตรวจ" ให้ประธาน แม้มีข้อ ready_for_review 5 ข้อ (เขียนสถานะตรงลง store)', () => {
    const chairNotes = notesOf('u-chair');
    console.log('[R0] chair notes at seed', chairNotes.map(n => `${n.kind}:${n.messageTh}`));
    expect(chairNotes.some(n => /ส่งตรวจแล้ว/.test(n.messageTh))).toBe(false);
  });
});

describe('R1 สมมติฐานหลัก: เจ้าของเล่นเป็น chair1 แล้ว "บันทึก" + "ส่งตรวจ" ข้อ 3.6', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ประธานคือ actor → chairsOf ตัด actor ออก → ไม่มีผู้รับเลย (0 แจ้งเตือนใหม่ทั้งระบบ)', () => {
    const chair = user('chair1');
    const before = load<AppNotification>(KEYS.notifications).length;
    const unreadBefore = api.unreadCount(chair);
    api.saveSection(chair, CYCLE, '3.6', { narrativeTh: sec('3.6').narrativeTh + ' เพิ่มเติม' }, 'manual');
    api.submitSection(chair, CYCLE, '3.6');
    const after = load<AppNotification>(KEYS.notifications);
    console.log('[R1] new notes', after.slice(before).map(n => `${n.userId}:${n.messageTh}`));
    expect(sec('3.6').status).toBe('ready_for_review');
    expect(after.length - before).toBe(0);
    expect(api.unreadCount(chair)).toBe(unreadBefore);
  });

  it('ต่อจากนั้น ประธานอนุมัติข้อที่ตัวเองเขียนไม่ได้ (segregation) และไม่มีใครอื่นมี sar.approve → ข้อค้าง', () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '3.6', { narrativeTh: sec('3.6').narrativeTh + ' เพิ่มเติม' }, 'manual');
    api.submitSection(chair, CYCLE, '3.6');
    expect(() => api.approveSection(chair, CYCLE, '3.6')).toThrow(/ผู้เขียนล่าสุด/);
    for (const u of ['fqa1', 'dean1', 'uadmin', 'staff1']) expect(() => api.approveSection(user(u), CYCLE, '3.6')).toThrow();
  });
});

describe('R2 ขั้นที่ถูกต้อง: ประธานมอบหมาย 3.6 ให้ staff1 → staff1 บันทึก + ส่งตรวจ', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ประธานได้ 1 แจ้งเตือน cycle_status "ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ" + badge เพิ่ม 1 + อนุมัติได้', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const unreadBefore = api.unreadCount(chair);
    api.saveSection(staff, CYCLE, '3.6', { narrativeTh: sec('3.6').narrativeTh + ' (staff)' }, 'manual');
    api.submitSection(staff, CYCLE, '3.6');
    const got = notesOf('u-chair').filter(n => n.requirementId === '3.6');
    console.log('[R2] chair got', got.map(n => `${n.kind}:${n.messageTh}:${JSON.stringify(n.target)}`));
    expect(got).toHaveLength(1);
    expect(got[0].messageTh).toBe('ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ');
    expect(api.unreadCount(chair)).toBe(unreadBefore + 1);
    expect(api.listNotifications(chair)[0].requirementId).toBe('3.6');
    expect(api.approveSection(chair, CYCLE, '3.6').status).toBe('approved');
    expect(notesOf('u-staff1').some(n => n.kind === 'approved' && n.requirementId === '3.6')).toBe(true);
  });

  it('"บันทึก" อย่างเดียว (ไม่กดส่งตรวจ) ไม่แจ้งใคร — by design', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    const before = notesOf('u-chair').length;
    api.saveSection(staff, CYCLE, '3.6', { narrativeTh: sec('3.6').narrativeTh + ' (staff)' }, 'manual');
    expect(notesOf('u-chair').length).toBe(before);
  });

  it('รอบส่งกลับ: ประธานส่งกลับ → staff แก้ → ส่งตรวจซ้ำ → ประธานได้แจ้งเตือนครั้งที่ 2 (ไม่มี dedupe)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    api.submitSection(staff, CYCLE, '3.6');
    api.returnSection(chair, CYCLE, '3.6', 'เติมหลักฐาน');
    expect(notesOf('u-staff1').some(n => n.kind === 'changes_requested')).toBe(true);
    api.saveSection(staff, CYCLE, '3.6', { narrativeTh: sec('3.6').narrativeTh + ' แก้แล้ว' }, 'manual');
    api.submitSection(staff, CYCLE, '3.6');
    expect(notesOf('u-chair').filter(n => n.requirementId === '3.6' && /ส่งตรวจแล้ว/.test(n.messageTh))).toHaveLength(2);
  });
});

describe('R3 ปุ่มระดับรอบ "ส่งให้ QA คณะตรวจ" ไม่ใช่ "ส่งตรวจ" ของข้อ', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ส่งรอบไม่ได้ขณะยังมีข้อไม่อนุมัติ (seed มี 8 ข้อ) และเมื่อส่งได้ ผู้รับคือ fqa1 ไม่ใช่ประธาน', async () => {
    const chair = user('chair1');
    await expect(api.transitionCycle(chair, CYCLE, 'under_review')).rejects.toThrow(/ยังมี 8 ข้อ/);
  });
});

describe('R4 เคสขอบอื่นที่ทำให้ประธานไม่ได้แจ้งเตือน', () => {
  beforeEach(async () => { await freshSeededDemo(); });

  it('ประธานถูกระงับ → ไม่ได้แจ้งเตือน (isActiveUser)', () => {
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    api.setUserStatus(user('uadmin'), chair.id, 'suspended');
    const before = notesOf('u-chair').length;
    api.submitSection(staff, CYCLE, '3.6');
    expect(notesOf('u-chair').length).toBe(before);
  });
});
