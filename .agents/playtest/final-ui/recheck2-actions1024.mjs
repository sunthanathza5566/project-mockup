// re-check 2: ภาพ /app/actions ที่ 1024 (ปุ่มท้ายแถวถูกซ่อน) — รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2-actions1024.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3970';
const b = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 900 }, locale: 'th-TH', colorScheme: theme });
  if (theme === 'dark') await ctx.addInitScript(() => { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); });
  const p = await ctx.newPage();
  await p.goto(BASE + '/login'); await p.getByTestId('login-username').fill('chair1'); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); await p.goto(BASE + '/app/actions'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
  await p.getByTestId('action-table').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `.agents/screenshots/TASK-0002/final-actions-${theme}-1024.png` });
  await ctx.close();
}
await b.close();
