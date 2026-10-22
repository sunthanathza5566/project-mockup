// s10: uadmin ปิดรอบ (close_cycle todo) + ดูทุก role หลังปิด + chair เปิดรอบใหม่ 2570 (start_cycle todo M1)
import { session, B, tid } from './lib.mjs';
const s = await session();
const { p } = s;
const todos = async () => p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
for (const u of ['fqa1', 'chair1']) { await s.as(u); console.log(u, 'at assessed:', await todos()); }
await s.as('uadmin');
console.log('uadmin TODOS', await todos());
console.log('NOTI', (await s.txt(3000)).match(/แจ้งเตือน \(\d+ ใหม่\)[\s\S]{0,200}/)?.[0]?.replace(/\n+/g, ' | '));
await s.shot('uadmin-home-close');
const w = p.locator('[data-testid^="todo-close_cycle"]').first();
await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo ปิดรอบ');
await p.waitForTimeout(1300);
console.log('->', p.url().replace(B, ''), '\nNEXT', (await tid(p, 'cycle-next-info').innerText()).replace(/\n+/g, ' | '));
await tid(p, 'cycle-to-closed').click(); s.act('ปิดรอบ');
const d = p.getByRole('dialog'); await d.waitFor();
console.log('DLG', (await d.innerText()).replace(/\n+/g, ' | '));
await d.getByRole('button', { name: /^ยืนยัน/ }).last().click(); s.act('ยืนยัน');
await p.waitForTimeout(1000);
console.log('toast', await p.locator('.aq-toast').allInnerTexts(), 'clicks', s.stats().clicks);
console.log('NEXT after', (await tid(p, 'cycle-next-info').innerText().catch(() => '-')).replace(/\n+/g, ' | '));
await s.shot('uadmin-closed');
// chair สร้างรอบ 2570 → todo start_cycle
await s.as('chair1');
await p.goto(B + '/app/cycles'); await p.waitForTimeout(800);
await tid(p, 'cycle-new').click(); await tid(p, 'cycle-year').fill('2570'); await tid(p, 'cycle-submit').click();
await p.waitForTimeout(1500);
console.log('create toast', await p.locator('.aq-toast').allInnerTexts(), p.url().replace(B, ''));
// กดซ้ำ: สร้างปีเดียวกันอีก
await p.goto(B + '/app/cycles'); await p.waitForTimeout(800);
await tid(p, 'cycle-new').click(); await tid(p, 'cycle-year').fill('2570'); await tid(p, 'cycle-submit').click();
await p.waitForTimeout(1000);
console.log('dup year msg', await p.locator('.aq-toast, .aq-field-error').allInnerTexts());
await p.goto(B + '/app'); await p.waitForTimeout(900);
console.log('chair todos new draft', await todos());
await s.done();
