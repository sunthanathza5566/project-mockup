import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const B='http://localhost:3951';
await p.goto(B+'/login'); await p.getByTestId('login-username').fill('chair1'); await p.getByTestId('login-password').fill('demo1234'); await p.getByTestId('login-submit').click(); await p.waitForURL('**/app'); await p.waitForTimeout(1500);
await p.getByTestId('nav-menu').click(); 
for (const t of [0,50,300]) { await p.waitForTimeout(t); console.log(t, await p.evaluate(()=>{const a=document.activeElement; return a.tagName+' '+(a.dataset.testid||'')+' inSidebar='+!!a.closest('#app-sidebar')+' vis='+getComputedStyle(document.getElementById('app-sidebar')).visibility})); }
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
console.log('after esc open=', await p.locator('#app-sidebar').getAttribute('data-open'));
await b.close();
