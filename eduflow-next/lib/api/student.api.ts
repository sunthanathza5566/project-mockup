/**
 * Student API — ตอนนี้ใช้ mock data, พร้อมเปลี่ยนเป็น PostgreSQL
 *
 * PostgreSQL schema (อนาคต):
 *   students, attendance_records, assignments, submissions,
 *   shop_items, cart_items, library_books, reading_progress
 */

import type { StudentProfile, StudentStats, Assignment, Notification } from '../types';
import {
  STUDENT_PROFILE_MOCK, STUDENT_STATS_MOCK, STUDENT_SCHEDULE_MOCK,
  STUDENT_SUBJECTS_MOCK, STUDENT_ASSIGNMENTS_MOCK, STUDENT_ATTENDANCE_MOCK,
  SHOP_ITEMS_MOCK, SHOP_CATS, LIBRARY_BOOKS_MOCK, NOTIFICATIONS_MOCK,
} from '../mock-data';

// ─── Profile ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM students WHERE student_code = $1
export async function getStudentProfile(studentCode: string): Promise<StudentProfile> {
  return { ...STUDENT_PROFILE_MOCK };
}

// TODO(PostgreSQL): UPDATE students SET ... WHERE student_code = $1
export async function updateStudentProfile(studentCode: string, data: Partial<StudentProfile>): Promise<void> {
  console.log('TODO: updateStudentProfile', studentCode, data);
}

// ─── Stats ────────────────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึง aggregate จาก attendance_records และ assignments
export async function getStudentStats(studentCode: string): Promise<StudentStats> {
  return { ...STUDENT_STATS_MOCK };
}

// ─── Schedule ─────────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   SELECT s.*, sub.name, sub.teacher_name, c.room_number
//   FROM schedule s
//   JOIN subjects sub ON s.subject_id = sub.id
//   WHERE s.class_id = $1 AND s.day_of_week = $2
export async function getStudentSchedule(classId: string) {
  return { ...STUDENT_SCHEDULE_MOCK };
}

// ─── Subjects ─────────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   SELECT sub.*, COUNT(a.id) as assign_count, ...
//   FROM enrollments e JOIN subjects sub ON e.subject_id = sub.id
//   WHERE e.student_id = $1
export async function getStudentSubjects(studentCode: string) {
  return [...STUDENT_SUBJECTS_MOCK];
}

// ─── Assignments ──────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   SELECT a.*, s.status, s.score, s.submitted_at
//   FROM assignments a
//   LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = $1
//   WHERE a.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1)
export async function getStudentAssignments(studentCode: string): Promise<Assignment[]> {
  return [...STUDENT_ASSIGNMENTS_MOCK];
}

// TODO(PostgreSQL):
//   INSERT INTO submissions (assignment_id, student_id, note, file_urls, submitted_at)
//   VALUES ($1, $2, $3, $4, NOW())
export async function submitAssignment(
  assignmentId: number, studentCode: string, note: string, files: File[]
): Promise<void> {
  console.log('TODO: submitAssignment', { assignmentId, studentCode, note, files: files.length });
}

// ─── Attendance ───────────────────────────────────────────────────────────
// TODO(PostgreSQL):
//   SELECT day_of_week, status FROM attendance_records
//   WHERE student_id = $1 AND week_number = current_week()
export async function getStudentAttendance(studentCode: string) {
  return { ...STUDENT_ATTENDANCE_MOCK };
}

// ─── Shop ─────────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM shop_items WHERE is_available = true ORDER BY category
export async function getShopItems() {
  return { cats: SHOP_CATS, items: [...SHOP_ITEMS_MOCK] };
}

// TODO(PostgreSQL):
//   BEGIN;
//   UPDATE students SET balance = balance - $1 WHERE id = $2 AND balance >= $1;
//   INSERT INTO orders (student_id, items_json, total, status) VALUES ($2, $3, $1, 'pending');
//   COMMIT;
export async function placeOrder(
  studentCode: string, cart: Record<number, number>, total: number
): Promise<{ success: boolean; newBalance: number }> {
  const currentBalance = STUDENT_STATS_MOCK.balance;
  if (currentBalance < total) return { success: false, newBalance: currentBalance };
  STUDENT_STATS_MOCK.balance -= total;
  return { success: true, newBalance: STUDENT_STATS_MOCK.balance };
}

// ─── Library ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM books ORDER BY type, title
export async function getLibraryBooks() {
  return [...LIBRARY_BOOKS_MOCK];
}

// TODO(PostgreSQL):
//   INSERT INTO reading_progress (student_id, book_id, completed_at)
//   VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING
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
// TODO(PostgreSQL):
//   SELECT * FROM notifications WHERE student_id = $1
//   AND created_at > NOW() - INTERVAL '3 days'
//   ORDER BY created_at DESC
export async function getNotifications(studentCode: string): Promise<Notification[]> {
  const TTL = 3 * 24 * 60 * 60 * 1000;
  return NOTIFICATIONS_MOCK.filter(n => Date.now() - n.time < TTL)
    .sort((a, b) => b.time - a.time);
}

// TODO(PostgreSQL): UPDATE notifications SET is_read = true WHERE id = $1
export async function markNotificationRead(notifId: number): Promise<void> {
  const n = NOTIFICATIONS_MOCK.find(x => x.id === notifId);
  if (n) n.isNew = false;
}

// ─── Balance ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT balance FROM students WHERE student_code = $1
export async function getStudentBalance(studentCode: string): Promise<number> {
  return STUDENT_STATS_MOCK.balance;
}

// TODO(PostgreSQL):
//   UPDATE students SET balance = balance + $1 WHERE student_code = $2
export async function topUpBalance(studentCode: string, amount: number): Promise<number> {
  STUDENT_STATS_MOCK.balance += amount;
  return STUDENT_STATS_MOCK.balance;
}
