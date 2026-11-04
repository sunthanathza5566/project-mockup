/**
 * V04 อาจารย์ผู้เขียน (staff1) — seed มาตรฐาน: ข้อ 3.6 เป็นของ staff1 อยู่แล้ว (F4)
 * กระดิ่ง "ได้รับมอบหมาย" → เขียน/AI ร่าง/ผูกหลักฐาน/คะแนนตนเอง → บันทึก → ส่งตรวจ (แจ้งประธาน 1 คน)
 * → chair1 กระดิ่ง +1 → ส่งกลับพร้อมเหตุผล → staff1 แก้ → ส่งซ้ำ → chair1 อนุมัติ → staff1 ได้แจ้งเตือนอนุมัติ
 */
import { test, expect } from '@playwright/test';
import { asUser, bellItem, caption, closeBell, confirmOk, hclick, hfill, hselect, point, saveVideo, scene, unread } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V04-staff'); });

test('V04 อาจารย์: รับมอบหมาย → เขียน/AI/หลักฐาน/คะแนน → ส่งตรวจ → ประธาน +1 → ส่งกลับ → แก้ → ส่งซ้ำ → อนุมัติ', async ({ page }) => {
  await scene(page, 'ฉาก 1/3 · อาจารย์เขียนและส่งตรวจ');
  await asUser(page, 'staff1', 'อาจารย์ผู้เขียน');
  await caption(page, 'หน้าหลักของอาจารย์: "งานของฉัน" แสดงข้อที่ได้รับมอบหมายและกำหนดส่ง');
  const n1 = await bellItem(page, 'คุณได้รับมอบหมายข้อ 3.6');
  await caption(page, 'กระดิ่ง: "คุณได้รับมอบหมายข้อ 3.6" (ประธานเป็นผู้มอบหมาย) — กดเพื่อเปิดข้อ');
  await hclick(page, n1);
  await page.waitForURL(/sections/);
  await expect(page.getByTestId('sar-editor')).toBeVisible();
  await caption(page, 'หน้าเขียนข้อ: เนื้อหา SAR, ผู้ช่วย AI, หลักฐาน, PDCA และคะแนนประเมินตนเอง');

  // ผูกหลักฐาน (ถ้ามีให้เลือก)
  const sel = page.getByTestId('link-select');
  if (await sel.isVisible().catch(() => false)) {
    const val = await sel.locator('option').evaluateAll(os => (os as HTMLOptionElement[]).find(o => o.value)?.value || '');
    if (val) {
      const before = await page.getByTestId('linked-evidence').locator('li').count().catch(() => 0);
      await caption(page, 'ผูกหลักฐานจากคลังเข้ากับข้อนี้ (ใช้อ้างเป็น [E-…] ในเนื้อหา)');
      await hselect(page, sel, val);
      await hclick(page, page.getByTestId('link-btn'));
      await expect(page.getByTestId('linked-evidence').locator('li')).toHaveCount(before + 1);
    }
  }

  await caption(page, 'ให้ AI ช่วยร่าง — AI เสนอเท่านั้น ต้องกด "ยอมรับ" เองจึงเข้าเอกสาร');
  await hclick(page, page.getByTestId('ai-draft'));
  await expect(page.getByTestId('ai-draft-text')).toBeVisible();
  await point(page, page.getByTestId('ai-draft-text'));
  await caption(page, 'ร่างจาก AI อ้างเฉพาะหลักฐานที่ผูกจริง — กดยอมรับเพื่อเติมต่อท้ายเนื้อหา');
  await hclick(page, page.getByTestId('ai-accept'));
  await expect(page.getByTestId('ai-result')).toHaveCount(0);

  const nar = page.getByTestId('narrative-th');
  await hfill(page, nar, `${await nar.inputValue()}\nอาจารย์ทบทวนและยืนยันเนื้อหาแล้ว (ข้อมูลทดสอบ)`);
  await hclick(page, page.getByTestId('save-manual'));
  await caption(page, 'กด "บันทึกตอนนี้" (ระบบบันทึกอัตโนมัติด้วย) — การบันทึกยังไม่แจ้งใคร');

  await hselect(page, page.getByTestId('self-score'), '4');
  await hfill(page, page.getByTestId('self-why'), 'มีระบบทบทวนการสอนและหลักฐานครบตามรอบ (ข้อมูลทดสอบ)');
  await hclick(page, page.getByTestId('self-save'));
  await expect(page.getByTestId('rating-panel')).toContainText('ล่าสุด: 4 คะแนน');
  await caption(page, 'ให้คะแนนประเมินตนเอง (1–7) พร้อมเหตุผล');

  await hclick(page, page.getByTestId('section-submit'));
  await expect(page.getByTestId('submit-recipient-count')).toContainText('ประธานหลักสูตร 1 คนจะได้รับแจ้งเตือน');
  await point(page, page.getByTestId('submit-recipient-count'));
  await caption(page, 'กล่องยืนยันมีรายการตรวจก่อนส่ง และบอกว่า "ประธานหลักสูตร 1 คนจะได้รับแจ้งเตือน"');
  await confirmOk(page);
  const t1 = page.getByTestId('toast').filter({ hasText: 'ส่งตรวจข้อ 3.6 แล้ว — แจ้งประธานหลักสูตร 1 คน' });
  await expect(t1).toBeVisible();
  await point(page, t1);
  await caption(page, 'ส่งตรวจแล้ว — ข้อนี้ล็อกไว้จนกว่าประธานจะตรวจ');
  await expect(page.getByTestId('readonly-reason')).toBeVisible();

  // ── ประธานได้แจ้งเตือน → ส่งกลับ ──
  await scene(page, 'ฉาก 2/3 · ประธานได้แจ้งเตือน → ส่งกลับแก้ไข');
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  expect(await unread(page)).toBe(6);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, 'กระดิ่งของประธาน: จาก 5 เป็น 6 รายการ');
  const n3 = await bellItem(page, 'ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ');
  await hclick(page, n3);
  await page.waitForURL(/sections/);
  await caption(page, 'ประธานอ่านแล้วเห็นว่าควรแก้ — กด "ส่งกลับแก้ไข" และต้องระบุเหตุผล');
  await hclick(page, page.getByTestId('section-return'));
  const note = 'ขอเพิ่มตัวอย่างการนำผลทบทวนไปปรับรายวิชาในปีถัดไป (ข้อมูลทดสอบ)';
  await confirmOk(page, note);
  await expect(page.getByTestId('toast').filter({ hasText: 'ส่งข้อ 3.6 กลับแก้ไขแล้ว' })).toBeVisible();
  await caption(page, 'ส่งกลับแล้ว → staff1 ได้แจ้งเตือน "ข้อ 3.6 ถูกส่งกลับแก้: …" พร้อมเหตุผล');

  // ── อาจารย์แก้ → ส่งซ้ำ → อนุมัติ ──
  await scene(page, 'ฉาก 3/3 · อาจารย์แก้ ส่งซ้ำ และได้รับอนุมัติ');
  await asUser(page, 'staff1', 'อาจารย์ผู้เขียน');
  const n5 = await bellItem(page, 'ข้อ 3.6 ถูกส่งกลับแก้');
  await expect(n5).toContainText(note);
  await caption(page, 'staff1 เห็นเหตุผลที่ถูกส่งกลับในกระดิ่ง — กดเพื่อไปแก้');
  await hclick(page, n5);
  await page.waitForURL(/sections/);
  const nar2 = page.getByTestId('narrative-th');
  await hfill(page, nar2, `${await nar2.inputValue()}\nตัวอย่าง: ปรับรายวิชา CS201 ตามผลทบทวนภาคเรียนที่ 1 (ข้อมูลทดสอบ)`);
  await hclick(page, page.getByTestId('save-manual'));
  await hclick(page, page.getByTestId('section-submit'));
  await confirmOk(page);
  await expect(page.getByTestId('toast').filter({ hasText: 'แจ้งประธานหลักสูตร 1 คน' })).toBeVisible();
  await caption(page, 'แก้แล้วส่งตรวจอีกครั้ง → ประธานได้แจ้งเตือนอีกรอบ');

  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  const again = await bellItem(page, 'ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ');
  await expect(page.getByTestId('noti-panel').locator('[data-testid^="noti-item-"][data-unread]', { hasText: 'ข้อ 3.6 ส่งตรวจแล้ว' })).toHaveCount(1);
  await hclick(page, again);
  await page.waitForURL(/sections/);
  await hclick(page, page.getByTestId('section-approve'));
  await expect(page.getByTestId('toast').filter({ hasText: 'อนุมัติข้อ 3.6 แล้ว' })).toBeVisible();
  await caption(page, 'ประธานอนุมัติ → staff1 ได้แจ้งเตือน "ข้อ 3.6 ได้รับการอนุมัติแล้ว"');

  await asUser(page, 'staff1', 'อาจารย์ผู้เขียน');
  await bellItem(page, 'ข้อ 3.6 ได้รับการอนุมัติแล้ว');
  await caption(page, 'staff1 เห็นผล: "ข้อ 3.6 ได้รับการอนุมัติแล้ว"');
  await closeBell(page);
  await caption(page, 'สรุป: อาจารย์ส่ง → ประธานได้แจ้งเตือน · ประธานส่งกลับ/อนุมัติ → อาจารย์ได้แจ้งเตือน', 4500);
});
