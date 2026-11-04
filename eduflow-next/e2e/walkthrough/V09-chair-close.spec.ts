/**
 * V09 ประธานหลักสูตร (ต่อ) — scenario `cycle-assessed` (รอบ CS 2561 กรรมการส่งผลแล้ว รอปิดรอบ)
 * กระดิ่ง N7g → ดูผลประเมิน → สร้างแผนปรับปรุงจาก AFI → ปิดรอบ (ไม่มีแจ้งเตือน)
 */
import { test, expect } from '@playwright/test';
import { asUser, bellItem, caption, confirmOk, hclick, loadScenario, point, saveVideo, scene } from './narrate';

const CYCLE = 'cycle-scn-cs-2561';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V09-chair-close'); });

test('V09 ประธาน: ได้แจ้งเตือนผลประเมิน → ดูผล → สร้างแผนปรับปรุงจาก AFI → ปิดรอบ', async ({ page }) => {
  await scene(page, 'เตรียมข้อมูล · โหลดเคส "ประเมินเสร็จ รอปิดรอบ (2561)"');
  await loadScenario(page, 'cycle-assessed', 'เตรียมข้อมูล: โหลดเคสทดสอบ "รอบ 2561 กรรมการส่งผลแล้ว รอปิดรอบ"');

  await scene(page, 'ฉาก 1/3 · ดูผลประเมินของกรรมการ');
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  const n = await bellItem(page, /กรรมการส่งผลประเมินรอบ 2561/);
  await caption(page, 'ประธานได้แจ้งเตือน "กรรมการส่งผลประเมินรอบ 2561 แล้ว" — กดเพื่อดูผล');
  await hclick(page, n);
  await page.waitForURL(/\/assess$/);
  await expect(page.getByTestId('assess-results')).toBeVisible();
  await point(page, page.getByTestId('assess-results'));
  await caption(page, 'ผลประเมินรายเกณฑ์และ verdict ของกรรมการ (แสดงหลังกรรมการส่งผลเท่านั้น เพื่อความเป็นอิสระ)');

  await scene(page, 'ฉาก 2/3 · สร้างแผนปรับปรุงจากข้อเสนอแนะ (AFI)');
  await page.goto('/app/actions');
  await expect(page.getByTestId('afi-box')).toBeVisible();
  await caption(page, 'หน้าแผนปรับปรุง: กด "สร้างจากข้อเสนอแนะของกรรมการ (AFI)" ของรอบ 2561');
  await hclick(page, page.getByTestId(`afi-${CYCLE}`));
  await expect(page.getByTestId('toast').filter({ hasText: /สร้าง action \d+ รายการจาก AFI แล้ว/ })).toBeVisible();
  await expect(page.getByTestId('action-table')).toBeVisible();
  await point(page, page.getByTestId('action-table'));
  await caption(page, 'ได้รายการแผนปรับปรุง — กำหนดผู้รับผิดชอบภายหลังได้ (ผู้รับผิดชอบจะได้แจ้งเตือนเมื่อถูกมอบ)');

  await scene(page, 'ฉาก 3/3 · ปิดรอบ');
  await page.goto(`/app/cycles/${CYCLE}`);
  await caption(page, 'กลับหน้ารอบ แล้วกด "ปิดรอบ" — ระบบเช็กว่ามีแผนปรับปรุงจากรอบนี้แล้ว');
  await hclick(page, page.getByTestId('cycle-to-closed'));
  await expect(page.getByRole('dialog')).toContainText('มีแผนปรับปรุงจากรอบนี้แล้ว');
  await point(page, page.getByRole('dialog'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-closed-next')).toBeVisible();
  await point(page, page.getByTestId('cycle-closed-next'));
  await caption(page, 'ปิดรอบแล้ว — แก้ไขอะไรไม่ได้อีก (การปิดรอบไม่มีแจ้งเตือนถึงใคร) · แผนปรับปรุงที่ตรวจรับแล้วจะเป็นหลักฐานขั้น A ของรอบถัดไป', 5000);
});
