import { chromium } from '../../eduflow-next/node_modules/@playwright/test/index.mjs';
const BASE='http://localhost:3941', OUT='../.agents/screenshots/u0/';
const C='cycle-demo-2569';
const b=await chromium.launch();
const stats={};
async function collect(page,key){
  stats[key]=await page.evaluate(async()=>{
    await document.fonts.ready;
    const out={},small=[],btn=[];let overflow=document.documentElement.scrollWidth>innerWidth+1;
    document.querySelectorAll('body *').forEach(el=>{
      if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return;
      const k=`${s.fontFamily.split(',')[0]}|${s.fontSize}|${s.fontWeight}|lh ${(parseFloat(s.lineHeight)/parseFloat(s.fontSize)).toFixed(2)}`;
      out[k]=(out[k]||0)+1;
      if(parseFloat(s.fontSize)<13)small.push(el.textContent.trim().slice(0,20)+' '+s.fontSize);
    });
    document.querySelectorAll('button,a.aq-btn,.dash-tab-btn,input,select').forEach(el=>{const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.height<44||r.width<44))btn.push(`${el.tagName}.${(el.className+'').split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent||el.name||'').trim().slice(0,15)}"`)});
    return{fonts:out,smallN:small.length,smallEx:small.slice(0,5),smallBtn:btn.length,btnEx:btn.slice(0,6),overflow,loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+f.weight)};
  });
}
async function shot(page,name,vp){await page.waitForTimeout(500);await page.screenshot({path:`${OUT}${name}-${vp}.png`,fullPage:true});await collect(page,name+'-'+vp);}
for(const [vp,w,h] of [['d',1440,900],['m',390,844]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},locale:'th-TH'});
  const page=await ctx.newPage();
  await page.goto(BASE+'/');await shot(page,'01-landing',vp);
  await page.goto(BASE+'/login');await shot(page,'02-login',vp);
  await page.getByText(/บัญชีตัวอย่าง|บัญชีเดโม|Demo/).first().click().catch(()=>{});await page.waitForTimeout(300);await page.screenshot({path:`${OUT}02b-login-demo-${vp}.png`,fullPage:true});
  // error state
  await page.getByTestId('login-username').fill('chair1');await page.getByTestId('login-password').fill('wrong');await page.getByTestId('login-submit').click();await page.waitForTimeout(1500);await page.screenshot({path:`${OUT}02c-login-error-${vp}.png`,fullPage:true});
  await page.getByTestId('login-password').fill('demo1234');await page.getByTestId('login-submit').click();
  await page.waitForTimeout(350);await page.screenshot({path:`${OUT}03-login-loader-${vp}.png`});
  await page.waitForURL('**/app',{timeout:30000});
  const routes=[['04-app','/app'],['05-requirements','/app/requirements'],['06-cycles','/app/cycles'],['07-cycle-dash','/app/cycles/'+C],['08-assign','/app/cycles/'+C+'/assign'],['09-section','/app/sections/'+encodeURIComponent(C+'::aun-1')],['10-evidence','/app/evidence'],['12-metrics','/app/metrics'],['13-actions','/app/actions'],['14-assess','/app/cycles/'+C+'/assess'],['15-review','/app/review'],['16-export','/app/export'],['17-admin','/app/admin']];
  for(const [n,u] of routes){try{await page.goto(BASE+u);await page.waitForLoadState('networkidle');await shot(page,n,vp);}catch(e){console.log('ERR',n,e.message)}}
  // evidence detail
  await page.goto(BASE+'/app/evidence');await page.waitForTimeout(600);
  const l=page.locator('a[href^="/app/evidence/"]').first();if(await l.count()){await l.click();await page.waitForLoadState('networkidle');await shot(page,'11-evidence-detail',vp);}
  await page.goto(BASE+'/app/curriculum');
  for(const t of ['plo','course','matrix','heat','gaps','prereq','ai']){await page.getByTestId('cur-tab-'+t).click();await shot(page,'cur-'+t,vp);}
  // section: find a real link from cycle dash
  await page.goto(BASE+'/app/cycles/'+C);await page.waitForTimeout(600);
  const sl=page.locator('a[href^="/app/sections/"]').first();if(await sl.count()){await sl.click();await page.waitForLoadState('networkidle');await shot(page,'09b-section-real',vp);}
  // focus state
  await page.goto(BASE+'/app/cycles');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.screenshot({path:`${OUT}18-focus-${vp}.png`});
  // logout
  await page.getByTestId('logout').click();await page.waitForTimeout(500);await page.screenshot({path:`${OUT}19-logout-loader-${vp}.png`});
  await ctx.close();
}
const fs=await import('fs');fs.writeFileSync('../.agents/playtest/u0-stats.json',JSON.stringify(stats,null,1));
await b.close();
