import {session,B,txt,log} from './lib.mjs';
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-ra4.json'});
await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:B});
await as('uadmin');
await p.goto(B+'/app/admin');await p.waitForTimeout(1000);
await shot('16-admin-users',true);
await p.getByTestId('user-new').click();await p.waitForTimeout(400);
log('form:',await p.getByTestId('user-form').innerText());
log('role default',await p.getByTestId('nu-role').inputValue(),'scope default',await p.getByTestId('nu-scope').inputValue());
log('mode invite checked',await p.getByTestId('nu-mode-invite').isChecked());
await shot('17-new-user-form');
// submit empty
await p.getByTestId('nu-submit').click();await p.waitForTimeout(500);
log('empty submit msgs:',(await p.getByTestId('user-form').innerText()).split('\n').filter(l=>/กรุณา|ต้อง|ไม่ถูก/.test(l)));
await p.getByTestId('nu-username').fill('invitee1');await p.getByTestId('nu-name').fill('อ.เชิญ มาใหม่');await p.getByTestId('nu-email').fill('invitee1@sample-uni.example');
await p.getByTestId('nu-role').selectOption('programme_staff');await p.getByTestId('nu-scope').selectOption('programme:prog-demo-cs');
await p.getByTestId('nu-submit').dblclick();await p.waitForTimeout(1200);
log('== invite result:', (await txt(p,3500)).split('ผู้ใช้และบทบาท').slice(-1)[0].slice(0,1500));
await shot('18-invite-result',true);
const link=await p.getByTestId('invite-link').inputValue();log('link',link.replace(/#t=.*/,'#t=<redacted>'));
await p.getByTestId('invite-copy').click();await p.waitForTimeout(400);
const clip=await p.evaluate(()=>navigator.clipboard.readText()).catch(e=>'clip err '+e.message);
log('clipboard==link',clip===link, 'copy feedback:',(await txt(p,4000)).split('\n').filter(l=>/คัดลอก/.test(l)));
log('users with invitee1:',await p.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('users')))).filter(x=>x.username.startsWith('invitee')).length));
await save('st-inv0.json');
// (a) open in brand-new context (other browser)
const br2=await chromium.launch();const c2=await br2.newContext();const p2=await c2.newPage();
await p2.goto(link);await p2.waitForTimeout(1500);
log('== new-context invite page:',(await p2.locator('body').innerText()).slice(0,900));
await p2.screenshot({path:'../../screenshots/TASK-0002/play-19-invite-other-browser.png',fullPage:true});
await br2.close();
// (b) open in new tab same context
const t=await ctx.newPage();await t.goto(link);await t.waitForTimeout(1500);
log('url after load (hash removed?)',t.url());
log('== same-context invite page:',(await t.locator('body').innerText()).slice(0,1200));
await t.screenshot({path:'../../screenshots/TASK-0002/play-20-invite-summary.png',fullPage:true});
// short pw, mismatch
await t.getByTestId('inv-password').fill('short');await t.getByTestId('inv-password2').fill('short');await t.getByTestId('inv-submit').click();await t.waitForTimeout(500);
log('short pw msgs:',(await t.locator('body').innerText()).split('\n').filter(l=>/ต้อง|ไม่ตรง|อย่างน้อย/.test(l)));
await t.getByTestId('inv-password').fill('invitepass1');await t.getByTestId('inv-password2').fill('invitepass1');await t.getByTestId('inv-submit').click();
await t.waitForTimeout(2000);log('after accept url',t.url());log((await t.locator('body').innerText()).slice(0,800));
await t.screenshot({path:'../../screenshots/TASK-0002/play-21-invite-accepted.png'});
// reuse link
await t.evaluate(()=>sessionStorage.clear());
await t.goto(link);await t.waitForTimeout(1500);log('== reuse link:',(await t.locator('body').innerText()).slice(0,700));
await t.screenshot({path:'../../screenshots/TASK-0002/play-22-invite-reused.png'});
await t.close();
await save('st-inv1.json');
log('errs',errs);await br.close();
