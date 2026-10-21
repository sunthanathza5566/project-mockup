/**
 * Flush งานที่พิมพ์ค้างก่อนออกจากระบบ / หมดอายุ / ออกจากแท็บอื่น (ADR-UI-001 ข้อ 6.4 M3)
 *
 * - คอมโพเนนต์ที่มีงานค้าง (เช่น SarWorkspace) เรียก `registerFlush(handler)` ตอน mount แล้วเรียก unregister ตอน unmount
 * - handler เป็น sync (saveSection เป็น sync) คืน `null` เมื่อไม่มีอะไรค้าง
 * - AuthContext เรียก `flushAll()` ก่อน logout / redirect ไป /login
 */

export interface FlushResult {
  ok: boolean;
  /** ป้ายของงาน เช่น 'ข้อ 3.6' */
  label: string;
  /** ข้อความ error ภาษาไทย (errMsg) เมื่อ ok = false */
  error?: string;
  /** ข้อความที่ผู้ใช้พิมพ์ค้าง (ภาษาปัจจุบัน) — ใช้กับปุ่ม "คัดลอกข้อความ" เมื่อบันทึกไม่ได้ (6.4) */
  text?: string;
}

/** null = ไม่มีอะไรค้าง */
export type FlushHandler = () => FlushResult | null;

const handlers = new Set<FlushHandler>();

/** ลงทะเบียน handler — คืนฟังก์ชัน unregister */
export function registerFlush(h: FlushHandler): () => void {
  handlers.add(h);
  return () => { handlers.delete(h); };
}

/** เรียกทุก handler แบบ sync — คืนเฉพาะผลที่ไม่ใช่ null (handler ที่ throw ถือว่าไม่สำเร็จ) */
export function flushAll(): FlushResult[] {
  const out: FlushResult[] = [];
  handlers.forEach(h => {
    try {
      const r = h();
      if (r) out.push(r);
    } catch (e) {
      out.push({ ok: false, label: 'งานที่ค้าง', error: e instanceof Error && e.message ? e.message : 'บันทึกไม่สำเร็จ' });
    }
  });
  return out;
}
