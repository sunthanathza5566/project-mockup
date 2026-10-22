import { session, B, tid, sec } from './lib.mjs';
const s = await session(); const { p } = s;
await s.as('lect1');
for (const u of ['/app/admin', '/app/cycles/cycle-demo-2569/assign', '/app/review', '/app/cycles/cycle-demo-2569/assess', '/app/sections/xxx']) {
  await p.goto(B + u); await p.waitForTimeout(1300);
  console.log('lect1', u, '=>', (await p.locator('#main, main').first().innerText()).replace(/\s+/g, ' ').slice(0, 170));
}
await s.as('data1');
await p.goto(B + '/app/metrics'); await p.waitForTimeout(1500);
const labels = await p.locator('svg text').evaluateAll(es => es.map(e => e.textContent));
console.log('chart labels:', labels.length, JSON.stringify(labels.slice(0, 30)));
const ax = await p.locator('svg').first().evaluate(e => e.closest('[data-testid]')?.innerText?.slice(0, 300));
console.log('first chart card text:', ax);
const tr = p.locator('[data-testid^="trend-"]').first();
await tr.scrollIntoViewIfNeeded(); await tr.screenshot({ path: 'shots/play-trend.png' });
console.log('top of page:', (await p.locator('main').innerText()).slice(0, 500));
await p.setViewportSize({ width: 390, height: 844 });
for (const u of [sec('cycle-demo-2569', '3.6'), B + '/app/cycles/cycle-demo-2569', B + '/app/metrics', B + '/app/review']) {
  await p.goto(u); await p.waitForTimeout(1300);
  console.log('390', u.replace(B, ''), 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
}
await p.goto(sec('cycle-demo-2569', '3.6')); await p.waitForTimeout(1200); await s.shot('mobile-section');
await s.done();
