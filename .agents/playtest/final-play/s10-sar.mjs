import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session();
const openNoti=async(re)=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const it=p.locator('[data-testid^="noti-item-"]').filter({hasText:re}).first();const lab=(await it.innerText()).replace(/\s+/g,' ');await it.click();await p.waitForTimeout(1400);log('  noti "'+lab.slice(0,110)+'" -> '+p.url().replace(B,''));};
const dlgOk=async(note)=>{const d=p.getByRole('dialog');await d.waitFor();log('  dialog:',(await d.innerText()).replace(/\s+/g,' ').slice(0,200));if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:/^ยืนยัน/}).click();await p.waitForTimeout(800);};
// A chair assigns via home todo
await as('chair1');
await p.getByText('มอบหมายผู้เขียน').first().locator('xpath=ancestor::li[1]').getByRole('link').first().click().catch(async()=>{await p.getByRole('link',{name:'ไปทำ'}).nth(1).click();});
await p.waitForTimeout(1200);log('A chair todo->',p.url().replace(B,''));
await shot('30-chair-assign',false);
const sel=p.getByTestId('owner-3.6');log('owner options:',(await sel.locator('option').allInnerTexts()).join(' / '));
await sel.selectOption({label:'อ.ธนา สอนดี'});await p.waitForTimeout(800);
log('  after select feedback:',(await txt(p,8000)).split('\n').filter(l=>/บันทึก|มอบหมาย.*แล้ว/.test(l)).slice(0,3));
await save('st-s10a.json');
// B lect1
await as('lect1');await openNoti(/3\.6/);
await shot('31-lect-section',false);
const ed=p.getByTestId('narrative-th');log('  editor visible',await ed.isVisible().catch(()=>false));
await ed.click();await ed.fill('หลักสูตรมีระบบติดตามผู้เรียน (Student tracking) อย่างต่อเนื่อง 😀 ตัวเลข -5 ทดสอบ <script>alert(1)</script> & "quote" ');
await p.waitForTimeout(2500);log('  save-status:',await p.getByTestId('save-status').innerText().catch(()=>'?'));
// attach evidence
const ls=p.getByTestId('link-select');if(await ls.count()){const opts=await ls.locator('option').allInnerTexts();log('  link options',opts.length,opts.slice(0,3));await ls.selectOption({index:1});await p.getByTestId('link-btn').click();await p.waitForTimeout(800);log('  linked:',(await p.getByTestId('linked-evidence').innerText()).replace(/\s+/g,' ').slice(0,200));} else log('  no link-select');
await p.reload();await p.waitForTimeout(1500);log('  after reload narrative contains:',(await p.getByTestId('narrative-th').inputValue().catch(async()=>await p.getByTestId('narrative-th').innerText())).slice(0,60));
await p.getByTestId('section-submit').click();await dlgOk();
log('  status:',await p.getByTestId('section-status').innerText().catch(()=>'?'),'| readonly:',await p.getByTestId('readonly-reason').innerText().catch(()=>'-'));
await shot('32-lect-submitted');
// C chair: return with comment
await as('chair1');await openNoti(/3\.6/);
await p.getByTestId('comment-body').fill('ช่วยเพิ่มตัวเลขอัตราคงอยู่ปี 2568 ด้วยครับ');await p.getByTestId('comment-add').click();await p.waitForTimeout(800);
await p.getByTestId('section-return').click();await dlgOk('ขาดตัวเลขอัตราคงอยู่');
log('  status after return:',await p.getByTestId('section-status').innerText().catch(()=>'?'));
await save('st-s10c.json');
await as('lect1');
await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);log('  lect1 panel:',(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' '));await p.keyboard.press('Escape');
await openNoti(/ความเห็น|comment/i);
log('  comments visible?',await p.getByTestId('comments').isVisible().catch(()=>false),'inViewport',await p.getByTestId('comments').evaluate(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).catch(()=>'?'));
await shot('33-lect-comment-deeplink');
await p.getByTestId('narrative-th').fill('หลักสูตรมีระบบติดตามผู้เรียน อัตราคงอยู่ปี 2568 = 92% [ตัวอย่าง]');await p.waitForTimeout(2200);
await p.getByTestId('section-submit').click();await dlgOk();
await as('chair1');await openNoti(/3\.6/);
await p.getByTestId('section-approve').click();await p.waitForTimeout(1000);
const d=p.getByRole('dialog');if(await d.count()){log('approve dialog',await d.innerText());}
log('  status after approve:',await p.getByTestId('section-status').innerText().catch(()=>'?'));
await as('lect1');await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);log('  lect1 panel2:',(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ').slice(0,500));
await save('st-s10.json');
log('errs',errs);await br.close();
