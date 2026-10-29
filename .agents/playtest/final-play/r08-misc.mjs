// P9 evidence form error clears; URL tamper regression; U6 returnTo; keyboard on manage panel
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,errs,as}=await session({state:'st-r04.json'});
log('=== r08 misc');
await as('lect1');await p.goto(B+'/app/evidence?new=1');await p.waitForTimeout(1500);
await p.getByTestId('ev-submit').click();await p.waitForTimeout(500);
const errUnder=async()=>(await p.locator('#ev-f-title-error,[id$="title-error"]').allInnerTexts().catch(()=>[]));
log('  after empty submit title errors:',await errUnder(),'summary:',(await p.getByTestId('ev-error-summary').innerText().catch(()=>'-')).replace(/\s+/g,' '));
await p.getByTestId('ev-title').fill('ชื่อหลักฐาน');await p.waitForTimeout(300);
log('  after typing title errors:',await errUnder(),'form lines with กรอกชื่อ:',(await p.getByTestId('ev-form').innerText()).split('\n').filter(l=>/กรอกชื่อ/.test(l)));
// URL tamper
for(const [u,path] of [['lect1','/app/admin'],['assess1','/app/actions'],['ass2','/app/admin?tab=requests'],['staff1','/app/cycles/cycle-demo-2569/assign']]){
  await as(u,u==='ass2'?'abcdefgh':'demo1234');await p.goto(B+path);await p.waitForTimeout(1300);
  const t=(await txt(p,3000));log(`  ${u} ${path}: forbidden=${/ไม่มีสิทธิ์/.test(t)} has-users-table=${await p.getByTestId('users-table').count()} owner-selects=${await p.locator('[data-testid^="owner-"]').count()} assessor-select=${await p.getByTestId('assessor-select').count()}`);
}
// U6 returnTo
await p.goto(B+'/login');await p.evaluate(()=>{sessionStorage.clear();});
await p.getByTestId('nav-bell').count();
const c2=await br.newContext({storageState:'st-r04.json'});const q=await c2.newPage();
await q.goto(B+'/app/actions');await q.waitForTimeout(1500);log('  deep link not logged in ->',q.url().replace(B,''));
if(/login/.test(q.url())){await q.getByTestId('login-username').fill('chair1');await q.getByTestId('login-password').fill('demo1234');await q.getByTestId('login-submit').click();await q.waitForTimeout(2000);log('  after login ->',q.url().replace(B,''));}
await c2.close();
// keyboard on manage panel
await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1200);
await p.getByTestId('user-manage-staff1').focus();await p.keyboard.press('Enter');await p.waitForTimeout(400);
log('  aria-expanded after Enter:',await p.getByTestId('user-manage-staff1').getAttribute('aria-expanded'));
const seq=[];for(let i=0;i<6;i++){await p.keyboard.press('Tab');seq.push(await p.evaluate(()=>{const a=document.activeElement;return (a.getAttribute('data-testid')||a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,30)}));}
log('  tab order in panel:',seq);
await p.keyboard.press('Escape');await p.waitForTimeout(300);log('  Esc closes panel? expanded=',await p.getByTestId('user-manage-staff1').getAttribute('aria-expanded'));
log('errs',errs);await br.close();
