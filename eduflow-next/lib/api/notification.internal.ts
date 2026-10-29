/**
 * internal — ไม่ export ผ่าน facade `@/lib/api` (ลบแจ้งเตือนของผู้ใช้หลายคนโดยไม่ตรวจสิทธิ์: backend-dev RULE 1)
 * ผู้เรียกต้องตรวจสิทธิ์ก่อนเสมอ: rejectAccessRequest (onboarding.store), deleteUser (auth.api)
 */
import type { AppNotification } from '../types';
import { KEYS, load, save } from './db';

/** dedupeKey ของแจ้งเตือน N12 (คำขอเข้าใช้งานใหม่) — ผูกกับผู้ขอ 1 คน ใช้ลบทุกผู้รับเมื่อคำขอถูกปฏิเสธ/ลบ */
export const accessRequestNoticeKey = (requesterId: string): string => `access_request:${requesterId}`;

/**
 * Security S-01 (PDPA ม.22/23(3), ประกาศ "ถูกปฏิเสธ = ลบทันที"): ลบแจ้งเตือน N12 ที่มีชื่อผู้ขอ ออกจากผู้รับทุกคน
 * - แถวใหม่: จับด้วย dedupeKey `access_request:<id>`
 * - แถวเก่า (สร้างก่อนมี dedupeKey): จับด้วย kind + ข้อความ TH ที่ตรงชื่อผู้ขอทุกตัวอักษร
 *   (ข้อจำกัด: ถ้ามีคำขอค้างอีกคนชื่อซ้ำกันพอดี แจ้งเตือนเก่าของคนนั้นหายด้วย — กระทบแค่การแจ้งเตือน ข้อมูลคำขอยังอยู่)
 * คืนจำนวนแถวที่ลบ
 */
export function purgeAccessRequestNotices(requesterId: string, fullName: string): number {
  const key = accessRequestNoticeKey(requesterId);
  const legacyTh = `มีคำขอเข้าใช้งานใหม่จาก ${fullName}`;
  const rows = load<AppNotification>(KEYS.notifications);
  const keep = rows.filter(n => !(
    n.dedupeKey === key || (!n.dedupeKey && n.kind === 'access_request' && n.messageTh === legacyTh)
  ));
  const removed = rows.length - keep.length;
  if (removed) save(KEYS.notifications, keep);
  return removed;
}

/**
 * R2-B4 (BUG-0002-P7): คำขอถูกอนุมัติแล้ว → แจ้งเตือน N12 ของผู้ดูแลทุกคนเป็น "อ่านแล้ว" (คงแถวไว้เป็นประวัติ ต่างจาก reject ที่ลบ)
 * จับเฉพาะแถวที่มี dedupeKey · ผู้เรียกต้องตรวจสิทธิ์ก่อน (approveAccessRequest) · คืนจำนวนแถวที่เปลี่ยน
 */
export function markAccessRequestNoticesRead(requesterId: string, now = Date.now()): number {
  const key = accessRequestNoticeKey(requesterId);
  const rows = load<AppNotification>(KEYS.notifications);
  let changed = 0;
  rows.forEach(n => { if (n.dedupeKey === key && !n.readAt) { n.readAt = now; changed++; } });
  if (changed) save(KEYS.notifications, rows);
  return changed;
}
