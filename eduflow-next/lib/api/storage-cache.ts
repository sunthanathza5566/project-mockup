/**
 * อ่าน JSON จาก localStorage แบบมีแคช
 *
 * ปัญหาที่แก้: store หลายตัวเรียก load() ซ้ำ ๆ ในลูป (เช่น หาห้องของนักเรียนต้องวนทุกห้อง)
 * ทำให้ JSON.parse ก้อนเดิมนับสิบครั้งต่อการ render หนึ่งครั้ง
 *
 * วิธี: จำ "ข้อความดิบ" ที่ parse ไปแล้ว — ถ้าอ่านมาได้ค่าเดิม คืนผลลัพธ์เดิมทันที
 * การอ่าน string จาก localStorage ถูกกว่าการ parse มาก และเทียบ string ทำให้ไม่มีข้อมูลค้าง
 * (เขียนทับจากแท็บอื่นก็ยังเห็นค่าใหม่ เพราะข้อความดิบเปลี่ยน)
 */

interface CacheEntry { raw: string | null; value: unknown }

const cache = new Map<string, CacheEntry>();

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  const raw = localStorage.getItem(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;

  let value: T = fallback;
  if (raw) {
    try { value = JSON.parse(raw) as T; } catch { value = fallback; }
  }
  cache.set(key, { raw, value });
  return value;
}

/** เขียนลง localStorage แล้วอัปเดตแคชให้ตรงกันในจังหวะเดียว */
export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(value);
  localStorage.setItem(key, raw);
  cache.set(key, { raw, value });
}
