import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAllowedCycleTransition, isAllowedSectionTransition, nextCycleStatuses, nextSectionStatuses, transitionCycle,
  verifySnapshot, getSnapshots, openRevision, computeSnapshotHash, getCycleRaw,
} from '@/lib/api/workflow';
import { saveSection, submitSection, approveSection, returnSection, setSelfRating } from '@/lib/api/sar.store';
import { listRequirements } from '@/lib/api/framework';
import { listSections } from '@/lib/api/cycle.store';
import { createEvidence, linkEvidence } from '@/lib/api/evidence.store';
import type { CycleStatus, SectionStatus } from '@/lib/types';
import { CYCLE, freshDemo, user, addEvidence, PROG } from './helpers';

const CYCLE_STATES: CycleStatus[] = ['draft', 'in_progress', 'under_review', 'revision_requested', 'faculty_approved', 'final_approved', 'under_assessment', 'assessed', 'closed'];
const SECTION_STATES: SectionStatus[] = ['not_started', 'drafting', 'ready_for_review', 'changes_requested', 'approved'];

const ALLOWED_CYCLE: [CycleStatus, CycleStatus][] = [
  ['draft', 'in_progress'], ['in_progress', 'under_review'], ['under_review', 'revision_requested'], ['revision_requested', 'in_progress'],
  ['under_review', 'faculty_approved'], ['faculty_approved', 'final_approved'], ['final_approved', 'under_assessment'],
  ['under_assessment', 'assessed'], ['assessed', 'closed'],
];
const ALLOWED_SECTION: [SectionStatus, SectionStatus][] = [
  ['not_started', 'drafting'], ['drafting', 'ready_for_review'], ['ready_for_review', 'approved'], ['ready_for_review', 'changes_requested'],
  ['changes_requested', 'drafting'], ['changes_requested', 'ready_for_review'], ['approved', 'changes_requested'],
];

describe('state machine ตาราง (pure)', () => {
  it('cycle: ทุก transition ที่อนุญาตผ่าน และคู่อื่นทั้งหมดถูกปฏิเสธ', () => {
    for (const a of CYCLE_STATES) for (const b of CYCLE_STATES) {
      const expected = ALLOWED_CYCLE.some(([x, y]) => x === a && y === b);
      expect(isAllowedCycleTransition(a, b), `${a}->${b}`).toBe(expected);
    }
  });
  it('section: ทุก transition ที่อนุญาตผ่าน และคู่อื่นทั้งหมดถูกปฏิเสธ', () => {
    for (const a of SECTION_STATES) for (const b of SECTION_STATES) {
      const expected = ALLOWED_SECTION.some(([x, y]) => x === a && y === b);
      expect(isAllowedSectionTransition(a, b), `${a}->${b}`).toBe(expected);
    }
  });
  it('ข้ามขั้นไม่ได้: draft -> final_approved, not_started -> approved', () => {
    expect(isAllowedCycleTransition('draft', 'final_approved')).toBe(false);
    expect(isAllowedSectionTransition('not_started', 'approved')).toBe(false);
  });
  it('lock แล้วย้อนไม่ได้ผ่านตาราง: final_approved -> in_progress ไม่มีในตาราง', () => {
    expect(isAllowedCycleTransition('final_approved', 'in_progress')).toBe(false);
  });
  it('nextCycleStatuses / nextSectionStatuses', () => {
    expect(nextCycleStatuses('under_review').sort()).toEqual(['faculty_approved', 'revision_requested']);
    expect(nextCycleStatuses('closed')).toEqual([]);
    expect(nextSectionStatuses('ready_for_review').sort()).toEqual(['approved', 'changes_requested']);
  });
});

describe('transition ผ่าน store (สิทธิ์ + เงื่อนไข)', () => {
  beforeEach(freshDemo);

  it('รอบเดโม่เริ่มที่ in_progress, มี 53 sections', () => {
    expect(getCycleRaw(CYCLE).status).toBe('in_progress');
    expect(listSections(user('chair1'), CYCLE)).toHaveLength(53);
  });
  it('transition ต้องห้ามถูกปฏิเสธ bad_transition (in_progress -> final_approved)', async () => {
    await expect(transitionCycle(user('dean1'), CYCLE, 'final_approved')).rejects.toMatchObject({ code: 'bad_transition' });
  });
  it('ส่งตรวจ (under_review) ไม่ได้ถ้ายังมีข้อไม่ approved', async () => {
    await expect(transitionCycle(user('chair1'), CYCLE, 'under_review')).rejects.toMatchObject({ code: 'invalid' });
  });
  it('ผู้ไม่มีสิทธิ์ (staff1) เปลี่ยนสถานะรอบไม่ได้', async () => {
    await expect(transitionCycle(user('staff1'), CYCLE, 'under_review')).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('section: ข้ามขั้น not_started -> approved ถูกปฏิเสธ', () => {
    expect(() => approveSection(user('chair1'), CYCLE, '1.1')).toThrowError(expect.objectContaining({ code: 'bad_transition' }));
  });
  it('section: ส่งตรวจโดยไม่มี narrative ถูกปฏิเสธ', () => {
    saveSection(user('chair1'), CYCLE, '1.2', { pdca: { plan: true } }, 'manual'); // -> drafting
    expect(() => submitSection(user('chair1'), CYCLE, '1.2')).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });
  it('section: ส่งกลับต้องมี note', () => {
    saveSection(user('chair1'), CYCLE, '1.2', { narrativeTh: 'เนื้อหา' }, 'manual');
    submitSection(user('chair1'), CYCLE, '1.2');
    expect(() => returnSection(user('chair1'), CYCLE, '1.2', '  ')).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(returnSection(user('chair1'), CYCLE, '1.2', 'ขอหลักฐานเพิ่ม').status).toBe('changes_requested');
  });
  it('section: ส่งตรวจแล้วแก้เนื้อหาไม่ได้ (locked) จนกว่าจะถูกส่งกลับ', () => {
    saveSection(user('chair1'), CYCLE, '1.2', { narrativeTh: 'เนื้อหา' }, 'manual');
    submitSection(user('chair1'), CYCLE, '1.2');
    expect(() => saveSection(user('chair1'), CYCLE, '1.2', { narrativeTh: 'แก้' }, 'manual')).toThrowError(expect.objectContaining({ code: 'locked' }));
    returnSection(user('chair1'), CYCLE, '1.2', 'แก้หน่อย');
    expect(saveSection(user('chair1'), CYCLE, '1.2', { narrativeTh: 'แก้แล้ว' }, 'manual').narrativeTh).toBe('แก้แล้ว');
  });
});

/** พารอบเดโม่จนถึง final_approved (lock) */
async function lockCycle() {
  const chair = user('chair1');
  for (const r of listRequirements()) {
    saveSection(chair, CYCLE, r.id, { narrativeTh: `เนื้อหาข้อ ${r.id}` }, 'manual');
    submitSection(chair, CYCLE, r.id);
    approveSection(chair, CYCLE, r.id);
  }
  await transitionCycle(chair, CYCLE, 'under_review');
  await transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
  return transitionCycle(user('dean1'), CYCLE, 'final_approved');
}

describe('lock + snapshot hash', () => {
  beforeEach(freshDemo);

  it('อนุมัติครบ -> final_approved ล็อกรอบ, มี snapshotHash sha256 64 hex และ verify ผ่าน', async () => {
    const c = await lockCycle();
    expect(c.status).toBe('final_approved');
    expect(c.lockedAt).toBeTruthy();
    expect(c.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifySnapshot(CYCLE)).toMatchObject({ ok: true });
    expect(getSnapshots(CYCLE)).toHaveLength(1);
    expect(getSnapshots(CYCLE)[0].hash).toBe(c.snapshotHash);
  });

  it('hash deterministic: คำนวณซ้ำได้ค่าเดิม', async () => {
    await lockCycle();
    const a = await computeSnapshotHash(CYCLE);
    const b = await computeSnapshotHash(CYCLE);
    expect(a.hash).toBe(b.hash);
  });

  it('หลัง lock แก้ section ไม่ได้ (locked) แม้เป็นประธาน', async () => {
    await lockCycle();
    expect(() => saveSection(user('chair1'), CYCLE, '1.1', { narrativeTh: 'แอบแก้' }, 'manual')).toThrowError(expect.objectContaining({ code: 'locked' }));
    expect(() => returnSection(user('dean1'), CYCLE, '1.1', 'x')).toThrowError(expect.objectContaining({ code: 'locked' }));
  });
  it('หลัง lock ให้คะแนนตนเอง / ผูกหลักฐานใหม่ไม่ได้', async () => {
    await lockCycle();
    expect(() => setSelfRating(user('chair1'), CYCLE, '1.1', 4)).toThrowError(expect.objectContaining({ code: 'locked' }));
    const e = await createEvidence(user('chair1'), {
      programmeId: PROG, title: 'หลักฐานใหม่', kind: 'plan', pdcaStage: 'P', academicYear: 2569, extractedText: 'ใหม่ล้วน',
    });
    expect(() => linkEvidence(user('chair1'), e.id, CYCLE, ['1.1'])).toThrowError(expect.objectContaining({ code: 'locked' }));
  });
  it('หลักฐานที่อยู่ในรอบ lock แก้ metadata ไม่ได้', async () => {
    const ev = await addEvidence(user('chair1'), { requirementIds: ['1.1'] });
    await lockCycle();
    const { updateEvidence } = await import('@/lib/api/evidence.store');
    expect(() => updateEvidence(user('chair1'), ev.id, { title: 'เปลี่ยนชื่อ' })).toThrowError(expect.objectContaining({ code: 'locked' }));
  });
  it('lock แล้วแก้ข้อมูลดิบให้ hash เปลี่ยน -> verifySnapshot ตรวจพบ', async () => {
    await lockCycle();
    const { load, save, KEYS } = await import('@/lib/api/db');
    const rows = load<any>(KEYS.sections);
    rows[0].narrativeTh = 'ถูกแก้ผ่าน storage โดยตรง';
    save(KEYS.sections, rows);
    expect((await verifySnapshot(CYCLE)).ok).toBe(false);
  });
  it('เปิด revision: เฉพาะคณบดี, ต้องมีเหตุผล, ล้าง lock และเพิ่ม revision', async () => {
    await lockCycle();
    expect(() => openRevision(user('chair1'), CYCLE, 'x')).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    expect(() => openRevision(user('dean1'), CYCLE, ' ')).toThrowError(expect.objectContaining({ code: 'invalid' }));
    const c = openRevision(user('dean1'), CYCLE, 'พบข้อผิดพลาด');
    expect(c).toMatchObject({ status: 'in_progress', revision: 2 });
    expect(c.lockedAt).toBeUndefined();
    expect(c.snapshotHash).toBeUndefined();
  });
  it('final_approved ย้อนกลับ in_progress ผ่าน transitionCycle ไม่ได้', async () => {
    await lockCycle();
    await expect(transitionCycle(user('dean1'), CYCLE, 'in_progress')).rejects.toMatchObject({ code: 'bad_transition' });
  });
});
