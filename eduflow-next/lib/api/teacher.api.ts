/**
 * Teacher API — ตอนนี้ใช้ mock data, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * PostgreSQL schema (อนาคต):
 *   teachers, classes, teacher_assignments, submissions, materials, announcements
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import type { ClassInfo, TeacherStudent, TeacherAssignment } from '../types';

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
