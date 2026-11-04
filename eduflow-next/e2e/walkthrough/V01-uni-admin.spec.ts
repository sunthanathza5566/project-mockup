/**
 * V01 ผู้ดูแลมหาวิทยาลัย (uadmin) — scenario 'all' (โหลดทุกเคส) ผ่านแท็บข้อมูลเดโม่ของ sadmin
 * คำขอเข้าใช้งาน (อนุมัติ newreq1 / ปฏิเสธ newreq2) → ผู้ใช้ (สร้างตรง, ระงับ/เปิดใช้) → Audit log
 * → รอบ 2564 (ล็อกแล้ว): มอบหมายกรรมการ + เริ่มการประเมิน → รอบ 2561 (ประเมินแล้ว): ปิดรอบ
 */
import { test, expect, type Page } from '@playwright/test';
import { asUser, bellItem, caption, closeBell, confirmOk, hclick, hfill, hselect, loadScenario, point, saveVideo, scene } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V01-uni-admin'); });

async function manage(page: Page, username: string) {
  const panel = page.getByTestId(`user-panel-${username}`);
  if (!(await panel.isVisible())) await hclick(page, page.getByTestId(`user-manage-${username}`));
  await expect(panel).toBeVisible();
}

test('V01 ผู้ดูแลมหาวิทยาลัย: คำขอ → ผู้ใช้ → ระงับ/เปิดใช้ → audit → มอบหมายกรรมการ + เริ่มประเมิน → ปิดรอบ', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  await scene(page, 'เตรียมข้อมูล · โหลดทุกเคสทดสอบ');
  await loadScenario(page, 'all', 'เตรียมข้อมูล: ผู้ดูแลระบบสูงสุดโหลด "ทุกเคส" (มีคำขอรออนุมัติ รอบล็อกแล้ว และรอบประเมินเสร็จ)');

  await scene(page, 'ฉาก 1/4 · คำขอเข้าใช้งาน');
  await asUser(page, 'uadmin', 'ผู้ดูแลมหาวิทยาลัย');
  await caption(page, 'หน้าหลักของผู้ดูแล: งาน "อนุมัติคำขอเข้าใช้งาน" และแจ้งเตือนคำขอใหม่');
  const n12 = await bellItem(page, /มีคำขอเข้าใช้งานใหม่จาก/);
  await hclick(page, n12);
  await page.waitForURL(/tab=requests/);
  const c1 = page.locator('li[data-testid^="req-"]', { hasText: 'อ.ใหม่ ขอใช้งาน (สมมติ)' });
  const c2 = page.locator('li[data-testid^="req-"]', { hasText: 'คุณสายใจ งานประกันคุณภาพ (สมมติ)' });
  await expect(c1).toBeVisible();
  await expect(c2).toBeVisible();
  await caption(page, 'คำขอ 2 รายการ — ผู้ดูแลกำหนดบทบาท + ขอบเขต แล้วอนุมัติ หรือปฏิเสธพร้อมเหตุผล');
  const id1 = (await c1.getAttribute('data-testid'))!.replace(/^req-/, '');
  await hselect(page, page.getByTestId(`req-role-${id1}`), 'programme_staff');
  const scopeLabel = (await page.getByTestId(`req-scope-${id1}`).locator('option').allTextContents()).find(t => /^หลักสูตร .*CS/.test(t));
  await hselect(page, page.getByTestId(`req-scope-${id1}`), { label: scopeLabel! });
  await hclick(page, page.getByTestId(`req-approve-${id1}`));
  await expect(c1).toHaveCount(0);
  await caption(page, 'อนุมัติแล้ว → ผู้ขอได้แจ้งเตือน "บัญชีของคุณได้รับอนุมัติแล้ว"');
  const id2 = (await c2.getAttribute('data-testid'))!.replace(/^req-/, '');
  await hclick(page, page.getByTestId(`req-reject-${id2}`));
  await confirmOk(page, 'ยืนยันตัวตนไม่ได้ ขอให้ติดต่อคณะโดยตรง (ข้อมูลทดสอบ)');
  await expect(c2).toHaveCount(0);
  await caption(page, 'ปฏิเสธแล้ว → ข้อมูลคำขอถูกลบทันที (PDPA) — ข้อควรรู้: ผู้ขอไม่ได้รับแจ้งเตือน');

  await scene(page, 'ฉาก 2/4 · จัดการผู้ใช้');
  await hclick(page, page.getByTestId('tab-users'));
  await expect(page.getByTestId('users-table')).toBeVisible();
  await caption(page, 'แท็บผู้ใช้: เพิ่มผู้ใช้ (เชิญ หรือ ตั้งรหัสผ่านให้), เพิ่ม/ถอนบทบาท, ระงับ/เปิดใช้');
  const s = String(Date.now() % 100000);
  const uname = `direct${s}`;
  await hclick(page, page.getByTestId('user-new'));
  await hfill(page, page.getByTestId('nu-username'), uname);
  await hfill(page, page.getByTestId('nu-name'), `อ.สร้างตรง ทดลอง${s} (สมมติ)`);
  await hfill(page, page.getByTestId('nu-email'), `${uname}@sample-uni.example`);
  await hclick(page, page.getByTestId('nu-mode-password'));
  await hfill(page, page.getByTestId('nu-password'), 'directpass1');
  await hclick(page, page.getByTestId('nu-submit'));
  await expect(page.getByTestId(`user-status-${uname}`)).toHaveText('ใช้งานอยู่');
  await caption(page, 'สร้างบัญชีแบบตั้งรหัสผ่านให้ → ใช้งานได้ทันที (วิธีเชิญดูในวิดีโอ V00)');
  await manage(page, 'lect1');
  await hclick(page, page.getByTestId('user-suspend-lect1'));
  await confirmOk(page);
  await expect(page.getByTestId('user-status-lect1')).toHaveText('ระงับ');
  await caption(page, 'ระงับ lect1 → เข้าสู่ระบบไม่ได้ และไม่ได้รับแจ้งเตือน/งานมอบหมายระหว่างถูกระงับ');
  await hclick(page, page.getByTestId('user-reactivate-lect1'));
  await confirmOk(page);
  await expect(page.getByTestId('user-status-lect1')).toHaveText('ใช้งานอยู่');
  await caption(page, 'เปิดใช้อีกครั้ง → กลับมาใช้งานด้วยบทบาทเดิม');
  await hclick(page, page.getByTestId('tab-audit'));
  await expect(page.getByTestId('audit-table')).toBeVisible();
  await point(page, page.getByTestId('audit-table'));
  await caption(page, 'Audit log: ทุกการกระทำสำคัญถูกบันทึก (ใคร ทำอะไร เมื่อไร) ส่งออก CSV ได้');

  await scene(page, 'ฉาก 3/4 · มอบหมายกรรมการ + เริ่มการประเมิน (รอบ 2564)');
  await closeBell(page);
  await page.goto('/app/cycles/cycle-scn-cs-2564');
  await expect(page.getByTestId('lock-banner')).toBeVisible();
  await caption(page, 'รอบ 2564 คณบดีอนุมัติและล็อกแล้ว — ผู้ดูแลมอบหมายกรรมการก่อนเริ่มประเมิน');
  await hclick(page, page.getByTestId('go-assign'));
  await hselect(page, page.getByTestId('assessor-select'), { label: 'ศ.ดร.วรรณา ผู้ประเมินภายนอก' });
  await hclick(page, page.getByTestId('assessor-add'));
  await caption(page, 'มอบหมายแล้ว → กรรมการได้แจ้งเตือน "คุณได้รับมอบหมายเป็นกรรมการประเมินรอบ …"');
  await page.goto('/app/cycles/cycle-scn-cs-2564');
  await hclick(page, page.getByTestId('cycle-to-under_assessment'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-to-under_assessment')).toHaveCount(0);
  await caption(page, 'เริ่มการประเมิน → กรรมการได้แจ้งเตือน "เปิดให้ประเมินแล้ว" (การให้คะแนนดูในวิดีโอ V08)');

  await scene(page, 'ฉาก 4/4 · ปิดรอบ (รอบ 2561)');
  await page.goto('/app/cycles/cycle-scn-cs-2561');
  await caption(page, 'รอบ 2561 กรรมการส่งผลแล้ว — ผู้ดูแล (หรือประธาน/QA คณะ) กด "ปิดรอบ"');
  await hclick(page, page.getByTestId('cycle-to-closed'));
  await confirmOk(page);
  await expect(page.getByTestId('cycle-closed-next')).toBeVisible();
  await point(page, page.getByTestId('cycle-closed-next'));
  await caption(page, 'ปิดรอบแล้ว (ไม่มีแจ้งเตือน) — สรุป: ผู้ดูแลรับคนเข้า จัดการบัญชี ดู audit มอบหมายกรรมการ และปิดรอบ', 4500);
});
