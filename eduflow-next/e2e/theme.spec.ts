/**
 * TASK-0002 Q2a — ธีม: ค่าเริ่มต้นสว่าง (AC-13 R2 · ADR-UI-003 D2 · earth-tokens §E5)
 * AC-13 R2 (1) ไม่มี `aunqa_theme` + ระบบเป็น dark → <html> ไม่มี class dark ตลอดการโหลด · พื้น body = --background (light)
 *          (2) `aunqa_theme='dark'` → <html class~=dark> ตั้งแต่ DOMContentLoaded และไม่กระพริบ · พื้น body = token dark (คงเดิม)
 *          (3) สลับผ่าน UI: /app `user-menu` → `theme-segment-dark` · /login `display-menu` → `theme-segment-dark` → reload ค่ายังอยู่
 *          (4) `theme-segment-system` (ป้าย "ตามเครื่อง") ตาม prefers-color-scheme ทั้งตอนโหลดและเปลี่ยนระหว่างใช้งาน
 *          (5) หลังสลับธีม `--user-scale` และ `data-effects` บน <html> ยังอยู่ (PrefsInit ไม่ชนกับ next-themes) (คงเดิม)
 * AC-03 dark: ไม่มี horizontal scroll บน 5 หน้าใน dark ที่ 1440 และ 390
 * ค่าสีที่คาดอ่านจาก app/globals.css (:root / .dark) — ไม่ hard-code
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEMO_CYCLE, loginAs, openUserMenu, sectionUrl } from './helpers';

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


/**
 * เปิดชุดควบคุม "การแสดงผล" ใน /app ให้เห็น ThemeSegment (`theme-segment`) — รอบ 2 อยู่ในเมนูผู้ใช้ (`user-menu`, R2-F1)
 * Q2c: ลบ fallback `display-prefs` แล้ว (F1 วาง user-menu · sidebar ไม่มีปุ่มการแสดงผลอีก)
 */
async function openAppThemeSegment(page: Page) {
  const panel = await openUserMenu(page);
  const seg = panel.getByTestId('theme-segment');
  await expect(seg).toBeVisible();
  return seg;
}

// ─────────────────────────── AC-13 R2 (1) ───────────────────────────
test.describe('AC-13 R2 (1) ค่าเริ่มต้นสว่าง: ไม่มีค่าเก็บ + ระบบเป็น dark → ไม่มี class dark ตลอดการโหลด', () => {
  for (const url of ['/', '/login', '/app']) {
    test(`${url}: ไม่มี aunqa_theme + prefers-color-scheme dark → <html> ไม่เคยมี class dark · พื้น body = --background (light)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      if (url === '/app') {
        await loginAs(page, 'chair1');
        // loginAs ไม่แตะ aunqa_theme — ยืนยันว่าไม่มีค่าเก็บจริงก่อนโหลดหน้าที่วัด
        await page.evaluate((k) => localStorage.removeItem(k), THEME_KEY);
      }
      await recordHtmlClass(page);
      await page.goto(url); await settle(page);
      await page.waitForTimeout(300); // เผื่อ effect ของ next-themes หลัง hydrate
      const { log, atDCL } = await readHtmlLog(page);
      expect(atDCL, 'class dark ณ DOMContentLoaded').toBe(false);
      expect(log.some(Boolean), `ลำดับ class dark: ${JSON.stringify(log)}`).toBe(false);
      const s = await htmlState(page);
      expect(s.dark).toBe(false);
      expect(s.bg).toBe(BG.light);
      // ค่าเริ่มต้นไม่ใช่ "ตามเครื่อง": ไม่มีค่า system ถูกเขียนเก็บ
      expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).not.toBe('system');
    });
  }

  test('/app: ThemeSegment แสดงค่าเริ่มต้น "สว่าง" (aria-checked) แม้ระบบเป็น dark · ป้าย 3 ค่า สว่าง/มืด/ตามเครื่อง', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await loginAs(page, 'chair1');
    await page.evaluate((k) => localStorage.removeItem(k), THEME_KEY);
    await page.goto('/app'); await settle(page);
    const seg = await openAppThemeSegment(page);
    await expect(seg).toHaveAttribute('role', 'radiogroup');
    await expect(seg.getByRole('radio')).toHaveText(['สว่าง', 'มืด', 'ตามเครื่อง']);
    await expect(seg).not.toContainText('ตามระบบ');
    await expect(page.getByTestId('theme-segment-light')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('theme-segment-system')).toHaveAttribute('aria-checked', 'false');
    expect((await htmlState(page)).dark).toBe(false);
  });
});

// ─────────────────────────── AC-13 R2 (2) ───────────────────────────
test.describe('AC-13 R2 (2) aunqa_theme=dark → dark ตั้งแต่ DOMContentLoaded ไม่กระพริบ', () => {
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

// ─────────────────────────── AC-13 R2 (3) ───────────────────────────
// Q2c: เปิดแล้ว (R2-F1 วาง user-menu · R2-F2 วาง display-menu บน /login)
test.describe('AC-13 R2 (3) สลับธีมผ่าน UI แล้ว reload ค่ายังอยู่', () => {
  test('/app: user-menu → theme-segment-dark → dark + เก็บ aunqa_theme · reload ยังเป็น dark · กลับเป็นสว่างได้', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
    await page.getByTestId('user-menu').click();
    await page.getByTestId('theme-segment-dark').click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    await expect(page.getByTestId('theme-segment-dark')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('user-menu-panel'), 'เปลี่ยนธีมแล้วเมนูไม่ปิด (§F2.3)').toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('dark');
    await page.reload(); await settle(page);
    const s = await htmlState(page);
    expect(s.dark).toBe(true);
    expect(s.bg).toBe(BG.dark);
    await page.getByTestId('user-menu').click();
    await page.getByTestId('theme-segment-light').click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(false);
    await page.reload(); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('light');
  });

  test('/login: display-menu → theme-segment-dark → dark + เก็บ aunqa_theme · reload ยังเป็น dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login'); await settle(page);
    expect((await htmlState(page)).dark).toBe(false);
    await page.getByTestId('display-menu').click();
    await expect(page.getByTestId('display-menu-panel')).toBeVisible();
    await page.getByTestId('theme-segment-dark').click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    // เปลี่ยนค่าไม่ปิด popover (§F2.3)
    await expect(page.getByTestId('display-menu-panel')).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('dark');
    await page.reload(); await settle(page);
    const s = await htmlState(page);
    expect(s.dark).toBe(true);
    expect(s.bg).toBe(BG.dark);
  });
});

// ─────────────────────────── AC-13 R2 (4) ───────────────────────────
test.describe('AC-13 R2 (4) "ตามเครื่อง" (system) ตาม prefers-color-scheme', () => {
  test('/app: กด theme-segment-system ("ตามเครื่อง") ขณะระบบ dark → dark · เปลี่ยนระบบระหว่างใช้งานตามทันที · reload ยังเป็น system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    expect((await htmlState(page)).dark, 'ค่าเริ่มต้นสว่างแม้ระบบ dark').toBe(false);
    await openAppThemeSegment(page);
    const sys = page.getByTestId('theme-segment-system');
    await expect(sys).toHaveText('ตามเครื่อง');
    await sys.click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    await expect(sys).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('system');
    expect((await htmlState(page)).bg).toBe(BG.dark);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(async () => (await htmlState(page)).dark).toBe(false);
    expect((await htmlState(page)).bg).toBe(BG.light);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    await page.reload(); await settle(page);
    expect((await htmlState(page)).dark).toBe(true);
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('system');
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`aunqa_theme=system + ระบบ ${scheme} ตอนโหลด → ธีม ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await presetStorage(page, { [THEME_KEY]: 'system' });
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

// ─────────────────────────── AC-13 R2 (5) ───────────────────────────
test.describe('AC-13 R2 (5) สลับธีมแล้ว --user-scale และ data-effects บน <html> ยังอยู่', () => {
  test('fontScale 125% + effects off: คงอยู่หลังสลับผ่านระบบ (system), ผ่านอีกแท็บ (storage) และหลัง reload', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await presetStorage(page, { [PREFS_KEY]: JSON.stringify({ fontScale: 1.25, effects: false }) });
    await loginAs(page, 'chair1');
    // ค่าเริ่มต้นเป็นสว่างแล้ว (R2) → ตั้ง system ครั้งเดียว (ไม่ใช้ init script เพราะจะทับค่าทุก reload)
    await page.evaluate((k) => localStorage.setItem(k, 'system'), THEME_KEY);
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

    // สลับครั้งที่ 3 ผ่าน UI (ThemeSegment): เลือก "มืด" → prefs ยังอยู่
    await openAppThemeSegment(page);
    await page.getByTestId('theme-segment-dark').click();
    await expect.poll(async () => (await htmlState(page)).dark).toBe(true);
    await expectPrefs('หลังเลือกมืดผ่าน ThemeSegment');
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
