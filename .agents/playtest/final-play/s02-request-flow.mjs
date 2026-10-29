import {session,B,txt,log} from './lib.mjs';
const {br,p,shot,save,errs,as}=await session();
const fill=async(o)=>{for(const [k,v] of Object.entries(o)){await p.getByTestId('ra-'+k).fill(v);}};
await p.goto(B+'/request-access');await p.waitForTimeout(700);
// wrong domain
await fill({name:'ทดสอบ คนนอก 😀',email:'someone@gmail.com',reason:'ขอใช้งาน test',username:'outsider1',password:'abcdefgh',password2:'abcdefgh'});
await p.getByTestId('ra-consent').check();
log('unit options after gmail:',await p.getByTestId('ra-unit').locator('option').allInnerTexts());
log('ra-email-uni:',await p.getByTestId('ra-email-uni').innerText().catch(e=>'(none)'));
await p.getByTestId('ra-submit').click();await p.waitForTimeout(700);
const t=await txt(p,4000); log('== gmail submit:', t.slice(t.indexOf('ขอเข้าใช้งาน'),t.indexOf('ข้อมูลของคุณ')+10));
await shot('04-ra-gmail',true);
// mismatch pw + 7 chars
await fill({email:'newbie@sample-uni.example',password:'abcdefg',password2:'abcdefx'});
await p.waitForTimeout(300);
log('ra-email-uni:',await p.getByTestId('ra-email-uni').innerText().catch(e=>'(none)'));
log('unit options:',await p.getByTestId('ra-unit').locator('option').allInnerTexts());
await p.getByTestId('ra-submit').click();await p.waitForTimeout(500);
const t2=await txt(p,4000); log('== short/mismatch:', t2.slice(t2.indexOf('ยังส่ง'),t2.indexOf('ข้อมูลของคุณ')));
// duplicate username/email
await fill({email:'lecturer1@sample-uni.example',username:'lect1',password:'abcdefgh',password2:'abcdefgh'});
await p.getByTestId('ra-submit').click();await p.waitForTimeout(700);
const t3=await txt(p,4000); log('== dup:', t3.slice(t3.indexOf('ระบบสาธิต'),t3.indexOf('ข้อมูลของคุณ')));
await shot('05-ra-dup',true);
await fill({name:'อ.ทดลอง ใจดี (Test) 😀',email:'Newbie.Teacher@Sample-Uni.Example',username:'NewBie1',position:'อาจารย์ประจำหลักสูตร',reason:'ช่วยเขียน SAR เกณฑ์ที่ 3'});
await p.getByTestId('ra-unit').selectOption({index:1}).catch(e=>log('unit select fail',e.message));
// double click submit
await p.getByTestId('ra-submit').dblclick();await p.waitForTimeout(1200);
log('== success:', await txt(p,1500));
await shot('06-ra-success',true);
// back button
await p.goBack();await p.waitForTimeout(800);log('after back URL',p.url(), (await txt(p,300)));
// login pending wrong pw and correct pw
await p.goto(B+'/login');await p.getByTestId('login-username').fill('newbie1');await p.getByTestId('login-password').fill('wrongpass');await p.getByTestId('login-submit').click();await p.waitForTimeout(900);
const l1=await txt(p,800);log('== pending wrong pw:',l1.slice(l1.indexOf('เข้าสู่ระบบ'),400));
await p.getByTestId('login-password').fill('abcdefgh');await p.getByTestId('login-submit').click();await p.waitForTimeout(900);
const l2=await txt(p,800);log('== pending right pw:',l2.slice(l2.indexOf('เข้าสู่ระบบ'),500));
await shot('07-login-pending');
// count users with newbie
log('pending rows:',await p.evaluate(()=>{const u=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('users'))));return u.filter(x=>x.username.toLowerCase().startsWith('newbie')).map(x=>({u:x.username,s:x.status,n:x.fullName}))}));
await save('st-ra1.json');
log('errs',errs);await br.close();
