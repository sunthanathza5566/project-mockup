// ยืนยัน finding: textarea TH/EN แสดงพร้อมกัน + sticky bar มือถือ
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE='http://localhost:3951';const b=await chromium.launch();
for (const [w,h,t] of [[1440,900,'d'],[390,844,'m']]) {
const p=await (await b.newContext({viewport:{width:w,height:h},locale:'th-TH'})).newPage();
await p.goto(BASE+'/login');await p.getByTestId('login-username').fill('chair1');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(1200);
await p.goto(BASE+'/app/sections/'+encodeURIComponent('cycle-demo-2569::3.6'));await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
const vis=()=>p.evaluate(()=>[...document.querySelectorAll('textarea.aq-textarea--prose')].map(t=>({hiddenAttr:t.hidden,display:getComputedStyle(t).display,h:Math.round(t.getBoundingClientRect().height)})));
console.log(t,'TH tab',JSON.stringify(await vis()));
await p.getByTestId('tab-en').click();await p.waitForTimeout(300);console.log(t,'EN tab',JSON.stringify(await vis()));
await p.getByTestId('tab-th').click();
await p.evaluate(()=>window.scrollTo(0,400));await p.waitForTimeout(300);
await p.screenshot({path:`../../screenshots/u3/09c-section-sticky-${t}.png`});
}
await b.close();
