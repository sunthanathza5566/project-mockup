import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session();
const D='cycle-demo-2569';
for(const u of ['chair1','fqa1','uadmin','dean1']){
 await as(u);await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
 console.log(u,'actions:',(await p.getByTestId('cycle-actions').innerText().catch(()=>'none')).replace(/\n/g,'|'),'| go-assess?',await p.getByTestId('go-assess').count());
}
await as('uadmin');await p.goto(B+`/app/cycles/${D}`);await p.waitForTimeout(800);
await p.screenshot({path:'shots/uadmin-cycle.png'});
console.log((await txt(p,3000)).split('\n').slice(14,45).join('|'));
await p.goto(B+`/app/cycles/${D}/assess`);await p.waitForTimeout(800);
console.log('uadmin assess page',(await txt(p,3000)).split('\n').slice(14,50).join('|'));
await p.screenshot({path:'shots/uadmin-assess.png',fullPage:true});
await done();
