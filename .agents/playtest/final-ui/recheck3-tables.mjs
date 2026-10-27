// TASK-0002 UI re-check 3 (หลัง R2-F14 container query + R2-F15 data-label EN)
// ทุกตาราง × 1920/1440/1365/1280/1024/768/390 × 100/125% × light/dark (+ EN ที่ 1024/390)
// วัด: โหมด (table/cards), ปุ่ม/ลิงก์/select/input ในตารางถูกซ่อนนอก wrapper, h-scroll หน้า, ป้าย ::before ในโหมดการ์ด
//      (ว่าง/ไทยในโหมด EN), เซลล์ว่างที่มีป้ายลอย (ช่องว่างแปลก), ข้อความล้นการ์ด
// รัน: BASE=http://localhost:3980 [THEMES=light] [SHOTS=1] node .agents/playtest/final-ui/recheck3-tables.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
const TMP = path.resolve(here, 'r3/shots') + '/'; fs.mkdirSync(TMP, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3980';
const THEMES = (process.env.THEMES || 'light,dark').split(',');
const SHOTS = process.env.SHOTS === '1';
const C = 'cycle-demo-2569';
const WIDTHS = [1920, 1440, 1365, 1280, 1024, 768, 390];
const settle = async p => { await p.waitForLoadState('networkidle').catch(() => {}); await p.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(600); };
const VIEWS = [
  ['chair1', 'review', '/app/review'],
  ['chair1', 'actions', '/app/actions'],
  ['chair1', 'cycles', '/app/cycles'],
  ['chair1', 'dashboard', `/app/cycles/${C}`],
  ['chair1', 'assign', `/app/cycles/${C}/assign`],
  ['chair1', 'evidence', '/app/evidence'],
  ['chair1', 'evidence-detail', '/app/evidence', async p => { await p.locator('#main a[href*="/app/evidence/"]').first().click(); await p.waitForURL('**/app/evidence/**'); await settle(p); }],
  ['chair1', 'cur-plo', '/app/curriculum'],
  ['chair1', 'cur-course', '/app/curriculum', async p => { await p.getByTestId('cur-tab-course').click(); await p.waitForTimeout(300); const t = p.locator('[data-testid^=course-toggle-]').first(); if (await t.count()) { await t.click(); await p.waitForTimeout(300); } }],
  ['chair1', 'cur-ai7', '/app/curriculum', async p => { await p.getByTestId('cur-tab-ai').click(); await p.waitForTimeout(300); await p.getByTestId('ai-verb-run').click(); await p.getByTestId('ai-verb-result').waitFor({ timeout: 30000 }); await p.waitForTimeout(400); }],
  ['chair1', 'metrics', '/app/metrics'],
  ['chair1', 'metrics-edit', '/app/metrics', async p => { await p.locator('[data-testid^=metric-edit-]').first().click(); await p.waitForTimeout(300); }],
  ['uadmin', 'admin-users', '/app/admin'],
  ['uadmin', 'admin-audit', '/app/admin?tab=audit'],
];
const MEASURE = () => {
  const thai = /[฀-๿]/;
  const res = { page: document.documentElement.scrollWidth > innerWidth + 1 ? `${document.documentElement.scrollWidth}/${innerWidth}` : '', tables: [] };
  document.querySelectorAll('#main table').forEach(t => {
    let wrap = t.parentElement; while (wrap && getComputedStyle(wrap).overflowX === 'visible' && wrap.id !== 'main') wrap = wrap.parentElement;
    const matrix = !!t.closest('.aq-matrix');
    const wr = wrap.getBoundingClientRect();
    const thead = t.querySelector('thead');
    const cards = !thead || getComputedStyle(thead).display === 'none' || getComputedStyle(thead).position === 'absolute' || getComputedStyle(t).display === 'block';
    let hid = 0, part = 0, n = 0; const names = new Set();
    t.querySelectorAll('tbody button, tbody a, tbody select, tbody input').forEach(x => { const r = x.getBoundingClientRect(); if (!r.width) return; n++; const v = Math.min(r.right, wr.right) - Math.max(r.left, wr.left); if (v <= 0) { hid++; names.add((x.innerText || x.getAttribute('aria-label') || x.tagName).trim().slice(0, 14)); } else if (v < r.width - 1) { part++; names.add('~' + (x.innerText || x.getAttribute('aria-label') || x.tagName).trim().slice(0, 14)); } });
    const lbl = { n: 0, empty: 0, thai: 0, ex: new Set(), blank: 0, blankEx: new Set(), over: 0, overEx: new Set(), lblSize: new Set() };
    if (cards) t.querySelectorAll('tbody td').forEach(td => {
      const s = getComputedStyle(td); if (s.display === 'none') return;
      const r = td.getBoundingClientRect(); if (!r.height) return;
      const b = getComputedStyle(td, '::before'); const c = b.content;
      const hasLbl = c && c !== 'none' && c !== 'normal' && c !== '""';
      const txt = (td.innerText || '').trim(); const ctl = td.querySelector('button,a,select,input,svg,img');
      if (td.dataset.label !== undefined) { lbl.n++; if (!hasLbl) lbl.empty++; else { lbl.lblSize.add(`${b.fontSize}/${b.fontWeight}`); if (thai.test(c)) { lbl.thai++; lbl.ex.add(c.slice(0, 20)); } } }
      const ownTxt = hasLbl ? txt.replace(c.replace(/^"|"$/g, ''), '').trim() : txt;
      if (hasLbl && !ownTxt && !ctl) { lbl.blank++; lbl.blankEx.add(td.dataset.label); }
      td.querySelectorAll('*').forEach(e => { const er = e.getBoundingClientRect(); if (er.width && er.right > wr.right + 1 && getComputedStyle(e).position !== 'fixed') { lbl.over++; lbl.overEx.add((e.innerText || e.tagName).trim().slice(0, 14)); } });
    });
    res.tables.push({ id: t.dataset.testid || 'table', matrix, mode: cards ? 'cards' : 'table', sw: wrap.scrollWidth, cw: wrap.clientWidth, n, hid, part, names: [...names].slice(0, 5), lbl: { ...lbl, ex: [...lbl.ex].slice(0, 5), blankEx: [...lbl.blankEx].slice(0, 5), overEx: [...lbl.overEx].slice(0, 5), lblSize: [...lbl.lblSize] } });
  });
  return res;
};
const b = await chromium.launch();
const all = []; const issues = [];
async function run(theme, scale, w, lang) {
  const ctx = await b.newContext({ viewport: { width: w, height: w <= 390 ? 844 : 900 }, locale: 'th-TH', colorScheme: theme });
  await ctx.addInitScript(([t, s, l]) => { try {
    if (t === 'dark' && !localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark');
    if (!localStorage.getItem('aunqa_ui_prefs')) localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: true, demoOpen: false }));
    if (l === 'en' && !localStorage.getItem('aunqa_lang')) localStorage.setItem('aunqa_lang', 'en');
  } catch {} }, [theme, scale, lang]);
  const p = await ctx.newPage();
  p.on('pageerror', e => issues.push(`pageerror ${theme} ${w} ${e.message.slice(0, 100)}`));
  p.on('response', r => { if (r.status() >= 500) issues.push(`HTTP ${r.status()} ${r.url()}`); });
  let who = '';
  for (const [u, name, url, act] of VIEWS) {
    try {
      if (u !== who) { await p.goto(BASE + '/login'); await settle(p); await p.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); }); await p.goto(BASE + '/login'); await settle(p);
        await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app', { timeout: 30000 }); who = u; }
      await p.goto(BASE + url); await settle(p); if (act) await act(p);
      if (lang === 'en') await p.waitForTimeout(500);
      const m = await p.evaluate(MEASURE);
      const key = `${name} ${theme} ${w} ${scale} ${lang}`;
      all.push({ key, ...m, htmlLang: await p.evaluate(() => document.documentElement.lang) });
      const bad = [];
      if (m.page) bad.push(`PAGE-HSCROLL ${m.page}`);
      for (const t of m.tables) {
        if (!t.matrix && (t.hid || t.part)) bad.push(`${t.id} ${t.mode} ${t.sw}/${t.cw} hidden ${t.hid} partial ${t.part} [${t.names}]`);
        if (t.lbl.empty) bad.push(`${t.id} label-empty ${t.lbl.empty}/${t.lbl.n}`);
        if (lang === 'en' && t.lbl.thai) bad.push(`${t.id} label-thai-in-EN ${t.lbl.thai} [${t.lbl.ex}]`);
        if (t.lbl.over) bad.push(`${t.id} card-overflow ${t.lbl.over} [${t.lbl.overEx}]`);
        if (t.lbl.blank) bad.push(`${t.id} blank-labelled-cells ${t.lbl.blank} [${t.lbl.blankEx}]`);
      }
      if (bad.length) issues.push(`${key}: ${bad.join(' | ')}`);
      if (SHOTS) await p.screenshot({ path: `${TMP}${name}-${theme}-${w}-${scale}-${lang}.png`, fullPage: true });
    } catch (e) { issues.push(`ERR ${name} ${theme} ${w} ${scale} ${lang}: ${e.message.split('\n')[0].slice(0, 150)}`); }
  }
  await ctx.close();
}
for (const theme of THEMES) for (const scale of [1, 1.25]) for (const w of WIDTHS) { await run(theme, scale, w, 'th'); console.log('ok', theme, scale, w); }
for (const theme of THEMES) for (const w of [1440, 1024, 390]) await run(theme, 1, w, 'en');
fs.writeFileSync(path.resolve(here, `r3/tables-${THEMES.join('_')}.json`), JSON.stringify({ issues, all }, null, 1));
console.log('ISSUES', issues.length); issues.forEach(i => console.log(' ', i));
await b.close();
