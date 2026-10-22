// U3: ถ่ายทุกหน้าแบบเดียวกับ U0 (ชื่อไฟล์เดียวกัน) + เก็บสถิติฟอนต์/overflow/target
// รัน: cd .agents/playtest/u3 && node shoot.mjs   (BASE=http://localhost:3951)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/u3') + '/';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3951';
const C = 'cycle-demo-2569';
const b = await chromium.launch();
const stats = {};
async function collect(page, key) {
  stats[key] = await page.evaluate(async () => {
    await document.fonts.ready;
    const out = {}, small = [], sub16 = {}, btn = [];
    const overflow = document.documentElement.scrollWidth > innerWidth;
    document.querySelectorAll('body *').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const fs = parseFloat(s.fontSize);
      const lh = s.lineHeight === 'normal' ? 'normal' : (parseFloat(s.lineHeight) / fs).toFixed(2);
      const k = `${s.fontFamily.split(',')[0].replace(/"/g, '')}|${s.fontSize}|${s.fontWeight}|lh ${lh}`;
      out[k] = (out[k] || 0) + 1;
      const cn = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
      const cls = cn.split(' ')[0] || el.tagName.toLowerCase();
      if (fs < 13) small.push(`${cls} ${s.fontSize} "${el.textContent.trim().slice(0, 20)}"`);
      if (fs < 16) { const kk = `${fs}px .${cls}`; sub16[kk] = (sub16[kk] || 0) + 1; }
    });
    document.querySelectorAll('button,a.aq-btn,input:not([type=checkbox]):not([type=radio]),select,[role=tab],.aq-nav-item').forEach(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden') return;
      if (r.height < 44 || r.width < 24) btn.push(`${el.tagName}.${(el.className + '').split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 18)}"`);
    });
    return { h: document.documentElement.scrollHeight, fonts: out, smallN: small.length, smallEx: small.slice(0, 6), sub16, smallBtn: btn.length, btnEx: btn.slice(0, 10), overflow, sw: document.documentElement.scrollWidth,
      loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight))], bodyFF: getComputedStyle(document.body).fontFamily };
  });
}
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('h1').first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900); // ให้ ring/bar เติมค่าเสร็จ (600ms)
}
async function shot(page, name, vp) { await settle(page); await page.screenshot({ path: `${OUT}${name}-${vp}.png`, fullPage: true }); await collect(page, name + '-' + vp); }
const VPS = process.env.VPS ? JSON.parse(process.env.VPS) : [['d', 1440, 900], ['m', 390, 844], ['t', 768, 1024]];
for (const [vp, w, h] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH' });
  const page = await ctx.newPage();
  const tablet = vp === 't';
  if (!tablet) {
    await page.goto(BASE + '/'); await shot(page, '01-landing', vp);
    await page.goto(BASE + '/zzz'); await shot(page, '20-404', vp);
  }
  await page.goto(BASE + '/login'); await shot(page, '02-login', vp);
  if (!tablet) {
    const demo = page.getByTestId('demo-accounts');
    if (await demo.count()) { const s = demo.locator('summary'); if (await s.count()) await s.first().click().catch(() => {}); }
    await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}02b-login-demo-${vp}.png`, fullPage: true });
    await page.getByTestId('login-username').fill('chair1'); await page.getByTestId('login-password').fill('wrong'); await page.getByTestId('login-submit').click();
    await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}02c-login-error-${vp}.png`, fullPage: true }); await collect(page, '02c-login-error-' + vp);
  }
  await page.getByTestId('login-username').fill('chair1');
  await page.getByTestId('login-password').fill('demo1234'); await page.getByTestId('login-submit').click();
  await page.waitForTimeout(300); if (!tablet) await page.screenshot({ path: `${OUT}03-login-loader-${vp}.png` });
  await page.waitForURL('**/app', { timeout: 30000 });
  const routes = tablet ? [['04-app', '/app'], ['07-cycle-dash', '/app/cycles/' + C], ['09b-section-real', '/app/sections/' + encodeURIComponent(C + '::3.6')], ['10-evidence', '/app/evidence']]
    : [['04-app', '/app'], ['05-requirements', '/app/requirements'], ['06-cycles', '/app/cycles'], ['07-cycle-dash', '/app/cycles/' + C], ['08-assign', '/app/cycles/' + C + '/assign'], ['09-section', '/app/sections/' + encodeURIComponent(C + '::aun-1')], ['09b-section-real', '/app/sections/' + encodeURIComponent(C + '::3.6')], ['10-evidence', '/app/evidence'], ['12-metrics', '/app/metrics'], ['13-actions', '/app/actions'], ['14-assess', '/app/cycles/' + C + '/assess'], ['15-review', '/app/review'], ['16-export', '/app/export'], ['17-admin', '/app/admin']];
  for (const [n, u] of routes) { try { await page.goto(BASE + u); await shot(page, n, vp); } catch (e) { console.log('ERR', n, e.message); } }
  if (!tablet) {
    await page.goto(BASE + '/app'); await page.waitForTimeout(120); await page.screenshot({ path: `${OUT}00-init-loader-${vp}.png` });
    await settle(page);
    await page.goto(BASE + '/app/evidence'); await settle(page);
    const l = page.getByTestId('ev-table').locator('tbody tr td:first-child a').first();
    if (await l.count()) { await page.goto(BASE + await l.getAttribute('href')); await shot(page, '11-evidence-detail', vp); }
    await page.goto(BASE + '/app/evidence'); await settle(page);
    await page.getByTestId('ev-new').click().catch(() => {}); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}10b-evidence-form-${vp}.png`, fullPage: true }); await collect(page, '10b-evidence-form-' + vp);
    await page.goto(BASE + '/app/curriculum'); await settle(page);
    for (const t of ['plo', 'course', 'matrix', 'heat', 'gaps', 'prereq', 'ai']) {
      const tab = page.getByTestId('cur-tab-' + t);
      if (await tab.count()) { await tab.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}cur-${t}-${vp}.png`, fullPage: true }); await collect(page, 'cur-' + t + '-' + vp); }
      else console.log('no tab', t);
    }
    await page.goto(BASE + '/app/cycles'); await settle(page);
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    await page.screenshot({ path: `${OUT}18-focus-${vp}.png` });
  }
  if (vp !== 'd') {
    await page.goto(BASE + '/app'); await settle(page);
    const menu = page.locator('button[aria-controls], button[aria-label*="เมนู"]').first();
    if (await menu.isVisible().catch(() => false)) { await menu.click(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}04b-drawer-${vp}.png` }); await page.keyboard.press('Escape'); }
    else console.log('no menu button', vp);
  }
  if (!tablet) {
    await page.goto(BASE + '/app'); await settle(page);
    const lo = page.getByTestId('logout');
    if (!(await lo.isVisible().catch(() => false))) { await page.getByTestId('nav-user').click().catch(() => {}); await page.waitForTimeout(300); }
    await lo.click().catch(e => console.log('logout', e.message)); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}19-logout-loader-${vp}.png` });
  }
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'u3-stats' + (process.env.TAG || '') + '.json'), JSON.stringify(stats, null, 1));
await b.close();
console.log('done', Object.keys(stats).length);
