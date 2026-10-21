import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session({fresh:true});
p.setDefaultTimeout(6000);
// slow network: loading screen
const t=Date.now();
await p.goto(B+'/login');
await p.getByTestId('login-username').fill(' lect1 ');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();
await p.waitForTimeout(150);await p.screenshot({path:'shots/loading-after-login.png'});
console.log('t+150ms text:',(await txt(p,300)).replace(/\n/g,'|'));
await p.waitForURL('**/app',{timeout:6000}).then(()=>console.log('trimmed username login OK',Date.now()-t,'ms')).catch(()=>console.log('trim FAIL, url',p.url()));
await p.waitForTimeout(800);
if(p.url().includes('/app')){
 await p.getByTestId('logout').click();await p.waitForTimeout(1200);
 console.log('after logout',p.url().replace(B,''));await p.screenshot({path:'shots/logout.png'});
 await p.goBack();await p.waitForTimeout(1200);console.log('Back after logout ->',p.url().replace(B,''),'|',(await txt(p,600)).split('\n').slice(0,8).join('/'));
 await p.screenshot({path:'shots/back-after-logout.png'});
 // direct deep link while logged out
 await p.goto(B+'/app/evidence');await p.waitForTimeout(1200);console.log('deep link logged-out ->',p.url().replace(B,''));
}
// storage quota: upload several 12MB pdf as staff1
await as('staff1');
await p.goto(B+'/app/evidence');
const big=['ev-big.pdf'];
for(let i=0;i<4;i++){
 await p.getByTestId('ev-new').click();await p.getByTestId('ev-title').fill('big'+i);await p.getByTestId('ev-file').setInputFiles('ev-big.pdf');
 await p.getByTestId('ev-submit').click();await p.waitForTimeout(1500);
 console.log('upload',i,await p.locator('[role=status]').allInnerTexts().then(a=>a.join('/')));
}
console.log('localStorage bytes',await p.evaluate(()=>Object.entries(localStorage).reduce((s,[k,v])=>s+k.length+v.length,0)));
console.log('is file content stored?',await p.evaluate(()=>Object.entries(localStorage).filter(([k,v])=>v.length>1000000).map(([k,v])=>k+':'+v.length)));
await done();
