// s11: กรณีแปลก — P7 login, URL ข้าม role, 404, Back หลัง logout, logout จากแท็บอื่นระหว่างพิมพ์, session หมดอายุ,
//      start_cycle todo (M1), เน็ตช้า, TrendChart แกน Y, มือถือ 390
import { session, B, tid, sec } from './lib.mjs';
const s = await session();
const { p, ctx } = s;
const todos = async () => p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 100)));
// P7
for (const u of ['CHAIR1', ' lect1 ']) {
  await p.goto(B + '/login'); await p.evaluate(() => localStorage.removeItem('aunqa_session'));
  await p.goto(B + '/login');
  await tid(p, 'login-username').fill(u); await tid(p, 'login-password').fill('demo1234'); await tid(p, 'login-submit').click();
  await p.waitForTimeout(2500);
  console.log('P7 login', JSON.stringify(u), '->', p.url().replace(B, ''), (await p.locator('body').innerText()).match(/ไม่ถูกต้อง[^\n]*/)?.[0] || '');
}
// M1 start_cycle: chair มอบ 1.1 รอบ 2570 ให้ lect1
await s.as('chair1');
await p.goto(B + '/app/cycles'); await p.waitForTimeout(800);
const href = await p.locator('a[href*="/app/cycles/cyc_"]').first().getAttribute('href');
const cid = decodeURIComponent(href.split('/').pop());
console.log('new cycle', cid);
await p.goto(B + href + '/assign'); await p.waitForTimeout(1000);
const sel = tid(p, 'owner-1.1');
await sel.selectOption({ label: (await sel.locator('option').allInnerTexts()).find(o => /ธนา/.test(o)) });
await p.waitForTimeout(600);
// ปุ่ม "ไปข้อถัดไปที่ยังไม่มีเจ้าของ"
const nb = p.getByRole('button', { name: /ไปข้อถัดไปที่ยังไม่มีเจ้าของ/ });
if (await nb.count()) { await nb.click(); await p.waitForTimeout(600); console.log('next-unowned focus:', await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))); }
await p.goto(B + '/app'); await p.waitForTimeout(900);
console.log('chair todos after 1 assign in draft', await todos());
// URL ข้าม role (lect1)
await s.as('lect1');
for (const u of ['/app/admin', `/app/cycles/${encodeURIComponent(cid)}/assign`, '/app/review', '/app/cycles/cycle-demo-2569/assess', '/app/sections/xxx', '/zzz']) {
  await p.goto(B + u); await p.waitForTimeout(1300);
  console.log('lect1', u, '=>', (await p.locator('main, body').first().innerText()).replace(/\s+/g, ' ').slice(0, 160));
}
await s.shot('lect-404');
// อีก role ห้ามแก้ข้อ: assess1 เปิดข้อ 3.6
await s.as('assess1');
await p.goto(sec('cycle-demo-2569', '3.6')); await p.waitForTimeout(1500);
console.log('assess1 3.6 editable?', await tid(p, 'narrative-th').isEditable().catch(() => 'no editor'), (await p.locator('main').innerText()).slice(0, 200).replace(/\s+/g, ' '));
// logout ข้ามแท็บระหว่างพิมพ์
await s.as('lect1');
await p.goto(sec(cid, '1.1')); await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
await tid(p, 'narrative-th').click(); await p.keyboard.type('ข้อความที่กำลังพิมพ์ตอนแท็บอื่นออกจากระบบ (สมมติ)');
const p2 = await ctx.newPage(); await p2.goto(B + '/app'); await p2.waitForTimeout(1500);
await p2.getByRole('button', { name: 'ออกจากระบบ' }).first().click(); await p2.waitForTimeout(2000);
console.log('tab2 after logout', p2.url().replace(B, ''));
await p.waitForTimeout(2500);
console.log('tab1 after other-tab logout', p.url().replace(B, ''), (await p.locator('body').innerText()).match(/.{0,80}(แท็บอื่น|ออกจากระบบแล้ว|หมดเวลา).{0,80}/g));
await s.shot('other-tab-logout');
await p2.close();
await s.as('lect1');
await p.goto(sec(cid, '1.1')); await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
console.log('text survived other-tab logout?', (await tid(p, 'narrative-th').inputValue()).includes('แท็บอื่นออกจากระบบ'));
// session หมดอายุ (แก้เวลาใน localStorage)
const raw = await p.evaluate(() => localStorage.getItem('aunqa_session'));
console.log('session keys', Object.keys(JSON.parse(raw || '{}')));
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('aunqa_session')); for (const k of Object.keys(s)) if (typeof s[k] === 'number' && s[k] > 1e12) s[k] = s[k] - 13 * 3600e3; localStorage.setItem('aunqa_session', JSON.stringify(s)); });
await p.waitForTimeout(33000);
console.log('after expiry', p.url().replace(B, ''), (await p.locator('body').innerText()).match(/.{0,60}(หมดเวลา|หมดอายุ|เข้าสู่ระบบอีกครั้ง).{0,80}/g));
await s.shot('expired');
// Back หลัง logout
await s.as('chair1');
await p.goto(B + '/app/review'); await p.waitForTimeout(800);
await p.getByRole('button', { name: 'ออกจากระบบ' }).first().click(); await p.waitForTimeout(2000);
await p.goBack(); await p.waitForTimeout(1500);
console.log('Back after logout ->', p.url().replace(B, ''));
// เน็ตช้า: หน่วง JS chunk 2.5s
await s.as('data1');
await p.route('**/_next/static/**', async r => { await new Promise(x => setTimeout(x, 2500)); await r.continue(); });
await p.goto(B + '/app/metrics');
await p.waitForTimeout(900); await s.shot('slow-metrics-900ms');
console.log('slow @900ms body:', (await p.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' '));
await p.waitForTimeout(6000);
await p.unroute('**/_next/static/**');
await p.reload(); await p.waitForTimeout(1500);
// TrendChart
const labels = await p.locator('[data-testid^="trend-"] text, svg text.aq-chart-label').allInnerTexts();
console.log('chart labels (first 40):', labels.slice(0, 40));
await p.locator('[data-testid="trend-section"]').scrollIntoViewIfNeeded().catch(() => {});
await p.locator('[data-testid="trend-section"]').screenshot({ path: s.p ? 'shots/play-trend.png' : '' }).catch(e => console.log('trend shot', e.message.slice(0, 80)));
console.log('import panel position y:', (await tid(p, 'import-panel').boundingBox().catch(() => null))?.y, 'table y:', (await tid(p, 'metric-table').boundingBox().catch(() => null))?.y);
// มือถือ 390
await p.setViewportSize({ width: 390, height: 844 });
for (const u of ['/app', '/app/evidence', sec('cycle-demo-2569', '3.6'), '/app/cycles/cycle-demo-2569', '/app/metrics']) {
  await p.goto(B + u); await p.waitForTimeout(1300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log('390', u.replace(B, ''), 'scrollWidth', sw);
}
await s.shot('mobile-section');
console.log('errs', s.stats().errs);
await s.done();
