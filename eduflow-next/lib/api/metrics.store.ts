/**
 * Metrics (M6 แบบตาราง — กราฟอยู่ Phase B) · เก็บเฉพาะผลรวม ไม่เก็บข้อมูลรายบุคคล
 * TODO(PostgreSQL): metrics(programme_id, code, period) UNIQUE
 */
import type { AppUser, MetricDefinition, MetricValue } from '../types';
import { newId } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { listMetricDefinitions } from './framework';
import { getProgramme, programmeScope } from './org.store';
import { can } from './rbac';
import { requireActiveActor } from './auth.api';

export function getMetricDefinition(code: string): MetricDefinition | undefined {
  return listMetricDefinitions().find(d => d.code === code);
}

export function listMetrics(user: AppUser, programmeId: string, code?: string): MetricValue[] {
  if (!can(user, 'read', programmeScope(programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูข้อมูลหลักสูตรนี้');
  return load<MetricValue>(KEYS.metrics)
    .filter(m => m.programmeId === programmeId && (!code || m.code === code))
    .sort((a, b) => a.code.localeCompare(b.code) || a.period - b.period);
}

/** ตรวจค่าตามหน่วย: % ต้อง 0–100, ค่าอื่นต้องไม่ติดลบ */
export function validateMetricValue(def: MetricDefinition, v: { value: number; targetValue?: number; benchmarkValue?: number }): string | null {
  for (const [label, n] of [['ค่า', v.value], ['เป้าหมาย', v.targetValue], ['ค่าเทียบเคียง', v.benchmarkValue]] as const) {
    if (n === undefined) continue;
    if (typeof n !== 'number' || !Number.isFinite(n)) return `${label}ต้องเป็นตัวเลข`;
    if (n < 0) return `${label}ต้องไม่ติดลบ`;
    if (def.unit.trim() === '%' && n > 100) return `${label}ต้องอยู่ในช่วง 0–100 (%)`;
  }
  return null;
}

export interface MetricInput {
  programmeId: string; code: string; period: number; value: number;
  targetValue?: number; benchmarkValue?: number; benchmarkSource?: string;
}

/** เพิ่ม/แก้ค่า metric (unique ต่อ programme+code+period → upsert) */
export function upsertMetric(actor: AppUser, input: MetricInput): MetricValue {
  requireActiveActor(actor);
  const prog = getProgramme(input.programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(actor, 'metric.write', programmeScope(prog.id))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์กรอกข้อมูล metric');
  const def = getMetricDefinition(input.code);
  if (!def) throw new AunqaError('invalid', 'ไม่รู้จักรหัส metric');
  if (!Number.isInteger(input.period) || input.period < 1900 || input.period > 2700) throw new AunqaError('invalid', 'ปี/รุ่นไม่ถูกต้อง');
  const err = validateMetricValue(def, input);
  if (err) throw new AunqaError('invalid', err);
  if (input.benchmarkSource && input.benchmarkSource.length > 300) throw new AunqaError('invalid', 'แหล่งที่มาของค่าเทียบเคียงยาวเกินไป');

  const rows = load<MetricValue>(KEYS.metrics);
  let m = rows.find(x => x.programmeId === prog.id && x.code === input.code && x.period === input.period);
  const before = m ? { ...m } : undefined;
  if (m) Object.assign(m, { value: input.value, targetValue: input.targetValue, benchmarkValue: input.benchmarkValue, benchmarkSource: input.benchmarkSource });
  else {
    m = { id: newId('met'), programmeId: prog.id, code: input.code, period: input.period, value: input.value,
      targetValue: input.targetValue, benchmarkValue: input.benchmarkValue, benchmarkSource: input.benchmarkSource };
    rows.push(m);
  }
  save(KEYS.metrics, rows);
  appendAudit(actor, { action: 'metric.upsert', targetType: 'metric', targetId: m.id, programmeId: prog.id, before, after: m });
  return m;
}

export function deleteMetric(actor: AppUser, id: string): void {
  requireActiveActor(actor);
  const rows = load<MetricValue>(KEYS.metrics);
  const m = rows.find(x => x.id === id);
  if (!m) return;
  if (!can(actor, 'metric.write', programmeScope(m.programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ลบข้อมูล metric');
  save(KEYS.metrics, rows.filter(x => x.id !== id));
  appendAudit(actor, { action: 'metric.delete', targetType: 'metric', targetId: id, programmeId: m.programmeId, before: m });
}
