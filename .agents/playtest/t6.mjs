import {start,login,txt,B} from './lib.mjs';
const br=await start();
const ctx=await br.newContext({viewport:{width:1366,height:800},locale:'th-TH'});
const p=await ctx.newPage();
async function as(u){await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.removeItem('aunqa_session'));await p.goto(B+'/login');
 await p.getByTestId('login-username').fill(u);await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(600);}
await as('chair1');
await p.goto(B+'/app/cycles');await p.getByTestId('cycle-new').click();
await p.screenshot({path:'shots/cycle-new.png'});
await p.getByTestId('cycle-year').fill('2570');await p.getByTestId('cycle-submit').click();
await p.waitForURL(/cycles\/(?!$)[^/]+$/);await p.waitForTimeout(800);
const cid=decodeURIComponent(p.url().split('/').pop());console.log('cycle',cid);
await p.screenshot({path:'shots/newcycle-dash.png'});
await p.goto(B+`/app/cycles/${encodeURIComponent(cid)}/assign`);
await p.getByTestId('bulk-owner-3').selectOption({label:'อ.ธนา สอนดี'});await p.getByTestId('bulk-apply-3').click();await p.waitForTimeout(600);
await p.screenshot({path:'shots/bulk-assign.png'});
const vis=await p.locator('[role=status]').allInnerTexts().catch(()=>[]);console.log('assign toast',vis);
require_cid:
await as('lect1');
const sec=`/app/sections/${encodeURIComponent(cid+'::3.1')}`;
await p.goto(B+sec);await p.waitForTimeout(1000);
await p.screenshot({path:'shots/lect-3.1-draft.png',fullPage:true});
const ed=p.getByTestId('sar-editor');console.log('editor html',(await ed.evaluate(e=>e.outerHTML)).slice(0,300));
await br.close();
