/**
 * SAR editor (M8) — narrative TH/EN, PDCA flags, autosave + versions, citation [E-…], self-rating, comments
 * TODO(PostgreSQL): sar_sections, sar_section_versions, ratings, comments
 */
import type {
  AppUser, Comment, EvidenceLink, Evidence, PdcaFlags, Rating, SarSection, SarSectionVersion, SectionStatus,
} from '../types';
import { newId } from '../utils/hash';
import { countWords, extractCitations } from '../utils/text';
import { appendAudit, appendAuditThrottled } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { getRequirement } from './framework';
import { notify } from './notification.store';
import { can } from './rbac';
import {
  assertCycleWritable, assertSectionEditable, cycleScope, getCycleRaw, transitionSection,
} from './workflow';

const MAX_NARRATIVE = 30_000;
const MAX_VERSIONS = 30;
const AUTOSAVE_VERSION_GAP_MS = 5 * 60_000;

function getSectionRaw(sectionId: string): SarSection {
  const s = load<SarSection>(KEYS.sections).find(x => x.id === sectionId);
  if (!s) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  return s;
}

export const sectionIdOf = (cycleId: string, requirementId: string) => `${cycleId}::${requirementId}`;

// ─── Citation ────────────────────────────────────────────────────────────
/** รหัสหลักฐานที่ผูกกับรอบนี้จริง (ใช้ validate [E-…]) */
export function citableCodes(cycleId: string): Set<string> {
  const ids = new Set(load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId).map(l => l.evidenceId));
  return new Set(load<Evidence>(KEYS.evidence).filter(e => ids.has(e.id)).map(e => e.code));
}

export function validateCitations(cycleId: string, text: string): { valid: string[]; invalid: string[] } {
  const ok = citableCodes(cycleId);
  const cited = Array.from(new Set(extractCitations(text)));
  return { valid: cited.filter(c => ok.has(c)), invalid: cited.filter(c => !ok.has(c)) };
}

// ─── Save narrative ──────────────────────────────────────────────────────
export interface SaveSectionInput { narrativeTh?: string; narrativeEn?: string; pdca?: Partial<PdcaFlags> }
export type SaveReason = 'autosave' | 'manual' | 'ai_accept';

export function saveSection(
  actor: AppUser, cycleId: string, requirementId: string, input: SaveSectionInput, reason: SaveReason = 'autosave',
): SarSection {
  const rows = load<SarSection>(KEYS.sections);
  const sec = rows.find(s => s.id === sectionIdOf(cycleId, requirementId));
  if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  const cycle = getCycleRaw(cycleId);
  if (!can(actor, 'sar.write', cycleScope(cycle, { ownerUserId: sec.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้ไขข้อนี้ (เฉพาะเจ้าของข้อหรือประธานหลักสูตร)');
  assertCycleWritable(cycle);
  assertSectionEditable(sec);

  const th = input.narrativeTh ?? sec.narrativeTh;
  const en = input.narrativeEn ?? sec.narrativeEn;
  if (th.length > MAX_NARRATIVE || en.length > MAX_NARRATIVE) throw new AunqaError('invalid', 'เนื้อหายาวเกินไป');

  // อ้างได้เฉพาะหลักฐานที่ผูกกับรอบนี้จริง
  const { invalid } = validateCitations(cycleId, `${th}\n${en}`);
  if (invalid.length) throw new AunqaError('citation_invalid', `อ้างหลักฐานที่ไม่มีในรอบนี้: ${invalid.join(', ')}`, { invalid });

  const before = { wordCount: sec.wordCount, status: sec.status };
  const changedText = th !== sec.narrativeTh || en !== sec.narrativeEn;
  const nextPdca: PdcaFlags = { ...sec.pdca, ...input.pdca };
  const changedPdca = (['plan', 'do', 'check', 'act'] as const).some(k => nextPdca[k] !== sec.pdca[k]);
  if (!changedText && !changedPdca) return sec;

  sec.narrativeTh = th; sec.narrativeEn = en; sec.pdca = nextPdca;
  sec.wordCount = Math.max(countWords(th), countWords(en));
  sec.updatedAt = Date.now(); sec.updatedBy = actor.id;
  if (sec.status === 'not_started' && (th.trim() || en.trim() || changedPdca)) sec.status = 'drafting';
  save(KEYS.sections, rows);

  // version history (autosave เว้น 5 นาที · manual/ai_accept บันทึกทุกครั้ง) · cap 30 ต่อ section
  const versions = load<SarSectionVersion>(KEYS.versions);
  const mine = versions.filter(v => v.sectionId === sec.id);
  const last = mine[mine.length - 1];
  if (reason !== 'autosave' || !last || Date.now() - last.savedAt >= AUTOSAVE_VERSION_GAP_MS) {
    versions.push({
      id: newId('ver'), sectionId: sec.id, narrativeTh: th, narrativeEn: en, pdca: { ...nextPdca },
      savedBy: actor.id, savedAt: Date.now(), reason,
    });
    const overflow = mine.length + 1 - MAX_VERSIONS;
    if (overflow > 0) {
      const drop = new Set(mine.slice(0, overflow).map(v => v.id));
      save(KEYS.versions, versions.filter(v => !drop.has(v.id)));
    } else save(KEYS.versions, versions);
  }

  const auditInput = {
    action: 'sar.save', targetType: 'section', targetId: sec.id, programmeId: cycle.programmeId,
    before, after: { wordCount: sec.wordCount, status: sec.status, reason },
  };
  if (reason === 'autosave') appendAuditThrottled(actor, auditInput); else appendAudit(actor, auditInput);
  return sec;
}

export function listVersions(user: AppUser, cycleId: string, requirementId: string): SarSectionVersion[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึง');
  return load<SarSectionVersion>(KEYS.versions)
    .filter(v => v.sectionId === sectionIdOf(cycleId, requirementId)).sort((a, b) => b.savedAt - a.savedAt);
}

/** ย้อนกลับไปเวอร์ชันเก่า (บันทึกเป็นเวอร์ชันใหม่ ไม่ลบประวัติ) */
export function restoreVersion(actor: AppUser, versionId: string): SarSection {
  const v = load<SarSectionVersion>(KEYS.versions).find(x => x.id === versionId);
  if (!v) throw new AunqaError('not_found', 'ไม่พบเวอร์ชัน');
  const sec = getSectionRaw(v.sectionId);
  return saveSection(actor, sec.cycleId, sec.requirementId, { narrativeTh: v.narrativeTh, narrativeEn: v.narrativeEn, pdca: v.pdca }, 'manual');
}

// ─── Status (ผ่าน state machine) ─────────────────────────────────────────
export function submitSection(actor: AppUser, cycleId: string, requirementId: string): SarSection {
  const sec = getSectionRaw(sectionIdOf(cycleId, requirementId));
  // not_started → drafting → ready_for_review ต้องเดินทีละขั้นตามตาราง
  if (sec.status === 'not_started') transitionSection(actor, sec.id, 'drafting');
  return transitionSection(actor, sec.id, 'ready_for_review');
}
export function approveSection(actor: AppUser, cycleId: string, requirementId: string): SarSection {
  return transitionSection(actor, sectionIdOf(cycleId, requirementId), 'approved');
}
export function returnSection(actor: AppUser, cycleId: string, requirementId: string, note: string): SarSection {
  return transitionSection(actor, sectionIdOf(cycleId, requirementId), 'changes_requested', note);
}
export function setSectionStatus(actor: AppUser, cycleId: string, requirementId: string, to: SectionStatus, note?: string): SarSection {
  return transitionSection(actor, sectionIdOf(cycleId, requirementId), to, note);
}

// ─── Ratings ─────────────────────────────────────────────────────────────
export function listRatings(user: AppUser, cycleId: string): Rating[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึง');
  return load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId);
}

function checkScore(score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 7) throw new AunqaError('invalid', 'คะแนนต้องเป็นจำนวนเต็ม 1–7');
}

/** self-rating (rater_type self) — upsert ต่อข้อ · ไม่แตะคะแนนกรรมการ */
export function setSelfRating(actor: AppUser, cycleId: string, requirementId: string, score: number, rationale = ''): Rating {
  checkScore(score);
  if (!getRequirement(requirementId)) throw new AunqaError('not_found', 'ไม่พบข้อ');
  if (rationale.length > 3000) throw new AunqaError('invalid', 'เหตุผลยาวเกินไป');
  const cycle = getCycleRaw(cycleId);
  const sec = getSectionRaw(sectionIdOf(cycleId, requirementId));
  if (!can(actor, 'rating.self', cycleScope(cycle, { ownerUserId: sec.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ให้คะแนนตนเองข้อนี้');
  assertCycleWritable(cycle);
  const rows = load<Rating>(KEYS.ratings);
  let r = rows.find(x => x.cycleId === cycleId && x.requirementId === requirementId && x.raterType === 'self');
  const before = r ? { score: r.score, rationale: r.rationale } : undefined;
  if (r) { r.score = score; r.rationale = rationale; r.raterUserId = actor.id; r.at = Date.now(); }
  else { r = { id: newId('rat'), cycleId, requirementId, raterType: 'self', raterUserId: actor.id, score, rationale, at: Date.now() }; rows.push(r); }
  save(KEYS.ratings, rows);
  appendAudit(actor, { action: 'rating.self', targetType: 'section', targetId: sec.id, programmeId: cycle.programmeId, before, after: { score, rationale } });
  return r;
}

/** คะแนนกรรมการ — เฉพาะ assessor ที่ได้รับมอบหมาย และเมื่อรอบอยู่ในขั้น under_assessment (แยกแถวจาก self เสมอ) */
export function setCommitteeRating(actor: AppUser, cycleId: string, requirementId: string, score: number, rationale = ''): Rating {
  checkScore(score);
  const cycle = getCycleRaw(cycleId);
  if (!can(actor, 'rating.committee', cycleScope(cycle))) throw new AunqaError('forbidden', 'เฉพาะกรรมการที่ได้รับมอบหมายเท่านั้น');
  if (cycle.status !== 'under_assessment') throw new AunqaError('invalid', 'ให้คะแนนได้เฉพาะรอบที่อยู่ในขั้นการประเมิน');
  const rows = load<Rating>(KEYS.ratings);
  let r = rows.find(x => x.cycleId === cycleId && x.requirementId === requirementId && x.raterType === 'committee' && x.raterUserId === actor.id);
  const before = r ? { score: r.score } : undefined;
  if (r) { r.score = score; r.rationale = rationale; r.at = Date.now(); }
  else { r = { id: newId('rat'), cycleId, requirementId, raterType: 'committee', raterUserId: actor.id, score, rationale, at: Date.now() }; rows.push(r); }
  save(KEYS.ratings, rows);
  appendAudit(actor, { action: 'rating.committee', targetType: 'section', targetId: sectionIdOf(cycleId, requirementId), programmeId: cycle.programmeId, before, after: { score } });
  return r;
}

// ─── Comments ────────────────────────────────────────────────────────────
export function listComments(user: AppUser, cycleId: string, requirementId?: string): Comment[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เข้าถึง');
  return load<Comment>(KEYS.comments)
    .filter(x => x.cycleId === cycleId && (!requirementId || x.targetId === sectionIdOf(cycleId, requirementId)))
    .sort((a, b) => a.at - b.at);
}

export function addComment(
  actor: AppUser, cycleId: string, requirementId: string, body: string,
  opts: { parentId?: string; anchor?: Comment['anchor'] } = {},
): Comment {
  const cycle = getCycleRaw(cycleId);
  const sec = getSectionRaw(sectionIdOf(cycleId, requirementId));
  const text = body.trim();
  if (!text || text.length > 4000) throw new AunqaError('invalid', 'ข้อความ comment ต้องไม่ว่างและไม่เกิน 4000 ตัวอักษร');
  const scope = cycleScope(cycle, { ownerUserId: sec.ownerUserId });
  // เจ้าของข้อตอบกลับ thread ได้ (ไม่ใช่เริ่ม thread ใหม่)
  const isOwnerReply = !!opts.parentId && sec.ownerUserId === actor.id && can(actor, 'read', scope);
  if (!can(actor, 'comment', scope) && !isOwnerReply) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ comment');
  const rows = load<Comment>(KEYS.comments);
  if (opts.parentId && !rows.some(c => c.id === opts.parentId && c.targetId === sec.id)) throw new AunqaError('invalid', 'ไม่พบ thread ที่ตอบ');
  const c: Comment = {
    id: newId('cmt'), cycleId, targetType: 'section', targetId: sec.id, authorId: actor.id, body: text,
    parentId: opts.parentId, anchor: opts.anchor, at: Date.now(),
  };
  rows.push(c);
  save(KEYS.comments, rows);
  appendAudit(actor, { action: 'comment.add', targetType: 'section', targetId: sec.id, programmeId: cycle.programmeId, after: { commentId: c.id } });
  if (sec.ownerUserId && sec.ownerUserId !== actor.id)
    notify({ userId: sec.ownerUserId, kind: 'comment', cycleId, requirementId, messageTh: `มี comment ใหม่ที่ข้อ ${requirementId}` });
  return c;
}

export function resolveComment(actor: AppUser, commentId: string): Comment {
  const rows = load<Comment>(KEYS.comments);
  const c = rows.find(x => x.id === commentId);
  if (!c) throw new AunqaError('not_found', 'ไม่พบ comment');
  const cycle = getCycleRaw(c.cycleId);
  const sec = getSectionRaw(c.targetId);
  const ok = c.authorId === actor.id || can(actor, 'comment', cycleScope(cycle)) || sec.ownerUserId === actor.id;
  if (!ok) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ปิด comment นี้');
  if (c.resolvedAt) return c;
  c.resolvedAt = Date.now(); c.resolvedBy = actor.id;
  save(KEYS.comments, rows);
  appendAudit(actor, { action: 'comment.resolve', targetType: 'section', targetId: sec.id, programmeId: cycle.programmeId, after: { commentId } });
  return c;
}
