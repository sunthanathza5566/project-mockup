import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const visit=async(u,path)=>{await p.goto(B+path);await p.waitForTimeout(1500);const h=await p.locator('main h1, h1').first().innerText().catch(()=>'?');const t=(await p.locator('main').innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,160);log(`${u} ${path} -> ${p.url().replace(B,'')} | h1=${h} | ${t}`);};
for(const [u,paths] of [['lect1',['/app/admin','/app/admin?tab=requests','/app/cycles/cycle-demo-2569/assign','/app/cycles/cycle-demo-2569/assess','/app/review']],['assess1',['/app/admin','/app/actions','/app/metrics','/app/cycles/cycle-demo-2569/assign']],['uadmin2',['/app/cycles/cycle-demo-2569','/app/sections/'+encodeURIComponent('cycle-demo-2569::1.1'),'/app/admin?tab=requests']],['dean1',['/app/admin?tab=users','/app/admin?tab=requests']]]){
  await as(u);for(const path of paths) await visit(u,path);
}
await shot('55-lect-admin-url');
// logged-out deep link
await p.evaluate(()=>{localStorage.removeItem('aunqa_session');sessionStorage.clear();});
await visit('anon','/app/sections/'+encodeURIComponent('cycle-demo-2569::1.1'));
// login then returned?
await p.getByTestId('login-username').fill('staff1');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForTimeout(2000);log('after login returned to',p.url().replace(B,''));
// invite page while logged in
await visit('staff1','/invite');await visit('staff1','/request-access');await visit('staff1','/login');
log('errs',errs);await br.close();
