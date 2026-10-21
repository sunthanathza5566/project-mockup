import { describe, it, expect, afterEach, vi } from 'vitest';
import { KEYS, load, save } from '@/lib/api/db';
import type { AppUser } from '@/lib/types';
import { CYCLE, driveToAssessment, freshSeededDemo, user } from './helpers';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function stubClaude(output: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) =>
    ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output, model: 'claude-sonnet-5-5' }))));
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function loadApi() {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production'); // shouldUseClaude() = true
  const api = await import('@/lib/api');
  const org = await import('@/lib/api/org.store');
  const helpers = await import('./helpers');
  return { api, user: (n: string) => org.getAllUsers().find(u => u.username === n)!, helpers };
}

describe('B4: Claude ให้คะแนน/ตัดสิน -> ถูกตัด + postCheck.ok=false', () => {
  it('AI-9: ประโยคให้คะแนน/verdict ใน summary, strengths, concerns, questions ถูกตัด', async () => {
    const { api, user: u, helpers } = await loadApi();
    await helpers.freshSeededDemo();
    const rid = api.listRequirements(1)[0].id;
    stubClaude({
      summaries: [{
        requirementId: rid,
        summary: 'หลักสูตรมีระบบติดตามผลที่ชัดเจน. ควรได้ระดับ 5 ในข้อนี้. Verdict: adequate.',
        strengths: ['มีการประชุมสม่ำเสมอ', 'ให้คะแนน 6 สำหรับข้อนี้'],
        concerns: ['ข้อนี้ไม่ผ่านเกณฑ์'],
      }],
      questions: [{ group: 'student', items: [
        { w: 'What', requirementId: rid, question: 'ท่านเห็นว่ากระบวนการเป็นอย่างไร' },
        { w: 'Why', requirementId: rid, question: 'ทำไมจึงควรให้คะแนนสูง' },
      ] }],
    });
    const run = await api.runAssessorSummary(u('assess1'), CYCLE, 1);
    expect(run.model).toBe('claude-sonnet-5-5');
    const text = JSON.stringify(run.output);
    expect(text).toContain('หลักสูตรมีระบบติดตามผลที่ชัดเจน');
    expect(text).toContain('มีการประชุมสม่ำเสมอ');
    expect(text).toContain('กระบวนการเป็นอย่างไร');
    expect(text).not.toMatch(/ระดับ 5|adequate|คะแนน|ไม่ผ่านเกณฑ์/i);
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.flaggedSentences.length).toBeGreaterThanOrEqual(4);
  });

  it('AI-3: ประโยคตัดสินใน unanswered/suggestions ถูกตัด; ประโยคปกติคงอยู่', async () => {
    const { api, user: u, helpers } = await loadApi();
    await helpers.freshSeededDemo();
    stubClaude({
      unanswered: ['ยังไม่ระบุผู้รับผิดชอบ', 'ข้อนี้ไม่ผ่านเกณฑ์'],
      uncitedSentences: [],
      suggestions: ['เพิ่มหลักฐานการประชุม', 'ควรได้ระดับ 4 หากเพิ่มหลักฐาน'],
    });
    const run = await api.runSarReviewer(u('chair1'), CYCLE, '1.1');
    expect(run.feature).toBe('AI-3');
    expect(run.model).toBe('claude-sonnet-5-5');
    const out = run.output as { unanswered: string[]; suggestions: string[] };
    expect(out.unanswered).toEqual(['ยังไม่ระบุผู้รับผิดชอบ']);
    expect(out.suggestions).toEqual(['เพิ่มหลักฐานการประชุม']);
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.flaggedSentences).toEqual(expect.arrayContaining(['ข้อนี้ไม่ผ่านเกณฑ์', 'ควรได้ระดับ 4 หากเพิ่มหลักฐาน']));
  });

  it('AI-3: output สะอาด -> ไม่ถูกตัด (ไม่ false positive)', async () => {
    const { api, user: u, helpers } = await loadApi();
    await helpers.freshSeededDemo();
    stubClaude({ unanswered: ['ยังไม่ระบุผู้รับผิดชอบ'], uncitedSentences: [], suggestions: ['เพิ่มหลักฐานการประชุม'] });
    const run = await api.runSarReviewer(u('chair1'), CYCLE, '1.1');
    const out = run.output as { unanswered: string[]; suggestions: string[] };
    expect(out.unanswered).toEqual(['ยังไม่ระบุผู้รับผิดชอบ']);
    expect(out.suggestions).toEqual(['เพิ่มหลักฐานการประชุม']);
  });
});

describe('B4 bug: ภาษาไทยไม่มีช่องว่างหลังคำตัดสิน', () => {
  it('stripJudgement ต้องตัด "ไม่ผ่านเกณฑ์ข้อนี้" — BUG-0001-B4-1', async () => {
    const { stripJudgement } = await import('@/lib/api/ai/postcheck');
    expect(stripJudgement('ไม่ผ่านเกณฑ์ข้อนี้').removed).toHaveLength(1);
    expect(stripJudgement('หลักสูตรไม่ผ่านเกณฑ์มาตรฐานในข้อ 3').removed).toHaveLength(1);
  });
});

describe('B8: หลายกรรมการในรอบเดียว — ปิดได้เมื่อ "ทุกคน" ครบ', () => {
  it('คนแรกครบ 8 เกณฑ์ + verdict แต่คนที่สองยังไม่ครบ -> ปิดไม่ได้ (ระบุชื่อคนที่รอ); ครบทั้งคู่ -> ปิดได้', async () => {
    const api = await import('@/lib/api');
    await driveToAssessment();
    const a1 = user('assess1');
    const a2: AppUser = { ...a1, id: 'u-assess-2', username: 'assess2', fullName: 'กรรมการสอง', email: 'a2@t.t', roles: [{ role: 'assessor', scopeType: 'cycle', scopeId: CYCLE }] };
    save(KEYS.users, [...load<AppUser>(KEYS.users), a2]);

    for (let n = 1; n <= 8; n++) api.setCriterionRating(a1, CYCLE, n, 4);
    api.setVerdict(a1, CYCLE, 4);
    for (let n = 1; n <= 5; n++) api.setCriterionRating(a2, CYCLE, n, 4); // ขาด 6,7,8

    const err = await api.transitionCycle(a1, CYCLE, 'assessed').catch(e => e);
    expect(err).toMatchObject({ code: 'invalid' });
    expect(err.message).toContain('กรรมการสอง');
    expect(err.message).toContain('ขาด 3 เกณฑ์');
    expect(JSON.stringify(err.detail)).toContain('กรรมการสอง');
    expect(err.detail.waitingFor).toEqual([{ name: 'กรรมการสอง', missingCriteria: [6, 7, 8] }]);
    expect(api.getCycle(a1, CYCLE).status).toBe('under_assessment');

    for (let n = 6; n <= 8; n++) api.setCriterionRating(a2, CYCLE, n, 5);
    expect((await api.transitionCycle(a1, CYCLE, 'assessed')).status).toBe('assessed');
  });

  it('กรรมการสองครบ 8 แต่ไม่มี verdict เลย -> ปิดไม่ได้ (hasVerdict=false)', async () => {
    const api = await import('@/lib/api');
    await freshSeededDemo(); // ไม่เกี่ยวกับ state เดิม — เดินใหม่
    await driveToAssessment();
    const a1 = user('assess1');
    for (let n = 1; n <= 8; n++) api.setCriterionRating(a1, CYCLE, n, 4);
    const err = await api.transitionCycle(a1, CYCLE, 'assessed').catch(e => e);
    expect(err).toMatchObject({ code: 'invalid' });
    expect(err.detail.hasVerdict).toBe(false);
  });
});
