import {session,txt,B} from './lib.mjs';
import ExcelJS from '../../eduflow-next/node_modules/exceljs/lib/exceljs.nodejs.js';
const {p,as,done}=await session();
await as('data1');
await p.goto(B+'/app/metrics');await p.waitForTimeout(800);
await p.getByText('นำเข้าจากไฟล์ Excel',{exact:true}).click();await p.waitForTimeout(500);
await p.screenshot({path:'shots/data-import-panel.png'});
console.log('PANEL',(await p.getByTestId('import-panel').innerText()).replace(/\n/g,'|'));
const [dl]=await Promise.all([p.waitForEvent('download'),p.getByTestId('metric-template').click()]);
await dl.saveAs('metrics-template.xlsx');
const wb=new ExcelJS.Workbook();await wb.xlsx.readFile('metrics-template.xlsx');
const ws=wb.getWorksheet('metrics')||wb.worksheets[0];console.log('sheets',wb.worksheets.map(w=>w.name),ws.getRow(1).values);
const mk=async(name,rows)=>{const w=new ExcelJS.Workbook();await w.xlsx.readFile('metrics-template.xlsx');const s=w.getWorksheet('metrics')||w.worksheets[0];
  const n=s.rowCount;for(let i=n;i>=2;i--)s.spliceRows(i,1);rows.forEach(r=>s.addRow(r));await w.xlsx.writeFile(name);};
await mk('m-good.xlsx',[['pass_rate',2570,80,85,82,'ตัวอย่าง'],['intake',2570,75]]);
await mk('m-bad.xlsx',[['pass_rate',2571,-5],['pass_rate',2571,50],['nonexist',2570,3],['intake','abc',3],['dropout_rate',2570,150]]);
async function imp(f){
  await p.getByTestId('metric-file').setInputFiles(f);await p.waitForTimeout(1200);
  console.log('PREVIEW',f,(await p.getByTestId('import-panel').innerText()).replace(/\n/g,'|').slice(300,1800));
  await p.screenshot({path:`shots/data-preview-${f}.png`});
}
let c=0;
await imp('m-bad.xlsx');
console.log('commit enabled w/ errors?',await p.getByTestId('metric-commit').isEnabled().catch(()=>'no btn'));
await p.getByTestId('metric-cancel').click().catch(()=>{});
await imp('m-good.xlsx');
await p.getByTestId('metric-commit').click();await p.waitForTimeout(900);
console.log('toast',await p.locator('[role=status]').allInnerTexts());
await p.screenshot({path:'shots/data-after-commit.png'});
// wrong file type
await p.getByText('นำเข้าจากไฟล์ Excel',{exact:true}).click().catch(()=>{});
await p.getByTestId('metric-file').setInputFiles('ev-small.txt').catch(e=>console.log('txt rejected',e.message.slice(0,60)));await p.waitForTimeout(800);
console.log('txt result',(await p.getByTestId('import-panel').innerText().catch(()=>'')).replace(/\n/g,'|').slice(300,700),await p.locator('[role=status],[data-testid=metric-import-error]').allInnerTexts());
await done();
