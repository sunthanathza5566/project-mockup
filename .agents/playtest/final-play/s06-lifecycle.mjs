import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-inv1.json'});
await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:B});
await as('uadmin');
log('bell',await p.getByTestId('nav-bell').getAttribute('aria-label'));
await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);log('panel',await p.getByTestId('noti-panel').innerText());
const it=p.locator('[data-testid^="noti-item-"]').first();await it.click();await p.waitForTimeout(1000);log('N14 ->',p.url());
// invite 2 for reissue/cancel
await p.goto(B+'/app/admin');await p.waitForTimeout(900);
async function invite(u){await p.getByTestId('user-new').click();await p.getByTestId('nu-username').fill(u);await p.getByTestId('nu-name').fill('ผู้ถูกเชิญ '+u);await p.getByTestId('nu-email').fill(u+'@sample-uni.example');await p.getByTestId('nu-scope').selectOption('programme:prog-demo-cs');await p.getByTestId('nu-submit').click();await p.waitForTimeout(1000);return await p.getByTestId('invite-link').inputValue();}
const old=await invite('inv2');
const row=p.getByTestId('user-inv2');log('inv2 row:',(await row.innerText()).replace(/\n/g,' | '));
await p.getByTestId('user-reinvite-inv2').click();await p.waitForTimeout(1200);
const nw=await p.getByTestId('invite-link').inputValue();log('reissued differs',nw!==old);
await shot('23-reissue',true);
const t=await ctx.newPage();await t.goto(old);await t.waitForTimeout(1300);log('old link after reissue:',(await t.locator('body').innerText()).includes('ไม่ถูกต้องหรือหมดอายุ'));
await t.goto(nw);await t.waitForTimeout(1300);log('new link ok:',await t.getByTestId('inv-summary').count());
// cancel
await p.getByTestId('user-cancel-invite-inv2').click();await p.waitForTimeout(400);
log('cancel dialog:',await p.locator('[role=alertdialog],[role=dialog]').last().innerText());
await p.locator('[role=alertdialog],[role=dialog]').last().getByRole('button').last().click();await p.waitForTimeout(900);
log('inv2 row gone:',await p.getByTestId('user-inv2').count()===0);
await t.reload();await t.goto(nw);await t.waitForTimeout(1300);log('new link after cancel invalid:',(await t.locator('body').innerText()).includes('ไม่ถูกต้องหรือหมดอายุ'));
// what if invitee has summary open and admin cancels meanwhile then invitee submits
const old3=await invite('inv3');
await t.goto(old3);await t.waitForTimeout(1300);
await p.getByTestId('user-cancel-invite-inv3').click();await p.waitForTimeout(300);await p.locator('[role=alertdialog],[role=dialog]').last().getByRole('button').last().click();await p.waitForTimeout(700);
await t.getByTestId('inv-password').fill('password99');await t.getByTestId('inv-password2').fill('password99');await t.getByTestId('inv-submit').click();await t.waitForTimeout(1200);
log('submit after cancel (2-tab):',t.url(),(await t.locator('body').innerText()).split('\n').filter(l=>/ไม่ถูกต้อง|หมดอายุ|ผิดพลาด/.test(l)));
await t.close();
// suspend lect1 while lect1 logged in another tab? sessionStorage per tab -> open new page and login lect1
const l=await ctx.newPage();await l.goto(B+'/login');await l.getByTestId('login-username').fill('lect1');await l.getByTestId('login-password').fill('demo1234');await l.getByTestId('login-submit').click();await l.waitForURL('**/app');
await p.getByTestId('user-suspend-lect1').click();await p.waitForTimeout(400);
log('suspend dialog:',await p.locator('[role=alertdialog],[role=dialog]').last().innerText());
await shot('24-suspend-dialog');
await p.locator('[role=alertdialog],[role=dialog]').last().getByRole('button').last().click();await p.waitForTimeout(900);
log('lect1 row:',(await p.getByTestId('user-lect1').innerText()).replace(/\n/g,' | '));
await shot('25-suspended-row',true);
// lect1 tab: click something
await l.getByRole('link',{name:'หลักฐาน'}).first().click();await l.waitForTimeout(1500);log('suspended tab after nav:',l.url(),(await l.locator('body').innerText()).slice(0,300));
await l.screenshot({path:'../../screenshots/TASK-0002/play-26-suspended-session.png'});
await l.goto(B+'/login');await l.getByTestId('login-username').fill('lect1');await l.getByTestId('login-password').fill('demo1234');await l.getByTestId('login-submit').click();await l.waitForTimeout(900);
log('suspended login:',(await l.locator('body').innerText()).split('\n').filter(x=>/ระงับ|ติดต่อ/.test(x)));
// reactivate
await p.getByTestId('user-reactivate-lect1').click();await p.waitForTimeout(500);
const dlg=p.locator('[role=alertdialog],[role=dialog]');if(await dlg.count()){log('reactivate dialog',await dlg.last().innerText());await dlg.last().getByRole('button').last().click();}
await p.waitForTimeout(900);log('lect1 row after:',(await p.getByTestId('user-lect1').innerText()).replace(/\n/g,' | '));
await l.getByTestId('login-submit').click();await l.waitForTimeout(1200);log('lect1 login after reactivate',l.url());
// self-suspend button present?
log('self suspend btn:',await p.getByTestId('user-suspend-uadmin').count(),'sadmin suspend btn:',await p.getByTestId('user-suspend-sadmin').count());
// delete active button?
log('delete buttons:',await p.locator('[data-testid^="user-delete-"]').count());
await save('st-life.json');
log('errs',errs);await br.close();
