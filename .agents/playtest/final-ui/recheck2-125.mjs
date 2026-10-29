// re-check 2: /app/review ที่ตัวอักษร 125% (ค่าในเมนูผู้ใช้) หลายความกว้าง — ปุ่มท้ายแถวอยู่ในกรอบไหม
// รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2-125.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3970';
const b = await chromium.launch();
for (const scale of [1.25, 1.125]) for (const w of [1280, 1320, 1366, 1400, 1440, 1536, 1600, 1024, 768]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'th-TH' });
  await ctx.addInitScript(s => { if (!localStorage.getItem('aunqa_ui_prefs')) localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: true, demoOpen: false })); }, scale);
  const p = await ctx.newPage();
  await p.goto(BASE + '/login'); await p.getByTestId('login-username').fill('chair1'); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); await p.goto(BASE + '/app/review'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const t = document.querySelector('[data-testid=review-table]'); let wrap = t.parentElement; while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
    const wr = wrap.getBoundingClientRect(); const head = getComputedStyle(t.querySelector('thead')).display !== 'none';
    const btns = [...t.querySelector('tbody tr').querySelectorAll('button')].map(x => { const r = x.getBoundingClientRect(); return `${Math.round(Math.max(0, Math.min(r.right, wr.right) - r.left))}/${Math.round(r.width)}`; });
    return `${head ? 'table' : 'cards'} wrap ${wrap.scrollWidth}/${wrap.clientWidth} fs=${getComputedStyle(document.documentElement).fontSize} btn vis/w ${btns.join(' ')}`;
  });
  console.log(scale, w, r); await ctx.close();
}
await b.close();
