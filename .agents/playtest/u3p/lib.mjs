// U3 playtest helper — playtester (อ่านอย่างเดียว ไม่แก้โค้ด)
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const B = 'http://localhost:3952';
export const STATE = path.join(DIR, 'state.json');
export const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
export const CY = 'cycle-demo-2569';
export const sec = (c, r) => `${B}/app/sections/${encodeURIComponent(`${c}::${r}`)}`;

export async function session(opts = {}) {
  const br = await chromium.launch();
  const ctx = await br.newContext({
    viewport: opts.viewport || { width: 1366, height: 800 }, locale: 'th-TH', acceptDownloads: true,
    ...(fs.existsSync(STATE) && !opts.fresh ? { storageState: STATE } : {}),
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  let clicks = 0; const log = [];
  const act = (what) => { clicks++; log.push(what); };
  const as = async (u, pw = 'demo1234') => {
    await p.goto(B + '/login');
    await p.evaluate(() => { localStorage.removeItem('aunqa_session'); sessionStorage.removeItem('aunqa_session'); });
    await p.goto(B + '/login');
    await p.getByTestId('login-username').fill(u);
    await p.getByTestId('login-password').fill(pw);
    await p.getByTestId('login-submit').click();
    await p.waitForURL('**/app', { timeout: 30000 });
    await p.waitForTimeout(1200);
    clicks = 0; log.length = 0;
  };
  const shot = async (n, full = false) => p.screenshot({ path: path.join(SHOTS, `play-${n}.png`), fullPage: full });
  const txt = async (n = 1500, loc = 'main') => {
    const l = p.locator(loc).first();
    return ((await l.count()) ? await l.innerText() : await p.locator('body').innerText()).slice(0, n);
  };
  const done = async () => { await ctx.storageState({ path: STATE }); await br.close(); };
  const stats = () => ({ clicks, log: [...log], errs });
  return { br, ctx, p, as, shot, txt, done, act, stats };
}
// ปุ่มยืนยันใน dialog (ชื่ออาจเป็น "ยืนยัน…")
export async function dlgOk(p, note) {
  const d = p.getByRole('dialog');
  await d.waitFor({ state: 'visible', timeout: 5000 });
  if (note !== undefined) await d.locator('textarea').fill(note);
  const btns = d.getByRole('button', { name: /^ยืนยัน/ });
  await btns.last().click();
  await d.waitFor({ state: 'hidden', timeout: 8000 });
}
export const tid = (p, id) => p.getByTestId(id);
