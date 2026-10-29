/**
 * TASK-0002 Q1 — ตรวจการล้างของเก่าหลัง S6 cutover (AC-14) + dependency (AC-15)
 * อ้างอิง: ADR-UI-002 D1 (เวอร์ชัน) + D8 แถว "เพิ่มใหม่ (Q1 หลัง S6)" · saas-spec §H (allowlist 27 ชื่อ) ·
 * saas-tokens §T2 ข้อห้ามสี (+ earth-tokens §E2) · §T11 focus
 *
 * วิธี: อ่านไฟล์จริงจากดิสก์แล้ว grep (ไม่ build) — ทุกตัวตรวจมีเคส negative ยืนยันว่าตัวจับทำงานจริง
 * KNOWN_BUGS: จุดที่ผิดกติกาแต่เป็นโค้ด production (ห้าม qa แก้) → แยกออกจากเคสหลัก + `it.fails` ต่อ bug
 * (ชุดเขียว แต่ `it.fails` จะล้มทันทีเมื่อถูกแก้ = เตือนให้ถอดออกจากรายการ)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join('/');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function walk(dir: string, exts: string[]): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, e.name);
    if (e.isDirectory()) out.push(...walk(rel(p), exts));
    else if (exts.includes(path.extname(e.name))) out.push(rel(p));
  }
  return out;
}

/** โซน UI ตาม AC-14 */
const UI_DIRS = ['app', 'components', 'context', 'lib/ui'];
const UI_FILES = UI_DIRS.flatMap(d => walk(d, ['.ts', '.tsx', '.css']));
const TSX_FILES = UI_FILES.filter(f => f.endsWith('.tsx'));
/** marker ของ shim ชั่วคราวตรวจกว้างกว่า: ทั้ง lib/ (ไม่ใช่แค่ lib/ui) */
const SRC_FILES = ['app', 'components', 'context', 'lib'].flatMap(d => walk(d, ['.ts', '.tsx', '.css', '.mjs', '.js']));

type Hit = { file: string; line: number; text: string };
function grep(files: string[], re: RegExp, skipLine?: (l: string) => boolean): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    read(file).split(/\r?\n/).forEach((l, i) => {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      if (g.test(l) && !(skipLine && skipLine(l))) hits.push({ file, line: i + 1, text: l.trim().slice(0, 160) });
    });
  }
  return hits;
}
const fmt = (h: Hit[]) => h.map(x => `${x.file}:${x.line}  ${x.text}`);

/** bug ที่พบตอนเขียน Q1 — key = `<file>:<regex-id>` */
// BUG-0002-Q1-1 (outline-none ใน NewUserForm) แก้แล้ว — รายการว่าง
const KNOWN_BUGS: Record<string, string> = {};
const isKnown = (h: Hit, id: string) => `${h.file}:${id}` in KNOWN_BUGS;

// ─────────────────────────── AC-14: allowlist §H ───────────────────────────

/** saas-spec §H — 27 ชื่อ (ไม่เพิ่มจากรอบ 2) */
const ALLOWLIST = [
  // เทสต์ผูกตรง
  'aq-skip', 'aq-count', 'aq-textarea--prose', 'aq-chart-label',
  // target audit
  'aq-btn', 'aq-btn-compact', 'aq-nav-item', 'aq-term__btn', 'aq-chip__remove', 'aq-matrix',
  // role XS
  'aq-pill', 'aq-badge', 'aq-heat-cell__label', 'aq-kbd',
  // role SM
  'aq-help', 'aq-meta', 'aq-crumbs', 'aq-btn-reason', 'aq-field-error', 'aq-saved', 'aq-nav-group',
  'aq-kpi__label', 'aq-step__meta', 'aq-legend', 'aq-progress__label', 'aq-term__body', 'aq-heat-label',
] as const;

/** ดึงชื่อ `aq-*` ทุกตัว (รวมคอมเมนต์/สตริง/CSS) · ชื่อที่ต่อ template (`aq-heat-${x}`) ได้ `aq-heat-` → ไม่อยู่ใน allowlist = ถูกจับ */
function aqNames(src: string): string[] {
  return Array.from(src.matchAll(/(?<![\w-])aq-[a-z0-9_-]*/g), m => m[0]);
}

describe('AC-14 allowlist §H', () => {
  it('allowlist มี 27 ชื่อ ไม่ซ้ำ', () => {
    expect(ALLOWLIST.length).toBe(27);
    expect(new Set(ALLOWLIST).size).toBe(27);
  });

  it('สแกนไฟล์จริง (กันกรณี path ผิดแล้วผ่านเพราะไม่มีไฟล์)', () => {
    expect(TSX_FILES.length).toBeGreaterThan(50);
    expect(UI_FILES).toContain('app/globals.css');
    expect(UI_FILES.some(f => f.startsWith('lib/ui/'))).toBe(true);
    expect(UI_FILES.some(f => f.startsWith('context/'))).toBe(true);
  });

  it('class `aq-*` ใน app/ components/ context/ lib/ui/ ⊆ allowlist 27 ชื่อ (ไม่มีชื่อใหม่จากรอบ 2)', () => {
    const allow = new Set<string>(ALLOWLIST);
    const bad: string[] = [];
    for (const f of UI_FILES) {
      read(f).split(/\r?\n/).forEach((l, i) => {
        for (const n of aqNames(l)) if (!allow.has(n)) bad.push(`${f}:${i + 1}  ${n}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('negative: ตัวดึงชื่อจับ class เก่า/ชื่อ template/ชื่อใน CSS ได้ และไม่จับคำที่แค่มี "aq-" อยู่กลางคำ', () => {
    expect(aqNames('className="aq-btn aq-btn-primary aq-msg--warn"')).toEqual(['aq-btn', 'aq-btn-primary', 'aq-msg--warn']);
    expect(aqNames('cn(`aq-heat-${level}`)')).toEqual(['aq-heat-']);
    expect(aqNames('.aq-ring__track{stroke:red}')).toEqual(['aq-ring__track']);
    expect(aqNames('faq-item aunqa-session data_aq-x')).toEqual([]);
    const allow = new Set<string>(ALLOWLIST);
    expect(['aq-btn-primary', 'aq-heat-', 'aq-dialog'].filter(n => !allow.has(n))).toHaveLength(3);
  });
});

// ─────────────────────────── AC-14: legacy.css / preflight / shim ───────────────────────────

describe('AC-14 ไม่มี legacy.css · preflight เปิด · ไม่มี shim/override ชั่วคราว', () => {
  it('ไม่มีไฟล์ app/legacy.css และไม่มีใคร import legacy.css', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/legacy.css'))).toBe(false);
    expect(fmt(grep(SRC_FILES, /(import|@import|require\()\s*\(?\s*['"][^'"]*legacy\.css['"]/))).toEqual([]);
  });

  it('tailwind.config.ts ไม่มี corePlugins/preflight (preflight เปิดตามค่าเริ่ม)', () => {
    const cfg = read('tailwind.config.ts');
    expect(cfg).not.toMatch(/corePlugins/);
    expect(cfg).not.toMatch(/preflight\s*:/);
  });

  it('globals.css มี [hidden]{display:none !important}', () => {
    const css = read('app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/);
  });

  /** marker ของ shim/override ช่วงเปลี่ยนผ่าน (Log S1.5 / S2 / R2-F3 / S6) */
  const MARKERS: Array<[string, RegExp]> = [
    ['LEGACY_WIN', /\bLEGACY_WIN\b/],
    ['fromLegacy', /\bfromLegacy\b/],
    ['LEGACY_BTN', /\bLEGACY_BTN\b/],
    ['ThemeToggleButton', /\bThemeToggleButton\b/],
    ['DisplayPrefsButton', /\bDisplayPrefsButton\b/],
    ['GHOST_FIX', /\bGHOST_FIX\b/],
    ['HEAT_LINK', /\bHEAT_LINK\b/],
    ['visited: (override สีลิงก์จาก legacy)', /(?<![\w-])visited:[\w!-]/],
  ];
  for (const [name, re] of MARKERS) {
    it(`ไม่มี ${name} ใน app/ components/ context/ lib/`, () => {
      expect(fmt(grep(SRC_FILES, re))).toEqual([]);
    });
  }

  it('negative: marker จับตัวอย่างได้จริง', () => {
    const samples = ['const LEGACY_WIN = {}', 'fromLegacy(cls)', 'LEGACY_BTN[x]', 'export function ThemeToggleButton()',
      '<DisplayPrefsButton />', 'cn(GHOST_FIX)', 'HEAT_LINK[level]', 'className="visited:text-primary"'];
    MARKERS.forEach(([, re], i) => expect(re.test(samples[i])).toBe(true));
    // ไม่จับคำทั่วไป
    expect(/(?<![\w-])visited:[\w!-]/.test('// ลิงก์ที่ visited: แล้ว')).toBe(false);
  });
});

// ─────────────────────────── AC-14: focus / px / สี ───────────────────────────

const FOCUS_RE = /(?<![\w-])((focus|focus-visible):)?outline-none\b|(?<![\w-])(focus|focus-visible):ring\b|(?<![\w-])(focus|focus-visible):ring-/;
const PX_RE = /\b(text|leading|h|min-h|max-h)-\[\d+(\.\d+)?px\]/;
const HEX_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;
const RGB_RE = /\brgba?\(/;
const NAMED_RE = /(?<![\w-])(bg-white|bg-black|text-white|text-black)(?![\w/-])|(?<![\w-])bg-black\/(?!50\b|70\b)\d+/;
const PALETTE_RE = /(?<![\w-])(text|bg|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

describe('AC-14 focus / ขนาด px / สีตายตัว (tsx)', () => {
  it('ไม่มี outline-none / focus-visible:ring / focus:ring ใน tsx (§T11 — grep = 0) · ยกเว้น KNOWN_BUGS', () => {
    const hits = grep(TSX_FILES, FOCUS_RE).filter(h => !isKnown(h, 'focus'));
    expect(fmt(hits)).toEqual([]);
  });

  it('ไม่มีค่า px ตายตัวกับ text/leading/h/min-h/max-h', () => {
    expect(fmt(grep(TSX_FILES, PX_RE))).toEqual([]);
  });

  it('ไม่มี hex / rgb( ใน tsx', () => {
    expect(fmt(grep(TSX_FILES, HEX_RE))).toEqual([]);
    expect(fmt(grep(TSX_FILES, RGB_RE))).toEqual([]);
  });

  it('ไม่มี bg-white / bg-black (ยกเว้น overlay /50 /70) / text-white / text-black', () => {
    expect(fmt(grep(TSX_FILES, NAMED_RE))).toEqual([]);
  });

  it('ไม่มี palette Tailwind ตรง ๆ (เช่น text-zinc-500, bg-indigo-600)', () => {
    expect(fmt(grep(TSX_FILES, PALETTE_RE))).toEqual([]);
  });

  it('negative: ตัวตรวจจับตัวอย่างที่ผิดได้ และไม่จับของที่อนุญาต', () => {
    for (const s of ['outline-none', 'focus:outline-none', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus:ring', 'focus:ring-primary'])
      expect(FOCUS_RE.test(`className="${s}"`), s).toBe(true);
    expect(FOCUS_RE.test('className="ring-2 outline-2"')).toBe(false);
    for (const s of ['text-[13px]', 'leading-[22.5px]', 'h-[40px]', 'min-h-[44px]', 'max-h-[300px]'])
      expect(PX_RE.test(s), s).toBe(true);
    expect(PX_RE.test('max-h-[70vh] min-h-[24rem] w-[320px]')).toBe(false);
    expect(HEX_RE.test('color="#1F2937"')).toBe(true);
    expect(HEX_RE.test('fill="#fff"')).toBe(true);
    expect(HEX_RE.test('href="#main"')).toBe(false);
    expect(RGB_RE.test("style={{ color: 'rgb(0,0,0)' }}")).toBe(true);
    for (const s of ['bg-white', 'bg-black', 'text-white', 'text-black', 'bg-black/40'])
      expect(NAMED_RE.test(`className="p-2 ${s}"`), s).toBe(true);
    for (const s of ['bg-black/50', 'dark:bg-black/70', 'text-white-ish-token'])
      expect(NAMED_RE.test(`className="${s}"`), s).toBe(false);
    expect(PALETTE_RE.test('text-zinc-500')).toBe(true);
    expect(PALETTE_RE.test('hover:bg-indigo-600')).toBe(true);
    expect(PALETTE_RE.test('text-muted-foreground bg-primary-muted border-success')).toBe(false);
  });
});

// ─────────────────────────── AC-14: primitives forwardRef ───────────────────────────

describe('AC-14 primitives ใช้ React.forwardRef', () => {
  const files = walk('components/ui/primitives', ['.tsx']);

  it('มีไฟล์ primitive (≥ 9)', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  it('ทุก component ที่ export (ชื่อขึ้นต้นตัวใหญ่ ไม่นับ *Variants) ประกาศด้วย React.forwardRef', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = read(f);
      const names = Array.from(src.matchAll(/export\s*\{([^}]*)\}/g)).flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]))
        .concat(Array.from(src.matchAll(/export\s+(?:const|function)\s+([A-Z]\w*)/g), m => m[1]));
      const comps = names.filter(n => /^[A-Z]/.test(n) && !/Variants$/.test(n));
      if (!comps.length) bad.push(`${f}: ไม่พบ component ที่ export`);
      for (const n of comps) if (!new RegExp(`const\\s+${n}\\s*=\\s*React\\.forwardRef\\b`).test(src)) bad.push(`${f}: ${n}`);
    }
    expect(bad).toEqual([]);
  });
});

// ─────────────────────────── AC-15: dependency (ADR-UI-002 D1) ───────────────────────────

describe('AC-15 dependency ตรง ADR-UI-002 D1', () => {
  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, { version?: string }> };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const EXACT = /^\d+\.\d+\.\d+$/;

  it('8 ตัวใหม่ pin แบบ exact + อยู่กลุ่มถูก (dep/dev)', () => {
    expect(pkg.devDependencies.tailwindcss).toBe('3.4.19');
    expect(pkg.dependencies.clsx).toBe('2.1.1');
    expect(pkg.dependencies['tailwind-merge']).toBe('2.6.1');
    expect(pkg.dependencies['class-variance-authority']).toBe('0.7.1');
    expect(pkg.dependencies['next-themes']).toBe('0.4.6');
    // สาย/กลุ่มตาม D1 — ค่าเจาะจงบันทึกใน Log S0
    expect(pkg.devDependencies.postcss).toMatch(EXACT);
    expect(pkg.devDependencies.postcss).toMatch(/^8\./);
    expect(pkg.devDependencies.autoprefixer).toMatch(EXACT);
    expect(pkg.devDependencies.autoprefixer).toMatch(/^10\.4\./);
    expect(pkg.dependencies['@radix-ui/react-slot']).toMatch(EXACT);
    expect(pkg.dependencies['@radix-ui/react-slot']).toMatch(/^1\./);
  });

  it('ค่าใน lockfile ตรงกับ package.json (ติดตั้งจริงตามที่ pin)', () => {
    for (const n of ['tailwindcss', 'clsx', 'tailwind-merge', 'class-variance-authority', 'next-themes', 'postcss', 'autoprefixer', '@radix-ui/react-slot'])
      expect(lock.packages[`node_modules/${n}`]?.version, n).toBe(all[n]);
  });

  it('ไม่แตะ next/react/react-dom (spec เดิม) · react/react-dom ติดตั้ง 18.3.1 ชุดเดียว', () => {
    expect(pkg.dependencies.next).toBe('^14.2.0');
    expect(pkg.dependencies.react).toBe('^18');
    expect(pkg.dependencies['react-dom']).toBe('^18');
    for (const n of ['react', 'react-dom']) {
      const copies = Object.entries(lock.packages).filter(([k]) => new RegExp(`(^|/)node_modules/${n}$`).test(k));
      expect(copies.map(([k, v]) => `${k}@${v.version}`), n).toEqual([`node_modules/${n}@18.3.1`]);
      const installed = JSON.parse(read(`node_modules/${n}/package.json`)) as { version: string };
      expect(installed.version, `${n} ใน node_modules`).toBe('18.3.1');
    }
  });

  it('tailwindcss / tailwind-merge มีชุดเดียวใน lockfile (ไม่มีสาย 4 / 3 ซ้อน)', () => {
    for (const [n, v] of [['tailwindcss', '3.4.19'], ['tailwind-merge', '2.6.1']] as const) {
      const copies = Object.entries(lock.packages).filter(([k]) => new RegExp(`(^|/)node_modules/${n}$`).test(k));
      expect(copies.map(([k, x]) => `${k}@${x.version}`), n).toEqual([`node_modules/${n}@${v}`]);
    }
  });

  it('ไม่มี package ในรายการห้าม (D1)', () => {
    const banned = ['shadcn', '@tailwindcss/postcss', 'tailwindcss-animate', 'lucide-react', 'recharts', 'geist', 'sonner', 'cmdk'];
    expect(Object.keys(all).filter(n => banned.includes(n))).toEqual([]);
    // @radix-ui/* ตัวเดียวที่อนุญาตเป็น dependency ตรง = react-slot
    expect(Object.keys(all).filter(n => n.startsWith('@radix-ui/') && n !== '@radix-ui/react-slot')).toEqual([]);
    expect(all.tailwindcss).not.toMatch(/^\^?~?4/);
    expect(all['tailwind-merge']).not.toMatch(/^\^?~?3/);
    // lockfile ระดับบนสุดก็ต้องไม่มี
    expect(banned.filter(n => lock.packages[`node_modules/${n}`])).toEqual([]);
  });
});
