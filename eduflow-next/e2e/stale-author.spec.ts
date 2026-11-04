/**
 * TASK-0003 R2-1 (handoff จาก frontend-dev): คำเตือน `submit-stale-author-warning` ใน dialog ส่งตรวจ
 * (1) ผู้เขียนเนื้อหาล่าสุดเป็นประธาน แล้วอาจารย์ส่งโดยไม่แก้ → มีคำเตือน (ยังกดยืนยันได้ — ไม่บล็อก)
 * (2) อาจารย์แก้เนื้อหาแล้วส่ง → ไม่มีคำเตือน
 * (3) ผู้เขียนล่าสุดเป็นอาจารย์อีกคน (ไม่มีสิทธิ์อนุมัติ) แล้วผู้รับมอบใหม่ส่งโดยไม่แก้ → ไม่มีคำเตือน
 * + F2: ประธานส่งเอง → `submit-no-recipient-warning` · อาจารย์ส่ง → `submit-recipient-count` 1 คน
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, dialogOk, loginAs, openSection } from './helpers';

async function assign(page: Page, req: string, label: string) {
  await page.goto(`/app/cycles/${DEMO_CYCLE}/assign`);
  await page.getByTestId(`owner-${req}`).selectOption({ label });
  await expect(page.getByTestId(`owner-${req}`)).toHaveValue(/.+/);
}
async function appendAndSave(page: Page, text: string) {
  const nar = page.getByTestId('narrative-th');
  await nar.fill(`${await nar.inputValue()}\n${text}`);
  await page.getByTestId('save-manual').click();
  await expect(page.getByTestId('save-status').first()).toContainText('บันทึกแล้ว');
}
async function openSubmitDialog(page: Page) {
  await page.getByTestId('section-submit').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/** chair1 เขียน 7.9 เอง → ส่ง (ไม่มีผู้รับ) → ส่งกลับ → มอบ staff1 */
async function chairWritesThenHandsOver(page: Page) {
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '7.9');
  await appendAndSave(page, 'ประธานเขียนเพิ่มเอง (ทดสอบ stale author)');
  await openSubmitDialog(page);
  await expect(page.getByTestId('submit-no-recipient-warning')).toBeVisible();
  await dialogOk(page);
  await expect(page.getByTestId('toast').filter({ hasText: 'ไม่มีประธานหลักสูตรคนอื่นได้รับแจ้งเตือน' })).toBeVisible();
  await page.getByTestId('section-return').click();
  await dialogOk(page, 'มอบให้อาจารย์เขียนต่อ');
  await assign(page, '7.9', 'อ.วิภา เขียนรายงาน');
}

test('R2-1 (1) ผู้เขียนล่าสุดเป็นประธาน → อาจารย์ส่งโดยไม่แก้ → มี submit-stale-author-warning (ไม่บล็อก — ยืนยันได้)', async ({ page }) => {
  await chairWritesThenHandsOver(page);
  await loginAs(page, 'staff1');
  await openSection(page, DEMO_CYCLE, '7.9');
  await openSubmitDialog(page);
  const w = page.getByTestId('submit-stale-author-warning');
  await expect(w).toBeVisible();
  await expect(w).toContainText('ผศ.ดร.ปรีชา ตัวอย่างดี');
  await expect(page.getByTestId('submit-no-recipient-warning')).toHaveCount(0);
  await expect(page.getByTestId('submit-recipient-count')).toContainText('1 คน');
  await dialogOk(page);
  await expect(page.getByTestId('toast').filter({ hasText: 'แจ้งประธานหลักสูตร 1 คน' })).toBeVisible();
  // ผลตามคำเตือน: ประธาน (ผู้เขียนล่าสุด) อนุมัติไม่ได้
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '7.9');
  await expect(page.getByTestId('segregation-note')).toBeVisible();
  await expect(page.getByTestId('section-approve')).toHaveCount(0);
});

test('R2-1 (2) อาจารย์แก้เนื้อหาแล้วส่ง → ไม่มีคำเตือน · ประธานอนุมัติได้', async ({ page }) => {
  await chairWritesThenHandsOver(page);
  await loginAs(page, 'staff1');
  await openSection(page, DEMO_CYCLE, '7.9');
  // negative control: ก่อนแก้ต้องเห็นคำเตือน (ยืนยันว่าเทสต์นี้วัดเงื่อนไขจริง)
  await openSubmitDialog(page);
  await expect(page.getByTestId('submit-stale-author-warning')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'กลับไปเติมก่อน' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await appendAndSave(page, 'อาจารย์ปรับเนื้อหาแล้ว');
  await openSubmitDialog(page);
  await expect(page.getByTestId('submit-recipient-count')).toBeVisible();
  await expect(page.getByTestId('submit-stale-author-warning')).toHaveCount(0);
  await dialogOk(page);
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '7.9');
  await expect(page.getByTestId('section-approve')).toBeVisible();
});

test('R2-1 (3) ผู้เขียนล่าสุดเป็นอาจารย์อีกคน → ผู้รับมอบใหม่ส่งโดยไม่แก้ → ไม่มีคำเตือน', async ({ page }) => {
  // staff1 (เจ้าของ 3.6 ตาม seed F4) แก้ + บันทึก → lastAuthor = staff1 (ไม่มี sar.approve)
  await loginAs(page, 'staff1');
  await openSection(page, DEMO_CYCLE, '3.6');
  await appendAndSave(page, 'staff1 เขียนล่าสุด (ทดสอบ)');
  // ประธานย้ายเจ้าของไป lect1
  await loginAs(page, 'chair1');
  await assign(page, '3.6', 'อ.ธนา สอนดี');
  await loginAs(page, 'lect1');
  await openSection(page, DEMO_CYCLE, '3.6');
  await openSubmitDialog(page);
  await expect(page.getByTestId('submit-recipient-count')).toContainText('1 คน');
  await expect(page.getByTestId('submit-stale-author-warning')).toHaveCount(0);
  await dialogOk(page);
  await expect(page.getByTestId('toast').filter({ hasText: 'แจ้งประธานหลักสูตร 1 คน' })).toBeVisible();
});
