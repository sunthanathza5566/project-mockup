import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { CYCLE, PROG, freshSeededDemo, user } from './helpers';

describe('Phase B2 smoke (end-to-end)', () => {
  it('seeded demo + R7 + curriculum', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const gaps = api.getGaps(chair, CYCLE).filter(g => g.ruleId === 'R7');
    expect(gaps.some(g => g.messageTh.includes('PLO6'))).toBe(true);
    expect(gaps.some(g => g.requirementId === '4.1' && g.messageTh.includes('PLO4'))).toBe(true);
    const r = api.getReadiness(chair, CYCLE);
    const ids = new Set(r.gaps.map(g => g.id)); expect(ids.size).toBe(r.gaps.length);
    expect(() => api.createCourse(chair, { programmeId: PROG, code: 'X1', nameTh: 'x', credits: 3, year: 1, semester: 1, prerequisiteIds: [] })).not.toThrow();
    const cs101 = api.getCurriculum(chair, PROG).courses.find(c => c.code === 'CS101')!;
    // วนซ้ำ: CS101 ต้องมี prereq CS103 ซึ่ง prereq CS101
    expect(() => api.updateCourse(chair, cs101.id, { prerequisiteIds: ['course-CS103'] })).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(() => api.createPlo(user('data1'), { programmeId: PROG, code: 'PX', textTh: 'x', type: 'generic', bloomLevel: 3 })).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    const m = api.getCurriculumMatrix(chair, PROG);
    expect(m.rows.length).toBeGreaterThan(10);
  });

  it('AI-7 / segregation', async () => {
    await freshSeededDemo();
    const chair = user('chair1');
    const run = await api.runVerbChecker(chair, PROG);
    const out = run.output as { results: { code: string; note: string; levelMatch: boolean | null; measurable: boolean }[] };
    expect(run.feature).toBe('AI-7');
    // ready_for_review ที่ staff1 เขียน → ประธานอนุมัติได้
    expect(api.approveSection(chair, CYCLE, '1.5').status).toBe('approved');
    // ประธานเขียนเอง → อนุมัติเองไม่ได้
    api.assignSections(chair, CYCLE, ['3.6'], 'u-staff1');
    api.saveSection(chair, CYCLE, '3.6', { narrativeTh: 'แก้โดยประธาน' }, 'manual');
    api.submitSection(chair, CYCLE, '3.6');
    expect(() => api.approveSection(chair, CYCLE, '3.6')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });

  it('full flow: dean return, lock, assessor, appendix, action plan', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const staff = user('staff1');
    const sections = api.listSections(chair, CYCLE);
    for (const s of sections) {
      if (s.status === 'approved') continue;
      if (s.status === 'drafting') {
        api.assignSections(chair, CYCLE, [s.requirementId], staff.id);
        api.submitSection(staff, CYCLE, s.requirementId);
      }
      api.approveSection(chair, CYCLE, s.requirementId);
    }
    await api.transitionCycle(chair, CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    await expect(api.transitionCycle(user('dean1'), CYCLE, 'revision_requested')).rejects.toMatchObject({ code: 'invalid' }); // ต้องมี note
    await api.transitionCycle(user('dean1'), CYCLE, 'revision_requested', 'ขอแก้ข้อ 1.1');
    await api.transitionCycle(chair, CYCLE, 'in_progress');
    await api.transitionCycle(chair, CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    const locked = await api.transitionCycle(user('dean1'), CYCLE, 'final_approved');
    expect(locked.snapshotHash).toBeTruthy();
    // หลักฐานหลัง lock verify ได้
    const ev = api.listEvidence(chair, { programmeId: PROG, cycleId: CYCLE })[0];
    if (ev.status !== 'verified' && !(ev.containsPii && !ev.piiResolved)) api.verifyEvidence(chair, ev.id);
    expect((await api.verifySnapshot(CYCLE)).ok).toBe(true);

    await api.transitionCycle(user('fqa1'), CYCLE, 'under_assessment');
    const a = user('assess1');
    await expect(api.transitionCycle(a, CYCLE, 'assessed')).rejects.toMatchObject({ code: 'invalid' });
    api.upsertFinding(a, CYCLE, '1.1', { strengths: 'จุดแข็ง <b>x</b>', afi: 'ควรเพิ่ม action', interviewQuestions: 'q1', sourcesOfEvidence: 's1' });
    expect(() => api.upsertFinding(chair, CYCLE, '1.1', { afi: 'x' })).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(api.listFindings(chair, CYCLE)).toHaveLength(0); // ยังไม่ released
    const sum = await api.runAssessorSummary(a, CYCLE, 1);
    const so = sum.output as { summaries: unknown[]; questions: { group: string; items: unknown[] }[] };
    await expect(api.runAssessorSummary(chair, CYCLE, 1)).rejects.toMatchObject({ code: 'forbidden' });
    for (let n = 1; n <= 8; n++) api.setCriterionRating(a, CYCLE, n, 4, 'ok');
    expect(api.getAssessorProgress(a, CYCLE).canFinish).toBe(false);
    api.setVerdict(a, CYCLE, 4, 'องค์รวม');
    expect(api.getAssessorProgress(a, CYCLE).canFinish).toBe(true);
    // self-rating ไม่ถูกทับ
    const selfBefore = api.listRatings(chair, CYCLE).filter(r => r.raterType === 'self').length;
    expect(selfBefore).toBeGreaterThan(0);
    await api.transitionCycle(a, CYCLE, 'assessed');
    expect(api.listFindings(chair, CYCLE)).toHaveLength(1);
    const docB = await api.exportAppendixBDoc(a, CYCLE).text();
    expect(docB).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(docB).not.toContain('<b>x</b>');
    const docD = await api.exportAppendixDDoc(chair, CYCLE).text();
    expect(docD).toContain('Adequate as Expected');

    // action plan
    const fromAfi = api.createActionsFromAfi(chair, CYCLE);
    expect(fromAfi).toHaveLength(1);
    expect(api.createActionsFromAfi(chair, CYCLE)).toHaveLength(0);
    await api.transitionCycle(user('fqa1'), CYCLE, 'closed');
    const c2 = api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    const ev2 = api.listEvidence(chair, { programmeId: PROG, cycleId: c2.id, onlyLinked: true });
    expect(ev2.filter(e => e.pdcaStage === 'A').length).toBe(2);
    const c3 = api.createCycle(chair, { programmeId: PROG, academicYear: 2571 });
    const ev3 = api.listEvidence(chair, { programmeId: PROG, cycleId: c3.id, onlyLinked: true });
    expect(ev3.filter(e => e.pdcaStage === 'A').length).toBe(0); // B6: รอบที่ 3 ไม่ผูกอัตโนมัติ
    expect(api.listEvidence(chair, { programmeId: PROG }).filter(e => e.title.startsWith('ผลดำเนินการ')).length).toBe(2);
  });
});
