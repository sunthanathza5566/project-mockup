/**
 * TASK-0003 S6 — security S-2 (กรอง href ลิงก์เชิญ) / S-3 (TTL 10 นาที + ลิงก์อ่านได้ครั้งเดียว)
 * ของ lib/ui/scenario-summary.ts — ใช้ take(now) แทนการ mock นาฬิกา
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearScenarioSummary, saveScenarioSummary, takeScenarioSummary, SCENARIO_SUMMARY_KEY, SCENARIO_SUMMARY_TTL_MS,
  type ScenarioSummary,
} from '@/lib/ui/scenario-summary';
import type { ScenarioLink } from '@/lib/mock-data/aunqa/scenarios';

const NOW = 1_000_000_000_000;
const GOOD = '/invite#t=' + 'Ab-_'.repeat(10) + 'xyz'; // 43 ตัว base64url
const sum = (links: ScenarioLink[], at = NOW, over: Partial<ScenarioSummary> = {}): ScenarioSummary =>
  ({ kind: 'one', cases: [{ id: 'user-invited', titleTh: 't', accounts: [], paths: [], expectTh: [] }], links, ms: 1, at, ...over });
const raw = () => sessionStorage.getItem(SCENARIO_SUMMARY_KEY);

beforeEach(() => sessionStorage.clear());

describe('S-2 href allowlist', () => {
  it('TTL = 10 นาที และ GOOD เป็นรูป token 43 ตัว', () => {
    expect(SCENARIO_SUMMARY_TTL_MS).toBe(10 * 60 * 1000);
    expect(GOOD.split('#t=')[1]).toHaveLength(43);
  });

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['token 44 ตัว', '/invite#t=' + 'A'.repeat(44)],
    ['token 42 ตัว', '/invite#t=' + 'A'.repeat(42)],
    ['protocol-relative //evil', '//evil.example/invite#t=' + 'A'.repeat(43)],
    ['absolute https', 'https://evil.example/invite#t=' + 'A'.repeat(43)],
    ['อักขระนอก base64url', '/invite#t=' + 'A'.repeat(42) + '"'],
    ['path อื่น', '/login#t=' + 'A'.repeat(43)],
    ['ต่อท้ายหลัง token', GOOD + '&x=1'],
    ['ขึ้นบรรทัดใหม่ท้าย', GOOD + '\n'],
  ])('ตัดทิ้ง: %s', (_n, href) => {
    saveScenarioSummary(sum([{ labelTh: 'bad', href }, { labelTh: 'good', href: GOOD }]));
    expect(takeScenarioSummary(NOW + 1000)!.links.map(l => l.href)).toEqual([GOOD]);
  });

  it('ตัด link ที่ labelTh / href ไม่ใช่ string หรือเป็น null', () => {
    saveScenarioSummary(sum([
      { labelTh: 1 as unknown as string, href: GOOD }, { labelTh: 'x', href: 5 as unknown as string },
      null as unknown as ScenarioLink, { labelTh: 'ok', href: GOOD },
    ]));
    expect(takeScenarioSummary(NOW)!.links).toEqual([{ labelTh: 'ok', href: GOOD }]);
  });
});

describe('S-3 อ่านลิงก์ได้ครั้งเดียว + หมดอายุ', () => {
  it('อ่านครั้งแรกได้ลิงก์ แล้วลิงก์ถูกลบจาก storage (ส่วนเคสยังอยู่) · ครั้งที่สอง links = []', () => {
    saveScenarioSummary(sum([{ labelTh: 'g', href: GOOD }, { labelTh: 'x', href: 'javascript:alert(1)' }]));
    const a = takeScenarioSummary(NOW + 1000)!;
    expect(a.links).toEqual([{ labelTh: 'g', href: GOOD }]);
    expect(raw()).not.toContain('/invite#t=');
    expect(raw()).not.toContain('javascript');
    const b = takeScenarioSummary(NOW + 2000)!;
    expect(b.links).toEqual([]);
    expect(b.cases.map(c => c.id)).toEqual(['user-invited']);
  });

  it('เกิน 10 นาที → null และลบทั้งก้อน (รวมลิงก์ที่ยังไม่ถูกอ่าน)', () => {
    saveScenarioSummary(sum([{ labelTh: 'g', href: GOOD }]));
    expect(takeScenarioSummary(NOW + SCENARIO_SUMMARY_TTL_MS + 1)).toBeNull();
    expect(raw()).toBeNull();
  });

  it('ขอบ: อายุ = 10 นาทีพอดี ยังอ่านได้', () => {
    saveScenarioSummary(sum([]));
    expect(takeScenarioSummary(NOW + SCENARIO_SUMMARY_TTL_MS)).not.toBeNull();
  });

  it('at อยู่ในอนาคต → null และลบ', () => {
    saveScenarioSummary(sum([{ labelTh: 'g', href: GOOD }], NOW + 5000));
    expect(takeScenarioSummary(NOW)).toBeNull();
    expect(raw()).toBeNull();
  });

  it('at ไม่ใช่ตัวเลข / JSON เสีย / รูปไม่ครบ → null', () => {
    sessionStorage.setItem(SCENARIO_SUMMARY_KEY, JSON.stringify({ ...sum([]), at: 'x' }));
    expect(takeScenarioSummary(NOW)).toBeNull();
    expect(raw()).toBeNull();
    sessionStorage.setItem(SCENARIO_SUMMARY_KEY, '{not json');
    expect(takeScenarioSummary(NOW)).toBeNull();
    sessionStorage.setItem(SCENARIO_SUMMARY_KEY, JSON.stringify({ kind: 'one', at: NOW }));
    expect(takeScenarioSummary(NOW)).toBeNull();
  });

  it('ไม่มีสรุป → null · clearScenarioSummary ลบ', () => {
    expect(takeScenarioSummary(NOW)).toBeNull();
    saveScenarioSummary(sum([]));
    clearScenarioSummary();
    expect(raw()).toBeNull();
  });

  it('ค่า default ของ now = Date.now(): สรุปที่เพิ่งบันทึกอ่านได้', () => {
    saveScenarioSummary(sum([{ labelTh: 'g', href: GOOD }], Date.now()));
    expect(takeScenarioSummary()!.links).toHaveLength(1);
  });
});
