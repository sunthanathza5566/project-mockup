/**
 * Tutoring Store — เรียนพิเศษเสริมกับคุณครูนอกเวลา
 *
 * ฝั่งครู : ลงทะเบียนเปิดสอน (วิชา · รูปแบบ ออนไลน์/ที่บ้านครู/ที่โรงเรียน · วัน-เวลา · ค่าเรียน · จำนวนที่รับ)
 *           พร้อมแนบ "หลักฐานการลงทะเบียน" (จำลองไว้ก่อน ยังไม่ใช้ verify จริง)
 * ฝั่งนักเรียน: เลือกวิชา → เห็นเฉพาะครูที่เปิดสอนวิชานั้น → เลือกรอบเวลา → จอง
 *           วิชาที่เลือกได้ = เฉพาะวิชาที่นักเรียนเรียนอยู่จริงในปีการศึกษานั้น (ดึงจากตารางเรียนของห้อง)
 *
 * ทุกการกระทำบันทึก log (ใคร · ทำอะไร · เมื่อไร) และส่งแจ้งเตือนถึงอีกฝ่าย
 *
 * TODO(PostgreSQL): tables — tutor_offers, tutor_offer_slots, tutor_bookings
 *   การยืนยันตัวตนครู (verified) ควรผูกกับเอกสารจริงที่ฝ่ายบุคคลอนุมัติ
 */

import { getSession } from './auth.api';
import { logActivity } from './activity.log';
import { pushSharedNotification } from './assignments.store';
import { getScheduleCourses } from './schedule.store';
import { getStudentRoomId } from './class-resolver';
import { readJSON, writeJSON } from './storage-cache';
import type { DayKey } from './schedule.store';
import type { CourseSummary } from './schedule.store';

const OFFERS_KEY   = 'eduflow_tutor_offers';
const BOOKINGS_KEY = 'eduflow_tutor_bookings';

export type TutorMode = 'online' | 'home' | 'school';

export const TUTOR_MODE_LABEL: Record<TutorMode, string> = {
  online: 'เรียนออนไลน์',
  home:   'ที่บ้านคุณครู',
  school: 'ที่โรงเรียน (นอกเวลา)',
};

export interface TutorSlot {
  id: string;
  day: DayKey | 'sat' | 'sun';
  start: string;   // '17:00'
  end: string;     // '18:30'
}

export interface TutorOffer {
  id: string;
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  subjectKey: string;
  subjectName: string;
  subjectCode: string;
  gradeLevels: string;       // ระดับชั้นที่รับสอน เช่น 'ม.1–ม.3'
  mode: TutorMode;
  location: string;          // ลิงก์ห้องเรียนออนไลน์ / ที่อยู่โดยสังเขป
  pricePerHour: number;
  capacity: number;
  slots: TutorSlot[];
  contact: string;
  note: string;
  /** หลักฐานการลงทะเบียนเปิดสอน — จำลองไว้ก่อน (ยังไม่ใช้ verify จริง) */
  documentName: string;
  documentRef: string;
  verified: boolean;
  active: boolean;
  createdAt: number;
  updatedAt?: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   'รอครูยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  cancelled: 'ยกเลิก',
  done:      'เรียนเสร็จสิ้น',
};

export interface TutorBooking {
  id: string;
  refCode: string;           // หลักฐานการจอง — ใช้อ้างอิงกับครู
  offerId: string;
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  subjectName: string;
  subjectCode: string;
  studentCode: string;
  studentName: string;
  studentClass: string;
  slotId: string;
  slotLabel: string;         // เช่น 'เสาร์ 09:00–10:30'
  mode: TutorMode;
  pricePerHour: number;
  note: string;
  status: BookingStatus;
  createdAt: number;
  updatedAt?: number;
  cancelReason?: string;
}

export const TUTOR_DAYS: { key: TutorSlot['day']; th: string }[] = [
  { key: 'mon', th: 'จันทร์' }, { key: 'tue', th: 'อังคาร' }, { key: 'wed', th: 'พุธ' },
  { key: 'thu', th: 'พฤหัสบดี' }, { key: 'fri', th: 'ศุกร์' },
  { key: 'sat', th: 'เสาร์' }, { key: 'sun', th: 'อาทิตย์' },
];

export function tutorDayTH(day: TutorSlot['day']): string {
  return TUTOR_DAYS.find(d => d.key === day)?.th || String(day);
}

export function slotLabel(s: TutorSlot): string {
  return `${tutorDayTH(s.day)} ${s.start}–${s.end}`;
}

// ─── storage ──────────────────────────────────────────────────────────────

// อ่านผ่านแคช — getSlotBookedCount ถูกเรียกทุกรอบเวลาในลูป render จึงต้องไม่ parse ใหม่ทุกครั้ง
const loadOffers   = () => readJSON<TutorOffer[]>(OFFERS_KEY, []);
const saveOffers   = (list: TutorOffer[]) => writeJSON(OFFERS_KEY, list);
const loadBookings = () => readJSON<TutorBooking[]>(BOOKINGS_KEY, []);
const saveBookings = (list: TutorBooking[]) => writeJSON(BOOKINGS_KEY, list);

// ─── ฝั่งครู ──────────────────────────────────────────────────────────────
export function getTeacherOffers(teacherUsername: string): TutorOffer[] {
  return loadOffers().filter(o => o.teacherUsername === teacherUsername).sort((a, b) => b.createdAt - a.createdAt);
}

export type OfferInput = Omit<TutorOffer, 'id' | 'createdAt' | 'updatedAt' | 'verified' | 'documentRef'>;

/** ลงทะเบียนเปิดสอนพิเศษ (สร้างเลขที่หลักฐานให้อัตโนมัติ) */
export function createOffer(input: OfferInput): { ok: true; offer: TutorOffer } | { ok: false; error: string } {
  if (!input.subjectName.trim()) return { ok: false, error: 'กรุณาเลือกวิชาที่ต้องการเปิดสอน' };
  if (input.slots.length === 0)  return { ok: false, error: 'กรุณาเพิ่มรอบเวลาที่สอนอย่างน้อย 1 รอบ' };
  if (input.pricePerHour < 0)    return { ok: false, error: 'ค่าเรียนต้องไม่ติดลบ' };
  if (input.capacity <= 0)       return { ok: false, error: 'จำนวนที่รับต้องมากกว่า 0' };

  const offers = loadOffers();
  const offer: TutorOffer = {
    ...input,
    id: `tof${Date.now()}`,
    documentRef: `TR-${new Date().getFullYear() + 543}-${String(offers.length + 1).padStart(4, '0')}`,
    verified: false,   // TODO: ให้ฝ่ายบุคคลอนุมัติเอกสารจริงก่อนขึ้นเป็น verified
    createdAt: Date.now(),
  };
  offers.unshift(offer);
  saveOffers(offers);
  logActivity('teacher', 'ลงทะเบียนสอนพิเศษ',
    `${offer.subjectName} · ${TUTOR_MODE_LABEL[offer.mode]} · ${offer.slots.length} รอบ · เลขที่ ${offer.documentRef}`);
  return { ok: true, offer };
}

export function updateOffer(id: string, patch: Partial<OfferInput>): boolean {
  const offers = loadOffers();
  const o = offers.find(x => x.id === id);
  const session = getSession();
  if (!o || !session || (o.teacherUsername !== session.username && session.role !== 'web_admin')) return false;
  Object.assign(o, patch, { updatedAt: Date.now() });
  saveOffers(offers);
  logActivity('teacher', 'แก้ไขข้อมูลสอนพิเศษ', `${o.subjectName} · เลขที่ ${o.documentRef}`);
  return true;
}

export function deleteOffer(id: string): boolean {
  const offers = loadOffers();
  const o = offers.find(x => x.id === id);
  const session = getSession();
  if (!o || !session || (o.teacherUsername !== session.username && session.role !== 'web_admin')) return false;
  saveOffers(offers.filter(x => x.id !== id));
  logActivity('teacher', 'ยกเลิกการเปิดสอนพิเศษ', `${o.subjectName} · เลขที่ ${o.documentRef}`);
  return true;
}

// ─── ฝั่งนักเรียน ─────────────────────────────────────────────────────────
/**
 * วิชาที่นักเรียนเลือกจองได้ = วิชาที่อยู่ในตารางเรียนของห้องตัวเองในปีการศึกษาปัจจุบัน
 * (ม.ปลายที่แบ่งสายการเรียน จะเห็นเฉพาะวิชาตามหลักสูตรห้องตัวเอง)
 */
export function getStudentSubjectsForTutoring(studentCode: string): CourseSummary[] {
  const roomId = getStudentRoomId(studentCode);
  if (!roomId) return [];
  return getScheduleCourses(roomId);
}

/** ครูที่เปิดสอนวิชานี้ (เปิดรับอยู่เท่านั้น) */
export function getOffersForSubject(subjectKey: string, subjectName?: string): TutorOffer[] {
  return loadOffers().filter(o =>
    o.active && (o.subjectKey === subjectKey || (subjectName ? o.subjectName === subjectName : false))
  );
}

export function getOffer(id: string): TutorOffer | null {
  return loadOffers().find(o => o.id === id) || null;
}

/** จำนวนที่จองแล้วของรอบนั้น (ใช้เช็คเต็ม) */
export function getSlotBookedCount(offerId: string, slotId: string): number {
  return loadBookings().filter(b => b.offerId === offerId && b.slotId === slotId && b.status !== 'cancelled').length;
}

export function bookTutoring(
  offerId: string, slotId: string,
  student: { code: string; name: string; className: string },
  note = '',
): { ok: true; booking: TutorBooking } | { ok: false; error: string } {
  const offer = getOffer(offerId);
  if (!offer)        return { ok: false, error: 'ไม่พบรายการสอนพิเศษนี้ (อาจถูกปิดไปแล้ว)' };
  if (!offer.active) return { ok: false, error: 'ครูปิดรับการจองรายการนี้ชั่วคราว' };

  const slot = offer.slots.find(s => s.id === slotId);
  if (!slot) return { ok: false, error: 'ไม่พบรอบเวลาที่เลือก' };

  const bookings = loadBookings();
  const dup = bookings.find(b =>
    b.offerId === offerId && b.slotId === slotId && b.studentCode === student.code && b.status !== 'cancelled');
  if (dup) return { ok: false, error: 'ท่านจองรอบนี้ไว้แล้ว (เลขที่ ' + dup.refCode + ')' };

  if (getSlotBookedCount(offerId, slotId) >= offer.capacity)
    return { ok: false, error: 'รอบนี้มีผู้จองเต็มแล้ว กรุณาเลือกรอบอื่น' };

  const booking: TutorBooking = {
    id: `tbk${Date.now()}`,
    refCode: `BK-${new Date().getFullYear() + 543}-${String(bookings.length + 1).padStart(4, '0')}`,
    offerId,
    teacherUsername: offer.teacherUsername,
    teacherId: offer.teacherId,
    teacherName: offer.teacherName,
    subjectName: offer.subjectName,
    subjectCode: offer.subjectCode,
    studentCode: student.code,
    studentName: student.name,
    studentClass: student.className,
    slotId,
    slotLabel: slotLabel(slot),
    mode: offer.mode,
    pricePerHour: offer.pricePerHour,
    note,
    status: 'pending',
    createdAt: Date.now(),
  };
  bookings.unshift(booking);
  saveBookings(bookings);

  logActivity('system', 'จองเรียนพิเศษ',
    `${student.name} (${student.code}) จอง ${offer.subjectName} กับ ${offer.teacherName} · ${booking.slotLabel} · เลขที่ ${booking.refCode}`);
  pushSharedNotification(
    `teacher:${offer.teacherId.toUpperCase()}`, 'info',
    '📘 มีนักเรียนจองเรียนพิเศษ',
    `${student.name} (${student.className}) จองวิชา ${offer.subjectName} รอบ ${booking.slotLabel} — เลขที่ ${booking.refCode}`,
  );
  return { ok: true, booking };
}

export function getStudentBookings(studentCode: string): TutorBooking[] {
  return loadBookings().filter(b => b.studentCode === studentCode).sort((a, b) => b.createdAt - a.createdAt);
}

export function getTeacherBookings(teacherUsername: string): TutorBooking[] {
  return loadBookings().filter(b => b.teacherUsername === teacherUsername).sort((a, b) => b.createdAt - a.createdAt);
}

// ─── ข้อมูลจำลอง (เดโม่) ────────────────────────────────────────────────────
/**
 * จำลองข้อมูลเปิดสอนพิเศษของครูเดโม่ (teacher1 / ครูสมชาย ใจดี) ให้สมจริง:
 *   - เปิดสอน "คณิตศาสตร์" 2 รายการ (นอกเวลาที่โรงเรียน + ติวเข้มออนไลน์วันเสาร์)
 *   - นักเรียนที่จอง = นักเรียน ม.1/1 ที่ครูสอนคณิตศาสตร์อยู่จริง (รหัส 10021–10025)
 *   - สถานะจองหลากหลาย (ยืนยันแล้ว / รอยืนยัน / เรียนเสร็จสิ้น) + แจ้งเตือนถึงทั้งสองฝ่าย
 *
 * idempotent: ถ้าครูคนนี้มีรายการเปิดสอนอยู่แล้วจะไม่ทำซ้ำ
 */
export function seedDemoTutoring(teacherUsername: string, teacherId: string, teacherName: string): boolean {
  if (typeof window === 'undefined') return false;
  const offers = loadOffers();
  if (offers.some(o => o.teacherUsername === teacherUsername)) return false; // มีแล้ว ไม่ทับ

  const day = 86_400_000;
  const now = Date.now();
  const yearBE = new Date().getFullYear() + 543;
  const tUpper = teacherId.toUpperCase();

  const offA: TutorOffer = {
    id: `tof_demo_a_${teacherUsername}`,
    teacherUsername, teacherId, teacherName,
    subjectKey: 'math', subjectName: 'คณิตศาสตร์', subjectCode: 'ค21101',
    gradeLevels: 'ม.1–ม.3', mode: 'school',
    location: 'ห้อง 235 อาคารเรียน 2 (หลังเลิกเรียน)',
    pricePerHour: 150, capacity: 8,
    slots: [
      { id: 'ts_demo_a1', day: 'mon', start: '16:30', end: '18:00' },
      { id: 'ts_demo_a2', day: 'thu', start: '16:30', end: '18:00' },
    ],
    contact: 'LINE: kru.somchai.math',
    note: 'ทบทวนเนื้อหาประจำสัปดาห์ + ตะลุยโจทย์ก่อนสอบเก็บคะแนน',
    documentName: 'หนังสืออนุมัติสอนพิเศษ-สมชาย.pdf',
    documentRef: `TR-${yearBE}-0001`,
    verified: true, active: true,
    createdAt: now - 18 * day,
  };
  const offB: TutorOffer = {
    id: `tof_demo_b_${teacherUsername}`,
    teacherUsername, teacherId, teacherName,
    subjectKey: 'math', subjectName: 'คณิตศาสตร์ (ติวเข้มวันเสาร์)', subjectCode: 'ค21201',
    gradeLevels: 'ม.1–ม.3', mode: 'online',
    location: 'Google Meet: meet.google.com/kru-somchai-math',
    pricePerHour: 120, capacity: 15,
    slots: [{ id: 'ts_demo_b1', day: 'sat', start: '09:00', end: '11:00' }],
    contact: 'LINE: kru.somchai.math',
    note: 'ติวเข้มพิเศษวันเสาร์ เน้นโจทย์แข่งขันและข้อสอบเก่า',
    documentName: 'หนังสืออนุมัติสอนพิเศษ-สมชาย.pdf',
    documentRef: `TR-${yearBE}-0002`,
    verified: false, active: true,
    createdAt: now - 10 * day,
  };
  saveOffers([offB, offA, ...offers]);

  // นักเรียน ม.1/1 ที่ครูสมชายสอนคณิตศาสตร์อยู่จริง
  const CLASS = 'ม.1/1';
  type Seed = { offer: TutorOffer; slotId: string; code: string; name: string; status: BookingStatus; note: string; daysAgo: number };
  const seeds: Seed[] = [
    { offer: offA, slotId: 'ts_demo_a1', code: '10021', name: 'ธนาพร สุขใจ',  status: 'confirmed', note: 'อยากแม่นเรื่องสมการเชิงเส้น', daysAgo: 15 },
    { offer: offA, slotId: 'ts_demo_a1', code: '10023', name: 'มาลี วาดเก่ง', status: 'confirmed', note: '',                              daysAgo: 14 },
    { offer: offA, slotId: 'ts_demo_a1', code: '10024', name: 'อนุชา ดีมาก',  status: 'pending',   note: 'ขอลองเรียนก่อน 1 ครั้ง',       daysAgo: 2 },
    { offer: offA, slotId: 'ts_demo_a2', code: '10022', name: 'สมศักดิ์ มีสุข', status: 'confirmed', note: 'ตามเนื้อหาที่เรียนในคาบไม่ทัน', daysAgo: 12 },
    { offer: offA, slotId: 'ts_demo_a2', code: '10025', name: 'สุภา ใจดี',    status: 'done',      note: '',                              daysAgo: 20 },
    { offer: offB, slotId: 'ts_demo_b1', code: '10021', name: 'ธนาพร สุขใจ',  status: 'confirmed', note: 'ติวเพิ่มวันเสาร์',              daysAgo: 8 },
    { offer: offB, slotId: 'ts_demo_b1', code: '10022', name: 'สมศักดิ์ มีสุข', status: 'pending',   note: '',                              daysAgo: 1 },
  ];

  const bookings = loadBookings();
  seeds.forEach((s, i) => {
    const slot = s.offer.slots.find(x => x.id === s.slotId)!;
    const created = now - s.daysAgo * day;
    bookings.push({
      id: `tbk_demo_${i}_${teacherUsername}`,
      refCode: `BK-${yearBE}-${String(i + 1).padStart(4, '0')}`,
      offerId: s.offer.id,
      teacherUsername, teacherId, teacherName,
      subjectName: s.offer.subjectName, subjectCode: s.offer.subjectCode,
      studentCode: s.code, studentName: s.name, studentClass: CLASS,
      slotId: s.slotId, slotLabel: slotLabel(slot),
      mode: s.offer.mode, pricePerHour: s.offer.pricePerHour,
      note: s.note, status: s.status,
      createdAt: created,
      updatedAt: s.status === 'pending' ? undefined : created + 3600_000,
    });
  });
  saveBookings(bookings);

  // แจ้งเตือน: ครูเห็นคำขอที่ยังรอยืนยัน · นักเรียนเห็นการยืนยันของตัวเอง
  seeds.filter(s => s.status === 'pending').forEach(s =>
    pushSharedNotification(`teacher:${tUpper}`, 'info', '📘 มีนักเรียนจองเรียนพิเศษ',
      `${s.name} (${CLASS}) จองวิชา ${s.offer.subjectName} รอบ ${slotLabel(s.offer.slots.find(x => x.id === s.slotId)!)} — รอท่านยืนยัน`));
  pushSharedNotification('student:10021', 'info', '📘 การจองเรียนพิเศษ: ยืนยันแล้ว',
    `คณิตศาสตร์ · ${slotLabel(offA.slots[0])} กับ ${teacherName} — พร้อมเรียนได้เลย`);

  logActivity('teacher', 'ลงทะเบียนสอนพิเศษ (ข้อมูลจำลอง)',
    `${teacherName} เปิดสอนคณิตศาสตร์ 2 รายการ · มีนักเรียนจอง ${seeds.length} รายการ`);
  return true;
}

/** ครูยืนยัน/ยกเลิก · นักเรียนยกเลิกของตัวเองได้ */
export function updateBookingStatus(id: string, status: BookingStatus, reason = ''): boolean {
  const session = getSession();
  const bookings = loadBookings();
  const b = bookings.find(x => x.id === id);
  if (!b || !session) return false;

  const isOwnerTeacher = b.teacherUsername === session.username;
  const isOwnerStudent = b.studentCode === session.code;
  if (!isOwnerTeacher && !isOwnerStudent && session.role !== 'web_admin') return false;
  if (isOwnerStudent && !isOwnerTeacher && status !== 'cancelled') return false; // นักเรียนทำได้แค่ยกเลิก

  b.status = status;
  b.updatedAt = Date.now();
  if (reason) b.cancelReason = reason;
  saveBookings(bookings);

  logActivity('system', `อัปเดตการจองเรียนพิเศษ (${BOOKING_STATUS_LABEL[status]})`,
    `${b.subjectName} · ${b.studentName} กับ ${b.teacherName} · เลขที่ ${b.refCode}${reason ? ` · เหตุผล: ${reason}` : ''}`);

  const target = isOwnerTeacher ? `student:${b.studentCode}` : `teacher:${b.teacherId.toUpperCase()}`;
  pushSharedNotification(
    target, 'info',
    `📘 การจองเรียนพิเศษ: ${BOOKING_STATUS_LABEL[status]}`,
    `${b.subjectName} · ${b.slotLabel} · เลขที่ ${b.refCode}${reason ? ` (${reason})` : ''}`,
  );
  return true;
}
