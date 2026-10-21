import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stripJudgement } from '@/lib/api/ai/postcheck';
import { clientKey, dailyExhausted, rateLimited, resetAiLimits } from '@/lib/api/ai/ratelimit';
import { inputGuards, outputGuards } from '@/lib/api/ai/guards';
import { getClaudeModel } from '@/lib/api/ai/prompts';

describe('stripJudgement (B4)', () => {
  it('ตัดประโยคที่ให้คะแนน/ตัดสิน คงประโยคปกติ', () => {
    const r = stripJudgement('หลักสูตรมีการติดตามผล. ควรได้ระดับ 5 ในข้อนี้. ไม่ผ่านเกณฑ์. Verdict: adequate. มีหลักฐานครบ');
    expect(r.text).toContain('หลักสูตรมีการติดตามผล');
    expect(r.text).toContain('มีหลักฐานครบ');
    expect(r.text).not.toMatch(/ระดับ 5|ไม่ผ่านเกณฑ์|adequate/i);
    expect(r.removed.length).toBe(3);
  });
  it('ไม่ตัดคำว่า ผ่านการอนุมัติ', () => {
    expect(stripJudgement('แผนผ่านการอนุมัติจากสภา').removed).toHaveLength(0);
  });
});

describe('ratelimit (B1)', () => {
  beforeEach(() => { resetAiLimits(); vi.unstubAllEnvs(); });
  it('ไม่เชื่อ x-forwarded-for ถ้าไม่ตั้ง TRUST_PROXY', () => {
    const req = new Request('http://x/', { headers: { 'x-forwarded-for': '1.2.3.4' } });
    expect(clientKey(req)).toBe('untrusted');
    vi.stubEnv('TRUST_PROXY', '1');
    expect(clientKey(req)).toBe('1.2.3.4');
  });
  it('เพดานรวมต่อนาทีไม่ขึ้นกับ IP', () => {
    vi.stubEnv('AI_RATE_GLOBAL', '3');
    expect([1, 2, 3, 4].map(i => rateLimited(`ip${i}`))).toEqual([false, false, false, true]);
  });
  it('เพดานต่อ IP และงบรายวัน', () => {
    vi.stubEnv('AI_RATE_PER_IP', '2'); vi.stubEnv('AI_DAILY_LIMIT', '2');
    expect([rateLimited('a'), rateLimited('a'), rateLimited('a'), rateLimited('b')]).toEqual([false, false, true, false]);
    expect([dailyExhausted(), dailyExhausted(), dailyExhausted()]).toEqual([false, false, true]);
  });
});

describe('guards + model (B1/B10)', () => {
  it('input/output guard ต่อ task', () => {
    expect(inputGuards.verbs({ items: [{ id: 'a', code: 'PLO1', kind: 'plo', textTh: 'x', declaredLevel: 3 }] })).toBe(true);
    expect(inputGuards.verbs({ foo: 1 })).toBe(false);
    expect(inputGuards.draft('x')).toBe(false);
    expect(outputGuards.draft({ draft: 'a', missing: [], usedEvidence: [] })).toBe(true);
    expect(outputGuards.draft({ anything: 1 })).toBe(false);
  });
  it('model อ่านจาก env CLAUDE_MODEL, default claude-sonnet-5-5', () => {
    vi.unstubAllEnvs();
    expect(getClaudeModel()).toBe('claude-sonnet-5-5');
    vi.stubEnv('CLAUDE_MODEL', 'claude-test-1');
    expect(getClaudeModel()).toBe('claude-test-1');
    vi.stubEnv('CLAUDE_MODEL', 'bad model!');
    expect(getClaudeModel()).toBe('claude-sonnet-5-5');
    vi.unstubAllEnvs();
  });
});
