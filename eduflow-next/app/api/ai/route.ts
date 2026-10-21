/**
 * AI proxy (Claude) — Route Handler ฝั่ง server
 *  GET  /api/ai  → { available: boolean, model: string }  (มี ANTHROPIC_API_KEY หรือไม่ + model ที่ใช้; ไม่เรียก Anthropic)
 *  POST /api/ai  → { task, input } แล้วเรียก Anthropic Messages API; ไม่มี key → 503
 *
 * ข้อจำกัด MVP: RBAC ของแอปอยู่ฝั่ง browser (localStorage) server ตรวจตัวตนผู้ใช้ไม่ได้
 * จึงป้องกันด้วย (ทุกชั้นไม่ขึ้นกับค่าที่ client ตั้งเองได้):
 *  - same-origin + header x-aunqa-client (กัน cross-site เท่านั้น — curl ใส่เองได้)
 *  - rate limit ต่อ IP (เชื่อ x-forwarded-for เมื่อ TRUST_PROXY=1 เท่านั้น) + เพดานรวมต่อนาที + งบรายวัน (lib/api/ai/ratelimit.ts)
 *  - จำกัดขนาด body (content-length + อ่านแบบ stream ตัดเมื่อเกิน) · ตรวจ shape ของ input ต่อ task · max_tokens ต่อ task
 *  - ตรวจ shape ของ output ก่อนคืน (ไม่ผ่าน → 502 bad_output) · redact PII ซ้ำฝั่ง server
 *  - error ไม่คืนรายละเอียดภายใน/ข้อความจาก upstream · ห้าม log key/ข้อความของผู้ใช้
 * env: ANTHROPIC_API_KEY, CLAUDE_MODEL, TRUST_PROXY, AI_RATE_PER_IP, AI_RATE_GLOBAL, AI_DAILY_LIMIT
 * TODO(Phase B+): ตรวจ session จริงเมื่อย้าย auth ไป server
 */
import { NextResponse } from 'next/server';
import { redactDeep } from '@/lib/api/ai/redact';
import {
  AI_TASKS, buildPrompt, extractJsonObject, getClaudeModel, type AiTask,
} from '@/lib/api/ai/prompts';
import { MAX_TOKENS, inputGuards, outputGuards } from '@/lib/api/ai/guards';
import { clientKey, dailyExhausted, rateLimited } from '@/lib/api/ai/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 120_000;
const UPSTREAM_TIMEOUT_MS = 60_000;

/** อ่าน body เป็นข้อความโดยตัดทันทีเมื่อเกิน MAX_BODY_CHARS (ไม่กินหน่วยความจำก้อนใหญ่) · null = เกินขนาด */
async function readBodyLimited(req: Request): Promise<string | null> {
  const len = Number(req.headers.get('content-length'));
  if (Number.isFinite(len) && len > MAX_BODY_CHARS * 4) return null; // UTF-8 ไม่เกิน 4 byte/ตัวอักษร
  if (!req.body) return '';
  const reader = req.body.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
    if (out.length > MAX_BODY_CHARS) { await reader.cancel().catch(() => undefined); return null; }
  }
  return out + dec.decode();
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true; // same-origin fetch บาง browser ไม่ส่ง Origin ใน GET; POST ต้องมี header x-aunqa-client เพิ่ม
  try { return !!host && new URL(origin).host === host; } catch { return false; }
}

export async function GET() {
  return NextResponse.json({ available: !!process.env.ANTHROPIC_API_KEY, model: getClaudeModel() });
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'ai_unavailable' }, { status: 503 });
  if (!sameOrigin(req) || req.headers.get('x-aunqa-client') !== '1') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (rateLimited(clientKey(req))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { task?: unknown; input?: unknown };
  try {
    const raw = await readBodyLimited(req);
    if (raw === null) return NextResponse.json({ error: 'too_large' }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || typeof body.task !== 'string' || !AI_TASKS.includes(body.task as AiTask))
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const task = body.task as AiTask;
  if (!inputGuards[task](body.input)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  // redact ซ้ำฝั่ง server (client ควร redact มาแล้ว)
  const safeInput = redactDeep(body.input).value;
  const { system, user } = buildPrompt(task, safeInput);
  const model = getClaudeModel();
  if (dailyExhausted()) return NextResponse.json({ error: 'daily_limit' }, { status: 429 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS[task], system, messages: [{ role: 'user', content: user }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // log เฉพาะ status + ชนิด error ของ Anthropic (ไม่มี key/ข้อความผู้ใช้) เพื่อให้รู้ว่า model/key ผิด
      const errType = await res.json().then((j: { error?: { type?: unknown } }) => (typeof j?.error?.type === 'string' ? j.error.type.slice(0, 60) : 'unknown')).catch(() => 'unknown');
      console.error('[ai] upstream status', res.status, 'type', errType, 'model', model);
      return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('');
    const output = extractJsonObject(text);
    if (!output || !outputGuards[task](output)) return NextResponse.json({ error: 'bad_output' }, { status: 502 });
    return NextResponse.json({ output, model });
  } catch (e) {
    console.error('[ai] upstream failed', e instanceof Error ? e.name : 'unknown');
    return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
