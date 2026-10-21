import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// โหลดโมดูลใหม่ทุกเทสต์ (claude.ts เก็บ cache ความพร้อมของ server 5 นาทีไว้ในตัวแปรโมดูล)
async function load() {
  vi.resetModules();
  const claude = await import('@/lib/api/ai/claude');
  const offline = await import('@/lib/api/ai/offline');
  return { claude: claude.claudeProvider, offline: offline.offlineProvider, shouldUseClaude: claude.shouldUseClaude };
}

const VERB_INPUT = { items: [{ id: 'plo-1', code: 'PLO1', kind: 'plo' as const, textTh: 'อธิบายหลักการ', textEn: 'Explain principles', declaredLevel: 2 }] };
const goodVerbs = (note = 'ตรงระดับ') => ({
  results: [{ id: 'plo-1', code: 'PLO1', kind: 'plo', verbs: ['อธิบาย'], detectedLevels: [2], declaredLevel: 2, measurable: true, levelMatch: true, note, suggestions: [] }],
});

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
function stubFetch(h: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => h(String(url), init));
  vi.stubGlobal('fetch', fn);
  return fn;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Claude provider: fallback เป็น offline เงียบ ๆ', () => {
  let m: Awaited<ReturnType<typeof load>>;
  beforeEach(async () => { m = await load(); });

  it('GET /api/ai คืน 503 (ไม่มี key) -> ใช้ offline, ไม่ยิง POST', async () => {
    const f = stubFetch(() => json({ available: false }, 503));
    const out = await m.claude.checkVerbs(VERB_INPUT);
    expect(out).toEqual(await m.offline.checkVerbs(VERB_INPUT));
    expect(m.claude.model).toBe('offline-deterministic');
    expect(f.mock.calls.every(c => (c[1] as RequestInit).method === 'GET')).toBe(true);
  });

  it('available:false -> offline', async () => {
    stubFetch(() => json({ available: false }));
    await m.claude.checkVerbs(VERB_INPUT);
    expect(m.claude.model).toBe('offline-deterministic');
  });

  it('GET ok แต่ POST คืน 503 -> offline', async () => {
    stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ error: 'x' }, 503)));
    const out = await m.claude.checkVerbs(VERB_INPUT);
    expect(out).toEqual(await m.offline.checkVerbs(VERB_INPUT));
    expect(m.claude.model).toBe('offline-deterministic');
  });

  it('fetch throw (network error) -> offline', async () => {
    stubFetch(() => { throw new Error('network down'); });
    await expect(m.claude.checkVerbs(VERB_INPUT)).resolves.toEqual(await m.offline.checkVerbs(VERB_INPUT));
    expect(m.claude.model).toBe('offline-deterministic');
  });

  it('output รูปแบบผิด (ไม่ผ่าน type guard) -> offline', async () => {
    stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: { results: [{ id: 1 }] }, model: 'claude-sonnet-5-5' })));
    const out = await m.claude.checkVerbs(VERB_INPUT);
    expect(out).toEqual(await m.offline.checkVerbs(VERB_INPUT));
    expect(m.claude.model).toBe('offline-deterministic');
  });

  it('ทุก task ที่ guard ไม่ผ่านจะ fallback (draft/review/tag/summarize)', async () => {
    stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: { nonsense: true } })));
    const req = { id: '1.1', criterionNo: 1, textEn: '', textTh: 't', plainTh: '', suggestedEvidence: [], diagnosticQuestions: [], tipTh: '', relatedMetrics: [], needsBenchmark: false, needsTrend: false };
    const d = await m.claude.draftSar({ requirement: req, language: 'th', evidence: [], metrics: [] });
    expect(d).toEqual(await m.offline.draftSar({ requirement: req, language: 'th', evidence: [], metrics: [] }));
    const s = await m.claude.summarizeCriterion({ criterion: { no: 1, nameTh: 'ก', nameEn: 'a' }, requirements: [] });
    expect(s).toEqual(await m.offline.summarizeCriterion({ criterion: { no: 1, nameTh: 'ก', nameEn: 'a' }, requirements: [] }));
    expect(m.claude.model).toBe('offline-deterministic');
  });

  it('สำเร็จ: ได้ output จาก Claude และ model สะท้อนผู้ตอบจริง; ส่ง header x-aunqa-client', async () => {
    const f = stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: goodVerbs('จาก Claude'), model: 'claude-sonnet-5-5' })));
    const out = await m.claude.checkVerbs(VERB_INPUT);
    expect(out.results[0].note).toBe('จาก Claude');
    expect(m.claude.model).toBe('claude-sonnet-5-5');
    expect(m.claude.promptVersion).toBe('claude-v1');
    const post = f.mock.calls.find(c => (c[1] as RequestInit).method === 'POST')!;
    expect((post[1] as RequestInit).headers).toMatchObject({ 'x-aunqa-client': '1' });
    expect(JSON.parse((post[1] as RequestInit).body as string)).toMatchObject({ task: 'verbs' });
  });

  it('GET ถูก cache (ไม่ถามซ้ำทุกครั้ง) เมื่อมี key', async () => {
    const f = stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: goodVerbs() })));
    await m.claude.checkVerbs(VERB_INPUT); await m.claude.checkVerbs(VERB_INPUT);
    expect(f.mock.calls.filter(c => (c[1] as RequestInit).method === 'GET')).toHaveLength(1);
  });

  it('provider ไม่มีเมธอดให้คะแนน/อนุมัติ (กฎ 7.3)', () => {
    const names = Object.keys(m.claude).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(m.claude)));
    expect(names.filter(n => /score|rate|rating|approve|verdict|grade/i.test(n))).toEqual([]);
  });

  it('shouldUseClaude: false ใน NODE_ENV=test และเมื่อ NEXT_PUBLIC_AI_PROVIDER=offline; true บน browser production', () => {
    stubFetch(() => json({}));
    expect(m.shouldUseClaude()).toBe(false); // vitest => NODE_ENV=test
    vi.stubEnv('NODE_ENV', 'production');
    expect(m.shouldUseClaude()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_AI_PROVIDER', 'offline');
    expect(m.shouldUseClaude()).toBe(false);
  });
});

describe('Claude ผ่าน ai.service: post-check / redact / ai_run ยังทำงานกับ output ของ Claude', () => {
  async function setup() {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production'); // ให้ shouldUseClaude() = true (มี window + fetch)
    const api = await import('@/lib/api');
    const org = await import('@/lib/api/org.store');
    const user = (n: string) => org.getAllUsers().find(u => u.username === n)!;
    await api.resetDemo({ id: 'u-test-admin', username: 'tadmin', password: '', universityId: 'any', email: 't@t.t', fullName: 'T', roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }] });
    return { api, user };
  }

  it('AI-9: Claude ใส่ตัวเลขที่ไม่มีใน input + อ้างรหัสหลักฐานปลอม -> ถูกตัดออก/ติดธง, model = claude, บันทึก ai_run', async () => {
    const { api, user } = await setup();
    const a = user('assess1');
    const reqIds = api.listRequirements(1).map(r => r.id);
    const rid = reqIds[0];
    const claudeOut = {
      summaries: [
        { requirementId: rid, summary: 'อัตราสำเร็จการศึกษา 97.31 เปอร์เซ็นต์ ตาม [E-9.9-99]', strengths: ['มีระบบติดตามที่ดี', 'ผลสำเร็จ 88.77 เปอร์เซ็นต์'], concerns: [] },
        { requirementId: '8.9', summary: 'ข้อที่ไม่อยู่ในเกณฑ์นี้', strengths: [], concerns: [] },
      ],
      questions: [{ group: 'student', items: [
        { w: 'What', requirementId: rid, question: 'ท่านเห็นว่ากระบวนการเป็นอย่างไร' },
        { w: 'How', requirementId: rid, question: 'ผลลัพธ์ 64.55 เปอร์เซ็นต์ได้มาอย่างไร' },
        { w: 'Why', requirementId: '8.9', question: 'ข้อนอกเกณฑ์' },
      ] }],
    };
    stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: claudeOut, model: 'claude-sonnet-5-5' })));
    const run = await api.runAssessorSummary(a, 'cycle-demo-2569', 1);
    expect(run.model).toBe('claude-sonnet-5-5');
    expect(run.promptVersion).toBe('claude-v1');
    const out = run.output as typeof claudeOut;
    const text = JSON.stringify(out);
    expect(text).not.toContain('97.31');
    expect(text).not.toContain('88.77');
    expect(text).not.toContain('64.55');
    expect(text).not.toContain('E-9.9-99');
    expect(out.summaries.every(s => s.requirementId !== '8.9')).toBe(true);
    expect(out.questions[0].items.some(i => i.question.includes('กระบวนการ'))).toBe(true);
    expect(out.questions[0].items.every(i => i.requirementId !== '8.9')).toBe(true);
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.removedCitations).toContain('E-9.9-99');
    expect(run.postCheck.unknownNumbers.length).toBeGreaterThan(0);
    expect(api.listAiRuns(a, { cycleId: 'cycle-demo-2569' }).some(r => r.id === run.id && r.model === 'claude-sonnet-5-5')).toBe(true);
  });

  it('AI-7: Claude ใส่ตัวเลขนอก input -> postCheck ok=false; item ที่ไม่ได้ส่งเข้าไปถูกตัด; PII ถูก redact ก่อนส่ง Claude', async () => {
    const { api, user } = await setup();
    const chair = user('chair1');
    const p = api.createPlo(chair, { programmeId: 'prog-demo-cs', code: 'PLOZ', textTh: 'อธิบายแนวคิด ติดต่อ secret.person@example.com', type: 'generic', bloomLevel: 2 });
    const bad = goodVerbs('บรรลุ 73.19 เปอร์เซ็นต์');
    bad.results[0].id = p.id; bad.results[0].code = 'PLOZ';
    const extra = { ...bad.results[0], id: 'ghost-id', code: 'GHOST' };
    const f = stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ output: { results: [...bad.results, extra] }, model: 'claude-sonnet-5-5' })));
    const run = await api.runVerbChecker(chair, 'prog-demo-cs', [p.id]);
    expect(run.model).toBe('claude-sonnet-5-5');
    expect(run.postCheck.ok).toBe(false);
    expect(run.postCheck.unknownNumbers).toContain('73.19');
    expect((run.output as { results: { id: string }[] }).results.map(r => r.id)).toEqual([p.id]);
    expect(run.redactionCount).toBeGreaterThanOrEqual(1);
    const post = f.mock.calls.find(c => (c[1] as RequestInit).method === 'POST')!;
    expect(String((post[1] as RequestInit).body)).not.toContain('secret.person@example.com');
  });

  it('Claude ล่ม (503) ตอนรัน AI-7 -> run สำเร็จด้วย offline และ model = offline-deterministic', async () => {
    const { api, user } = await setup();
    stubFetch((_u, init) => ((init as RequestInit).method === 'GET' ? json({ available: true }) : json({ error: 'overloaded' }, 503)));
    const run = await api.runVerbChecker(user('chair1'), 'prog-demo-cs');
    expect(run.model).toBe('offline-deterministic');
    expect(run.feature).toBe('AI-7');
    expect((run.output as { results: unknown[] }).results.length).toBeGreaterThan(0);
  });
});
