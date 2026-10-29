// Debug: after ass2 submitted, cycle status + who got notifications
import {session,B,txt,log,helpers} from './lib2.mjs';
const {br,ctx,p,shot,save,errs,as}=await session({state:'st-r04.json'});
const {panel,cycleBtns}=helpers(p);
log('=== r05 dbg assess');
await p.goto(B+'/login');
const dump=await p.evaluate(()=>{const o={};for(const k of Object.keys(localStorage)){if(/cycle|noti|assess/i.test(k)){const v=localStorage.getItem(k);o[k]=v.length;}}return o;});
log('  keys',dump);
const info=await p.evaluate(()=>{
  const get=re=>{const k=Object.keys(localStorage).find(k=>re.test(k));return k?JSON.parse(localStorage.getItem(k)):null;};
  const cyc=get(/cycles/i);const c=Array.isArray(cyc)?cyc.find(x=>x.id==='cycle-demo-2569'):cyc;
  const notis=get(/noti/i)||[];
  const arr=Array.isArray(notis)?notis:Object.values(notis).flat();
  return {status:c?.status,assessors:c?.assessorIds||c?.assessors,last:arr.slice(-8).map(n=>({to:n.userId||n.recipientId,m:(n.messageTh||'').slice(0,80)}))};
});
log('  info',info);
await as('ass2','abcdefgh');await p.goto(B+'/app/cycles/cycle-demo-2569/assess');await p.waitForTimeout(1500);
log('  ass2 assess page:',(await txt(p,3000)).replace(/\s+/g,' ').slice(300,1100));
await shot('r05-ass2-after-finish',false);
await as('chair1');await p.goto(B+'/app/cycles/cycle-demo-2569');await p.waitForTimeout(1300);
log('  chair cycle status line:',(await txt(p,3000)).split('\n').filter(l=>/สถานะ|ประเมิน/.test(l)).slice(0,6));
await p.goto(B+'/app/cycles/cycle-demo-2569/assess');await p.waitForTimeout(1300);
log('  chair assess page:',(await txt(p,3000)).replace(/\s+/g,' ').slice(300,900));
await as('assess1');log('  assess1 panel:',await panel());
await p.goto(B+'/app/cycles/cycle-demo-2569/assess');await p.waitForTimeout(1300);
log('  assess1 page:',(await txt(p,3000)).replace(/\s+/g,' ').slice(300,900));
log('errs',errs);await br.close();
