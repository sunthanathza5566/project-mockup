import {session,B,txt,log} from './lib.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-inv1.json'});
await as('uadmin');await p.goto(B+'/app/admin');await p.waitForTimeout(1000);
log('before:',await p.getByTestId('user-suspend-lect1').count(), p.url());
const l=await ctx.newPage();await l.goto(B+'/login');await l.getByTestId('login-username').fill('lect1');await l.getByTestId('login-password').fill('demo1234');await l.getByTestId('login-submit').click();await l.waitForURL('**/app');await l.waitForTimeout(1000);
log('after lect1 login in other tab:',await p.getByTestId('user-suspend-lect1').count(), p.url());
log((await txt(p,600)));
log('errs',errs);await br.close();
