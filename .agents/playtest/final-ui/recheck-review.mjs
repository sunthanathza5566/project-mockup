// TASK-0002 re-check: ตาราง /app/review — ปุ่มท้ายแถวถูกตัดหลังแก้ m9 (nowrap) ไหม ที่หลายความกว้าง
// รัน: BASE=http://localhost:3960 node .agents/playtest/final-ui/recheck-review.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3960';
const b = await chromium.launch();
for (const w of [1280, 1440, 1600, 1920, 1024, 768]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'th-TH' }); const p = await ctx.newPage();
  await p.goto(BASE + '/login'); await p.getByTestId('login-username').fill('chair1'); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); await p.goto(BASE + '/app/review'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const t = document.querySelector('#main table'); if (!t) return 'no table';
    let wrap = t.parentElement; while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
    const wr = wrap.getBoundingClientRect();
    const row = t.querySelector('tbody tr');
    const btns = [...row.querySelectorAll('button, a')].map(x => { const r = x.getBoundingClientRect(); return { t: (x.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 20), aria: x.getAttribute('aria-label'), right: Math.round(r.right), visibleW: Math.round(Math.max(0, Math.min(r.right, wr.right) - r.left)), w: Math.round(r.width) }; });
    return { wrapSW: wrap.scrollWidth, wrapCW: wrap.clientWidth, wrapRight: Math.round(wr.right), btns };
  });
  console.log(w, JSON.stringify(r));
  if (w === 1280) await p.screenshot({ path: '.agents/screenshots/TASK-0002/final-review-light-1280.png', fullPage: false });
  await ctx.close();
}
await b.close();
