import { describe, it, expect, beforeEach } from 'vitest';
import { resetDemo } from '@/lib/api/init';
import { setUserRoles, deleteUser } from '@/lib/api/auth.api';
import { createEvidence, getEvidence, getExtractedText, linkEvidence } from '@/lib/api/evidence.store';
import { assignSections, listSections } from '@/lib/api/cycle.store';
import { auditToCsv, listAudit } from '@/lib/api/audit.store';
import { load, KEYS } from '@/lib/api/db';
import type { Evidence, EvidenceLink } from '@/lib/types';
import { CYCLE, PROG, freshDemo, user, addEvidence } from './helpers';

describe('review fixes TASK-0001', () => {
  beforeEach(freshDemo);

  it('#1 assessor เปิดหลักฐานที่ไม่ผูกกับรอบ/อ่าน text ไม่ได้ แต่ที่ผูกอ่านได้', async () => {
    const a = user('assess1');
    const linked = load<EvidenceLink>(KEYS.links).find(l => l.cycleId === CYCLE)!;
    expect(getEvidence(a, linked.evidenceId, CYCLE).id).toBe(linked.evidenceId);
    expect(typeof getExtractedText(a, linked.evidenceId, CYCLE)).toBe('string');
    const lonely = await addEvidence(user('chair1'), { requirementIds: [], cycleId: undefined });
    expect(() => getEvidence(a, lonely.id, CYCLE)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => getExtractedText(a, lonely.id, CYCLE)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => getExtractedText(a, linked.evidenceId)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
  });

  it('#2 linkEvidence/assignSections ที่ id ผิดไม่ทิ้งค่าค้างและไม่เขียน audit', async () => {
    const chair = user('chair1');
    const e = (await addEvidence(chair, { requirementIds: [], cycleId: undefined })) as Evidence;
    const n = load<EvidenceLink>(KEYS.links).length;
    expect(() => linkEvidence(chair, e.id, CYCLE, ['1.1', '9.9'])).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(load<EvidenceLink>(KEYS.links).length).toBe(n);
    const ownerBefore = listSections(chair, CYCLE).find(s => s.requirementId === '1.1')?.ownerUserId;
    const auditN = listAudit(user('uadmin')).length;
    expect(() => assignSections(chair, CYCLE, ['1.1', '9.9'], null)).toThrowError(expect.objectContaining({ code: 'not_found' }));
    expect(listSections(chair, CYCLE).find(s => s.requirementId === '1.1')?.ownerUserId).toBe(ownerBefore);
    expect(listAudit(user('uadmin')).length).toBe(auditN);
  });

  it('#3 resetDemo ต้องมีสิทธิ์ user.manage', async () => {
    await expect(resetDemo(user('chair1'))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(resetDemo(user('uadmin'))).resolves.toBeUndefined();
  });

  it('#6 uni_admin แก้ role ตัวเอง/แตะ super_admin ไม่ได้', () => {
    const ua = user('uadmin');
    expect(() => setUserRoles(ua, ua.id, [...ua.roles, { role: 'dean', scopeType: 'university', scopeId: ua.universityId }]))
      .toThrowError(expect.objectContaining({ code: 'forbidden' }));
    const sa = user('sadmin');
    expect(() => setUserRoles(ua, sa.id, [])).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => deleteUser(ua, sa.id)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(setUserRoles(ua, user('lect1').id, user('lect1').roles).id).toBe('u-lect1');
  });

  it('#7 จำกัดชนิด/ขนาดไฟล์ และ binary ติดสถานะยังไม่สแกน PII', async () => {
    const chair = user('chair1');
    const base = { programmeId: PROG, title: 'ไฟล์', kind: 'other' as const, pdcaStage: 'P' as const, academicYear: 2569 };
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    await expect(createEvidence(chair, { ...base, file: { name: 'a.exe', mime: 'application/x', size: 3, bytes } })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, file: { name: 'a.pdf', mime: 'application/pdf', size: 51 * 1024 * 1024, bytes } })).rejects.toMatchObject({ code: 'invalid' });
    const ok = await createEvidence(chair, { ...base, file: { name: 'a.pdf', mime: 'application/pdf', size: 3, bytes } });
    expect(load<{ id: string; piiScan?: string }>(KEYS.files).find(f => f.id === ok.currentFileId)?.piiScan).toBe('not_scanned');
  });

  it('#8 CSV กัน formula injection', () => {
    const row = { at: 0, actorName: '=cmd|x', action: '+1', targetType: '@t', targetId: '-1', before: undefined, after: undefined } as any;
    const csv = auditToCsv([row]).split('\n')[1];
    expect(csv).toContain(`"'=cmd|x"`);
    expect(csv).toContain(`"'+1"`);
    expect(csv).toContain(`"'@t"`);
    expect(csv).toContain(`"'-1"`);
  });

  it('#9 audit ai.run.AI-1 (ไม่มี cycleId) มี programmeId', async () => {
    const { runEvidenceTagger } = await import('@/lib/api/ai.service');
    const e = load<Evidence>(KEYS.evidence)[0];
    await runEvidenceTagger(user('chair1'), e.id);
    const a = listAudit(user('chair1'), { targetType: 'ai_run' }).find(x => x.action === 'ai.run.AI-1');
    expect(a?.programmeId).toBe(e.programmeId);
  });
});
