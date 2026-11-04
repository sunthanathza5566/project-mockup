/**
 * V10 end-to-end ครบกระบวนการในวิดีโอเดียว — seed มาตรฐาน (รอบเดโม่ 2569 อนุมัติแล้ว 45/53)
 * ผู้ใช้ใหม่ขอเข้าใช้งาน → uadmin อนุมัติ → chair1 มอบหมาย 5.1 ให้ผู้ใช้ใหม่ / 7.9 ให้ staff1 → อาจารย์เขียน + ส่งตรวจ
 * → chair1 กระดิ่ง +N → อนุมัติครบ 53 → ส่งให้ QA คณะ → fqa1 อนุมัติ → dean1 อนุมัติสุดท้าย + ล็อก
 * → uadmin มอบหมายกรรมการ + เริ่มประเมิน → assess1 ให้คะแนน + verdict + เสร็จสิ้น → chair1 สร้างแผนจาก AFI + ปิดรอบ
 * ทุกขั้นบรรยายว่า "ใครได้แจ้งเตือนอะไร" และ expect ว่ากระดิ่งของผู้รับมีรายการนั้นจริง
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, sectionUrl } from '../helpers';
import { asUser, bellItem, caption, closeBell, confirmOk, hclick, hfill, hselect, point, saveVideo, scene, setRole, unread } from './narrate';

const DOMAIN = 'sample-uni.example';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V10-end-to-end'); });

async function writeAndSubmit(page: Page, req: string, extra: string) {
  await page.goto(sectionUrl(DEMO_CYCLE, req));
  await expect(page.getByTestId('sar-editor')).toBeVisible();
  const nar = page.getByTestId('narrative-th');
  await hfill(page, nar, `${await nar.inputValue()}\n${extra}`);
  await hclick(page, page.getByTestId('save-manual'));
  await hclick(page, page.getByTestId('section-submit'));
  await expect(page.getByTestId('submit-recipient-count')).toContainText('ประธานหลักสูตร 1 คน');
  await confirmOk(page);
  await expect(page.getByTestId('toast').filter({ hasText: `ส่งตรวจข้อ ${req} แล้ว — แจ้งประธานหลักสูตร 1 คน` })).toBeVisible();
}

test('V10 end-to-end: ผู้ใช้ใหม่ → มอบหมาย → เขียน/ส่ง → อนุมัติ → QA คณะ → คณบดีล็อก → กรรมการประเมิน → ปิดรอบ', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  const s = String(Date.now() % 100000);
  const nu = { name: `อ.ใหม่ ครบวงจร${s} (สมมติ)`, username: `e2e${s}`, password: 'newpass123' };

  // ── 1 ผู้ใช้ใหม่ ──
  await scene(page, 'ขั้น 1/9 · ผู้ใช้ใหม่ขอเข้าใช้งาน');
  await setRole(page, 'ผู้ใช้ใหม่ (ยังไม่มีบัญชี)');
  await page.goto('/request-access');
  await caption(page, 'อาจารย์ใหม่ส่งคำขอเข้าใช้งาน → ผู้ดูแลมหาวิทยาลัยได้แจ้งเตือน');
  await hfill(page, page.getByTestId('ra-name'), nu.name);
  await hfill(page, page.getByTestId('ra-email'), `${nu.username}@${DOMAIN}`);
  await page.getByTestId('ra-email').blur();
  await expect(page.getByTestId('ra-email-uni')).toBeVisible();
  await hfill(page, page.getByTestId('ra-reason'), 'อาจารย์ใหม่ รับผิดชอบเขียนเกณฑ์ที่ 5 (ข้อมูลทดสอบ)');
  await hfill(page, page.getByTestId('ra-username'), nu.username);
  await hfill(page, page.getByTestId('ra-password'), nu.password);
  await hfill(page, page.getByTestId('ra-password2'), nu.password);
  await hclick(page, page.getByTestId('ra-consent'));
  await hclick(page, page.getByTestId('ra-submit'));
  await expect(page.getByTestId('ra-success')).toBeVisible();

  await scene(page, 'ขั้น 2/9 · ผู้ดูแลอนุมัติ');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  const n12 = await bellItem(page, nu.name);
  await caption(page, 'uadmin ได้แจ้งเตือน "มีคำขอเข้าใช้งานใหม่" → อนุมัติเป็นอาจารย์หลักสูตร CS');
  await hclick(page, n12);
  await page.waitForURL(/tab=requests/);
  const card = page.locator('li[data-testid^="req-"]', { hasText: nu.name });
  const id = (await card.getAttribute('data-testid'))!.replace(/^req-/, '');
  await hselect(page, page.getByTestId(`req-role-${id}`), 'programme_staff');
  const scopeLabel = (await page.getByTestId(`req-scope-${id}`).locator('option').allTextContents()).find(t => /^หลักสูตร .*CS/.test(t));
  await hselect(page, page.getByTestId(`req-scope-${id}`), { label: scopeLabel! });
  await hclick(page, page.getByTestId(`req-approve-${id}`));
  await expect(card).toHaveCount(0);
  await caption(page, 'อนุมัติแล้ว → ผู้ใช้ใหม่ได้แจ้งเตือน "บัญชีของคุณได้รับอนุมัติแล้ว"');

  // ── 3 ประธานมอบหมาย ──
  await scene(page, 'ขั้น 3/9 · ประธานมอบหมายข้อที่ยังเขียนไม่เสร็จ');
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  const chair0 = await unread(page);
  await caption(page, `กระดิ่งประธานตอนเริ่ม: ${chair0} รายการ (ข้อที่รอตรวจ) · ยังเหลือ 8 ข้อที่ไม่อนุมัติ`);
  await page.goto(`/app/cycles/${DEMO_CYCLE}/assign`);
  await hselect(page, page.getByTestId('owner-5.1'), { label: nu.name });
  await hselect(page, page.getByTestId('owner-7.9'), { label: 'อ.วิภา เขียนรายงาน' });
  await expect(page.getByTestId('owner-7.9')).toHaveValue(/.+/);
  await caption(page, 'มอบ 5.1 ให้อาจารย์ใหม่ และ 7.9 ให้ staff1 (3.6 เป็นของ staff1 อยู่แล้ว) → ทั้งสองได้แจ้งเตือน "คุณได้รับมอบหมายข้อ …"');

  // ── 4 อาจารย์เขียน + ส่งตรวจ ──
  await scene(page, 'ขั้น 4/9 · อาจารย์เขียนและส่งตรวจ');
  await asUser(page, nu.username, 'อาจารย์ใหม่', { password: nu.password });
  await bellItem(page, 'บัญชีของคุณได้รับอนุมัติแล้ว');
  await bellItem(page, 'คุณได้รับมอบหมายข้อ 5.1');
  await caption(page, 'อาจารย์ใหม่เห็นแจ้งเตือน "ได้รับอนุมัติ" และ "ได้รับมอบหมายข้อ 5.1"');
  await closeBell(page);
  await writeAndSubmit(page, '5.1', 'อาจารย์ใหม่ปรับปรุงเนื้อหาข้อ 5.1 (ข้อมูลทดสอบ)');
  await caption(page, 'ส่งตรวจ 5.1 → ประธานได้แจ้งเตือน');
  await asUser(page, 'staff1', 'อาจารย์ผู้เขียน');
  await writeAndSubmit(page, '3.6', 'staff1 ยืนยันเนื้อหาข้อ 3.6 (ข้อมูลทดสอบ)');
  await writeAndSubmit(page, '7.9', 'staff1 ปรับปรุงเนื้อหาข้อ 7.9 (ข้อมูลทดสอบ)');
  await caption(page, 'staff1 ส่งตรวจ 3.6 และ 7.9 → ประธานได้แจ้งเตือนอีก 2 รายการ');

  // ── 5 ประธานอนุมัติครบ → ส่ง QA ──
  await scene(page, 'ขั้น 5/9 · ประธานอนุมัติครบ แล้วส่งให้ QA คณะ');
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  expect(await unread(page)).toBe(chair0 + 3);
  await point(page, page.getByTestId('nav-bell'));
  await caption(page, `กระดิ่งประธาน: ${chair0} → ${chair0 + 3} (ส่งตรวจ 3 ข้อ)`);
  await page.goto('/app/review');
  await caption(page, 'คิวรอตรวจ: อนุมัติทีละข้อ → เจ้าของข้อแต่ละคนได้แจ้งเตือน "ได้รับการอนุมัติแล้ว"');
  for (const r of ['1.5', '6.6', '8.1', '8.2', '8.3', '3.6', '5.1', '7.9']) {
    await hclick(page, page.getByTestId(`approve-${r}`));
    // ข้อที่ยังมีช่องว่างวิกฤต (เช่น ไม่มีหลักฐานผูก) → ระบบถามยืนยันก่อนอนุมัติ
    const dlg = page.getByRole('dialog');
    if (await dlg.isVisible({ timeout: 1500 }).catch(() => false)) {
      await caption(page, `ข้อ ${r} ยังมีช่องว่างวิกฤต — ระบบถามยืนยันก่อนอนุมัติ (แนะนำให้เปิดอ่านก่อน)`);
      await confirmOk(page);
    }
    await expect(page.getByTestId(`approve-${r}`)).toHaveCount(0);
  }
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await expect(page.getByTestId('cycle-to-under_review')).toBeEnabled();
  await caption(page, 'อนุมัติครบ 53 ข้อ ปุ่ม "ส่งให้ QA คณะตรวจ" กดได้แล้ว → QA คณะได้แจ้งเตือน');
  await hclick(page, page.getByTestId('cycle-to-under_review'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-to-under_review')).toHaveCount(0);

  // ── 6 QA คณะ ──
  await scene(page, 'ขั้น 6/9 · QA คณะอนุมัติ');
  await asUser(page, 'fqa1', 'QA คณะ');
  const nq = await bellItem(page, /รอบประเมิน 2569 .*ส่งมาให้ QA คณะตรวจแล้ว/);
  await caption(page, 'QA คณะได้แจ้งเตือน "รอบ 2569 ส่งมาให้ QA คณะตรวจแล้ว" → เปิดรอบ → อนุมัติ');
  await hclick(page, nq);
  await page.waitForURL(new RegExp(`/app/cycles/${DEMO_CYCLE}$`));
  await hclick(page, page.getByTestId('cycle-to-faculty_approved'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-to-faculty_approved')).toHaveCount(0);
  await caption(page, 'อนุมัติแล้ว → คณบดีได้แจ้งเตือน "QA คณะอนุมัติรอบ … รอคณบดี"');

  // ── 7 คณบดี ──
  await scene(page, 'ขั้น 7/9 · คณบดีอนุมัติสุดท้ายและล็อก');
  await asUser(page, 'dean1', 'คณบดี');
  const nd = await bellItem(page, /QA คณะอนุมัติรอบ 2569/);
  await hclick(page, nd);
  await page.waitForURL(new RegExp(`/app/cycles/${DEMO_CYCLE}$`));
  await hclick(page, page.getByTestId('cycle-to-final_approved'));
  await confirmOk(page);
  await expect(page.getByTestId('lock-banner')).toContainText('เนื้อหา SAR ตรงกับที่ล็อก');
  await point(page, page.getByTestId('lock-banner'));
  await caption(page, 'ล็อกแล้วพร้อม hash → ผู้ดูแลมหาวิทยาลัยและ QA คณะได้แจ้งเตือน "เริ่มการประเมินได้"');

  // ── 8 ผู้ดูแล + กรรมการ ──
  await scene(page, 'ขั้น 8/9 · มอบหมายกรรมการ และกรรมการประเมิน');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  const nl = await bellItem(page, /2569.*อนุมัติสุดท้ายและล็อกแล้ว/);
  await hclick(page, nl);
  await page.waitForURL(new RegExp(`/app/cycles/${DEMO_CYCLE}$`));
  await hclick(page, page.getByTestId('go-assign'));
  const sel = page.getByTestId('assessor-select');
  const assigned = await page.getByText(/กรรมการที่ได้รับมอบหมายแล้ว:.*ศ\.ดร\.วรรณา/).count();
  if (!assigned) {
    await hselect(page, sel, { label: 'ศ.ดร.วรรณา ผู้ประเมินภายนอก' });
    await hclick(page, page.getByTestId('assessor-add'));
  }
  await expect(page.getByText(/กรรมการที่ได้รับมอบหมายแล้ว:.*ศ\.ดร\.วรรณา/)).toBeVisible();
  await caption(page, 'มอบหมายกรรมการ ศ.ดร.วรรณา (assess1) → กรรมการได้แจ้งเตือน');
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await hclick(page, page.getByTestId('cycle-to-under_assessment'));
  await confirmOk(page);
  await caption(page, 'เริ่มการประเมิน → กรรมการได้แจ้งเตือน "เปิดให้ประเมินแล้ว"');

  await asUser(page, 'assess1', 'กรรมการประเมิน');
  const na = await bellItem(page, /2569.*เปิดให้ประเมินแล้ว/);
  await hclick(page, na);
  await page.waitForURL(/\/assess$/);
  await caption(page, 'กรรมการให้คะแนน 8 เกณฑ์ ใส่ข้อเสนอแนะ (AFI) และ verdict');
  for (let c = 1; c <= 8; c++) {
    await page.getByTestId(`assess-crit-${c}`).click();
    await page.getByTestId('crit-score').selectOption('5');
    await page.getByTestId('crit-why').fill(`เกณฑ์ ${c} เป็นไปตามเกณฑ์ (ข้อมูลทดสอบ)`);
    await page.getByTestId('crit-save').click();
    await expect(page.getByTestId('rated-count')).toHaveText(`${c}/8`);
    if (c === 1) {
      await hfill(page, page.getByTestId('f-afi-1.1'), 'ควรทบทวน PLO กับผู้ใช้บัณฑิตอย่างเป็นระบบ (ข้อมูลทดสอบ)');
      await hclick(page, page.getByTestId('f-save-1.1'));
    }
  }
  await hselect(page, page.getByTestId('verdict-score'), '5');
  await hfill(page, page.getByTestId('verdict-why'), 'ภาพรวมเป็นไปตามเกณฑ์ (ข้อมูลทดสอบ)');
  await hclick(page, page.getByTestId('verdict-save'));
  await hclick(page, page.getByTestId('assess-finish'));
  await confirmOk(page);
  await expect(page.getByTestId('assess-notopen')).toContainText('ส่งผลประเมินแล้ว');
  await caption(page, 'เสร็จสิ้นการประเมิน → ประธาน, QA คณะ และผู้ดูแลได้แจ้งเตือน "กรรมการส่งผลประเมินแล้ว"');

  // ── 9 ประธานปิดรอบ ──
  await scene(page, 'ขั้น 9/9 · ประธานสร้างแผนปรับปรุงและปิดรอบ');
  await asUser(page, 'chair1', 'ประธานหลักสูตร');
  const nr = await bellItem(page, /กรรมการส่งผลประเมินรอบ 2569/);
  await hclick(page, nr);
  await page.waitForURL(/\/assess$/);
  await expect(page.getByTestId('assess-results')).toBeVisible();
  await caption(page, 'ประธานดูผลประเมิน แล้วสร้างแผนปรับปรุงจาก AFI');
  await page.goto('/app/actions');
  await hclick(page, page.getByTestId(`afi-${DEMO_CYCLE}`));
  await expect(page.getByTestId('toast').filter({ hasText: /สร้าง action \d+ รายการจาก AFI แล้ว/ })).toBeVisible();
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await hclick(page, page.getByTestId('cycle-to-closed'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-closed-next')).toBeVisible();
  await point(page, page.getByTestId('cycle-closed-next'));
  await caption(page, 'ปิดรอบ 2569 แล้ว — ครบวงจร: ขอใช้งาน → มอบหมาย → เขียน/ส่ง → อนุมัติ → QA คณะ → คณบดีล็อก → ประเมิน → ปิดรอบ', 6000);
});
