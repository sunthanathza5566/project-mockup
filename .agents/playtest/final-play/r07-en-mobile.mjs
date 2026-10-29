// U3: language once for all pages + new tab; EN notification text; mobile 390 admin panel
import {session,B,txt,log,helpers} from './lib2.mjs';
const S=await session({state:'st-r04.json'});
const {br,ctx,p,shot,errs}=S;
log('=== r07 U3 language + mobile');
const isEN=async(pg)=>{const t=await pg.locator('body').innerText();const th=(t.match(/[฀-๿]/g)||[]).length;const en=(t.match(/[A-Za-z]/g)||[]).length;return `th=${th} en=${en} pressed=${await pg.getByTestId('lang-en').getAttribute('aria-pressed').catch(()=>'?')}`;};
await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.clear());await p.goto(B+'/login');await p.waitForTimeout(700);
log('  initial lang key:',await p.evaluate(()=>[localStorage.getItem('aunqa_lang'),localStorage.getItem('eduflow_lang_pages')]));
await p.getByTestId('lang-en').click();await p.waitForTimeout(400);
log('  login EN:',await isEN(p),'key',await p.evaluate(()=>localStorage.getItem('aunqa_lang')));
await p.goto(B+'/request-access');await p.waitForTimeout(800);log('  /request-access:',await isEN(p),(await txt(p,400)).replace(/\s+/g,' ').slice(0,120));
await p.goto(B+'/invite');await p.waitForTimeout(800);log('  /invite:',await isEN(p),'demo note:',await p.getByTestId('inv-demo-note').innerText().catch(()=>'-'));
await p.goto(B+'/login');await p.waitForTimeout(500);
await p.getByTestId('login-username').fill('lect1');await p.getByTestId('login-password').fill('demo1234');await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(1000);
log('  /app:',await isEN(p));
await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);log('  EN panel:',(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ').slice(0,600));await p.keyboard.press('Escape');
await shot('r07-en-app');
// new tab
const t=await ctx.newPage();await t.goto(B+'/app/evidence');await t.waitForTimeout(1500);log('  new tab /app/evidence:',await isEN(t));
await t.goto(B+'/app/actions');await t.waitForTimeout(1200);log('  new tab actions:',await isEN(t),(await t.locator('main').innerText()).replace(/\s+/g,' ').slice(0,300));
// switch back to Thai in tab2 -> tab1 follows?
await t.getByTestId('lang-th').click();await t.waitForTimeout(800);
log('  tab1 after tab2->TH:',await isEN(p));
await t.close();
// back in TH: noti date/wording
await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);log('  TH panel:',(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ').slice(0,400));await p.keyboard.press('Escape');
// cycle header revision wording
await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1200);log('  cycle header:',(await txt(p,2500)).split('\n').filter(l=>/ฉบับที่|revision/.test(l)));
await br.close();
// mobile 390 admin
const M=await session({state:'st-r04.json',vp:{width:390,height:844}});
await M.as('uadmin');await M.p.goto(B+'/app/admin');await M.p.waitForTimeout(1500);
const hs=async()=>M.p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
log('  m390 users h-scroll:',await hs(),'page height',await M.p.evaluate(()=>document.documentElement.scrollHeight));
const tabsTop=await M.p.locator('[role="tab"]').evaluateAll(es=>es.map(e=>Math.round(e.getBoundingClientRect().top)));log('  m390 tabs tops:',tabsTop);
await M.p.getByTestId('users-search').fill('chair');await M.p.waitForTimeout(400);
await M.p.getByTestId('user-manage-chair1').click();await M.p.waitForTimeout(500);
log('  m390 panel h-scroll:',await hs());
await M.p.screenshot({path:'../../screenshots/TASK-0002/play-r07-m-admin-panel.png',fullPage:false});
await M.p.getByTestId('user-manage-chair1').scrollIntoViewIfNeeded();
log('  m390 panel text:',(await M.p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,500));
log('errs',errs,M.errs);await M.br.close();
