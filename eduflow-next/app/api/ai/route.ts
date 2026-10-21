/**
 * AI proxy (Claude) — Route Handler ฝั่ง server
 *  GET  /api/ai  → { available: boolean }  (มี ANTHROPIC_API_KEY หรือไม่; ไม่เรียก Anthropic)
 *  POST /api/ai  → { task, input } แล้วเรียก Anthropic Messages API; ไม่มี key → 503
 *
 * ข้อจำกัด MVP: RBAC ของแอปอยู่ฝั่ง browser (localStorage) server ตรวจตัวตนผู้ใช้ไม่ได้
 * จึงป้องกันด้วย: same-origin + header x-aunqa-client (กัน cross-site) · rate limit ต่อ IP · จำกัดขนาด body ·
 * redact PII ซ้ำฝั่ง server (defense in depth) · error ไม่คืนรายละเอียดภายใน/ข้อความจาก upstream
 * ห้าม log key/ข้อความของผู้ใช้
 * TODO(Phase B+): ตรวจ session จริงเมื่อย้าย auth ไป server
 */
import { NextResponse } from 'next/server';
import { redactDeep } from '@/lib/api/ai/redact';
import {
  AI_TASKS, CLAUDE_MODEL, buildPrompt, extractJsonObject, type AiTask,
} from '@/lib/api/ai/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 120_000;
const RATE_LIMIT = 20;            // ครั้งต่อนาทีต่อ IP
const UPSTREAM_TIMEOUT_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true; // same-origin fetch บาง browser ไม่ส่ง Origin ใน GET; POST ต้องมี header x-aunqa-client เพิ่ม
  try { return !!host && new URL(origin).host === host; } catch { return false; }
}

export async function GET() {
  return NextResponse.json({ available: !!process.env.ANTHROPIC_API_KEY, model: CLAUDE_MODEL });
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'ai_unavailable' }, { status: 503 });
  if (!sameOrigin(req) || req.headers.get('x-aunqa-client') !== '1') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { task?: unknown; input?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: 'too_large' }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (typeof body.task !== 'string' || !AI_TASKS.includes(body.task as AiTask) || !body.input || typeof body.input !== 'object')
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  // redact ซ้ำฝั่ง server (client ควร redact มาแล้ว)
  const safeInput = redactDeep(body.input).value;
  const { system, user } = buildPrompt(body.task as AiTask, safeInput);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error('[ai] upstream status', res.status);
      return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('');
    const output = extractJsonObject(text);
    if (!output) return NextResponse.json({ error: 'bad_output' }, { status: 502 });
    return NextResponse.json({ output, model: CLAUDE_MODEL });
  } catch (e) {
    console.error('[ai] upstream failed', e instanceof Error ? e.name : 'unknown');
    return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
