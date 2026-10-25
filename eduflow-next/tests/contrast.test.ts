/**
 * AC-01 contrast — ADR-UI-002 D8 + ui/saas-tokens.md §T1/§T2 (TASK-0002 Q0)
 * แทนฉบับ ADR-UI-001 (hex 27 ตัว + 44 คู่ + กฎ .aq-on-dark) — ความครอบคลุมเท่าเดิมหรือมากกว่า:
 *  - อ่าน token จาก `:root` (light) และ `.dark` ใน app/globals.css (HSL channel → sRGB 8 บิต → WCAG 2.x)
 *  - ล็อกค่า HSL ทุก token ทั้งสองธีมตาม §T1 (แทนการล็อก hex) + ตรวจว่า HSL → hex ตรงค่าอ้างอิงใน §T1
 *  - token parity: ทุกตัวแปรสีใน :root มีใน .dark และกลับกัน
 *  - ทุกคู่ใน §T2 (38 คู่) × 2 ธีม ≥ เกณฑ์ (ข้อความ 4.5 / UI 3) และต่างจากตาราง ≤ 0.10
 *  - กฎแทน on-dark: ไม่มี oklch( · ไม่มี text-primary บน bg-primary · ไม่มี opacity-50/disabled:opacity ใน tsx
 *    · แท่งค่า progress ใช้ primary/success เท่านั้น
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

/** ค่าที่ไม่ใช่สี — อยู่ใน :root เท่านั้น (§T1 ท้ายตาราง) */
const NON_COLOR: Record<string, string> = { radius: '0.5rem', 'topbar-h': '3.5rem', 'sidebar-w': '16rem' };

/** §T1 — [token, light HSL, light hex, dark HSL, dark hex] */
const T1: Array<[string, string, string, string, string]> = [
  ['background', '0 0% 98%', '#FAFAFA', '240 10% 3.9%', '#09090B'],
  ['foreground', '240 5.9% 10%', '#18181B', '0 0% 98%', '#FAFAFA'],
  ['card', '0 0% 100%', '#FFFFFF', '240 5.9% 10%', '#18181B'],
  ['card-foreground', '240 5.9% 10%', '#18181B', '0 0% 98%', '#FAFAFA'],
  ['popover', '0 0% 100%', '#FFFFFF', '240 5.9% 10%', '#18181B'],
  ['popover-foreground', '240 5.9% 10%', '#18181B', '0 0% 98%', '#FAFAFA'],
  ['primary', '243.4 75.4% 58.6%', '#4F46E5', '234.5 89.5% 73.9%', '#818CF8'],
  ['primary-foreground', '0 0% 100%', '#FFFFFF', '240 10% 3.9%', '#09090B'],
  ['primary-muted', '225.9 100% 96.7%', '#EEF2FF', '243.8 47.1% 20%', '#1E1B4B'],
  ['secondary', '240 4.8% 95.9%', '#F4F4F5', '240 3.7% 15.9%', '#27272A'],
  ['secondary-foreground', '240 5.9% 10%', '#18181B', '0 0% 98%', '#FAFAFA'],
  ['muted', '240 4.8% 95.9%', '#F4F4F5', '240 3.7% 15.9%', '#27272A'],
  ['muted-foreground', '240 5.2% 33.9%', '#52525B', '240 5% 64.9%', '#A1A1AA'],
  ['accent', '240 4.8% 95.9%', '#F4F4F5', '240 3.7% 15.9%', '#27272A'],
  ['accent-foreground', '240 5.9% 10%', '#18181B', '0 0% 98%', '#FAFAFA'],
  ['border', '240 5.9% 90%', '#E4E4E7', '240 3.7% 15.9%', '#27272A'],
  ['input', '240 3.4% 53.7%', '#85858D', '240 3.8% 46.1%', '#71717A'],
  ['ring', '243.4 75.4% 58.6%', '#4F46E5', '234.5 89.5% 73.9%', '#818CF8'],
  ['destructive', '0 73.7% 41.8%', '#B91C1C', '0 90.6% 70.8%', '#F87171'],
  ['destructive-foreground', '0 0% 100%', '#FFFFFF', '240 10% 3.9%', '#09090B'],
  ['destructive-muted', '0 85.7% 97.3%', '#FEF2F2', '0 74.7% 15.5%', '#450A0A'],
  ['success', '142.4 71.8% 29.2%', '#15803D', '141.9 69.2% 58%', '#4ADE80'],
  ['success-muted', '138.5 76.5% 96.7%', '#F0FDF4', '144.9 80.4% 10%', '#052E16'],
  ['warning', '26 90.5% 37.1%', '#B45309', '43.3 96.4% 56.3%', '#FBBF24'],
  ['warning-muted', '48 100% 96.1%', '#FFFBEB', '20.9 91.7% 14.1%', '#451A03'],
  ['info', '192.9 82.3% 31%', '#0E7490', '187.9 85.7% 53.3%', '#22D3EE'],
  ['info-muted', '183.2 100% 96.3%', '#ECFEFF', '197 78.9% 14.9%', '#083344'],
  ['chart-1', '243.4 75.4% 58.6%', '#4F46E5', '234.5 89.5% 73.9%', '#818CF8'],
  ['chart-2', '192.9 82.3% 31%', '#0E7490', '187.9 85.7% 53.3%', '#22D3EE'],
  ['chart-3', '26 90.5% 37.1%', '#B45309', '43.3 96.4% 56.3%', '#FBBF24'],
  ['chart-4', '240 5.2% 33.9%', '#52525B', '240 5% 64.9%', '#A1A1AA'],
  ['chart-5', '142.4 71.8% 29.2%', '#15803D', '141.9 69.2% 58%', '#4ADE80'],
];
/** alias ใน §T1 (= ...) — ต้องเท่ากันจริงในทั้งสองธีม */
const ALIAS: Array<[string, string]> = [
  ['card-foreground', 'foreground'], ['popover', 'card'], ['popover-foreground', 'foreground'],
  ['secondary', 'muted'], ['accent', 'muted'], ['secondary-foreground', 'foreground'], ['accent-foreground', 'foreground'],
  ['ring', 'primary'], ['chart-1', 'primary'], ['chart-2', 'info'], ['chart-3', 'warning'], ['chart-4', 'muted-foreground'], ['chart-5', 'success'],
];

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

/** §T2 — [#, fg, bg, light, dark, เกณฑ์] */
type Pair = [number, string, string, number, number, number];
const T2: Pair[] = [
  [1, 'foreground', 'background', 16.97, 19.06, 4.5],
  [2, 'foreground', 'card', 17.72, 16.97, 4.5],
  [3, 'foreground', 'muted', 16.12, 14.27, 4.5],
  [4, 'muted-foreground', 'background', 7.41, 7.76, 4.5],
  [5, 'muted-foreground', 'card', 7.73, 6.91, 4.5],
  [6, 'muted-foreground', 'muted', 7.03, 5.81, 4.5],
  [7, 'primary-foreground', 'primary', 6.29, 6.67, 4.5],
  [8, 'primary', 'background', 6.02, 6.67, 4.5],
  [9, 'primary', 'card', 6.29, 5.94, 4.5],
  [10, 'primary', 'muted', 5.72, 4.99, 4.5],
  [11, 'primary', 'primary-muted', 5.62, 5.36, 4.5],
  [12, 'foreground', 'primary-muted', 15.84, 15.32, 4.5],
  [13, 'muted-foreground', 'primary-muted', 6.91, 6.24, 4.5],
  [14, 'input', 'background', 3.51, 4.12, 3],
  [15, 'input', 'card', 3.66, 3.67, 3],
  [16, 'input', 'muted', 3.33, 3.08, 3],
  [17, 'destructive-foreground', 'destructive', 6.47, 7.19, 4.5],
  [18, 'destructive', 'card', 6.47, 6.40, 4.5],
  [19, 'destructive', 'background', 6.20, 7.19, 4.5],
  [20, 'destructive', 'destructive-muted', 5.91, 5.84, 4.5],
  [21, 'success', 'success-muted', 4.79, 8.55, 4.5],
  [22, 'success', 'card', 5.02, 10.17, 4.5],
  [23, 'success', 'background', 4.81, 11.42, 4.5],
  [24, 'warning', 'warning-muted', 4.84, 8.97, 4.5],
  [25, 'warning', 'card', 5.02, 10.61, 4.5],
  [26, 'warning', 'background', 4.81, 11.92, 4.5],
  [27, 'info', 'info-muted', 5.15, 7.41, 4.5],
  [28, 'info', 'card', 5.36, 9.80, 4.5],
  [29, 'info', 'background', 5.13, 11.01, 4.5],
  [30, 'foreground', 'success-muted', 16.92, 14.28, 4.5],
  [31, 'foreground', 'warning-muted', 17.08, 14.35, 4.5],
  [32, 'foreground', 'destructive-muted', 16.20, 15.47, 4.5],
  [33, 'foreground', 'info-muted', 17.03, 12.84, 4.5],
  [34, 'muted-foreground', 'success-muted', 7.38, 5.82, 4.5],
  [35, 'muted-foreground', 'warning-muted', 7.45, 5.84, 4.5],
  [36, 'muted-foreground', 'destructive-muted', 7.07, 6.30, 4.5],
  [37, 'muted-foreground', 'info-muted', 7.43, 5.23, 4.5],
  [38, 'success', 'muted', 4.56, 8.55, 3],
];

describe('AC-01 token HSL อ่านจาก globals.css (§T1)', () => {
  it('สูตร WCAG ในเทสต์ถูกต้อง (ขาว/ดำ = 21, เท่ากัน = 1)', () => {
    expect(ratioRgb([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    expect(ratioRgb([24, 24, 27], [24, 24, 27])).toBe(1);
  });

  it('ตาราง §T1 ในเทสต์มีครบ 32 token สี และ §T2 ครบ 38 คู่ เลขเรียง 1..38', () => {
    expect(T1).toHaveLength(32);
    expect(new Set(T1.map(r => r[0])).size).toBe(32);
    expect(T2.map(r => r[0])).toEqual(Array.from({ length: 38 }, (_, i) => i + 1));
  });

  it(':root (light) — ค่า HSL ทุก token ตรง §T1 ตรงตัว', () => {
    const want = Object.fromEntries(T1.map(r => [r[0], r[1]]));
    const got = Object.fromEntries(Object.entries(LIGHT).filter(([k]) => !(k in NON_COLOR)));
    expect(got).toEqual(want);
  });

  it('.dark — ค่า HSL ทุก token ตรง §T1 ตรงตัว', () => {
    expect(DARK).toEqual(Object.fromEntries(T1.map(r => [r[0], r[3]])));
  });

  it('ค่าที่ไม่ใช่สี (--radius --topbar-h --sidebar-w) อยู่ใน :root ตรง §T1 และไม่อยู่ใน .dark', () => {
    for (const [k, v] of Object.entries(NON_COLOR)) {
      expect(LIGHT[k], `--${k}`).toBe(v);
      expect(DARK[k], `--${k} ใน .dark`).toBeUndefined();
    }
  });

  it('token parity: ทุกตัวแปรสีใน :root มีใน .dark และ .dark ไม่มีตัวแปรที่ :root ไม่มี', () => {
    const lightColors = Object.keys(LIGHT).filter(k => HSL_RE.test(LIGHT[k])).sort();
    expect(lightColors.filter(k => !(k in DARK)), 'อยู่ใน :root แต่ไม่มีใน .dark').toEqual([]);
    expect(Object.keys(DARK).filter(k => !(k in LIGHT)), 'อยู่ใน .dark แต่ไม่มีใน :root').toEqual([]);
    expect(lightColors).toHaveLength(32);
  });

  it('รูปแบบค่าเป็น HSL channel ล้วน (ไม่มี hsl()/hex/oklch ในค่า) ทั้งสองธีม', () => {
    for (const th of ['light', 'dark'] as const) {
      const bad = Object.entries(TOK[th]).filter(([k, v]) => !(k in NON_COLOR) && !HSL_RE.test(v)).map(([k, v]) => `--${k}: ${v}`);
      expect(bad, th).toEqual([]);
    }
  });

  it('alias ตาม §T1 เท่ากันจริงทั้งสองธีม (card-foreground=foreground, ring=primary, chart-1..5 ฯลฯ)', () => {
    for (const th of ['light', 'dark'] as const) for (const [a, b] of ALIAS) expect(TOK[th][a], `${th} --${a} = --${b}`).toBe(TOK[th][b]);
  });

  it.each(T1)('--%s: HSL → hex ตรงค่าอ้างอิง (light %s %s · dark %s %s)', (name, lh, lhex, dh, dhex) => {
    expect(toHex(rgb(lh))).toBe(lhex);
    expect(toHex(rgb(dh))).toBe(dhex);
  });
});

describe.each(['light', 'dark'] as const)('AC-01 contrast §T2 38 คู่ — ธีม %s', (theme) => {
  it.each(T2)('#%i %s บน %s (ตาราง light %f · dark %f · เกณฑ์ %f)', (_n, fg, bg, docL, docD, min) => {
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

describe('AC-01 กฎสีที่ห้าม (ADR-UI-002 D8 / §T2 ข้อห้าม)', () => {
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
});
