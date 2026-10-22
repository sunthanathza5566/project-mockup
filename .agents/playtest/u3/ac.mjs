// U3: AC ที่ต้องดูด้วยตา — AC-04(ข)(ค), AC-07 grayscale, AC-13 (axe-core แทน Lighthouse), contrast สุ่ม (AC-01), line-height ไทย, วงแหวน
// รัน: cd .agents/playtest/u3 && node ac.mjs
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/u3') + '/';
const BASE = process.env.BASE || 'http://localhost:3951';
const C = 'cycle-demo-2569', enc = encodeURIComponent(C);
const AXE = fs.readFileSync(path.resolve(here, '../../../eduflow-next/node_modules/axe-core/axe.min.js'), 'utf8');
const SPACING = '* { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important } p { margin-bottom:2em !important }';
const res = {};
const b = await chromium.launch();

async function settle(p) {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.locator('h1').first().waitFor({ timeout: 20000 }).catch(() => {});
  await p.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(900);
}
async function login(p, u = 'chair1') {
  await p.goto(BASE + '/login');
  await p.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await p.goto(BASE + '/login');
  await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app', { timeout: 30000 }); await settle(p);
}
// ข้อความที่ถูกตัด: element overflow hidden/clip ที่ scrollHeight > clientHeight+1 หรือ scrollWidth > clientWidth+1 (ที่มี text)
const clipCheck = () => {
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    if (!/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) return;
    if (el.classList.contains('aq-sr-only') || s.position === 'fixed') return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (!el.innerText || !el.innerText.trim()) return;
    if (el.scrollHeight > el.clientHeight + 1 || (s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1))
      bad.push(`${el.tagName}.${(el.className + '').split(' ')[0]} sh${el.scrollHeight}/ch${el.clientHeight} sw${el.scrollWidth}/cw${el.clientWidth} "${el.innerText.trim().slice(0, 24)}"`);
  });
  const heat = [...document.querySelectorAll('.aq-heat-cell')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).length;
  return { hscroll: document.documentElement.scrollWidth > innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth, clipped: bad.slice(0, 12), clippedN: bad.length, heatOverflow: heat };
};
const pages5 = [
  ['login', null, async p => { await p.goto(BASE + '/login'); await settle(p); }],
  ['app', 1, async p => { await p.goto(BASE + '/app'); await settle(p); }],
  ['dash', 1, async p => { await p.goto(BASE + '/app/cycles/' + enc); await settle(p); }],
  ['section', 1, async p => { await p.goto(BASE + '/app/sections/' + encodeURIComponent(C + '::3.6')); await settle(p); }],
  ['evform', 1, async p => { await p.goto(BASE + '/app/evidence'); await settle(p); await p.getByTestId('ev-new').click(); await p.waitForTimeout(400); }],
];
// AC-04 (ข) text-spacing ที่ 1440/390 และ (ค) 360×800
for (const [mode, w, h, css] of [['spacing-d', 1440, 900, SPACING], ['spacing-m', 390, 844, SPACING], ['zoom200', 360, 800, null]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH' }); const p = await ctx.newPage();
  await login(p);
  for (const [n, , go] of pages5) {
    await go(p); if (css) { await p.addStyleTag({ content: css }); await p.waitForTimeout(300); }
    res[`AC04-${mode}-${n}`] = await p.evaluate(clipCheck);
    await p.screenshot({ path: `${OUT}ac04-${mode}-${n}.png`, fullPage: true });
  }
  await ctx.close();
}
// AC-07 grayscale + AC-13 axe + contrast sampling + line-height + ring @1440
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'th-TH' }); const p = await ctx.newPage();
  await p.goto(BASE + '/login'); await settle(p);
  const axeRun = async key => { await p.addScriptTag({ content: AXE }); res['axe-' + key] = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary || '').slice(0, 160)) })), passes: r.passes.length }; }); };
  await axeRun('login');
  await login(p);
  const contrast = async key => { res['contrast-' + key] = await p.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, bb] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return { L: 0.2126 * r + 0.7152 * g + 0.0722 * bb, a: m[3] === undefined ? 1 : m[3] }; };
    const bgOf = el => { while (el) { const c = getComputedStyle(el).backgroundColor; const l = lum(c); if (l.a > 0.9) return c; el = el.parentElement; } return 'rgb(251,248,243)'; };
    const els = [...document.querySelectorAll('main *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden');
    const out = []; const step = Math.max(1, Math.floor(els.length / 12));
    for (let i = 0; i < els.length && out.length < 12; i += step) { const el = els[i]; const s = getComputedStyle(el); const f = lum(s.color), g = lum(bgOf(el)); const r = (Math.max(f.L, g.L) + 0.05) / (Math.min(f.L, g.L) + 0.05); out.push(`${r.toFixed(2)} ${s.color} on ${bgOf(el)} "${el.textContent.trim().slice(0, 16)}"`); }
    return out;
  }); };
  const lhCheck = async key => { res['lh-' + key] = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('body *').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && /[฀-๿]/.test(n.textContent))) return;
      const s = getComputedStyle(el); const fs = parseFloat(s.fontSize); if (fs >= 18 || s.lineHeight === 'normal') return;
      const lh = parseFloat(s.lineHeight) / fs; if (lh >= 1.6) return;
      const k = `${(el.className + '').split(' ')[0] || el.tagName} ${fs}px lh${lh.toFixed(2)} ov:${s.overflow}`; o[k] = (o[k] || 0) + 1;
    });
    return o;
  }); };
  for (const [key, url] of [['app', '/app'], ['dash', '/app/cycles/' + enc], ['section', '/app/sections/' + encodeURIComponent(C + '::3.6')], ['evidence', '/app/evidence'], ['review', '/app/review'], ['heat', '/app/curriculum'], ['metrics', '/app/metrics'], ['assign', '/app/cycles/' + enc + '/assign'], ['admin', '/app/admin'], ['actions', '/app/actions']]) {
    await p.goto(BASE + url); await settle(p);
    if (key === 'heat') { await p.getByTestId('cur-tab-heat').click(); await p.waitForTimeout(500); }
    await contrast(key); await lhCheck(key);
    if (['app', 'dash', 'section'].includes(key)) await axeRun(key);
    if (['dash', 'heat', 'evidence', 'review'].includes(key)) {
      await p.addStyleTag({ content: 'html{filter:grayscale(1)!important}' }); await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}ac07-gray-${key}.png`, fullPage: true });
      await p.evaluate(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('grayscale(1)')) s.remove(); }));
    }
    if (key === 'dash') {
      res.ring = await p.evaluate(() => [...document.querySelectorAll('.aq-ring')].map(r => {
        const mid = r.querySelector('.aq-ring__mid'); const num = mid && (mid.querySelector('strong,b,.aq-ring__num') || mid.firstElementChild || mid);
        const rr = r.getBoundingClientRect(); const nr = num.getBoundingClientRect(); const s = getComputedStyle(num);
        const val = r.querySelector('.aq-ring__value');
        return { cls: r.className, ring: Math.round(rr.width), text: num.textContent.trim(), fs: s.fontSize, numW: Math.round(nr.width), numH: Math.round(nr.height), inner: Math.round(rr.width - 20), stroke: getComputedStyle(val).stroke, label: r.getAttribute('aria-label') };
      }));
      res.kpi = await p.evaluate(() => { const k = document.querySelector('[data-testid=kpi-summary]'); return k ? { cls: k.className, text: k.innerText.slice(0, 200) } : null; });
      const ring = p.locator('.aq-ring--lg').first(); if (await ring.count()) await ring.screenshot({ path: `${OUT}ring-dash-d.png` });
    }
  }
  // ring 53/53 กรณียาวสุด: ใช้ข้อความ "53/53" ทดลองใน ring จริง (เทียบ fs-2xl vs fs-xl)
  await p.goto(BASE + '/app/cycles/' + enc); await settle(p);
  const ringEl = p.locator('.aq-ring--lg').first();
  if (await ringEl.count()) {
    res.ringTry = {};
    for (const [lab, fs] of [['2xl', 'var(--fs-2xl)'], ['xl', 'var(--fs-xl)']]) {
      res.ringTry[lab] = await p.evaluate(fs => { const r = document.querySelector('.aq-ring--lg'); const mid = r.querySelector('.aq-ring__mid'); const num = mid.firstElementChild || mid; num.dataset.orig ??= num.textContent; num.textContent = '53/53'; num.style.fontSize = fs; const nr = num.getBoundingClientRect(); return { fs: getComputedStyle(num).fontSize, w: Math.round(nr.width), h: Math.round(nr.height), innerDiameter: 120 - 20 }; }, fs);
      await ringEl.screenshot({ path: `${OUT}ring-5353-${lab}.png` });
    }
  }
  await ctx.close();
}
// มือถือ 390: ring + mobile ring clip @125%
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'th-TH' }); const p = await ctx.newPage();
  await login(p);
  await p.goto(BASE + '/app/cycles/' + enc); await settle(p);
  const ring = p.locator('.aq-ring--lg').first(); if (await ring.count()) await ring.screenshot({ path: `${OUT}ring-dash-m.png` });
  res.ringM = await p.evaluate(() => { const r = document.querySelector('.aq-ring--lg'); if (!r) return null; const m = r.querySelector('.aq-ring__mid'); const n = m.firstElementChild || m; const nr = n.getBoundingClientRect(); return { text: n.textContent, fs: getComputedStyle(n).fontSize, w: Math.round(nr.width) }; });
  // logout ในมือถือ
  const menu = p.locator('button[aria-controls]').first();
  if (await menu.isVisible().catch(() => false)) { await menu.click(); await p.waitForTimeout(400); }
  const lo = p.getByTestId('logout');
  if (await lo.isVisible().catch(() => false)) { await lo.click(); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}19-logout-loader-m.png` }); res.logoutM = 'ok (ผ่าน drawer)'; }
  else res.logoutM = 'หา logout ไม่เจอ';
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'u3-ac.json'), JSON.stringify(res, null, 1));
await b.close();
console.log('done');
