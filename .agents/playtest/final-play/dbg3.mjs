import {session,B,txt,log} from './lib.mjs';
const {br,p,as,shot}=await session({state:'st-c2.json'});
await as('fqa1');await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1300);
log('links in header:',(await p.locator('main a').allInnerTexts()).slice(0,8));
await shot('47-fqa-locked-cycle');
const a=p.getByRole('link',{name:'มอบหมายงาน'});log('assign link',await a.count());
if(await a.count()){await a.click();await p.waitForTimeout(1300);log('url',p.url());log('assessor opts',await p.getByTestId('assessor-select').locator('option').allInnerTexts().catch(()=>'none'));
const t=await p.locator('main').innerText();log(t.slice(0,600));await shot('48-fqa-assign-assessor',true);}
await br.close();
