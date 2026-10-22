/**
 * Regression ของ finding U1b (playtester M1/M2/M3) — ADR-UI-001 7.1 แถว U2-Q, AC-15/19/20 — TASK-0001 U2-Q
 * M1 todo ครบทุกขั้นของรอบ: start_cycle (draft ที่มอบหมายแล้ว), assess1 8/8 → "เลือก verdict และส่งผล…", close_cycle ขึ้นที่ uadmin เมื่อ assessed
 * M2 ตัวเลข badge "รอตรวจ" = จำนวนปุ่ม approve-* ใน /app/review · badge "หน้าหลัก" = "(รวม N งาน)"
 * M3 (ก) logout ขณะบันทึกไม่ได้ → ไม่ออก + ข้อความไม่หาย (ข) logout จากอีกแท็บ → แท็บที่พิมพ์ค้าง flush ก่อนแล้วไป /login?reason=other-tab
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, createCycleUi, dialogOk, driveToLocked, loginAs, openSection, transitionAs } from './helpers';

test.use({ viewport: { width: 1440, height: 900 } }); // sidebar ถาวร (badge + ปุ่ม logout มองเห็น)

const badge = (page: Page, nav: string) => page.getByTestId(nav).locator('.aq-count');
const todoCard = (page: Page, kind: string) => page.locator(`[data-testid^="todo-${kind}-"]`);

test.describe('M1 todo ทุกขั้นของรอบ', () => {
  test('M1 start_cycle: รอบ draft ที่มอบหมายแล้ว → chair1 เห็นการ์ด "เริ่มดำเนินการรอบ"', async ({ page }) => {
    await loginAs(page, 'chair1');
    const id = await createCycleUi(page, 2570);
    await page.goto('/app');
    await expect(page.locator('h1')).toBeVisible();
    await expect(todoCard(page, 'start_cycle')).toHaveCount(0);
    await page.goto(`/app/cycles/${encodeURIComponent(id)}/assign`);
    await page.getByTestId('owner-1.1').selectOption({ label: 'อ.วิภา เขียนรายงาน' });
    await expect(page.getByTestId('owner-1.1')).toHaveValue(/.+/);
    await page.goto('/app');
    await expect(todoCard(page, 'start_cycle').first()).toContainText('เริ่มดำเนินการรอบ 2570 (มอบหมายแล้ว 1 ข้อ)');
  });

  test('M1 assess1 8/8 → "เลือก verdict และส่งผลประเมิน…" · ส่งผลแล้ว → uadmin/chair1 เห็น "ปิดรอบ…" และไปหน้ารอบได้ใน 1 คลิก', async ({ page }) => {
    test.setTimeout(300_000);
    await driveToLocked(page);
    await transitionAs(page, 'fqa1', 'under_assessment');

    await loginAs(page, 'assess1');
    await expect(todoCard(page, 'assess_cycle').first()).toContainText('ประเมินรอบ 2569 (ให้คะแนนแล้ว 0/8)');
    await page.goto(`/app/cycles/${DEMO_CYCLE}/assess`);
    for (let c = 1; c <= 8; c++) {
      await page.getByTestId(`assess-crit-${c}`).click();
      await page.getByTestId('crit-score').selectOption('4');
      await page.getByTestId('crit-why').fill(`เหตุผลเกณฑ์ ${c}`);
      await page.getByTestId('crit-save').click();
      await expect(page.getByTestId('rated-count')).toHaveText(`${c}/8`);
    }
    await page.goto('/app');
    await expect(todoCard(page, 'assess_cycle').first()).toContainText('เลือก verdict และส่งผลประเมินรอบ 2569');
    await page.goto(`/app/cycles/${DEMO_CYCLE}/assess`);
    await page.getByTestId('verdict-score').selectOption('4');
    await page.getByTestId('verdict-why').fill('verdict โดยกรรมการ (M1)');
    await page.getByTestId('verdict-save').click();
    await page.goto('/app');
    await expect(todoCard(page, 'assess_cycle').first()).toContainText('ส่งผลประเมินรอบ 2569');
    await page.goto(`/app/cycles/${DEMO_CYCLE}/assess`);
    await expect(page.getByTestId('assess-finish')).toBeEnabled();
    await page.getByTestId('assess-finish').click();
    await dialogOk(page);
    await expect(page.getByTestId('assess-notopen')).toContainText('ส่งผลประเมินแล้ว');
    await page.goto('/app');
    await expect(todoCard(page, 'assess_cycle')).toHaveCount(0);

    for (const u of ['uadmin', 'chair1']) {
      await loginAs(page, u);
      const card = todoCard(page, 'close_cycle').first();
      await expect(card, u).toContainText('ปิดรอบ 2569 หลังได้รับผลประเมิน');
      await expect(card).toContainText('ตรวจผลและสร้างแผนปรับปรุงจากข้อเสนอแนะ (AFI) ก่อนปิดรอบ');
    }
    // uadmin: เป็นการ์ดแรก + 1 คลิกถึงปุ่มปิดรอบ (AC-15)
    await loginAs(page, 'uadmin');
    await expect(page.getByTestId('todo-close_cycle-0')).toBeVisible();
    await page.getByTestId('todo-close_cycle-0').getByRole('link').click();
    await page.waitForURL(`**/app/cycles/${DEMO_CYCLE}`);
    await expect(page.getByTestId('cycle-to-closed')).toBeVisible();
    // ผู้ไม่มีสิทธิ์ปิดรอบไม่เห็น
    await loginAs(page, 'staff1');
    await expect(todoCard(page, 'close_cycle')).toHaveCount(0);
  });
});

test.describe('M2 badge ตรงกับงานจริง', () => {
  test('M2 chair1: badge "รอตรวจ" = จำนวนปุ่ม approve-* · badge "หน้าหลัก" = (รวม N งาน) · อนุมัติแล้ว badge ลดตาม', async ({ page }) => {
    await loginAs(page, 'chair1');
    await expect(page.getByText(/\(รวม \d+ งาน\)/)).toBeVisible();
    const total = Number((await page.getByText(/\(รวม \d+ งาน\)/).innerText()).match(/\d+/)![0]);
    await expect(badge(page, 'nav-home')).toHaveText(String(total));

    await page.getByTestId('nav-review').click();
    await page.waitForURL('**/app/review');
    const approves = page.locator('[data-testid^="approve-"]');
    await expect(approves.first()).toBeVisible();
    const n = await approves.count();
    expect(n).toBeGreaterThan(0);
    await expect(badge(page, 'nav-review')).toHaveText(String(n));

    // อนุมัติ 1 ข้อ → badge ทั้งสองลด 1 ทันที (aunqa:todos-changed)
    await approves.first().click();
    await expect(page.locator('[data-testid^="approve-"]')).toHaveCount(n - 1);
    await expect(badge(page, 'nav-review')).toHaveText(String(n - 1));
    await expect(badge(page, 'nav-home')).toHaveText(String(total - 1));
  });
});

test.describe('M3 ออกจากระบบโดยงานไม่หาย (ADR 6.4)', () => {
  test('M3(ก) พิมพ์ [E-9.9-99] แล้ว logout → dialog "ยังบันทึกงานไม่ได้" · "กลับไปแก้" = ยังอยู่หน้าเดิม ข้อความครบ · "ยืนยันออกโดยไม่บันทึก" = ออก', async ({ page }) => {
    await loginAs(page, 'chair1');
    await openSection(page, DEMO_CYCLE, '3.6');
    const url = page.url();
    const text = `ทดสอบ M3 อ้างหลักฐานที่ไม่มี [E-9.9-99] ${Date.now()}`;
    await page.getByTestId('narrative-th').fill(text);
    await page.getByTestId('logout').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toContainText('ยังบันทึกงานไม่ได้');
    await expect(dlg).toContainText('ข้อ 3.6');
    await expect(dlg).toContainText('E-9.9-99');
    await dlg.getByRole('button', { name: 'กลับไปแก้' }).click();
    await expect(dlg).toBeHidden();
    expect(page.url()).toBe(url);
    await expect(page.getByTestId('narrative-th')).toHaveValue(text);
    await expect(page.getByTestId('nav-user')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('aunqa_session'))).not.toBeNull();

    // ยืนยันออก → ออกจริง (session ถูกล้าง)
    await page.getByTestId('logout').click();
    await page.getByRole('dialog').getByRole('button', { name: 'ยืนยันออกโดยไม่บันทึก' }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();
    await expect(page).not.toHaveURL(/\/app\/sections\//);
  });

  test('M3(ข) แท็บ A พิมพ์ค้าง → แท็บ B logout → A flush แล้วไป /login?reason=other-tab และเปิดใหม่เห็นข้อความ', async ({ page, context }) => {
    await loginAs(page, 'chair1');
    await openSection(page, DEMO_CYCLE, '3.6');
    const text = `ทดสอบ M3 ข้ามแท็บ ${Date.now()}`;

    const b = await context.newPage();
    await b.goto('/app');
    await expect(b.getByTestId('nav-user')).toBeVisible(); // session เดียวกัน (localStorage)

    await page.getByTestId('narrative-th').fill(text);   // ไม่รอ autosave (debounce 1.5s) — ให้ flush เป็นคนบันทึก
    await b.getByTestId('logout').click();
    await expect.poll(() => b.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();

    await page.waitForURL(/\/login\?reason=other-tab/, { timeout: 20_000 });
    await expect(page.getByText('ออกจากระบบจากแท็บอื่นแล้ว งานที่ค้างถูกบันทึกแล้ว')).toBeVisible();

    await loginAs(page, 'chair1');
    await openSection(page, DEMO_CYCLE, '3.6');
    await expect(page.getByTestId('narrative-th')).toHaveValue(text);
  });
});
