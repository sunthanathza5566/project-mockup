import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runVerbChecker, runEvidenceTagger } from '@/lib/api/ai.service';
import { offlineProvider } from '@/lib/api/ai/offline';
import { load, KEYS } from '@/lib/api/db';
import { loadCurriculumRaw } from '@/lib/api/curriculum-data.internal';
import type { Evidence } from '@/lib/types';
import type { TagOutput, VerbOutput } from '@/lib/api/ai/provider';
import { CYCLE, PROG, freshDemo, user } from './helpers';

// R2-3 / B5: ไม่เชื่อค่าจาก LLM ที่ระบบรู้อยู่แล้ว + กรองช่วงค่า
describe('AI-7 / AI-1 trust boundary (B5)', () => {
  beforeEach(freshDemo);
  afterEach(() => vi.restoreAllMocks());

  it('AI-7: code/kind/declaredLevel ทับจาก input, detectedLevels กรอง 1–6 + unique, ทิ้ง id แปลกปลอม', async () => {
    const plo = loadCurriculumRaw(PROG).plos[0];
    vi.spyOn(offlineProvider, 'checkVerbs').mockImplementation(async (input) => {
      const it0 = input.items[0];
      return {
        results: [
          { id: it0.id, code: 'FAKE-99', kind: 'clo', declaredLevel: 6, detectedLevels: [0, 9, 2, 2, 2.5, -1, 6], verbOk: true, note: 'ok', suggestions: [] },
          { id: 'ghost-id', code: 'GHOST', kind: 'plo', declaredLevel: 1, detectedLevels: [1], verbOk: true, note: '', suggestions: [] },
        ],
      } as unknown as VerbOutput;
    });
    const run = await runVerbChecker(user('chair1'), PROG, [plo.id]);
    const out = run.output as VerbOutput;
    expect(out.results).toHaveLength(1);
    const r = out.results[0];
    expect(r.code).toBe(plo.code);
    expect(r.kind).toBe('plo');
    expect(r.declaredLevel).toBe(plo.bloomLevel);
    expect(r.detectedLevels).toEqual([2, 6]);
  });

  it('AI-1: clamp confidence 0–1 (เกิน/ติดลบ/NaN/Infinity)', async () => {
    const e = load<Evidence>(KEYS.evidence)[0];
    vi.spyOn(offlineProvider, 'tagEvidence').mockResolvedValue({
      summary: 'สรุป',
      suggestions: [
        { requirementId: '1.1', confidence: 3, reasons: [] },
        { requirementId: '1.2', confidence: -2, reasons: [] },
        { requirementId: '2.1', confidence: NaN, reasons: [] },
        { requirementId: '2.2', confidence: 0.4, reasons: [] },
        { requirementId: 'no-such-req', confidence: 0.9, reasons: [] },
      ],
    } as unknown as TagOutput);
    const run = await runEvidenceTagger(user('chair1'), e.id, CYCLE);
    const out = run.output as TagOutput;
    const byId = Object.fromEntries(out.suggestions.map(s => [s.requirementId, s.confidence]));
    expect(byId['1.1']).toBe(1);
    expect(byId['1.2']).toBe(0);
    expect(byId['2.1']).toBe(0);
    expect(byId['2.2']).toBe(0.4);
    expect(byId['no-such-req']).toBeUndefined();
  });
});
