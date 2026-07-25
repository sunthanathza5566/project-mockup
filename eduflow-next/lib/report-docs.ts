/**
 * เอกสารผลการเรียน ปพ.1–ปพ.9 — ข้อมูลกลาง + กติกาการเข้าถึงตาม "ระดับชั้น"
 *
 * สำคัญ: เอกสารเหล่านี้ "ไม่ได้" กำหนดด้วย permission แต่กำหนดด้วยระดับชั้น
 *   ปพ.1  → ป.6, ม.3, ม.6 (ปลายแต่ละช่วงชั้น)
 *   ปพ.2  → ม.3, ม.6
 *   ปพ.3  → ป.6, ม.3, ม.6
 *   ปพ.4–ปพ.9 → ทุกระดับชั้น
 *
 * นักเรียนดาวน์โหลด/พรีวิวได้เฉพาะเอกสารที่ตรงกับระดับชั้นของตัวเอง
 */

export type GradeRule = 'all' | string[];

export interface PPDoc {
  id: string;
  name: string;    // ปพ.1
  title: string;   // ชื่อเต็ม
  desc: string;
  grades: GradeRule;
}

export const PP_DOCS: PPDoc[] = [
  { id: 'pp1', name: 'ปพ.1', title: 'ระเบียนแสดงผลการเรียน',              desc: 'ผลการเรียนรายบุคคลตลอดหลักสูตร (Transcript)', grades: ['ป.6', 'ม.3', 'ม.6'] },
  { id: 'pp2', name: 'ปพ.2', title: 'ประกาศนียบัตร',                      desc: 'หลักฐานแสดงการสำเร็จการศึกษา',              grades: ['ม.3', 'ม.6'] },
  { id: 'pp3', name: 'ปพ.3', title: 'แบบรายงานผู้สำเร็จการศึกษา',         desc: 'บัญชีรายชื่อผู้จบหลักสูตร',                  grades: ['ป.6', 'ม.3', 'ม.6'] },
  { id: 'pp4', name: 'ปพ.4', title: 'ผลการพัฒนาคุณลักษณะอันพึงประสงค์',  desc: 'ผลการประเมินคุณลักษณะ 8 ประการ',           grades: 'all' },
  { id: 'pp5', name: 'ปพ.5', title: 'แบบบันทึกผลการเรียนประจำรายวิชา',    desc: 'สมุดบันทึกคะแนนของวิชา (Excel)',            grades: 'all' },
  { id: 'pp6', name: 'ปพ.6', title: 'รายงานผลการพัฒนาคุณภาพผู้เรียน',     desc: 'สมุดรายงานประจำตัวรายบุคคล (Excel)',        grades: 'all' },
  { id: 'pp7', name: 'ปพ.7', title: 'ใบรับรองผลการศึกษา',                 desc: 'หนังสือรับรองการเป็นนักเรียน',              grades: 'all' },
  { id: 'pp8', name: 'ปพ.8', title: 'ระเบียนสะสม',                        desc: 'ข้อมูลพัฒนาการรายบุคคล',                    grades: 'all' },
  { id: 'pp9', name: 'ปพ.9', title: 'สมุดบันทึกผลการเรียนรู้',            desc: 'สมุดประจำวิชา',                            grades: 'all' },
];

/** ตัดเลขห้องออก เหลือชื่อระดับชั้น เช่น 'ม.1/1' → 'ม.1' */
export function normalizeGrade(g?: string): string {
  return (g || '').split('/')[0].trim();
}

/** เอกสารนี้เปิดให้ระดับชั้นนี้ไหม */
export function isDocAllowedForGrade(doc: PPDoc, gradeName?: string): boolean {
  if (doc.grades === 'all') return true;
  return doc.grades.includes(normalizeGrade(gradeName));
}

/** ข้อความบอกระดับชั้นที่เอกสารนี้ออกให้ */
export function allowedGradesLabel(doc: PPDoc): string {
  return doc.grades === 'all' ? 'ทุกระดับชั้น' : doc.grades.join(', ');
}
