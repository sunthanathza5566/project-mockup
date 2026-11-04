/**
 * V08 กรรมการประเมิน (assess1) — scenario `cycle-final-approved` (รอบ CS 2564 ล็อกแล้ว ยังไม่มีกรรมการ)
 * เตรียม: uadmin มอบหมายกรรมการ + "เริ่มการประเมิน" (N2 + N7f) → assess1 ให้คะแนน 8 เกณฑ์ + finding + verdict
 * → "เสร็จสิ้นการประเมิน" → ประธาน/QA คณะ/ผู้ดูแลได้แจ้งเตือน N7g
 */
import { test, expect } from '@playwright/test';
import { asUser, bellItem, caption, confirmOk, hclick, hfill, hselect, loadScenario, point, saveVideo, scene } from './narrate';

const CYCLE = 'cycle-scn-cs-2564';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V08-assessor'); });

test('V08 กรรมการ: ได้รับมอบหมาย → ให้คะแนนรายเกณฑ์ + ข้อค้นพบ + verdict → เสร็จสิ้นการประเมิน → ประธานได้แจ้งเตือน', async ({ page }) => {
  await scene(page, 'เตรียมข้อมูล · โหลดเคส "อนุมัติสุดท้าย + ล็อกแล้ว (2564)"');
  await loadScenario(page, 'cycle-final-approved', 'เตรียมข้อมูล: โหลดเคสทดสอบ "รอบ 2564 ล็อกแล้ว รอเริ่มการประเมิน"');

  await scene(page, 'ฉาก 1/3 · ผู้ดูแลมอบหมายกรรมการและเริ่มการประเมิน');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  await page.goto(`/app/cycles/${CYCLE}`);
  await hclick(page, page.getByTestId('go-assign'));
  await page.waitForURL(/\/assign$/);
  await caption(page, 'มอบหมายกรรมการเข้ารอบ → กรรมการได้แจ้งเตือน "คุณได้รับมอบหมายเป็นกรรมการประเมินรอบ …"');
  await hselect(page, page.getByTestId('assessor-select'), { label: 'ศ.ดร.วรรณา ผู้ประเมินภายนอก' });
  await hclick(page, page.getByTestId('assessor-add'));
  await expect(page.getByText('ศ.ดร.วรรณา ผู้ประเมินภายนอก', { exact: false }).last()).toBeVisible();
  await page.goto(`/app/cycles/${CYCLE}`);
  await caption(page, 'กด "เริ่มการประเมิน" → กรรมการได้แจ้งเตือน "เปิดให้ประเมินแล้ว" · ประธาน/เจ้าของข้อได้แจ้งว่าเข้าสู่ขั้นประเมิน');
  await hclick(page, page.getByTestId('cycle-to-under_assessment'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-to-under_assessment')).toHaveCount(0);

  await scene(page, 'ฉาก 2/3 · กรรมการให้คะแนน');
  await asUser(page, 'assess1', 'กรรมการประเมิน');
  await expect(page.getByTestId('readonly-banner')).toBeVisible();
  await point(page, page.getByTestId('readonly-banner'));
  await caption(page, 'กรรมการอ่าน SAR ได้อย่างเดียว แก้เนื้อหาไม่ได้ และเห็นเฉพาะรอบที่ได้รับมอบหมาย');
  const n = await bellItem(page, /2564.*เปิดให้ประเมินแล้ว/);
  await caption(page, 'แจ้งเตือน "รอบ … เปิดให้ประเมินแล้ว — เริ่มให้คะแนนได้" กดเพื่อไปพื้นที่ทำงานกรรมการ');
  await hclick(page, n);
  await page.waitForURL(/\/assess$/);
  await expect(page.getByTestId('assess-progress')).toBeVisible();
  await caption(page, 'พื้นที่ทำงานกรรมการ: ให้คะแนน 1–7 ทีละเกณฑ์ (8 เกณฑ์) พร้อมเหตุผล');
  for (let c = 1; c <= 8; c++) {
    await hclick(page, page.getByTestId(`assess-crit-${c}`));
    await hselect(page, page.getByTestId('crit-score'), c === 3 ? '4' : '5');
    await hfill(page, page.getByTestId('crit-why'), `เกณฑ์ ${c}: มีระบบและหลักฐานสอดคล้อง (ข้อมูลทดสอบ)`);
    await hclick(page, page.getByTestId('crit-save'));
    await expect(page.getByTestId('rated-count')).toHaveText(`${c}/8`);
    if (c === 1) {
      await caption(page, 'บันทึกเกณฑ์ 1 แล้ว — เพิ่มข้อค้นพบรายข้อ: จุดแข็ง และข้อควรปรับปรุง (AFI)');
      await hfill(page, page.getByTestId('f-strengths-1.1'), 'PLO ชัดเจนและเผยแพร่ครบ (ข้อมูลทดสอบ)');
      await hfill(page, page.getByTestId('f-afi-1.1'), 'ควรทบทวน PLO กับผู้ใช้บัณฑิตอย่างเป็นระบบ (ข้อมูลทดสอบ)');
      await hclick(page, page.getByTestId('f-save-1.1'));
      await caption(page, 'AFI นี้จะกลายเป็น "แผนปรับปรุง" ของหลักสูตรหลังประเมินเสร็จ');
    }
    if (c === 4) await caption(page, 'ทำต่อจนครบ 8 เกณฑ์ (ตัวนับด้านบนบอกความคืบหน้า)');
  }
  await caption(page, 'ครบ 8/8 แล้ว — เลือก verdict ภาพรวมพร้อมเหตุผล');
  await hselect(page, page.getByTestId('verdict-score'), '5');
  await hfill(page, page.getByTestId('verdict-why'), 'ภาพรวมเป็นไปตามเกณฑ์ (ข้อมูลทดสอบ)');
  await hclick(page, page.getByTestId('verdict-save'));
  await expect(page.getByTestId('assess-finish')).toBeEnabled();

  await scene(page, 'ฉาก 3/3 · ส่งผลประเมิน → ประธานได้แจ้งเตือน');
  await caption(page, 'กด "เสร็จสิ้นการประเมิน" → ประธาน, QA คณะ และผู้ดูแลมหาวิทยาลัยได้แจ้งเตือน "กรรมการส่งผลประเมินแล้ว"');
  await hclick(page, page.getByTestId('assess-finish'));
  await confirmOk(page);
  await expect(page.getByTestId('assess-notopen')).toContainText('ส่งผลประเมินแล้ว');
  await point(page, page.getByTestId('assess-notopen'));

  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  await bellItem(page, /กรรมการส่งผลประเมินรอบ 2564/);
  await caption(page, 'ฝั่งประธาน: "กรรมการส่งผลประเมินรอบ 2564 แล้ว — ดูผลได้ที่หน้าผลประเมิน" (ต่อในวิดีโอ V09)', 4500);
});
