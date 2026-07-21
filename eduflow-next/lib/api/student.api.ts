/**
 * Student API — ตอนนี้ใช้ mock data, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * กติกาบัญชี:
 *   - บัญชีตัวอย่าง (student1 / รหัส 10021) เท่านั้นที่มีข้อมูล mock ครบ ไว้เดโม่ระบบ
 *   - บัญชีที่สมัครใหม่/แอดมินเพิ่ม = เริ่มจาก 0 ทั้งหมด (ไม่มีห้อง/การบ้าน/ตาราง)
 *     จะเริ่มมีข้อมูลเมื่อแอดมินจัดเข้าห้องเรียน แล้วครูสั่งงาน/เช็คชื่อจริง
 *
 * PostgreSQL schema (อนาคต): students, attendance_records, assignments, submissions,
 *   shop_items, orders, wallets, book_catalog, book_reservations
 */

import type { StudentProfile, StudentStats, Assignment, Notification, SchedulePeriod, Subject } from '../types';
import { getClassroomSchedule, getScheduleCourses, periodTime, SUBJECT_KEYS } from './schedule.store';
import { getStudentRoomId } from './class-resolver';
import { getStudentGrades, calcGPA } from './academic.store';
import { getAttendanceReports } from './attendance.store';
import {
  STUDENT_PROFILE_MOCK, STUDENT_STATS_MOCK, STUDENT_SCHEDULE_MOCK,
  STUDENT_SUBJECTS_MOCK, STUDENT_ATTENDANCE_MOCK,
  SHOP_ITEMS_MOCK, SHOP_CATS, LIBRARY_BOOKS_MOCK, NOTIFICATIONS_MOCK,
} from '../mock-data';
import {
  getStudentAssignmentsStore, submitAssignmentStore, findStudentClassId,
  getSharedNotifications, markSharedNotificationRead,
} from './assignments.store';
import { getWalletBalance, deductWalletFunds } from './wallet.store';

/** บัญชีตัวอย่างที่ให้ข้อมูล mock ครบ — บัญชีอื่นเริ่มจาก 0 */
const DEMO_STUDENT_CODE = '10021';
const isDemo = (code: string) => code === DEMO_STUDENT_CODE;

/** โปรไฟล์ว่างสำหรับบัญชีใหม่ (ชื่อจริงถูกทับด้วย session ใน StudentLayout) */
function emptyProfile(code: string): StudentProfile {
  return {
    firstName: '', lastName: '', nickname: '—', gender: '—', dob: '—', bloodType: '—',
    studentId: code || '—', grade: '', room: '', academicYear: '2567',
    school: 'โรงเรียนทดสอบ EduFlow', address: '—', phone: '—', email: '—', lineId: '—',
    religion: '—', nationality: '—',
    father: { name: '—', phone: '—', occupation: '—' },
    mother: { name: '—', phone: '—', occupation: '—' },
    emergencyContact: '—',
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM students WHERE student_code = $1
export async function getStudentProfile(studentCode: string): Promise<StudentProfile> {
  return isDemo(studentCode) ? { ...STUDENT_PROFILE_MOCK } : emptyProfile(studentCode);
}

// TODO(PostgreSQL): UPDATE students SET ... WHERE student_code = $1
export async function updateStudentProfile(studentCode: string, data: Partial<StudentProfile>): Promise<void> {
  console.log('TODO: updateStudentProfile', studentCode, data);
}

// ─── Stats ────────────────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึง aggregate จาก attendance_records / assignments / wallets
export async function getStudentStats(studentCode: string): Promise<StudentStats> {
  const balance = getWalletBalance(studentCode);

  // ข้อมูลจริงเท่าที่มี: การบ้านค้างส่ง + GPA จากสมุดคะแนนของครู
  const assignments = await getStudentAssignments(studentCode);
  const homeworkPending = assignments.filter(a => a.status === 'pending' || a.status === 'overdue').length;
  const gpaReal = calcGPA(getStudentGrades(studentCode));

  if (isDemo(studentCode)) {
    return {
      ...STUDENT_STATS_MOCK,
      balance,
      homeworkPending: homeworkPending || STUDENT_STATS_MOCK.homeworkPending,
      gpa: gpaReal !== null ? Number(gpaReal.toFixed(2)) : STUDENT_STATS_MOCK.gpa,
    };
  }
  return {
    attendancePct: 0,
    homeworkPending,
    balance,
    gpa: gpaReal !== null ? Number(gpaReal.toFixed(2)) : 0,
  };
}

// ─── Schedule ─────────────────────────────────────────────────────────────
/**
 * ตารางเรียนของนักเรียน = ตารางสอนของ "ห้องตัวเอง" ที่ครูจัดไว้ (แหล่งเดียวกันทั้งระบบ)
 * ถ้าห้องยังไม่มีตาราง: บัญชีเดโม่ใช้ข้อมูลตัวอย่าง · บัญชีอื่นว่างตามจริง
 * TODO(PostgreSQL): SELECT ... FROM schedule_slots WHERE classroom_id = (ห้องของนักเรียน)
 */
export async function getStudentSchedule(studentCode: string): Promise<Record<string, SchedulePeriod[]>> {
  const roomId = getStudentRoomId(studentCode);
  if (roomId) {
    const slots = getClassroomSchedule(roomId);
    if (slots.length > 0) {
      const byDay: Record<string, SchedulePeriod[]> = {};
      slots.forEach(s => {
        (byDay[s.day] ||= []).push({
          period: s.period,
          time: periodTime(s.period),
          subject: s.subjectName,
          teacher: s.teacherName,
          room: s.room || '—',
          key: s.subjectKey,
        });
      });
      Object.values(byDay).forEach(list => list.sort((a, b) => a.period - b.period));
      return byDay;
    }
  }
  return isDemo(studentCode) ? { ...STUDENT_SCHEDULE_MOCK } : {};
}

// ─── Subjects ─────────────────────────────────────────────────────────────
/**
 * วิชาที่นักเรียนต้องเรียน = รายวิชาในตารางเรียนของห้องตัวเอง
 * สถิติแต่ละวิชาคำนวณจากข้อมูลจริง: การบ้านที่ส่ง/ได้รับมอบหมาย + คะแนนสอบกลางภาค + การเช็คชื่อ
 * TODO(PostgreSQL): SELECT ... FROM enrollments JOIN courses WHERE student_id = $1
 */
export async function getStudentSubjects(studentCode: string): Promise<Subject[]> {
  const roomId = getStudentRoomId(studentCode);
  const courses = roomId ? getScheduleCourses(roomId) : [];
  if (courses.length === 0) return isDemo(studentCode) ? [...STUDENT_SUBJECTS_MOCK] : [];

  const assignments = await getStudentAssignments(studentCode);
  const grades = getStudentGrades(studentCode);
  const reports = getAttendanceReports();

  return courses.map(c => {
    const mine = assignments.filter(a => a.key === c.subjectKey);
    const done = mine.filter(a => a.status === 'submitted' || a.status === 'graded').length;

    // คะแนนสอบกลางภาคจากสมุดคะแนน (ถ้าครูกรอกแล้ว)
    const gradeRow = grades.find(g => g.courseName === c.subjectName);
    const midterm = gradeRow?.breakdown.find(b => b.name.includes('กลางภาค'))?.score ?? null;

    // การเข้าเรียนรายวิชา จากรายงานเช็คชื่อที่ครูส่ง
    const subjReports = reports.filter(r => r.subject === c.subjectName);
    const attended = subjReports.filter(r => r.records.some(rec => rec.studentId === studentCode)).length;
    const attend = subjReports.length > 0 ? Math.round((attended / subjReports.length) * 100) : 100;

    return {
      key: c.subjectKey,
      name: c.subjectName,
      teacher: c.teacherName,
      icon: SUBJECT_KEYS.find(s => s.key === c.subjectKey)?.icon || '📘',
      attend,
      midterm,
      assign: mine.length,
      done,
    };
  });
}

// ─── Assignments ──────────────────────────────────────────────────────────
// อ่านจาก shared store — บัญชีที่ยังไม่ถูกจัดเข้าห้อง จะไม่มีการบ้านเลย (เริ่มจาก 0)
export async function getStudentAssignments(studentCode: string): Promise<Assignment[]> {
  return getStudentAssignmentsStore(studentCode);
}

// TODO(PostgreSQL): INSERT INTO submissions + upload ไฟล์จริงไป storage แล้วเก็บ URL
export async function submitAssignment(
  assignmentId: number, studentCode: string, studentName: string, note: string,
  fileMeta?: { name: string; size: number },
): Promise<void> {
  submitAssignmentStore(assignmentId, studentCode, studentName, note, fileMeta);
}

// ─── Attendance ───────────────────────────────────────────────────────────
export async function getStudentAttendance(studentCode: string) {
  const result = isDemo(studentCode)
    ? { week: [...STUDENT_ATTENDANCE_MOCK.week], month: { ...STUDENT_ATTENDANCE_MOCK.month } }
    : { week: [] as ('on-time' | 'late' | 'absent')[], month: { onTime: 0, late: 0, absent: 0, total: 0 } };

  // overlay การเช็คชื่อจริงผ่าน QR ของสัปดาห์นี้ทับ
  const { getStudentAttendanceRecords } = await import('./attendance.store');
  const records = getStudentAttendanceRecords(studentCode);
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // จันทร์ของสัปดาห์นี้
  monday.setHours(0, 0, 0, 0);

  records.forEach(r => {
    const d = new Date(r.checkedAt);
    if (d >= monday) {
      const dayIdx = (d.getDay() + 6) % 7; // 0 = จันทร์
      if (dayIdx < 5 && result.week.length >= 5) result.week[dayIdx] = r.status;
    }
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      if (r.status === 'on-time') result.month.onTime += 1;
      else result.month.late += 1;
      result.month.total += 1;
    }
  });

  return result;
}

// ─── Shop ─────────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM shop_items WHERE is_available = true ORDER BY category
export async function getShopItems() {
  return { cats: SHOP_CATS, items: [...SHOP_ITEMS_MOCK] };
}

// ชำระเงินผ่านกระเป๋ากลาง — ยอดไม่พอ = ไม่หัก
// TODO(PostgreSQL): transaction: หักเงิน + INSERT orders
export async function placeOrder(
  studentCode: string, itemSummary: string, total: number
): Promise<{ success: boolean; newBalance: number }> {
  const r = deductWalletFunds(studentCode, total, `ซื้อสินค้าร้านค้า: ${itemSummary}`);
  return { success: r.ok, newBalance: r.balance };
}

// ─── Library ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM books ORDER BY type, title
export async function getLibraryBooks() {
  return [...LIBRARY_BOOKS_MOCK];
}

// TODO(PostgreSQL): INSERT INTO reading_progress ...
export async function markBookRead(studentCode: string, bookId: number): Promise<void> {
  const key = 'eduflow_lib_done';
  const done = JSON.parse(localStorage.getItem(key) || '{}');
  done[bookId] = true;
  localStorage.setItem(key, JSON.stringify(done));
}

export function getReadBooksLocal(): Record<number, boolean> {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('eduflow_lib_done') || '{}');
}

// ─── Notifications ────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM notifications WHERE student_id = $1 AND created_at > NOW() - '3 days'
export async function getNotifications(studentCode: string): Promise<Notification[]> {
  const TTL = 3 * 24 * 60 * 60 * 1000;
  const shared = getSharedNotifications(`student:${studentCode}`);
  const base = isDemo(studentCode) ? [...shared, ...NOTIFICATIONS_MOCK] : shared;
  return base.filter(n => Date.now() - n.time < TTL).sort((a, b) => b.time - a.time);
}

// TODO(PostgreSQL): UPDATE notifications SET is_read = true WHERE id = $1
export async function markNotificationRead(notifId: number): Promise<void> {
  markSharedNotificationRead(notifId);
  const n = NOTIFICATIONS_MOCK.find(x => x.id === notifId);
  if (n) n.isNew = false;
}

export { findStudentClassId };
