/**
 * Claude provider (ฝั่ง client) — เรียก POST /api/ai (Route Handler ถือ ANTHROPIC_API_KEY ฝั่ง server)
 * input ที่เข้ามาถูก redact แล้วโดย ai.service ก่อนเสมอ · output ผ่าน type-guard แล้ว post-check ที่ ai.service
 * ไม่มี key / 503 / error / output รูปแบบผิด → fallback ไปใช้ offlineProvider อัตโนมัติ (ทำงานได้เสมอ)
 * ไม่มีเมธอดให้คะแนน/อนุมัติ (กฎ 7.3)
 */
import { DEFAULT_CLAUDE_MODEL, CLAUDE_PROMPT_VERSION, type AiTask } from './prompts';
import { offlineProvider } from './offline';
import { outputGuards } from './guards';
import type {
  AiProvider, DraftOutput, ReviewOutput, SummaryOutput, TagOutput, VerbOutput,
} from './provider';

const AVAIL_TTL_MS = 5 * 60_000;
let availability: { ok: boolean; at: number } | null = null;
let last = { model: offlineProvider.model, promptVersion: offlineProvider.promptVersion };

/** ถามครั้งเดียวต่อ 5 นาทีว่า server มี key ไหม (GET ไม่เรียก Anthropic) */
async function serverHasKey(): Promise<boolean> {
  if (availability && Date.now() - availability.at < AVAIL_TTL_MS) return availability.ok;
  let ok = false;
  try {
    const r = await fetch('/api/ai', { method: 'GET', cache: 'no-store' });
    ok = r.ok && ((await r.json()) as { available?: boolean }).available === true;
  } catch { ok = false; }
  availability = { ok, at: Date.now() };
  return ok;
}

async function viaClaude<T>(task: AiTask, input: unknown, fallback: () => Promise<T>): Promise<T> {
  try {
    if (!(await serverHasKey())) throw new Error('no key');
    const res = await fetch('/api/ai', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-aunqa-client': '1' },
      body: JSON.stringify({ task, input }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { output?: unknown; model?: string };
    if (!outputGuards[task](data.output)) throw new Error('bad output');
    last = { model: data.model ?? DEFAULT_CLAUDE_MODEL, promptVersion: CLAUDE_PROMPT_VERSION };
    return data.output as T;
  } catch {
    if (availability) availability = { ok: false, at: Date.now() }; // พักการลองซ้ำช่วงหนึ่ง
    last = { model: offlineProvider.model, promptVersion: offlineProvider.promptVersion };
    return fallback();
  }
}

/** model / promptVersion สะท้อนผู้ให้บริการที่ตอบจริงในการเรียกล่าสุด (ai.service อ่านหลังเรียก เพื่อบันทึก ai_run) */
export const claudeProvider: AiProvider = {
  id: 'claude-with-offline-fallback',
  get model() { return last.model; },
  get promptVersion() { return last.promptVersion; },
  tagEvidence: i => viaClaude<TagOutput>('tag', i, () => offlineProvider.tagEvidence(i)),
  draftSar: i => viaClaude<DraftOutput>('draft', i, () => offlineProvider.draftSar(i)),
  reviewSar: i => viaClaude<ReviewOutput>('review', i, () => offlineProvider.reviewSar(i)),
  checkVerbs: i => viaClaude<VerbOutput>('verbs', i, () => offlineProvider.checkVerbs(i)),
  summarizeCriterion: i => viaClaude<SummaryOutput>('summarize', i, () => offlineProvider.summarizeCriterion(i)),
};

/** ใช้ Claude เฉพาะบน browser จริง (ไม่ใช่ test) และไม่ได้ปิดด้วย NEXT_PUBLIC_AI_PROVIDER=offline */
export function shouldUseClaude(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function'
    && process.env.NODE_ENV !== 'test' && process.env.NEXT_PUBLIC_AI_PROVIDER !== 'offline';
}
