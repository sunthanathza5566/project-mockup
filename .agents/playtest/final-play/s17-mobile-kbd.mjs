import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({vp:{width:390,height:844},state:'st-ra1.json'});
const sw=async(l)=>log(l,'scrollW',await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]));
await p.goto(B+'/request-access');await p.waitForTimeout(900);await sw('ra');await shot('70-m-request-access',true);
await as('uadmin');await sw('home');await shot('71-m-uadmin-home');
await p.getByTestId('nav-bell').click();await p.waitForTimeout(500);await shot('72-m-noti-panel');
const box=await p.getByTestId('noti-panel').boundingBox();log('panel box',box);
await p.locator('[data-testid^="noti-item-"]').first().click();await p.waitForTimeout(1300);log('->',p.url().replace(B,''));
await sw('requests');await shot('73-m-requests',true);
const card=p.locator('li[data-testid^="req-"]').first();
const sel=card.locator('select');log('selects visible',await sel.count());
await p.getByTestId('nav-menu').click();await p.waitForTimeout(500);await shot('74-m-drawer');
log('drawer text',(await p.locator('#app-sidebar').innerText()).replace(/\s+/g,' '));
await p.keyboard.press('Escape');
await p.goto(B+'/app/admin');await p.waitForTimeout(1200);await sw('users');await shot('75-m-users',true);
await p.goto(B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::1.5'));await p.waitForTimeout(1500);await sw('section');await shot('76-m-section',false);
await br.close();
// keyboard only
const k=await session({state:'st-ra1.json'});const q=k.p;
await q.goto(B+'/login');await q.waitForTimeout(800);
const focusName=async()=>q.evaluate(()=>{const e=document.activeElement;return (e.getAttribute('data-testid')||e.getAttribute('aria-label')||e.innerText||e.tagName).slice(0,50).replace(/\s+/g,' ')});
const seq=[];for(let i=0;i<12;i++){await q.keyboard.press('Tab');seq.push(await focusName());}
log('login tab order:',seq.join(' > '));
await q.getByTestId('login-username').focus();await q.keyboard.type('uadmin');await q.keyboard.press('Tab');await q.keyboard.type('demo1234');await q.keyboard.press('Enter');await q.waitForURL('**/app');await q.waitForTimeout(900);
const s2=[];for(let i=0;i<10;i++){await q.keyboard.press('Tab');s2.push(await focusName());}log('app tab order:',s2.join(' > '));
await q.getByTestId('nav-bell').focus();await q.keyboard.press('Enter');await q.waitForTimeout(500);
log('focus after bell open:',await focusName());
const s3=[];for(let i=0;i<4;i++){await q.keyboard.press('Tab');s3.push(await focusName());}log('in panel tabs:',s3.join(' > '));
await q.keyboard.press('Escape');await q.waitForTimeout(300);log('after Esc focus:',await focusName());
await q.getByTestId('nav-bell').focus();await q.keyboard.press('Enter');await q.waitForTimeout(400);
await q.locator('[data-testid^="noti-item-"]').first().focus();await q.keyboard.press('Enter');await q.waitForTimeout(1300);log('Enter on item ->',q.url().replace(B,''),'focus',await focusName());
// on requests: keyboard approve
const id=(await q.locator('li[data-testid^="req-"]').first().getAttribute('data-testid')).slice(4);
await q.getByTestId('req-role-'+id).focus();await q.keyboard.press('Tab');log('after role tab',await focusName());await q.keyboard.press('Tab');log('next',await focusName());
await k.br.close();
log('errs',errs,k.errs);
