import { describe, it, expect, beforeEach } from 'vitest';
import {
  nextEvidenceCode, createEvidence, listEvidence, getEvidence, linkEvidence, unlinkEvidence, verifyEvidence, resolvePii,
} from '@/lib/api/evidence.store';
import { saveSection, validateCitations, citableCodes, setSelfRating, setCommitteeRating, listRatings, listVersions } from '@/lib/api/sar.store';
import { getSection } from '@/lib/api/cycle.store';
import { load, KEYS } from '@/lib/api/db';
import type { Evidence, EvidenceLink } from '@/lib/types';
import { CYCLE, PROG, freshDemo, user, addEvidence } from './helpers';

describe('evidence', () => {
  beforeEach(freshDemo);

  it('รหัสทุกชิ้นตรง pattern E-x.x-nn และไม่ซ้ำ (seed 16 ชิ้น)', () => {
    const rows = load<Evidence>(KEYS.evidence);
    expect(rows.length).toBeGreaterThanOrEqual(15);
    rows.forEach(e => expect(e.code).toMatch(/^E-\d+\.\d+-\d{2,}$/));
    expect(new Set(rows.map(e => e.code)).size).toBe(rows.length);
  });
  it('สร้างหลายชิ้นข้อเดียวกัน -> รหัสเรียงต่อเนื่องไม่ซ้ำ', async () => {
    const chair = user('chair1');
    const a = await addEvidence(chair, { requirementIds: ['2.1'] });
    const b = await addEvidence(chair, { requirementIds: ['2.1'] });
    const c = await addEvidence(chair, { requirementIds: ['2.1'] });
    expect([a.code, b.code, c.code]).toEqual(['E-2.1-01', 'E-2.1-02', 'E-2.1-03']);
  });
  it('nextEvidenceCode: ไม่ระบุข้อ -> E-0.0-nn และข้ามเลขที่ใช้แล้ว', async () => {
    expect(nextEvidenceCode(PROG)).toBe('E-0.0-01');
    await addEvidence(user('chair1'), { requirementIds: [] , cycleId: undefined });
    expect(nextEvidenceCode(PROG)).toBe('E-0.0-02');
  });
  it('ผูก 1 ชิ้นหลายข้อ: โผล่ทุกข้อ โดยมี record หลักฐานเดียว (ไม่ copy)', async () => {
    const chair = user('chair1');
    const before = load<Evidence>(KEYS.evidence).length;
    const e = await addEvidence(chair, { requirementIds: ['7.1', '7.2', '7.3'] });
    expect(load<Evidence>(KEYS.evidence).length).toBe(before + 1);
    for (const r of ['7.1', '7.2', '7.3']) {
      const list = listEvidence(chair, { programmeId: PROG, cycleId: CYCLE, requirementId: r });
      expect(list.map(x => x.id)).toContain(e.id);
    }
    expect(getEvidence(chair, e.id, CYCLE).requirementIds.sort()).toEqual(['7.1', '7.2', '7.3']);
  });
  it('seed: ชิ้นที่ผูก 1.4/2.3/2.7 โผล่ทั้ง 3 ข้อด้วย id เดียวกัน', () => {
    const chair = user('chair1');
    const ids = ['1.4', '2.3', '2.7'].map(r => listEvidence(chair, { programmeId: PROG, cycleId: CYCLE, requirementId: r }).map(x => x.id));
    const common = ids[0].filter(i => ids[1].includes(i) && ids[2].includes(i));
    expect(common).toHaveLength(1);
  });
  it('link ซ้ำไม่สร้างลิงก์ซ้ำ, unlink ทีละข้อ', async () => {
    const chair = user('chair1');
    const e = await addEvidence(chair, { requirementIds: ['7.1'] });
    expect(linkEvidence(chair, e.id, CYCLE, ['7.1'])).toHaveLength(0);
    expect(linkEvidence(chair, e.id, CYCLE, ['7.2'])).toHaveLength(1);
    unlinkEvidence(chair, e.id, CYCLE, '7.1');
    expect(getEvidence(chair, e.id, CYCLE).requirementIds).toEqual(['7.2']);
    expect(load<EvidenceLink>(KEYS.links).filter(l => l.evidenceId === e.id)).toHaveLength(1);
  });
  it('sha256 dedupe: เนื้อหาเดียวกันซ้ำถูก reject (duplicate + duplicateOf)', async () => {
    const chair = user('chair1');
    const a = await addEvidence(chair, { extractedText: 'เนื้อหาเหมือนกันทุกตัวอักษร', requirementIds: [] , cycleId: undefined });
    expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
    await expect(addEvidence(chair, { extractedText: 'เนื้อหาเหมือนกันทุกตัวอักษร', requirementIds: [], cycleId: undefined }))
      .rejects.toMatchObject({ code: 'duplicate', detail: { duplicateOf: a.id } });
  });
  it('dedupe: allowDuplicate=true ข้ามได้', async () => {
    const chair = user('chair1');
    await addEvidence(chair, { extractedText: 'ซ้ำแต่ยืนยัน', requirementIds: [], cycleId: undefined });
    const b = await addEvidence(chair, { extractedText: 'ซ้ำแต่ยืนยัน', requirementIds: [], cycleId: undefined, allowDuplicate: true });
    expect(b.id).toBeTruthy();
  });
  it('dedupe ตาม URL เมื่อไม่มีไฟล์', async () => {
    const chair = user('chair1');
    await createEvidence(chair, { programmeId: PROG, title: 'ลิงก์ 1', kind: 'other', pdcaStage: 'P', academicYear: 2569, url: 'https://x.example/a' });
    await expect(createEvidence(chair, { programmeId: PROG, title: 'ลิงก์ 2', kind: 'other', pdcaStage: 'P', academicYear: 2569, url: 'https://x.example/a' }))
      .rejects.toMatchObject({ code: 'duplicate' });
  });
  it('validation: title ว่าง, PDCA ผิด, ปีผิด, URL ผิด, ไม่มีเนื้อหา', async () => {
    const chair = user('chair1');
    const base = { programmeId: PROG, title: 't', kind: 'plan' as const, pdcaStage: 'P' as const, academicYear: 2569, extractedText: 'x1' };
    await expect(createEvidence(chair, { ...base, title: ' ' })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, pdcaStage: 'Z' as any })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, academicYear: 1999 })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, url: 'javascript:alert(1)' })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, extractedText: undefined })).rejects.toMatchObject({ code: 'invalid' });
    await expect(createEvidence(chair, { ...base, requirementIds: ['9.9'], cycleId: CYCLE })).rejects.toMatchObject({ code: 'invalid' });
  });
  it('PII: seed E-6.3-01 มีเลขบัตร ปชช. ติดธง thai_id', () => {
    const e = load<Evidence>(KEYS.evidence).find(x => x.code === 'E-6.3-01')!;
    expect(e.containsPii).toBe(true);
    expect(e.piiKinds).toContain('thai_id');
  });
  it('PII: สร้างใหม่ที่มีเลขบัตรถูกติดธง, ที่ไม่มีไม่ติด', async () => {
    const chair = user('chair1');
    const bad = await addEvidence(chair, { extractedText: 'บัตรประชาชน 1-2345-67890-12-3 ของผู้ทดสอบ', requirementIds: [], cycleId: undefined });
    const ok = await addEvidence(chair, { extractedText: 'รายงานผลสัมฤทธิ์ 120 คน', requirementIds: [], cycleId: undefined });
    expect(bad.containsPii).toBe(true);
    expect(ok.containsPii).toBe(false);
  });
  it('PII ยังไม่จัดการ -> verify ไม่ได้, resolvePii ต้องมี note, แล้ว verify ได้', async () => {
    const chair = user('chair1');
    const e = load<Evidence>(KEYS.evidence).find(x => x.code === 'E-6.3-01')!;
    expect(() => verifyEvidence(chair, e.id)).toThrowError(expect.objectContaining({ code: 'invalid' }));
    expect(() => resolvePii(chair, e.id, ' ')).toThrowError(expect.objectContaining({ code: 'invalid' }));
    resolvePii(chair, e.id, 'ปิดบังเลขบัตรแล้ว');
    expect(verifyEvidence(chair, e.id).status).toBe('verified');
  });
  it('verify ต้องผูกอย่างน้อย 1 ข้อ', async () => {
    const chair = user('chair1');
    const e = await addEvidence(chair, { requirementIds: [], cycleId: undefined });
    expect(() => verifyEvidence(chair, e.id)).toThrowError(expect.objectContaining({ code: 'invalid' }));
  });
  it('สิทธิ์: lect2 (หลักสูตร ds) เพิ่มหลักฐานให้ prog-demo-cs ไม่ได้', async () => {
    await expect(addEvidence(user('lect2'))).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('สิทธิ์: faculty_qa/dean เพิ่มหลักฐานไม่ได้ (read-only)', async () => {
    await expect(addEvidence(user('fqa1'))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(addEvidence(user('dean1'))).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('SAR', () => {
  beforeEach(freshDemo);

  it('citation ที่ไม่มีจริงถูก reject (citation_invalid + detail.invalid)', () => {
    try {
      saveSection(user('chair1'), CYCLE, '2.1', { narrativeTh: 'อ้างหลักฐานปลอม [E-9.9-99]' }, 'manual');
      expect.unreachable();
    } catch (e: any) {
      expect(e.code).toBe('citation_invalid');
      expect(e.detail.invalid).toEqual(['E-9.9-99']);
    }
    expect(getSection(user('chair1'), CYCLE, '2.1').narrativeTh).toBe('');
  });
  it('citation ที่มีอยู่แต่ไม่ได้ผูกกับรอบนี้ ก็ reject', async () => {
    const chair = user('chair1');
    const e = await addEvidence(chair, { requirementIds: [], cycleId: undefined });
    expect(citableCodes(CYCLE).has(e.code)).toBe(false);
    expect(() => saveSection(chair, CYCLE, '2.1', { narrativeTh: `ข้อความ [${e.code}]` }, 'manual')).toThrowError(expect.objectContaining({ code: 'citation_invalid' }));
  });
  it('citation ที่ผูกจริงผ่าน และ validateCitations แยก valid/invalid', async () => {
    const chair = user('chair1');
    const e = await addEvidence(chair, { requirementIds: ['2.1'] });
    const v = validateCitations(CYCLE, `ก [${e.code}] ข [E-9.9-99]`);
    expect(v.valid).toEqual([e.code]);
    expect(v.invalid).toEqual(['E-9.9-99']);
    const s = saveSection(chair, CYCLE, '2.1', { narrativeTh: `มีแล้ว [${e.code}]` }, 'manual');
    expect(s.narrativeTh).toContain(e.code);
    expect(s.status).toBe('drafting');
  });
  it('บันทึกแล้วมี version; manual ทุกครั้งสร้าง version ใหม่; restore ได้', () => {
    const chair = user('chair1');
    saveSection(chair, CYCLE, '2.2', { narrativeTh: 'v1' }, 'manual');
    saveSection(chair, CYCLE, '2.2', { narrativeTh: 'v2' }, 'manual');
    const vs = listVersions(chair, CYCLE, '2.2');
    expect(vs.length).toBe(2);
  });
  it('autosave ติด ๆ กัน ไม่สร้าง version ซ้ำทุกครั้ง (เว้นช่วง)', () => {
    const chair = user('chair1');
    saveSection(chair, CYCLE, '2.2', { narrativeTh: 'a' }, 'autosave');
    saveSection(chair, CYCLE, '2.2', { narrativeTh: 'ab' }, 'autosave');
    saveSection(chair, CYCLE, '2.2', { narrativeTh: 'abc' }, 'autosave');
    expect(listVersions(chair, CYCLE, '2.2').length).toBe(1);
  });

  describe('self-rating', () => {
    it('รับเฉพาะ integer 1–7', () => {
      const chair = user('chair1');
      for (const bad of [0, 8, -1, 3.5, NaN, Infinity]) {
        expect(() => setSelfRating(chair, CYCLE, '2.1', bad), String(bad)).toThrowError(expect.objectContaining({ code: 'invalid' }));
      }
      for (const ok of [1, 4, 7]) expect(setSelfRating(chair, CYCLE, '2.1', ok).score).toBe(ok);
    });
    it('upsert: ให้ซ้ำเป็นแถวเดียว', () => {
      const chair = user('chair1');
      setSelfRating(chair, CYCLE, '2.1', 3);
      setSelfRating(chair, CYCLE, '2.1', 5);
      const mine = listRatings(chair, CYCLE).filter(r => r.requirementId === '2.1' && r.raterType === 'self');
      expect(mine).toHaveLength(1);
      expect(mine[0].score).toBe(5);
    });
    it('ไม่ทับคะแนนกรรมการ: แถวแยก raterType', async () => {
      // จำลองคะแนนกรรมการที่มีอยู่ แล้ว self-rating ใหม่ต้องไม่แตะ
      const { save } = await import('@/lib/api/db');
      const rows = [{ id: 'c1', cycleId: CYCLE, requirementId: '2.1', raterType: 'committee', raterUserId: 'u-assess', score: 2, rationale: '', at: 1 }];
      save(KEYS.ratings, rows);
      setSelfRating(user('chair1'), CYCLE, '2.1', 6);
      const all = listRatings(user('chair1'), CYCLE).filter(r => r.requirementId === '2.1');
      expect(all.find(r => r.raterType === 'committee')!.score).toBe(2);
      expect(all.find(r => r.raterType === 'self')!.score).toBe(6);
    });
    it('assessor ให้ self-rating ไม่ได้ และ chair ให้คะแนนกรรมการไม่ได้', () => {
      expect(() => setSelfRating(user('assess1'), CYCLE, '2.1', 4)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
      expect(() => setCommitteeRating(user('chair1'), CYCLE, '2.1', 4)).toThrowError(expect.objectContaining({ code: 'forbidden' }));
    });
    it('assessor ให้คะแนนกรรมการนอกขั้น under_assessment ไม่ได้ (invalid)', () => {
      expect(() => setCommitteeRating(user('assess1'), CYCLE, '2.1', 4)).toThrowError(expect.objectContaining({ code: 'invalid' }));
    });
  });
});
