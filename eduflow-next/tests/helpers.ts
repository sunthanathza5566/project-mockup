import { getAllUsers } from '@/lib/api/org.store';
import { resetDemo } from '@/lib/api/init';
import { createEvidence, type CreateEvidenceInput } from '@/lib/api/evidence.store';
import type { AppUser, Evidence, EvidenceLink, MetricValue, Requirement, SarSection, Rating } from '@/lib/types';
import type { GapInput } from '@/lib/api/gap';

export const CYCLE = 'cycle-demo-2569';
export const PROG = 'prog-demo-cs';

export async function freshDemo() { await resetDemo(); }
export function user(username: string): AppUser {
  const u = getAllUsers().find(x => x.username === username);
  if (!u) throw new Error('no user ' + username);
  return u;
}
export async function addEvidence(actor: AppUser, over: Partial<CreateEvidenceInput> = {}) {
  return createEvidence(actor, {
    programmeId: PROG, title: 'หลักฐานทดสอบ ' + Math.random(), kind: 'plan', pdcaStage: 'P', academicYear: 2568,
    cycleId: CYCLE, requirementIds: ['1.1'], extractedText: 'เนื้อหาทดสอบ ' + Math.random(), ...over,
  });
}

// ── pure gap fixtures ──
export const req = (id: string, over: Partial<Requirement> = {}): Requirement => ({
  id, criterionNo: Number(id.split('.')[0]), textEn: '', textTh: '', plainTh: '', suggestedEvidence: [], diagnosticQuestions: [],
  tipTh: '', relatedMetrics: [], needsBenchmark: false, needsTrend: false, ...over,
});
export const ev = (id: string, over: Partial<Evidence> = {}): Evidence => ({
  id, universityId: 'u', programmeId: PROG, code: 'E-1.1-' + id, title: 't' + id, description: '', kind: 'plan', pdcaStage: 'P',
  academicYear: 2568, containsPii: false, piiKinds: [], piiResolved: false, status: 'uploaded', createdAt: 0, createdBy: 'x', updatedAt: 0, ...over,
} as Evidence);
export const link = (evidenceId: string, requirementId: string): EvidenceLink =>
  ({ id: `l-${evidenceId}-${requirementId}`, evidenceId, requirementId, cycleId: CYCLE, source: 'manual', at: 0 } as EvidenceLink);
export const sec = (requirementId: string, over: Partial<SarSection> = {}): SarSection => ({
  id: `${CYCLE}::${requirementId}`, cycleId: CYCLE, requirementId, status: 'drafting', narrativeTh: '', narrativeEn: '',
  pdca: { plan: false, do: false, check: false, act: false }, wordCount: 0, updatedAt: 0, ...over,
} as SarSection);
export const metric = (code: string, period: number, over: Partial<MetricValue> = {}): MetricValue =>
  ({ id: `${code}-${period}`, programmeId: PROG, code, period, value: 1, ...over } as MetricValue);
export const rating = (requirementId: string, score: number, raterType: 'self' | 'committee' = 'self'): Rating =>
  ({ id: `r-${requirementId}`, cycleId: CYCLE, requirementId, raterType, raterUserId: 'x', score, rationale: '', at: 0 } as Rating);
export const gi = (over: Partial<GapInput> = {}): GapInput => ({
  requirements: [], sections: [], links: [], evidence: [], metrics: [], ratings: [], academicYear: 2569, ...over,
});
