import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-s10.json'});
const sec=r=>B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::'+r);
const panel=async()=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const t=(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ');await p.keyboard.press('Escape');return t.slice(0,600);};
const openNoti=async(re)=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const it=p.locator('[data-testid^="noti-item-"]').filter({hasText:re}).first();if(!await it.count()){log('  !! no noti matching',re);await p.keyboard.press('Escape');return false;}const lab=(await it.innerText()).replace(/\s+/g,' ');await it.click();await p.waitForTimeout(1400);log('  noti "'+lab.slice(0,140)+'" -> '+p.url().replace(B,''));return true;};
const dlgOk=async(note)=>{const d=p.getByRole('dialog');await d.waitFor();log('  dialog:',(await d.innerText()).replace(/\s+/g,' ').slice(0,260));if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(900);};
const cycleBtns=async()=>(await p.locator('[data-testid^="cycle-to-"]').evaluateAll(es=>es.map(e=>e.dataset.testid+':'+e.innerText.trim()))).join(' | ');
await as('chair1');
await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(1200);
for(const r of ['5.1','7.9']){await p.getByTestId('owner-'+r).selectOption({label:'อ.วิภา เขียนรายงาน'});await p.waitForTimeout(500);}
await as('staff1');
for(const r of ['5.1','7.9']){await p.goto(sec(r));await p.waitForTimeout(1200);await p.getByTestId('section-submit').click();const d=p.getByRole('dialog');await d.waitFor();await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(700);}
await as('chair1');
for(const r of ['1.5','6.6','8.1','8.2','8.3','5.1','7.9']){await p.goto(sec(r));await p.waitForTimeout(1100);await p.getByTestId('section-approve').click();await p.waitForTimeout(600);}
await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1500);
log('chair cycle buttons:',await cycleBtns());
await shot('40-chair-cycle',true);
await p.getByTestId('cycle-to-under_review').click();await dlgOk();
log('chair panel after send:',await panel());
await save('st-c1.json');
// fqa1
await as('fqa1');log('fqa1 home todo:',(await txt(p,3000)).split('สิ่งที่ต้องทำตอนนี้')[1]?.slice(0,250).replace(/\s+/g,' '));
await openNoti(/2569/);log('  buttons:',await cycleBtns());
await shot('41-fqa-cycle',true);
await p.getByTestId('cycle-to-revision_requested').click();await dlgOk('ข้อ 3.6 ขอเพิ่มข้อมูล');
await as('staff1');log('staff1 panel:',await panel());await openNoti(/ส่งกลับ|แก้/);
await as('chair1');log('chair1 panel:',await panel());await openNoti(/ส่งกลับ|แก้/);log('  buttons:',await cycleBtns());
await p.getByTestId('cycle-to-under_review').click();await dlgOk();
await as('fqa1');await openNoti(/2569/);await p.getByTestId('cycle-to-faculty_approved').click();await dlgOk();
await as('dean1');log('dean home todo:',(await txt(p,3000)).split('สิ่งที่ต้องทำตอนนี้')[1]?.slice(0,200).replace(/\s+/g,' '));log('dean panel:',await panel());await openNoti(/2569/);log('  buttons:',await cycleBtns());
await shot('42-dean-cycle',true);
await p.getByTestId('cycle-to-final_approved').click();await dlgOk();
log('  lock banner:',await p.getByTestId('lock-banner').innerText().catch(()=>'-'));
await save('st-c2.json');
await as('fqa1');log('fqa1 panel:',await panel());await openNoti(/อนุมัติขั้นสุดท้าย|ล็อก|เริ่มการประเมิน/);log('  buttons:',await cycleBtns());
await p.getByTestId('cycle-to-under_assessment').click();await dlgOk();
await as('assess1');log('assess1 home:',(await txt(p,3000)).split('สิ่งที่ต้องทำตอนนี้')[1]?.slice(0,250).replace(/\s+/g,' '));log('assess1 panel:',await panel());await openNoti(/ประเมิน/);
await shot('43-assess-page',true);
for(let c=1;c<=8;c++){await p.getByTestId('assess-crit-'+c).click();await p.getByTestId('crit-score').selectOption(String(3+(c%3)));await p.getByTestId('crit-why').fill('เหตุผลเกณฑ์ '+c+' — มีหลักฐานเพียงพอ');await p.getByTestId('crit-save').click();await p.waitForTimeout(400);}
log('  rated',await p.getByTestId('rated-count').innerText());
await p.getByTestId('verdict-score').selectOption('4');await p.getByTestId('verdict-why').fill('ภาพรวมผ่านเกณฑ์');await p.getByTestId('verdict-save').click();await p.waitForTimeout(500);
await p.getByTestId('assess-finish').click();await dlgOk();
log('  after finish:',await p.getByTestId('assess-notopen').innerText().catch(()=>'-'));
await as('chair1');log('chair panel final:',await panel());await openNoti(/ผลประเมิน|ส่งผล/);
await shot('44-chair-assess-results',true);
await save('st-c3.json');
log('errs',errs);await br.close();
