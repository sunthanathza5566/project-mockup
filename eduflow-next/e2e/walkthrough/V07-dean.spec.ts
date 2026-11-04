/**
 * V07 คณบดี (dean1) — scenario `cycle-faculty-approved` (รอบ CS 2565 รอคณบดี)
 * กระดิ่ง N7d → "อนุมัติสุดท้ายและล็อก" (lock + hash) → uadmin/QA คณะได้แจ้งเตือน N7e → "เปิด revision ใหม่" (ไม่มีแจ้งเตือน)
 */
import { test, expect } from '@playwright/test';
import { asUser, bellItem, caption, confirmOk, hclick, loadScenario, point, saveVideo, scene } from './narrate';

const CYCLE = 'cycle-scn-cs-2565';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V07-dean'); });

test('V07 คณบดี: ได้แจ้งเตือน → อนุมัติสุดท้ายและล็อก (hash) → ผู้ดูแลได้แจ้งเตือน → เปิด revision ใหม่', async ({ page }) => {
  await scene(page, 'เตรียมข้อมูล · โหลดเคส "QA คณะอนุมัติแล้ว รอคณบดี (2565)"');
  await loadScenario(page, 'cycle-faculty-approved', 'เตรียมข้อมูล: โหลดเคสทดสอบ "รอบ 2565 QA คณะอนุมัติแล้ว รอคณบดี"');

  await scene(page, 'ฉาก 1/3 · คณบดีอนุมัติสุดท้ายและล็อก');
  await asUser(page, 'dean1', 'คณบดี');
  const n = await bellItem(page, /QA คณะอนุมัติรอบ 2565/);
  await caption(page, 'คณบดีได้แจ้งเตือนเมื่อ QA คณะอนุมัติรอบ — กดเพื่อเปิดรอบ');
  await hclick(page, n);
  await page.waitForURL(new RegExp(`/app/cycles/${CYCLE}$`));
  await point(page, page.getByTestId('cycle-actions'));
  await caption(page, 'คณบดีเลือกได้: "อนุมัติสุดท้ายและล็อก" หรือ "ส่งกลับแก้ไข" (ต้องใส่เหตุผล ประธานได้แจ้งเตือน)');
  await caption(page, 'กดอนุมัติสุดท้าย → รอบถูกล็อก เก็บลายนิ้วมือ (hash) ของเนื้อหา SAR ไว้ตรวจย้อนหลัง');
  await hclick(page, page.getByTestId('cycle-to-final_approved'));
  await confirmOk(page);
  const lock = page.getByTestId('lock-banner');
  await expect(lock).toContainText(/hash\s+[0-9a-f]{16}/);
  await expect(lock).toContainText('เนื้อหา SAR ตรงกับที่ล็อก');
  await point(page, lock);
  await caption(page, 'ล็อกแล้ว: แสดงเวลา ผู้ล็อก และ hash — ตรวจแล้วเนื้อหาตรงกับที่ล็อก แก้ไขอะไรไม่ได้อีก');
  await caption(page, 'ผู้ดูแลมหาวิทยาลัยและ QA คณะได้แจ้งเตือน "อนุมัติสุดท้ายและล็อกแล้ว — เริ่มการประเมินได้" (ประธาน/เจ้าของข้อได้ด้วย)');

  await scene(page, 'ฉาก 2/3 · ผู้ดูแลมหาวิทยาลัยได้แจ้งเตือน');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  await bellItem(page, /2565.*อนุมัติสุดท้ายและล็อกแล้ว/);
  await caption(page, 'uadmin เห็นแจ้งเตือน → ขั้นถัดไปคือมอบหมายกรรมการและ "เริ่มการประเมิน" (ดูวิดีโอ V01/V08)');

  await scene(page, 'ฉาก 3/3 · เปิด revision ใหม่ (กรณีต้องแก้หลังล็อก)');
  await asUser(page, 'dean1', 'คณบดี');
  await page.goto(`/app/cycles/${CYCLE}`);
  await caption(page, 'ถ้าพบว่าต้องแก้หลังล็อก คณบดี "เปิด revision ใหม่" ได้ — รอบปลดล็อกและเลขฉบับเพิ่มขึ้น');
  await hclick(page, page.getByTestId('cycle-reopen'));
  await confirmOk(page, 'พบตัวเลขในเกณฑ์ 8 ไม่ตรงข้อมูลทะเบียน ต้องแก้ก่อนประเมิน (ข้อมูลทดสอบ)');
  await expect(page.getByTestId('toast').filter({ hasText: 'เปิด revision ใหม่แล้ว' })).toBeVisible();
  await expect(page.getByTestId('lock-banner')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(/ฉบับที่\s*2/);
  await point(page, page.getByText(/ฉบับที่\s*2/).first());
  await caption(page, 'ปลดล็อกแล้ว เป็นฉบับที่ 2 — ข้อควรรู้: การเปิด revision ใหม่ "ไม่มีแจ้งเตือน" ถึงใคร ควรแจ้งประธานเอง', 4500);
});
