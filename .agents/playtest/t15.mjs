import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session({fresh:true});
const D='cycle-demo-2569';
const S=r=>B+`/app/sections/${encodeURIComponent(D+'::'+r)}`;
const dlg=async(note)=>{const d=p.getByRole('dialog');if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:'ยืนยัน'}).click();await p.waitForTimeout(500);};
await as('chair1');
for(const r of ['1.5','6.6','8.1','8.2','8.3']){await p.goto(S(r));await p.waitForTimeout(400);await p.getByTestId('section-approve').click();await p.waitForTimeout(300);}
await p.goto(B+`/app/cycles/${D}/assign`);
for(const r of ['3.6','5.1','7.9']){await p.getByTestId('owner-'+r).selectOption({label:'อ.วิภา เขียนรายงาน'});await p.waitForTimeout(300);}
await as('staff1');
for(const r of ['3.6','5.1','7.9']){await p.goto(S(r));await p.waitForTimeout(500);await p.getByTestId('section-submit').click();await dlg();}
await as('chair1');
for(const r of ['3.6','5.1','7.9']){await p.goto(S(r));await p.waitForTimeout(500);await p.getByTestId('section-approve').click();await p.waitForTimeout(400);}
await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
let T=Date.now();
await p.getByTestId('cycle-to-under_review').click();
console.log('dialog text:',(await p.getByRole('dialog').innerText()).replace(/\n/g,'|'));
await dlg();
console.log('after to under_review:',(await txt(p,1800)).split('\n').slice(15,30).join('|'));
await p.screenshot({path:'shots/chair-underreview.png'});
// FQA
await as('fqa1');
console.log('FQA HOME',(await txt(p,2500)).split('\n').slice(18,40).join('|'));
await p.screenshot({path:'shots/fqa-home.png'});
await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
console.log('FQA dash',(await txt(p,1500)).split('\n').slice(15,32).join('|'));
await p.screenshot({path:'shots/fqa-dash.png'});
console.log('buttons',await p.getByTestId('cycle-actions').innerText().catch(()=>'-'));
await p.getByTestId('cycle-to-faculty_approved').click();
console.log('FQA dlg',(await p.getByRole('dialog').innerText()).replace(/\n/g,'|'));
await dlg();
console.log('FQA after',(await txt(p,1500)).split('\n').slice(15,25).join('|'));
// DEAN
await as('dean1');
await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
console.log('DEAN buttons',await p.getByTestId('cycle-actions').innerText().catch(()=>'-'));
await p.screenshot({path:'shots/dean-dash.png'});
await p.getByTestId('cycle-to-final_approved').click();
console.log('DEAN dlg',(await p.getByRole('dialog').innerText()).replace(/\n/g,'|'));
await dlg();
console.log('DEAN after',(await txt(p,2500)).split('\n').slice(15,28).join('|'));
await p.screenshot({path:'shots/dean-locked.png'});
await done();
