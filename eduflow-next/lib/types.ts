// ─── TYPES ─── (พร้อมสำหรับ PostgreSQL)

export type Role = 'web_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface User {
  username: string;
  password: string;
  role: Role;
  name: string;
  email?: string;
  emailVerified?: boolean;  // false = สมัครแล้วยังไม่กดลิงก์ยืนยัน · undefined = บัญชีเก่า/seed ถือว่าผ่านแล้ว
  school?: string;
  code?: string;
  class?: string;
  childCode?: string;
  childName?: string;
  teacherId?: string;
  createdAt?: string;
  seeded?: boolean;
}

export interface Session {
  username: string;
  role: Role;
  name: string;
  school: string;
  code: string;
  childCode: string;   // สำหรับ parent — รหัสนักเรียนของลูก
  childName: string;
  class: string;
  loginAt: number;
}

export interface Permissions {
  teacher: Record<string, boolean>;
  student: Record<string, boolean>;
  parent: Record<string, boolean>;
  school_admin: Record<string, boolean>;
}

// ─── Student ───────────────────────────────────────────
export type AttendanceStatus = 'on-time' | 'late' | 'absent';
export type AssignmentStatus = 'pending' | 'overdue' | 'submitted' | 'graded';

export interface StudentProfile {
  firstName: string;
  lastName: string;
  nickname: string;
  gender: string;
  dob: string;
  bloodType: string;
  studentId: string;
  grade: string;
  room: string;
  academicYear: string;
  school: string;
  address: string;
  phone: string;
  email: string;
  lineId: string;
  religion: string;
  nationality: string;
  citizenId?: string;   // เลขบัตรประชาชน 13 หลัก — ใช้ยืนยันตัวตนตอน web admin เติมเงินตรง
  father: { name: string; phone: string; occupation: string };
  mother: { name: string; phone: string; occupation: string };
  emergencyContact: string;
}

export interface StudentStats {
  attendancePct: number;
  homeworkPending: number;
  balance: number;
  gpa: number;
}

export interface SchedulePeriod {
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  key: string;
}

export interface Subject {
  key: string;
  name: string;
  teacher: string;
  icon: string;
  attend: number;
  midterm: number | null;
  assign: number;
  done: number;
}

/** ประเภทไฟล์ที่ครูกำหนดให้ส่ง: pdf = ใบงาน/เอกสาร, video = คลิปวิดีโอ, slides = สไลด์นำเสนอ */
export type SubmitFileType = 'pdf' | 'video' | 'slides';

export interface Assignment {
  id: number;
  key: string;
  subject: string;
  title: string;
  due: string;
  urgency: string;
  status: AssignmentStatus;
  maxScore: number;
  myScore: number | null;
  teacher: string;
  details: string;
  files: number;
  submitType?: SubmitFileType; // default 'pdf'
}

export interface ShopItem {
  id: number;
  cat: string;
  name: string;
  price: number;
  icon: string;
  avail: boolean;
  hot: boolean;
}

export interface LibraryBook {
  id: number;
  type: string;
  title: string;
  cover: string;
  pages: number;
  author: string;
  desc: string;
  gradeMin: number;
  gradeMax: number;
}

export interface Notification {
  id: number;
  type: 'overdue' | 'grade' | 'info' | 'hw' | 'attendance_report' | 'assignment_submitted';
  isNew: boolean;
  title: string;
  body: string;
  time: number;
  data?: any;
}

// ─── Teacher ───────────────────────────────────────────
export interface EducationRecord {
  level: string;       // เช่น ปริญญาตรี
  major: string;       // วิชาเอก
  institute: string;   // สถาบัน
  year: string;        // ปีที่สำเร็จการศึกษา
}

export interface WorkRecord {
  year: string;        // ช่วงปี เช่น 2560–2564
  position: string;
  place: string;
}

/**
 * ประวัติครูฉบับเต็ม — ฟิลด์เดิม 5 ตัวแรกเป็น required (ของเดิมไม่พัง)
 * ที่เหลือ optional เพราะบัญชีเก่า/บัญชีใหม่ยังไม่ได้กรอก
 */
export interface TeacherProfile {
  name: string;
  teacherId: string;
  school: string;
  subject: string;
  academicYear: string;

  // ── ข้อมูลส่วนบุคคล ──
  prefix?: string;          // คำนำหน้า
  firstName?: string;
  lastName?: string;
  nickname?: string;
  gender?: string;
  dob?: string;             // วัน/เดือน/ปีเกิด
  bloodType?: string;
  citizenId?: string;       // เลขบัตรประชาชน 13 หลัก
  nationality?: string;
  ethnicity?: string;       // เชื้อชาติ
  religion?: string;
  maritalStatus?: string;

  // ── ที่อยู่ & ช่องทางติดต่อ ──
  addressCurrent?: string;  // ที่อยู่ปัจจุบัน
  addressRegistered?: string; // ที่อยู่ตามทะเบียนบ้าน
  phone?: string;
  email?: string;
  lineId?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;

  // ── ข้อมูลสุขภาพ ──
  congenitalDisease?: string; // โรคประจำตัว
  drugAllergy?: string;       // แพ้ยา
  foodAllergy?: string;       // แพ้อาหาร
  healthNote?: string;        // หมายเหตุด้านสุขภาพ

  // ── ข้อมูลการปฏิบัติงาน ──
  position?: string;          // ตำแหน่ง เช่น ครูผู้ช่วย
  academicRank?: string;      // วิทยฐานะ
  subjectGroup?: string;      // กลุ่มสาระการเรียนรู้
  employmentType?: string;    // ประเภทการจ้าง
  startDate?: string;         // วันที่เริ่มปฏิบัติงาน
  teacherLicense?: string;    // เลขที่ใบประกอบวิชาชีพครู
  licenseExpiry?: string;
  homeroomClass?: string;     // ครูที่ปรึกษาประจำชั้น

  // ── ประวัติ ──
  education?: EducationRecord[];
  workHistory?: WorkRecord[];
  trainings?: string[];       // ประวัติการอบรม/พัฒนาตนเอง
  awards?: string[];          // รางวัล/ผลงาน
}

export interface ClassInfo {
  id: string;
  grade: string;
  room: string;
  subject: string;
  key: string;      // กลุ่มสาระ — ใช้เลือกสี/ไอคอน (ซ้ำกันได้หลายวิชา)
  code?: string;    // รหัสวิชา เช่น ค21101 — ตัวระบุวิชาที่แท้จริง (ไม่ซ้ำในห้องเดียวกัน)
  icon: string;
  color: string;
  /** วิธีตัดสินผล: 'numeric' = คิดเกรด · 'symbol' = ผ/มผ (กิจกรรม/ชุมนุม) — มาจากตารางสอน */
  gradingMode?: 'numeric' | 'symbol';
}

export interface TeacherStudent {
  id: string;
  code: string;
  name: string;
  classId: string;
}

export interface Submission {
  studentId: string;
  submittedAt: string;
  score: number | null;
  status: string;
  teacherNote: string;
  studentNote: string;
  files: string[];
  fileCount: number;
}

export interface TeacherAssignment {
  id: number;
  classId: string;
  subject: string;
  key: string;
  semester: number;
  academicYear: string;
  title: string;
  description: string;
  maxScore: number;
  dueDate: string;
  fileRequired: number;
  submissions: Submission[];
}

// ─── Attendance (QR Code) ──────────────────────────────────
export interface AttendanceSession {
  id: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  classLabel?: string;   // เช่น 'ม.1/1'
  subject: string;
  period: number;
  qrCode: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'submitted';
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  checkedAt: number;
  status: 'on-time' | 'late';
}

export interface AttendanceReport {
  id: string;
  sessionId: string;
  teacherId: string;
  classId: string;
  classLabel?: string;   // เช่น 'ม.1/1'
  subject: string;
  period: number;
  date: string;
  time: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  records: AttendanceRecord[];
  submittedAt: number;
}

// ─── School ────────────────────────────────────────────
export interface SchoolReview {
  reviewer: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  product: string;
}

export interface School {
  id: number;
  name: string;
  district: string;
  province: string;
  logo: string;
  level: string;
  rating: number;
  students: number;
  teachers: number;
  tags: string[];
  reviews: SchoolReview[];
}
