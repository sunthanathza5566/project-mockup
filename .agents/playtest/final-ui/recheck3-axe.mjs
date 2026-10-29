// re-check 3: axe-core หน้าตารางที่ R2-F14 เปลี่ยน (โหมดการ์ดที่ 1024, โหมดตารางที่ 1440) × 2 ธีม
// รัน: BASE=http://localhost:3980 node .agents/playtest/final-ui/recheck3-axe.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:3980'; const C = 'cycle-demo-2569';
const AXE = fs.readFileSync('eduflow-next/node_modules/axe-core/axe.min.js', 'utf8');
const run = p => p.evaluate(async src => { if (!window.axe) eval(src); const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }); return r.violations.map(v => `${v.id}:${v.nodes.length}`); }, AXE);
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const w of [1024, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'th-TH', colorScheme: theme });
  if (theme === 'dark') await ctx.addInitScript(() => { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); });
  const p = await ctx.newPage();
  const login = async u => { await p.goto(BASE + '/login'); await p.evaluate(() => localStorage.removeItem('aunqa_session')); await p.goto(BASE + '/login'); await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); };
  const go = async u => { await p.goto(BASE + u); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700); };
  await login('chair1');
  for (const u of ['/app/cycles', `/app/cycles/${C}`, `/app/cycles/${C}/assign`, '/app/evidence', '/app/metrics']) { await go(u); console.log(theme, w, u, await run(p)); }
  await go('/app/curriculum'); console.log(theme, w, 'cur-plo', await run(p));
  await p.getByTestId('cur-tab-course').click(); await p.locator('[data-testid^=course-toggle-]').first().click(); await p.waitForTimeout(300); console.log(theme, w, 'cur-course+clo', await run(p));
  await p.getByTestId('cur-tab-ai').click(); await p.getByTestId('ai-verb-run').click(); await p.getByTestId('ai-verb-result').waitFor({ timeout: 30000 }); console.log(theme, w, 'cur-ai7', await run(p));
  await go('/app/metrics'); await p.locator('[data-testid^=metric-edit-]').first().click(); await p.waitForTimeout(300); console.log(theme, w, 'metrics-edit', await run(p));
  await login('uadmin'); await go('/app/admin?tab=audit'); console.log(theme, w, 'admin-audit', await run(p));
  await ctx.close();
}
await b.close();
