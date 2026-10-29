/**
 * ชื่อบุคคลบนหน้าจอ (TASK-0002 R2-F7 · V1 m4)
 * - ไม่ใส่ "คุณ" หน้าชื่อที่ขึ้นต้นด้วยคำนำหน้าอยู่แล้ว (อ. ผศ. รศ. ศ. ดร. นพ. พ.ต.อ. นาย นาง นางสาว ว่าที่… / Dr. Prof. Mr. …)
 *   เพื่อไม่ให้เกิด "คุณอ.สมศรี" หรือ "คุณผศ.ดร.…"
 * - ใช้ร่วมทุกหน้าที่เรียกผู้ใช้ด้วย "คุณ" (pure — ไม่มี DOM)
 */

/** คำย่อไทยที่ลงท้ายด้วยจุด (อ. ผศ. รศ. ศ. ดร. นพ. พญ. พ.ต.อ. ร.ต.ท. ฯลฯ) */
const TH_ABBR = /^[ก-ฮะ-์]{1,5}\.(?:[ก-ฮะ-์]{1,5}\.)*/;
/** คำนำหน้าแบบเต็มคำ (ไทย) — นางสาว ต้องมาก่อน นาง */
const TH_WORD = /^(?:นางสาว|นาง|นาย|ว่าที่|ท่าน|คุณ|ศาสตราจารย์|รองศาสตราจารย์|ผู้ช่วยศาสตราจารย์|อาจารย์|ดอกเตอร์)/;
/** คำนำหน้าอังกฤษ ต้องตามด้วยจุดหรือช่องว่าง */
const EN_WORD = /^(?:Dr|Prof|Assoc|Asst|Mr|Mrs|Ms|Miss|Sir)(?:\.|\s)/i;

/** ชื่อขึ้นต้นด้วยคำนำหน้า/ตำแหน่งวิชาการอยู่แล้วหรือไม่ */
export function hasHonorific(fullName: string): boolean {
  const n = fullName.trim();
  return TH_ABBR.test(n) || TH_WORD.test(n) || EN_WORD.test(n);
}

/** ชื่อสำหรับเรียกผู้ใช้: ภาษาไทยเติม "คุณ" เฉพาะเมื่อชื่อยังไม่มีคำนำหน้า · อังกฤษคืนชื่อเดิม */
export function politeName(fullName: string, lang: 'th' | 'en' = 'th'): string {
  const n = fullName.trim();
  if (lang === 'en' || !n || hasHonorific(n)) return n;
  return `คุณ${n}`;
}

/** หลังตัดคำนำหน้าแบบเต็มคำ ส่วนที่เหลือต้องขึ้นต้นด้วยพยัญชนะ/สระหน้า/อักษรอังกฤษ — กันชื่อจริงอย่าง "คุณากร" ถูกตัดผิด */
const NAME_START = /^[\sก-ฮเ-ไA-Za-z]/;

/**
 * ตัดคำนำหน้า/ตำแหน่งวิชาการออกจากชื่อ (R2-F11 · ui m4) เช่น "ผศ.ดร.ปรีชา ใจดี" → "ปรีชา ใจดี", "อ.วิภา" → "วิภา"
 * ตัดซ้ำได้หลายชั้น ("นาย ดร. …") · ถ้าตัดแล้วว่างคืนชื่อเดิม
 */
export function stripHonorific(fullName: string): string {
  let n = fullName.trim();
  for (let i = 0; i < 4; i++) {
    const m = TH_ABBR.exec(n) ?? TH_WORD.exec(n) ?? EN_WORD.exec(n);
    if (!m) break;
    const rest = n.slice(m[0].length);
    if (!rest.trim() || !NAME_START.test(rest)) break;
    n = rest.trim();
  }
  return n || fullName.trim();
}

/** ตัวย่อบน avatar: 2 อักษรแรกของชื่อจริง (ไม่ใช้คำนำหน้า) · ไม่ตัดสระบน/ล่าง/วรรณยุกต์ที่ตามมา */
export function nameInitials(fullName: string): string {
  const s = stripHonorific(fullName).replace(/\s+/g, '');
  const chars = Array.from(s);
  let out = chars.slice(0, 2).join('');
  for (let i = 2; i < chars.length && /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(chars[i]); i++) out += chars[i];
  return out;
}
