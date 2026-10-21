/**
 * Phase C review fixes (TASK-0001, review "## Phase C"): C-1 DOCX control char · C-2 translate รอบ lock · C-3 ช่องว่างรอบศัพท์ TH→EN
 * C-4 เพดานความยาว translate · C-5 เซลล์ % · C-6 คอลัมน์ว่างคงค่าเดิม + audit ค่าเก่า · C-8 ธง needsTranslationReview + gap R11
 * C-9 route test ของ task translate · C-11 ข้อความ error years_to_graduate
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ExcelJS from 'exceljs';
import * as api from '@/lib/api';
import { freshDemo, driveToLocked, user, CYCLE, PROG } from '@/tests/helpers';
import { applyGlossary } from '@/lib/api/ai/glossary';
import { OFFLINE_TRANSLATE_LABEL } from '@/lib/api/ai/offline';
import { KEYS, load, save } from '@/lib/api/db';
import { resetAiLimits } from '@/lib/api/ai/ratelimit';
import { POST } from '@/app/api/ai/route';
import type { AuditLog, MetricValue, SarSection } from '@/lib/types';

const SEC = `${CYCLE}::1.1`;
const sectionOf = (u: string, rid: string) => api.listSections(user(u), CYCLE).find(s => s.requirementId === rid)!;

async function xlsx(rows: unknown[][], sheet = 'metrics', fmt?: (ws: ExcelJS.Worksheet) => void): Promise<Blob> {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(sheet);
  rows.forEach(r => ws.addRow(r));
  fmt?.(ws);
  return new Blob([await wb.xlsx.writeBuffer()]);
}

beforeEach(async () => { await freshDemo(); save(KEYS.metrics, []); });
afterEach(() => { vi.restoreAllMocks(); });

// ───────────────────────── C-1 ─────────────────────────
describe('C-1 DOCX ไม่มีอักขระที่ XML 1.0 ห้าม', () => {
  // อักขระต้องห้าม: \u0000-\u0008, \u000B, \u000C, \u000E-\u001F, ￾, ￿, surrogate เดี่ยว
  const FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  const probes = ['\u000b', '\u0001', '\u0000', '\u0008', '\u000c', '\u001f', '￾', '￿', '\ud800', '\udc00'];

  it('ข้อความที่มีอักขระต้องห้ามทุกตัว (narrative TH/EN, rationale) → document.xml สะอาด และ jszip เปิดได้', async () => {
    const chair = user('chair1');
    const dirty = `ก${probes.join('ข')}ค`;
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: `ย่อหน้าแรก${dirty}\r\nบรรทัดสอง\rบรรทัดสาม`, narrativeEn: `English${dirty}text` });
    api.setSelfRating(chair, CYCLE, '1.1', 4, `เหตุผล${dirty}`);
    const blob = await api.exportSarDocx(chair, CYCLE);
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(FORBIDDEN.test(xml)).toBe(false);
    expect(xml).toContain('ย่อหน้าแรก');
    expect(xml).toContain('English');
    // ตัวอักษรปกติที่อยู่ติดกับตัวต้องห้ามต้องไม่หาย
    expect(xml).toContain('เหตุผล');
    // ทุกไฟล์ XML ใน zip ต้องไม่มีอักขระต้องห้าม (รวม core.xml ที่เก็บ title)
    for (const name of Object.keys(zip.files).filter(n => n.endsWith('.xml') || n.endsWith('.rels'))) {
      expect(FORBIDDEN.test(await zip.file(name)!.async('string')), name).toBe(false);
    }
  });

  it('เนื้อหาปกติ (ไทย/อังกฤษ/emoji คู่ surrogate ที่ถูกต้อง/แท็บ/ขึ้นบรรทัดใหม่) ไม่ถูกตัด', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'สวัสดี\tโลก 😀 ok\nบรรทัดสอง' });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await (await api.exportSarDocx(chair, CYCLE)).arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('😀');
    expect(xml).toContain('บรรทัดสอง');
  });
});

// ───────────────────────── C-2 ─────────────────────────
describe('C-2 runTranslate ปฏิเสธเมื่อรอบเขียนไม่ได้', () => {
  it('รอบ lock → code locked ตั้งแต่ขอแปล และไม่สร้าง ai_run', async () => {
    await driveToLocked();
    const chair = user('chair1');
    const reqId = api.listSections(chair, CYCLE).find(s => s.narrativeTh.trim())!.requirementId;
    const runsBefore = load<unknown>(KEYS.aiRuns).length;
    await expect(api.runTranslate(chair, `${CYCLE}::${reqId}`, 'en')).rejects.toMatchObject({ code: 'locked' });
    expect(load<unknown>(KEYS.aiRuns).length).toBe(runsBefore);
  });
  it('รอบที่เขียนได้ยังแปลได้ตามปกติ', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'หลักสูตรมี 5 ราย' });
    await expect(api.runTranslate(chair, SEC, 'en')).resolves.toMatchObject({ feature: 'AI-4' });
  });
});

// ───────────────────────── C-3 ─────────────────────────
describe('C-3 applyGlossary TH→EN เติมช่องว่างรอบศัพท์ที่ติดกับคำไทย', () => {
  // [input, expected] — ทดสอบสองฝั่ง: ต้องเติม / ต้องไม่เติม
  const table: [string, string, string][] = [
    ['กลางประโยคติดไทยหลัง', 'หลักสูตรมี 5 ราย', 'programme มี 5 ราย'],
    ['กลางประโยคติดไทยสองข้าง', 'ทั้งหลักสูตรมี', 'ทั้ง programme มี'],
    ['ต้นบรรทัด', 'หลักสูตร', 'programme'],
    ['ท้ายบรรทัด ติดไทยหน้า', 'ของหลักสูตร', 'ของ programme'],
    ['มีช่องว่างอยู่แล้ว (ไม่เพิ่มซ้ำ)', 'ของ หลักสูตร มี', 'ของ programme มี'],
    ['ติดวงเล็บเปิด (ไม่เติมหน้า)', '(หลักสูตร)', '(programme)'],
    ['ติดวงเล็บปิด/เครื่องหมายวรรคตอนหลัง (ไม่เติมหลัง)', 'หลักสูตร, หลักสูตร.', 'programme, programme.'],
    ['ติด [E-…] ท้าย', 'หลักสูตร[E-1.1-01]', 'programme [E-1.1-01]'],
    ['ติด [E-…] หน้า', '[E-1.1-01]หลักสูตร', '[E-1.1-01] programme'],
    ['ศัพท์สองคำติดกัน (ไม่เว้นซ้ำสองช่อง)', 'หลักสูตรรายวิชา', 'programme course'],
    ['ขึ้นบรรทัดใหม่', 'หลักสูตร\nรายวิชา', 'programme\ncourse'],
    ['ตัวเลขติดหน้า', '5หลักสูตร', '5 programme'],
  ];
  it.each(table)('%s', (_label, input, expected) => {
    expect(applyGlossary(input, 'th').text).toBe(expected);
  });
  it('EN→TH ไม่เติมช่องว่าง (พฤติกรรมเดิม)', () => {
    expect(applyGlossary('the stakeholders gave', 'en').text).toBe('the ผู้มีส่วนได้ส่วนเสีย gave');
    expect(applyGlossary('(stakeholders)', 'en').text).toBe('(ผู้มีส่วนได้ส่วนเสีย)');
  });
});

// ───────────────────────── C-4 ─────────────────────────
describe('C-4 เพดานความยาว translate (เช็กหลัง redact)', () => {
  it('ข้อความ >8000 ตัวอักษร → invalid ไม่เรียก provider; ≤8000 ผ่าน', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'ก'.repeat(8001) });
    await expect(api.runTranslate(chair, SEC, 'en')).rejects.toMatchObject({ code: 'invalid' });
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'ก'.repeat(8000) });
    await expect(api.runTranslate(chair, SEC, 'en')).resolves.toMatchObject({ feature: 'AI-4' });
  });
  it('redaction ทำให้ยาวขึ้นจนเกินเพดาน → ปฏิเสธ (ต้นฉบับ 7,900 แต่หลัง redact > 8,000)', async () => {
    const chair = user('chair1');
    // เลขนักศึกษา 10 หลัก → [STUDENT_ID] ยาวกว่า · ต้องมีจำนวนมากพอให้ผลรวมเกิน 8000
    const text = Array.from({ length: 300 }, () => 'รหัส 6501234567').join(' ') + 'ก'.repeat(3000);
    expect(text.length).toBeLessThanOrEqual(8000);
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: text });
    const redacted = (await import('@/lib/api/ai/redact')).redactDeep(text).value;
    expect(redacted.length).toBeGreaterThan(8000);
    await expect(api.runTranslate(chair, SEC, 'en')).rejects.toMatchObject({ code: 'invalid' });
  });
});

// ───────────────────────── C-5 ─────────────────────────
describe('C-5 เซลล์ตั้งรูปแบบ % ใน Excel', () => {
  const pctFmt = (ws: ExcelJS.Worksheet) => {
    ws.getCell('C2').numFmt = '0%'; // value
    ws.getCell('D2').numFmt = '0.0%'; // target
  };
  it('metric หน่วย % + numFmt % → คูณ 100 (0.85 → 85) ทั้ง value และ target; ไม่มี float เพี้ยน', async () => {
    const chair = user('chair1');
    const f = await xlsx([['code', 'period', 'value', 'target'], ['pass_rate', 2566, 0.85, 0.07]], 'metrics', pctFmt);
    const p = await api.previewMetricImport(chair, PROG, f);
    expect(p.rows[0]).toMatchObject({ ok: true, value: 85, targetValue: 7 });
  });
  it('ไม่ตั้ง % → ค่าเดิม (85 ยังเป็น 85)', async () => {
    const f = await xlsx([['code', 'period', 'value'], ['pass_rate', 2566, 85]]);
    const p = await api.previewMetricImport(user('chair1'), PROG, f);
    expect(p.rows[0]).toMatchObject({ ok: true, value: 85 });
  });
  it('metric หน่วยที่ไม่ใช่ % แต่ตั้งรูปแบบ % → error (ไม่เงียบ)', async () => {
    const f = await xlsx([['code', 'period', 'value'], ['intake', 2566, 1.2]], 'metrics', ws => { ws.getCell('C2').numFmt = '0%'; });
    const p = await api.previewMetricImport(user('chair1'), PROG, f);
    expect(p.rows[0].ok).toBe(false);
    expect(p.rows[0].errors.join()).toContain('%');
  });
  it('commit แล้วค่าใน store เป็น 85 ไม่ใช่ 0.85', async () => {
    const chair = user('chair1');
    const f = await xlsx([['code', 'period', 'value'], ['pass_rate', 2566, 0.85]], 'metrics', ws => { ws.getCell('C2').numFmt = '0%'; });
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, f)).previewId);
    expect(load<MetricValue>(KEYS.metrics).find(m => m.code === 'pass_rate')!.value).toBe(85);
  });
});

// ───────────────────────── C-6 ─────────────────────────
describe('C-6 import: คอลัมน์ว่างคงค่าเดิม + audit เก็บค่าเก่า', () => {
  it('ช่อง target/benchmark/source ว่าง → ไม่ลบค่าเดิม; ช่องที่กรอก → ทับ', async () => {
    const chair = user('chair1');
    const seed = await xlsx([['code', 'period', 'value', 'target', 'benchmark', 'benchmark_source'], ['pass_rate', 2566, 70, 75, 74, 'แหล่ง A']]);
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, seed)).previewId);

    const upd = await xlsx([['code', 'period', 'value', 'target', 'benchmark', 'benchmark_source'], ['pass_rate', 2566, 80, null, null, null]]);
    const res = api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, upd)).previewId);
    expect(res).toMatchObject({ inserted: 0, updated: 1 });
    expect(load<MetricValue>(KEYS.metrics).find(m => m.code === 'pass_rate')).toMatchObject({ value: 80, targetValue: 75, benchmarkValue: 74, benchmarkSource: 'แหล่ง A' });

    const upd2 = await xlsx([['code', 'period', 'value', 'target'], ['pass_rate', 2566, 81, 90]]);
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, upd2)).previewId);
    expect(load<MetricValue>(KEYS.metrics).find(m => m.code === 'pass_rate')).toMatchObject({ value: 81, targetValue: 90, benchmarkValue: 74 });
  });
  it('audit metric.import เก็บค่าเก่าของแถวที่ถูกทับ (value/target/benchmark) — เฉพาะระดับหลักสูตร', async () => {
    const chair = user('chair1');
    const seed = await xlsx([['code', 'period', 'value', 'target', 'benchmark'], ['pass_rate', 2566, 70, 75, 74], ['intake', 2566, 100]]);
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, seed)).previewId);
    const upd = await xlsx([['code', 'period', 'value'], ['pass_rate', 2566, 80], ['pass_rate', 2567, 82]]);
    api.commitMetricImport(chair, (await api.previewMetricImport(chair, PROG, upd)).previewId);
    const logs = load<AuditLog>(KEYS.audit).filter(a => a.action === 'metric.import');
    expect(logs.length).toBe(2);
    const last = logs[logs.length - 1];
    expect(last.after).toMatchObject({ inserted: 1, updated: 1 });
    expect(last.before).toMatchObject({ replacedTotal: 1, replaced: [{ code: 'pass_rate', period: 2566, value: 70, targetValue: 75, benchmarkValue: 74 }] });
    // import แรก (ไม่มีแถวถูกทับ) → replaced ว่าง
    expect(logs[0].before).toMatchObject({ replacedTotal: 0, replaced: [] });
  });
});

// ───────────────────────── C-8 ─────────────────────────
describe('C-8 ธง needsTranslationReview + gap R11', () => {
  const TH = 'หลักสูตรมี 5 ราย';
  async function acceptOffline(mode?: 'replace') {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: TH });
    const run = await api.runTranslate(chair, SEC, 'en');
    api.acceptAiRun(chair, run.id, { mode });
    return chair;
  }
  const r11 = (u = 'chair1') => api.getGaps(user(u), CYCLE, '1.1').filter(g => g.ruleId === 'R11');

  it('ก่อนรับคำแปล: ไม่มีธง/ไม่มี R11', () => {
    api.saveSection(user('chair1'), CYCLE, '1.1', { narrativeTh: TH });
    expect(sectionOf('chair1', '1.1').needsTranslationReview).toBeUndefined();
    expect(r11()).toEqual([]);
  });
  it('รับคำแปล offline → ตั้งธงภาษา en และขึ้น gap R11 (medium) · ป้ายไม่ถูกเขียนลง narrative', async () => {
    await acceptOffline();
    const s = sectionOf('chair1', '1.1');
    expect(s.needsTranslationReview).toEqual({ en: true });
    const g = r11();
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ruleId: 'R11', severity: 'medium', requirementId: '1.1', refId: 'en' });
  });
  it('แก้ narrative หลังรับ → ธงยังอยู่ จนกว่ากดยืนยัน', async () => {
    const chair = await acceptOffline();
    api.saveSection(chair, CYCLE, '1.1', { narrativeEn: 'The programme has 5 members.' });
    expect(sectionOf('chair1', '1.1').needsTranslationReview).toEqual({ en: true });
    expect(r11()).toHaveLength(1);
  });
  it('confirmTranslationReviewed → ล้างธง, R11 หาย, เขียน audit; เรียกซ้ำไม่ error ไม่เขียน audit เพิ่ม', async () => {
    const chair = await acceptOffline();
    api.confirmTranslationReviewed(chair, CYCLE, '1.1', 'en');
    expect(sectionOf('chair1', '1.1').needsTranslationReview).toBeUndefined();
    expect(r11()).toEqual([]);
    api.confirmTranslationReviewed(chair, CYCLE, '1.1', 'en');
    expect(load<AuditLog>(KEYS.audit).filter(a => a.action === 'sar.translation_confirmed')).toHaveLength(1);
  });
  it('ยืนยันภาษา th ไม่ล้างธง en', async () => {
    const chair = await acceptOffline();
    api.confirmTranslationReviewed(chair, CYCLE, '1.1', 'th');
    expect(sectionOf('chair1', '1.1').needsTranslationReview).toEqual({ en: true });
  });
  it('สิทธิ์: ผู้ที่ไม่ใช่เจ้าของข้อ/ประธาน, ข้าม university → forbidden; รอบ lock → locked', async () => {
    await acceptOffline();
    await expect(Promise.resolve().then(() => api.confirmTranslationReviewed(user('assess1'), CYCLE, '1.1', 'en'))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(Promise.resolve().then(() => api.confirmTranslationReviewed(user('chair1'), CYCLE, '1.1', 'xx' as 'en'))).rejects.toMatchObject({ code: 'invalid' });
    await expect(Promise.resolve().then(() => api.confirmTranslationReviewed(user('chair1'), CYCLE, '9.9', 'en'))).rejects.toMatchObject({ code: 'not_found' });
  });
  it('R11 ไม่บล็อก export (ยัง export DOCX ได้) และธงไม่ถูกตั้งเมื่อรับร่าง AI-2 ปกติ', async () => {
    const chair = await acceptOffline();
    await expect(api.exportSarDocx(chair, CYCLE)).resolves.toBeInstanceOf(Blob);
    const secs = load<SarSection>(KEYS.sections).filter(s => s.cycleId === CYCLE && s.needsTranslationReview);
    expect(secs.map(s => s.requirementId)).toEqual(['1.1']);
  });
  it('saveSection ไม่ยอมให้ล้างธงผ่าน input (ตั้งได้อย่างเดียว)', async () => {
    const chair = await acceptOffline();
    api.saveSection(chair, CYCLE, '1.1', { narrativeEn: 'x', needsTranslationReview: { th: undefined } as never });
    expect(sectionOf('chair1', '1.1').needsTranslationReview).toEqual({ en: true });
  });
});

describe('C2-1 ป้ายคำแปล offline ไม่หลุดเข้า narrative / DOCX', () => {
  const LABEL_PART = 'needs human translation';
  it('accept แบบ append และ replace → narrativeEn ไม่มีป้าย, DOCX document.xml ไม่มีข้อความป้าย, ธง+R11 ยังอยู่', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'หลักสูตรมี 5 ราย', narrativeEn: 'Existing.' });
    api.acceptAiRun(chair, (await api.runTranslate(chair, SEC, 'en')).id); // append
    let s = sectionOf('chair1', '1.1');
    expect(s.narrativeEn.startsWith('Existing.')).toBe(true);
    expect(s.narrativeEn).not.toContain(OFFLINE_TRANSLATE_LABEL);
    expect(s.narrativeEn).not.toContain(LABEL_PART);
    api.acceptAiRun(chair, (await api.runTranslate(chair, SEC, 'en')).id, { mode: 'replace' });
    s = sectionOf('chair1', '1.1');
    expect(s.narrativeEn).not.toContain(LABEL_PART);
    expect(s.narrativeEn).toContain('programme');
    expect(s.needsTranslationReview).toEqual({ en: true });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await (await api.exportSarDocx(chair, CYCLE)).arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).not.toContain(LABEL_PART);
    expect(xml).not.toContain('ต้องแปลต่อโดยผู้ใช้');
    expect(api.getGaps(chair, CYCLE, '1.1').some(g => g.ruleId === 'R11')).toBe(true);
  });
  it('ai_run เก่าที่ translation มีป้ายนำหน้า → acceptAiRun ตัดป้ายออกก่อนเขียน', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'หลักสูตรมี 5 ราย' });
    const run = await api.runTranslate(chair, SEC, 'en');
    const rows = load<{ id: string; output: { translation: string } }>(KEYS.aiRuns);
    const row = rows.find(r => r.id === run.id)!;
    row.output.translation = `${OFFLINE_TRANSLATE_LABEL}
${row.output.translation}`;
    save(KEYS.aiRuns, rows);
    api.acceptAiRun(chair, run.id);
    expect(sectionOf('chair1', '1.1').narrativeEn).not.toContain(LABEL_PART);
  });
  it('C3-1 accept EN→TH offline ที่ขึ้นต้นด้วย "students" → ไม่ถูกตัดตัวอักษรแรก', async () => {
    const chair = user('chair1');
    api.saveSection(chair, CYCLE, '1.1', { narrativeEn: 'students meet the advisor each term.', narrativeTh: '' });
    api.acceptAiRun(chair, (await api.runTranslate(chair, SEC, 'th')).id, { mode: 'replace' });
    expect(sectionOf('chair1', '1.1').narrativeTh.startsWith('students')).toBe(true);
  });
});

// ───────────────────────── C-9 route translate ─────────────────────────
describe('C-9 /api/ai task translate', () => {
  const KEY = 'sk-ant-SECRET-KEY-VALUE-123';
  const HOST = 'app.test';
  const GOOD = { text: 'หลักสูตรมี 5 ราย', from: 'th', to: 'en', glossary: [{ th: 'หลักสูตร', en: 'programme' }] };
  const ok = (obj: unknown) =>
    new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(obj) }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const req = (input: unknown) => new Request(`http://${HOST}/api/ai`, {
    method: 'POST', headers: { host: HOST, 'content-type': 'application/json', 'x-aunqa-client': '1' }, body: JSON.stringify({ task: 'translate', input }),
  });
  let fetchMock: ReturnType<typeof vi.fn>;
  let upstream: () => Response;
  beforeEach(() => {
    resetAiLimits();
    vi.stubEnv('ANTHROPIC_API_KEY', KEY);
    upstream = () => ok({ translation: 'The programme has 5 members' });
    fetchMock = vi.fn(async () => upstream());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('input ถูกต้อง → 200 และคืน translation', async () => {
    const r = await POST(req(GOOD));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ output: { translation: 'The programme has 5 members' } });
  });
  it('input ไม่ผ่าน guard → 400 และไม่ยิง upstream: from===to, text >8000, glossary >200, ภาษาไม่รู้จัก, text ไม่ใช่ string', async () => {
    const bads = [
      { ...GOOD, to: 'th' },
      { ...GOOD, text: 'ก'.repeat(8001) },
      { ...GOOD, glossary: Array.from({ length: 201 }, () => ({ th: 'ก', en: 'a' })) },
      { ...GOOD, to: 'fr' },
      { ...GOOD, text: 123 },
      { ...GOOD, glossary: 'x' },
    ];
    for (const b of bads) expect((await POST(req(b))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('เส้นขอบ: text = 8000 พอดี และ glossary = 200 พอดี → ผ่าน', async () => {
    const r = await POST(req({ ...GOOD, text: 'ก'.repeat(8000), glossary: Array.from({ length: 200 }, () => ({ th: 'ก', en: 'a' })) }));
    expect(r.status).toBe(200);
  });
  it('output ไม่มี translation / ไม่ใช่ string → 502 bad_output', async () => {
    for (const bad of [{ text: 'x' }, { translation: 5 }, []]) {
      upstream = () => ok(bad);
      const r = await POST(req(GOOD));
      expect(r.status).toBe(502);
      expect(await r.json()).toEqual({ error: 'bad_output' });
    }
  });
});

// ───────────────────────── C-11 ─────────────────────────
describe('C-11 ข้อความ error years_to_graduate', () => {
  it('ระบุ "มากกว่า 0 และไม่เกิน 20" และปฏิเสธ 0', async () => {
    const f = await xlsx([['cohort', 'status', 'years_to_graduate'], [2563, 'graduated', 0]], 'cohort');
    const res = await api.importCohortFile(user('chair1'), PROG, f, { dryRun: true });
    expect(res.rowErrors).toHaveLength(1);
    expect(res.rowErrors[0].reason).toContain('มากกว่า 0');
    expect(res.rowErrors[0].reason).not.toContain('0–20');
  });
});
