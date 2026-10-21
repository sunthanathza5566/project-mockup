import {session,txt,B} from './lib.mjs';
import fs from 'fs';
const cid=fs.readFileSync('cid.txt','utf8');
const {p,as,done}=await session();
await as('lect1');
const u=s=>B+`/app/sections/${encodeURIComponent(cid+'::'+s)}`;
await p.goto(u('3.2'));await p.waitForTimeout(700);
await p.getByTestId('narrative-th').fill('draft text ก');await p.waitForTimeout(3500);
console.log('save status after 3.5s:',await p.getByTestId('save-status').innerText());
await p.reload();await p.waitForTimeout(900);
console.log('after refresh text =',JSON.stringify(await p.getByTestId('narrative-th').inputValue()));
// type then refresh immediately
await p.getByTestId('narrative-th').fill('พิมพ์แล้วรีเฟรชทันที');await p.reload();await p.waitForTimeout(900);
console.log('immediate refresh text =',JSON.stringify(await p.getByTestId('narrative-th').inputValue()));
// new tab
const p2=await p.context().newPage();await p2.goto(u('3.2'));await p2.waitForTimeout(900);
console.log('TAB2 url',p2.url().replace(B,''));await p2.close();
// double submit
await p.getByTestId('narrative-th').fill('ข้อความ');await p.getByTestId('save-manual').click();await p.waitForTimeout(400);
await p.getByTestId('section-submit').dblclick();await p.waitForTimeout(800);
console.log('dialogs',await p.getByRole('dialog').count());
await p.getByRole('dialog').getByRole('button',{name:'ยืนยัน'}).dblclick().catch(e=>console.log('dbl err',e.message.slice(0,80)));await p.waitForTimeout(1000);
console.log('status',(await txt(p,3000)).match(/สถานะ: [^\n]*/)?.[0],'| versions',(await txt(p,4000)).match(/ประวัติเวอร์ชัน \(\d+\)/)?.[0]);
console.log('score disabled after submit',await p.getByTestId('self-score').isDisabled());
await p.getByTestId('self-score').selectOption('7');
await p.getByTestId('self-why').fill('เปลี่ยนหลังส่ง');
await p.getByTestId('self-save').click();await p.waitForTimeout(500);
console.log('toasts',await p.locator('[role=status]').allInnerTexts());
for(const path of ['/app/admin','/app/review','/app/cycles/cycle-demo-2569/assign','/app/sections/nonsense','/app/evidence/xxx','/zzz']){
  await p.goto(B+path);await p.waitForTimeout(900);
  console.log('TAMPER',path,'=>',p.url().replace(B,''),'|',(await txt(p,1800)).split('\n').slice(17,24).join('/'));
}
await p.screenshot({path:'shots/tamper-404.png'});
await done();
