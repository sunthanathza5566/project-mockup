import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
await as('lect1');
// home: "เพิ่มหลักฐาน" button
await p.getByRole('link',{name:'เพิ่มหลักฐาน'}).first().click().catch(async()=>await p.getByRole('button',{name:'เพิ่มหลักฐาน'}).first().click());
await p.waitForTimeout(1500);log('add evidence ->',p.url().replace(B,''),'form visible',await p.getByTestId('ev-title').isVisible().catch(()=>false));
if(!await p.getByTestId('ev-title').isVisible().catch(()=>false)){await p.getByTestId('ev-new').click();await p.waitForTimeout(500);}
await shot('60-evidence-form',true);
// submit empty
await p.getByTestId('ev-submit').click();await p.waitForTimeout(500);
log('empty ev msgs:',(await txt(p,12000)).split('\n').filter(l=>/กรุณา|ต้อง|อย่างน้อย/.test(l)).slice(0,5));
await p.getByTestId('ev-title').fill('รายงานประชุม กก.หลักสูตร 3/2568 (Meeting) 😀 '+'ยาว'.repeat(150));
await p.getByTestId('ev-text').fill('เลขบัตร 1101700230705 ของนักศึกษา');
// switch language mid form
await p.getByTestId('lang-en').click();await p.waitForTimeout(800);
log('after EN: title kept?',(await p.getByTestId('ev-title').inputValue()).slice(0,20),'| labels:',(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,300));
await shot('61-evidence-form-en',false);
// theme dark mid form via user menu
await p.getByTestId('user-menu').click();await p.waitForTimeout(400);
log('user menu EN:',(await p.getByTestId('user-menu-panel').innerText()).replace(/\s+/g,' '));
await p.getByTestId('theme-segment-dark').click();await p.waitForTimeout(400);
const sizeBtns=p.getByTestId('user-menu-panel').getByRole('radio');log('radios',await sizeBtns.allInnerTexts().catch(()=>[]));
await p.getByTestId('user-menu-panel').getByText(/Extra large|ใหญ่มาก/).click().catch(e=>log('size click fail',e.message.slice(0,80)));
await p.waitForTimeout(400);await p.keyboard.press('Escape');
log('form still has title',(await p.getByTestId('ev-title').inputValue()).slice(0,15),'scrollW',await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]));
await shot('62-evidence-dark-xl',false);
await p.getByTestId('lang-th').click();await p.waitForTimeout(500);
await p.getByTestId('ev-f-reqs-input').fill('1.1');await p.getByTestId('ev-f-req-opt-1.1').click();
await p.getByTestId('ev-submit').click();await p.waitForTimeout(1500);
log('after submit:',(await txt(p,15000)).split('\n').filter(l=>/บันทึก|เพิ่ม|PII|ส่วนบุคคล|ยาว|ไม่เกิน/.test(l)).slice(0,6));
await shot('63-evidence-after-submit',false);
// reset prefs
await p.getByTestId('user-menu').click();await p.getByTestId('theme-segment-light').click();await p.getByTestId('user-menu-panel').getByText(/^ปกติ$/).click().catch(()=>{});await p.keyboard.press('Escape');
await save('st-ev.json');
log('errs',errs);await br.close();
