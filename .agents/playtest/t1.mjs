import {start,login,txt,B} from './lib.mjs';
const br=await start();const {p}=await login(br,'staff1');
await p.getByRole('link',{name:'หลักฐาน'}).click();await p.waitForTimeout(800);
console.log(p.url());console.log(await txt(p,2500));
await p.screenshot({path:'shots/evidence-list.png'});
await p.getByTestId('ev-new').click();await p.waitForTimeout(500);
console.log('---FORM---');console.log(await txt(p,3000));
await p.screenshot({path:'shots/evidence-form.png',fullPage:true});
await br.close();
