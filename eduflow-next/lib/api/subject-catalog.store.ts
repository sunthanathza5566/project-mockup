/**
 * Subject Catalog — คลังรายวิชาของโรงเรียน (สร้างก่อนนำไปจัดลงแผน/ตารางสอน)
 *
 * Pipeline:  จัดการวิชา (ที่นี่) → แผนการเรียน (เลือกวิชาจากคลัง + ใส่วัน/เวลา) → ตารางสอน (ดึงอัตโนมัติ)
 *
 * เก็บนิยามวิชา: รหัสวิชา · ชื่อไทย · ชื่ออังกฤษ (ใช้กับปุ่มสลับภาษา/ครูต่างชาติ) ·
 *   หน่วยกิต · กลุ่มสาระ · ประเภท (พื้นฐาน/เพิ่มเติม/กิจกรรม/ชุมนุม) · วิธีตัดสินผล (เกรด/ผ-มผ)
 *
 * สิทธิ์: manageSubjects (ครูที่แอดมินเปิดสิทธิ์ + school_admin + web_admin)
 * TODO(PostgreSQL): table subjects (school_id, code UNIQUE per school, ...)
 */

import { getSession } from './auth.api';
import { hasPermission } from './permissions';
import { logActivity } from './activity.log';
import { readJSON, writeJSON } from './storage-cache';
import { defaultGradingMode, type SubjectType } from './schedule.store';
import type { GradingMode } from './academic.store';

const STORE_KEY = 'eduflow_subject_catalog';

export interface CatalogSubject {
  id: string;
  code: string;          // รหัสวิชา เช่น ค21101
  name: string;          // ชื่อไทย
  nameEn: string;        // ชื่ออังกฤษ
  credit: number;
  subjectKey: string;    // กลุ่มสาระ (สำหรับสี/ไอคอน)
  subjectType: SubjectType;
  gradingMode: GradingMode;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt?: number;
}

function load(): CatalogSubject[] {
  const list = readJSON<CatalogSubject[]>(STORE_KEY, []);
  return list.length ? list : seed();
}
function save(list: CatalogSubject[]) { writeJSON(STORE_KEY, list); }

/**
 * คลังวิชา ม.1 มาตรฐาน (8 กลุ่มสาระพื้นฐาน + เพิ่มเติม + กิจกรรมพัฒนาผู้เรียน)
 * หน่วยกิตอิงเกณฑ์ สพฐ. ต่อภาคเรียน (40 ชม. = 1.0 นก. · 20 ชม. = 0.5 นก.)
 * — เพื่อให้ครู/แอดมินมีรายวิชาอ้างอิงครบ และ GPA ถ่วงหน่วยกิตได้ถูกต้องตั้งแต่แรก
 */
function seed(): CatalogSubject[] {
  const now = Date.now();
  const base = (code: string, name: string, nameEn: string, credit: number, key: string, type: SubjectType): CatalogSubject => ({
    id: `subj_${code}`, code, name, nameEn, credit, subjectKey: key, subjectType: type,
    gradingMode: defaultGradingMode(type), createdBy: 'system', createdByName: 'ระบบ (ตัวอย่าง)', createdAt: now,
  });
  const seeded = [
    // ── รายวิชาพื้นฐาน 8 กลุ่มสาระ ──
    base('ท21101', 'ภาษาไทย',                        'Thai Language',                1.5, 'thai',    'พื้นฐาน'),
    base('ค21101', 'คณิตศาสตร์พื้นฐาน',              'Basic Mathematics',            1.5, 'math',    'พื้นฐาน'),
    base('ว21101', 'วิทยาศาสตร์และเทคโนโลยี',        'Science & Technology',         1.5, 'science', 'พื้นฐาน'),
    base('ว21102', 'วิทยาการคำนวณ',                  'Computing Science',            0.5, 'com',     'พื้นฐาน'),
    base('ส21101', 'สังคมศึกษา ศาสนาและวัฒนธรรม',    'Social Studies',               1.5, 'social',  'พื้นฐาน'),
    base('ส21102', 'ประวัติศาสตร์',                  'History',                      0.5, 'social',  'พื้นฐาน'),
    base('พ21101', 'สุขศึกษาและพลศึกษา',             'Health & Physical Education',  0.5, 'pe',      'พื้นฐาน'),
    base('ศ21101', 'ศิลปะ',                          'Arts',                         0.5, 'art',     'พื้นฐาน'),
    base('ง21101', 'การงานอาชีพ',                    'Occupations',                  0.5, 'career',  'พื้นฐาน'),
    base('อ21101', 'ภาษาอังกฤษ',                     'English',                      1.5, 'english', 'พื้นฐาน'),
    // ── รายวิชาเพิ่มเติม ──
    base('ค21201', 'คณิตศาสตร์เพิ่มเติม',            'Additional Mathematics',       1.0, 'math',    'เพิ่มเติม'),
    base('อ21201', 'ภาษาอังกฤษเพื่อการสื่อสาร',      'English for Communication',    1.0, 'english', 'เพิ่มเติม'),
    // ── กิจกรรมพัฒนาผู้เรียน (ไม่คิดหน่วยกิต/ไม่คิดเกรด) ──
    base('ก21901', 'กิจกรรมชุมนุม',                  'Club Activity',                0,   'guidance', 'ชุมนุม/ชมรม'),
    base('ก21902', 'ลูกเสือ–เนตรนารี',               'Scout',                        0,   'guidance', 'กิจกรรมพัฒนาผู้เรียน'),
    base('ก21903', 'กิจกรรมแนะแนว',                  'Guidance',                     0,   'guidance', 'กิจกรรมพัฒนาผู้เรียน'),
  ];
  if (typeof window !== 'undefined') writeJSON(STORE_KEY, seeded);
  return seeded;
}

export function getCatalogSubjects(): CatalogSubject[] {
  return [...load()].sort((a, b) => a.code.localeCompare(b.code));
}

export function getCatalogSubject(id: string): CatalogSubject | null {
  return load().find(s => s.id === id) || null;
}

export function canManageSubjects(): boolean {
  return hasPermission('manageSubjects');
}

export type SubjectInput = Omit<CatalogSubject, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>;

export function createCatalogSubject(input: SubjectInput): { ok: true; subject: CatalogSubject } | { ok: false; error: string } {
  if (!canManageSubjects()) return { ok: false, error: '🔒 ไม่มีสิทธิ์จัดการรายวิชา — ติดต่อผู้ดูแลระบบ' };
  if (!input.code.trim())   return { ok: false, error: 'กรุณากรอกรหัสวิชา' };
  if (!input.name.trim())   return { ok: false, error: 'กรุณากรอกชื่อวิชา (ภาษาไทย)' };

  const list = load();
  if (list.some(s => s.code === input.code.trim())) return { ok: false, error: `รหัสวิชา ${input.code.trim()} มีอยู่แล้วในคลัง` };

  const session = getSession();
  const subject: CatalogSubject = {
    ...input,
    code: input.code.trim(), name: input.name.trim(), nameEn: input.nameEn.trim(),
    id: `subj${Date.now()}`,
    createdBy: session?.username || 'unknown',
    createdByName: session?.name || '—',
    createdAt: Date.now(),
  };
  list.push(subject);
  save(list);
  logActivity('teacher', 'เพิ่มรายวิชา', `${subject.name} (${subject.code}) · ${subject.credit} นก.`);
  return { ok: true, subject };
}

export function updateCatalogSubject(id: string, patch: Partial<SubjectInput>): boolean {
  if (!canManageSubjects()) return false;
  const list = load();
  const s = list.find(x => x.id === id);
  if (!s) return false;
  // trim ช่องข้อความก่อนบันทึก (ให้ตรงกับตอนสร้าง) — กันรหัสมีช่องว่างแล้วเลี่ยงการตรวจซ้ำ
  const clean: Partial<SubjectInput> = { ...patch };
  if (clean.code !== undefined)   clean.code = clean.code.trim();
  if (clean.name !== undefined)   clean.name = clean.name.trim();
  if (clean.nameEn !== undefined) clean.nameEn = clean.nameEn.trim();
  if (clean.code && list.some(x => x.id !== id && x.code === clean.code)) return false; // กันรหัสซ้ำ
  Object.assign(s, clean, { updatedAt: Date.now() });
  save(list);
  logActivity('teacher', 'แก้ไขรายวิชา', `${s.name} (${s.code})`);
  return true;
}

export function deleteCatalogSubject(id: string): boolean {
  if (!canManageSubjects()) return false;
  const list = load();
  const s = list.find(x => x.id === id);
  if (!s) return false;
  save(list.filter(x => x.id !== id));
  logActivity('teacher', 'ลบรายวิชา', `${s.name} (${s.code})`);
  return true;
}
