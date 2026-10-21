import { chromium } from '../../eduflow-next/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
export const B='http://localhost:3961';
export const txt=async(p,n=1800)=>(await p.locator('body').innerText()).slice(0,n);
export async function session(opts={}){
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:{width:1366,height:800},locale:'th-TH',acceptDownloads:true,...(fs.existsSync('state.json')&&!opts.fresh?{storageState:'state.json'}:{})});
  const p=await ctx.newPage();
  const as=async(u,pw='demo1234')=>{await p.goto(B+'/login');await p.evaluate(()=>sessionStorage.removeItem('aunqa_session'));await p.goto(B+'/login');
   await p.getByTestId('login-username').fill(u);await p.getByTestId('login-password').fill(pw);await p.getByTestId('login-submit').click();await p.waitForURL('**/app');await p.waitForTimeout(600);};
  const done=async()=>{await ctx.storageState({path:'state.json'});await br.close();};
  return {br,ctx,p,as,done};
}
