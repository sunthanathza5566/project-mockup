import { describe, it, expect } from 'vitest';
import { scanPii, redactPii, isValidThaiId } from '@/lib/utils/pii';
import { extractCitations, extractNumbers, countWords, uncitedSentences } from '@/lib/utils/text';
import { postCheckText } from '@/lib/api/ai/postcheck';
import { redactDeep } from '@/lib/api/ai/redact';
import { sha256Hex, stableStringify } from '@/lib/utils/hash';

function thaiIdWithChecksum(first12: string): string {
  const sum = first12.split('').reduce((s, d, i) => s + Number(d) * (13 - i), 0);
  return first12 + ((11 - (sum % 11)) % 10);
}

describe('PII scan', () => {
  it('เลขบัตร ปชช. 13 หลักติดกันที่ checksum ถูก ถูกติดธง', () => {
    const id = thaiIdWithChecksum('110170023073');
    expect(isValidThaiId(id)).toBe(true);
    expect(scanPii(`เลข ${id} นี้`).map(f => f.kind)).toContain('thai_id');
  });
  it('13 หลักที่ checksum ผิดไม่ถูกติดธง', () => {
    const id = thaiIdWithChecksum('110170023073');
    const bad = id.slice(0, 12) + String((Number(id[12]) + 1) % 10);
    expect(isValidThaiId(bad)).toBe(false);
    expect(scanPii(`รหัสอ้างอิง ${bad}`).find(f => f.kind === 'thai_id')).toBeUndefined();
  });
  it('รูปแบบมีขีด 1-1017-00123-45-6 ถูกติดธงเสมอ (ข้อมูลเดโม่)', () => {
    expect(scanPii('บัตร 1-1017-00123-45-6').map(f => f.kind)).toContain('thai_id');
  });
  it('sample ถูก mask ไม่เผยค่าเต็ม', () => {
    const f = scanPii('บัตร 1-1017-00123-45-6').find(x => x.kind === 'thai_id')!;
    expect(f.sample).toContain('*');
    expect(f.sample).not.toBe('1-1017-00123-45-6');
  });
  it('อีเมล เบอร์ รหัสนักศึกษา', () => {
    const kinds = scanPii('ติดต่อ a.b@uni.example โทร 081-000-0000 รหัสนักศึกษา 6501001').map(f => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(['email', 'phone', 'student_id']));
  });
  it('ข้อความปกติไม่มี PII (ตัวเลขสถิติทั่วไป)', () => {
    expect(scanPii('ผู้สำเร็จการศึกษา 120 คน ร้อยละ 85.5 ปี 2568')).toEqual([]);
  });
  it('redactPii แทนที่ด้วย token และนับจำนวน', () => {
    const r = redactPii('บัตร 1-1017-00123-45-6 โทร 081-000-0000 mail x@y.example');
    expect(r.text).toContain('[ID_CARD]');
    expect(r.text).toContain('[PHONE]');
    expect(r.text).toContain('[EMAIL]');
    expect(r.text).not.toMatch(/1-1017|081-000|x@y/);
    expect(r.count).toBe(3);
  });
  it('redactDeep ทำงานกับ object/array ซ้อน', () => {
    const r = redactDeep({ a: ['โทร 081-000-0000'], b: { c: 'x@y.example' }, n: 5 });
    expect(JSON.stringify(r.value)).not.toMatch(/081-000|x@y/);
    expect(r.value.n).toBe(5);
    expect(r.count).toBe(2);
  });
});

describe('text helpers', () => {
  it('extractCitations', () => { expect(extractCitations('ก [E-1.1-01] ข [E-2.3-12]')).toEqual(['E-1.1-01', 'E-2.3-12']); });
  it('extractNumbers ไม่นับตัวเลขในรหัส [E-…] และตัด comma', () => {
    expect(extractNumbers('มี 1,200 คน [E-1.1-01] ร้อยละ 85.5')).toEqual(['1200', '85.5']);
  });
  it('countWords ไม่นับ citation', () => { expect(countWords('one two three [E-1.1-01]')).toBe(3); });
  it('uncitedSentences', () => {
    expect(uncitedSentences('This sentence is long enough to count. Short [E-1.1-01]')).toHaveLength(1);
  });
});

describe('hash', () => {
  it('sha256 ค่าตรงมาตรฐาน', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('stableStringify ไม่ขึ้นกับลำดับ key', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
  });
});

describe('AI post-check (spec 7.3)', () => {
  const codes = new Set(['E-1.1-01']);
  const ctx = 'ผู้สำเร็จการศึกษา 120 คน ร้อยละ 85.5';
  it('citation ที่มีจริงผ่าน', () => {
    const r = postCheckText('มีผู้สำเร็จการศึกษา 120 คน [E-1.1-01]', { allowedCodes: codes, inputContext: ctx });
    expect(r.result.ok).toBe(true);
    expect(r.text).toContain('[E-1.1-01]');
  });
  it('citation ปลอมถูกตัดออกจากข้อความและติดธง', () => {
    const r = postCheckText('หลักสูตรมีการทบทวนทุกปี [E-9.9-99]', { allowedCodes: codes, inputContext: ctx });
    expect(r.result.ok).toBe(false);
    expect(r.result.removedCitations).toEqual(['E-9.9-99']);
    expect(r.text).not.toContain('E-9.9-99');
    expect(r.result.flaggedSentences).toHaveLength(1);
  });
  it('dropUnsafe ตัดทั้งประโยคที่อ้าง citation ปลอม', () => {
    const r = postCheckText('ประโยคปลอม [E-9.9-99]\nประโยคดี [E-1.1-01]', { allowedCodes: codes, inputContext: ctx, dropUnsafe: true });
    expect(r.text).not.toContain('ประโยคปลอม');
    expect(r.text).toContain('ประโยคดี');
  });
  it('ตัวเลขที่ไม่อยู่ใน input ถูกติดธง', () => {
    const r = postCheckText('มีผู้สำเร็จการศึกษา 999 คน', { allowedCodes: codes, inputContext: ctx });
    expect(r.result.ok).toBe(false);
    expect(r.result.unknownNumbers).toEqual(['999']);
  });
  it('dropUnsafe ตัดประโยคที่มีตัวเลขปลอม', () => {
    const r = postCheckText('ร้อยละ 99 พอใจ\nมี 120 คน', { allowedCodes: codes, inputContext: ctx, dropUnsafe: true });
    expect(r.text).not.toContain('99');
    expect(r.text).toContain('120');
  });
  it('ตัวเลขที่มีใน input ผ่าน (รวมที่มี comma)', () => {
    const r = postCheckText('มี 1,200 คน', { allowedCodes: codes, inputContext: 'จำนวน 1200 คน' });
    expect(r.result.ok).toBe(true);
  });
  it('ข้อความว่างไม่ error', () => {
    expect(postCheckText('', { allowedCodes: codes, inputContext: '' }).result.ok).toBe(true);
  });
});
