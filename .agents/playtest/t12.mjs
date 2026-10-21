import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session();
await as('lect1');
for(const path of ['/app/admin','/app/review','/app/cycles/cycle-demo-2569/assign']){
  await p.goto(B+path);await p.waitForTimeout(1000);
  const nav=await p.locator('a').allInnerTexts();
  console.log(path,'NAV',nav.join(','));
  console.log((await txt(p,2500)).split('\n').slice(17,40).join('|'));
  const sels=await p.locator('select').count(),dis=await p.locator('select:disabled').count();console.log('selects',sels,'disabled',dis);
  await p.screenshot({path:`shots/lect-${path.replace(/\W+/g,'_')}.png`});
}
// try changing owner as lect1 on assign
await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(800);
const s=p.getByTestId('owner-3.6');console.log('owner select enabled',await s.isEnabled());
await s.selectOption({label:'อ.ธนา สอนดี'}).catch(()=>{});await p.waitForTimeout(500);
console.log('owner value now',await s.inputValue(),(await p.locator('[role=status]').allInnerTexts()));
await done();
