import {session,txt,B} from './lib.mjs';
const {p,as,done}=await session({fresh:true});
p.setDefaultTimeout(6000);
p.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,200)));
await as('staff1');await p.goto(B+'/app/evidence');await p.waitForTimeout(600);
for(let i=0;i<4;i++){
 if(!(await p.getByTestId('ev-new').count())){console.log('ev-new missing at',i,(await txt(p,500)).replace(/\n/g,'|'));await p.screenshot({path:'shots/quota-crash.png'});break;}
 await p.getByTestId('ev-new').click();await p.getByTestId('ev-title').fill('big'+i);await p.getByTestId('ev-file').setInputFiles('ev-big.pdf');
 await p.getByTestId('ev-submit').click();await p.waitForTimeout(1500);
 console.log('upload',i,await p.locator('[role=status]').allInnerTexts().then(a=>JSON.stringify(a)),'ls',await p.evaluate(()=>Object.entries(localStorage).reduce((s,[k,v])=>s+v.length,0)));
}
await p.reload();await p.waitForTimeout(1200);console.log('after reload',(await txt(p,400)).replace(/\n/g,'|'));
await p.screenshot({path:'shots/quota-after-reload.png'});
await done().catch(e=>console.log('done err',e.message.slice(0,100)));
