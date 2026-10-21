/**
 * Programme profile & curriculum mapping (M4) — PLO / รายวิชา / CLO / CLO→PLO (I/R/M) / วิธีสอน-วัดผล
 * ทุก write ตรวจสิทธิ์ 'curriculum.write' ระดับหลักสูตร + audit · validate ก่อน mutate แล้วค่อย save (cache คืน reference ร่วม)
 * TODO(PostgreSQL): plos, courses, course_prerequisites, clos, clo_plo_map, course_methods
 */
import type {
  AppUser, Clo, CloPloMap, Course, CourseMethod, CurriculumData, CurriculumGap, MapLevel, Plo, PloType,
} from '../types';
import { newId } from '../utils/hash';
import { appendAudit } from './audit.store';
import { curriculumGaps, curriculumMatrix, findPrereqCycles, type MatrixRow } from './curriculum-gap';
import { loadCurriculumRaw } from './curriculum-data.internal';
import { AunqaError, KEYS, load, save } from './db';
import { getProgramme, programmeScope } from './org.store';
import { can } from './rbac';

const MAX_TEXT = 1000;
const CODE_RE = /^[A-Za-z0-9._-]{1,20}$/;
const LEVELS: MapLevel[] = ['I', 'R', 'M'];

// ─── guards / validators ─────────────────────────────────────────────────
function assertProgramme(programmeId: string): void {
  if (!getProgramme(programmeId)) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
}
function assertWrite(actor: AppUser, programmeId: string): void {
  assertProgramme(programmeId);
  if (!can(actor, 'curriculum.write', programmeScope(programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้ไขข้อมูลหลักสูตร');
}
function assertRead(user: AppUser, programmeId: string): void {
  assertProgramme(programmeId);
  if (!can(user, 'read', programmeScope(programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูข้อมูลหลักสูตรนี้');
}
function code(v: string, label: string): string {
  const t = (v ?? '').trim();
  if (!CODE_RE.test(t)) throw new AunqaError('invalid', `${label}ต้องเป็นตัวอักษร/ตัวเลข 1–20 ตัว`);
  return t;
}
function text(v: string | undefined, label: string, required = true): string {
  const t = (v ?? '').trim();
  if (required && !t) throw new AunqaError('invalid', `${label}ต้องไม่ว่าง`);
  if (t.length > MAX_TEXT) throw new AunqaError('invalid', `${label}ยาวเกินไป`);
  return t;
}
function bloom(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 6) throw new AunqaError('invalid', 'ระดับ Bloom ต้องเป็นจำนวนเต็ม 1–6');
  return n;
}
function num(v: number, label: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new AunqaError('invalid', `${label}ต้องอยู่ระหว่าง ${min}–${max}`);
  return v;
}
/** ตัด key ที่เป็น undefined ออกจาก patch (กันไปทับค่าเดิม) */
function clean<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// ─── read ────────────────────────────────────────────────────────────────
export function getCurriculum(user: AppUser, programmeId: string): CurriculumData {
  assertRead(user, programmeId);
  return loadCurriculumRaw(programmeId);
}
export function getCurriculumGaps(user: AppUser, programmeId: string): CurriculumGap[] {
  return curriculumGaps(getCurriculum(user, programmeId));
}
export function getCurriculumMatrix(user: AppUser, programmeId: string): { plos: Plo[]; rows: MatrixRow[] } {
  return curriculumMatrix(getCurriculum(user, programmeId));
}

// ─── PLO ─────────────────────────────────────────────────────────────────
export interface PloInput { programmeId: string; code: string; textTh: string; textEn?: string; type: PloType; bloomLevel: number }

function checkPlo(i: Omit<PloInput, 'programmeId'>, programmeId: string, selfId?: string): Omit<Plo, 'id' | 'programmeId'> {
  const c = code(i.code, 'รหัส PLO');
  if (i.type !== 'generic' && i.type !== 'specific') throw new AunqaError('invalid', 'ประเภท PLO ไม่ถูกต้อง');
  if (load<Plo>(KEYS.plos).some(p => p.programmeId === programmeId && p.code === c && p.id !== selfId))
    throw new AunqaError('duplicate', `รหัส PLO ${c} ซ้ำ`);
  return { code: c, textTh: text(i.textTh, 'ข้อความ PLO (ไทย)'), textEn: text(i.textEn, 'ข้อความ PLO (อังกฤษ)', false), type: i.type, bloomLevel: bloom(i.bloomLevel) };
}

export function createPlo(actor: AppUser, input: PloInput): Plo {
  assertWrite(actor, input.programmeId);
  const body = checkPlo(input, input.programmeId);
  const plo: Plo = { id: newId('plo'), programmeId: input.programmeId, ...body };
  save(KEYS.plos, [...load<Plo>(KEYS.plos), plo]);
  appendAudit(actor, { action: 'curriculum.plo.create', targetType: 'plo', targetId: plo.id, programmeId: plo.programmeId, after: { code: plo.code } });
  return plo;
}

export function updatePlo(actor: AppUser, id: string, patch: Partial<Omit<PloInput, 'programmeId'>>): Plo {
  const rows = load<Plo>(KEYS.plos);
  const cur = rows.find(p => p.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ PLO');
  assertWrite(actor, cur.programmeId);
  const next: Plo = { ...cur, ...checkPlo({ ...cur, ...clean(patch) }, cur.programmeId, id) };
  save(KEYS.plos, rows.map(p => (p.id === id ? next : p)));
  appendAudit(actor, { action: 'curriculum.plo.update', targetType: 'plo', targetId: id, programmeId: cur.programmeId, before: cur, after: next });
  return next;
}

export function deletePlo(actor: AppUser, id: string): void {
  const cur = load<Plo>(KEYS.plos).find(p => p.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ PLO');
  assertWrite(actor, cur.programmeId);
  save(KEYS.plos, load<Plo>(KEYS.plos).filter(p => p.id !== id));
  save(KEYS.cloPloMap, load<CloPloMap>(KEYS.cloPloMap).filter(m => m.ploId !== id));
  appendAudit(actor, { action: 'curriculum.plo.delete', targetType: 'plo', targetId: id, programmeId: cur.programmeId, before: { code: cur.code } });
}

// ─── Course ──────────────────────────────────────────────────────────────
export interface CourseInput {
  programmeId: string; code: string; nameTh: string; nameEn?: string; credits: number; year: number; semester: number;
  category?: string; isElective?: boolean; track?: string; prerequisiteIds?: string[];
}

function checkCourse(i: Omit<CourseInput, 'programmeId'>, programmeId: string, selfId?: string): Omit<Course, 'id' | 'programmeId'> {
  const all = load<Course>(KEYS.courses).filter(c => c.programmeId === programmeId);
  const c = code(i.code, 'รหัสวิชา');
  if (all.some(x => x.code === c && x.id !== selfId)) throw new AunqaError('duplicate', `รหัสวิชา ${c} ซ้ำ`);
  const pre = Array.from(new Set(i.prerequisiteIds ?? []));
  for (const p of pre) {
    if (p === selfId) throw new AunqaError('invalid', 'วิชาเป็น prerequisite ของตัวเองไม่ได้');
    if (!all.some(x => x.id === p)) throw new AunqaError('invalid', 'prerequisite ต้องเป็นวิชาในหลักสูตรเดียวกัน');
  }
  const body = {
    code: c, nameTh: text(i.nameTh, 'ชื่อวิชา (ไทย)'), nameEn: text(i.nameEn, 'ชื่อวิชา (อังกฤษ)', false),
    credits: num(i.credits, 'หน่วยกิต', 0, 30), year: num(i.year, 'ชั้นปี', 1, 8), semester: num(i.semester, 'ภาคเรียน', 1, 3),
    category: text(i.category, 'หมวดวิชา', false), isElective: !!i.isElective,
    track: i.track?.trim() ? text(i.track, 'แขนงวิชา') : undefined, prerequisiteIds: pre,
  };
  // prerequisite วนซ้ำ (รวมวิชาที่กำลังบันทึก) → ปฏิเสธ
  const probeId = selfId ?? '__new__';
  const probe = [...all.filter(x => x.id !== selfId), { id: probeId, prerequisiteIds: pre }];
  if (findPrereqCycles(probe).some(g => g.includes(probeId))) throw new AunqaError('invalid', 'prerequisite วนซ้ำ ไม่สามารถบันทึกได้');
  return body;
}

export function createCourse(actor: AppUser, input: CourseInput): Course {
  assertWrite(actor, input.programmeId);
  const body = checkCourse(input, input.programmeId);
  const course: Course = { id: newId('crs'), programmeId: input.programmeId, ...body };
  save(KEYS.courses, [...load<Course>(KEYS.courses), course]);
  appendAudit(actor, { action: 'curriculum.course.create', targetType: 'course', targetId: course.id, programmeId: course.programmeId, after: { code: course.code } });
  return course;
}

export function updateCourse(actor: AppUser, id: string, patch: Partial<Omit<CourseInput, 'programmeId'>>): Course {
  const rows = load<Course>(KEYS.courses);
  const cur = rows.find(c => c.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบวิชา');
  assertWrite(actor, cur.programmeId);
  const next: Course = { ...cur, ...checkCourse({ ...cur, ...clean(patch) }, cur.programmeId, id) };
  save(KEYS.courses, rows.map(c => (c.id === id ? next : c)));
  appendAudit(actor, { action: 'curriculum.course.update', targetType: 'course', targetId: id, programmeId: cur.programmeId, before: cur, after: next });
  return next;
}

export function deleteCourse(actor: AppUser, id: string): void {
  const cur = load<Course>(KEYS.courses).find(c => c.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบวิชา');
  assertWrite(actor, cur.programmeId);
  const cloIds = new Set(load<Clo>(KEYS.clos).filter(c => c.courseId === id).map(c => c.id));
  save(KEYS.courses, load<Course>(KEYS.courses).filter(c => c.id !== id)
    .map(c => (c.prerequisiteIds.includes(id) ? { ...c, prerequisiteIds: c.prerequisiteIds.filter(p => p !== id) } : c)));
  save(KEYS.clos, load<Clo>(KEYS.clos).filter(c => c.courseId !== id));
  save(KEYS.cloPloMap, load<CloPloMap>(KEYS.cloPloMap).filter(m => !cloIds.has(m.cloId)));
  save(KEYS.courseMethods, load<CourseMethod>(KEYS.courseMethods).filter(m => m.courseId !== id));
  appendAudit(actor, { action: 'curriculum.course.delete', targetType: 'course', targetId: id, programmeId: cur.programmeId, before: { code: cur.code } });
}

// ─── CLO ─────────────────────────────────────────────────────────────────
export interface CloInput { courseId: string; code: string; textTh: string; textEn?: string; bloomLevel: number }

function courseOf(courseId: string): Course {
  const c = load<Course>(KEYS.courses).find(x => x.id === courseId);
  if (!c) throw new AunqaError('not_found', 'ไม่พบวิชา');
  return c;
}
function checkClo(i: Omit<CloInput, 'courseId'>, courseId: string, selfId?: string): Omit<Clo, 'id' | 'courseId'> {
  const c = code(i.code, 'รหัส CLO');
  if (load<Clo>(KEYS.clos).some(x => x.courseId === courseId && x.code === c && x.id !== selfId)) throw new AunqaError('duplicate', `รหัส CLO ${c} ซ้ำในวิชานี้`);
  return {
    code: c, textTh: text(i.textTh, 'ข้อความ CLO (ไทย)'),
    textEn: i.textEn?.trim() ? text(i.textEn, 'ข้อความ CLO (อังกฤษ)') : undefined, bloomLevel: bloom(i.bloomLevel),
  };
}

export function createClo(actor: AppUser, input: CloInput): Clo {
  const course = courseOf(input.courseId);
  assertWrite(actor, course.programmeId);
  const clo: Clo = { id: newId('clo'), courseId: course.id, ...checkClo(input, course.id) };
  save(KEYS.clos, [...load<Clo>(KEYS.clos), clo]);
  appendAudit(actor, { action: 'curriculum.clo.create', targetType: 'clo', targetId: clo.id, programmeId: course.programmeId, after: { code: clo.code } });
  return clo;
}

export function updateClo(actor: AppUser, id: string, patch: Partial<Omit<CloInput, 'courseId'>>): Clo {
  const rows = load<Clo>(KEYS.clos);
  const cur = rows.find(c => c.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ CLO');
  const course = courseOf(cur.courseId);
  assertWrite(actor, course.programmeId);
  const next: Clo = { ...cur, ...checkClo({ ...cur, ...clean(patch) }, cur.courseId, id) };
  save(KEYS.clos, rows.map(c => (c.id === id ? next : c)));
  appendAudit(actor, { action: 'curriculum.clo.update', targetType: 'clo', targetId: id, programmeId: course.programmeId, before: cur, after: next });
  return next;
}

export function deleteClo(actor: AppUser, id: string): void {
  const cur = load<Clo>(KEYS.clos).find(c => c.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ CLO');
  const course = courseOf(cur.courseId);
  assertWrite(actor, course.programmeId);
  save(KEYS.clos, load<Clo>(KEYS.clos).filter(c => c.id !== id));
  save(KEYS.cloPloMap, load<CloPloMap>(KEYS.cloPloMap).filter(m => m.cloId !== id));
  save(KEYS.courseMethods, load<CourseMethod>(KEYS.courseMethods)
    .map(m => (m.cloIds.includes(id) ? { ...m, cloIds: m.cloIds.filter(x => x !== id) } : m)));
  appendAudit(actor, { action: 'curriculum.clo.delete', targetType: 'clo', targetId: id, programmeId: course.programmeId, before: { code: cur.code } });
}

// ─── CLO → PLO map ───────────────────────────────────────────────────────
/** ตั้ง/ล้างระดับ I/R/M ของ CLO→PLO (level = null → ลบการผูก) */
export function setCloPloMap(actor: AppUser, cloId: string, ploId: string, level: MapLevel | null): CloPloMap | null {
  const clo = load<Clo>(KEYS.clos).find(c => c.id === cloId);
  if (!clo) throw new AunqaError('not_found', 'ไม่พบ CLO');
  const course = courseOf(clo.courseId);
  const plo = load<Plo>(KEYS.plos).find(p => p.id === ploId);
  if (!plo || plo.programmeId !== course.programmeId) throw new AunqaError('invalid', 'PLO ต้องอยู่ในหลักสูตรเดียวกับวิชา');
  assertWrite(actor, course.programmeId);
  if (level !== null && !LEVELS.includes(level)) throw new AunqaError('invalid', 'ระดับต้องเป็น I, R หรือ M');
  const rows = load<CloPloMap>(KEYS.cloPloMap);
  const others = rows.filter(m => !(m.cloId === cloId && m.ploId === ploId));
  const before = rows.find(m => m.cloId === cloId && m.ploId === ploId);
  const next: CloPloMap | null = level ? { cloId, ploId, level } : null;
  save(KEYS.cloPloMap, next ? [...others, next] : others);
  appendAudit(actor, { action: 'curriculum.map.set', targetType: 'clo', targetId: cloId, programmeId: course.programmeId, before: before?.level, after: { ploId, level } });
  return next;
}

// ─── Course methods ──────────────────────────────────────────────────────
export interface MethodInput { courseId: string; kind: 'teaching' | 'assessment'; method: string; cloIds?: string[] }

function checkMethod(i: Omit<MethodInput, 'courseId'>, courseId: string): Omit<CourseMethod, 'id' | 'courseId'> {
  if (i.kind !== 'teaching' && i.kind !== 'assessment') throw new AunqaError('invalid', 'ประเภทวิธีต้องเป็น teaching หรือ assessment');
  const cloIds = Array.from(new Set(i.cloIds ?? []));
  const mine = new Set(load<Clo>(KEYS.clos).filter(c => c.courseId === courseId).map(c => c.id));
  if (cloIds.some(c => !mine.has(c))) throw new AunqaError('invalid', 'CLO ต้องเป็นของวิชานี้');
  return { kind: i.kind, method: text(i.method, 'ชื่อวิธี'), cloIds };
}

export function addCourseMethod(actor: AppUser, input: MethodInput): CourseMethod {
  const course = courseOf(input.courseId);
  assertWrite(actor, course.programmeId);
  const m: CourseMethod = { id: newId('cm'), courseId: course.id, ...checkMethod(input, course.id) };
  save(KEYS.courseMethods, [...load<CourseMethod>(KEYS.courseMethods), m]);
  appendAudit(actor, { action: 'curriculum.method.add', targetType: 'course', targetId: course.id, programmeId: course.programmeId, after: { kind: m.kind, method: m.method } });
  return m;
}

export function updateCourseMethod(actor: AppUser, id: string, patch: Partial<Omit<MethodInput, 'courseId'>>): CourseMethod {
  const rows = load<CourseMethod>(KEYS.courseMethods);
  const cur = rows.find(m => m.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบวิธีสอน/วัดผล');
  const course = courseOf(cur.courseId);
  assertWrite(actor, course.programmeId);
  const next: CourseMethod = { ...cur, ...checkMethod({ ...cur, ...clean(patch) }, cur.courseId) };
  save(KEYS.courseMethods, rows.map(m => (m.id === id ? next : m)));
  appendAudit(actor, { action: 'curriculum.method.update', targetType: 'course', targetId: course.id, programmeId: course.programmeId, before: cur, after: next });
  return next;
}

export function deleteCourseMethod(actor: AppUser, id: string): void {
  const cur = load<CourseMethod>(KEYS.courseMethods).find(m => m.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบวิธีสอน/วัดผล');
  const course = courseOf(cur.courseId);
  assertWrite(actor, course.programmeId);
  save(KEYS.courseMethods, load<CourseMethod>(KEYS.courseMethods).filter(m => m.id !== id));
  appendAudit(actor, { action: 'curriculum.method.delete', targetType: 'course', targetId: course.id, programmeId: course.programmeId, before: { method: cur.method } });
}
