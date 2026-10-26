/**
 * AC-01 R2 contrast — ADR-UI-003 "Earth / Friendly" + ui/earth-tokens.md §E1/§E2 (TASK-0002 Q2a)
 * แทนฉบับ Q0 (saas-tokens §T1/§T2 ที่ล็อกสตริง HSL) — ความครอบคลุมเท่าเดิมหรือมากกว่า:
 *  - อ่าน token จาก `:root` (light) และ `.dark` ใน app/globals.css (HSL channel → sRGB 8 บิต → WCAG 2.x)
 *  - ล็อก "HSL ใน CSS → hex 8 บิต = ค่าในตาราง §E1" ทุก token สี (34 ตัว) ทั้งสองธีม (§E1: hex คือค่าอ้างอิง)
 *  - token parity: ทุกตัวแปรสีใน :root มีใน .dark และกลับกัน (34/34) · alias ตาม §E1 เท่ากันจริง
 *  - ทุกคู่ใน §E2 (42 คู่) × 2 ธีม ≥ เกณฑ์ (ข้อความ 4.5 / UI 3) และต่างจากตาราง ≤ 0.10
 *  - dark `--background` luminance ≥ 0.012 และ dark `--foreground` ≠ #FFFFFF (กันย้อนไปดำสนิท/ขาวจ้า)
 *  - กฎ D8 เดิม (ก)–(ง) + ใหม่ (จ) ไม่มี bg-clay/text-clay ในไฟล์สถานะ lib/ui/tone.ts
 * ถ้าคู่ใดตก AA = BLOCKED กลับ architect — ห้ามลดเกณฑ์/แก้ค่าในเทสต์ให้ผ่าน
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const CSS_RAW = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/** ตัวแปรทั้งหมดในบล็อกแรกที่ selector ตรงตัว (`:root` / `.dark`) */
function block(selector: ':root' | '.dark'): Record<string, string> {
  const re = selector === ':root' ? /(?:^|[\s}]):root\s*\{([^{}]*)\}/ : /(?:^|[\s}])\.dark\s*\{([^{}]*)\}/;
  const m = CSS.match(re);
  if (!m) throw new Error(`${selector} not found in globals.css`);
  const out: Record<string, string> = {};
  for (const d of m[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim().replace(/\s+/g, ' ');
  return out;
}
const LIGHT = block(':root');
const DARK = block('.dark');
type Theme = 'light' | 'dark';
const TOK: Record<Theme, Record<string, string>> = { light: LIGHT, dark: DARK };

/** ค่าที่ไม่ใช่สี — อยู่ใน :root เท่านั้น (§E1 ท้ายตาราง) */
const NON_COLOR: Record<string, string> = { radius: '0.625rem', 'topbar-h': '4rem', 'sidebar-w': '16.5rem' };

/** §E1 — [token, light hex, dark hex] (hex = ค่าอ้างอิง normative; alias ใส่ hex ของตัวที่อ้าง) */
const E1: Array<[string, string, string]> = [
  ['background', '#F7F5EE', '#26211C'],
  ['foreground', '#272A21', '#EDE4D8'],
  ['card', '#FFFFFC', '#2F2923'],
  ['card-foreground', '#272A21', '#EDE4D8'],
  ['popover', '#FFFFFC', '#2F2923'],
  ['popover-foreground', '#272A21', '#EDE4D8'],
  ['primary', '#3F6B5C', '#8FC1AC'],
  ['primary-foreground', '#FFFFFF', '#26211C'],
  ['primary-muted', '#E2EEE8', '#2E3C36'],
  ['secondary', '#EFECE3', '#39322B'],
  ['secondary-foreground', '#272A21', '#EDE4D8'],
  ['muted', '#EFECE3', '#39322B'],
  ['muted-foreground', '#565A4B', '#C2B5A6'],
  ['accent', '#EFECE3', '#39322B'],
  ['accent-foreground', '#272A21', '#EDE4D8'],
  ['border', '#E2DED3', '#463E36'],
  ['input', '#7E8270', '#8C7E70'],
  ['ring', '#3F6B5C', '#8FC1AC'],
  ['destructive', '#A5291F', '#F2998C'],
  ['destructive-foreground', '#FFFFFF', '#26211C'],
  ['destructive-muted', '#FBE6E2', '#4A2622'],
  ['success', '#356B3A', '#9CC98A'],
  ['success-muted', '#E5F0E4', '#2F3A28'],
  ['warning', '#8A5A0B', '#E3B862'],
  ['warning-muted', '#FBEFD5', '#45371C'],
  ['info', '#2F5F86', '#9CC3E6'],
  ['info-muted', '#E4EEF5', '#263646'],
  ['clay', '#A4482B', '#E39B7B'],
  ['clay-muted', '#F6E4DA', '#43302A'],
  ['chart-1', '#3F6B5C', '#8FC1AC'],
  ['chart-2', '#2F5F86', '#9CC3E6'],
  ['chart-3', '#A4482B', '#E39B7B'],
  ['chart-4', '#565A4B', '#C2B5A6'],
  ['chart-5', '#356B3A', '#9CC98A'],
];
/** alias ใน §E1 (= ...) — ต้องเท่ากันจริง (สตริง HSL เดียวกัน) ในทั้งสองธีม */
const ALIAS: Array<[string, string]> = [
  ['card-foreground', 'foreground'], ['popover', 'card'], ['popover-foreground', 'foreground'],
  ['secondary', 'muted'], ['accent', 'muted'], ['secondary-foreground', 'foreground'], ['accent-foreground', 'foreground'],
  ['ring', 'primary'], ['chart-1', 'primary'], ['chart-2', 'info'], ['chart-3', 'clay'], ['chart-4', 'muted-foreground'], ['chart-5', 'success'],
];
/** alias เฉพาะธีมมืด: ตัวอักษรบนปุ่มหลัก/destructive = สีพื้นมืด (§E1) */
const DARK_ALIAS: Array<[string, string]> = [['primary-foreground', 'background'], ['destructive-foreground', 'background']];

const HSL_RE = /^(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/;
/** HSL channel ("h s% l%") → sRGB 8 บิต (เบราว์เซอร์ปัดเป็น 0–255 ก่อนวาด) — CSS Color 4 hslToRgb */
function rgb(hsl: string): [number, number, number] {
  const m = hsl.match(HSL_RE);
  if (!m) throw new Error(`not an HSL channel: "${hsl}"`);
  const h = Number(m[1]), s = Number(m[2]) / 100, l = Number(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map(x => Math.round(x * 255)) as [number, number, number];
}
const toHex = (c: number[]) => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratioRgb = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function ratio(theme: Theme, fg: string, bg: string): number {
  const f = TOK[theme][fg], b = TOK[theme][bg];
  if (!f) throw new Error(`--${fg} not found (${theme})`);
  if (!b) throw new Error(`--${bg} not found (${theme})`);
  return ratioRgb(rgb(f), rgb(b));
}

/** §E2 — [#, fg, bg, light, dark, เกณฑ์] (ตัวเลขตาราง [A] ของ architect — สคริปต์ qa Q2a ตรงทุกคู่ ≤0.01) */
type Pair = [number, string, string, number, number, number];
const E2: Pair[] = [
  [1, 'foreground', 'background', 13.37, 12.67, 4.5],
  [2, 'foreground', 'card', 14.56, 11.41, 4.5],
  [3, 'foreground', 'muted', 12.35, 10.02, 4.5],
  [4, 'muted-foreground', 'background', 6.50, 7.94, 4.5],
  [5, 'muted-foreground', 'card', 7.08, 7.15, 4.5],
  [6, 'muted-foreground', 'muted', 6.01, 6.28, 4.5],
  [7, 'primary-foreground', 'primary', 6.05, 7.89, 4.5],
  [8, 'primary', 'background', 5.55, 7.89, 4.5],
  [9, 'primary', 'card', 6.04, 7.11, 4.5],
  [10, 'primary', 'muted', 5.12, 6.24, 4.5],
  [11, 'primary', 'primary-muted', 5.08, 5.72, 4.5],
  [12, 'foreground', 'primary-muted', 12.25, 9.19, 4.5],
  [13, 'muted-foreground', 'primary-muted', 5.96, 5.76, 4.5],
  [14, 'input', 'background', 3.62, 4.05, 3],
  [15, 'input', 'card', 3.94, 3.65, 3],
  [16, 'input', 'muted', 3.35, 3.20, 3],
  [17, 'destructive-foreground', 'destructive', 7.15, 7.37, 4.5],
  [18, 'destructive', 'card', 7.14, 6.64, 4.5],
  [19, 'destructive', 'background', 6.55, 7.37, 4.5],
  [20, 'destructive', 'destructive-muted', 5.97, 6.10, 4.5],
  [21, 'success', 'success-muted', 5.40, 6.34, 4.5],
  [22, 'success', 'card', 6.32, 7.62, 4.5],
  [23, 'success', 'background', 5.81, 8.46, 4.5],
  [24, 'warning', 'warning-muted', 5.19, 6.22, 4.5],
  [25, 'warning', 'card', 5.91, 7.73, 4.5],
  [26, 'warning', 'background', 5.43, 8.58, 4.5],
  [27, 'info', 'info-muted', 5.75, 6.69, 4.5],
  [28, 'info', 'card', 6.76, 7.77, 4.5],
  [29, 'info', 'background', 6.21, 8.63, 4.5],
  [30, 'foreground', 'success-muted', 12.45, 9.50, 4.5],
  [31, 'foreground', 'warning-muted', 12.79, 9.19, 4.5],
  [32, 'foreground', 'destructive-muted', 12.17, 10.49, 4.5],
  [33, 'foreground', 'info-muted', 12.40, 9.83, 4.5],
  [34, 'muted-foreground', 'success-muted', 6.05, 5.95, 4.5],
  [35, 'muted-foreground', 'warning-muted', 6.22, 5.76, 4.5],
  [36, 'muted-foreground', 'destructive-muted', 5.92, 6.57, 4.5],
  [37, 'muted-foreground', 'info-muted', 6.03, 6.15, 4.5],
  [38, 'success', 'muted', 5.36, 6.69, 3],
  [39, 'clay', 'background', 5.44, 7.02, 4.5],
  [40, 'clay', 'card', 5.92, 6.32, 4.5],
  [41, 'clay', 'clay-muted', 4.81, 5.45, 4.5],
  [42, 'foreground', 'clay-muted', 11.83, 9.85, 4.5],
];

describe('AC-01 R2 token earth อ่านจาก globals.css (§E1)', () => {
  it('สูตร WCAG ในเทสต์ถูกต้อง (ขาว/ดำ = 21, เท่ากัน = 1, #767676 บนขาว ≈ 4.54)', () => {
    expect(ratioRgb([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    expect(ratioRgb([39, 42, 33], [39, 42, 33])).toBe(1);
    expect(ratioRgb([118, 118, 118], [255, 255, 255])).toBeCloseTo(4.54, 2);
  });

  it('ตาราง §E1 ในเทสต์มีครบ 34 token สี (ไม่ซ้ำ) และ §E2 ครบ 42 คู่ เลขเรียง 1..42', () => {
    expect(E1).toHaveLength(34);
    expect(new Set(E1.map(r => r[0])).size).toBe(34);
    expect(E2.map(r => r[0])).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
    // ทุก token ที่คู่ใน §E2 อ้างต้องอยู่ใน §E1
    const names = new Set(E1.map(r => r[0]));
    expect(E2.flatMap(r => [r[1], r[2]]).filter(n => !names.has(n))).toEqual([]);
  });

  it(':root และ .dark มีชุด token สีตรงกับ §E1 พอดี (ไม่ขาด ไม่เกิน)', () => {
    const want = E1.map(r => r[0]).sort();
    expect(Object.keys(LIGHT).filter(k => !(k in NON_COLOR)).sort()).toEqual(want);
    expect(Object.keys(DARK).sort()).toEqual(want);
  });

  it('ค่าที่ไม่ใช่สี (--radius 0.625rem, --topbar-h 4rem, --sidebar-w 16.5rem) อยู่ใน :root และไม่อยู่ใน .dark', () => {
    for (const [k, v] of Object.entries(NON_COLOR)) {
      expect(LIGHT[k], `--${k}`).toBe(v);
      expect(DARK[k], `--${k} ใน .dark`).toBeUndefined();
    }
  });

  it('token parity: ทุกตัวแปรสีใน :root มีใน .dark และ .dark ไม่มีตัวแปรที่ :root ไม่มี (34/34)', () => {
    const lightColors = Object.keys(LIGHT).filter(k => HSL_RE.test(LIGHT[k])).sort();
    expect(lightColors.filter(k => !(k in DARK)), 'อยู่ใน :root แต่ไม่มีใน .dark').toEqual([]);
    expect(Object.keys(DARK).filter(k => !(k in LIGHT)), 'อยู่ใน .dark แต่ไม่มีใน :root').toEqual([]);
    expect(lightColors).toHaveLength(34);
  });

  it('รูปแบบค่าเป็น HSL channel ล้วน (ไม่มี hsl()/hex/oklch ในค่า) ทั้งสองธีม', () => {
    for (const th of ['light', 'dark'] as const) {
      const bad = Object.entries(TOK[th]).filter(([k, v]) => !(k in NON_COLOR) && !HSL_RE.test(v)).map(([k, v]) => `--${k}: ${v}`);
      expect(bad, th).toEqual([]);
    }
  });

  it('alias ตาม §E1 เท่ากันจริงทั้งสองธีม (card=popover, secondary=muted=accent, ring=primary, chart-1..5 ฯลฯ)', () => {
    for (const th of ['light', 'dark'] as const) for (const [a, b] of ALIAS) expect(TOK[th][a], `${th} --${a} = --${b}`).toBe(TOK[th][b]);
    for (const [a, b] of DARK_ALIAS) expect(DARK[a], `dark --${a} = --${b}`).toBe(DARK[b]);
  });

  it.each(E1)('--%s: HSL ใน CSS → hex 8 บิต ตรง §E1 (light %s · dark %s)', (name, lhex, dhex) => {
    expect(toHex(rgb(LIGHT[name])), `light --${name} = ${LIGHT[name]}`).toBe(lhex);
    expect(toHex(rgb(DARK[name])), `dark --${name} = ${DARK[name]}`).toBe(dhex);
  });

  it('dark แบบ warm dim: --background luminance ≥ 0.012 (ไม่ดำสนิท) และ --foreground ≠ #FFFFFF (ไม่ขาวจ้า)', () => {
    const bgLum = lum(rgb(DARK.background));
    expect(bgLum, `dark bg luminance ${bgLum.toFixed(4)}`).toBeGreaterThanOrEqual(0.012);
    expect(toHex(rgb(DARK.foreground))).not.toBe('#FFFFFF');
    // negative ของตัวตรวจเอง: ค่าดำแบบ Material #121212 ต้องตกเกณฑ์นี้
    expect(lum([18, 18, 18])).toBeLessThan(0.012);
  });

  it('ค่าเริ่มต้นสว่าง: light --background สว่างกว่า dark (luminance light > 0.5 > dark)', () => {
    expect(lum(rgb(LIGHT.background))).toBeGreaterThan(0.5);
    expect(lum(rgb(DARK.background))).toBeLessThan(0.5);
  });
});

describe.each(['light', 'dark'] as const)('AC-01 R2 contrast §E2 42 คู่ — ธีม %s', (theme) => {
  it.each(E2)('#%i %s บน %s (ตาราง light %f · dark %f · เกณฑ์ %f)', (_n, fg, bg, docL, docD, min) => {
    const v = ratio(theme, fg, bg);
    const doc = theme === 'light' ? docL : docD;
    expect(v, `${theme} ratio ${v.toFixed(3)} < เกณฑ์ ${min}`).toBeGreaterThanOrEqual(min);
    expect(Math.abs(v - doc), `${theme} ratio ${v.toFixed(3)} vs ตาราง ${doc}`).toBeLessThanOrEqual(0.10);
  });
});

// ─────────────────────── กฎ CSS/TSX (แทนกฎ .aq-on-dark เดิม — D8) ───────────────────────
function walk(dirs: string[], file: RegExp): string[] {
  const out: string[] = [];
  const go = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) go(p); continue; }
      if (file.test(e.name)) out.push(p);
    }
  };
  dirs.forEach(d => go(path.join(ROOT, d)));
  return out;
}
function grepLines(files: string[], test: (line: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (test(line)) out.push(`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
  return out;
}
const TSX = walk(['app', 'components', 'context'], /\.tsx$/);

/** กฎ CSS แบบแบน: [selector, body] (กฎใน @media/@layer ถูกดึงออกมา เพราะ match เฉพาะบล็อกในสุด) */
const RULES: Array<[string, string]> = Array.from(CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(m => [m[1].trim(), m[2]]);

describe('AC-01 กฎสีที่ห้าม (ADR-UI-002 D8 / ADR-UI-003 §E2 ข้อห้าม)', () => {
  it('(ก) globals.css ไม่มี oklch( (shadcn v4 ใช้ oklch — โปรเจกต์นี้ล็อก HSL)', () => {
    expect(CSS_RAW).not.toMatch(/oklch\(/i);
  });

  it('(ข) tsx ใน app/ components/ context/ ไม่มี text-primary ซ้อนบน bg-primary ในบรรทัด/className เดียวกัน', () => {
    const bg = /(?<![\w-])bg-primary(?![\w-])/, fg = /(?<![\w-])text-primary(?![\w-])/;
    expect(TSX.length).toBeGreaterThan(20);
    expect(grepLines(TSX, l => bg.test(l) && fg.test(l))).toEqual([]);
  });

  it('(ค) tsx ไม่มี opacity-50 / disabled:opacity (disabled ใช้คู่ #6 ไม่ใช่ซีดด้วย opacity)', () => {
    expect(grepLines(TSX, l => /(?<![\w-])opacity-50(?![\w-])|disabled:opacity/.test(l))).toEqual([]);
  });

  it('(ง) แท่งค่า progress ใช้ primary/success เท่านั้น — ProgressRing.tsx และกฎ progress/ring ใน globals.css', () => {
    const file = path.join(ROOT, 'components/ui/ProgressRing.tsx');
    expect(fs.existsSync(file)).toBe(true);
    // class สีของ Tailwind ในไฟล์ progress: stroke/fill/bg ได้แค่ primary, success (ค่า) และ muted (track)
    const bad = grepLines([file], l => /(?<![\w-])(?:stroke|fill|bg)-(?!primary(?![\w-])|success(?![\w-])|muted(?![\w-])|none\b|current\b|transparent\b)[a-z]+(?:-[a-z0-9]+)*(?:\/\d+)?(?![\w-])/.test(l)
      && /className|class=/.test(l));
    expect(bad).toEqual([]);
    // กฎ CSS ที่ selector เป็น progress/ring (ไม่ใช่ loader) ใช้สีจาก token primary/success/muted เท่านั้น
    const cssBad = RULES.filter(([s, b]) => /progress|(?<![\w-])\.?[\w-]*ring/i.test(s) && !/loader/i.test(s)
      && /(?:stroke|fill|background(?:-color)?)\s*:\s*hsl\(var\(--(?!primary\)|success\)|muted\))[\w-]+\)/.test(b)).map(r => r[0]);
    expect(cssBad).toEqual([]);
  });

  it('(จ) --clay ไม่ใช้เป็นสถานะ: lib/ui/tone.ts ไม่มี class clay ใด ๆ (bg-clay/text-clay/border-clay/…)', () => {
    const file = path.join(ROOT, 'lib/ui/tone.ts');
    expect(fs.existsSync(file)).toBe(true);
    expect(grepLines([file], l => /(?<![\w-])[a-z]+-clay(?![\w])/.test(l) || /--clay\b/.test(l))).toEqual([]);
    // ตัวตรวจจับได้จริง (negative ของ regex เอง)
    expect(/(?<![\w-])[a-z]+-clay(?![\w])/.test("critical: 'bg-clay-muted text-clay'")).toBe(true);
  });
});
