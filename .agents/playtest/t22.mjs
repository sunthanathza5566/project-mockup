import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session({fresh:true});
p.setDefaultTimeout(6000);
await as('staff1');await p.goto(B+'/app/evidence');await p.waitForTimeout(600);
await p.getByTestId('ev-cycle').selectOption({label:/ทุกรอบ/}).catch(async()=>{const s=await p.locator('select').nth(1);await s.selectOption({index:0});});
await p.getByTestId('ev-new').click();await p.getByTestId('ev-title').fill('ไม่เลือกรอบ');
const o=(await p.getByTestId('ev-f-reqs').locator('option').allTextContents()).find(t=>t.startsWith('1.2 '));await p.getByTestId('ev-f-reqs').selectOption({label:o});
await p.getByTestId('ev-submit').click();await p.waitForTimeout(800);
console.log('no-cycle link toast:',await p.locator('[role=status],[role=alert]').allInnerTexts());
await p.screenshot({path:'shots/ev-nocycle.png'});
// empty title: any message?
await p.getByTestId('ev-title').fill('');await p.getByTestId('ev-submit').click();await p.waitForTimeout(500);
console.log('empty title msg:',await p.locator('[role=status],[role=alert]').allInnerTexts(),'validity',await p.getByTestId('ev-title').evaluate(e=>e.validationMessage));
// uadmin admin page
await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(800);
console.log('ADMIN',(await txt(p,1800)).split('\n').slice(14,50).join('|'));
await p.screenshot({path:'shots/uadmin-admin.png'});
await done();
