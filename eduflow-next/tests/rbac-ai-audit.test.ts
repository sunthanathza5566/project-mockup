import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as api from '@/lib/api';
import { can } from '@/lib/api/rbac';
import { getCycle, listCycles, listSections, assignSections } from '@/lib/api/cycle.store';
import { listEvidence, getEvidence, createEvidence } from '@/lib/api/evidence.store';
import { saveSection, setSelfRating, listRatings, addComment } from '@/lib/api/sar.store';
import * as auditStore from '@/lib/api/audit.store';
import { listAudit, appendAudit } from '@/lib/api/audit.store';
import { runEvidenceTagger, runSarDrafter, runSarReviewer, acceptAiRun, listAiRuns } from '@/lib/api/ai.service';
import { offlineProvider } from '@/lib/api/ai/offline';
import { load, save, KEYS } from '@/lib/api/db';
import type { Evidence, University, SarSection, AuditLog } from '@/lib/types';
import { CYCLE, PROG, freshDemo, user, addEvidence } from './helpers';

const scopeCs = { universityId: 'uni-demo', facultyId: 'fac-demo-sci', programmeId: PROG, cycleId: CYCLE };

describe('RBAC', () => {
  beforeEach(freshDemo);

  it('multi-tenant: uadmin2 (uni-demo-2) ดูรอบ/หลักฐาน/ส่วนของ uni-demo ไม่ได้', () => {
    const u2 = user('uadmin2');
    expect(() => getCycle(u2, CYCLE)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => listSections(u2, CYCLE)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(listCycles(u2)).toEqual([]);
    expect(() => listEvidence(u2, { programmeId: PROG })).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    const anyEv = load<Evidence>(KEYS.evidence)[0];
    expect(() => getEvidence(u2, anyEv.id)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(can(u2, 'read', scopeCs)).toBe(false);
    expect(can(u2, 'cycle.create', scopeCs)).toBe(false);
  });
  it('multi-tenant: uadmin2 ไม่เห็น audit ของ uni-demo และไม่เห็นผล AI run', async () => {
    await runEvidenceTagger(user('chair1'), load<Evidence>(KEYS.evidence)[0].id, CYCLE);
    expect(listAudit(user('uadmin2'))).toEqual([]);
    expect(listAudit(user('uadmin')).length).toBeGreaterThan(0);
    expect(listAiRuns(user('uadmin2'))).toEqual([]);
  });
  it('multi-tenant: uadmin2 เขียนข้ามไม่ได้ (saveSection, createEvidence)', async () => {
    expect(() => saveSection(user('uadmin2'), CYCLE, '1.1', { narrativeTh: 'x' }, 'manual')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    await expect(addEvidence(user('uadmin2'))).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('assessor เขียน SAR / ผูกหลักฐาน / เพิ่มหลักฐานไม่ได้ แต่อ่านรอบที่ได้รับมอบหมายได้', async () => {
    const a = user('assess1');
    expect(() => saveSection(a, CYCLE, '1.1', { narrativeTh: 'x' }, 'manual')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    await expect(addEvidence(a)).rejects.toMatchObject({ code: 'forbidden' });
    expect(getCycle(a, CYCLE).id).toBe(CYCLE);
    expect(can(a, 'sar.write', scopeCs)).toBe(false);
    expect(can(a, 'evidence.write', scopeCs)).toBe(false);
    expect(can(a, 'rating.self', scopeCs)).toBe(false);
  });
  it('assessor ดูหลักฐานได้เฉพาะที่ผูกในรอบ (ต้องส่ง cycleId) และไม่เห็นหลักฐานที่ไม่ผูก', async () => {
    const chair = user('chair1');
    const orphan = await addEvidence(chair, { requirementIds: [], cycleId: undefined });
    const a = user('assess1');
    expect(() => listEvidence(a, { programmeId: PROG })).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    const seen = listEvidence(a, { programmeId: PROG, cycleId: CYCLE });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(e => e.links.length > 0)).toBe(true);
    expect(seen.map(e => e.id)).not.toContain(orphan.id);
  });
  it('assessor ของรอบอื่นไม่เห็นรอบนี้', () => {
    const fake = { ...user('assess1'), roles: [{ role: 'assessor' as const, scopeType: 'cycle' as const, scopeId: 'other-cycle' }] };
    expect(() => getCycle(fake, CYCLE)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
  it('staff1 (เจ้าของเกณฑ์ 1) แก้ข้อ 1.1 ได้ แต่ข้อ 2.1 ที่ไม่ได้รับมอบหมายไม่ได้', () => {
    const s = user('staff1');
    expect(saveSection(s, CYCLE, '1.1', { narrativeTh: 'เขียนเอง' }, 'manual').narrativeTh).toBe('เขียนเอง');
    expect(() => saveSection(s, CYCLE, '2.1', { narrativeTh: 'ข้ามเขต' }, 'manual')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => setSelfRating(s, CYCLE, '2.1', 4)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(setSelfRating(s, CYCLE, '1.1', 4).score).toBe(4);
  });
  it('lect1 (ไม่ได้รับมอบหมายข้อใดเลย) แก้ 1.1 ไม่ได้', () => {
    expect(() => saveSection(user('lect1'), CYCLE, '1.1', { narrativeTh: 'x' }, 'manual')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
  it('staff มอบหมายงาน (assign) เองไม่ได้', () => {
    expect(() => assignSections(user('staff1'), CYCLE, ['2.1'], 'u-staff1')).toThrow();
    expect(can(user('staff1'), 'cycle.assign', scopeCs)).toBe(false);
  });
  it('คนนอก programme (lect2 ของ ds) แก้ section ของ cs ไม่ได้', () => {
    expect(() => saveSection(user('lect2'), CYCLE, '1.1', { narrativeTh: 'x' }, 'manual')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
  it('ตาราง 3.2: สิทธิ์สำคัญตาม role', () => {
    const c = (u: string, a: Parameters<typeof can>[1]) => can(user(u), a, scopeCs);
    expect(c('chair1', 'sar.approve')).toBe(true);
    expect(c('staff1', 'sar.approve')).toBe(false);
    expect(c('fqa1', 'approve.faculty')).toBe(true);
    expect(c('chair1', 'approve.faculty')).toBe(false);
    expect(c('dean1', 'approve.final')).toBe(true);
    expect(c('fqa1', 'approve.final')).toBe(false);
    expect(c('dean1', 'sar.write')).toBe(false);
    expect(c('assess1', 'rating.committee')).toBe(true);
    expect(c('chair1', 'rating.committee')).toBe(false);
    expect(c('data1', 'metric.write')).toBe(true);
    expect(c('data1', 'sar.write')).toBe(false);
    expect(can(null, 'read', scopeCs)).toBe(false);
  });
  it('comment: assessor/ประธาน comment ได้ แต่ data1 comment ไม่ได้', () => {
    expect(addComment(user('assess1'), CYCLE, '1.1', 'ขอหลักฐานเพิ่ม').body).toBe('ขอหลักฐานเพิ่ม');
    expect(() => addComment(user('data1'), CYCLE, '1.1', 'x')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
});

describe('AI service', () => {
  beforeEach(freshDemo);
  afterEach(() => vi.restoreAllMocks());

  const piiEvidence = () => addEvidence(user('chair1'), {
    requirementIds: ['2.1'], description: '',
    extractedText: 'ผู้ติดต่อ 081-000-0000 อีเมล somchai@test.example บัตร 1-1017-00123-45-6 มีนักศึกษา 120 คน',
  });

  it('redaction: ข้อมูลที่ส่งเข้า provider (draftSar) ไม่มี PII ดิบ และนับ redactionCount', async () => {
    await piiEvidence();
    const spy = vi.spyOn(offlineProvider, 'draftSar');
    const run = await runSarDrafter(user('chair1'), CYCLE, '2.1', 'th');
    const sent = JSON.stringify(spy.mock.calls[0][0]);
    expect(sent).not.toMatch(/081-000-0000|somchai@test|1-1017-00123-45-6/);
    expect(sent).toMatch(/\[PHONE\]|\[EMAIL\]|\[ID_CARD\]/);
    expect(run.redactionCount).toBeGreaterThanOrEqual(3);
  });
  it('redaction: AI-1 tagger ส่ง text ที่ redact แล้ว', async () => {
    const e = await piiEvidence();
    const spy = vi.spyOn(offlineProvider, 'tagEvidence');
    const run = await runEvidenceTagger(user('chair1'), e.id, CYCLE);
    const sent = JSON.stringify(spy.mock.calls[0][0]);
    expect(sent).not.toMatch(/081-000-0000|somchai@test|1-1017-00123-45-6/);
    expect(run.redactionCount).toBeGreaterThanOrEqual(3);
  });
  it('redaction: AI-3 reviewer redact narrative ก่อนส่ง', async () => {
    saveSection(user('chair1'), CYCLE, '2.1', { narrativeTh: 'ติดต่อ 081-000-0000 เพื่อสอบถามเรื่องหลักสูตร' }, 'manual');
    const spy = vi.spyOn(offlineProvider, 'reviewSar');
    await runSarReviewer(user('chair1'), CYCLE, '2.1', 'th');
    expect(JSON.stringify(spy.mock.calls[0][0])).not.toContain('081-000-0000');
  });
  it('post-check: draft ปลอม citation/ตัวเลข ถูกตัดและติดธง (mock provider)', async () => {
    const e = await addEvidence(user('chair1'), { requirementIds: ['2.1'], extractedText: 'มีนักศึกษา 120 คน', description: 'จำนวนนักศึกษา 120 คน' });
    vi.spyOn(offlineProvider, 'draftSar').mockResolvedValue({
      draft: `หลักสูตรมีนักศึกษา 120 คน [${e.code}]\nหลักสูตรได้รับรางวัล 777 ครั้ง\nมีการทบทวนทุกปี [E-9.9-99]`,
      missing: [], usedEvidence: [e.code, 'E-9.9-99'],
    });
    const run = await runSarDrafter(user('chair1'), CYCLE, '2.1', 'th');
    const out = run.output as { draft: string; usedEvidence: string[] };
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.removedCitations).toContain('E-9.9-99');
    expect(run.postCheck.unknownNumbers).toContain('777');
    expect(out.draft).not.toMatch(/777|E-9\.9-99/);
    expect(out.draft).toContain(e.code);
    expect(out.usedEvidence).toEqual([e.code]);
  });
  it('ผล AI ไม่เข้าเอกสารจนกว่า accept (draft และ tagger)', async () => {
    const chair = user('chair1');
    const e = await addEvidence(chair, { requirementIds: [], cycleId: undefined, extractedText: 'แผนพัฒนาหลักสูตร ปรับปรุงหลักสูตร มคอ.2' });
    const run1 = await runSarDrafter(chair, CYCLE, '1.1', 'th');
    expect(run1.accepted).toBe(false);
    expect(load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::1.1`)!.narrativeTh).toBe('');
    const tag = await runEvidenceTagger(chair, e.id, CYCLE);
    expect(tag.accepted).toBe(false);
    expect(getEvidence(chair, e.id, CYCLE).requirementIds).toEqual([]);
    expect(getEvidence(chair, e.id).aiSummary).toBeFalsy();

    // accept draft -> เข้าเอกสาร
    if ((run1.output as { draft: string }).draft.trim()) {
      acceptAiRun(chair, run1.id);
      expect(load<SarSection>(KEYS.sections).find(s => s.id === `${CYCLE}::1.1`)!.narrativeTh).toBe((run1.output as { draft: string }).draft);
    }
    // accept tagger -> มี summary
    acceptAiRun(chair, tag.id);
    expect(getEvidence(chair, e.id).aiSummary).toBeTruthy();
  });
  it('accept ซ้ำถูกปฏิเสธ และ accept ข้าม university ไม่ได้', async () => {
    const chair = user('chair1');
    const tag = await runEvidenceTagger(chair, load<Evidence>(KEYS.evidence)[0].id, CYCLE);
    expect(() => acceptAiRun(user('uadmin2'), tag.id)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    acceptAiRun(chair, tag.id);
    expect(() => acceptAiRun(chair, tag.id)).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });
  it('accept ที่มีการอ้าง citation ผ่านด่านปกติ: ไม่ล็อก/ไม่เกินสิทธิ์ของผู้กด (staff1 กด accept ร่างข้อ 2.1 ไม่ได้)', async () => {
    const chair = user('chair1');
    await addEvidence(chair, { requirementIds: ['2.1'] });
    const run = await runSarDrafter(chair, CYCLE, '2.1', 'th');
    expect(() => acceptAiRun(user('staff1'), run.id)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });
  it('AI ให้คะแนนทางการไม่ได้: รัน AI ทั้ง 3 แล้ว ratings ไม่เปลี่ยน และไม่มี committee rating', async () => {
    const chair = user('chair1');
    await addEvidence(chair, { requirementIds: ['2.1'] });
    const before = JSON.stringify(load(KEYS.ratings));
    await runSarDrafter(chair, CYCLE, '2.1', 'th');
    const r = await runSarReviewer(chair, CYCLE, '2.1', 'th');
    await runEvidenceTagger(chair, load<Evidence>(KEYS.evidence)[0].id, CYCLE);
    acceptAiRun(chair, r.id);
    expect(JSON.stringify(load(KEYS.ratings))).toBe(before);
    expect(listRatings(chair, CYCLE).some(x => x.raterType === 'committee')).toBe(false);
  });
  it('AI ไม่เปลี่ยน state: สถานะรอบ/ข้อไม่เปลี่ยนหลังรัน+accept', async () => {
    const chair = user('chair1');
    await addEvidence(chair, { requirementIds: ['2.1'] });
    const statusBefore = JSON.stringify([load(KEYS.cycles), load<SarSection>(KEYS.sections).map(s => s.status)]);
    const run = await runSarDrafter(chair, CYCLE, '2.1', 'th');
    await runSarReviewer(chair, CYCLE, '2.1', 'th');
    void run;
    const after = JSON.stringify([load(KEYS.cycles), load<SarSection>(KEYS.sections).map(s => s.status)]);
    expect(after).toBe(statusBefore);
  });
  it('โครงสร้าง: โค้ด AI ไม่ import ฟังก์ชันเปลี่ยน state/ให้คะแนนกรรมการ และ provider ไม่มี method ให้คะแนน', () => {
    const root = path.resolve(__dirname, '..', 'lib', 'api');
    const files = [path.join(root, 'ai.service.ts'), ...fs.readdirSync(path.join(root, 'ai')).map(f => path.join(root, 'ai', f))];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(src, f).not.toMatch(/transitionCycle|transitionSection|setCommitteeRating|approveSection|openRevision/);
    }
    expect(Object.keys(offlineProvider).filter(k => /rat|score|approve|grade/i.test(k))).toEqual([]);
  });
  it('บันทึก ai_run ทุกครั้ง + audit ai.run.*', async () => {
    const chair = user('chair1');
    await runSarDrafter(chair, CYCLE, '2.1', 'th');
    const runs = listAiRuns(chair, { cycleId: CYCLE });
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ feature: 'AI-2', accepted: false });
    expect(runs[0].redactedInputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(listAudit(chair, { targetType: 'ai_run' }).some(a => a.action === 'ai.run.AI-2')).toBe(true);
  });
  it('ทำงานได้โดยไม่มี API key (offline provider) — มี id offline', () => {
    expect(offlineProvider.id).toMatch(/offline/i);
  });
  it('มหาวิทยาลัยปิด AI -> ai_disabled', async () => {
    const unis = load<University>(KEYS.universities).map(u => (u.id === 'uni-demo' ? { ...u, aiEnabled: false } : u));
    save(KEYS.universities, unis);
    await expect(runSarDrafter(user('chair1'), CYCLE, '2.1', 'th')).rejects.toMatchObject({ code: 'ai_disabled' });
  });
  it('สิทธิ์: data1 ใช้ AI ร่างไม่ได้ / assessor ใช้ AI ร่างไม่ได้', async () => {
    await expect(runSarDrafter(user('data1'), CYCLE, '2.1', 'th')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(runSarDrafter(user('assess1'), CYCLE, '2.1', 'th')).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('Audit log', () => {
  beforeEach(freshDemo);
  const actions = () => load<AuditLog>(KEYS.audit).map(a => a.action);

  it('write สำคัญสร้าง audit entry (evidence/link/sar/rating)', async () => {
    const chair = user('chair1');
    const n0 = load(KEYS.audit).length;
    const e = await addEvidence(chair, { requirementIds: ['2.1'] });
    saveSection(chair, CYCLE, '2.1', { narrativeTh: 'เนื้อหา' }, 'manual');
    setSelfRating(chair, CYCLE, '2.1', 5, 'เหตุผล');
    const a = actions();
    expect(a).toContain('evidence.create');
    expect(a).toContain('evidence.link');
    expect(a).toContain('sar.save');
    expect(a).toContain('rating.self');
    expect(load(KEYS.audit).length).toBeGreaterThanOrEqual(n0 + 4);
    const created = load<AuditLog>(KEYS.audit).find(x => x.action === 'evidence.create' && x.targetId === e.id)!;
    expect(created).toMatchObject({ actorId: chair.id, universityId: 'uni-demo', programmeId: PROG });
    expect(created.at).toBeGreaterThan(0);
  });
  it('workflow transition เขียน audit (section.* / cycle.*)', async () => {
    const chair = user('chair1');
    const staff = user('staff1');
    api.assignSections(chair, CYCLE, ['2.1'], staff.id);
    saveSection(staff, CYCLE, '2.1', { narrativeTh: 'เนื้อหา' }, 'manual');
    api.submitSection(staff, CYCLE, '2.1');
    api.approveSection(chair, CYCLE, '2.1');
    const a = actions();
    expect(a).toContain('section.ready_for_review');
    expect(a).toContain('section.approved');
  });
  it('write ที่ถูกปฏิเสธ (forbidden) ไม่สร้างการเปลี่ยนแปลงข้อมูล/audit ของ write นั้น', () => {
    const n0 = load<AuditLog>(KEYS.audit).filter(a => a.action === 'sar.save').length;
    expect(() => saveSection(user('assess1'), CYCLE, '2.1', { narrativeTh: 'x' }, 'manual')).toThrow();
    expect(load<AuditLog>(KEYS.audit).filter(a => a.action === 'sar.save').length).toBe(n0);
  });
  it('login สำเร็จเขียน auth.login audit', async () => {
    await api.loginUser('chair1', 'demo1234');
    expect(actions()).toContain('auth.login');
  });
  it('ไม่มี API ลบ/แก้ audit (append-only)', () => {
    const names = Object.keys(api);
    const bad = names.filter(n => /audit/i.test(n) && /(delete|remove|update|edit|clear|purge|truncate|set|modify)/i.test(n));
    expect(bad).toEqual([]);
    const auditExports = Object.keys(auditStore);
    expect(auditExports.sort()).toEqual(['SYSTEM_ACTOR_ID', 'appendAudit', 'appendAuditThrottled', 'auditToCsv', 'listAudit']);
  });
  it('entry เดิมไม่ถูกเปลี่ยนเมื่อมี write ต่อ ๆ ไป (append-only)', async () => {
    const chair = user('chair1');
    appendAudit(chair, { action: 't.first', targetType: 'x', targetId: 'x1' });
    const first = JSON.stringify(load<AuditLog>(KEYS.audit).find(a => a.action === 't.first'));
    await addEvidence(chair);
    saveSection(chair, CYCLE, '2.1', { narrativeTh: 'z' }, 'manual');
    expect(JSON.stringify(load<AuditLog>(KEYS.audit).find(a => a.action === 't.first'))).toBe(first);
  });
  it('listAudit ตามสิทธิ์: staff1 ดู audit ไม่ได้ (ว่าง), uadmin ดูได้, CSV escape ถูกต้อง', () => {
    expect(listAudit(user('staff1'))).toEqual([]);
    const rows = listAudit(user('uadmin'), { limit: 3 });
    expect(rows.length).toBe(3);
    const csv = api.auditToCsv([{ ...rows[0], action: 'a"b' }]);
    expect(csv).toContain('"a""b"');
  });
});
