/**
 * Import metrics / cohort จาก Excel (M6, spec 5 + 11.2)
 *  - buildMetricTemplate / buildCohortTemplate → xlsx Blob
 *  - previewMetricImport → commitMetricImport (preview เก็บในหน่วยความจำเท่านั้น หมดอายุ 30 นาที ไม่ลง localStorage)
 *  - importCohortFile: คำนวณ pass/dropout/time-to-graduate ต่อรุ่น แล้วเก็บ "เฉพาะผลรวม"
 *    ไฟล์รายคนอ่านแค่ 3 คอลัมน์ (cohort, status, years_to_graduate) · คอลัมน์อื่น (รหัส/ชื่อ) ไม่ถูกอ่าน/เก็บ/ลง audit
 * TODO(PostgreSQL): metrics UNIQUE(programme_id, code, period) — เขียนแบบ batch ใน transaction เดียว
 */
import ExcelJS from 'exceljs';
import type { AppUser, MetricValue } from '../types';
import { newId } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { listMetricDefinitions } from './framework';
import { getMetricDefinition, validateMetricValue } from './metrics.store';
import { getProgramme, programmeScope } from './org.store';
import { can } from './rbac';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COHORT_ROWS = 100_000;
const PREVIEW_TTL_MS = 30 * 60_000;
const MAX_PREVIEWS = 20;
const BROWN_DARK = 'FF6B4F2F';

// ─── helpers ─────────────────────────────────────────────────────────────
function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BROWN_DARK } };
}

async function toBlob(wb: ExcelJS.Workbook): Promise<Blob> {
  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME });
}

// D-sec A-5: กัน zip bomb — ตรวจขนาดหลังแตก zip จาก central directory ก่อนให้ exceljs โหลด
const MAX_UNZIPPED_BYTES = 60 * 1024 * 1024; // รวมทุก entry (cohort 100,000 แถว ≈ 15–25 MB)
const MAX_ZIP_ENTRIES = 1000;

/**
 * อ่าน central directory ของ zip (ไม่แตกไฟล์) → ขนาดรวมหลังแตก + จำนวน entry
 * ไม่ใช่ zip / ZIP64 / directory เสีย → throw invalid
 * ข้อจำกัด: ค่าใน directory ผู้สร้างไฟล์ปลอมได้ — JSZip (ใน exceljs) ตรวจ size mismatch หลังแตกอีกชั้น
 */
export function inspectZipDirectory(buf: ArrayBuffer): { entries: number; uncompressed: number } {
  const bad = (m = 'อ่านไฟล์ไม่ได้ — ต้องเป็นไฟล์ .xlsx') => new AunqaError('invalid', m);
  const dv = new DataView(buf);
  const len = buf.byteLength;
  if (len < 22) throw bad();
  let eocd = -1;
  for (let i = len - 22; i >= Math.max(0, len - 22 - 0xFFFF); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw bad();
  const total = dv.getUint16(eocd + 10, true);
  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  if (total === 0xFFFF || cdSize === 0xFFFFFFFF || cdOffset === 0xFFFFFFFF) throw bad('ไม่รองรับไฟล์ zip ขนาดใหญ่พิเศษ (ZIP64)');
  if (total > MAX_ZIP_ENTRIES) throw bad(`ไฟล์มีส่วนประกอบมากเกินไป (เกิน ${MAX_ZIP_ENTRIES})`);
  if (cdOffset + cdSize > len) throw bad();
  let p = cdOffset; let sum = 0;
  for (let n = 0; n < total; n++) {
    if (p + 46 > len || dv.getUint32(p, true) !== 0x02014b50) throw bad();
    const size = dv.getUint32(p + 24, true);
    if (size === 0xFFFFFFFF) throw bad('ไม่รองรับไฟล์ zip ขนาดใหญ่พิเศษ (ZIP64)');
    sum += size;
    if (sum > MAX_UNZIPPED_BYTES) throw bad(`ข้อมูลในไฟล์ใหญ่เกินไปหลังแตกไฟล์ (เกิน ${MAX_UNZIPPED_BYTES / 1024 / 1024} MB)`);
    p += 46 + dv.getUint16(p + 28, true) + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return { entries: total, uncompressed: sum };
}

async function readWorkbook(file: Blob): Promise<ExcelJS.Workbook> {
  if (!file || typeof file.arrayBuffer !== 'function') throw new AunqaError('invalid', 'ไม่พบไฟล์');
  if (file.size > MAX_BYTES) throw new AunqaError('invalid', 'ไฟล์ใหญ่เกิน 5 MB');
  const buf = await file.arrayBuffer();
  inspectZipDirectory(buf); // D-sec A-5: ก่อนโหลดทั้งไฟล์
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    throw new AunqaError('invalid', 'อ่านไฟล์ไม่ได้ — ต้องเป็นไฟล์ .xlsx');
  }
  return wb;
}

/** ค่าในเซลล์ → primitive (รองรับ formula result / rich text / hyperlink) */
function cellValue(c: ExcelJS.Cell): string | number | boolean | Date | null {
  let v: unknown = c.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if ('result' in o) v = o.result;
    else if (Array.isArray(o.richText)) v = o.richText.map(r => r.text).join('');
    else if (typeof o.text === 'string') v = o.text;
    else v = null;
  }
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') { const t = v.trim(); return t === '' ? null : t; }
  if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return v;
  return null;
}

function toNumber(v: ReturnType<typeof cellValue>): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^[-+]?\d+(\.\d+)?$/.test(v.replace(/,/g, ''))) return Number(v.replace(/,/g, ''));
  return null;
}

/** map ชื่อหัวคอลัมน์ (lowercase) → เลขคอลัมน์ จากแถว 1 */
function headerMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const m = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const v = cellValue(cell);
    if (typeof v === 'string') m.set(v.toLowerCase().replace(/\s+/g, '_'), col);
  });
  return m;
}

function pickSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.getWorksheet(name) ?? wb.worksheets[0];
  if (!ws) throw new AunqaError('invalid', 'ไฟล์ไม่มีแผ่นงาน');
  return ws;
}

function assertWriter(actor: AppUser, programmeId: string) {
  const prog = getProgramme(programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(actor, 'metric.write', programmeScope(prog.id))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์กรอกข้อมูล metric');
  return prog;
}

// ─── Template ────────────────────────────────────────────────────────────
/** Excel template สำหรับ import metric: แผ่น metrics (กรอก) + แผ่น codes (รหัสที่ใช้ได้) */
export async function buildMetricTemplate(): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('metrics');
  ws.columns = [
    { header: 'code', key: 'code', width: 24 }, { header: 'period', key: 'period', width: 10 }, { header: 'value', key: 'value', width: 12 },
    { header: 'target', key: 'target', width: 12 }, { header: 'benchmark', key: 'benchmark', width: 12 }, { header: 'benchmark_source', key: 'src', width: 36 },
  ];
  styleHeader(ws.getRow(1));
  ws.addRow({ code: 'pass_rate', period: 2566, value: 85, target: 90, benchmark: 88, src: 'ตัวอย่าง: ค่าเฉลี่ยหลักสูตรคู่เทียบ (ลบแถวนี้ก่อนกรอกจริง)' });
  const codes = wb.addWorksheet('codes');
  codes.columns = [{ header: 'code', key: 'code', width: 24 }, { header: 'ชื่อ', key: 'name', width: 40 }, { header: 'หน่วย', key: 'unit', width: 14 }, { header: 'ชนิด period', key: 'pt', width: 18 }];
  styleHeader(codes.getRow(1));
  listMetricDefinitions().forEach(d => codes.addRow({ code: d.code, name: d.nameTh, unit: d.unit, pt: d.periodType }));
  const help = wb.addWorksheet('วิธีใช้');
  [
    'กรอกแผ่น "metrics" 1 แถวต่อ 1 ค่า: code (ดูแผ่น codes), period (ปี/รุ่น เช่น 2566), value, target/benchmark/benchmark_source (ไม่บังคับ)',
    'ค่าที่มีหน่วย % ต้องอยู่ในช่วง 0–100 · ห้ามติดลบ · ห้ามกรอก code+period ซ้ำในไฟล์',
    'ข้อมูลที่กรอกต้องเป็นผลรวม/สถิติระดับหลักสูตร ห้ามใส่ข้อมูลรายบุคคล',
  ].forEach(t => help.addRow([t]));
  help.getColumn(1).width = 110;
  return toBlob(wb);
}

/** Excel template สำหรับไฟล์ cohort รายคน (ใช้คำนวณแล้วทิ้ง — ไม่เก็บ) */
export async function buildCohortTemplate(): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('cohort');
  ws.columns = [
    { header: 'cohort', key: 'cohort', width: 10 }, { header: 'status', key: 'status', width: 18 }, { header: 'years_to_graduate', key: 'y', width: 20 },
  ];
  styleHeader(ws.getRow(1));
  ws.addRow({ cohort: 2563, status: 'graduated', y: 4 });
  ws.addRow({ cohort: 2563, status: 'dropped_out', y: '' });
  ws.addRow({ cohort: 2563, status: 'enrolled', y: '' });
  const help = wb.addWorksheet('วิธีใช้');
  [
    'cohort = ปีที่เข้าศึกษา (รุ่น) · status = graduated | dropped_out | enrolled (หรือ จบ | พ้นสภาพ/ลาออก | กำลังศึกษา)',
    'years_to_graduate = จำนวนปีที่ใช้จนจบ (ต้องกรอกเมื่อ status = graduated)',
    'ระบบอ่านเฉพาะ 3 คอลัมน์นี้ — ไม่ต้องใส่รหัสนักศึกษา/ชื่อ (ถ้ามีในไฟล์ ระบบไม่อ่านและไม่เก็บ)',
  ].forEach(t => help.addRow([t]));
  help.getColumn(1).width = 110;
  return toBlob(wb);
}

// ─── Metric import: preview → commit ─────────────────────────────────────
export interface MetricPreviewRow {
  /** เลขแถวในไฟล์ (นับจากแถวหัว = 1) */
  rowNo: number;
  code: string; period: number | null; value: number | null;
  targetValue?: number; benchmarkValue?: number; benchmarkSource?: string;
  ok: boolean; errors: string[];
  /** มีค่าเดิมในระบบ → commit จะแทนที่ */
  existingValue?: number;
}
export interface MetricPreview {
  previewId: string; programmeId: string;
  rows: MetricPreviewRow[];
  okCount: number; errorCount: number;
  /** ปีที่ขาดกลางช่วง และ metric ที่มีข้อมูลไม่ถึง 3 ปี (รวมค่าเดิมในระบบ) */
  warnings: string[];
}

interface StoredPreview { programmeId: string; actorId: string; at: number; rows: MetricPreviewRow[] }
const previews = new Map<string, StoredPreview>();

function gcPreviews() {
  const now = Date.now();
  previews.forEach((p, id) => { if (now - p.at > PREVIEW_TTL_MS) previews.delete(id); });
  while (previews.size >= MAX_PREVIEWS) { const first = previews.keys().next().value; if (first === undefined) break; previews.delete(first); }
}

/** อ่านไฟล์ + ตรวจแต่ละแถว (ยังไม่เขียนอะไร) — แถวผิดระบุเลขแถวและเหตุผล */
export async function previewMetricImport(actor: AppUser, programmeId: string, file: Blob): Promise<MetricPreview> {
  assertWriter(actor, programmeId);
  const ws = pickSheet(await readWorkbook(file), 'metrics');
  const h = headerMap(ws);
  for (const need of ['code', 'period', 'value']) if (!h.has(need)) throw new AunqaError('invalid', `ไม่พบคอลัมน์ "${need}" ในแถวหัวตาราง`);
  const col = (n: string) => h.get(n);
  if (ws.rowCount - 1 > MAX_ROWS) throw new AunqaError('invalid', `ไฟล์มีมากกว่า ${MAX_ROWS} แถว`);

  const existing = load<MetricValue>(KEYS.metrics).filter(m => m.programmeId === programmeId);
  const rows: MetricPreviewRow[] = [];
  const seen = new Map<string, number>();
  const get = (r: ExcelJS.Row, name: string) => { const c = col(name); return c ? cellValue(r.getCell(c)) : null; };

  for (let n = 2; n <= ws.rowCount; n++) {
    const r = ws.getRow(n);
    const codeV = get(r, 'code'), periodV = get(r, 'period'), rawValueV = get(r, 'value');
    const rawTargetV = get(r, 'target'), rawBenchV = get(r, 'benchmark'), srcV = get(r, 'benchmark_source');
    if ([codeV, periodV, rawValueV, rawTargetV, rawBenchV, srcV].every(x => x === null)) continue; // แถวว่าง
    const errors: string[] = [];
    const code = typeof codeV === 'string' ? codeV : '';
    const def = code ? getMetricDefinition(code) : undefined;
    // C-5: เซลล์ตัวเลขที่ตั้งรูปแบบ % ใน Excel เก็บเป็นเศษส่วน (85% = 0.85) → คูณ 100 เมื่อหน่วย metric เป็น % · หน่วยอื่น = ปฏิเสธ
    const pctAdjust = (name: string, v: ReturnType<typeof cellValue>, label: string): ReturnType<typeof cellValue> => {
      const c = col(name);
      if (typeof v !== 'number' || !c || !String(r.getCell(c).numFmt ?? '').includes('%')) return v;
      if (!def) return v;
      if (def.unit.trim() === '%') return Math.round(v * 100 * 1e8) / 1e8;
      errors.push(`${label}ตั้งรูปแบบเซลล์เป็น % แต่หน่วยของ metric นี้ไม่ใช่ % — ใช้รูปแบบตัวเลขทั่วไป`);
      return v;
    };
    const valueV = pctAdjust('value', rawValueV, 'value'), targetV = pctAdjust('target', rawTargetV, 'target'), benchV = pctAdjust('benchmark', rawBenchV, 'benchmark');
    if (!code) errors.push('ไม่ระบุ code'); else if (!def) errors.push(`ไม่รู้จักรหัส "${code.slice(0, 40)}"`);
    const period = toNumber(periodV);
    if (period === null || !Number.isInteger(period) || period < 1900 || period > 2700) errors.push('ปี/รุ่น (period) ต้องเป็นจำนวนเต็มช่วง 1900–2700');
    const value = toNumber(valueV);
    if (value === null) errors.push('value ต้องเป็นตัวเลข');
    const opt = (v: ReturnType<typeof cellValue>, label: string): number | undefined => {
      if (v === null) return undefined;
      const x = toNumber(v);
      if (x === null) { errors.push(`${label}ต้องเป็นตัวเลข`); return undefined; }
      return x;
    };
    const targetValue = opt(targetV, 'target'), benchmarkValue = opt(benchV, 'benchmark');
    let benchmarkSource: string | undefined;
    if (srcV !== null) {
      benchmarkSource = String(srcV);
      if (benchmarkSource.length > 300) { errors.push('benchmark_source ยาวเกิน 300 ตัวอักษร'); benchmarkSource = undefined; }
    }
    if (def && value !== null) {
      const err = validateMetricValue(def, { value, targetValue, benchmarkValue });
      if (err) errors.push(err);
    }
    if (def && period !== null && Number.isInteger(period) && errors.length === 0) { // แถวที่ผิดอยู่แล้วไม่นับเป็น "แถวแรก" ของคู่ซ้ำ
      const key = `${code}|${period}`;
      const first = seen.get(key);
      if (first !== undefined) errors.push(`ปีซ้ำ: ${code} ปี ${period} ซ้ำกับแถว ${first}`);
      else seen.set(key, n);
    }
    const ex = def && period !== null ? existing.find(m => m.code === code && m.period === period) : undefined;
    rows.push({
      rowNo: n, code, period, value, targetValue, benchmarkValue, benchmarkSource,
      ok: errors.length === 0, errors, existingValue: errors.length === 0 ? ex?.value : undefined,
    });
  }
  if (!rows.length) throw new AunqaError('invalid', 'ไม่พบข้อมูลในไฟล์');

  // คำเตือนเรื่องปีขาด / ข้อมูลไม่ถึง 3 ปี
  const warnings: string[] = [];
  const okRows = rows.filter(x => x.ok);
  for (const code of Array.from(new Set(okRows.map(x => x.code)))) {
    const periods = Array.from(new Set([...okRows.filter(x => x.code === code).map(x => x.period as number),
      ...existing.filter(m => m.code === code).map(m => m.period)])).sort((a, b) => a - b);
    const missing: number[] = [];
    for (let p = periods[0]; p <= periods[periods.length - 1]; p++) if (!periods.includes(p)) missing.push(p);
    if (missing.length) warnings.push(`${code}: ปีที่ขาด ${missing.join(', ')}`);
    if (periods.length < 3) warnings.push(`${code}: ข้อมูลไม่ครบ 3 ปี (มี ${periods.length} ปี)`);
  }

  gcPreviews();
  const previewId = newId('mpv');
  previews.set(previewId, { programmeId, actorId: actor.id, at: Date.now(), rows: okRows });
  return { previewId, programmeId, rows, okCount: okRows.length, errorCount: rows.length - okRows.length, warnings };
}

/** ยืนยัน preview → เขียนเฉพาะแถวที่ผ่าน (upsert ตาม programme+code+period) · 1 audit ต่อการ import */
export function commitMetricImport(actor: AppUser, previewId: string): { inserted: number; updated: number; skipped: number } {
  const p = previews.get(previewId);
  if (!p || Date.now() - p.at > PREVIEW_TTL_MS) { previews.delete(previewId); throw new AunqaError('not_found', 'ไม่พบ preview หรือหมดอายุ — อัปโหลดไฟล์ใหม่'); }
  if (p.actorId !== actor.id) throw new AunqaError('forbidden', 'preview นี้เป็นของผู้ใช้อื่น');
  assertWriter(actor, p.programmeId);
  if (!p.rows.length) throw new AunqaError('invalid', 'ไม่มีแถวที่ผ่านการตรวจ');

  const rows = load<MetricValue>(KEYS.metrics);
  let inserted = 0, updated = 0;
  const replaced: { code: string; period: number; value: number; targetValue?: number; benchmarkValue?: number; benchmarkSource?: string }[] = [];
  for (const r of p.rows) {
    const cur = rows.find(x => x.programmeId === p.programmeId && x.code === r.code && x.period === r.period);
    // C-6: คอลัมน์ว่าง = คงค่าเดิม (ไม่ล้าง target/benchmark ที่มีอยู่) · เก็บค่าเก่าของแถวที่ถูกทับลง audit
    const patch: Partial<MetricValue> = { value: r.value as number };
    if (r.targetValue !== undefined) patch.targetValue = r.targetValue;
    if (r.benchmarkValue !== undefined) patch.benchmarkValue = r.benchmarkValue;
    if (r.benchmarkSource !== undefined) patch.benchmarkSource = r.benchmarkSource;
    if (cur) {
      replaced.push({ code: cur.code, period: cur.period, value: cur.value, targetValue: cur.targetValue, benchmarkValue: cur.benchmarkValue, benchmarkSource: cur.benchmarkSource });
      Object.assign(cur, patch); updated++;
    }
    else { rows.push({ id: newId('met'), programmeId: p.programmeId, code: r.code, period: r.period as number, value: r.value as number, ...patch }); inserted++; }
  }
  save(KEYS.metrics, rows);
  previews.delete(previewId);
  appendAudit(actor, { action: 'metric.import', targetType: 'programme', targetId: p.programmeId, programmeId: p.programmeId, before: { replaced: replaced.slice(0, 500), replacedTotal: replaced.length }, after: { inserted, updated } });
  return { inserted, updated, skipped: 0 };
}

// ─── Cohort import (คำนวณแล้วเก็บเฉพาะผลรวม) ─────────────────────────────
export interface CohortRowError { rowNo: number; reason: string }
export interface CohortResult {
  cohort: number; total: number; graduated: number; graduatedOnTime: number; droppedOut: number; enrolled: number;
  passRate: number; dropoutRate: number; timeToGraduate: number | null;
}
export interface CohortImportResult {
  committed: boolean; rowsRead: number; cohorts: CohortResult[]; rowErrors: CohortRowError[]; warnings: string[];
  written: { inserted: number; updated: number };
}
export interface CohortImportOptions {
  /** ระยะเวลาศึกษาตามหลักสูตร (ปี) ใช้นิยาม "จบตามเวลา" (default 4) */
  standardYears?: number;
  /** true = คำนวณ/ตรวจอย่างเดียว ไม่เขียน (rowErrors ไม่ throw) */
  dryRun?: boolean;
}

const STATUS_ALIAS: Record<string, 'graduated' | 'dropped_out' | 'enrolled'> = {
  graduated: 'graduated', graduate: 'graduated', จบ: 'graduated', สำเร็จการศึกษา: 'graduated',
  dropped_out: 'dropped_out', dropout: 'dropped_out', dropped: 'dropped_out', พ้นสภาพ: 'dropped_out', ลาออก: 'dropped_out', ออกกลางคัน: 'dropped_out',
  enrolled: 'enrolled', studying: 'enrolled', active: 'enrolled', กำลังศึกษา: 'enrolled',
};
const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * อ่านไฟล์ cohort รายคน → ผลรวมต่อรุ่น → เขียนลง metrics (pass_rate, dropout_rate, time_to_graduate; period = รุ่น)
 * ถ้ามีแถวผิดแม้แถวเดียว → ไม่เขียนอะไรเลย (throw invalid + detail.rowErrors) เพื่อไม่ให้อัตราเอนเอียงเงียบ ๆ
 * pass_rate = จบภายใน standardYears / ทั้งรุ่น · dropout_rate = พ้นสภาพ / ทั้งรุ่น · time_to_graduate = เฉลี่ยปีของผู้จบทุกคน
 */
export async function importCohortFile(actor: AppUser, programmeId: string, file: Blob, opts: CohortImportOptions = {}): Promise<CohortImportResult> {
  assertWriter(actor, programmeId);
  const std = opts.standardYears ?? 4;
  if (!Number.isFinite(std) || std <= 0 || std > 15) throw new AunqaError('invalid', 'ระยะเวลาศึกษาตามหลักสูตรไม่ถูกต้อง');
  const ws = pickSheet(await readWorkbook(file), 'cohort');
  const h = headerMap(ws);
  for (const need of ['cohort', 'status']) if (!h.has(need)) throw new AunqaError('invalid', `ไม่พบคอลัมน์ "${need}" ในแถวหัวตาราง`);
  if (ws.rowCount - 1 > MAX_COHORT_ROWS) throw new AunqaError('invalid', `ไฟล์มีมากกว่า ${MAX_COHORT_ROWS} แถว`);
  const cCohort = h.get('cohort')!, cStatus = h.get('status')!, cYears = h.get('years_to_graduate');

  const rowErrors: CohortRowError[] = [];
  const acc = new Map<number, { total: number; grad: number; onTime: number; drop: number; enr: number; yearsSum: number }>();
  let rowsRead = 0;
  for (let n = 2; n <= ws.rowCount; n++) {
    const r = ws.getRow(n);
    const cv = cellValue(r.getCell(cCohort)), sv = cellValue(r.getCell(cStatus)), yv = cYears ? cellValue(r.getCell(cYears)) : null;
    if (cv === null && sv === null && yv === null) continue;
    rowsRead++;
    const cohort = toNumber(cv);
    if (cohort === null || !Number.isInteger(cohort) || cohort < 1900 || cohort > 2700) { rowErrors.push({ rowNo: n, reason: 'cohort ต้องเป็นปีที่เข้าศึกษา (จำนวนเต็ม 1900–2700)' }); continue; }
    const status = typeof sv === 'string' ? STATUS_ALIAS[sv.toLowerCase().replace(/\s+/g, '_')] : undefined;
    if (!status) { rowErrors.push({ rowNo: n, reason: 'status ต้องเป็น graduated | dropped_out | enrolled' }); continue; }
    let years = 0;
    if (status === 'graduated') {
      const y = toNumber(yv);
      if (y === null || y <= 0 || y > 20) { rowErrors.push({ rowNo: n, reason: 'status=graduated ต้องมี years_to_graduate เป็นตัวเลขมากกว่า 0 และไม่เกิน 20' }); continue; }
      years = y;
    }
    const a = acc.get(cohort) ?? { total: 0, grad: 0, onTime: 0, drop: 0, enr: 0, yearsSum: 0 };
    a.total++;
    if (status === 'graduated') { a.grad++; a.yearsSum += years; if (years <= std) a.onTime++; }
    else if (status === 'dropped_out') a.drop++;
    else a.enr++;
    acc.set(cohort, a);
  }
  if (!rowsRead) throw new AunqaError('invalid', 'ไม่พบข้อมูลในไฟล์');
  if (rowErrors.length && !opts.dryRun)
    throw new AunqaError('invalid', `ไฟล์มี ${rowErrors.length} แถวที่ไม่ถูกต้อง (เช่น แถว ${rowErrors[0].rowNo}) — ไม่ได้นำเข้าอะไร`, { rowErrors: rowErrors.slice(0, 200) });

  const warnings: string[] = [];
  const cohorts: CohortResult[] = Array.from(acc.keys()).sort((a, b) => a - b).map(c => {
    const a = acc.get(c)!;
    if (a.enr) warnings.push(`รุ่น ${c}: ยังมีผู้ศึกษาอยู่ ${a.enr} คน — ค่าจะเปลี่ยนเมื่อรุ่นจบ`);
    if (!a.grad) warnings.push(`รุ่น ${c}: ยังไม่มีผู้จบ จึงไม่คำนวณ time_to_graduate`);
    return {
      cohort: c, total: a.total, graduated: a.grad, graduatedOnTime: a.onTime, droppedOut: a.drop, enrolled: a.enr,
      passRate: round2((a.onTime / a.total) * 100), dropoutRate: round2((a.drop / a.total) * 100),
      timeToGraduate: a.grad ? round2(a.yearsSum / a.grad) : null,
    };
  });

  const written = { inserted: 0, updated: 0 };
  if (!opts.dryRun && !rowErrors.length) {
    const rows = load<MetricValue>(KEYS.metrics);
    const put = (code: string, period: number, value: number) => {
      const cur = rows.find(x => x.programmeId === programmeId && x.code === code && x.period === period);
      if (cur) { cur.value = value; written.updated++; }
      else { rows.push({ id: newId('met'), programmeId, code, period, value }); written.inserted++; }
    };
    cohorts.forEach(c => {
      put('pass_rate', c.cohort, c.passRate);
      put('dropout_rate', c.cohort, c.dropoutRate);
      if (c.timeToGraduate !== null) put('time_to_graduate', c.cohort, c.timeToGraduate);
    });
    save(KEYS.metrics, rows);
    // audit: เฉพาะจำนวนรวม — ไม่ใส่ข้อมูลรายคน/ชื่อไฟล์
    appendAudit(actor, {
      action: 'metric.import_cohort', targetType: 'programme', targetId: programmeId, programmeId,
      after: { cohorts: cohorts.length, rows: rowsRead, inserted: written.inserted, updated: written.updated },
    });
  }
  return { committed: !opts.dryRun && !rowErrors.length, rowsRead, cohorts, rowErrors, warnings, written };
}
