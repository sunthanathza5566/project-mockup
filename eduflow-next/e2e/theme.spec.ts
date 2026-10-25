/**
 * TASK-0002 Q0 — dark mode (ADR-UI-002 D8, saas-tokens §T1/§T12)
 * AC-13 (1) `aunqa_theme='dark'` → <html class~=dark> ตั้งแต่ DOMContentLoaded และไม่กระพริบ · พื้น body = token dark
 *       (2) สลับผ่าน UI แล้ว reload ค่ายังอยู่ — fixme จนกว่า S1/S2 วาง theme-toggle / theme-segment
 *       (3) `system` ตาม prefers-color-scheme (ทั้งตอนโหลดและเปลี่ยนระหว่างใช้งาน)
 *       (4) หลังสลับธีม `--user-scale` และ `data-effects` บน <html> ยังอยู่ (PrefsInit ไม่ชนกับ next-themes)
 * AC-03 dark: ไม่มี horizontal scroll บน 5 หน้าใน dark ที่ 1440 และ 390
 * ค่าสีที่คาดอ่านจาก app/globals.css (:root / .dark) — ไม่ hard-code
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEMO_CYCLE, loginAs, sectionUrl } from './helpers';

const THEME_KEY = 'aunqa_theme';
const PREFS_KEY = 'aunqa_ui_prefs';

// ─── token จาก globals.css → `rgb(r, g, b)` แบบที่ getComputedStyle คืน ───
const CSS = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function tokenRgb(scope: 'light' | 'dark', name: string): string {
  const re = scope === 'light' ? /(?:^|[\s}]):root\s*\{([^{}]*)\}/ : /(?:^|[\s}])\.dark\s*\{([^{}]*)\}/;
  const body = CSS.match(re)?.[1] ?? '';
  const v = body.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1].trim();
  const m = v?.match(/^([\d.]+) ([\d.]+)% ([\d.]+)%$/);
  if (!m) throw new Error(`--${name} (${scope}) not an HSL channel: ${v}`);
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); };
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}
const BG = { light: tokenRgb('light', 'background'), dark: tokenRgb('dark', 'background') };

/** รอให้หน้าเสถียร (เหมือน ui-u): h1 ขึ้น + AppLoader หาย */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('app-loader')).toHaveCount(0, { timeout: 20_000 });
}

const htmlState = (page: Page) => page.evaluate(() => {
  const el = document.documentElement;
  return {
    dark: el.classList.contains('dark'),
    bg: getComputedStyle(document.body).backgroundColor,
    scale: el.style.getPropertyValue('--user-scale').trim(),
    effects: el.getAttribute('data-effects'),
  };
});

/** ตั้งค่า localStorage ก่อนสคริปต์ของหน้า (ทุก navigation ใน context นี้) */
async function presetStorage(page: Page, values: Record<string, string>) {
  await page.addInitScript((v) => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}

/** บันทึกสถานะ class dark บน <html>: ณ DOMContentLoaded + ทุกครั้งที่ class เปลี่ยนตั้งแต่เริ่มโหลด */
async function recordHtmlClass(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __themeLog: boolean[]; __darkAtDCL: boolean | null };
    w.__themeLog = []; w.__darkAtDCL = null;
    // init script รันก่อนมี <html> (documentElement = null) → สังเกตทั้ง document แล้วกรองเฉพาะ <html>
    new MutationObserver(recs => {
      for (const r of recs) if (r.target === document.documentElement) w.__themeLog.push(document.documentElement.classList.contains('dark'));
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', () => { w.__darkAtDCL = document.documentElement.classList.contains('dark'); });
  });
}
const readHtmlLog = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __themeLog: boolean[]; __darkAtDCL: boolean | null };
  return { log: w.__themeLog, atDCL: w.__darkAtDCL };
});

// ─────────────────────────── AC-13 (1) ───────────────────────────
test.describe('AC-13 (1) aunqa_theme=dark → dark ตั้งแต่ DOMContentLoaded ไม่กระพริบ', () => {
  for (const url of ['/', '/login', '/app']) {
    test(`${url}: <html class~=dark> ตั้งแต่ DOMContentLoaded · class ไม่ถูกถอดภายหลัง · พื้น body = --background (dark)`, async ({ page }) => {
      // prefers-color-scheme = light → ถ้าได้ dark แปลว่ามาจากค่าที่เก็บไว้จริง ไม่ใช่จากระบบ
      await page.emulateMedia({ colorScheme: 'light' });
      if (url === '/app') await loginAs(page, 'chair1');
      await presetStorage(page, { [THEME_KEY]: 'dark' });
      await recordHtmlClass(page);
      await page.goto(url); await settle(page);
      const { log, atDCL } = await readHtmlLog(page);
      expect(atDCL, 'class dark ณ DOMContentLoaded').toBe(true);
      // ไม่กระพริบ: เมื่อได้ dark แล้วต้องไม่มีจังหวะที่ถูกถอดออก (light → dark → light ...)
      const firstDark = log.indexOf(true);
      expect(log.slice(Math.max(firstDark, 0)).every(Boolean), `ลำดับ class dark: ${JSON.stringify(log)}`).toBe(true);
      const s = await htmlState(page);
      expect(s.dark).toBe(true);
      expect(s.bg).toBe(BG.dark);
      expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('dark');
    });
  }

  test('negative: aunqa_theme=light ขณะระบบเป็น dark → ไม่มี class dark และพื้น body = --background (light)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await presetStorage(page, { [THEME_KEY]: 'light' });
    await recordHtmlClass(page);
    await page.goto('/login'); await settle(page);
    const { log, atDCL } = await readHtmlLog(page);
    expect(atDCL).toBe(false);
    expect(log.some(Boolean), `ลำดับ class dark: ${JSON.stringify(log)}`).toBe(false);
    const s = await htmlState(page);
    expect(s.dark).toBe(false);
    expect(s.bg).toBe(BG.light);
  });

  test('ค่าที่ไม่ถูกต้องใน aunqa_theme ไม่ทำให้หน้าพัง (ตกไปที่ค่าระบบหรือสว่าง ไม่ค้างเป็นหน้าเปล่า)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await presetStorage(page, { [THEME_KEY]: 'neon' });
    await page.goto('/login'); await settle(page);
    await expect(page.getByTestId('login-username')).toBeVisible();
    expect([BG.light, BG.dark]).toContain((await htmlState(page)).bg);
  });
});

// ─────────────────────────── AC-13 (2) ───────────────────────────
// fixme: S0 สร้าง ThemeToggleButton (`theme-toggle`) / ThemeSegment (`theme-segment-*`) แล้วแต่ยังไม่ mount ในหน้าใด
// → S2 วางในทอปบาร์/landing/login, S1 วางใน DisplayPrefs — qa-tester เอา fixme ออก (และเพิ่มเคส theme-segment) หลัง S1/S2
test.describe.fixme('AC-13 (2) สลับธีมผ่าน UI แล้ว reload ค่ายังอยู่', () => {
  test('/app topbar: theme-toggle สลับ light ↔ dark · เก็บใน aunqa_theme · reload ยังเป็นค่าเดิม', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toHaveAttribute('aria-label', 'สลับเป็นธีมมืด');
    await toggle.click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('dark');
    await expect(toggle).toHaveAttribute('aria-label', 'สลับเป็นธีมสว่าง');
    await page.reload(); await settle(page);
    const s = await htmlState(page);
    expect(s.dark).toBe(true);
    expect(s.bg).toBe(BG.dark);
    await page.getByTestId('theme-toggle').click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(false);
    await page.reload(); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
  });
});

// ─────────────────────────── AC-13 (3) ───────────────────────────
test.describe('AC-13 (3) system ตาม prefers-color-scheme', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`ไม่มีค่าเก็บ (ค่าเริ่ม = system) + ระบบ ${scheme} → ธีม ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/login'); await settle(page);
      const s = await htmlState(page);
      expect(s.dark).toBe(scheme === 'dark');
      expect(s.bg).toBe(BG[scheme]);
    });
  }

  test('aunqa_theme=system: เปลี่ยน prefers-color-scheme ระหว่างใช้งาน → ธีมเปลี่ยนตามโดยไม่ต้อง reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await presetStorage(page, { [THEME_KEY]: 'system' });
    await page.goto('/login'); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    expect((await htmlState(page)).bg).toBe(BG.dark);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(async () => (await htmlState(page)).dark).toBe(false);
  });

  test('ค่าที่เลือกเอง (dark) ชนะค่าระบบ: ระบบเปลี่ยนเป็น light ระหว่างใช้งาน ธีมยังเป็น dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await presetStorage(page, { [THEME_KEY]: 'dark' });
    await page.goto('/login'); await settle(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(300);
    expect((await htmlState(page)).dark).toBe(true);
  });
});

// ─────────────────────────── AC-13 (4) ───────────────────────────
test.describe('AC-13 (4) สลับธีมแล้ว --user-scale และ data-effects บน <html> ยังอยู่', () => {
  test('fontScale 125% + effects off: คงอยู่หลังสลับผ่านระบบ (system), ผ่านอีกแท็บ (storage) และหลัง reload', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await presetStorage(page, { [PREFS_KEY]: JSON.stringify({ fontScale: 1.25, effects: false }) });
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    const expectPrefs = async (label: string) => {
      const s = await htmlState(page);
      expect(s.scale, `${label}: --user-scale`).toBe('125%');
      expect(s.effects, `${label}: data-effects`).toBe('off');
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), `${label}: html font-size`).toBe('20px');
      return s;
    };
    expect((await expectPrefs('เริ่มต้น light')).dark).toBe(false);

    // สลับครั้งที่ 1: ธีม system ตามระบบที่เปลี่ยนเป็น dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    await expectPrefs('หลัง system → dark');

    // สลับครั้งที่ 2: อีกแท็บตั้ง aunqa_theme=light → next-themes รับ storage event แล้วสลับ
    const other = await context.newPage();
    await other.goto('/login');
    await other.evaluate((k) => localStorage.setItem(k, 'light'), THEME_KEY);
    await expect.poll(async () => (await htmlState(page)).dark).toBe(false);
    await other.close();
    await expectPrefs('หลังสลับเป็น light จากอีกแท็บ');

    // reload: ธีมที่เก็บ (light ชนะระบบ dark) + prefs ยังอยู่
    await page.reload(); await settle(page);
    const s = await expectPrefs('หลัง reload');
    expect(s.dark).toBe(false);
    expect(s.bg).toBe(BG.light);
  });
});

// ─────────────────────────── AC-03 dark ───────────────────────────
const VP = { '1440': { width: 1440, height: 900 }, '390': { width: 390, height: 844 } };
const DARK_PAGES: Array<[string, string]> = [
  ['/', '/'],
  ['/login', '/login'],
  ['/app', '/app'],
  ['dashboard', `/app/cycles/${encodeURIComponent(DEMO_CYCLE)}`],
  ['section 3.6', sectionUrl(DEMO_CYCLE, '3.6')],
];

for (const [label, vp] of Object.entries(VP)) {
  test(`AC-03 dark @${label}: 5 หน้า (landing, login, /app, dashboard, section editor) ไม่มี horizontal scroll`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(vp);
    await page.emulateMedia({ colorScheme: 'dark' });
    await presetStorage(page, { [THEME_KEY]: 'dark' });
    const bad: string[] = [];
    for (const [name, url] of DARK_PAGES) {
      if (name === '/app') await loginAs(page, 'chair1');
      await page.goto(url); await settle(page);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      }));
      expect(r.dark, `${name}: ต้องอยู่ในธีมมืด`).toBe(true);
      if (r.sw > r.iw) bad.push(`${name}: scrollWidth ${r.sw} > ${r.iw}`);
    }
    expect(bad, 'AC-03 horizontal scroll (dark)').toEqual([]);
  });
}
