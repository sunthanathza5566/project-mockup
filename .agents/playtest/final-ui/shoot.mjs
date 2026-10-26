// TASK-0002 เฟส 7 UI: ภาพชุดสุดท้าย light/dark × 1440/390 (+768 light) ทุกหน้า + เก็บ computed style
// รัน: BASE=http://localhost:3950 ONLY=light-1440 node .agents/playtest/final-ui/shoot.mjs
// (ใช้ server ที่เปิดอยู่แล้ว — สคริปต์นี้ไม่ build/start อะไร; ข้อมูลอยู่ใน localStorage ของ context ตัวเอง)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3950';
const ONLY = process.env.ONLY; // light-1440 | dark-390 | light-768 ...
const CYCLE = 'cycle-demo-2569';
const SECTION = `/app/sections/${encodeURIComponent(CYCLE + '::3.6')}`;
const DOMAIN = 'sample-uni.example';
const b = await chromium.launch();
const log = (...a) => console.log(...a);

export const COLLECT = async (scopeSel) => {
  await document.fonts.ready;
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  function bgOf(el) {
    const stack = []; let e = el;
    while (e && e.nodeType === 1) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } e = e.parentElement; }
    let bg = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
    if (bg[3] < 1) bg = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
    return bg;
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width >= 2 && r.height >= 2 && !el.closest('.sr-only'); };
  const roots = scopeSel ? [...document.querySelectorAll(scopeSel)] : [document.body];
  const inScope = el => roots.some(r => r.contains(el));
  const fonts = {}, low = [], clip = [], small = [], lhLow = [], upper = [], samples = [];
  let n = 0, minR = 99, minEx = '';
  const seen = new Set();
  for (const root of roots) [root, ...root.querySelectorAll('*')].forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    if (![...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    if (!vis(el)) return;
    const s = getComputedStyle(el);
    const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30);
    const fsz = parseFloat(s.fontSize);
    const lh = s.lineHeight === 'normal' ? 'normal' : (parseFloat(s.lineHeight) / fsz).toFixed(2);
    const fam = s.fontFamily.split(',')[0].replace(/"/g, '').replace(/_[0-9a-f]{6}$/, '').replace(/^__/, '');
    const k = `${fam} | ${s.fontSize} | ${s.fontWeight} | lh ${lh}`;
    fonts[k] = (fonts[k] || 0) + 1;
    const thai = /[฀-๿]/.test(el.textContent);
    if (fsz < 13 && !el.closest('svg')) small.push(`${fsz}px <${el.tagName.toLowerCase()}> "${txt}"`);
    if (thai && lh !== 'normal' && +lh < 1.35) lhLow.push(`${lh} ${s.fontSize} <${el.tagName.toLowerCase()}> "${txt}"`);
    if (thai && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > fsz * 0.025)) upper.push(`${s.textTransform} ls=${s.letterSpacing} "${txt}"`);
    if (/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY) && s.textOverflow !== 'ellipsis' && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2))
      clip.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 3).join('.')} sw${el.scrollWidth}/cw${el.clientWidth} sh${el.scrollHeight}/ch${el.clientHeight} "${txt}"`);
    const fg = parse(s.color); if (!fg) return;
    const bg = bgOf(el); const col = blend(fg, bg);
    const cr = ratio(col, bg); n++;
    const large = fsz >= 24 || (fsz >= 18.66 && +s.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    const disabled = !!el.closest('[disabled],[aria-disabled=true]');
    if (samples.length < 400) samples.push([+cr.toFixed(2), txt.slice(0, 18)]);
    if (cr < minR) { minR = cr; minEx = `${cr.toFixed(2)} "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`; }
    if (cr < need) low.push(`${cr.toFixed(2)} (<${need})${disabled ? ' [disabled]' : ''} "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`);
  });
  // ขอบ control (≥3)
  const ctl = []; let ctlMin = 99, ctlMinEx = '';
  document.querySelectorAll('input:not([type=hidden]),select,textarea,button,[role=radio],[role=tab]').forEach(el => {
    if (!inScope(el) || !vis(el)) return;
    const s = getComputedStyle(el); const bw = parseFloat(s.borderTopWidth); const bc = parse(s.borderTopColor);
    if (el.matches('input[type=checkbox],input[type=radio]')) { /* native — ใช้ accent */ }
    else if (!(bw >= 1 && bc && bc[3] > 0.05)) return;
    const bg = bgOf(el.parentElement || el);
    const own = parse(s.backgroundColor);
    const c = el.matches('input[type=checkbox],input[type=radio]') ? parse(s.accentColor) || parse(s.color) : blend(bc, bg);
    if (!c) return;
    const r = ratio(c, bg);
    const isOutlineBtn = el.tagName === 'BUTTON' && own && own[3] > 0 && ratio(blend(own, bg), bg) > 1.2; // ปุ่มทึบ: ขอบไม่ใช่ตัวบอกขอบเขต
    if (el.tagName === 'BUTTON' && isOutlineBtn) return;
    const id = `${el.tagName.toLowerCase()}[${el.dataset.testid || el.getAttribute('aria-label') || el.id || (el.innerText || '').trim().slice(0, 14)}]`;
    if (r < ctlMin) { ctlMin = r; ctlMinEx = `${r.toFixed(2)} ${id} ${s.borderTopColor}`; }
    if (r < 3) ctl.push(`${r.toFixed(2)} ${id} border ${s.borderTopColor} on rgb(${bg.slice(0, 3).map(Math.round)})`);
  });
  // ไอคอนสถานะใน badge/pill (≥3)
  const ico = []; let icoMin = 99;
  document.querySelectorAll('.aq-badge svg, [class*="rounded-full"] > svg, td svg, .aq-kpi svg').forEach(svg => {
    if (!inScope(svg) || !vis(svg)) return;
    const c = parse(getComputedStyle(svg).color); if (!c) return;
    const bg = bgOf(svg.parentElement); const r = ratio(blend(c, bg), bg);
    icoMin = Math.min(icoMin, r); if (r < 3) ico.push(`${r.toFixed(2)} svg in "${(svg.parentElement.textContent || '').trim().slice(0, 20)}"`);
  });
  const badgeH = {}; document.querySelectorAll('.aq-badge').forEach(el => { if (!inScope(el) || !vis(el)) return; const h = Math.round(el.getBoundingClientRect().height); badgeH[h] = (badgeH[h] || 0) + 1; });
  const weights = {}; document.querySelectorAll('.aq-kpi__label, .aq-chart-label, .aq-heat-label').forEach(el => { if (!vis(el)) return; const k = ((el.getAttribute('class') || '').match(/aq-[a-z_-]+/) || ['?'])[0] + ' ' + getComputedStyle(el).fontWeight + ' ' + getComputedStyle(el).fontSize; weights[k] = (weights[k] || 0) + 1; });
  const tabs = {}; document.querySelectorAll('[role=tab]').forEach(el => { if (!vis(el)) return; const k = `${el.getAttribute('aria-selected')} bg=${getComputedStyle(el).backgroundColor}`; tabs[k] = (tabs[k] || 0) + 1; });
  const tgt = [];
  document.querySelectorAll('button,a,input:not([type=hidden]),select,textarea,[role=radio],[role=tab],summary').forEach(el => {
    if (!inScope(el)) return;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden' || el.closest('.sr-only') || el.closest('.aq-skip')) return;
    if (r.right < 0 || r.left > innerWidth) return;
    if (el.tagName === 'A' && !el.matches('.aq-nav-item,[data-testid]') && s.display === 'inline') return;
    if (el.matches('input[type=checkbox],input[type=radio]')) { const lab = el.closest('label'); if (lab && lab.getBoundingClientRect().height >= 44) return; }
    if (r.height < 40 || r.width < 40) tgt.push(`${el.tagName.toLowerCase()}[${el.dataset.testid || el.getAttribute('aria-label') || (el.innerText || el.value || '').trim().slice(0, 16)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  const infinite = document.getAnimations().filter(a => a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running').map(a => (a.effect.target?.className?.toString?.() || '').slice(0, 40));
  const ov = [...document.querySelectorAll('h1,h2,h3')].filter(vis).map(h => `${h.tagName} ${getComputedStyle(h).fontSize}/${getComputedStyle(h).fontWeight} "${h.textContent.trim().slice(0, 24)}"`);
  return {
    sw: document.documentElement.scrollWidth, iw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth,
    htmlDark: document.documentElement.classList.contains('dark'), bodyBg: getComputedStyle(document.body).backgroundColor,
    loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/_[0-9a-f]{6}$/, '').replace(/^__/, '') + ' ' + f.weight))],
    fonts, contrastN: n, minContrast: minEx, low: low.slice(0, 15), ctlMin: ctlMinEx, ctlLow: ctl.slice(0, 10), icoMin: icoMin === 99 ? null : +icoMin.toFixed(2), icoLow: ico.slice(0, 8),
    badgeH, weights, tabs, headings: ov.slice(0, 8),
    clip: clip.slice(0, 10), small: small.slice(0, 10), lhLow: lhLow.slice(0, 10), upper, targets: tgt.slice(0, 20), infinite,
  };
};

const stats = {};
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}
async function shot(page, name, tag, { full = true, scope, collect = true } = {}) {
  const file = `final-${name}-${tag}.png`;
  await page.screenshot({ path: OUT + file, fullPage: full });
  if (collect) { try { stats[`${name}-${tag}`] = await page.evaluate(COLLECT, scope || null); } catch (e) { log('collect fail', name, e.message.slice(0, 100)); } }
  return file;
}
async function loginAs(page, u) {
  await page.goto(BASE + '/login'); await settle(page);
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto(BASE + '/login'); await settle(page);
  await page.getByTestId('login-username').fill(u); await page.getByTestId('login-password').fill('demo1234');
  await page.getByTestId('login-submit').click(); await page.waitForURL('**/app', { timeout: 30000 }); await settle(page);
}
const esc = async page => { await page.keyboard.press('Escape'); await page.waitForTimeout(250); };
async function go(page, url) { await page.goto(BASE + url); await settle(page); }

async function seedExtraNoti(page) {
  return page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]');
    const s = users.find(u => u.username === 'staff1'); if (!s) return 'no staff1';
    const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]');
    const now = Date.now(), H = 3600e3;
    const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(15, 20, 0, 0);
    const mk = (id, kind, th, en, at, read, target, extra = {}) => ({ id, universityId: s.universityId, userId: s.id, kind, messageTh: th, messageEn: en, createdAt: at, ...(read ? { readAt: at + 60e3 } : {}), target, ...extra });
    rows.push(
      mk('fn1', 'changes_requested', 'ข้อ 4.2 ถูกส่งกลับแก้: เกณฑ์ที่ 4 ยังขาดหลักฐานผลการประเมินอาจารย์ที่ปรึกษา', 'Requirement 4.2 was returned for changes', now - 5 * 60e3, false, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '4.2' }, { cycleId: 'cycle-demo-2569', requirementId: '4.2' }),
      mk('fn2', 'comment', 'ผศ.ดร.ปรีชา แสดงความเห็นในข้อ 3.6', 'A comment was added to requirement 3.6', now - 2 * H, false, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '3.6', panel: 'comments' }, { cycleId: 'cycle-demo-2569', requirementId: '3.6' }),
      mk('fn3', 'approved', 'ข้อ 2.1 ได้รับการอนุมัติแล้ว', 'Requirement 2.1 was approved', y.getTime(), true, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '2.1' }, { cycleId: 'cycle-demo-2569', requirementId: '2.1' }),
      mk('fn4', 'cycle_status', 'รอบประเมิน 2569 เปลี่ยนสถานะเป็น "กำลังจัดทำ"', 'Cycle 2569 status changed', now - 5 * 24 * H, true, { type: 'cycle', cycleId: 'cycle-demo-2569' }, { cycleId: 'cycle-demo-2569' }),
    );
    localStorage.setItem('aunqa_notifications', JSON.stringify(rows));
    window.dispatchEvent(new Event('aunqa:todos-changed'));
    return 'ok ' + rows.filter(r => r.userId === s.id).length;
  });
}
const gray = async (page, on) => {
  if (on) await page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
  else await page.evaluate(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('grayscale(1)')) s.remove(); }));
  await page.waitForTimeout(150);
};

const combos = [['light', '1440', 1440, 900], ['light', '390', 390, 844], ['dark', '1440', 1440, 900], ['dark', '390', 390, 844], ['light', '768', 768, 1024], ['dark', '768', 768, 1024]];
for (const [theme, vp, w, h] of combos) {
  const tag = `${theme}-${vp}`;
  if (ONLY ? !ONLY.split(',').includes(tag) : vp === '768') continue;
  log('==', tag);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme, permissions: ['clipboard-read', 'clipboard-write'] });
  if (theme === 'dark') await ctx.addInitScript(() => { try { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('pageerror', tag, e.message.slice(0, 120)));
  page.on('response', r => { if (r.status() >= 500) log('HTTP', r.status(), r.url()); });
  const mobile = vp === '390';
  const step = async (name, fn) => { try { await fn(); } catch (e) { log('ERR', tag, name, e.message.split('\n')[0].slice(0, 200)); await page.screenshot({ path: `${OUT}zz-err-${name}-${tag}.png` }).catch(() => {}); } };
  let inviteLink = null;
  const suf = `${theme[0]}${vp}`.slice(0, 5);

  await step('landing', async () => {
    await go(page, '/'); await page.waitForTimeout(500);
    await shot(page, 'landing', tag);
    await shot(page, 'landing-fold', tag, { full: false, collect: false });
    if (mobile) { await page.getByTestId('landing-menu-btn').click(); await page.waitForTimeout(400); await shot(page, 'landing-menu', tag, { full: false, scope: 'header, [role=dialog]' }); await esc(page); }
  });
  await step('login', async () => {
    await go(page, '/login');
    await shot(page, 'login', tag);
    await page.getByTestId('display-menu').first().click(); await page.waitForTimeout(350);
    await shot(page, 'login-display', tag, { full: false, scope: '[data-testid=display-menu-panel]' }); await esc(page);
    await page.getByTestId('login-username').fill('chair1'); await page.getByTestId('login-password').fill('wrongpass');
    await page.getByTestId('login-submit').click(); await page.waitForTimeout(1200);
    await shot(page, 'login-error', tag, { full: false });
  });
  await step('request', async () => {
    await go(page, '/request-access');
    await shot(page, 'request', tag);
    await page.getByTestId('ra-email').fill('somchai@gmail.com'); await page.getByTestId('ra-password').fill('1234');
    await page.getByTestId('ra-submit').click(); await page.waitForTimeout(700);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
    await shot(page, 'request-error', tag);
    await go(page, '/request-access');
    await page.getByTestId('ra-name').fill('สมชาย ใจดี');
    await page.getByTestId('ra-email').fill(`somchai${suf}@${DOMAIN}`); await page.getByTestId('ra-email').blur(); await page.waitForTimeout(400);
    const unit = page.getByTestId('ra-unit'); if (await unit.count() && await unit.locator('option').count() > 1) await unit.selectOption({ index: 1 });
    await page.getByTestId('ra-position').fill('อาจารย์ประจำหลักสูตร').catch(() => {});
    await page.getByTestId('ra-reason').fill('ได้รับมอบหมายให้เขียน SAR เกณฑ์ 3');
    await page.getByTestId('ra-username').fill(`sc${suf}`);
    await page.getByTestId('ra-password').fill('ภูเขาสูงมาก1'); await page.getByTestId('ra-password2').fill('ภูเขาสูงมาก1');
    await page.getByTestId('ra-consent').check();
    await page.getByTestId('ra-submit').click(); await page.getByTestId('ra-success').waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    await shot(page, 'request-success', tag, { full: false });
  });
  await step('invite-invalid', async () => {
    await go(page, '/invite#t=thisTokenIsNotValid1234567890'); await page.waitForTimeout(600);
    await shot(page, 'invite-invalid', tag);
  });
  await step('404', async () => { await go(page, '/app-does-not-exist'); await shot(page, '404', tag); });

  // ---------------- chair1 ----------------
  await step('chair1', async () => {
    await loginAs(page, 'chair1');
    await shot(page, 'home-chair1', tag, { scope: '#main' });
    await shot(page, 'shell', tag, { full: false, scope: 'header, #app-sidebar' });
    await page.getByTestId('user-menu').click(); await page.waitForTimeout(350);
    await shot(page, 'usermenu', tag, { full: false, scope: '[data-testid=user-menu-panel]' }); await esc(page);
    if (mobile) { await page.getByTestId('nav-menu').click(); await page.waitForTimeout(450); await shot(page, 'drawer', tag, { full: false, scope: '#app-sidebar' }); await esc(page); }
    // EN
    await page.getByTestId('lang-en').click(); await page.waitForTimeout(600);
    await shot(page, 'home-chair1-en', tag, { full: false, collect: false });
    await page.getByTestId('lang-th').click(); await page.waitForTimeout(400);
  });
  await step('review', async () => { await go(page, '/app/review'); await shot(page, 'review', tag, { scope: '#main' }); if (theme && vp !== '768') { await gray(page, true); await shot(page, 'gray-review', tag, { collect: false }); await gray(page, false); } });
  await step('cycles', async () => {
    await go(page, '/app/cycles'); await shot(page, 'cycles', tag, { scope: '#main' });
    await page.getByTestId('cycle-new').click(); await page.waitForTimeout(400); await shot(page, 'cycles-form', tag, { full: false, scope: '#main' });
  });
  await step('dashboard', async () => {
    await go(page, `/app/cycles/${CYCLE}`); await shot(page, 'dashboard', tag, { scope: '#main' });
    if (vp !== '768') { await gray(page, true); await shot(page, 'gray-dashboard', tag, { collect: false }); await gray(page, false); }
  });
  await step('assign', async () => {
    await go(page, `/app/cycles/${CYCLE}/assign`);
    const ow = page.getByTestId('owner-3.6');
    if (await ow.count()) { await ow.selectOption({ label: 'อ.วิภา เขียนรายงาน' }).catch(() => {}); await page.waitForTimeout(500); }
    await shot(page, 'assign', tag, { scope: '#main' });
  });
  await step('section', async () => {
    await go(page, SECTION); await page.waitForTimeout(500);
    await shot(page, 'section', tag, { scope: '#main' });
  });
  await step('evidence', async () => {
    await go(page, '/app/evidence'); await shot(page, 'evidence', tag, { scope: '#main' });
    if (vp !== '768') { await gray(page, true); await shot(page, 'gray-evidence', tag, { collect: false }); await gray(page, false); }
    await page.getByTestId('ev-new').click(); await page.waitForTimeout(400);
    await page.getByTestId('ev-form').scrollIntoViewIfNeeded(); await shot(page, 'evidence-form', tag, { full: false, scope: '#main' });
    await go(page, '/app/evidence');
    const a = page.locator('#main a[href*="/app/evidence/"]').first();
    await a.click(); await page.waitForURL('**/app/evidence/**'); await settle(page);
    await shot(page, 'evidence-detail', tag, { scope: '#main' });
  });
  await step('requirements', async () => { await go(page, '/app/requirements'); await shot(page, 'requirements', tag, { scope: '#main' }); });
  await step('curriculum', async () => { await go(page, '/app/curriculum'); await shot(page, 'curriculum', tag, { scope: '#main' }); });
  await step('metrics', async () => { await go(page, '/app/metrics'); await page.waitForTimeout(400); await shot(page, 'metrics', tag, { scope: '#main' }); });
  await step('actions', async () => { await go(page, '/app/actions'); await shot(page, 'actions', tag, { scope: '#main' }); });
  await step('export', async () => { await go(page, '/app/export'); await shot(page, 'export', tag, { scope: '#main' }); });

  // ---------------- staff1 + แจ้งเตือน ----------------
  await step('staff1', async () => {
    await loginAs(page, 'staff1');
    log('seed', await seedExtraNoti(page));
    await go(page, '/app');
    await shot(page, 'home-staff1', tag, { scope: '#main' });
    await page.getByTestId('nav-bell').click(); await page.waitForTimeout(450);
    await shot(page, 'noti', tag, { full: false, scope: '[data-testid=noti-panel]' });
    stats[`noti-${tag}`].panelRect = await page.getByTestId('noti-panel').boundingBox();
    if (vp !== '768') { await gray(page, true); await page.getByTestId('noti-panel').screenshot({ path: `${OUT}final-gray-noti-${tag}.png` }); await gray(page, false); }
    await esc(page);
    await page.evaluate(() => { const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]'); const me = users.find(x => x.username === 'staff1'); const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]'); localStorage.setItem('aunqa_notifications', JSON.stringify(rows.filter(r => r.userId !== me.id))); });
  });

  // ---------------- uadmin ----------------
  await step('uadmin', async () => {
    await loginAs(page, 'uadmin');
    await shot(page, 'home-uadmin', tag, { scope: '#main' });
    await go(page, '/app/admin');
    await shot(page, 'admin-users', tag, { scope: '#main' });
    await page.getByTestId('user-new').click(); await page.waitForTimeout(400);
    await page.getByTestId('nu-username').fill(`ss${suf}`);
    await page.getByTestId('nu-name').fill('อ.สมศรี ขยันสอน');
    await page.getByTestId('nu-email').fill(`ss${suf}@${DOMAIN}`);
    await page.getByTestId('user-form').scrollIntoViewIfNeeded();
    await shot(page, 'admin-newuser', tag, { full: false, scope: '#main' });
    await page.getByTestId('nu-submit').click(); await page.getByTestId('invite-result').waitFor({ timeout: 8000 });
    inviteLink = await page.getByTestId('invite-link').inputValue();
    await page.getByTestId('invite-result').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await shot(page, 'admin-invite-result', tag, { full: false, scope: '#main' });
    await go(page, '/app/admin?tab=requests'); await shot(page, 'admin-requests', tag, { scope: '#main' });
    await go(page, '/app/admin?tab=audit'); await shot(page, 'admin-audit', tag, { scope: '#main' });
  });
  await step('sadmin', async () => { await loginAs(page, 'sadmin'); await go(page, '/app/admin?tab=demo'); await shot(page, 'admin-demo', tag, { scope: '#main' });
    await page.evaluate(() => { const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]'); localStorage.setItem('aunqa_notifications', JSON.stringify(rows.filter(r => r.userId !== 'u-super'))); window.dispatchEvent(new Event('aunqa:todos-changed')); });
    await go(page, '/app/admin?tab=demo'); await page.getByTestId('nav-bell').click(); await page.waitForTimeout(450);
    const empty = await page.getByTestId('noti-empty').isVisible().catch(() => false);
    await shot(page, empty ? 'noti-empty' : 'noti-empty-NOTEMPTY', tag, { full: false, scope: '[data-testid=noti-panel]' }); await esc(page); });
  await step('invite', async () => {
    if (!inviteLink) throw new Error('no invite link');
    await go(page, '/login'); await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
    await page.goto(inviteLink.replace(/^https?:\/\/[^/]+/, BASE)); await settle(page); await page.waitForTimeout(600);
    await shot(page, 'invite', tag);
  });
  // ---------------- assess1 (ตั้งรอบเป็น under_assessment ใน localStorage ของ context นี้เท่านั้น) ----------------
  await step('assess', async () => {
    await loginAs(page, 'assess1');
    await page.evaluate(id => { const cs = JSON.parse(localStorage.getItem('aunqa_cycles') || '[]'); const c = cs.find(x => x.id === id); if (c) c.status = 'under_assessment'; localStorage.setItem('aunqa_cycles', JSON.stringify(cs)); }, CYCLE);
    await go(page, `/app/cycles/${CYCLE}/assess`); await page.waitForTimeout(500);
    await shot(page, 'assess', tag, { scope: '#main' });
  });
  await ctx.close();
}
fs.writeFileSync(path.join(here, `stats-${ONLY || 'all'}.json`), JSON.stringify(stats, null, 1));
await b.close();
log('done', Object.keys(stats).length);
