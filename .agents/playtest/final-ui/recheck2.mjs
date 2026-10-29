// TASK-0002 เฟส 7 UI re-check 2 (หลัง R2-F13): N1–N6, P11, P12 (dialog), P13, U11 + ภาพ dialog ใหม่
// รัน: BASE=http://localhost:3970 node .agents/playtest/final-ui/recheck2.mjs   (ไม่ build/start อะไร)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
const BASE = process.env.BASE || 'http://localhost:3970';
const CYCLE = 'cycle-demo-2569';
const out = {}; const errs = [];
const b = await chromium.launch();
const log = (...a) => console.log(...a);
const settle = async p => { await p.waitForLoadState('networkidle').catch(() => {}); await p.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(600); };
async function login(p, u) {
  await p.goto(BASE + '/login'); await settle(p);
  await p.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await p.goto(BASE + '/login'); await settle(p);
  await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app', { timeout: 30000 }); await settle(p);
}
async function mk(theme, w, h, { scale } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme });
  await ctx.addInitScript(([t, s]) => { try {
    if (t === 'dark' && !localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark');
    if (s && !localStorage.getItem('aunqa_ui_prefs')) localStorage.setItem('aunqa_ui_prefs', JSON.stringify({ fontScale: s, effects: true, demoOpen: false }));
  } catch {} }, [theme, scale || 0]);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`pageerror ${e.message.slice(0, 120)}`));
  p.on('response', r => { if (r.status() >= 500) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  return [ctx, p];
}
const ONLY = process.env.ONLY;
const step = async (name, fn) => { if (ONLY && !name.startsWith(ONLY)) return; try { await fn(); } catch (e) { log('ERR', name, e.message.split('\n')[0].slice(0, 200)); out[`ERR-${name}`] = e.message.split('\n')[0].slice(0, 200); } };
const dlgText = p => p.getByRole('dialog').innerText();
const dlgShot = async (p, file) => { await p.getByRole('dialog').waitFor(); await p.waitForTimeout(350); await p.screenshot({ path: OUT + file }); };

// ---- N1: ตาราง/การ์ด review ทุกความกว้าง × ธีม (+125%) ----
const REVIEW = () => {
  const t = document.querySelector('[data-testid=review-table]'); if (!t) return 'no table';
  let wrap = t.parentElement; while (wrap && getComputedStyle(wrap).overflowX === 'visible') wrap = wrap.parentElement;
  const wr = (wrap || document.documentElement).getBoundingClientRect();
  const rows = [...t.querySelectorAll('tbody tr')];
  const bad = []; let nb = 0;
  rows.forEach((row, i) => [...row.querySelectorAll('button, a')].forEach(x => {
    const r = x.getBoundingClientRect(); if (!r.width) return; nb++;
    const vis = Math.min(r.right, wr.right, innerWidth) - Math.max(r.left, wr.left, 0);
    if (vis < r.width - 1 || r.height < 40) bad.push(`row${i} "${(x.innerText || '').trim().slice(0, 14)}" ${Math.round(r.width)}x${Math.round(r.height)} vis${Math.round(vis)}`);
  }));
  const thead = t.querySelector('thead'); const headVis = thead ? getComputedStyle(thead).display !== 'none' && thead.getBoundingClientRect().height > 0 : false;
  const r0 = rows[0]?.getBoundingClientRect();
  return { mode: headVis ? 'table' : 'cards', rows: rows.length, buttons: nb, bad, wrapSW: wrap?.scrollWidth, wrapCW: wrap?.clientWidth, pageSW: document.documentElement.scrollWidth, iw: innerWidth, row0H: r0 && Math.round(r0.height), lang: document.documentElement.lang };
};
for (const theme of ['light', 'dark']) for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 900], [1024, 900], [768, 1024], [390, 844]]) for (const scale of [0, 1.25]) {
  if (scale && ![1440, 1280, 390].includes(w)) continue;
  const k = `review-${theme}-${w}${scale ? '-125' : ''}`;
  await step(k, async () => {
    const [ctx, p] = await mk(theme, w, h, { scale });
    await login(p, 'chair1'); await p.goto(BASE + '/app/review'); await settle(p);
    out[k] = await p.evaluate(REVIEW);
    if (!scale && [1280, 1024].includes(w)) await p.screenshot({ path: `${OUT}final-review-${theme}-${w}.png`, fullPage: false });
    if (scale && w === 1280 && theme === 'light') await p.screenshot({ path: `${OUT}final-scale125-review-${theme}-${w}.png`, fullPage: false });
    await ctx.close();
  });
}

// ---- N2 + P13 (staff1 หน้า evidence detail) + N4 (ฟอร์มใหม่ 390) ----
for (const theme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) await step(`ev-${theme}-${w}`, async () => {
  const [ctx, p] = await mk(theme, w, h); const tag = `${theme}-${w}`;
  await login(p, 'staff1');
  await p.goto(BASE + '/app/evidence'); await settle(p);
  await p.locator('#main a[href*="/app/evidence/"]', { hasText: 'E-1.1-01' }).first().click(); await p.waitForURL('**/app/evidence/**'); await settle(p);
  out[`N2-${tag}`] = await p.evaluate(() => [...document.querySelectorAll('#main a, #main button')].filter(e => /คลังหลักฐาน|แดชบอร์ดรอบ/.test(e.innerText)).map(e => ({ t: e.innerText.replace(/\n/g, '⏎'), h: Math.round(e.getBoundingClientRect().height), ws: getComputedStyle(e).whiteSpace })));
  const cyc = p.getByTestId('ev-link-cycle'); if (await cyc.count()) await cyc.selectOption(CYCLE).catch(() => {});
  await p.waitForTimeout(300);
  const inp = p.getByTestId('ev-link-reqs-input');
  await inp.scrollIntoViewIfNeeded(); await inp.click(); await p.waitForTimeout(400);
  await p.evaluate(() => { const f = document.querySelector('[data-testid=ev-link-reqs]'); scrollTo(0, f.getBoundingClientRect().top + scrollY - 140); }); await p.waitForTimeout(200);
  out[`P13-${tag}`] = await p.evaluate(() => {
    const o = document.querySelector('[data-testid="ev-link-req-opt-1.1"]');
    return { opt: !!o, ariaDisabled: o?.getAttribute('aria-disabled'), lock: !!document.querySelector('[data-testid="ev-link-req-opt-lock-1.1"]'), lockText: document.querySelector('[data-testid="ev-link-req-opt-lock-1.1"]')?.innerText, nLocks: document.querySelectorAll('[data-testid^=ev-link-req-opt-lock-]').length, sw: document.documentElement.scrollWidth, iw: innerWidth };
  });
  await p.screenshot({ path: `${OUT}final-evidence-detail-picker-${tag}.png` });
  await p.getByTestId('ev-link-req-opt-1.1').click({ force: true }).catch(() => {}); await p.waitForTimeout(300);
  out[`P13-${tag}`].chipAfterClick = await p.getByTestId('ev-link-req-chip-1.1').count();
  // N4 ฟอร์มใหม่
  await p.goto(`${BASE}/app/evidence?new=1&cycle=${CYCLE}&req=1.1`); await settle(p);
  const fi = p.getByTestId('ev-f-reqs-input'); await fi.scrollIntoViewIfNeeded(); await fi.click(); await p.waitForTimeout(400);
  out[`N4-${tag}`] = await p.evaluate(() => [...document.querySelectorAll('[data-testid^=ev-f-req-opt-]')].filter(e => !/lock/.test(e.dataset.testid)).slice(0, 6).map(e => {
    const t = e.querySelector('.line-clamp-2'); const lh = t ? parseFloat(getComputedStyle(t).lineHeight) : 0;
    const lock = e.querySelector('[data-testid*=opt-lock]'); const vis = lock ? [...lock.querySelectorAll('span')].map(s => getComputedStyle(s).position === 'absolute' ? 'sr' : 'vis') : null;
    return { id: e.dataset.testid.replace('ev-f-req-opt-', ''), lines: t ? Math.round(t.getBoundingClientRect().height / lh) : null, clamped: t ? t.scrollHeight > t.clientHeight + 1 : null, lockLabel: vis, w: Math.round(e.getBoundingClientRect().width) };
  }));
  await ctx.close();
});

// ---- N3 + N6 + U11 (admin) ----
for (const theme of ['light', 'dark']) await step(`admin-${theme}`, async () => {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const [ctx, p] = await mk(theme, w, h); const tag = `${theme}-${w}`;
    await login(p, 'uadmin'); await p.goto(BASE + '/app/admin'); await settle(p);
    out[`N6-${tag}`] = await p.evaluate(() => { const tl = document.querySelector('[role=tablist]'); return { sw: tl.scrollWidth, cw: tl.clientWidth, tabs: [...tl.querySelectorAll('[role=tab]')].map(t => `${t.innerText.trim()} ${Math.round(t.getBoundingClientRect().width)}x${Math.round(t.getBoundingClientRect().height)}`) }; });
    await p.getByTestId('user-manage-staff1').click(); await p.waitForTimeout(300);
    await p.getByTestId('user-add-role-staff1').selectOption('assessor'); await p.waitForTimeout(300);
    out[`N3-${tag}`] = await p.evaluate(() => { const s = document.querySelector('[data-testid=user-add-scope-staff1] select, select[data-testid=user-add-scope-staff1]') || document.querySelector('[data-testid=user-panel-staff1] select:not([data-testid=user-add-role-staff1])'); return s ? [...s.options].map(o => o.textContent) : 'no select'; });
    await ctx.close();
  }
  // U11: sadmin ระงับ lect1 และ uadmin แล้วเปิด dialog เปิดใช้
  const [ctx, p] = await mk(theme, 1440, 900);
  await login(p, 'sadmin'); await p.goto(BASE + '/app/admin'); await settle(p);
  for (const u of ['lect1', 'uadmin']) {
    await p.getByTestId(`user-manage-${u}`).click(); await p.waitForTimeout(300);
    await p.getByTestId(`user-suspend-${u}`).click(); await p.getByRole('dialog').waitFor();
    await p.getByRole('dialog').getByRole('button', { name: 'ยืนยันระงับ' }).click(); await p.waitForTimeout(700);
    await p.getByTestId(`user-reactivate-${u}`).click();
    await dlgShot(p, `final-admin-reactivate-${u}-${theme}-1440.png`);
    out[`U11-${u}-${theme}`] = await dlgText(p);
    await p.getByRole('dialog').getByRole('button', { name: 'ยืนยันเปิดใช้' }).click(); await p.waitForTimeout(600);
    if (await p.getByTestId(`user-manage-${u}`).getAttribute('aria-expanded') === 'true') await p.getByTestId(`user-manage-${u}`).click().catch(() => {});
    await p.waitForTimeout(200);
  }
  await ctx.close();
});

// ---- P11 actions ตรวจรับ (chair1) + EN/html lang ----
for (const theme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) await step(`actions-${theme}-${w}`, async () => {
  const [ctx, p] = await mk(theme, w, h); const tag = `${theme}-${w}`;
  await login(p, 'chair1'); await p.goto(BASE + '/app/actions'); await settle(p);
  const btn = p.locator('[data-testid=action-to-verified]').first();
  out[`P11-${tag}-n`] = await btn.count();
  await btn.scrollIntoViewIfNeeded(); await btn.click();
  await dlgShot(p, `final-actions-accept-${tag}.png`);
  out[`P11-${tag}`] = await dlgText(p);
  out[`P11-${tag}-dlg`] = await p.getByRole('dialog').evaluate(d => { const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), btnH: [...d.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().height)) }; });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  if (w === 1440 && theme === 'light') { // EN + html lang
    await p.getByTestId('lang-en').click(); await p.waitForTimeout(500);
    const r = {}; r.afterClick = await p.evaluate(() => document.documentElement.lang);
    await p.reload(); await settle(p); r.afterReload = await p.evaluate(() => document.documentElement.lang);
    await btn.click(); await p.getByRole('dialog').waitFor(); r.dialogEN = await dlgText(p); await p.keyboard.press('Escape');
    await p.screenshot({ path: `${OUT}final-actions-en-${tag}.png` });
    for (const u of ['/app/review', '/app/admin', '/app/evidence']) { await p.goto(BASE + u); await settle(p); r[u] = await p.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('h1')?.innerText, sw: document.documentElement.scrollWidth, iw: innerWidth })); }
    await p.goto(BASE + '/app/review'); await settle(p); await p.screenshot({ path: `${OUT}final-review-en-${tag}.png` });
    await p.getByTestId('lang-th').click(); await p.waitForTimeout(400); r.backTh = await p.evaluate(() => document.documentElement.lang);
    out['N5'] = r;
  }
  await ctx.close();
});

// ---- P12 assess: กรรมการ 2 คน (เพิ่มบทบาท assessor ให้ staff1 ใน localStorage ของ context นี้) ----
for (const theme of ['light', 'dark']) await step(`assess-${theme}`, async () => {
  const [ctx, p] = await mk(theme, 1440, 900);
  await login(p, 'assess1');
  await p.evaluate(id => {
    const cs = JSON.parse(localStorage.getItem('aunqa_cycles') || '[]'); const c = cs.find(x => x.id === id); if (c) c.status = 'under_assessment'; localStorage.setItem('aunqa_cycles', JSON.stringify(cs));
    const us = JSON.parse(localStorage.getItem('aunqa_users') || '[]'); const s = us.find(u => u.username === 'staff1'); if (s && !s.roles.some(r => r.role === 'assessor')) s.roles.push({ role: 'assessor', scopeType: 'cycle', scopeId: id }); localStorage.setItem('aunqa_users', JSON.stringify(us));
  }, CYCLE);
  await p.goto(`${BASE}/app/cycles/${CYCLE}/assess`); await settle(p);
  for (let c = 1; c <= 8; c++) {
    await p.getByTestId(`assess-crit-${c}`).click();
    await p.getByTestId('crit-score').selectOption('4'); await p.getByTestId('crit-why').fill(`เหตุผลเกณฑ์ ${c}`);
    await p.getByTestId('crit-save').click(); await p.waitForTimeout(250);
  }
  await p.getByTestId('verdict-score').selectOption('4'); await p.getByTestId('verdict-why').fill('ผ่านตามเกณฑ์'); await p.getByTestId('verdict-save').click(); await p.waitForTimeout(400);
  await p.getByTestId('assess-finish').scrollIntoViewIfNeeded(); await p.getByTestId('assess-finish').click();
  await dlgShot(p, `final-assess-submit-${theme}-1440.png`);
  out[`P12-${theme}-dialog`] = await dlgText(p);
  await p.getByRole('dialog').getByRole('button', { name: 'ยืนยันส่งผลการประเมิน' }).click(); await p.waitForTimeout(900);
  const wt = p.getByTestId('assess-waiting');
  out[`P12-${theme}-waiting`] = await wt.count() ? await wt.innerText() : 'NONE';
  out[`P12-${theme}-toast`] = await p.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[data-sonner-toast],[data-testid^=toast]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 4));
  if (await wt.count()) { await wt.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -250)); }
  await p.screenshot({ path: `${OUT}final-assess-waiting-${theme}-1440.png` });
  await ctx.close();
});

out.errors = errs;
fs.writeFileSync(path.join(here, ONLY ? `recheck2-${ONLY}.json` : 'recheck2.json'), JSON.stringify(out, null, 1));
await b.close();
log('done', Object.keys(out).length, 'errors', errs.length);
