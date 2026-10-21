import {start,login,txt,B} from './lib.mjs';
const br=await start();
const ctx=await br.newContext({viewport:{width:1366,height:800},locale:'th-TH'});
const p=await ctx.newPage();
async function as(u){await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.removeItem('aunqa_session'));await p.goto(B+'/login');
 await p.getByTestId('login-username').fill(u);await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(600);}
await as('chair1');
await p.goto(B+'/app/cycles/cycle-demo-2569/assign');
let t=Date.now();
await p.getByTestId('owner-3.1').selectOption({label:'อ.ธนา สอนดี'});await p.waitForTimeout(500);
console.log('assign feedback:',(await p.locator('body').innerText()).includes('มอบหมาย')?'?':'');
await p.screenshot({path:'shots/assign-after.png'});
await as('lect1');
console.log('LECT HOME',(await txt(p,3000)).split('\n').slice(14).join('|'));
// lect1 opens 3.1
await p.getByRole('link',{name:/^3\.1/}).first().click();await p.waitForTimeout(1000);
console.log(p.url());
await p.screenshot({path:'shots/lect-3.1-empty.png',fullPage:true});
console.log((await txt(p,4000)).split('\n').slice(14).join('|'));
t=Date.now();
const ed=p.getByTestId('sar-editor');
await ed.click();
await ed.fill('หลักสูตรมีปรัชญาการศึกษา Outcome-based ที่ประกาศบนเว็บไซต์ 😀 ตัวเลข -5 และ <b>html</b> & "quote"');
await p.waitForTimeout(2500);
console.log('save status',await p.getByTestId('save-status').innerText().catch(()=>'none'));
// ai draft
await p.getByRole('button',{name:/ร่าง \(TH\)/}).click();await p.waitForTimeout(1500);
await p.screenshot({path:'shots/lect-ai-draft.png',fullPage:true});
console.log('AI:',(await p.getByTestId('ai-panel').innerText()).replace(/\n/g,'|').slice(0,1200));
await br.close();
