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

// ขอบตัวเลข: ห้ามมีหลักติดกัน และห้ามเป็นส่วนของเลขที่คั่นด้วย , . - (เช่น 1,200,000 / 85.5 / E-1.1-01)
// แต่ยอมให้จบประโยคด้วย . , - ได้ (ไม่มีหลักตามหลัง)
const NB = String.raw`(?<!\d)(?<!\d[,.\-])`;
const NA = String.raw`(?!\d)(?![,.\-]\d)`;
const SEP = String.raw`[-. ]`; // D-sec A-2: ตัวคั่นขีด จุด ช่องว่าง

const DETECTORS: Detector[] = [
  // รูปแบบคั่น x-xxxx-xxxxx-xx-x (ขีด/จุด/ช่องว่าง) → ติดธงเสมอ (ข้อมูลทดสอบอาจ checksum ไม่ผ่าน)
  { kind: 'thai_id', token: '[ID_CARD]', re: new RegExp(String.raw`${NB}\d${SEP}\d{4}${SEP}\d{5}${SEP}\d{2}${SEP}\d${NA}`, 'g') },
  // 13 หลักติดกัน → ต้องผ่าน checksum
  { kind: 'thai_id', token: '[ID_CARD]', re: new RegExp(String.raw`${NB}\d{13}${NA}`, 'g'), accept: m => isValidThaiId(m) },
  { kind: 'email', token: '[EMAIL]', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // อีเมลเลี่ยงรูป: name[at]uni.ac.th / name (at) uni [dot] ac [dot] th
  { kind: 'email', token: '[EMAIL]', re: /[A-Za-z0-9._%+-]+\s*(?:\[at\]|\(at\)|\{at\})\s*[A-Za-z0-9-]+(?:(?:\.|\s*(?:\[dot\]|\(dot\)|\{dot\})\s*)[A-Za-z0-9-]+)+/gi },
  // รหัสนักศึกษา: มี keyword นำ (รหัส / รหัสประจำตัว / รหัสนักศึกษา / รหัสนิสิต / student id) 7–12 หลัก
  // (lookbehind: แทนเฉพาะตัวเลข คง keyword ไว้ให้ AI รู้บริบท)
  { kind: 'student_id', token: '[STUDENT_ID]', re: /(?<=(?:รหัส(?:ประจำตัว)?(?:นักศึกษา|นิสิต)?|student\s*(?:id|code|no\.?)|std\.?\s*id)\s*[:：]?\s*)(?<!\d)\d{7,12}(?!\d)/gi },
  // ไม่มี keyword: 8–11 หลักขึ้นต้น 4–6 (2 หลักแรก = ปีเข้า พ.ศ.) · ไม่รับเลขกลม (ลงท้าย 0000 = จำนวนเงิน/สถิติ)
  { kind: 'student_id', token: '[STUDENT_ID]', re: new RegExp(String.raw`${NB}[4-6]\d{7,10}${NA}`, 'g'), accept: m => !/0000$/.test(m) },
  // เบอร์โทร: 0x-xxx-xxxx / 0xx-xxx-xxxx / 10 หลักขึ้นต้น 0 (คั่นด้วย - . ช่องว่าง)
  { kind: 'phone', token: '[PHONE]', re: new RegExp(String.raw`${NB}0\d{1,2}${SEP}?\d{3}${SEP}?\d{3,4}${NA}`, 'g'), accept: m => phoneDigits(m, 9, 10) },
  // เบอร์สากล +66 / 0066 (ตัด 0 นำหน้า หรือเขียน (0))
  { kind: 'phone', token: '[PHONE]', re: new RegExp(String.raw`(?<![\d+])(?:\+|00)66${SEP}?(?:\(0\)${SEP}?)?\d{1,2}${SEP}?\d{3}${SEP}?\d{3,4}${NA}`, 'g'), accept: m => {
    // หลังตัด 66 และ (0): เบอร์ไทยเหลือ 8 (บ้าน) หรือ 9 (มือถือ) หลัก
    const n = m.replace(/\D/g, '').replace(/^(?:00)?66/, '').length - (/\(0\)/.test(m) ? 1 : 0);
    return n === 8 || n === 9;
  } },
];

/** เบอร์ไทยในประเทศ: 9 (บ้าน 0x-xxx-xxxx) หรือ 10 หลัก (มือถือ) — 8 หลักขึ้นต้น 0 = รหัสวิชา/อื่น ๆ */
function phoneDigits(m: string, min: number, max: number): boolean {
  const n = m.replace(/\D/g, '').length;
  return n >= min && n <= max;
}

/**
 * D-sec A-2: แปลงเลขไทย ๐–๙ และอักขระ full-width (０–９ ＠ ＋ － ． ＿ Ａ–Ｚ ａ–ｚ) เป็น ASCII ก่อนตรวจ
 * แทนที่ 1 code unit ต่อ 1 code unit → ตำแหน่งตรงกับข้อความต้นฉบับ (redact ตัดจากต้นฉบับได้ตรงช่วง)
 */
export function normalizeForPii(text: string): string {
  return (text || '').replace(/[๐-๙]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x0E50 + 48))
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ');
}

function mask(s: string): string {
  const t = s.trim();
  return t.length <= 4 ? '****' : t.slice(0, 2) + '*'.repeat(Math.max(2, t.length - 4)) + t.slice(-2);
}

/** รวมช่วงที่ซ้อนกันเพื่อไม่นับซ้ำ (เช่น เลขบัตรถูกจับเป็น phone ด้วย) */
function collect(text: string): { kind: PiiKind; token: string; start: number; end: number; raw: string }[] {
  const hits: { kind: PiiKind; token: string; start: number; end: number; raw: string }[] = [];
  const norm = normalizeForPii(text);
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.re.exec(norm))) {
      if (d.accept && !d.accept(m[0])) continue;
      hits.push({ kind: d.kind, token: d.token, start: m.index, end: m.index + m[0].length, raw: text.slice(m.index, m.index + m[0].length) });
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
