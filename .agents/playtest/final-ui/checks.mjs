// TASK-0002 เฟส 7: AC-04 (ก ตัวอักษร 125%, ข text-spacing, ค 360×800), AC-17 (125% crop), AC-19 (axe-core แทน Lighthouse),
// focus สุ่ม (AC-01b ส่วน focus), AC-31 (กฎ :hover ที่ยก/เลื่อนการ์ด, animation วน)
// รัน: BASE=http://localhost:3960 node .agents/playtest/final-ui/checks.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
const BASE = process.env.BASE || 'http://localhost:3960';
const AXE = fs.readFileSync(path.resolve(here, '../../../eduflow-next/node_modules/axe-core/axe.min.js'), 'utf8');
const SECTION = `/app/sections/${encodeURIComponent('cycle-demo-2569::3.6')}`;
const res = {};
const b = await chromium.launch();
const log = (...a) => console.log(...a);
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}
async function loginAs(page, u) {
  await page.goto(BASE + '/login'); await settle(page);
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); });
  await page.goto(BASE + '/login'); await settle(page);
  await page.getByTestId('login-username').fill(u); await page.getByTestId('login-password').fill('demo1234');
  await page.getByTestId('login-submit').click(); await page.waitForURL('**/app', { timeout: 30000 }); await settle(page);
}
const measure = page => page.evaluate(() => {
  const clip = [];
  document.querySelectorAll('body *').forEach(el => {
    if (![...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return;
    if (el.closest('.sr-only')) return;
    if (/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY) && !/line-clamp|truncate/.test(el.className?.toString?.() || '') && s.textOverflow !== 'ellipsis'
      && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2))
      clip.push(`${el.tagName.toLowerCase()} sw${el.scrollWidth}/cw${el.clientWidth} sh${el.scrollHeight}/ch${el.clientHeight} "${el.textContent.trim().slice(0, 24)}"`);
  });
  // ข้อความล้นกล่องที่มีขอบ (ปุ่ม/badge/ช่อง heat) — ลูกยื่นเกินพ่อ
  const over = [];
  document.querySelectorAll('button, .aq-badge, [data-testid^=heat-], a[data-testid]').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    if (el.scrollWidth > el.clientWidth + 2) over.push(`${el.dataset.testid || el.tagName} sw${el.scrollWidth}/cw${el.clientWidth} "${el.textContent.trim().slice(0, 20)}"`);
  });
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth, clip: clip.slice(0, 10), over: over.slice(0, 10) };
});
const PAGES = [['login', '/login', null], ['app', '/app', 'chair1'], ['dashboard', '/app/cycles/cycle-demo-2569', 'chair1'], ['section', SECTION, 'chair1'], ['evidence-form', '/app/evidence', 'chair1'], ['admin', '/app/admin', 'uadmin']];
async function visit(page, [key, url, user], state) {
  if (user && state.user !== user) { await loginAs(page, user); state.user = user; }
  await page.goto(BASE + url); await settle(page);
  if (key === 'evidence-form') { await page.getByTestId('ev-new').click(); await page.waitForTimeout(400); }
}

// ---- (ก) 125% + (ข) text-spacing + (ค) 360x800 ----
const modes = [
  ['scale125', 1440, 900], ['scale125', 390, 844],
  ['spacing', 1440, 900], ['spacing', 390, 844],
  ['zoom200', 360, 800],
];
for (const [mode, w, h] of modes) for (const theme of ['light', 'dark']) {
  if (theme === 'dark' && mode !== 'scale125') continue;
  const tag = `${mode}-${theme}-${w}`; log('==', tag);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', deviceScaleFactor: mode === 'scale125' && w === 390 ? 2 : 1 });
  await ctx.addInitScript(([m, t]) => {
    if (m === 'scale125') localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: 1.25, effects: true, demoOpen: false }));
    if (t === 'dark') localStorage.setItem('aunqa_theme', 'dark');
    if (m === 'spacing') document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '* { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important } p { margin-bottom:2em !important }'; document.head.appendChild(s); });
  }, [mode, theme]);
  const page = await ctx.newPage(); const state = {};
  for (const p of PAGES) {
    try {
      await visit(page, p, state);
      res[`${tag}-${p[0]}`] = await measure(page);
      if (mode === 'scale125' || p[0] === 'dashboard' || p[0] === 'app') await page.screenshot({ path: `${OUT}final-${mode}-${p[0]}-${theme}-${w}.png`, fullPage: mode !== 'scale125' || w !== 390 });
    } catch (e) { log('ERR', tag, p[0], e.message.slice(0, 150)); }
  }
  if (mode === 'scale125') { // เมนู/ปุ่มบนแถบบนที่ 125%
    try {
      await page.goto(BASE + '/app'); await settle(page);
      await page.locator('header').first().screenshot({ path: `${OUT}final-scale125-topbar-${theme}-${w}.png` });
      await page.getByTestId('user-menu').click(); await page.waitForTimeout(350);
      await page.screenshot({ path: `${OUT}final-scale125-usermenu-${theme}-${w}.png` });
      res[`${tag}-usermenu`] = await measure(page);
    } catch (e) { log('ERR um', e.message.slice(0, 100)); }
  }
  await ctx.close();
}

// ---- axe (AC-19) + focus + hover rules + reduced motion ----
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'th-TH' });
  if (theme === 'dark') await ctx.addInitScript(() => localStorage.setItem('aunqa_theme', 'dark'));
  const page = await ctx.newPage(); const state = {};
  for (const p of [['login', '/login', null], ['app', '/app', 'chair1'], ['section', SECTION, 'chair1'], ['dashboard', '/app/cycles/cycle-demo-2569', 'chair1'], ['admin', '/app/admin?tab=users', 'uadmin']]) {
    try {
      await visit(page, p, state);
      await page.addScriptTag({ content: AXE });
      res[`axe-${theme}-${p[0]}`] = await page.evaluate(async () => {
        const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary || '').slice(0, 160)) })), passes: r.passes.length, incomplete: r.incomplete.map(v => v.id + ':' + v.nodes.length) };
      });
      // focus: Tab 20 ครั้ง วัด outline
      await page.mouse.click(5, 300).catch(() => {});
      const foc = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        foc.push(await page.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
          const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          let e = el.parentElement, bg = null; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] >= 1) { bg = c; break; } e = e.parentElement; }
          bg = bg || parse(getComputedStyle(document.body).backgroundColor);
          const oc = parse(s.outlineColor); const w = parseFloat(s.outlineWidth);
          const ratio = oc ? ((Math.max(lum(oc), lum(bg)) + .05) / (Math.min(lum(oc), lum(bg)) + .05)) : 0;
          return { id: el.dataset.testid || el.tagName + ':' + (el.innerText || '').trim().slice(0, 12), w, style: s.outlineStyle, ratio: +ratio.toFixed(2) };
        }));
      }
      const f = foc.filter(Boolean);
      res[`focus-${theme}-${p[0]}`] = { n: f.length, bad: f.filter(x => x.style === 'none' || x.w < 2 || x.ratio < 3), minRatio: Math.min(...f.map(x => x.ratio)) };
    } catch (e) { log('ERR axe', theme, p[0], e.message.slice(0, 150)); }
  }
  // AC-31: กฎ :hover ที่มี transform/translate/scale + animation วน หลังโหลด
  res[`hover-${theme}`] = await page.evaluate(() => {
    const out = [];
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
      const walk = rs => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.selectorText && r.selectorText.includes(':hover') && (r.style.transform || r.style.translate || r.style.scale || r.style.getPropertyValue('--tw-translate-y') || r.style.getPropertyValue('--tw-scale-x'))) out.push(r.selectorText.slice(0, 80)); } };
      walk(rules); }
    return out;
  });
  await ctx.close();
}
// reduced motion: เปิดเมนู/แผงแล้วไม่มี animation running
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'th-TH', reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await loginAs(page, 'staff1');
  const run = () => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect?.getTiming?.().duration || 0) > 10).length);
  await page.getByTestId('nav-bell').click(); await page.waitForTimeout(60); const a1 = await run(); await page.keyboard.press('Escape');
  await page.getByTestId('user-menu').click(); await page.waitForTimeout(60); const a2 = await run();
  res['reduced-motion'] = { noti: a1, usermenu: a2 };
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'checks.json'), JSON.stringify(res, null, 1));
await b.close(); log('done', Object.keys(res).length);
