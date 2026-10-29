// TASK-0002 V0: ถ่าย landing/login/loader/shell/drawer/404/dialog/display-prefs × light/dark × 1440/390 + เก็บสถิติ
// รัน: node .agents/playtest/v0/shoot.mjs   (BASE=http://localhost:3951)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3951';
const SEC = '/app/sections/' + encodeURIComponent('cycle-demo-2569::3.6');
const stats = {};
const b = await chromium.launch();

// --- เก็บสถิติในหน้า: ฟอนต์, h-scroll, contrast (เฉพาะ scope), ตัดข้อความ, target, tabular-nums
async function collect(page, key, scopeSel) {
  stats[key] = await page.evaluate(async (scopeSel) => {
    await document.fonts.ready;
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    function bgOf(el) {
      const stack = []; let e = el;
      while (e && e.nodeType === 1) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } e = e.parentElement; }
      let bg = [255, 255, 255, 1];
      if (!e || e.nodeType !== 1) { const h = parse(getComputedStyle(document.documentElement).backgroundColor); if (h && h[3] > 0) bg = h; }
      for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
      return bg;
    }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const roots = scopeSel ? [...document.querySelectorAll(scopeSel)] : [document.body];
    const fonts = {}, low = [], clip = [], small = [], lhLow = [];
    let n = 0, minR = 99, minEx = '';
    const seen = new Set();
    for (const root of roots) root.querySelectorAll('*').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (![...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      if (el.closest('.sr-only,[aria-hidden=true]') && !el.closest('svg')) { /* ยังนับฟอนต์ แต่ไม่นับ contrast ของ sr-only */ }
      const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28);
      const fsz = parseFloat(s.fontSize);
      const lh = s.lineHeight === 'normal' ? 'normal' : (parseFloat(s.lineHeight) / fsz).toFixed(2);
      const fam = s.fontFamily.split(',')[0].replace(/"/g, '').replace(/_[0-9a-f]{6}$/, '');
      const k = `${fam} | ${s.fontSize} | ${s.fontWeight} | lh ${lh}`;
      fonts[k] = (fonts[k] || 0) + 1;
      if (fsz < 13) small.push(`${fsz}px "${txt}"`);
      const thai = /[฀-๿]/.test(el.textContent);
      if (thai && lh !== 'normal' && +lh < 1.35) lhLow.push(`${lh} ${s.fontSize} <${el.tagName.toLowerCase()}> "${txt}"`);
      // ตัด: overflow hidden + เนื้อหาสูง/กว้างเกินกล่อง
      if (/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && !el.closest('.sr-only'))
        clip.push(`${el.tagName.toLowerCase()} sw${el.scrollWidth}/cw${el.clientWidth} sh${el.scrollHeight}/ch${el.clientHeight} lh ${lh} "${txt}"`);
      if (el.closest('.sr-only')) return;
      const fg = parse(s.color); if (!fg) return;
      const bg = bgOf(el); const col = blend(fg, bg);
      const cr = ratio(col, bg); n++;
      const large = fsz >= 24 || (fsz >= 18.66 && +s.fontWeight >= 600);
      const need = large ? 3 : 4.5;
      if (cr < minR) { minR = cr; minEx = `${cr.toFixed(2)} "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`; }
      if (cr < need) low.push(`${cr.toFixed(2)} (<${need}) "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`);
    });
    // target
    const tgt = [];
    document.querySelectorAll('button,a.aq-btn,a.aq-nav-item,input:not([type=hidden]),select,[role=radio],[role=tab],summary').forEach(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden' || el.closest('.sr-only') || el.closest('.aq-skip')) return;
      if (r.right < 0 || r.left > innerWidth) return;
      if (r.height < 44 || r.width < 44) tgt.push(`${el.tagName.toLowerCase()}[${el.dataset.testid || el.getAttribute('aria-label') || (el.innerText || '').trim().slice(0, 14)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    // tabular-nums
    const tab = [...document.querySelectorAll('.tabular-nums,.aq-count')].slice(0, 6).map(el => `${el.className.toString().includes('aq-count') ? 'aq-count' : el.tagName.toLowerCase()} fvn=${getComputedStyle(el).fontVariantNumeric}`);
    return {
      sw: document.documentElement.scrollWidth, iw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth,
      htmlClass: document.documentElement.className.replace(/__[^ ]+/g, '').trim(), bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyFF: getComputedStyle(document.body).fontFamily.slice(0, 90),
      loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/_[0-9a-f]{6}$/, '') + ' ' + f.weight))],
      plexThai: document.fonts.check(`16px ${getComputedStyle(document.body).fontFamily.split(',')[0]}`, 'ที่ปรึกษา'),
      fonts, contrastN: n, minContrast: minEx, low, clip: clip.slice(0, 12), small, lhLow: lhLow.slice(0, 10), targets: tgt.slice(0, 20), tab,
    };
  }, scopeSel);
}
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}
const snap = (page, name, full = true) => page.screenshot({ path: `${OUT}v0-${name}.png`, fullPage: full });

for (const theme of ['light', 'dark']) {
  for (const [vp, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme });
    await ctx.addInitScript(t => { try { localStorage.setItem('aunqa_theme', t); } catch {} }, theme);
    const page = await ctx.newPage();
    const tag = `${theme}-${vp}`;
    // landing
    await page.goto(BASE + '/'); await settle(page); await page.waitForTimeout(600);
    await snap(page, `landing-${tag}`); await collect(page, `landing-${tag}`);
    if (vp === '390') { // แผงเมนูมือถือของ landing
      const t = page.locator('header button[aria-expanded]').first();
      if (await t.count()) { await t.click(); await page.waitForTimeout(400); await snap(page, `landing-menu-${tag}`, false); await t.click().catch(() => {}); }
    }
    // 404
    await page.goto(BASE + '/zzz-not-here'); await settle(page);
    await snap(page, `404-${tag}`); await collect(page, `404-${tag}`);
    // login
    await page.goto(BASE + '/login'); await settle(page);
    await snap(page, `login-${tag}`); await collect(page, `login-${tag}`);
    const demo = page.getByTestId('demo-accounts').locator('summary');
    if (await demo.count()) { await demo.first().click(); await page.waitForTimeout(300); await snap(page, `login-demo-${tag}`); }
    // error state
    await page.getByTestId('login-username').fill('chair1'); await page.getByTestId('login-password').fill('wrong');
    await page.getByTestId('login-submit').click(); await page.waitForTimeout(1200);
    await snap(page, `login-error-${tag}`, false); await collect(page, `login-error-${tag}`);
    // login จริง + พยายามจับ AppLoader
    await page.getByTestId('login-password').fill('demo1234');
    await page.getByTestId('login-submit').click();
    let gotLoader = false;
    for (let i = 0; i < 40 && !gotLoader; i++) {
      if (await page.getByTestId('app-loader').isVisible().catch(() => false)) { await page.waitForTimeout(150); await snap(page, `loader-${tag}`, false); gotLoader = true; }
      else await page.waitForTimeout(50);
    }
    await page.waitForURL('**/app', { timeout: 30000 });
    if (!gotLoader) { // เข้า /app ใหม่ทันที เพื่อจับ loader ตอนบูต
      await page.goto(BASE + '/app', { waitUntil: 'commit' });
      for (let i = 0; i < 60 && !gotLoader; i++) {
        if (await page.getByTestId('app-loader').isVisible().catch(() => false)) { await snap(page, `loader-${tag}`, false); gotLoader = true; }
        else await page.waitForTimeout(30);
      }
    }
    stats[`loader-${tag}`] = { captured: gotLoader };
    await settle(page);
    await snap(page, `app-${tag}`); await collect(page, `app-shell-${tag}`, '#app-sidebar, header');
    await snap(page, `app-fold-${tag}`, false);
    if (vp === '390') {
      await page.getByTestId('nav-menu').click(); await page.waitForTimeout(500);
      await snap(page, `drawer-${tag}`, false); await collect(page, `drawer-${tag}`, '#app-sidebar');
      await page.goto(BASE + '/app'); await settle(page);
      // display prefs ในลิ้นชัก
      await page.getByTestId('nav-menu').click(); await page.waitForTimeout(500);
    }
    await page.getByTestId('display-prefs').click(); await page.waitForTimeout(450);
    await snap(page, `prefs-${tag}`, false); await collect(page, `prefs-${tag}`, '[data-testid=theme-segment], [role=radiogroup], #app-sidebar');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    if (vp === '390') { await page.goto(BASE + '/app'); }
    // dialog: SAR 3.6 + อ้างหลักฐานไม่มีจริง → logout
    await page.goto(BASE + SEC); await settle(page);
    await page.getByTestId('narrative-th').fill('ทดสอบ V0 อ้างหลักฐานที่ไม่มี [E-9.9-99] ผู้ใช้ที่ปรึกษา');
    if (vp === '390') { await page.getByTestId('nav-menu').click(); await page.waitForTimeout(500); await snap(page, `drawer-sar-${tag}`, false); stats[`drawer-sar-${tag}`] = await page.evaluate(() => { const r = document.querySelector('[data-testid=logout]').getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { hit: top.closest('[data-testid=logout]') ? 'logout' : top.outerHTML.slice(0, 160), z: [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 0).map(e => (e.dataset.testid || e.className.toString().slice(0, 50)) + ' z=' + getComputedStyle(e).zIndex) }; }); }
    await page.getByTestId('logout').evaluate(el => el.click()); await page.waitForTimeout(500);
    const dlg = page.getByRole('dialog');
    if (await dlg.isVisible().catch(() => false)) {
      await snap(page, `dialog-${tag}`, false); await collect(page, `dialog-${tag}`, '[role=dialog]');
      await dlg.getByRole('button', { name: 'กลับไปแก้' }).click().catch(() => {});
    } else stats[`dialog-${tag}`] = { shown: false };
    await ctx.close();
  }
}

// --- crop ความละเอียด 2x เพื่อตรวจวรรณยุกต์/สระบน (light + dark @1440)
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'th-TH', colorScheme: theme });
  await ctx.addInitScript(t => { try { localStorage.setItem('aunqa_theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(BASE + '/'); await settle(page); await page.waitForTimeout(600);
  await page.locator('h1').first().screenshot({ path: `${OUT}v0-crop-hero-h1-${theme}.png` }).catch(e => console.log('crop h1', e.message));
  await page.goto(BASE + '/login'); await settle(page);
  await page.locator('form').first().screenshot({ path: `${OUT}v0-crop-login-form-${theme}.png` }).catch(e => console.log('crop form', e.message));
  await page.getByTestId('login-username').fill('chair1'); await page.getByTestId('login-password').fill('demo1234');
  await page.getByTestId('login-submit').click(); await page.waitForURL('**/app'); await settle(page);
  await page.locator('#app-sidebar').screenshot({ path: `${OUT}v0-crop-sidebar-${theme}.png` }).catch(e => console.log('crop sb', e.message));
  await page.locator('header').first().screenshot({ path: `${OUT}v0-crop-topbar-${theme}.png` }).catch(e => console.log('crop tb', e.message));
  await ctx.close();
}
// tabular-nums: ฟอนต์รองรับ tnum จริงไหม (เทียบความกว้าง "1111" กับ "0000")
{
  const ctx = await b.newContext(); const page = await ctx.newPage();
  await page.goto(BASE + '/zzz-not-here'); await settle(page);
  stats.tnum = await page.evaluate(async () => {
    await document.fonts.ready;
    const mk = (t, tab) => { const s = document.createElement('span'); s.textContent = t; s.style.cssText = `font-size:40px;position:absolute;white-space:nowrap;font-variant-numeric:${tab ? 'tabular-nums' : 'normal'}`; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return +w.toFixed(1); };
    return { prop: { '1111': mk('1111', 0), '0000': mk('0000', 0) }, tab: { '1111': mk('1111', 1), '0000': mk('0000', 1), '4040': mk('4040', 1) } };
  });
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'v0-stats.json'), JSON.stringify(stats, null, 1));
await b.close();
console.log('done', Object.keys(stats).length);
