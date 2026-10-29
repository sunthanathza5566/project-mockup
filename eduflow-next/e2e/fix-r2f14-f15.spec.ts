/**
 * TASK-0002 เฟส 6 สุดท้าย (หลัง R2-F14, R2-F15)
 * - R2-F14 N7–N9: ทุกตารางที่มีปุ่ม/ลิงก์/ช่องกรอกใน tbody — ไม่มีตัวควบคุมถูกซ่อน/ถูกตัดนอกกรอบ wrapper
 *   ที่ 1024@100% และ 1280/1366@125% (จุดสลับตาราง→การ์ดเป็น container query หน่วย rem) · ไม่มี h-scroll ระดับหน้า
 *   ตรรกะเดียวกับสคริปต์ audit-tables.mjs ของ R2-F14 (ยกเว้นตาราง 2 มิติ `.aq-matrix` ที่ตั้งใจให้เลื่อนในกรอบ)
 * - R2-F14 N10: แถบบน (`nav-user`) ไม่ทำให้หน้าเลื่อนแนวนอนที่ 1024@125% และ 768@125%
 * - R2-F15: `data-label` (ป้ายคอลัมน์ของโหมดการ์ด) แปลเป็นอังกฤษเมื่อเลือก English · กลับไทยได้ ·
 *   client-nav ไปหน้าอื่นขณะเป็น EN ป้ายยังเป็นอังกฤษ (MutationObserver)
 * ทุก test = context ใหม่ · ข้อมูลเดโม่ (ข้อมูลสมมติ)
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, loginAs } from './helpers';

const THAI = /[฀-๿]/;

async function useScale(page: Page, scale: number) {
  await page.context().addInitScript((s) => {
    if (!localStorage.getItem('aunqa_ui_prefs')) {
      localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: false, demoOpen: false }));
    }
  }, scale);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

type TableReport = { id: string; mode: string; n: number; bad: string[]; matrix: boolean };
/** ตรวจทุก table ใน #main: ตัวควบคุมใน tbody อยู่ในกรอบ wrapper (ตัวที่เลื่อนได้ใกล้สุด) ครบทั้งชิ้น + h-scroll ระดับหน้า */
async function auditTables(page: Page) {
  return page.evaluate(() => {
    const tables: TableReport[] = [];
    document.querySelectorAll<HTMLTableElement>('#main table').forEach(t => {
      let wrap: HTMLElement | null = t.parentElement;
      while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
      const wr = (wrap ?? document.documentElement).getBoundingClientRect();
      const matrix = !!t.closest('.aq-matrix');
      const bad: string[] = [];
      let n = 0;
      t.querySelectorAll<HTMLElement>('tbody button, tbody a, tbody select, tbody input').forEach(x => {
        const r = x.getBoundingClientRect();
        if (!r.width) return;
        n++;
        const vis = Math.min(r.right, wr.right, window.innerWidth) - Math.max(r.left, wr.left, 0);
        if (vis < r.width - 1) bad.push(`${(x.dataset.testid || x.innerText || x.getAttribute('aria-label') || x.tagName).trim().slice(0, 24)} vis${Math.round(vis)}/${Math.round(r.width)}`);
      });
      tables.push({ id: t.dataset.testid || 'table', mode: getComputedStyle(t).display === 'table' ? 'table' : 'card', n, bad, matrix });
    });
    return { tables, pageOverflow: document.documentElement.scrollWidth - window.innerWidth };
  });
}

type View = { user: string; url: string; clicks?: string[]; expect: string; minControls: number };
const VIEWS: View[] = [
  { user: 'chair1', url: '/app/review', expect: 'review-table', minControls: 2 },
  { user: 'chair1', url: '/app/actions', expect: 'action-table', minControls: 1 },
  { user: 'chair1', url: '/app/cycles', expect: 'cycles-table', minControls: 1 },
  { user: 'chair1', url: '/app/curriculum', clicks: ['cur-tab-plo'], expect: 'plo-table', minControls: 1 },
  { user: 'chair1', url: `/app/cycles/${DEMO_CYCLE}/assign`, expect: '', minControls: 0 },
  { user: 'chair1', url: `/app/evidence?cycle=${DEMO_CYCLE}`, expect: 'ev-table', minControls: 1 },
  { user: 'chair1', url: '/app/metrics', clicks: ['FIRST:metric-edit-'], expect: 'metric-table', minControls: 1 },
  { user: 'uadmin', url: '/app/admin', clicks: ['tab-users'], expect: 'users-table', minControls: 1 },
  { user: 'uadmin', url: '/app/admin', clicks: ['tab-users', 'FIRST:user-manage-'], expect: 'users-table', minControls: 1 },
];

const CONFIGS = [
  { w: 1024, scale: 1 },
  { w: 1280, scale: 1.25 },
  { w: 1366, scale: 1.25 },
];

test.describe('R2-F14 ตารางที่มีปุ่ม: ไม่มีตัวควบคุมถูกซ่อนนอกกรอบ', () => {
  for (const { w, scale } of CONFIGS) {
    for (const user of ['chair1', 'uadmin']) {
      test(`${user} @${w} ${scale * 100}%: ${user === "chair1" ? "review/actions/cycles/PLO/assign/evidence/metrics(แก้)" : "admin users + แผงจัดการ"} — ปุ่มอยู่ในกรอบ + หน้าไม่ h-scroll`, async ({ page }) => {
        await useScale(page, scale);
        await page.setViewportSize({ width: w, height: 900 });
        await loginAs(page, user);
        expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--user-scale'))).toBe(`${scale * 100}%`);
        const problems: string[] = [];
        for (const v of VIEWS.filter(x => x.user === user)) {
          await page.goto(v.url); await settle(page);
          for (const c of v.clicks ?? []) {
            if (c.startsWith('FIRST:')) await page.locator(`[data-testid^="${c.slice(6)}"]`).first().click();
            else await page.getByTestId(c).click();
            await page.waitForTimeout(400);
          }
          if (v.expect) await expect(page.getByTestId(v.expect), `${v.url} ต้องมี ${v.expect}`).toBeVisible();
          const r = await auditTables(page);
          const tag = `${v.url}${v.clicks ? '#' + v.clicks.join('+') : ''}`;
          if (v.expect) {
            const t = r.tables.find(x => x.id === v.expect);
            if (!t || t.n < v.minControls) problems.push(`${tag}: ${v.expect} มีตัวควบคุม ${t?.n ?? 0} < ${v.minControls}`);
          }
          for (const t of r.tables) if (!t.matrix && t.bad.length) problems.push(`${tag}: ${t.id}[${t.mode}] ${t.bad.slice(0, 4).join(', ')}`);
          if (r.pageOverflow > 1) problems.push(`${tag}: หน้าเลื่อนแนวนอน ${r.pageOverflow}px`);
        }
        expect(problems).toEqual([]);
      });
    }
  }

  test('negative: ตัวตรวจจับปุ่มที่ถูกซ่อนนอกกรอบได้จริง (ตารางบังคับกว้างใน wrapper แคบ)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await loginAs(page, 'chair1');
    await page.goto('/app/review'); await settle(page);
    await page.evaluate(() => {
      const main = document.querySelector('#main')!;
      const d = document.createElement('div');
      d.style.cssText = 'overflow-x:auto;width:200px';
      d.innerHTML = '<table data-testid="probe-table" style="width:900px;display:table"><tbody><tr><td style="width:850px">x</td><td><button>probe</button></td></tr></tbody></table>';
      main.prepend(d);
    });
    const r = await auditTables(page);
    const probe = r.tables.find(t => t.id === 'probe-table');
    expect(probe?.n).toBe(1);
    expect(probe?.bad.length).toBe(1);
  });
});

test.describe('R2-F14 N10 แถบบนไม่ล้นที่ 125%', () => {
  for (const w of [1024, 768]) {
    for (const user of ['chair1', 'uadmin']) {
      test(`${user} @${w} 125%: nav-user อยู่ในจอ + หน้าไม่เลื่อนแนวนอน (/app, /app/review|admin)`, async ({ page }) => {
        await useScale(page, 1.25);
        await page.setViewportSize({ width: w, height: 900 });
        await loginAs(page, user);
        for (const url of ['/app', user === 'uadmin' ? '/app/admin' : '/app/review']) {
          await page.goto(url); await settle(page);
          const nav = page.getByTestId('nav-user');
          await expect(nav).toBeVisible();
          const r = await nav.evaluate(e => ({
            right: e.getBoundingClientRect().right,
            iw: window.innerWidth,
            over: document.documentElement.scrollWidth - window.innerWidth,
          }));
          expect(r.right, `${url} nav-user ขอบขวา`).toBeLessThanOrEqual(r.iw + 1);
          expect(r.over, `${url} หน้าเลื่อนแนวนอน`).toBeLessThanOrEqual(1);
        }
      });
    }
  }
});

// ─────────────────────────── R2-F15 ───────────────────────────
async function labels(page: Page, testId: string) {
  return page.getByTestId(testId).locator('td[data-label]').evaluateAll(tds => tds.map(td => td.getAttribute('data-label') || ''));
}

test.describe('R2-F15 data-label ของการ์ดแปลตามภาษา', () => {
  test('chair1 /app/review @1024: EN → Req./Cycle/Submitted by/Summary · TH → ข้อ/รอบ/ส่งโดย/สรุป · client-nav ไป /app/cycles ยัง EN', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await loginAs(page, 'chair1');
    await page.goto('/app/review'); await settle(page);
    const table = page.getByTestId('review-table');
    await expect(table).toBeVisible();
    expect(await table.evaluate(t => getComputedStyle(t).display), 'ที่ 1024 review ต้องเป็นโหมดการ์ด').not.toBe('table');

    const th0 = await labels(page, 'review-table');
    expect(th0.length).toBeGreaterThan(0);
    for (const v of ['ข้อ', 'รอบ', 'ส่งโดย', 'สรุป']) expect(th0).toContain(v);

    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await labels(page, 'review-table')).filter(v => THAI.test(v))).toEqual([]);
    const en = await labels(page, 'review-table');
    for (const v of ['Req.', 'Cycle', 'Submitted by', 'Summary']) expect(en).toContain(v);
    // ป้ายที่ผู้ใช้เห็นจริงมาจาก ::before content: attr(data-label)
    const before = await table.locator('td[data-label]').first().evaluate(td => getComputedStyle(td, '::before').content);
    expect(before).not.toMatch(THAI);

    // client-nav (sidebar) ขณะเป็น EN → แถวที่ React วาดใหม่ได้ป้ายอังกฤษ
    await page.getByTestId('nav-cycles').click();
    await page.waitForURL('**/app/cycles');
    await expect(page.getByTestId('cycles-table')).toBeVisible();
    await expect.poll(async () => {
      const ls = await labels(page, 'cycles-table');
      return ls.length > 0 && ls.every(v => !THAI.test(v));
    }).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('aunqa_lang'))).toBe('en');

    // กลับ review (client-nav) ยัง EN → สลับไทย → ป้ายไทยคืนครบ
    await page.getByTestId('nav-review').click();
    await page.waitForURL('**/app/review');
    await expect(page.getByTestId('review-table')).toBeVisible();
    await expect.poll(async () => (await labels(page, 'review-table')).filter(v => THAI.test(v))).toEqual([]);
    await page.getByTestId('lang-th').click();
    await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await labels(page, 'review-table')).filter(v => !THAI.test(v))).toEqual([]);
    const th1 = await labels(page, 'review-table');
    expect(th1).toEqual(th0);
  });

  test('EN ทุกหน้าที่มีการ์ด @1024 (actions, cycles, evidence, curriculum PLO, admin users) ไม่มี data-label ไทย', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await loginAs(page, 'chair1');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    const check = async (url: string, testId: string, click?: string) => {
      await page.goto(url); await settle(page);
      if (click) { await page.getByTestId(click).click(); await page.waitForTimeout(300); }
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect.poll(async () => {
        const ls = await labels(page, testId);
        return ls.length ? ls.filter(v => THAI.test(v)) : ['(ไม่มี data-label)'];
      }, { message: `${url} ${testId}` }).toEqual([]);
    };
    await check('/app/actions', 'action-table');
    await check('/app/cycles', 'cycles-table');
    await check(`/app/evidence?cycle=${DEMO_CYCLE}`, 'ev-table');
    await check('/app/curriculum', 'plo-table', 'cur-tab-plo');
    await loginAs(page, 'uadmin');
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    await check('/app/admin', 'users-table', 'tab-users');
  });
});
