import { chromium } from '../../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
export const B='http://localhost:3960';
export const SHOT='../../screenshots/TASK-0002/';
export const txt=async(p,n=2500)=>(await p.locator('body').innerText()).slice(0,n);
export const log=(...a)=>{console.log(...a);fs.appendFileSync('recheck.log',a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');};
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
export function helpers(p){
  const panel=async()=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const t=(await p.getByTestId('noti-panel').innerText()).replace(/\s+/g,' ');await p.keyboard.press('Escape');return t.slice(0,700);};
  const openNoti=async(re)=>{await p.getByTestId('nav-bell').click();await p.waitForTimeout(400);const it=p.locator('[data-testid^="noti-item-"]').filter({hasText:re}).first();if(!await it.count()){log('  !! no noti matching',String(re));await p.keyboard.press('Escape');return false;}const lab=(await it.innerText()).replace(/\s+/g,' ');await it.click();await p.waitForTimeout(1400);log('  noti "'+lab.slice(0,170)+'" -> '+p.url().replace(B,''));return true;};
  const dlgOk=async(note,btn=/^ยืนยัน/)=>{const d=p.getByRole('dialog');await d.waitFor();log('  dialog:',(await d.innerText()).replace(/\s+/g,' ').slice(0,300));if(note!==undefined)await d.locator('textarea').fill(note);await d.getByRole('button',{name:btn}).click();await p.waitForTimeout(900);};
  const cycleBtns=async()=>(await p.locator('[data-testid^="cycle-to-"]').evaluateAll(es=>es.map(e=>e.dataset.testid+':'+e.innerText.trim()))).join(' | ');
  const sec=r=>B+'/app/sections/'+encodeURIComponent('cycle-demo-2569::'+r);
  const toast=async()=>(await p.locator('[data-sonner-toast],[role="status"]').allInnerTexts().catch(()=>[])).map(s=>s.replace(/\s+/g,' ')).filter(Boolean).slice(-3);
  return {panel,openNoti,dlgOk,cycleBtns,sec,toast};
}
