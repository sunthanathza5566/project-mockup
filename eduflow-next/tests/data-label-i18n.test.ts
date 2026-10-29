/**
 * TASK-0002 R2-F15 — ป้ายคอลัมน์ของตารางโหมดการ์ด (`data-label`) ต้องแปลได้เมื่อเลือก English
 * - dom-translate แปล attribute `data-label` (แสดงผ่าน CSS `content: attr(data-label)`)
 * - ทุกค่า `data-label="…"` ในซอร์ส app/ + components/ ต้องมีคำแปลใน dict หรือเป็นอังกฤษอยู่แล้ว (ไม่มีอักษรไทย)
 * วิธี: อ่านไฟล์จริงจากดิสก์แล้ว grep (ไม่ build) · มีเคส negative ยืนยันว่าตัวจับทำงาน
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { lookupEn } from '@/lib/i18n/dict';

const ROOT = path.resolve(__dirname, '..');
const THAI = /[฀-๿]/;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const FILES = ['app', 'components'].flatMap(walk);
const STATIC_RE = /data-label="([^"]*)"/g;
const DYNAMIC_RE = /data-label=\{/g;

function collect(src: string): string[] {
  return [...src.matchAll(STATIC_RE)].map(m => m[1]);
}

/** ค่าที่ไม่ผ่าน: ไม่มีใน dict และยังมีอักษรไทย */
function untranslated(values: string[]): string[] {
  return values.filter(v => lookupEn(v) === undefined && THAI.test(v));
}

const ALL = new Map<string, string[]>(); // value -> files
const DYNAMIC: string[] = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const v of collect(src)) ALL.set(v, [...(ALL.get(v) ?? []), f.split(path.sep).join('/')]);
  if (DYNAMIC_RE.test(src)) DYNAMIC.push(f);
  DYNAMIC_RE.lastIndex = 0;
}

describe('R2-F15 data-label i18n', () => {
  it('dom-translate แปล attribute data-label (อยู่ใน ATTRS)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/i18n/dom-translate.ts'), 'utf8');
    const m = src.match(/const ATTRS = \[([^\]]*)\]/);
    expect(m, 'ไม่พบ ATTRS ใน dom-translate.ts').not.toBeNull();
    expect(m![1]).toContain("'data-label'");
  });

  it('พบ data-label ในซอร์สจำนวนสมเหตุสมผล (ตัวจับทำงาน)', () => {
    expect(ALL.size).toBeGreaterThanOrEqual(30);
    // ค่าที่ HANDOFF ระบุ (review-table)
    for (const v of ['ข้อ', 'รอบ', 'ส่งโดย', 'สรุป']) expect(ALL.has(v), v).toBe(true);
  });

  it('ไม่มี data-label แบบ expression ที่ตรวจด้วย grep ไม่ได้ (ถ้ามีต้องเพิ่มเคส)', () => {
    expect(DYNAMIC).toEqual([]);
  });

  it('ทุกค่า data-label มีคำแปลใน dict หรือเป็นอังกฤษอยู่แล้ว', () => {
    const bad = untranslated([...ALL.keys()]).map(v => `${v} (${ALL.get(v)!.join(', ')})`);
    expect(bad, 'data-label ที่จะค้างเป็นไทยเมื่อเลือก English').toEqual([]);
  });

  it('ค่าที่ HANDOFF ระบุแปลตรง: ข้อ/รอบ/ส่งโดย/สรุป → Req./Cycle/Submitted by/Summary', () => {
    expect(['ข้อ', 'รอบ', 'ส่งโดย', 'สรุป'].map(v => lookupEn(v))).toEqual(['Req.', 'Cycle', 'Submitted by', 'Summary']);
  });

  it('negative: ตัวตรวจจับค่าไทยที่ไม่มีใน dict และปล่อยค่าอังกฤษ', () => {
    expect(collect('<td data-label="คอลัมน์ทดสอบไม่มีในพจนานุกรม">x</td><td data-label="CLO">y</td>'))
      .toEqual(['คอลัมน์ทดสอบไม่มีในพจนานุกรม', 'CLO']);
    expect(untranslated(['คอลัมน์ทดสอบไม่มีในพจนานุกรม', 'CLO', 'ข้อ'])).toEqual(['คอลัมน์ทดสอบไม่มีในพจนานุกรม']);
  });
});
