import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-inv1.json'});
await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1000);
const srow=p.getByTestId('user-sadmin');
const x=srow.locator('button').filter({hasNotText:/เพิ่ม/}).first();
log('sadmin x aria:',await x.getAttribute('aria-label'), await x.innerText());
await x.click();await p.waitForTimeout(600);
const d=p.locator('[role=alertdialog],[role=dialog]');log('dialog?',await d.count()? await d.last().innerText():'none');
if(await d.count()){await d.last().getByRole('button').last().click();await p.waitForTimeout(800);}
log('after remove sadmin role toast:',(await txt(p,8000)).split('\n').filter(l=>/สิทธิ์|ไม่|ลบ|นำออก|super|สูงสุด/.test(l)).slice(-5));
log('sadmin row:',(await srow.innerText()).replace(/\s*\n\s*/g,' | ').slice(0,160));
// add super? options exclude super_admin
// try adding assessor to sadmin
await srow.locator('select').first().selectOption('assessor');await srow.getByRole('button',{name:/เพิ่ม/}).click();await p.waitForTimeout(800);
log('add role to sadmin:',(await txt(p,8000)).split('\n').filter(l=>/สิทธิ์|ไม่|เพิ่มบทบาทแล้ว|ขอบเขต/.test(l)).slice(-4));
// remove only role of chair1
const crow=p.getByTestId('user-chair1');
await crow.locator('button[aria-label]').first().click();await p.waitForTimeout(600);
if(await d.count()){log('chair dlg',await d.last().innerText());await d.last().getByRole('button').last().click();await p.waitForTimeout(800);}
log('chair row after:',(await crow.innerText()).replace(/\s*\n\s*/g,' | ').slice(0,200));
await shot('27-roles-edit',false);
// add mismatched: dean at programme scope to lect2
const lrow=p.getByTestId('user-lect2');
await lrow.locator('select').nth(0).selectOption('dean');await lrow.locator('select').nth(1).selectOption('programme:prog-demo-ds');await lrow.getByRole('button',{name:/เพิ่ม/}).click();await p.waitForTimeout(800);
log('lect2 row after dean@programme:',(await lrow.innerText()).replace(/\s*\n\s*/g,' | ').slice(0,200));
log('errs',errs);await br.close();
