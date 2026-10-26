/**
 * TASK-0002 Q2d — onboarding e2e (ADR-AUTH-001 / friendly-spec §F8, §F10–F11)
 * AC-26 เชิญ → คัดลอกลิงก์ → รับเชิญ · AC-27 ขอเข้าใช้งาน → อนุมัติ/ปฏิเสธ (+ deep link `?tab=requests`)
 * AC-28 ระงับ/เปิดใช้ · AC-29 รหัสผ่าน 7 ตัวไม่ผ่านใน UI ทั้ง 3 ฟอร์ม · AC-30 ไม่มีปุ่มลบ + แท็บเดโม่เฉพาะ super_admin
 * ข้อมูลทั้งหมดเป็นข้อมูลสมมติ · ทุก test = context ใหม่ (seed เดโม่ใหม่)
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs, logoutViaMenu } from './helpers';

const DOMAIN = 'sample-uni.example';
const suffix = () => String(Date.now() % 100000);

/** ล้าง session แล้วกรอกฟอร์ม login เอง (ไม่รอ /app — ใช้กับกรณีที่ต้องล้ม) */
async function tryLogin(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

async function confirmDialog(page: Page, button: string, note?: string) {
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  if (note !== undefined) await dlg.locator('textarea').fill(note);
  await dlg.getByRole('button', { name: button, exact: true }).click();
  await expect(dlg).toBeHidden();
}

/** uadmin เปิดฟอร์มเพิ่มผู้ใช้ กรอกข้อมูล (โหมดเริ่มต้น = เชิญ) → คืนลิงก์เชิญจาก `invite-link` */
async function inviteViaUi(page: Page, username: string, fullName: string): Promise<string> {
  await page.goto('/app/admin');
  await page.getByTestId('user-new').click();
  await page.getByTestId('nu-username').fill(username);
  await page.getByTestId('nu-name').fill(fullName);
  await page.getByTestId('nu-email').fill(`${username}@${DOMAIN}`);
  await expect(page.getByTestId('nu-mode-invite')).toBeChecked();
  await page.getByTestId('nu-submit').click();
  await expect(page.getByTestId('invite-result')).toBeVisible();
  const link = await page.getByTestId('invite-link').inputValue();
  expect(link).toMatch(/\/invite#t=[A-Za-z0-9_-]{20,}$/);
  return link;
}

interface Req { name: string; username: string; password: string }
/** ส่งคำขอเข้าใช้งานจาก /request-access (ไม่ต้องล็อกอิน) — ไม่มีช่องบทบาท */
async function submitRequest(page: Page, r: Req) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto('/request-access');
  await page.getByTestId('ra-name').fill(r.name);
  await page.getByTestId('ra-email').fill(`${r.username}@${DOMAIN}`);
  await page.getByTestId('ra-email').blur();
  await expect(page.getByTestId('ra-email-uni')).toBeVisible();
  await page.getByTestId('ra-reason').fill('ต้องการเขียนรายงาน SAR ของหลักสูตร (ข้อมูลทดสอบ)');
  await page.getByTestId('ra-username').fill(r.username);
  await page.getByTestId('ra-password').fill(r.password);
  await page.getByTestId('ra-password2').fill(r.password);
  await page.getByTestId('ra-consent').check();
  await page.getByTestId('ra-submit').click();
  await expect(page.getByTestId('ra-success')).toContainText(r.username);
}

/** R2-F10 (M1): ปุ่มจัดการบัญชีอยู่ในแผงใต้แถว — เปิดแผง `user-panel-{u}` ก่อน (idempotent: เปิดอยู่แล้วไม่กดซ้ำ) */
async function manage(page: Page, username: string) {
  const panel = page.getByTestId(`user-panel-${username}`);
  if (!(await panel.isVisible())) await page.getByTestId(`user-manage-${username}`).click();
  await expect(panel).toBeVisible();
  await expect(page.getByTestId(`user-manage-${username}`)).toHaveAttribute('aria-expanded', 'true');
  return panel;
}

const reqCard = (page: Page, name: string) => page.locator('li[data-testid^="req-"]', { hasText: name });

// ─────────────────────────── AC-26 ───────────────────────────
test.describe('AC-26 เชิญผู้ใช้', () => {
  test('uadmin เชิญ → คัดลอกลิงก์ → ออก → เปิดลิงก์ → ตั้งรหัส → /app ชื่อถูก · ลิงก์ใช้ซ้ำไม่ได้ · ผู้เชิญได้แจ้งเตือน N14 → /app/admin?tab=users', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const s = suffix();
    const username = `inv${s}`;
    const fullName = `อ.สมศรี ทดสอบเชิญ${s}`;
    await loginAs(page, 'uadmin');
    const link = await inviteViaUi(page, username, fullName);
    await expect(page.getByTestId('invite-result')).toContainText(`สร้างคำเชิญสำหรับ ${fullName} แล้ว`);
    await expect(page.getByTestId('invite-code')).not.toBeEmpty();
    // คัดลอก (Clipboard API) → toast + clipboard = ลิงก์
    await page.getByTestId('invite-copy').click();
    await expect(page.getByText('คัดลอกลิงก์แล้ว')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    // แถวใหม่ = รอตั้งรหัสผ่าน · token ดิบไม่อยู่ใน storage
    await expect(page.getByTestId(`user-status-${username}`)).toHaveText('รอตั้งรหัสผ่าน');
    const token = link.split('#t=')[1];
    const leaked = await page.evaluate(t => {
      const all: string[] = [];
      for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) all.push(st.getItem(st.key(i)!) ?? '');
      return all.some(v => v.includes(t));
    }, token);
    expect(leaked, 'token ดิบห้ามอยู่ใน storage').toBe(false);

    // ผู้ถูกเชิญยัง login ไม่ได้
    await logoutViaMenu(page);
    await tryLogin(page, username, 'aaaaaaaa');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // เปิดลิงก์ → summary → hash ถูกลบออกจาก URL
    await page.goto(link);
    await expect(page.getByTestId('inv-summary')).toBeVisible();
    await expect(page.getByTestId('inv-summary')).toContainText(username);
    await expect(page.getByTestId('inv-summary')).toContainText('อาจารย์/เจ้าหน้าที่หลักสูตร');
    expect(page.url()).not.toContain('#t=');
    // R2-F7 m4: ชื่อมีคำนำหน้าแล้ว → ไม่เติม "คุณ"
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText(`ยินดีต้อนรับ ${fullName}`);
    await expect(h1).not.toContainText('คุณอ.');
    await expect(page.getByText('อย่างน้อย 8 ตัวอักษร')).toBeVisible();
    await page.getByTestId('inv-password').fill('aaaaaaaa'); // AC-29: ไม่มีกฎผสมชนิดอักขระ
    await page.getByTestId('inv-password2').fill('aaaaaaaa');
    await page.getByTestId('inv-submit').click();
    await page.waitForURL('**/app', { timeout: 30_000 });
    await expect(page.getByTestId('nav-user')).toContainText(fullName);

    // ลิงก์เดิมใช้ซ้ำ → ข้อความกลาง
    await logoutViaMenu(page);
    await page.waitForURL(u => new URL(u).pathname === '/');
    await page.goto(link);
    await expect(page.getByTestId('inv-invalid')).toBeVisible();
    await expect(page.getByTestId('inv-summary')).toHaveCount(0);

    // login ด้วยรหัสที่ตั้งได้ · ผู้เชิญได้แจ้งเตือน N14 → แท็บผู้ใช้ (สถานะใช้งานอยู่)
    await loginAs(page, username, 'aaaaaaaa');
    await loginAs(page, 'uadmin');
    await page.getByTestId('nav-bell').click();
    const item = page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"]', { hasText: fullName }).first();
    await expect(item).toHaveAttribute('href', '/app/admin?tab=users');
    await item.click();
    await page.waitForURL(/\/app\/admin\?tab=users$/);
    await expect(page.getByTestId('tab-users')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId(`user-status-${username}`)).toHaveText('ใช้งานอยู่');
  });

  test('สร้างลิงก์ใหม่ → ลิงก์เก่าใช้ไม่ได้ · ยกเลิกคำเชิญ (ยืนยัน) → แถวหาย + ลิงก์ใหม่ใช้ไม่ได้', async ({ page }) => {
    const s = suffix();
    const username = `inr${s}`;
    const fullName = `สมหญิง ทดสอบลิงก์ใหม่${s}`;
    await loginAs(page, 'uadmin');
    const oldLink = await inviteViaUi(page, username, fullName);
    await expect(page.getByTestId(`user-reinvite-${username}`)).toHaveCount(0); // อยู่ในแผงจัดการ
    await manage(page, username);
    await page.getByTestId(`user-reinvite-${username}`).click();
    await expect.poll(() => page.getByTestId('invite-link').inputValue()).not.toBe(oldLink);
    const newLink = await page.getByTestId('invite-link').inputValue();

    // แผงยังเปิดหลังทำรายการ (R2-F10)
    await expect(page.getByTestId(`user-panel-${username}`)).toBeVisible();
    await page.getByTestId(`user-cancel-invite-${username}`).click();
    await confirmDialog(page, 'ยืนยันยกเลิกคำเชิญ');
    await expect(page.getByTestId(`user-${username}`)).toHaveCount(0);
    await expect(page.getByTestId('invite-result')).toHaveCount(0);

    await logoutViaMenu(page);
    await page.waitForURL(u => new URL(u).pathname === '/');
    for (const l of [oldLink, newLink]) {
      await page.goto('/');
      await page.goto(l);
      await expect(page.getByTestId('inv-invalid')).toBeVisible();
    }
  });

  test('ยกเลิกในกล่องยืนยัน → คำเชิญยังอยู่ (negative)', async ({ page }) => {
    const s = suffix();
    const username = `inc${s}`;
    await loginAs(page, 'uadmin');
    await inviteViaUi(page, username, `สมชาย ทดสอบยกเลิก${s}`);
    await manage(page, username);
    await page.getByTestId(`user-cancel-invite-${username}`).click();
    // U8: ปุ่มปิดไม่ใช้คำว่า "ยกเลิก" ซ้ำกับปุ่มยืนยัน
    await expect(page.getByRole('dialog').getByRole('button', { name: 'ยกเลิก', exact: true })).toHaveCount(0);
    await confirmDialog(page, 'เก็บคำเชิญไว้');
    await expect(page.getByTestId(`user-status-${username}`)).toHaveText('รอตั้งรหัสผ่าน');
  });
});

// ─────────────────────────── AC-27 ───────────────────────────
test.describe('AC-27 ขอเข้าใช้งาน', () => {
  test('/request-access ไม่มีช่อง/ตัวเลือกบทบาท · อีเมลโดเมนอื่น → error ใต้ ra-email', async ({ page }) => {
    await page.goto('/request-access');
    await expect(page.getByTestId('ra-name')).toBeVisible();
    const roleish = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('main input, main select, main textarea').forEach(el => {
        const e = el as HTMLInputElement;
        const label = e.labels ? Array.from(e.labels).map(l => l.textContent ?? '').join(' ') : '';
        const hay = [e.name, e.id, e.dataset.testid ?? '', e.getAttribute('aria-label') ?? '', label].join(' ');
        if (/role|บทบาท/i.test(hay)) out.push(hay); // (คำว่า "สิทธิ์" อยู่ใน label ยินยอม PDPA จึงไม่ใช้)
        if (e.tagName === 'SELECT') Array.from((e as unknown as HTMLSelectElement).options).forEach(o => {
          if (/ประธานหลักสูตร|ผู้ดูแล|คณบดี|กรรมการ|admin|chair/i.test(o.text)) out.push(`option:${o.text}`);
        });
      });
      return out;
    });
    expect(roleish).toEqual([]);
    // select เดียวในฟอร์ม = หน่วยงาน
    await expect(page.locator('main select')).toHaveCount(1);
    await expect(page.locator('main select')).toHaveAttribute('data-testid', 'ra-unit');

    await page.getByTestId('ra-email').fill('someone@other.example');
    await page.getByTestId('ra-email').blur();
    const describedBy = await page.getByTestId('ra-email').getAttribute('aria-describedby');
    await expect(page.getByText('อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้').first()).toBeVisible();
    await expect(page.getByTestId('ra-email')).toHaveAttribute('aria-invalid', 'true');
    expect(describedBy).toBeTruthy();
    await expect(page.getByTestId('ra-email-uni')).toHaveCount(0);
  });

  test('ส่งคำขอ → login = รอผู้ดูแลอนุมัติ → uadmin: แจ้งเตือน → /app/admin?tab=requests · todo บนหน้าหลัก · อนุมัติ (กำหนดบทบาท) → ผู้ขอเข้าได้', async ({ page }) => {
    const s = suffix();
    const r = { name: `นางสาวทดสอบ ขอใช้งาน${s}`, username: `req${s}`, password: 'longpass1' };
    await submitRequest(page, r);

    await tryLogin(page, r.username, r.password);
    await expect(page.getByTestId('login-error')).toContainText('รอผู้ดูแลอนุมัติ');
    await expect(page).toHaveURL(/\/login/);

    await loginAs(page, 'uadmin');
    // หน้าหลัก: งาน "อนุมัติคำขอ" → ลิงก์ไปแท็บคำขอ · ตัวนับหน้าหลักรวมคำขอด้วย (R2-F7 m2)
    const todo = page.locator('[data-testid^="todo-access_requests-"]');
    await expect(todo).toHaveCount(1);
    await expect(todo.getByRole('link')).toHaveAttribute('href', '/app/admin?tab=requests');
    // แจ้งเตือน N12 → ปลายทาง admin requests
    await page.getByTestId('nav-bell').click();
    const item = page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"][data-unread]').first();
    await expect(item).toHaveAttribute('href', '/app/admin?tab=requests');
    await item.click();
    await page.waitForURL(/\/app\/admin\?tab=requests$/);
    await expect(page.getByTestId('tab-requests')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('tab-requests')).toContainText('1');
    const card = reqCard(page, r.name);
    await expect(card).toBeVisible();
    await expect(card).toContainText(`${r.username}@${DOMAIN}`);
    const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
    await page.getByTestId(`req-role-${id}`).selectOption('programme_chair');
    const scopeLabel = (await page.getByTestId(`req-scope-${id}`).locator('option').allTextContents()).find(t => /^หลักสูตร .*CS/.test(t));
    expect(scopeLabel, 'ต้องมีขอบเขตหลักสูตร CS').toBeTruthy();
    await page.getByTestId(`req-scope-${id}`).selectOption({ label: scopeLabel! });
    await page.getByTestId(`req-approve-${id}`).click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('state-empty')).toContainText('ไม่มีคำขอรออนุมัติ');
    await expect(page.getByTestId('tab-requests')).not.toContainText('1');

    await page.getByTestId('tab-users').click();
    await expect(page.getByTestId(`user-${r.username}`)).toContainText('ประธานหลักสูตร');
    await expect(page.getByTestId(`user-status-${r.username}`)).toHaveText('ใช้งานอยู่');

    // ผู้ขอเข้าได้ด้วยบทบาทที่กำหนด (ประธานหลักสูตร → สร้างรอบได้)
    await loginAs(page, r.username, r.password);
    await expect(page.getByTestId('nav-user')).toContainText(r.name);
    await page.goto('/app/cycles');
    await expect(page.getByTestId('cycle-new')).toBeVisible();
  });

  test('ปฏิเสธคำขอ (prompt "ยืนยันปฏิเสธ") → การ์ดหาย · ผู้ขอ login ไม่ได้ · uadmin2 (อีกมหาวิทยาลัย) ไม่เห็นคำขอ', async ({ page }) => {
    const s = suffix();
    const r = { name: `นายทดสอบ ถูกปฏิเสธ${s}`, username: `rej${s}`, password: 'longpass2' };
    await submitRequest(page, r);

    await loginAs(page, 'uadmin2');
    await page.goto('/app/admin?tab=requests');
    await expect(page.getByTestId('tab-requests')).toHaveAttribute('aria-selected', 'true');
    await expect(reqCard(page, r.name)).toHaveCount(0);

    await loginAs(page, 'uadmin');
    await page.goto('/app/admin?tab=requests');
    const card = reqCard(page, r.name);
    await expect(card).toBeVisible();
    const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
    // ยกเลิกใน prompt → การ์ดยังอยู่
    await page.getByTestId(`req-reject-${id}`).click();
    await confirmDialog(page, 'ยังไม่ปฏิเสธ'); // U8
    await expect(card).toBeVisible();
    await page.getByTestId(`req-reject-${id}`).click();
    await confirmDialog(page, 'ยืนยันปฏิเสธ', 'ไม่ใช่บุคลากรของหลักสูตร (ทดสอบ)');
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('state-empty')).toContainText('ไม่มีคำขอรออนุมัติ');

    await tryLogin(page, r.username, r.password);
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).not.toContainText('รอผู้ดูแลอนุมัติ');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─────────────────────────── AC-28 ───────────────────────────
test.describe('AC-28 ระงับบัญชี', () => {
  test('uadmin ระงับ lect1 (ยืนยัน) → lect1 login = "ถูกระงับ" (รหัสผิด = ข้อความทั่วไป) → เปิดใช้อีกครั้ง → login ได้', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await expect(page.getByTestId('user-status-lect1')).toHaveText('ใช้งานอยู่');
    // ตัวเอง = ไม่มีปุ่มจัดการ · P4: uadmin จัดการบัญชี super_admin ไม่ได้
    await expect(page.getByTestId('user-suspend-uadmin')).toHaveCount(0);
    await expect(page.getByTestId('user-manage-uadmin')).toHaveCount(0);
    await expect(page.getByTestId('user-uadmin')).toContainText('บัญชีของคุณ');
    await expect(page.getByTestId('user-sadmin')).toBeVisible();
    await expect(page.getByTestId('user-manage-sadmin')).toHaveCount(0);
    // ปุ่มระงับไม่อยู่บนแถวจนกว่าจะเปิดแผง
    await expect(page.getByTestId('user-suspend-lect1')).toHaveCount(0);
    await manage(page, 'lect1');
    await page.getByTestId('user-suspend-lect1').click();
    await confirmDialog(page, 'ยืนยันระงับ');
    await expect(page.getByTestId('user-status-lect1')).toHaveText('ระงับ');
    await expect(page.getByTestId('user-suspend-lect1')).toHaveCount(0);
    await expect(page.getByTestId('user-reactivate-lect1')).toBeVisible();
    // P5: บัญชีระงับ → เพิ่มบทบาทไม่ได้ (บอกเหตุผลแทนฟอร์ม)
    await expect(page.getByTestId('user-add-blocked-lect1')).toBeVisible();
    await expect(page.getByTestId('user-add-role-lect1')).toHaveCount(0);

    await logoutViaMenu(page);
    await tryLogin(page, 'lect1', 'demo1234');
    await expect(page.getByTestId('login-error')).toContainText('ถูกระงับ');
    await expect(page).toHaveURL(/\/login/);
    // รหัสผิด → ไม่บอกสถานะบัญชี
    await tryLogin(page, 'lect1', 'wrong-pass');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).not.toContainText('ถูกระงับ');

    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await manage(page, 'lect1');
    await page.getByTestId('user-reactivate-lect1').click();
    // ข-18: เปิดใช้อีกครั้งต้องยืนยัน + เตือนเรื่องคำเชิญที่เคยออก · ปิดกล่อง = ยังระงับ
    await expect(page.getByRole('dialog')).toContainText('คำเชิญที่บัญชีนี้เคยออกไว้');
    await confirmDialog(page, 'ยกเลิก');
    await expect(page.getByTestId('user-status-lect1')).toHaveText('ระงับ');
    await page.getByTestId('user-reactivate-lect1').click();
    await confirmDialog(page, 'ยืนยันเปิดใช้');
    await expect(page.getByTestId('user-status-lect1')).toHaveText('ใช้งานอยู่');
    await expect(page.getByTestId('user-add-role-lect1')).toBeVisible();
    await loginAs(page, 'lect1');
    await expect(page.getByTestId('nav-user')).toBeVisible();
  });

  test('ยกเลิกในกล่องยืนยันระงับ → ยังใช้งานอยู่ (negative)', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await manage(page, 'lect1');
    await page.getByTestId('user-suspend-lect1').click();
    await confirmDialog(page, 'ยกเลิก');
    await expect(page.getByTestId('user-status-lect1')).toHaveText('ใช้งานอยู่');
  });
});

// ─────────────────────────── AC-29 ───────────────────────────
test.describe('AC-29 รหัสผ่านอย่างน้อย 8 ตัว (UI)', () => {
  test('ฟอร์มเพิ่มผู้ใช้ (โหมดตั้งรหัส): help "อย่างน้อย 8 ตัวอักษร" · 7 ตัว → ไม่สร้างผู้ใช้ · 8 ตัว → สร้างได้', async ({ page }) => {
    const s = suffix();
    const username = `pw${s}`;
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-username').fill(username);
    await page.getByTestId('nu-name').fill(`ทดสอบ รหัสสั้น${s}`);
    await page.getByTestId('nu-email').fill(`${username}@${DOMAIN}`);
    await page.getByTestId('nu-mode-password').check();
    await expect(page.locator('#nu-password-help')).toHaveText('อย่างน้อย 8 ตัวอักษร');
    await page.getByTestId('nu-password').fill('abcdefg');
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId('user-form')).toBeVisible();
    expect(await page.getByTestId('nu-password').evaluate(e => (e as HTMLInputElement).checkValidity())).toBe(false);
    await expect(page.getByTestId(`user-${username}`)).toHaveCount(0);

    await page.getByTestId('nu-password').fill('abcdefgh');
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId(`user-${username}`)).toBeVisible();
    await expect(page.getByTestId(`user-status-${username}`)).toHaveText('ใช้งานอยู่');
  });

  test('/request-access: 7 ตัว → error ที่ช่องรหัสผ่าน + ลิงก์ในกล่องสรุป · ไม่ส่ง', async ({ page }) => {
    await page.goto('/request-access');
    await expect(page.getByText('อย่างน้อย 8 ตัวอักษร')).toBeVisible();
    await page.getByTestId('ra-name').fill('ทดสอบ รหัสสั้น');
    await page.getByTestId('ra-email').fill(`short${suffix()}@${DOMAIN}`);
    await page.getByTestId('ra-reason').fill('ทดสอบ');
    await page.getByTestId('ra-username').fill(`short${suffix()}`);
    await page.getByTestId('ra-password').fill('abcdefg');
    await page.getByTestId('ra-password2').fill('abcdefg');
    await page.getByTestId('ra-consent').check();
    await page.getByTestId('ra-submit').click();
    await expect(page.getByTestId('ra-error-summary')).toBeVisible();
    await expect(page.getByTestId('ra-error-link-password')).toHaveText('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    await expect(page.getByTestId('ra-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('ra-password')).toBeFocused();
    await expect(page.getByTestId('ra-success')).toHaveCount(0);
  });

  test('/invite: 7 ตัว → error ใต้ช่อง ไม่ตั้งรหัส · 8 ตัว → เข้าได้', async ({ page }) => {
    const s = suffix();
    await loginAs(page, 'uadmin');
    const link = await inviteViaUi(page, `ipw${s}`, `ทดสอบ เชิญรหัสสั้น${s}`);
    await logoutViaMenu(page);
    await page.waitForURL(u => new URL(u).pathname === '/');
    await page.goto(link);
    await expect(page.getByTestId('inv-summary')).toBeVisible();
    await page.getByTestId('inv-password').fill('abcdefg');
    await page.getByTestId('inv-password2').fill('abcdefg');
    await page.getByTestId('inv-submit').click();
    await expect(page.getByText('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')).toBeVisible();
    await expect(page.getByTestId('inv-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/invite/);
    await page.getByTestId('inv-password').fill('abcdefgh');
    await page.getByTestId('inv-password2').fill('abcdefgh');
    await page.getByTestId('inv-submit').click();
    await page.waitForURL('**/app', { timeout: 30_000 });
  });
});

// ─────────────────────────── AC-30 ───────────────────────────
test.describe('AC-30 ไม่มีปุ่มลบผู้ใช้ + แท็บเดโม่เฉพาะ super_admin', () => {
  test('uadmin: users-table ไม่มีปุ่มข้อความ "ลบ" (มีแค่ × ถอนบทบาท) · ไม่เห็น tab-demo แม้เปิด ?tab=demo', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    const table = page.getByTestId('users-table');
    await expect(table).toBeVisible();
    const del = await table.evaluate(t => Array.from(t.querySelectorAll('button')).filter(b => /ลบ|delete/i.test((b as HTMLElement).innerText)).map(b => (b as HTMLElement).innerText));
    expect(del).toEqual([]);
    // × ถอนบทบาทอยู่ในแผงจัดการ (R2-F10) — ยังไม่เปิดแผง = ไม่มี ×
    expect(await table.locator('button[aria-label^="ลบบทบาท"]').count()).toBe(0);
    await manage(page, 'lect1');
    const delOpen = await table.evaluate(t => Array.from(t.querySelectorAll('button')).filter(b => /ลบ|delete/i.test((b as HTMLElement).innerText)).map(b => (b as HTMLElement).innerText));
    expect(delOpen).toEqual([]);
    expect(await table.locator('button[aria-label^="ลบบทบาท"]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('tab-demo')).toHaveCount(0);
    await expect(page.getByTestId('reset-demo')).toHaveCount(0);

    await page.goto('/app/admin?tab=demo');
    await expect(page.getByTestId('tab-users')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('reset-demo')).toHaveCount(0);
  });

  test('sadmin: เห็น tab-demo → ปุ่ม reset-demo · chair1: เห็นแค่ audit', async ({ page }) => {
    await loginAs(page, 'sadmin');
    await page.goto('/app/admin');
    await expect(page.getByTestId('tab-demo')).toBeVisible();
    await page.getByTestId('tab-demo').click();
    await expect(page).toHaveURL(/\?tab=demo$/);
    await expect(page.getByTestId('reset-demo')).toBeVisible();

    await loginAs(page, 'chair1');
    await page.goto('/app/admin');
    await expect(page.getByTestId('tab-audit')).toBeVisible();
    await expect(page.getByTestId('tab-demo')).toHaveCount(0);
    await expect(page.getByTestId('tab-requests')).toHaveCount(0);
  });
});
