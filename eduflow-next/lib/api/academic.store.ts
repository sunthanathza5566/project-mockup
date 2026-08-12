// SYNC-CHECK-778899  ← ถ้าเห็นบรรทัดนี้ใน VSCode แปลว่าอ่านไฟล์เดียวกับที่แก้จริง
/**
 * Academic Store — โครงสร้างวิชาการ + บันทึกคะแนน (แบบ ปพ.5)
 *
 * ลำดับชั้นข้อมูล:  ปีการศึกษา → ระดับชั้น → ห้องเรียน → รายวิชา → คะแนน
 *
 * สิทธิ์:
 *   - แอดมิน (web_admin / school_admin): สร้าง ปีการศึกษา, ระดับชั้น, ห้องเรียน
 *   - บันทึกคะแนน: เฉพาะ "ครูประจำวิชา" (เจ้าของรายวิชา) และ super admin (web_admin) เท่านั้น
 *   - รายวิชาไม่ต้องสร้างเอง — ระบบดึงจากตารางสอนของครูโดยอัตโนมัติ (syncTeacherCourses)
 *
 * สัดส่วนคะแนน (ScoreComponent) ยืดหยุ่น: ครูเพิ่ม/แก้หัวข้อได้ เช่น สมรรถนะ, อ่านคิดวิเคราะห์
 * เกรดคำนวณจากเปอร์เซ็นต์ของคะแนนเต็มรวม ตามเกณฑ์ สพฐ. — โปร่งใส ตรวจสอบได้
 *
 * TODO(PostgreSQL): แทนที่ทั้งไฟล์นี้ด้วย API routes (app/api/academic/*)
 *   tables: academic_years, grade_levels, classrooms, courses, score_components, score_records
 *   สิทธิ์ต้องบังคับซ้ำที่ server (RLS) — ตอนนี้บังคับที่ app layer ผ่าน getSession()
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import { getSession } from './auth.api';
import { readJSON, writeJSON } from './storage-cache';
import type { TeacherStudent, ClassInfo } from '../types';

const STORE_KEY = 'eduflow_academic';

// ─── Types ────────────────────────────────────────────────────────────────
export interface AcademicYear {
  id: string;
  year: string;        // เช่น '2567'
  createdBy: string;
  createdAt: number;
  active?: boolean;    // เปิดใช้งานอยู่ไหม — ปิดปีเก่าเพื่อไม่ให้ตัวเลือกล้น (undefined = เปิด สำหรับข้อมูลเก่า)
}

export interface GradeLevel {
  id: string;
  yearId: string;
  name: string;        // เช่น 'ม.1'
}

export interface Classroom {
  id: string;
  yearId: string;
  gradeLevelId: string;
  room: string;        // เช่น '1'
}

/** หัวข้อสัดส่วนคะแนน 1 ช่อง เช่น คะแนนเก็บ (เต็ม 60) */
export interface ScoreComponent {
  id: string;
  name: string;
  max: number;
}

/**
 * วิธีตัดสินผลการเรียนของรายวิชา
 *   numeric = คิดเกรด 4 / 3.5 / ... / 0 (รายวิชาพื้นฐาน-เพิ่มเติม)
 *   symbol  = ไม่คิดเกรด ใช้ผลการประเมิน ผ / มผ (กิจกรรมพัฒนาผู้เรียน, ชุมนุม/ชมรม)
 */
export type GradingMode = 'numeric' | 'symbol';

/**
 * ผลการเรียนแบบสัญลักษณ์ ตามระเบียบการวัดและประเมินผล (กระทรวงศึกษาธิการ)
 *   scope: 'activity' = ใช้กับกิจกรรม/ชุมนุมที่ไม่คิดเกรด · 'subject' = รายวิชาที่คิดเกรด · 'all' = ใช้ได้ทั้งสองแบบ
 * ทุกสัญลักษณ์ไม่ถูกนำไปคิด GPA (ไม่มีค่าน้ำหนักเป็นตัวเลข)
 */
export interface SpecialGrade {
  code: string;
  label: string;
  scope: 'activity' | 'subject' | 'all';
}

export const SPECIAL_GRADES: SpecialGrade[] = [
  { code: 'ผ',  label: 'ผ่านเกณฑ์การประเมิน',                    scope: 'activity' },
  { code: 'มผ', label: 'ไม่ผ่านเกณฑ์การประเมิน',                 scope: 'activity' },
  { code: 'ร',  label: 'รอการตัดสิน / รอการประเมินผล',           scope: 'all' },
  { code: 'มส', label: 'ไม่มีสิทธิ์เข้ารับการวัดผลปลายภาค',      scope: 'subject' },
  { code: 'ขส', label: 'ขาดสอบ',                                  scope: 'all' },
  { code: 'ขร', label: 'ขาดเรียน (เวลาเรียนไม่ครบตามเกณฑ์)',     scope: 'all' },
];

/** สัญลักษณ์ที่เลือกได้ในวิชานั้น ๆ ตามวิธีตัดสินผล */
export function specialGradesFor(mode: GradingMode): SpecialGrade[] {
  return SPECIAL_GRADES.filter(g => g.scope === 'all' || g.scope === (mode === 'symbol' ? 'activity' : 'subject'));
}

export interface Course {
  id: string;
  classroomId: string;
  code: string;
  name: string;
  key: string;                    // subject key สำหรับสี theme เช่น 'math'
  teacherId: string;
  teacherName: string;
  ownerUsername?: string;         // username ครูประจำวิชา — ใช้ตรวจสิทธิ์
  components: ScoreComponent[];   // สัดส่วนคะแนน ตั้งค่าได้
  gradingMode: GradingMode;       // คิดเกรด หรือ ผ/มผ
  createdAt: number;
}

/**
 * คะแนนนักเรียน 1 คนใน 1 วิชา — keyed ตาม ScoreComponent.id
 * symbol: ผลการเรียนแบบสัญลักษณ์ (ผ/มผ/ร/มส/ขส/ขร) — ถ้ามีค่า จะใช้แทนเกรดตัวเลข
 */
export interface ScoreEntry {
  studentCode: string;
  studentName: string;
  scores: Record<string, number | null>;
  symbol?: string | null;
}

interface AcademicData {
  years: AcademicYear[];
  gradeLevels: GradeLevel[];
  classrooms: Classroom[];
  courses: Course[];
  scores: Record<string, ScoreEntry[]>;           // keyed by courseId
  rosters?: Record<string, TeacherStudent[]>;     // นักเรียนที่แอดมินเพิ่มเข้าห้อง keyed by classroomId
}

export const DEFAULT_COMPONENTS: ScoreComponent[] = [
  { id: 'collected', name: 'คะแนนเก็บ',   max: 60 },
  { id: 'midterm',   name: 'สอบกลางภาค', max: 20 },
  { id: 'final',     name: 'สอบปลายภาค', max: 20 },
];

/** หัวข้อสำเร็จรูปที่ครูกดเพิ่มได้ทันที */
export const PRESET_COMPONENTS: Omit<ScoreComponent, 'id'>[] = [
  { name: 'คะแนนสมรรถนะ',          max: 10 },
  { name: 'คะแนนอ่านคิดวิเคราะห์', max: 10 },
];

// ─── Internal ─────────────────────────────────────────────────────────────
function isBrowser() { return typeof window !== 'undefined'; }

const EMPTY: AcademicData = { years: [], gradeLevels: [], classrooms: [], courses: [], scores: {} };

function load(): AcademicData {
  if (!isBrowser()) return EMPTY;
  // readJSON แคชผลตาม "ข้อความดิบ" — ถูกเรียกซ้ำในลูป (หาห้องของนักเรียน) จึงต้องไม่ parse ใหม่ทุกครั้ง
  const data = readJSON<AcademicData | null>(STORE_KEY, null);
  if (data) return migrate(data);
  const seeded = seed();
  save(seeded);
  return seeded;
}

function save(data: AcademicData) {
  if (isBrowser()) writeJSON(STORE_KEY, data);
}

/** แปลงข้อมูลรูปแบบเก่า (maxCollected/collected คงที่ 3 ช่อง) → components/scores แบบยืดหยุ่น */
function migrate(data: AcademicData): AcademicData {
  let changed = false;
  data.courses.forEach((c: Course & { maxCollected?: number; maxMidterm?: number; maxFinal?: number }) => {
    // วิชาที่สร้างก่อนมีระบบผลการเรียนแบบสัญลักษณ์ = คิดเกรดตามปกติ
    if (!c.gradingMode) { c.gradingMode = 'numeric'; changed = true; }
    if (!c.components) {
      c.components = [
        { id: 'collected', name: 'คะแนนเก็บ',   max: c.maxCollected ?? 60 },
        { id: 'midterm',   name: 'สอบกลางภาค', max: c.maxMidterm ?? 20 },
        { id: 'final',     name: 'สอบปลายภาค', max: c.maxFinal ?? 20 },
      ];
      changed = true;
    }
  });
  Object.values(data.scores).forEach(entries => {
    entries.forEach((e: ScoreEntry & { collected?: number | null; midterm?: number | null; final?: number | null }) => {
      if (!e.scores) {
        e.scores = { collected: e.collected ?? null, midterm: e.midterm ?? null, final: e.final ?? null };
        changed = true;
      }
    });
  });
  if (changed) save(data);
  return data;
}

/** ข้อมูลตั้งต้น: ปี 2567 + ระดับชั้น/ห้องที่ตรงกับห้องสอนใน mock เพื่อให้ครูใช้ได้ทันที */
function seed(): AcademicData {
  const year: AcademicYear = { id: 'y2567', year: '2567', createdBy: 'webadmin', createdAt: Date.now(), active: true };
  const gradeLevels: GradeLevel[] = [
    { id: 'g1', yearId: 'y2567', name: 'ม.1' },
    { id: 'g2', yearId: 'y2567', name: 'ม.2' },
    { id: 'g3', yearId: 'y2567', name: 'ม.3' },
  ];
  // ห้องตรงกับ TEACHER_DATA_MOCK.classes: ม.1/1, ม.2/2, ม.3/1
  const classrooms: Classroom[] = [
    { id: 'r1', yearId: 'y2567', gradeLevelId: 'g1', room: '1' },
    { id: 'r2', yearId: 'y2567', gradeLevelId: 'g2', room: '2' },
    { id: 'r3', yearId: 'y2567', gradeLevelId: 'g3', room: '1' },
  ];
  return { years: [year], gradeLevels, classrooms, courses: [], scores: {} };
}

// ─── สิทธิ์การใช้งานคะแนน ─────────────────────────────────────────────────
// TODO(PostgreSQL): บังคับซ้ำด้วย RLS: teacher เขียนได้เฉพาะ course ที่ owner_username = auth.uid()
export function canManageScores(course: Course): boolean {
  const session = getSession();
  if (!session) return false;
  if (session.role === 'web_admin') return true;           // super admin
  if (session.role !== 'teacher') return false;
  // legacy course ที่ยังไม่มี ownerUsername: เทียบด้วยชื่อครูแทน
  return course.ownerUsername ? course.ownerUsername === session.username : course.teacherName === session.name;
}

// ─── Academic Year ───────────────────────────────────────────────────────
const isActive = (y: AcademicYear) => y.active !== false; // undefined = เปิด (ข้อมูลเก่า)

/** ปีที่ "เปิดใช้งาน" เท่านั้น — ใช้ในตัวเลือกของหน้าจัดตาราง/บันทึกคะแนน (ปีที่ปิดถูกซ่อน) */
// TODO(PostgreSQL): SELECT * FROM academic_years WHERE active ORDER BY year DESC
export function getAcademicYears(): AcademicYear[] {
  return [...load().years].filter(isActive).sort((a, b) => b.year.localeCompare(a.year));
}

/** ทุกปี รวมที่ปิดแล้ว — ใช้ในหน้าจัดการ และการ resolve ป้ายห้อง/บริบทของข้อมูลย้อนหลัง */
export function getAllAcademicYears(): AcademicYear[] {
  return [...load().years].sort((a, b) => b.year.localeCompare(a.year));
}

// TODO(PostgreSQL): INSERT INTO academic_years (year, created_by, active) VALUES ($1, $2, true)
export function createAcademicYear(year: string, createdBy: string): AcademicYear | null {
  const data = load();
  if (data.years.some(y => y.year === year)) return null; // ห้ามซ้ำ
  const item: AcademicYear = { id: `y${Date.now()}`, year, createdBy, createdAt: Date.now(), active: true };
  data.years.push(item);
  save(data);
  return item;
}

/** เปิด/ปิดการใช้งานปีการศึกษา — ปิดแล้วซ่อนจากตัวเลือก แต่ข้อมูลยังอยู่ครบ (กดเปิดคืนได้) */
export function setYearActive(yearId: string, active: boolean): boolean {
  const data = load();
  const y = data.years.find(x => x.id === yearId);
  if (!y) return false;
  y.active = active;
  save(data);
  return true;
}

/** จำนวนคาบสอน/รายการคะแนนที่ผูกกับปีนี้ — ใช้เตือนก่อนลบ */
export function yearUsage(yearId: string): { classrooms: number; courses: number } {
  const data = load();
  const roomIds = data.classrooms.filter(c => c.yearId === yearId).map(c => c.id);
  const courses = data.courses.filter(c => roomIds.includes(c.classroomId)).length;
  return { classrooms: roomIds.length, courses };
}

/** ลบปีการศึกษา (พร้อมชั้น/ห้อง/วิชา/คะแนนในปีนั้น) — เรียกหลังผู้ใช้ยืนยันแล้วเท่านั้น */
export function deleteAcademicYear(yearId: string): boolean {
  const data = load();
  if (!data.years.some(y => y.id === yearId)) return false;
  const roomIds = new Set(data.classrooms.filter(c => c.yearId === yearId).map(c => c.id));
  const removedCourseIds = data.courses.filter(c => roomIds.has(c.classroomId)).map(c => c.id);
  data.years = data.years.filter(y => y.id !== yearId);
  data.gradeLevels = data.gradeLevels.filter(g => g.yearId !== yearId);
  data.classrooms = data.classrooms.filter(c => c.yearId !== yearId);
  data.courses = data.courses.filter(c => !roomIds.has(c.classroomId));
  removedCourseIds.forEach(id => { delete data.scores[id]; });     // คะแนน keyed ตาม courseId
  if (data.rosters) roomIds.forEach(id => { delete data.rosters![id]; });
  save(data);
  return true;
}

// ─── Grade Level (แอดมินเท่านั้น) ────────────────────────────────────────
export function getGradeLevels(yearId: string): GradeLevel[] {
  return load().gradeLevels.filter(g => g.yearId === yearId);
}

export function createGradeLevel(yearId: string, name: string): GradeLevel | null {
  const data = load();
  if (data.gradeLevels.some(g => g.yearId === yearId && g.name === name)) return null;
  const item: GradeLevel = { id: `g${Date.now()}`, yearId, name };
  data.gradeLevels.push(item);
  save(data);
  return item;
}

/** ลบระดับชั้น (พร้อมห้อง/วิชา/คะแนนในชั้นนั้น) — เรียกหลังยืนยันแล้ว */
export function deleteGradeLevel(gradeLevelId: string): boolean {
  const data = load();
  if (!data.gradeLevels.some(g => g.id === gradeLevelId)) return false;
  const roomIds = new Set(data.classrooms.filter(c => c.gradeLevelId === gradeLevelId).map(c => c.id));
  const removedCourseIds = data.courses.filter(c => roomIds.has(c.classroomId)).map(c => c.id);
  data.gradeLevels = data.gradeLevels.filter(g => g.id !== gradeLevelId);
  data.classrooms = data.classrooms.filter(c => c.gradeLevelId !== gradeLevelId);
  data.courses = data.courses.filter(c => !roomIds.has(c.classroomId));
  removedCourseIds.forEach(id => { delete data.scores[id]; });
  if (data.rosters) roomIds.forEach(id => { delete data.rosters![id]; });
  save(data);
  return true;
}

// ─── Classroom (แอดมินเท่านั้น) ──────────────────────────────────────────
export function getClassrooms(gradeLevelId: string): Classroom[] {
  return load().classrooms.filter(c => c.gradeLevelId === gradeLevelId);
}

export function createClassroom(yearId: string, gradeLevelId: string, room: string): Classroom | null {
  const data = load();
  if (data.classrooms.some(c => c.gradeLevelId === gradeLevelId && c.room === room)) return null;
  const item: Classroom = { id: `r${Date.now()}`, yearId, gradeLevelId, room };
  data.classrooms.push(item);
  save(data);
  return item;
}

/** ลบห้องเรียน (พร้อมวิชา/คะแนน/นักเรียนในห้องนั้น) — เรียกหลังยืนยันแล้ว */
export function deleteClassroom(classroomId: string): boolean {
  const data = load();
  if (!data.classrooms.some(c => c.id === classroomId)) return false;
  const removedCourseIds = data.courses.filter(c => c.classroomId === classroomId).map(c => c.id);
  data.classrooms = data.classrooms.filter(c => c.id !== classroomId);
  data.courses = data.courses.filter(c => c.classroomId !== classroomId);
  removedCourseIds.forEach(id => { delete data.scores[id]; });
  if (data.rosters) delete data.rosters[classroomId];
  save(data);
  return true;
}

/** ห้องนี้มีคาบสอน/คะแนนผูกอยู่ไหม — ใช้เตือนก่อนลบ */
export function classroomUsage(classroomId: string): { courses: number; scored: boolean } {
  const data = load();
  const courses = data.courses.filter(c => c.classroomId === classroomId);
  const scored = courses.some(c => (data.scores[c.id] || []).some(e => e.symbol || Object.values(e.scores).some(v => v !== null)));
  return { courses: courses.length, scored };
}

// ─── Course / รายวิชา — ดึงอัตโนมัติจากตารางสอนของครู ────────────────────
export function getCourses(classroomId: string): Course[] {
  return load().courses.filter(c => c.classroomId === classroomId);
}

/** สร้างรหัสวิชาอัตโนมัติจาก subject key + ระดับชั้น เช่น math + ม.1 → ค21101 */
const SUBJECT_CODE_PREFIX: Record<string, string> = {
  math: 'ค', thai: 'ท', sci: 'ว', eng: 'อ', social: 'ส',
  pe: 'พ', art: 'ศ', music: 'ศ', com: 'ว', stat: 'ค',
};
function genCourseCode(key: string, gradeName: string): string {
  const n = gradeName.replace(/[^0-9]/g, '') || '0';
  return `${SUBJECT_CODE_PREFIX[key] || 'ร'}2${n}101`;
}

/**
 * ดึงรายวิชาที่ครูคนนี้สอนในห้องนี้ จากตารางสอน (ClassInfo) — ไม่ต้องสร้างเอง
 * ถ้ายังไม่มี record จะสร้างให้พร้อมสัดส่วนคะแนนมาตรฐาน (เก็บ 60 / กลางภาค 20 / ปลายภาค 20)
 * super admin (web_admin) เห็นทุกวิชาในห้อง
 * TODO(PostgreSQL): SELECT * FROM courses WHERE classroom_id=$1 AND owner_username=$2
 */
export function syncTeacherCourses(classroomId: string, teacherClasses: ClassInfo[], teacher: { id: string; name: string }): Course[] {
  /** กิจกรรม/ชุมนุม = ไม่คิดเกรด (ผ/มผ) — ค่านี้มาจากตารางสอนที่ครูตั้งไว้ */
  const modeOf = (cls: ClassInfo): GradingMode => cls.gradingMode || 'numeric';
  const session = getSession();
  if (!session) return [];

  const data = load();
  const room = data.classrooms.find(c => c.id === classroomId);
  const grade = room ? data.gradeLevels.find(g => g.id === room.gradeLevelId) : undefined;
  if (!room || !grade) return [];

  if (session.role === 'teacher') {
    // วิชาในตารางสอนของครูที่ตรงกับห้องนี้
    const taught = teacherClasses.filter(c => c.grade === grade.name && c.room === room.room);
    let changed = false;
    for (const cls of taught) {
      // ระบุวิชาด้วย "รหัสวิชา" — ครูอาจสอน 2 วิชาในกลุ่มสาระเดียวกันในห้องเดียว (เช่น คณิตพื้นฐาน + คณิตเพิ่มเติม)
      const code = cls.code || genCourseCode(cls.key, grade.name);
      const found = data.courses.find(c => c.classroomId === classroomId && c.code === code && (c.ownerUsername === session.username || c.teacherName === session.name));
      if (found) {
        // ครูแก้ตารางสอน → อัปเดตชื่อ/วิธีตัดสินผลของวิชาที่มีอยู่ให้ตรงกัน
        if (found.gradingMode !== modeOf(cls)) { found.gradingMode = modeOf(cls); changed = true; }
        if (found.name !== cls.subject)        { found.name = cls.subject;        changed = true; }
        continue;
      }
      data.courses.push({
        id: `crs${Date.now()}_${code}`,
        classroomId, code, name: cls.subject, key: cls.key,
        teacherId: teacher.id, teacherName: teacher.name, ownerUsername: session.username,
        components: DEFAULT_COMPONENTS.map(c => ({ ...c })),
        gradingMode: modeOf(cls),
        createdAt: Date.now(),
      });
      changed = true;
    }
    if (changed) save(data);
    return data.courses.filter(c => c.classroomId === classroomId && canManageScores(c));
  }

  // super admin เห็นทุกวิชาในห้อง
  if (session.role === 'web_admin') return data.courses.filter(c => c.classroomId === classroomId);
  return [];
}

/** แก้ไขสัดส่วนคะแนนของวิชา — เฉพาะครูประจำวิชา/super admin */
export function updateCourseComponents(courseId: string, components: ScoreComponent[]): boolean {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course || !canManageScores(course)) return false;
  course.components = components;
  // ลบคะแนนของหัวข้อที่ถูกเอาออก เพื่อไม่ให้ค้างในผลรวม
  const validIds = new Set(components.map(c => c.id));
  (data.scores[courseId] || []).forEach(e => {
    Object.keys(e.scores).forEach(k => { if (!validIds.has(k)) delete e.scores[k]; });
  });
  save(data);
  return true;
}

// ─── นักเรียนในห้อง ───────────────────────────────────────────────────────
export function getClassroomStudents(classroomId: string): TeacherStudent[] {
  const data = load();
  const room = data.classrooms.find(c => c.id === classroomId);
  if (!room) return [];

  const grade = data.gradeLevels.find(g => g.id === room.gradeLevelId);
  const mockClass = grade
    ? TEACHER_DATA_MOCK.classes.find(c => c.grade === grade.name && c.room === room.room)
    : undefined;
  const mockStudents = mockClass
    ? TEACHER_DATA_MOCK.students.filter(s => s.classId === mockClass.id)
    : [];

  const roster = data.rosters?.[classroomId] || [];
  const merged = [...mockStudents];
  roster.forEach(r => { if (!merged.some(s => s.code === r.code)) merged.push(r); });
  return merged;
}

export function addStudentToClassroom(classroomId: string, code: string, name: string): boolean {
  const data = load();
  if (getClassroomStudents(classroomId).some(s => s.code === code)) return false;
  if (!data.rosters) data.rosters = {};
  if (!data.rosters[classroomId]) data.rosters[classroomId] = [];
  data.rosters[classroomId].push({ id: `S${Date.now()}`, code, name, classId: classroomId });
  save(data);
  return true;
}

export function removeStudentFromClassroom(classroomId: string, code: string): void {
  const data = load();
  if (!data.rosters?.[classroomId]) return;
  data.rosters[classroomId] = data.rosters[classroomId].filter(s => s.code !== code);
  save(data);
}

// ─── คะแนน (ปพ.5) ─────────────────────────────────────────────────────────
export function getScores(courseId: string): ScoreEntry[] {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course) return [];
  const saved = data.scores[courseId] || [];
  const students = getClassroomStudents(course.classroomId);
  // ผสาน: นักเรียนทุกคนในห้องต้องมีแถว แม้ยังไม่บันทึกคะแนน
  return students.map(s => {
    const existing = saved.find(e => e.studentCode === s.code);
    return existing || { studentCode: s.code, studentName: s.name, scores: {} };
  });
}

/**
 * บันทึกคะแนน (เรียกอัตโนมัติทุกครั้งที่แก้ตัวเลข — real-time)
 * คืน false ถ้าไม่มีสิทธิ์ (ไม่ใช่ครูประจำวิชา/super admin)
 * TODO(PostgreSQL): UPSERT score_records + ตรวจสิทธิ์ด้วย RLS
 */
export function saveScores(courseId: string, entries: ScoreEntry[]): boolean {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course || !canManageScores(course)) return false;
  data.scores[courseId] = entries;
  save(data);
  return true;
}

// ─── คำนวณคะแนน/เกรด (โปร่งใส ตรวจสอบได้) ───────────────────────────────
/** คะแนนรวมของนักเรียน = ผลบวกทุกหัวข้อที่กรอกแล้ว (ยังไม่กรอกเลย = null) */
export function calcTotal(e: ScoreEntry): number | null {
  const vals = Object.values(e.scores).filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0);
}

/** คะแนนเต็มรวมของวิชา = ผลบวก max ทุกหัวข้อ */
export function maxTotal(course: Course): number {
  return course.components.reduce((s, c) => s + c.max, 0);
}

/** เปอร์เซ็นต์ = รวม ÷ เต็มรวม × 100 — ใช้คิดเกรด ไม่ว่าสัดส่วนจะรวมเป็นเท่าไร */
export function calcPercent(e: ScoreEntry, course: Course): number | null {
  const total = calcTotal(e);
  const max = maxTotal(course);
  if (total === null || max === 0) return null;
  return (total / max) * 100;
}

/**
 * ผลการเรียนที่แสดงจริงของนักเรียน 1 คนในวิชานั้น
 *   - ถ้าครูเลือกสัญลักษณ์ไว้ (ผ/มผ/ร/มส/ขส/ขร) → ใช้สัญลักษณ์นั้นเสมอ
 *   - วิชาไม่คิดเกรด (กิจกรรม/ชุมนุม) ที่ยังไม่ได้ประเมิน → '—'
 *   - วิชาคิดเกรด → คำนวณจากเปอร์เซ็นต์ตามปกติ
 */
export function resolveGrade(e: ScoreEntry, course: Course): string {
  if (e.symbol) return e.symbol;
  if (course.gradingMode === 'symbol') return '—';
  return calcGrade(calcPercent(e, course));
}

/** เกรดนี้เป็นสัญลักษณ์ (ไม่นำไปคิด GPA) หรือไม่ */
export function isSpecialGrade(grade: string): boolean {
  return SPECIAL_GRADES.some(g => g.code === grade);
}

/** เกรดตามเกณฑ์ สพฐ. จากเปอร์เซ็นต์: 80+ = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1 */
export function calcGrade(percent: number | null): string {
  if (percent === null) return '—';
  if (percent >= 80) return '4';
  if (percent >= 75) return '3.5';
  if (percent >= 70) return '3';
  if (percent >= 65) return '2.5';
  if (percent >= 60) return '2';
  if (percent >= 55) return '1.5';
  if (percent >= 50) return '1';
  return '0';
}

// ─── ผลการเรียนรายนักเรียน (หน้าเกรดนักเรียน/ผู้ปกครอง + ปพ.1/ปพ.6) ─────
export interface StudentGradeRow {
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  classroomLabel: string;  // เช่น 'ม.1/1'
  academicYear: string;
  breakdown: { name: string; max: number; score: number | null }[];
  total: number | null;
  maxTotal: number;
  grade: string;
  gradingMode: GradingMode;  // 'symbol' = วิชากิจกรรม/ชุมนุม ไม่คิดเกรด
  isSpecial: boolean;        // เกรดเป็นสัญลักษณ์ (ไม่คิด GPA)
}

export function getStudentGrades(studentCode: string): StudentGradeRow[] {
  const data = load();
  const rows: StudentGradeRow[] = [];
  for (const course of data.courses) {
    const entry = (data.scores[course.id] || []).find(e => e.studentCode === studentCode);
    if (!entry) continue;
    const room = data.classrooms.find(c => c.id === course.classroomId);
    const grade = room ? data.gradeLevels.find(g => g.id === room.gradeLevelId) : undefined;
    const year = room ? data.years.find(y => y.id === room.yearId) : undefined;
    const finalGrade = resolveGrade(entry, course);
    rows.push({
      courseId: course.id, courseCode: course.code, courseName: course.name,
      teacherName: course.teacherName,
      classroomLabel: grade && room ? `${grade.name}/${room.room}` : '—',
      academicYear: year?.year || '—',
      breakdown: course.components.map(c => ({ name: c.name, max: c.max, score: entry.scores[c.id] ?? null })),
      total: calcTotal(entry), maxTotal: maxTotal(course),
      grade: finalGrade,
      gradingMode: course.gradingMode,
      isSpecial: isSpecialGrade(finalGrade),
    });
  }
  return rows;
}

/**
 * GPA เฉลี่ยจากวิชาที่คิดเกรดเท่านั้น (น้ำหนักเท่ากันทุกวิชา — TODO: ถ่วงด้วยหน่วยกิตเมื่อมีข้อมูลจริง)
 * วิชากิจกรรม/ชุมนุม และผลแบบสัญลักษณ์ (ผ/มผ/ร/มส/ขส/ขร) ไม่ถูกนำมาคิด
 */
export function calcGPA(rows: StudentGradeRow[]): number | null {
  const graded = rows
    .filter(r => r.grade !== '—' && !r.isSpecial)
    .map(r => parseFloat(r.grade))
    .filter(g => !Number.isNaN(g));
  if (graded.length === 0) return null;
  return graded.reduce((s, g) => s + g, 0) / graded.length;
}
