/**
 * Academic Store — โครงสร้างวิชาการ + บันทึกคะแนน (แบบ ปพ.5)
 *
 * ลำดับชั้นข้อมูล:  ปีการศึกษา → ระดับชั้น → ห้องเรียน → รายวิชา → คะแนน
 *
 * สิทธิ์:
 *   - แอดมิน (web_admin / school_admin): สร้าง ปีการศึกษา, ระดับชั้น, ห้องเรียน
 *   - ครู: สร้างรายวิชาในห้องที่แอดมินสร้างไว้แล้ว + บันทึกคะแนน
 *
 * คะแนนที่บันทึกจะใช้คำนวณเกรด → นำไปออกเอกสาร ปพ. (ปพ.5 / ปพ.6 / ใบออกเกรด)
 *
 * TODO(PostgreSQL): แทนที่ทั้งไฟล์นี้ด้วย API routes (app/api/academic/*)
 *   tables: academic_years, grade_levels, classrooms, courses, score_records
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import type { TeacherStudent } from '../types';

const STORE_KEY = 'eduflow_academic';

// ─── Types ────────────────────────────────────────────────────────────────
export interface AcademicYear {
  id: string;
  year: string;        // เช่น '2567'
  createdBy: string;   // username แอดมินที่สร้าง
  createdAt: number;
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

export interface Course {
  id: string;
  classroomId: string;
  code: string;        // รหัสวิชา เช่น ค21101
  name: string;        // ชื่อวิชา เช่น คณิตศาสตร์พื้นฐาน
  key: string;         // subject key สำหรับสี theme เช่น 'math'
  teacherId: string;
  teacherName: string;
  maxCollected: number; // คะแนนเก็บเต็ม (default 60)
  maxMidterm: number;   // กลางภาคเต็ม (default 20)
  maxFinal: number;     // ปลายภาคเต็ม (default 20)
  createdAt: number;
}

export interface ScoreEntry {
  studentCode: string;
  studentName: string;
  collected: number | null;
  midterm: number | null;
  final: number | null;
}

interface AcademicData {
  years: AcademicYear[];
  gradeLevels: GradeLevel[];
  classrooms: Classroom[];
  courses: Course[];
  scores: Record<string, ScoreEntry[]>;           // keyed by courseId
  rosters?: Record<string, TeacherStudent[]>;     // นักเรียนที่แอดมินเพิ่มเข้าห้อง keyed by classroomId
}

// ─── Internal ─────────────────────────────────────────────────────────────
function isBrowser() { return typeof window !== 'undefined'; }

function load(): AcademicData {
  if (!isBrowser()) return { years: [], gradeLevels: [], classrooms: [], courses: [], scores: {} };
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);
  const seeded = seed();
  localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
  return seeded;
}

function save(data: AcademicData) {
  if (isBrowser()) localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** ข้อมูลตั้งต้น: ปี 2567 + ระดับชั้น/ห้องที่ตรงกับห้องสอนใน mock เพื่อให้ครูใช้ได้ทันที */
function seed(): AcademicData {
  const year: AcademicYear = { id: 'y2567', year: '2567', createdBy: 'webadmin', createdAt: Date.now() };
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

// ─── Academic Year (แอดมินเท่านั้น) ──────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM academic_years ORDER BY year DESC
export function getAcademicYears(): AcademicYear[] {
  return [...load().years].sort((a, b) => b.year.localeCompare(a.year));
}

// TODO(PostgreSQL): INSERT INTO academic_years (year, created_by) VALUES ($1, $2)
//   RLS: อนุญาตเฉพาะ role = web_admin / school_admin
export function createAcademicYear(year: string, createdBy: string): AcademicYear | null {
  const data = load();
  if (data.years.some(y => y.year === year)) return null; // ห้ามซ้ำ
  const item: AcademicYear = { id: `y${Date.now()}`, year, createdBy, createdAt: Date.now() };
  data.years.push(item);
  save(data);
  return item;
}

// ─── Grade Level (แอดมินเท่านั้น) ────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM grade_levels WHERE year_id = $1
export function getGradeLevels(yearId: string): GradeLevel[] {
  return load().gradeLevels.filter(g => g.yearId === yearId);
}

// TODO(PostgreSQL): INSERT INTO grade_levels (year_id, name) VALUES ($1, $2)
export function createGradeLevel(yearId: string, name: string): GradeLevel | null {
  const data = load();
  if (data.gradeLevels.some(g => g.yearId === yearId && g.name === name)) return null;
  const item: GradeLevel = { id: `g${Date.now()}`, yearId, name };
  data.gradeLevels.push(item);
  save(data);
  return item;
}

// ─── Classroom (แอดมินเท่านั้น) ──────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM classrooms WHERE grade_level_id = $1
export function getClassrooms(gradeLevelId: string): Classroom[] {
  return load().classrooms.filter(c => c.gradeLevelId === gradeLevelId);
}

// TODO(PostgreSQL): INSERT INTO classrooms (year_id, grade_level_id, room) VALUES ($1, $2, $3)
export function createClassroom(yearId: string, gradeLevelId: string, room: string): Classroom | null {
  const data = load();
  if (data.classrooms.some(c => c.gradeLevelId === gradeLevelId && c.room === room)) return null;
  const item: Classroom = { id: `r${Date.now()}`, yearId, gradeLevelId, room };
  data.classrooms.push(item);
  save(data);
  return item;
}

// ─── Course / รายวิชา (ครูสร้างได้) ──────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM courses WHERE classroom_id = $1 ORDER BY created_at
export function getCourses(classroomId: string): Course[] {
  return load().courses.filter(c => c.classroomId === classroomId);
}

// TODO(PostgreSQL):
//   INSERT INTO courses (classroom_id, code, name, subject_key, teacher_id, max_collected, max_midterm, max_final)
//   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
export function createCourse(data: Omit<Course, 'id' | 'createdAt'>): Course {
  const store = load();
  const item: Course = { ...data, id: `crs${Date.now()}`, createdAt: Date.now() };
  store.courses.push(item);
  save(store);
  return item;
}

// ─── นักเรียนในห้อง ───────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT s.* FROM students s JOIN enrollments e ON e.student_id = s.id WHERE e.classroom_id = $1
export function getClassroomStudents(classroomId: string): TeacherStudent[] {
  const data = load();
  const room = data.classrooms.find(c => c.id === classroomId);
  if (!room) return [];

  // 1) นักเรียนจาก mock (ห้อง seed ที่ตรงกับห้องสอนของครู)
  const grade = data.gradeLevels.find(g => g.id === room.gradeLevelId);
  const mockClass = grade
    ? TEACHER_DATA_MOCK.classes.find(c => c.grade === grade.name && c.room === room.room)
    : undefined;
  const mockStudents = mockClass
    ? TEACHER_DATA_MOCK.students.filter(s => s.classId === mockClass.id)
    : [];

  // 2) นักเรียนที่แอดมินเพิ่มเข้าห้องเอง (roster) — dedupe ด้วยรหัสนักเรียน
  const roster = data.rosters?.[classroomId] || [];
  const merged = [...mockStudents];
  roster.forEach(r => { if (!merged.some(s => s.code === r.code)) merged.push(r); });
  return merged;
}

// TODO(PostgreSQL): INSERT INTO enrollments (classroom_id, student_code) VALUES ($1, $2)
//   RLS: อนุญาตเฉพาะแอดมิน
export function addStudentToClassroom(classroomId: string, code: string, name: string): boolean {
  const data = load();
  if (getClassroomStudents(classroomId).some(s => s.code === code)) return false; // รหัสซ้ำ
  if (!data.rosters) data.rosters = {};
  if (!data.rosters[classroomId]) data.rosters[classroomId] = [];
  data.rosters[classroomId].push({ id: `S${Date.now()}`, code, name, classId: classroomId });
  save(data);
  return true;
}

// TODO(PostgreSQL): DELETE FROM enrollments WHERE classroom_id = $1 AND student_code = $2
export function removeStudentFromClassroom(classroomId: string, code: string): void {
  const data = load();
  if (!data.rosters?.[classroomId]) return;
  data.rosters[classroomId] = data.rosters[classroomId].filter(s => s.code !== code);
  save(data);
}

// ─── คะแนน (ปพ.5) ─────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   SELECT sr.* FROM score_records sr WHERE sr.course_id = $1
//   UNION นักเรียนในห้องที่ยังไม่มีคะแนน (LEFT JOIN enrollments)
export function getScores(courseId: string): ScoreEntry[] {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course) return [];
  const saved = data.scores[courseId] || [];
  const students = getClassroomStudents(course.classroomId);
  // ผสาน: นักเรียนทุกคนในห้องต้องมีแถว แม้ยังไม่บันทึกคะแนน
  return students.map(s => {
    const existing = saved.find(e => e.studentCode === s.code);
    return existing || { studentCode: s.code, studentName: s.name, collected: null, midterm: null, final: null };
  });
}

// TODO(PostgreSQL):
//   INSERT INTO score_records (course_id, student_code, collected, midterm, final)
//   VALUES ... ON CONFLICT (course_id, student_code) DO UPDATE SET ...
export function saveScores(courseId: string, entries: ScoreEntry[]): void {
  const data = load();
  data.scores[courseId] = entries;
  save(data);
}

// ─── ผลการเรียนรายนักเรียน (สำหรับหน้าเกรด + ใบออกเกรด/ปพ.6) ────────────
export interface StudentGradeRow {
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  classroomLabel: string;  // เช่น 'ม.1/1'
  academicYear: string;
  collected: number | null;
  midterm: number | null;
  final: number | null;
  total: number | null;
  grade: string;
}

// TODO(PostgreSQL):
//   SELECT c.*, sr.collected, sr.midterm, sr.final
//   FROM score_records sr JOIN courses c ON c.id = sr.course_id
//   JOIN classrooms r ON r.id = c.classroom_id
//   WHERE sr.student_code = $1 ORDER BY c.created_at
export function getStudentGrades(studentCode: string): StudentGradeRow[] {
  const data = load();
  const rows: StudentGradeRow[] = [];
  for (const course of data.courses) {
    const entry = (data.scores[course.id] || []).find(e => e.studentCode === studentCode);
    if (!entry) continue; // ยังไม่มีการบันทึกคะแนนของนักเรียนคนนี้ในวิชานี้
    const room = data.classrooms.find(c => c.id === course.classroomId);
    const grade = room ? data.gradeLevels.find(g => g.id === room.gradeLevelId) : undefined;
    const year = room ? data.years.find(y => y.id === room.yearId) : undefined;
    const total = calcTotal(entry);
    rows.push({
      courseId: course.id, courseCode: course.code, courseName: course.name,
      teacherName: course.teacherName,
      classroomLabel: grade && room ? `${grade.name}/${room.room}` : '—',
      academicYear: year?.year || '—',
      collected: entry.collected, midterm: entry.midterm, final: entry.final,
      total, grade: calcGrade(total),
    });
  }
  return rows;
}

/** GPA เฉลี่ยจากทุกวิชาที่มีเกรดแล้ว (น้ำหนักเท่ากันทุกวิชา — TODO: ถ่วงด้วยหน่วยกิตเมื่อมีข้อมูลจริง) */
export function calcGPA(rows: StudentGradeRow[]): number | null {
  const graded = rows.filter(r => r.grade !== '—').map(r => parseFloat(r.grade));
  if (graded.length === 0) return null;
  return graded.reduce((s, g) => s + g, 0) / graded.length;
}

// ─── คำนวณเกรด (เกณฑ์มาตรฐาน สพฐ.) ──────────────────────────────────────
export function calcTotal(e: ScoreEntry): number | null {
  if (e.collected === null && e.midterm === null && e.final === null) return null;
  return (e.collected ?? 0) + (e.midterm ?? 0) + (e.final ?? 0);
}

export function calcGrade(total: number | null): string {
  if (total === null) return '—';
  if (total >= 80) return '4';
  if (total >= 75) return '3.5';
  if (total >= 70) return '3';
  if (total >= 65) return '2.5';
  if (total >= 60) return '2';
  if (total >= 55) return '1.5';
  if (total >= 50) return '1';
  return '0';
}
