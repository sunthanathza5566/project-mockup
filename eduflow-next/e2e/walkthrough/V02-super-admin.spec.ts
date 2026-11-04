/**
 * V02 ผู้ดูแลระบบสูงสุด (sadmin) — แท็บข้อมูลเดโม่: รายการชุดข้อมูลทดสอบ → โหลดทุกเคส → หน้า login แสดงสรุป/ลิงก์เชิญ/บัญชีของเคส
 * → เห็นคำขอเข้าใช้งานของทุกมหาวิทยาลัย (3) → กลับเป็นข้อมูลมาตรฐาน (chair1 กระดิ่ง 5 ตามเดิม)
 */
import { test, expect } from '@playwright/test';
import { asUser, caption, confirmOk, hclick, point, saveVideo, scene, setRole, unread } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V02-super-admin'); });

test('V02 ผู้ดูแลระบบสูงสุด: โหลดชุดข้อมูลทดสอบ → สรุปบัญชีที่หน้า login → คำขอทุกมหาวิทยาลัย → รีเซ็ตเป็นมาตรฐาน', async ({ page }) => {
  await scene(page, 'ฉาก 1/3 · ชุดข้อมูลทดสอบ');
  await asUser(page, 'sadmin', 'ผู้ดูแลระบบสูงสุด');
  await page.goto('/app/admin');
  await hclick(page, page.getByTestId('tab-demo'));
  await expect(page.getByTestId('scenario-list')).toBeVisible();
  await caption(page, 'แท็บ "ข้อมูลเดโม่" เห็นเฉพาะผู้ดูแลระบบสูงสุด — รีเซ็ตข้อมูล และโหลดชุดข้อมูลทดสอบ 27 เคส');
  await point(page, page.getByTestId('scenario-cycle-under-review'));
  await caption(page, 'แต่ละเคสบอก: สร้างอะไร บัญชีที่ควรเข้าใช้ และสิ่งที่ควรเห็น — โหลดทีละเคส หรือทุกเคส');
  await caption(page, 'กด "โหลดทุกเคส" → ข้อมูลเดิมในเบราว์เซอร์นี้ถูกล้าง (ย้อนกลับไม่ได้) ต้องยืนยันก่อน');
  await hclick(page, page.getByTestId('scenario-load-all'));
  await confirmOk(page);
  await page.waitForURL(/\/login/, { timeout: 90_000 });

  await scene(page, 'ฉาก 2/3 · หน้า login หลังโหลด');
  await setRole(page, 'ยังไม่เข้าสู่ระบบ');
  const sum = page.getByTestId('login-scenario-summary');
  await expect(sum).toBeVisible();
  await point(page, sum);
  await caption(page, 'หน้าเข้าสู่ระบบแสดง "ข้อมูลทดสอบที่โหลดล่าสุด" พร้อมบัญชีของแต่ละเคส (รหัส demo1234 ทุกบัญชี)');
  await expect(page.getByTestId('login-scenario-links')).toBeVisible();
  await point(page, page.getByTestId('login-scenario-links'));
  await caption(page, 'ลิงก์เชิญที่สร้างขึ้นแสดงครั้งเดียว (อายุ 10 นาที) — ใช้ทดสอบการรับคำเชิญ');
  const acc = page.getByTestId('scenario-account-user-pending-sadmin');
  await acc.evaluate(el => el.closest('details')?.setAttribute('open', ''));
  await hclick(page, acc);
  await expect(page.getByTestId('login-username')).toHaveValue('sadmin');
  await caption(page, 'กดชื่อบัญชีในเคส → ระบบเติมชื่อผู้ใช้/รหัสให้ แล้วกดเข้าสู่ระบบ');
  await setRole(page, 'ผู้ดูแลระบบสูงสุด', 'sadmin');
  await hclick(page, page.getByTestId('login-submit'));
  await page.waitForURL('**/app', { timeout: 30_000 });
  await page.goto('/app/admin?tab=requests');
  const cards = page.locator('li[data-testid^="req-"]');
  await expect(cards).toHaveCount(3);
  await point(page, cards);
  await caption(page, 'ผู้ดูแลระบบสูงสุดเห็นคำขอของทุกมหาวิทยาลัย (3 รายการ) — ผู้ดูแลแต่ละมหาวิทยาลัยเห็นเฉพาะของตัวเอง');

  await scene(page, 'ฉาก 3/3 · กลับเป็นข้อมูลมาตรฐาน');
  await page.goto('/app/admin?tab=demo');
  await caption(page, 'เมื่อทดสอบเสร็จ กด "รีเซ็ตเป็นข้อมูลมาตรฐาน" เพื่อกลับสู่ข้อมูลเดโม่ปกติ');
  await hclick(page, page.getByTestId('scenario-reset'));
  await confirmOk(page);
  await page.waitForURL(/\/login/, { timeout: 90_000 });
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  expect(await unread(page)).toBe(5);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, 'ข้อมูลมาตรฐานกลับมาแล้ว: กระดิ่งประธาน 5 รายการ (ข้อรอตรวจ) และข้อ 3.6 เป็นของ staff1', 4500);
});
