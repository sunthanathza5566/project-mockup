import {session,txt,B} from './lib.mjs';
const {p,as,done,ctx}=await session({fresh:true});
p.setDefaultTimeout(5000);
await p.goto(B+'/');await p.waitForTimeout(1200);
await p.screenshot({path:'shots/landing.png',fullPage:true});
console.log('LANDING',(await txt(p,1500)).replace(/\n/g,'|'));
await p.goto(B+'/login');await p.waitForTimeout(800);
await p.screenshot({path:'shots/login.png'});
console.log('LOGIN',(await txt(p,1500)).replace(/\n/g,'|'));
// wrong password / empty / spaces
await p.getByTestId('login-submit').click();await p.waitForTimeout(400);console.log('empty submit:',await p.locator('[data-testid=login-error],[role=alert]').allInnerTexts());
await p.getByTestId('login-username').fill(' chair1 ');await p.getByTestId('login-password').fill('wrong');await p.getByTestId('login-submit').click();await p.waitForTimeout(800);
console.log('wrong pw:',await p.getByTestId('login-error').innerText().catch(()=>'none'));
await p.screenshot({path:'shots/login-error.png'});
await p.getByTestId('login-username').fill('CHAIR1');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForTimeout(2500);
console.log('uppercase user ->',p.url().replace(B,''));
await p.screenshot({path:'shots/login-after.png'});
// logout
await p.goto(B+'/app');await p.waitForTimeout(800);
if(p.url().includes('/app')&&!p.url().includes('login')){
  await p.getByTestId('logout').click();await p.waitForTimeout(1000);
  console.log('after logout',p.url().replace(B,''));await p.screenshot({path:'shots/logout.png'});
  await p.goBack();await p.waitForTimeout(1000);console.log('Back after logout ->',p.url().replace(B,''),'|',(await txt(p,800)).split('\n').slice(0,6).join('/'));
  await p.screenshot({path:'shots/back-after-logout.png'});
}
// mobile
const m=await ctx.browser().newContext({viewport:{width:390,height:800},locale:'th-TH',storageState:'state.json'});
const q=await m.newPage();await q.goto(B+'/login');await q.getByTestId('login-username').fill('lect1');await q.getByTestId('login-password').fill('demo1234');await q.getByTestId('login-submit').click();await q.waitForURL('**/app');await q.waitForTimeout(800);
await q.screenshot({path:'shots/mobile-home.png'});
await q.goto(B+'/app/evidence');await q.waitForTimeout(800);await q.screenshot({path:'shots/mobile-evidence.png'});
console.log('mobile h-scroll evidence?',await q.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth));
await done();
