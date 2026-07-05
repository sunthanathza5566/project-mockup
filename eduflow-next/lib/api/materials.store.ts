/**
 * Materials Store — สื่อการสอน + ประกาศประจำห้อง
 *
 * Flow: ครูอัปโหลดสื่อ/โพสต์ประกาศ → นักเรียนในห้องเห็นในหน้า "ห้องเรียน" + ได้แจ้งเตือน
 *
 * TODO(PostgreSQL): แทนที่ด้วย API routes (app/api/materials/*)
 *   tables: materials, announcements
 *   ไฟล์จริง → upload ไป storage (S3/Supabase) แล้วเก็บ URL
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import { pushSharedNotification } from './assignments.store';

const STORE_KEY = 'eduflow_materials';

export type MaterialType = 'file' | 'video' | 'link';

export interface Material {
  id: number;
  classId: string;
  type: MaterialType;
  title: string;
  description: string;
  url: string;        // ลิงก์ หรือชื่อไฟล์ (mock — ยังไม่มี storage จริง)
  teacherName: string;
  createdAt: number;
}

export interface Announcement {
  id: number;
  classId: string;
  title: string;
  body: string;
  pinned: boolean;
  teacherName: string;
  createdAt: number;
}

interface MaterialsData {
  materials: Material[];
  announcements: Announcement[];
}

function isBrowser() { return typeof window !== 'undefined'; }

function load(): MaterialsData {
  if (!isBrowser()) return { materials: [], announcements: [] };
  return JSON.parse(localStorage.getItem(STORE_KEY) || '{"materials":[],"announcements":[]}');
}

function save(data: MaterialsData) {
  if (isBrowser()) localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** แจ้งเตือนนักเรียนทุกคนในห้อง */
function notifyClass(classId: string, title: string, body: string) {
  TEACHER_DATA_MOCK.students
    .filter(s => s.classId === classId)
    .forEach(s => pushSharedNotification(`student:${s.code}`, 'info', title, body));
}

// ─── สื่อการสอน ───────────────────────────────────────────────────────────

// TODO(PostgreSQL): SELECT * FROM materials WHERE class_id = $1 ORDER BY created_at DESC
export function getMaterials(classId: string): Material[] {
  return load().materials.filter(m => m.classId === classId);
}

// TODO(PostgreSQL): INSERT INTO materials (class_id, type, title, description, url, created_by) VALUES (...)
export function createMaterial(data: Omit<Material, 'id' | 'createdAt'>): Material {
  const store = load();
  const item: Material = { ...data, id: Date.now(), createdAt: Date.now() };
  store.materials.unshift(item);
  save(store);
  notifyClass(data.classId, `สื่อการสอนใหม่`, `${data.teacherName} เพิ่ม "${data.title}" — ดูได้ที่หน้าห้องเรียน`);
  return item;
}

// TODO(PostgreSQL): DELETE FROM materials WHERE id = $1 AND created_by = $2
export function deleteMaterial(id: number): void {
  const store = load();
  store.materials = store.materials.filter(m => m.id !== id);
  save(store);
}

// ─── ประกาศ ───────────────────────────────────────────────────────────────

// TODO(PostgreSQL): SELECT * FROM announcements WHERE class_id = $1 ORDER BY pinned DESC, created_at DESC
export function getAnnouncements(classId: string): Announcement[] {
  return load().announcements
    .filter(a => a.classId === classId)
    .sort((x, y) => (Number(y.pinned) - Number(x.pinned)) || (y.createdAt - x.createdAt));
}

// TODO(PostgreSQL): INSERT INTO announcements (class_id, title, body, is_pinned, created_by) VALUES (...)
export function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  const store = load();
  const item: Announcement = { ...data, id: Date.now(), createdAt: Date.now() };
  store.announcements.unshift(item);
  save(store);
  notifyClass(data.classId, `📢 ประกาศ: ${data.title}`, data.body.slice(0, 80));
  return item;
}

// TODO(PostgreSQL): DELETE FROM announcements WHERE id = $1 AND created_by = $2
export function deleteAnnouncement(id: number): void {
  const store = load();
  store.announcements = store.announcements.filter(a => a.id !== id);
  save(store);
}
