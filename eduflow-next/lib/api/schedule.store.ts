/**
 * Schedule Store — ตารางสอน/ตารางเรียน (แหล่งความจริงเดียวของทั้งระบบ)
 *
 * ลำดับชั้นข้อมูล:  ปีการศึกษา → ระดับชั้น → ห้องเรียน → คาบสอน (วัน × คาบ)
 * ทุกห้องมีตารางของตัวเอง — ครูจัดตาราง, นักเรียนในห้องนั้นเห็นตารางเดียวกัน (อ่านอย่างเดียว)
 *
 * สิทธิ์:
 *   - ดู (viewTeachSchedule): ครู/แอดมิน · นักเรียนดูของห้องตัวเองผ่าน getClassroomSchedule
 *   - จัดการ (manageTeachSchedule): ครูที่ได้รับสิทธิ์ + school_admin + web_admin
 *
 * ทุกการเพิ่ม/แก้/ลบ บันทึก log แยกของตารางสอน (ผู้ทำ + id + วันเวลา + สิ่งที่ทำ)
 * และส่งเข้า activity log กลางด้วย เพื่อให้แอดมินตรวจย้อนหลังได้จากที่เดียว
 *
 * TODO(PostgreSQL): tables — schedule_slots, schedule_logs
 *   UNIQUE (classroom_id, day, period) กันชนกันที่ระดับ DB
 *   INDEX (teacher_username, day, period) สำหรับตรวจครูสอนซ้อนคาบ
 */

import { getSession } from './auth.api';
import { hasPermission } from './permissions';
import { logActivity } from './activity.log';
import { getClassrooms, getGradeLevels, getAllAcademicYears, type GradingMode } from './academic.store';
import { readJSON, writeJSON } from './storage-cache';

const STORE_KEY = 'eduflow_schedule';
const LOG_KEY   = 'eduflow_schedule_log';
const MAX_LOG   = 400;

// ─── Types ────────────────────────────────────────────────────────────────
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export const DAYS: { key: DayKey; th: string; short: string }[] = [
  { key: 'mon', th: 'จันทร์',    short: 'จ'  },
  { key: 'tue', th: 'อังคาร',    short: 'อ'  },
  { key: 'wed', th: 'พุธ',       short: 'พ'  },
  { key: 'thu', th: 'พฤหัสบดี', short: 'พฤ' },
  { key: 'fri', th: 'ศุกร์',     short: 'ศ'  },
];

/** คาบเรียนมาตรฐาน 8 คาบ · พักเที่ยงหลังคาบ 4 */
export const PERIODS: { period: number; time: string }[] = [
  { period: 1, time: '08:30–09:20' },
  { period: 2, time: '09:20–10:10' },
  { period: 3, time: '10:20–11:10' },
  { period: 4, time: '11:10–12:00' },
  { period: 5, time: '13:00–13:50' },
  { period: 6, time: '13:50–14:40' },
  { period: 7, time: '14:50–15:40' },
  { period: 8, time: '15:40–16:30' },
];

export const LUNCH_AFTER_PERIOD = 4;
export const LUNCH_TIME = '12:00–13:00';

/** ตำแหน่ง/เวลาพักเที่ยง — ปรับได้ (default หลังคาบ 4 เวลา 12:00–13:00) แล้วคาบอื่นขยับตาม */
const LUNCH_KEY = 'eduflow_lunch_config';
export interface LunchConfig { afterPeriod: number; time: string }

export function getLunchConfig(): LunchConfig {
  return readJSON<LunchConfig>(LUNCH_KEY, { afterPeriod: LUNCH_AFTER_PERIOD, time: LUNCH_TIME });
}

export function setLunchConfig(cfg: LunchConfig): boolean {
  if (!canManageSchedule()) return false;
  const clamped = { afterPeriod: Math.min(Math.max(cfg.afterPeriod, 1), PERIODS.length - 1), time: cfg.time.trim() || LUNCH_TIME };
  writeJSON(LUNCH_KEY, clamped);
  logActivity('teacher', 'ตั้งเวลาพักเที่ยง', `หลังคาบ ${clamped.afterPeriod} · ${clamped.time}`);
  return true;
}

/** ประเภทรายวิชาตามโครงสร้างหลักสูตร สพฐ. */
export type SubjectType = 'พื้นฐาน' | 'เพิ่มเติม' | 'กิจกรรมพัฒนาผู้เรียน' | 'ชุมนุม/ชมรม';

export const SUBJECT_TYPES: SubjectType[] = ['พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน', 'ชุมนุม/ชมรม'];

/**
 * วิธีตัดสินผลที่เหมาะกับประเภทวิชา — กิจกรรม/ชุมนุมไม่คิดเกรด ใช้ ผ/มผ
 * (ครูปรับเองได้ในฟอร์มจัดตารางสอน ค่านี้เป็นแค่ค่าเริ่มต้นที่แนะนำ)
 */
export function defaultGradingMode(type: SubjectType): GradingMode {
  return type === 'กิจกรรมพัฒนาผู้เรียน' || type === 'ชุมนุม/ชมรม' ? 'symbol' : 'numeric';
}

/** กลุ่มสาระ — ใช้เลือกสีในตาราง และสร้างรหัสวิชาอัตโนมัติ */
export const SUBJECT_KEYS: { key: string; label: string; icon: string }[] = [
  { key: 'thai',     label: 'ภาษาไทย',            icon: '📖' },
  { key: 'math',     label: 'คณิตศาสตร์',         icon: '📐' },
  { key: 'sci',      label: 'วิทยาศาสตร์',        icon: '🔬' },
  { key: 'social',   label: 'สังคมศึกษา',         icon: '🗺️' },
  { key: 'pe',       label: 'สุขศึกษา/พลศึกษา',   icon: '⚽' },
  { key: 'art',      label: 'ศิลปะ',              icon: '🎨' },
  { key: 'music',    label: 'ดนตรี-นาฏศิลป์',     icon: '🎵' },
  { key: 'work',     label: 'การงานอาชีพ',        icon: '🛠️' },
  { key: 'com',      label: 'คอมพิวเตอร์',        icon: '💻' },
  { key: 'eng',      label: 'ภาษาอังกฤษ',         icon: '🌐' },
  { key: 'guidance', label: 'แนะแนว/กิจกรรม',     icon: '🧭' },
];

export interface ScheduleSlot {
  id: string;
  yearId: string;
  gradeLevelId: string;
  classroomId: string;
  day: DayKey;
  period: number;
  subjectCode: string;
  subjectName: string;
  subjectNameEn?: string;    // ชื่อวิชาภาษาอังกฤษ — แสดงเมื่อสลับภาษา (ครูต่างชาติ)
  subjectKey: string;        // กลุ่มสาระ — ใช้กำหนดสีในตาราง
  subjectType: SubjectType;
  gradingMode: GradingMode;  // คิดเกรด 4–0 หรือ ผ/มผ (กิจกรรม/ชุมนุม)
  credit: number;            // หน่วยกิต
  teacherUsername: string;   // เจ้าของคาบ — ใช้ตรวจสิทธิ์/ตรวจสอนซ้อน
  teacherId: string;
  teacherName: string;
  room: string;              // ห้องที่ใช้สอน เช่น 'ห้อง 201'
  startTime?: string;        // เวลาเริ่ม เช่น '08:30' (ครูกรอกเองในแผน)
  endTime?: string;          // เวลาจบ เช่น '09:20'
  date?: string;             // วันที่เริ่มใช้แผน (ว/ด/ป) — optional
  active?: boolean;          // เปิด/ปิดใช้งานรายการในแผน (ปิด = ไม่แสดงในตารางสอน) · undefined = เปิด
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: number;
}

export type ScheduleAction = 'เพิ่มคาบสอน' | 'แก้ไขคาบสอน' | 'ลบคาบสอน' | 'ล้างตารางทั้งห้อง';

export interface ScheduleLogEntry {
  id: string;
  classroomId: string;
  classLabel: string;     // เช่น 'ม.1/1'
  action: ScheduleAction;
  detail: string;
  actorUsername: string;  // id ผู้ทำรายการ
  actorName: string;
  actorRole: string;
  at: number;
  timestamp: string;      // th-TH อ่านง่าย
}

interface ScheduleData { slots: ScheduleSlot[] }

// ─── Storage ──────────────────────────────────────────────────────────────
function isBrowser() { return typeof window !== 'undefined'; }

function load(): ScheduleData {
  return readJSON<ScheduleData>(STORE_KEY, { slots: [] });
}

function save(data: ScheduleData) {
  writeJSON(STORE_KEY, data);
}

// ─── Log ──────────────────────────────────────────────────────────────────
export function getScheduleLog(classroomId?: string): ScheduleLogEntry[] {
  const entries = readJSON<ScheduleLogEntry[]>(LOG_KEY, []);
  return classroomId ? entries.filter(e => e.classroomId === classroomId) : entries;
}

/** ล้าง log ตารางสอน — เฉพาะ web admin (ถ้าระบุห้องจะล้างเฉพาะห้องนั้น ไม่งั้นล้างทั้งหมด) */
export function clearScheduleLog(classroomId?: string): { ok: boolean; error?: string } {
  if (getSession()?.role !== 'web_admin') return { ok: false, error: '🔒 เฉพาะเว็บแอดมินเท่านั้นที่ล้าง log ได้' };
  const remain = classroomId ? getScheduleLog().filter(e => e.classroomId !== classroomId) : [];
  writeJSON(LOG_KEY, remain);
  return { ok: true };
}

function writeLog(classroomId: string, action: ScheduleAction, detail: string) {
  if (!isBrowser()) return;
  const s = getSession();
  const entry: ScheduleLogEntry = {
    id: `slog${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    classroomId,
    classLabel: getClassroomLabel(classroomId),
    action, detail,
    actorUsername: s?.username || 'unknown',
    actorName: s?.name || '—',
    actorRole: s?.role || '—',
    at: Date.now(),
    timestamp: new Date().toLocaleString('th-TH'),
  };
  writeJSON(LOG_KEY, [entry, ...getScheduleLog()].slice(0, MAX_LOG));
  // ส่งเข้า log กลางของแอดมินด้วย เพื่อให้ตรวจย้อนหลังได้จากหน้าเดียว
  logActivity('teacher', action, `${entry.classLabel} · ${detail}`);
}

// ─── ป้ายชื่อห้อง ─────────────────────────────────────────────────────────
/** แปลง classroomId → 'ม.1/1' (ใช้ทั้งใน log และหัวตาราง) */
export function getClassroomLabel(classroomId: string): string {
  for (const y of getAllAcademicYears()) {
    for (const g of getGradeLevels(y.id)) {
      const room = getClassrooms(g.id).find(c => c.id === classroomId);
      if (room) return `${g.name}/${room.room}`;
    }
  }
  return '—';
}

/** ข้อมูลบริบทของห้อง (ปี/ชั้น/ห้อง) สำหรับหัวตารางและการสร้างคาบ */
export function getClassroomContext(classroomId: string): { yearId: string; year: string; gradeLevelId: string; gradeName: string; room: string; label: string } | null {
  for (const y of getAllAcademicYears()) {
    for (const g of getGradeLevels(y.id)) {
      const room = getClassrooms(g.id).find(c => c.id === classroomId);
      if (room) return { yearId: y.id, year: y.year, gradeLevelId: g.id, gradeName: g.name, room: room.room, label: `${g.name}/${room.room}` };
    }
  }
  return null;
}

// ─── สิทธิ์ ───────────────────────────────────────────────────────────────
export function canViewSchedule(): boolean {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'student' || s.role === 'parent') return true; // ดูของตัวเอง/บุตรหลานเท่านั้น
  return hasPermission('viewTeachSchedule');
}

/** สิทธิ์เพิ่ม/แก้/ลบ ตารางสอน — ครูทำได้ทุกอย่างตามที่แอดมินเปิดสิทธิ์ */
export function canManageSchedule(): boolean {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'student' || s.role === 'parent') return false;
  return hasPermission('manageTeachSchedule');
}

// ─── อ่านตาราง ────────────────────────────────────────────────────────────
const isSlotActive = (s: ScheduleSlot) => s.active !== false; // undefined = เปิด (ข้อมูลเก่า)

/** รายการในแผนของห้อง (ทั้งเปิดและปิด) — ใช้ในหน้าแผน */
export function getClassroomPlan(classroomId: string): ScheduleSlot[] {
  const order = DAYS.map(d => d.key);
  return load().slots
    .filter(s => s.classroomId === classroomId)
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.period - b.period);
}

/** ตารางของห้องเรียนหนึ่ง — เฉพาะรายการที่ "เปิดใช้งาน" (ตารางสอนดึงจากตรงนี้) */
export function getClassroomSchedule(classroomId: string): ScheduleSlot[] {
  return getClassroomPlan(classroomId).filter(isSlotActive);
}

/**
 * เปิด/ปิดใช้งานรายการในแผน — ปิดแล้วไม่แสดงในตารางสอน (ข้อมูลยังอยู่)
 * คืน { ok:false } พร้อมเหตุผลถ้าเปิดแล้วจะชนคาบ (มีรายการอื่นเปิดอยู่ในคาบเดียวกัน)
 */
export function setSlotActive(id: string, active: boolean): { ok: boolean; error?: string } {
  if (!canManageSchedule()) return { ok: false, error: '🔒 ไม่มีสิทธิ์' };
  const data = load();
  const slot = data.slots.find(s => s.id === id);
  if (!slot) return { ok: false, error: 'ไม่พบรายการนี้' };

  // เปิดใช้งานคืน ต้องตรวจคาบชนเหมือนตอนเพิ่ม/แก้ (ระหว่างปิดอยู่ อาจมีรายการอื่นมาแทนคาบนี้)
  if (active) {
    const conflict = findConflict({ classroomId: slot.classroomId, day: slot.day, period: slot.period, teacherUsername: slot.teacherUsername }, id);
    if (conflict) return { ok: false, error: `⚠️ ${conflict.message}` };
  }

  slot.active = active;
  save(data);
  const label = `${dayTH(slot.day)} คาบ ${slot.period} · ${slot.subjectName} (${slot.subjectCode})`;
  writeLog(slot.classroomId, 'แก้ไขคาบสอน', `${active ? 'เปิด' : 'ปิด'}ใช้งาน · ${label}`);
  return { ok: true };
}

/**
 * จัดคาบสอนลงตาราง วัน × คาบ — ใช้ได้ทั้งตารางของห้องและตารางของครู
 * ทำ index ครั้งเดียว (O(n)) แทนการไล่ find ทีละช่อง
 */
export function buildWeekGrid(slots: ScheduleSlot[]): Record<DayKey, (ScheduleSlot | null)[]> {
  const index = new Map<string, ScheduleSlot>();
  slots.forEach(s => index.set(`${s.day}:${s.period}`, s));

  const grid = {} as Record<DayKey, (ScheduleSlot | null)[]>;
  DAYS.forEach(d => {
    grid[d.key] = PERIODS.map(p => index.get(`${d.key}:${p.period}`) || null);
  });
  return grid;
}

/** ตารางของห้อง แยกตามวัน — ใช้วาดตารางสัปดาห์ */
export function getWeekGrid(classroomId: string): Record<DayKey, (ScheduleSlot | null)[]> {
  return buildWeekGrid(getClassroomSchedule(classroomId));
}

/** คาบสอนที่ "เปิดใช้งาน" ของครูคนหนึ่ง (ทุกห้อง) — ใช้หน้าตารางสอน/นับคาบ/derive ห้องที่สอน */
export function getTeacherSlots(teacherUsername: string): ScheduleSlot[] {
  const order = DAYS.map(d => d.key);
  return load().slots
    .filter(s => s.teacherUsername === teacherUsername && isSlotActive(s))
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.period - b.period);
}

/** ห้องทั้งหมดที่ครูคนนี้มีคาบสอน */
export function getTeacherClassroomIds(teacherUsername: string): string[] {
  return Array.from(new Set(getTeacherSlots(teacherUsername).map(s => s.classroomId)));
}

/** สรุปรายวิชาในตาราง (ไม่ซ้ำ) — แสดงใต้ตาราง: รหัส/ชื่อ/ครู/ประเภท/จำนวนคาบ */
export interface CourseSummary {
  subjectCode: string;
  subjectName: string;
  subjectNameEn?: string;
  subjectKey: string;
  subjectType: SubjectType;
  gradingMode: GradingMode;
  credit: number;
  teacherName: string;
  teacherUsername: string;
  periodsPerWeek: number;
}

/**
 * ยุบคาบสอนเป็นรายวิชาไม่ซ้ำ พร้อมนับคาบต่อสัปดาห์
 * groupBy: 'teacher' = รายวิชาของห้อง (วิชาเดียวกันคนละครู = คนละรายการ)
 *          'classroom' = รายวิชาของครู (วิชาเดียวกันคนละห้อง = คนละรายการ)
 * เรียง: วิชาพื้นฐานก่อน แล้วตามรหัสวิชา
 */
export function summarizeCourses(slots: ScheduleSlot[], groupBy: 'teacher' | 'classroom' = 'teacher'): CourseSummary[] {
  const map = new Map<string, CourseSummary>();
  slots.forEach(s => {
    const key = `${s.subjectCode}|${groupBy === 'teacher' ? s.teacherUsername : s.classroomId}`;
    const found = map.get(key);
    if (found) { found.periodsPerWeek += 1; return; }
    map.set(key, {
      subjectCode: s.subjectCode, subjectName: s.subjectName, subjectNameEn: s.subjectNameEn, subjectKey: s.subjectKey,
      subjectType: s.subjectType, gradingMode: s.gradingMode || 'numeric', credit: s.credit,
      teacherName: s.teacherName, teacherUsername: s.teacherUsername,
      periodsPerWeek: 1,
    });
  });
  return Array.from(map.values()).sort(
    (a, b) => SUBJECT_TYPES.indexOf(a.subjectType) - SUBJECT_TYPES.indexOf(b.subjectType)
      || a.subjectCode.localeCompare(b.subjectCode)
  );
}

export function getScheduleCourses(classroomId: string): CourseSummary[] {
  return summarizeCourses(getClassroomSchedule(classroomId));
}

// ─── ตรวจการชนกันของคาบ ───────────────────────────────────────────────────
export interface Conflict { type: 'room' | 'teacher'; slot: ScheduleSlot; message: string }

/** ห้ามซ้อน 2 กรณี: ห้องเรียนมีคาบอยู่แล้ว, ครูคนนั้นติดสอนห้องอื่นในคาบเดียวกัน */
export function findConflict(
  input: { classroomId: string; day: DayKey; period: number; teacherUsername: string },
  excludeSlotId?: string,
): Conflict | null {
  // รายการที่ปิดใช้งานไม่นับว่าชน (ยังเก็บไว้ในแผนแต่ไม่ออกตาราง)
  const all = load().slots.filter(s => s.id !== excludeSlotId && isSlotActive(s) && s.day === input.day && s.period === input.period);

  const roomClash = all.find(s => s.classroomId === input.classroomId);
  if (roomClash) return {
    type: 'room', slot: roomClash,
    message: `คาบนี้ของห้อง ${getClassroomLabel(input.classroomId)} มีวิชา "${roomClash.subjectName}" อยู่แล้ว`,
  };

  const teacherClash = all.find(s => s.teacherUsername === input.teacherUsername);
  if (teacherClash) return {
    type: 'teacher', slot: teacherClash,
    message: `ครูท่านนี้ติดสอน "${teacherClash.subjectName}" ห้อง ${getClassroomLabel(teacherClash.classroomId)} ในคาบเดียวกัน`,
  };

  return null;
}

// ─── สร้างรหัสวิชาอัตโนมัติ ───────────────────────────────────────────────
const CODE_PREFIX: Record<string, string> = {
  thai: 'ท', math: 'ค', sci: 'ว', social: 'ส', pe: 'พ',
  art: 'ศ', music: 'ศ', work: 'ง', com: 'ว', eng: 'อ', guidance: 'ก',
};

/** เช่น math + ม.1 + พื้นฐาน → ค21101 · เพิ่มเติม → ค21201 */
export function suggestSubjectCode(subjectKey: string, gradeName: string, subjectType: SubjectType): string {
  const gradeNum = gradeName.replace(/[^0-9]/g, '') || '1';
  const band = subjectType === 'พื้นฐาน' ? '1' : '2';
  return `${CODE_PREFIX[subjectKey] || 'ร'}2${gradeNum}${band}01`;
}

// ─── เพิ่ม / แก้ไข / ลบ ────────────────────────────────────────────────────
export interface SlotInput {
  classroomId: string;
  day: DayKey;
  period: number;
  subjectCode: string;
  subjectName: string;
  subjectNameEn?: string;
  subjectKey: string;
  subjectType: SubjectType;
  gradingMode: GradingMode;
  credit: number;
  teacherUsername: string;
  teacherId: string;
  teacherName: string;
  room: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  active?: boolean;
  note?: string;
}

export type SlotResult = { ok: true; slot: ScheduleSlot } | { ok: false; error: string };

export function addSlot(input: SlotInput): SlotResult {
  if (!canManageSchedule()) return { ok: false, error: '🔒 ไม่มีสิทธิ์จัดตารางสอน — ติดต่อผู้ดูแลระบบเพื่อขอเปิดสิทธิ์' };
  if (!input.subjectName.trim()) return { ok: false, error: 'กรุณากรอกชื่อวิชา' };
  if (!input.teacherName.trim()) return { ok: false, error: 'กรุณาระบุครูผู้สอน' };

  const ctx = getClassroomContext(input.classroomId);
  if (!ctx) return { ok: false, error: 'ไม่พบห้องเรียนนี้ในโครงสร้างวิชาการ' };

  const conflict = findConflict(input);
  if (conflict) return { ok: false, error: `⚠️ ${conflict.message}` };

  const session = getSession();
  const data = load();
  const slot: ScheduleSlot = {
    id: `slot${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    yearId: ctx.yearId,
    gradeLevelId: ctx.gradeLevelId,
    classroomId: input.classroomId,
    day: input.day,
    period: input.period,
    subjectCode: input.subjectCode.trim(),
    subjectName: input.subjectName.trim(),
    subjectNameEn: (input.subjectNameEn || '').trim(),
    subjectKey: input.subjectKey,
    subjectType: input.subjectType,
    gradingMode: input.gradingMode,
    credit: input.credit,
    teacherUsername: input.teacherUsername,
    teacherId: input.teacherId,
    teacherName: input.teacherName.trim(),
    room: input.room.trim(),
    startTime: (input.startTime || '').trim() || periodTime(input.period).split('–')[0],
    endTime: (input.endTime || '').trim() || periodTime(input.period).split('–')[1] || '',
    date: (input.date || '').trim(),
    active: input.active !== false,
    note: (input.note || '').trim(),
    createdBy: session?.username || 'unknown',
    createdByName: session?.name || '—',
    createdAt: Date.now(),
  };
  data.slots.push(slot);
  save(data);

  writeLog(slot.classroomId, 'เพิ่มคาบสอน',
    `${dayTH(slot.day)} คาบ ${slot.period} · ${slot.subjectName} (${slot.subjectCode}) · ครู ${slot.teacherName} · ${slot.room || 'ไม่ระบุห้อง'}`
    + (slot.gradingMode === 'symbol' ? ' · ไม่คิดเกรด (ผ/มผ)' : ''));
  return { ok: true, slot };
}

export function updateSlot(id: string, patch: Partial<SlotInput>): SlotResult {
  if (!canManageSchedule()) return { ok: false, error: '🔒 ไม่มีสิทธิ์แก้ไขตารางสอน' };

  const data = load();
  const slot = data.slots.find(s => s.id === id);
  if (!slot) return { ok: false, error: 'ไม่พบคาบสอนนี้ (อาจถูกลบไปแล้ว)' };

  const next = { ...slot, ...patch };
  const conflict = findConflict(
    { classroomId: next.classroomId, day: next.day, period: next.period, teacherUsername: next.teacherUsername },
    id,
  );
  if (conflict) return { ok: false, error: `⚠️ ${conflict.message}` };

  const before = `${dayTH(slot.day)} คาบ ${slot.period} · ${slot.subjectName} · ครู ${slot.teacherName}`;
  const session = getSession();
  Object.assign(slot, patch, {
    updatedBy: session?.username || 'unknown',
    updatedByName: session?.name || '—',
    updatedAt: Date.now(),
  });
  save(data);

  const after = `${dayTH(slot.day)} คาบ ${slot.period} · ${slot.subjectName} (${slot.subjectCode}) · ครู ${slot.teacherName} · ${slot.room || 'ไม่ระบุห้อง'}`;
  writeLog(slot.classroomId, 'แก้ไขคาบสอน', `จาก [${before}] → [${after}]`);
  return { ok: true, slot };
}

export function deleteSlot(id: string): { ok: boolean; error?: string } {
  if (!canManageSchedule()) return { ok: false, error: '🔒 ไม่มีสิทธิ์ลบคาบสอน' };

  const data = load();
  const slot = data.slots.find(s => s.id === id);
  if (!slot) return { ok: false, error: 'ไม่พบคาบสอนนี้' };

  data.slots = data.slots.filter(s => s.id !== id);
  save(data);
  writeLog(slot.classroomId, 'ลบคาบสอน',
    `${dayTH(slot.day)} คาบ ${slot.period} · ${slot.subjectName} (${slot.subjectCode}) · ครู ${slot.teacherName}`);
  return { ok: true };
}

/** ล้างตารางทั้งห้อง — ใช้ตอนจัดตารางใหม่ต้นภาคเรียน */
export function clearClassroomSchedule(classroomId: string): { ok: boolean; error?: string; removed?: number } {
  if (!canManageSchedule()) return { ok: false, error: '🔒 ไม่มีสิทธิ์ล้างตารางสอน' };
  const data = load();
  const removed = data.slots.filter(s => s.classroomId === classroomId).length;
  if (removed === 0) return { ok: false, error: 'ห้องนี้ยังไม่มีคาบสอนให้ล้าง' };
  data.slots = data.slots.filter(s => s.classroomId !== classroomId);
  save(data);
  writeLog(classroomId, 'ล้างตารางทั้งห้อง', `ลบคาบสอนทั้งหมด ${removed} คาบ`);
  return { ok: true, removed };
}

// ─── helper ───────────────────────────────────────────────────────────────
export function dayTH(day: DayKey): string {
  return DAYS.find(d => d.key === day)?.th || day;
}

export function periodTime(period: number): string {
  return PERIODS.find(p => p.period === period)?.time || '';
}
