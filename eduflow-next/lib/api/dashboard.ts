/** Readiness dashboard (M9) — โหลดข้อมูลจาก storage แล้วส่งให้ pure functions ใน gap.ts */
import type { AppUser, Evidence, EvidenceLink, Gap, MetricValue, Rating, Readiness, SarSection } from '../types';
import { loadCurriculumRaw } from './curriculum-data.internal';
import { AunqaError, KEYS, load } from './db';
import { listRequirements } from './framework';
import { computeGaps, readiness, type GapInput } from './gap';
import { can } from './rbac';
import { cycleScope, getCycleRaw } from './workflow';

export function loadGapInput(cycleId: string): GapInput {
  const c = getCycleRaw(cycleId);
  return {
    requirements: listRequirements(),
    sections: load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId),
    links: load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId),
    evidence: load<Evidence>(KEYS.evidence).filter(e => e.programmeId === c.programmeId),
    metrics: load<MetricValue>(KEYS.metrics).filter(m => m.programmeId === c.programmeId),
    ratings: load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId),
    academicYear: c.academicYear,
    curriculum: loadCurriculumRaw(c.programmeId),
  };
}

export function getReadiness(user: AppUser, cycleId: string): Readiness {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูภาพรวมของรอบนี้');
  return readiness(loadGapInput(cycleId));
}

export function getGaps(user: AppUser, cycleId: string, requirementId?: string): Gap[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึง');
  const gaps = computeGaps(loadGapInput(cycleId));
  return requirementId ? gaps.filter(g => g.requirementId === requirementId) : gaps;
}
