/**
 * Assignments Store — "ฐานข้อมูลจำลอง" ที่ฝั่งนักเรียนและครูใช้ร่วมกัน
 *
 * ตอนนี้ใช้ localStorage แทน server เพื่อให้ flow เชื่อมกันจริง:
 *   นักเรียนส่งการบ้าน → ครูเห็น submission + ได้แจ้งเตือน
 *   ครูสั่งการบ้าน     → นักเรียนเห็นงานใหม่ + ได้แจ้งเตือน
 *   ครูให้คะแนน        → นักเรียนเห็นคะแนน + ได้แจ้งเตือน
 *
 * TODO(PostgreSQL): แทนที่ทั้งไฟล์นี้ด้วย API routes (app/api/assignments/*)
 *   tables: assignments, submissions, notifications
 *   ทุกฟังก์ชันด้านล่างมี SQL ที่จะใช้กำกับไว้แล้ว
 */

import type { Assignment, Notification } from '../types';
import { STUDENT_ASSIGNMENTS_MOCK, TEACHER_DATA_MOCK } from '../mock-data';

const ASSIGNMENTS_KEY = 'eduflow_assignments';
const NOTIFS_KEY      = 'eduflow_shared_notifs';

// ─── Types ────────────────────────────────────────────────────────────────
export interface StoredSubmission {
  studentCode: string;
  studentName: string;
  note: string;
  submittedAt: number;
  score: number | null;
  teacherNote: string;
  status: 'submitted' | 'graded';
}

export interface StoredAssignment {
  id: number;
  classId: string;
  key: string;          // subject key เช่น 'math'
  subject: string;
  title: string;
  details: string;
  due: string;          // 'DD/MM/BBBB' (พ.ศ.)
  maxScore: number;
  teacher: string;
  files: number;
  createdAt: number;
  submissions: Record<string, StoredSubmission>; // keyed by studentCode
}

/** แจ้งเตือนที่แชร์กัน — audience เช่น 'student:10021' หรือ 'teacher:T001' */
interface SharedNotification extends Notification {
  audience: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────
function isBrowser() { return typeof window !== 'undefined'; }

function loadAssignments(): StoredAssignment[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(ASSIGNMENTS_KEY);
  if (raw) return JSON.parse(raw);
  const seeded = seedFromMock();
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveAssignments(list: StoredAssignment[]) {
  if (!isBrowser()) return;
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(list));
}

/** แปลง mock ของนักเรียน (class ม.1/1 = c1) เป็นข้อมูลตั้งต้นของ store */
function seedFromMock(): StoredAssignment[] {
  const student = { code: '10021', name: 'ธนาพร สุขใจ' };
  return STUDENT_ASSIGNMENTS_MOCK.map((a: Assignment) => {
    const submissions: Record<string, StoredSubmission> = {};
    if (a.status === 'submitted' || a.status === 'graded') {
      submissions[student.code] = {
        studentCode: student.code,
        studentName: student.name,
        note: '',
        submittedAt: Date.now() - 24 * 60 * 60 * 1000,
        score: a.myScore,
        teacherNote: '',
        status: a.status,
      };
    }
    return {
      id: a.id, classId: 'c1', key: a.key, subject: a.subject,
      title: a.title, details: a.details, due: a.due,
      maxScore: a.maxScore, teacher: a.teacher, files: a.files,
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      submissions,
    };
  });
}

/** แปลง 'DD/MM/BBBB' (พ.ศ.) เป็น Date */
function parseThaiDue(due: string): Date | null {
  const m = due.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(parseInt(m[3]) - 543, parseInt(m[2]) - 1, parseInt(m[1]), 23, 59);
}

// ─── Notifications (shared) ───────────────────────────────────────────────
function loadNotifs(): SharedNotification[] {
  if (!isBrowser()) return [];
  return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]');
}

/** ส่งแจ้งเตือนเข้า shared store — ใช้ได้จากทุก store (การบ้าน, เช็คชื่อ ฯลฯ) */
export function pushSharedNotification(audience: string, type: Notification['type'], title: string, body: string) {
  if (!isBrowser()) return;
  const list = loadNotifs();
  list.unshift({ id: Date.now(), audience, type, isNew: true, title, body, time: Date.now() });
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(list.slice(0, 50)));
}

const pushNotif = pushSharedNotification;

/** ดึงแจ้งเตือนของ audience นั้นๆ — ใช้ผสานกับ mock notifications เดิม */
// TODO(PostgreSQL): SELECT * FROM notifications WHERE audience = $1 ORDER BY created_at DESC
export function getSharedNotifications(audience: string): Notification[] {
  return loadNotifs().filter(n => n.audience === audience);
}

// TODO(PostgreSQL): UPDATE notifications SET is_read = true WHERE id = $1
export function markSharedNotificationRead(id: number) {
  if (!isBrowser()) return;
  const list = loadNotifs();
  const n = list.find(x => x.id === id);
  if (n) { n.isNew = false; localStorage.setItem(NOTIFS_KEY, JSON.stringify(list)); }
}

// ─── Teacher side ─────────────────────────────────────────────────────────

// TODO(PostgreSQL):
//   SELECT a.*, COUNT(s.id) AS submission_count FROM assignments a
//   LEFT JOIN submissions s ON s.assignment_id = a.id
//   WHERE a.class_id = $1 GROUP BY a.id ORDER BY a.created_at DESC
export function getClassAssignmentsStore(classId: string): StoredAssignment[] {
  return loadAssignments()
    .filter(a => a.classId === classId)
    .sort((x, y) => y.createdAt - x.createdAt);
}

// TODO(PostgreSQL):
//   INSERT INTO assignments (class_id, subject_key, title, details, due_date, max_score, created_by)
//   VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
export function createAssignmentStore(data: {
  classId: string; key: string; subject: string; title: string;
  details: string; due: string; maxScore: number; teacher: string;
}): StoredAssignment {
  const list = loadAssignments();
  const assignment: StoredAssignment = {
    ...data, id: Date.now(), files: 0, createdAt: Date.now(), submissions: {},
  };
  list.unshift(assignment);
  saveAssignments(list);

  // แจ้งเตือนนักเรียนทุกคนในห้อง
  TEACHER_DATA_MOCK.students
    .filter(s => s.classId === data.classId)
    .forEach(s => pushNotif(
      `student:${s.code}`, 'hw',
      `งานใหม่: ${data.subject}`,
      `${data.title} — ครบกำหนด ${data.due}`,
    ));
  return assignment;
}

// TODO(PostgreSQL):
//   UPDATE submissions SET score = $1, teacher_note = $2, status = 'graded', graded_at = NOW()
//   WHERE assignment_id = $3 AND student_code = $4
export function gradeSubmissionStore(
  assignmentId: number, studentCode: string, score: number, teacherNote: string,
): void {
  const list = loadAssignments();
  const a = list.find(x => x.id === assignmentId);
  if (!a || !a.submissions[studentCode]) return;
  a.submissions[studentCode].score = score;
  a.submissions[studentCode].teacherNote = teacherNote;
  a.submissions[studentCode].status = 'graded';
  saveAssignments(list);

  pushNotif(
    `student:${studentCode}`, 'grade',
    `คะแนน${a.subject}ออกแล้ว`,
    `${a.title} — ได้ ${score}/${a.maxScore} คะแนน ✨`,
  );
}

// ─── Student side ─────────────────────────────────────────────────────────

/** แปลงข้อมูล store เป็นรูปแบบ Assignment ที่ฝั่งนักเรียนใช้อยู่ */
// TODO(PostgreSQL):
//   SELECT a.*, s.status, s.score FROM assignments a
//   LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_code = $1
//   WHERE a.class_id = (SELECT class_id FROM students WHERE code = $1)
export function getStudentAssignmentsStore(studentCode: string, classId = 'c1'): Assignment[] {
  const now = new Date();
  return loadAssignments()
    .filter(a => a.classId === classId)
    .map(a => {
      const sub = a.submissions[studentCode];
      let status: Assignment['status'] = 'pending';
      let urgency = 'normal';
      if (sub) {
        status = sub.status;
        urgency = 'done';
      } else {
        const dueDate = parseThaiDue(a.due);
        if (dueDate && dueDate < now) { status = 'overdue'; urgency = 'overdue'; }
        else if (dueDate && dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000) urgency = 'soon';
      }
      return {
        id: a.id, key: a.key, subject: a.subject, title: a.title,
        due: a.due, urgency, status, maxScore: a.maxScore,
        myScore: sub?.score ?? null, teacher: a.teacher,
        details: a.details, files: a.files,
      };
    });
}

// TODO(PostgreSQL):
//   INSERT INTO submissions (assignment_id, student_code, note, submitted_at, status)
//   VALUES ($1,$2,$3,NOW(),'submitted')
export function submitAssignmentStore(
  assignmentId: number, studentCode: string, studentName: string, note: string,
): void {
  const list = loadAssignments();
  const a = list.find(x => x.id === assignmentId);
  if (!a) return;
  a.submissions[studentCode] = {
    studentCode, studentName, note,
    submittedAt: Date.now(), score: null, teacherNote: '', status: 'submitted',
  };
  saveAssignments(list);

  // แจ้งเตือนครูเจ้าของวิชา
  pushNotif(
    `teacher:${TEACHER_DATA_MOCK.profile.teacherId}`, 'assignment_submitted',
    'นักเรียนส่งการบ้าน',
    `${studentName} ส่งงาน "${a.title}" แล้ว`,
  );
}
