'use client';

/**
 * ผลการประเมิน "คุณลักษณะอันพึงประสงค์ / การอ่านคิดวิเคราะห์เขียน / กิจกรรมพัฒนาผู้เรียน"
 * — ส่วนที่ครูประจำชั้นประเมิน (ไม่ใช่คะแนนรายวิชา) ใช้ในเอกสาร ปพ.1 (สรุป) · ปพ.4 · ปพ.6
 *
 * เก็บใน localStorage keyed ตามเลขประจำตัวนักเรียน
 * TODO(PostgreSQL): ย้ายไปตาราง student_assessments (student_id, academic_year, ...)
 */

const KEY = 'eduflow_assessments';

/** คุณลักษณะอันพึงประสงค์ 8 ประการ (หลักสูตรแกนกลางฯ 2551) */
export const CHARACTERISTIC_NAMES = [
  'รักชาติ ศาสน์ กษัตริย์', 'ซื่อสัตย์สุจริต', 'มีวินัย', 'ใฝ่เรียนรู้',
  'อยู่อย่างพอเพียง', 'มุ่งมั่นในการทำงาน', 'รักความเป็นไทย', 'มีจิตสาธารณะ',
];

/** เกณฑ์ผลการประเมินคุณลักษณะ / การอ่านคิดวิเคราะห์เขียน */
export const RESULT_OPTIONS = ['ดีเยี่ยม', 'ดี', 'ผ่าน', 'ไม่ผ่าน'] as const;
/** ผลกิจกรรมพัฒนาผู้เรียน */
export const ACTIVITY_OPTIONS = ['ผ', 'มผ'] as const;

export interface StudentAssessment {
  readingThinkingWriting: string;   // การอ่าน คิดวิเคราะห์ และเขียน
  characteristics: string[];        // ผล 8 ข้อ (เรียงตาม CHARACTERISTIC_NAMES)
  characteristicsOverall: string;   // สรุปคุณลักษณะ
  learnerActivities: string;        // กิจกรรมพัฒนาผู้เรียน (ผ/มผ)
}

export function emptyAssessment(): StudentAssessment {
  return { readingThinkingWriting: '', characteristics: Array(8).fill(''), characteristicsOverall: '', learnerActivities: '' };
}

function loadAll(): Record<string, StudentAssessment> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function getAssessment(studentCode: string): StudentAssessment | null {
  return loadAll()[studentCode] || null;
}

export function saveAssessment(studentCode: string, a: StudentAssessment): void {
  const all = loadAll();
  all[studentCode] = a;
  localStorage.setItem(KEY, JSON.stringify(all));
}

// ─── จำลองผลประเมินสำหรับนักเรียนชุดทดสอบ ─────────────────────────────────
// idempotent: ถ้ามีข้อมูลผลประเมินแล้วจะข้าม · ให้ค่าที่สมจริง (ส่วนใหญ่ ดีเยี่ยม/ดี)
export function seedDemoAssessments(codes: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const all = loadAll();
  let changed = false;
  codes.forEach((code, i) => {
    if (all[code]) return; // มีแล้ว ไม่ทับ
    const reading = RESULT_OPTIONS[i % 3];                 // ดีเยี่ยม/ดี/ผ่าน
    const characteristics = CHARACTERISTIC_NAMES.map((_, j) => RESULT_OPTIONS[(i + j) % 3]);
    const good = characteristics.filter(r => r === 'ดีเยี่ยม').length;
    all[code] = {
      readingThinkingWriting: reading,
      characteristics,
      characteristicsOverall: good >= 4 ? 'ดีเยี่ยม' : 'ดี',
      learnerActivities: i % 7 === 6 ? 'มผ' : 'ผ',
    };
    changed = true;
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(all));
  return changed;
}
