// D0: ชุด screenshot สุดท้ายสำหรับคู่มือ/เล่ม → .agents/screenshots/final/
// รัน: cd .agents/playtest/u3 && node final.mjs   (BASE=http://localhost:3951)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/final') + '/';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3951';
const C = 'cycle-demo-2569', enc = encodeURIComponent(C);
const sec = r => `/app/sections/${encodeURIComponent(C + '::' + r)}`;
const checks = {};
const b = await chromium.launch();

async function settle(p) {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.locator('h1').first().waitFor({ timeout: 20000 }).catch(() => {});
  await p.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(900);
}
async function audit(p, name) {
  checks[name] = await p.evaluate(() => {
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u; let small = 0, emoji = [];
    document.querySelectorAll('body *').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || !el.getBoundingClientRect().width) return;
      if (el.closest('svg')) { const m = el.getScreenCTM && el.getScreenCTM(); if (parseFloat(s.fontSize) * (m ? m.a : 1) < 12.9) small++; }
      else if (parseFloat(s.fontSize) < 13) small++;
      const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
      if (re.test(t)) emoji.push(t.trim().slice(0, 20));
    });
    return { hscroll: document.documentElement.scrollWidth > innerWidth, small, emoji };
  });
}
async function shot(p, name, { full = true, settleFirst = true } = {}) {
  if (settleFirst) await settle(p);
  await p.screenshot({ path: OUT + name + '.png', fullPage: full });
  await audit(p, name);
}
async function login(p, u) {
  await p.goto(BASE + '/login');
  await p.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await p.goto(BASE + '/login');
  await p.getByTestId('login-username').fill(u); await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click(); await p.waitForURL('**/app', { timeout: 30000 }); await settle(p);
}
async function dialogOk(p) {
  const d = p.getByRole('dialog'); await d.waitFor();
  await d.getByRole('button', { name: 'ยืนยัน' }).click(); await d.waitFor({ state: 'hidden' });
}
const go = async (p, u) => { await p.goto(BASE + u); await settle(p); };

// ───── 1440 ไทย: flow ทั้งรอบ ─────
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'th-TH' });
const p = await ctx.newPage();
try {
  await go(p, '/'); await shot(p, 'guide-landing');
  await go(p, '/login'); await shot(p, 'guide-login', { full: false });
  await p.getByTestId('demo-accounts').locator('summary').first().click().catch(() => {}); await p.waitForTimeout(300);
  await shot(p, 'guide-login-demo-accounts', { settleFirst: false });
  await p.getByTestId('login-username').fill('chair1'); await p.getByTestId('login-password').fill('wrong'); await p.getByTestId('login-submit').click(); await p.waitForTimeout(1500);
  await shot(p, 'guide-login-error', { full: false, settleFirst: false });
  await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'guide-loader-login.png' });
  await p.waitForURL('**/app'); await settle(p);

  // chair1 — สถานะเริ่มต้น (in_progress)
  await shot(p, 'guide-chair-home');
  await go(p, '/app/cycles'); await shot(p, 'guide-chair-cycles');
  await go(p, `/app/cycles/${enc}`); await shot(p, 'guide-chair-dashboard');
  await p.getByTestId('heatmap').screenshot({ path: OUT + 'guide-dashboard-heatmap.png' }).catch(() => {});
  await go(p, `/app/cycles/${enc}/assign`); await shot(p, 'guide-chair-assign', { full: false });
  await go(p, sec('3.6')); await shot(p, 'guide-section-editor-chair');
  await go(p, '/app/evidence'); await shot(p, 'guide-evidence-list');
  await p.getByTestId('ev-new').click(); await p.waitForTimeout(500); await shot(p, 'guide-evidence-form', { settleFirst: false });
  await go(p, '/app/evidence');
  const href = await p.getByTestId('ev-table').locator('tbody tr td:first-child a').first().getAttribute('href');
  await go(p, href); await shot(p, 'guide-evidence-detail');
  await go(p, '/app/curriculum'); await shot(p, 'guide-curriculum-plo');
  for (const t of ['matrix', 'heat', 'gaps', 'prereq']) { await p.getByTestId('cur-tab-' + t).click(); await p.waitForTimeout(600); await shot(p, 'guide-curriculum-' + t, { settleFirst: false }); }
  await go(p, '/app/metrics'); await shot(p, 'guide-metrics', { full: false });
  await p.getByTestId('import-panel').locator('summary').first().click(); await p.waitForTimeout(300);
  await p.getByTestId('import-panel').screenshot({ path: OUT + 'guide-metrics-import.png' });
  await go(p, '/app/actions'); await shot(p, 'guide-actions');
  await go(p, '/app/review'); await shot(p, 'guide-chair-review');
  await go(p, '/app/export'); await shot(p, 'guide-export');
  await go(p, '/app/requirements'); await shot(p, 'guide-requirements', { full: false });

  // บทบาทอื่นที่สถานะเริ่มต้น
  for (const u of ['lect1', 'data1']) { await login(p, u); await shot(p, `guide-${u.replace(/1$/, '')}-home`); }
  await login(p, 'uadmin'); await shot(p, 'guide-uadmin-home');
  await go(p, '/app/admin'); await shot(p, 'guide-admin', { full: false });

  // มอบหมาย → staff1 ส่งตรวจ (checklist ก่อนส่ง)
  await login(p, 'chair1'); await go(p, `/app/cycles/${enc}/assign`);
  for (const r of ['3.6', '5.1', '7.9']) await p.getByTestId(`owner-${r}`).selectOption({ label: 'อ.วิภา เขียนรายงาน' });
  await login(p, 'staff1'); await shot(p, 'guide-staff-home');
  let first = true;
  for (const r of ['3.6', '5.1', '7.9']) {
    await go(p, sec(r));
    if (first) await shot(p, 'guide-section-editor-staff');
    await p.getByTestId('section-submit').click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(400);
    if (first) { await shot(p, 'guide-section-presubmit-checklist', { full: false, settleFirst: false }); first = false; }
    await dialogOk(p); await p.getByTestId('readonly-reason').waitFor();
  }
  // chair อนุมัติ → ส่ง QA
  await login(p, 'chair1');
  for (const r of ['1.5', '6.6', '8.1', '8.2', '8.3', '3.6', '5.1', '7.9']) {
    await go(p, sec(r)); await p.getByTestId('section-approve').click(); await p.getByTestId('readonly-reason').waitFor();
  }
  await go(p, `/app/cycles/${enc}`); await shot(p, 'guide-chair-dashboard-ready');
  await p.getByTestId('cycle-to-under_review').click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(300);
  await shot(p, 'guide-dialog-chair-send-qa', { full: false, settleFirst: false });
  await dialogOk(p);
  // fqa1
  await login(p, 'fqa1'); await shot(p, 'guide-fqa-home');
  await go(p, `/app/cycles/${enc}`); await shot(p, 'guide-fqa-dashboard', { full: false });
  await p.getByTestId('cycle-to-faculty_approved').click(); await dialogOk(p);
  // dean1 — dialog คำเตือนก่อนล็อก
  await login(p, 'dean1'); await shot(p, 'guide-dean-home');
  await go(p, `/app/cycles/${enc}`); await shot(p, 'guide-dean-dashboard', { full: false });
  await p.getByTestId('cycle-to-final_approved').click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(400);
  await shot(p, 'guide-dialog-dean-lock-warning', { full: false, settleFirst: false });
  await dialogOk(p); await p.getByTestId('lock-banner').waitFor().catch(() => {});
  await settle(p); await shot(p, 'guide-dashboard-locked', { full: false });
  // fqa1 เริ่มการประเมิน → under_assessment
  await login(p, 'fqa1'); await go(p, `/app/cycles/${enc}`);
  await p.getByTestId('cycle-to-under_assessment').click(); await dialogOk(p); await settle(p);
  await shot(p, 'guide-dashboard-under-assessment', { full: false });
  // assess1
  await login(p, 'assess1'); await shot(p, 'guide-assess-home');
  const todo = p.locator('main a.aq-btn').first();
  if (await todo.count()) { await todo.click(); await settle(p); } else await go(p, `/app/cycles/${enc}/assess`);
  await shot(p, 'guide-assess');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: OUT + 'guide-assess-top.png' });
  await login(p, 'chair1'); await go(p, '/app/export'); await shot(p, 'guide-export-locked');
  await p.getByTestId('logout').click(); await p.waitForTimeout(250); await p.screenshot({ path: OUT + 'guide-loader-logout.png' });
} catch (e) { console.log('ERR', e.message.split('\n')[0]); await p.screenshot({ path: OUT + '_error.png' }); }
await ctx.close();

// ───── 390 มือถือ 4 ภาพ ─────
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'th-TH' })).newPage();
await go(m, '/login'); await shot(m, 'mobile-login', { full: false });
await login(m, 'chair1'); await shot(m, 'mobile-chair-home', { full: false });
await go(m, sec('3.6')); await shot(m, 'mobile-section-editor', { full: false });
await go(m, `/app/cycles/${enc}`); await shot(m, 'mobile-dashboard', { full: false });

fs.writeFileSync(path.join(here, 'final-checks.json'), JSON.stringify(checks, null, 1));
await b.close();
const bad = Object.entries(checks).filter(([, v]) => v.hscroll || v.small || v.emoji.length);
console.log('shots', Object.keys(checks).length, 'regress', JSON.stringify(bad));
