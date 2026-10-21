import {session,txt,B} from './lib.mjs';
import fs from 'fs';
const cid=fs.readFileSync('cid.txt','utf8');
const {p,as,done}=await session();
await as('lect1');
const url=B+`/app/sections/${encodeURIComponent(cid+'::3.1')}`;
await p.goto(url);await p.waitForTimeout(800);
const T0=Date.now();let clicks=0;
// try submit empty
await p.getByTestId('section-submit').click();clicks++;await p.waitForTimeout(500);
console.log('SUBMIT EMPTY dialog:',await p.getByRole('dialog').innerText().catch(()=>'no dialog'));
await p.screenshot({path:'shots/submit-empty.png'});
const dlg=await p.getByRole('dialog').count();
if(dlg){ console.log('btns',await p.getByRole('dialog').getByRole('button').allInnerTexts()); await p.getByRole('dialog').getByRole('button',{name:/ยกเลิก/}).click().catch(()=>{});}
await p.waitForTimeout(500);
// type with weird chars
const ta=p.getByTestId('narrative-th');
await ta.fill('หลักสูตรมีปรัชญา Outcome-based 😀 ตัวเลข -5 <b>html</b> & "quote" [E-9.9-99]');
await p.waitForTimeout(2500);
console.log('invalid cite ->',await p.getByTestId('save-status').innerText(),'|',await p.getByTestId('citation-warn').innerText().catch(()=>'no warn'));
await p.screenshot({path:'shots/invalid-cite.png'});
// fix; link evidence and insert
await ta.fill('');await p.waitForTimeout(300);
const sel=p.getByTestId('link-select');
const opts=await sel.locator('option').allTextContents();console.log('link opts',opts.length,'(cycle has none for 2570?)',opts.slice(0,3));
// AI draft
await p.getByTestId('ai-draft').click();clicks++;
const t1=Date.now();
await p.getByTestId('ai-result').waitFor({timeout:20000}).catch(()=>{});
console.log('AI draft ms',Date.now()-t1);
await p.screenshot({path:'shots/ai-draft.png',fullPage:true});
console.log('AI:',(await p.getByTestId('ai-panel').innerText()).replace(/\n/g,'|').slice(0,1500));
await done();
