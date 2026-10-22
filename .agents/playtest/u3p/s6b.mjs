import { session, sec, CY, tid } from './lib.mjs';
const s = await session(); const { p } = s;
await s.as('lect1');
await p.goto(sec(CY,'3.6')); await tid(p,'sar-editor').waitFor(); await p.waitForTimeout(700);
for (const t of await p.locator('[data-testid^="sidetab-"]').evaluateAll(es=>es.map(e=>e.getAttribute('data-testid')))) {
  await tid(p,t).click(); await p.waitForTimeout(300);
  const body = await p.locator('main').innerText();
  console.log(t, 'has reason?', body.includes('โปรดเพิ่มหลักฐานขั้น Check'), body.match(/.{0,80}โปรดเพิ่มหลักฐาน.{0,30}/g));
}
await tid(p,'sidetab-history').click().catch(()=>{}); await p.waitForTimeout(300);
await s.shot('lect-history-tab');
await s.done();
