import {session,txt,B} from './lib.mjs';
import fs from 'fs';
const cid=fs.readFileSync('cid.txt','utf8');
const {p,as,done}=await session();
await as('lect1');
const url=B+`/app/sections/${encodeURIComponent(cid+'::3.1')}`;
await p.goto(url);await p.waitForTimeout(800);
let clicks=0;const T0=Date.now();
const sel=p.getByTestId('link-select');
const opts=await sel.locator('option').allTextContents();
await sel.selectOption({label:opts.find(o=>o.startsWith('E-3.3-01'))});await p.getByTestId('link-btn').click();clicks+=2;
await p.waitForTimeout(500);
await sel.selectOption({label:opts.find(o=>o.startsWith('E-3.3-02'))});await p.getByTestId('link-btn').click();clicks+=2;
await p.waitForTimeout(500);
await p.getByTestId('ai-draft').click();clicks++;await p.waitForTimeout(800);
await p.screenshot({path:'shots/ai-draft2.png'});
const res=await p.getByTestId('ai-panel').innerText();console.log('AI2:',res.replace(/\n/g,'|').slice(150,1800));
await p.getByTestId('ai-accept').click().catch(e=>console.log('no ai-accept'));clicks++;await p.waitForTimeout(800);
console.log('narrative now:',(await p.getByTestId('narrative-th').inputValue()).slice(0,500));
console.log('ai-draft text cites');
// insert citation click
await p.getByTestId('insert-E-3.3-01').click().catch(()=>console.log('no insert'));clicks++;
// pdca
for(const l of['P','D']) await p.getByTestId('pdca-'+l).check();clicks+=2;
// score without reason
await p.getByTestId('self-score').selectOption('4');clicks++;
await p.getByTestId('self-save').click();clicks++;await p.waitForTimeout(500);
console.log('score no-reason:',await p.locator('[role=status],[role=alert]').allInnerTexts());
await p.screenshot({path:'shots/score-noreason.png'});
await p.getByTestId('self-why').fill('มีแผนและดำเนินการจริง');await p.getByTestId('self-save').click();clicks+=2;await p.waitForTimeout(500);
await p.getByTestId('save-manual').click();clicks++;await p.waitForTimeout(500);
await p.getByTestId('section-submit').click();clicks++;
await p.getByRole('dialog').getByRole('button',{name:'ยืนยัน'}).click();clicks++;await p.waitForTimeout(800);
console.log('after submit:',(await p.getByTestId('readonly-reason').innerText().catch(()=>'-')),'clicks',clicks,'ms',Date.now()-T0);
await p.screenshot({path:'shots/after-submit.png'});
// back button
await p.goBack();await p.waitForTimeout(500);console.log('back ->',p.url());
await p.goForward();await p.reload();await p.waitForTimeout(800);
console.log('after reload status:',(await txt(p,3000)).match(/สถานะ: [^\n]*/)?.[0]);
await done();
