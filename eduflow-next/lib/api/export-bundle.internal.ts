/** Bundle ข้อมูลรอบสำหรับ export (ใช้ร่วม export.ts / export-docx.ts) — ไม่ export ผ่าน facade */
import type { AppUser, Evidence, EvidenceLink, Rating, SarSection } from '../types';
import { AunqaError, KEYS, load } from './db';
import { getFaculties, getProgramme, getUniversity } from './org.store';
import { can } from './rbac';
import { cycleScope, getCycleRaw } from './workflow';

export interface Bundle {
  cycleId: string;
  programmeName: string; programmeCode: string; facultyName: string; universityName: string; academicYear: number; revision: number; status: string; snapshotHash?: string;
  sections: Map<string, SarSection>;
  ratings: Map<string, Rating>;
  evidence: Evidence[];
  links: EvidenceLink[];
}

export function loadBundle(user: AppUser, cycleId: string): Bundle {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ส่งออกรอบนี้');
  const prog = getProgramme(c.programmeId);
  const uni = getUniversity(c.universityId);
  const fac = getFaculties(c.universityId).find(f => f.id === prog?.facultyId);
  const links = load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId);
  const evIds = new Set(links.map(l => l.evidenceId));
  return {
    cycleId, programmeName: prog?.nameTh ?? '', programmeCode: prog?.code ?? '', facultyName: fac?.nameTh ?? '', universityName: uni?.nameTh ?? '',
    academicYear: c.academicYear, revision: c.revision, status: c.status, snapshotHash: c.snapshotHash,
    sections: new Map(load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId).map(s => [s.requirementId, s])),
    ratings: new Map(load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'self').map(r => [r.requirementId, r])),
    evidence: load<Evidence>(KEYS.evidence).filter(e => evIds.has(e.id)).sort((a, b) => a.code.localeCompare(b.code)),
    links,
  };
}

