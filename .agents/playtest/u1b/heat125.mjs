// U1b: heat cell per C13 (3 rows, fixed 76x68 / 68x64) at fontScale 1 and 1.25
import { chromium } from '../../../eduflow-next/node_modules/playwright/index.mjs';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../screenshots/u1b');
const cell = (w, h, n, lab) => `<a style="box-sizing:border-box;width:${w}px;height:${h}px;border:1px solid #2F7A4B;background:#E6F3EA;color:#2F7A4B;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;text-decoration:none;font-family:Sarabun">
<b style="font-size:1rem;font-weight:700;line-height:1.7">${n}</b><span style="font-size:.8125rem;font-weight:600;line-height:1.4">${lab}</span><span style="display:flex;gap:2px"><i style="width:16px;height:16px;border:2px solid currentColor;border-radius:50%;box-sizing:border-box"></i><i style="width:16px;height:16px;border:2px solid currentColor;border-radius:50%;box-sizing:border-box"></i></span></a>`;
const html = s => `<html style="font-size:${s * 100}%"><head><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"></head><body style="background:#FBF8F3;display:flex;gap:8px;padding:12px">${cell(76, 68, '1.2', 'อนุมัติ')}${cell(68, 64, '3.10', 'รอตรวจ')}${cell(68, 64, '1.2', 'วิกฤต')}</body></html>`;
const b = await chromium.launch();
for (const s of [1, 1.25]) {
  const p = await b.newPage({ viewport: { width: 390, height: 200 }, deviceScaleFactor: 2 });
  await p.setContent(html(s), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  console.log(s, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('a')].map(a => ({ need: a.scrollHeight, box: a.clientHeight, needW: a.scrollWidth, boxW: a.clientWidth })))));
  await p.screenshot({ path: path.join(out, `ui-heat-scale${s}.png`) });
  await p.close();
}
await b.close();
