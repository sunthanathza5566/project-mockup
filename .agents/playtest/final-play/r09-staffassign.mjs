import {session,B,txt,log} from './lib2.mjs';
const {br,p,as,errs}=await session({state:'st-r04.json'});
await as('staff1');await p.goto(B+'/app/cycles/cycle-demo-2569/assign');await p.waitForTimeout(1500);
log('=== r09 staff1 assign: disabled owner selects',await p.locator('[data-testid^="owner-"]').evaluateAll(es=>es.filter(e=>e.disabled).length),'of',await p.locator('[data-testid^="owner-"]').count());
log('  msg:',(await txt(p,3000)).split('\n').filter(l=>/สิทธิ์/.test(l)));
await br.close();
