import {session,B,txt,log} from './lib.mjs';
const {br,p,shot,save,errs}=await session();
await p.goto(B+'/login');await p.waitForTimeout(800);
log('== login page text'); log(await txt(p,1500));
await shot('01-login');
await p.getByTestId('login-request-access').click();await p.waitForURL('**/request-access');await p.waitForTimeout(600);
log('== request-access text'); log(await txt(p,3000));
await shot('02-request-access',true);
// submit empty
await p.getByTestId('ra-submit').click();await p.waitForTimeout(500);
log('== after empty submit'); log(await txt(p,3000));
log('focused:',await p.evaluate(()=>document.activeElement?.outerHTML.slice(0,200)));
await shot('03-ra-empty',true);
await save('st-ra0.json');
log('errs',errs);
await br.close();
