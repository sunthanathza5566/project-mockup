/**
 * Teacher Profile Store — ประวัติครูฉบับเต็ม (แก้ไข/บันทึกได้จริง)
 *
 * เดิมเก็บแค่ชื่อ-นามสกุล ตอนนี้เก็บครบ: ข้อมูลส่วนบุคคล · ที่อยู่ · ช่องทางติดต่อ ·
 * ข้อมูลสุขภาพ (โรคประจำตัว/แพ้ยา/แพ้อาหาร) · ข้อมูลการปฏิบัติงาน · ประวัติการศึกษา/การทำงาน
 *
 * บัญชีเดโม่ (teacher1/T001) มีข้อมูลตัวอย่างครบ · บัญชีอื่นเริ่มจากว่างแล้วให้ครูกรอกเอง
 *
 * TODO(PostgreSQL): table teacher_profiles (user_id PK) + teacher_education + teacher_work_history
 */

import type { TeacherProfile } from '../types';
import { logActivity } from './activity.log';

const STORE_KEY = 'eduflow_teacher_profiles';

function isBrowser() { return typeof window !== 'undefined'; }

function loadAll(): Record<string, TeacherProfile> {
  if (!isBrowser()) return {};
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

function saveAll(data: Record<string, TeacherProfile>) {
  if (isBrowser()) localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** ข้อมูลตัวอย่างครบถ้วนสำหรับบัญชีเดโม่ — ใช้โชว์โครงสร้างข้อมูลที่ระบบรองรับ */
export const DEMO_TEACHER_FULL: Partial<TeacherProfile> = {
  prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', nickname: 'ชาย',
  gender: 'ชาย', dob: '14 มีนาคม 2528', bloodType: 'B+',
  citizenId: '3100900456781', nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ',
  maritalStatus: 'สมรส',
  addressCurrent: '88/12 หมู่ 4 ถ.พหลโยธิน แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร 10220',
  addressRegistered: '45 หมู่ 2 ต.บ้านกลาง อ.เมือง จ.ลำพูน 51000',
  phone: '081-555-2233', email: 'somchai.j@eduflow.ac.th', lineId: 'kru_somchai',
  emergencyName: 'นางสุดา ใจดี', emergencyRelation: 'ภรรยา', emergencyPhone: '089-777-1122',
  congenitalDisease: 'ความดันโลหิตสูง (ควบคุมด้วยยา)',
  drugAllergy: 'เพนิซิลลิน', foodAllergy: 'อาหารทะเล',
  healthNote: 'ตรวจสุขภาพประจำปีล่าสุด 12 พ.ค. 2569 — ปกติ',
  position: 'ครู', academicRank: 'ครูชำนาญการ', subjectGroup: 'คณิตศาสตร์',
  employmentType: 'ข้าราชการครู', startDate: '1 พฤษภาคม 2555',
  teacherLicense: '6412345678901', licenseExpiry: '30 เมษายน 2571',
  homeroomClass: 'ม.1/1',
  education: [
    { level: 'ปริญญาโท', major: 'คณิตศาสตรศึกษา', institute: 'มหาวิทยาลัยเชียงใหม่', year: '2554' },
    { level: 'ปริญญาตรี', major: 'ค.บ. คณิตศาสตร์', institute: 'มหาวิทยาลัยราชภัฏลำปาง', year: '2550' },
    { level: 'มัธยมศึกษาตอนปลาย', major: 'วิทย์-คณิต', institute: 'โรงเรียนลำพูนวิทยา', year: '2546' },
  ],
  workHistory: [
    { year: '2555–ปัจจุบัน', position: 'ครูกลุ่มสาระคณิตศาสตร์', place: 'โรงเรียนทดสอบ EduFlow' },
    { year: '2552–2555',     position: 'ครูอัตราจ้าง',            place: 'โรงเรียนบ้านกลางวิทยา' },
  ],
  trainings: [
    'อบรมการจัดการเรียนรู้เชิงรุก (Active Learning) — สพฐ. 2568',
    'อบรมการวัดและประเมินผลตามหลักสูตรฐานสมรรถนะ — 2567',
    'อบรมการใช้เทคโนโลยีดิจิทัลเพื่อการสอน — 2566',
  ],
  awards: [
    'ครูผู้สอนดีเด่น กลุ่มสาระคณิตศาสตร์ ปีการศึกษา 2567',
    'รางวัลชมเชย ครูต้นแบบการจัดการเรียนรู้ ระดับเขตพื้นที่ 2566',
  ],
};

/**
 * ค่าเริ่มต้นของบัญชีที่ยังไม่ได้กรอก — ใส่เฉพาะที่มีความหมายจริง
 * ฟิลด์ที่เหลือเป็น optional อยู่แล้ว หน้าโปรไฟล์แสดง '—' ให้เองเมื่อไม่มีค่า
 */
function emptyExtras(): Partial<TeacherProfile> {
  return { nationality: 'ไทย', ethnicity: 'ไทย', education: [], workHistory: [], trainings: [], awards: [] };
}

/**
 * รวมข้อมูลโปรไฟล์: ฐาน (จาก session/mock) + ข้อมูลตัวอย่างของบัญชีเดโม่ + ที่ครูบันทึกเองทับสุด
 */
export function getFullTeacherProfile(username: string, base: TeacherProfile, isDemo = false): TeacherProfile {
  const saved = loadAll()[username] || {};
  const defaults = isDemo ? DEMO_TEACHER_FULL : emptyExtras();
  const merged: TeacherProfile = { ...defaults, ...base, ...saved } as TeacherProfile;

  // ชื่อ/นามสกุลแยกช่อง — ถ้ายังไม่มี ให้แยกจากชื่อเต็มใน session
  if (!merged.firstName && merged.name) {
    const parts = merged.name.replace(/^(ครู|นาย|นาง|นางสาว)\s*/, '').split(' ');
    merged.firstName = parts[0] || '';
    merged.lastName = parts.slice(1).join(' ');
  }
  return merged;
}

/** บันทึกการแก้ไขประวัติ + log (ตรวจย้อนหลังได้ว่าใครแก้อะไรเมื่อไร) */
export function saveTeacherProfile(username: string, profile: TeacherProfile): void {
  const all = loadAll();
  all[username] = profile;
  saveAll(all);
  logActivity('teacher', 'แก้ไขประวัติส่วนตัว', `${profile.name} (${username})`);
}
