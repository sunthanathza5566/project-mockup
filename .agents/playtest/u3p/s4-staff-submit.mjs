// s4: staff1 ส่ง 5.1 (คลิกเดียว) และ 7.9 (ดับเบิลคลิก) — ดู toast หลังส่ง + UX-6 ปุ่มไปข้อถัดไป
import { session, B, tid } from './lib.mjs';
const s = await session();
const { p } = s;
await s.as('staff1');
console.log('TODOS', await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 90))));
for (const [r, dbl] of [['5.1', false], ['7.9', true]]) {
  const w = p.locator('[data-testid^="todo-write_section"]').filter({ hasText: r }).first();
  if (await w.count()) { await w.getByRole('link').or(w.getByRole('button')).first().click(); }
  else { await p.goto(B + '/app/sections/' + encodeURIComponent('cycle-demo-2569::' + r)); }
  await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('.aq-toast').forEach(t => t.remove()));
  await tid(p, 'section-submit').click();
  const d = p.getByRole('dialog'); await d.waitFor();
  console.log(r, 'DIALOG:', (await d.innerText()).replace(/\n/g, ' | '));
  const ok = d.getByRole('button', { name: /^ยืนยัน/ });
  if (dbl) await ok.dblclick(); else await ok.click();
  await p.waitForTimeout(1500);
  const toasts = await p.locator('.aq-toast').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ')));
  console.log(r, dbl ? 'DBL' : 'SINGLE', 'TOASTS:', toasts);
  await s.shot(`staff-submit-${r}`);
  const next = p.getByRole('button', { name: /ข้อถัดไป/ }).or(p.getByRole('link', { name: /ข้อถัดไป/ }));
  console.log('next-action count', await next.count());
  if (r === '5.1' && await next.count()) { await next.first().click(); await p.waitForTimeout(1000); console.log('went to', decodeURIComponent(p.url().replace(B, ''))); }
}
await p.goto(B + '/app'); await p.waitForTimeout(1000);
console.log('HOME after:', (await s.txt(500)));
await s.done();
