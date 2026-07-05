/**
 * Attendance Store — ระบบเช็คชื่อด้วย QR Code แบบครบวงจร
 *
 * Flow จริงที่เชื่อมสองฝั่ง:
 *   ครูสร้าง QR (อายุ 15 นาที) → นักเรียนกรอกโค้ด → ระบบตัดสิน มาตรงเวลา/สาย อัตโนมัติ
 *   → ครูเห็นจำนวนเช็คชื่อสด → สร้างรายงาน + ส่งเก็บประวัติ → แจ้งเตือนครู
 *   → ดูรายงานย้อนหลัง + ดึง Excel ได้เสมอ
 *
 * กติกา: เช็คชื่อภายใน 10 นาทีแรก = มาตรงเวลา, หลังจากนั้น (ถึง 15 นาที) = มาสาย
 *
 * TODO(PostgreSQL): แทนที่ด้วย API routes (app/api/attendance/*)
 *   tables: attendance_sessions, attendance_records, attendance_reports
 */

import type { AttendanceSession, AttendanceRecord, AttendanceReport } from '../types';
import { TEACHER_DATA_MOCK } from '../mock-data';
import { pushSharedNotification } from './assignments.store';

const STORE_KEY = 'eduflow_attendance';

const SESSION_TTL_MS = 15 * 60 * 1000; // QR หมดอายุ 15 นาที
const ON_TIME_WINDOW_MS = 10 * 60 * 1000; // 10 นาทีแรก = มาตรงเวลา

interface AttendanceData {
  sessions: AttendanceSession[];
  records: Record<string, AttendanceRecord[]>; // keyed by sessionId
  reports: AttendanceReport[];
}

function isBrowser() { return typeof window !== 'undefined'; }

function load(): AttendanceData {
  if (!isBrowser()) return { sessions: [], records: {}, reports: [] };
  return JSON.parse(localStorage.getItem(STORE_KEY) || '{"sessions":[],"records":{},"reports":[]}');
}

function save(data: AttendanceData) {
  if (isBrowser()) localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** อัปเดตสถานะ session ที่หมดอายุแล้ว */
function expireStale(data: AttendanceData) {
  const now = Date.now();
  data.sessions.forEach(s => {
    if (s.status === 'active' && s.expiresAt < now) s.status = 'expired';
  });
}

// ─── ฝั่งครู ──────────────────────────────────────────────────────────────

// TODO(PostgreSQL):
//   INSERT INTO attendance_sessions (teacher_id, class_id, subject, period, qr_code, expires_at)
//   VALUES ($1,$2,$3,$4,$5, NOW() + INTERVAL '15 minutes') RETURNING *
export function createAttendanceSession(params: {
  teacherId: string; teacherName: string;
  classId: string; classLabel: string;
  subject: string; period: number;
}): AttendanceSession {
  const data = load();
  expireStale(data);
  const now = Date.now();
  const session: AttendanceSession = {
    id: `sess-${now}`,
    qrCode: `ATT-${now.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    status: 'active',
    ...params,
  };
  data.sessions.unshift(session);
  data.records[session.id] = [];
  save(data);
  return session;
}

// TODO(PostgreSQL): SELECT * FROM attendance_sessions WHERE class_id = $1 ORDER BY created_at DESC LIMIT 20
export function getClassSessions(classId: string): AttendanceSession[] {
  const data = load();
  expireStale(data);
  save(data);
  return data.sessions.filter(s => s.classId === classId);
}

// TODO(PostgreSQL): SELECT * FROM attendance_records WHERE session_id = $1 ORDER BY checked_at
export function getSessionRecords(sessionId: string): AttendanceRecord[] {
  return load().records[sessionId] || [];
}

/** จำนวนนักเรียนทั้งหมดในห้อง (สำหรับนับคนขาด) */
function classStudentCount(classId: string): number {
  return TEACHER_DATA_MOCK.students.filter(s => s.classId === classId).length;
}

// TODO(PostgreSQL):
//   INSERT INTO attendance_reports (...) SELECT ... FROM attendance_records WHERE session_id = $1;
//   UPDATE attendance_sessions SET status = 'submitted' WHERE id = $1
export function submitSessionReport(sessionId: string): AttendanceReport | null {
  const data = load();
  const session = data.sessions.find(s => s.id === sessionId);
  if (!session) return null;

  const records = data.records[sessionId] || [];
  const total = classStudentCount(session.classId);
  const now = Date.now();

  const report: AttendanceReport = {
    id: `rpt-${now}`,
    sessionId,
    teacherId: session.teacherId,
    classId: session.classId,
    classLabel: session.classLabel,
    subject: session.subject,
    period: session.period,
    date: new Date(session.createdAt).toLocaleDateString('th-TH'),
    time: `${new Date(session.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} – ${new Date(session.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
    totalStudents: total,
    presentCount: records.filter(r => r.status === 'on-time').length,
    lateCount: records.filter(r => r.status === 'late').length,
    absentCount: Math.max(total - records.length, 0),
    records,
    submittedAt: now,
  };

  session.status = 'submitted';
  data.reports.unshift(report);
  save(data);

  // แจ้งเตือนครู: รายงานถูกส่งเก็บแล้ว
  pushSharedNotification(
    `teacher:${session.teacherId}`, 'attendance_report',
    'รายงานเช็คชื่อพร้อมแล้ว',
    `${session.subject} ${session.classLabel || ''} คาบ ${session.period} — มา ${report.presentCount} สาย ${report.lateCount} ขาด ${report.absentCount}`,
  );
  return report;
}

// TODO(PostgreSQL):
//   SELECT * FROM attendance_reports WHERE ($1 IS NULL OR class_id = $1) ORDER BY submitted_at DESC
export function getAttendanceReports(classId?: string): AttendanceReport[] {
  const reports = load().reports;
  return classId ? reports.filter(r => r.classId === classId) : reports;
}

// ─── ฝั่งนักเรียน ─────────────────────────────────────────────────────────

// TODO(PostgreSQL): SELECT * FROM attendance_sessions WHERE qr_code = $1 AND expires_at > NOW() AND status = 'active'
export function validateQR(qrCode: string): AttendanceSession | null {
  const data = load();
  expireStale(data);
  save(data);
  const session = data.sessions.find(
    s => s.qrCode.toUpperCase() === qrCode.trim().toUpperCase() && s.status === 'active',
  );
  return session || null;
}

// TODO(PostgreSQL): SELECT * FROM attendance_records WHERE student_code = $1 ORDER BY checked_at DESC
export function getStudentAttendanceRecords(studentCode: string): AttendanceRecord[] {
  const data = load();
  return Object.values(data.records)
    .flat()
    .filter(r => r.studentId === studentCode)
    .sort((a, b) => b.checkedAt - a.checkedAt);
}

export type CheckInResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; reason: 'expired' | 'duplicate' | 'not-found' };

// TODO(PostgreSQL):
//   INSERT INTO attendance_records (session_id, student_code, student_name, checked_at, status)
//   VALUES ($1,$2,$3,NOW(), CASE WHEN NOW() < s.created_at + INTERVAL '10 minutes' THEN 'on-time' ELSE 'late' END)
//   ON CONFLICT (session_id, student_code) DO NOTHING
export function checkIn(sessionId: string, studentCode: string, studentName: string): CheckInResult {
  const data = load();
  expireStale(data);
  const session = data.sessions.find(s => s.id === sessionId);
  if (!session) return { ok: false, reason: 'not-found' };
  if (session.status !== 'active') return { ok: false, reason: 'expired' };

  const records = data.records[sessionId] || (data.records[sessionId] = []);
  if (records.some(r => r.studentId === studentCode)) return { ok: false, reason: 'duplicate' };

  const now = Date.now();
  // ระบบตัดสินเอง: ภายใน 10 นาทีแรก = ตรงเวลา หลังจากนั้น = สาย
  const status: AttendanceRecord['status'] = now - session.createdAt <= ON_TIME_WINDOW_MS ? 'on-time' : 'late';
  const record: AttendanceRecord = {
    id: `rec-${now}`, sessionId, studentId: studentCode, studentName, checkedAt: now, status,
  };
  records.push(record);
  save(data);
  return { ok: true, record };
}
