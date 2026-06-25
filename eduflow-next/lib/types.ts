// ─── TYPES ─── (พร้อมสำหรับ PostgreSQL)

export type Role = 'web_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface User {
  username: string;
  password: string;
  role: Role;
  name: string;
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
export interface TeacherProfile {
  name: string;
  teacherId: string;
  school: string;
  subject: string;
  academicYear: string;
}

export interface ClassInfo {
  id: string;
  grade: string;
  room: string;
  subject: string;
  key: string;
  icon: string;
  color: string;
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
  classId: string;
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
