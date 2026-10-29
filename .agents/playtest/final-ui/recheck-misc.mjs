// TASK-0002 เฟส 7 re-check: m7 sticky แผงแบรนด์, m1 แท็บข้าง, m9 review nowrap, ปุ่มจัดการที่ 390, ภาษาค่าเดียว (html lang)
// รัน: BASE=http://localhost:3960 node .agents/playtest/final-ui/recheck-misc.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:3960';
const out = {};
const b = await chromium.launch();
const settle = async p => { await p.waitForLoadState('networkidle').catch(() => {}); await p.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(600); };
async function login(p, u) { await p.goto(BASE + '/login'); await settle(p); await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app', { timeout: 30000 }); await settle(p); }
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'th-TH' }); const p = await ctx.newPage();
  for (const url of ['/request-access', '/login']) {
    await p.goto(BASE + url); await settle(p);
    out[`sticky${url}`] = await p.evaluate(async () => {
      const aside = [...document.querySelectorAll('aside, div, section')].find(e => getComputedStyle(e).position === 'sticky' && e.textContent.includes('SAR'));
      if (!aside) return 'no sticky';
      scrollTo(0, 1200); await new Promise(r => setTimeout(r, 200));
      const r = aside.getBoundingClientRect();
      return { top: Math.round(r.top), h: Math.round(r.height), docH: document.documentElement.scrollHeight, scrollY };
    });
  }
  await login(p, 'chair1');
  await p.goto(BASE + `/app/sections/${encodeURIComponent('cycle-demo-2569::3.6')}`); await settle(p);
  out.sidetabs = await p.evaluate(() => [...document.querySelectorAll('[data-testid^=sidetab-]')].map(t => [t.dataset.testid, Math.round(t.getBoundingClientRect().height)]));
  await p.goto(BASE + '/app/review'); await settle(p);
  out.reviewRows = await p.evaluate(() => [...document.querySelectorAll('#main tbody tr')].slice(0, 6).map(r => Math.round(r.getBoundingClientRect().height)));
  await p.getByTestId('lang-en').click(); await p.waitForTimeout(400);
  const p2 = await ctx.newPage(); await p2.goto(BASE + '/app/actions'); await settle(p2);
  out.langOtherTab = await p2.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, htmlLang: document.documentElement.lang }));
  await p.getByTestId('lang-th').click(); await p2.waitForTimeout(600);
  out.langOtherTabAfterTh = await p2.evaluate(() => document.querySelector('h1')?.textContent);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'th-TH' }); const p = await ctx.newPage();
  await login(p, 'uadmin'); await p.goto(BASE + '/app/admin'); await settle(p);
  out.admin390 = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid^=user-manage-]')].map(x => { const r = x.getBoundingClientRect(); return [x.dataset.testid, Math.round(r.width), Math.round(r.height)]; });
    const tl = document.querySelector('[role=tablist]');
    return { pageH: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, btn, tabTops: [...tl.querySelectorAll('[role=tab]')].map(t => Math.round(t.getBoundingClientRect().top)), tl: [tl.scrollWidth, tl.clientWidth] };
  });
  await p.getByTestId('user-manage-staff1').click(); await p.waitForTimeout(400);
  out.panel390 = await p.evaluate(() => {
    const pn = document.querySelector('[data-testid=user-panel-staff1]');
    return { sw: document.documentElement.scrollWidth, small: [...pn.querySelectorAll('button,select,input')].map(x => { const r = x.getBoundingClientRect(); return [x.dataset.testid || x.getAttribute('aria-label') || x.textContent.trim().slice(0, 14), Math.round(r.width), Math.round(r.height)]; }).filter(x => x[2] < 44 || x[1] < 44) };
  });
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'recheck-misc.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
