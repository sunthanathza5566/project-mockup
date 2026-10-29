// Re-check users panel: search, manage, P2 add-role scope, P4, P5, suspend/reactivate (+invite revive), reinvite/cancel, U10/P9, U2
import {session,B,txt,log,helpers} from './lib2.mjs';
import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const {dlgOk}=helpers(p);
log('=== r03 users panel');
const dlg=async()=>{const d=p.getByRole('dialog');await d.waitFor({timeout:4000});return {d,t:(await d.innerText()).replace(/\s+/g,' '),b:await d.getByRole('button').allInnerTexts()};};
await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1500);
log('  rows:',await p.locator('[data-testid^="user-manage-"]').count(),'manage uadmin:',await p.getByTestId('user-manage-uadmin').count(),'manage sadmin:',await p.getByTestId('user-manage-sadmin').count());
log('  sadmin row:',(await p.getByTestId('user-sadmin').innerText().catch(()=>'-')).replace(/\s+/g,' '),'| uadmin row:',(await p.getByTestId('user-uadmin').innerText().catch(()=>'-')).replace(/\s+/g,' '));
await shot('r03-users-table',true);
// search
await p.getByTestId('users-search').fill('ใจดี');await p.waitForTimeout(400);log('  search ใจดี rows:',await p.locator('[data-testid^="user-manage-"]').count());
await p.getByTestId('users-search').fill('LECT');await p.waitForTimeout(400);log('  search LECT rows:',await p.locator('[data-testid^="user-manage-"]').evaluateAll(es=>es.map(e=>e.dataset.testid)));
await p.getByTestId('users-search').fill('zzz😀');await p.waitForTimeout(400);log('  search none:',await p.getByTestId('users-search-empty').innerText().catch(()=>'-'));
await p.getByTestId('users-search').fill('');await p.waitForTimeout(300);
// manage lect2 -> add role dean
await p.getByTestId('user-manage-lect2').click();await p.waitForTimeout(500);
log('  panel lect2:',(await p.locator('[data-testid="user-panel-lect2"]').innerText().catch(()=>'(no user-panel testid)')).replace(/\s+/g,' ').slice(0,500));
await shot('r03-panel-lect2');
for(const r of ['dean','assessor','programme_chair','uni_admin']){await p.getByTestId('user-add-role-lect2').selectOption(r);await p.waitForTimeout(250);log(`  add-role ${r} scope opts:`,await p.getByTestId('user-add-scope-lect2').locator('option').allInnerTexts());}
await p.getByTestId('user-add-role-lect2').selectOption('programme_chair');await p.waitForTimeout(250);
const sc=p.getByTestId('user-add-scope-lect2');const sel=(await sc.evaluate(e=>e.tagName))==='SELECT'?sc:sc.locator('select');
log('  chair default scope value:',await sel.inputValue());
await p.getByTestId('user-add-submit-lect2').click();await p.waitForTimeout(800);
log('  lect2 row after add:',(await p.getByTestId('user-lect2').innerText()).replace(/\s+/g,' '));
// add same again -> info toast
await p.getByTestId('user-add-role-lect2').selectOption('programme_chair');await p.waitForTimeout(200);
const sel2=(await sc.evaluate(e=>e.tagName))==='SELECT'?sc:sc.locator('select');await sel2.selectOption(await sel.inputValue().catch(()=>''));
await p.getByTestId('user-add-submit-lect2').click();await p.waitForTimeout(600);
log('  dup add text:',(await txt(p,20000)).split('\n').filter(l=>/มีบทบาทนี้|อยู่แล้ว/.test(l)).slice(0,2));
// remove role x -> confirm dialog
const xs=p.locator('button[aria-label^="ลบบทบาท"]');log('  x buttons in panel:',await xs.count(),await xs.evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))));
await xs.last().click();let D=await dlg();log('  remove dialog:',D.t,D.b);
await D.d.getByRole('button',{name:'เก็บบทบาทไว้'}).click();await p.waitForTimeout(300);
log('  after keep:',(await p.getByTestId('user-lect2').innerText()).replace(/\s+/g,' '));
await xs.last().click();await dlgOk();log('  after confirm remove:',(await p.getByTestId('user-lect2').innerText()).replace(/\s+/g,' '));
// last role removal warning
await xs.first().click();D=await dlg();log('  last-role dialog:',D.t);await D.d.getByRole('button',{name:'เก็บบทบาทไว้'}).click();
await p.getByTestId('user-panel-close-lect2').click();await p.waitForTimeout(300);
log('  focus after close:',await p.evaluate(()=>document.activeElement?.getAttribute('data-testid')));
// suspend lect1
await p.getByTestId('user-manage-lect1').click();await p.waitForTimeout(400);
await p.getByTestId('user-suspend-lect1').click();D=await dlg();log('  suspend dialog:',D.t,D.b);await D.d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(800);
log('  lect1 status:',await p.getByTestId('user-status-lect1').innerText(),'add-blocked:',await p.getByTestId('user-add-blocked-lect1').innerText().catch(()=>'-'),'add-role present:',await p.getByTestId('user-add-role-lect1').count());
await shot('r03-suspended-panel');
await p.getByTestId('user-reactivate-lect1').click();D=await dlg();log('  reactivate dialog:',D.t,D.b);await D.d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(800);
log('  lect1 status after:',await p.getByTestId('user-status-lect1').innerText());
// U10/P9 new user form
await p.getByTestId('user-new').click();await p.waitForTimeout(400);
await p.getByTestId('nu-submit').click();await p.waitForTimeout(500);
log('  empty submit summary:',(await p.getByTestId('nu-error-summary').innerText().catch(()=>'-')).replace(/\s+/g,' '),'focus',await p.evaluate(()=>document.activeElement?.getAttribute('data-testid')));
await shot('r03-newuser-empty');
await p.getByTestId('nu-username').fill('inv9');await p.waitForTimeout(300);
log('  after typing username, form errors:',(await p.getByTestId('user-form').innerText()).split('\n').filter(l=>/กรอก|ต้อง|กรุณา/.test(l)));
await p.getByTestId('nu-name').fill('อ.เชิญ ทดสอบ (Test)');await p.getByTestId('nu-email').fill('inv9@sample-uni.example');
await p.getByTestId('nu-role').selectOption('assessor');await p.waitForTimeout(250);log('  nu assessor scope opts:',await p.getByTestId('nu-scope').locator('option').allInnerTexts());
await p.getByTestId('nu-role').selectOption('programme_staff');await p.waitForTimeout(250);log('  nu staff scope opts:',await p.getByTestId('nu-scope').locator('option').allInnerTexts());
await p.getByTestId('nu-submit').dblclick();await p.waitForTimeout(1200);
log('  invite-result:',(await p.getByTestId('invite-result').innerText().catch(()=>'-')).replace(/\s+/g,' ').slice(0,600));
log('  invite-demo-note:',await p.getByTestId('invite-demo-note').innerText().catch(()=>'-'));
await shot('r03-invite-result',true);
const link1=await p.getByTestId('invite-link').inputValue();
// reinvite -> new link
await p.goto(B+'/app/admin');await p.waitForTimeout(1200);
await p.getByTestId('user-search').count();
await p.getByTestId('users-search').fill('inv9');await p.waitForTimeout(300);
await p.getByTestId('user-manage-inv9').click();await p.waitForTimeout(400);
log('  inv9 panel:',(await p.locator('[id^="user-panel"],[data-testid="user-panel-inv9"]').first().innerText().catch(()=>'-')).replace(/\s+/g,' ').slice(0,300));
await p.getByTestId('user-reinvite-inv9').click();await p.waitForTimeout(800);
if(await p.getByRole('dialog').count()){D=await dlg();log('  reinvite dialog',D.t,D.b);await D.d.getByRole('button',{name:/^ยืนยัน|สร้าง/}).click();await p.waitForTimeout(800);}
const link2=await p.getByTestId('invite-link').inputValue().catch(()=>null);log('  new link differs:',!!link2&&link2!==link1,'demo note:',await p.getByTestId('invite-demo-note').count());
// old link dead, new link valid (same context)
const t=await ctx.newPage();await t.goto(link1);await t.waitForTimeout(1500);log('  old link page:',(await t.locator('body').innerText()).split('\n').filter(l=>/ลิงก์|สาธิต/.test(l)).slice(0,3));
await t.goto(link2);await t.waitForTimeout(1500);log('  new link page:',(await t.locator('body').innerText()).split('\n').filter(l=>/ยินดีต้อนรับ|สาธิต|ลิงก์/.test(l)).slice(0,4),'inv-demo-note',await t.getByTestId('inv-demo-note').count());
await t.screenshot({path:'../../screenshots/TASK-0002/play-r03-invite-page.png',fullPage:true});
// other browser context
const br2=await chromium.launch();const c2=await br2.newContext({locale:'th-TH'});const p2=await c2.newPage();await p2.goto(link2);await p2.waitForTimeout(1500);
log('  other-browser page:',(await p2.locator('body').innerText()).split('\n').filter(l=>/ลิงก์|สาธิต|เบราว์เซอร์/.test(l)).slice(0,4));
await p2.screenshot({path:'../../screenshots/TASK-0002/play-r03-invite-other-browser.png',fullPage:true});
await p2.goto(B+'/invite');await p2.waitForTimeout(1000);log('  /invite no hash:',(await p2.locator('body').innerText()).split('\n').filter(l=>/สาธิต|รหัสเชิญ/.test(l)).slice(0,3));
await br2.close();await t.close();
// cancel invite -> dialog keep / confirm
await p.getByTestId('user-cancel-invite-inv9').click();D=await dlg();log('  cancel dialog:',D.t,D.b);
await D.d.getByRole('button',{name:'เก็บคำเชิญไว้'}).click();await p.waitForTimeout(300);
log('  inv9 still there:',await p.getByTestId('user-inv9').count());
await save('st-r03.json');
// ข-18: uadmin invites inv10 -> sadmin suspends uadmin -> link dead -> reactivate (dialog) -> link alive
await p.getByTestId('users-search').fill('');await p.getByTestId('user-new').click();await p.waitForTimeout(300);
await p.getByTestId('nu-username').fill('inv10');await p.getByTestId('nu-name').fill('อ.เชิญสิบ ทดสอบ');await p.getByTestId('nu-email').fill('inv10@sample-uni.example');
await p.getByTestId('nu-role').selectOption('programme_staff');await p.waitForTimeout(200);await p.getByTestId('nu-submit').click();await p.waitForTimeout(1200);
const link3=await p.getByTestId('invite-link').inputValue();
await as('sadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1500);
await p.getByTestId('users-search').fill('uadmin');await p.waitForTimeout(300);
log('  sadmin sees manage uadmin:',await p.getByTestId('user-manage-uadmin').count());
await p.getByTestId('user-manage-uadmin').click();await p.waitForTimeout(300);await p.getByTestId('user-suspend-uadmin').click();await dlgOk();
const t2=await ctx.newPage();await t2.goto(link3);await t2.waitForTimeout(1500);log('  link3 while inviter suspended:',(await t2.locator('body').innerText()).split('\n').filter(l=>/ลิงก์|ยินดี/.test(l)).slice(0,2));await t2.close();
await p.getByTestId('user-reactivate-uadmin').click();D=await dlg();log('  reactivate uadmin dialog:',D.t,D.b);await shot('r03-reactivate-dialog');await D.d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(800);
const t3=await ctx.newPage();await t3.goto(link3);await t3.waitForTimeout(1500);log('  link3 after reactivate:',(await t3.locator('body').innerText()).split('\n').filter(l=>/ลิงก์|ยินดี/.test(l)).slice(0,2));await t3.close();
// sadmin view of uadmin cannot change own; check sadmin rows
log('  sadmin manage self:',await p.getByTestId('user-manage-sadmin').count());
log('errs',errs);await br.close();
