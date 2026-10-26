import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-s10.json'});
await as('chair1');
await p.goto(B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::1.5'));await p.waitForTimeout(1500);
log('status',await p.getByTestId('section-status').innerText());
const before=await p.getByTestId('linked-evidence').locator('li').count().catch(()=>-1);
const x=p.locator('#sidepanel-evidence button[aria-label]').first();log('x label',await x.getAttribute('aria-label'),'disabled',await x.isDisabled());
await x.click();await p.waitForTimeout(800);
const d=p.getByRole('dialog');if(await d.count()){log('dlg',(await d.innerText()).replace(/\s+/g,' '));await d.getByRole('button',{name:/^ยืนยัน|นำออก|ลบ/}).click().catch(()=>{});await p.waitForTimeout(800);}
log('toast:',(await txt(p,9000)).split('\n').filter(l=>/นำออก|ยกเลิกการผูก|ไม่ได้|แก้ไขไม่ได้|สิทธิ์/.test(l)).slice(-3));
const after=await p.getByTestId('linked-evidence').locator('li').count().catch(()=>-1);
log('linked before',before,'after',after);
// approved section 1.1 as lect? staff1 owns 1.1 approved
await as('staff1');await p.goto(B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::1.1'));await p.waitForTimeout(1500);
log('staff1 1.1 status',await p.getByTestId('section-status').innerText(),'x buttons',await p.locator('#sidepanel-evidence button[aria-label^="เลิก"],#sidepanel-evidence button[aria-label*="ผูก"]').count(), await p.locator('#sidepanel-evidence button[aria-label]').count());
log('errs',errs);await br.close();
