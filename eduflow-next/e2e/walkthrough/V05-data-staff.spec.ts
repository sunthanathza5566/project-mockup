/**
 * V05 เจ้าหน้าที่ข้อมูลคณะ (data1) — seed มาตรฐาน
 * อัปโหลดหลักฐานที่มีข้อมูลส่วนบุคคล (เลขบัตรสมมติ checksum ถูก) → ติดธง PII · นำเข้าตัวชี้วัดรุ่น (.xlsx) → คำนวณ % จบ/พ้นสภาพ
 * data1 ไม่มีแจ้งเตือนจากงานนี้ (ไม่มีขั้นอนุมัติ) — ข้อมูลถูกใช้ต่อโดยประธาน/อาจารย์ใน SAR
 */
import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { fakeThaiId, pickRequirements } from '../helpers';
import { asUser, caption, hclick, hfill, point, saveVideo, scene } from './narrate';

test.afterEach(async ({ page }, info) => { await saveVideo(page, info, 'V05-data-staff'); });

test('V05 เจ้าหน้าที่ข้อมูล: อัปโหลดหลักฐาน (ติดธง PII) + นำเข้าตัวชี้วัดรุ่น', async ({ page }) => {
  await asUser(page, 'data1', 'เจ้าหน้าที่ข้อมูลคณะ');
  await caption(page, 'เจ้าหน้าที่ข้อมูลคณะ: ดูแลคลังหลักฐานและตัวชี้วัด — ไม่ได้เขียน SAR และไม่มีขั้นอนุมัติ');

  await scene(page, 'ฉาก 1/2 · อัปโหลดหลักฐาน + ตรวจข้อมูลส่วนบุคคล');
  await page.goto('/app/evidence');
  await expect(page.getByTestId('ev-table')).toBeVisible();
  await caption(page, 'คลังหลักฐาน: กด "เพิ่มหลักฐาน" เพื่ออัปโหลดไฟล์และผูกกับข้อ AUN-QA');
  await hclick(page, page.getByTestId('ev-new'));
  const title = 'รายชื่อผู้เข้าร่วมโครงการพี่เลี้ยง (ไฟล์ทดสอบ)';
  await hfill(page, page.getByTestId('ev-title'), title);
  await page.getByTestId('ev-file').setInputFiles({
    name: 'mentoring-roster.txt', mimeType: 'text/plain',
    buffer: Buffer.from(`รายชื่อผู้เข้าร่วม (ข้อมูลสมมติ)\nสมชาย ใจดี เลขบัตร ${fakeThaiId()}\n`, 'utf8'),
  });
  await caption(page, 'เลือกไฟล์ (ในไฟล์มีเลขบัตรประชาชนสมมติ) แล้วเลือกข้อที่เกี่ยวข้อง');
  await pickRequirements(page, ['3.6']);
  await hclick(page, page.getByTestId('ev-submit'));
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('ข้อมูลส่วนบุคคล');
  await point(page, dlg);
  await caption(page, 'ระบบตรวจพบข้อมูลส่วนบุคคล (PDPA) และเตือนทันที — หลักฐานนี้จะถูกติดธง PII');
  await hclick(page, dlg.getByRole('button', { name: 'รับทราบ' }));
  const row = page.getByTestId('ev-table').locator('tr', { hasText: title });
  await expect(row).toContainText('PII');
  await point(page, row);
  await caption(page, 'ในรายการมีป้าย PII — ต้องจัดการ (ปกปิด/แทนที่ไฟล์) ก่อนจึงจะตรวจรับรองได้');
  await hclick(page, row.locator('a').first());
  await expect(page.getByTestId('pii-banner')).toContainText('เลขบัตรประชาชน');
  await point(page, page.getByTestId('pii-banner'));
  await caption(page, 'หน้ารายละเอียดบอกชนิดข้อมูลที่พบ: เลขบัตรประชาชน — ช่องว่างนี้ขึ้นในแดชบอร์ดรอบด้วย (R6)');

  await scene(page, 'ฉาก 2/2 · นำเข้าตัวชี้วัดรายรุ่นจาก Excel');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('cohort');
  ws.addRow(['student_id', 'name', 'cohort', 'status', 'years_to_graduate']);
  for (let i = 0; i < 6; i++) ws.addRow([`S-DEMO-${i}`, `นักศึกษาสมมติ ${i}`, 2563, 'graduated', 4]);
  ws.addRow(['S-DEMO-L', 'นักศึกษาสมมติ จบช้า', 2563, 'graduated', 5]);
  ws.addRow(['S-DEMO-D1', 'นักศึกษาสมมติ D1', 2563, 'dropped_out', '']);
  ws.addRow(['S-DEMO-D2', 'นักศึกษาสมมติ D2', 2563, 'ลาออก', '']);
  ws.addRow(['S-DEMO-E', 'นักศึกษาสมมติ E', 2563, 'enrolled', '']);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  await page.goto('/app/metrics');
  await caption(page, 'หน้าตัวชี้วัด: นำเข้าข้อมูลนักศึกษารายรุ่นจากไฟล์ Excel');
  await hclick(page, page.getByTestId('import-panel').locator('summary'));
  await page.getByTestId('cohort-file').setInputFiles({
    name: 'cohort.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer,
  });
  const preview = page.getByTestId('cohort-2563');
  await expect(preview).toBeVisible();
  expect((await preview.locator('td').allInnerTexts()).map(t => t.trim())).toEqual(['2563', '10', '6', '2', '60', '20', '4.14']);
  await point(page, preview);
  await caption(page, 'ตัวอย่างก่อนบันทึก: รุ่น 2563 มี 10 คน จบตามเวลา 6 · พ้นสภาพ 2 → อัตราจบ 60% · พ้นสภาพ 20% · เวลาเฉลี่ย 4.14 ปี');
  await caption(page, 'ระบบเก็บเฉพาะตัวเลขสรุป — ไม่เก็บรายชื่อ/รหัสนักศึกษารายคน');
  await hclick(page, page.getByTestId('cohort-commit'));
  await expect(page.getByTestId('metric-pass_rate-2563')).toContainText('60');
  await point(page, page.getByTestId('metric-pass_rate-2563'));
  const dump = await page.evaluate(() => {
    const o: string[] = [];
    for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) o.push(st.getItem(st.key(i)!) ?? '');
    return o.join('\n');
  });
  expect(dump).not.toContain('S-DEMO-');
  await caption(page, 'บันทึกแล้ว — ประธาน/อาจารย์นำตัวเลขนี้ไปอ้างใน SAR ได้ (งานนี้ไม่มีแจ้งเตือนถึงใคร)', 4500);
});
