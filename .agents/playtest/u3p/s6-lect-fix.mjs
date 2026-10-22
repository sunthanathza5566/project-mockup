// s6: lect1 เห็นการส่งกลับ → แก้ 3.6 → repro: ติ๊ก PDCA แล้วกดส่งทันที (ก่อน debounce 1.5s) → ดู toast + PDCA ถูกเก็บไหม
import { session, B, tid } from './lib.mjs';
const s = await session();
const { p } = s;
await s.as('lect1');
console.log('TODOS', await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 140))));
console.log('NOTI', (await s.txt(3000)).match(/แจ้งเตือน \([\s\S]{0,300}/)?.[0]);
await s.shot('lect-returned-home');
const w = p.locator('[data-testid^="todo-"]').first();
await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo');
await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
console.log('URL', decodeURIComponent(p.url().replace(B, '')));
const m = await p.locator('main').innerText();
console.log('return reason visible on page?', m.includes('โปรดเพิ่มหลักฐานขั้น Check'), m.match(/.{0,60}โปรดเพิ่มหลักฐาน.{0,40}/g));
await s.shot('lect-returned-section');
await p.evaluate(() => document.querySelectorAll('.aq-toast').forEach(t => t.remove()));
// ติ๊ก C + แก้ข้อความ แล้วส่งทันที
await tid(p, 'pdca-C').check();
await tid(p, 'narrative-th').click(); await p.keyboard.type(' เพิ่มผลประเมินรายวิชา (สมมติ)');
await tid(p, 'section-submit').click();
const d = p.getByRole('dialog'); await d.waitFor();
await d.getByRole('button', { name: /^ยืนยัน/ }).click();
await p.waitForTimeout(2500);
console.log('RACE TOASTS:', await p.locator('.aq-toast').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' '))));
await s.shot('lect-race-toasts');
await p.reload(); await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
console.log('after reload pdca-C:', await tid(p, 'pdca-C').isChecked(), ' text kept:', (await tid(p, 'narrative-th').inputValue()).includes('เพิ่มผลประเมินรายวิชา'));
console.log('status:', await tid(p, 'readonly-reason').innerText().catch(() => '-'));
await s.done();
