import {session,B,txt,log} from './lib.mjs';
const {br,p,shot,save,errs,as}=await session({state:'st-ra3.json'});
async function req(u,name,unitIdx){
  await p.goto(B+'/request-access');await p.evaluate(()=>sessionStorage.clear());await p.goto(B+'/request-access');await p.waitForTimeout(600);
  const f={name,email:u+'@sample-uni.example',reason:'x'.repeat(10),username:u,password:'password1',password2:'password1'};
  for(const [k,v] of Object.entries(f)) await p.getByTestId('ra-'+k).fill(v);
  await p.waitForTimeout(200);
  if(unitIdx!=null) await p.getByTestId('ra-unit').selectOption({index:unitIdx});
  await p.getByTestId('ra-consent').check();await p.getByTestId('ra-submit').click();await p.waitForTimeout(800);
  log('req',u,(await p.getByTestId('ra-success').count())?'OK':'FAIL '+(await txt(p,600)));
}
await req('rej1','ผู้ขอ ที่จะถูกปฏิเสธ',null);
await req('ass1','กรรมการ ทดลอง',4); // other (whole uni)
await as('uadmin');
await p.goto(B+'/app/admin?tab=requests');await p.waitForTimeout(1000);
const cards=p.locator('li[data-testid^="req-"]');
log('cards',await cards.count());
for(const c of await cards.all()) log('card:',(await c.innerText()).replace(/\n/g,' | ').slice(0,300));
// reject rej1
const rej=cards.filter({hasText:'ผู้ขอ ที่จะถูกปฏิเสธ'});const rid=(await rej.getAttribute('data-testid')).slice(4);
await p.getByTestId('req-reject-'+rid).click();await p.waitForTimeout(500);
log('dialog:',await p.locator('[role=dialog],[role=alertdialog]').innerText().catch(()=>'(no dialog)'));
await shot('13-reject-dialog');
await p.locator('[role=dialog] textarea,[role=alertdialog] textarea,[role=dialog] input,[role=alertdialog] input').first().fill('ไม่ใช่บุคลากรของหลักสูตร');
await p.getByRole('button',{name:'ยืนยันปฏิเสธ'}).click();await p.waitForTimeout(900);
log('after reject toast:',(await txt(p,3000)).split('\n').filter(l=>l.includes('ปฏิเสธ')));
// approve ass1 as assessor, default scope (university)
const ap=p.locator('li[data-testid^="req-"]').filter({hasText:'กรรมการ ทดลอง'});const aid=(await ap.getAttribute('data-testid')).slice(4);
await p.getByTestId('req-role-'+aid).selectOption('assessor');
log('scope chosen:',await p.getByTestId('req-scope-'+aid).inputValue());
await p.getByTestId('req-approve-'+aid).click();await p.waitForTimeout(900);
log('approve assessor@uni toast:',(await txt(p,3000)).split('\n').filter(l=>/อนุมัติ|ขอบเขต|ไม่ถูก/.test(l)));
// login rejected
await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.clear());await p.goto(B+'/login');
await p.getByTestId('login-username').fill('rej1');await p.getByTestId('login-password').fill('password1');await p.getByTestId('login-submit').click();await p.waitForTimeout(900);
log('rejected login:',(await txt(p,600)).split('\n').filter(l=>/ไม่|ปฏิเสธ|เหลือ/.test(l)));
await shot('14-rejected-login');
// re-request with same email allowed?
await req('rej1','ผู้ขอ ที่จะถูกปฏิเสธ รอบสอง',null);
// assessor login
await as('ass1','password1');
log('assessor@uni home:',(await txt(p,2500)));
await shot('15-assessor-uni-home',true);
await p.goto(B+'/app/review');await p.waitForTimeout(1200);log('review page:',(await txt(p,1500)).slice(-700));
await save('st-ra4.json');
log('errs',errs);await br.close();
