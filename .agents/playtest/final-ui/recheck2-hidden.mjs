// re-check 2: ปุ่ม/ลิงก์ในตารางที่ถูกซ่อนนอกกรอบ wrapper (1024/1280/1366 × 100%/125%) + ต้นเหตุ h-scroll ที่ 1024@125%
// รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2-hidden.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3970';
const C = 'cycle-demo-2569';
const PAGES = { chair1: ['/app/review', '/app/cycles', `/app/cycles/${C}`, '/app/evidence', '/app/curriculum', '/app/actions'], uadmin: ['/app/admin'] };
const b = await chromium.launch();
for (const [scale, w] of [[1, 1024], [1, 1280], [1.25, 1280], [1.25, 1366], [1.25, 1024]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'th-TH' });
  await ctx.addInitScript(s => { if (!localStorage.getItem('aunqa_ui_prefs')) localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: true, demoOpen: false })); }, scale);
  const p = await ctx.newPage();
  for (const [u, urls] of Object.entries(PAGES)) {
    await p.goto(BASE + '/login'); await p.evaluate(() => localStorage.removeItem('aunqa_session')); await p.goto(BASE + '/login');
    await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app');
    for (const url of urls) {
      await p.goto(BASE + url); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700);
      const r = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('#main table').forEach(t => {
          let wrap = t.parentElement; while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
          if (!wrap || wrap.scrollWidth <= wrap.clientWidth + 2) return;
          const wr = wrap.getBoundingClientRect(); let hid = 0, part = 0, n = 0; const names = new Set();
          t.querySelectorAll('tbody button, tbody a, tbody select').forEach(x => { const r = x.getBoundingClientRect(); if (!r.width) return; n++; const v = Math.min(r.right, wr.right) - Math.max(r.left, wr.left); if (v <= 0) { hid++; names.add((x.innerText || x.getAttribute('aria-label') || x.tagName).trim().slice(0, 12)); } else if (v < r.width - 1) { part++; names.add('~' + (x.innerText || x.tagName).trim().slice(0, 12)); } });
          out.push(`${t.dataset.testid || 'table'} ${wrap.scrollWidth}/${wrap.clientWidth} controls ${n} hidden ${hid} partial ${part} [${[...names].slice(0, 5).join(', ')}]`);
        });
        let culprit = '';
        if (document.documentElement.scrollWidth > innerWidth) { const c = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0]; culprit = `PAGE ${document.documentElement.scrollWidth}/${innerWidth} culprit <${c?.tagName.toLowerCase()} ${c?.dataset?.testid || c?.className?.toString().slice(0, 60)}> "${(c?.innerText || '').trim().slice(0, 20)}" right ${Math.round(c?.getBoundingClientRect().right)}`; }
        return [culprit, ...out].filter(Boolean);
      });
      if (r.length) console.log(scale, w, url, r.join(' || '));
    }
  }
  await ctx.close();
}
await b.close(); console.log('done');
