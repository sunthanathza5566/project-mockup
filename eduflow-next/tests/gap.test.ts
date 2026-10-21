import { describe, it, expect } from 'vitest';
import {
  ruleR1, ruleR2, ruleR3, ruleR4, ruleR5, ruleR6, ruleR7, ruleR8, ruleR9, ruleR10, computeGaps, readiness,
} from '@/lib/api/gap';
import { gi, req, ev, link, sec, metric, rating } from './helpers';

const R11 = req('1.1');
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('R1 ไม่มีหลักฐานผูก (critical)', () => {
  it('ขึ้นเมื่อไม่มีลิงก์', () => {
    const g = ruleR1(gi({ requirements: [R11] }));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ruleId: 'R1', severity: 'critical', requirementId: '1.1' });
  });
  it('ไม่ขึ้นเมื่อมีหลักฐานผูก', () => {
    expect(ruleR1(gi({ requirements: [R11], evidence: [ev('a')], links: [link('a', '1.1')] }))).toEqual([]);
  });
  it('ลิงก์ที่ชี้หลักฐานไม่มีจริงไม่นับ', () => {
    expect(ruleR1(gi({ requirements: [R11], links: [link('ghost', '1.1')] }))).toHaveLength(1);
  });
});

describe('R2 ขาด Check/Act (high)', () => {
  const base = (stages: ('P' | 'D' | 'C' | 'A')[]) =>
    gi({ requirements: [R11], evidence: stages.map((s, i) => ev('e' + i, { pdcaStage: s })), links: stages.map((_, i) => link('e' + i, '1.1')) });
  it('ขึ้นเมื่อมีแต่ P/D (ขาด Check และ Act)', () => {
    const g = ruleR2(base(['P', 'D']));
    expect(g).toHaveLength(1);
    expect(g[0].severity).toBe('high');
    expect(g[0].messageTh).toContain('Check');
    expect(g[0].messageTh).toContain('Act');
  });
  it('ขึ้นเมื่อขาดเฉพาะ Act', () => {
    const g = ruleR2(base(['P', 'D', 'C']));
    expect(g).toHaveLength(1);
    expect(g[0].messageTh).toContain('Act');
    expect(g[0].messageTh).not.toContain('Check');
  });
  it('ไม่ขึ้นเมื่อมี C และ A ครบ', () => {
    expect(ruleR2(base(['P', 'D', 'C', 'A']))).toEqual([]);
  });
  it('ไม่ขึ้นเมื่อไม่มีหลักฐานเลย (ให้ R1 รายงาน)', () => {
    expect(ruleR2(gi({ requirements: [R11] }))).toEqual([]);
  });
});

describe('R3 trend < 3 ปี (high)', () => {
  const r = req('8.1', { needsTrend: true, relatedMetrics: ['C8.1'] });
  it('ขึ้นเมื่อมีข้อมูล 2 ปี', () => {
    const g = ruleR3(gi({ requirements: [r], metrics: [metric('C8.1', 2567), metric('C8.1', 2568)] }));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ruleId: 'R3', severity: 'high', metricCode: 'C8.1' });
  });
  it('ไม่ขึ้นเมื่อมี 3 ปี', () => {
    expect(ruleR3(gi({ requirements: [r], metrics: [2566, 2567, 2568].map(p => metric('C8.1', p)) }))).toEqual([]);
  });
  it('ปีซ้ำนับเป็นปีเดียว', () => {
    const m = [metric('C8.1', 2567), { ...metric('C8.1', 2567), id: 'dup' }, metric('C8.1', 2568)];
    expect(ruleR3(gi({ requirements: [r], metrics: m }))).toHaveLength(1);
  });
  it('ข้อที่ไม่ needsTrend ไม่ถูกตรวจ', () => {
    expect(ruleR3(gi({ requirements: [req('8.1', { relatedMetrics: ['C8.1'] })] }))).toEqual([]);
  });
});

describe('R4 narrative สั้น/ว่าง (medium)', () => {
  it('ขึ้นเมื่อไม่มี section', () => {
    expect(ruleR4(gi({ requirements: [R11] }))[0].messageTh).toContain('ยังไม่มี narrative');
  });
  it('ขึ้นเมื่อ 99 คำ', () => {
    const g = ruleR4(gi({ requirements: [R11], sections: [sec('1.1', { wordCount: 99 })] }));
    expect(g).toHaveLength(1);
    expect(g[0].severity).toBe('medium');
  });
  it('ไม่ขึ้นเมื่อ 100 คำ', () => {
    expect(ruleR4(gi({ requirements: [R11], sections: [sec('1.1', { wordCount: 100 })] }))).toEqual([]);
  });
  it('เกณฑ์ปรับได้ด้วย minWords', () => {
    expect(ruleR4(gi({ requirements: [R11], sections: [sec('1.1', { wordCount: 50 })], minWords: 50 }))).toEqual([]);
  });
});

describe('R5 หลักฐานเก่ากว่า 3 ปี (medium)', () => {
  const mk = (year: number) => gi({ requirements: [R11], academicYear: 2569, evidence: [ev('a', { academicYear: year })], links: [link('a', '1.1')] });
  it('ขึ้นเมื่อเก่า 4 ปี', () => {
    const g = ruleR5(mk(2565));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ruleId: 'R5', severity: 'medium', evidenceId: 'a' });
  });
  it('ไม่ขึ้นเมื่อเก่า 3 ปีพอดี (ขอบ)', () => { expect(ruleR5(mk(2566))).toEqual([]); });
  it('ไม่ขึ้นเมื่อปีล่าสุด', () => { expect(ruleR5(mk(2569))).toEqual([]); });
});

describe('R6 PII ที่ยังไม่จัดการ (high)', () => {
  const mk = (over: object) => gi({ requirements: [R11], evidence: [ev('a', over)], links: [link('a', '1.1')] });
  it('ขึ้นเมื่อติดธงและยังไม่ resolve', () => {
    const g = ruleR6(mk({ containsPii: true, piiResolved: false }));
    expect(g).toHaveLength(1);
    expect(g[0].severity).toBe('high');
  });
  it('ไม่ขึ้นเมื่อ resolve แล้ว', () => { expect(ruleR6(mk({ containsPii: true, piiResolved: true }))).toEqual([]); });
  it('ไม่ขึ้นเมื่อไม่มี PII', () => { expect(ruleR6(mk({}))).toEqual([]); });
});

describe('R7 curriculum (Phase B)', () => {
  it('ไม่ส่ง curriculum มา = ไม่ตรวจ (คืน []) · เคสจริงดู curriculum.test.ts', () => {
    expect(ruleR7(gi({ requirements: [R11] }))).toEqual([]);
  });
});

describe('R8 ต้อง benchmark (medium)', () => {
  const r = req('8.2', { needsBenchmark: true, relatedMetrics: ['C8.2'] });
  it('ขึ้นเมื่อไม่มี benchmark ทั้ง metric และหลักฐาน', () => {
    const g = ruleR8(gi({ requirements: [r], metrics: [metric('C8.2', 2568)] }));
    expect(g).toHaveLength(1);
    expect(g[0].severity).toBe('medium');
  });
  it('ไม่ขึ้นเมื่อ metric มี benchmarkValue', () => {
    expect(ruleR8(gi({ requirements: [r], metrics: [metric('C8.2', 2568, { benchmarkValue: 80 })] }))).toEqual([]);
  });
  it('ไม่ขึ้นเมื่อหลักฐานที่ผูกพูดถึง benchmark', () => {
    expect(ruleR8(gi({ requirements: [r], evidence: [ev('a', { title: 'ตาราง Benchmark กับสถาบันอื่น' })], links: [link('a', '8.2')] }))).toEqual([]);
  });
  it('ข้อที่ไม่ต้อง benchmark ไม่ถูกตรวจ', () => {
    expect(ruleR8(gi({ requirements: [req('8.2')] }))).toEqual([]);
  });
});

describe('R9 ประโยคไม่อ้างหลักฐาน (low)', () => {
  it('ขึ้นเมื่อมีประโยคยาวไม่มี [E-…]', () => {
    const g = ruleR9(gi({ requirements: [R11], sections: [sec('1.1', { narrativeEn: 'The programme reviews its objectives every year.' })] }));
    expect(g).toHaveLength(1);
    expect(g[0].severity).toBe('low');
  });
  it('ไม่ขึ้นเมื่ออ้าง [E-1.1-01]', () => {
    expect(ruleR9(gi({ requirements: [R11], sections: [sec('1.1', { narrativeEn: 'The programme reviews its objectives every year [E-1.1-01].' })] }))).toEqual([]);
  });
  it('ไม่ขึ้นเมื่อ narrative ว่าง', () => {
    expect(ruleR9(gi({ requirements: [R11], sections: [sec('1.1')] }))).toEqual([]);
  });
});

describe('R10 self-rating สูงแต่หลักฐานไม่พอ (high)', () => {
  it('ขึ้นเมื่อให้ 5 แต่ไม่มีหลักฐาน (R1 เปิด)', () => {
    const g = ruleR10(gi({ requirements: [R11], ratings: [rating('1.1', 5)] }));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ruleId: 'R10', severity: 'high' });
  });
  it('ขึ้นเมื่อให้ 4 (ขอบ) และขาด Check/Act (R2 เปิด)', () => {
    const g = ruleR10(gi({ requirements: [R11], evidence: [ev('a')], links: [link('a', '1.1')], ratings: [rating('1.1', 4)] }));
    expect(g).toHaveLength(1);
  });
  it('ไม่ขึ้นเมื่อให้ 3', () => {
    expect(ruleR10(gi({ requirements: [R11], ratings: [rating('1.1', 3)] }))).toEqual([]);
  });
  it('ไม่ขึ้นเมื่อ R1/R2 ปิดแล้ว (มี PDCA ครบ)', () => {
    const e = [ev('c', { pdcaStage: 'C' }), ev('a', { pdcaStage: 'A' })];
    expect(ruleR10(gi({ requirements: [R11], evidence: e, links: [link('c', '1.1'), link('a', '1.1')], ratings: [rating('1.1', 7)] }))).toEqual([]);
  });
  it('คะแนนกรรมการไม่ถูกนับ', () => {
    expect(ruleR10(gi({ requirements: [R11], ratings: [rating('1.1', 6, 'committee')] }))).toEqual([]);
  });
});

describe('computeGaps / readiness', () => {
  it('เรียง critical ก่อน แล้วตามเลขข้อ', () => {
    const g = computeGaps(gi({ requirements: [req('2.1'), req('1.1')] }));
    expect(g[0].severity).toBe('critical');
    expect(g.filter(x => x.severity === 'critical').map(x => x.requirementId)).toEqual(['1.1', '2.1']);
    const sev = g.map(x => ['critical', 'high', 'medium', 'low'].indexOf(x.severity));
    expect([...sev].sort((a, b) => a - b)).toEqual(sev);
  });
  it('รอบว่าง: 0% และทุกช่อง empty', () => {
    const r = readiness(gi({ requirements: [R11, req('1.2')] }));
    expect(r.percent).toBe(0);
    expect(r.heatmap.every(c => c.level === 'empty')).toBe(true);
  });
  it('ข้อ approved ไม่มี gap = 100 และ level approved', () => {
    const e = [ev('p', { pdcaStage: 'P' }), ev('c', { pdcaStage: 'C' }), ev('a', { pdcaStage: 'A' })];
    const r = readiness(gi({
      requirements: [R11], evidence: e, links: e.map(x => link(x.id, '1.1')),
      sections: [sec('1.1', { status: 'approved', wordCount: 150, narrativeTh: words(1) })],
    }));
    expect(r.heatmap[0].level).toBe('approved');
    expect(r.percent).toBe(100);
  });
  it('มี gap critical ทำให้คะแนนลดครึ่ง', () => {
    const r = readiness(gi({ requirements: [R11], sections: [sec('1.1', { status: 'drafting', wordCount: 150 })] }));
    expect(r.heatmap[0].level).toBe('critical');
    expect(r.heatmap[0].score).toBeLessThan(50);
  });
  it('งานค้างรายคน: นับ open/overdue', () => {
    const r = readiness({
      ...gi({ requirements: [R11, req('1.2')], sections: [sec('1.1', { ownerUserId: 'u1', due: '2020-01-01' }), sec('1.2', { ownerUserId: 'u1', due: '2999-01-01' })] }),
      now: Date.parse('2026-01-01'),
    });
    expect(r.pending[0]).toMatchObject({ userId: 'u1', open: 2, overdue: 1 });
  });
});
