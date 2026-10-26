/**
 * TASK-0002 เฟส 6 (หลังรอบแก้เฟส 7 รอบที่ 1: R2-B4 · R2-F10 · R2-F11) — regression ของ finding จาก playtest/ui
 * - P1  หลักฐานของข้อที่ส่งตรวจ/อนุมัติแล้ว: ไม่มีปุ่มเลิกผูก/ผูกเพิ่ม + `evidence-locked-reason` · หน้า /app/evidence/[id] `ev-link-locked-{req}` / `ev-link-blocked`
 * - P3  QA คณะ (fqa1) เห็น `go-assign` ("มอบหมายกรรมการ") · หน้า assign = `assign-assessor-only` ไม่ใช่ "ไม่มีสิทธิ์"
 * - U1  รอบถูกส่งกลับ → `cycle-return-reason` (ใคร/เหตุผล) + `cycle-return-steps` เฉพาะผู้มี cycle.submit
 * - P6  แจ้งเตือนแสดงวันที่ พ.ศ. (displayMessageTh) ไม่ใช่ ISO · P8 `act-due-past` (เตือน ไม่บล็อก)
 * - M1  `users-search` + แผงจัดการเปิดทีละแผง + ปิดแล้ว focus กลับ · P5 ถอนบทบาทต้องยืนยัน
 * - U2  `invite-demo-note` ในกล่องผลเชิญ · `inv-demo-note` บน /invite ทั้งลิงก์เสียและลิงก์ดี
 * - P2  ตัวเลือกขอบเขตเปลี่ยนตามบทบาท (req-scope / nu-scope) · คำขอที่ระบุหลักสูตร = ค่าเริ่มหลักสูตรนั้น
 * - U10 ฟอร์มเพิ่มผู้ใช้ส่งว่าง → `nu-error-summary` + พิมพ์แก้แล้ว error ใต้ช่องหาย
 * (U3 ภาษาค่าเดียวทั้งระบบ อยู่ใน shell-r2.spec AC-22) · ข้อมูลทดสอบเป็นข้อมูลสมมติ · ทุก test = context ใหม่
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { DEMO_CYCLE, dialogOk, driveToUnderReview, loginAs, logoutViaMenu, openSection, pickRequirements, transitionAs } from './helpers';

const DOMAIN = 'sample-uni.example';
const suffix = () => String(Date.now() % 100000);

async function confirmDialog(page: Page, button: string) {
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: button, exact: true }).click();
  await expect(dlg).toBeHidden();
}

/** ข้อความของ option ที่เลือกได้ (ไม่นับ placeholder ที่ disabled) */
async function enabledOptions(sel: Locator): Promise<string[]> {
  return sel.evaluate(s => Array.from((s as HTMLSelectElement).options).filter(o => !o.disabled && o.value).map(o => o.text));
}

async function submitRequest(page: Page, name: string, username: string, unitValue?: (vals: string[]) => string) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto('/request-access');
  await page.getByTestId('ra-name').fill(name);
  await page.getByTestId('ra-email').fill(`${username}@${DOMAIN}`);
  await page.getByTestId('ra-email').blur();
  await expect(page.getByTestId('ra-email-uni')).toBeVisible();
  let unit = '';
  if (unitValue) {
    const vals = await page.getByTestId('ra-unit').evaluate(s => Array.from((s as HTMLSelectElement).options).map(o => o.value));
    unit = unitValue(vals);
    await page.getByTestId('ra-unit').selectOption(unit);
  }
  await page.getByTestId('ra-reason').fill('ต้องการเขียนรายงาน SAR ของหลักสูตร (ข้อมูลทดสอบ)');
  await page.getByTestId('ra-username').fill(username);
  await page.getByTestId('ra-password').fill('longpass4');
  await page.getByTestId('ra-password2').fill('longpass4');
  await page.getByTestId('ra-consent').check();
  await page.getByTestId('ra-submit').click();
  await expect(page.getByTestId('ra-success')).toContainText(username);
  return unit;
}

async function openRequestCard(page: Page, name: string) {
  await loginAs(page, 'uadmin');
  await page.goto('/app/admin?tab=requests');
  const card = page.locator('li[data-testid^="req-"]', { hasText: name });
  await expect(card).toBeVisible();
  return { card, id: (await card.getAttribute('data-testid'))!.replace(/^req-/, '') };
}

// ─────────────────────────── P1 ล็อกหลักฐาน ───────────────────────────
test.describe('P1 หลักฐานของข้อที่ล็อก', () => {
  test('ข้อ approved (1.1) / ready_for_review (1.5): ไม่มี × เลิกผูก, ไม่มีชุดผูกเพิ่ม/อัปโหลด + evidence-locked-reason · ข้อ drafting (3.6) ยังเลิกผูกได้', async ({ page }) => {
    await loginAs(page, 'chair1');
    for (const [req, reason] of [['1.1', 'ข้อนี้อนุมัติแล้ว'], ['1.5', 'ข้อนี้ส่งตรวจแล้ว']] as const) {
      await openSection(page, DEMO_CYCLE, req);
      await page.getByTestId('sidetab-evidence').click();
      await expect(page.getByTestId('linked-evidence')).toBeVisible();
      await expect(page.getByTestId('evidence-locked-reason')).toContainText(reason);
      await expect(page.locator('#sidepanel-evidence button[aria-label^="เลิกผูก"]')).toHaveCount(0);
      await expect(page.getByTestId('link-search')).toHaveCount(0);
      await expect(page.getByTestId('link-btn')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'อัปโหลดหลักฐานใหม่สำหรับข้อนี้' })).toHaveCount(0);
    }
    // control: ข้อที่ยังเขียนได้
    await openSection(page, DEMO_CYCLE, '3.6');
    await page.getByTestId('sidetab-evidence').click();
    await expect(page.getByTestId('evidence-locked-reason')).toHaveCount(0);
    expect(await page.locator('#sidepanel-evidence button[aria-label^="เลิกผูก"]').count()).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'อัปโหลดหลักฐานใหม่สำหรับข้อนี้' })).toBeVisible();
  });

  test('/app/evidence/[id]: หลักฐานที่ผูก 3.3 (approved) + 3.6 (drafting) → 3.3 มี ev-link-locked ไม่มี × · 3.6 มี × · เลือกข้อที่ล็อกใน picker → ev-link-blocked + ev-link-btn disabled', async ({ page }) => {
    await loginAs(page, 'chair1');
    await openSection(page, DEMO_CYCLE, '3.6');
    await page.getByTestId('sidetab-evidence').click();
    // หลักฐานในข้อ 3.6 ทุกชิ้นของ seed ผูกกับ 3.3 ด้วย
    await page.getByTestId('linked-evidence').getByRole('link').first().click();
    await page.waitForURL(/\/app\/evidence\/[^/?]+\?cycle=/);
    await expect(page.getByTestId('ev-links')).toBeVisible();
    await expect(page.getByTestId('ev-link-locked-3.3')).toContainText('เลิกผูกไม่ได้');
    await expect(page.getByRole('button', { name: 'เลิกผูกข้อ 3.3' })).toHaveCount(0);
    await expect(page.getByTestId('ev-link-locked-3.6')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'เลิกผูกข้อ 3.6' })).toBeVisible();

    await pickRequirements(page, ['1.1'], 'ev-link-req');
    await expect(page.getByTestId('ev-link-blocked')).toContainText('ผูกไม่ได้');
    await expect(page.getByTestId('ev-link-btn')).toBeDisabled();
  });
});

// ─────────────────────────── P3 + U1 ───────────────────────────
test.describe('P3 QA คณะมอบหมายกรรมการ · U1 เหตุผลที่รอบถูกส่งกลับ', () => {
  test('fqa1: go-assign = "มอบหมายกรรมการ" → หน้า assign มี assign-assessor-only ไม่ขึ้น "ไม่มีสิทธิ์" · chair1 ยังเป็น "มอบหมายงาน"', async ({ page }) => {
    await loginAs(page, 'fqa1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    const go = page.getByTestId('go-assign');
    await expect(go).toHaveText(/มอบหมายกรรมการ/);
    await go.click();
    await page.waitForURL(/\/assign$/);
    await expect(page.getByTestId('assign-assessor-only')).toBeVisible();
    await expect(page.getByText('คุณไม่มีสิทธิ์มอบหมายงาน')).toHaveCount(0);

    // negative: ผู้ไม่มีทั้ง cycle.assign และ assessor.assign → ไม่มีปุ่ม
    await loginAs(page, 'staff1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByTestId('go-assign')).toHaveCount(0);

    await loginAs(page, 'chair1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    await expect(page.getByTestId('go-assign')).toHaveText(/มอบหมายงาน/);
  });

  test('fqa1 ส่งรอบกลับพร้อมเหตุผล → chair1 เห็น cycle-return-reason (ผู้ส่ง + เหตุผล) + ขั้นตอน · หลังเปิดรอบ (in_progress) ยังเห็น · staff1 เห็นเหตุผลแต่ไม่มีขั้นตอน', async ({ page }) => {
    test.setTimeout(240_000);
    const NOTE = `ข้อ 3.6 ยังขาดหลักฐานผลลัพธ์ (ทดสอบ U1 ${suffix()})`;
    await driveToUnderReview(page);
    await transitionAs(page, 'fqa1', 'revision_requested', NOTE);

    await loginAs(page, 'chair1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    const box = page.getByTestId('cycle-return-reason');
    await expect(box).toContainText(NOTE);
    await expect(box).toContainText('ส่งรอบนี้กลับแก้ไข');
    await expect(page.getByTestId('cycle-return-steps')).toBeVisible();

    await page.getByTestId('cycle-to-in_progress').click();
    await dialogOk(page);
    await expect(box).toContainText(NOTE);
    await expect(page.getByTestId('cycle-return-steps')).toContainText('(ทำแล้ว)');

    await loginAs(page, 'staff1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    await expect(page.getByTestId('cycle-return-reason')).toContainText(NOTE);
    await expect(page.getByTestId('cycle-return-steps')).toHaveCount(0);
  });

  test('รอบที่ไม่เคยถูกส่งกลับ → ไม่มี cycle-return-reason (negative)', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto(`/app/cycles/${DEMO_CYCLE}`);
    await expect(page.getByTestId('heatmap')).toBeVisible();
    await expect(page.getByTestId('cycle-return-reason')).toHaveCount(0);
  });
});

// ─────────────────────────── P6 + P8 ───────────────────────────
test.describe('P6 วันที่ พ.ศ. ในแจ้งเตือน · P8 วันกำหนดในอดีต', () => {
  test('chair1 สร้างแผนปรับปรุงกำหนด 2030-03-15 ให้ staff1 → แจ้งเตือนไทย "15 มี.ค. 2573" ไม่มี ISO / "action item" · EN ยังเป็นข้อความอังกฤษ', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    await page.getByTestId('act-new').click();
    await page.getByTestId('act-desc').fill(`ทบทวนแผนรับนักศึกษา (ทดสอบ P6 ${suffix()})`);
    await page.getByTestId('act-owner').selectOption({ label: 'อ.วิภา เขียนรายงาน' });
    await page.getByTestId('act-due').fill('2030-03-15');
    await expect(page.getByTestId('act-due-past')).toHaveCount(0);
    await page.getByTestId('act-save').click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);

    await loginAs(page, 'staff1');
    await page.getByTestId('nav-bell').click();
    const item = page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"]', { hasText: 'กำหนดเสร็จ' }).first();
    await expect(item).toContainText('15 มี.ค. 2573');
    await expect(item).toContainText('แผนปรับปรุง');
    await expect(item).not.toContainText('2030-03-15');
    await expect(item).not.toContainText('action item');
    await page.keyboard.press('Escape');

    await page.getByTestId('lang-en').click();
    await page.getByTestId('nav-bell').click();
    await expect(page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"]').first()).not.toContainText('มี.ค.');
  });

  test('act-due-past: วันกำหนดในอดีต → คำเตือน (aria-describedby) แต่บันทึกได้ · แก้เป็นอนาคต → คำเตือนหาย', async ({ page }) => {
    const desc = `ทดสอบวันในอดีต ${suffix()}`;
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    await page.getByTestId('act-new').click();
    await page.getByTestId('act-desc').fill(desc);
    await page.getByTestId('act-due').fill('2020-01-15');
    await expect(page.getByTestId('act-due-past')).toBeVisible();
    await expect(page.getByTestId('act-due')).toHaveAttribute('aria-describedby', 'act-due-past');
    await page.getByTestId('act-due').fill('2031-01-15');
    await expect(page.getByTestId('act-due-past')).toHaveCount(0);
    await page.getByTestId('act-due').fill('2020-01-15');
    await page.getByTestId('act-save').click();
    await expect(page.getByTestId('action-form')).toHaveCount(0);
    await expect(page.locator('tr[data-testid^="action-"]', { hasText: desc })).toHaveCount(1);
  });
});

// ─────────────────────────── M1 + P5 ───────────────────────────
test.describe('M1 ตารางผู้ใช้ + แผงจัดการ', () => {
  test('users-search กรองแถว (ชื่อผู้ใช้/อีเมล) · ไม่พบ → users-search-empty · แผงเปิดทีละแผง · ปิดแผงแล้ว focus กลับปุ่มจัดการ', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    const rows = page.getByTestId('users-table').locator('tbody tr[data-testid^="user-"]');
    const all = await rows.count();
    expect(all).toBeGreaterThan(3);
    await page.getByTestId('users-search').fill('lect1');
    await expect(rows).toHaveCount(1);
    await expect(page.getByTestId('user-lect1')).toBeVisible();
    await page.getByTestId('users-search').fill('zz-ไม่มีผู้ใช้นี้');
    await expect(rows).toHaveCount(0);
    await expect(page.getByTestId('users-search-empty')).toBeVisible();
    await page.getByTestId('users-search').fill('');
    await expect(rows).toHaveCount(all);

    await page.getByTestId('user-manage-lect1').click();
    await expect(page.getByTestId('user-panel-lect1')).toBeVisible();
    await page.getByTestId('user-manage-chair1').click();
    await expect(page.getByTestId('user-panel-chair1')).toBeVisible();
    await expect(page.getByTestId('user-panel-lect1')).toHaveCount(0);
    await expect(page.getByTestId('user-manage-lect1')).toHaveAttribute('aria-expanded', 'false');
    await page.getByTestId('user-panel-close-chair1').click();
    await expect(page.getByTestId('user-panel-chair1')).toHaveCount(0);
    await expect(page.getByTestId('user-manage-chair1')).toBeFocused();
  });

  test('P5 ถอนบทบาท → dialog "ยืนยันถอนบทบาท" · "เก็บบทบาทไว้" = ไม่เปลี่ยน · ยืนยัน = บทบาทหาย · เพิ่มบทบาทซ้ำ = แจ้ง info ไม่เพิ่ม', async ({ page }) => {
    const s = suffix();
    const username = `p5u${s}`;
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-username').fill(username);
    await page.getByTestId('nu-name').fill(`ทดสอบ ถอนบทบาท${s}`);
    await page.getByTestId('nu-email').fill(`${username}@${DOMAIN}`);
    await page.getByTestId('nu-mode-password').check();
    await page.getByTestId('nu-password').fill('abcdefgh');
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId(`user-${username}`)).toBeVisible();

    await page.getByTestId(`user-manage-${username}`).click();
    const panel = page.getByTestId(`user-panel-${username}`);
    // เพิ่มบทบาทซ้ำ (อาจารย์ + ขอบเขตเดิมที่เลือกให้อัตโนมัติ) → info
    await page.getByTestId(`user-add-submit-${username}`).click();
    await expect(page.getByText('ผู้ใช้มีบทบาทนี้ในขอบเขตนี้อยู่แล้ว')).toBeVisible();
    await expect(panel.locator('button[aria-label^="ลบบทบาท"]')).toHaveCount(1);

    await panel.locator('button[aria-label^="ลบบทบาท"]').click();
    await expect(page.getByRole('dialog')).toContainText('นี่คือบทบาทสุดท้าย');
    await confirmDialog(page, 'เก็บบทบาทไว้');
    await expect(panel.locator('button[aria-label^="ลบบทบาท"]')).toHaveCount(1);
    await panel.locator('button[aria-label^="ลบบทบาท"]').click();
    await confirmDialog(page, 'ยืนยันถอนบทบาท');
    await expect(panel.locator('button[aria-label^="ลบบทบาท"]')).toHaveCount(0);
    await expect(page.getByTestId(`user-${username}`)).toContainText('ไม่มีบทบาท');
  });
});

// ─────────────────────────── U2 ───────────────────────────
test.describe('U2 ป้ายระบบสาธิตของลิงก์เชิญ', () => {
  test('invite-demo-note ในกล่องผลเชิญ · /invite ขั้นกรอกรหัส / ลิงก์เสีย (inv-invalid) / ลิงก์ดี มี inv-demo-note ข้อความเดียวกัน', async ({ page }) => {
    const s = suffix();
    const username = `u2i${s}`;
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-username').fill(username);
    await page.getByTestId('nu-name').fill(`ทดสอบ ป้ายสาธิต${s}`);
    await page.getByTestId('nu-email').fill(`${username}@${DOMAIN}`);
    await page.getByTestId('nu-submit').click();
    const note = page.getByTestId('invite-demo-note');
    await expect(note).toContainText('ระบบสาธิต');
    const noteText = (await note.innerText()).trim();
    const link = await page.getByTestId('invite-link').inputValue();

    await logoutViaMenu(page);
    await page.waitForURL(u => new URL(u).pathname === '/');
    // ไม่มี hash = ขั้นกรอกรหัสเชิญ · hash เสีย = inv-invalid — ทั้งสองสถานะมีป้ายเดียวกัน
    await page.goto('/invite');
    await expect(page.getByTestId('inv-code')).toBeVisible();
    await expect(page.getByTestId('inv-demo-note')).toHaveText(noteText);
    await page.goto('/');
    await page.goto('/invite#t=bogus-token-not-valid-0000');
    await expect(page.getByTestId('inv-invalid')).toBeVisible();
    await expect(page.getByTestId('inv-demo-note')).toHaveText(noteText);
    await page.goto('/');
    await page.goto(link);
    await expect(page.getByTestId('inv-summary')).toBeVisible();
    await expect(page.getByTestId('inv-demo-note')).toHaveText(noteText);
  });
});

// ─────────────────────────── P2 + U10 ───────────────────────────
test.describe('P2 ขอบเขตตามบทบาท', () => {
  test('คำขอ: กรรมการประเมิน → มีแต่ "รอบ …" · คณบดี → มีแต่คณะ · ประธาน → มีแต่หลักสูตร (+ help) · ทั้งมหาวิทยาลัยไม่โผล่ผิดบทบาท', async ({ page }) => {
    const s = suffix();
    const name = `นางทดสอบ ขอบเขต${s}`;
    await submitRequest(page, name, `p2r${s}`);
    const { id } = await openRequestCard(page, name);
    const role = page.getByTestId(`req-role-${id}`), scope = page.getByTestId(`req-scope-${id}`);

    await role.selectOption('assessor');
    const asOpts = await enabledOptions(scope);
    expect(asOpts.length).toBeGreaterThan(0);
    for (const t of asOpts) expect(t).toMatch(/^รอบ /);
    await expect(page.locator(`[id="req-scope-${id}-help"]`)).toContainText('รอบประเมิน');

    await role.selectOption('dean');
    const deanOpts = await enabledOptions(scope);
    expect(deanOpts.length).toBeGreaterThan(0);
    for (const t of deanOpts) expect(t).toMatch(/^คณะ/);
    for (const t of deanOpts) expect(t).not.toMatch(/^คณะ คณะ/); // m5

    await role.selectOption('programme_chair');
    const chOpts = await enabledOptions(scope);
    for (const t of chOpts) expect(t).toMatch(/^หลักสูตร /);

    await role.selectOption('uni_admin');
    expect(await enabledOptions(scope)).toEqual(['ทั้งมหาวิทยาลัย']);
  });

  test('คำขอที่ระบุหลักสูตร → ค่าเริ่ม req-scope = หลักสูตรนั้น (อาจารย์) · คณบดี = คณะต้นสังกัดของหลักสูตรนั้น · คำขอที่ระบุคณะ + อาจารย์ = ยังไม่เลือก (ไม่เดา)', async ({ page }) => {
    const s = suffix();
    const name = `นายทดสอบ ระบุหลักสูตร${s}`;
    const unit = await submitRequest(page, name, `p2p${s}`, vals => vals.find(v => v.startsWith('p:'))!);
    expect(unit).toMatch(/^p:/);
    const { id } = await openRequestCard(page, name);
    await expect(page.getByTestId(`req-role-${id}`)).toHaveValue('programme_staff');
    await expect(page.getByTestId(`req-scope-${id}`)).toHaveValue(`programme:${unit.slice(2)}`);
    await page.getByTestId(`req-role-${id}`).selectOption('dean');
    await expect(page.getByTestId(`req-scope-${id}`)).toHaveValue(/^faculty:/);

    // ผู้ขอเลือกระดับคณะ → อาจารย์ (ระดับหลักสูตร) ไม่เดาหลักสูตรให้
    const name2 = `นางทดสอบ ระบุคณะ${s}`;
    const fac = await submitRequest(page, name2, `p2f${s}`, vals => vals.find(v => v.startsWith('f:'))!);
    const c2 = await openRequestCard(page, name2);
    await expect(page.getByTestId(`req-role-${c2.id}`)).toHaveValue('programme_staff');
    await expect(page.getByTestId(`req-scope-${c2.id}`)).toHaveValue('');
    await page.getByTestId(`req-role-${c2.id}`).selectOption('dean');
    await expect(page.getByTestId(`req-scope-${c2.id}`)).toHaveValue(`faculty:${fac.slice(2)}`);
  });

  test('ฟอร์มเพิ่มผู้ใช้: nu-scope ตาม nu-role · ส่งว่าง → nu-error-summary + ลิงก์ · พิมพ์ชื่อผู้ใช้แล้ว error ใต้ช่องหาย', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-role').selectOption('assessor');
    for (const t of await enabledOptions(page.getByTestId('nu-scope'))) expect(t).toMatch(/^รอบ /);
    await page.getByTestId('nu-role').selectOption('faculty_qa');
    for (const t of await enabledOptions(page.getByTestId('nu-scope'))) expect(t).toMatch(/^คณะ/);
    await expect(page.getByTestId('nu-scope')).not.toHaveValue(''); // ฟอร์มเพิ่มผู้ใช้ = ตัวแรกของระดับที่ใช้ได้

    await page.getByTestId('nu-submit').click();
    const sum = page.getByTestId('nu-error-summary');
    await expect(sum).toBeVisible();
    for (const f of ['username', 'name', 'email']) await expect(page.getByTestId(`nu-error-link-${f}`)).toBeVisible();
    await expect(page.getByTestId('nu-username')).toHaveAttribute('aria-invalid', 'true');
    await page.getByTestId('nu-username').fill('valid.user');
    await expect(page.getByTestId('nu-username')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#nu-username-err')).toHaveCount(0);
    await expect(page.getByTestId('users-table').locator('tr[data-testid="user-valid.user"]')).toHaveCount(0);
  });
});
