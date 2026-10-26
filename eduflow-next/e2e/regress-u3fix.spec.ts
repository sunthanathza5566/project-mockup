/**
 * Regression หลัง U3 fix — TASK-0001 (qa-tester)
 * U3-1   กล่องพิมพ์ที่มองเห็น 1 กล่องต่อแท็บภาษา (ย้ายจาก .agents/playtest/u3/verify.mjs) @1440 และ @390
 * U-1    กิจกรรมนอก editor (pointerdown / keydown / input) → lastActiveAt ขยับ · ภายใน 60 วิ = throttle ไม่ขยับ
 * U-2    sessionLost: เมนูหาย ข้อความค้างอยู่ · กดลิงก์ = ถามก่อน (ยกเลิกอยู่หน้าเดิม) · เปลี่ยนหน้า / ยืนยัน / ปุ่มเข้าสู่ระบบใหม่ → /login?reason=other-tab
 * UX-U3-1 ส่งกลับแล้วเห็น return-reason (ประธาน + เจ้าของข้อ) และอยู่ใน review-history · ข้อที่ไม่ได้ถูกส่งกลับไม่มี return-reason
 * U3P-1  /app/sections/<id ผิด> ไม่มีคำว่า "undefined"
 * U3P-2  สองแท็บ: แท็บ B บันทึก → แท็บ A พิมพ์ → dialog conflict + save-conflict · ไม่ทับงาน B · conflict-reload ได้ฉบับ B แล้วบันทึกต่อได้
 * AC-14  home-add-evidence → ฟอร์มเปิดทันที · อัปโหลด+ผูก 1 ข้อ ≤ 6 action หลัก · ผู้ไม่มีสิทธิ์ไม่เห็นปุ่ม
 * U-3    dialog สองตัวเกิดพร้อมกัน (logout ที่ flush ไม่ผ่าน + conflict) → เข้าคิว แสดงทีละตัว ไม่ทับ
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, loginAs, logoutViaMenu, openSection, openUserMenu, sectionUrl } from './helpers';

test.use({ viewport: { width: 1440, height: 900 } });

const SID36 = `${DEMO_CYCLE}::3.6`;
const lastActive = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('aunqa_session') || 'null')?.lastActiveAt as number | undefined);
/** ย้อน lastActiveAt ไป ms (ให้พ้น throttle 60 วิ) — คืนค่าที่ตั้ง */
const ageSession = (p: Page, ms: number) => p.evaluate((ms) => {
  const s = JSON.parse(localStorage.getItem('aunqa_session')!);
  s.lastActiveAt = Date.now() - ms;
  localStorage.setItem('aunqa_session', JSON.stringify(s));
  return s.lastActiveAt as number;
}, ms);
const storedNarrative = (p: Page, id: string) => p.evaluate((id) =>
  (JSON.parse(localStorage.getItem('aunqa_sections') || '[]') as Array<{ id: string; narrativeTh: string }>).find(s => s.id === id)?.narrativeTh, id);

// ─────────────────────────── U3-1 ───────────────────────────
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`U3-1 @${vp.width}: กล่องพิมพ์ที่มองเห็น 1 กล่องต่อแท็บภาษา (TH = narrative-th, EN = narrative-en)`, async ({ page }) => {
    await page.setViewportSize(vp);
    await loginAs(page, 'chair1');
    await openSection(page, DEMO_CYCLE, '3.6');
    const prose = page.locator('textarea.aq-textarea--prose');
    const visibleCount = () => prose.evaluateAll(els => els.filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0).length);
    await expect(prose).toHaveCount(2);
    expect(await visibleCount()).toBe(1);
    await expect(page.getByTestId('narrative-th')).toBeVisible();
    await expect(page.getByTestId('narrative-en')).toBeHidden();

    await page.getByTestId('tab-en').click();
    await expect(page.getByTestId('narrative-en')).toBeVisible();
    await expect(page.getByTestId('narrative-th')).toBeHidden();
    expect(await visibleCount()).toBe(1);

    await page.getByTestId('tab-th').click();
    await expect(page.getByTestId('narrative-th')).toBeVisible();
    expect(await visibleCount()).toBe(1);
  });
}

// ─────────────────────────── U-1 ───────────────────────────
test('U-1 ทำงานนอก editor (คลิก / กดแป้น / พิมพ์ในช่องค้นหา) → lastActiveAt ขยับ · ภายใน 60 วิไม่ขยับซ้ำ (throttle)', async ({ page }) => {
  await loginAs(page, 'chair1');
  await expect(page.locator('h1')).toBeVisible();

  // pointerdown บนหน้าหลัก
  let old = await ageSession(page, 10 * 60_000);
  await page.locator('h1').click();
  await expect.poll(() => lastActive(page)).toBeGreaterThan(old + 9 * 60_000);

  // throttle: คลิกซ้ำทันที → ค่าเดิม
  const fresh = (await lastActive(page))!;
  await page.locator('h1').click();
  await page.waitForTimeout(300);
  expect(await lastActive(page)).toBe(fresh);

  // keydown
  old = await ageSession(page, 10 * 60_000);
  await page.keyboard.press('Shift');
  await expect.poll(() => lastActive(page)).toBeGreaterThan(old + 9 * 60_000);

  // input ในหน้าที่ไม่ใช่ SAR editor (ค้นหาหลักฐาน)
  await page.goto('/app/evidence');
  await expect(page.getByTestId('ev-search')).toBeVisible();
  old = await ageSession(page, 10 * 60_000);
  await page.getByTestId('ev-search').evaluate((el: HTMLInputElement) => { el.value = 'abc'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => lastActive(page)).toBeGreaterThan(old + 9 * 60_000);

  // เปลี่ยนหน้าด้วยเมนู (client-side) ก็นับ
  old = await ageSession(page, 10 * 60_000);
  await page.getByTestId('nav-cycles').click();
  await page.waitForURL('**/app/cycles');
  await expect.poll(() => lastActive(page)).toBeGreaterThan(old + 9 * 60_000);
});

// ─────────────────────────── U-2 ───────────────────────────
/** แท็บ A เปิด 3.6 (client-side จากแดชบอร์ด) พิมพ์อ้างหลักฐานที่ไม่มี → แท็บ B logout → A อยู่ในสถานะ session-lost */
async function enterSessionLost(page: Page) {
  await loginAs(page, 'chair1');
  await page.goto(`/app/cycles/${encodeURIComponent(DEMO_CYCLE)}`);
  await page.getByTestId('heat-3.6').click();
  await page.waitForURL(/\/app\/sections\//);
  await expect(page.getByTestId('sar-editor')).toBeVisible();
  const text = `ข้อความค้าง U-2 อ้างหลักฐานที่ไม่มี [E-9.9-99] ${Date.now()}`;
  await page.getByTestId('narrative-th').fill(text);

  const b = await page.context().newPage();
  await b.goto('/app');
  await expect(b.getByTestId('nav-user')).toBeVisible();
  await logoutViaMenu(b);
  await expect.poll(() => b.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();
  await b.close();

  await expect(page.getByTestId('shell-lost')).toBeVisible({ timeout: 20_000 });
  return text;
}

test('U-2 sessionLost: เมนูหาย ข้อความค้างอยู่ · คลิกลิงก์ = ถามก่อน "กลับไปคัดลอก" อยู่หน้าเดิม · เปลี่ยนหน้า (Back) → /login?reason=other-tab', async ({ page }) => {
  const text = await enterSessionLost(page);
  const url = page.url();
  await expect(page.getByTestId('session-lost')).toContainText('ข้อ 3.6');
  await expect(page.getByTestId('nav-user')).toHaveCount(0);
  await expect(page.getByTestId('nav-home')).toHaveCount(0);
  await expect(page.getByTestId('logout')).toHaveCount(0);
  await expect(page.getByTestId('user-menu')).toHaveCount(0);           // R2: logout อยู่ในเมนูผู้ใช้ — เมนูต้องหายด้วย
  await expect(page.getByTestId('narrative-th')).toHaveValue(text);

  // คลิกลิงก์ในเนื้อหา → dialog ถามก่อน · ยกเลิก = อยู่หน้าเดิม ข้อความครบ
  await page.getByRole('link', { name: 'แดชบอร์ดรอบ' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ออกจากระบบแล้ว');
  await dlg.getByRole('button', { name: 'กลับไปคัดลอกข้อความ' }).click();
  await expect(dlg).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.getByTestId('shell-lost')).toBeVisible();
  await expect(page.getByTestId('narrative-th')).toHaveValue(text);

  // เปลี่ยนหน้า (Back ไปแดชบอร์ด) → ออกจริง
  await page.goBack();
  await page.waitForURL(/\/login\?reason=other-tab/, { timeout: 20_000 });
  await expect(page.getByText('ออกจากระบบจากแท็บอื่นแล้ว')).toBeVisible();
});

for (const how of ['ยืนยันใน dialog', 'ปุ่ม session-lost-login'] as const) {
  test(`U-2 sessionLost → ${how} → /login?reason=other-tab และไม่มี session ค้าง`, async ({ page }) => {
    await enterSessionLost(page);
    if (how === 'ยืนยันใน dialog') {
      await page.getByRole('link', { name: 'แดชบอร์ดรอบ' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'ยืนยันไปหน้าเข้าสู่ระบบ' }).click();
    } else {
      await page.getByTestId('session-lost-login').click();
    }
    await page.waitForURL(/\/login\?reason=other-tab/, { timeout: 20_000 });
    expect(await page.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();
    // กลับเข้า /app ตรง ๆ ไม่ได้
    await page.goto('/app');
    await page.waitForURL(/\/login/);
  });
}

// ─────────────────────────── UX-U3-1 ───────────────────────────
test('UX-U3-1 ประธานส่งข้อ 1.5 กลับ → return-reason (ผู้ส่ง + เหตุผล) + review-history · เจ้าของข้อ (staff1) เห็นเหมือนกัน · ข้ออื่นไม่มี', async ({ page }) => {
  const note = `ขอเพิ่มหลักฐานผลลัพธ์ปี 2568 (UX-U3-1 ${Date.now()})`;
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '1.5');
  await expect(page.getByTestId('return-reason')).toHaveCount(0);
  await page.getByTestId('section-return').click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('textarea').fill(note);
  await dlg.getByRole('button', { name: 'ยืนยันส่งกลับแก้ไข' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByText('เปิดข้อถัดไปในคิว')).toBeVisible();

  const rr = page.getByTestId('return-reason');
  await expect(rr).toBeVisible();
  await expect(rr).toContainText(note);
  await expect(rr).toContainText('ส่งกลับแก้ไขเมื่อ');
  await page.getByTestId('sidetab-history').click();
  await expect(page.getByTestId('review-history')).toContainText(note);

  await loginAs(page, 'staff1');
  await openSection(page, DEMO_CYCLE, '1.5');
  await expect(page.getByTestId('return-reason')).toContainText(note);
  await expect(page.getByTestId('narrative-th')).toBeEditable();
  await page.getByTestId('sidetab-history').click();
  await expect(page.getByTestId('review-history')).toContainText(note);

  // ข้อที่ไม่ได้ถูกส่งกลับ → ไม่มี return-reason
  await openSection(page, DEMO_CYCLE, '6.6');
  await expect(page.getByTestId('return-reason')).toHaveCount(0);
});

// ─────────────────────────── U3P-1 ───────────────────────────
test('U3P-1 /app/sections/<id ผิด> → "ไม่พบข้อนี้" ไม่มีคำว่า undefined ทุกแบบ', async ({ page }) => {
  await loginAs(page, 'chair1');
  await page.goto('/app/sections/xxx');
  await expect(page.locator('h1')).toHaveText('ไม่พบข้อนี้');
  await expect(page.getByRole('link', { name: 'ไปหน้ารอบประเมิน' })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/undefined|NaN/);
  expect(await page.title()).not.toMatch(/undefined/);

  for (const bad of [`${DEMO_CYCLE}::99.9`, 'no-cycle::1.1', '::']) {
    await page.goto(`/app/sections/${encodeURIComponent(bad)}`);
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('sar-editor')).toHaveCount(0);
    const txt = await page.locator('main').innerText();
    expect(txt, bad).not.toMatch(/undefined|NaN/);
  }
});

// ─────────────────────────── U3P-2 ───────────────────────────
test('U3P-2 สองแท็บ: B บันทึก → A พิมพ์ → dialog conflict + save-conflict · ไม่ทับงาน B · คัดลอกได้ · conflict-reload ได้ฉบับ B แล้วบันทึกต่อได้', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '3.6');

  const b = await context.newPage();
  await b.goto(sectionUrl(DEMO_CYCLE, '3.6'));
  await expect(b.getByTestId('sar-editor')).toBeVisible();
  const textB = `ฉบับแท็บ B ${Date.now()}`;
  await b.getByTestId('narrative-th').fill(textB);
  await b.getByTestId('save-manual').click();
  await expect.poll(() => storedNarrative(b, SID36)).toBe(textB);
  await b.close();

  const textA = `ฉบับแท็บ A ${Date.now()}`;
  await page.getByTestId('narrative-th').fill(textA);
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ข้อนี้ถูกแก้จากที่อื่น', { timeout: 15_000 });
  await expect(dlg).toContainText('เนื้อหาของข้อนี้ถูกแก้จากที่อื่น');
  await dlg.getByRole('button', { name: 'คัดลอกข้อความของฉันก่อน' }).click();
  await expect(dlg).toBeHidden();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(textA);

  await expect(page.getByTestId('save-conflict')).toBeVisible();
  await expect(page.getByTestId('narrative-th')).toHaveValue(textA);   // ข้อความของฉันยังอยู่
  await page.waitForTimeout(2_500);                                     // autosave หยุด (debounce 1.5 วิ)
  expect(await storedNarrative(page, SID36)).toBe(textB);              // ไม่ทับงาน B

  await page.getByTestId('conflict-reload').click();
  await expect(page.getByTestId('narrative-th')).toHaveValue(textB);
  await expect(page.getByTestId('save-conflict')).toHaveCount(0);

  // หลังโหลดล่าสุด บันทึกต่อได้ตามปกติ (base ใหม่)
  const textA2 = `${textB} + ต่อจากแท็บ A`;
  await page.getByTestId('narrative-th').fill(textA2);
  await expect.poll(() => storedNarrative(page, SID36), { timeout: 10_000 }).toBe(textA2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('save-conflict')).toHaveCount(0);
});

test('U3P-2 แท็บเดียวบันทึกต่อเนื่องหลายครั้ง (autosave + บันทึกเอง) → ไม่เกิด conflict ปลอม', async ({ page }) => {
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '3.6');
  for (let i = 1; i <= 3; i++) {
    const t = `บันทึกครั้งที่ ${i} ${Date.now()}`;
    await page.getByTestId('narrative-th').fill(t);
    await expect.poll(() => storedNarrative(page, SID36), { timeout: 10_000 }).toBe(t);
  }
  const t4 = `บันทึกเอง ${Date.now()}`;
  await page.getByTestId('narrative-th').fill(t4);
  await page.getByTestId('save-manual').click();
  await expect.poll(() => storedNarrative(page, SID36)).toBe(t4);
  await page.getByTestId('narrative-th').fill(`${t4} ต่อ`);
  await expect.poll(() => storedNarrative(page, SID36), { timeout: 10_000 }).toBe(`${t4} ต่อ`);
  await expect(page.getByTestId('save-conflict')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// ─────────────────────────── AC-14 ───────────────────────────
test('AC-14 staff1: home-add-evidence → ฟอร์มเปิดทันที · อัปโหลด + ผูก 1 ข้อ ใช้ ≤ 6 action หลัก', async ({ page }) => {
  await loginAs(page, 'staff1');
  let actions = 0;
  const act = async (fn: () => Promise<unknown>) => { actions++; await fn(); };
  const title = `หลักฐาน AC-14 ชุด ${Date.now() % 100_000}`; // ห้ามใช้เลข 13 หลัก (ถูกตรวจเป็นเลขบัตรประชาชน)

  await act(() => page.getByTestId('home-add-evidence').click());
  await page.waitForURL(/\/app\/evidence\?new=1/);
  await expect(page.getByTestId('ev-form')).toBeVisible();
  await act(() => page.getByTestId('ev-title').fill(title));
  await act(() => page.getByTestId('ev-file').setInputFiles({ name: 'meeting.txt', mimeType: 'text/plain', buffer: Buffer.from('รายงานการประชุมสมมติ ไม่มีข้อมูลส่วนบุคคล', 'utf8') }));
  await act(() => page.getByTestId('ev-f-reqs-input').fill('1.1'));
  await act(() => page.getByTestId('ev-f-req-opt-1.1').click());
  await expect(page.getByTestId('ev-f-req-chip-1.1')).toBeVisible();
  await act(() => page.getByTestId('ev-submit').click());

  const row = page.getByTestId('ev-table').locator('tr', { hasText: title });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('1.1');
  expect(actions).toBeLessThanOrEqual(6);
});

test('AC-14 ผู้ไม่มีสิทธิ์เพิ่มหลักฐาน (assess1) ไม่เห็น home-add-evidence', async ({ page }) => {
  await loginAs(page, 'assess1');
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('home-add-evidence')).toHaveCount(0);
});

// ─────────────────────────── U-3 ───────────────────────────
test('U-3 dialog เกิดพร้อมกัน (logout flush ไม่ผ่านเพราะ conflict + dialog conflict) → แสดงทีละตัว ไม่ทับ ครบทั้งสอง', async ({ page, context }) => {
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '3.6');
  const b = await context.newPage();
  await b.goto(sectionUrl(DEMO_CYCLE, '3.6'));
  const textB = `U-3 แท็บ B ${Date.now()}`;
  await b.getByTestId('narrative-th').fill(textB);
  await b.getByTestId('save-manual').click();
  await expect.poll(() => storedNarrative(b, SID36)).toBe(textB);
  await b.close();

  // R2 (Q2c): logout อยู่ในเมนูผู้ใช้ — การคลิกเปิดเมนูหลังพิมพ์ทำให้ textarea blur → autosave เจอ conflict ก่อนถึงปุ่ม logout
  // (พฤติกรรมถูกต้อง: blur = บันทึกทันที) → เปิดเมนูก่อนพิมพ์ (fill ไม่ส่ง mousedown เมนูจึงยังเปิด) แล้วกด logout = กลไกเดียวกับปุ่มเดิมใน sidebar
  await openUserMenu(page);
  await page.getByTestId('narrative-th').fill(`U-3 แท็บ A ${Date.now()}`);
  await logoutViaMenu(page);   // ก่อน autosave → flush เจอ conflict → dialog logout + dialog conflict

  const seen: string[] = [];
  const dialogs = page.getByRole('dialog');
  for (let i = 0; i < 2; i++) {
    await expect(dialogs).toHaveCount(1);
    await expect(dialogs).toContainText(/ยังบันทึกงานไม่ได้|ข้อนี้ถูกแก้จากที่อื่น/);
    const txt = await dialogs.innerText();
    if (txt.includes('ยังบันทึกงานไม่ได้')) { seen.push('logout'); await dialogs.getByRole('button', { name: 'กลับไปแก้' }).click(); }
    else { seen.push('conflict'); await dialogs.getByRole('button', { name: 'ยืนยันโหลดฉบับล่าสุด' }).click(); }
    await page.waitForTimeout(300);
  }
  expect(seen.sort()).toEqual(['conflict', 'logout']);
  await expect(dialogs).toHaveCount(0);
  await expect(page.getByTestId('nav-user')).toBeVisible();              // ยังไม่ออก (เลือกกลับไปแก้)
  await expect(page.getByTestId('narrative-th')).toHaveValue(textB);     // โหลดฉบับล่าสุดแล้ว
});

// ─────────────────────────── review round 2 (frontend-dev, orchestrator อนุญาตเฉพาะ 2 เคสนี้) ───────────────────────────
test('U2-1 dialog conflict เปิดอยู่ แล้วออกจากระบบจากแท็บอื่น → dialog ถูกปิดโดยไม่คัดลอกข้อความลง clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '3.6');
  const SENTINEL = `clipboard-เดิม-${Date.now()}`;
  await page.evaluate(t => navigator.clipboard.writeText(t), SENTINEL);

  const b = await context.newPage();
  await b.goto(sectionUrl(DEMO_CYCLE, '3.6'));
  const textB = `U2-1 แท็บ B ${Date.now()}`;
  await b.getByTestId('narrative-th').fill(textB);
  await b.getByTestId('save-manual').click();
  await expect.poll(() => storedNarrative(b, SID36)).toBe(textB);

  const textA = `U2-1 แท็บ A ${Date.now()}`;
  await page.getByTestId('narrative-th').fill(textA);
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ข้อนี้ถูกแก้จากที่อื่น', { timeout: 15_000 });

  // แท็บ B ออกจากระบบ ขณะ dialog conflict ของแท็บ A ยังเปิดอยู่
  await b.goto('/app');
  await logoutViaMenu(b);
  await expect.poll(() => b.evaluate(() => localStorage.getItem('aunqa_session'))).toBeNull();
  await b.close();

  await expect(page.getByTestId('shell-lost')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('ข้อนี้ถูกแก้จากที่อื่น', { exact: true })).toHaveCount(0);  // dialog conflict ถูกปิดแล้ว
  await expect(page.getByText('คัดลอกข้อความของคุณแล้ว')).toHaveCount(0);
  await expect(page.getByText('คัดลอกไม่สำเร็จ', { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SENTINEL);
  await expect(page.getByTestId('narrative-th')).toHaveValue(textA);   // ข้อความยังอยู่ให้ผู้ใช้คัดลอกเอง
});

test('U2-2 sessionLost: select ที่โฟกัสอยู่เปลี่ยนค่าด้วยลูกศร/ตัวอักษรไม่ได้ · Enter บนปุ่ม = ถามก่อน ไม่ทำ action', async ({ page }) => {
  await enterSessionLost(page);
  // ใน section editor ทุก select ถูก disable แล้วเมื่อ sessionLost → ใส่ select ที่ยังเปิดอยู่ในเนื้อหา (แทน select ที่เขียนข้อมูลใน onChange
  // ของหน้าอื่น เช่น owner-{id}) เพื่อพิสูจน์ว่าตัวกันคีย์บอร์ดของ AppShell ครอบทั้ง <main>
  await page.evaluate(() => {
    const s = document.createElement('select');
    s.dataset.testid = 'probe-select';
    ['1', '2', '3', '4', '5'].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; s.appendChild(o); });
    document.querySelector('[data-testid="sar-editor"]')!.appendChild(s);
  });
  const sel = page.getByTestId('probe-select');
  await expect(sel).toBeEnabled();
  const before = await sel.inputValue();
  await sel.focus();
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'End', '5']) await page.keyboard.press(k);
  await page.waitForTimeout(300);
  expect(await sel.inputValue()).toBe(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Enter บนปุ่มในเนื้อหา → dialog ถามก่อน ยกเลิกแล้วยังอยู่หน้าเดิม
  const url = page.url();
  await page.getByTestId('sidetab-history').focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ออกจากระบบแล้ว');
  await dlg.getByRole('button', { name: 'กลับไปคัดลอกข้อความ' }).click();
  await expect(dlg).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.getByTestId('shell-lost')).toBeVisible();
});
