/**
 * Rate limit / งบใช้งาน ของ /api/ai (ในหน่วยความจำของ process เดียว) — pure ยกเว้น Date.now()
 *  - ต่อ IP ต่อนาที  : AI_RATE_PER_IP   (default 20)  — IP ใช้ได้เฉพาะเมื่อ TRUST_PROXY=1 (ไม่งั้นรวมเป็นถังเดียว)
 *  - รวมทุกคนต่อนาที : AI_RATE_GLOBAL   (default 60)  — ไม่ขึ้นกับข้อมูลจาก client
 *  - งบต่อวัน (UTC)  : AI_DAILY_LIMIT   (default 500) — นับเฉพาะครั้งที่เรียก upstream จริง
 * ข้อจำกัด: หลาย instance/serverless ไม่แชร์ตัวนับ → ต้องย้ายไป Redis/DB เมื่อ deploy จริง
 */
const WINDOW_MS = 60_000;
const MAX_KEYS = 5000;

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};
export const limits = () => ({
  perIp: num(process.env.AI_RATE_PER_IP, 20),
  global: num(process.env.AI_RATE_GLOBAL, 60),
  daily: num(process.env.AI_DAILY_LIMIT, 500),
});

const ipHits = new Map<string, number[]>();
let globalHits: number[] = [];
let daily = { day: '', count: 0 };

/** IP ของ client — เชื่อ x-forwarded-for เฉพาะเมื่อ TRUST_PROXY=1 (ใช้ค่าท้ายสุด = ค่าที่ proxy ของเราต่อให้) */
export function clientKey(req: Request): string {
  if (process.env.TRUST_PROXY !== '1') return 'untrusted';
  const xff = req.headers.get('x-forwarded-for');
  const last = xff?.split(',').pop()?.trim();
  return last && last.length <= 64 ? last : 'untrusted';
}

function evict(now: number) {
  if (ipHits.size < MAX_KEYS) return;
  for (const [k, arr] of ipHits) if (!arr.length || now - arr[arr.length - 1] >= WINDOW_MS) ipHits.delete(k);
  // ยังเต็ม → ลบ key เก่าสุดทีละตัว (ลำดับ insert) ไม่ล้างของทุกคน
  while (ipHits.size >= MAX_KEYS) {
    const oldest = ipHits.keys().next().value;
    if (oldest === undefined) break;
    ipHits.delete(oldest);
  }
}

/** true = เกินเพดาน (ต่อ IP หรือรวม) — ครั้งที่ถูกปฏิเสธไม่ถูกนับเพิ่มในตัวนับรวม */
export function rateLimited(key: string, now = Date.now()): boolean {
  const l = limits();
  globalHits = globalHits.filter(t => now - t < WINDOW_MS);
  const arr = (ipHits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (globalHits.length >= l.global || arr.length >= l.perIp) {
    ipHits.delete(key); ipHits.set(key, arr); // refresh ลำดับ (ไม่ถูก evict ก่อนคนที่เงียบ)
    return true;
  }
  arr.push(now); globalHits.push(now);
  ipHits.delete(key);
  evict(now);
  ipHits.set(key, arr);
  return false;
}

/** true = งบรายวันหมด · เรียกก่อนยิง upstream (นับ 1 ครั้งถ้ายังไม่หมด) */
export function dailyExhausted(now = Date.now()): boolean {
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  if (daily.count >= limits().daily) return true;
  daily.count += 1;
  return false;
}

/** สำหรับเทสต์ */
export function resetAiLimits(): void {
  ipHits.clear(); globalHits = []; daily = { day: '', count: 0 };
}
