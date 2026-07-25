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
  category: string;   // หน่วย/บทเรียน เช่น "บทที่ 1" — '' = ยังไม่จัดหมวด
  pinned: boolean;    // ปักหมุดให้เด่นบนสุด
  views: number;      // จำนวนครั้งที่นักเรียนเปิดดู
  teacherName: string;
  createdAt: number;
  updatedAt?: number;
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

/** เติมค่า default ให้ข้อมูลเก่าที่ยังไม่มีฟิลด์ใหม่ (category/pinned/views) */
function normalize(m: Material): Material {
  return { ...m, category: m.category ?? '', pinned: m.pinned ?? false, views: m.views ?? 0 };
}

// TODO(PostgreSQL): SELECT * FROM materials WHERE class_id = $1 ORDER BY is_pinned DESC, created_at DESC
export function getMaterials(classId: string): Material[] {
  return load().materials
    .filter(m => m.classId === classId)
    .map(normalize)
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.createdAt - a.createdAt));
}

// TODO(PostgreSQL): INSERT INTO materials (class_id, type, title, description, url, category, is_pinned, created_by) VALUES (...)
export function createMaterial(
  data: Omit<Material, 'id' | 'createdAt' | 'views' | 'pinned'> & { pinned?: boolean },
): Material {
  const store = load();
  const item: Material = { ...data, pinned: data.pinned ?? false, views: 0, id: Date.now(), createdAt: Date.now() };
  store.materials.unshift(item);
  save(store);
  notifyClass(data.classId, `สื่อการสอนใหม่`, `${data.teacherName} เพิ่ม "${data.title}" — ดูได้ที่หน้าห้องเรียน`);
  return item;
}

// TODO(PostgreSQL): UPDATE materials SET ... WHERE id = $1 AND created_by = $2
export function updateMaterial(id: number, patch: Partial<Omit<Material, 'id' | 'classId' | 'createdAt'>>): void {
  const store = load();
  store.materials = store.materials.map(m => (m.id === id ? { ...normalize(m), ...patch, updatedAt: Date.now() } : m));
  save(store);
}

/** สลับปักหมุด — ให้สื่อสำคัญเด่นบนสุด */
export function toggleMaterialPin(id: number): void {
  const store = load();
  store.materials = store.materials.map(m => (m.id === id ? { ...normalize(m), pinned: !normalize(m).pinned } : m));
  save(store);
}

/** เพิ่มยอดเข้าชม — เรียกจากฝั่งนักเรียนเมื่อกดเปิดสื่อ
 *  TODO(PostgreSQL): UPDATE materials SET views = views + 1 WHERE id = $1 */
export function incrementMaterialViews(id: number): void {
  const store = load();
  store.materials = store.materials.map(m => (m.id === id ? { ...normalize(m), views: normalize(m).views + 1 } : m));
  save(store);
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
