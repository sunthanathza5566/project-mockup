import {session,B,txt,log} from './lib.mjs';
const {br,p,as,shot}=await session({state:'st-c2.json'});
for(const u of ['fqa1','chair1','dean1']){
await as(u);await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(1500);
log(u,'assessor opts',await p.getByTestId('assessor-select').locator('option').allInnerTexts().catch(()=>'none'));
log((await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,400));}
await as('fqa1');await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(1500);await shot('48-fqa-assign-assessor',true);
await br.close();
