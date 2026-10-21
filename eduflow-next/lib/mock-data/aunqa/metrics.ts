// นิยาม metric มาตรฐาน (spec M6)
import type { MetricDefinition } from '../../types';

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { code: 'intake', nameTh: 'จำนวนรับเข้า/ผู้สมัคร', nameEn: 'Intake / applicants', unit: 'คน', periodType: 'academic_year' },
  { code: 'pass_rate', nameTh: 'อัตราสำเร็จตามเวลา', nameEn: 'On-time pass rate', unit: '%', periodType: 'cohort' },
  { code: 'dropout_rate', nameTh: 'อัตราออกกลางคัน', nameEn: 'Dropout rate', unit: '%', periodType: 'cohort' },
  { code: 'time_to_graduate', nameTh: 'เวลาเฉลี่ยจบ', nameEn: 'Average time to graduate', unit: 'ปี', periodType: 'cohort' },
  { code: 'employment_rate', nameTh: 'ภาวะการมีงานทำภายใน 1 ปี', nameEn: 'Employment rate within 1 year', unit: '%', periodType: 'graduation_year' },
  { code: 'further_study_rate', nameTh: 'ศึกษาต่อ', nameEn: 'Further study rate', unit: '%', periodType: 'graduation_year' },
  { code: 'self_employed_rate', nameTh: 'ประกอบอาชีพอิสระ', nameEn: 'Self-employment rate', unit: '%', periodType: 'graduation_year' },
  { code: 'publications_staff', nameTh: 'ผลงานอาจารย์', nameEn: 'Staff publications', unit: 'ชิ้น', periodType: 'calendar_year' },
  { code: 'publications_student', nameTh: 'ผลงานนักศึกษา', nameEn: 'Student publications', unit: 'ชิ้น', periodType: 'calendar_year' },
  { code: 'research_funding', nameTh: 'ทุนวิจัย', nameEn: 'Research funding', unit: 'บาท', periodType: 'fiscal_year' },
  { code: 'plo_achievement', nameTh: '% นักศึกษาบรรลุ PLO', nameEn: 'PLO achievement', unit: '%', periodType: 'cohort' },
  { code: 'satisfaction_student', nameTh: 'ความพึงพอใจนักศึกษา', nameEn: 'Student satisfaction', unit: 'คะแนน/5', periodType: 'academic_year' },
  { code: 'satisfaction_employer', nameTh: 'ความพึงพอใจนายจ้าง', nameEn: 'Employer satisfaction', unit: 'คะแนน/5', periodType: 'academic_year' },
  { code: 'satisfaction_alumni', nameTh: 'ความพึงพอใจศิษย์เก่า', nameEn: 'Alumni satisfaction', unit: 'คะแนน/5', periodType: 'academic_year' },
  { code: 'satisfaction_staff', nameTh: 'ความพึงพอใจอาจารย์/บุคลากร', nameEn: 'Staff satisfaction', unit: 'คะแนน/5', periodType: 'academic_year' },
  { code: 'staff_student_ratio', nameTh: 'สัดส่วนอาจารย์:นักศึกษา (FTE)', nameEn: 'Staff:student ratio (FTE)', unit: 'ratio', periodType: 'academic_year' },
  { code: 'staff_qualification', nameTh: '% ปริญญาเอก/ตำแหน่งวิชาการ', nameEn: 'Staff with doctorate / academic rank', unit: '%', periodType: 'academic_year' },
  { code: 'appeal_count', nameTh: 'คำร้องอุทธรณ์ผลการเรียน', nameEn: 'Grade appeals', unit: 'ครั้ง', periodType: 'academic_year' },
];
