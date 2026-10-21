import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session({fresh:true});
const D='cycle-demo-2569';
const ok=async(note)=>{const d=p.getByRole('dialog');if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:'ยืนยัน'}).click();await p.waitForTimeout(500);};
// chair1 approves 8 sections
await as('chair1');
let T=Date.now(),clicks=0;
for(const r of ['1.5','6.6','8.1','8.2','8.3']){await p.goto(B+`/app/sections/${encodeURIComponent(D+'::'+r)}`);await p.waitForTimeout(500);await p.getByTestId('section-approve').click().catch(e=>console.log(r,'no approve btn'));clicks+=2;await p.waitForTimeout(400);}
console.log('chair approve 5 sections: clicks',clicks,'ms',Date.now()-T);
// 3.6 5.1 7.9 are assigned? check status
for(const r of ['3.6','5.1','7.9']){await p.goto(B+`/app/sections/${encodeURIComponent(D+'::'+r)}`);await p.waitForTimeout(500);console.log(r,(await txt(p,3000)).match(/สถานะ: [^\n]*/)?.[0],'| actions:',await p.getByTestId('section-actions').innerText().catch(()=>'-'));}
await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
console.log('NEXT STEP:',(await p.locator('text=ขั้นตอนถัดไป').first().locator('..').innerText()).replace(/\n/g,'|'));
await p.screenshot({path:'shots/chair-dash-2.png'});
console.log('btn',await p.getByTestId('cycle-actions').innerText().catch(()=>'no cycle-actions'));
await done();
