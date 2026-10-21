/**
 * Curriculum gap + matrix (M4) — pure functions (ไม่อ่าน storage) · ใช้ทั้ง UI และ gap rule R7
 * ตรวจ: PLO ไม่มีวิชารับผิดชอบ · วิชาไม่ผูก PLO · PLO ไม่มีวิธีวัดผล · prerequisite วนซ้ำ
 */
import type { Course, CurriculumData, CurriculumGap, MapLevel, Plo } from '../types';

const LEVEL_RANK: Record<MapLevel, number> = { I: 1, R: 2, M: 3 };

/** วิชาที่อยู่ในวงวน prerequisite (SCC ขนาด > 1 หรือ self-loop) — คืนเป็นกลุ่ม ๆ ของ course id */
export function findPrereqCycles(courses: Pick<Course, 'id' | 'prerequisiteIds'>[]): string[][] {
  const ids = new Set(courses.map(c => c.id));
  const adj = new Map(courses.map(c => [c.id, c.prerequisiteIds.filter(p => ids.has(p))]));
  let idx = 0;
  const index = new Map<string, number>(); const low = new Map<string, number>();
  const onStack = new Set<string>(); const stack: string[] = [];
  const out: string[][] = [];
  const strong = (v: string) => {
    index.set(v, idx); low.set(v, idx); idx++; stack.push(v); onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1 || (adj.get(v) ?? []).includes(v)) out.push(comp.sort());
    }
  };
  courses.forEach(c => { if (!index.has(c.id)) strong(c.id); });
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

export function curriculumGaps(cur: CurriculumData): CurriculumGap[] {
  const out: CurriculumGap[] = [];
  const cloCourse = new Map(cur.clos.map(c => [c.id, c.courseId]));
  const courseById = new Map(cur.courses.map(c => [c.id, c]));
  const assessedClos = new Set(cur.methods.filter(m => m.kind === 'assessment').flatMap(m => m.cloIds));

  for (const p of cur.plos) {
    const mapped = cur.map.filter(m => m.ploId === p.id && cloCourse.has(m.cloId));
    if (!mapped.length) {
      out.push({ kind: 'plo_no_course', refId: p.id, messageTh: `${p.code} ยังไม่มีวิชา/CLO ใดรับผิดชอบ` });
    } else if (!mapped.some(m => assessedClos.has(m.cloId))) {
      out.push({ kind: 'plo_no_assessment', refId: p.id, messageTh: `${p.code} ยังไม่มีวิธีวัดผลที่ผูกกับ CLO ที่รองรับ` });
    }
  }
  const coursesWithPlo = new Set(cur.map.map(m => cloCourse.get(m.cloId)).filter((x): x is string => !!x));
  for (const c of cur.courses) {
    if (!coursesWithPlo.has(c.id)) out.push({ kind: 'course_no_plo', refId: c.id, messageTh: `วิชา ${c.code} ยังไม่ผูก PLO` });
  }
  for (const cyc of findPrereqCycles(cur.courses)) {
    const codes = cyc.map(id => courseById.get(id)?.code ?? id).join(' → ');
    out.push({ kind: 'prereq_cycle', refId: cyc.join('|'), messageTh: `prerequisite วนซ้ำ: ${codes}` });
  }
  return out;
}

export interface MatrixRow { course: Course; cells: Record<string, MapLevel | null> }
/** matrix วิชา × PLO — ระดับสูงสุด (M > R > I) ของ CLO ในวิชานั้นที่ผูก PLO */
export function curriculumMatrix(cur: CurriculumData): { plos: Plo[]; rows: MatrixRow[] } {
  const cloCourse = new Map(cur.clos.map(c => [c.id, c.courseId]));
  const plos = cur.plos.slice().sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const rows = cur.courses.slice()
    .sort((a, b) => a.year - b.year || a.semester - b.semester || a.code.localeCompare(b.code))
    .map(course => {
      const cells: Record<string, MapLevel | null> = {};
      for (const p of plos) {
        let best: MapLevel | null = null;
        for (const m of cur.map) {
          if (m.ploId !== p.id || cloCourse.get(m.cloId) !== course.id) continue;
          if (!best || LEVEL_RANK[m.level] > LEVEL_RANK[best]) best = m.level;
        }
        cells[p.id] = best;
      }
      return { course, cells };
    });
  return { plos, rows };
}
