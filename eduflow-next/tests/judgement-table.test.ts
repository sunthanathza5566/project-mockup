import { describe, it, expect } from 'vitest';
import { stripJudgement } from '@/lib/api/ai/postcheck';

// ตาราง "ต้องตัด" — คำตัดสิน/ให้คะแนน (รวมตัวอย่างที่ reviewer เจอว่าเลี่ยงได้ R2-1)
const MUST_STRIP = [
  'ข้อนี้ไม่ผ่านเกณฑ์',
  'ไม่ผ่านเกณฑ์ข้อนี้',
  'ข้อนี้ไม่ผ่าน',
  'ข้อนี้ไม่ผ่าน.',
  'ข้อนี้ไม่ผ่าน!',
  'ผ่านการประเมินจากหลักฐานที่แนบ',
  'ควรได้ระดับ 4',
  'ได้ระดับ 5',
  'ระดับ 5',
  'ระดับ 5.',
  'อยู่ในระดับที่ 5',
  'อยู่ในระดับ ๕',
  'ให้คะแนน 4 สำหรับข้อนี้',
  'คะแนนเกณฑ์นี้คือ 3',
  'ควรให้คะแนนสูง',
  'หลักฐานเพียงพอ',
  'หลักฐานไม่เพียงพอ',
  'ข้อมูลเพียงพอตามที่คาดหวัง',
  'ถือว่าผ่าน',
  'ถือว่าไม่ผ่าน',
  'ผ่านตามเกณฑ์',
  'เป็นไปตามเกณฑ์',
  'ไม่เป็นไปตามเกณฑ์',
  'This criterion is adequate.',
  'The evidence is inadequate for this requirement.',
  'Verdict: satisfactory',
  'I would give a score of 4',
  'Rating 5 for this item',
];

// ตาราง "ต้องไม่ตัด" — ข้อเท็จจริง/ถ้อยคำปกติ (R2-2)
const MUST_KEEP = [
  'ความพึงพอใจอยู่ในระดับ 4.51 จาก 5',
  'ผลประเมินความพึงพอใจ 4.21 คะแนน',
  'ความพึงพอใจอยู่ในระดับ 4 จาก 5',
  'คะแนนเฉลี่ย 4.2',
  'ได้คะแนนความพึงพอใจ 4.21',
  'ผู้เรียนได้คะแนนเฉลี่ย 3.8',
  'เผยแพร่ผ่านเว็บไซต์ของคณะ',
  'ผ่านการประชุมคณะกรรมการหลักสูตรเมื่อปี 2568',
  'งบประมาณเพียงพอสำหรับโครงการ',
  'อาจารย์ประจำมี 12 คน',
  'The average satisfaction score was 4.21 out of 5',
  'Satisfaction rating of 4.5 from survey',
  'Graduates passed through the programme in 2024',
  'จัดอบรมให้อาจารย์ใหม่ทุกภาคการศึกษา [E-1.1-01]',
  'หลักสูตรปรับปรุงตามผลสำรวจผู้ใช้บัณฑิต',
  'มีการประชุมระดับคณะ 4 ครั้ง',
  'อัตราการสำเร็จการศึกษา 85.5 เปอร์เซ็นต์',
];

describe('stripJudgement — ตารางต้องตัด', () => {
  it('มีอย่างน้อย 15 ประโยค', () => expect(MUST_STRIP.length).toBeGreaterThanOrEqual(15));
  it.each(MUST_STRIP)('ตัด: %s', s => {
    const r = stripJudgement(s);
    expect(r.removed.length).toBeGreaterThan(0);
    expect(r.text).toBe('');
  });
});

describe('stripJudgement — ตารางต้องไม่ตัด', () => {
  it('มีอย่างน้อย 15 ประโยค', () => expect(MUST_KEEP.length).toBeGreaterThanOrEqual(15));
  it.each(MUST_KEEP)('คง: %s', s => {
    const r = stripJudgement(s);
    expect(r.removed).toEqual([]);
    expect(r.text).toBe(s);
  });
});

describe('stripJudgement — ตัดเฉพาะอนุประโยค ไม่ทั้งย่อหน้า', () => {
  it('ย่อหน้าไทยไม่มีจุด: ข้อเท็จจริงยังอยู่ คำตัดสินหาย', () => {
    const r = stripJudgement('หลักฐานไม่เพียงพอ ความพึงพอใจอยู่ในระดับ 4.51 จาก 5 มีอาจารย์ 12 คน');
    expect(r.text).toContain('4.51');
    expect(r.text).toContain('12 คน');
    expect(r.text).not.toContain('ไม่เพียงพอ');
    expect(r.removed).toEqual(['หลักฐานไม่เพียงพอ']);
  });
  it('หลายบรรทัด/หลายประโยค', () => {
    const r = stripJudgement('มีการประชุม 4 ครั้ง ข้อนี้ผ่านตามเกณฑ์\nคะแนนเฉลี่ย 4.2');
    expect(r.text).toBe('มีการประชุม 4 ครั้ง\nคะแนนเฉลี่ย 4.2');
  });
});
