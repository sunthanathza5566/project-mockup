/**
 * V03 ประธานหลักสูตร (chair1) — seed มาตรฐาน (หลัง F4: 3.6 เป็นของ staff1, กระดิ่ง chair1 ยังไม่อ่าน 5)
 * ฉาก 1 ข้อควรระวัง: ประธานเขียน + ส่งตรวจข้อ 7.9 เอง → ไม่มีใครได้แจ้งเตือน (submit-no-recipient-warning) + อนุมัติเองไม่ได้
 *       → ปุ่มใน toast "ส่งกลับแก้ไขข้อนี้" → "ไปหน้ามอบหมายงาน"
 * ฉาก 2 มอบหมาย 7.9 → staff1, 5.1 → lect1 (ผู้รับได้แจ้งเตือน N1)
 * ฉาก 3 staff1 ส่ง 7.9 โดยไม่แก้ → submit-stale-author-warning → แก้แล้วส่ง → chair1 กระดิ่ง +1 → อนุมัติ
 * ฉาก 4 คิวรอตรวจ (อนุมัติ/ส่งกลับ) + ปุ่ม "ส่งให้ QA คณะตรวจ" ยังกดไม่ได้จนกว่าจะอนุมัติครบ 53 ข้อ
 */
import { test, expect } from '@playwright/test';
import { DEMO_CYCLE, sectionUrl } from '../helpers';
import { asUser, bellItem, caption, confirmOk, hclick, hfill, hselect, point, saveVideo, scene, unread } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V03-chair'); });

test('V03 ประธานหลักสูตร: ข้อควรระวัง (เขียน+ส่งเอง) → ส่งกลับ → มอบหมาย → อาจารย์ส่ง → กระดิ่ง +1 → อนุมัติ → คิวรอตรวจ', async ({ page }) => {
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  await caption(page, 'หน้าหลักของประธานหลักสูตร: รายการ "สิ่งที่ต้องทำตอนนี้" เช่น ตรวจและอนุมัติข้อที่ส่งมา / มอบหมายผู้เขียน');
  const b0 = await unread(page);
  expect(b0).toBe(5);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, `กระดิ่งมีแจ้งเตือนยังไม่อ่าน ${b0} รายการ = ข้อที่อาจารย์ส่งตรวจมาแล้ว รอประธานอนุมัติ`);

  // ── ฉาก 1: ข้อควรระวัง ──
  await scene(page, 'ฉาก 1/4 · ข้อควรระวัง: ประธานเขียนและส่งตรวจเอง');
  await caption(page, 'สมมติประธานเปิดข้อ 7.9 (ยังไม่มีเจ้าของ) แล้วเขียนเองและกดส่งตรวจ — ดูว่าเกิดอะไรขึ้น');
  await page.goto(sectionUrl(DEMO_CYCLE, '7.9'));
  await expect(page.getByTestId('sar-editor')).toBeVisible();
  const nar = page.getByTestId('narrative-th');
  await hfill(page, nar, `${await nar.inputValue()}\nประธานเพิ่มข้อความสรุปผลการเทียบเคียงเอง (ข้อมูลทดสอบ)`);
  await hclick(page, page.getByTestId('save-manual'));
  await caption(page, 'กด "บันทึกตอนนี้" — การบันทึกอย่างเดียวไม่แจ้งเตือนใคร');
  await hclick(page, page.getByTestId('section-submit'));
  const warn = page.getByTestId('submit-no-recipient-warning');
  await expect(warn).toBeVisible();
  await point(page, warn);
  await caption(page, 'ก่อนส่ง ระบบเตือน: "ส่งแล้วจะไม่มีใครได้รับแจ้งเตือน" เพราะหลักสูตรนี้มีประธานคนเดียว คือตัวคุณเอง');
  await caption(page, 'และผู้เขียนล่าสุดอนุมัติข้อของตัวเองไม่ได้ (การแยกหน้าที่) — ทางที่ถูกคือมอบหมายให้อาจารย์เขียน/ส่ง');
  await caption(page, 'ลองกดยืนยันส่งต่อ เพื่อดูผล');
  await confirmOk(page);
  const toast0 = page.getByTestId('toast').filter({ hasText: 'ไม่มีประธานหลักสูตรคนอื่นได้รับแจ้งเตือน' });
  await expect(toast0).toBeVisible();
  // toast นี้ค้าง 12 วินาที — บรรยายสั้น ๆ แล้วกดปุ่มในนั้นก่อนหมดเวลา
  expect(await unread(page)).toBe(b0);
  await expect(page.getByTestId('segregation-note')).toBeVisible();
  await point(page, toast0);
  await point(page, page.getByTestId('segregation-note'));
  await caption(page, 'ผลจริง: ไม่มีใครได้รับแจ้งเตือน (กระดิ่งไม่เพิ่ม) และข้อนี้ขึ้นว่า "อนุมัติเองไม่ได้"', 3800);
  await hclick(page, toast0.getByRole('button', { name: 'ส่งกลับแก้ไขข้อนี้' }));
  await caption(page, 'ทางแก้: กด "ส่งกลับแก้ไขข้อนี้" ในข้อความยืนยัน ใส่เหตุผล แล้วมอบหมายให้อาจารย์');
  await confirmOk(page, 'ประธานเขียนเองโดยไม่ตั้งใจ — มอบหมายให้อาจารย์เขียนและส่งตรวจใหม่');
  const toast1 = page.getByTestId('toast').filter({ hasText: 'ส่งข้อ 7.9 กลับแก้ไขแล้ว' });
  await expect(toast1).toBeVisible();
  await caption(page, 'ส่งกลับแล้ว — กด "ไปหน้ามอบหมายงาน"');
  await hclick(page, toast1.getByRole('button', { name: 'ไปหน้ามอบหมายงาน' }));
  await page.waitForURL(/\/assign$/);

  // ── ฉาก 2: มอบหมาย ──
  await scene(page, 'ฉาก 2/4 · มอบหมายข้อให้อาจารย์');
  await caption(page, 'หน้ามอบหมายงาน: เลือกผู้เขียนของแต่ละข้อ — ผู้ได้รับมอบหมายจะได้แจ้งเตือน "คุณได้รับมอบหมายข้อ …"');
  await hselect(page, page.getByTestId('owner-7.9'), { label: 'อ.วิภา เขียนรายงาน' });
  await expect(page.getByTestId('owner-7.9')).toHaveValue(/.+/);
  await caption(page, 'มอบข้อ 7.9 ให้ อ.วิภา (staff1) → staff1 ได้แจ้งเตือนทันที');
  await hselect(page, page.getByTestId('owner-5.1'), { label: 'อ.ธนา สอนดี' });
  await expect(page.getByTestId('owner-5.1')).toHaveValue(/.+/);
  await caption(page, 'มอบข้อ 5.1 ให้ อ.ธนา (lect1) → lect1 ได้แจ้งเตือน');

  // ── ฉาก 3: อาจารย์ส่ง → ประธานได้แจ้งเตือน ──
  await scene(page, 'ฉาก 3/4 · อาจารย์แก้แล้วส่งตรวจ → ประธานได้แจ้งเตือน');
  await caption(page, 'สลับเป็น staff1 (ออกจากระบบ แล้วเข้าใหม่ในเบราว์เซอร์เดียวกัน)');
  await asUser(page, 'staff1', 'อาจารย์ผู้เขียน');
  const n1 = await bellItem(page, 'คุณได้รับมอบหมายข้อ 7.9');
  await caption(page, 'staff1 เห็นแจ้งเตือน "คุณได้รับมอบหมายข้อ 7.9" — กดเพื่อเปิดข้อ');
  await hclick(page, n1);
  await page.waitForURL(/sections/);
  await expect(page.getByTestId('sar-editor')).toBeVisible();
  await caption(page, 'ถ้า staff1 กดส่งตรวจทันทีโดยไม่แก้อะไร …');
  await hclick(page, page.getByTestId('section-submit'));
  const stale = page.getByTestId('submit-stale-author-warning');
  await expect(stale).toBeVisible();
  await point(page, stale);
  await caption(page, 'ระบบเตือน: เนื้อหาล่าสุดเขียนโดยประธาน — ถ้าส่งโดยไม่แก้ ประธานจะอนุมัติไม่ได้ แนะนำให้แก้ก่อน');
  await hclick(page, page.getByRole('dialog').getByRole('button', { name: 'กลับไปเติมก่อน' }));
  await expect(page.getByRole('dialog')).toBeHidden();
  const nar2 = page.getByTestId('narrative-th');
  await hfill(page, nar2, `${await nar2.inputValue()}\nอาจารย์ผู้รับผิดชอบปรับปรุงและยืนยันข้อมูลการเทียบเคียงแล้ว (ข้อมูลทดสอบ)`);
  await hclick(page, page.getByTestId('save-manual'));
  await caption(page, 'แก้เนื้อหาแล้ว กดบันทึก แล้วส่งตรวจอีกครั้ง');
  await hclick(page, page.getByTestId('section-submit'));
  await expect(page.getByTestId('submit-stale-author-warning')).toHaveCount(0);
  await expect(page.getByTestId('submit-recipient-count')).toContainText('ประธานหลักสูตร 1 คนจะได้รับแจ้งเตือน');
  await point(page, page.getByTestId('submit-recipient-count'));
  await caption(page, 'คราวนี้ไม่มีคำเตือน และบอกว่า "ประธานหลักสูตร 1 คนจะได้รับแจ้งเตือน"');
  await confirmOk(page);
  const toast2 = page.getByTestId('toast').filter({ hasText: 'แจ้งประธานหลักสูตร 1 คน' });
  await expect(toast2).toBeVisible();
  await point(page, toast2);
  await caption(page, 'ส่งตรวจแล้ว — แจ้งประธานหลักสูตร 1 คน');

  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  await expect.poll(() => unread(page)).toBe(b0 + 1);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, `กระดิ่งของประธานเพิ่มจาก ${b0} เป็น ${b0 + 1}`);
  const n3 = await bellItem(page, 'ข้อ 7.9 ส่งตรวจแล้ว รอประธานอนุมัติ');
  await caption(page, 'แจ้งเตือน "ข้อ 7.9 ส่งตรวจแล้ว รอประธานอนุมัติ" — กดเพื่อเปิดข้อ');
  await hclick(page, n3);
  await page.waitForURL(/sections/);
  await expect(page.getByTestId('section-approve')).toBeVisible();
  await caption(page, 'ผู้เขียนล่าสุดคือ staff1 ประธานจึงอนุมัติได้ → staff1 จะได้แจ้งเตือน "ได้รับการอนุมัติแล้ว"');
  await hclick(page, page.getByTestId('section-approve'));
  await expect(page.getByTestId('toast').filter({ hasText: 'อนุมัติข้อ 7.9 แล้ว' })).toBeVisible();

  // ── ฉาก 4: คิวรอตรวจ ──
  await scene(page, 'ฉาก 4/4 · คิวรอตรวจ และการส่งรอบให้ QA คณะ');
  await page.goto('/app/review');
  await expect(page.getByTestId('review-table')).toBeVisible();
  await caption(page, 'เมนู "รอตรวจ": รวมทุกข้อที่ส่งมา อนุมัติหรือส่งกลับได้จากหน้านี้');
  await hclick(page, page.getByTestId('approve-1.5'));
  await expect(page.getByTestId('approve-1.5')).toHaveCount(0);
  await caption(page, 'อนุมัติข้อ 1.5 → เจ้าของข้อได้แจ้งเตือน "ข้อ 1.5 ได้รับการอนุมัติแล้ว"');
  await hclick(page, page.getByTestId('return-6.6'));
  await confirmOk(page, 'ขอเพิ่มหลักฐานผลสำรวจความพึงพอใจปีล่าสุด (ข้อมูลทดสอบ)');
  await expect(page.getByTestId('return-6.6')).toHaveCount(0);
  await caption(page, 'ส่งกลับข้อ 6.6 พร้อมเหตุผล → เจ้าของข้อได้แจ้งเตือน "ข้อ 6.6 ถูกส่งกลับแก้: …"');
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  const submitCycle = page.getByTestId('cycle-to-under_review');
  await expect(submitCycle).toBeDisabled();
  await point(page, submitCycle);
  await caption(page, 'ปุ่ม "ส่งให้ QA คณะตรวจ" ยังกดไม่ได้ จนกว่าทุกข้อ (53 ข้อ) จะอนุมัติครบ — เมื่อกดแล้ว QA คณะได้แจ้งเตือน');
  await caption(page, 'สรุป: ประธานไม่ควรเขียน/ส่งเอง → มอบหมายให้อาจารย์ → อาจารย์ส่ง → ประธานได้แจ้งเตือน → อนุมัติ', 4500);
});
