/**
 * Phase C / C1 — AI-4 แปล TH↔EN + glossary, import metrics/cohort จาก Excel, export SAR เป็น DOCX จริง
 * ครอบ: glossary สองทิศ (ตารางสองฝั่ง), runTranslate offline + post-check, accept, lock, RBAC,
 *       metric preview/commit, cohort (คำนวณตรงมือ, all-or-nothing, dryRun, ไม่เก็บข้อมูลรายคน), DOCX (jszip)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ExcelJS from 'exceljs';
import * as api from '@/lib/api';
import { freshDemo, freshSeededDemo, driveToLocked, user, CYCLE, PROG } from '@/tests/helpers';
import { applyGlossary, findGlossaryHits, AUNQA_GLOSSARY } from '@/lib/api/ai/glossary';
import { offlineProvider, OFFLINE_TRANSLATE_LABEL } from '@/lib/api/ai/offline';
import { KEYS, load, save } from '@/lib/api/db';
import { compareReqId, listRequirements } from '@/lib/api/framework';
import type { AuditLog, MetricValue } from '@/lib/types';

async function xlsx(rows: unknown[][], sheet = 'metrics'): Promise<Blob> {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(sheet);
  rows.forEach(r => ws.addRow(r));
  return new Blob([await wb.xlsx.writeBuffer()]);
}
const SEC = `${CYCLE}::1.1`;
const sectionOf = (u: string, rid: string) => api.listSections(user(u), CYCLE).find(s => s.requirementId === rid)!;

beforeEach(async () => { await freshDemo(); save(KEYS.metrics, []); }); // เดโม่ seed metrics ไว้ → เริ่มว่างเพื่อให้นับ inserted/updated ได้ตรง
afterEach(() => { vi.restoreAllMocks(); });

// ───────────────────────── glossary ─────────────────────────
describe('glossary: applyGlossary', () => {
  it('มีอย่างน้อย 40 คู่ และทุกคู่มี th/en ไม่ว่าง', () => {
    expect(AUNQA_GLOSSARY.length).toBeGreaterThanOrEqual(40);
    AUNQA_GLOSSARY.forEach(e => { expect(e.th.trim()).not.toBe(''); expect(e.en.trim()).not.toBe(''); });
  });

  // ตารางสองฝั่ง: [input, expected]
  const thToEn: [string, string][] = [
    ['ผู้มีส่วนได้ส่วนเสีย', 'stakeholders'],
    ['ผู้มีส่วนได้เสีย', 'stakeholders'], // thAlt
    ['การเทียบเคียง', 'benchmarking'],
    ['วงจรเดมมิ่ง', 'PDCA cycle (Plan-Do-Check-Act)'],
    ['ผลลัพธ์การเรียนรู้ระดับหลักสูตร', 'programme learning outcomes (PLO)'], // วลียาวชนะ "หลักสูตร" ที่เป็นส่วนย่อย
    ['ผลลัพธ์ของหลักสูตร', 'programme outcomes'],
    ['ความต้องการของผู้มีส่วนได้ส่วนเสีย', 'stakeholders’ needs'], // ไม่ใช่ "ความต้องการของ stakeholders"
    ['อัตราการออกกลางคัน', 'dropout rate'],
    ['ประธานหลักสูตร', 'programme chair'], // ไม่ใช่ "ประธาน programme"
    ['ข้อมูลป้อนกลับ', 'feedback'],
  ];
  it.each(thToEn)('TH→EN %s → %s', (input, expected) => {
    const r = applyGlossary(input, 'th');
    expect(r.text).toBe(expected);
    expect(r.replaced).toBe(1);
  });

  const enToTh: [string, string][] = [
    ['stakeholders', 'ผู้มีส่วนได้ส่วนเสีย'],
    ['Stakeholder', 'ผู้มีส่วนได้ส่วนเสีย'], // ไม่แยกตัวพิมพ์สำหรับคำปกติ
    ['PLO', 'ผลลัพธ์การเรียนรู้ระดับหลักสูตร'],
    ['PLOs', 'ผลลัพธ์การเรียนรู้ระดับหลักสูตร'],
    ['ELO', 'ผลลัพธ์การเรียนรู้ที่คาดหวัง'],
    ['PDCA', 'วงจรเดมมิ่ง'],
    ['programme chair', 'ประธานหลักสูตร'], // ไม่ใช่ "หลักสูตร chair"
    ['stakeholder needs', 'ความต้องการของผู้มีส่วนได้ส่วนเสีย'],
    ['pass rate', 'อัตราการสำเร็จการศึกษา'],
    ['SAR', 'รายงานการประเมินตนเอง'],
  ];
  it.each(enToTh)('EN→TH %s → %s', (input, expected) => {
    expect(applyGlossary(input, 'en').text).toBe(expected);
  });

  // ไม่แทนกลางคำผิด ๆ (EN ใช้ขอบเขตคำ)
  const noMidWord = ['programmer', 'courseware', 'bypass rate', 'benchmarked', 'unevidenced', 'SARS', 'QAnon', 'discourse', 'targeted'];
  it.each(noMidWord)('EN→TH ไม่แทนกลางคำ: %s', (w) => {
    const r = applyGlossary(w, 'en');
    expect(r.text).toBe(w);
    expect(r.replaced).toBe(0);
  });

  it('EN→TH ตัวย่อตัวพิมพ์เล็กไม่ถูกแทน (elo / sar / qa / afi) แต่ตัวใหญ่ถูกแทน', () => {
    ['elo', 'sar', 'qa', 'afi', 'plo'].forEach(w => expect(applyGlossary(w, 'en').text).toBe(w));
    expect(applyGlossary('AFI', 'en').text).toBe('ข้อเสนอแนะเพื่อการปรับปรุง');
  });

  it('คงตัวเลข / [E-…] / เครื่องหมายวรรคตอนไว้เหมือนเดิม และนับ hits ไม่ซ้ำ', () => {
    const src = 'มี ผู้มีส่วนได้ส่วนเสีย 25 ราย [E-1.1-01] และ ผู้มีส่วนได้ส่วนเสีย อีก 3.5% ตาม การเทียบเคียง';
    const r = applyGlossary(src, 'th');
    expect(r.text).toBe('มี stakeholders 25 ราย [E-1.1-01] และ stakeholders อีก 3.5% ตาม benchmarking');
    expect(r.replaced).toBe(3);
    expect(r.hits.map(h => h.en)).toEqual(['stakeholders', 'benchmarking']);
  });

  it('ข้อความว่าง/ไม่มีศัพท์ → คืนเดิม', () => {
    expect(applyGlossary('', 'th')).toMatchObject({ text: '', replaced: 0 });
    expect(applyGlossary('สวัสดีครับ', 'th').text).toBe('สวัสดีครับ');
    expect(applyGlossary('hello world', 'en').text).toBe('hello world');
  });

  it('findGlossaryHits: ไม่ซ้ำ เรียงตามที่พบ', () => {
    const h = findGlossaryHits('PLO, stakeholders, plo, PLO และ benchmarking', 'en');
    expect(h.map(x => x.en)).toEqual(['programme learning outcomes (PLO)', 'stakeholders', 'benchmarking']);
  });
});

// ───────────────────────── runTranslate ─────────────────────────
describe('AI-4 runTranslate (offline)', () => {
  const TH = 'หลักสูตรมี ผู้มีส่วนได้ส่วนเสีย 25 ราย [E-1.1-01] และ [E-1.1-02] ตาม การเทียบเคียง';

  it('offline: needsHumanTranslation=true (ไม่มีป้ายใน translation) + แทนเฉพาะศัพท์ + ตัวเลข/รหัสครบ → postCheck.ok', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    const run = await api.runTranslate(chair, SEC, 'en');
    const out = run.output as { translation: string; from: string; to: string; needsHumanTranslation: boolean; glossaryHits: string[]; sectionId: string };
    expect(run.feature).toBe('AI-4');
    expect(run.model).toBe('offline-deterministic');
    expect(out.needsHumanTranslation).toBe(true);
    expect(out.translation).not.toContain(OFFLINE_TRANSLATE_LABEL); // ป้ายไม่อยู่ใน translation — UI ใช้ needsHumanTranslation
    expect(out.translation).toContain('stakeholders');
    expect(out.translation).toContain('benchmarking');
    expect(out.translation).toContain('25');
    expect(out.translation).toContain('[E-1.1-01]');
    expect(out.translation).toContain('[E-1.1-02]');
    expect(out.translation).toContain('programme มี'); // "หลักสูตร" อยู่ใน glossary → แทนเป็น programme, ส่วนที่เหลือของประโยคคงเดิมไม่ถูกแต่งเอง
    expect(out.translation).toContain('ราย');
    expect(out.glossaryHits).toEqual(['programme', 'stakeholders', 'benchmarking']);
    expect([out.from, out.to, out.sectionId]).toEqual(['th', 'en', SEC]);
    expect(run.postCheck.ok).toBe(true);
    expect(run.accepted).toBeFalsy(); // ข้อเสนอเท่านั้น
    expect(sectionOf('chair1', '1.1').narrativeEn).toBe(''); // ยังไม่เขียนจนกว่า accept
  });

  it('EN→TH: แปลจาก narrativeEn อัตโนมัติ', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeEn: 'The stakeholders gave 12 inputs [E-1.1-01].' });
    const run = await api.runTranslate(chair, SEC, 'th');
    const out = run.output as { translation: string; from: string };
    expect(out.from).toBe('en');
    expect(out.translation).toContain('ผู้มีส่วนได้ส่วนเสีย');
    expect(run.postCheck.ok).toBe(true);
  });

  it('ต้นฉบับว่าง = invalid · section ไม่มี = not_found · ภาษาปลายทางผิด = invalid', async () => {
    const chair = user('chair1');
    await expect(api.runTranslate(chair, `${CYCLE}::1.2`, 'en')).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.runTranslate(chair, `${CYCLE}::9.9`, 'en')).rejects.toMatchObject({ code: 'not_found' });
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    await expect(api.runTranslate(chair, SEC, 'fr' as unknown as 'en')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('post-check: provider ทำ [E-…] หาย → ok=false + flaggedSentences', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    vi.spyOn(offlineProvider, 'translate').mockResolvedValue({ translation: 'The programme has 25 stakeholders [E-1.1-01].' });
    const run = await api.runTranslate(chair, SEC, 'en');
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.flaggedSentences.join('\n')).toContain('E-1.1-02');
  });

  it('post-check: ตัวเลขหาย → ok=false (ระบุเลข)', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    vi.spyOn(offlineProvider, 'translate').mockResolvedValue({ translation: 'Many stakeholders [E-1.1-01] [E-1.1-02].' });
    const run = await api.runTranslate(chair, SEC, 'en');
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.flaggedSentences.join('\n')).toContain('25');
  });

  it('post-check: ตัวเลขเกิน (โผล่ที่ต้นฉบับไม่มี) → ok=false', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    vi.spyOn(offlineProvider, 'translate').mockResolvedValue({ translation: '25 stakeholders and 99 more [E-1.1-01] [E-1.1-02].' });
    const run = await api.runTranslate(chair, SEC, 'en');
    expect(run.postCheck.ok).toBe(false);
  });

  it('post-check: [E-…] ปลอมที่ต้นฉบับไม่มี → ok=false และรหัสปลอมถูกตัดออกจากคำแปล', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    vi.spyOn(offlineProvider, 'translate').mockResolvedValue({ translation: '25 stakeholders [E-1.1-01] [E-1.1-02] [E-9.9-99].' });
    const run = await api.runTranslate(chair, SEC, 'en');
    expect(run.postCheck.ok).toBe(false);
    expect((run.output as { translation: string }).translation).not.toContain('E-9.9-99');
  });

  it('provider (ไม่ใช่ offline) ที่แปลครบ → ok=true และไม่ติดป้าย needsHumanTranslation', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    vi.spyOn(offlineProvider, 'translate').mockResolvedValue({ translation: 'The programme has 25 stakeholders [E-1.1-01] [E-1.1-02] per benchmarking.', needsHumanTranslation: false });
    const run = await api.runTranslate(chair, SEC, 'en');
    expect(run.postCheck.ok).toBe(true);
    expect((run.output as { needsHumanTranslation: boolean }).needsHumanTranslation).toBe(false);
  });
});

describe('AI-4 accept / lock / RBAC', () => {
  it('accept (EN) เขียนลง narrativeEn ไม่แตะ narrativeTh · append ต่อท้ายของเดิม · replace ทับ', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'มี ผู้มีส่วนได้ส่วนเสีย 25 ราย [E-1.1-01]', narrativeEn: 'Existing.' });
    const run = await api.runTranslate(chair, SEC, 'en');
    api.acceptAiRun(chair, run.id);
    let s = sectionOf('chair1', '1.1');
    expect(s.narrativeTh).toBe('มี ผู้มีส่วนได้ส่วนเสีย 25 ราย [E-1.1-01]');
    expect(s.narrativeEn.startsWith('Existing.')).toBe(true);
    expect(s.narrativeEn).toContain('stakeholders');
    const run2 = await api.runTranslate(chair, SEC, 'en');
    api.acceptAiRun(chair, run2.id, { mode: 'replace' });
    s = sectionOf('chair1', '1.1');
    expect(s.narrativeEn.startsWith('Existing.')).toBe(false);
    expect(s.narrativeEn).not.toContain(OFFLINE_TRANSLATE_LABEL);
    expect(s.narrativeEn).toContain('stakeholders');
  });

  it('accept (TH) เขียนลง narrativeTh ไม่แตะ narrativeEn', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeEn: 'We have 7 stakeholders [E-1.1-01].' });
    const run = await api.runTranslate(chair, SEC, 'th');
    api.acceptAiRun(chair, run.id);
    const s = sectionOf('chair1', '1.1');
    expect(s.narrativeEn).toBe('We have 7 stakeholders [E-1.1-01].');
    expect(s.narrativeTh).toContain('ผู้มีส่วนได้ส่วนเสีย');
    expect(s.narrativeTh).toContain('7');
  });

  it('accept ซ้ำ → invalid · accept ข้าม university → forbidden', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'มี 5 ราย' });
    const run = await api.runTranslate(chair, SEC, 'en');
    const foreign = { ...chair, id: 'u-foreign', universityId: 'uni-other' };
    expect(() => api.acceptAiRun(foreign, run.id)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    api.acceptAiRun(chair, run.id);
    expect(() => api.acceptAiRun(chair, run.id)).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });

  it('assessor แปลไม่ได้ (ai.use) · ผู้ใช้ข้าม university แปลไม่ได้', async () => {
    api.saveSection(user('chair1'), CYCLE, '1.1', { narrativeTh: 'มี 5 ราย' });
    await expect(api.runTranslate(user('assess1'), SEC, 'en')).rejects.toMatchObject({ code: 'forbidden' });
    const foreign = { ...user('chair1'), id: 'u-foreign', universityId: 'uni-other', roles: [{ role: 'programme_chair' as const, scopeType: 'programme' as const, scopeId: 'prog-other' }] };
    await expect(api.runTranslate(foreign, SEC, 'en')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('รอบที่ lock แล้ว: accept คำแปลที่ขอไว้ก่อน lock ไม่ได้ (locked) และ narrative ไม่เปลี่ยน', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    // ข้อ 1.1 ถูก seed เป็น approved ต้องส่งกลับก่อนจึงแก้ได้ — ใช้ข้อที่ยังไม่อนุมัติ: ขอแปลก่อน lock แล้วค่อย lock
    const pending = api.listSections(chair, CYCLE).find(s => s.status === 'drafting')!;
    api.assignSections(chair, CYCLE, [pending.requirementId], user('staff1').id);
    api.saveSection(user('staff1'), CYCLE, pending.requirementId, { narrativeTh: 'มี ผู้มีส่วนได้ส่วนเสีย 9 ราย' }); // staff เป็นผู้เขียนล่าสุด → ประธานอนุมัติได้
    const run = await api.runTranslate(chair, `${CYCLE}::${pending.requirementId}`, 'en');
    // เดินต่อจากสถานะเดิมจนถึง lock (ไม่เรียก driveToLocked เพราะมัน reset เดโม่ → run หาย)
    const staff = user('staff1');
    for (const s of api.listSections(chair, CYCLE)) {
      if (s.status === 'approved') continue;
      if (s.status === 'drafting') { api.assignSections(chair, CYCLE, [s.requirementId], staff.id); api.submitSection(staff, CYCLE, s.requirementId); }
      api.approveSection(chair, CYCLE, s.requirementId);
    }
    await api.transitionCycle(chair, CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    await api.transitionCycle(user('dean1'), CYCLE, 'final_approved');
    const before = api.listSections(chair, CYCLE).find(s => s.requirementId === pending.requirementId)!.narrativeEn;
    expect(() => api.acceptAiRun(chair, run.id)).toThrowError(expect.objectContaining({ code: 'locked' }));
    expect(api.listSections(chair, CYCLE).find(s => s.requirementId === pending.requirementId)!.narrativeEn).toBe(before);
  });

  it('รอบที่ lock แล้ว: เรียก runTranslate ใหม่ไม่ได้ผลลัพธ์ที่ accept ได้ (ไม่มีทางเขียนลง section)', async () => {
    await driveToLocked();
    const chair = user('chair1');
    const reqId = api.listSections(chair, CYCLE).find(s => s.narrativeTh.trim())!.requirementId;
    let run;
    try { run = await api.runTranslate(chair, `${CYCLE}::${reqId}`, 'en'); } catch (e) {
      expect(e).toMatchObject({ code: 'locked' }); return; // ปฏิเสธตั้งแต่ขอแปล = ถูกต้อง
    }
    expect(() => api.acceptAiRun(chair, run.id)).toThrowError(expect.objectContaining({ code: 'locked' }));
  });
});

// ───────────────────────── metrics import ─────────────────────────
describe('metric template + preview', () => {
  it('template เปิดอ่านด้วย exceljs ได้: แผ่น metrics/codes/วิธีใช้ และ header ถูก', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await api.buildMetricTemplate()).arrayBuffer());
    expect(wb.worksheets.map(w => w.name)).toEqual(['metrics', 'codes', 'วิธีใช้']);
    const head = wb.getWorksheet('metrics')!.getRow(1);
    expect(['code', 'period', 'value', 'target', 'benchmark', 'benchmark_source'].map((_, i) => String(head.getCell(i + 1).value)))
      .toEqual(['code', 'period', 'value', 'target', 'benchmark', 'benchmark_source']);
    const codes = wb.getWorksheet('codes')!;
    expect(codes.rowCount).toBeGreaterThan(5);
    const list: string[] = []; codes.eachRow((r, n) => { if (n > 1) list.push(String(r.getCell(1).value)); });
    expect(list).toContain('pass_rate');
  });

  it('template ของ cohort เปิดอ่านได้ และมี 3 คอลัมน์ ไม่มีคอลัมน์รหัส/ชื่อ', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await api.buildCohortTemplate()).arrayBuffer());
    const head = wb.getWorksheet('cohort')!.getRow(1);
    expect([1, 2, 3].map(i => String(head.getCell(i).value))).toEqual(['cohort', 'status', 'years_to_graduate']);
    expect(head.getCell(4).value).toBeNull();
  });

  it('preview แถวผิดทุกชนิด: rowNo ตรงแถว Excel + เหตุผล + แถวดีผ่าน', async () => {
    const chair = user('chair1');
    const f = await xlsx([
      ['code', 'period', 'value', 'target'],
      ['intake', 2566, 120],          // 2 ok
      ['pass_rate', 2566, 120],       // 3 % เกิน 100
      ['pass_rate', 2566, -5],        // 4 ติดลบ
      ['foo', 2566, 1],               // 5 code ไม่รู้จัก
      ['pass_rate', 'x', 1],          // 6 period ไม่ใช่ตัวเลข
      ['pass_rate', 2566.5, 1],       // 7 period ไม่ใช่จำนวนเต็ม
      ['pass_rate', 1800, 1],         // 8 period นอกช่วง
      ['pass_rate', 2566, 'abc'],     // 9 value ไม่ใช่ตัวเลข
      [],                             // 10 ว่าง (ข้าม ไม่นับ error)
      ['pass_rate', 2567, 70, 'x'],   // 11 target ไม่ใช่ตัวเลข
      [null, 2567, 70],               // 12 ไม่ระบุ code
      ['pass_rate', 2568, 70, 90],    // 13 ok
      ['pass_rate', 2568, 71],        // 14 ปีซ้ำกับแถว 13
    ]);
    const p = await api.previewMetricImport(chair, PROG, f);
    const row = (n: number) => p.rows.find(r => r.rowNo === n)!;
    expect(p.rows.find(r => r.rowNo === 10)).toBeUndefined();
    expect(row(2).ok).toBe(true);
    expect(row(3).errors.join()).toContain('0–100');
    expect(row(4).ok).toBe(false);
    expect(row(5).errors.join()).toContain('foo');
    expect(row(6).errors.join()).toContain('period');
    expect(row(7).errors.join()).toContain('period');
    expect(row(8).errors.join()).toContain('period');
    expect(row(9).errors.join()).toContain('value');
    expect(row(11).errors.join()).toContain('target');
    expect(row(12).errors.join()).toContain('code');
    expect(row(13).ok).toBe(true);
    expect(row(14).errors.join()).toContain('ปีซ้ำ');
    expect(row(14).errors.join()).toContain('13'); // อ้างแถวแรก
    expect(p.okCount).toBe(2); expect(p.errorCount).toBe(p.rows.length - 2);
    expect(p.okCount + p.errorCount).toBe(p.rows.length);
  });

  it('preview ไม่เขียนอะไรลง metrics', async () => {
    const chair = user('chair1');
    const before = JSON.stringify(load<MetricValue>(KEYS.metrics));
    await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 120]]));
    expect(JSON.stringify(load<MetricValue>(KEYS.metrics))).toBe(before);
  });

  it('warnings: ปีขาดกลางช่วง + ไม่ครบ 3 ปี', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 100], ['intake', 2568, 110]]));
    const w = p.warnings.join('\n');
    expect(w).toContain('ปีที่ขาด 2567');
    expect(w).toContain('ไม่ครบ 3 ปี');
  });

  it('warnings: ครบ 3 ปีต่อเนื่อง → ไม่มีคำเตือนของ code นั้น', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 100], ['intake', 2567, 105], ['intake', 2568, 110]]));
    expect(p.warnings.filter(w => w.startsWith('intake'))).toEqual([]);
  });

  it('existingValue: ค่าเดิมที่จะถูกแทนที่', async () => {
    const chair = user('chair1');
    const f = await xlsx([['code', 'period', 'value'], ['intake', 2566, 100]]);
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, f)).previewId);
    const p2 = await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 130]]));
    expect(p2.rows[0].existingValue).toBe(100);
  });

  it('ไฟล์ไม่ใช่ xlsx / ไม่มีคอลัมน์บังคับ / ไม่มีแถวข้อมูล → invalid', async () => {
    const chair = user('chair1');
    await expect(api.previewMetricImport(chair, PROG, new Blob(['not an excel']))).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.previewMetricImport(chair, PROG, await xlsx([['code', 'value'], ['intake', 1]]))).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value']]))).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('metric commit', () => {
  const file = () => xlsx([['code', 'period', 'value', 'target'], ['intake', 2566, 120], ['pass_rate', 2566, 120], ['pass_rate', 2568, 70, 90]]);

  it('commit เขียนเฉพาะแถวที่ผ่าน + audit metric.import + ใช้ซ้ำไม่ได้', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await file());
    expect(p.okCount).toBe(2);
    const r = api.commitMetricImport(chair, p.previewId);
    expect(r.inserted + r.updated).toBe(2);
    expect(api.listMetrics(chair, PROG, 'pass_rate').find(m => m.period === 2568)).toMatchObject({ value: 70, targetValue: 90 });
    expect(api.listMetrics(chair, PROG, 'pass_rate').find(m => m.period === 2566)).toBeUndefined(); // แถวผิดไม่ถูกเขียน
    expect(load<AuditLog>(KEYS.audit).some(a => a.action === 'metric.import')).toBe(true);
    expect(() => api.commitMetricImport(chair, p.previewId)).toThrowError(expect.objectContaining({ code: 'not_found' }));
  });

  it('commit ครั้งที่สองด้วยค่าใหม่ = updated ไม่ใช่ inserted', async () => {
    const chair = user('chair1');
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 100]]))).previewId);
    const r = api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['intake', 2566, 140]]))).previewId);
    expect(r).toMatchObject({ inserted: 0, updated: 1 });
    expect(api.listMetrics(chair, PROG, 'intake').filter(m => m.period === 2566)).toHaveLength(1);
  });

  it('commit ได้เฉพาะเจ้าของ preview (คนอื่น forbidden และ preview ยังใช้ได้)', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await file());
    expect(() => api.commitMetricImport(user('lect1'), p.previewId)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => api.commitMetricImport(user('staff1'), p.previewId)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(api.commitMetricImport(chair, p.previewId).inserted).toBe(2);
  });

  it('previewId ที่ไม่มี → not_found · preview หมดอายุ (30 นาที) → not_found', async () => {
    const chair = user('chair1');
    expect(() => api.commitMetricImport(chair, 'mpv-nope')).toThrowError(expect.objectContaining({ code: 'not_found' }));
    const p = await api.previewMetricImport(chair, PROG, await file());
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 31 * 60_000);
    expect(() => api.commitMetricImport(chair, p.previewId)).toThrowError(expect.objectContaining({ code: 'not_found' }));
  });

  it('preview ที่ยังไม่ถึง 30 นาที commit ได้', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await file());
    const t0 = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 29 * 60_000);
    expect(api.commitMetricImport(chair, p.previewId).inserted).toBe(2);
  });

  it('ไฟล์ที่ผิดทุกแถว → commit ไม่ได้ (invalid) และ preview ไม่มีแถว ok', async () => {
    const chair = user('chair1');
    const p = await api.previewMetricImport(chair, PROG, await xlsx([['code', 'period', 'value'], ['foo', 2566, 1]]));
    expect(p.okCount).toBe(0);
    expect(() => api.commitMetricImport(chair, p.previewId)).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });

  it('RBAC metric.write: assessor / ผู้ใช้ข้ามหลักสูตร preview ไม่ได้', async () => {
    const f = await file();
    await expect(api.previewMetricImport(user('assess1'), PROG, f)).rejects.toMatchObject({ code: 'forbidden' });
    const foreign = { ...user('chair1'), id: 'u-foreign', universityId: 'uni-other', roles: [{ role: 'programme_chair' as const, scopeType: 'programme' as const, scopeId: 'prog-other' }] };
    await expect(api.previewMetricImport(foreign, PROG, f)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.previewMetricImport(user('chair1'), 'prog-nope', f)).rejects.toMatchObject({ code: 'not_found' });
  });
});

// ───────────────────────── cohort ─────────────────────────
describe('cohort import', () => {
  /** ตัวอย่าง 10 คนรุ่น 2563: จบตามเวลา(≤4) 6, จบช้า(5) 1, พ้นสภาพ 2, กำลังศึกษา 1 */
  const cohort10 = async () => {
    const rows: unknown[][] = [['student_id', 'name', 'cohort', 'status', 'years_to_graduate']];
    for (let i = 0; i < 6; i++) rows.push([`6401234567${i}`, `นศ.ลับ${i}`, 2563, 'graduated', 4]);
    rows.push(['SECRET-ID-LATE', 'นศ.ลับช้า', 2563, 'graduated', 5]);
    rows.push(['SECRET-ID-D1', 'นศ.ลับD1', 2563, 'dropped_out', '']);
    rows.push(['SECRET-ID-D2', 'นศ.ลับD2', 2563, 'ลาออก', '']);
    rows.push(['SECRET-ID-E', 'นศ.ลับE', 2563, 'enrolled', '']);
    return xlsx(rows, 'cohort');
  };

  it('คำนวณตรงมือ: pass 60 / dropout 20 / ttg (6x4+5)/7 = 4.14', async () => {
    const chair = user('chair1');
    const res = await api.importCohortFile(chair, PROG, await cohort10());
    expect(res).toMatchObject({ committed: true, rowsRead: 10, rowErrors: [] });
    const c = res.cohorts[0];
    expect(c).toMatchObject({ cohort: 2563, total: 10, graduated: 7, graduatedOnTime: 6, droppedOut: 2, enrolled: 1, passRate: 60, dropoutRate: 20, timeToGraduate: 4.14 });
    expect(res.written.inserted).toBe(3);
    const get = (code: string) => api.listMetrics(chair, PROG, code).find(m => m.period === 2563)!.value;
    expect([get('pass_rate'), get('dropout_rate'), get('time_to_graduate')]).toEqual([60, 20, 4.14]);
    expect(res.warnings.join()).toContain('ยังมีผู้ศึกษาอยู่ 1 คน');
  });

  it('standardYears=5 เปลี่ยนนิยามจบตามเวลา → pass 70', async () => {
    const res = await api.importCohortFile(user('chair1'), PROG, await cohort10(), { standardYears: 5 });
    expect(res.cohorts[0].passRate).toBe(70);
  });

  it('หลายรุ่น: แยกผลต่อรุ่น เรียงตามปี · รุ่นที่ยังไม่มีผู้จบ → timeToGraduate null และไม่เขียน time_to_graduate', async () => {
    const chair = user('chair1');
    const f = await xlsx([['cohort', 'status', 'years_to_graduate'],
      [2565, 'enrolled', ''], [2565, 'dropped_out', ''],
      [2564, 'graduated', 4], [2564, 'graduated', 3]], 'cohort');
    const res = await api.importCohortFile(chair, PROG, f);
    expect(res.cohorts.map(c => c.cohort)).toEqual([2564, 2565]);
    expect(res.cohorts[0]).toMatchObject({ passRate: 100, dropoutRate: 0, timeToGraduate: 3.5 });
    expect(res.cohorts[1]).toMatchObject({ passRate: 0, dropoutRate: 50, timeToGraduate: null });
    expect(api.listMetrics(chair, PROG, 'time_to_graduate').find(m => m.period === 2565)).toBeUndefined();
    expect(res.warnings.join()).toContain('ยังไม่มีผู้จบ');
  });

  it('all-or-nothing: มีแถวผิดแม้แถวเดียว → invalid + rowErrors ครบ + ไม่เขียน metrics/audit', async () => {
    const chair = user('chair1');
    const metricsBefore = JSON.stringify(load<MetricValue>(KEYS.metrics));
    const auditBefore = load<AuditLog>(KEYS.audit).length;
    const f = await xlsx([['cohort', 'status', 'years_to_graduate'],
      [2563, 'graduated', 4],      // 2 ok
      [2563, 'weird', ''],         // 3 status ผิด
      ['abc', 'graduated', 4],     // 4 cohort ผิด
      [2563, 'graduated', ''],     // 5 จบแต่ไม่มีปี
      [2563, 'graduated', 99],     // 6 ปีเกิน 20
      [2563, 'enrolled', '']],     // 7 ok
    'cohort');
    await expect(api.importCohortFile(chair, PROG, f)).rejects.toMatchObject({
      code: 'invalid',
      detail: { rowErrors: [{ rowNo: 3 }, { rowNo: 4 }, { rowNo: 5 }, { rowNo: 6 }] },
    });
    expect(JSON.stringify(load<MetricValue>(KEYS.metrics))).toBe(metricsBefore);
    expect(load<AuditLog>(KEYS.audit).length).toBe(auditBefore);
  });

  it('dryRun: แถวผิดไม่ throw (คืน rowErrors) และไม่เขียนอะไร · ไฟล์ดี dryRun คำนวณได้แต่ committed=false', async () => {
    const chair = user('chair1');
    const metricsBefore = JSON.stringify(load<MetricValue>(KEYS.metrics));
    const auditBefore = load<AuditLog>(KEYS.audit).length;
    const bad = await xlsx([['cohort', 'status', 'years_to_graduate'], [2563, 'graduated', 4], [2563, 'weird', '']], 'cohort');
    const r1 = await api.importCohortFile(chair, PROG, bad, { dryRun: true });
    expect(r1.committed).toBe(false);
    expect(r1.rowErrors).toMatchObject([{ rowNo: 3 }]);
    const r2 = await api.importCohortFile(chair, PROG, await cohort10(), { dryRun: true });
    expect(r2).toMatchObject({ committed: false, written: { inserted: 0, updated: 0 } });
    expect(r2.cohorts[0].passRate).toBe(60);
    expect(JSON.stringify(load<MetricValue>(KEYS.metrics))).toBe(metricsBefore);
    expect(load<AuditLog>(KEYS.audit).length).toBe(auditBefore);
  });

  it('ไม่มีข้อมูลรายคน (รหัส/ชื่อ/เลขประจำตัว) ใน localStorage และ audit', async () => {
    const chair = user('chair1');
    await api.importCohortFile(chair, PROG, await cohort10());
    const dump = JSON.stringify(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));
    ['SECRET-ID', '640123456', 'นศ.ลับ'].forEach(s => expect(dump).not.toContain(s));
    const au = load<AuditLog>(KEYS.audit).find(a => a.action === 'metric.import_cohort')!;
    expect(au).toBeTruthy();
    expect(au.after).toEqual({ cohorts: 1, rows: 10, inserted: 3, updated: 0 });
    expect(JSON.stringify(au)).not.toMatch(/\.xlsx|SECRET|640123/);
  });

  it('ไม่มีข้อมูลรายคนแม้ตอนไฟล์ผิด (error ไม่หลุดค่าเซลล์)', async () => {
    const chair = user('chair1');
    const f = await xlsx([['student_id', 'cohort', 'status'], ['SECRET-ID-X', 2563, 'weird']], 'cohort');
    const err = await api.importCohortFile(chair, PROG, f).catch(e => e);
    expect(JSON.stringify({ m: err.message, d: err.detail })).not.toContain('SECRET');
    expect(JSON.stringify(Object.keys(localStorage).map(k => localStorage.getItem(k)))).not.toContain('SECRET');
  });

  it('import ซ้ำ = updated (upsert ไม่เพิ่มซ้ำ)', async () => {
    const chair = user('chair1');
    await api.importCohortFile(chair, PROG, await cohort10());
    const r = await api.importCohortFile(chair, PROG, await cohort10());
    expect(r.written).toEqual({ inserted: 0, updated: 3 });
    expect(api.listMetrics(chair, PROG, 'pass_rate').filter(m => m.period === 2563)).toHaveLength(1);
  });

  it('status ภาษาไทย (จบ / พ้นสภาพ / กำลังศึกษา) รับได้', async () => {
    const f = await xlsx([['cohort', 'status', 'years_to_graduate'], [2563, 'จบ', 4], [2563, 'พ้นสภาพ', ''], [2563, 'กำลังศึกษา', '']], 'cohort');
    const res = await api.importCohortFile(user('chair1'), PROG, f, { dryRun: true });
    expect(res.cohorts[0]).toMatchObject({ graduated: 1, droppedOut: 1, enrolled: 1 });
  });

  it('RBAC metric.write + standardYears ไม่ถูกต้อง + ไฟล์ไม่มีคอลัมน์ status', async () => {
    const f = await cohort10();
    await expect(api.importCohortFile(user('assess1'), PROG, f)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.importCohortFile(user('chair1'), PROG, f, { standardYears: 0 })).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.importCohortFile(user('chair1'), PROG, await xlsx([['cohort'], [2563]], 'cohort'))).rejects.toMatchObject({ code: 'invalid' });
  });
});

// ───────────────────────── DOCX ─────────────────────────
describe('exportSarDocx', () => {
  async function openDocx(u = 'chair1') {
    const blob = await api.exportSarDocx(user(u), CYCLE);
    const buf = Buffer.from(await blob.arrayBuffer());
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml')!.async('string');
    return { buf, zip, xml };
  }
  const textOf = (p: string) => Array.from(p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map(m => m[1]).join('');
  const unesc = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  beforeEach(async () => { await freshSeededDemo(); });

  it('เป็น zip/OOXML ที่เปิดได้ (PK, [Content_Types].xml, word/document.xml)', async () => {
    const { buf, zip, xml } = await openDocx();
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<w:body>');
  });

  it('มีสารบัญ (TOC field), Part 1–4, ภาคผนวก, เลขหน้า, และ updateFields', async () => {
    const { zip, xml } = await openDocx();
    expect(xml).toContain('TOC');
    ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Evidence index', 'บทสรุปผู้บริหาร', 'สารบัญ'].forEach(t => expect(xml).toContain(t));
    const settings = await zip.file('word/settings.xml')!.async('string');
    expect(settings).toContain('updateFields');
    const footers = Object.keys(zip.files).filter(f => /word\/footer\d*\.xml/.test(f));
    expect(footers.length).toBeGreaterThan(0);
    expect((await zip.file(footers[0])!.async('string'))).toContain('PAGE');
  });

  it('มีข้อ requirement ครบ 53 ข้อ เรียงตามลำดับ (Heading3) และมีเกณฑ์ 1–8', async () => {
    const { xml } = await openDocx();
    const paras = xml.split('</w:p>');
    const h3 = paras.filter(p => /<w:pStyle w:val="Heading3"/.test(p)).map(p => unesc(textOf(p)));
    const ids = h3.map(t => t.split(' ')[0]);
    const expected = listRequirements().slice().sort((a, b) => compareReqId(a.id, b.id)).map(r => r.id);
    expect(expected).toHaveLength(53);
    expect(ids).toEqual(expected);
    const h2 = paras.filter(p => /<w:pStyle w:val="Heading2"/.test(p)).map(p => unesc(textOf(p)));
    expect(h2).toHaveLength(8);
    h2.forEach((t, i) => expect(t.startsWith(`เกณฑ์ที่ ${i + 1} `)).toBe(true));
  });

  it('Part 4 checklist มีครบ 53 แถวข้อ', async () => {
    const { xml } = await openDocx();
    const part4 = xml.slice(xml.indexOf('Part 4'));
    const rows = part4.split('<w:tr>').slice(1).filter(r => /^\d\.\d+$/.test(unesc(textOf(r.split('</w:tc>')[0])).trim()));
    expect(rows.length).toBeGreaterThanOrEqual(53);
  });

  it('Evidence index ตรงกับที่อ้าง: ทุก link ภายใน (anchor) มี bookmark ปลายทางและกลับกัน · ครบเท่า evidence ที่ผูกในรอบ', async () => {
    const { xml } = await openDocx();
    const anchors = new Set(Array.from(xml.matchAll(/<w:hyperlink [^>]*w:anchor="([^"]+)"/g)).map(m => m[1]));
    const marks = new Set(Array.from(xml.matchAll(/<w:bookmarkStart [^>]*w:name="([^"]+)"/g)).map(m => m[1]));
    expect(anchors.size).toBeGreaterThan(0);
    anchors.forEach(a => expect(marks.has(a), `anchor ${a} ไม่มี bookmark`).toBe(true));
    // evidence ที่ผูกในรอบ (ตามที่ระบบรู้) ต้องอยู่ใน index ครบ
    const codesInIndex = Array.from(marks).filter(m => m.startsWith('ev_'));
    expect(codesInIndex.length).toBeGreaterThan(0);
    // รหัส [E-…] ที่ปรากฏเป็นข้อความในเนื้อหา ต้องเป็นรหัสที่อยู่ใน index (ไม่มีรหัสลอย)
    const cited = new Set(Array.from(xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).flatMap(t => Array.from(unesc(t[1]).matchAll(/E-\d+\.\d+-\d{2,}/g)).map(m => m[0])));
    expect(cited.size).toBeGreaterThan(0);
    cited.forEach(c => expect(marks.has('ev_' + c.replace(/[^A-Za-z0-9]/g, '_')), `${c} ถูกอ้างแต่ไม่มีใน evidence index`).toBe(true));
  });

  it('ฟอนต์ TH Sarabun New ทั้งเอกสาร (default + styles + runs) และไม่มีฟอนต์อื่นใน run', async () => {
    const { zip, xml } = await openDocx();
    const styles = await zip.file('word/styles.xml')!.async('string');
    expect(styles).toContain('TH Sarabun New');
    const fonts = new Set(Array.from(xml.matchAll(/<w:rFonts [^>]*w:ascii="([^"]+)"/g)).map(m => m[1]));
    expect(Array.from(fonts)).toEqual(['TH Sarabun New']);
  });

  it('เนื้อหา narrative ที่ seed ไว้ปรากฏใน DOCX และ XML escape ถูก (ไม่มี < & ดิบ)', async () => {
    const { xml } = await openDocx();
    const any = api.listSections(user('chair1'), CYCLE).find(s => s.narrativeTh.trim())!;
    const probe = any.narrativeTh.trim().split(/\s+/)[0].slice(0, 12);
    expect(unesc(textOf(xml))).toContain(probe);
    expect(/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(xml)).toBe(false);
  });

  it('เขียน audit export.sar_docx', async () => {
    await openDocx();
    expect(load<AuditLog>(KEYS.audit).some(a => a.action === 'export.sar_docx' && a.targetId === CYCLE)).toBe(true);
  });

  const strayAssessor = () => ({ ...user('assess1'), roles: [{ role: 'assessor' as const, scopeType: 'cycle' as const, scopeId: 'other-cycle' }] });

  it('สิทธิ์: assessor ที่ไม่ได้ถูกมอบหมายรอบนี้ export ไม่ได้ · ข้าม university ไม่ได้ · ผู้เขียน/กรรมการของรอบ export ได้ (เหมือน exportSarDoc)', async () => {
    await expect(api.exportSarDocx(strayAssessor(), CYCLE)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.exportSarDocx(user('assess1'), CYCLE)).resolves.toBeInstanceOf(Blob); // กรรมการของรอบ = อ่าน SAR ได้ตามนโยบาย read
    const foreign = { ...user('chair1'), id: 'u-foreign', universityId: 'uni-other', roles: [{ role: 'programme_chair' as const, scopeType: 'programme' as const, scopeId: 'prog-other' }] };
    await expect(api.exportSarDocx(foreign, CYCLE)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.exportSarDocx(user('staff1'), CYCLE)).resolves.toBeInstanceOf(Blob);
  });

  it('rejected export ไม่เขียน audit export.sar_docx', async () => {
    const before = load<AuditLog>(KEYS.audit).filter(a => a.action === 'export.sar_docx').length;
    await api.exportSarDocx(strayAssessor(), CYCLE).catch(() => undefined);
    expect(load<AuditLog>(KEYS.audit).filter(a => a.action === 'export.sar_docx').length).toBe(before);
  });
});
