// s3: lect1 เขียนข้อ 3.6 จาก home จนส่งตรวจ + P1 (แท็บใหม่) + P3 (refresh กลางพิมพ์) + P2 checklist + P5 h-scroll + P6
import { session, B, CY, sec, tid } from './lib.mjs';
const s = await session();
const { p, ctx } = s;
await s.as('lect1');
const todos = await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' :: ' + e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
console.log('TODOS', todos);
console.log('BELL/NOTI:', (await s.txt(2000)).match(/แจ้งเตือน[\s\S]{0,300}/)?.[0]);
await s.shot('lect-home');
const w = p.locator('[data-testid^="todo-write_section"]').first();
await w.getByRole('link').or(w.getByRole('button')).first().click(); s.act('todo เขียนข้อ');
await tid(p, 'sar-editor').waitFor();
await p.waitForTimeout(800);
console.log('URL', decodeURIComponent(p.url().replace(B, '')));
console.log('TOP:\n', (await s.txt(1400)));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log('P5 scrollWidth', sw);
await s.shot('lect-section-1');
// P2: ลองส่งตอนว่าง (ดู checklist)
const sub = tid(p, 'section-submit');
console.log('submit visible in viewport?', await sub.isVisible(), await sub.boundingBox());
await sub.click();
const dlg = p.getByRole('dialog');
await dlg.waitFor();
console.log('P2 DIALOG:\n', await dlg.innerText());
console.log('focused:', await p.evaluate(() => document.activeElement?.innerText));
await s.shot('lect-p2-checklist');
await dlg.getByRole('button', { name: /กลับไป|ยกเลิก/ }).first().click();
await p.waitForTimeout(400);
// ขั้น 1 ผูกหลักฐาน
await tid(p, 'link-search').fill('ปรับปรุง'); s.act('ค้นหาหลักฐาน');
await p.waitForTimeout(300);
const opts = await tid(p, 'link-select').locator('option').allInnerTexts();
console.log('link options', opts.length, opts.slice(0, 5));
await tid(p, 'link-select').selectOption({ index: 1 }); s.act('เลือกหลักฐาน');
await tid(p, 'link-btn').click(); s.act('ผูก');
await p.waitForTimeout(700);
console.log('linked:', (await tid(p, 'linked-evidence').innerText()).slice(0, 300));
// AI ร่าง
await tid(p, 'ai-draft').click(); s.act('AI ร่าง');
await tid(p, 'ai-result').waitFor({ timeout: 15000 });
await p.waitForTimeout(500);
console.log('AI RESULT:\n', (await tid(p, 'ai-result').innerText()).slice(0, 900));
await s.shot('lect-ai');
await tid(p, 'ai-accept').click(); s.act('ยอมรับร่าง');
await p.waitForTimeout(600);
const dl2 = p.getByRole('dialog');
if (await dl2.count()) { console.log('accept dialog:', await dl2.innerText()); await dl2.getByRole('button', { name: /^ยืนยัน|ใส่|ต่อท้าย/ }).first().click(); s.act('ยืนยันใส่'); }
// พิมพ์เพิ่ม + P3 refresh ทันที
const ta = tid(p, 'narrative-th');
const before = await ta.inputValue();
await ta.click(); await p.keyboard.type(' ข้อความทดสอบรีเฟรชทันที😀 Mixed ไทยEng');
await p.reload();
await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(800);
const after = await tid(p, 'narrative-th').inputValue();
console.log('P3 kept after instant reload?', after.includes('รีเฟรชทันที'), 'len before', before.length, 'after', after.length);
console.log('save-status', await tid(p, 'save-status').innerText().catch(() => '?'));
// P1: แท็บใหม่
const p2 = await ctx.newPage();
await p2.goto(p.url()); await p2.waitForTimeout(1500);
console.log('P1 new tab url', decodeURIComponent(p2.url().replace(B, '')), 'editor?', await p2.getByTestId('sar-editor').count());
// สองแท็บพิมพ์ชนกัน
await p2.getByTestId('narrative-th').fill(after + ' [จากแท็บ 2]'); await p2.waitForTimeout(2500);
await tid(p, 'narrative-th').fill(after + ' [จากแท็บ 1]'); await p.waitForTimeout(2500);
await p2.reload(); await p2.waitForTimeout(1500);
const t2 = await p2.getByTestId('narrative-th').inputValue();
console.log('2 tabs: final has tab1?', t2.includes('[จากแท็บ 1]'), 'tab2?', t2.includes('[จากแท็บ 2]'));
console.log('tab2 warning text:', (await p2.locator('main').innerText()).match(/.{0,50}(แท็บอื่น|เวอร์ชันใหม่|ถูกแก้).{0,60}/g));
await p2.close();
// PDCA + คะแนน
await p.reload(); await tid(p, 'sar-editor').waitFor(); await p.waitForTimeout(600);
const pd = p.locator('[data-testid^="pdca-"]');
console.log('pdca count', await pd.count(), await pd.evaluateAll(es => es.map(e => e.tagName + ':' + e.getAttribute('data-testid'))));
const first = pd.first();
if ((await first.evaluate(e => e.tagName)) === 'INPUT') { await first.check(); } else { await first.click(); }
s.act('PDCA');
const scoreOpts = await tid(p, 'self-score').locator('option').allInnerTexts();
console.log('score options', scoreOpts);
await tid(p, 'self-score').selectOption({ index: 4 }); s.act('คะแนน');
await tid(p, 'self-why').fill('มีการทบทวนรายวิชาทุกปีตามข้อมูลป้อนกลับ (สมมติ)'); s.act('เหตุผล');
await tid(p, 'self-save').click(); s.act('บันทึกคะแนน');
await p.waitForTimeout(800);
console.log('stepper:', (await p.locator('.aq-stepper, [aria-label*="ขั้น"]').first().innerText().catch(() => '?')).replace(/\s+/g, ' '));
// ส่ง (กดซ้ำเร็ว)
await tid(p, 'section-submit').click(); s.act('ส่งตรวจ');
const d3 = p.getByRole('dialog'); await d3.waitFor();
console.log('SUBMIT DIALOG:\n', await d3.innerText());
await s.shot('lect-submit-dialog');
const ok = d3.getByRole('button', { name: /^ยืนยัน/ });
await ok.dblclick().catch(() => {}); s.act('ยืนยันส่ง');
await p.waitForTimeout(1200);
console.log('TOAST', await p.locator('.aq-toast, [role=status]').allInnerTexts());
console.log('readonly:', await tid(p, 'readonly-reason').innerText().catch(() => '-'));
console.log('P6 self-save present:', await tid(p, 'self-save').count(), 'self-score disabled:', await tid(p, 'self-score').isDisabled().catch(() => '?'));
console.log('versions:', (await tid(p, 'versions').innerText().catch(() => '')).slice(0, 300));
await s.shot('lect-after-submit');
console.log('STATS', s.stats());
await s.done();
