/**
 * E-book Store — เช่าอ่านหนังสืออิเล็กทรอนิกส์ (ต่างจากการจองเล่มจริงใน booking.store)
 *
 * แนวคิด: ไม่ใช่ "จองมารับ" แต่เป็น "เช่าเพื่อเปิดสิทธิ์อ่าน" ตามระยะเวลาที่เลือก
 *   - เช่าแล้วอ่านได้ทันทีในหน้าอ่าน (ออนไลน์)
 *   - หมดเวลาเช่า → สิทธิ์อ่านถูกตัดอัตโนมัติ (คำนวณจากเวลา ไม่ต้องมี job) · อยากอ่านอีกต้องเช่าใหม่
 *   - ประวัติการเช่าถูกบันทึกไว้ (ใคร/หมวด/วันที่/จำนวน) เผื่อระบบแลกแต้มในอนาคต
 *   - แต้มนักอ่าน = จำนวนหนังสือที่ "อ่านจบ" (ไม่นับซ้ำเล่มเดิม) → เลื่อนระดับ bronze→legend
 *
 * TODO(PostgreSQL): tables ebook_rentals(student, book_id, rented_at, expires_at, completed)
 */

import { LIBRARY_BOOKS_MOCK } from '../mock-data';
import { pushSharedNotification } from './assignments.store';
import { readJSON, writeJSON } from './storage-cache';

const KEY = 'eduflow_ebook_rentals';

export interface EbookRental {
  id: number;
  bookId: number;
  bookTitle: string;
  category: string;
  cover: string;
  studentCode: string;
  studentName: string;
  rentedAt: number;
  expiresAt: number;
  durationDays: number;
  completed: boolean;   // อ่านจบแล้ว (อ่านถึงหน้าสุดท้ายในหน้าอ่าน)
}

/** ตัวเลือกระยะเวลาเช่า */
export const RENT_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: '1 วัน' },
  { days: 3, label: '3 วัน' },
  { days: 7, label: '7 วัน' },
  { days: 14, label: '14 วัน' },
];

// ─── ระดับนักอ่าน (แต้ม = จำนวนเล่มที่อ่านจบ ไม่นับซ้ำ) ─────────────────────
export interface ReaderRank { key: string; label: string; icon: string; min: number; color: string }

export const READER_RANKS: ReaderRank[] = [
  { key: 'bronze',   label: 'บรอนซ์',   icon: '🥉', min: 0,  color: '#C4804A' },
  { key: 'silver',   label: 'ซิลเวอร์', icon: '🥈', min: 3,  color: '#9AA3AD' },
  { key: 'gold',     label: 'โกลด์',    icon: '🥇', min: 7,  color: '#D4A93C' },
  { key: 'platinum', label: 'แพลตินัม', icon: '💠', min: 12, color: '#4F9DB0' },
  { key: 'diamond',  label: 'ไดมอนด์',  icon: '💎', min: 20, color: '#5B8DEF' },
  { key: 'master',   label: 'มาสเตอร์', icon: '👑', min: 35, color: '#8A5CD1' },
  { key: 'legend',   label: 'เลเจนด์',  icon: '🏆', min: 50, color: '#B0483C' },
];

// ─── Catalog (จากรายการห้องสมุด) ──────────────────────────────────────────
export interface EbookInfo {
  id: number; title: string; author: string; cover: string;
  category: string; pages: number; desc: string;
}

export function getEbookCatalog(): EbookInfo[] {
  return LIBRARY_BOOKS_MOCK.map(b => ({
    id: b.id, title: b.title, author: b.author, cover: b.cover,
    category: b.type, pages: b.pages, desc: b.desc,
  }));
}

export function getEbookCategories(): string[] {
  return ['ทั้งหมด', ...Array.from(new Set(getEbookCatalog().map(b => b.category)))];
}

// ─── Storage ────────────────────────────────────────────────────────────────
function load(): EbookRental[] { return readJSON<EbookRental[]>(KEY, []); }
function save(list: EbookRental[]) { writeJSON(KEY, list); }

export function isActive(r: EbookRental): boolean {
  return Date.now() < r.expiresAt;
}

/** เวลาที่เหลือของการเช่า (ms) — 0 ถ้าหมดอายุ */
export function remainingMs(r: EbookRental): number {
  return Math.max(0, r.expiresAt - Date.now());
}

// ─── เช่าอ่าน ─────────────────────────────────────────────────────────────
export function rentEbook(bookId: number, days: number, student: { code: string; name: string }):
  { ok: true; rental: EbookRental } | { ok: false; error: string } {
  const book = getEbookCatalog().find(b => b.id === bookId);
  if (!book) return { ok: false, error: 'ไม่พบหนังสือเล่มนี้' };

  const list = load();
  // มีสิทธิ์อ่านเล่มนี้อยู่แล้ว (ยังไม่หมดอายุ) = ไม่ต้องเช่าซ้ำ
  if (list.some(r => r.bookId === bookId && r.studentCode === student.code && isActive(r)))
    return { ok: false, error: 'คุณมีสิทธิ์อ่านเล่มนี้อยู่แล้ว — เปิดอ่านได้เลย' };

  const now = Date.now();
  const rental: EbookRental = {
    id: now, bookId, bookTitle: book.title, category: book.category, cover: book.cover,
    studentCode: student.code, studentName: student.name,
    rentedAt: now, expiresAt: now + days * 24 * 60 * 60 * 1000, durationDays: days, completed: false,
  };
  list.unshift(rental);
  save(list);

  pushSharedNotification(`student:${student.code}`, 'info', '📖 เช่าอ่านสำเร็จ',
    `"${book.title}" — อ่านได้ ${days} วัน · หมดเวลาแล้วสิทธิ์อ่านจะถูกตัดอัตโนมัติ`);
  return { ok: true, rental };
}

/** คืนก่อนกำหนด (เอาออกจากชั้นอ่าน) */
export function returnEbook(id: number): void {
  const list = load();
  const r = list.find(x => x.id === id);
  if (r) { r.expiresAt = Date.now(); save(list); }
}

/** ทำเครื่องหมายว่าอ่านจบ (เรียกเมื่ออ่านถึงหน้าสุดท้าย) */
export function markCompleted(id: number): void {
  const list = load();
  const r = list.find(x => x.id === id);
  if (r && !r.completed) { r.completed = true; save(list); }
}

/** เล่มที่ยังเปิดอ่านได้ตอนนี้ (ชั้นหนังสือของฉัน) */
export function getActiveRentals(studentCode: string): EbookRental[] {
  return load().filter(r => r.studentCode === studentCode && isActive(r)).sort((a, b) => a.expiresAt - b.expiresAt);
}

/** ประวัติการเช่าทั้งหมด (รวมที่หมดอายุแล้ว) */
export function getRentalHistory(studentCode: string): EbookRental[] {
  return load().filter(r => r.studentCode === studentCode).sort((a, b) => b.rentedAt - a.rentedAt);
}

export function getRental(id: number): EbookRental | null {
  return load().find(r => r.id === id) || null;
}

// ─── สถิติ/ระดับนักอ่าน ─────────────────────────────────────────────────────
export interface ReaderStats {
  totalRentals: number;
  booksCompleted: number;      // จำนวนเล่มที่อ่านจบ (ไม่นับซ้ำ) — ใช้คิดระดับ
  byCategory: Record<string, number>;
  rank: ReaderRank;
  nextRank: ReaderRank | null;
  toNext: number;              // อ่านอีกกี่เล่มถึงระดับถัดไป
}

export function getReaderRank(booksCompleted: number): ReaderRank {
  return [...READER_RANKS].reverse().find(r => booksCompleted >= r.min) || READER_RANKS[0];
}

export function getReaderStats(studentCode: string): ReaderStats {
  const history = getRentalHistory(studentCode);
  const completedBookIds = new Set(history.filter(r => r.completed).map(r => r.bookId));
  const booksCompleted = completedBookIds.size;

  const byCategory: Record<string, number> = {};
  history.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });

  const rank = getReaderRank(booksCompleted);
  const nextRank = READER_RANKS.find(r => r.min > booksCompleted) || null;
  return {
    totalRentals: history.length,
    booksCompleted,
    byCategory,
    rank,
    nextRank,
    toNext: nextRank ? nextRank.min - booksCompleted : 0,
  };
}

/** เนื้อหาจำลองของหนังสือสำหรับหน้าอ่าน (ยังไม่มีไฟล์จริง) */
export function getBookPages(bookId: number): string[] {
  const book = getEbookCatalog().find(b => b.id === bookId);
  if (!book) return [];
  const intro = `${book.title}\nโดย ${book.author}\n\n${book.desc}`;
  const pages = [intro];
  for (let i = 2; i <= Math.max(book.pages, 4); i++) {
    pages.push(`หน้า ${i}\n\n(เนื้อหาตัวอย่างของ "${book.title}" — ระบบสาธิต ยังไม่มีไฟล์จริง)\n\nเมื่อเชื่อมฐานข้อมูลจริง หน้านี้จะแสดงเนื้อหาหนังสืออิเล็กทรอนิกส์ที่อัปโหลดไว้`);
  }
  return pages;
}
