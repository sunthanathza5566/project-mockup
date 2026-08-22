// SYNC-CHECK-778899  ← ถ้าเห็นบรรทัดนี้ใน VSCode แปลว่าอ่านไฟล์เดียวกับที่แก้จริง
/**
 * Academic Store — โครงสร้างวิชาการ + บันทึกคะแนน (แบบ ปพ.5)
 *
 * ลำดับชั้นข้อมูล:  ปีการศึกษา → ระดับชั้น → ห้องเรียน → รายวิชา → คะแนน
 *
 * สิทธิ์:
 *   - แอดมิน (web_admin / school_admin): สร้าง ปีการศึกษา, ระดับชั้น, ห้องเรียน
 *   - บันทึกคะแนน: เฉพาะ "ครูประจำวิชา" (เจ้าของรายวิชา) และ super admin (web_admin) เท่านั้น
 *   - รายวิชาไม่ต้องสร้างเอง — ระบบดึงจากตารางสอนของครูโดยอัตโนมัติ (syncTeacherCourses)
 *
 * สัดส่วนคะแนน (ScoreComponent) ยืดหยุ่น: ครูเพิ่ม/แก้หัวข้อได้ เช่น สมรรถนะ, อ่านคิดวิเคราะห์
 * เกรดคำนวณจากเปอร์เซ็นต์ของคะแนนเต็มรวม ตามเกณฑ์ สพฐ. — โปร่งใส ตรวจสอบได้
 *
 * TODO(PostgreSQL): แทนที่ทั้งไฟล์นี้ด้วย API routes (app/api/academic/*)
 *   tables: academic_years, grade_levels, classrooms, courses, score_components, score_records
 *   สิทธิ์ต้องบังคับซ้ำที่ server (RLS) — ตอนนี้บังคับที่ app layer ผ่าน getSession()
 */

import { TEACHER_DATA_MOCK } from '../mock-data';
import { getSession } from './auth.api';
import { readJSON, writeJSON } from './storage-cache';
import { getCatalogSubjects } from './subject-catalog.store';
import type { TeacherStudent, ClassInfo } from '../types';

const STORE_KEY = 'eduflow_academic';

// ─── Types ────────────────────────────────────────────────────────────────
export interface AcademicYear {
  id: string;
  year: string;        // เช่น '2567'
  createdBy: string;
  createdAt: number;
  active?: boolean;    // เปิดใช้งานอยู่ไหม — ปิดปีเก่าเพื่อไม่ให้ตัวเลือกล้น (undefined = เปิด สำหรับข้อมูลเก่า)
}

export interface GradeLevel {
  id: string;
  yearId: string;
  name: string;        // เช่น 'ม.1'
}

export interface Classroom {
  id: string;
  yearId: string;
  gradeLevelId: string;
  room: string;        // เช่น '1'
}

/** หัวข้อสัดส่วนคะแนน 1 ช่อง เช่น คะแนนเก็บ (เต็ม 60) */
export interface ScoreComponent {
  id: string;
  name: string;
  max: number;
  /** หัวข้อประเมินแยก (สมรรถนะ / อ่านคิดวิเคราะห์) — กรอกคะแนนได้ แต่ไม่นับรวมในคะแนน/เกรดของวิชา */
  excludeFromTotal?: boolean;
}

/**
 * วิธีตัดสินผลการเรียนของรายวิชา
 *   numeric = คิดเกรด 4 / 3.5 / ... / 0 (รายวิชาพื้นฐาน-เพิ่มเติม)
 *   symbol  = ไม่คิดเกรด ใช้ผลการประเมิน ผ / มผ (กิจกรรมพัฒนาผู้เรียน, ชุมนุม/ชมรม)
 */
export type GradingMode = 'numeric' | 'symbol';

/**
 * ผลการเรียนแบบสัญลักษณ์ ตามระเบียบการวัดและประเมินผล (กระทรวงศึกษาธิการ)
 *   scope: 'activity' = ใช้กับกิจกรรม/ชุมนุมที่ไม่คิดเกรด · 'subject' = รายวิชาที่คิดเกรด · 'all' = ใช้ได้ทั้งสองแบบ
 * ทุกสัญลักษณ์ไม่ถูกนำไปคิด GPA (ไม่มีค่าน้ำหนักเป็นตัวเลข)
 */
export interface SpecialGrade {
  code: string;
  label: string;
  scope: 'activity' | 'subject' | 'all';
}

export const SPECIAL_GRADES: SpecialGrade[] = [
  { code: 'ผ',  label: 'ผ่านเกณฑ์การประเมิน',                    scope: 'activity' },
  { code: 'มผ', label: 'ไม่ผ่านเกณฑ์การประเมิน',                 scope: 'activity' },
  { code: 'ร',  label: 'รอการตัดสิน / รอการประเมินผล',           scope: 'all' },
  { code: 'มส', label: 'ไม่มีสิทธิ์เข้ารับการวัดผลปลายภาค',      scope: 'subject' },
  { code: 'ขส', label: 'ขาดสอบ',                                  scope: 'all' },
  { code: 'ขร', label: 'ขาดเรียน (เวลาเรียนไม่ครบตามเกณฑ์)',     scope: 'all' },
];

/** สัญลักษณ์ที่เลือกได้ในวิชานั้น ๆ ตามวิธีตัดสินผล */
export function specialGradesFor(mode: GradingMode): SpecialGrade[] {
  return SPECIAL_GRADES.filter(g => g.scope === 'all' || g.scope === (mode === 'symbol' ? 'activity' : 'subject'));
}

export interface Course {
  id: string;
  classroomId: string;
  code: string;
  name: string;
  key: string;                    // subject key สำหรับสี theme เช่น 'math'
  teacherId: string;
  teacherName: string;
  ownerUsername?: string;         // username ครูประจำวิชา — ใช้ตรวจสิทธิ์
  components: ScoreComponent[];   // สัดส่วนคะแนน ตั้งค่าได้
  gradingMode: GradingMode;       // คิดเกรด หรือ ผ/มผ
  createdAt: number;
}

/**
 * คะแนนนักเรียน 1 คนใน 1 วิชา — keyed ตาม ScoreComponent.id
 * symbol: ผลการเรียนแบบสัญลักษณ์ (ผ/มผ/ร/มส/ขส/ขร) — ถ้ามีค่า จะใช้แทนเกรดตัวเลข
 */
export interface ScoreEntry {
  studentCode: string;
  studentName: string;
  scores: Record<string, number | null>;
  symbol?: string | null;
}

interface AcademicData {
  years: AcademicYear[];
  gradeLevels: GradeLevel[];
  classrooms: Classroom[];
  courses: Course[];
  scores: Record<string, ScoreEntry[]>;           // keyed by courseId
  rosters?: Record<string, TeacherStudent[]>;     // นักเรียนที่แอดมินเพิ่มเข้าห้อง keyed by classroomId
  excludedSeeded?: boolean;                        // เติมหัวข้อประเมินแยกให้วิชาเดิมแล้ว (รันครั้งเดียว)
  demoV2?: boolean;                                // seed cohort ที่เลื่อนชั้นข้ามปีแล้ว (รันครั้งเดียว)
  demoV3?: boolean;                                // seed ห้องครบทุกชั้น ป.1-6/ม.1-6 แล้ว (รันครั้งเดียว)
  demoRosterGrades?: boolean;                      // seed คะแนนให้บัญชี demo ม.1/1 (10021-10025) แล้ว (รันครั้งเดียว)
}

export const DEFAULT_COMPONENTS: ScoreComponent[] = [
  { id: 'collected', name: 'คะแนนเก็บ',   max: 60 },
  { id: 'midterm',   name: 'สอบกลางภาค', max: 20 },
  { id: 'final',     name: 'สอบปลายภาค', max: 20 },
  // หัวข้อประเมินแยก — มีทุกวิชาตั้งแต่แรก กรอกได้ แต่ไม่นับรวมในคะแนน/เกรด
  { id: 'competency', name: 'คะแนนสมรรถนะ',          max: 10, excludeFromTotal: true },
  { id: 'reading',    name: 'คะแนนอ่านคิดวิเคราะห์', max: 10, excludeFromTotal: true },
];

/** หัวข้อสำเร็จรูปที่ครูกดเพิ่มได้ทันที */
export const PRESET_COMPONENTS: Omit<ScoreComponent, 'id'>[] = [
  { name: 'คะแนนสมรรถนะ',          max: 10, excludeFromTotal: true },
  { name: 'คะแนนอ่านคิดวิเคราะห์', max: 10, excludeFromTotal: true },
];

// ─── Internal ─────────────────────────────────────────────────────────────
function isBrowser() { return typeof window !== 'undefined'; }

const EMPTY: AcademicData = { years: [], gradeLevels: [], classrooms: [], courses: [], scores: {} };

function load(): AcademicData {
  if (!isBrowser()) return EMPTY;
  // readJSON แคชผลตาม "ข้อความดิบ" — ถูกเรียกซ้ำในลูป (หาห้องของนักเรียน) จึงต้องไม่ parse ใหม่ทุกครั้ง
  const data = readJSON<AcademicData | null>(STORE_KEY, null);
  if (data) return migrate(data);
  const seeded = seed();
  save(seeded);
  return seeded;
}

function save(data: AcademicData) {
  if (isBrowser()) writeJSON(STORE_KEY, data);
}

/** แปลงข้อมูลรูปแบบเก่า (maxCollected/collected คงที่ 3 ช่อง) → components/scores แบบยืดหยุ่น */
function migrate(data: AcademicData): AcademicData {
  let changed = false;
  data.courses.forEach((c: Course & { maxCollected?: number; maxMidterm?: number; maxFinal?: number }) => {
    // วิชาที่สร้างก่อนมีระบบผลการเรียนแบบสัญลักษณ์ = คิดเกรดตามปกติ
    if (!c.gradingMode) { c.gradingMode = 'numeric'; changed = true; }
    if (!c.components) {
      c.components = [
        { id: 'collected', name: 'คะแนนเก็บ',   max: c.maxCollected ?? 60 },
        { id: 'midterm',   name: 'สอบกลางภาค', max: c.maxMidterm ?? 20 },
        { id: 'final',     name: 'สอบปลายภาค', max: c.maxFinal ?? 20 },
      ];
      changed = true;
    }
  });
  Object.values(data.scores).forEach(entries => {
    entries.forEach((e: ScoreEntry & { collected?: number | null; midterm?: number | null; final?: number | null }) => {
      if (!e.scores) {
        e.scores = { collected: e.collected ?? null, midterm: e.midterm ?? null, final: e.final ?? null };
        changed = true;
      }
    });
  });
  // เติมหัวข้อประเมินแยก (สมรรถนะ/อ่านคิดวิเคราะห์) ให้ทุกวิชาคิดเกรดที่มีอยู่เดิม — รันครั้งเดียว
  if (!data.excludedSeeded) {
    const extras = DEFAULT_COMPONENTS.filter(c => c.excludeFromTotal);
    data.courses.forEach(c => {
      if (c.gradingMode === 'symbol' || !c.components) return;
      extras.forEach(ex => {
        if (!c.components.some(x => x.name === ex.name)) c.components.push({ ...ex, id: `${ex.id}_${c.id}` });
      });
    });
    data.excludedSeeded = true;
    changed = true;
  }
  if (changed) save(data);
  return data;
}

/** ข้อมูลตั้งต้น: ปี 2567 + ระดับชั้น/ห้องที่ตรงกับห้องสอนใน mock เพื่อให้ครูใช้ได้ทันที */
function seed(): AcademicData {
  const year: AcademicYear = { id: 'y2567', year: '2567', createdBy: 'webadmin', createdAt: Date.now(), active: true };
  const gradeLevels: GradeLevel[] = [
    { id: 'g1', yearId: 'y2567', name: 'ม.1' },
    { id: 'g2', yearId: 'y2567', name: 'ม.2' },
    { id: 'g3', yearId: 'y2567', name: 'ม.3' },
  ];
  // ห้องตรงกับ TEACHER_DATA_MOCK.classes: ม.1/1, ม.2/2, ม.3/1
  const classrooms: Classroom[] = [
    { id: 'r1', yearId: 'y2567', gradeLevelId: 'g1', room: '1' },
    { id: 'r2', yearId: 'y2567', gradeLevelId: 'g2', room: '2' },
    { id: 'r3', yearId: 'y2567', gradeLevelId: 'g3', room: '1' },
  ];
  return { years: [year], gradeLevels, classrooms, courses: [], scores: {} };
}

// ─── ข้อมูลจำลองสำหรับทดสอบเอกสาร ปพ. (ปี 2568/2569) ──────────────────────
// idempotent: รันได้ปลอดภัยหลายครั้ง — ถ้ามีปี 2568 แล้วจะข้าม
// สร้างนักเรียนห้องละ 10 คน · 8 วิชาหลัก (คิดเกรด) + 3 กิจกรรม/ชมรม (ผ/มผ)
// คะแนนกระจายให้มีเกรด 0–4 และผลแบบสัญลักษณ์ (ร / มผ / ผ) ครบตามจริง
const SEED_FIRST = ['ธนภัทร', 'ศิริพร', 'ณัฐวุฒิ', 'กัญญาณัฐ', 'พีรพล', 'อารยา', 'ชัยวัฒน์', 'มนัสนันท์', 'ธีรเดช', 'ปิยะดา', 'วรรณา', 'สุทธิพงษ์', 'ญาณิศา', 'กิตติศักดิ์', 'เบญจวรรณ'];
const SEED_LAST = ['ใจงาม', 'สุขสวัสดิ์', 'มั่นคง', 'ดีเลิศ', 'พงษ์ไพบูลย์', 'ศรีสุข', 'วัฒนกุล', 'บุญมี', 'แสงทอง', 'รัตนพร'];
const SEED_SUBJECTS = [
  { code: 'ท', name: 'ภาษาไทย', key: 'thai' }, { code: 'ค', name: 'คณิตศาสตร์', key: 'math' },
  { code: 'ว', name: 'วิทยาศาสตร์และเทคโนโลยี', key: 'science' }, { code: 'ส', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', key: 'social' },
  { code: 'พ', name: 'สุขศึกษาและพลศึกษา', key: 'pe' }, { code: 'ศ', name: 'ศิลปะ', key: 'art' },
  { code: 'ง', name: 'การงานอาชีพ', key: 'career' }, { code: 'อ', name: 'ภาษาอังกฤษ', key: 'english' },
];
const SEED_ACTIVITIES = [
  { name: 'กิจกรรมชุมนุม (ชมรมคอมพิวเตอร์)', key: 'club' },
  { name: 'ลูกเสือ–เนตรนารี', key: 'scout' },
  { name: 'กิจกรรมแนะแนว', key: 'guidance' },
];
// เกรดเป้าหมายของนักเรียน 10 คน (หมุนตามวิชา) — มีครบ 4 ถึง 0 + 'ร' (รอตัดสิน)
const SEED_GRADE_PLAN = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', '3.5'];
const SEED_ACT_PLAN = ['ผ', 'ผ', 'ผ', 'ผ', 'ผ', 'ผ', 'มผ', 'ผ', 'ผ', 'ผ'];
// เปอร์เซ็นต์กึ่งกลางของแต่ละเกรด (ใช้กระจายลงคะแนนเก็บ/กลางภาค/ปลายภาค)
const GRADE_PCT: Record<string, number> = { '4': 86, '3.5': 78, '3': 73, '2.5': 68, '2': 63, '1.5': 58, '1': 53, '0': 42 };

function pctToScores(pct: number): Record<string, number> {
  const collected = Math.min(60, Math.round(pct * 0.6));
  const midterm = Math.min(20, Math.round(pct * 0.2));
  const final = Math.max(0, Math.min(20, pct - collected - midterm));
  return { collected, midterm, final };
}

export function seedDemoAcademics(): boolean {
  if (!isBrowser()) return false;
  const data = load();
  if (data.years.some(y => y.year === '2568')) return false; // seed แล้ว

  const now = Date.now();
  const GRADES = [{ n: 'ม.1', lv: '21', room: '1' }, { n: 'ม.2', lv: '22', room: '2' }, { n: 'ม.3', lv: '23', room: '1' }];

  for (const yr of ['2568', '2569']) {
    const short = yr.slice(2);                       // '68' / '69'
    const yearId = `y${short}`;
    data.years.push({ id: yearId, year: yr, createdBy: 'webadmin', createdAt: now, active: true });

    GRADES.forEach((g, gi) => {
      const gradeId = `g${short}${gi + 1}`;
      const roomId = `r${short}${gi + 1}`;
      data.gradeLevels.push({ id: gradeId, yearId, name: g.n });
      data.classrooms.push({ id: roomId, yearId, gradeLevelId: gradeId, room: g.room });

      // นักเรียน 10 คน
      if (!data.rosters) data.rosters = {};
      const students = Array.from({ length: 10 }, (_, i) => ({
        id: `S${short}${gi + 1}${i}`,
        code: `${short}${gi + 1}${String(i + 1).padStart(2, '0')}`,   // เช่น 68101
        name: `${SEED_FIRST[(gi * 3 + i) % SEED_FIRST.length]} ${SEED_LAST[i % SEED_LAST.length]}`,
        classId: roomId,
      }));
      data.rosters[roomId] = students;

      // วิชาหลัก (คิดเกรด) + กิจกรรม/ชมรม (ผ/มผ)
      SEED_SUBJECTS.forEach((subj, si) => {
        const courseId = `c${short}${gi + 1}_${subj.key}`;
        data.courses.push({
          id: courseId, classroomId: roomId, code: `${subj.code}${g.lv}10${si + 1}`, name: subj.name,
          key: subj.key, teacherId: 'T001', teacherName: 'ครูสมชาย ใจดี', ownerUsername: 'teacher1',
          components: DEFAULT_COMPONENTS.map(c => ({ ...c })), gradingMode: 'numeric', createdAt: now,
        });
        data.scores[courseId] = students.map((s, i) => {
          const target = SEED_GRADE_PLAN[(i + si) % 10];
          if (target === 'ร') return { studentCode: s.code, studentName: s.name, scores: { collected: 30, midterm: null, final: null }, symbol: 'ร' };
          return { studentCode: s.code, studentName: s.name, scores: pctToScores(GRADE_PCT[target]) };
        });
      });

      SEED_ACTIVITIES.forEach((act, ai) => {
        const courseId = `c${short}${gi + 1}_${act.key}`;
        data.courses.push({
          id: courseId, classroomId: roomId, code: `ก${g.lv}90${ai + 1}`, name: act.name,
          key: act.key, teacherId: 'T001', teacherName: 'ครูสมชาย ใจดี', ownerUsername: 'teacher1',
          components: DEFAULT_COMPONENTS.map(c => ({ ...c })), gradingMode: 'symbol', createdAt: now,
        });
        data.scores[courseId] = students.map((s, i) => ({
          studentCode: s.code, studentName: s.name, scores: {}, symbol: SEED_ACT_PLAN[(i + ai) % 10],
        }));
      });
    });
  }

  save(data);
  return true;
}

// ── cohort ที่เลื่อนชั้น ม.1(2567) → ม.2(2568) → ม.3(2569) รหัสเดิม — ให้ ปพ.1 แสดงผลครบทุกปี ──
const COHORT_NAMES: [string, string][] = [
  ['ธนกร', 'วัฒนชัย'], ['ปาริชาต', 'ทองดี'], ['ศุภกร', 'ใจเพชร'], ['กมลชนก', 'พูนสุข'],
  ['ณัฐพงษ์', 'อินทร์แก้ว'], ['พิมพ์ชนก', 'ศรีสมบัติ'], ['อภิสิทธิ์', 'คงทน'], ['สุชานาถ', 'บุญเรือง'],
  ['ธนวัฒน์', 'มีสุข'], ['ชนัญชิดา', 'เพชรงาม'], ['ภูริพัฒน์', 'วงศ์ทอง'], ['อารดา', 'สินทรัพย์'],
];
const COHORT_PLAN = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', '3.5', '3', '2.5'];

function seedCohortProgression(data: AcademicData) {
  const now = Date.now();
  if (!data.rosters) data.rosters = {};
  const cohort = COHORT_NAMES.map(([f, l], i) => ({ id: `SC${i}`, code: `300${String(i + 1).padStart(2, '0')}`, name: `${f} ${l}` }));
  // ห้องที่ cohort เรียนแต่ละปี (เลื่อนชั้นตามจริง): 2567 ม.1/1 → 2568 ม.2/2 → 2569 ม.3/1
  const stops = [{ roomId: 'r1', lv: '21' }, { roomId: 'r682', lv: '22' }, { roomId: 'r693', lv: '23' }];

  stops.forEach((stop, yi) => {
    if (!data.classrooms.some(c => c.id === stop.roomId)) return;
    const roster = data.rosters![stop.roomId] || [];
    cohort.forEach(c => { if (!roster.some(r => r.code === c.code)) roster.push({ id: `${c.id}_${stop.roomId}`, code: c.code, name: c.name, classId: stop.roomId }); });
    data.rosters![stop.roomId] = roster;

    let roomCourses = data.courses.filter(c => c.classroomId === stop.roomId);
    if (roomCourses.length === 0) {
      SEED_SUBJECTS.forEach((subj, si) => data.courses.push({
        id: `c${stop.roomId}_${subj.key}`, classroomId: stop.roomId, code: `${subj.code}${stop.lv}10${si + 1}`, name: subj.name,
        key: subj.key, teacherId: 'T001', teacherName: 'ครูสมชาย ใจดี', ownerUsername: 'teacher1',
        components: DEFAULT_COMPONENTS.map(c => ({ ...c })), gradingMode: 'numeric', createdAt: now,
      }));
      SEED_ACTIVITIES.forEach((act, ai) => data.courses.push({
        id: `c${stop.roomId}_${act.key}`, classroomId: stop.roomId, code: `ก${stop.lv}90${ai + 1}`, name: act.name,
        key: act.key, teacherId: 'T001', teacherName: 'ครูสมชาย ใจดี', ownerUsername: 'teacher1',
        components: DEFAULT_COMPONENTS.map(c => ({ ...c })), gradingMode: 'symbol', createdAt: now,
      }));
      roomCourses = data.courses.filter(c => c.classroomId === stop.roomId);
    }

    roomCourses.forEach((course, ci) => {
      const arr = data.scores[course.id] || (data.scores[course.id] = []);
      cohort.forEach((cst, i) => {
        if (arr.some(e => e.studentCode === cst.code)) return;
        if (course.gradingMode === 'symbol') {
          arr.push({ studentCode: cst.code, studentName: cst.name, scores: {}, symbol: (i + ci) % 8 === 6 ? 'มผ' : 'ผ' });
        } else {
          const target = COHORT_PLAN[(i + ci + yi) % COHORT_PLAN.length];
          if (target === 'ร') arr.push({ studentCode: cst.code, studentName: cst.name, scores: { collected: 28 }, symbol: 'ร' });
          else arr.push({ studentCode: cst.code, studentName: cst.name, scores: pctToScores(GRADE_PCT[target]) });
        }
      });
    });
  });
}

/** seed cohort ที่เลื่อนชั้น (รันครั้งเดียว หลัง seedDemoAcademics) */
export function seedDemoCohort(): boolean {
  if (!isBrowser()) return false;
  const data = load();
  if (data.demoV2) return false;
  if (!data.years.some(y => y.year === '2568')) return false; // รอ seed หลักก่อน
  seedCohortProgression(data);
  data.demoV2 = true;
  save(data);
  return true;
}

// ── seed คะแนนให้บัญชี demo ในห้อง ม.1/1 (r691): 10021-10025 ──
// เดิม seedDemoAcademics ให้คะแนนเฉพาะ roster 69xxx ทำให้ student1 (10021) ไม่มีเกรดในระบบ
// → หน้า Dashboard (fallback mock 3.75) ไม่ตรงกับหน้าผลการเรียน (—) · เติมให้ครบเพื่อให้ตรงกัน
const MOCK_ROSTER_ROOM = 'r691';
const MOCK_ROSTER_PLAN: Record<string, string[]> = {
  '10021': ['4', '3.5', '4', '3.5', '3.5', '4', '3', '3.5'],   // student1 (ธนาพร) — เก่ง
  '10022': ['3', '3.5', '3', '2.5', '3', '3.5', '2.5', '3'],
  '10023': ['2.5', '2', '2.5', '3', '2', '2.5', '3', '2.5'],
  '10024': ['3.5', '3', '3.5', '3', '4', '3', '3.5', 'ร'],
  '10025': ['2', '2.5', '2', '1.5', '2.5', '2', '1.5', '2'],
};

export function seedDemoRosterGrades(): boolean {
  if (!isBrowser()) return false;
  const data = load();
  if (data.demoRosterGrades) return false;
  if (!data.classrooms.some(c => c.id === MOCK_ROSTER_ROOM)) return false; // รอ seedDemoAcademics ก่อน

  const students = getClassroomStudents(MOCK_ROSTER_ROOM).filter(s => MOCK_ROSTER_PLAN[s.code]);
  if (students.length === 0) return false;

  data.courses.filter(c => c.classroomId === MOCK_ROSTER_ROOM).forEach((course, ci) => {
    const arr = data.scores[course.id] || (data.scores[course.id] = []);
    students.forEach(s => {
      if (arr.some(e => e.studentCode === s.code)) return; // มีคะแนนแล้ว ไม่ทับ
      if (course.gradingMode === 'symbol') {
        arr.push({ studentCode: s.code, studentName: s.name, scores: {}, symbol: 'ผ' });
      } else {
        const plan = MOCK_ROSTER_PLAN[s.code];
        const target = plan[ci % plan.length];
        if (target === 'ร') arr.push({ studentCode: s.code, studentName: s.name, scores: { collected: 30 }, symbol: 'ร' });
        else arr.push({ studentCode: s.code, studentName: s.name, scores: pctToScores(GRADE_PCT[target]) });
      }
    });
  });

  data.demoRosterGrades = true;
  save(data);
  return true;
}

/** seed ห้องทดสอบให้ครบทุกชั้น ป.1-6 และ ม.1-6 ในปี 2569 (ห้องละ 6 คน) — ไว้ทดสอบเลื่อนชั้น */
export function seedFullGrades(): boolean {
  if (!isBrowser()) return false;
  const data = load();
  if (data.demoV3) return false;
  const year = data.years.find(y => y.year === '2569');
  if (!year) return false;
  if (!data.rosters) data.rosters = {};
  const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
  GRADES.forEach((gname, gi) => {
    let g = data.gradeLevels.find(x => x.yearId === year.id && x.name === gname);
    if (!g) { g = { id: `gfull${gi}`, yearId: year.id, name: gname }; data.gradeLevels.push(g); }
    let room = data.classrooms.find(c => c.gradeLevelId === g!.id && c.room === '1');
    if (!room) { room = { id: `rfull${gi}`, yearId: year.id, gradeLevelId: g.id, room: '1' }; data.classrooms.push(room); }
    if (!data.rosters![room.id]?.length) {
      data.rosters![room.id] = Array.from({ length: 6 }, (_, i) => ({
        id: `SF${gi}${i}`, code: `5${String(gi + 1).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
        name: `${SEED_FIRST[(gi + i) % SEED_FIRST.length]} ${SEED_LAST[i % SEED_LAST.length]}`, classId: room!.id,
      }));
    }
  });
  data.demoV3 = true;
  save(data);
  return true;
}

// ─── เลื่อนระดับชั้น (แมนนวล) ──────────────────────────────────────────────
/** ชั้นถัดไป: ป.1→…→ป.6→ม.1 · ม.1→ม.2→ม.3 — คืน null ถ้าเลื่อนต่อไม่ได้ */
function nextGradeName(name: string): string | null {
  const m = name.match(/^(ป|ม)\.(\d+)$/);
  if (!m) return null;
  const lvl = m[1]; const num = parseInt(m[2]);
  if (lvl === 'ป') return num < 6 ? `ป.${num + 1}` : 'ม.1';   // ป.6 → ม.1
  return num < 6 ? `ม.${num + 1}` : null;                      // ม.1→…→ม.6 (ม.6 = สูงสุด)
}

/**
 * เลื่อนนักเรียนทั้งห้องขึ้นชั้นถัดไปในปีถัดไป (แมนนวล — ครู/แอดมินกดเอง)
 * สร้างปี/ระดับชั้น/ห้องปลายทางให้อัตโนมัติถ้ายังไม่มี · คัดลอกรายชื่อ (รหัสเดิม)
 * TODO(PostgreSQL): ทำเป็น transaction + บันทึกประวัติการเลื่อนชั้น
 */
export function promoteClassroom(sourceRoomId: string): { ok: boolean; error?: string; targetYear?: string; targetGrade?: string } {
  const data = load();
  const room = data.classrooms.find(c => c.id === sourceRoomId);
  if (!room) return { ok: false, error: 'ไม่พบห้องต้นทาง' };
  const grade = data.gradeLevels.find(g => g.id === room.gradeLevelId);
  const year = data.years.find(y => y.id === room.yearId);
  if (!grade || !year) return { ok: false, error: 'ข้อมูลห้องไม่สมบูรณ์' };
  const ng = nextGradeName(grade.name);
  if (!ng) return { ok: false, error: `${grade.name} เป็นชั้นสูงสุด เลื่อนต่อไม่ได้` };
  const students = getClassroomStudents(sourceRoomId);
  if (students.length === 0) return { ok: false, error: 'ห้องนี้ยังไม่มีนักเรียน' };

  const targetYearStr = String(parseInt(year.year) + 1);
  let ty = data.years.find(y => y.year === targetYearStr);
  if (!ty) { ty = { id: `y${Date.now()}`, year: targetYearStr, createdBy: getSession()?.username || 'system', createdAt: Date.now(), active: true }; data.years.push(ty); }
  let tg = data.gradeLevels.find(g => g.yearId === ty!.id && g.name === ng);
  if (!tg) { tg = { id: `g${Date.now()}`, yearId: ty.id, name: ng }; data.gradeLevels.push(tg); }
  let tr = data.classrooms.find(c => c.gradeLevelId === tg!.id && c.room === room.room);
  if (!tr) { tr = { id: `r${Date.now()}`, yearId: ty.id, gradeLevelId: tg.id, room: room.room }; data.classrooms.push(tr); }

  if (!data.rosters) data.rosters = {};
  const troster = data.rosters[tr.id] || [];
  students.forEach(st => { if (!troster.some(x => x.code === st.code)) troster.push({ id: `S${Date.now()}_${st.code}`, code: st.code, name: st.name, classId: tr!.id }); });
  data.rosters[tr.id] = troster;
  save(data);
  return { ok: true, targetYear: targetYearStr, targetGrade: `${ng}/${room.room}` };
}

// ─── สิทธิ์การใช้งานคะแนน ─────────────────────────────────────────────────
// TODO(PostgreSQL): บังคับซ้ำด้วย RLS: teacher เขียนได้เฉพาะ course ที่ owner_username = auth.uid()
export function canManageScores(course: Course): boolean {
  const session = getSession();
  if (!session) return false;
  if (session.role === 'web_admin') return true;           // super admin
  if (session.role !== 'teacher') return false;
  // legacy course ที่ยังไม่มี ownerUsername: เทียบด้วยชื่อครูแทน
  return course.ownerUsername ? course.ownerUsername === session.username : course.teacherName === session.name;
}

// ─── Academic Year ───────────────────────────────────────────────────────
const isActive = (y: AcademicYear) => y.active !== false; // undefined = เปิด (ข้อมูลเก่า)

/** ปีที่ "เปิดใช้งาน" เท่านั้น — ใช้ในตัวเลือกของหน้าจัดตาราง/บันทึกคะแนน (ปีที่ปิดถูกซ่อน) */
// TODO(PostgreSQL): SELECT * FROM academic_years WHERE active ORDER BY year DESC
export function getAcademicYears(): AcademicYear[] {
  return [...load().years].filter(isActive).sort((a, b) => b.year.localeCompare(a.year));
}

/** ทุกปี รวมที่ปิดแล้ว — ใช้ในหน้าจัดการ และการ resolve ป้ายห้อง/บริบทของข้อมูลย้อนหลัง */
export function getAllAcademicYears(): AcademicYear[] {
  return [...load().years].sort((a, b) => b.year.localeCompare(a.year));
}

// TODO(PostgreSQL): INSERT INTO academic_years (year, created_by, active) VALUES ($1, $2, true)
export function createAcademicYear(year: string, createdBy: string): AcademicYear | null {
  const data = load();
  if (data.years.some(y => y.year === year)) return null; // ห้ามซ้ำ
  const item: AcademicYear = { id: `y${Date.now()}`, year, createdBy, createdAt: Date.now(), active: true };
  data.years.push(item);
  save(data);
  return item;
}

/** เปิด/ปิดการใช้งานปีการศึกษา — ปิดแล้วซ่อนจากตัวเลือก แต่ข้อมูลยังอยู่ครบ (กดเปิดคืนได้) */
export function setYearActive(yearId: string, active: boolean): boolean {
  const data = load();
  const y = data.years.find(x => x.id === yearId);
  if (!y) return false;
  y.active = active;
  save(data);
  return true;
}

/** จำนวนคาบสอน/รายการคะแนนที่ผูกกับปีนี้ — ใช้เตือนก่อนลบ */
export function yearUsage(yearId: string): { classrooms: number; courses: number } {
  const data = load();
  const roomIds = data.classrooms.filter(c => c.yearId === yearId).map(c => c.id);
  const courses = data.courses.filter(c => roomIds.includes(c.classroomId)).length;
  return { classrooms: roomIds.length, courses };
}

/** ลบปีการศึกษา (พร้อมชั้น/ห้อง/วิชา/คะแนนในปีนั้น) — เรียกหลังผู้ใช้ยืนยันแล้วเท่านั้น */
export function deleteAcademicYear(yearId: string): boolean {
  const data = load();
  if (!data.years.some(y => y.id === yearId)) return false;
  const roomIds = new Set(data.classrooms.filter(c => c.yearId === yearId).map(c => c.id));
  const removedCourseIds = data.courses.filter(c => roomIds.has(c.classroomId)).map(c => c.id);
  data.years = data.years.filter(y => y.id !== yearId);
  data.gradeLevels = data.gradeLevels.filter(g => g.yearId !== yearId);
  data.classrooms = data.classrooms.filter(c => c.yearId !== yearId);
  data.courses = data.courses.filter(c => !roomIds.has(c.classroomId));
  removedCourseIds.forEach(id => { delete data.scores[id]; });     // คะแนน keyed ตาม courseId
  if (data.rosters) roomIds.forEach(id => { delete data.rosters![id]; });
  save(data);
  return true;
}

// ─── Grade Level (แอดมินเท่านั้น) ────────────────────────────────────────
export function getGradeLevels(yearId: string): GradeLevel[] {
  return load().gradeLevels.filter(g => g.yearId === yearId);
}

export function createGradeLevel(yearId: string, name: string): GradeLevel | null {
  const data = load();
  if (data.gradeLevels.some(g => g.yearId === yearId && g.name === name)) return null;
  const item: GradeLevel = { id: `g${Date.now()}`, yearId, name };
  data.gradeLevels.push(item);
  save(data);
  return item;
}

/** ลบระดับชั้น (พร้อมห้อง/วิชา/คะแนนในชั้นนั้น) — เรียกหลังยืนยันแล้ว */
export function deleteGradeLevel(gradeLevelId: string): boolean {
  const data = load();
  if (!data.gradeLevels.some(g => g.id === gradeLevelId)) return false;
  const roomIds = new Set(data.classrooms.filter(c => c.gradeLevelId === gradeLevelId).map(c => c.id));
  const removedCourseIds = data.courses.filter(c => roomIds.has(c.classroomId)).map(c => c.id);
  data.gradeLevels = data.gradeLevels.filter(g => g.id !== gradeLevelId);
  data.classrooms = data.classrooms.filter(c => c.gradeLevelId !== gradeLevelId);
  data.courses = data.courses.filter(c => !roomIds.has(c.classroomId));
  removedCourseIds.forEach(id => { delete data.scores[id]; });
  if (data.rosters) roomIds.forEach(id => { delete data.rosters![id]; });
  save(data);
  return true;
}

// ─── Classroom (แอดมินเท่านั้น) ──────────────────────────────────────────
export function getClassrooms(gradeLevelId: string): Classroom[] {
  return load().classrooms.filter(c => c.gradeLevelId === gradeLevelId);
}

export function createClassroom(yearId: string, gradeLevelId: string, room: string): Classroom | null {
  const data = load();
  if (data.classrooms.some(c => c.gradeLevelId === gradeLevelId && c.room === room)) return null;
  const item: Classroom = { id: `r${Date.now()}`, yearId, gradeLevelId, room };
  data.classrooms.push(item);
  save(data);
  return item;
}

/** ลบห้องเรียน (พร้อมวิชา/คะแนน/นักเรียนในห้องนั้น) — เรียกหลังยืนยันแล้ว */
export function deleteClassroom(classroomId: string): boolean {
  const data = load();
  if (!data.classrooms.some(c => c.id === classroomId)) return false;
  const removedCourseIds = data.courses.filter(c => c.classroomId === classroomId).map(c => c.id);
  data.classrooms = data.classrooms.filter(c => c.id !== classroomId);
  data.courses = data.courses.filter(c => c.classroomId !== classroomId);
  removedCourseIds.forEach(id => { delete data.scores[id]; });
  if (data.rosters) delete data.rosters[classroomId];
  save(data);
  return true;
}

/** ห้องนี้มีคาบสอน/คะแนนผูกอยู่ไหม — ใช้เตือนก่อนลบ */
export function classroomUsage(classroomId: string): { courses: number; scored: boolean } {
  const data = load();
  const courses = data.courses.filter(c => c.classroomId === classroomId);
  const scored = courses.some(c => (data.scores[c.id] || []).some(e => e.symbol || Object.values(e.scores).some(v => v !== null)));
  return { courses: courses.length, scored };
}

// ─── Course / รายวิชา — ดึงอัตโนมัติจากตารางสอนของครู ────────────────────
export function getCourses(classroomId: string): Course[] {
  return load().courses.filter(c => c.classroomId === classroomId);
}

/** สร้างรหัสวิชาอัตโนมัติจาก subject key + ระดับชั้น เช่น math + ม.1 → ค21101 */
const SUBJECT_CODE_PREFIX: Record<string, string> = {
  math: 'ค', thai: 'ท', sci: 'ว', eng: 'อ', social: 'ส',
  pe: 'พ', art: 'ศ', music: 'ศ', com: 'ว', stat: 'ค',
};
function genCourseCode(key: string, gradeName: string): string {
  const n = gradeName.replace(/[^0-9]/g, '') || '0';
  return `${SUBJECT_CODE_PREFIX[key] || 'ร'}2${n}101`;
}

/**
 * ดึงรายวิชาที่ครูคนนี้สอนในห้องนี้ จากตารางสอน (ClassInfo) — ไม่ต้องสร้างเอง
 * ถ้ายังไม่มี record จะสร้างให้พร้อมสัดส่วนคะแนนมาตรฐาน (เก็บ 60 / กลางภาค 20 / ปลายภาค 20)
 * super admin (web_admin) เห็นทุกวิชาในห้อง
 * TODO(PostgreSQL): SELECT * FROM courses WHERE classroom_id=$1 AND owner_username=$2
 */
export function syncTeacherCourses(classroomId: string, teacherClasses: ClassInfo[], teacher: { id: string; name: string }): Course[] {
  /** กิจกรรม/ชุมนุม = ไม่คิดเกรด (ผ/มผ) — ค่านี้มาจากตารางสอนที่ครูตั้งไว้ */
  const modeOf = (cls: ClassInfo): GradingMode => cls.gradingMode || 'numeric';
  const session = getSession();
  if (!session) return [];

  const data = load();
  const room = data.classrooms.find(c => c.id === classroomId);
  const grade = room ? data.gradeLevels.find(g => g.id === room.gradeLevelId) : undefined;
  if (!room || !grade) return [];

  if (session.role === 'teacher') {
    // วิชาในตารางสอนของครูที่ตรงกับห้องนี้
    const taught = teacherClasses.filter(c => c.grade === grade.name && c.room === room.room);
    let changed = false;
    for (const cls of taught) {
      // ระบุวิชาด้วย "รหัสวิชา" — ครูอาจสอน 2 วิชาในกลุ่มสาระเดียวกันในห้องเดียว (เช่น คณิตพื้นฐาน + คณิตเพิ่มเติม)
      const code = cls.code || genCourseCode(cls.key, grade.name);
      const found = data.courses.find(c => c.classroomId === classroomId && c.code === code && (c.ownerUsername === session.username || c.teacherName === session.name));
      if (found) {
        // ครูแก้ตารางสอน → อัปเดตชื่อ/วิธีตัดสินผลของวิชาที่มีอยู่ให้ตรงกัน
        if (found.gradingMode !== modeOf(cls)) { found.gradingMode = modeOf(cls); changed = true; }
        if (found.name !== cls.subject)        { found.name = cls.subject;        changed = true; }
        continue;
      }
      data.courses.push({
        id: `crs${Date.now()}_${code}`,
        classroomId, code, name: cls.subject, key: cls.key,
        teacherId: teacher.id, teacherName: teacher.name, ownerUsername: session.username,
        components: DEFAULT_COMPONENTS.map(c => ({ ...c })),
        gradingMode: modeOf(cls),
        createdAt: Date.now(),
      });
      changed = true;
    }
    if (changed) save(data);
    return data.courses.filter(c => c.classroomId === classroomId && canManageScores(c));
  }

  // super admin เห็นทุกวิชาในห้อง
  if (session.role === 'web_admin') return data.courses.filter(c => c.classroomId === classroomId);
  return [];
}

/** แก้ไขสัดส่วนคะแนนของวิชา — เฉพาะครูประจำวิชา/super admin */
export function updateCourseComponents(courseId: string, components: ScoreComponent[]): boolean {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course || !canManageScores(course)) return false;
  course.components = components;
  // ลบคะแนนของหัวข้อที่ถูกเอาออก เพื่อไม่ให้ค้างในผลรวม
  const validIds = new Set(components.map(c => c.id));
  (data.scores[courseId] || []).forEach(e => {
    Object.keys(e.scores).forEach(k => { if (!validIds.has(k)) delete e.scores[k]; });
  });
  save(data);
  return true;
}

// ─── นักเรียนในห้อง ───────────────────────────────────────────────────────
export function getClassroomStudents(classroomId: string): TeacherStudent[] {
  const data = load();
  const room = data.classrooms.find(c => c.id === classroomId);
  if (!room) return [];

  const grade = data.gradeLevels.find(g => g.id === room.gradeLevelId);
  const mockClass = grade
    ? TEACHER_DATA_MOCK.classes.find(c => c.grade === grade.name && c.room === room.room)
    : undefined;
  const mockStudents = mockClass
    ? TEACHER_DATA_MOCK.students.filter(s => s.classId === mockClass.id)
    : [];

  const roster = data.rosters?.[classroomId] || [];
  const merged = [...mockStudents];
  roster.forEach(r => { if (!merged.some(s => s.code === r.code)) merged.push(r); });
  return merged;
}

/** รหัสนักเรียนทั้งหมดที่มีอยู่จริงในทุกห้อง (mock + roster + cohort) — ใช้ seed ผลประเมินให้ครบทุกคน */
export function allStudentCodes(): string[] {
  const data = load();
  const set = new Set<string>();
  data.classrooms.forEach(c => getClassroomStudents(c.id).forEach(s => set.add(s.code)));
  return [...set];
}

export function addStudentToClassroom(classroomId: string, code: string, name: string): boolean {
  const data = load();
  if (getClassroomStudents(classroomId).some(s => s.code === code)) return false;
  if (!data.rosters) data.rosters = {};
  if (!data.rosters[classroomId]) data.rosters[classroomId] = [];
  data.rosters[classroomId].push({ id: `S${Date.now()}`, code, name, classId: classroomId });
  save(data);
  return true;
}

export function removeStudentFromClassroom(classroomId: string, code: string): void {
  const data = load();
  if (!data.rosters?.[classroomId]) return;
  data.rosters[classroomId] = data.rosters[classroomId].filter(s => s.code !== code);
  save(data);
}

// ─── คะแนน (ปพ.5) ─────────────────────────────────────────────────────────
export function getScores(courseId: string): ScoreEntry[] {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course) return [];
  const saved = data.scores[courseId] || [];
  const students = getClassroomStudents(course.classroomId);
  // ผสาน: นักเรียนทุกคนในห้องต้องมีแถว แม้ยังไม่บันทึกคะแนน
  return students.map(s => {
    const existing = saved.find(e => e.studentCode === s.code);
    return existing || { studentCode: s.code, studentName: s.name, scores: {} };
  });
}

/**
 * บันทึกคะแนน (เรียกอัตโนมัติทุกครั้งที่แก้ตัวเลข — real-time)
 * คืน false ถ้าไม่มีสิทธิ์ (ไม่ใช่ครูประจำวิชา/super admin)
 * TODO(PostgreSQL): UPSERT score_records + ตรวจสิทธิ์ด้วย RLS
 */
export function saveScores(courseId: string, entries: ScoreEntry[]): boolean {
  const data = load();
  const course = data.courses.find(c => c.id === courseId);
  if (!course || !canManageScores(course)) return false;
  data.scores[courseId] = entries;
  save(data);
  return true;
}

// ─── คำนวณคะแนน/เกรด (โปร่งใส ตรวจสอบได้) ───────────────────────────────
/** id ของหัวข้อที่ "คิดรวม" ในคะแนนวิชา (ตัดหัวข้อประเมินแยก เช่น สมรรถนะ/อ่านคิดวิเคราะห์ ออก) */
function countedIds(course: Course): Set<string> {
  return new Set(course.components.filter(c => !c.excludeFromTotal).map(c => c.id));
}

/** คะแนนรวมของนักเรียน = ผลบวกเฉพาะหัวข้อที่คิดรวม (ยังไม่กรอกเลย = null) */
export function calcTotal(e: ScoreEntry, course: Course): number | null {
  const counted = countedIds(course);
  const vals = Object.entries(e.scores)
    .filter(([id, v]) => counted.has(id) && v !== null && v !== undefined)
    .map(([, v]) => v as number);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0);
}

/** คะแนนเต็มรวมของวิชา = ผลบวก max เฉพาะหัวข้อที่คิดรวม (ไม่รวมหัวข้อประเมินแยก) */
export function maxTotal(course: Course): number {
  return course.components.filter(c => !c.excludeFromTotal).reduce((s, c) => s + c.max, 0);
}

/** เปอร์เซ็นต์ = รวม ÷ เต็มรวม × 100 — ใช้คิดเกรด ไม่ว่าสัดส่วนจะรวมเป็นเท่าไร */
export function calcPercent(e: ScoreEntry, course: Course): number | null {
  const total = calcTotal(e, course);
  const max = maxTotal(course);
  if (total === null || max === 0) return null;
  return (total / max) * 100;
}

/**
 * ผลการเรียนที่แสดงจริงของนักเรียน 1 คนในวิชานั้น
 *   - ถ้าครูเลือกสัญลักษณ์ไว้ (ผ/มผ/ร/มส/ขส/ขร) → ใช้สัญลักษณ์นั้นเสมอ
 *   - วิชาไม่คิดเกรด (กิจกรรม/ชุมนุม) ที่ยังไม่ได้ประเมิน → '—'
 *   - วิชาคิดเกรด → คำนวณจากเปอร์เซ็นต์ตามปกติ
 */
export function resolveGrade(e: ScoreEntry, course: Course): string {
  if (e.symbol) return e.symbol;
  if (course.gradingMode === 'symbol') return '—';
  return calcGrade(calcPercent(e, course));
}

/** เกรดนี้เป็นสัญลักษณ์ (ไม่นำไปคิด GPA) หรือไม่ */
export function isSpecialGrade(grade: string): boolean {
  return SPECIAL_GRADES.some(g => g.code === grade);
}

/** เกรดตามเกณฑ์ สพฐ. จากเปอร์เซ็นต์: 80+ = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1 */
export function calcGrade(percent: number | null): string {
  if (percent === null) return '—';
  if (percent >= 80) return '4';
  if (percent >= 75) return '3.5';
  if (percent >= 70) return '3';
  if (percent >= 65) return '2.5';
  if (percent >= 60) return '2';
  if (percent >= 55) return '1.5';
  if (percent >= 50) return '1';
  return '0';
}

// ─── ผลการเรียนรายนักเรียน (หน้าเกรดนักเรียน/ผู้ปกครอง + ปพ.1/ปพ.6) ─────
export interface StudentGradeRow {
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  classroomLabel: string;  // เช่น 'ม.1/1'
  academicYear: string;
  breakdown: { name: string; max: number; score: number | null }[];
  total: number | null;
  maxTotal: number;
  grade: string;
  gradingMode: GradingMode;  // 'symbol' = วิชากิจกรรม/ชุมนุม ไม่คิดเกรด
  isSpecial: boolean;        // เกรดเป็นสัญลักษณ์ (ไม่คิด GPA)
  credit: number;            // หน่วยกิต (ดึงจากคลังวิชาตามรหัสวิชา) — ใช้ถ่วงน้ำหนัก GPA
}

/**
 * หน่วยกิตมาตรฐานตามกลุ่มสาระ (เกณฑ์ สพฐ. ต่อภาคเรียน) — ใช้เมื่อรหัสวิชาไม่มีในคลัง
 * เพื่อให้ GPA ถ่วงน้ำหนัก "ครบทุกวิชา" ไม่ใช่เฉพาะวิชาที่แอดมินเพิ่มในคลังเท่านั้น
 * (รองรับ alias ของ key ที่ใช้กระจายในโปรเจกต์: sci/science, eng/english)
 */
const STANDARD_CREDIT_BY_KEY: Record<string, number> = {
  thai: 1.5, math: 1.5, science: 1.5, sci: 1.5, social: 1.5, english: 1.5, eng: 1.5,
  pe: 0.5, health: 0.5, art: 0.5, music: 0.5, career: 0.5, work: 0.5, com: 1.0,
  guidance: 0, club: 0, scout: 0, activity: 0,
};

/** map รหัสวิชา → หน่วยกิต จากคลังวิชา (แหล่งความจริงหลักเมื่อแอดมินตั้งค่าไว้) */
function creditByCode(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of getCatalogSubjects()) map[s.code] = s.credit;
  return map;
}

/** หน่วยกิตของรายวิชา: คลังวิชา (รหัสตรง) → มาตรฐานตามกลุ่มสาระ → 1.0 */
function resolveCredit(course: Course, catalog: Record<string, number>): number {
  if (catalog[course.code] !== undefined) return catalog[course.code];
  if (STANDARD_CREDIT_BY_KEY[course.key] !== undefined) return STANDARD_CREDIT_BY_KEY[course.key];
  return 1;
}

export function getStudentGrades(studentCode: string): StudentGradeRow[] {
  const data = load();
  const credits = creditByCode();
  const rows: StudentGradeRow[] = [];
  for (const course of data.courses) {
    const entry = (data.scores[course.id] || []).find(e => e.studentCode === studentCode);
    if (!entry) continue;
    const room = data.classrooms.find(c => c.id === course.classroomId);
    const grade = room ? data.gradeLevels.find(g => g.id === room.gradeLevelId) : undefined;
    const year = room ? data.years.find(y => y.id === room.yearId) : undefined;
    const finalGrade = resolveGrade(entry, course);
    rows.push({
      courseId: course.id, courseCode: course.code, courseName: course.name,
      teacherName: course.teacherName,
      classroomLabel: grade && room ? `${grade.name}/${room.room}` : '—',
      academicYear: year?.year || '—',
      breakdown: course.components.map(c => ({ name: c.name, max: c.max, score: entry.scores[c.id] ?? null })),
      total: calcTotal(entry, course), maxTotal: maxTotal(course),
      grade: finalGrade,
      gradingMode: course.gradingMode,
      isSpecial: isSpecialGrade(finalGrade),
      credit: resolveCredit(course, credits),
    });
  }
  return rows;
}

/**
 * GPA (GPAX) ถ่วงน้ำหนักด้วยหน่วยกิต ตามระเบียบการวัดผล สพฐ.:
 *   GPA = Σ(เกรด × หน่วยกิต) ÷ Σ(หน่วยกิต) เฉพาะวิชาที่คิดเกรด
 * วิชากิจกรรม/ชุมนุม และผลแบบสัญลักษณ์ (ผ/มผ/ร/มส/ขส/ขร) ไม่ถูกนำมาคิด
 * (วิชาที่ไม่พบหน่วยกิตในคลัง ใช้ค่า 1.0 เท่ากันทุกวิชา = เทียบเท่าค่าเฉลี่ยแบบเดิม)
 */
export function calcGPA(rows: StudentGradeRow[]): number | null {
  let weightedSum = 0;
  let totalCredit = 0;
  for (const r of rows) {
    if (r.grade === '—' || r.isSpecial) continue;
    const g = parseFloat(r.grade);
    if (Number.isNaN(g)) continue;
    const credit = r.credit > 0 ? r.credit : 1;
    weightedSum += g * credit;
    totalCredit += credit;
  }
  if (totalCredit === 0) return null;
  return weightedSum / totalCredit;
}
