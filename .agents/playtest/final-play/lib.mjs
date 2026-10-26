import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
export const B='http://localhost:3950';
export const SHOT='../../screenshots/TASK-0002/';
export const txt=async(p,n=2500)=>(await p.locator('body').innerText()).slice(0,n);
export const log=(...a)=>{console.log(...a);fs.appendFileSync('run.log',a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');};
export async function session(opts={}){
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:opts.vp||{width:1366,height:820},locale:'th-TH',acceptDownloads:true,...(opts.state&&fs.existsSync(opts.state)?{storageState:opts.state}:{})});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
  const as=async(u,pw='demo1234')=>{await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.clear());await p.goto(B+'/login');
   await p.getByTestId('login-username').fill(u);await p.getByTestId('login-password').fill(pw);await p.getByTestId('login-submit').click();await p.waitForURL('**/app',{timeout:15000});await p.waitForTimeout(700);};
  const shot=async(n,full=false)=>{await p.screenshot({path:SHOT+'play-'+n+'.png',fullPage:full});};
  const save=async(f)=>{await ctx.storageState({path:f});};
  return {br,ctx,p,as,shot,save,errs};
}
