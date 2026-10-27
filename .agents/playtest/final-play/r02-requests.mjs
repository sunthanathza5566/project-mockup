// Re-check P2 (requests): scope options by role, default scope, U4 next steps
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const {panel,openNoti,dlgOk,toast}=helpers(p);
log('=== r02 P2 requests');
const fill=async(o)=>{for(const [k,v] of Object.entries(o)){await p.getByTestId('ra-'+k).fill(v);}};
const mk=async(u,unitRe,name)=>{
  await p.goto(B+'/request-access');await p.waitForTimeout(800);
  await fill({name,email:u+'@sample-uni.example',reason:'ทดสอบสิทธิ์ (fake)',username:u,password:'abcdefgh',password2:'abcdefgh'});
  await p.waitForTimeout(300);
  const opts=await p.getByTestId('ra-unit').locator('option').allInnerTexts();
  const lab=opts.find(o=>unitRe.test(o));
  if(u==='rq1')log('  unit options:',opts);
  await p.getByTestId('ra-unit').selectOption({label:lab});
  await p.getByTestId('ra-consent').check();
  await p.getByTestId('ra-submit').click();await p.waitForTimeout(1200);
  log('  submitted',u,'unit=',lab,'success?',await p.getByTestId('ra-success').count());
  if(u==='rq1'){log('  next steps:',(await p.getByTestId('ra-next-steps').innerText().catch(()=>'-')).replace(/\s+/g,' '));await shot('r02-ra-success',true);}
};
await mk('rq1',/^คณะ|คณะ/,'อ.คณะ ทดสอบ');
await mk('rq2',/หลักสูตร.*CS|วิทยาการคอมพิวเตอร์/,'อ.หลักสูตร ทดสอบ');
await mk('rq3',/อื่น/,'คุณอื่น ๆ ทดสอบ');
await mk('rq4',/อื่น/,'กรรมการ ทดสอบ');
await as('uadmin');
await p.goto(B+'/app/admin?tab=requests');await p.waitForTimeout(1500);
const cards=p.locator('[data-testid^="req-"]').filter({has:p.locator('select')});
const n=await cards.count();log('  cards',n);
const ids={};
for(let i=0;i<n;i++){const c=cards.nth(i);const id=(await c.getAttribute('data-testid')).replace('req-','');const t=(await c.innerText()).replace(/\s+/g,' ');const u=(t.match(/rq\d/)||['?'])[0];ids[u]=id;
  const role=await p.getByTestId('req-role-'+id).inputValue();const sc=p.getByTestId('req-scope-'+id);
  log(`  [${u}] role=${role} scope=${await sc.locator('select').inputValue().catch(async()=>await sc.inputValue().catch(()=>'?'))} opts=`,await p.getByTestId('req-scope-'+id).locator('option').allInnerTexts());
  log('     card text:',t.slice(0,260));
}
await shot('r02-requests',true);
const scopeSel=id=>p.locator(`[data-testid="req-scope-${id}"]`).locator('xpath=self::select|.//select').first();
// role -> scope options for rq1
const id1=ids.rq1;
for(const r of ['assessor','dean','faculty_qa','programme_chair','uni_admin','data_staff']){
  const ok=await p.getByTestId('req-role-'+id1).selectOption(r).then(()=>true).catch(()=>false);await p.waitForTimeout(250);
  log(`  rq1 role=${r} ok=${ok} scope opts=`,await p.getByTestId('req-scope-'+id1).locator('option').allInnerTexts(),'value=',await scopeSel(id1).inputValue().catch(()=>'?'));
}
log('  role options:',await p.getByTestId('req-role-'+id1).locator('option').allInnerTexts());
// approve rq1 as lecturer without choosing scope
await p.getByTestId('req-role-'+id1).selectOption('programme_staff');await p.waitForTimeout(300);
log('  rq1 staff default scope value:',await scopeSel(id1).inputValue().catch(()=>'?'));
await p.getByTestId('req-approve-'+id1).click();await p.waitForTimeout(900);
log('  approve without scope ->',(await p.getByTestId('req-'+id1).innerText().catch(()=>'(card gone)')).replace(/\s+/g,' ').slice(0,400),'focus:',await p.evaluate(()=>document.activeElement?.tagName+'#'+(document.activeElement?.id||'')));
await shot('r02-approve-noscope');
// pick programme then approve
await scopeSel(id1).selectOption({index:1});await p.getByTestId('req-approve-'+id1).click();await p.waitForTimeout(1200);
log('  rq1 approved? card count',await p.getByTestId('req-'+id1).count(),'toast',await toast());
// rq2 default (programme chosen by requester)
log('  rq2 default role/scope:',await p.getByTestId('req-role-'+ids.rq2).inputValue(),await scopeSel(ids.rq2).inputValue().catch(()=>'?'));
await p.getByTestId('req-approve-'+ids.rq2).click();await p.waitForTimeout(1200);
// rq4 as assessor with cycle scope
await p.getByTestId('req-role-'+ids.rq4).selectOption('assessor');await p.waitForTimeout(300);
log('  rq4 assessor opts:',await p.getByTestId('req-scope-'+ids.rq4).locator('option').allInnerTexts());
await scopeSel(ids.rq4).selectOption({index:1});await p.getByTestId('req-approve-'+ids.rq4).click();await p.waitForTimeout(1200);
// rq3 reject -> dialog button text (U8)
await p.getByTestId('req-reject-'+ids.rq3).click();await p.waitForTimeout(500);
const d=p.getByRole('dialog');log('  reject dialog buttons:',await d.getByRole('button').allInnerTexts());
await d.getByRole('button',{name:'ยังไม่ปฏิเสธ'}).click().catch(e=>log('  no ยังไม่ปฏิเสธ'));await p.waitForTimeout(300);
await p.getByTestId('req-reject-'+ids.rq3).click();await dlgOk('ไม่ใช่บุคลากร (ทดสอบ)');
// users table roles of approved
await p.goto(B+'/app/admin');await p.waitForTimeout(1200);
for(const u of ['rq1','rq2','rq4'])log('  row',u,(await p.getByTestId('user-'+u).innerText().catch(()=>'-')).replace(/\s+/g,' '));
log('  roles stored:',await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/users/.test(k));return JSON.parse(localStorage.getItem(k)).filter(x=>/^rq/.test(x.username)).map(x=>x.username+':'+JSON.stringify(x.roles))}));
// U4: rejected login message
await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.clear());await p.goto(B+'/login');
await p.getByTestId('login-username').fill('rq3');await p.getByTestId('login-password').fill('abcdefgh');await p.getByTestId('login-submit').click();await p.waitForTimeout(900);
log('  rq3 rejected login msg:',(await txt(p,1200)).split('\n').filter(l=>/ไม่ถูก|ครั้ง|ปฏิเสธ|ติดต่อ/.test(l)));
// assessor rq4 logs in
await as('rq4','abcdefgh');log('  rq4 home:',(await txt(p,1500)).replace(/\s+/g,' ').slice(0,300));
await save('st-r02.json');
log('errs',errs);await br.close();
