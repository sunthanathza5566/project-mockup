// s2: chair1 จาก home → todo มอบหมาย → มอบ 3.6 ให้ lect1, 5.1/7.9 ให้ staff1 (นับคลิก, feedback)
import { session, B, CY, tid } from './lib.mjs';
const s = await session();
const { p } = s;
await s.as('chair1');
await tid(p, 'todo-assign_sections-1').getByRole('link').or(tid(p, 'todo-assign_sections-1').getByRole('button')).first().click(); s.act('todo มอบหมายงาน');
await p.waitForTimeout(1000);
console.log('URL', p.url().replace(B, ''));
console.log((await s.txt(900)));
await s.shot('chair-assign-1');
const owners = [['3.6', /ธนา/], ['5.1', /วิภา/], ['7.9', /วิภา/]];
for (const [r, who] of owners) {
  const sel = tid(p, `owner-${r}`);
  await sel.scrollIntoViewIfNeeded();
  const opts = await sel.locator('option').allInnerTexts();
  const lab = opts.find(o => who.test(o));
  await sel.selectOption({ label: lab }); s.act(`owner ${r}`);
  await p.waitForTimeout(700);
  const row = sel.locator('xpath=ancestor::tr[1]');
  console.log(r, '->', lab, '| row:', (await row.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160));
  console.log('  toast:', await p.locator('.aq-toast, [role=status]').allInnerTexts());
}
await s.shot('chair-assign-2');
console.log('summary:', (await p.locator('main').innerText()).match(/มอบหมายแล้ว[^\n]*/g));
console.log('clicks', s.stats());
await s.done();
