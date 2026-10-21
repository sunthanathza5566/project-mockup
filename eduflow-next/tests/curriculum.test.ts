import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { curriculumGaps, curriculumMatrix, findPrereqCycles } from '@/lib/api/curriculum-gap';
import { ruleR7, computeGaps } from '@/lib/api/gap';
import { listAudit } from '@/lib/api/audit.store';
import type { Course, CurriculumData } from '@/lib/types';
import { PROG, CYCLE, freshSeededDemo, user, gi, req } from './helpers';

const plo = (id: string) => ({ id, programmeId: PROG, code: id.toUpperCase(), textTh: 't', textEn: '', type: 'specific' as const, bloomLevel: 3 });
const course = (id: string, pre: string[] = []): Course => ({ id, programmeId: PROG, code: id.toUpperCase(), nameTh: id, nameEn: id, credits: 3, year: 1, semester: 1, category: 'x', isElective: false, prerequisiteIds: pre });
const clo = (id: string, courseId: string) => ({ id, courseId, code: id, textTh: 't', bloomLevel: 3 });
const cur = (o: Partial<CurriculumData>): CurriculumData => ({ plos: [], courses: [], clos: [], map: [], methods: [], ...o });

describe('curriculumGaps (pure) — 4 แบบ', () => {
  it('plo_no_course: PLO ไม่มี CLO ผูก', () => {
    const g = curriculumGaps(cur({ plos: [plo('p1')], courses: [course('c1')], clos: [clo('k1', 'c1')] }));
    expect(g.filter(x => x.kind === 'plo_no_course')).toEqual([expect.objectContaining({ refId: 'p1' })]);
  });
  it('course_no_plo: วิชาไม่มี CLO ที่ผูก PLO', () => {
    const g = curriculumGaps(cur({ plos: [plo('p1')], courses: [course('c1'), course('c2')], clos: [clo('k1', 'c1')], map: [{ cloId: 'k1', ploId: 'p1', level: 'I' }] }));
    expect(g.filter(x => x.kind === 'course_no_plo').map(x => x.refId)).toEqual(['c2']);
  });
  it('plo_no_assessment: CLO ไม่อยู่ในวิธีวัดผล (teaching ไม่นับ)', () => {
    const base = { plos: [plo('p1')], courses: [course('c1')], clos: [clo('k1', 'c1')], map: [{ cloId: 'k1', ploId: 'p1', level: 'M' as const }] };
    const noAssess = curriculumGaps(cur({ ...base, methods: [{ id: 'm1', courseId: 'c1', kind: 'teaching', method: 'บรรยาย', cloIds: ['k1'] }] }));
    expect(noAssess).toEqual([expect.objectContaining({ kind: 'plo_no_assessment', refId: 'p1' })]);
    const ok = curriculumGaps(cur({ ...base, methods: [{ id: 'm2', courseId: 'c1', kind: 'assessment', method: 'สอบ', cloIds: ['k1'] }] }));
    expect(ok).toEqual([]);
  });
  it('prereq_cycle: วน 2 วิชา, self-loop, ไม่วน/อ้างวิชาที่ไม่มี = ไม่ขึ้น', () => {
    expect(findPrereqCycles([course('a', ['b']), course('b', ['a']), course('c', ['a'])])).toEqual([['a', 'b']]);
    expect(findPrereqCycles([course('a', ['a'])])).toEqual([['a']]);
    expect(findPrereqCycles([course('a'), course('b', ['a']), course('c', ['b'])])).toEqual([]);
    expect(findPrereqCycles([course('a', ['ghost'])])).toEqual([]);
    expect(curriculumGaps(cur({ courses: [course('a', ['b']), course('b', ['a'])] })).some(g => g.kind === 'prereq_cycle')).toBe(true);
  });
  it('หลักสูตรสมบูรณ์ = ไม่มี gap', () => {
    expect(curriculumGaps(cur({
      plos: [plo('p1')], courses: [course('c1')], clos: [clo('k1', 'c1')], map: [{ cloId: 'k1', ploId: 'p1', level: 'R' }],
      methods: [{ id: 'm', courseId: 'c1', kind: 'assessment', method: 'สอบ', cloIds: ['k1'] }],
    }))).toEqual([]);
  });
  it('matrix เลือกระดับสูงสุด M>R>I', () => {
    const m = curriculumMatrix(cur({
      plos: [plo('p1'), plo('p2')], courses: [course('c1')], clos: [clo('k1', 'c1'), clo('k2', 'c1')],
      map: [{ cloId: 'k1', ploId: 'p1', level: 'I' }, { cloId: 'k2', ploId: 'p1', level: 'M' }],
    }));
    expect(m.rows[0].cells).toEqual({ p1: 'M', p2: null });
  });
});

describe('R7 ชี้ข้อถูกต้อง', () => {
  const reqs = ['1.2', '2.4', '2.5', '4.1'].map(i => req(i));
  const data = cur({
    plos: [plo('p1'), plo('p2')], courses: [course('c1', ['c2']), course('c2', ['c1']), course('c3')],
    clos: [clo('k1', 'c1')], map: [{ cloId: 'k1', ploId: 'p1', level: 'I' }],
  });
  const g = ruleR7(gi({ requirements: reqs, curriculum: data }));
  const at = (r: string) => g.filter(x => x.requirementId === r);
  it('PLO ไม่มีวิชา -> 2.4 (high)', () => { expect(at('2.4')).toEqual([expect.objectContaining({ severity: 'high', refId: 'p2' })]); });
  it('PLO ไม่มีวิธีวัดผล -> 4.1 (high)', () => { expect(at('4.1')).toEqual([expect.objectContaining({ severity: 'high', refId: 'p1' })]); });
  it('วิชาไม่ผูก PLO -> 1.2 (medium)', () => {
    expect(at('1.2').map(x => x.refId).sort()).toEqual(['c2', 'c3']);
    expect(at('1.2')[0].severity).toBe('medium');
  });
  it('prereq วน -> 2.5 (high)', () => { expect(at('2.5')).toEqual([expect.objectContaining({ severity: 'high', refId: 'c1|c2' })]); });
  it('ข้อที่ไม่อยู่ใน requirements ไม่ขึ้น, gap id ไม่ซ้ำ', () => {
    expect(ruleR7(gi({ requirements: [req('2.4')], curriculum: data })).every(x => x.requirementId === '2.4')).toBe(true);
    const all = computeGaps(gi({ requirements: reqs, curriculum: data })).filter(x => x.ruleId === 'R7');
    expect(new Set(all.map(x => x.id)).size).toBe(all.length);
  });
});

describe('curriculum store: ผ่าน API จริง', () => {
  it('seed: PLO6 -> 2.4, PLO4 -> 4.1 ใน getGaps; สร้าง/ลบแล้ว gap เปลี่ยน', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const r7 = () => api.getGaps(chair, CYCLE).filter(g => g.ruleId === 'R7');
    expect(r7().some(g => g.requirementId === '2.4' && g.messageTh.includes('PLO6'))).toBe(true);
    expect(r7().some(g => g.requirementId === '4.1' && g.messageTh.includes('PLO4'))).toBe(true);
    const p = api.createPlo(chair, { programmeId: PROG, code: 'PLO9', textTh: 'ออกแบบระบบ', type: 'specific', bloomLevel: 5 });
    expect(r7().some(g => g.refId === p.id && g.requirementId === '2.4')).toBe(true);
    api.deletePlo(chair, p.id);
    expect(r7().some(g => g.refId === p.id)).toBe(false);
    const c = api.createCourse(chair, { programmeId: PROG, code: 'ZZ1', nameTh: 'x', credits: 3, year: 1, semester: 1, prerequisiteIds: [] });
    expect(r7().some(g => g.refId === c.id && g.requirementId === '1.2')).toBe(true);
  });

  it('validation: รหัสซ้ำ / Bloom นอก 1-6 / prereq วน / ลบ cascade', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const inv = expect.objectContaining({ code: 'invalid' });
    expect(() => api.createPlo(chair, { programmeId: PROG, code: 'PLO1', textTh: 'x', type: 'generic', bloomLevel: 3 })).toThrowError(expect.objectContaining({ code: 'duplicate' }));
    expect(() => api.createPlo(chair, { programmeId: PROG, code: 'PLOX', textTh: 'x', type: 'generic', bloomLevel: 7 })).toThrowError(inv);
    expect(() => api.createPlo(chair, { programmeId: PROG, code: 'PLOX', textTh: 'x', type: 'generic', bloomLevel: 0 })).toThrowError(inv);
    const a = api.createCourse(chair, { programmeId: PROG, code: 'QA1', nameTh: 'a', credits: 3, year: 1, semester: 1, prerequisiteIds: [] });
    const b = api.createCourse(chair, { programmeId: PROG, code: 'QA2', nameTh: 'b', credits: 3, year: 1, semester: 2, prerequisiteIds: [a.id] });
    expect(() => api.updateCourse(chair, a.id, { prerequisiteIds: [b.id] })).toThrowError(inv);
    expect(() => api.updateCourse(chair, a.id, { prerequisiteIds: [a.id] })).toThrowError(inv);
    api.deleteCourse(chair, a.id);
    expect(api.getCurriculum(chair, PROG).courses.find(x => x.id === b.id)!.prerequisiteIds).toEqual([]);
    const target = api.getCurriculum(chair, PROG).map[0].ploId;
    api.deletePlo(chair, target);
    expect(api.getCurriculum(chair, PROG).map.some(m => m.ploId === target)).toBe(false);
  });

  it('RBAC: ประธาน/อาจารย์หลักสูตรเขียนได้; data/dean/assessor/อาจารย์ต่างหลักสูตร/ต่าง tenant เขียนไม่ได้', async () => {
    await freshSeededDemo();
    const input = { programmeId: PROG, code: 'PLOR', textTh: 'x', type: 'generic' as const, bloomLevel: 3 };
    const forb = expect.objectContaining({ code: 'forbidden' });
    for (const u of ['data1', 'dean1', 'assess1', 'lect2', 'uadmin2']) {
      expect(() => api.createPlo(user(u), { ...input, code: 'PLO' + u })).toThrowError(forb);
    }
    expect(() => api.createPlo(user('lect1'), { ...input, code: 'PLOL' })).not.toThrow();
    expect(() => api.getCurriculum(user('uadmin2'), PROG)).toThrowError(forb);
    expect(() => api.getCurriculum(user('data1'), PROG)).not.toThrow();
    const cs = api.getCurriculum(user('chair1'), PROG);
    expect(() => api.deletePlo(user('data1'), cs.plos[0].id)).toThrowError(forb);
    expect(() => api.setCloPloMap(user('data1'), cs.clos[0].id, cs.plos[0].id, 'R')).toThrowError(forb);
    expect(() => api.updateCourse(user('lect2'), cs.courses[0].id, { nameTh: 'hack' })).toThrowError(forb);
  });

  it('audit: ทุกการเขียนมี audit log ระบุหลักสูตร; ที่ถูกปฏิเสธไม่มี', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const p = api.createPlo(chair, { programmeId: PROG, code: 'PLOA', textTh: 'x', type: 'generic', bloomLevel: 3 });
    api.updatePlo(chair, p.id, { textTh: 'y' });
    api.deletePlo(chair, p.id);
    const n0 = listAudit(chair, { programmeId: PROG }).length;
    expect(() => api.createPlo(user('data1'), { programmeId: PROG, code: 'NOPE', textTh: 'x', type: 'generic', bloomLevel: 3 })).toThrow();
    expect(listAudit(chair, { programmeId: PROG }).length).toBe(n0);
    const acts = listAudit(chair, { programmeId: PROG }).map(a => a.action);
    for (const a of ['curriculum.plo.create', 'curriculum.plo.update', 'curriculum.plo.delete']) expect(acts).toContain(a);
  });

  it('setCloPloMap null = ลบ mapping; method ผูก CLO ต่างวิชาไม่ได้', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const d = api.getCurriculum(chair, PROG);
    const m = d.map[0];
    api.setCloPloMap(chair, m.cloId, m.ploId, null);
    expect(api.getCurriculum(chair, PROG).map.some(x => x.cloId === m.cloId && x.ploId === m.ploId)).toBe(false);
    const c0 = d.courses[0]; const otherClo = d.clos.find(c => c.courseId !== c0.id)!;
    expect(() => api.addCourseMethod(chair, { courseId: c0.id, kind: 'assessment', method: 'สอบ', cloIds: [otherClo.id] })).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });
});

describe('AI-7 verb checker', () => {
  it('ผ่าน redact + post-check + ai_run + audit; PII ถูก redact; accept ไม่แก้ PLO', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const p = api.createPlo(chair, { programmeId: PROG, code: 'PLOP', textTh: 'อธิบายแนวคิด ติดต่อ somchai@example.com โทร 081-234-5678', type: 'generic', bloomLevel: 2 });
    const run = await api.runVerbChecker(chair, PROG, [p.id]);
    expect(run.feature).toBe('AI-7');
    expect(run.programmeId).toBe(PROG);
    expect(run.redactionCount).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(run.output)).not.toContain('somchai@example.com');
    expect(run.postCheck).toMatchObject({ ok: expect.any(Boolean), unknownNumbers: expect.any(Array) });
    expect(run.redactedInputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(api.listAiRuns(chair, { programmeId: PROG }).some(r => r.id === run.id)).toBe(true);
    expect(listAudit(chair, { programmeId: PROG }).some(a => a.action === 'ai.run.AI-7' && a.targetId === run.id)).toBe(true);
    const out = run.output as { results: { id: string }[] };
    expect(out.results.every(r => r.id === p.id)).toBe(true);
    const plo0 = JSON.stringify(api.getCurriculum(chair, PROG).plos);
    api.acceptAiRun(chair, run.id);
    expect(JSON.stringify(api.getCurriculum(chair, PROG).plos)).toBe(plo0);
  });
  it('สิทธิ์: data1 ใช้ไม่ได้; ids ไม่ตรง = invalid', async () => {
    await freshSeededDemo();
    await expect(api.runVerbChecker(user('data1'), PROG)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.runVerbChecker(user('chair1'), PROG, ['nope'])).rejects.toMatchObject({ code: 'invalid' });
  });
});
