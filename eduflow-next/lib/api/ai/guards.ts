/**
 * Type-guard ร่วมของ AI task (ใช้ทั้ง client: lib/api/ai/claude.ts และ server: app/api/ai/route.ts) — pure
 *  - outputGuards: ตรวจรูปแบบ output ที่ได้จาก Claude (ไม่ผ่าน → ถือว่า bad output)
 *  - inputGuards : ตรวจ shape คร่าว ๆ ของ input ก่อนส่งให้ Claude (กัน endpoint ถูกใช้เป็น proxy ทั่วไป)
 *  - MAX_TOKENS  : เพดาน max_tokens ต่อ task
 * เป็นแค่การตรวจรูปแบบ ไม่ใช่การตรวจเนื้อหา — post-check กฎ 7.3 ยังอยู่ที่ ai.service
 */
import type { AiTask } from './prompts';

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);
const isNumArr = (x: unknown): x is number[] => Array.isArray(x) && x.every(n => typeof n === 'number');
const arrOfObj = (x: unknown, max: number): x is Record<string, unknown>[] => Array.isArray(x) && x.length <= max && x.every(isObj);
const PDCA = ['P', 'D', 'C', 'A'];
const GROUPS = ['lecturer', 'student', 'alumni', 'employer'];
const W = ['What', 'Why', 'Who', 'When', 'Where', 'How'];
const LANG = ['th', 'en'];

export const MAX_TOKENS: Record<AiTask, number> = {
  tag: 1024, draft: 2048, review: 1536, verbs: 3072, summarize: 4096, translate: 4096,
};

export const outputGuards: Record<AiTask, (o: unknown) => boolean> = {
  tag: o => isObj(o) && isStr(o.summary) && PDCA.includes(o.pdcaStage as string) && isStr(o.pdcaReason)
    && Array.isArray(o.suggestions) && o.suggestions.every(s => isObj(s) && isStr(s.requirementId)
      && typeof s.confidence === 'number' && isStrArr(s.reasons)),
  draft: o => isObj(o) && isStr(o.draft) && isStrArr(o.missing) && isStrArr(o.usedEvidence),
  review: o => isObj(o) && isStrArr(o.unanswered) && isStrArr(o.uncitedSentences) && isStrArr(o.suggestions),
  verbs: o => isObj(o) && Array.isArray(o.results) && o.results.every(r => isObj(r) && isStr(r.id) && isStr(r.code)
    && (r.kind === 'plo' || r.kind === 'clo') && isStrArr(r.verbs) && isNumArr(r.detectedLevels) && typeof r.declaredLevel === 'number'
    && typeof r.measurable === 'boolean' && (r.levelMatch === null || typeof r.levelMatch === 'boolean')
    && isStr(r.note) && isStrArr(r.suggestions)),
  summarize: o => isObj(o) && Array.isArray(o.summaries) && o.summaries.every(s => isObj(s) && isStr(s.requirementId)
    && isStr(s.summary) && isStrArr(s.strengths) && isStrArr(s.concerns))
    && Array.isArray(o.questions) && o.questions.every(g => isObj(g) && GROUPS.includes(g.group as string) && Array.isArray(g.items)
      && g.items.every(it => isObj(it) && W.includes(it.w as string) && isStr(it.requirementId) && isStr(it.question))),
  translate: o => isObj(o) && isStr(o.translation),
};

export const inputGuards: Record<AiTask, (i: unknown) => boolean> = {
  tag: i => isObj(i) && isStr(i.title) && isStr(i.text) && arrOfObj(i.requirements, 200) && PDCA.includes(i.currentPdca as string),
  draft: i => isObj(i) && isObj(i.requirement) && LANG.includes(i.language as string) && arrOfObj(i.evidence, 200) && arrOfObj(i.metrics, 500),
  review: i => isObj(i) && isObj(i.requirement) && isStr(i.narrative) && isObj(i.pdca) && arrOfObj(i.evidence, 200)
    && Array.isArray(i.gaps) && i.gaps.length <= 200 && LANG.includes(i.language as string),
  verbs: i => isObj(i) && arrOfObj(i.items, 500)
    && i.items.every(it => isStr(it.id) && isStr(it.code) && (it.kind === 'plo' || it.kind === 'clo') && isStr(it.textTh) && typeof it.declaredLevel === 'number'),
  translate: i => isObj(i) && isStr(i.text) && i.text.length <= 20000 && LANG.includes(i.from as string) && LANG.includes(i.to as string)
    && i.from !== i.to && arrOfObj(i.glossary, 200),
  summarize: i => isObj(i) && isObj(i.criterion) && typeof i.criterion.no === 'number' && arrOfObj(i.requirements, 100),
};
