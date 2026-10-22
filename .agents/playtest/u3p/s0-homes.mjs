// s0: หน้าหลักทุก role ที่สถานะ seed (fresh) — todo การ์ดแรก + เมนู + กระดิ่ง
import { session } from './lib.mjs';
import fs from 'fs';
const tag = process.argv[2] || 'seed';
const users = (process.argv[3] || 'lect1,staff1,chair1,data1,fqa1,dean1,assess1,uadmin').split(',');
const s = await session({ fresh: tag === 'seed' });
const out = {};
for (const u of users) {
  await s.as(u);
  const main = await s.txt(900);
  const nav = await s.p.locator('nav, aside').first().innerText().catch(() => '');
  const todos = await s.p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' :: ' + e.innerText.replace(/\s+/g, ' ').slice(0, 140)));
  const bell = await s.p.locator('[data-testid*="noti"], [data-testid*="bell"]').first().innerText().catch(() => '?');
  out[u] = { main, nav: nav.replace(/\n+/g, ' | '), todos, bell };
  await s.shot(`home-${tag}-${u}`);
  console.log('=====', u, '\n', main.slice(0, 600), '\nTODOS:', todos.join('\n  '), '\nNAV:', out[u].nav.slice(0, 300), '\nBELL:', bell);
}
fs.writeFileSync(new URL(`./homes-${tag}.json`, import.meta.url), JSON.stringify(out, null, 1));
console.log('errs', s.stats().errs);
await s.done();
