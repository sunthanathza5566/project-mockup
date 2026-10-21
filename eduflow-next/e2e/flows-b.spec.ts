/**
 * TASK-0001 C3b — E2E-08..14 (spec 16.2)
 * ทุก test = browser context ใหม่ → localStorage/sessionStorage ว่าง → seed เดโม่ใหม่
 */
import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import fs from 'node:fs';
import {
  DEMO_CYCLE, dialogOk, driveToLocked, driveToUnderReview, loginAs, openSection, transitionAs,
} from './helpers';

test('E2E-08 QA คณะส่งกลับแก้ → รอบเป็น revision_requested และเจ้าของข้อ (staff1) ได้แจ้งเตือน', async ({ page }) => {
  test.setTimeout(240_000);
  await driveToUnderReview(page);
  const note = 'เกณฑ์ 4 ยังขาดหลักฐานการทวนสอบ (E2E-08)';
  await transitionAs(page, 'fqa1', 'revision_requested', note);
  await expect(page.getByTestId('cycle-actions')).toBeHidden();             // QA ไม่มีขั้นถัดไปแล้ว
  await expect(page.getByText('ส่งกลับแก้ไข').first()).toBeVisible();      // badge สถานะรอบ
  // สถานะรอบที่หน้ารายการรอบ
  await page.goto('/app/cycles');
  await expect(page.getByTestId('cycles-table').locator('tr', { hasText: '2569' })).toContainText('ส่งกลับแก้ไข');

  await loginAs(page, 'staff1');
  const list = page.getByTestId('noti-list');
  await expect(list).toContainText('ถูกส่งกลับแก้');
  await expect(list).toContainText(note);
  await expect(page.getByTestId('nav-bell')).toHaveAttribute('aria-label', /ที่ยังไม่อ่าน [1-9]/);
});

test('E2E-09 คณบดีอนุมัติ → รอบ lock มี snapshot hash ตรวจผ่าน และแก้เนื้อหาไม่ได้', async ({ page }) => {
  test.setTimeout(240_000);
  await driveToLocked(page);
  const banner = page.getByTestId('lock-banner');
  await expect(banner).toContainText('ถูกล็อก');
  await expect(banner).toContainText(/hash\s+[0-9a-f]{16}/);
  await expect(banner).toContainText('เนื้อหา SAR ตรงกับที่ล็อก');
  await expect(page.getByTestId('evidence-unchanged')).toBeVisible();

  // แก้ไม่ได้: ประธานเปิดข้อใดก็ได้ → readonly + ไม่มีปุ่มบันทึก/ส่งตรวจ
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '1.1');
  await expect(page.getByTestId('readonly-reason')).toContainText('รอบถูกล็อกแล้ว');
  await expect(page.getByTestId('narrative-th')).toHaveAttribute('readonly', '');
  await expect(page.getByTestId('save-manual')).toBeHidden();
  await expect(page.getByTestId('section-submit')).toBeHidden();
  await expect(page.getByTestId('self-save')).toBeHidden();
});

test('E2E-10 Export SAR DOCX → ดาวน์โหลดได้ 53 ข้อเรียงถูก evidence index ตรงกับที่อ้าง', async ({ page }, info) => {
  await loginAs(page, 'chair1');
  await page.goto('/app/export');
  await expect(page.getByTestId('x-cycle')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-sar-docx').click()]);
  expect(dl.suggestedFilename()).toMatch(/^SAR_.*\.docx$/);
  const path = info.outputPath('sar.docx');
  await dl.saveAs(path);
  const zip = await JSZip.loadAsync(fs.readFileSync(path));
  expect(fs.readFileSync(path).subarray(0, 2).toString()).toBe('PK');
  const xml = await zip.file('word/document.xml')!.async('string');
  const textOf = (p: string) => Array.from(p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map(m => m[1]).join('');
  const paras = xml.split('</w:p>');
  const ids = paras.filter(p => /<w:pStyle w:val="Heading3"/.test(p)).map(p => textOf(p).split(' ')[0]);
  expect(ids).toHaveLength(53);
  expect(new Set(ids).size).toBe(53);
  const num = (id: string) => { const [a, b] = id.split('.').map(Number); return a * 100 + b; };
  expect(ids).toEqual([...ids].sort((a, b) => num(a) - num(b)));          // เรียงตามเกณฑ์/ข้อ
  expect(paras.filter(p => /<w:pStyle w:val="Heading2"/.test(p))).toHaveLength(8);
  // evidence index: ทุกรหัส [E-…] ที่อ้างในเนื้อหามี bookmark ใน index, anchor ทุกตัวมีปลายทาง
  const marks = new Set(Array.from(xml.matchAll(/<w:bookmarkStart [^>]*w:name="([^"]+)"/g)).map(m => m[1]));
  const anchors = Array.from(xml.matchAll(/<w:hyperlink [^>]*w:anchor="([^"]+)"/g)).map(m => m[1]);
  expect(anchors.length).toBeGreaterThan(0);
  for (const a of anchors) expect(marks.has(a), `anchor ${a} ไม่มี bookmark`).toBe(true);
  const runs = Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map(m => m[1]);   // แยกทีละ run กันตัวเลขของ run ถัดไปต่อท้ายรหัส
  const cited = new Set(runs.flatMap(t => Array.from(t.matchAll(/E-\d+\.\d+-\d{2,}/g)).map(m => m[0])));
  expect(cited.size).toBeGreaterThan(0);
  for (const c of cited) expect(marks.has('ev_' + c.replace(/[^A-Za-z0-9]/g, '_')), `${c} ไม่อยู่ใน evidence index`).toBe(true);
  await expect(page.getByTestId('export-status')).toContainText('SAR_');
});

test('E2E-11 ผู้ใช้มหาวิทยาลัยอื่น (uadmin2) เปิด URL หลักฐานของ uni-demo → ถูกปฏิเสธ ไม่เห็นเนื้อหา', async ({ page }) => {
  await loginAs(page, 'chair1');
  await page.goto('/app/evidence');
  const first = page.getByTestId('ev-table').locator('tbody tr').first();
  await expect(first).toBeVisible();
  const title = (await first.locator('td').nth(1).innerText()).trim();
  const href = await first.locator('a').first().getAttribute('href');
  expect(href).toMatch(/^\/app\/evidence\//);
  // sanity: เจ้าของเข้าได้
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title.slice(0, 20));

  await loginAs(page, 'uadmin2');
  await page.goto(href!);
  await expect(page.getByTestId('state-error')).toBeVisible();
  await expect(page.getByText(title.slice(0, 20))).toHaveCount(0);
  await expect(page.getByTestId('ev-links')).toHaveCount(0);
  await expect(page.getByTestId('ev-edit')).toHaveCount(0);
  // และไม่เห็นรอบ/หลักฐานของ uni-demo ในหน้ารายการ
  await page.goto('/app/evidence');
  await expect(page.getByText(title.slice(0, 20))).toHaveCount(0);
  await page.goto(`/app/cycles/${DEMO_CYCLE}`);
  await expect(page.getByTestId('state-error')).toBeVisible();
});

test('E2E-12 กรรมการ (assess1) ไม่มีปุ่ม/ช่องแก้ narrative — อ่านอย่างเดียว', async ({ page }) => {
  await loginAs(page, 'assess1');
  await expect(page.getByTestId('readonly-banner')).toBeVisible();
  await openSection(page, DEMO_CYCLE, '1.1');
  await expect(page.getByTestId('readonly-reason')).toBeVisible();
  await expect(page.getByTestId('narrative-th')).toHaveAttribute('readonly', '');
  for (const t of ['save-manual', 'section-submit', 'section-approve', 'section-return', 'ai-draft', 'ai-translate', 'link-btn', 'self-save']) {
    await expect(page.getByTestId(t), `ต้องไม่มีปุ่ม ${t}`).toHaveCount(0);
  }
  // เมนูแก้ไขต่าง ๆ ไม่มี และพิมพ์ในช่อง narrative ไม่เปลี่ยนค่า
  const before = await page.getByTestId('narrative-th').inputValue();
  await page.getByTestId('narrative-th').click({ force: true });
  await page.keyboard.type('พยายามแก้');
  expect(await page.getByTestId('narrative-th').inputValue()).toBe(before);
  await expect(page.getByTestId('nav-curriculum')).toHaveCount(0);
  await expect(page.getByTestId('nav-metrics')).toHaveCount(0);
});

test.skip('E2E-12b กรรมการเรียก API แก้ narrative → 403', async () => {
  // ข้ามเพราะ API เป็นฟังก์ชันใน bundle ฝั่ง client (localStorage) ไม่มี HTTP endpoint ให้ยิง 403 —
  // การปฏิเสธสิทธิ์ของ saveSection สำหรับ assessor ถูกทดสอบแล้วใน vitest (tests/assessor-lock.test.ts)
});

test('E2E-13 กรรมการให้คะแนนรายเกณฑ์ครบ + verdict + ส่งผล → self-rating เดิมของหลักสูตรไม่เปลี่ยน', async ({ page }) => {
  test.setTimeout(300_000);
  await driveToLocked(page);
  await transitionAs(page, 'fqa1', 'under_assessment');

  await loginAs(page, 'assess1');
  const assessUrl = `/app/cycles/${DEMO_CYCLE}/assess`;
  await page.goto(assessUrl);
  const selfOf = async () => {
    const out: string[] = [];
    for (let c = 1; c <= 8; c++) {
      await page.getByTestId(`assess-crit-${c}`).click();
      const t = await page.getByTestId(`assess-panel-${c}`).innerText();
      out.push(...Array.from(t.matchAll(/ประเมินตนเอง: \d+ คะแนน/g)).map(m => `${c}:${m[0]}`));
    }
    return out;
  };
  const before = await selfOf();
  expect(before.length, 'seed ต้องมี self-rating อย่างน้อย 1 ข้อ').toBeGreaterThan(0);
  const secBefore = await (async () => {
    await loginAs(page, 'chair1'); await openSection(page, DEMO_CYCLE, '1.1');
    return page.getByTestId('rating-panel').innerText();
  })();

  await loginAs(page, 'assess1');
  await page.goto(assessUrl);
  for (let c = 1; c <= 8; c++) {
    await page.getByTestId(`assess-crit-${c}`).click();
    await page.getByTestId('crit-score').selectOption('2');          // ต่างจากที่หลักสูตรให้ตัวเอง (ส่วนใหญ่ 4–6)
    await page.getByTestId('crit-why').fill(`เหตุผลเกณฑ์ ${c}`);
    await page.getByTestId('crit-save').click();
    await expect(page.getByTestId('rated-count')).toHaveText(`${c}/8`);
  }
  await page.getByTestId('verdict-score').selectOption('3');
  await page.getByTestId('verdict-why').fill('verdict โดยกรรมการ');
  await page.getByTestId('verdict-save').click();
  await expect(page.getByTestId('assess-finish')).toBeEnabled();
  await page.getByTestId('assess-finish').click();
  await dialogOk(page);
  await expect(page.getByTestId('assess-notopen')).toContainText('ส่งผลประเมินแล้ว');

  expect(await selfOf()).toEqual(before);                            // self-rating ที่กรรมการเห็นไม่เปลี่ยน
  // ฝั่งหลักสูตร: self-rating ข้อ 1.1 ไม่เปลี่ยน + เห็น verdict ของกรรมการ
  await loginAs(page, 'chair1');
  await openSection(page, DEMO_CYCLE, '1.1');
  expect(await page.getByTestId('rating-panel').innerText()).toBe(secBefore);
  await page.goto(assessUrl);
  await expect(page.getByTestId('verdict-row')).toContainText('verdict');
  await expect(page.getByTestId('verdict-row')).toContainText('3');
});

test('E2E-14 import cohort (10 คน) → pass 60 / dropout 20 / time-to-grad 4.14 ตรงมือ และไฟล์รายคนไม่ถูกเก็บ', async ({ page }) => {
  // คำนวณมือ: รุ่น 2563 มี 10 คน — จบ 4 ปี x6, จบ 5 ปี x1, พ้นสภาพ x2, ยังศึกษา x1
  //   pass = จบตามเวลา(≤4ปี)/ทั้งหมด = 6/10 = 60 · dropout = 2/10 = 20 · ttg = (6*4+5)/7 = 4.142… → 4.14
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('cohort');
  ws.addRow(['student_id', 'name', 'cohort', 'status', 'years_to_graduate']);
  for (let i = 0; i < 6; i++) ws.addRow([`6401234567${i}`, `นศ.ลับ${i}`, 2563, 'graduated', 4]);
  ws.addRow(['SECRET-ID-LATE', 'นศ.ลับช้า', 2563, 'graduated', 5]);
  ws.addRow(['SECRET-ID-D1', 'นศ.ลับD1', 2563, 'dropped_out', '']);
  ws.addRow(['SECRET-ID-D2', 'นศ.ลับD2', 2563, 'ลาออก', '']);
  ws.addRow(['SECRET-ID-E', 'นศ.ลับE', 2563, 'enrolled', '']);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  await loginAs(page, 'data1');
  await page.goto('/app/metrics');
  await page.getByTestId('import-panel').locator('summary').click();
  await page.getByTestId('cohort-file').setInputFiles({
    name: 'cohort.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer,
  });
  const row = page.getByTestId('cohort-2563');
  await expect(row).toBeVisible();
  const cells = (await row.locator('td').allInnerTexts()).map(s => s.trim());
  expect(cells).toEqual(['2563', '10', '6', '2', '60', '20', '4.14']);   // รุ่น, จำนวน, จบตามเวลา, พ้นสภาพ, %จบ, %พ้นสภาพ, เวลาเฉลี่ย
  await page.getByTestId('cohort-commit').click();
  await expect(page.getByTestId('metric-pass_rate-2563')).toContainText('60');
  await expect(page.getByTestId('metric-dropout_rate-2563')).toContainText('20');
  await expect(page.getByTestId('metric-time_to_graduate-2563')).toContainText('4.14');

  // ไฟล์ดิบ/ข้อมูลรายคนต้องไม่ถูกเก็บ ใน localStorage / sessionStorage
  const dump = await page.evaluate(() => {
    const o: string[] = [];
    for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) o.push(st.key(i) + '=' + st.getItem(st.key(i)!));
    return o.join('\n');
  });
  for (const secret of ['SECRET-ID', 'นศ.ลับ', '640123456', 'cohort.xlsx']) expect(dump, `พบ "${secret}" ในที่เก็บข้อมูล`).not.toContain(secret);
});
