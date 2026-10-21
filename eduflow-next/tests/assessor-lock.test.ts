import { describe, it, expect } from 'vitest';
import * as api from '@/lib/api';
import { KEYS, load, save } from '@/lib/api/db';
import { listAudit } from '@/lib/api/audit.store';
import type { AppUser, SarSection } from '@/lib/types';
import { CYCLE, PROG, driveToAssessment, driveToLocked, freshSeededDemo, user } from './helpers';

const forb = expect.objectContaining({ code: 'forbidden' });
const inv = expect.objectContaining({ code: 'invalid' });

async function ratedAll(a: AppUser, score = 4) {
  for (let n = 1; n <= 8; n++) api.setCriterionRating(a, CYCLE, n, score, `เหตุผล ${n}`);
}

describe('facade ไม่เปิดฟังก์ชันที่ไม่มี guard', () => {
  it('extractedTextOf / loadCurriculumRaw ไม่อยู่ใน @/lib/api; getExtractedText อยู่', () => {
    const keys = Object.keys(api);
    expect(keys).not.toContain('extractedTextOf');
    expect(keys).not.toContain('loadCurriculumRaw');
    expect(keys).toContain('getExtractedText');
  });
  it('verdict ไม่มีฟังก์ชันคำนวณ/แนะนำใน facade (กฎ 7.3)', () => {
    const bad = Object.keys(api).filter(k => /(compute|calc|suggest|average|recommend).*(verdict|rating|score)|(verdict|rating|score).*(compute|calc|suggest|average|recommend)/i.test(k));
    expect(bad).toEqual([]);
  });
});

describe('Dean ส่งกลับ + segregation', () => {
  it('คณบดีส่งกลับต้องมี note (ว่าง/ช่องว่าง = invalid) และบันทึกเหตุผลใน review event', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const staff = user('staff1');
    for (const s of api.listSections(chair, CYCLE)) {
      if (s.status === 'approved') continue;
      if (s.status === 'drafting') { api.assignSections(chair, CYCLE, [s.requirementId], staff.id); api.submitSection(staff, CYCLE, s.requirementId); }
      api.approveSection(chair, CYCLE, s.requirementId);
    }
    await api.transitionCycle(chair, CYCLE, 'under_review');
    await api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
    await expect(api.transitionCycle(user('dean1'), CYCLE, 'revision_requested')).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.transitionCycle(user('dean1'), CYCLE, 'revision_requested', '   ')).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.transitionCycle(chair, CYCLE, 'revision_requested', 'ขอแก้')).rejects.toBeTruthy(); // ประธานส่งกลับระดับนี้ไม่ได้
    expect((await api.transitionCycle(user('dean1'), CYCLE, 'revision_requested', 'แก้ข้อ 1.1')).status).toBe('revision_requested');
    expect(api.listReviewEvents(chair, CYCLE).some(e => e.toStatus === 'revision_requested' && e.note === 'แก้ข้อ 1.1')).toBe(true);
    // ส่งกลับแล้วยังไม่ lock
    expect(api.getCycle(chair, CYCLE).lockedAt).toBeUndefined();
    expect((await api.transitionCycle(chair, CYCLE, 'in_progress')).status).toBe('in_progress');
  });

  it('segregation: ผู้เขียนล่าสุดอนุมัติเองไม่ได้ (ประธาน) แต่ staff เขียน -> ประธานอนุมัติได้', async () => {
    await freshSeededDemo();
    const chair = user('chair1'); const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['3.6'], staff.id);
    api.saveSection(chair, CYCLE, '3.6', { narrativeTh: 'ประธานเขียนเอง' }, 'manual');
    api.submitSection(chair, CYCLE, '3.6');
    expect(() => api.approveSection(chair, CYCLE, '3.6')).toThrowError(forb);
    expect(api.getSection(chair, CYCLE, '3.6').status).not.toBe('approved');
    // staff ตรวจ/อนุมัติเองไม่ได้
    expect(() => api.approveSection(staff, CYCLE, '3.6')).toThrow();
    // ส่งให้ staff แก้แล้วส่ง -> ประธานอนุมัติได้
    api.returnSection(chair, CYCLE, '3.6', 'ปรับ');
    api.saveSection(staff, CYCLE, '3.6', { narrativeTh: 'staff เขียนใหม่' }, 'manual');
    api.submitSection(staff, CYCLE, '3.6');
    expect(api.approveSection(chair, CYCLE, '3.6').status).toBe('approved');
  });
});

describe('หลักฐานหลัง lock', () => {
  it('แก้ metadata / verify / ผูกรอบอื่นได้; addFileVersion ถูกบล็อก; verifySnapshot.evidenceChanged', async () => {
    const locked = await driveToLocked();
    const chair = user('chair1');
    expect(locked.snapshotHash).toBeTruthy();
    const snap0 = await api.verifySnapshot(CYCLE);
    expect(snap0.ok).toBe(true);
    expect(snap0.evidenceChanged).toBe(false);

    const ev = api.listEvidence(chair, { programmeId: PROG, cycleId: CYCLE, onlyLinked: true })[0];
    // addFileVersion บล็อก
    await expect(api.addFileVersion(chair, ev.id, { name: 'x.txt', mime: 'text/plain', size: 3, text: 'abc' })).rejects.toMatchObject({ code: 'locked' });
    // แก้ metadata ได้
    const upd = api.updateEvidence(chair, ev.id, { title: 'ชื่อใหม่หลัง lock' });
    expect(upd.title).toBe('ชื่อใหม่หลัง lock');
    // verify ได้ (ถ้า PII ไม่ค้าง)
    const pool = api.listEvidence(chair, { programmeId: PROG, cycleId: CYCLE, onlyLinked: true });
    const verifiable = pool.find(e => e.status !== 'verified' && !(e.containsPii && !e.piiResolved));
    if (verifiable) expect(api.verifyEvidence(chair, verifiable.id).status).toBe('verified');
    // ผูกรอบอื่นได้
    const c2 = api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    expect(() => api.linkEvidence(chair, ev.id, c2.id, ['1.1'])).not.toThrow();

    const snap1 = await api.verifySnapshot(CYCLE);
    expect(snap1.evidenceChanged).toBe(true);
    expect(snap1.ok).toBe(true); // metadata หลักฐานไม่ทำให้ hash พัง

    // แต่เนื้อหา SAR หลัง lock แก้ไม่ได้ และถ้าแก้ตรง ๆ ใน storage ต้องถูกตรวจพบ
    expect(() => api.saveSection(chair, CYCLE, '1.1', { narrativeTh: 'แก้หลัง lock' }, 'manual')).toThrowError(expect.objectContaining({ code: 'locked' }));
    save(KEYS.sections, load<SarSection>(KEYS.sections).map(s => (s.cycleId === CYCLE && s.requirementId === '1.1' ? { ...s, narrativeTh: 'tampered' } : s)));
    expect((await api.verifySnapshot(CYCLE)).ok).toBe(false);
  });
});

describe('Assessor workspace (M12)', () => {
  it('เฉพาะกรรมการของรอบเขียนได้; คนอื่น/กรรมการรอบอื่นถูกปฏิเสธ; ต้องอยู่ under_assessment', async () => {
    await driveToLocked();
    const a = user('assess1');
    // ยังไม่ under_assessment
    expect(() => api.upsertFinding(a, CYCLE, '1.1', { afi: 'x' })).toThrowError(inv);
    expect(() => api.setCriterionRating(a, CYCLE, 1, 4)).toThrowError(inv);
    await api.transitionCycle(user('fqa1'), CYCLE, 'under_assessment');
    for (const u of ['chair1', 'staff1', 'dean1', 'fqa1', 'uadmin', 'sadmin']) {
      expect(() => api.upsertFinding(user(u), CYCLE, '1.1', { afi: 'x' })).toThrowError(forb);
      expect(() => api.setCriterionRating(user(u), CYCLE, 1, 4)).toThrowError(forb);
      expect(() => api.setVerdict(user(u), CYCLE, 4)).toThrowError(forb);
    }
    const other: AppUser = { ...a, id: 'u-assess-other', roles: [{ role: 'assessor', scopeType: 'cycle', scopeId: 'cycle-other' }] };
    expect(() => api.upsertFinding(other, CYCLE, '1.1', { afi: 'x' })).toThrow();
    expect(() => api.setCriterionRating(other, CYCLE, 1, 4)).toThrow();
    await expect(api.runAssessorSummary(user('chair1'), CYCLE, 1)).rejects.toMatchObject({ code: 'forbidden' });
    expect(() => api.upsertFinding(a, CYCLE, '9.9', { afi: 'x' })).toThrow();
    expect(() => api.upsertFinding(a, CYCLE, '1.1', { afi: 'x'.repeat(5001) })).toThrowError(inv);
  });

  it('คะแนนกรรมการแยกแถวจาก self ไม่ทับ; validation 1–7 จำนวนเต็ม; ไม่มี verdict อัตโนมัติ', async () => {
    await driveToAssessment();
    const a = user('assess1'); const chair = user('chair1');
    const selfBefore = JSON.stringify(api.listRatings(chair, CYCLE).filter(r => r.raterType === 'self'));
    expect(JSON.parse(selfBefore).length).toBeGreaterThan(0);
    for (const bad of [0, 8, 4.5, NaN, -1]) expect(() => api.setCriterionRating(a, CYCLE, 1, bad)).toThrowError(inv);
    expect(() => api.setCriterionRating(a, CYCLE, 9, 4)).toThrow();
    expect(() => api.setVerdict(a, CYCLE, 0)).toThrowError(inv);
    expect(() => api.setVerdict(a, CYCLE, 8)).toThrowError(inv);
    await ratedAll(a, 5);
    api.setCriterionRating(a, CYCLE, 1, 6, 'แก้คะแนน'); // upsert
    const mine = api.listCriterionRatings(a, CYCLE);
    expect(mine).toHaveLength(8);
    expect(mine.find(r => r.criterionNo === 1)!.score).toBe(6);
    expect(mine.every(r => r.raterType === 'committee' && r.requirementId === `C${r.criterionNo}`)).toBe(true);
    expect(JSON.stringify(api.listRatings(chair, CYCLE).filter(r => r.raterType === 'self'))).toBe(selfBefore);
    // ให้ครบ 8 เกณฑ์แล้ว verdict ก็ยังไม่ถูกสร้างเอง
    expect(api.listVerdicts(a, CYCLE)).toEqual([]);
    expect(api.getAssessorProgress(a, CYCLE)).toMatchObject({ hasVerdict: false, canFinish: false, missingCriteria: [] });
    api.setVerdict(a, CYCLE, 3, 'เลือกเอง');
    expect(api.listVerdicts(a, CYCLE)[0].verdict).toBe(3); // ไม่ใช่ค่าเฉลี่ย (5-6)
  });

  it('ปิดการประเมินต้องครบ 8 เกณฑ์ + verdict (detail.missingCriteria); ครบแล้วผ่าน', async () => {
    await driveToAssessment();
    const a = user('assess1');
    await expect(api.transitionCycle(a, CYCLE, 'assessed')).rejects.toMatchObject({ code: 'invalid' });
    for (let n = 1; n <= 7; n++) api.setCriterionRating(a, CYCLE, n, 4);
    api.setVerdict(a, CYCLE, 4);
    const err = await api.transitionCycle(a, CYCLE, 'assessed').catch(e => e);
    expect(err).toMatchObject({ code: 'invalid' });
    expect(JSON.stringify(err.detail)).toContain('8');
    expect(api.getAssessorProgress(a, CYCLE)).toMatchObject({ missingCriteria: [8], canFinish: false });
    api.setCriterionRating(a, CYCLE, 8, 4);
    expect(api.getAssessorProgress(a, CYCLE).canFinish).toBe(true);
    expect((await api.transitionCycle(a, CYCLE, 'assessed')).status).toBe('assessed');
    // เขียนเพิ่มหลัง assessed ไม่ได้
    expect(() => api.setCriterionRating(a, CYCLE, 1, 7)).toThrowError(inv);
    expect(() => api.setVerdict(a, CYCLE, 7)).toThrowError(inv);
  });

  it('ไม่มี verdict แต่ครบ 8 เกณฑ์ = ปิดไม่ได้', async () => {
    await driveToAssessment();
    const a = user('assess1');
    await ratedAll(a);
    await expect(api.transitionCycle(a, CYCLE, 'assessed')).rejects.toMatchObject({ code: 'invalid' });
    expect(api.getCycle(a, CYCLE).status).toBe('under_assessment');
  });

  it('หลักสูตรไม่เห็นผลก่อน assessed (findings/ratings/verdicts = []) และเห็นหลัง assessed/closed', async () => {
    await driveToAssessment();
    const a = user('assess1');
    api.upsertFinding(a, CYCLE, '1.1', { strengths: 'S', afi: 'ควรทำ A', interviewQuestions: 'Q', sourcesOfEvidence: 'E' });
    await ratedAll(a); api.setVerdict(a, CYCLE, 4);
    for (const u of ['chair1', 'staff1', 'dean1', 'fqa1', 'uadmin']) {
      expect(api.listFindings(user(u), CYCLE)).toEqual([]);
      expect(api.listCriterionRatings(user(u), CYCLE)).toEqual([]);
      expect(api.listVerdicts(user(u), CYCLE)).toEqual([]);
    }
    expect(api.listFindings(a, CYCLE)).toHaveLength(1); // กรรมการเห็นของตน
    expect(() => api.exportAppendixBDoc(user('chair1'), CYCLE)).toThrowError(forb);
    expect(() => api.exportAppendixDDoc(user('dean1'), CYCLE)).toThrowError(forb);
    await api.transitionCycle(a, CYCLE, 'assessed');
    expect(api.listFindings(user('chair1'), CYCLE)).toHaveLength(1);
    expect(api.listCriterionRatings(user('chair1'), CYCLE)).toHaveLength(8);
    expect(api.listVerdicts(user('dean1'), CYCLE)).toHaveLength(1);
    expect(() => api.getAssessorProgress(user('chair1'), CYCLE)).toThrowError(forb);
    await api.transitionCycle(user('fqa1'), CYCLE, 'closed');
    expect(api.listFindings(user('chair1'), CYCLE)).toHaveLength(1);
  });

  it('Appendix B/D escape HTML ทุกช่อง (findings, rationale, verdict)', async () => {
    await driveToAssessment();
    const a = user('assess1');
    const x = '<script>alert(1)</script>';
    api.upsertFinding(a, CYCLE, '1.1', { strengths: `S ${x}`, afi: `A ${x}`, interviewQuestions: `Q <img src=x onerror=1>`, sourcesOfEvidence: `E "q" & <i>` });
    for (let n = 1; n <= 8; n++) api.setCriterionRating(a, CYCLE, n, 4, `R ${x}`);
    api.setVerdict(a, CYCLE, 4, `V ${x}`);
    await api.transitionCycle(a, CYCLE, 'assessed');
    const b = await api.exportAppendixBDoc(a, CYCLE).text();
    const d = await api.exportAppendixDDoc(user('chair1'), CYCLE).text();
    for (const html of [b, d]) {
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
    }
    expect(b).toContain('&lt;img src=x onerror=1&gt;');
    expect(b).toContain('&amp;');
    expect(d).toContain('V &lt;script&gt;');
    expect(d).toContain('Adequate as Expected');
    const acts = listAudit(user('chair1'), { programmeId: PROG }).map(x => x.action);
    expect(acts).toContain('export.appendix_b');
    expect(acts).toContain('export.appendix_d');
  });

  it('AI-9 ผ่าน redact/post-check/ai_run; ตัวเลข/โค้ดหลักฐานที่ไม่มีจริงไม่หลุด; อ้างข้อนอกเกณฑ์ถูกตัด', async () => {
    await driveToAssessment();
    const a = user('assess1');
    const run = await api.runAssessorSummary(a, CYCLE, 1);
    expect(run.feature).toBe('AI-9');
    expect(run.cycleId).toBe(CYCLE);
    expect(run.accepted).toBe(false);
    expect(run.postCheck).toMatchObject({ ok: expect.any(Boolean), removedCitations: expect.any(Array) });
    const out = run.output as { summaries: { requirementId: string }[]; questions: { items: { requirementId: string }[] }[] };
    const ids = new Set(api.listRequirements(1).map(r => r.id));
    expect(out.summaries.every(s => ids.has(s.requirementId))).toBe(true);
    expect(out.questions.flatMap(g => g.items).every(i => ids.has(i.requirementId))).toBe(true);
    expect(api.listAiRuns(a, { cycleId: CYCLE }).some(r => r.id === run.id)).toBe(true);
    expect(listAudit(user('chair1'), { programmeId: PROG }).some(x => x.action === 'ai.run.AI-9' && x.targetId === run.id)).toBe(true);
    await expect(api.runAssessorSummary(a, CYCLE, 99)).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('AFI -> action plan', () => {
  it('createActionsFromAfi: ก่อน assessed = invalid; หลัง assessed สร้างจาก AFI ไม่ซ้ำ; ต้องมีสิทธิ์ action.write', async () => {
    await driveToAssessment();
    const a = user('assess1'); const chair = user('chair1');
    expect(() => api.createActionsFromAfi(chair, CYCLE)).toThrowError(inv);
    api.upsertFinding(a, CYCLE, '1.1', { afi: 'ควรเพิ่ม action' });
    api.upsertFinding(a, CYCLE, '2.1', { afi: '   ' }); // AFI ว่าง ไม่สร้าง
    await ratedAll(a); api.setVerdict(a, CYCLE, 4);
    await api.transitionCycle(a, CYCLE, 'assessed');
    expect(() => api.createActionsFromAfi(user('dean1'), CYCLE)).toThrowError(forb);
    const first = api.createActionsFromAfi(chair, CYCLE);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ requirementId: '1.1', originCycleId: CYCLE, status: 'open' });
    expect(api.createActionsFromAfi(chair, CYCLE)).toHaveLength(0);
  });

  it('done -> evidence ขั้น A ในรอบใหม่ ไม่ซ้ำ (หลังเดินเต็มรอบ)', async () => {
    await driveToAssessment();
    const a = user('assess1'); const chair = user('chair1');
    api.upsertFinding(a, CYCLE, '3.6', { afi: 'ปรับการสอน' });
    await ratedAll(a); api.setVerdict(a, CYCLE, 4);
    await api.transitionCycle(a, CYCLE, 'assessed');
    const [item] = api.createActionsFromAfi(chair, CYCLE);
    api.setActionStatus(chair, item.id, 'in_progress');
    api.setActionStatus(chair, item.id, 'done');
    await api.transitionCycle(user('fqa1'), CYCLE, 'closed');
    const c2 = api.createCycle(chair, { programmeId: PROG, academicYear: 2570 });
    const aLinks = api.listLinks(chair, c2.id).filter(l => l.source === 'action');
    expect(aLinks).toHaveLength(3); // act-5, act-6 (seed) + AFI item
    const c3 = api.createCycle(chair, { programmeId: PROG, academicYear: 2571 });
    expect(api.listLinks(chair, c3.id).filter(l => l.source === 'action')).toHaveLength(3);
    const titles = api.listEvidence(chair, { programmeId: PROG }).filter(e => e.title.startsWith('ผลดำเนินการตามแผนปรับปรุง'));
    expect(titles).toHaveLength(3);
    expect(titles.every(e => e.pdcaStage === 'A')).toBe(true);
  });
});
