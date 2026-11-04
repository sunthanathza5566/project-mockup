/**
 * V06 QA คณะ (fqa1) — scenario `cycle-under-review` (รอบ CS 2566 ส่งให้ QA คณะตรวจแล้ว) โหลดผ่านแท็บข้อมูลเดโม่ของ sadmin
 * กระดิ่ง N7b → เปิดรอบ → อ่าน SAR ทั้งรอบ (.docx) → ดูว่าส่งกลับรายข้อได้ → "อนุมัติ (QA คณะ)" → คณบดีได้แจ้งเตือน N7d
 */
import { test, expect } from '@playwright/test';
import { asUser, bellItem, caption, confirmOk, hclick, loadScenario, point, saveVideo, scene } from './narrate';

const CYCLE = 'cycle-scn-cs-2566';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V06-faculty-qa'); });

test('V06 QA คณะ: ได้แจ้งเตือนรอบส่งมา → อ่าน SAR → อนุมัติ (QA คณะ) → คณบดีได้แจ้งเตือน', async ({ page }) => {
  await scene(page, 'เตรียมข้อมูล · โหลดเคส "ส่งให้ QA คณะตรวจแล้ว (2566)"');
  await loadScenario(page, 'cycle-under-review', 'เตรียมข้อมูล: ผู้ดูแลระบบสูงสุดโหลดเคสทดสอบ "รอบ 2566 ส่งให้ QA คณะตรวจแล้ว"');
  await caption(page, 'โหลดเสร็จ ระบบพากลับหน้าเข้าสู่ระบบพร้อมสรุปบัญชีที่ควรทดสอบ');

  await scene(page, 'ฉาก 1/2 · QA คณะตรวจรอบ');
  await asUser(page, 'fqa1', 'QA คณะ');
  const n = await bellItem(page, /รอบประเมิน 2566 .*ส่งมาให้ QA คณะตรวจแล้ว/);
  await caption(page, 'เมื่อประธานกด "ส่งให้ QA คณะตรวจ" — QA คณะได้แจ้งเตือนนี้ กดเพื่อเปิดรอบ');
  await hclick(page, n);
  await page.waitForURL(new RegExp(`/app/cycles/${CYCLE}$`));
  await expect(page.getByTestId('cycle-actions')).toBeVisible();
  await caption(page, 'หน้ารอบ: ความพร้อม ช่องว่าง และ "ขั้นตอนถัดไป" — ตอนนี้รอ QA คณะ (คุณ)');
  const [dl] = await Promise.all([page.waitForEvent('download'), hclick(page, page.getByTestId('read-full-sar'))]);
  expect(dl.suggestedFilename()).toMatch(/^SAR_.*\.docx$/);
  await caption(page, 'กด "อ่าน SAR ทั้งรอบ (.docx)" เพื่อดาวน์โหลดรายงานไปอ่าน');

  await page.goto(`/app/sections/${encodeURIComponent(`${CYCLE}::1.1`)}`);
  await expect(page.getByTestId('section-return')).toBeVisible();
  await point(page, page.getByTestId('section-return'));
  await caption(page, 'ถ้าพบปัญหารายข้อ QA คณะ "ส่งกลับแก้ไข" ได้ (เจ้าของข้อและประธานได้แจ้งเตือน) — แต่อนุมัติรายข้อไม่ได้ (เป็นหน้าที่ประธาน)');

  await scene(page, 'ฉาก 2/2 · อนุมัติรอบ → คณบดีได้แจ้งเตือน');
  await page.goto(`/app/cycles/${CYCLE}`);
  await point(page, page.getByTestId('cycle-to-revision_requested'));
  await caption(page, 'หรือส่งกลับทั้งรอบพร้อมเหตุผล (ปุ่มแดง) — ในวิดีโอนี้ QA คณะเห็นว่าพร้อมแล้ว');
  await caption(page, 'กด "อนุมัติ (QA คณะ)" → คณบดีได้แจ้งเตือน "QA คณะอนุมัติรอบ … รอคณบดีพิจารณา" และประธาน/เจ้าของข้อได้แจ้งด้วย');
  await hclick(page, page.getByTestId('cycle-to-faculty_approved'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-to-faculty_approved')).toHaveCount(0);
  await caption(page, 'อนุมัติแล้ว สถานะรอบเปลี่ยนเป็น "QA คณะอนุมัติ" — ตอนนี้รอคณบดี');

  await asUser(page, 'dean1', 'คณบดี');
  await bellItem(page, /QA คณะอนุมัติรอบ 2566/);
  await caption(page, 'ฝั่งคณบดี: กระดิ่งมี "QA คณะอนุมัติรอบ 2566 … รอคณบดีพิจารณาอนุมัติสุดท้าย"', 4500);
});
