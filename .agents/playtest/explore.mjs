import { chromium } from '../../eduflow-next/node_modules/@playwright/test/index.mjs';
const B='http://localhost:3961';
const users=['chair1','staff1','lect1','data1','fqa1','dean1','assess1','uadmin'];
const br=await chromium.launch();
for(const u of users){
  const ctx=await br.newContext({viewport:{width:1366,height:800},locale:'th-TH'});const p=await ctx.newPage();
  const t0=Date.now();
  await p.goto(B+'/login');
  await p.getByTestId('login-username').fill(u);await p.getByTestId('login-password').fill('demo1234');
  await p.getByTestId('login-submit').click();await p.waitForURL('**/app');
  await p.waitForTimeout(1200);
  console.log('=====',u,Date.now()-t0,'ms');
  const nav=await p.locator('a').allInnerTexts();console.log('NAV',nav.join(' | '));
  console.log((await p.locator('body').innerText()).slice(0,1500));
  await p.screenshot({path:`shots/home-${u}.png`});
  await ctx.close();
}
await br.close();
