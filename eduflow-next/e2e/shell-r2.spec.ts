/**
 * TASK-0002 Q2c — shell รอบ 2 (ADR-UI-003 / friendly-spec §F1–F3, §F11)
 * AC-21 ไม่มีปุ่มไอคอนเดี่ยว (desktop) · AC-22 ปุ่มภาษา · AC-23 เมนูผู้ใช้ · AC-24 panel แจ้งเตือน
 * (AC-13 R2 ข้อ 3 อยู่ใน theme.spec · AC-31 อยู่ใน ui-u ส่วน AC-08 · E2E-08 deep link อยู่ใน flows-b)
 *
 * KNOWN_BUGS: bug ที่พบระหว่างเขียนเทสต์ → `test.fail` ต่อ bug (ชุดเขียว แต่ขึ้น "expected to fail" ทันทีเมื่อถูกแก้)
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, createCycleUi, loginAs, logoutViaMenu, openSection, openUserMenu, sectionUrl } from './helpers';

const VP = { '1440': { width: 1440, height: 900 }, '390': { width: 390, height: 844 } } as const;
const THAI = /[฀-๿]/;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('app-loader')).toHaveCount(0, { timeout: 20_000 });
}

/** ปุ่ม/ลิงก์ที่มองเห็นใน header/sidebar (และแถบเครื่องมือของ /login ที่ไม่มี <header>) ที่ innerText ว่าง */
async function iconOnlyControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const sel = 'header button, header a, #app-sidebar a, #app-sidebar button';
    const set = new Set<Element>(Array.from(document.querySelectorAll(sel)));
    // /login: แถบเครื่องมือ (แบรนด์ + ภาษา + การแสดงผล) อยู่นอก #main และนอก aside
    if (!document.querySelector('header') && !document.querySelector('#app-sidebar')) {
      document.querySelectorAll('button, a').forEach(el => { if (!el.closest('#main, aside, .aq-skip') && !el.matches('.aq-skip')) set.add(el); });
    }
    const out: string[] = [];
    set.forEach(el => {
      const h = el as HTMLElement;
      const r = h.getBoundingClientRect();
      const cs = getComputedStyle(h);
      if (r.width <= 1 || r.height <= 1 || cs.visibility === 'hidden' || cs.display === 'none') return;
      if (!h.innerText.trim()) out.push(`${h.tagName.toLowerCase()}[${h.dataset.testid ?? ''}] aria-label="${h.getAttribute('aria-label') ?? ''}"`);
    });
    return out;
  });
}

async function goto(page: Page, url: string, user?: string) {
  if (user) await loginAs(page, user);
  await page.goto(url); await settle(page);
}

// ─────────────────────────── AC-21 ───────────────────────────
test.describe('AC-21 ไม่มีปุ่มไอคอนเดี่ยว', () => {
  const CASES: Array<[string, string, string | undefined]> = [
    ['/app chair1', '/app', 'chair1'], ['/app staff1', '/app', 'staff1'], ['/app uadmin', '/app', 'uadmin'],
    ['/login', '/login', undefined], ['/', '/', undefined],
  ];
  for (const [name, url, user] of CASES) {
    test(`@1440 ${name}: ทุกปุ่ม/ลิงก์ที่มองเห็นใน header/sidebar มีข้อความ · ไม่มี theme-toggle/display-prefs`, async ({ page }) => {
      await page.setViewportSize(VP['1440']);
      await goto(page, url, user);
      const controls = await page.locator('header button, header a, #app-sidebar a, #app-sidebar button').count();
      if (url !== '/login') expect(controls, 'ต้องมี control ให้ตรวจจริง').toBeGreaterThan(2);
      expect(await iconOnlyControls(page)).toEqual([]);
      await expect(page.getByTestId('theme-toggle')).toHaveCount(0);
      await expect(page.getByTestId('display-prefs')).toHaveCount(0);
    });
  }

  test('@390 /app: nav-menu มีข้อความ "เมนู" · ไม่มี theme-toggle/display-prefs · /login และ / ก็ไม่มี', async ({ page }) => {
    await page.setViewportSize(VP['390']);
    await goto(page, '/app', 'chair1');
    await expect(page.getByTestId('nav-menu')).toBeVisible();
    await expect(page.getByTestId('nav-menu')).toHaveText('เมนู');
    await expect(page.getByTestId('nav-menu')).not.toHaveAttribute('aria-label', /.+/);
    for (const url of ['/app', '/login', '/']) {
      await page.goto(url); await settle(page);
      await expect(page.getByTestId('theme-toggle'), url).toHaveCount(0);
      await expect(page.getByTestId('display-prefs'), url).toHaveCount(0);
    }
  });

  test('negative: ตัวตรวจจับปุ่มไอคอนเดี่ยวได้จริง (ลบข้อความของ nav-bell → ถูกรายงาน)', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await goto(page, '/app', 'chair1');
    await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('[data-testid="nav-bell"]')!;
      b.querySelectorAll('span').forEach(s => s.remove());
    });
    expect((await iconOnlyControls(page)).join('\n')).toContain('nav-bell');
  });
});

// ─────────────────────────── AC-22 ───────────────────────────
test.describe('AC-22 ปุ่มภาษา', () => {
  /** ข้อความที่ใช้ยืนยันว่าหน้าเป็นอังกฤษแล้ว (ตามหน้า/จอ) */
  const enProbe = (url: string, w: '1440' | '390') =>
    url === '/app' ? (w === '1440' ? { id: 'nav-bell', text: 'Notifications' } : { id: 'nav-menu', text: 'Menu' })
      : url === '/login' ? { id: 'login-submit', text: 'Sign in' }
        // Q2d (R2-F7 m5): <768 `display-menu` ถูกซ่อนด้วย CSS → ใช้ปุ่มที่มองเห็นจริง `landing-menu-btn`
        : w === '1440' ? { id: 'display-menu', text: 'Display' } : { id: 'landing-menu-btn', text: 'Menu' };

  for (const w of ['1440', '390'] as const) {
    for (const url of ['/app', '/login', '/']) {
      test(`@${w} ${url}: lang-switch มองเห็นนอกเมนู · aria-pressed · lang="en" + ป้าย · กด EN → อังกฤษ · reload คงอยู่`, async ({ page }) => {
        await page.setViewportSize(VP[w]);
        await goto(page, url, url === '/app' ? 'chair1' : undefined);
        const sw = page.getByTestId('lang-switch');
        await expect(sw.first()).toBeVisible({ timeout: 5_000 });
        const th = page.getByTestId('lang-th'), en = page.getByTestId('lang-en');
        await expect(th).toHaveAttribute('aria-pressed', 'true');
        await expect(en).toHaveAttribute('aria-pressed', 'false');
        await expect(th).toHaveAttribute('lang', 'th');
        await expect(en).toHaveAttribute('lang', 'en');
        await expect(en).toHaveAttribute('aria-label', 'English');
        // ป้ายที่มองเห็น (innerText — span ที่ซ่อนตามจอไม่นับ)
        expect(await en.evaluate(e => (e as HTMLElement).innerText.trim())).toBe(w === '1440' ? 'English' : 'EN');

        await en.click();
        await expect(en).toHaveAttribute('aria-pressed', 'true');
        await expect(th).toHaveAttribute('aria-pressed', 'false');
        const probe = enProbe(url, w);
        await expect(page.getByTestId(probe.id).first()).toContainText(probe.text);
        await expect(page.getByTestId(probe.id).first()).not.toHaveText(THAI);

        await page.reload(); await settle(page);
        await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId(probe.id).first()).toContainText(probe.text);
        // กลับเป็นไทยได้
        await page.getByTestId('lang-th').click();
        await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
      });
    }
  }

  test('ภาษาจำรายหน้า: เปลี่ยน /app เป็น EN ไม่ทำให้ /login เปลี่ยน · กดปุ่มที่เลือกอยู่ไม่เปลี่ยนอะไร', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await goto(page, '/app', 'chair1');
    await page.getByTestId('lang-th').click(); // เลือกอยู่แล้ว
    await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('nav-bell')).toContainText('Notifications');
    await page.goto('/login'); await settle(page);
    await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
  });
});

// ─────────────────────────── AC-23 ───────────────────────────
test.describe('AC-23 เมนูผู้ใช้', () => {
  test('@1440 aria-expanded · panel มี ธีม 3 ค่า + ขนาด ปกติ/ใหญ่/ใหญ่มาก + checkbox เอฟเฟกต์ + logout · เปลี่ยนธีมไม่ปิด · Esc ปิดคืน focus · คลิกนอกปิด', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await goto(page, '/app', 'chair1');
    const trigger = page.getByTestId('user-menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('user-menu-panel')).toHaveCount(0);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByTestId('user-menu-panel');
    await expect(panel).toBeVisible();
    for (const t of ['light', 'dark', 'system']) await expect(panel.getByTestId(`theme-segment-${t}`)).toBeVisible();
    await expect(panel.getByRole('radiogroup', { name: 'ขนาดตัวอักษร' }).getByRole('radio')).toHaveText(['ปกติ', 'ใหญ่', 'ใหญ่มาก']);
    await expect(panel.getByRole('checkbox', { name: /เอฟเฟกต์ฉลอง/ })).toBeVisible();
    await expect(panel.getByTestId('logout')).toHaveText('ออกจากระบบ');

    // เปลี่ยนธีม/ขนาด/เอฟเฟกต์ → panel ยังเปิด
    await panel.getByTestId('theme-segment-dark').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await expect(panel).toBeVisible();
    await panel.getByRole('radio', { name: 'ใหญ่', exact: true }).click();
    await expect(panel).toBeVisible();
    await panel.getByRole('checkbox', { name: /เอฟเฟกต์ฉลอง/ }).uncheck();
    await expect(panel).toBeVisible();
    await panel.getByTestId('theme-segment-light').click();

    // Esc → ปิด + focus กลับ trigger
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // คลิกนอก → ปิด
    await trigger.click();
    await expect(panel).toBeVisible();
    await page.locator('h1').first().click();
    await expect(panel).toHaveCount(0);
  });

  for (const scale of ['ปกติ', 'ใหญ่มาก'] as const) {
    test(`@390 ตัวอักษร ${scale}: panel ไม่ล้นจอ (scrollWidth ≤ innerWidth และกรอบ panel อยู่ในจอ)`, async ({ page }) => {
      await page.setViewportSize(VP['390']);
      await goto(page, '/app', 'chair1');
      let panel = await openUserMenu(page);
      if (scale !== 'ปกติ') {
        await panel.getByRole('radio', { name: scale, exact: true }).click();
        await page.waitForTimeout(200);
      }
      panel = page.getByTestId('user-menu-panel');
      const r = await page.evaluate(() => {
        const p = document.querySelector('[data-testid="user-menu-panel"]')!.getBoundingClientRect();
        // ทุกลูกใน panel ต้องอยู่ในกรอบจอด้วย (segmented ที่กว้างเกิน panel)
        const kids = Array.from(document.querySelectorAll('[data-testid="user-menu-panel"] *'))
          .map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
        return {
          sw: document.documentElement.scrollWidth, iw: window.innerWidth,
          left: p.left, right: p.right,
          maxRight: Math.max(...kids.map(b => b.right)), minLeft: Math.min(...kids.map(b => b.left)),
        };
      });
      expect(r.sw, 'document scrollWidth').toBeLessThanOrEqual(r.iw);
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(r.iw);
      expect(r.minLeft, 'ลูกใน panel ล้นซ้าย').toBeGreaterThanOrEqual(0);
      expect(r.maxRight, 'ลูกใน panel ล้นขวา').toBeLessThanOrEqual(r.iw + 0.5);
      await expect(panel.getByTestId('logout')).toBeVisible();
    });
  }

  test('logout ผ่านเมนู (ไม่มีงานค้าง) → ออกจริง กลับหน้าแรก / · ไม่มี user-menu', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await goto(page, '/app', 'staff1');
    await logoutViaMenu(page);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();
    await page.waitForURL(u => new URL(u).pathname === '/'); // AuthContext.logout → router.push('/')
    await expect(page.getByTestId('user-menu')).toHaveCount(0);
  });
});

// ─────────────────────────── AC-24 ───────────────────────────
/** chair1 มอบข้อ 3.6 ให้ staff1 → staff1 ได้แจ้งเตือน "คุณได้รับมอบหมายข้อ 3.6" (N1 target section) */
async function assign36ToStaff(page: Page) {
  await loginAs(page, 'chair1');
  await page.goto(`/app/cycles/${DEMO_CYCLE}/assign`);
  await page.getByTestId('owner-3.6').selectOption({ label: 'อ.วิภา เขียนรายงาน' });
  await expect(page.getByTestId('owner-3.6')).toHaveValue(/.+/);
}
const unreadOf = async (page: Page) =>
  Number((await page.getByTestId('nav-bell').getAttribute('aria-label'))!.match(/(\d+) รายการ/)![1]);
const ASSIGNED_TH = 'คุณได้รับมอบหมายข้อ 3.6';

test.describe('AC-24 panel แจ้งเตือน', () => {
  test('@1440 staff1: เปิด panel · unread มี "ใหม่" + ตัวหนา ≥600 · กดรายการ → ปลายทาง §F3.3 + อ่านแล้ว (ลด 1) + panel ปิด · /app ไม่มี noti-list นอก panel', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await assign36ToStaff(page);
    await goto(page, '/app', 'staff1');
    await expect(page.getByTestId('noti-list')).toHaveCount(0);
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);
    const bell = page.getByTestId('nav-bell');
    await expect(bell).toHaveAttribute('aria-expanded', 'false');
    const before = await unreadOf(page);
    expect(before).toBeGreaterThan(0);
    await expect(bell.locator('.aq-count')).toBeVisible();

    await bell.click();
    await expect(bell).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByTestId('noti-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    const item = panel.locator('[data-testid^="noti-item-"]', { hasText: ASSIGNED_TH }).first();
    await expect(item).toHaveAttribute('data-unread', 'true');
    await expect(item).toContainText('ใหม่');
    const fw = await item.locator('[data-part="msg"]').evaluate(e => Number(getComputedStyle(e).fontWeight));
    expect(fw).toBeGreaterThanOrEqual(600);
    // ปลายทาง N1 1 ข้อ = section (friendly-spec §F3.3)
    await expect(item).toHaveAttribute('href', sectionUrl(DEMO_CYCLE, '3.6'));

    await item.click();
    await page.waitForURL(new RegExp(`/app/sections/${encodeURIComponent(`${DEMO_CYCLE}::3.6`)}$`));
    await expect(page.getByTestId('sar-editor')).toBeVisible();
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);
    await expect(bell).toHaveAttribute('aria-label', `แจ้งเตือนที่ยังไม่อ่าน ${before - 1} รายการ`);

    // เปิดอีกครั้ง → รายการนั้นอ่านแล้ว (ไม่มี data-unread / ไม่ตัวหนา)
    await bell.click();
    const again = page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"]', { hasText: ASSIGNED_TH }).first();
    await expect(again).not.toHaveAttribute('data-unread', /.*/);
    expect(await again.locator('[data-part="msg"]').evaluate(e => Number(getComputedStyle(e).fontWeight))).toBeLessThan(600);
  });

  test('@1440 noti-read-all → "ยังไม่อ่าน 0 รายการ" ไม่มี .aq-count · ปุ่ม disabled · Esc ปิด + focus กลับ nav-bell · คลิกนอกปิด', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await assign36ToStaff(page);
    await goto(page, '/app', 'staff1');
    const bell = page.getByTestId('nav-bell');
    expect(await unreadOf(page)).toBeGreaterThan(0);
    await bell.click();
    const readAll = page.getByTestId('noti-read-all');
    await expect(readAll).toBeEnabled();
    await readAll.click();
    await expect(bell).toHaveAttribute('aria-label', 'แจ้งเตือนที่ยังไม่อ่าน 0 รายการ');
    await expect(bell.locator('.aq-count')).toHaveCount(0);
    await expect(readAll).toBeDisabled();
    await expect(page.getByTestId('noti-panel').locator('[data-unread]')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);
    await expect(bell).toBeFocused();
    await expect(bell).toHaveAttribute('aria-expanded', 'false');

    await bell.click();
    await expect(page.getByTestId('noti-panel')).toBeVisible();
    await page.locator('h1').first().click();
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);

    // ค่าคงอยู่หลัง reload
    await page.reload(); await settle(page);
    await expect(bell).toHaveAttribute('aria-label', 'แจ้งเตือนที่ยังไม่อ่าน 0 รายการ');
  });

  test('ผู้ใช้ที่ไม่มีแจ้งเตือน → noti-empty · noti-read-all disabled', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await loginAs(page, 'dean1');
    // ล้างแจ้งเตือนของผู้ใช้นี้ (ข้อมูลเดโม่ใน localStorage) แล้วโหลดใหม่
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('aunqa_session') || 'null');
      const uid = s?.userId ?? s?.id ?? s?.user?.id;
      const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]');
      localStorage.setItem('aunqa_notifications', JSON.stringify(uid ? rows.filter((n: { userId: string }) => n.userId !== uid) : []));
    });
    await page.goto('/app'); await settle(page);
    await page.getByTestId('nav-bell').click();
    await expect(page.getByTestId('noti-empty')).toBeVisible();
    await expect(page.getByTestId('noti-empty')).toContainText('ยังไม่มีการแจ้งเตือน');
    await expect(page.getByTestId('noti-list')).toHaveCount(0);
    await expect(page.getByTestId('noti-read-all')).toBeDisabled();
  });

  test('@390: panel เป็น sheet กว้าง = viewport · มีปุ่ม "ปิด" (noti-close) → ปิด + focus กลับ nav-bell · Esc ปิด', async ({ page }) => {
    await page.setViewportSize(VP['390']);
    await assign36ToStaff(page);
    await goto(page, '/app', 'staff1');
    const bell = page.getByTestId('nav-bell');
    await bell.click();
    const panel = page.getByTestId('noti-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    const box = await panel.boundingBox();
    const iw = await page.evaluate(() => window.innerWidth);
    expect(Math.round(box!.width)).toBe(iw);
    expect(Math.round(box!.x)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(iw);
    const close = page.getByTestId('noti-close');
    await expect(close).toBeVisible();
    await expect(close).toContainText('ปิด');
    await close.click();
    await expect(panel).toHaveCount(0);
    await expect(bell).toBeFocused();

    await bell.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(bell).toBeFocused();
  });

  test('โหมด EN: รายการแสดง messageEn + pill "New" · ป้ายกระดิ่ง "Notifications"', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await assign36ToStaff(page);
    await goto(page, '/app', 'staff1');
    await page.getByTestId('lang-en').click();
    const bell = page.getByTestId('nav-bell');
    await expect(bell).toContainText('Notifications');
    await bell.click();
    const panel = page.getByTestId('noti-panel');
    const item = panel.locator('[data-testid^="noti-item-"]', { hasText: 'You were assigned requirement 3.6' }).first();
    await expect(item).toBeVisible();
    await expect(item).toContainText('New');
    await expect(item).not.toContainText(ASSIGNED_TH);
    await expect(panel.getByTestId('noti-list')).not.toContainText('คุณได้รับมอบหมาย');
  });
});

// ─────────────────── Q2d: deep link จาก panel แจ้งเตือน (AC-24 ส่วนที่เหลือ, R2-F4/F5/F8) ───────────────────
/** เปิด panel (ถ้ายังไม่เปิด) แล้วคืนรายการแจ้งเตือนแรกที่มีข้อความนี้ */
async function notiItem(page: Page, text: string | RegExp) {
  if (!(await page.getByTestId('noti-panel').isVisible())) await page.getByTestId('nav-bell').click();
  const item = page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"]', { hasText: text }).first();
  await expect(item).toBeVisible();
  return item;
}
const COMMENT_TH = 'มี comment ใหม่ที่ข้อ 3.6';
/** chair1 มอบ 3.6 ให้ staff1 แล้วเขียนความเห็นในข้อ 3.6 → staff1 ได้ N8 (target section + panel comments) */
async function commentOn36(page: Page) {
  await assign36ToStaff(page);
  await openSection(page, DEMO_CYCLE, '3.6');
  await page.getByTestId('sidetab-comments').click();
  await page.getByTestId('comment-body').fill('ช่วยเพิ่มหลักฐานผลการประเมินรายวิชา (ทดสอบ Q2d)');
  await page.getByTestId('comment-add').click();
  await expect(page.getByTestId('comments')).toContainText('ทดสอบ Q2d');
}

test.describe('AC-24 deep link จาก panel แจ้งเตือน', () => {
  test('ความเห็น (N8): จาก /app → section#comments แท็บ "ความเห็น" ถูกเลือก', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await commentOn36(page);
    await goto(page, '/app', 'staff1');
    const item = await notiItem(page, COMMENT_TH);
    await expect(item).toHaveAttribute('href', `${sectionUrl(DEMO_CYCLE, '3.6')}#comments`);
    await item.click();
    await page.waitForURL(/#comments$/);
    await expect(page.getByTestId('sidetab-comments')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#sidepanel-comments')).toBeVisible();
    await expect(page.getByTestId('comments')).toContainText('ทดสอบ Q2d');
  });

  test('ความเห็น (N8) อยู่หน้าเดียวกันแล้ว (R2-F8): แท็บสลับเป็นความเห็น · สลับไปหลักฐานแล้วกดซ้ำ → กลับมาความเห็น · back ออกจาก #comments', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await commentOn36(page);
    await loginAs(page, 'staff1');
    await openSection(page, DEMO_CYCLE, '3.6');
    await expect(page.getByTestId('sidetab-evidence')).toHaveAttribute('aria-selected', 'true');
    await (await notiItem(page, COMMENT_TH)).click();
    await expect(page).toHaveURL(/#comments$/);
    await expect(page.getByTestId('sidetab-comments')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);
    await expect(page.getByTestId('sar-editor')).toBeVisible();

    await page.getByTestId('sidetab-evidence').click();
    await expect(page.getByTestId('sidetab-evidence')).toHaveAttribute('aria-selected', 'true');
    await (await notiItem(page, COMMENT_TH)).click();
    await expect(page.getByTestId('sidetab-comments')).toHaveAttribute('aria-selected', 'true');

    await page.goBack();
    await expect(page).not.toHaveURL(/#comments$/);
    await expect(page.getByTestId('sar-editor')).toBeVisible();
  });

  test('action (N9): จาก /app → /app/actions#action-{id} แถวไฮไลต์ + อยู่ในจอ · อยู่หน้าเดียวกันแล้วก็ไฮไลต์ · ?status= ที่ซ่อนแถว → act-filter = all', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    await page.getByTestId('act-new').click();
    await page.getByTestId('act-desc').fill('จัดอบรมการเขียน SAR ให้อาจารย์ใหม่ (ทดสอบ Q2d)');
    await page.getByTestId('act-owner').selectOption({ label: 'อ.วิภา เขียนรายงาน' });
    await page.getByTestId('act-save').click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);
    const row = page.locator('tr[data-testid^="action-"]', { hasText: 'ทดสอบ Q2d' });
    await expect(row).toHaveCount(1);
    const actionId = (await row.getAttribute('data-testid'))!.replace(/^action-/, '');

    // จากหน้าอื่น
    await goto(page, '/app', 'staff1');
    const item = await notiItem(page, /action item/);
    await expect(item).toHaveAttribute('href', `/app/actions#action-${encodeURIComponent(actionId)}`);
    await item.click();
    await page.waitForURL(/\/app\/actions#action-/);
    const target = page.locator(`[id="action-${actionId}"]`);
    await expect(target).toHaveClass(/animate-highlight/);
    await expect(target).toBeInViewport();

    // อยู่ /app/actions (ไม่มี hash) แล้วกดแจ้งเตือน → ไฮไลต์ในหน้าเดิม
    await page.goto('/app/actions'); await settle(page);
    await expect(target).toBeVisible();
    await expect(target).not.toHaveClass(/animate-highlight/);
    await (await notiItem(page, /action item/)).click();
    await expect(page).toHaveURL(/\/app\/actions#action-/);
    await expect(target).toHaveClass(/animate-highlight/);

    // ?status=done ซ่อนแถว open → hash ชี้แถวนี้ → ตัวกรองกลับเป็น all
    await page.goto(`/app/actions?status=done#action-${encodeURIComponent(actionId)}`); await settle(page);
    await expect(page.getByTestId('act-filter')).toHaveValue('all');
    await expect(target).toHaveClass(/animate-highlight/);
    await expect(target).toBeInViewport();
  });

  test('action (N9) กดแจ้งเตือนเดิมซ้ำขณะอยู่ /app/actions#action-{id} แล้ว → ไฮไลต์ซ้ำทุกครั้ง (R2-F8 minor, แก้ใน S6) · คลิกที่อื่นในหน้าไม่ไฮไลต์ซ้ำ', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    await page.getByTestId('act-new').click();
    await page.getByTestId('act-desc').fill('ทบทวน มคอ.3 ทุกรายวิชา (ทดสอบ Q1 ไฮไลต์ซ้ำ)');
    await page.getByTestId('act-owner').selectOption({ label: 'อ.วิภา เขียนรายงาน' });
    await page.getByTestId('act-save').click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);
    const row = page.locator('tr[data-testid^="action-"]', { hasText: 'ทดสอบ Q1 ไฮไลต์ซ้ำ' });
    await expect(row).toHaveCount(1);
    const actionId = (await row.getAttribute('data-testid'))!.replace(/^action-/, '');

    await goto(page, '/app', 'staff1');
    await (await notiItem(page, /action item/)).click();
    await page.waitForURL(/\/app\/actions#action-/);
    const target = page.locator(`[id="action-${actionId}"]`);
    await expect(target).toHaveClass(/animate-highlight/);
    const hashBefore = await page.evaluate(() => window.location.hash);

    // นับจังหวะ "ถอด animate-highlight" (= เริ่ม animation ใหม่: ลบ class → reflow → ใส่คืน) บนแถวเป้าหมาย
    await page.evaluate((id) => {
      const el = document.getElementById(`action-${id}`)!;
      const w = window as unknown as { __hlRestarts: number };
      w.__hlRestarts = 0;
      new MutationObserver(recs => {
        for (const r of recs) if (/\banimate-highlight\b/.test(r.oldValue ?? '')) w.__hlRestarts++;
      }).observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }, actionId);
    const restarts = () => page.evaluate(() => (window as unknown as { __hlRestarts: number }).__hlRestarts);

    // negative: คลิกพื้นที่อื่นในหน้า (click listener ทำงาน แต่ hash เดิม = จัดการแล้ว) → ไม่ไฮไลต์ซ้ำ
    await page.locator('h1').first().click();
    await page.waitForTimeout(300);
    expect(await restarts()).toBe(0);

    // กดแจ้งเตือนเดิมซ้ำ 2 ครั้ง (hash เดิม) → ไฮไลต์ใหม่ทุกครั้ง · URL ไม่เปลี่ยน
    for (let i = 1; i <= 2; i++) {
      await (await notiItem(page, /action item/)).click();
      await expect(page.getByTestId('noti-panel')).toBeHidden();
      await expect.poll(restarts, { message: `ครั้งที่ ${i}` }).toBeGreaterThanOrEqual(i);
      await expect(target).toHaveClass(/animate-highlight/);
      await expect(target).toBeInViewport();
      expect(await page.evaluate(() => window.location.hash)).toBe(hashBefore);
    }
  });

  test('กรรมการ (N2): uadmin มอบ assess1 เข้ารอบใหม่ → assess1 กดแจ้งเตือน → /app/cycles/{id}/assess', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await loginAs(page, 'chair1');
    const id = await createCycleUi(page, 2570);
    await loginAs(page, 'uadmin');
    await page.goto(`/app/cycles/${encodeURIComponent(id)}/assign`);
    await page.getByTestId('assessor-select').selectOption({ label: 'ศ.ดร.วรรณา ผู้ประเมินภายนอก' });
    await page.getByTestId('assessor-add').click();
    await expect(page.getByText('มอบหมายกรรมการแล้ว').first()).toBeVisible();

    await goto(page, '/app', 'assess1');
    const item = await notiItem(page, 'กรรมการประเมินรอบ 2570');
    const href = `/app/cycles/${encodeURIComponent(id)}/assess`;
    await expect(item).toHaveAttribute('href', href);
    await item.click();
    await page.waitForURL(u => new URL(u).pathname === href);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByTestId('noti-panel')).toHaveCount(0);
  });
});

// ─────────────────── Q2d: R2-F7 (minor จาก V1) ───────────────────
test.describe('R2-F7 shell/landing/home/forms', () => {
  test('m1 @1440: เมนูที่ active ไม่มี ::before ที่มองเห็น · ไม่มีสี rgb(59, 79, 160) ใน shell', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    await goto(page, '/app', 'chair1');
    const home = page.getByTestId('nav-home');
    await expect(home).toHaveAttribute('aria-current', 'page');
    const before = await home.evaluate(e => {
      const cs = getComputedStyle(e, '::before');
      return { display: cs.display, content: cs.content };
    });
    expect(before.display === 'none' || before.content === 'none', JSON.stringify(before)).toBe(true);
    const hits = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('header, header *, #app-sidebar, #app-sidebar *').forEach(el => {
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && (cs.content === 'none' || cs.display === 'none')) continue;
          for (const p of ['color', 'backgroundColor', 'borderLeftColor', 'borderTopColor', 'outlineColor'] as const) {
            if (String(cs[p]).replace(/\s/g, '').startsWith('rgb(59,79,160')) out.push(`${(el as HTMLElement).dataset.testid ?? el.tagName}${pseudo ?? ''}.${p}`);
          }
        }
      });
      return out;
    });
    expect(hits).toEqual([]);
  });

  test('m2/m3 uadmin มีคำขอรอ: todo-access_requests → /app/admin?tab=requests · "(รวม N งาน)" = ตัวนับเมนูหน้าหลัก · home-summary · อนุมัติแล้วแถวหาย', async ({ page }) => {
    await page.setViewportSize(VP['1440']);
    const s = String(Date.now() % 100000);
    await page.goto('/request-access');
    await page.getByTestId('ra-name').fill(`ทดสอบ หน้าหลัก${s}`);
    await page.getByTestId('ra-email').fill(`home${s}@sample-uni.example`);
    await page.getByTestId('ra-reason').fill('ทดสอบตัวนับหน้าหลัก');
    await page.getByTestId('ra-username').fill(`home${s}`);
    await page.getByTestId('ra-password').fill('longpass3');
    await page.getByTestId('ra-password2').fill('longpass3');
    await page.getByTestId('ra-consent').check();
    await page.getByTestId('ra-submit').click();
    await expect(page.getByTestId('ra-success')).toBeVisible();

    await goto(page, '/app', 'uadmin');
    const todo = page.locator('[data-testid^="todo-access_requests-"]');
    await expect(todo).toHaveCount(1);
    await expect(todo).toContainText('อนุมัติคำขอเข้าใช้งาน 1 รายการ'); // ปุ่มในแถวใช้ "ไปทำ" ร่วมกับทุกแถว (TodoRow)
    await expect(todo.getByRole('link')).toHaveAttribute('href', '/app/admin?tab=requests');
    const totalOf = async () => {
      const m = (await page.locator('main').innerText()).match(/\(รวม (\d+) งาน\)/);
      return m ? Number(m[1]) : 0;
    };
    const n = await totalOf();
    expect(n).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('nav-home')).toHaveAttribute('aria-label', `หน้าหลัก — มีงานรอท่าน ${n} งาน`);
    const summary = page.getByTestId('home-summary');
    await expect(summary).not.toHaveText('วันนี้ไม่มีงานค้าง');
    const sum = await summary.innerText();
    if (!sum.includes('ควรทำก่อน')) expect(sum).toContain(`มี ${n} งานรอท่าน`);

    await todo.getByRole('link').click();
    await page.waitForURL(/\/app\/admin\?tab=requests$/);
    await expect(page.getByTestId('tab-requests')).toHaveAttribute('aria-selected', 'true');
    const card = page.locator('li[data-testid^="req-"]', { hasText: `home${s}` });
    const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
    await page.getByTestId(`req-approve-${id}`).click();
    await expect(card).toHaveCount(0);

    await page.goto('/app'); await settle(page);
    await expect(page.locator('[data-testid^="todo-access_requests-"]')).toHaveCount(0);
    expect(await totalOf()).toBe(n - 1);
  });

  test('m5 @390 /: header แถวเดียว ≤64px · ปุ่ม "เมนู" · lang-switch อยู่นอกแผง · แผงมีการแสดงผล + ปุ่ม "ปิด" → ปิด + focus กลับ', async ({ page }) => {
    await page.setViewportSize(VP['390']);
    await goto(page, '/');
    const header = page.locator('header').first();
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(65);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const btn = page.getByTestId('landing-menu-btn');
    await expect(btn).toBeVisible();
    expect(await btn.evaluate(e => (e as HTMLElement).innerText.trim())).toBe('เมนู');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('display-menu')).toBeHidden();
    const sw = page.getByTestId('lang-switch');
    await expect(sw).toBeVisible();
    // ภาษา + เมนู อยู่แถวเดียวกัน (กึ่งกลางแนวตั้งตรงกัน)
    const [a, b] = [await sw.boundingBox(), await btn.boundingBox()];
    expect(Math.abs((a!.y + a!.height / 2) - (b!.y + b!.height / 2))).toBeLessThan(8);

    await btn.click();
    const menu = page.locator('#landing-menu');
    await expect(menu).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(await sw.evaluate(e => !!e.closest('#landing-menu'))).toBe(false);
    await expect(page.getByTestId('landing-menu-display')).toBeVisible();
    await expect(page.getByTestId('landing-menu-display').getByTestId('theme-segment-dark')).toBeVisible();
    await expect(page.getByTestId('landing-menu-login')).toBeVisible();
    const close = page.getByTestId('landing-menu-close');
    expect(await close.evaluate(e => (e as HTMLElement).innerText.trim())).toBe('ปิด');
    await close.click();
    await expect(menu).toHaveCount(0);
    await expect(btn).toBeFocused();

    await btn.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(btn).toBeFocused();
  });

  test('m6 /request-access ส่งว่าง → ra-error-summary + ลิงก์ต่อช่อง · คลิก ra-error-link-name → focus ra-name · แก้แล้วหายจากสรุป', async ({ page }) => {
    await page.goto('/request-access');
    await page.getByTestId('ra-submit').click();
    const sum = page.getByTestId('ra-error-summary');
    await expect(sum).toBeVisible();
    await expect(sum).toContainText('ยังส่งคำขอไม่ได้ — กรุณาแก้ไขช่องต่อไปนี้');
    await expect(page.getByTestId('ra-name')).toBeFocused(); // focus ช่องแรกเหมือนเดิม
    for (const f of ['name', 'email', 'reason', 'username', 'password', 'consent'])
      await expect(page.getByTestId(`ra-error-link-${f}`)).toBeVisible();
    await page.getByTestId('ra-email').focus();
    await page.getByTestId('ra-error-link-name').click();
    await expect(page.getByTestId('ra-name')).toBeFocused();
    await page.getByTestId('ra-name').fill('ทดสอบ สรุปข้อผิดพลาด');
    await expect(page.getByTestId('ra-error-link-name')).toHaveCount(0);
    await expect(page.getByTestId('ra-error-link-email')).toBeVisible();
  });
});
