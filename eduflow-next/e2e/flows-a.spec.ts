/**
 * TASK-0001 C3b — E2E-01..07 (spec 16.2)
 * ทุก test = browser context ใหม่ → localStorage/sessionStorage ว่าง → seed เดโม่ใหม่
 */
import { test, expect } from '@playwright/test';
import { createCycleUi, fakeThaiId, gapListText, loginAs, openSection, pickRequirements, sectionUrl } from './helpers';

test.describe('E2E-01 uni_admin เชิญประธานหลักสูตร', () => {
  test('E2E-01 uadmin เพิ่มผู้ใช้ประธานหลักสูตร (scope หลักสูตร CS) → ประธานล็อกอินเห็นหลักสูตร/สร้างรอบได้', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    const form = page.getByTestId('user-form');
    await page.getByTestId('nu-username').fill('chair9');
    // TASK-0002 R2-F6: ฟอร์มมี 2 โหมด (ค่าเริ่ม = ลิงก์เชิญ) — ช่องรหัสผ่านแสดงเมื่อเลือก "ตั้งรหัสผ่านให้เลย"
    await expect(page.getByTestId('nu-mode-invite')).toBeChecked();
    await expect(page.getByTestId('nu-password')).toHaveCount(0);
    await page.getByTestId('nu-mode-password').check();
    await page.getByTestId('nu-password').fill('Chair999');
    await page.getByTestId('nu-name').fill('ผศ.ทดสอบ ประธานใหม่');
    await page.getByTestId('nu-email').fill('chair9@sample-uni.example');
    await form.getByLabel('บทบาท').selectOption({ label: 'ประธานหลักสูตร' });
    const scope = form.getByLabel('ขอบเขต');
    const opts = await scope.locator('option').allTextContents();
    const o = opts.find(t => t.startsWith('หลักสูตร') && /CS/.test(t));
    if (!o) throw new Error('ไม่พบ scope หลักสูตร CS: ' + opts.join(' | '));
    await scope.selectOption({ label: o });
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId('user-chair9')).toBeVisible();
    await expect(page.getByTestId('user-chair9')).toContainText('ประธานหลักสูตร');

    await loginAs(page, 'chair9', 'Chair999');
    await expect(page.getByTestId('nav-user')).toContainText('ผศ.ทดสอบ ประธานใหม่');
    await page.goto('/app/cycles');
    await expect(page.getByTestId('cycles-table')).toBeVisible();     // เห็นรอบของหลักสูตร
    await expect(page.getByTestId('cycle-new')).toBeVisible();        // สร้างรอบได้
    await page.goto('/app/admin');                                    // ประธานไม่มีสิทธิ์จัดการผู้ใช้ (เห็นได้แค่ audit)
    await expect(page.getByTestId('tab-audit')).toBeVisible();
    await expect(page.getByTestId('tab-users')).toBeHidden();
    await expect(page.getByTestId('user-new')).toBeHidden();
  });

  test.skip('E2E-01b uni_admin สร้าง "หลักสูตร" ใหม่ผ่าน UI', async () => {
    // ข้ามเพราะระบบปัจจุบันไม่มี UI/API สร้างหลักสูตร (programme) — มีแค่หลักสูตรเดโม่ที่ seed; ต้องรอ backend จริง
  });
});

test('E2E-02 ประธานสร้างรอบ 2570 → มี 53 ช่อง (sections)', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  expect(id).not.toBe('');
  await expect(page.locator('[data-testid^="heat-"]:not([data-testid="heatmap"])')).toHaveCount(53);
  // หน้ามอบหมายงานก็ต้องมี 53 แถวข้อ (select เจ้าของรายข้อ)
  await page.goto(`/app/cycles/${encodeURIComponent(id)}/assign`);
  await expect(page.locator('select[data-testid^="owner-"]')).toHaveCount(53);
});

test('E2E-03 ประธานมอบหมายเกณฑ์ 1 ให้ lect1 → lect1 เห็นเฉพาะ 5 ข้อ (1.1–1.5) ในงานของฉัน', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  await page.goto(`/app/cycles/${encodeURIComponent(id)}/assign`);
  await page.getByTestId('bulk-owner-1').selectOption({ label: 'อ.ธนา สอนดี' });
  await page.getByTestId('bulk-apply-1').click();
  await expect(page.getByTestId('owner-1.5')).not.toHaveValue('');

  await loginAs(page, 'lect1');
  await expect(page.getByTestId('mywork-table')).toBeVisible();
  const links = page.locator(`a[data-testid^="mywork-"][href*="${encodeURIComponent(id)}"]`);
  await expect(links).toHaveCount(5);
  const ids = (await links.evaluateAll(els => els.map(e => e.getAttribute('data-testid')!.replace('mywork-', '')))).sort();
  expect(ids).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
});

test('E2E-04 อัปโหลดหลักฐาน ผูก 1.1 และ 2.1 → โผล่ทั้ง 2 ข้อ รหัสไม่ซ้ำ', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  await loginAs(page, 'lect1');
  await page.goto('/app/evidence');
  await page.getByTestId('ev-cycle').selectOption({ label: 'รอบ 2570' });
  await page.getByTestId('ev-new').click();
  const title = 'รายงานทดสอบ E2E-04 ผูกสองข้อ';
  await page.getByTestId('ev-title').fill(title);
  await page.getByTestId('ev-text').fill('สรุปผลการดำเนินงานปีการศึกษา 2569 ไม่มีข้อมูลส่วนบุคคล');
  await pickRequirements(page, ['1.1', '2.1']);
  await page.getByTestId('ev-submit').click();
  const row = page.getByTestId('ev-table').locator('tr', { hasText: title });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('1.1');
  await expect(row).toContainText('2.1');
  const code = (await row.locator('strong').first().innerText()).trim();
  expect(code).toMatch(/^E-\d+\.\d+-\d+$/);
  // รหัสไม่ซ้ำกับหลักฐานอื่นทั้งคลัง (ทุกรอบ)
  await page.getByTestId('ev-cycle').selectOption({ label: 'ทุกรอบ / ไม่ระบุรอบ' });
  await expect(page.getByTestId('ev-table').locator('tbody tr').first()).toBeVisible();
  const codes = (await page.getByTestId('ev-table').locator('tbody tr td:first-child strong').allInnerTexts()).map(s => s.trim());
  expect(new Set(codes).size).toBe(codes.length);
  expect(codes.filter(c => c === code)).toHaveLength(1);

  for (const r of ['1.1', '2.1']) {
    await page.goto(sectionUrl(id, r));
    await expect(page.getByTestId('linked-evidence')).toContainText(code);
  }
});

test('E2E-05 ไฟล์ .txt มีเลขบัตรประชาชน (checksum ถูก) → ติดธง PII และ gap R6 ขึ้น', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  await page.goto('/app/evidence');
  await page.getByTestId('ev-cycle').selectOption({ label: 'รอบ 2570' });
  await page.getByTestId('ev-new').click();
  const title = 'บัญชีรายชื่อทดสอบ PII E2E-05';
  await page.getByTestId('ev-title').fill(title);
  await page.getByTestId('ev-file').setInputFiles({
    name: 'roster.txt', mimeType: 'text/plain',
    buffer: Buffer.from(`รายชื่อนักศึกษาสมมติ\nสมชาย ใจดี เลขบัตร ${fakeThaiId()}\n`, 'utf8'),
  });
  await pickRequirements(page, ['1.2']);
  await page.getByTestId('ev-submit').click();
  // dialog เตือน PII
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ข้อมูลส่วนบุคคล');
  await dlg.getByRole('button', { name: 'รับทราบ' }).click();
  const row = page.getByTestId('ev-table').locator('tr', { hasText: title });
  await expect(row).toContainText('PII');
  // หน้ารายละเอียด: banner ธง PII (เลขบัตรประชาชน)
  await row.locator('a').first().click();
  await expect(page.getByTestId('pii-banner')).toContainText('เลขบัตรประชาชน');
  // gap R6 บนแดชบอร์ดรอบ
  const gaps = await gapListText(page, id);
  expect(gaps).toContain('(R6)');
  expect(gaps).toContain('ข้อมูลส่วนบุคคลที่ยังไม่ได้จัดการ');
});

test('E2E-06 AI ร่างข้อ 1.4 → ทุก [E-…] ในร่างเป็นหลักฐานที่ผูกจริง คลิกเปิดได้ และผ่าน post-check', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  await openSection(page, id, '1.4');
  // ผูกหลักฐาน 1.4 จากคลังเดโม่ (3 ชิ้น)
  const sel = page.getByTestId('link-select');
  for (let n = 0; n < 3; n++) {
    const val = await sel.locator('option').evaluateAll(os => (os as HTMLOptionElement[]).find(o => /^E-1\.4-/.test(o.textContent || ''))?.value || '');
    expect(val, 'ไม่เหลือหลักฐาน E-1.4-* ให้ผูก').not.toBe('');
    await sel.selectOption(val);
    await page.getByTestId('link-btn').click();
    await expect(page.getByTestId('linked-evidence').locator('li')).toHaveCount(n + 1);
  }
  const linkedCodes = (await page.getByTestId('linked-evidence').locator('li a strong').allInnerTexts()).map(s => s.trim());
  expect(linkedCodes.length).toBe(3);

  await page.getByTestId('ai-draft').click();
  const draft = page.getByTestId('ai-draft-text');
  await expect(draft).toBeVisible();
  const text = await draft.innerText();
  const cited = Array.from(new Set(Array.from(text.matchAll(/\[(E-\d+\.\d+-\d+)\]/g)).map(m => m[1])));
  expect(cited.length).toBeGreaterThan(0);
  for (const c of cited) expect(linkedCodes, `${c} ในร่างไม่ใช่หลักฐานที่ผูก`).toContain(c);
  // ไม่มีตัวเลข/การอ้างอิงนอก input: post-check ผ่าน (ไม่มีรายการเตือน)
  await expect(page.getByTestId('postcheck')).toContainText('ผ่านการตรวจอ้างอิง/ตัวเลข');
  // คลิกรหัสที่อ้าง → เปิดหน้าหลักฐาน
  await page.getByTestId('linked-evidence').locator('a', { hasText: cited[0] }).click();
  await page.waitForURL(/\/app\/evidence\/[^/]+/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(cited[0]);
});

test('E2E-07 self-rate 5 ทั้งที่ไม่มีหลักฐาน C/A → gap R10 ขึ้น', async ({ page }) => {
  await loginAs(page, 'chair1');
  const id = await createCycleUi(page, 2570);
  await openSection(page, id, '1.1');
  await page.getByTestId('self-score').selectOption('5');
  await page.getByTestId('self-why').fill('มั่นใจว่าดำเนินการครบ');
  await page.getByTestId('self-save').click();
  await expect(page.getByTestId('rating-panel')).toContainText('ล่าสุด: 5 คะแนน');
  const gaps = await gapListText(page, id);
  expect(gaps).toContain('ข้อ 1.1 ให้คะแนนตนเอง 5 แต่หลักฐานยังไม่ครบ');
  expect(gaps).toContain('(R10)');
});
