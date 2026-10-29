// Two assessors: ass2 finishes first (what does he see?), then assess1 completes -> chair results
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-r04.json'});
const {panel,openNoti,dlgOk}=helpers(p);
log('=== r06 assess finish (2 assessors)');
await as('ass2','abcdefgh');await p.goto(B+'/app/cycles/cycle-demo-2569/assess');await p.waitForTimeout(1500);
log('  finish enabled:',await p.getByTestId('assess-finish').isEnabled());
await p.getByTestId('assess-finish').click();await dlgOk();await p.waitForTimeout(400);
log('  toasts:',await p.locator('[data-sonner-toast]').allInnerTexts().catch(()=>[]),'| alerts:',(await p.locator('[role="alert"]').allInnerTexts()).map(s=>s.replace(/\s+/g,' ')).slice(0,3));
await shot('r06-ass2-finish-error');
await as('assess1');await openNoti(/ประเมิน/);
for(let c=1;c<=8;c++){await p.getByTestId('assess-crit-'+c).click();await p.getByTestId('crit-score').selectOption('4');await p.getByTestId('crit-why').fill('เกณฑ์ '+c+' OK');await p.getByTestId('crit-save').click();await p.waitForTimeout(300);}
log('  assess1 verdict already set? ',await p.getByTestId('verdict-score').inputValue());
await p.getByTestId('verdict-score').selectOption('5');await p.getByTestId('verdict-why').fill('ดี');await p.getByTestId('verdict-save').click();await p.waitForTimeout(400);
await p.getByTestId('assess-finish').click();await dlgOk();
log('  after finish:',(await p.getByTestId('assess-notopen').innerText().catch(()=>'-')).replace(/\s+/g,' '));
await as('chair1');log('  chair panel:',(await panel()).slice(0,300));await openNoti(/ส่งผล|ผลการประเมิน/);
log('  chair page h1:',await p.locator('main h1').first().innerText());
await as('ass2','abcdefgh');log('  ass2 panel:',(await panel()).slice(0,250));
log('errs',errs);await br.close();
