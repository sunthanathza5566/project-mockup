/** Framework library (M2) — อ่านอย่างเดียวจาก seed กลาง (global ไม่มี university_id) */
import type { Criterion, MetricDefinition, Requirement } from '../types';
import { AUNQA_V4_CRITERIA, AUNQA_V4_REQUIREMENTS, METRIC_DEFINITIONS } from '../mock-data/aunqa';

export const FRAMEWORK_CODE = 'AUNQA-P-v4';

export function listCriteria(): Criterion[] { return AUNQA_V4_CRITERIA; }
export function listRequirements(criterionNo?: number): Requirement[] {
  return criterionNo ? AUNQA_V4_REQUIREMENTS.filter(r => r.criterionNo === criterionNo) : AUNQA_V4_REQUIREMENTS;
}
export function getRequirement(id: string): Requirement | undefined {
  return AUNQA_V4_REQUIREMENTS.find(r => r.id === id);
}
export function listMetricDefinitions(): MetricDefinition[] { return METRIC_DEFINITIONS; }

/** ลำดับเรียง "1.1" < "1.2" < "2.1" < "8.5" (เทียบเป็นตัวเลข ไม่ใช่ string) */
export function compareReqId(a: string, b: string): number {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return a1 - b1 || a2 - b2;
}

/** ค้นหา requirement ทั้ง TH/EN (ข้อความ, ภาษาคน, evidence แนะนำ, หมายเลข) */
export function searchRequirements(q: string): Requirement[] {
  const s = q.trim().toLowerCase();
  if (!s) return AUNQA_V4_REQUIREMENTS;
  return AUNQA_V4_REQUIREMENTS.filter(r =>
    r.id.startsWith(s) ||
    [r.textEn, r.textTh, r.plainTh, ...r.suggestedEvidence, ...r.diagnosticQuestions]
      .some(t => t.toLowerCase().includes(s)));
}
