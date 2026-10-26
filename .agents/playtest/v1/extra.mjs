// TASK-0002 V1 (ส่วนเสริม): panel ว่าง (uadmin), ตรวจ details "งานอื่น ๆ", ภาพเทียบ v0 vs v1
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
const BASE = process.env.BASE || 'http://localhost:3930';
const b = await chromium.launch();
const out = {};
async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {}); await page.waitForTimeout(600); }
async function loginAs(page, u) {
  await page.goto(BASE + '/login'); await settle(page);
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); });
  await page.goto(BASE + '/login'); await settle(page);
  await page.getByTestId('login-username').fill(u); await page.getByTestId('login-password').fill('demo1234');
  await page.getByTestId('login-submit').click(); await page.waitForURL('**/app', { timeout: 30000 }); await settle(page);
}
for (const theme of ['light', 'dark']) for (const [vp, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const tag = `${theme}-${vp}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme });
  if (theme === 'dark') await ctx.addInitScript(() => { try { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  for (const u of ['uadmin', 'sadmin', 'qa1', 'lect1']) {
    await loginAs(page, u).catch(() => {});
    await page.evaluate(u => { const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]'); const me = users.find(x => x.username === u); const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]'); localStorage.setItem('aunqa_notifications', JSON.stringify(rows.filter(r => r.userId !== me?.id))); }, u);
    await page.goto(BASE + '/app'); await settle(page);
    await page.getByTestId('nav-bell').click(); await page.waitForTimeout(500);
    if (await page.getByTestId('noti-empty').isVisible().catch(() => false)) {
      await page.screenshot({ path: `${OUT}v1-noti-empty-${tag}.png` });
      out[`empty-${tag}`] = u; break;
    }
    await page.keyboard.press('Escape');
  }
  if (vp === '1440' && theme === 'light') {
    await loginAs(page, 'chair1');
    out.details = await page.evaluate(() => [...document.querySelectorAll('#main details')].map(d => ({ open: d.open, text: d.querySelector('summary')?.innerText, nextSiblingText: d.nextElementSibling?.innerText?.slice(0, 60), inner: d.innerText.slice(0, 120) })));
    out.activeNav = await page.evaluate(() => { const a = document.querySelector('#app-sidebar [aria-current=page]'); if (!a) return null; const s = getComputedStyle(a); const be = getComputedStyle(a, '::before'); return { bl: s.borderLeftWidth + ' ' + s.borderLeftColor, shadow: s.boxShadow, before: be.content + ' w=' + be.width + ' bg=' + be.backgroundColor, cls: a.className }; });
    out.navGroup = await page.evaluate(() => { const g = document.querySelector('.aq-nav-group'); const s = getComputedStyle(g); return { fs: s.fontSize, fw: s.fontWeight, color: s.color, tt: s.textTransform, ls: s.letterSpacing }; });
    out.roleMeta = await page.evaluate(() => { const t = document.querySelector('[data-testid=user-menu]'); return [...t.querySelectorAll('span,div')].map(e => ({ t: e.innerText.slice(0, 20), fs: getComputedStyle(e).fontSize })).filter(x => x.t); });
    out.bodyFont = await page.evaluate(async () => { await document.fonts.ready; return { body: getComputedStyle(document.body).fontFamily, loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))] }; });
    // ทักทาย: ปุ่ม focus ring
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  }
  await ctx.close();
}
// ---------- ภาพเทียบ v0 vs v1 ----------
const pairs = [
  ['app-light-1440', 'home-chair1-light-1440', 'cmp-app-light-1440', 'หน้าหลัก chair1 (สว่าง 1440)'],
  ['app-dark-1440', 'home-chair1-dark-1440', 'cmp-app-dark-1440', 'หน้าหลัก chair1 (มืด 1440)'],
  ['prefs-light-1440', 'usermenu-light-1440', 'cmp-prefs-vs-usermenu-light-1440', 'การแสดงผล: ท้าย sidebar (v0) → เมนูผู้ใช้ (v1)'],
  ['login-light-1440', 'login-light-1440', 'cmp-login-light-1440', 'หน้าเข้าสู่ระบบ (สว่าง 1440)'],
  ['app-fold-light-390', 'shell-light-390', 'cmp-shell-light-390', 'shell มือถือ 390 (สว่าง)'],
  ['crop-topbar-light', 'crop-topbar-light', 'cmp-topbar-light', 'แถบบน (สว่าง)'],
];
const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
const page = await ctx.newPage();
for (const [a, c, name, title] of pairs) {
  const A = `${OUT}v0-${a}.png`, C = `${OUT}v1-${c}.png`;
  if (!fs.existsSync(A) || !fs.existsSync(C)) { out[name] = 'missing'; continue; }
  const d64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  await page.setContent(`<html><body style="margin:0;font-family:sans-serif;background:#ddd"><div style="padding:10px 16px;font-size:22px;font-weight:600">${title}</div>
  <div style="display:flex;gap:16px;padding:0 16px 16px;align-items:flex-start">
  <figure style="margin:0;flex:1"><figcaption style="font-size:20px;padding:4px 0">ก่อน (v0 รอบแรก)</figcaption><img src="${d64(A)}" style="width:100%;max-height:1400px;object-fit:contain;object-position:top;border:1px solid #999"></figure>
  <figure style="margin:0;flex:1"><figcaption style="font-size:20px;padding:4px 0">หลัง (v1 รอบ 2)</figcaption><img src="${d64(C)}" style="width:100%;max-height:1400px;object-fit:contain;object-position:top;border:1px solid #999"></figure>
  </div></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}v1-${name}.png`, fullPage: true });
}
await ctx.close();
fs.writeFileSync(path.join(here, 'v1-extra.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
