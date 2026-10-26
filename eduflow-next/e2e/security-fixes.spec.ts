/**
 * TASK-0002 เฟส 6 — e2e ครอบรอบแก้ R2-F9 (review minor #3/#5, nit #7 · security S-07)
 * - S-07 การ์ดคำขอมีป้าย `req-unverified-{id}` (TH + EN)
 * - minor #3 dropdown `act-owner` ไม่มีบัญชีไม่ active · ตอนแก้คงเจ้าของเดิมที่ถูกระงับ
 * - minor #5 `user-menu` = disclosure: ไม่มี aria-haspopup · มี aria-expanded + aria-controls ชี้ panel
 * - nit #7 ยกเลิกคำเชิญล้ม → `invite-result` ยังอยู่ (จำลองล้ม: ผู้ดูแลอีกคนยกเลิกไปก่อน = แถวหายจาก store)
 * ข้อมูลทดสอบเป็นข้อมูลสมมติ · ทุก test = context ใหม่
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers';

const DOMAIN = 'sample-uni.example';
const suffix = () => String(Date.now() % 100000);
type StoredUser = { id: string; username: string; fullName: string; status?: string };

async function submitRequest(page: Page, name: string, username: string) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto('/request-access');
  await page.getByTestId('ra-name').fill(name);
  await page.getByTestId('ra-email').fill(`${username}@${DOMAIN}`);
  await page.getByTestId('ra-email').blur();
  await expect(page.getByTestId('ra-email-uni')).toBeVisible();
  await page.getByTestId('ra-reason').fill('ต้องการเขียนรายงาน SAR ของหลักสูตร (ข้อมูลทดสอบ)');
  await page.getByTestId('ra-username').fill(username);
  await page.getByTestId('ra-password').fill('longpass2');
  await page.getByTestId('ra-password2').fill('longpass2');
  await page.getByTestId('ra-consent').check();
  await page.getByTestId('ra-submit').click();
  await expect(page.getByTestId('ra-success')).toContainText(username);
}

/** แก้แถวผู้ใช้ใน store ตรง (จำลองการกระทำจากแท็บ/ผู้ดูแลอื่น) */
async function setStatusByName(page: Page, map: Record<string, string>) {
  await page.evaluate(m => {
    const rows = JSON.parse(localStorage.getItem('aunqa_users') || '[]') as { fullName: string; status?: string }[];
    localStorage.setItem('aunqa_users', JSON.stringify(rows.map(u => (m[u.fullName] ? { ...u, status: m[u.fullName] } : u))));
  }, map);
}
async function removeUser(page: Page, username: string) {
  await page.evaluate(n => {
    const rows = JSON.parse(localStorage.getItem('aunqa_users') || '[]') as { username: string }[];
    localStorage.setItem('aunqa_users', JSON.stringify(rows.filter(u => u.username !== n)));
  }, username);
}
const storedUsers = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('aunqa_users') || '[]')) as Promise<StoredUser[]>;

test.describe('S-07 ป้ายอีเมลยังไม่ยืนยันบนการ์ดคำขอ', () => {
  test('การ์ดคำขอมี req-unverified-{id} ภาษาไทย · สลับ EN → แปล', async ({ page }) => {
    const s = suffix();
    const name = `นายทดสอบ ยังไม่ยืนยัน${s}`;
    await submitRequest(page, name, `unv${s}`);
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin?tab=requests');
    const card = page.locator('li[data-testid^="req-"]', { hasText: name });
    await expect(card).toBeVisible();
    const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
    const badge = page.getByTestId(`req-unverified-${id}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('อีเมลนี้ยังไม่ได้ยืนยัน — ตรวจสอบตัวตนผู้ขอก่อนอนุมัติ');
    await expect(card.getByTestId(`req-unverified-${id}`)).toHaveCount(1);
    await page.getByTestId('lang-en').click();
    await expect(badge).toContainText("This email hasn't been verified");
    await expect(badge).not.toContainText('ยืนยัน');
  });
});

test.describe('minor #3 ผู้รับผิดชอบแผนปรับปรุง เลือกได้เฉพาะบัญชี active', () => {
  test('ระงับเจ้าของ + มีบัญชี invited → ฟอร์มใหม่ไม่มีทั้งคู่ · แก้รายการเดิมยังคงเจ้าของที่ถูกระงับ (selected)', async ({ page }) => {
    const OWNER = 'อ.วิภา เขียนรายงาน';
    const desc = `ทดสอบเจ้าของถูกระงับ ${suffix()}`;
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    await page.getByTestId('act-new').click();
    const before = (await page.getByTestId('act-owner').locator('option').allTextContents()).filter(t => !t.startsWith('—'));
    expect(before).toContain(OWNER);
    const self = (await page.getByTestId('nav-user').textContent())!.trim();
    const other = before.find(t => t !== OWNER && t !== self)!; // ห้ามแตะสถานะของผู้ใช้ที่ล็อกอินอยู่
    expect(other, 'ต้องมีบุคคลอื่นให้ทำเป็น invited').toBeTruthy();
    await page.getByTestId('act-desc').fill(desc);
    await page.getByTestId('act-owner').selectOption({ label: OWNER });
    await page.getByTestId('act-save').click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);

    // OWNER → suspended, other → invited (จำลองผู้ดูแลเปลี่ยนสถานะ)
    await setStatusByName(page, { [OWNER]: 'suspended', [other]: 'invited' });
    await page.reload();
    const row = page.locator('tr[data-testid^="action-"]', { hasText: desc });
    await expect(row).toContainText(OWNER); // ชื่อในตารางยังแสดง

    await page.getByTestId('act-new').click();
    const opts = await page.getByTestId('act-owner').locator('option').allTextContents();
    expect(opts).not.toContain(OWNER);
    expect(opts).not.toContain(other);
    const inactive = (await storedUsers(page)).filter(u => u.status && u.status !== 'active').map(u => u.fullName);
    for (const n of inactive) expect(opts, `บัญชีไม่ active โผล่: ${n}`).not.toContain(n);
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);

    await row.getByRole('button', { name: /แก้/ }).click();
    const sel = page.getByTestId('act-owner');
    await expect(sel.locator('option:checked')).toHaveText(OWNER);
    const editOpts = await sel.locator('option').allTextContents();
    expect(editOpts).toContain(OWNER);
    expect(editOpts).not.toContain(other);
  });
});

test.describe('minor #5 user-menu เป็น disclosure', () => {
  test('ไม่มี aria-haspopup · aria-expanded false→true · aria-controls ชี้ id ของ panel', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto('/app');
    const trigger = page.getByTestId('user-menu');
    await expect(trigger).toBeVisible();
    expect(await trigger.getAttribute('aria-haspopup')).toBeNull();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const controls = await trigger.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.getByTestId('user-menu-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('id', controls!);
    expect(await panel.getAttribute('role')).not.toBe('menu');
  });
});

test.describe('nit #7 ยกเลิกคำเชิญล้ม → กล่องลิงก์ยังอยู่', () => {
  test('ผู้ดูแลอื่นยกเลิกไปก่อน (แถวหาย) → กดยกเลิก → toast error · invite-result + ลิงก์เดิมยังอยู่ · สำเร็จปกติปิดกล่อง (ควบคุมใน onboarding.spec)', async ({ page }) => {
    const s = suffix();
    const username = `icf${s}`;
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-username').fill(username);
    await page.getByTestId('nu-name').fill(`สมปอง ทดสอบยกเลิกล้ม${s}`);
    await page.getByTestId('nu-email').fill(`${username}@${DOMAIN}`);
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId('invite-result')).toBeVisible();
    const link = await page.getByTestId('invite-link').inputValue();

    await removeUser(page, username);
    await page.getByTestId(`user-cancel-invite-${username}`).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: 'ยืนยันยกเลิกคำเชิญ', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByText('ไม่พบผู้ใช้')).toBeVisible();
    await expect(page.getByTestId('invite-result')).toBeVisible();
    await expect(page.getByTestId('invite-link')).toHaveValue(link);
  });
});
