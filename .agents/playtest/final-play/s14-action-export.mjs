import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-c3.json'});
const panel=async()=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const t=(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ');await p.keyboard.press('Escape');return t.slice(0,300);};
const openNoti=async(re)=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const it=p.locator('[data-testid^="noti-item-"]').filter({hasText:re}).first();if(!await it.count()){log('  !! no noti matching',re);await p.keyboard.press('Escape');return false;}const lab=(await it.innerText()).replace(/\s+/g,' ');await it.click();await p.waitForTimeout(1500);log('  noti "'+lab.slice(0,140)+'" -> '+p.url().replace(B,''));return true;};
await as('chair1');
await p.getByRole('link',{name:'แผนปรับปรุง'}).first().click();await p.waitForTimeout(1500);
log('actions page:',(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,500));
await shot('50-actions',true);
await p.getByTestId('act-new').click();await p.waitForTimeout(500);
log('form:',(await p.getByTestId('action-form').innerText()).replace(/\s+/g,' '));
// empty save
await p.getByTestId('act-save').click();await p.waitForTimeout(500);
log('empty save msgs:',(await p.getByTestId('action-form').innerText()).split('\n').filter(l=>/กรุณา|ต้อง/.test(l)), 'toast',(await txt(p,9000)).split('\n').filter(l=>/กรุณา|ต้อง/.test(l)).slice(-2));
await p.getByTestId('act-req').selectOption({index:3});
log('owner opts',await p.getByTestId('act-owner').locator('option').allInnerTexts());
await p.getByTestId('act-owner').selectOption({label:'อ.ธนา สอนดี'});
await p.getByTestId('act-desc').fill('จัดอบรม active learning ให้อาจารย์ทุกคน 😀');
await p.getByTestId('act-due').fill('2020-01-01');
await p.getByTestId('act-kpi').fill('-5%');
await p.getByTestId('act-save').dblclick();await p.waitForTimeout(1000);
log('after save:',(await txt(p,12000)).split('\n').filter(l=>/บันทึก|เพิ่ม|ไม่|ผ่านมาแล้ว|อดีต/.test(l)).slice(-4));
log('rows with active learning:',await p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).count());
await shot('51-actions-after-save',true);
await as('lect1');log('lect1 panel',await panel());await openNoti(/แผนปรับปรุง|action/i);
log('  focus/highlight:',await p.evaluate(()=>{const e=document.querySelector('[aria-current],[data-highlight],.ring-2');return e?e.outerHTML.slice(0,160):'none'}));
await shot('52-lect-action-deeplink');
const row=p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).first();
await row.getByTestId('action-to-in_progress').click();await p.waitForTimeout(700);
await row.getByTestId('action-to-done').click();await p.waitForTimeout(700);
const d=p.getByRole('dialog');if(await d.count()){log('done dialog',(await d.innerText()).replace(/\s+/g,' '));await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(700);}
await as('chair1');await p.goto(B+'/app/actions');await p.waitForTimeout(1200);
const r2=p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).first();
log('chair sees buttons:',await r2.locator('[data-testid^="action-to-"]').allInnerTexts());
const v=r2.getByTestId('action-to-verified');if(await v.count()){await v.click();await p.waitForTimeout(700);if(await d.count()){log('verify dlg',(await d.innerText()).replace(/\s+/g,' '));await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(700);}}
await as('lect1');log('lect1 panel2',await panel());
// export
await as('chair1');await p.getByRole('link',{name:'ส่งออกเอกสาร'}).first().click();await p.waitForTimeout(1500);
log('export page:',(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,700));
await shot('53-export',true);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(e=>null),p.getByTestId('export-sar-docx').click().catch(e=>log('no export-sar-docx',e.message))]);
log('download:',dl?dl.suggestedFilename():'none');
await save('st-c4.json');
log('errs',errs);await br.close();
