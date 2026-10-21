import { getAllUsers } from '@/lib/api/org.store';
import { KEYS, load, save } from '@/lib/api/db';
import { resetDemo } from '@/lib/api/init';
import { createEvidence, type CreateEvidenceInput } from '@/lib/api/evidence.store';
import type { AppUser, Evidence, EvidenceLink, MetricValue, Requirement, SarSection, Rating } from '@/lib/types';
import type { GapInput } from '@/lib/api/gap';

export const CYCLE = 'cycle-demo-2569';
export const PROG = 'prog-demo-cs';

const TEST_ADMIN: AppUser = { id: 'u-test-admin', username: 'tadmin', password: '', universityId: 'any', email: 't@t.t', fullName: 'T', roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }] };
/**
 * รีเซ็ตเดโม่แล้ว "ล้าง narrative/self-rating ที่ seed ไว้" ให้รอบเดโม่เริ่มว่างเหมือนก่อน Phase B
 * (test ส่วนใหญ่ต้องการ section ว่าง) — ใช้ freshSeededDemo() เมื่อต้องการข้อมูลเดโม่เต็ม
 */
export async function freshDemo() {
  await resetDemo(TEST_ADMIN);
  const sections = load<SarSection>(KEYS.sections).map(s => (s.cycleId === CYCLE
    ? { ...s, narrativeTh: '', narrativeEn: '', pdca: { plan: false, do: false, check: false, act: false }, wordCount: 0, status: 'not_started' as const, lastAuthorId: undefined }
    : s));
  save(KEYS.sections, sections);
  save(KEYS.ratings, []);
}
export async function freshSeededDemo() { await resetDemo(TEST_ADMIN); }
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

// ── Phase B flow helpers ──
import * as _api from '@/lib/api';
/** เดินเดโม่ที่ seed แล้วไปจนถึง final_approved (lock) — ประธานมอบข้อที่ยังไม่อนุมัติให้ staff1 */
export async function driveToLocked() {
  await freshSeededDemo();
  const chair = user('chair1'); const staff = user('staff1');
  for (const s of _api.listSections(chair, CYCLE)) {
    if (s.status === 'approved') continue;
    if (s.status === 'drafting') { _api.assignSections(chair, CYCLE, [s.requirementId], staff.id); _api.submitSection(staff, CYCLE, s.requirementId); }
    _api.approveSection(chair, CYCLE, s.requirementId);
  }
  await _api.transitionCycle(chair, CYCLE, 'under_review');
  await _api.transitionCycle(user('fqa1'), CYCLE, 'faculty_approved');
  return _api.transitionCycle(user('dean1'), CYCLE, 'final_approved');
}
export async function driveToAssessment() {
  const locked = await driveToLocked();
  await _api.transitionCycle(user('fqa1'), CYCLE, 'under_assessment');
  return locked;
}
