// crop ภาพ: node crop.mjs <src.png> <out.png> x y w h [scale]
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
const [src, out, x, y, w, h, sc = '1'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +sc });
const data = fs.readFileSync(src).toString('base64');
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${data}" style="position:absolute;left:${-x}px;top:${-y}px"></body>`);
await p.waitForTimeout(200); await p.screenshot({ path: out }); await b.close();
