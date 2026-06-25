/**
 * Teacher API — ตอนนี้ใช้ mock data, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * PostgreSQL schema (อนาคต):
 *   teachers, classes, teacher_assignments, submissions, materials, announcements
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import type { ClassInfo, TeacherStudent, TeacherAssignment, AttendanceSession, AttendanceRecord, AttendanceReport } from '../types';

// TODO(PostgreSQL): SELECT * FROM teachers WHERE user_id = $1
export async function getTeacherProfile(teacherId: string) {
  return { ...TEACHER_DATA_MOCK.profile };
}

// TODO(PostgreSQL):
//   SELECT c.*, sub.name as subject_name, sub.key
//   FROM teacher_classes tc
//   JOIN classes c ON tc.class_id = c.id
//   JOIN subjects sub ON c.subject_id = sub.id
//   WHERE tc.teacher_id = $1
export async function getTeacherClasses(teacherId: string): Promise<ClassInfo[]> {
  return [...TEACHER_DATA_MOCK.classes];
}

// TODO(PostgreSQL):
//   SELECT * FROM students WHERE class_id = $1 ORDER BY name
export async function getClassStudents(classId: string): Promise<TeacherStudent[]> {
  return TEACHER_DATA_MOCK.students.filter(s => s.classId === classId);
}

// TODO(PostgreSQL):
//   SELECT a.*, COUNT(s.id) as submission_count
//   FROM assignments a
//   LEFT JOIN submissions s ON a.id = s.assignment_id
//   WHERE a.class_id = $1
export async function getClassAssignments(classId: string): Promise<TeacherAssignment[]> {
  return [];
}

// TODO(PostgreSQL):
//   INSERT INTO assignments (class_id, title, description, max_score, due_date, file_required, created_by)
//   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
export async function createAssignment(data: Omit<TeacherAssignment, 'id' | 'submissions'>): Promise<number> {
  console.log('TODO: createAssignment', data);
  return Math.floor(Math.random() * 1000);
}

// TODO(PostgreSQL):
//   UPDATE submissions SET score = $1, teacher_note = $2, status = 'graded'
//   WHERE assignment_id = $3 AND student_id = $4
export async function gradeSubmission(
  assignmentId: number, studentId: string, score: number, note: string
): Promise<void> {
  console.log('TODO: gradeSubmission', { assignmentId, studentId, score, note });
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

// TODO(PostgreSQL):
//   INSERT INTO attendance_sessions (teacher_id, class_id, subject, period, qr_code, created_at, expires_at)
//   VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '15 minutes')
//   RETURNING id, qr_code, expires_at
export async function generateAttendanceQR(
  teacherId: string, classId: string, subject: string, period: number
): Promise<AttendanceSession> {
  const qrCode = `ATT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const now = Date.now();
  const session: AttendanceSession = {
    id: `session-${Date.now()}`,
    teacherId,
    classId,
    subject,
    period,
    qrCode,
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000,
    status: 'active',
  };
  // TODO: บันทึก session ลงฐานข้อมูล
  return session;
}

// TODO(PostgreSQL):
//   SELECT * FROM attendance_sessions WHERE qr_code = $1 AND expires_at > NOW()
export async function validateQRCode(qrCode: string): Promise<AttendanceSession | null> {
  // TODO: ดึงจากฐานข้อมูล ตรวจสอบว่ายังไม่หมดอายุ
  return null;
}

// TODO(PostgreSQL):
//   INSERT INTO attendance_records (session_id, student_id, student_name, checked_at, status)
//   VALUES ($1, $2, $3, NOW(), $4)
export async function recordAttendance(
  sessionId: string, studentId: string, studentName: string, status: 'on-time' | 'late'
): Promise<AttendanceRecord> {
  const record: AttendanceRecord = {
    id: `record-${Date.now()}`,
    sessionId,
    studentId,
    studentName,
    checkedAt: Date.now(),
    status,
  };
  // TODO: บันทึกลงฐานข้อมูล
  return record;
}

// TODO(PostgreSQL):
//   SELECT ar.* FROM attendance_records ar
//   WHERE ar.session_id = $1
export async function getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
  // TODO: ดึงจากฐานข้อมูล
  return [];
}

// TODO(PostgreSQL):
//   SELECT
//     as.id, as.teacher_id, as.class_id, as.subject, as.period,
//     DATE(as.created_at) as date, TO_CHAR(as.created_at, 'HH:MI') as time,
//     (SELECT COUNT(*) FROM attendance_records WHERE session_id = as.id) as total_records,
//     (SELECT COUNT(*) FROM attendance_records WHERE session_id = as.id AND status = 'on-time') as present_count,
//     (SELECT COUNT(*) FROM attendance_records WHERE session_id = as.id AND status = 'late') as late_count,
//     COALESCE((SELECT COUNT(*) FROM students WHERE class_id = as.class_id), 0) -
//     (SELECT COUNT(*) FROM attendance_records WHERE session_id = as.id) as absent_count
//   FROM attendance_sessions as
//   WHERE as.session_id = $1
export async function generateAttendanceReport(
  sessionId: string, teacherId: string, classId: string, subject: string, period: number
): Promise<AttendanceReport> {
  const now = Date.now();
  const records = await getAttendanceRecords(sessionId);
  const totalStudents = 30; // TODO: fetch from DB

  const report: AttendanceReport = {
    id: `report-${Date.now()}`,
    sessionId,
    teacherId,
    classId,
    subject,
    period,
    date: new Date(now).toLocaleDateString('th-TH'),
    time: new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    totalStudents,
    presentCount: records.filter(r => r.status === 'on-time').length,
    lateCount: records.filter(r => r.status === 'late').length,
    absentCount: totalStudents - records.length,
    records,
    submittedAt: now,
  };
  return report;
}

// TODO(PostgreSQL):
//   UPDATE attendance_sessions SET status = 'submitted' WHERE id = $1
//   INSERT INTO attendance_reports (...) VALUES (...)
export async function submitAttendanceReport(report: AttendanceReport): Promise<void> {
  console.log('TODO: submitAttendanceReport', report);
  // TODO: บันทึกรายงานและส่ง notification ให้ครู
}

// TODO(PostgreSQL):
//   SELECT ar.* FROM attendance_reports ar
//   WHERE ar.class_id = $1 AND (ar.date = $2 OR $2 IS NULL)
//   ORDER BY ar.date DESC, ar.period DESC
export async function getAttendanceHistory(classId: string, date?: string) {
  // TODO: ดึงจากฐานข้อมูล
  return [];
}
