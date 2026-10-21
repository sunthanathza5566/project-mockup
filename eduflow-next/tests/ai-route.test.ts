import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetAiLimits } from '@/lib/api/ai/ratelimit';
import { GET, POST } from '@/app/api/ai/route';

const KEY = 'sk-ant-SECRET-KEY-VALUE-123';
const HOST = 'app.test';
const VERBS_INPUT = { items: [{ id: 'plo-1', code: 'PLO1', kind: 'plo', textTh: 'อธิบายหลักการ', textEn: 'Explain', declaredLevel: 2 }] };
const goodVerbs = () => ({
  results: [{ id: 'plo-1', code: 'PLO1', kind: 'plo', verbs: ['อธิบาย'], detectedLevels: [2], declaredLevel: 2, measurable: true, levelMatch: true, note: 'ตรงระดับ', suggestions: [] }],
});
const anthropicOk = (obj: unknown) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(obj) }] }), { status: 200, headers: { 'content-type': 'application/json' } });

function mkReq(body: unknown, headers: Record<string, string> = {}, raw = false) {
  return new Request(`http://${HOST}/api/ai`, {
    method: 'POST',
    headers: { host: HOST, 'content-type': 'application/json', 'x-aunqa-client': '1', ...headers },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}
const verbsReq = (extra: Record<string, string> = {}) => mkReq({ task: 'verbs', input: VERBS_INPUT }, extra);

let fetchMock: ReturnType<typeof vi.fn>;
function stubUpstream(h: () => Response | Promise<Response>) {
  fetchMock = vi.fn(async () => h());
  vi.stubGlobal('fetch', fetchMock);
}
async function expectNoSecret(res: Response) {
  const text = await res.clone().text();
  expect(text).not.toContain(KEY);
  expect(text.toLowerCase()).not.toContain('x-api-key');
  expect(JSON.stringify([...res.headers.entries()])).not.toContain(KEY);
}

beforeEach(() => {
  resetAiLimits();
  vi.stubEnv('ANTHROPIC_API_KEY', KEY);
  stubUpstream(() => anthropicOk(goodVerbs()));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('B3 /api/ai GET', () => {
  it('available ตาม key; ไม่เรียก upstream; ไม่เปิดเผย key', async () => {
    const r = await GET();
    expect(await r.clone().json()).toMatchObject({ available: true, model: 'claude-sonnet-5-5' });
    await expectNoSecret(r);
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect((await (await GET()).json()).available).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('B3 /api/ai POST — ด่านป้องกัน', () => {
  it('ไม่มี key -> 503', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const r = await POST(verbsReq());
    expect(r.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('origin ต่าง host -> 403; ไม่มี x-aunqa-client -> 403; ค่าไม่ใช่ 1 -> 403', async () => {
    const cases = [
      verbsReq({ origin: 'http://evil.example' }),
      verbsReq({ 'x-aunqa-client': '' }),
      verbsReq({ 'x-aunqa-client': '0' }),
      verbsReq({ origin: 'not a url' }),
    ];
    for (const c of cases) { const r = await POST(c); expect(r.status).toBe(403); await expectNoSecret(r); }
    const noHeader = new Request(`http://${HOST}/api/ai`, { method: 'POST', headers: { host: HOST }, body: JSON.stringify({ task: 'verbs', input: VERBS_INPUT }) });
    expect((await POST(noHeader)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('origin ตรง host -> ผ่านด่านนี้ (200)', async () => {
    expect((await POST(verbsReq({ origin: `http://${HOST}` }))).status).toBe(200);
  });
  it('content-length เกินเพดาน -> 413', async () => {
    const r = await POST(verbsReq({ 'content-length': String(120_000 * 4 + 1) }));
    expect(r.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('body จริงเกิน 120k ตัวอักษร (ไม่มี content-length ที่ซื่อสัตย์) -> 413', async () => {
    const r = await POST(mkReq(JSON.stringify({ task: 'verbs', input: { pad: 'x'.repeat(130_000) } }), {}, true));
    expect(r.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('input ผิด shape / task ไม่รู้จัก / JSON เสีย -> 400', async () => {
    const bads = [
      mkReq({ task: 'verbs', input: { foo: 1 } }),
      mkReq({ task: 'verbs', input: 'x' }),
      mkReq({ task: 'draft', input: { requirement: {} } }),
      mkReq({ task: 'rm -rf', input: {} }),
      mkReq({ input: VERBS_INPUT }),
      mkReq('null', {}, true),
      mkReq('{not json', {}, true),
    ];
    for (const b of bads) { const r = await POST(b); expect(r.status).toBe(400); await expectNoSecret(r); }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('B3 /api/ai POST — rate limit', () => {
  it('เกินเพดานต่อ IP -> 429 (TRUST_PROXY=1 แยกตาม IP)', async () => {
    vi.stubEnv('TRUST_PROXY', '1'); vi.stubEnv('AI_RATE_PER_IP', '2');
    const s = async (ip: string) => (await POST(verbsReq({ 'x-forwarded-for': ip }))).status;
    expect([await s('9.9.9.1'), await s('9.9.9.1'), await s('9.9.9.1'), await s('9.9.9.2')]).toEqual([200, 200, 429, 200]);
  });
  it('TRUST_PROXY ปิด: ปลอม XFF ต่างกันทุกครั้งก็ยังโดน limit', async () => {
    vi.stubEnv('AI_RATE_PER_IP', '2');
    const s = async (i: number) => (await POST(verbsReq({ 'x-forwarded-for': `10.0.0.${i}` }))).status;
    expect([await s(1), await s(2), await s(3), await s(4)]).toEqual([200, 200, 429, 429]);
  });
  it('เพดานรวม (global) -> 429 แม้คนละ IP', async () => {
    vi.stubEnv('TRUST_PROXY', '1'); vi.stubEnv('AI_RATE_GLOBAL', '2');
    const s = async (ip: string) => (await POST(verbsReq({ 'x-forwarded-for': ip }))).status;
    expect([await s('1.1.1.1'), await s('2.2.2.2'), await s('3.3.3.3')]).toEqual([200, 200, 429]);
  });
  it('งบรายวันหมด -> 429 daily_limit และไม่ยิง upstream เกินงบ', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '1');
    expect((await POST(verbsReq())).status).toBe(200);
    const r = await POST(verbsReq());
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'daily_limit' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('คำขอที่ถูกปฏิเสธก่อนถึง upstream (400) ไม่กินงบรายวัน', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '1');
    expect((await POST(mkReq({ task: 'verbs', input: {} }))).status).toBe(400);
    expect((await POST(verbsReq())).status).toBe(200);
  });
});

describe('B3 /api/ai POST — upstream + สำเร็จ', () => {
  it('upstream คืน non-2xx -> 502 ไม่รั่วข้อความ upstream/key', async () => {
    stubUpstream(() => new Response(JSON.stringify({ error: { type: 'authentication_error', message: `bad key ${KEY}` } }), { status: 401 }));
    const r = await POST(verbsReq());
    expect(r.status).toBe(502);
    const t = await r.clone().text();
    expect(t).not.toContain('authentication_error');
    await expectNoSecret(r);
    for (const c of (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls) expect(JSON.stringify(c)).not.toContain(KEY);
  });
  it('fetch throw (network) -> 502', async () => {
    stubUpstream(() => { throw new Error(`down ${KEY}`); });
    const r = await POST(verbsReq());
    expect(r.status).toBe(502);
    await expectNoSecret(r);
  });
  it('output ไม่ใช่ JSON / ผิด shape -> 502 bad_output', async () => {
    stubUpstream(() => anthropicOk({ results: [{ id: 1 }] }));
    let r = await POST(verbsReq());
    expect(r.status).toBe(502); expect(await r.json()).toEqual({ error: 'bad_output' });
    stubUpstream(() => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ขออภัย ตอบไม่ได้' }] }), { status: 200 }));
    r = await POST(verbsReq());
    expect(r.status).toBe(502);
    stubUpstream(() => new Response(JSON.stringify({}), { status: 200 }));
    expect((await POST(verbsReq())).status).toBe(502);
  });
  it('สำเร็จ -> 200 { output, model }; ยิง upstream ด้วย header/ model/ max_tokens ที่ถูกต้อง; response ไม่มี key', async () => {
    const r = await POST(verbsReq());
    expect(r.status).toBe(200);
    const j = await r.clone().json();
    expect(j).toEqual({ output: goodVerbs(), model: 'claude-sonnet-5-5' });
    await expectNoSecret(r);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe(KEY); // ใช้ฝั่ง server เท่านั้น
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ model: 'claude-sonnet-5-5', max_tokens: 3072 });
  });
  it('PII ใน input ถูก redact ก่อนถึง upstream', async () => {
    const input = { items: [{ ...VERBS_INPUT.items[0], textTh: 'ติดต่อ secret.person@example.com โทร 081-234-5678 บัตร 1101700203450' }] };
    const r = await POST(mkReq({ task: 'verbs', input }));
    expect(r.status).toBe(200);
    const body = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).not.toContain('secret.person@example.com');
    expect(body).not.toContain('081-234-5678');
    expect(body).not.toContain('1101700203450');
  });
});
