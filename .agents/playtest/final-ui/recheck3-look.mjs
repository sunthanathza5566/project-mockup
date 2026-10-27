// re-check 3: ภาพเฉพาะตาราง (element screenshot, แถวแรก ๆ) สำหรับดูด้วยตา — เขียนลง r3/look
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE = process.env.BASE || 'http://localhost:3980'; const C = 'cycle-demo-2569';
const settle = async p => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(700); };
const V = {
  'metrics-edit': ['chair1', '/app/metrics', async p => { await p.locator('[data-testid^=metric-edit-]').first().click(); await p.waitForTimeout(300); }, '[data-testid=metric-table]'],
  'cur-course': ['chair1', '/app/curriculum', async p => { await p.getByTestId('cur-tab-course').click(); await p.waitForTimeout(300); await p.locator('[data-testid^=course-toggle-]').first().click(); await p.waitForTimeout(300); }, '[data-testid=course-table]'],
  'cur-ai7': ['chair1', '/app/curriculum', async p => { await p.getByTestId('cur-tab-ai').click(); await p.getByTestId('ai-verb-run').click(); await p.getByTestId('ai-verb-result').waitFor({ timeout: 30000 }); await p.waitForTimeout(400); }, '[data-testid=ai-verb-result] table'],
  'cur-plo': ['chair1', '/app/curriculum', null, '[data-testid=plo-table]'],
  'assign': ['chair1', `/app/cycles/${C}/assign`, null, '#main table'],
  'evidence': ['chair1', '/app/evidence', null, '[data-testid=ev-table]'],
  'evidence-detail': ['chair1', '/app/evidence', async p => { await p.locator('#main a[href*="/app/evidence/"]').first().click(); await p.waitForURL('**/app/evidence/**'); await settle(p); }, '#main table'],
  'review': ['chair1', '/app/review', null, '[data-testid=review-table]'],
  'actions': ['chair1', '/app/actions', null, '[data-testid=action-table]'],
  'cycles': ['chair1', '/app/cycles', null, '[data-testid=cycles-table]'],
  'audit': ['uadmin', '/app/admin?tab=audit', null, '[data-testid=audit-table]'],
  'users': ['uadmin', '/app/admin', null, '[data-testid=users-table]'],
};
const JOBS = (process.env.JOBS || '').split(' ').filter(Boolean); // name:theme:w:scale:lang
const b = await chromium.launch();
for (const j of JOBS) {
  const [name, theme, w, scale, lang] = j.split(':'); const [u, url, act, sel] = V[name];
  const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, locale: 'th-TH', colorScheme: theme });
  await ctx.addInitScript(([t, s, l]) => { if (t === 'dark') localStorage.setItem('aunqa_theme', 'dark'); localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: +s, effects: true, demoOpen: false })); if (l === 'en') localStorage.setItem('aunqa_lang', 'en'); }, [theme, scale, lang]);
  const p = await ctx.newPage();
  await p.goto(BASE + '/login'); await settle(p); await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app');
  await p.goto(BASE + url); await settle(p); if (act) await act(p);
  const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded();
  const bb = await el.boundingBox(); const vp = p.viewportSize();
  await p.evaluate(y => scrollBy(0, y - 120), bb.y);
  await p.screenshot({ path: `${process.env.OUTDIR || 'r3/look'}/${j.replace(/:/g, '-')}.png` });
  await ctx.close();
}
await b.close();
