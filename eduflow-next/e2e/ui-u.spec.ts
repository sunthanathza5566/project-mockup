/**
 * Phase U — เช็ก acceptance criteria ของ UI อัตโนมัติ (ADR-UI-001 7.4) — TASK-0001 U2-Q
 * AC-02 ขนาดตัวอักษร · AC-03 ไม่มี horizontal scroll (390/768/1440) · AC-04(ก) fontScale 125% ไม่ล้น
 * AC-05 target size · AC-06 focus ring + ไม่มี keyboard trap + skip link · AC-08 reduced motion
 * AC-09 ฟอนต์ Sarabun จริง + grep ฟอนต์เก่า · AC-10 ไม่มี emoji (grep + ข้อความบนหน้า)
 *
 * หมายเหตุ fixture: หน้า `/assess` ต้อง "หลัง lock" — ตั้งสถานะรอบใน localStorage ตรง ๆ (under_assessment + lockedAt)
 * เพื่อวัด layout เท่านั้น (flow จริงของการล็อก/ประเมินมีเทสต์ใน flows-b และ tests/phase-u.test.ts)
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEMO_CYCLE, loginAs, sectionUrl } from './helpers';

type Viewport = { width: number; height: number };
const VP: Record<string, Viewport> = {
  '390': { width: 390, height: 844 },
  '768': { width: 768, height: 1024 },
  '1440': { width: 1440, height: 900 },
};

const XS_CLASSES = ['aq-pill', 'aq-badge', 'aq-count', 'aq-heat-cell__label', 'aq-chart-label', 'aq-kbd'];
const SM_CLASSES = ['aq-help', 'aq-meta', 'aq-crumbs', 'aq-btn-reason', 'aq-field-error', 'aq-saved', 'aq-nav-group',
  'aq-kpi__label', 'aq-step__meta', 'aq-legend', 'aq-progress__label', 'aq-term__body',
  // components.md C13: ป้ายแถวเกณฑ์ของ heatmap = fs-sm 600 แต่ T2.3 ไม่ได้ระบุ class นี้ → ถือตาม C13 (จดเป็น spec gap ใน Found Issues)
  'aq-heat-label'];

const EMOJI_SRC = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]';

interface Audit {
  scrollWidth: number; innerWidth: number;
  fontBad: string[]; targetBad: string[]; emoji: string[];
}

/** วัดหน้าปัจจุบัน (รันในเบราว์เซอร์) */
async function audit(page: Page, mode: { targets: 'desktop' | 'mobile' | 'none'; fonts: boolean }): Promise<Audit> {
  return page.evaluate(({ mode, XS, SM, EMOJI_SRC }) => {
    const xsSel = XS.map(c => '.' + c).join(',');
    const smSel = SM.map(c => '.' + c).join(',') + ',th,caption,figcaption';
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return false;
      if (r.right <= 0 || r.left >= innerWidth) return false; // drawer ปิดอยู่นอกจอ
      return (el as any).checkVisibility ? (el as any).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
    };
    const short = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 40);
    const desc = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${(el as HTMLElement).dataset?.testid ? `[${(el as HTMLElement).dataset.testid}]` : ''}.${(el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.')}`;

    // AC-02 + AC-10 (ข้อความที่มองเห็น)
    const fontBad: string[] = []; const emoji: string[] = [];
    const re = new RegExp(EMOJI_SRC, 'u');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent || '';
      if (!text.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'TITLE'].includes(el.tagName)) continue;
      seen.add(el);
      if (!vis(el)) continue;
      if (re.test(text)) emoji.push(`${desc(el)} "${short(text)}"`);
      if (!mode.fonts) continue;
      let fs = parseFloat(getComputedStyle(el).fontSize);
      // SVG: ขนาดที่เห็นจริง = font-size × สเกลของ viewBox
      if (el instanceof SVGGraphicsElement) {
        const m = el.getScreenCTM();
        if (m) fs = Math.round(fs * Math.hypot(m.a, m.b) * 10) / 10;
      }
      const xs = !!el.closest(xsSel); const sm = !!el.closest(smSel);
      const min = xs ? 13 : sm ? 14 : 16;
      if (fs + 0.05 < min) fontBad.push(`${fs}px<${min} ${desc(el)} "${short(text)}"`);
    }
    if (mode.fonts) {
      // ช่องกรอก (ไม่มี text node) ต้อง ≥16
      document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), select, textarea').forEach(el => {
        if (!vis(el)) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs + 0.05 < 16 && !el.closest(smSel) && !el.closest(xsSel)) fontBad.push(`${fs}px<16 ${desc(el)}`);
      });
    }

    // AC-05
    const targetBad: string[] = [];
    if (mode.targets !== 'none') {
      const sel = 'button, a.aq-btn, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, [role=tab], .aq-nav-item';
      document.querySelectorAll(sel).forEach(el => {
        if (!vis(el)) return;
        if ((el as HTMLInputElement).type === 'file' && getComputedStyle(el).opacity === '0') return; // input file โปร่งใสทับ dropzone
        const r = el.getBoundingClientRect();
        const w = Math.round(r.width * 10) / 10, h = Math.round(r.height * 10) / 10;
        const tag = `${desc(el)} "${short((el as HTMLElement).innerText || (el as HTMLElement).getAttribute('aria-label') || '')}" ${w}×${h}`;
        if (w < 24 || h < 24) { targetBad.push('<24 ' + tag); return; }
        if (el.matches('.aq-term__btn, .aq-chip__remove')) { if (w < 31.5 || h < 31.5) targetBad.push('<32 ' + tag); return; }
        // 1440: compact 40 (C1) + select ระดับใน matrix หลักสูตร 40 (pages.md หลักสูตร: "select ระดับในโหมดแก้ไขสูง 40")
        const compact = el.matches('.aq-btn-compact') || el.matches('.aq-matrix select');
        const min = mode.targets === 'desktop' && compact ? 40 : 44;
        if (h < min - 0.5) targetBad.push(`h<${min} ${tag}`);
      });
    }
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, fontBad, targetBad, emoji };
  }, { mode, XS: XS_CLASSES, SM: SM_CLASSES, EMOJI_SRC });
}

/** รอให้หน้าเสถียร: h1 ขึ้น + skeleton/loader หาย */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('app-loader')).toHaveCount(0, { timeout: 20_000 });
  await page.waitForTimeout(450); // Loading แสดง skeleton หลัง 300ms (T8/C?) — รอให้พ้นช่วง
}

interface Visit { name: string; go: (p: Page) => Promise<void> }
const visit = (name: string, url: string): Visit => ({ name, go: async p => { await p.goto(url); await settle(p); } });

/** รายการหน้า AC-03 (หลัง login chair1) — `/assess` แยกไว้ท้ายสุดเพราะต้องแก้สถานะรอบ */
function appPages(): Visit[] {
  const enc = encodeURIComponent(DEMO_CYCLE);
  return [
    visit('/app', '/app'),
    visit('/app/cycles', '/app/cycles'),
    visit('dashboard', `/app/cycles/${enc}`),
    { name: 'dashboard (แสดง gap ทั้งหมด)', go: async p => {
      await p.goto(`/app/cycles/${enc}`); await settle(p);
      const more = p.getByRole('button', { name: /แสดงทั้งหมด/ });
      if (await more.count()) await more.first().click();
      await p.waitForTimeout(300);
    } },
    visit('assign', `/app/cycles/${enc}/assign`),
    visit('section 3.6', sectionUrl(DEMO_CYCLE, '3.6')),
    visit('/app/evidence', '/app/evidence'),
    { name: '/app/evidence (เปิดฟอร์ม)', go: async p => {
      await p.goto('/app/evidence'); await settle(p);
      await p.getByTestId('ev-new').click();
      await expect(p.getByTestId('ev-title')).toBeVisible();
    } },
    { name: '/app/evidence/{id}', go: async p => {
      await p.goto('/app/evidence'); await settle(p);
      const href = await p.getByTestId('ev-table').locator('tbody tr td:first-child a').first().getAttribute('href');
      expect(href).toBeTruthy();
      await p.goto(href!); await settle(p);
    } },
    { name: '/app/curriculum (ทุกแท็บ)', go: async p => { await p.goto('/app/curriculum'); await settle(p); } },
    { name: '/app/metrics (เปิด import)', go: async p => {
      await p.goto('/app/metrics'); await settle(p);
      const panel = p.getByTestId('import-panel');
      await panel.locator('summary').first().click();
      await p.waitForTimeout(200);
    } },
    visit('/app/actions', '/app/actions'),
    visit('/app/review', '/app/review'),
    visit('/app/export', '/app/export'),
    visit('/app/admin', '/app/admin'),
    visit('/app/requirements', '/app/requirements'),
    { name: '/zzz', go: async p => { await p.goto('/zzz'); await settle(p); } },
  ];
}

/** เดินทุกหน้าใน AC-03 → คืนรายการปัญหาแยกประเภท */
async function walkAll(page: Page, opts: { targets: 'desktop' | 'mobile' | 'none'; fonts: boolean; fontScale?: number }) {
  const problems = { hscroll: [] as string[], font: [] as string[], target: [] as string[], emoji: [] as string[] };
  const record = (name: string, a: Audit) => {
    if (a.scrollWidth > a.innerWidth) problems.hscroll.push(`${name}: scrollWidth ${a.scrollWidth} > ${a.innerWidth}`);
    a.fontBad.map(x => `${name}: ${x}`).forEach(x => problems.font.push(x));
    a.targetBad.map(x => `${name}: ${x}`).forEach(x => problems.target.push(x));
    a.emoji.forEach(x => problems.emoji.push(`${name}: ${x}`));
  };
  if (opts.fontScale) {
    await page.addInitScript((s) => {
      const k = 'aunqa_ui_prefs';
      let cur: Record<string, unknown> = {};
      try { cur = JSON.parse(localStorage.getItem(k) || '{}'); } catch { /* ignore */ }
      localStorage.setItem(k, JSON.stringify({ ...cur, fontScale: s }));
    }, opts.fontScale);
  }
  const mode = { targets: opts.targets, fonts: opts.fonts };

  // ก่อนล็อกอิน
  for (const v of [visit('/', '/'), visit('/login', '/login')]) {
    await v.go(page);
    if (opts.fontScale) expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(`${16 * opts.fontScale}px`);
    record(v.name, await audit(page, mode));
  }
  await loginAs(page, 'chair1');
  for (const v of appPages()) {
    await v.go(page);
    record(v.name, await audit(page, mode));
    if (v.name.startsWith('/app/curriculum')) {
      const tabs = page.getByRole('tab');
      const n = await tabs.count();
      expect(n).toBeGreaterThan(1);
      for (let i = 1; i < n; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(250);
        record(`${v.name} แท็บ ${i + 1}`, await audit(page, mode));
      }
    }
  }
  // /assess หลัง lock (fixture: ตั้งสถานะใน localStorage) → assess1
  await page.evaluate((id) => {
    const rows = JSON.parse(localStorage.getItem('aunqa_cycles') || '[]');
    for (const c of rows) if (c.id === id) { c.status = 'under_assessment'; c.lockedAt = Date.now(); c.lockedBy = 'u-dean'; }
    localStorage.setItem('aunqa_cycles', JSON.stringify(rows));
  }, DEMO_CYCLE);
  await loginAs(page, 'assess1');
  await page.goto(`/app/cycles/${encodeURIComponent(DEMO_CYCLE)}/assess`);
  await settle(page);
  await expect(page.getByTestId('assess-crit-1')).toBeVisible();
  record('assess (หลัง lock)', await audit(page, mode));
  return problems;
}

for (const [label, vp] of Object.entries(VP)) {
  test(`AC-02/03/05/10 ทุกหน้า @${label}: ไม่มี h-scroll · ตัวอักษร ≥13/14/16 · target · ไม่มี emoji`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(vp);
    const targets = label === '1440' ? 'desktop' : label === '390' ? 'mobile' : 'none';
    const p = await walkAll(page, { targets, fonts: true });
    expect.soft(p.hscroll, 'AC-03 horizontal scroll').toEqual([]);
    expect.soft(p.font, 'AC-02 font size').toEqual([]);
    expect.soft(p.target, 'AC-05 target size').toEqual([]);
    expect.soft(p.emoji, 'AC-10 emoji บนหน้า').toEqual([]);
  });
}

for (const label of ['1440', '390']) {
  test(`AC-03/04(ก) fontScale 125% @${label}: ไม่มี h-scroll ทุกหน้า`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(VP[label]);
    const p = await walkAll(page, { targets: 'none', fonts: false, fontScale: 1.25 });
    expect(p.hscroll, 'AC-04 horizontal scroll ที่ 125%').toEqual([]);
  });
}

// ─────────────────────────── AC-06 focus ───────────────────────────
interface FocusInfo { desc: string; ok: boolean; why: string; inDialog: boolean }
async function focusInfo(page: Page): Promise<FocusInfo | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (c: { r: number; g: number; b: number }) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    // element ที่วาด ring: ตัวมันเอง หรือ ancestor ที่ใช้ :focus-within (เช่น .aq-card--link ที่ลิงก์คลุมการ์ด)
    let ringEl: HTMLElement = el;
    if (getComputedStyle(el).outlineStyle === 'none') {
      let a = el.parentElement;
      for (let i = 0; a && i < 4; i++, a = a.parentElement) if (getComputedStyle(a).outlineStyle !== 'none') { ringEl = a; break; }
    }
    const cs = getComputedStyle(ringEl);
    // พื้นหลังจริงตรงตำแหน่ง ring (นอกกรอบ element) — ใช้ elementsFromPoint เพราะบาง layout วางทับด้วย grid (เช่น .aq-auth__tools บนแผงเข้ม)
    const rr = ringEl.getBoundingClientRect();
    const px = Math.max(0, rr.left - 3), py = Math.min(innerHeight - 1, Math.max(0, rr.top + rr.height / 2));
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    const stack = document.elementsFromPoint(px, py).filter(x => !ringEl.contains(x));
    // stack เรียงจากบนลงล่าง (รวม ancestor และ sibling ที่ถูกวางทับ) → ตัวแรกที่มีพื้นทึบ = สีที่เห็นจริง
    for (const s0 of stack) {
      const c = parse(getComputedStyle(s0).backgroundColor);
      if (c && c.a > 0.5) { bg = c; break; }
    }
    const oc = parse(cs.outlineColor);
    const w = parseFloat(cs.outlineWidth);
    const ratio = oc ? (Math.max(L(oc), L(bg)) + 0.05) / (Math.min(L(oc), L(bg)) + 0.05) : 0;
    const desc = `${el.tagName.toLowerCase()}${el.dataset.testid ? `[${el.dataset.testid}]` : ''}.${String(el.className || '').split(/\s+/)[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
    const ok = cs.outlineStyle !== 'none' && w >= 2 && ratio >= 3;
    return { desc, ok, why: `outline ${cs.outlineStyle} ${w}px ratio ${ratio.toFixed(2)} (ring on ${ringEl === el ? 'self' : ringEl.className.split(' ')[0]}, bg rgb(${bg.r},${bg.g},${bg.b}))`, inDialog: !!el.closest('[role=dialog]') };
  });
}

async function tabThrough(page: Page, n = 30) {
  const bad: string[] = []; const seq: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const f = await focusInfo(page);
    if (!f) { seq.push('(body)'); continue; }
    seq.push(f.desc);
    if (!f.ok) bad.push(`${i + 1}: ${f.desc} — ${f.why}`);
  }
  return { bad, seq };
}

test.describe('AC-06 focus', () => {
  test.use({ viewport: VP['1440'] });

  test('/login: ทุก element ที่โฟกัสมี outline ≥2px contrast ≥3 · ไม่ติดค้าง', async ({ page }) => {
    await page.goto('/login'); await settle(page);
    const { bad, seq } = await tabThrough(page);
    // รวม skip link บนแผงเข้ม (BUG-0001-U2Q-4 ปิดแล้วใน U3 fix — ไม่กรองออกอีก)
    expect(bad).toEqual([]);
    // ไม่มี trap: focus ไม่ค้างที่เดิมติดกัน และวนได้หลายตัว
    for (let i = 1; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] !== '(body)', `ค้างที่ ${seq[i]}`).toBe(false);
    expect(new Set(seq).size).toBeGreaterThan(5);
  });

  test('/app: skip link เป็นตัวแรก มองเห็นเมื่อโฟกัส และ Enter ไปที่ #main · Tab 30 ครั้ง focus ring ครบ', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    await page.keyboard.press('Tab');
    const skip = page.locator('a.aq-skip');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText('ข้ามไปเนื้อหาหลัก');
    const box = await skip.boundingBox();
    expect(box && box.y >= 0 && box.y < 200, `skip link ต้องอยู่ในจอเมื่อโฟกัส (${JSON.stringify(box)})`).toBe(true);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id === 'main' || !!document.activeElement?.closest('#main'))).toBe(true);
    // Tab ต่อจาก #main ต้องเข้าเนื้อหาหลัก (ไม่กลับไปเมนู)
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#main'))).toBe(true);

    await page.goto('/app'); await settle(page);
    const { bad, seq } = await tabThrough(page);
    expect(bad).toEqual([]);
    for (let i = 1; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] !== '(body)', `ค้างที่ ${seq[i]}`).toBe(false);
    expect(new Set(seq).size).toBeGreaterThan(10);
  });

  test('section editor: Tab 30 ครั้ง focus ring ครบ ไม่ติดค้าง', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto(sectionUrl(DEMO_CYCLE, '3.6')); await settle(page);
    const { bad, seq } = await tabThrough(page);
    expect(bad).toEqual([]);
    for (let i = 1; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] !== '(body)', `ค้างที่ ${seq[i]}`).toBe(false);
    expect(new Set(seq).size).toBeGreaterThan(10);
  });

  test('drawer มือถือ: Esc ออกได้ และคืน focus ไปปุ่มเมนู (trap ที่อนุญาต)', async ({ page }) => {
    await page.setViewportSize(VP['390']);
    await loginAs(page, 'chair1');
    await page.goto('/app'); await settle(page);
    await page.getByTestId('nav-menu').click();
    await expect(page.locator('#app-sidebar')).toHaveClass(/is-open/);
    for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#app-sidebar'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#app-sidebar')).not.toHaveClass(/is-open/);
    await expect(page.getByTestId('nav-menu')).toBeFocused();
  });
});

// ─────────────────────────── AC-08 reduced motion ───────────────────────────
async function runningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() => document.getAnimations()
    .filter(a => a.playState === 'running' && Number(a.effect?.getComputedTiming().duration) > 10)
    .map(a => {
      const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
      const name = (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || a.id;
      return `${name} on ${t?.tagName.toLowerCase()}.${String(t?.className || '').split(/\s+/)[0]} (${a.effect?.getComputedTiming().duration}ms)`;
    }));
}

test.describe('AC-08 reduced motion', () => {
  test.use({ viewport: VP['1440'] });

  test('AppLoader (login), /app, dashboard: ไม่มี animation ที่ running > 10ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login'); await settle(page);
    await page.getByTestId('login-username').fill('chair1');
    await page.getByTestId('login-password').fill('demo1234');
    await page.getByTestId('login-submit').click();
    const loader = page.getByTestId('app-loader');
    await expect(loader).toBeVisible();
    expect(await runningAnimations(page), 'AppLoader').toEqual([]);
    await page.waitForURL('**/app', { timeout: 30_000 });
    await settle(page);
    expect(await runningAnimations(page), '/app').toEqual([]);
    await page.goto(`/app/cycles/${encodeURIComponent(DEMO_CYCLE)}`); await settle(page);
    expect(await runningAnimations(page), 'dashboard').toEqual([]);
  });

  test('เทียบ: ไม่ลด motion → loader มี animation จริง (เทสต์ข้างบนจึงมีความหมาย)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/login'); await settle(page);
    await page.getByTestId('login-username').fill('chair1');
    await page.getByTestId('login-password').fill('demo1234');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('app-loader')).toBeVisible();
    expect((await runningAnimations(page)).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────── AC-09 ฟอนต์ ───────────────────────────
test.describe('AC-09 ฟอนต์ไทยจริง', () => {
  for (const url of ['/', '/login', '/app']) {
    test(`${url}: body ใช้ Sarabun และโหลดฟอนต์ Sarabun สำเร็จ`, async ({ page }) => {
      if (url === '/app') await loginAs(page, 'chair1');
      await page.goto(url); await settle(page);
      const r = await page.evaluate(async () => {
        await document.fonts.ready;
        const loaded = await document.fonts.load('16px Sarabun', 'ภาษาไทย');
        return {
          family: getComputedStyle(document.body).fontFamily,
          check: document.fonts.check('16px Sarabun', 'ภาษาไทย'),
          faces: loaded.map(f => `${f.family}:${f.weight}:${f.status}`),
          used: Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')),
        };
      });
      expect(r.family.replace(/["']/g, '')).toMatch(/^Sarabun\b/);
      expect(r.check).toBe(true);
      // check() คืน true ได้ถ้าไม่มี FontFace ชื่อนี้เลย → ยืนยันว่ามี face Sarabun โหลดจริง
      expect(r.faces.length, 'FontFace Sarabun ต้องมีและโหลดได้').toBeGreaterThan(0);
      expect(r.faces.every(f => f.endsWith(':loaded'))).toBe(true);
      expect(Array.from(new Set(r.used))).toEqual(['Sarabun']);
    });
  }

  test('grep: ไม่มี Cormorant / DM Sans ใน app/ components/ context/', () => {
    const hits = grepTree(['app', 'components', 'context'], /\.(tsx?|css)$/, /Cormorant|DM Sans|DM\+Sans/);
    expect(hits).toEqual([]);
  });
});

// ─────────────────────────── AC-10 emoji (grep) ───────────────────────────
test('AC-10 grep: ไม่มี emoji (U+1F300–1FAFF, U+2600–27BF) ใน app/ components/ context/ *.tsx', () => {
  const hits = grepTree(['app', 'components', 'context'], /\.tsx$/, new RegExp(EMOJI_SRC, 'u'));
  expect(hits).toEqual([]);
});

function grepTree(dirs: string[], file: RegExp, re: RegExp): string[] {
  const root = path.resolve(__dirname, '..');
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p); continue; }
      if (!file.test(e.name)) continue;
      fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (re.test(line)) out.push(`${path.relative(root, p)}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
  };
  dirs.forEach(d => walk(path.join(root, d)));
  return out;
}

// ─────────────────────────── regression ของ bug ที่ปิดแล้ว (BUG-0001-U2Q-1..4 — แก้ใน U3 fix) ───────────────────────────
test.describe('Regression BUG-0001-U2Q-1..4 (ปิดแล้ว)', () => {
  test('BUG-0001-U2Q-1 TrendChart: ป้ายกราฟที่เห็นจริงต้อง ≥13px ที่ 390 และ 1440 (AC-02)', async ({ page }) => {
    await loginAs(page, 'chair1');
    const sizes: Record<string, number> = {};
    for (const w of [390, 1440]) {
      await page.setViewportSize(w === 390 ? VP['390'] : VP['1440']);
      await page.goto('/app/metrics'); await settle(page);
      sizes[w] = await page.evaluate(() => Math.min(...Array.from(document.querySelectorAll<SVGTextElement>('text.aq-chart-label'))
        .map(t => { const m = t.getScreenCTM()!; return parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b); })));
    }
    expect(sizes[390], `ขนาดเล็กสุด @390`).toBeGreaterThanOrEqual(12.95);
    expect(sizes[1440], `ขนาดเล็กสุด @1440`).toBeGreaterThanOrEqual(12.95);
  });

  test('BUG-0001-U2Q-2 ผัง prerequisite: ชื่อวิชาใน SVG ต้อง ≥16px หรืออยู่ใน class ที่อนุญาต 13px (AC-02/T2.3)', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto('/app/curriculum'); await settle(page);
    await page.getByTestId('cur-tab-prereq').click();
    await page.waitForTimeout(300);
    const bad = await page.evaluate((xs) => Array.from(document.querySelectorAll<SVGTextElement>('[data-testid="cur-panel-prereq"] svg text'))
      .filter(t => (t.textContent || '').trim())
      .map(t => { const m = t.getScreenCTM()!; return { s: parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b), ok13: !!t.closest(xs) }; })
      .filter(x => x.s < 15.95 && !(x.ok13 && x.s >= 12.95)).length, XS_CLASSES.map(c => '.' + c).join(','));
    expect(bad).toBe(0);
  });

  test('BUG-0001-U2Q-3 แดชบอร์ด @1440: select gap-filter ต้องสูง ≥44 (AC-05 — compact 40 ใช้กับปุ่มเท่านั้น)', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await loginAs(page, 'chair1');
    await page.goto(`/app/cycles/${encodeURIComponent(DEMO_CYCLE)}`); await settle(page);
    const box = await page.getByTestId('gap-filter').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  });

  test('BUG-0001-U2Q-4 /login @1440: focus ring ของ skip link ต้อง contrast ≥3 กับพื้นที่อยู่ (AC-06)', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await page.goto('/login'); await settle(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('a.aq-skip')).toBeFocused();
    const f = await focusInfo(page);
    expect(f?.ok, f?.why).toBe(true);
  });
});
