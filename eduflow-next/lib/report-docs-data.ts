/**
 * ประกอบ "ข้อมูล" เอกสาร ปพ. จากคะแนน/เกรดที่มีอยู่จริงในระบบ
 * อ้างอิงโครงสร้างตาม PP1-6_spec.md (หลักสูตรแกนกลางฯ 2551)
 *
 * ปพ.1/3 เป็นเอกสารควบคุม — ระบบทำหน้าที่ "รวบรวม+คำนวณข้อมูล" แล้วแสดง/พิมพ์
 * ปพ.4/6 สถานศึกษาออกแบบเองได้ · ปพ.5 = Excel (มีอยู่แล้ว)
 *
 * ฟิลด์ที่ระบบยังไม่มีข้อมูลจริง (เลขบัตร ปชช., ชื่อบิดามารดา ฯลฯ) เว้นเป็นช่องว่าง
 * ให้ครูเติม — ไม่กุข้อมูลปลอมลงเอกสารราชการ
 * TODO(PostgreSQL): ดึงฟิลด์เหล่านี้จากตาราง students จริง
 */

import {
  getClassroomStudents, getStudentGrades, calcGPA, type StudentGradeRow,
} from '@/lib/api/academic.store';
import { getAssessment, CHARACTERISTIC_NAMES } from '@/lib/api/assessment.store';
import { getDocSettings, type DocSettings } from '@/components/teacher/DocSettingsView';

export interface DocStudent { code: string; name: string; }

/** รายชื่อนักเรียนในห้อง (ใช้เลือกก่อนออกเอกสารรายบุคคล + ทำ ปพ.3) */
export function roomStudents(classroomId: string): DocStudent[] {
  return getClassroomStudents(classroomId).map(s => ({ code: s.code, name: s.name }));
}


export interface DocMeta {
  settings: DocSettings;
  classroomLabel: string;   // เช่น ม.1/1
  academicYear: string;
  issueDate: string;        // วันที่ออกเอกสาร (วันนี้)
}

function issueToday(): string {
  return new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function docMeta(classroomLabel: string, academicYear: string): DocMeta {
  return { settings: getDocSettings(), classroomLabel, academicYear, issueDate: issueToday() };
}

// ─── ปพ.1 ระเบียนแสดงผลการเรียน (Transcript) ──────────────────────────────
export interface TranscriptData {
  student: DocStudent;
  rows: StudentGradeRow[];      // รายวิชา + เกรด
  gradedRows: StudentGradeRow[]; // เฉพาะที่คิดเกรด (มีค่าเป็นตัวเลข)
  gpax: number | null;
  totalCourses: number;
}

export function buildTranscript(s: DocStudent): TranscriptData {
  const rows = getStudentGrades(s.code);
  const gradedRows = rows.filter(r => r.grade !== '—' && !r.isSpecial);
  return { student: s, rows, gradedRows, gpax: calcGPA(rows), totalCourses: rows.length };
}

// ─── ปพ.6 สมุดพก (รายงานผลรายบุคคล) ───────────────────────────────────────
export interface ReportCardData {
  student: DocStudent;
  rows: StudentGradeRow[];
  gpax: number | null;
}
export function buildReportCard(s: DocStudent): ReportCardData {
  const rows = getStudentGrades(s.code);
  return { student: s, rows, gpax: calcGPA(rows) };
}

// ─── ปพ.4 ผลการพัฒนาคุณลักษณะอันพึงประสงค์ ────────────────────────────────
export interface CharacteristicsData {
  student: DocStudent;
  items: { no: number; name: string; result: string }[];
  overall: string;
}
export function buildCharacteristics(s: DocStudent): CharacteristicsData {
  const a = getAssessment(s.code);
  return {
    student: s,
    items: CHARACTERISTIC_NAMES.map((name, i) => ({ no: i + 1, name, result: a?.characteristics[i] || '' })),
    overall: a?.characteristicsOverall || '',
  };
}

// ─── ปพ.3 แบบรายงานผู้สำเร็จการศึกษา (รายชื่อทั้งห้อง) ─────────────────────
export interface GraduationRosterRow {
  no: number;
  student: DocStudent;
  gpax: number | null;
}
export function buildGraduationRoster(classroomId: string): GraduationRosterRow[] {
  return roomStudents(classroomId).map((s, i) => ({
    no: i + 1, student: s, gpax: calcGPA(getStudentGrades(s.code)),
  }));
}

/** ปพ. ที่ออกเป็นเอกสารรายบุคคล (ต้องเลือกนักเรียนก่อน) */
export const PER_STUDENT_DOCS = new Set(['pp1', 'pp2', 'pp4', 'pp6']);
/** ปพ. ที่ทำงานได้จริงแล้วในระบบ (นอกเหนือจาก ปพ.5 ที่เป็น Excel) */
export const IMPLEMENTED_DOCS = new Set(['pp1', 'pp2', 'pp3', 'pp4', 'pp6']);
