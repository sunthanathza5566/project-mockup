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

/** วิชาตัวอย่างชุดเล็ก เพื่อให้ครูเห็นรูปแบบและใช้จัดแผนได้ทันที */
function seed(): CatalogSubject[] {
  const now = Date.now();
  const base = (code: string, name: string, nameEn: string, credit: number, key: string, type: SubjectType): CatalogSubject => ({
    id: `subj_${code}`, code, name, nameEn, credit, subjectKey: key, subjectType: type,
    gradingMode: defaultGradingMode(type), createdBy: 'system', createdByName: 'ระบบ (ตัวอย่าง)', createdAt: now,
  });
  const seeded = [
    base('ค21101', 'คณิตศาสตร์พื้นฐาน', 'Basic Mathematics', 1.5, 'math', 'พื้นฐาน'),
    base('ท21101', 'ภาษาไทย',            'Thai Language',      1.5, 'thai', 'พื้นฐาน'),
    base('ว21101', 'วิทยาศาสตร์',        'Science',            1.5, 'sci',  'พื้นฐาน'),
    base('อ21101', 'ภาษาอังกฤษ',         'English',            1.5, 'eng',  'พื้นฐาน'),
    base('ก21901', 'ชุมนุม',             'Club Activity',      0,   'guidance', 'ชุมนุม/ชมรม'),
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
  if (patch.code && list.some(x => x.id !== id && x.code === patch.code!.trim())) return false; // กันรหัสซ้ำ
  Object.assign(s, patch, { updatedAt: Date.now() });
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
