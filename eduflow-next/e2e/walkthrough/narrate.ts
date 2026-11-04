/**
 * TASK-0003 S6b — helper สำหรับวิดีโอ walkthrough (ใช้กับ playwright.walkthrough.config.ts เท่านั้น)
 *
 * - caption(page, text)   แถบคำบรรยายภาษาไทยด้านล่างจอ (fixed, z-index สูงสุด, pointer-events none) ค้างให้อ่าน ~2.4–5 วินาที
 * - setRole(page, ...)    ป้ายมุมบน "บทบาท: … (username)"
 * - hclick / hfill / hselect   ไฮไลต์ element (outline ชั่วคราว) ก่อนคลิก/กรอก
 * - asUser(page, ...)     สลับผู้ใช้ใน page เดียวกัน (ออกจากระบบผ่านเมนู → เข้าสู่ระบบใหม่) — ข้อมูล localStorage ไม่หาย
 * - loadScenario(page, id) sadmin โหลดชุดข้อมูลทดสอบผ่านแท็บ "ข้อมูลเดโม่" (UI จริง)
 * - saveVideo(page, info, name)  หลังเทสต์ผ่าน: ปิด context แล้วคัดลอกวิดีโอไป docs/walkthrough/videos/<name>.webm
 *
 * overlay ติดกับ <html> (ไม่ใช่ใน React tree) และวาดใหม่ทุกครั้งที่โหลดเอกสาร (domcontentloaded) จึงอยู่รอดการเปลี่ยนหน้า
 */
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dialogOk, loginAs, logoutViaMenu } from '../helpers';

interface Overlay { role?: string; caption?: string; scene?: string }
const STATE = new WeakMap<Page, Overlay>();
const HOOKED = new WeakSet<Page>();

/** วาด overlay ในหน้า (รันในเบราว์เซอร์) */
function paint(o: Overlay) {
  const FONT = "'Leelawadee UI','Noto Sans Thai','Sarabun',Tahoma,sans-serif";
  const root = document.documentElement;
  const mk = (id: string, css: string) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-walkthrough', '1');
      root.appendChild(el);
    }
    el.style.cssText = css;
    return el;
  };
  const base = `position:fixed;z-index:2147483647;pointer-events:none;font-family:${FONT};`;
  const role = mk('wt-role', base + 'top:10px;left:10px;background:#7c2d12;color:#fff;'
    + 'font-size:18px;font-weight:700;padding:6px 18px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;');
  role.textContent = o.role ?? '';
  role.style.display = o.role ? 'block' : 'none';
  const scene = mk('wt-scene', base + 'top:50px;left:10px;background:rgba(255,251,235,.96);color:#422006;'
    + 'border:2px solid #b45309;font-size:16px;font-weight:600;padding:4px 14px;border-radius:8px;white-space:nowrap;');
  scene.textContent = o.scene ?? '';
  scene.style.display = o.scene ? 'block' : 'none';
  const cap = mk('wt-caption', base + 'left:50%;bottom:22px;transform:translateX(-50%);width:max-content;max-width:1160px;'
    + 'background:rgba(17,17,17,.88);color:#fff;font-size:25px;line-height:1.55;font-weight:500;padding:12px 26px;'
    + 'border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.4);text-align:center;');
  cap.textContent = o.caption ?? '';
  cap.style.display = o.caption ? 'block' : 'none';
}

async function repaint(page: Page) {
  const st = STATE.get(page) ?? {};
  await page.evaluate(paint, st).catch(() => { /* หน้ากำลังเปลี่ยน — จะวาดใหม่ตอน domcontentloaded */ });
}

function hook(page: Page) {
  if (HOOKED.has(page)) return;
  HOOKED.add(page);
  if (!STATE.has(page)) STATE.set(page, {});
  page.on('domcontentloaded', () => { void repaint(page); });
  page.on('load', () => { void repaint(page); });
}

/** เวลาค้างคำบรรยาย: ตามความยาวข้อความ (อ่านภาษาไทย ~20 ตัวอักษร/วินาที) 2.4–5.5 วินาที */
const holdFor = (text: string) => Math.max(2400, Math.min(5500, text.length * 50));

/** แสดงคำบรรยายด้านล่างจอ แล้วค้างไว้ให้อ่าน */
export async function caption(page: Page, text: string, holdMs?: number) {
  hook(page);
  STATE.get(page)!.caption = text;
  await repaint(page);
  await page.waitForTimeout(holdMs ?? holdFor(text));
}

/** ป้ายฉาก (ใต้ป้ายบทบาท) เช่น "ฉาก 2: ข้อควรระวัง" — ส่ง '' เพื่อซ่อน */
export async function scene(page: Page, text: string) {
  hook(page);
  STATE.get(page)!.scene = text;
  await repaint(page);
}

/** ป้ายมุมบน "บทบาท: … (username)" */
export async function setRole(page: Page, roleTh: string, username?: string) {
  hook(page);
  STATE.get(page)!.role = username ? `บทบาท: ${roleTh} (${username})` : `บทบาท: ${roleTh}`;
  await repaint(page);
}

async function flash(loc: Locator, page: Page) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.evaluate((el: HTMLElement) => {
    el.dataset.wtOutline = el.style.outline;
    el.dataset.wtOffset = el.style.outlineOffset;
    el.style.outline = '4px solid #f59e0b';
    el.style.outlineOffset = '3px';
  }).catch(() => {});
  await page.waitForTimeout(500);
  await loc.evaluate((el: HTMLElement) => {
    el.style.outline = el.dataset.wtOutline ?? '';
    el.style.outlineOffset = el.dataset.wtOffset ?? '';
  }).catch(() => {});
}

/** ไฮไลต์แล้วคลิก */
export async function hclick(page: Page, loc: Locator, opts?: Parameters<Locator['click']>[0]) {
  await expect(loc).toBeVisible();
  await flash(loc, page);
  await loc.click(opts);
}

/** ไฮไลต์แล้วกรอก */
export async function hfill(page: Page, loc: Locator, value: string) {
  await expect(loc).toBeVisible();
  await flash(loc, page);
  await loc.fill(value);
}

/** ไฮไลต์แล้วเลือก option */
export async function hselect(page: Page, loc: Locator, value: string | { label: string } | { index: number }) {
  await expect(loc).toBeVisible();
  await flash(loc, page);
  await loc.selectOption(value as never);
}

/** ไฮไลต์ element เฉย ๆ (ชี้ให้ดู) */
export async function point(page: Page, loc: Locator) {
  await expect(loc.first()).toBeVisible();
  await flash(loc.first(), page);
}

/** จำนวนแจ้งเตือนที่ยังไม่อ่านจาก aria-label ของกระดิ่ง */
export async function unread(page: Page): Promise<number> {
  const bell = page.getByTestId('nav-bell');
  await expect(bell).toBeVisible();
  return Number((await bell.getAttribute('aria-label'))!.match(/(\d+) รายการ/)![1]);
}

/** เปิดกระดิ่ง แล้วคืน locator ของรายการแรกที่มีข้อความนี้ (ไม่คลิก) */
export async function bellItem(page: Page, text: string | RegExp): Promise<Locator> {
  const bell = page.getByTestId('nav-bell');
  const panel = page.getByTestId('noti-panel');
  if (!(await panel.isVisible().catch(() => false))) await hclick(page, bell);
  await expect(panel).toBeVisible();
  const item = panel.locator('[data-testid^="noti-item-"]', { hasText: text }).first();
  await expect(item).toBeVisible();
  await flash(item, page);
  return item;
}

/** ปิด panel กระดิ่ง (ถ้าเปิดอยู่) */
export async function closeBell(page: Page) {
  const panel = page.getByTestId('noti-panel');
  if (await panel.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
}

/**
 * สลับผู้ใช้ใน page เดียวกัน: ถ้ายังล็อกอินอยู่ → ออกจากระบบผ่านเมนูผู้ใช้ (เห็นในวิดีโอ) → เข้าสู่ระบบใหม่
 * (localStorage ของ context เดียวกัน = ข้อมูลเดิมยังอยู่ครบ)
 */
export async function asUser(page: Page, username: string, roleTh: string, opts: { password?: string; viaMenu?: boolean } = {}) {
  hook(page);
  const signedIn = await page.getByTestId('nav-user').isVisible().catch(() => false);
  if (signedIn && opts.viaMenu !== false) {
    await logoutViaMenu(page);
    await page.waitForURL(u => !new URL(u).pathname.startsWith('/app'), { timeout: 30_000 });
  }
  await setRole(page, roleTh, username);
  await loginAs(page, username, opts.password);
}

/** ยืนยันกล่อง dialog ด้วยปุ่มที่ชื่อขึ้นต้น "ยืนยัน" (ไฮไลต์ก่อนคลิก) */
export async function confirmOk(page: Page, note?: string) {
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  if (note !== undefined) await hfill(page, dlg.locator('textarea'), note);
  const btn = dlg.getByRole('button', { name: /^ยืนยัน/ });
  await flash(btn, page);
  await dialogOk(page);
}

/** sadmin โหลด scenario ผ่านแท็บข้อมูลเดโม่ → ถูกพาไป /login พร้อม panel สรุป */
export async function loadScenario(page: Page, id: string, captionText?: string) {
  await asUser(page, 'sadmin', 'ผู้ดูแลระบบสูงสุด');
  await page.goto('/app/admin?tab=demo');
  const btn = id === 'all' ? page.getByTestId('scenario-load-all') : page.getByTestId(`scenario-load-${id}`);
  await expect(btn).toBeVisible({ timeout: 20_000 });
  if (captionText) await caption(page, captionText);
  await hclick(page, btn);
  await confirmOk(page);
  await page.waitForURL(/\/login/, { timeout: 90_000 });
  await expect(page.getByTestId('login-scenario-summary')).toBeVisible({ timeout: 30_000 });
}

/** หลังเทสต์: ปิด context แล้วคัดลอกวิดีโอไป docs/walkthrough/videos/<name>.webm (เฉพาะเทสต์ที่ผ่าน) + บันทึกความยาว */
export async function saveVideo(page: Page, info: TestInfo, name: string) {
  const video = page.video();
  await page.context().close();
  if (!video || info.status !== info.expectedStatus) return;
  const appRoot = path.dirname(info.config.configFile ?? path.join(process.cwd(), 'x'));
  const outDir = path.resolve(appRoot, '..', 'docs', 'walkthrough', 'videos');
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, `${name}.webm`);
  await video.saveAs(dest);
  const meta = path.resolve(appRoot, 'e2e', 'artifacts', 'walkthrough', 'durations.json');
  fs.mkdirSync(path.dirname(meta), { recursive: true });
  const all = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : {};
  all[name] = { ms: info.duration, title: info.title, savedAt: new Date().toISOString() };
  fs.writeFileSync(meta, JSON.stringify(all, null, 2));
}
