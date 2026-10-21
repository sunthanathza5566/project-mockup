// metric เดโม่ของหลักสูตร prog-demo-cs (ตัวเลขสมมติ) 5 ปี 2565–2569
// จงใจ: publications_student มีแค่ 2 ปี (2568–2569) เพื่อให้กฎ "ข้อมูลไม่ครบ 3 ปี" ทำงาน
import type { MetricValue } from '../../types';

const PROG = 'prog-demo-cs';
const YEARS = [2565, 2566, 2567, 2568, 2569];

interface Spec {
  code: string;
  values: number[];
  years?: number[];
  target?: number;
  benchmark?: number;
  benchmarkSource?: string;
}

const SPECS: Spec[] = [
  { code: 'pass_rate', values: [68, 71, 73, 76, 78], target: 75, benchmark: 74, benchmarkSource: 'หลักสูตรวิทยาการคอมพิวเตอร์ มหาวิทยาลัยคู่เทียบ (สมมติ)' },
  { code: 'dropout_rate', values: [14, 12, 11, 9, 8], target: 10, benchmark: 9.5, benchmarkSource: 'หลักสูตรวิทยาการคอมพิวเตอร์ มหาวิทยาลัยคู่เทียบ (สมมติ)' },
  { code: 'time_to_graduate', values: [4.6, 4.5, 4.4, 4.3, 4.3], target: 4.5, benchmark: 4.4, benchmarkSource: 'หลักสูตรคู่เทียบ (สมมติ)' },
  { code: 'employment_rate', values: [82, 85, 87, 90, 91], target: 88, benchmark: 86, benchmarkSource: 'ข้อมูลภาวะการมีงานทำระดับสาขา (สมมติ)' },
  { code: 'further_study_rate', values: [8, 7, 9, 6, 7] },
  { code: 'self_employed_rate', values: [3, 4, 3, 5, 6] },
  { code: 'publications_staff', values: [12, 15, 14, 19, 22], target: 18, benchmark: 17, benchmarkSource: 'หลักสูตรคู่เทียบ (สมมติ)' },
  { code: 'publications_student', values: [6, 9], years: [2568, 2569], target: 8 },
  { code: 'research_funding', values: [1200000, 1500000, 1800000, 2100000, 2600000], target: 2000000 },
  { code: 'plo_achievement', values: [72, 75, 77, 80, 83], target: 80 },
  { code: 'satisfaction_student', values: [3.9, 4.0, 4.1, 4.2, 4.3], target: 4.2, benchmark: 4.1, benchmarkSource: 'ผลสำรวจกลางมหาวิทยาลัยคู่เทียบ (สมมติ)' },
  { code: 'satisfaction_employer', values: [4.0, 4.1, 4.1, 4.3, 4.4], target: 4.2 },
  { code: 'intake', values: [55, 60, 58, 64, 70] },
  { code: 'staff_student_ratio', values: [18, 17, 17, 16, 15], target: 20 },
  { code: 'staff_qualification', values: [55, 58, 60, 64, 67], target: 60 },
  { code: 'appeal_count', values: [9, 7, 6, 4, 3] },
];

export const DEMO_METRICS: MetricValue[] = SPECS.flatMap(s => {
  const years = s.years ?? YEARS;
  return years.map((period, i): MetricValue => ({
    id: `mv-${s.code}-${period}`,
    programmeId: PROG,
    code: s.code,
    period,
    value: s.values[i],
    ...(s.target !== undefined ? { targetValue: s.target } : {}),
    ...(s.benchmark !== undefined ? { benchmarkValue: s.benchmark, benchmarkSource: s.benchmarkSource } : {}),
  }));
});
