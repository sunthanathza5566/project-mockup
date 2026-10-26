// TASK-0002 V1: ถ่ายภาพรอบ 2 (earth/friendly) light+dark × 1440/390 + เก็บสถิติ
// รัน: BASE=http://localhost:3930 node .agents/playtest/v1/shoot.mjs   (ต้อง next start ก่อน)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../screenshots/TASK-0002') + '/';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3930';
const ONLY = process.env.ONLY; // เช่น light-1440
const stats = fs.existsSync(path.join(here, 'v1-stats.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'v1-stats.json'), 'utf8')) : {};
const b = await chromium.launch();
const log = (...a) => console.log(...a);

// ---------- เก็บสถิติในหน้า (scope ได้) ----------
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
    const fonts = {}, low = [], clip = [], small = [], lhLow = [], upper = [];
    let n = 0, minR = 99, minEx = '';
    const seen = new Set();
    for (const root of roots) [root, ...root.querySelectorAll('*')].forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (![...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      if (el.closest('.sr-only')) return;
      const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30);
      const fsz = parseFloat(s.fontSize);
      const lh = s.lineHeight === 'normal' ? 'normal' : (parseFloat(s.lineHeight) / fsz).toFixed(2);
      const fam = s.fontFamily.split(',')[0].replace(/"/g, '').replace(/_[0-9a-f]{6}$/, '').replace(/^__/, '');
      const k = `${fam} | ${s.fontSize} | ${s.fontWeight} | lh ${lh}`;
      fonts[k] = (fonts[k] || 0) + 1;
      const thai = /[฀-๿]/.test(el.textContent);
      if (fsz < 14) small.push(`${fsz}px <${el.tagName.toLowerCase()}> "${txt}"`);
      if (thai && lh !== 'normal' && +lh < 1.35) lhLow.push(`${lh} ${s.fontSize} <${el.tagName.toLowerCase()}> "${txt}"`);
      if (thai && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > fsz * 0.025)) upper.push(`${s.textTransform} ls=${s.letterSpacing} "${txt}"`);
      if (/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
        clip.push(`${el.tagName.toLowerCase()} sw${el.scrollWidth}/cw${el.clientWidth} sh${el.scrollHeight}/ch${el.clientHeight} lh ${lh} "${txt}"`);
      const fg = parse(s.color); if (!fg) return;
      const bg = bgOf(el); const col = blend(fg, bg);
      const cr = ratio(col, bg); n++;
      const large = fsz >= 24 || (fsz >= 18.66 && +s.fontWeight >= 600);
      const need = large ? 3 : 4.5;
      if (cr < minR) { minR = cr; minEx = `${cr.toFixed(2)} "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`; }
      if (cr < need) low.push(`${cr.toFixed(2)} (<${need}) "${txt}" ${s.color} on rgb(${bg.slice(0, 3).map(Math.round)})`);
    });
    const tgt = [];
    const scopeEls = roots;
    document.querySelectorAll('button,a,input:not([type=hidden]),select,textarea,[role=radio],[role=tab],summary').forEach(el => {
      if (!scopeEls.some(r => r.contains(el))) return;
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden' || el.closest('.sr-only') || el.closest('.aq-skip')) return;
      if (r.right < 0 || r.left > innerWidth) return;
      if (el.tagName === 'A' && !el.matches('.aq-btn,.aq-nav-item,[data-testid]') && getComputedStyle(el).display === 'inline') return; // ลิงก์ในประโยค
      if (el.matches('input[type=checkbox],input[type=radio]')) { const lab = el.closest('label'); if (lab) { const lr = lab.getBoundingClientRect(); if (lr.height >= 44) return; } }
      if (r.height < 44 || r.width < 44) tgt.push(`${el.tagName.toLowerCase()}[${el.dataset.testid || el.getAttribute('aria-label') || (el.innerText || el.value || '').trim().slice(0, 16)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    return {
      sw: document.documentElement.scrollWidth, iw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth,
      htmlDark: document.documentElement.classList.contains('dark'), bodyBg: getComputedStyle(document.body).backgroundColor,
      loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/_[0-9a-f]{6}$/, '').replace(/^__/, '') + ' ' + f.weight))],
      fonts, contrastN: n, minContrast: minEx, low: low.slice(0, 15), clip: clip.slice(0, 10), small: small.slice(0, 15), lhLow: lhLow.slice(0, 10), upper, targets: tgt.slice(0, 25),
    };
  }, scopeSel);
}
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByTestId('app-loader').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}
const snap = (page, name, full = true) => page.screenshot({ path: `${OUT}v1-${name}.png`, fullPage: full });
async function loginAs(page, u) {
  await page.goto(BASE + '/login'); await settle(page);
  await page.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
  await page.goto(BASE + '/login'); await settle(page);
  await page.getByTestId('login-username').fill(u); await page.getByTestId('login-password').fill('demo1234');
  await page.getByTestId('login-submit').click(); await page.waitForURL('**/app', { timeout: 30000 }); await settle(page);
}
async function closeAll(page) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }

// แจ้งเตือนเพิ่มเติม (ชนิดต่าง ๆ / วันนี้-เมื่อวาน-ก่อนหน้า) ให้ staff1 — เพื่อดูหน้าตา panel ครบทุกกลุ่ม
async function seedExtraNoti(page) {
  return page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]');
    const s = users.find(u => u.username === 'staff1'); if (!s) return 'no staff1';
    const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]');
    const now = Date.now(), H = 3600e3;
    const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(15, 20, 0, 0);
    const mk = (id, kind, th, en, at, read, target, extra = {}) => ({ id, universityId: s.universityId, userId: s.id, kind, messageTh: th, messageEn: en, createdAt: at, ...(read ? { readAt: at + 60e3 } : {}), target, ...extra });
    rows.push(
      mk('v1n1', 'changes_requested', 'ข้อ 4.2 ถูกส่งกลับแก้: เกณฑ์ที่ 4 ยังขาดหลักฐานผลการประเมินอาจารย์ที่ปรึกษา', 'Requirement 4.2 was returned for changes', now - 5 * 60e3, false, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '4.2' }, { cycleId: 'cycle-demo-2569', requirementId: '4.2' }),
      mk('v1n2', 'comment', 'ผศ.ดร.ปรีชา แสดงความเห็นในข้อ 3.6', 'A comment was added to requirement 3.6', now - 2 * H, false, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '3.6', panel: 'comments' }, { cycleId: 'cycle-demo-2569', requirementId: '3.6' }),
      mk('v1n3', 'approved', 'ข้อ 2.1 ได้รับการอนุมัติแล้ว', 'Requirement 2.1 was approved', y.getTime(), true, { type: 'section', cycleId: 'cycle-demo-2569', requirementId: '2.1' }, { cycleId: 'cycle-demo-2569', requirementId: '2.1' }),
      mk('v1n4', 'deadline', 'ใกล้ถึงกำหนดส่งรายงานรอบ 2569 (เหลือ 3 วัน)', 'SAR 2569 is due in 3 days', y.getTime() - 3 * H, true, { type: 'my_work' }),
      mk('v1n5', 'cycle_status', 'รอบประเมิน 2569 เปลี่ยนสถานะเป็น "กำลังจัดทำ"', 'Cycle 2569 status changed', now - 5 * 24 * H, true, { type: 'cycle', cycleId: 'cycle-demo-2569' }, { cycleId: 'cycle-demo-2569' }),
    );
    localStorage.setItem('aunqa_notifications', JSON.stringify(rows));
    window.dispatchEvent(new Event('aunqa:todos-changed'));
    return 'ok ' + rows.filter(r => r.userId === s.id).length;
  });
}
// คำเชิญที่ใช้ได้ (สร้างแถว invited + Invitation hash ตามรูปแบบ onboarding.store — R2-F6 ยังไม่มีปุ่มเชิญใน admin)
async function seedInvite(page) {
  return page.evaluate(async () => {
    const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]');
    const admin = users.find(u => u.username === 'uadmin'); const tmpl = users.find(u => u.username === 'staff1');
    const token = 'v1demoTokenAbcdefghijklmnopqrstuvwxyz012345';
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('aunqa-invite::' + token));
    const hash = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (!users.find(u => u.username === 'somsri.k')) {
      users.push({ id: 'u-v1inv', username: 'somsri.k', password: '', universityId: tmpl.universityId, email: 'somsri.k@' + (tmpl.email || 'x@sample.example').split('@')[1], fullName: 'อ.สมศรี ขยันสอน', roles: tmpl.roles, status: 'invited' });
      localStorage.setItem('aunqa_users', JSON.stringify(users));
      const inv = JSON.parse(localStorage.getItem('aunqa_invitations') || '[]');
      inv.push({ id: 'inv-v1', universityId: tmpl.universityId, userId: 'u-v1inv', tokenHash: hash, createdBy: admin?.id || tmpl.id, createdAt: Date.now(), expiresAt: Date.now() + 7 * 864e5 });
      localStorage.setItem('aunqa_invitations', JSON.stringify(inv));
    }
    return token;
  });
}

const combos = [];
for (const theme of ['light', 'dark']) for (const [vp, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) combos.push([theme, vp, w, h]);

for (const [theme, vp, w, h] of combos) {
  const tag = `${theme}-${vp}`;
  if (ONLY && ONLY !== tag) continue;
  log('==', tag);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'th-TH', colorScheme: theme, permissions: ['clipboard-read', 'clipboard-write'] });
  if (theme === 'dark') await ctx.addInitScript(() => { try { if (!localStorage.getItem('aunqa_theme')) localStorage.setItem('aunqa_theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('pageerror', tag, e.message.slice(0, 120)));
  try {
    // ---- landing
    await page.goto(BASE + '/'); await settle(page); await page.waitForTimeout(500);
    await snap(page, `landing-${tag}`); await collect(page, `landing-${tag}`);
    await snap(page, `landing-fold-${tag}`, false);
    const dm = page.getByTestId('display-menu').first();
    if (await dm.isVisible().catch(() => false)) { await dm.click(); await page.waitForTimeout(350); await snap(page, `landing-display-${tag}`, false); await collect(page, `landing-display-${tag}`, '[data-testid=display-menu-panel]'); await closeAll(page); }
    if (vp === '390') { const t = page.locator('header button[aria-expanded]').filter({ hasNotText: /แสดงผล|การแสดงผล/ }).first(); if (await t.count()) { await t.click(); await page.waitForTimeout(400); await snap(page, `landing-menu-${tag}`, false); await closeAll(page); } }
    // ---- login
    await page.goto(BASE + '/login'); await settle(page);
    await snap(page, `login-${tag}`); await collect(page, `login-${tag}`);
    await page.getByTestId('display-menu').first().click(); await page.waitForTimeout(350);
    await snap(page, `login-display-${tag}`, false); await collect(page, `login-display-${tag}`, '[data-testid=display-menu-panel]');
    await closeAll(page);
    await page.getByTestId('login-username').fill('chair1'); await page.getByTestId('login-password').fill('wrongpass');
    await page.getByTestId('login-submit').click(); await page.waitForTimeout(1200);
    await snap(page, `login-error-${tag}`, false); await collect(page, `login-error-${tag}`);
    // ---- request access: ปกติ / error / สำเร็จ
    await page.goto(BASE + '/request-access'); await settle(page);
    await snap(page, `request-${tag}`); await collect(page, `request-${tag}`);
    await page.getByTestId('ra-email').fill('somchai@gmail.com'); await page.getByTestId('ra-email').blur(); await page.waitForTimeout(300);
    await page.getByTestId('ra-password').fill('1234'); await page.getByTestId('ra-password2').fill('12345');
    await page.getByTestId('ra-submit').click(); await page.waitForTimeout(600);
    await snap(page, `request-error-${tag}`); await collect(page, `request-error-${tag}`);
    stats[`request-error-${tag}`].focusAfterSubmit = await page.evaluate(() => { const a = document.activeElement; return a ? (a.dataset.testid || a.tagName + ' ' + (a.id || '')) : null; });
    if (vp === '1440') {
      const dom = await page.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const v = localStorage.getItem(localStorage.key(i)) || ''; const m = v.match(/"emailDomain":"([^"]+)"/); if (m) return m[1]; } return null; });
      await page.goto(BASE + '/request-access'); await settle(page);
      await page.getByTestId('ra-name').fill('สมชาย ใจดี');
      await page.getByTestId('ra-email').fill(`somchai.v1${theme}@${dom}`); await page.getByTestId('ra-email').blur(); await page.waitForTimeout(400);
      const unit = page.getByTestId('ra-unit'); const opts = await unit.locator('option').count(); if (opts > 1) await unit.selectOption({ index: 1 });
      await page.getByTestId('ra-position').fill('อาจารย์ประจำหลักสูตร');
      await page.getByTestId('ra-reason').fill('ได้รับมอบหมายให้เขียน SAR เกณฑ์ 3');
      await page.getByTestId('ra-username').fill(`somchai.v1${theme}`);
      await page.getByTestId('ra-password').fill('ภูเขาสูงมาก1'); await page.getByTestId('ra-password2').fill('ภูเขาสูงมาก1');
      await page.getByTestId('ra-consent').check();
      await snap(page, `request-filled-${tag}`);
      await page.getByTestId('ra-submit').click(); await page.waitForTimeout(1500);
      await snap(page, `request-success-${tag}`, false); stats[`request-success-${tag}`] = { shown: await page.getByTestId('ra-success').isVisible().catch(() => false), dom };
    }
    // ---- invite: ไม่มี token / token เสีย / token ถูก
    await page.goto(BASE + '/invite'); await settle(page);
    await snap(page, `invite-empty-${tag}`); await collect(page, `invite-empty-${tag}`);
    await page.goto(BASE + '/invite#t=thisTokenIsNotValid123'); await settle(page); await page.waitForTimeout(600);
    await snap(page, `invite-invalid-${tag}`); await collect(page, `invite-invalid-${tag}`);
    const tok = await seedInvite(page);
    await page.goto(BASE + '/login'); await page.goto(BASE + '/invite#t=' + tok); await settle(page); await page.waitForTimeout(800);
    await snap(page, `invite-${tag}`); await collect(page, `invite-${tag}`);
    // ---- noti: chair1 มอบ 3.6 ให้ staff1 (ของจริง)
    await loginAs(page, 'chair1');
    await snap(page, `home-chair1-${tag}`); await collect(page, `home-chair1-${tag}`, '#main');
    await snap(page, `shell-${tag}`, false); await collect(page, `shell-${tag}`, 'header, #app-sidebar');
    await page.getByTestId('user-menu').click(); await page.waitForTimeout(350);
    await snap(page, `usermenu-${tag}`, false); await collect(page, `usermenu-${tag}`, '[data-testid=user-menu-panel]');
    stats[`usermenu-${tag}`].panelRect = await page.getByTestId('user-menu-panel').boundingBox();
    await closeAll(page);
    if (vp === '390') { await page.getByTestId('nav-menu').click(); await page.waitForTimeout(450); await snap(page, `drawer-${tag}`, false); await collect(page, `drawer-${tag}`, '#app-sidebar'); await closeAll(page); }
    await page.goto(BASE + '/app/cycles/cycle-demo-2569/assign'); await settle(page);
    const ow = page.getByTestId('owner-3.6');
    if (await ow.count()) { await ow.selectOption({ label: 'อ.วิภา เขียนรายงาน' }).catch(e => log('assign fail', e.message.slice(0, 80))); await page.waitForTimeout(500); }
    // ---- staff1
    await loginAs(page, 'staff1');
    log('seed', await seedExtraNoti(page));
    await page.goto(BASE + '/app'); await settle(page);
    await snap(page, `home-staff1-${tag}`); await collect(page, `home-staff1-${tag}`, '#main');
    await page.getByTestId('nav-bell').click(); await page.waitForTimeout(450);
    await snap(page, `noti-${tag}`, false); await collect(page, `noti-${tag}`, '[data-testid=noti-panel]');
    stats[`noti-${tag}`].panelRect = await page.getByTestId('noti-panel').boundingBox();
    stats[`noti-${tag}`].bell = await page.getByTestId('nav-bell').getAttribute('aria-label');
    // grayscale pill "ใหม่"
    await page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
    await page.waitForTimeout(200);
    await page.getByTestId('noti-panel').screenshot({ path: `${OUT}v1-noti-gray-${tag}.png` });
    await page.evaluate(() => { document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('grayscale(1)')) s.remove(); }); });
    // ---- empty
    await closeAll(page);
    await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('aunqa_session') || 'null'); const users = JSON.parse(localStorage.getItem('aunqa_users') || '[]'); const me = users.find(x => x.username === 'staff1'); const rows = JSON.parse(localStorage.getItem('aunqa_notifications') || '[]'); localStorage.setItem('aunqa_notifications', JSON.stringify(rows.filter(r => r.userId !== me.id))); });
    await page.goto(BASE + '/app'); await settle(page);
    await page.getByTestId('nav-bell').click(); await page.waitForTimeout(450);
    await snap(page, `noti-empty-${tag}`, false); await collect(page, `noti-empty-${tag}`, '[data-testid=noti-panel]');
    await closeAll(page);
    // ---- uadmin
    await loginAs(page, 'uadmin');
    await snap(page, `home-uadmin-${tag}`); await collect(page, `home-uadmin-${tag}`, '#main');
    await snap(page, `shell-uadmin-${tag}`, false); await collect(page, `shell-uadmin-${tag}`, 'header, #app-sidebar');
  } catch (e) { log('ERR', tag, e.message.slice(0, 300)); await snap(page, `zz-err-${tag}`, false).catch(() => {}); }
  await ctx.close();
}

// ---------- crop 2x ตรวจวรรณยุกต์ (light) ----------
if (!ONLY || ONLY === 'crop') for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'th-TH', colorScheme: theme });
  if (theme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('aunqa_theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  await loginAs(page, 'chair1');
  await page.locator('header').first().screenshot({ path: `${OUT}v1-crop-topbar-${theme}.png` });
  await page.locator('#app-sidebar').screenshot({ path: `${OUT}v1-crop-sidebar-${theme}.png` });
  await page.getByTestId('user-menu').click(); await page.waitForTimeout(350);
  await page.getByTestId('user-menu-panel').screenshot({ path: `${OUT}v1-crop-usermenu-${theme}.png` });
  await ctx.close();
}
fs.writeFileSync(path.join(here, 'v1-stats.json'), JSON.stringify(stats, null, 1));
await b.close();
log('done', Object.keys(stats).length);
