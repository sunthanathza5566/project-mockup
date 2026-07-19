/**
 * Booking Store — จองหนังสือเล่มจริงจากห้องสมุด
 *
 * Flow: บรรณารักษ์/แอดมิน "นำเข้าหนังสือ" เข้าระบบก่อน (แบ่งตามประเภท + จำนวนเล่ม)
 *       → นักเรียนเห็นรายการตามประเภท → กดจอง → มีเล่มว่าง = "รอรับที่ห้องสมุด"
 *       → เล่มหมด = เข้าคิวรอ → ยกเลิกการจองได้
 *
 * ตอนนี้ catalog ตั้งต้นนำเข้าจากรายการหนังสือห้องสมุด (LIBRARY_BOOKS_MOCK ที่แบ่งประเภทไว้แล้ว)
 * TODO(PostgreSQL): tables: book_catalog(id, title, category, copies), book_reservations(...)
 *   + หน้าแอดมิน "นำเข้าหนังสือ" เรียก importBooks() ด้านล่าง
 */

import { LIBRARY_BOOKS_MOCK } from '../mock-data';
import { pushSharedNotification } from './assignments.store';

const KEY = 'eduflow_booking';

export interface CatalogBook {
  id: number;
  title: string;
  author: string;
  cover: string;      // emoji
  category: string;   // การ์ตูน / ความรู้ / นิทาน
  copies: number;     // จำนวนเล่มจริงในห้องสมุด
}

export interface Reservation {
  id: number;
  bookId: number;
  studentCode: string;
  studentName: string;
  reservedAt: number;
  status: 'ready' | 'waiting' | 'cancelled' | 'pickedup';
}

interface BookingData {
  catalog: CatalogBook[];
  reservations: Reservation[];
}

function isBrowser() { return typeof window !== 'undefined'; }

function load(): BookingData {
  if (!isBrowser()) return { catalog: [], reservations: [] };
  const raw = localStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  // นำเข้าตั้งต้นจากรายการหนังสือห้องสมุด (แบ่งประเภทไว้แล้ว) เล่มละ 1–3 ชุด
  const seeded: BookingData = {
    catalog: LIBRARY_BOOKS_MOCK.map(b => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover,
      category: b.type, copies: 1 + (b.id % 3),
    })),
    reservations: [],
  };
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function save(d: BookingData) { if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(d)); }

// ─── Catalog ──────────────────────────────────────────────────────────────
// TODO(PostgreSQL): SELECT * FROM book_catalog ORDER BY category, title
export function getBookCatalog(): CatalogBook[] {
  return load().catalog;
}

export function getBookCategories(): string[] {
  return ['ทั้งหมด', ...new Set(load().catalog.map(b => b.category))];
}

/** นำเข้าหนังสือเพิ่ม — สำหรับหน้าแอดมิน/บรรณารักษ์ในอนาคต */
// TODO(PostgreSQL): INSERT INTO book_catalog ... (สิทธิ์: แอดมินเท่านั้น)
export function importBooks(books: Omit<CatalogBook, 'id'>[]): void {
  const d = load();
  const nextId = Math.max(0, ...d.catalog.map(b => b.id)) + 1;
  books.forEach((b, i) => d.catalog.push({ ...b, id: nextId + i }));
  save(d);
}

// ─── การจอง ───────────────────────────────────────────────────────────────
function activeReservations(d: BookingData, bookId: number): Reservation[] {
  return d.reservations.filter(r => r.bookId === bookId && (r.status === 'ready' || r.status === 'waiting'));
}

/** เล่มว่างเหลือกี่ชุด (หัก "รอรับ" ที่จองไปแล้ว) */
export function availableCopies(bookId: number): number {
  const d = load();
  const book = d.catalog.find(b => b.id === bookId);
  if (!book) return 0;
  const held = d.reservations.filter(r => r.bookId === bookId && r.status === 'ready').length;
  return Math.max(0, book.copies - held);
}

// TODO(PostgreSQL): INSERT INTO book_reservations ... + ตรวจซ้ำใน transaction
export function reserveBook(bookId: number, studentCode: string, studentName: string): { ok: boolean; status?: 'ready' | 'waiting'; error?: string } {
  const d = load();
  const book = d.catalog.find(b => b.id === bookId);
  if (!book) return { ok: false, error: 'ไม่พบหนังสือเล่มนี้' };
  if (activeReservations(d, bookId).some(r => r.studentCode === studentCode))
    return { ok: false, error: 'คุณจองเล่มนี้ไว้แล้ว' };

  const status: Reservation['status'] = availableCopies(bookId) > 0 ? 'ready' : 'waiting';
  d.reservations.push({ id: Date.now(), bookId, studentCode, studentName, reservedAt: Date.now(), status });
  save(d);

  pushSharedNotification(`student:${studentCode}`, 'info',
    status === 'ready' ? '📚 จองหนังสือสำเร็จ' : '⏳ เข้าคิวรอหนังสือ',
    status === 'ready'
      ? `"${book.title}" — รับได้ที่ห้องสมุดภายใน 3 วัน`
      : `"${book.title}" เล่มหมดชั่วคราว — จะแจ้งเตือนเมื่อถึงคิว`);
  return { ok: true, status };
}

export function getMyReservations(studentCode: string): (Reservation & { book?: CatalogBook })[] {
  const d = load();
  return d.reservations
    .filter(r => r.studentCode === studentCode && r.status !== 'cancelled')
    .sort((a, b) => b.reservedAt - a.reservedAt)
    .map(r => ({ ...r, book: d.catalog.find(b => b.id === r.bookId) }));
}

/** ตำแหน่งคิว (เฉพาะสถานะ waiting) — 1 = คิวถัดไป */
export function queuePosition(reservationId: number): number {
  const d = load();
  const r = d.reservations.find(x => x.id === reservationId);
  if (!r || r.status !== 'waiting') return 0;
  const waiting = d.reservations
    .filter(x => x.bookId === r.bookId && x.status === 'waiting')
    .sort((a, b) => a.reservedAt - b.reservedAt);
  return waiting.findIndex(x => x.id === reservationId) + 1;
}

// TODO(PostgreSQL): UPDATE book_reservations SET status='cancelled' + เลื่อนคิวถัดไปเป็น ready
export function cancelReservation(reservationId: number): void {
  const d = load();
  const r = d.reservations.find(x => x.id === reservationId);
  if (!r) return;
  const wasReady = r.status === 'ready';
  r.status = 'cancelled';
  // เล่มว่างคืน → เลื่อนคิวแรกขึ้นเป็น "รอรับ" + แจ้งเตือน
  if (wasReady) {
    const next = d.reservations
      .filter(x => x.bookId === r.bookId && x.status === 'waiting')
      .sort((a, b) => a.reservedAt - b.reservedAt)[0];
    if (next) {
      next.status = 'ready';
      const book = d.catalog.find(b => b.id === r.bookId);
      pushSharedNotification(`student:${next.studentCode}`, 'info', '📚 ถึงคิวของคุณแล้ว!', `"${book?.title}" พร้อมให้รับที่ห้องสมุดภายใน 3 วัน`);
    }
  }
  save(d);
}
