// s5: chair1 ตรวจ: badge (M2) → คิวรอตรวจ (UX-7) → ส่งกลับ 3.6 → อนุมัติที่เหลือ (นับคลิก)
import { session, B, tid, dlgOk } from './lib.mjs';
const s = await session();
const { p } = s;
await s.as('chair1');
const nav = await p.locator('nav, aside').first().innerText();
console.log('NAV badges:', nav.replace(/\n+/g, ' | ').slice(0, 120));
console.log('TODOS', await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 90))));
console.log('NOTI', (await s.txt(3000)).match(/แจ้งเตือน \([\s\S]{0,500}/)?.[0]);
const w = p.locator('[data-testid^="todo-review_sections"]').first();
await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo ตรวจ');
await p.waitForTimeout(1000);
console.log('URL', p.url().replace(B, ''));
console.log('REVIEW PAGE:\n', (await s.txt(2500)));
await s.shot('chair-review-queue', true);
const rows = await tid(p, 'review-table').locator('tbody tr').count();
console.log('rows', rows);
// เปิด 3.6 → ส่งกลับ
const openFor = async (r) => {
  const row = tid(p, 'review-table').locator('tbody tr').filter({ hasText: new RegExp('^\\s*' + r.replace('.', '\\.')) }).first();
  await row.getByRole('link', { name: /เปิดอ่าน/ }).or(row.getByRole('button', { name: /เปิดอ่าน/ })).first().click(); s.act('เปิดอ่าน ' + r);
  await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(600);
};
await openFor('3.6');
console.log('3.6 PDCA state as chair:', await p.locator('[data-testid^="pdca-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + '=' + e.checked)));
await tid(p, 'section-return').click(); s.act('ส่งกลับ');
const d = p.getByRole('dialog'); await d.waitFor();
console.log('RETURN DLG:', (await d.innerText()).replace(/\n/g, ' | '));
console.log('confirm disabled w/o reason?', await d.getByRole('button', { name: /^ยืนยัน/ }).last().isDisabled());
await dlgOk(p, 'โปรดเพิ่มหลักฐานขั้น Check (ผลประเมินรายวิชา) — ทดสอบ'); s.act('พิมพ์เหตุผล+ยืนยัน');
await p.waitForTimeout(800);
console.log('after return toasts', await p.locator('.aq-toast').allInnerTexts());
const after = await p.locator('main').innerText();
console.log('next suggestion after return:', after.match(/.{0,40}(ถัดไป|กลับไปคิว|รอตรวจ).{0,60}/g)?.slice(0, 4));
// อนุมัติที่เหลือจาก queue
const t0 = Date.now(); const c0 = s.stats().clicks;
for (const r of ['1.5', '5.1', '6.6', '7.9', '8.1', '8.2', '8.3']) {
  await p.goto(B + '/app/review'); await p.waitForTimeout(700); s.act('กลับคิว');
  await openFor(r);
  await tid(p, 'section-approve').click(); s.act('อนุมัติ ' + r);
  await p.waitForTimeout(500);
  const dd = p.getByRole('dialog');
  if (await dd.count()) { console.log(r, 'approve dlg:', (await dd.innerText()).replace(/\n/g, ' | ').slice(0, 200)); await dlgOk(p); s.act('ยืนยัน'); }
  console.log(r, 'toast', (await p.locator('.aq-toast').allInnerTexts()).slice(-1));
}
console.log('approve 7 clicks:', s.stats().clicks - c0, 'ms', Date.now() - t0);
// มีทางลัดอนุมัติแล้วไปข้อถัดไปไหม?
console.log('next-in-queue button on section page?', await p.getByRole('link', { name: /ข้อถัดไป|ถัดไปในคิว/ }).count() + await p.getByRole('button', { name: /ข้อถัดไป|ถัดไปในคิว/ }).count());
await p.goto(B + '/app'); await p.waitForTimeout(1000);
console.log('HOME TODOS', await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 90))));
console.log('NAV', (await p.locator('nav, aside').first().innerText()).replace(/\n+/g, ' | ').slice(0, 120));
await s.shot('chair-home-after-review');
console.log('STATS', s.stats());
await s.done();
