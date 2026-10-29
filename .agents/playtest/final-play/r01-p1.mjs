// Re-check P1: evidence on locked sections (unlink / link more / new from ?req=)
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const {sec,toast}=helpers(p);
log('=== r01 P1');
const sidePanel=async(u,r)=>{
  await p.goto(sec(r));await p.waitForTimeout(1500);
  const st=await p.getByTestId('section-status').innerText().catch(()=>'?');
  const x=await p.locator('#sidepanel-evidence button[aria-label^="เลิกผูก"]').count();
  const lockMsg=await p.getByTestId('evidence-locked-reason').innerText().catch(()=>'-');
  const ls=await p.getByTestId('link-select').count();
  const up=await p.getByRole('link',{name:/อัปโหลดหลักฐานใหม่สำหรับข้อนี้/}).count();
  log(`  ${u} ${r} status=${st} x=${x} link-select=${ls} upload-link=${up} lock="${lockMsg}"`);
  return {x,ls,up};
};
await as('staff1');
await sidePanel('staff1','1.1');await shot('r01-staff1-11-locked');
// positive control: a drafting/not_started section owned by staff1
for(const r of ['5.1','7.9'])await sidePanel('staff1',r);
await as('chair1');
await sidePanel('chair1','1.5');await shot('r01-chair1-15-locked');
// evidence detail page: find evidence linked to 1.1
await as('staff1');
await sidePanel('staff1','1.1');
const evHref=await p.locator('[data-testid="linked-evidence"] a').first().getAttribute('href');
log('  ev href',evHref);
await p.goto(B+evHref);await p.waitForTimeout(1500);
log('  ev detail links:',(await p.getByTestId('ev-links').innerText().catch(()=>'-')).replace(/\s+/g,' ').slice(0,300));
log('  ev detail unlink x count:',await p.locator('[data-testid="ev-links"] button[aria-label^="เลิกผูก"]').count());
log('  ev-link-locked rows:',await p.locator('[data-testid^="ev-link-locked-"]').count(),'cycle lock:',await p.getByTestId('ev-link-locked').innerText().catch(()=>'-'));
// try link more to 1.5 (ready_for_review) via picker on detail page
const inp=p.getByTestId('ev-link-reqs-input');
if(await inp.count()){
  await inp.click();await inp.fill('1.5');await p.waitForTimeout(400);
  const opt=p.getByTestId('ev-link-req-opt-1.5');
  log('  picker opt 1.5 aria-disabled:',await opt.getAttribute('aria-disabled').catch(()=>'-'),'text:',(await opt.innerText().catch(()=>'-')).replace(/\s+/g,' '));
  await opt.click().catch(e=>log('  click err',e.message.slice(0,80)));await p.waitForTimeout(400);
  log('  chip 1.5?',await p.getByTestId('ev-link-req-chip-1.5').count(),'blocked:',await p.getByTestId('ev-link-blocked').innerText().catch(()=>'-'),'btn disabled:',await p.getByTestId('ev-link-btn').isDisabled().catch(()=>'-'));
  await shot('r01-ev-detail-picker');
} else log('  no ev-link-reqs-input; testids:',await p.locator('[data-testid^="ev-link"]').evaluateAll(es=>es.map(e=>e.dataset.testid)));
// new evidence form with ?req=1.1
const rowsBefore=await (async()=>{await p.goto(B+'/app/evidence?cycle=cycle-demo-2569');await p.waitForTimeout(1500);return p.locator('[data-testid^="ev-row-"]').count();})();
await p.goto(B+'/app/evidence?new=1&cycle=cycle-demo-2569&req=1.1');await p.waitForTimeout(1800);
log('  ?req=1.1 blocked msg:',await p.getByTestId('ev-f-req-blocked').innerText().catch(()=>'-'));
log('  chips:',await p.locator('[data-testid^="ev-f-req-chip-"]').evaluateAll(es=>es.map(e=>e.dataset.testid)));
await p.getByTestId('ev-title').fill('ทดสอบหลักฐานล็อก 1.1 Test 😀');
const txtTab=p.getByRole('tab',{name:/ข้อความ/});if(await txtTab.count()){await txtTab.click();await p.waitForTimeout(200);}
if(await p.getByTestId('ev-text').count())await p.getByTestId('ev-text').fill('เนื้อหาปลอมเพื่อทดสอบ');
await shot('r01-new-req11-before');
await p.getByTestId('ev-submit').click();await p.waitForTimeout(1200);
log('  after submit summary:',(await p.getByTestId('ev-error-summary').innerText().catch(()=>'-')).replace(/\s+/g,' '),'focused:',await p.evaluate(()=>document.activeElement?.getAttribute('data-testid')||document.activeElement?.tagName));
await shot('r01-new-req11-after');
// remove chip 1.1, add 3.6? 3.6 at seed — check; then submit
const rm=p.getByRole('button',{name:/เอาข้อ 1\.1 ออก/});log('  remove btn',await rm.count());
if(await rm.count()){await rm.click();await p.waitForTimeout(300);}
await p.getByTestId('ev-submit').click();await p.waitForTimeout(1500);
log('  after remove+submit url',p.url().replace(B,''),'toast',await toast(),'summary',(await p.getByTestId('ev-error-summary').innerText().catch(()=>'-')).replace(/\s+/g,' ').slice(0,200));
await p.goto(B+'/app/evidence?cycle=cycle-demo-2569');await p.waitForTimeout(1500);
log('  rows before',rowsBefore,'after',await p.locator('[data-testid^="ev-row-"]').count());
// new-form picker: type 1.1 and click
await p.goto(B+'/app/evidence?new=1&cycle=cycle-demo-2569');await p.waitForTimeout(1500);
const fi=p.getByTestId('ev-f-reqs-input');await fi.click();await fi.fill('1.');await p.waitForTimeout(400);
const o11=p.getByTestId('ev-f-req-opt-1.1');
log('  form opt 1.1 aria-disabled:',await o11.getAttribute('aria-disabled').catch(()=>'-'),'| text:',(await o11.innerText().catch(()=>'-')).replace(/\s+/g,' '));
await o11.click().catch(()=>{});await p.waitForTimeout(300);
log('  chip 1.1 after click:',await p.getByTestId('ev-f-req-chip-1.1').count(),'| note:',await p.getByTestId('ev-f-reqs-locked-note').innerText().catch(()=>'-'));
await shot('r01-form-picker-locked');
log('errs',errs);await br.close();
