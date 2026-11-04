/**
 * TASK-0003 S6 — เส้นทางประธานเขียนเอง → ไม่ทางตัน (review รอบ 2 probe R1 / R1b) + ข้อมูลตั้งต้นของคำเตือน R2-1
 *
 * R2-1 (คำเตือน "เนื้อหาล่าสุดของข้อนี้เขียนโดยประธานหลักสูตร" testid `submit-stale-author-warning`) เป็น logic ใน
 * component (`SarWorkspace.doSubmit`) ล้วน — ไม่มีฟังก์ชันแยกให้ unit test; ที่นี่ล็อก "ข้อมูลที่เงื่อนไขนั้นอ่าน"
 * (lastAuthorId หลัง save/submit, can(author,'sar.approve',scope)) ส่วนการแสดงผลให้ e2e คลุม
 */
import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load } from '@/lib/api/db';
import { cycleScope } from '@/lib/api/workflow';
import type { AppNotification, AppUser, SarSection } from '@/lib/types';
import { freshSeededDemo, user, CYCLE } from '@/tests/helpers';

const sec = (rid: string) => load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::${rid}`)!;
/** ข้อที่ยังเขียนได้ (ไม่ใช่ 3.6 ที่สงวนให้ staff1) */
const pickWritable = () => load<SarSection>(KEYS.sections)
  .find(s => s.cycleId === CYCLE && s.requirementId !== '3.6' && (s.status === 'drafting' || s.status === 'not_started'))!;
const chairNotes = (chair: AppUser, rid: string) =>
  load<AppNotification>(KEYS.notifications).filter(n => n.userId === chair.id && n.requirementId === rid && n.cycleId === CYCLE).length;

/** เงื่อนไขเดียวกับ SarWorkspace.doSubmit (R2-1): ผู้เขียนล่าสุดไม่ใช่ผู้ส่ง และมีสิทธิ์อนุมัติข้อนี้ */
function staleChairAuthor(submitter: AppUser, rid: string): boolean {
  const s = sec(rid);
  if (!s.lastAuthorId || s.lastAuthorId === submitter.id) return false;
  const author = api.getUserById(s.lastAuthorId);
  const cycle = api.getCycle(submitter, CYCLE);
  return !!author && api.can(author, 'sar.approve', cycleScope(cycle, { ownerUserId: s.ownerUserId }));
}

/** ประธานเขียนเอง → ส่ง → ส่งกลับ → มอบให้อาจารย์ (ขั้น 1–4 ของ R1) */
async function chairWritesThenHandsOver() {
  await freshSeededDemo();
  const chair = user('chair1'); const lect = user('lect1');
  const s0 = pickWritable();
  const rid = s0.requirementId;
  api.assignSections(chair, CYCLE, [rid], chair.id);
  api.saveSection(chair, CYCLE, rid, { narrativeTh: (s0.narrativeTh || '') + ' เขียนโดยประธาน' }, 'manual');
  expect(sec(rid).lastAuthorId).toBe(chair.id);
  return { chair, lect, rid };
}

describe('TASK-0003 R1: เส้นทางเต็ม ประธานเขียนเอง → อาจารย์ส่ง → ประธานอนุมัติได้', () => {
  it('6 ขั้นไม่ทางตัน', async () => {
    const { chair, lect, rid } = await chairWritesThenHandsOver();
    // 1) ประธานส่งเอง: ไม่มีผู้รับ (preview = จริง) + selfReview
    expect(api.previewSubmitRecipients(CYCLE, rid, chair)).toBe(0);
    const r = api.submitSectionWithNotice(chair, CYCLE, rid);
    expect(r).toMatchObject({ notifiedCount: 0, selfReview: true });
    // 2) อนุมัติเองไม่ได้ (segregation)
    expect(() => api.approveSection(chair, CYCLE, rid)).toThrow(/ผู้เขียนล่าสุด/);
    // 3) ทางออก: ส่งกลับ
    expect(api.returnSection(chair, CYCLE, rid, 'ให้อาจารย์เขียนแทน').status).toBe('changes_requested');
    // 4) มอบให้อาจารย์ → แก้ได้
    api.assignSections(chair, CYCLE, [rid], lect.id);
    expect(api.isSectionEditable(sec(rid))).toBe(true);
    // 5) อาจารย์แก้ + ส่ง → ประธานได้แจ้งเตือน 1
    const before = chairNotes(chair, rid);
    api.saveSection(lect, CYCLE, rid, { narrativeTh: sec(rid).narrativeTh + ' (อาจารย์)' }, 'manual');
    expect(sec(rid).lastAuthorId).toBe(lect.id);
    expect(api.previewSubmitRecipients(CYCLE, rid, lect)).toBe(1);
    const r2 = api.submitSectionWithNotice(lect, CYCLE, rid);
    expect(r2).toMatchObject({ notifiedCount: 1, selfReview: false });
    expect(chairNotes(chair, rid)).toBe(before + 1);
    // 6) ประธานอนุมัติได้
    expect(api.approveSection(chair, CYCLE, rid).status).toBe('approved');
  });
});

describe('TASK-0003 R1b / R2-1: อาจารย์ส่งโดยไม่แก้หลังรับมอบ', () => {
  it('R1b: ประธานได้แจ้งเตือนแต่อนุมัติไม่ได้ → กู้ได้ด้วยส่งกลับซ้ำ → อาจารย์แก้แล้วอนุมัติได้', async () => {
    const { chair, lect, rid } = await chairWritesThenHandsOver();
    api.submitSectionWithNotice(chair, CYCLE, rid);
    api.returnSection(chair, CYCLE, rid, 'x');
    api.assignSections(chair, CYCLE, [rid], lect.id);
    const r = api.submitSectionWithNotice(lect, CYCLE, rid); // ไม่แก้
    expect(r).toMatchObject({ notifiedCount: 1, selfReview: false });
    expect(sec(rid).lastAuthorId).toBe(chair.id);
    expect(() => api.approveSection(chair, CYCLE, rid)).toThrow(/ผู้เขียนล่าสุด/);
    expect(sec(rid).status).toBe('ready_for_review'); // approve ล้มไม่เปลี่ยนสถานะ
    expect(api.returnSection(chair, CYCLE, rid, 'กรุณาแก้เนื้อหา').status).toBe('changes_requested');
    api.saveSection(lect, CYCLE, rid, { narrativeTh: sec(rid).narrativeTh + ' แก้แล้ว' }, 'manual');
    api.submitSectionWithNotice(lect, CYCLE, rid);
    expect(api.approveSection(chair, CYCLE, rid).status).toBe('approved');
  });

  it('R2-1 ข้อมูลตั้งต้น: ส่งโดยไม่แก้ = เตือน · save ที่ไม่เปลี่ยนเนื้อหา = ยังเตือน · แก้แล้ว = ไม่เตือน', async () => {
    const { chair, lect, rid } = await chairWritesThenHandsOver();
    api.submitSectionWithNotice(chair, CYCLE, rid);
    api.returnSection(chair, CYCLE, rid, 'x');
    api.assignSections(chair, CYCLE, [rid], lect.id);
    expect(staleChairAuthor(lect, rid)).toBe(true);
    // save ที่ไม่มีอะไรเปลี่ยน (แก้แล้วแก้กลับ) ไม่ตั้ง lastAuthorId → ยังต้องเตือน
    api.saveSection(lect, CYCLE, rid, { narrativeTh: sec(rid).narrativeTh }, 'manual');
    expect(sec(rid).lastAuthorId).toBe(chair.id);
    expect(staleChairAuthor(lect, rid)).toBe(true);
    // แก้จริง → ผู้เขียนล่าสุด = อาจารย์ → ไม่เตือน
    api.saveSection(lect, CYCLE, rid, { narrativeTh: sec(rid).narrativeTh + ' เพิ่ม' }, 'manual');
    expect(staleChairAuthor(lect, rid)).toBe(false);
  });

  it('R2-1 negative: ผู้เขียนล่าสุดเป็นอาจารย์ (ไม่มีสิทธิ์อนุมัติ) → ไม่เตือนเมื่อคนอื่นส่ง', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const lect = user('lect1'); const staff = user('staff1');
    const rid = pickWritable().requirementId;
    api.assignSections(chair, CYCLE, [rid], lect.id);
    api.saveSection(lect, CYCLE, rid, { narrativeTh: sec(rid).narrativeTh + ' อาจารย์' }, 'manual');
    api.assignSections(chair, CYCLE, [rid], staff.id);
    expect(sec(rid).lastAuthorId).toBe(lect.id);
    expect(staleChairAuthor(staff, rid)).toBe(false);
    expect(staleChairAuthor(lect, rid)).toBe(false); // ผู้ส่ง = ผู้เขียนล่าสุด
  });
});
