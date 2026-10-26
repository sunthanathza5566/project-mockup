import {session,B,txt,log} from './lib.mjs';
const {br,p,as,shot}=await session();
await as('assess1');
for(const path of ['/app/actions','/app/metrics','/app/curriculum','/app/evidence']){await p.goto(B+path);await p.waitForTimeout(1500);log(path,(await p.locator('main').innerText()).replace(/\s+/g,' ').slice(100,600));}
await br.close();
