/**
 * Teacher API — ตอนนี้ใช้ mock data, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * PostgreSQL schema (อนาคต):
 *   teachers, classes, teacher_assignments, submissions, materials, announcements
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import type { ClassInfo, TeacherStudent, TeacherAssignment, AttendanceSession, AttendanceRecord, AttendanceReport, Notification } from '../types';
import {
  getClassAssignmentsStore, createAssignmentStore, gradeSubmissionStore,
  getSharedNotifications, markSharedNotificationRead,
  type StoredAssignment,
} from './assignments.store';

export type { StoredAssignment };

/**
 * บัญชีครูตัวอย่าง (teacher1) เท่านั้นที่มีตารางสอน mock ไว้เดโม่
 * ครูที่สมัครใหม่/แอดมินเพิ่ม = เริ่มจาก 0 ไม่มีห้องสอน จนกว่าแอดมินจะจัดสรร
 */
const DEMO_TEACHER_USERNAMES = ['teacher1', 'T001'];
const isDemoTeacher = (id: string) => DEMO_TEACHER_USERNAMES.includes(id);

// TODO(PostgreSQL): SELECT * FROM teachers WHERE user_id = $1
export async function getTeacherProfile(teacherId: string) {
  if (isDemoTeacher(teacherId)) return { ...TEACHER_DATA_MOCK.profile };
  // ครูใหม่: โปรไฟล์ว่าง (ชื่อจริงถูกทับด้วย session ใน TeacherLayout)
  return { name: '', teacherId: teacherId.toUpperCase(), school: 'โรงเรียนทดสอบ EduFlow', subject: '—', academicYear: '2567' };
}

// TODO(PostgreSQL):
//   SELECT c.*, sub.name as subject_name, sub.key
//   FROM teacher_classes tc JOIN classes c ON tc.class_id = c.id
//   WHERE tc.teacher_id = $1
export async function getTeacherClasses(teacherId: string): Promise<ClassInfo[]> {
  return isDemoTeacher(teacherId) ? [...TEACHER_DATA_MOCK.classes] : [];
}

// TODO(PostgreSQL):
//   SELECT * FROM students WHERE class_id = $1 ORDER BY name
export async function getClassStudents(classId: string): Promise<TeacherStudent[]> {
  return TEACHER_DATA_MOCK.students.filter(s => s.classId === classId);
}

// อ่าน/เขียนผ่าน shared store (localStorage) เพื่อให้เชื่อมกับฝั่งนักเรียนจริง
// TODO(PostgreSQL):
//   SELECT a.*, COUNT(s.id) as submission_count
//   FROM assignments a
//   LEFT JOIN submissions s ON a.id = s.assignment_id
//   WHERE a.class_id = $1
export async function getClassAssignments(classId: string): Promise<StoredAssignment[]> {
  return getClassAssignmentsStore(classId);
}

// TODO(PostgreSQL):
//   INSERT INTO assignments (class_id, title, description, max_score, due_date, file_required, created_by)
//   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
export async function createAssignment(data: {
  classId: string; key: string; subject: string; title: string;
  details: string; due: string; maxScore: number; teacher: string;
  submitType?: import('../types').SubmitFileType;
}): Promise<StoredAssignment> {
  return createAssignmentStore(data);
}

// TODO(PostgreSQL):
//   UPDATE submissions SET score = $1, teacher_note = $2, status = 'graded'
//   WHERE assignment_id = $3 AND student_id = $4
export async function gradeSubmission(
  assignmentId: number, studentCode: string, score: number, note: string
): Promise<void> {
  gradeSubmissionStore(assignmentId, studentCode, score, note);
}

// TODO(PostgreSQL):
//   SELECT a.day_of_week, a.period_number, a.time_slot,
//          sub.name as subject, c.room_number, cl.grade, cl.room
//   FROM schedule a
//   JOIN subjects sub ON a.subject_id = sub.id
//   JOIN classes cl ON a.class_id = cl.id
//   WHERE a.teacher_id = $1
export async function getTeacherSchedule(teacherId: string) {
  return TEACHER_DATA_MOCK;
}

// TODO(PostgreSQL):
//   INSERT INTO materials (class_id, type, title, description, url, created_by)
//   VALUES ($1, $2, $3, $4, $5, $6)
export async function uploadMaterial(classId: string, data: {
  type: 'video' | 'file' | 'link';
  title: string;
  description: string;
  url?: string;
  file?: File;
}): Promise<void> {
  console.log('TODO: uploadMaterial', { classId, ...data });
}

// TODO(PostgreSQL):
//   INSERT INTO announcements (class_id, title, body, is_pinned, created_by)
//   VALUES ($1, $2, $3, $4, $5)
export async function postAnnouncement(classId: string, data: {
  title: string;
  body: string;
  pinned: boolean;
}): Promise<void> {
  console.log('TODO: postAnnouncement', { classId, ...data });
}

// TODO(PostgreSQL):
//   SELECT student_id, status, check_time FROM attendance_records
//   WHERE class_id = $1 AND date = CURRENT_DATE
export async function getTodayAttendance(classId: string) {
  const students = TEACHER_DATA_MOCK.students.filter(s => s.classId === classId);
  return students.map(s => ({
    studentId: s.id, studentCode: s.code, name: s.name,
    status: 'on-time' as const, checkTime: '08:02',
  }));
}

// TODO(PostgreSQL):
//   UPDATE attendance_records SET status = $1, check_time = NOW()
//   WHERE class_id = $2 AND student_id = $3 AND date = CURRENT_DATE
export async function updateAttendance(
  classId: string, studentId: string, status: 'on-time' | 'late' | 'absent'
): Promise<void> {
  console.log('TODO: updateAttendance', { classId, studentId, status });
}

// ─── QR Code Attendance ────────────────────────────────────
// logic จริงอยู่ที่ attendance.store.ts (shared store พร้อม TODO(PostgreSQL))
// re-export ให้เรียกผ่าน API layer เดิมได้
export {
  createAttendanceSession, getClassSessions, getSessionRecords,
  submitSessionReport, getAttendanceReports, validateQR, checkIn,
} from './attendance.store';

// ─── Teacher Notifications ────────────────────────────────────

// TODO(PostgreSQL):
//   SELECT n.* FROM notifications n
//   WHERE n.teacher_id = $1 AND n.is_deleted = false
//   ORDER BY n.created_at DESC LIMIT 20
export async function getTeacherNotifications(teacherId: string): Promise<Notification[]> {
  // ครูใหม่ = ไม่มีแจ้งเตือน mock — มีเฉพาะแจ้งเตือนจริงจาก shared store
  if (!isDemoTeacher(teacherId)) return getSharedNotifications(`teacher:${teacherId.toUpperCase()}`);
  // ผสานแจ้งเตือนจริงจาก shared store (เช่น นักเรียนส่งการบ้าน) กับ mock เดิม
  const shared = getSharedNotifications(`teacher:${TEACHER_DATA_MOCK.profile.teacherId}`);
  const mock: Notification[] = [
    {
      id: 1,
      type: 'attendance_report',
      isNew: true,
      title: '📊 รายงานเช็คชื่อส่งแล้ว',
      body: 'คาบวิชา "ฟิสิกส์" ของชั้น ม.5/1 ทำการเช็คชื่อเสร็จสิ้น (23 คนมา, 2 คนสาย)',
      time: Date.now() - 5 * 60 * 1000,
      data: { reportId: 'rpt-001', className: 'ม.5/1', presentCount: 23, lateCount: 2 },
    },
    {
      id: 2,
      type: 'assignment_submitted',
      isNew: true,
      title: '📝 นักเรียนส่งการบ้าน',
      body: '18 นักเรียนจากชั้น ม.5/1 ส่งการบ้าน "บทที่ 5 พลศาสตร์" แล้ว',
      time: Date.now() - 30 * 60 * 1000,
      data: { assignmentId: 'asgn-001', submissionCount: 18 },
    },
    {
      id: 3,
      type: 'info',
      isNew: false,
      title: '📢 ข้อความจากผู้บริหาร',
      body: 'ระบบจะปิดปรับปรุงในวันอังคารนี้ เวลา 22:00 - 06:00',
      time: Date.now() - 2 * 60 * 60 * 1000,
    },
  ];
  return [...shared, ...mock].sort((a, b) => b.time - a.time);
}

// TODO(PostgreSQL):
//   UPDATE notifications SET is_read = true WHERE id = $1
export async function markTeacherNotificationRead(notificationId: number): Promise<void> {
  markSharedNotificationRead(notificationId);
}
