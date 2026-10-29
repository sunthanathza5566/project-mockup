import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-c2.json'});
const panel=async()=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const t=(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ');await p.keyboard.press('Escape');return t.slice(0,500);};
const openNoti=async(re)=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const it=p.locator('[data-testid^="noti-item-"]').filter({hasText:re}).first();if(!await it.count()){log('  !! no noti matching',re);await p.keyboard.press('Escape');return false;}const lab=(await it.innerText()).replace(/\s+/g,' ');await it.click();await p.waitForTimeout(1400);log('  noti "'+lab.slice(0,160)+'" -> '+p.url().replace(B,''));return true;};
const dlgOk=async(note)=>{const d=p.getByRole('dialog');await d.waitFor();log('  dialog:',(await d.innerText()).replace(/\s+/g,' ').slice(0,260));if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(900);};
const cycleBtns=async()=>(await p.locator('[data-testid^="cycle-to-"]').evaluateAll(es=>es.map(e=>e.dataset.testid+':'+e.innerText.trim()))).join(' | ');
await as('fqa1');log('fqa1 panel:',await panel());
await openNoti(/ล็อก|เริ่มการประเมิน/);log('  buttons:',await cycleBtns());
log('  assessor UI present:',await p.getByTestId('assessor-select').count(), 'go-assess',await p.getByTestId('go-assess').count());
await p.getByTestId('cycle-to-under_assessment').click();await dlgOk();
await as('assess1');log('assess1 home:',(await txt(p,3000)).split('สิ่งที่ต้องทำตอนนี้')[1]?.slice(0,250).replace(/\s+/g,' '));log('assess1 panel:',await panel());
await openNoti(/ประเมิน/);
await shot('43-assess-page',false);
// try finish before scoring
log('  finish enabled before scoring:',await p.getByTestId('assess-finish').isEnabled().catch(()=>'-'));
for(let c=1;c<=8;c++){await p.getByTestId('assess-crit-'+c).click();await p.getByTestId('crit-score').selectOption(String(3+(c%3)));await p.getByTestId('crit-why').fill('เหตุผลเกณฑ์ '+c);await p.getByTestId('crit-save').click();await p.waitForTimeout(400);}
log('  rated',await p.getByTestId('rated-count').innerText());
await p.getByTestId('verdict-score').selectOption('4');await p.getByTestId('verdict-why').fill('ภาพรวมผ่านเกณฑ์');await p.getByTestId('verdict-save').click();await p.waitForTimeout(500);
await p.getByTestId('assess-finish').click();await dlgOk();
log('  after finish:',(await p.getByTestId('assess-notopen').innerText().catch(()=>'-')).replace(/\s+/g,' '));
for(const u of ['chair1','fqa1','staff1']){await as(u);log(u+' panel:',await panel());}
await as('chair1');await openNoti(/ส่งผลการประเมิน|ผลประเมิน/);
await shot('44-chair-assess-results',false);
log('  page h1',await p.locator('main h1').first().innerText());
await as('fqa1');await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1200);log('fqa buttons after assessed',await cycleBtns());
await save('st-c3.json');
log('errs',errs);await br.close();
