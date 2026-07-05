/**
 * Teacher Ratings Store — แบบประเมินการสอนท้ายคาบ (ร่าง / DRAFT)
 *
 * หลักการสำคัญ: **นิรนาม** — ไม่เก็บรหัสหรือชื่อนักเรียนผู้ประเมินเด็ดขาด
 * ครูจะเห็นได้เฉพาะค่าเฉลี่ยรวม ไม่มีทางรู้ว่าใครให้คะแนน
 *
 * TODO(PostgreSQL): table teacher_ratings (id, teacher_name, subject, stars, comment, created_at)
 *   — ห้ามมีคอลัมน์ student_id / ip / device เพื่อคงความนิรนาม
 *   — ป้องกันการให้ซ้ำ: เก็บ hash ฝั่ง client (localStorage) ว่าประเมินคาบนี้ไปแล้ว
 */

const RATINGS_KEY = 'eduflow_teacher_ratings';
const RATED_KEY   = 'eduflow_rated_periods'; // กันประเมินซ้ำฝั่ง client (ไม่ผูกตัวตน)

export interface TeacherRating {
  id: number;
  teacherName: string;
  subject: string;
  stars: number;      // 1–5
  comment: string;
  time: number;
}

function isBrowser() { return typeof window !== 'undefined'; }

// TODO(PostgreSQL): INSERT INTO teacher_ratings (teacher_name, subject, stars, comment) VALUES ($1,$2,$3,$4)
export function submitTeacherRating(teacherName: string, subject: string, stars: number, comment: string): void {
  if (!isBrowser()) return;
  const list: TeacherRating[] = JSON.parse(localStorage.getItem(RATINGS_KEY) || '[]');
  list.push({ id: Date.now(), teacherName, subject, stars, comment, time: Date.now() });
  localStorage.setItem(RATINGS_KEY, JSON.stringify(list));
}

/** เช็คว่าประเมินคาบนี้ (วัน+วิชา+ครู) ไปแล้วหรือยัง — เก็บเฉพาะเครื่องนี้ ไม่ผูกตัวตน */
export function hasRatedToday(teacherName: string, subject: string): boolean {
  if (!isBrowser()) return false;
  const rated: string[] = JSON.parse(localStorage.getItem(RATED_KEY) || '[]');
  return rated.includes(ratedKey(teacherName, subject));
}

export function markRatedToday(teacherName: string, subject: string): void {
  if (!isBrowser()) return;
  const rated: string[] = JSON.parse(localStorage.getItem(RATED_KEY) || '[]');
  rated.push(ratedKey(teacherName, subject));
  localStorage.setItem(RATED_KEY, JSON.stringify(rated));
}

function ratedKey(teacherName: string, subject: string): string {
  return `${new Date().toDateString()}|${teacherName}|${subject}`;
}

/** สรุปค่าเฉลี่ยสำหรับฝั่งครู (อนาคต) — เห็นเฉพาะภาพรวม ไม่เห็นรายคน */
// TODO(PostgreSQL): SELECT AVG(stars), COUNT(*) FROM teacher_ratings WHERE teacher_name = $1
export function getTeacherRatingSummary(teacherName: string): { avg: number | null; count: number } {
  if (!isBrowser()) return { avg: null, count: 0 };
  const list: TeacherRating[] = JSON.parse(localStorage.getItem(RATINGS_KEY) || '[]');
  const mine = list.filter(r => r.teacherName === teacherName);
  if (mine.length === 0) return { avg: null, count: 0 };
  return { avg: mine.reduce((s, r) => s + r.stars, 0) / mine.length, count: mine.length };
}
