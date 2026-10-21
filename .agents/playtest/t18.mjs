import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session();p.setDefaultTimeout(4000);
const D='cycle-demo-2569';
await as('fqa1');await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(600);
await p.getByTestId('cycle-to-under_assessment').click();await p.getByRole('dialog').getByRole('button',{name:'ยืนยัน'}).click();await p.waitForTimeout(600);
await as('assess1');
console.log('ASSESS home noti',(await txt(p,2500)).split('\n').filter(l=>/แจ้งเตือน|ประเมิน/.test(l)).join('|'));
await p.goto(B+`/app/cycles/${D}/assess`);await p.waitForTimeout(1000);
await p.screenshot({path:'shots/assess-open.png'});
let clicks=0;const T0=Date.now();
for(let n=1;n<=8;n++){
  const panel=p.getByTestId('assess-crit-'+n);
  const hasScore=await p.getByTestId('crit-score').count();
  if(n===1){console.log('crit-score count',hasScore,'rating-panel?',await p.getByTestId('rating-panel').count(), await p.getByTestId('assess-panel-1').count());}
  const pn=p.getByTestId('assess-panel-'+n);
  await pn.getByTestId('crit-score').selectOption('4').catch(e=>{if(n===1)console.log('crit-score fail',e.message.slice(0,100))});clicks++;
  await pn.getByTestId('crit-why').fill('เหตุผลทดสอบ '+n).catch(()=>{});clicks++;
  await pn.getByTestId('crit-save').click().catch(()=>{});clicks++;await p.waitForTimeout(250);
}
console.log('8 criteria clicks',clicks,'ms',Date.now()-T0);
console.log((await txt(p,3000)).split('\n').filter(l=>/ให้คะแนนรายเกณฑ์|verdict|✓|○/.test(l)).join('|'));
await p.getByTestId('verdict-score').selectOption('4').catch(e=>console.log('verdict fail',e.message.slice(0,100)));
await p.getByTestId('verdict-why').fill('สรุป');await p.getByTestId('verdict-save').click();await p.waitForTimeout(500);
await p.screenshot({path:'shots/assess-filled.png',fullPage:true});
console.log('after verdict',(await txt(p,4000)).split('\n').filter(l=>/ให้คะแนนรายเกณฑ์|verdict|ส่งผล|✓ |○ /.test(l)).join('|'),await p.locator('button').allInnerTexts().then(a=>a.filter(x=>/ส่ง|ยืนยัน/.test(x))));
await done();
