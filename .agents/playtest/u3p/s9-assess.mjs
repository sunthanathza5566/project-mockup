// s9: fqa1 เริ่มประเมิน (todo → ...) → assess1 ให้คะแนน 8 เกณฑ์ + verdict + ส่ง (นับคลิก, UX-9, titleTh 8/8)
import { session, B, tid } from './lib.mjs';
const s = await session();
const { p } = s;
const todos = async () => p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
await s.as('dean1');
console.log('dean after lock TODOS', await todos());
await s.as('fqa1');
const w = p.locator('[data-testid^="todo-start_assessment"]').first();
await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo เริ่มประเมิน');
await p.waitForTimeout(1300);
console.log('-> ', p.url().replace(B, ''));
console.log((await s.txt(1200)));
await s.shot('fqa-start-1');
// ถ้ายังไม่มีกรรมการ → มอบหมาย
if (await tid(p, 'assessor-select').count()) {
  const opts = await tid(p, 'assessor-select').locator('option').allInnerTexts();
  console.log('assessor options', opts);
  await tid(p, 'assessor-select').selectOption({ label: opts.find(o => /วรรณา/.test(o)) }); s.act('เลือกกรรมการ');
  await tid(p, 'assessor-add').click(); s.act('เพิ่มกรรมการ');
  await p.waitForTimeout(800);
  console.log('toast', await p.locator('.aq-toast').allInnerTexts());
  console.log('after add — hint to go back?', (await s.txt(3000)).match(/.{0,60}(เริ่มการประเมิน|กลับไป).{0,60}/g));
}
await p.goto(B + '/app'); await p.waitForTimeout(900);
console.log('fqa todos after assessor', await todos());
const w2 = p.locator('[data-testid^="todo-start_assessment"]').first();
if (await w2.count()) { await w2.getByRole('link').or(w2.getByRole('button')).first().click(); s.act('todo เริ่มประเมิน (2)'); await p.waitForTimeout(1200); console.log('-> ', p.url().replace(B, '')); }
const st = tid(p, 'cycle-to-under_assessment');
console.log('start btn', await st.count(), await st.isDisabled().catch(() => '?'));
await st.click(); s.act('เริ่มประเมิน');
const d = p.getByRole('dialog'); await d.waitFor();
console.log('DLG', (await d.innerText()).replace(/\n+/g, ' | '));
await d.getByRole('button', { name: /^ยืนยัน/ }).last().click(); s.act('ยืนยัน');
await p.waitForTimeout(1000);
console.log('toast', await p.locator('.aq-toast').allInnerTexts(), 'fqa clicks', s.stats().clicks, s.stats().log);
// assess1
await s.as('assess1');
console.log('assess TODOS', await todos());
console.log('NOTI', (await s.txt(3000)).match(/แจ้งเตือน \(\d+ ใหม่\)[\s\S]{0,200}/)?.[0]?.replace(/\n+/g, ' | '));
await s.shot('assess-home');
const w3 = p.locator('[data-testid^="todo-assess_cycle"]').first();
await w3.getByRole('link').or(w3.getByRole('button')).first().click(); s.act('todo ประเมิน');
await p.waitForTimeout(1500);
console.log('-> ', p.url().replace(B, ''));
console.log('PROGRESS', (await tid(p, 'assess-progress').innerText()).replace(/\n+/g, ' | '));
await s.shot('assess-page');
for (let n = 1; n <= 8; n++) {
  const panel = tid(p, `assess-panel-${n}`);
  if (!(await panel.isVisible())) { await tid(p, `assess-crit-${n}`).click(); s.act('แท็บเกณฑ์ ' + n); }
  await panel.getByTestId('crit-score').selectOption({ index: 4 }); s.act('คะแนน');
  await panel.getByTestId('crit-why').fill(`เกณฑ์ ${n}: มีหลักฐานเพียงพอตามที่คาดหวัง (สมมติ)`); s.act('เหตุผล');
  await panel.getByTestId('crit-save').click(); s.act('บันทึก');
  await p.waitForTimeout(500);
  const nx = p.getByTestId('crit-next');
  const nt = await nx.innerText().catch(() => '(none)');
  if (n === 8 || n === 1) console.log('crit', n, 'next btn:', nt);
  if (n < 8 && await nx.count()) { await nx.click(); s.act('ถัดไป'); await p.waitForTimeout(300); }
  if (n === 8 && await nx.count()) { await nx.click(); s.act('ไปสรุป'); await p.waitForTimeout(500); }
}
await p.goto(B + '/app'); await p.waitForTimeout(800);
console.log('assess TODOS at 8/8 (no verdict)', await todos());
await p.goBack(); await p.waitForTimeout(1200);
console.log('PROGRESS', (await tid(p, 'assess-progress').innerText()).replace(/\n+/g, ' | '));
const submit = tid(p, 'assess-progress').getByRole('button', { name: /ส่งผล/ });
console.log('submit disabled?', await submit.isDisabled().catch(() => '?'));
await tid(p, 'verdict-score').selectOption({ index: 1 }); s.act('verdict');
console.log('verdict options', await tid(p, 'verdict-score').locator('option').allInnerTexts());
await tid(p, 'verdict-why').fill('โดยรวมผ่านตามเกณฑ์ (สมมติ)'); s.act('เหตุผล verdict');
await tid(p, 'verdict-save').click(); s.act('บันทึก verdict');
await p.waitForTimeout(700);
console.log('submit disabled now?', await submit.isDisabled().catch(() => '?'));
await s.shot('assess-ready');
await submit.click(); s.act('ส่งผล');
const d2 = p.getByRole('dialog'); await d2.waitFor();
console.log('DLG', (await d2.innerText()).replace(/\n+/g, ' | '));
await d2.getByRole('button', { name: /^ยืนยัน/ }).last().click(); s.act('ยืนยัน');
await p.waitForTimeout(1200);
console.log('toast', await p.locator('.aq-toast').allInnerTexts());
console.log('assess clicks', s.stats().clicks);
await s.shot('assess-done');
await s.done();
