/**
 * PII scanner / redactor (spec 5.M5, 7.3) — heuristic regex ล้วน
 * ครอบคลุม: เลขบัตร ปชช. 13 หลัก (+ checksum), รหัสนักศึกษา, อีเมล, เบอร์โทร
 * ข้อจำกัด: ยังไม่มี NER จับชื่อคน (Phase B)
 */
import type { PiiFinding, PiiKind } from '../types';

/** ตรวจ checksum เลขบัตรประชาชนไทย */
export function isValidThaiId(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

interface Detector { kind: PiiKind; token: string; re: RegExp; accept?: (m: string) => boolean }

const DETECTORS: Detector[] = [
  // รูปแบบมีขีด x-xxxx-xxxxx-xx-x → ติดธงเสมอ (ข้อมูลทดสอบอาจ checksum ไม่ผ่าน)
  { kind: 'thai_id', token: '[ID_CARD]', re: /(?<!\d)\d[- ]\d{4}[- ]\d{5}[- ]\d{2}[- ]\d(?!\d)/g },
  // 13 หลักติดกัน → ต้องผ่าน checksum
  { kind: 'thai_id', token: '[ID_CARD]', re: /(?<![\d-])\d{13}(?![\d-])/g, accept: m => isValidThaiId(m) },
  { kind: 'email', token: '[EMAIL]', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // รหัสนักศึกษา: มี keyword นำ หรือ 9–10 หลักขึ้นต้น 4–6
  { kind: 'student_id', token: '[STUDENT_ID]', re: /(?:รหัสนักศึกษา|รหัสนิสิต|student\s*(?:id|code|no\.?)|std\.?\s*id)\s*[:：]?\s*\d{7,10}/gi },
  { kind: 'student_id', token: '[STUDENT_ID]', re: /(?<![\d,.-])[4-6]\d{8,9}(?![\d,.-])/g },
  // เบอร์โทร: 0x-xxx-xxxx / 0xx-xxx-xxxx / 10 หลักขึ้นต้น 0
  { kind: 'phone', token: '[PHONE]', re: /(?<![\d-])0\d{1,2}[- ]?\d{3}[- ]?\d{3,4}(?![\d-])/g },
];

function mask(s: string): string {
  const t = s.trim();
  return t.length <= 4 ? '****' : t.slice(0, 2) + '*'.repeat(Math.max(2, t.length - 4)) + t.slice(-2);
}

/** รวมช่วงที่ซ้อนกันเพื่อไม่นับซ้ำ (เช่น เลขบัตรถูกจับเป็น phone ด้วย) */
function collect(text: string): { kind: PiiKind; token: string; start: number; end: number; raw: string }[] {
  const hits: { kind: PiiKind; token: string; start: number; end: number; raw: string }[] = [];
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.re.exec(text))) {
      if (d.accept && !d.accept(m[0])) continue;
      hits.push({ kind: d.kind, token: d.token, start: m.index, end: m.index + m[0].length, raw: m[0] });
    }
  }
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const out: typeof hits = [];
  let lastEnd = -1;
  for (const h of hits) { if (h.start >= lastEnd) { out.push(h); lastEnd = h.end; } }
  return out;
}

export function scanPii(text: string): PiiFinding[] {
  const byKind = new Map<PiiKind, PiiFinding>();
  for (const h of collect(text || '')) {
    const f = byKind.get(h.kind);
    if (f) f.count++; else byKind.set(h.kind, { kind: h.kind, count: 1, sample: mask(h.raw) });
  }
  return Array.from(byKind.values());
}

export function redactPii(text: string): { text: string; count: number } {
  const src = text || '';
  const hits = collect(src);
  let out = '', pos = 0;
  for (const h of hits) { out += src.slice(pos, h.start) + h.token; pos = h.end; }
  out += src.slice(pos);
  return { text: out, count: hits.length };
}
