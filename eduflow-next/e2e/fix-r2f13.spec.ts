/**
 * TASK-0002 เฟส 6 (หลังรอบแก้เฟส 7 รอบที่ 2: R2-F13) — regression ของ finding จาก ui-inspector / playtester
 * - N1  /app/review: ปุ่ม อนุมัติ / เปิดอ่าน / ส่งกลับ อยู่ในกรอบ wrapper ครบ (ไม่ต้องเลื่อนแนวนอน) ที่ 1440/1280/1024/768
 * - N3  ป้ายขอบเขตกรรมการ = "รอบ 2569 · <รหัสหลักสูตร>" ไม่มีรหัสภายใน (cycle-demo-…) ทั้งในตารางผู้ใช้และตัวเลือกขอบเขต
 * - N5  <html lang> ตามภาษาที่เลือก (en หลังเลือก English, คงหลัง reload, กลับ th ได้)
 * - N6  แท็บ admin ที่ 390: ป้ายสั้น + แถบแท็บไม่ล้น (ทุกแท็บอยู่ในกรอบ)
 * - P11 dialog ตรวจรับ = "ตรวจรับแผนปรับปรุง" (ไม่ใช่ action) · ยกเลิก = สถานะเดิม
 * - P12 รอบที่มีกรรมการ 2 คน: คนแรกส่งผล → dialog บอกจำนวนกรรมการ + `assess-waiting` มีชื่อคนที่ยังขาด ไม่มี toast error · คนสุดท้ายส่ง → ประเมินแล้ว
 * ข้อมูลทดสอบเป็นข้อมูลสมมติ (ไม่มีเลข 13 หลัก) · ทุก test = context ใหม่
 */
import { test, expect, type Page } from '@playwright/test';
import { DEMO_CYCLE, dialogOk, driveToLocked, loginAs, transitionAs } from './helpers';

const suffix = () => String(Date.now() % 100000);
const ASSESS1_NAME = 'ศ.ดร.วรรณา ผู้ประเมินภายนอก';

// ─────────────────────────── N1 ───────────────────────────
test.describe('N1 /app/review ปุ่มท้ายแถวมองเห็นครบ', () => {
  for (const w of [1440, 1280, 1024, 768]) {
    test(`@${w}: approve-* / เปิดอ่าน / return-* ทุกแถวอยู่ในกรอบ wrapper + ไม่มี h-scroll ของตาราง/หน้า`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await loginAs(page, 'chair1');
      await page.goto('/app/review');
      const table = page.getByTestId('review-table');
      await expect(table).toBeVisible();
      await expect(table.locator('[data-testid^="approve-"]').first()).toBeVisible();
      await expect(table.locator('[data-testid^="return-"]').first()).toBeVisible();
      const r = await table.evaluate(t => {
        let wrap: HTMLElement | null = t.parentElement;
        while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
        const box = (wrap ?? document.documentElement).getBoundingClientRect();
        const rows = Array.from(t.querySelectorAll('tbody tr'));
        const bad: string[] = [];
        let buttons = 0;
        for (const row of rows) {
          const els = Array.from(row.querySelectorAll<HTMLElement>('[data-testid^="approve-"], [data-testid^="return-"], a'))
            .filter(e => e.closest('td') === row.lastElementChild); // เฉพาะเซลล์การกระทำ
          for (const e of els) {
            buttons++;
            const b = e.getBoundingClientRect();
            if (b.width === 0 || b.left < box.left - 1 || b.right > box.right + 1 || b.right > window.innerWidth + 1) {
              bad.push(`${e.dataset.testid || e.innerText.trim()} L${Math.round(b.left)} R${Math.round(b.right)} box ${Math.round(box.left)}-${Math.round(box.right)}`);
            }
          }
        }
        return {
          rows: rows.length, buttons, bad,
          wrapOverflow: wrap ? wrap.scrollWidth - wrap.clientWidth : 0,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(r.rows).toBeGreaterThan(0);
      expect(r.buttons).toBeGreaterThanOrEqual(r.rows * 2); // อย่างน้อย เปิดอ่าน + อนุมัติ/ส่งกลับ ต่อแถว
      expect(r.bad, 'ปุ่มที่ถูกตัด/ล้นกรอบ').toEqual([]);
      expect(r.wrapOverflow, 'wrapper ตารางต้องไม่เลื่อนแนวนอน').toBeLessThanOrEqual(1);
      expect(r.pageOverflow, 'หน้าไม่ต้องเลื่อนแนวนอน').toBeLessThanOrEqual(1);
      // ปุ่มกดได้จริงโดยไม่ต้องเลื่อนแนวนอน (Playwright จะ scroll แนวตั้งเท่านั้น)
      const ret = table.locator('[data-testid^="return-"]').first();
      await ret.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
    });
  }
});

// ─────────────────────────── N3 ───────────────────────────
test.describe('N3 ป้ายขอบเขตกรรมการไม่มีรหัสภายใน', () => {
  test('uadmin: แถว/แผงจัดการ assess1 + ตัวเลือก nu-scope ของบทบาทกรรมการ = "รอบ 2569 · …" ไม่มี cycle-demo', async ({ page }) => {
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    // แถว: ป้ายบทบาทมี title = ขอบเขต · แผงจัดการใต้แถวแสดงขอบเขตเป็นข้อความ (R2-F10)
    const row = page.getByTestId('user-assess1');
    const titles = await row.locator('[title]').evaluateAll(es => es.map(e => e.getAttribute('title') || ''));
    expect(titles.some(t => /^รอบ 2569 · \S+/.test(t)), titles.join(' | ')).toBe(true);
    expect(titles.filter(t => t.includes('cycle-'))).toEqual([]);
    await page.getByTestId('user-manage-assess1').click();
    const panel = page.getByTestId('user-panel-assess1');
    await expect(panel).toContainText(/รอบ 2569 · \S+/);
    await expect(panel).not.toContainText(DEMO_CYCLE);
    await expect(panel).not.toContainText('cycle-');
    await page.getByTestId('user-panel-close-assess1').click();

    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-role').selectOption('assessor');
    const opts = await page.getByTestId('nu-scope').locator('option').allInnerTexts();
    expect(opts.some(o => /^รอบ 2569 · \S+/.test(o.trim())), opts.join(' | ')).toBe(true);
    expect(opts.filter(o => /cycle-|cycle_/.test(o)), 'option มีรหัสภายใน').toEqual([]);
    // value ยังเป็น key ภายใน (ไม่กระทบการบันทึก) — แค่ป้ายที่เปลี่ยน
    const vals = await page.getByTestId('nu-scope').locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
    expect(vals).toContain(`cycle:${DEMO_CYCLE}`);
  });
});

// ─────────────────────────── N5 ───────────────────────────
test.describe('N5 <html lang> ตามภาษาที่เลือก', () => {
  for (const [url, user] of [['/login', undefined], ['/app', 'chair1']] as const) {
    test(`${url}: เริ่ม th → English = "en" → reload ยัง "en" → ไทย = "th"`, async ({ page }) => {
      if (user) await loginAs(page, user);
      await page.goto(url);
      await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('html')).toHaveAttribute('lang', 'th');
      await page.getByTestId('lang-en').click();
      await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.reload();
      await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.getByTestId('lang-th').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'th');
    });
  }
});

// ─────────────────────────── N6 ───────────────────────────
test.describe('N6 แท็บ admin ที่ 390', () => {
  test('uadmin @390: ป้ายสั้น ผู้ใช้/คำขอ/Audit log/เดโม่ · แถบแท็บไม่ล้น ทุกแท็บอยู่ในกรอบ · @1440 ป้ายเต็ม', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    const list = page.getByRole('tablist', { name: 'ส่วนของผู้ดูแลระบบ' });
    await expect(list).toBeVisible();
    expect(await page.getByTestId('tab-users').innerText()).toBe('ผู้ใช้');
    expect((await page.getByTestId('tab-requests').innerText()).replace(/\s*\d+\s*$/, '').trim()).toBe('คำขอ');
    const r = await list.evaluate(l => {
      const box = l.getBoundingClientRect();
      const tabs = Array.from(l.querySelectorAll<HTMLElement>('[role="tab"]'));
      return {
        overflow: l.scrollWidth - l.clientWidth,
        labels: tabs.map(t => t.innerText.trim()),
        out: tabs.filter(t => { const b = t.getBoundingClientRect(); return b.left < box.left - 1 || b.right > box.right + 1; }).map(t => t.innerText.trim()),
      };
    });
    expect(r.overflow, `แถบแท็บล้น: ${r.labels.join(' | ')}`).toBeLessThanOrEqual(1);
    expect(r.out, 'แท็บที่หลุดกรอบ').toEqual([]);
    expect(r.labels.some(l => l.startsWith('Audit log'))).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => page.getByTestId('tab-users').innerText()).toBe('ผู้ใช้และบทบาท'); // innerText = ป้ายที่มองเห็น
  });
});

// ─────────────────────────── P11 ───────────────────────────
test.describe('P11 dialog ตรวจรับแผนปรับปรุง', () => {
  test('chair1 ตรวจรับ act-5 (ทำเสร็จแล้ว): หัว "ตรวจรับแผนปรับปรุง" + "แผนปรับปรุงนี้จะกลายเป็น…" · ยกเลิก = สถานะเดิม · ยืนยัน = ตรวจรับแล้ว', async ({ page }) => {
    await loginAs(page, 'chair1');
    await page.goto('/app/actions');
    const row = page.getByTestId('action-act-5');
    await expect(row.getByTestId('action-status')).toHaveText('ทำเสร็จแล้ว (รอตรวจ)');
    await row.getByTestId('action-to-verified').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('heading')).toHaveText('ตรวจรับแผนปรับปรุง');
    await expect(dlg).toContainText('แผนปรับปรุงนี้จะกลายเป็นหลักฐานขั้น A');
    await expect(dlg).not.toContainText('action');
    await dlg.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(row.getByTestId('action-status')).toHaveText('ทำเสร็จแล้ว (รอตรวจ)');

    await row.getByTestId('action-to-verified').click();
    await page.getByRole('dialog').getByRole('button', { name: 'ยืนยันตรวจรับ' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(row.getByTestId('action-status')).toHaveText('ตรวจรับแล้ว');
  });
});

// ─────────────────────────── P12 ───────────────────────────
test.describe('P12 กรรมการหลายคน: คนแรกส่งผล', () => {
  async function rateAll(page: Page, verdict: string) {
    await page.goto(`/app/cycles/${DEMO_CYCLE}/assess`);
    for (let c = 1; c <= 8; c++) {
      await page.getByTestId(`assess-crit-${c}`).click();
      await page.getByTestId('crit-score').selectOption('4');
      await page.getByTestId('crit-why').fill(`เหตุผลเกณฑ์ ${c} (ทดสอบ P12)`);
      await page.getByTestId('crit-save').click();
      await expect(page.getByTestId('rated-count')).toHaveText(`${c}/8`);
    }
    await page.getByTestId('verdict-score').selectOption(verdict);
    await page.getByTestId('verdict-why').fill('verdict ทดสอบ P12');
    await page.getByTestId('verdict-save').click();
    await expect(page.getByTestId('assess-finish')).toBeEnabled();
  }

  test('กรรมการใหม่ส่งก่อน → dialog "ส่งผลการประเมินของคุณ" + "กรรมการ 2 คน" · assess-waiting มีชื่อ assess1 · ไม่มี toast error · รอบยังไม่ประเมินแล้ว → assess1 ส่ง = ประเมินแล้ว', async ({ page }) => {
    test.setTimeout(360_000);
    const s = suffix();
    const username = `as${s}`;
    const name = `ศ.กรรมการ ทดสอบ ${s}`;
    const pw = 'assesspw1';
    // uadmin สร้างกรรมการคนที่ 2 ของรอบเดโม่ (ตั้งรหัสให้เลย → active)
    await loginAs(page, 'uadmin');
    await page.goto('/app/admin');
    await page.getByTestId('user-new').click();
    await page.getByTestId('nu-username').fill(username);
    await page.getByTestId('nu-name').fill(name);
    await page.getByTestId('nu-email').fill(`${username}@sample-uni.example`);
    await page.getByTestId('nu-role').selectOption('assessor');
    await page.getByTestId('nu-scope').selectOption(`cycle:${DEMO_CYCLE}`);
    await page.getByTestId('nu-mode-password').check();
    await page.getByTestId('nu-password').fill(pw);
    await page.getByTestId('nu-submit').click();
    await expect(page.getByTestId(`user-${username}`)).toBeVisible();
    await expect(page.getByTestId(`user-status-${username}`)).toHaveText('ใช้งานอยู่');

    await driveToLocked(page);
    await transitionAs(page, 'fqa1', 'under_assessment');

    await loginAs(page, username, pw);
    await rateAll(page, '4');
    await page.getByTestId('assess-finish').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('heading')).toHaveText('ส่งผลการประเมินของคุณ');
    await expect(dlg).toContainText('รอบนี้มีกรรมการ 2 คน');
    await dlg.getByRole('button', { name: 'ยืนยันส่งผลการประเมิน' }).click();
    await expect(dlg).toBeHidden();
    const waiting = page.getByTestId('assess-waiting');
    await expect(waiting).toContainText('ผลของคุณครบและบันทึกไว้แล้ว');
    await expect(waiting).toContainText(ASSESS1_NAME);
    await expect(waiting).not.toContainText(name);
    await expect(page.locator('[data-testid="toast"][role="alert"]')).toHaveCount(0);
    // รอบยังไม่ "ประเมินแล้ว": ปุ่มส่งผลยังอยู่ และไม่มีข้อความส่งผลแล้ว
    await expect(page.getByTestId('assess-finish')).toBeVisible();
    await expect(page.getByTestId('assess-notopen')).toHaveCount(0);

    // คนสุดท้าย (assess1) ส่ง → ประเมินแล้ว · dialog ยังบอกว่ามีหลายคน · ไม่มี assess-waiting
    await loginAs(page, 'assess1');
    await rateAll(page, '5');
    await page.getByTestId('assess-finish').click();
    await expect(page.getByRole('dialog')).toContainText('รอบนี้มีกรรมการ 2 คน');
    await dialogOk(page);
    await expect(page.getByTestId('assess-notopen')).toContainText('ส่งผลประเมินแล้ว');
    await expect(page.getByTestId('assess-waiting')).toHaveCount(0);
    await expect(page.locator('[data-testid="toast"][role="alert"]')).toHaveCount(0);
  });

  test('กรรมการคนเดียว (seed): dialog = "ส่งผลการประเมิน" ข้อความเดิม ไม่พูดถึงจำนวนกรรมการ (negative)', async ({ page }) => {
    test.setTimeout(300_000);
    await driveToLocked(page);
    await transitionAs(page, 'fqa1', 'under_assessment');
    await loginAs(page, 'assess1');
    await rateAll(page, '4');
    await page.getByTestId('assess-finish').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading')).toHaveText('ส่งผลการประเมิน');
    await expect(dlg).not.toContainText('กรรมการ 2 คน');
    await dlg.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(dlg).toBeHidden();
  });
});
