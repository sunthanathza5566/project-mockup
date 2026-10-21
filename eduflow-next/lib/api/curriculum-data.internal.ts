/** INTERNAL — โหลดหลักสูตรดิบ (ไม่ตรวจสิทธิ์) สำหรับ dashboard/gap/ai.service · ไม่ export ผ่าน facade */
import type { Clo, CloPloMap, Course, CourseMethod, CurriculumData, Plo } from '../types';
import { KEYS, load } from './db';

export function loadCurriculumRaw(programmeId: string): CurriculumData {
  const plos = load<Plo>(KEYS.plos).filter(p => p.programmeId === programmeId);
  const courses = load<Course>(KEYS.courses).filter(c => c.programmeId === programmeId);
  const courseIds = new Set(courses.map(c => c.id));
  const clos = load<Clo>(KEYS.clos).filter(c => courseIds.has(c.courseId));
  const cloIds = new Set(clos.map(c => c.id));
  const ploIds = new Set(plos.map(p => p.id));
  return {
    plos, courses, clos,
    map: load<CloPloMap>(KEYS.cloPloMap).filter(m => cloIds.has(m.cloId) && ploIds.has(m.ploId)),
    methods: load<CourseMethod>(KEYS.courseMethods).filter(m => courseIds.has(m.courseId)),
  };
}
