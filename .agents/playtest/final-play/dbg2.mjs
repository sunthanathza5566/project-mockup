import {session,B,txt,log} from './lib.mjs';
const {br,p,as,shot}=await session({state:'st-c1.json'});
await as('fqa1');await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1200);
await p.getByTestId('cycle-to-revision_requested').click();const d=p.getByRole('dialog');await d.locator('textarea').fill('ข้อ 3.6 ขอเพิ่มข้อมูล');await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(900);
await as('chair1');await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1500);
const t=await p.locator('body').innerText();log('len',t.length,'idx',t.indexOf('ขอเพิ่มข้อมูล'));
log(t.slice(0,1800));
await as('lect1');await p.goto(B+'/app');await p.waitForTimeout(1000);log('lect1 home has note?',(await p.locator('body').innerText()).indexOf('ขอเพิ่มข้อมูล'));
await br.close();
