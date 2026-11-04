/**
 * V11 ข้าม tenant — scenario `uni2-tenant` (มหาวิทยาลัยที่ 2 มีหลักสูตร CE + รอบ 2569 + คำขอ u2req1)
 * chairu2 เห็นเฉพาะของตัวเอง + ได้แจ้งเตือน 1.1 · chair1 ไม่เห็นรอบ uni 2 และกระดิ่งไม่เพิ่ม
 * · uadmin2 เห็นคำขอของตัวเองเท่านั้น + เปิดรอบของ uni 1 ไม่ได้ · assess1 เห็นเฉพาะรอบที่ได้รับมอบหมาย
 */
import { test, expect } from '@playwright/test';
import { DEMO_CYCLE } from '../helpers';
import { asUser, bellItem, caption, closeBell, loadScenario, point, saveVideo, scene, unread } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V11-cross-tenant'); });

test('V11 ข้าม tenant: แต่ละมหาวิทยาลัยเห็นเฉพาะข้อมูลของตัวเอง · กรรมการเห็นเฉพาะรอบที่ได้รับมอบหมาย', async ({ page }) => {
  await scene(page, 'เตรียมข้อมูล · โหลดเคส "มหาวิทยาลัยที่ 2"');
  await loadScenario(page, 'uni2-tenant', 'เตรียมข้อมูล: โหลดเคส "มหาวิทยาลัยที่ 2 มีข้อมูลของตัวเอง"');

  await scene(page, 'ฉาก 1/4 · ประธานของมหาวิทยาลัยที่ 2');
  await asUser(page, 'chairu2', 'ประธานหลักสูตร (มหาวิทยาลัยที่ 2)');
  await bellItem(page, 'ข้อ 1.1 ส่งตรวจแล้ว รอประธานอนุมัติ');
  await caption(page, 'chairu2 ได้แจ้งเตือนเมื่ออาจารย์ของมหาวิทยาลัยที่ 2 ส่งตรวจข้อ 1.1');
  await closeBell(page);
  await page.goto('/app/cycles');
  const t2 = page.getByTestId('cycles-table');
  await expect(t2).toContainText('วิศวกรรมคอมพิวเตอร์');
  await expect(t2).not.toContainText('วิทยาการคอมพิวเตอร์');
  await point(page, t2);
  await caption(page, 'รายการรอบมีเฉพาะหลักสูตร CE ของตัวเอง — ไม่เห็นหลักสูตร CS ของมหาวิทยาลัยแรก');

  await scene(page, 'ฉาก 2/4 · ประธานของมหาวิทยาลัยแรก');
  await asUser(page, 'chair1', 'ประธานหลักสูตร (มหาวิทยาลัยแรก)');
  expect(await unread(page)).toBe(5);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, 'กระดิ่ง chair1 ยังเป็น 5 เท่าเดิม — การส่งตรวจของอีกมหาวิทยาลัยไม่แจ้งมาที่นี่');
  await page.goto('/app/cycles');
  await expect(page.getByTestId('cycles-table')).toContainText('วิทยาการคอมพิวเตอร์');
  await expect(page.getByTestId('cycles-table')).not.toContainText('วิศวกรรมคอมพิวเตอร์');
  await page.goto('/app/cycles/cycle-scn-u2-2569');
  await expect(page.getByTestId('state-error')).toBeVisible();
  await point(page, page.getByTestId('state-error'));
  await caption(page, 'แม้พิมพ์ URL ของรอบมหาวิทยาลัยที่ 2 ตรง ๆ ก็เปิดไม่ได้');

  await scene(page, 'ฉาก 3/4 · ผู้ดูแลมหาวิทยาลัยที่ 2');
  await asUser(page, 'uadmin2', 'ผู้ดูแลมหาวิทยาลัยที่ 2');
  await page.goto('/app/admin?tab=requests');
  const cards = page.locator('li[data-testid^="req-"]');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('มหาวิทยาลัยสอง');
  await point(page, cards.first());
  await caption(page, 'uadmin2 เห็นคำขอเข้าใช้งานเฉพาะของมหาวิทยาลัยตัวเอง (1 รายการ)');
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await expect(page.getByTestId('state-error')).toBeVisible();
  await caption(page, 'เปิดรอบเดโม่ของมหาวิทยาลัยแรกไม่ได้เช่นกัน');

  await scene(page, 'ฉาก 4/4 · กรรมการเห็นเฉพาะรอบที่ได้รับมอบหมาย');
  await asUser(page, 'assess1', 'กรรมการประเมิน');
  await expect(page.getByTestId('readonly-banner')).toBeVisible();
  await page.goto('/app/cycles');
  const rows = page.getByTestId('cycles-table').locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('2569');
  await point(page, rows.first());
  await expect(page.getByTestId('nav-curriculum')).toHaveCount(0);
  await caption(page, 'assess1 เห็นรอบเดียวที่ได้รับมอบหมาย และไม่มีเมนูหลักสูตร/ตัวชี้วัด/แผนปรับปรุง (อ่านอย่างเดียว)', 4500);
});
