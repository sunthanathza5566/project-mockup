/**
 * V00 ผู้ใช้ใหม่ — (ก) ขอเข้าใช้งานเอง → รออนุมัติ (ข) ผู้ดูแลอนุมัติ + กำหนดบทบาท → ผู้ใช้ได้แจ้งเตือน N13
 * (ค) ผู้ดูแลเชิญ → ผู้ถูกเชิญตั้งรหัสผ่านจากลิงก์ → ผู้เชิญได้แจ้งเตือน N14
 * ข้อมูลสมมติทั้งหมด (โดเมน sample-uni.example) · seed มาตรฐาน
 */
import { test, expect } from '@playwright/test';
import { logoutViaMenu } from '../helpers';
import { asUser, bellItem, caption, closeBell, hclick, hfill, hselect, point, saveVideo, scene, setRole, unread } from './narrate';

const DOMAIN = 'sample-uni.example';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V00-new-user'); });

test('V00 ผู้ใช้ใหม่: ขอเข้าใช้งาน → อนุมัติ → แจ้งเตือน · เชิญ → ตั้งรหัสผ่าน → ผู้เชิญได้แจ้งเตือน', async ({ page }) => {
  const s = String(Date.now() % 100000);
  const req = { name: `อ.ใหม่ ขอใช้งาน${s} (สมมติ)`, username: `newbie${s}`, password: 'newpass123' };
  const inv = { name: `อ.รับเชิญ ทดลอง${s} (สมมติ)`, username: `invitee${s}` };

  // ── ฉาก 1: ขอเข้าใช้งานเอง ──
  await scene(page, 'ฉาก 1/3 · ขอเข้าใช้งานเอง');
  await setRole(page, 'ผู้ใช้ใหม่ (ยังไม่มีบัญชี)');
  await page.goto('/login');
  await caption(page, 'ผู้ใช้ใหม่ยังไม่มีบัญชี — กด "ขอเข้าใช้งาน" ที่หน้าเข้าสู่ระบบ');
  await hclick(page, page.getByTestId('login-request-access'));
  await expect(page.getByTestId('ra-name')).toBeVisible();
  await caption(page, 'กรอกชื่อ อีเมลของมหาวิทยาลัย หน่วยงาน เหตุผล และตั้งชื่อผู้ใช้/รหัสผ่าน (ไม่มีช่องเลือกบทบาท — ผู้ดูแลเป็นคนกำหนด)');
  await hfill(page, page.getByTestId('ra-name'), req.name);
  await hfill(page, page.getByTestId('ra-email'), `${req.username}@${DOMAIN}`);
  await page.getByTestId('ra-email').blur();
  await expect(page.getByTestId('ra-email-uni')).toBeVisible();
  await caption(page, 'ระบบรู้จักโดเมนอีเมล จึงรู้ว่าเป็นคำขอของมหาวิทยาลัยไหน');
  await hfill(page, page.getByTestId('ra-reason'), 'อาจารย์ใหม่ของหลักสูตร ต้องการช่วยเขียนรายงาน SAR (ข้อมูลทดสอบ)');
  await hfill(page, page.getByTestId('ra-username'), req.username);
  await hfill(page, page.getByTestId('ra-password'), req.password);
  await hfill(page, page.getByTestId('ra-password2'), req.password);
  await hclick(page, page.getByTestId('ra-consent'));
  await caption(page, 'กดส่งคำขอ → ผู้ดูแลมหาวิทยาลัย (uadmin) และผู้ดูแลระบบสูงสุดจะได้รับแจ้งเตือน "มีคำขอเข้าใช้งานใหม่"');
  await hclick(page, page.getByTestId('ra-submit'));
  await expect(page.getByTestId('ra-success')).toContainText(req.username);
  await point(page, page.getByTestId('ra-success'));
  await caption(page, 'ส่งคำขอแล้ว — ลองเข้าสู่ระบบระหว่างรออนุมัติ');

  await page.goto('/login');
  await hfill(page, page.getByTestId('login-username'), req.username);
  await hfill(page, page.getByTestId('login-password'), req.password);
  await hclick(page, page.getByTestId('login-submit'));
  await expect(page.getByTestId('login-error')).toContainText('รอผู้ดูแลอนุมัติ');
  await point(page, page.getByTestId('login-error'));
  await caption(page, 'ยังเข้าไม่ได้: ระบบบอกว่า "รอผู้ดูแลอนุมัติ"');

  // ── ฉาก 2: ผู้ดูแลอนุมัติ ──
  await scene(page, 'ฉาก 2/3 · ผู้ดูแลอนุมัติคำขอ');
  await caption(page, 'สลับไปเป็นผู้ดูแลมหาวิทยาลัย (uadmin) ในเบราว์เซอร์เดียวกัน — ข้อมูลเดโม่อยู่ในเบราว์เซอร์นี้');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  expect(await unread(page)).toBeGreaterThan(0);
  const n12 = await bellItem(page, req.name);
  await expect(n12).toHaveAttribute('href', '/app/admin?tab=requests');
  await caption(page, 'กระดิ่งมีแจ้งเตือน "มีคำขอเข้าใช้งานใหม่จาก …" — กดเพื่อไปหน้าคำขอ');
  await hclick(page, n12);
  await page.waitForURL(/\/app\/admin\?tab=requests$/);
  const card = page.locator('li[data-testid^="req-"]', { hasText: req.name });
  await expect(card).toBeVisible();
  const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
  await caption(page, 'ผู้ดูแลเป็นคนกำหนดบทบาทและขอบเขต — เลือก "อาจารย์/เจ้าหน้าที่หลักสูตร" ของหลักสูตร CS');
  await hselect(page, page.getByTestId(`req-role-${id}`), 'programme_staff');
  const scopeLabel = (await page.getByTestId(`req-scope-${id}`).locator('option').allTextContents()).find(t => /^หลักสูตร .*CS/.test(t));
  expect(scopeLabel).toBeTruthy();
  await hselect(page, page.getByTestId(`req-scope-${id}`), { label: scopeLabel! });
  await caption(page, 'กดอนุมัติ → ผู้ขอได้รับแจ้งเตือน "บัญชีของคุณได้รับอนุมัติแล้ว"');
  await hclick(page, page.getByTestId(`req-approve-${id}`));
  await expect(card).toHaveCount(0);

  await caption(page, 'ผู้ใช้ใหม่เข้าสู่ระบบได้แล้ว');
  await asUser(page, req.username, 'อาจารย์ (ผู้ใช้ใหม่)', { password: req.password });
  await expect(page.getByTestId('nav-user')).toContainText(req.name);
  const n13 = await bellItem(page, 'บัญชีของคุณได้รับอนุมัติแล้ว');
  await expect(n13).toBeVisible();
  await caption(page, 'กระดิ่งของผู้ใช้ใหม่: "บัญชีของคุณได้รับอนุมัติแล้ว เริ่มใช้งานได้เลย"');
  await closeBell(page);

  // ── ฉาก 3: เชิญ ──
  await scene(page, 'ฉาก 3/3 · ผู้ดูแลเชิญผู้ใช้');
  await caption(page, 'อีกทางหนึ่ง: ผู้ดูแลสร้างคำเชิญให้ แล้วส่งลิงก์ให้ผู้ใช้เอง (ระบบเดโม่ไม่มีอีเมล)');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  await page.goto('/app/admin');
  await hclick(page, page.getByTestId('user-new'));
  await hfill(page, page.getByTestId('nu-username'), inv.username);
  await hfill(page, page.getByTestId('nu-name'), inv.name);
  await hfill(page, page.getByTestId('nu-email'), `${inv.username}@${DOMAIN}`);
  await expect(page.getByTestId('nu-mode-invite')).toBeChecked();
  await caption(page, 'โหมดเริ่มต้น = "เชิญ" (ผู้ใช้ตั้งรหัสผ่านเอง) — กดสร้าง');
  await hclick(page, page.getByTestId('nu-submit'));
  await expect(page.getByTestId('invite-result')).toBeVisible();
  const link = await page.getByTestId('invite-link').inputValue();
  expect(link).toMatch(/\/invite#t=[A-Za-z0-9_-]{20,}$/);
  await point(page, page.getByTestId('invite-link'));
  await caption(page, 'ได้ลิงก์เชิญ (ใช้ได้ครั้งเดียว มีอายุ) — คัดลอกส่งให้ผู้ถูกเชิญ');
  await expect(page.getByTestId(`user-status-${inv.username}`)).toHaveText('รอตั้งรหัสผ่าน');

  await caption(page, 'ผู้ถูกเชิญเปิดลิงก์ (ออกจากระบบผู้ดูแลก่อน)');
  await logoutViaMenu(page);
  await page.waitForURL(u => !new URL(u).pathname.startsWith('/app'));
  await setRole(page, 'ผู้ถูกเชิญ', inv.username);
  await page.goto(link);
  await expect(page.getByTestId('inv-summary')).toBeVisible();
  await point(page, page.getByTestId('inv-summary'));
  await caption(page, 'หน้ารับคำเชิญแสดงชื่อผู้ใช้และบทบาทที่ผู้ดูแลกำหนดไว้ — ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร');
  await hfill(page, page.getByTestId('inv-password'), 'invitepass1');
  await hfill(page, page.getByTestId('inv-password2'), 'invitepass1');
  await caption(page, 'กดตั้งรหัสผ่าน → เข้าใช้งานทันที และผู้เชิญ (uadmin) ได้รับแจ้งเตือน');
  await hclick(page, page.getByTestId('inv-submit'));
  await page.waitForURL('**/app', { timeout: 30_000 });
  await expect(page.getByTestId('nav-user')).toContainText(inv.name);
  await caption(page, 'ผู้ถูกเชิญเข้าสู่ระบบแล้ว');

  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  const n14 = await bellItem(page, inv.name);
  await expect(n14).toHaveAttribute('href', '/app/admin?tab=users');
  await caption(page, 'กระดิ่งของผู้เชิญ: "… ตั้งรหัสผ่านและเริ่มใช้งานแล้ว" — กดไปดูสถานะในแท็บผู้ใช้');
  await hclick(page, n14);
  await page.waitForURL(/\/app\/admin\?tab=users$/);
  await expect(page.getByTestId(`user-status-${inv.username}`)).toHaveText('ใช้งานอยู่');
  await point(page, page.getByTestId(`user-status-${inv.username}`));
  await caption(page, 'สรุป: ขอเข้าใช้งาน → ผู้ดูแลได้แจ้งเตือน → อนุมัติ → ผู้ใช้ได้แจ้งเตือน · เชิญ → ผู้ใช้ตั้งรหัส → ผู้เชิญได้แจ้งเตือน', 4500);
});
