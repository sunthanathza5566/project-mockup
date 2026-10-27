// Smoke full workflow on :3960 + U1 (return reason on cycle page) + P3 (fqa assign assessor after lock) + P6/P11 (noti text) + P8
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const {panel,openNoti,dlgOk,cycleBtns,sec}=helpers(p);
const step=async(name,fn)=>{try{await fn();}catch(e){log('  !! STEP FAIL',name,e.message.split('\n')[0].slice(0,200));await shot('r04-fail-'+name.replace(/\W+/g,'_'),true).catch(()=>{});}};
log('=== r04 cycle smoke');
await step('0 uadmin creates ass2',async()=>{
  await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1200);
  await p.getByTestId('user-new').click();await p.waitForTimeout(300);
  await p.getByTestId('nu-username').fill('ass2');await p.getByTestId('nu-name').fill('ศ.กรรมการ ใหม่ (Assessor)');await p.getByTestId('nu-email').fill('ass2@sample-uni.example');
  await p.getByTestId('nu-role').selectOption('assessor');await p.waitForTimeout(200);
  log('  nu-scope for assessor:',await p.getByTestId('nu-scope').locator('option').allInnerTexts());
  await p.getByTestId('nu-mode-password').check();await p.getByTestId('nu-password').fill('abcdefgh');
  await p.getByTestId('nu-submit').click();await p.waitForTimeout(1000);
  log('  ass2 row:',(await p.getByTestId('user-ass2').innerText().catch(()=>'-')).replace(/\s+/g,' '));
});
await step('1 chair assigns',async()=>{
  await as('chair1');await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(1300);
  await p.getByTestId('owner-3.6').selectOption({label:'อ.ธนา สอนดี'});await p.waitForTimeout(500);
  for(const r of ['5.1','7.9']){await p.getByTestId('owner-'+r).selectOption({label:'อ.วิภา เขียนรายงาน'});await p.waitForTimeout(500);}
});
await step('2 lect1 writes',async()=>{
  await as('lect1');log('  lect1 panel:',await panel());
  await openNoti(/3\.6/);
  await p.getByTestId('narrative-th').fill('หลักสูตรมีระบบติดตามผู้เรียน (Student tracking) ต่อเนื่อง 😀 ตัวเลข -5 <b>x</b>');await p.waitForTimeout(2300);
  log('  save-status:',await p.getByTestId('save-status').innerText().catch(()=>'?'));
  const ls=p.getByTestId('link-select');await ls.selectOption({index:1});await p.getByTestId('link-btn').click();await p.waitForTimeout(700);
  log('  linked count:',await p.getByTestId('linked-evidence').locator('li').count());
  await p.getByTestId('section-submit').click();await dlgOk();
  log('  status:',await p.getByTestId('section-status').innerText(),'x after submit:',await p.locator('#sidepanel-evidence button[aria-label^="เลิกผูก"]').count(),'lock:',await p.getByTestId('evidence-locked-reason').count());
});
await step('3 chair returns',async()=>{
  await as('chair1');await openNoti(/3\.6/);
  log('  readonly for reviewer:',(await p.getByTestId('readonly-reason').innerText().catch(()=>'-')).replace(/\s+/g,' '));
  await p.getByTestId('sidetab-comments').click();await p.getByTestId('comment-body').fill('ช่วยเพิ่มตัวเลขอัตราคงอยู่ปี 2568');await p.getByTestId('comment-add').click();await p.waitForTimeout(700);
  await p.getByTestId('section-return').click();await dlgOk('ขาดตัวเลขอัตราคงอยู่');
});
await step('4 lect1 revises',async()=>{
  await as('lect1');log('  lect1 panel:',await panel());
  await openNoti(/ความเห็น/);log('  comments tab selected:',await p.getByTestId('sidetab-comments').getAttribute('aria-selected'));
  await p.getByTestId('sidetab-evidence').click();await p.waitForTimeout(300);
  log('  after return: x=',await p.locator('#sidepanel-evidence button[aria-label^="เลิกผูก"]').count(),'link-select',await p.getByTestId('link-select').count());
  await p.getByTestId('narrative-th').fill('หลักสูตรมีระบบติดตามผู้เรียน อัตราคงอยู่ปี 2568 = 92%');await p.waitForTimeout(2300);
  await p.getByTestId('section-submit').click();await dlgOk();
});
await step('5 chair approves 3.6',async()=>{await as('chair1');await p.goto(sec('3.6'));await p.waitForTimeout(1200);await p.getByTestId('section-approve').click();await p.waitForTimeout(800);log('  3.6:',await p.getByTestId('section-status').innerText());});
await step('6 staff1 submits',async()=>{
  await as('staff1');log('  staff1 panel:',await panel());
  for(const r of ['5.1','7.9']){await p.goto(sec(r));await p.waitForTimeout(1200);await p.getByTestId('section-submit').click();const d=p.getByRole('dialog');await d.waitFor();log('  submit dlg '+r+':',(await d.innerText()).replace(/\s+/g,' ').slice(0,220));await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(700);}
});
await step('7 chair approves & sends',async()=>{
  await as('chair1');
  for(const r of ['1.5','6.6','8.1','8.2','8.3','5.1','7.9']){await p.goto(sec(r));await p.waitForTimeout(1100);if(await p.getByTestId('section-approve').count()){await p.getByTestId('section-approve').click();await p.waitForTimeout(600);}else log('  no approve on',r,await p.getByTestId('section-status').innerText());}
  await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1500);log('  buttons:',await cycleBtns());
  await p.getByTestId('cycle-to-under_review').click();await dlgOk();
});
await step('8 fqa returns',async()=>{await as('fqa1');await openNoti(/2569/);await p.getByTestId('cycle-to-revision_requested').click();await dlgOk('ข้อ 3.6 ขอเพิ่มหลักฐาน (QA test)');});
await step('9 U1 chair sees reason',async()=>{
  await as('chair1');log('  chair panel:',await panel());await openNoti(/ส่งกลับ/);
  log('  return-reason:',(await p.getByTestId('cycle-return-reason').innerText().catch(()=>'-')).replace(/\s+/g,' '));
  log('  return-steps:',(await p.getByTestId('cycle-return-steps').innerText().catch(()=>'-')).replace(/\s+/g,' '));
  log('  header line:',(await p.locator('main h1').first().innerText()).replace(/\s+/g,' '),'|',(await txt(p,4000)).split('\n').filter(l=>/ฉบับที่|revision/.test(l)).slice(0,2));
  log('  buttons:',await cycleBtns());
  await shot('r04-chair-return-reason',false);
  await p.getByTestId('cycle-to-in_progress').click();await dlgOk();
  log('  reason still after in_progress:',await p.getByTestId('cycle-return-reason').count(),'buttons:',await cycleBtns());
  await p.goto(sec('3.6'));await p.waitForTimeout(1200);await p.getByTestId('section-return').click();await dlgOk('QA ขอเพิ่มหลักฐาน');
  await as('lect1');await openNoti(/ส่งกลับ/);
  await p.getByTestId('narrative-th').fill('หลักสูตรมีระบบติดตามผู้เรียน อัตราคงอยู่ปี 2568 = 92% (เพิ่มตาม QA)');await p.waitForTimeout(2300);
  if(await p.getByTestId('link-select').count()){await p.getByTestId('link-select').selectOption({index:1});await p.getByTestId('link-btn').click();await p.waitForTimeout(600);}
  await p.getByTestId('section-submit').click();await dlgOk();
  await as('chair1');await p.goto(sec('3.6'));await p.waitForTimeout(1100);await p.getByTestId('section-approve').click();await p.waitForTimeout(700);
  await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1300);log('  before resend reason visible:',await p.getByTestId('cycle-return-reason').count());
  await p.getByTestId('cycle-to-under_review').click();await dlgOk();
  log('  after resend reason visible:',await p.getByTestId('cycle-return-reason').count());
});
await step('10 fqa approve, dean final',async()=>{
  await as('fqa1');await openNoti(/ส่งมาให้ QA/);await p.getByTestId('cycle-to-faculty_approved').click();await dlgOk();
  await as('dean1');await openNoti(/2569/);await p.getByTestId('cycle-to-final_approved').click();await dlgOk();
  log('  lock banner:',(await p.getByTestId('lock-banner').innerText().catch(()=>'-')).replace(/\s+/g,' ').slice(0,200));
  await save('st-r04-locked.json');
});
await step('11 P3 fqa assigns assessor',async()=>{
  await as('fqa1');log('  fqa panel:',await panel());await openNoti(/ล็อก|มอบหมายกรรมการ/);
  log('  go-assign:',await p.getByTestId('go-assign').innerText().catch(()=>'(none)'),'buttons:',await cycleBtns());
  await shot('r04-fqa-locked-cycle',false);
  await p.getByTestId('go-assign').click();await p.waitForTimeout(1400);log('  url',p.url().replace(B,''));
  log('  assign-assessor-only:',(await p.getByTestId('assign-assessor-only').innerText().catch(()=>'-')).replace(/\s+/g,' '));
  log('  page has ไม่มีสิทธิ์:',(await txt(p,8000)).includes('ไม่มีสิทธิ์'));
  log('  assessor opts:',await p.getByTestId('assessor-select').locator('option').allInnerTexts());
  await p.getByTestId('assessor-select').selectOption({label:'ศ.กรรมการ ใหม่ (Assessor)'});await p.getByTestId('assessor-add').click();await p.waitForTimeout(900);
  log('  assigned line:',(await txt(p,12000)).split('\n').filter(l=>/ได้รับมอบหมายแล้ว/.test(l)));
  await shot('r04-fqa-assign',true);
  await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1200);
  await p.getByTestId('cycle-to-under_assessment').click();await dlgOk();
});
await step('12 ass2 assesses',async()=>{
  await as('ass2','abcdefgh');log('  ass2 panel:',await panel());await openNoti(/ประเมิน/);
  log('  finish enabled before:',await p.getByTestId('assess-finish').isEnabled().catch(()=>'-'));
  for(let c=1;c<=8;c++){await p.getByTestId('assess-crit-'+c).click();await p.getByTestId('crit-score').selectOption(String(3+(c%3)));await p.getByTestId('crit-why').fill('เหตุผลเกณฑ์ '+c);await p.getByTestId('crit-save').click();await p.waitForTimeout(350);}
  log('  rated',await p.getByTestId('rated-count').innerText());
  await p.getByTestId('verdict-score').selectOption('4');await p.getByTestId('verdict-why').fill('ภาพรวมผ่านเกณฑ์');await p.getByTestId('verdict-save').click();await p.waitForTimeout(500);
  await p.getByTestId('assess-finish').click();await dlgOk();
});
await step('13 chair results',async()=>{await as('chair1');log('  chair panel:',await panel());await openNoti(/ส่งผล|ผลประเมิน/);log('  h1',await p.locator('main h1').first().innerText());});
await step('14 actions P8',async()=>{
  await p.goto(B+'/app/actions');await p.waitForTimeout(1300);await p.getByTestId('act-new').click();await p.waitForTimeout(400);
  await p.getByTestId('act-req').selectOption({index:3});
  log('  owner opts:',await p.getByTestId('act-owner').locator('option').allInnerTexts());
  await p.getByTestId('act-owner').selectOption({label:'อ.ธนา สอนดี'});
  await p.getByTestId('act-desc').fill('จัดอบรม active learning 😀');await p.getByTestId('act-due').fill('2020-01-01');await p.waitForTimeout(300);
  log('  act-due-past:',await p.getByTestId('act-due-past').innerText().catch(()=>'-'));
  await p.getByTestId('act-kpi').fill('-5%');await p.getByTestId('act-save').dblclick();await p.waitForTimeout(1000);
  log('  rows:',await p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).count());
  await as('lect1');log('  lect1 panel:',await panel());await openNoti(/แผนปรับปรุง/);
  const row=p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).first();
  log('  lect buttons:',await row.locator('[data-testid^="action-to-"]').allInnerTexts());
  await row.getByTestId('action-to-in_progress').click();await p.waitForTimeout(600);
  log('  lect buttons after start:',await row.locator('[data-testid^="action-to-"]').allInnerTexts());
  await row.getByTestId('action-to-done').click();await p.waitForTimeout(600);if(await p.getByRole('dialog').count())await dlgOk();
  log('  lect buttons after done:',await row.locator('[data-testid^="action-to-"]').allInnerTexts());
  await shot('r04-lect-actions');
  await as('chair1');await p.goto(B+'/app/actions');await p.waitForTimeout(1200);
  const r2=p.locator('tr[data-testid^="action-act"]').filter({hasText:'จัดอบรม active learning'}).first();
  log('  chair buttons:',await r2.locator('[data-testid^="action-to-"]').allInnerTexts());
  await r2.getByTestId('action-to-verified').click();await p.waitForTimeout(600);if(await p.getByRole('dialog').count())await dlgOk();
  await as('lect1');log('  lect1 panel2:',await panel());
});
await step('15 export',async()=>{
  await as('chair1');await p.getByRole('link',{name:'ส่งออกเอกสาร'}).first().click();await p.waitForTimeout(1500);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.getByTestId('export-sar-docx').click()]);
  log('  download:',dl?dl.suggestedFilename():'none');
});
await save('st-r04.json');
log('errs',errs);await br.close();
