// C-10 / F5-1 / F5-3: โหมด EN — ข้อความไทยที่ค้างใน attribute + ชื่อเกณฑ์
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE='http://localhost:3951';const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:900},locale:'th-TH'})).newPage();
await p.goto(BASE+'/login');await p.getByTestId('login-username').fill('chair1');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(1200);
const thAttr=()=>p.evaluate(()=>{const o=[];document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>{for(const a of ['placeholder','aria-label','title']){const v=e.getAttribute(a);if(v&&/[฀-๿]/.test(v)&&e.getBoundingClientRect().width)o.push(a+'="'+v.slice(0,40)+'"')}});return o});
const thText=()=>p.evaluate(()=>{const o=[];document.querySelectorAll('main *').forEach(e=>{if([...e.childNodes].some(n=>n.nodeType===3&&/[฀-๿]/.test(n.textContent))&&e.getBoundingClientRect().width)o.push(e.textContent.trim().slice(0,30))});return o});
for (const [n,u,act] of [['dash','/app/cycles/cycle-demo-2569',null],['evform','/app/evidence','ev-new'],['assign','/app/cycles/cycle-demo-2569/assign',null]]) {
 await p.goto(BASE+u);await p.waitForLoadState('networkidle');await p.waitForTimeout(1000);
 await p.locator('.aq-lang, button:has-text("EN")').first().click();await p.waitForTimeout(800);
 if(act){await p.getByTestId(act).click();await p.waitForTimeout(500);}
 const a=await thAttr(),t=await thText();
 console.log(n,'TH-attr',a.length,JSON.stringify(a.slice(0,8)));console.log(n,'TH-text',t.length,JSON.stringify(t.slice(0,10)));
 await p.screenshot({path:`../../screenshots/u3/en-${n}-d.png`,fullPage:true});
}
await b.close();
