import {start,login,txt,B} from './lib.mjs';
const br=await start();const {p}=await login(br,'staff1');
let clicks=0;const t0=Date.now();
await p.getByRole('link',{name:'หลักฐาน'}).click();clicks++;
await p.getByTestId('ev-new').click();clicks++;
await p.getByTestId('ev-title').fill('ประกาศ PLO ปี 2569 test');
await p.getByTestId('ev-file').setInputFiles('ev-small.txt');clicks++;
// select requirement 1.2 in multi-select
await p.getByTestId('ev-f-reqs').selectOption({label:/^1\.2 /.test?undefined:undefined}).catch(()=>{});
const opts=await p.getByTestId('ev-f-reqs').locator('option').allTextContents();
const o=opts.find(t=>t.startsWith('1.2 '));await p.getByTestId('ev-f-reqs').selectOption({label:o});clicks++;
await p.getByTestId('ev-submit').click();clicks++;
await p.waitForTimeout(700);
console.log('clicks',clicks,'ms',Date.now()-t0);
console.log((await txt(p,6000)).split('\n').filter(l=>/test|สำเร็จ|บันทึก|ผิด|ต้อง|error/i.test(l)).join('\n'));
await p.screenshot({path:'shots/ev-after-submit.png'});
// big file
await p.getByTestId('ev-new').click();
await p.getByTestId('ev-title').fill('big');
await p.getByTestId('ev-file').setInputFiles('ev-big.bin');
await p.getByTestId('ev-submit').click();await p.waitForTimeout(1500);
console.log('BIG:',(await txt(p,4000)).split('\n').filter(l=>/big|MB|ใหญ่|เกิน|ผิด|ต้อง|ไม่สามารถ|error/i.test(l)).join('|'));
await p.screenshot({path:'shots/ev-big.png'});
// empty title
await p.reload();await p.waitForTimeout(800);
await p.getByTestId('ev-new').click();await p.getByTestId('ev-submit').click();await p.waitForTimeout(500);
console.log('EMPTY:',(await txt(p,4000)).split('\n').filter(l=>/ต้อง|กรอก|ระบุ|ชื่อ/.test(l)).join('|'));
await p.screenshot({path:'shots/ev-empty.png'});
await br.close();
