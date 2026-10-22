// s8: fqa1 (noti+todo → อนุมัติระดับคณะ) → dean1 (AC-16 preflight + dialog focus + ปุ่มห่าง) → เริ่มประเมิน
import { session, B, tid } from './lib.mjs';
const s = await session();
const { p } = s;
const homeInfo = async (u) => {
  const t = await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
  const n = (await s.txt(3000)).match(/แจ้งเตือน \(\d+ ใหม่\)[\s\S]{0,250}/)?.[0]?.replace(/\n+/g, ' | ');
  console.log(`== ${u} TODOS`, t, '\n   NOTI', n);
  return t;
};
const goTodo = async (prefix) => {
  const w = p.locator(`[data-testid^="todo-${prefix}"]`).first();
  await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo ' + prefix);
  await p.waitForTimeout(1300);
  console.log('   ->', p.url().replace(B, ''));
};
// fqa1
await s.as('fqa1');
await homeInfo('fqa1'); await s.shot('fqa-home');
await goTodo('review_cycle').catch(async e => { console.log('no review_cycle todo', e.message.slice(0, 80)); await goTodo(''); });
console.log('   NEXT:', (await tid(p, 'cycle-next-info').innerText()).replace(/\n+/g, ' | '));
console.log('   ACTIONS:', (await tid(p, 'cycle-actions').innerText().catch(() => '')).replace(/\n+/g, ' | '));
console.log('   read whole SAR button?', await p.getByRole('link', { name: /อ่านทั้งรอบ|อ่าน SAR/ }).count() + await p.getByRole('button', { name: /อ่านทั้งรอบ|อ่าน SAR/ }).count(), ' export link:', await tid(p, 'go-export').count());
await s.shot('fqa-dashboard');
await tid(p, 'cycle-to-faculty_approved').click(); s.act('อนุมัติคณะ');
let d = p.getByRole('dialog'); await d.waitFor();
console.log('   DLG:', (await d.innerText()).replace(/\n+/g, ' | '));
await d.getByRole('button', { name: /^ยืนยัน/ }).last().click(); s.act('ยืนยัน');
await p.waitForTimeout(1000);
console.log('   toast', await p.locator('.aq-toast').allInnerTexts(), 'STATS', s.stats().clicks);
// dean1
await s.as('dean1');
await homeInfo('dean1'); await s.shot('dean-home');
await goTodo('');
console.log('   NEXT (AC-16):', (await tid(p, 'cycle-next-info').innerText()).replace(/\n+/g, ' | '));
const acts = tid(p, 'cycle-actions');
const btns = await acts.getByRole('button').evaluateAll(es => es.map(e => ({ t: e.innerText, x: Math.round(e.getBoundingClientRect().x), w: Math.round(e.getBoundingClientRect().width), cls: e.className })));
console.log('   BUTTONS', btns);
await s.shot('dean-dashboard');
await tid(p, 'cycle-to-final_approved').click(); s.act('อนุมัติสุดท้าย');
d = p.getByRole('dialog'); await d.waitFor();
console.log('   DLG:', (await d.innerText()).replace(/\n+/g, ' | '));
console.log('   focused:', await p.evaluate(() => document.activeElement?.innerText));
await s.shot('dean-dialog');
// Enter ติดมือ → ควรยกเลิก (UX-3)
await p.keyboard.press('Enter'); await p.waitForTimeout(700);
console.log('   after Enter: dialog open?', await p.getByRole('dialog').count(), ' status pill:', (await p.locator('h1').innerText()));
console.log('   NEXT:', (await tid(p, 'cycle-next-info').innerText()).replace(/\n+/g, ' | ').slice(0, 120));
await tid(p, 'cycle-to-final_approved').click();
d = p.getByRole('dialog'); await d.waitFor();
await d.getByRole('button', { name: /^ยืนยัน/ }).last().click(); s.act('ยืนยัน');
await p.waitForTimeout(1500);
console.log('   toast', await p.locator('.aq-toast').allInnerTexts());
console.log('   lock banner:', await tid(p, 'lock-banner').innerText().catch(() => '-'));
console.log('   NEXT after:', (await tid(p, 'cycle-next-info').innerText()).replace(/\n+/g, ' | '));
await s.shot('dean-locked');
// ใครเริ่มประเมิน
await s.as('fqa1');
await homeInfo('fqa1-after-lock'); await s.shot('fqa-home-start');
await s.as('uadmin');
await homeInfo('uadmin-after-lock');
console.log('STATS', s.stats());
await s.done();
