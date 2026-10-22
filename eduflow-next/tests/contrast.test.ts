/**
 * AC-01 contrast (ADR-UI-001 7.4, tokens.md T1.3 #1–#44) — TASK-0001 U2-Q
 * ย้ายตรรกะจาก `.agents/playtest/u1b/contrast.mjs` แต่ "อ่าน hex จาก :root ใน app/globals.css" แทน hard-code
 * → ถ้ามีคนแก้ token ในโค้ดจนคู่ใดตกเกณฑ์ / ต่างจากตารางเกิน 0.05 เทสต์นี้ล้ม
 * + ตรวจคู่ต้องห้าม 3 คู่ (T1.3) ว่าตกจริง และไม่ถูกใช้เป็นกฎใน CSS
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CSS = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

/** ตัวแปรสีทั้งหมดใน :root แรก (หมวด TOKENS) */
function rootTokens(css: string): Record<string, string> {
  const m = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!m) throw new Error(':root not found in globals.css');
  const out: Record<string, string> = {};
  for (const d of m[1].matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) out[d[1]] = d[2].toUpperCase();
  return out;
}
const T = rootTokens(CSS);

/** ชื่อย่อในตาราง tokens.md → ชื่อ CSS custom property */
const NAME: Record<string, string> = {
  bg: 'c-bg', surface: 'c-surface', 'surface-2': 'c-surface-2', ink: 'c-ink', muted: 'c-muted',
  primary: 'c-primary', 'primary-strong': 'c-primary-strong', 'primary-tint': 'c-primary-tint',
  accent: 'c-accent', 'danger-strong': 'c-danger-strong', 'on-accent': 'c-on-accent', 'accent-tint': 'c-accent-tint',
  'border-control': 'c-border-control', 'on-dark': 'c-on-dark', 'on-dark-muted': 'c-on-dark-muted',
  success: 'c-success', 'success-bg': 'c-success-bg', warn: 'c-warn', 'warn-bg': 'c-warn-bg',
  danger: 'c-danger', 'danger-bg': 'c-danger-bg', info: 'c-info', 'info-bg': 'c-info-bg', white: 'c-white',
};
function hex(name: string): string {
  if (name.startsWith('#')) return name.toUpperCase();
  const v = T[NAME[name]];
  if (!v) throw new Error(`token --${NAME[name] ?? name} not found in :root`);
  return v;
}
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a: string, b: string) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** [#, fg, bg, ค่าในตาราง, เกณฑ์] — T1.3 ตามลำดับในเอกสาร (คู่ที่มีหลายพื้นแตกเป็นหลายแถว) */
type Row = [string, string, string, number, number];
const ROWS: Row[] = [
  ['1', 'ink', 'bg', 14.12, 4.5], ['2', 'ink', 'surface', 14.95, 4.5], ['3', 'ink', 'surface-2', 13.06, 4.5],
  ['4', 'ink', 'accent-tint', 12.77, 4.5], ['5', 'muted', 'bg', 6.88, 4.5], ['6', 'muted', 'surface', 7.29, 4.5],
  ['7', 'muted', 'surface-2', 6.36, 4.5], ['8', 'muted', 'primary-tint', 6.12, 4.5], ['9', '#FFFFFF', 'primary', 7.47, 4.5],
  ['10', '#FFFFFF', 'primary-strong', 10.74, 4.5], ['11', 'primary', 'bg', 7.05, 4.5], ['12', 'primary', 'surface', 7.47, 4.5],
  ['13', 'primary', 'surface-2', 6.52, 4.5], ['14', 'primary', 'primary-tint', 6.28, 4.5], ['15', 'primary-strong', 'primary-tint', 9.03, 4.5],
  ['16', 'on-accent', 'accent', 6.71, 4.5], ['17', 'on-dark', 'primary-strong', 10.14, 4.5], ['18', 'on-dark-muted', 'primary-strong', 6.90, 4.5],
  ['19', 'accent', 'primary-strong', 4.96, 4.5], ['20', 'success', 'success-bg', 4.59, 4.5], ['21', 'success', 'bg', 4.95, 4.5],
  ['22', '#FFFFFF', 'success', 5.24, 4.5], ['23', 'warn', 'warn-bg', 5.81, 4.5], ['24', 'warn', 'surface', 6.48, 4.5],
  ['25', 'danger', 'danger-bg', 5.55, 4.5], ['26', 'danger', 'surface', 6.54, 4.5], ['27', '#FFFFFF', 'danger', 6.54, 4.5],
  ['28', 'info', 'info-bg', 5.03, 4.5], ['29', 'info', 'surface', 5.83, 4.5], ['30', 'info', 'bg', 5.50, 4.5],
  ['31', 'border-control', 'bg', 3.59, 3], ['32', 'border-control', 'surface', 3.80, 3], ['33', 'border-control', 'surface-2', 3.32, 3],
  ['34', 'border-control', 'primary-tint', 3.20, 3], ['35a', 'primary', 'bg', 7.05, 3], ['35b', 'primary', 'surface', 7.47, 3],
  ['36', '#FFFFFF', 'primary', 7.47, 4.5],
  ['37a', 'ink', 'success-bg', 13.08, 4.5], ['37b', 'ink', 'warn-bg', 13.39, 4.5], ['37c', 'ink', 'danger-bg', 12.69, 4.5], ['37d', 'ink', 'info-bg', 12.91, 4.5],
  ['38a', 'muted', 'success-bg', 6.37, 4.5], ['38b', 'muted', 'warn-bg', 6.52, 4.5], ['38c', 'muted', 'danger-bg', 6.18, 4.5], ['38d', 'muted', 'info-bg', 6.29, 4.5],
  ['39', 'primary', 'accent-tint', 6.38, 4.5], ['40', 'primary', 'surface-2', 6.52, 3], ['41', 'success', 'surface-2', 4.58, 3],
  ['42a', 'surface', 'primary-strong', 10.74, 4.5], ['42b', 'primary-strong', 'surface', 10.74, 4.5],
  ['43a', 'on-dark', 'primary-strong', 10.14, 4.5], ['43b', 'on-dark-muted', 'primary-strong', 6.91, 3],
  ['44', '#FFFFFF', 'danger-strong', 8.91, 4.5],
];

describe('AC-01 tokens อ่านจาก globals.css', () => {
  it('มี token สีครบทุกตัวที่ตารางอ้าง (hex 6 หลัก)', () => {
    for (const n of Object.values(NAME)) expect(T[n], `--${n}`).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('ค่า hex ตรงกับ tokens.md T1.1/T1.2 (ฉบับล็อก)', () => {
    expect(T).toMatchObject({
      'c-bg': '#FBF8F3', 'c-surface': '#FFFFFF', 'c-surface-2': '#F4EFE6', 'c-ink': '#2B2623', 'c-muted': '#5E554D',
      'c-primary': '#3B4FA0', 'c-primary-strong': '#2A3978', 'c-primary-tint': '#E8EBF8', 'c-accent': '#E9A23B',
      'c-danger-strong': '#8F1D17', 'c-on-accent': '#3A2500', 'c-accent-tint': '#FCEBD0', 'c-border-control': '#8C8178',
      'c-on-dark': '#FBF8F3', 'c-on-dark-muted': '#C9CEEA', 'c-success': '#2F7A4B', 'c-success-bg': '#E6F3EA',
      'c-warn': '#85530A', 'c-warn-bg': '#FFF1D6', 'c-danger': '#B3261E', 'c-danger-bg': '#FCE8E6', 'c-info': '#1F6F78', 'c-info-bg': '#E3F1F2',
    });
  });
});

describe('AC-01 ทุกคู่ใน T1.3 #1–#44', () => {
  it.each(ROWS)('#%s %s บน %s (ตาราง %f, เกณฑ์ %f)', (_n, fg, bg, doc, min) => {
    const v = ratio(fg, bg);
    expect(v, `ratio ${v.toFixed(3)}`).toBeGreaterThanOrEqual(min);
    expect(Math.abs(v - doc), `ratio ${v.toFixed(3)} vs ตาราง ${doc}`).toBeLessThanOrEqual(0.05);
  });
});

describe('AC-01 คู่ต้องห้าม 3 คู่ (T1.3)', () => {
  it('ค่าที่วัดตกเกณฑ์จริง (accent/surface-2 1.89, primary/primary-strong 1.44, border-control/primary-strong 2.83)', () => {
    expect(ratio('accent', 'surface-2')).toBeLessThan(3);
    expect(Math.abs(ratio('accent', 'surface-2') - 1.89)).toBeLessThanOrEqual(0.05);
    expect(ratio('primary', 'primary-strong')).toBeLessThan(3);
    expect(Math.abs(ratio('primary', 'primary-strong') - 1.44)).toBeLessThanOrEqual(0.05);
    expect(ratio('border-control', 'primary-strong')).toBeLessThan(3);
    expect(Math.abs(ratio('border-control', 'primary-strong') - 2.83)).toBeLessThanOrEqual(0.05);
  });

  /** กฎ CSS แบบแบน: [selector, body] (กฎใน @media ก็ถูกดึงออกมา เพราะ match เฉพาะบล็อกในสุด) */
  const rules: Array<[string, string]> = Array.from(
    CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ).map(m => [m[1].trim(), m[2]]);

  it('`.aq-on-dark .aq-btn-primary` ต้องไม่ใช้พื้น primary (ใช้ #42 พื้น surface + ตัว primary-strong)', () => {
    const hits = rules.filter(([s]) => /\.aq-on-dark[^,]*\.aq-btn-primary(?![\w-])/.test(s));
    expect(hits.length).toBeGreaterThan(0);
    for (const [s, b] of hits) expect(b, s).not.toMatch(/background(-color)?\s*:\s*var\(--c-primary\)/);
    const base = hits.find(([s]) => !/:hover/.test(s));
    expect(base?.[1]).toMatch(/background\s*:\s*var\(--c-surface\)/);
    expect(base?.[1]).toMatch(/color\s*:\s*var\(--c-primary-strong\)/);
  });

  it('กฎภายใต้ `.aq-on-dark` ไม่ใช้ border-control เป็นสีขอบ/ตัวอักษร (ใช้ #43 on-dark-muted)', () => {
    const offenders = rules.filter(([s, b]) => /\.aq-on-dark/.test(s) && /var\(--c-border-control\)/.test(b));
    expect(offenders.map(r => r[0])).toEqual([]);
  });

  it('progress ring/bar (แท่งค่า) ไม่ใช้ accent (accent/surface-2 = 1.89)', () => {
    const offenders = rules.filter(([s, b]) =>
      /progress|ring/i.test(s) && !/loader/i.test(s) && /(stroke|background(-color)?)\s*:\s*var\(--c-accent\)/.test(b));
    expect(offenders.map(r => r[0])).toEqual([]);
  });

  it('accent ไม่เป็นสีตัวอักษรบนพื้นสว่าง (`color: var(--c-accent)` อนุญาตเฉพาะใต้ .aq-on-dark / แถบเข้ม)', () => {
    const offenders = rules.filter(([s, b]) =>
      /(^|[;\s{])color\s*:\s*var\(--c-accent\)/.test(b) && !/aq-on-dark|cta-band|footer|aq-auth__brand|aq-hero__em/.test(s));
    // ถ้าล้ม: ตรวจว่า selector อยู่บนพื้นเข้มจริงหรือไม่ แล้วค่อยปรับรายการยกเว้น (อย่าแก้ CSS ใน U2-Q)
    expect(offenders.map(r => r[0])).toEqual([]);
  });
});
