// s1: AC-14 usability — staff1 เริ่มจาก /app อัปโหลด + ผูก 1 ข้อ (นับการกระทำ + จุดที่ต้องเดา) + P4/P9 edge
import { session, B, tid } from './lib.mjs';
import path from 'path';
import fs from 'fs';
const s = await session();
const { p } = s;
const FILE = path.join(s.ctx ? process.cwd() : '.', 'ev-u3.txt');
fs.writeFileSync(FILE, 'รายงานผลการประชุมสมมติ ใช้ทดสอบเท่านั้น\n');
await s.as('staff1');
const t0 = Date.now();
const steps = [];
const step = async (name, fn) => { await fn(); s.act(name); await p.waitForTimeout(400); steps.push([name, p.url().replace(B, '')]); };
// 1 เมนูหลักฐาน
await step('เมนู หลักฐาน', () => p.getByRole('link', { name: 'หลักฐาน', exact: true }).first().click());
await p.waitForTimeout(800);
console.log('LIST TOP:\n', (await s.txt(700)));
await s.shot('ac14-1-list');
// 2 เพิ่มหลักฐาน
await step('ปุ่มเพิ่มหลักฐาน', () => tid(p, 'ev-new').click());
const form = await tid(p, 'ev-form').innerText();
console.log('FORM:\n', form.slice(0, 1500));
await s.shot('ac14-2-form', true);
// P4: กดบันทึกเปล่าก่อน (ผู้ใช้ที่ลองกดเลย)
await tid(p, 'ev-submit').click(); await p.waitForTimeout(500);
console.log('EMPTY SUBMIT summary:', await tid(p, 'ev-error-summary').innerText().catch(() => '(none)'));
console.log('field errors:', await p.locator('.aq-field-error').allInnerTexts());
console.log('focused:', await p.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName));
await s.shot('ac14-p4-empty', true);
// 3 ชื่อ
await step('พิมพ์ชื่อ', () => tid(p, 'ev-title').fill('รายงานประชุมกรรมการหลักสูตร 1/2569 (สมมติ)'));
// 4 แนบไฟล์ (คนจริง: คลิก + เลือกไฟล์ในหน้าต่าง OS = นับ 1 ตามเกณฑ์ ADR)
await step('แนบไฟล์', () => tid(p, 'ev-file').setInputFiles(FILE));
// 5 พิมพ์ข้อ
const cycleVal = await tid(p, 'ev-f-cycle').inputValue().catch(() => '?');
console.log('ev-f-cycle value:', cycleVal, ' options:', await tid(p, 'ev-f-cycle').locator('option').allInnerTexts().catch(() => []));
await step('พิมพ์ 1.1 ในช่องข้อ', () => tid(p, 'ev-f-reqs-input').fill('1.1'));
console.log('options shown:', (await p.locator('[data-testid^="ev-f-req-opt-"]').allInnerTexts()).slice(0, 5));
await step('เลือกข้อ 1.1', () => tid(p, 'ev-f-req-opt-1.1').click());
console.log('chip:', await tid(p, 'ev-f-req-chip-1.1').innerText());
await s.shot('ac14-3-filled', true);
// 6 บันทึก
await step('บันทึก', () => tid(p, 'ev-submit').click());
await p.waitForTimeout(800);
const toast = await p.locator('[role="status"], .aq-toast').allInnerTexts();
console.log('TOAST:', toast);
await s.shot('ac14-4-saved');
console.log('actions:', s.stats().clicks, steps, 'script ms', Date.now() - t0);
// --- edge: Enter เลือก option แรก? ---
await tid(p, 'ev-new').click(); await p.waitForTimeout(300);
await tid(p, 'ev-f-reqs-input').fill('2.1'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('Enter picks?', await tid(p, 'ev-f-req-chip-2.1').count(), ' form still open?', await tid(p, 'ev-form').count());
// ชื่อยาว/emoji + ไฟล์ใหญ่ 12MB + .bin
await tid(p, 'ev-title').fill('ทดสอบ😀 Mixed ภาษา <b>x</b> ' + 'ยาว'.repeat(200));
const big = path.join(process.cwd(), 'big.pdf'); fs.writeFileSync(big, Buffer.alloc(12 * 1024 * 1024, 1));
await tid(p, 'ev-file').setInputFiles(big); await p.waitForTimeout(500);
console.log('12MB msg:', (await tid(p, 'ev-form').innerText()).match(/.{0,60}(MB|ขนาด|ใหญ่).{0,80}/g));
const bin = path.join(process.cwd(), 'x.bin'); fs.writeFileSync(bin, 'abc');
await tid(p, 'ev-file').setInputFiles(bin); await p.waitForTimeout(500);
console.log('bin msg:', (await tid(p, 'ev-form').innerText()).match(/.{0,40}(รองรับ|ชนิด).{0,80}/g));
await s.shot('ac14-edge', true);
fs.unlinkSync(big); fs.unlinkSync(bin);
console.log('errs', s.stats().errs);
await s.done();
