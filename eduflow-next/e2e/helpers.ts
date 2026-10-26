import { expect, type Page, type Locator } from '@playwright/test';

export const DEMO_CYCLE = 'cycle-demo-2569';
export const PASSWORD = 'demo1234';

/**
 * เข้าสู่ระบบเป็น username (ล้าง session เดิมก่อน — ข้อมูลเดโม่ใน localStorage ยังอยู่)
 * Phase U (ADR-UI-001 7.3 ข้อ 1): session ย้ายไป localStorage → ล้างทั้ง localStorage และ sessionStorage
 */
export async function loginAs(page: Page, username: string, password = PASSWORD) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL('**/app', { timeout: 30_000 });
  await expect(page.getByTestId('nav-user')).toBeVisible();
}

/**
 * TASK-0002 Q2c (friendly-spec §F2.3/§F11): ธีม/ขนาดตัวอักษร/ออกจากระบบ ย้ายเข้าเมนูผู้ใช้ `user-menu`
 * เปิด panel `user-menu-panel` ถ้ายังไม่เปิด (idempotent) แล้วคืน locator ของ panel
 */
export async function openUserMenu(page: Page): Promise<Locator> {
  const panel = page.getByTestId('user-menu-panel');
  if (!(await panel.isVisible())) await page.getByTestId('user-menu').click();
  await expect(panel).toBeVisible();
  return panel;
}

/** ออกจากระบบผ่านเมนูผู้ใช้ (logout เดิมของ AuthContext — dialog flush/conflict เดิม) */
export async function logoutViaMenu(page: Page) {
  const panel = await openUserMenu(page);
  await panel.getByTestId('logout').click();
}

/** ปุ่มใน dialog ของแอป (confirm/prompt) */
export async function dialogOk(page: Page, note?: string) {
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  if (note !== undefined) await dlg.locator('textarea').fill(note);
  await dlg.getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(dlg).toBeHidden();
}

export const sectionUrl = (cycleId: string, reqId: string) => `/app/sections/${encodeURIComponent(`${cycleId}::${reqId}`)}`;

export async function openSection(page: Page, cycleId: string, reqId: string) {
  await page.goto(sectionUrl(cycleId, reqId));
  await expect(page.getByTestId('sar-editor')).toBeVisible();
}

/** (ผู้ใช้ต้องมีสิทธิ์สร้างรอบ เช่น chair1) สร้างรอบปีใหม่ผ่าน UI → คืน cycleId จาก URL */
export async function createCycleUi(page: Page, year: number): Promise<string> {
  await page.goto('/app/cycles');
  await page.getByTestId('cycle-new').click();
  await page.getByTestId('cycle-year').fill(String(year));
  await page.getByTestId('cycle-submit').click();
  await page.waitForURL(/\/app\/cycles\/(?!$)[^/]+$/);
  const id = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!);
  await expect(page.getByTestId('heatmap')).toBeVisible();
  return id;
}

/** ข้อความของ gap-list ในแดชบอร์ดรอบ (แสดงสูงสุด 40 รายการแรก → กดแสดงทั้งหมด) */
export async function gapListText(page: Page, cycleId: string): Promise<string> {
  await page.goto(`/app/cycles/${encodeURIComponent(cycleId)}`);
  await expect(page.getByTestId('gap-list')).toBeVisible();
  const more = page.getByRole('button', { name: /แสดงทั้งหมด/ });
  if (await more.count()) await more.click();
  return (await page.getByTestId('gap-list').innerText());
}

/** เลือกข้อกำหนดใน RequirementPicker ของฟอร์มหลักฐาน (ADR-UI-001 7.3 ข้อ 2 — แทน selectOption บน ev-f-reqs เดิม) */
export async function pickRequirements(page: Page, ids: string[], prefix = 'ev-f-req') {
  for (const id of ids) {
    await page.getByTestId(`${prefix}s-input`).fill(id);
    await page.getByTestId(`${prefix}-opt-${id}`).click();
    await expect(page.getByTestId(`${prefix}-chip-${id}`)).toBeVisible();
  }
}

/** เลือก option ตามข้อความ (label) */
export async function pick(sel: Locator, label: string) { await sel.selectOption({ label }); }

/** เลขบัตรประชาชน 13 หลักที่ checksum ถูกต้อง (ข้อมูลสมมติ) */
export function fakeThaiId(first12 = '110170023070'): string {
  const sum = first12.split('').reduce((s, d, i) => s + Number(d) * (13 - i), 0);
  return first12 + String((11 - (sum % 11)) % 10);
}

/**
 * เดินรอบเดโม่ (seed) ผ่าน UI ไปจน under_review ตามเส้นทางใน Log B3:
 * chair1 มอบ 3.6/5.1/7.9 ให้ staff1 → staff1 ส่งตรวจ → chair1 อนุมัติ 8 ข้อ → ส่ง QA
 */
export async function driveToUnderReview(page: Page) {
  await loginAs(page, 'chair1');
  await page.goto(`/app/cycles/${DEMO_CYCLE}/assign`);
  for (const r of ['3.6', '5.1', '7.9']) {
    await page.getByTestId(`owner-${r}`).selectOption({ label: 'อ.วิภา เขียนรายงาน' });
    await expect(page.getByTestId(`owner-${r}`)).toHaveValue(/.+/);
  }
  await loginAs(page, 'staff1');
  for (const r of ['3.6', '5.1', '7.9']) {
    await openSection(page, DEMO_CYCLE, r);
    await page.getByTestId('section-submit').click();
    await dialogOk(page);
    await expect(page.getByTestId('readonly-reason')).toBeVisible();
  }
  await loginAs(page, 'chair1');
  for (const r of ['1.5', '6.6', '8.1', '8.2', '8.3', '3.6', '5.1', '7.9']) {
    await openSection(page, DEMO_CYCLE, r);
    await page.getByTestId('section-approve').click();
    await expect(page.getByTestId('readonly-reason')).toBeVisible();
  }
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await page.getByTestId('cycle-to-under_review').click();
  await dialogOk(page);
  await expect(page.getByTestId('cycle-actions')).toBeHidden();
}

export async function transitionAs(page: Page, user: string, to: string, note?: string) {
  await loginAs(page, user);
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await page.getByTestId(`cycle-to-${to}`).click();
  await dialogOk(page, note);
}

/** ถึง final_approved (lock) */
export async function driveToLocked(page: Page) {
  await driveToUnderReview(page);
  await transitionAs(page, 'fqa1', 'faculty_approved');
  await transitionAs(page, 'dean1', 'final_approved');
  await expect(page.getByTestId('lock-banner')).toBeVisible();
}
