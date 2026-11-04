/**
 * TASK-0003 F4 — ส่วนเสริม "seed มาตรฐาน" แบบน้อยที่สุด (ข้อมูลสมมติทั้งหมด)
 *
 * ปัญหาเดิม (research TASK-0003-roles หัวข้อ 4–5):
 *   (1) ข้อที่ยังเขียน/ส่งตรวจได้ (3.6, 5.1, 7.9) ไม่มีเจ้าของ → ผู้ทดลองถูกบังคับให้ใช้ chair1 เขียนเอง → ส่งแล้วไม่มีใครได้แจ้งเตือน
 *   (2) ข้อ ready_for_review 5 ข้อถูกเขียนสถานะตรงลง store → กระดิ่งประธานว่าง ไม่ตรงกับงาน "ตรวจ 5 ข้อ"
 * สิ่งที่ทำ:
 *   (1) มอบหมายข้อ 3.6 (drafting มี narrative แล้ว) ให้ staff1 ผ่าน assignSections จริง (staff1 ได้แจ้งเตือน N1 "คุณได้รับมอบหมายข้อ 3.6")
 *   (2) สร้างแจ้งเตือน N3 "ข้อ X ส่งตรวจแล้ว รอประธานอนุมัติ" ให้ประธาน (submitRecipientsOf เดียวกับ workflow) คู่กับทุกข้อที่ seed เป็น ready_for_review
 *       ข้อความ/kind/target เหมือน workflow.transitionSectionCounted ทุกตัวอักษร · ข้ามผู้เขียนล่าสุด (ตรง segregation)
 *       dedupeKey `seed-ready:<cycle>:<req>` → เรียกซ้ำไม่เกิดแถวซ้ำ
 *
 * ข้อห้าม import: ไฟล์นี้ถูกเรียกจาก lib/api/init.ts → ห้าม import facade `lib/api/index` (วงจร init ↔ index)
 *   ใช้โมดูลตรงเท่านั้น · ไม่ export ผ่าน lib/mock-data/aunqa/index.ts (init import index อยู่แล้ว)
 * TODO(PostgreSQL): ย้ายเป็นส่วนหนึ่งของ seed script ฝั่ง server
 */
import type { AppUser, AssessmentCycle, SarSection } from '../../types';
import { assignSections } from '../../api/cycle.store';
import { KEYS, load } from '../../api/db';
import { notify } from '../../api/notification.store';
import { submitRecipientsOf } from '../../api/workflow';

/** ข้อที่ให้ staff1 เป็นเจ้าของใน seed มาตรฐาน (drafting + มี narrative → กด "ส่งตรวจ" ได้ทันที) */
export const STANDARD_PLAY_SECTION = '3.6';
export const STANDARD_PLAY_OWNER_ID = 'u-staff1';

export const seedReadyNoticeKey = (cycleId: string, requirementId: string) => `seed-ready:${cycleId}:${requirementId}`;

/** ใช้แล้วหรือยัง (3.6 มีเจ้าของ = staff1) — ให้ scenario loader ตัดสินว่าต้องเรียกเพิ่มหรือไม่ */
export function standardExtrasApplied(cycleId: string): boolean {
  const s = load<SarSection>(KEYS.sections).find(x => x.id === `${cycleId}::${STANDARD_PLAY_SECTION}`);
  return !!s && s.ownerUserId === STANDARD_PLAY_OWNER_ID;
}

/**
 * เรียกหลังเขียน narrative/สถานะของ seed แล้ว (ต้องเป็นรอบที่ยังเขียนได้: draft/in_progress/revision_requested)
 * idempotent: มอบหมายซ้ำไม่ทำ · แจ้งเตือนกันซ้ำด้วย dedupeKey · คืนจำนวนแจ้งเตือน N3 ที่สร้างใหม่
 */
export function applyStandardSeedExtras(chair: AppUser, cycleId: string): number {
  const sections = load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId);
  const play = sections.find(s => s.requirementId === STANDARD_PLAY_SECTION);
  if (play && play.ownerUserId !== STANDARD_PLAY_OWNER_ID && play.status !== 'approved') {
    assignSections(chair, cycleId, [STANDARD_PLAY_SECTION], STANDARD_PLAY_OWNER_ID);
  }

  const cycle = load<AssessmentCycle>(KEYS.cycles).find(c => c.id === cycleId);
  if (!cycle) return 0;
  // ผู้รับ = submitRecipientsOf ตัวเดียวกับ workflow.transitionSectionCounted / previewSubmitRecipients (review nit #5)
  //   = ประธานหลักสูตร active, uni เดียวกัน − ผู้เขียนล่าสุด (ตรง segregation) → นิยามเดียว ไม่แยกสองที่
  let added = 0;
  for (const s of sections.filter(x => x.status === 'ready_for_review')) {
    for (const u of submitRecipientsOf(cycle, s.lastAuthorId ?? '')) {
      if (notify({
        userId: u.id, kind: 'cycle_status', messageTh: `ข้อ ${s.requirementId} ส่งตรวจแล้ว รอประธานอนุมัติ`,
        messageEn: `Requirement ${s.requirementId} was submitted for review — awaiting chair approval`,
        target: { type: 'section', cycleId, requirementId: s.requirementId },
        cycleId, requirementId: s.requirementId, dedupeKey: seedReadyNoticeKey(cycleId, s.requirementId),
      })) added++;
    }
  }
  return added;
}
