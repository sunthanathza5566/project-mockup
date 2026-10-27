// re-check 2: หา wrapper ที่เลื่อนแนวนอนได้ (scrollWidth > clientWidth) ทุกหน้าหลัก ที่ 1280/1366 × 100%/125%
// รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2-wrap.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3970';
const C = 'cycle-demo-2569';
const PAGES = { chair1: ['/app', '/app/review', '/app/cycles', `/app/cycles/${C}`, `/app/cycles/${C}/assign`, '/app/evidence', '/app/requirements', '/app/curriculum', '/app/metrics', '/app/actions', '/app/export'], uadmin: ['/app/admin', '/app/admin?tab=requests', '/app/admin?tab=audit'] };
const b = await chromium.launch();
for (const scale of [1, 1.25]) for (const w of [1280, 1366, 1024]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'th-TH' });
  await ctx.addInitScript(s => { if (!localStorage.getItem('aunqa_ui_prefs')) localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: true, demoOpen: false })); }, scale);
  const p = await ctx.newPage();
  for (const [u, urls] of Object.entries(PAGES)) {
    await p.goto(BASE + '/login'); await p.evaluate(() => localStorage.removeItem('aunqa_session')); await p.goto(BASE + '/login');
    await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app');
    for (const url of urls) {
      await p.goto(BASE + url); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700);
      const r = await p.evaluate(() => [...document.querySelectorAll('#main *')].filter(e => { const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && e.getBoundingClientRect().width > 0 && !e.matches('[role=tablist]'); }).map(e => `${e.tagName.toLowerCase()}[${e.dataset.testid || e.firstElementChild?.dataset?.testid || ''}] ${e.scrollWidth}/${e.clientWidth}`));
      const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (r.length || hs) console.log(scale, w, url, hs ? 'PAGE-HSCROLL' : '', r.join(' | '));
    }
  }
  await ctx.close();
}
await b.close(); console.log('done');
