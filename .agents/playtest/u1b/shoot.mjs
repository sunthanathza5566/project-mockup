// U1b: render style-tile.html at 1440 and 390, collect font/overflow/size stats
import { chromium } from '../../../eduflow-next/node_modules/playwright/index.mjs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../screenshots/u1b');
const b = await chromium.launch();
for (const [w, h, n] of [[1440, 900, 'style-tile-1440'], [390, 844, 'style-tile-390']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(pathToFileURL(path.join(here, 'style-tile.html')).href, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const info = await p.evaluate(() => ({
    sarabun16: document.fonts.check('16px Sarabun'),
    loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight),
    scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    bodyFF: getComputedStyle(document.body).fontFamily,
  }));
  console.log(n, JSON.stringify(info));
  // ink extents vs line box for Thai stacked marks
  const lh = await p.evaluate(() => [...document.querySelectorAll('#lh div')].map(d => {
    const r = document.createRange(); r.selectNodeContents(d);
    const cs = getComputedStyle(d);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} Sarabun`;
    const m = c.measureText(d.textContent);
    const fs = parseFloat(cs.fontSize), lhpx = parseFloat(cs.lineHeight);
    const half = (lhpx - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    return { text: d.textContent.slice(-12), fs, lh: lhpx, boxH: Math.round(d.getBoundingClientRect().height),
      inkAsc: +m.actualBoundingBoxAscent.toFixed(1), inkDesc: +m.actualBoundingBoxDescent.toFixed(1),
      lineAsc: +(m.fontBoundingBoxAscent + half).toFixed(1), lineDesc: +(m.fontBoundingBoxDescent + half).toFixed(1) };
  }));
  console.log(JSON.stringify(lh, null, 0));
  const small = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('main *').forEach(e => {
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f < 16) { const k = f + 'px .' + ((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.tagName); o[k] = (o[k] || 0) + 1; }
    });
    return o;
  });
  console.log('sub16', JSON.stringify(small));
  const tgt = await p.evaluate(() => [...document.querySelectorAll('button,input,a.heat')].filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 24; }).map(e => e.tagName + ' ' + e.textContent.trim().slice(0, 15)));
  console.log('targets<44', JSON.stringify(tgt));
  await p.screenshot({ path: path.join(out, n + '.png'), fullPage: true });
  await p.close();
}
await b.close();
