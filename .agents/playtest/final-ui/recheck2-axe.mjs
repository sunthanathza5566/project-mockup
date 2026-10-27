// re-check 2: axe-core บนหน้าที่ R2-F13 แตะ (review, actions + dialog ตรวจรับ, evidence detail, admin 390) × 2 ธีม
// รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2-axe.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:3970';
const AXE = fs.readFileSync('eduflow-next/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();
const run = p => p.evaluate(async src => { if (!window.axe) eval(src); const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }); return r.violations.map(v => `${v.id}:${v.nodes.length}`); }, AXE);
for (const theme of ['light', 'dark']) for (const [w, h] of [[1280, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme });
  if (theme === 'dark') await ctx.addInitScript(() => { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); });
  const p = await ctx.newPage();
  const login = async u => { await p.goto(BASE + '/login'); await p.evaluate(() => localStorage.removeItem('aunqa_session')); await p.goto(BASE + '/login'); await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); };
  const go = async u => { await p.goto(BASE + u); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700); };
  await login('chair1');
  await go('/app/review'); console.log(theme, w, 'review', await run(p));
  await go('/app/actions'); console.log(theme, w, 'actions', await run(p));
  await p.locator('[data-testid=action-to-verified]').first().click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(300); console.log(theme, w, 'actions-dialog', await run(p)); await p.keyboard.press('Escape');
  await login('staff1'); await go('/app/evidence'); await p.locator('#main a[href*="/app/evidence/"]', { hasText: 'E-1.1-01' }).first().click(); await p.waitForURL('**/app/evidence/**'); await p.waitForTimeout(800);
  await p.getByTestId('ev-link-reqs-input').click(); await p.waitForTimeout(300); console.log(theme, w, 'evidence-detail+picker', await run(p));
  await login('uadmin'); await go('/app/admin'); console.log(theme, w, 'admin', await run(p));
  await ctx.close();
}
await b.close();
