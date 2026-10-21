import {start,login,txt,B} from './lib.mjs';
const br=await start();
let {p}=await login(br,'staff1');
await p.goto(B+'/app/evidence');await p.getByTestId('ev-new').click();
await p.getByTestId('ev-title').fill('bigpdf');await p.getByTestId('ev-file').setInputFiles('ev-big.pdf');
const o=(await p.getByTestId('ev-f-reqs').locator('option').allTextContents()).find(t=>t.startsWith('1.2 '));await p.getByTestId('ev-f-reqs').selectOption({label:o});
await p.getByTestId('ev-submit').click();await p.waitForTimeout(2000);
await p.screenshot({path:'shots/ev-bigpdf.png'});
const toast=await p.locator('[role=status],[role=alert],.toast').allInnerTexts();console.log('toast',toast);
// section page for 1.5 as staff1 (submitted) and a draft requirement via chair1 assignment later
await p.goto(B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::1.5'));await p.waitForTimeout(1200);
console.log(await txt(p,5000));
await p.screenshot({path:'shots/section-1.5-staff.png',fullPage:true});
await br.close();
