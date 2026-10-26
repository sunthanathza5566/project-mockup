import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:process.argv[2]||undefined});
const users=(process.argv[3]||'sadmin,uadmin,chair1,staff1,lect1,lect2,data1,fqa1,dean1,assess1').split(',');
for(const u of users){
  await as(u);
  const menus=(await p.locator('#app-sidebar a').allInnerTexts()).map(s=>s.replace(/\s+/g,' ').trim());
  const todo=(await txt(p,3000)).split('สิ่งที่ต้องทำตอนนี้')[1]?.split('รอบประเมินที่เข้าถึงได้')[0]?.replace(/\s+/g,' ').trim();
  log(`\n### ${u} menus=${JSON.stringify(menus)}\n  todo: ${todo}`);
  await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);
  const n=await p.locator('[data-testid^="noti-item-"]').count();
  log('  bell:',await p.getByTestId('nav-bell').getAttribute('aria-label'),'items',n);
  for(let i=0;i<Math.min(n,8);i++){
    if(!(await p.getByTestId('noti-panel').isVisible().catch(()=>false))){await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);}
    const it=p.locator('[data-testid^="noti-item-"]').nth(i);
    const label=(await it.innerText()).replace(/\s+/g,' ').slice(0,140);
    await it.click();await p.waitForTimeout(1300);
    const h1=await p.locator('main h1').first().innerText().catch(()=>'?');
    const hl=await p.evaluate(()=>{const e=document.querySelector(':target')||document.activeElement;return e?(e.id||e.tagName)+':'+(e.textContent||'').slice(0,40):''});
    log(`  [${i}] ${label}\n      -> ${p.url().replace(B,'')} | h1=${h1} | focus/target=${hl}`);
    await p.goBack();await p.waitForTimeout(700);
  }
  if(p.url().includes('/login')) log('  !! back went to login');
}
log('errs',errs);await br.close();
