import { chromium } from '../../../eduflow-next/node_modules/playwright/index.mjs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../screenshots/u1b');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(path.join(here, 'style-tile.html')).href, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
// multi-line heading stress: put stacked marks under descenders of previous line
await p.evaluate(() => {
  const d = document.createElement('div'); d.id = 'stress'; d.className = 'card';
  d.innerHTML = '<h1 style="margin:0">ฤดูปู่ญี่ปุ่น ฎีกาฐาน<br>ปั้นจั่นผู้ใหญ่ที่นี่น้ำใจ</h1>' +
    '<div style="font-size:22px;line-height:1.45;font-weight:700">ฤดูปู่ญี่ปุ่น ฎีกาฐาน<br>ปั้นจั่นผู้ใหญ่ที่นี่น้ำใจ</div>' +
    '<div style="font-size:13px;line-height:1.4;font-weight:600;background:#E6F3EA;color:#2F7A4B;border-radius:999px;padding:0 12px;display:inline-block;overflow:hidden">ปั้นจั่น ผู้ใหญ่ (pill overflow:hidden)</div>';
  document.querySelector('main').prepend(d);
});
await p.locator('#stress').screenshot({ path: path.join(out, 'ui-lh-stress-390.png') });
await p.locator('#lh').screenshot({ path: path.join(out, 'ui-lh-test-390.png') });
await p.locator('h2:has-text("ปุ่ม") + .card').screenshot({ path: path.join(out, 'ui-buttons-390.png') });
await b.close();
