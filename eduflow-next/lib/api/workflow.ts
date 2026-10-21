/**
 * Workflow state machine (M10, spec 4.1) + lock + snapshot hash
 *
 * Cycle  : draft → in_progress → under_review → revision_requested ↔ in_progress
 *          → faculty_approved (คณบดีส่งกลับ → revision_requested ได้) → final_approved (LOCK) → under_assessment → assessed → closed
 * Section: not_started → drafting → ready_for_review → changes_requested ↔ … → approved
 *
 * ทุก transition ผ่านตารางนี้เท่านั้น — transition ที่ไม่อยู่ในตารางถูกปฏิเสธ (AunqaError 'bad_transition')
 * AI service ไม่ import ไฟล์นี้ (กฎ 7.3: AI ห้ามเปลี่ยน state)
 * TODO(PostgreSQL): trigger ห้าม UPDATE sar_sections เมื่อ cycle.locked_at IS NOT NULL
 */
import type {
  AppUser, AssessmentCycle, AssessmentVerdict, CycleStatus, Evidence, EvidenceLink, Rating, ReviewEvent, SarSection, SectionStatus,
} from '../types';
import { newId, sha256Hex, stableStringify } from '../utils/hash';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { compareReqId, listCriteria } from './framework';
import { notify } from './notification.store';
import { getProgramme, programmeScope } from './org.store';
import { can, isAssessorOf, type Action, type Scope } from './rbac';

// ─────────────────────────── transition tables ───────────────────────────

export interface TransitionRule<S extends string> { from: S; to: S; action: Action; requireNote?: boolean }

export const CYCLE_TRANSITIONS: TransitionRule<CycleStatus>[] = [
  { from: 'draft',              to: 'in_progress',        action: 'cycle.create' },
  { from: 'in_progress',        to: 'under_review',       action: 'cycle.submit' },
  { from: 'under_review',       to: 'revision_requested', action: 'approve.faculty', requireNote: true },
  { from: 'revision_requested', to: 'in_progress',        action: 'cycle.submit' },
  { from: 'under_review',       to: 'faculty_approved',   action: 'approve.faculty' },
  { from: 'faculty_approved',   to: 'revision_requested', action: 'approve.final', requireNote: true },
  { from: 'faculty_approved',   to: 'final_approved',     action: 'approve.final' },
  { from: 'final_approved',     to: 'under_assessment',   action: 'assessor.assign' },
  { from: 'under_assessment',   to: 'assessed',           action: 'rating.committee' },
  { from: 'assessed',           to: 'closed',             action: 'cycle.close' },
];

export const SECTION_TRANSITIONS: TransitionRule<SectionStatus>[] = [
  { from: 'not_started',       to: 'drafting',          action: 'sar.write' },
  { from: 'drafting',          to: 'ready_for_review',  action: 'sar.write' },
  { from: 'ready_for_review',  to: 'approved',          action: 'sar.approve' },
  { from: 'ready_for_review',  to: 'changes_requested', action: 'sar.return', requireNote: true },
  { from: 'changes_requested', to: 'drafting',          action: 'sar.write' },
  { from: 'changes_requested', to: 'ready_for_review',  action: 'sar.write' },
  { from: 'approved',          to: 'changes_requested', action: 'sar.return', requireNote: true },
];

export function isAllowedCycleTransition(from: CycleStatus, to: CycleStatus): boolean {
  return CYCLE_TRANSITIONS.some(t => t.from === from && t.to === to);
}
export function isAllowedSectionTransition(from: SectionStatus, to: SectionStatus): boolean {
  return SECTION_TRANSITIONS.some(t => t.from === from && t.to === to);
}
export function nextCycleStatuses(from: CycleStatus): CycleStatus[] {
  return CYCLE_TRANSITIONS.filter(t => t.from === from).map(t => t.to);
}
export function nextSectionStatuses(from: SectionStatus): SectionStatus[] {
  return SECTION_TRANSITIONS.filter(t => t.from === from).map(t => t.to);
}

// ─────────────────────────── scope / guards ───────────────────────────

export function cycleScope(cycle: AssessmentCycle, extra: Partial<Scope> = {}): Scope {
  return { ...programmeScope(cycle.programmeId), universityId: cycle.universityId, cycleId: cycle.id, ...extra };
}

const WRITABLE: CycleStatus[] = ['draft', 'in_progress', 'revision_requested'];

/** แก้ section / ผูกหลักฐาน / self-rating ได้เฉพาะรอบที่ยังไม่ lock และอยู่ในช่วงเขียน */
export function assertCycleWritable(cycle: AssessmentCycle): void {
  if (cycle.lockedAt) throw new AunqaError('locked', 'รอบประเมินถูกล็อกแล้ว แก้ไขไม่ได้ (ต้องเปิด revision ใหม่โดยคณบดี)');
  if (!WRITABLE.includes(cycle.status)) throw new AunqaError('locked', 'รอบประเมินอยู่ในขั้นตอนตรวจ/อนุมัติ แก้ไขไม่ได้ในสถานะนี้');
}

const SECTION_EDITABLE: SectionStatus[] = ['not_started', 'drafting', 'changes_requested'];
export function assertSectionEditable(section: SarSection): void {
  if (!SECTION_EDITABLE.includes(section.status))
    throw new AunqaError('locked', 'ข้อนี้ส่งตรวจ/อนุมัติแล้ว ต้องถูกส่งกลับแก้ก่อนจึงแก้ไขได้');
}

export function getCycleRaw(id: string): AssessmentCycle {
  const c = load<AssessmentCycle>(KEYS.cycles).find(x => x.id === id);
  if (!c) throw new AunqaError('not_found', 'ไม่พบรอบประเมิน');
  return c;
}
export function saveCycle(cycle: AssessmentCycle): void {
  const rows = load<AssessmentCycle>(KEYS.cycles);
  const i = rows.findIndex(x => x.id === cycle.id);
  if (i < 0) rows.push(cycle); else rows[i] = cycle;
  save(KEYS.cycles, rows);
}

// ─────────────────────────── review events ───────────────────────────

export function addReviewEvent(e: Omit<ReviewEvent, 'id' | 'at'>): ReviewEvent {
  const ev: ReviewEvent = { ...e, id: newId('rev'), at: Date.now() };
  const rows = load<ReviewEvent>(KEYS.reviewEvents);
  rows.push(ev);
  save(KEYS.reviewEvents, rows);
  return ev;
}
export function listReviewEvents(user: AppUser, cycleId: string): ReviewEvent[] {
  const c = getCycleRaw(cycleId);
  if (!can(user, 'read', cycleScope(c))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดูประวัติการอนุมัติ');
  return load<ReviewEvent>(KEYS.reviewEvents).filter(e => e.cycleId === cycleId).sort((a, b) => a.at - b.at);
}

// ─────────────────────────── snapshot ───────────────────────────

export interface Snapshot { id: string; cycleId: string; revision: number; hash: string; json: string; at: number; by: string }

/** เนื้อหาที่ "ล็อก" — เลือกเฉพาะ field ที่เป็นสาระของเล่ม เพื่อให้ hash คงที่ */
export function buildSnapshotObject(cycleId: string): unknown {
  const c = getCycleRaw(cycleId);
  const sections = load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId)
    .sort((a, b) => compareReqId(a.requirementId, b.requirementId))
    .map(s => ({ req: s.requirementId, owner: s.ownerUserId ?? null, status: s.status, th: s.narrativeTh, en: s.narrativeEn, pdca: s.pdca }));
  const ratings = load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'self')
    .sort((a, b) => compareReqId(a.requirementId, b.requirementId))
    .map(r => ({ req: r.requirementId, score: r.score, rationale: r.rationale }));
  const links = load<EvidenceLink>(KEYS.links).filter(l => l.cycleId === cycleId);
  const evById = new Map(load<Evidence>(KEYS.evidence).map(e => [e.id, e]));
  const evidence = Array.from(new Set(links.map(l => l.evidenceId))).map(id => evById.get(id)).filter((e): e is Evidence => !!e)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(e => ({ code: e.code, title: e.title, kind: e.kind, pdca: e.pdcaStage, year: e.academicYear, sha256: e.sha256 ?? null, url: e.url ?? null, status: e.status }));
  const linkRows = links.map(l => ({ code: evById.get(l.evidenceId)?.code ?? l.evidenceId, req: l.requirementId }))
    .sort((a, b) => a.code.localeCompare(b.code) || compareReqId(a.req, b.req));
  return {
    cycle: { id: c.id, programmeId: c.programmeId, framework: c.frameworkCode, year: c.academicYear, revision: c.revision },
    sections, ratings, evidence, links: linkRows,
  };
}

export async function computeSnapshotHash(cycleId: string): Promise<{ hash: string; json: string }> {
  const json = stableStringify(buildSnapshotObject(cycleId));
  return { hash: await sha256Hex(json), json };
}

/**
 * ตรวจว่าเล่มหลัง lock ยังตรงกับ hash ตอน lock (integrity check)
 * ส่วน "metadata หลักฐาน" เทียบกับ snapshot ที่เก็บตอน lock (หลักฐานแก้/verify ต่อได้หลัง lock — ดู review #5)
 * ส่วน sections / ratings / links เทียบกับข้อมูลปัจจุบัน → แก้เล่มหลัง lock ถูกตรวจพบ
 * evidenceChanged = metadata หลักฐานปัจจุบันต่างจากตอน lock (แจ้งเตือน ไม่ทำให้ ok เป็น false)
 */
export async function verifySnapshot(cycleId: string): Promise<{ ok: boolean; expected?: string; actual: string; evidenceChanged?: boolean }> {
  const c = getCycleRaw(cycleId);
  const stored = getSnapshots(cycleId).find(x => x.id === `${cycleId}@r${c.revision}`);
  const live = buildSnapshotObject(cycleId) as { evidence?: unknown };
  let obj: unknown = live;
  let storedOk = true;
  let evidenceChanged: boolean | undefined;
  if (stored) {
    storedOk = (await sha256Hex(stored.json)) === c.snapshotHash;
    try {
      const st = JSON.parse(stored.json) as { evidence?: unknown };
      obj = { ...live, evidence: st.evidence };
      evidenceChanged = stableStringify(live.evidence) !== stableStringify(st.evidence);
    } catch { storedOk = false; }
  }
  const actual = await sha256Hex(stableStringify(obj));
  return { ok: !!c.snapshotHash && storedOk && c.snapshotHash === actual, expected: c.snapshotHash, actual, evidenceChanged };
}
export function getSnapshots(cycleId: string): Snapshot[] {
  return load<Snapshot>(KEYS.snapshots).filter(s => s.cycleId === cycleId);
}

// ─────────────────────────── transitions ───────────────────────────

function sectionsOf(cycleId: string): SarSection[] {
  return load<SarSection>(KEYS.sections).filter(s => s.cycleId === cycleId);
}

/** ผู้รับแจ้งฝั่งหลักสูตร: ประธานที่ดูแลหลักสูตรนี้ */
function chairsOf(programmeId: string): AppUser[] {
  return load<AppUser>(KEYS.users).filter(u =>
    u.roles.some(r => r.role === 'programme_chair' && (r.scopeType === 'university' || r.scopeId === programmeId)));
}

export async function transitionCycle(actor: AppUser, cycleId: string, to: CycleStatus, note?: string): Promise<AssessmentCycle> {
  const cycle = getCycleRaw(cycleId);
  const rule = CYCLE_TRANSITIONS.find(t => t.from === cycle.status && t.to === to);
  if (!rule) throw new AunqaError('bad_transition', `เปลี่ยนสถานะจาก "${cycle.status}" เป็น "${to}" ไม่ได้`);
  if (!can(actor, rule.action, cycleScope(cycle))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เปลี่ยนสถานะนี้');
  if (rule.requireNote && !(note && note.trim())) throw new AunqaError('invalid', 'ต้องระบุเหตุผล/ข้อเสนอแนะ');
  if (to === 'under_review' || to === 'faculty_approved') {
    const open = sectionsOf(cycleId).filter(s => s.status !== 'approved');
    if (open.length) throw new AunqaError('invalid', `ยังมี ${open.length} ข้อที่ไม่ผ่านการอนุมัติ`, { open: open.map(s => s.requirementId) });
  }

  if (to === 'assessed') {
    // B8: กรรมการ "ทุกคน" ที่ได้รับมอบหมายในรอบต้องให้คะแนนครบทุกเกณฑ์ และต้องมี verdict อย่างน้อย 1 รายการ
    const criteriaNos = listCriteria().map(c => c.no);
    const assessors = load<AppUser>(KEYS.users).filter(u => u.roles.some(r => r.role === 'assessor' && r.scopeType === 'cycle' && r.scopeId === cycleId));
    const committee = load<Rating>(KEYS.ratings).filter(r => r.cycleId === cycleId && r.raterType === 'committee');
    const waiting = assessors
      .map(u => ({ name: u.fullName, missing: criteriaNos.filter(n => !committee.some(r => r.raterUserId === u.id && r.criterionNo === n)) }))
      .filter(w => w.missing.length);
    const hasVerdict = load<AssessmentVerdict>(KEYS.verdicts).some(v => v.cycleId === cycleId);
    if (waiting.length || !hasVerdict) {
      const parts: string[] = [];
      if (waiting.length) parts.push(`ยังรอกรรมการให้คะแนนรายเกณฑ์ให้ครบ: ${waiting.map(w => `${w.name} (ขาด ${w.missing.length} เกณฑ์)`).join(', ')}`);
      if (!hasVerdict) parts.push('ยังไม่มีกรรมการเลือก verdict');
      throw new AunqaError('invalid', `ปิดการประเมินไม่ได้ — ${parts.join(' · ')}`, {
        waitingFor: waiting.map(w => ({ name: w.name, missingCriteria: w.missing })), hasVerdict,
      });
    }
  }

  const before = { status: cycle.status, lockedAt: cycle.lockedAt, snapshotHash: cycle.snapshotHash };
  const next: AssessmentCycle = { ...cycle, status: to, updatedAt: Date.now() };
  if (to === 'final_approved') {
    // lock + snapshot hash (sha256 ของ JSON ทั้งเล่ม)
    const { hash, json } = await computeSnapshotHash(cycleId);
    next.lockedAt = Date.now(); next.lockedBy = actor.id; next.snapshotHash = hash;
    const snaps = load<Snapshot>(KEYS.snapshots);
    snaps.push({ id: `${cycleId}@r${cycle.revision}`, cycleId, revision: cycle.revision, hash, json, at: next.lockedAt, by: actor.id });
    save(KEYS.snapshots, snaps);
  }
  saveCycle(next);
  addReviewEvent({ cycleId, targetType: 'cycle', targetId: cycleId, fromStatus: cycle.status, toStatus: to, actorId: actor.id, note });
  appendAudit(actor, {
    action: `cycle.${to}`, targetType: 'cycle', targetId: cycleId, programmeId: cycle.programmeId,
    before, after: { status: to, lockedAt: next.lockedAt, snapshotHash: next.snapshotHash, note },
  });
  notifyCycleChange(actor, next, to, note);
  return next;
}

function notifyCycleChange(actor: AppUser, cycle: AssessmentCycle, to: CycleStatus, note?: string) {
  const msgs: Partial<Record<CycleStatus, { kind: 'cycle_status' | 'changes_requested' | 'approved'; text: string }>> = {
    in_progress:        { kind: 'cycle_status', text: `รอบประเมิน ${cycle.academicYear} เริ่มดำเนินการ` },
    under_review:       { kind: 'cycle_status', text: `รอบประเมิน ${cycle.academicYear} ส่งให้ QA คณะตรวจ` },
    revision_requested: { kind: 'changes_requested', text: `รอบ ${cycle.academicYear} ถูกส่งกลับแก้ (โดย ${actor.fullName}): ${note ?? ''}` },
    faculty_approved:   { kind: 'approved', text: `QA คณะอนุมัติรอบ ${cycle.academicYear} แล้ว รอคณบดี` },
    final_approved:     { kind: 'approved', text: `คณบดีอนุมัติสุดท้ายและล็อกรอบ ${cycle.academicYear} แล้ว` },
  };
  const year = cycle.academicYear;
  const code = getProgramme(cycle.programmeId)?.code ?? cycle.programmeId;
  /** ผู้รับกลุ่มใหม่ (ADR-UI-001 B3) — userId → ข้อความ (kind 'cycle_status' เสมอ) */
  const extra = new Map<string, string>();
  const addByAction = (action: Action, text: string) => usersWhoCan(cycle, action).forEach(u => extra.set(u.id, text));
  const ownersAndChairs = () => {
    const ids = new Set<string>(sectionsOf(cycle.id).map(s => s.ownerUserId).filter((x): x is string => !!x));
    chairsOf(cycle.programmeId).forEach(u => ids.add(u.id));
    return ids;
  };
  switch (to) {
    case 'under_review':
      addByAction('approve.faculty', `รอบประเมิน ${year} (${code}) ส่งมาให้ QA คณะตรวจแล้ว — รอการพิจารณาของท่าน`);
      break;
    case 'faculty_approved':
      addByAction('approve.final', `QA คณะอนุมัติรอบ ${year} (${code}) แล้ว — รอคณบดีพิจารณาอนุมัติสุดท้าย`);
      break;
    case 'final_approved':
      addByAction('assessor.assign', `รอบ ${year} (${code}) อนุมัติสุดท้ายและล็อกแล้ว — เริ่มการประเมินและมอบหมายกรรมการได้`);
      break;
    case 'under_assessment': {
      // เจ้าของข้อ/ประธาน (เดิมไม่มีข้อความ) ก่อน แล้วกรรมการทับ (คนที่อยู่ทั้งสองกลุ่มได้ข้อความของกรรมการ)
      ownersAndChairs().forEach(id => extra.set(id, `รอบ ${year} เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว`));
      load<AppUser>(KEYS.users).filter(u => isAssessorOf(u, cycle.id))
        .forEach(u => extra.set(u.id, `รอบ ${year} (${code}) เปิดให้ประเมินแล้ว — เริ่มให้คะแนนได้ที่พื้นที่ทำงานกรรมการ`));
      break;
    }
    case 'assessed': {
      const text = `กรรมการส่งผลประเมินรอบ ${year} (${code}) แล้ว — ดูผลได้ที่หน้าผลประเมิน`;
      chairsOf(cycle.programmeId).forEach(u => extra.set(u.id, text));
      addByAction('approve.faculty', text);
      addByAction('cycle.close', text);
      break;
    }
    default: break;
  }
  extra.delete(actor.id);
  extra.forEach((text, uid) => notify({ userId: uid, kind: 'cycle_status', messageTh: text, cycleId: cycle.id }));

  // ข้อความเดิมถึงเจ้าของข้อ + ประธาน — คงเดิม (ยกเว้นคนที่ได้ข้อความใหม่แล้ว: ได้ข้อความเดียว)
  const m = msgs[to];
  if (!m) return;
  const recipients = ownersAndChairs();
  recipients.delete(actor.id);
  recipients.forEach(uid => { if (!extra.has(uid)) notify({ userId: uid, kind: m.kind, messageTh: m.text, cycleId: cycle.id }); });
}

/**
 * ผู้รับ "ตามสิทธิ์": ผู้ใช้ใน university เดียวกับรอบที่ can(u, action, cycleScope) เป็นจริง
 * ยกเว้นผู้ที่บทบาททั้งหมดเป็น super_admin (ผู้ดูแลระบบไม่ใช่ผู้ทำงานในรอบ) — ภายในเท่านั้น
 */
function usersWhoCan(cycle: AssessmentCycle, action: Action): AppUser[] {
  const scope = cycleScope(cycle);
  return load<AppUser>(KEYS.users).filter(u =>
    u.universityId === cycle.universityId
    && !(u.roles.length > 0 && u.roles.every(r => r.role === 'super_admin'))
    && can(u, action, scope));
}

/** เปิด revision ใหม่หลัง lock — เฉพาะคณบดี (cycle.reopen) จาก final_approved → in_progress */
export function openRevision(actor: AppUser, cycleId: string, note: string): AssessmentCycle {
  const cycle = getCycleRaw(cycleId);
  if (!can(actor, 'cycle.reopen', cycleScope(cycle))) throw new AunqaError('forbidden', 'เฉพาะคณบดีเท่านั้นที่เปิด revision ใหม่ได้');
  if (cycle.status !== 'final_approved') throw new AunqaError('bad_transition', 'เปิด revision ได้เฉพาะรอบที่อนุมัติสุดท้ายแล้วและยังไม่เข้าสู่การประเมิน');
  if (!note.trim()) throw new AunqaError('invalid', 'ต้องระบุเหตุผลในการเปิด revision');
  const next: AssessmentCycle = {
    ...cycle, status: 'in_progress', revision: cycle.revision + 1, updatedAt: Date.now(),
    lockedAt: undefined, lockedBy: undefined, snapshotHash: undefined,
  };
  saveCycle(next);
  addReviewEvent({ cycleId, targetType: 'cycle', targetId: cycleId, fromStatus: 'final_approved', toStatus: 'in_progress', actorId: actor.id, note: `[revision ${next.revision}] ${note}` });
  appendAudit(actor, {
    action: 'cycle.open_revision', targetType: 'cycle', targetId: cycleId, programmeId: cycle.programmeId,
    before: { revision: cycle.revision, snapshotHash: cycle.snapshotHash }, after: { revision: next.revision, note },
  });
  return next;
}

/** เปลี่ยนสถานะ section ตามตาราง (sar.store เรียกซ้ำ) */
export function transitionSection(actor: AppUser, sectionId: string, to: SectionStatus, note?: string): SarSection {
  const rows = load<SarSection>(KEYS.sections);
  const sec = rows.find(s => s.id === sectionId);
  if (!sec) throw new AunqaError('not_found', 'ไม่พบข้อนี้');
  const cycle = getCycleRaw(sec.cycleId);
  const rule = SECTION_TRANSITIONS.find(t => t.from === sec.status && t.to === to);
  if (!rule) throw new AunqaError('bad_transition', `เปลี่ยนสถานะข้อ ${sec.requirementId} จาก "${sec.status}" เป็น "${to}" ไม่ได้`);

  // ช่วงเวลา: sar.return ใช้ได้ถึงช่วง under_review (QA คณะส่งกลับรายข้อ) · ที่เหลือเฉพาะช่วงเขียน
  if (cycle.lockedAt) throw new AunqaError('locked', 'รอบประเมินถูกล็อกแล้ว');
  if (rule.action === 'sar.return') {
    if (!(WRITABLE as string[]).concat('under_review').includes(cycle.status))
      throw new AunqaError('locked', 'รอบอยู่ในสถานะที่ส่งกลับรายข้อไม่ได้');
  } else assertCycleWritable(cycle);

  if (!can(actor, rule.action, cycleScope(cycle, { ownerUserId: sec.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เปลี่ยนสถานะข้อนี้');
  if (rule.requireNote && !(note && note.trim())) throw new AunqaError('invalid', 'ต้องระบุเหตุผล/ข้อเสนอแนะ');
  // segregation of duties: ผู้เขียนเนื้อหาล่าสุดอนุมัติข้อนี้เองไม่ได้ (review #11)
  if (to === 'approved' && sec.lastAuthorId === actor.id)
    throw new AunqaError('forbidden', 'ไม่สามารถอนุมัติข้อที่ตนเองเป็นผู้เขียนล่าสุดได้ ต้องให้ผู้อื่นตรวจอนุมัติ');
  if (to === 'ready_for_review' && !(sec.narrativeTh.trim() || sec.narrativeEn.trim()))
    throw new AunqaError('invalid', 'ต้องมีเนื้อหา narrative ก่อนส่งตรวจ');

  const before = { status: sec.status };
  sec.status = to; sec.updatedAt = Date.now(); sec.updatedBy = actor.id;
  save(KEYS.sections, rows);
  addReviewEvent({ cycleId: sec.cycleId, targetType: 'section', targetId: sec.id, fromStatus: before.status, toStatus: to, actorId: actor.id, note });
  appendAudit(actor, {
    action: `section.${to}`, targetType: 'section', targetId: sec.id, programmeId: cycle.programmeId,
    before, after: { status: to, note },
  });

  if ((to === 'changes_requested' || to === 'approved') && sec.ownerUserId && sec.ownerUserId !== actor.id) {
    notify({
      userId: sec.ownerUserId, kind: to === 'approved' ? 'approved' : 'changes_requested',
      messageTh: to === 'approved' ? `ข้อ ${sec.requirementId} ได้รับการอนุมัติแล้ว` : `ข้อ ${sec.requirementId} ถูกส่งกลับแก้: ${note ?? ''}`,
      cycleId: sec.cycleId, requirementId: sec.requirementId,
    });
  }
  if (to === 'ready_for_review') {
    chairsOf(cycle.programmeId).filter(u => u.id !== actor.id).forEach(u => notify({
      userId: u.id, kind: 'cycle_status', messageTh: `ข้อ ${sec.requirementId} ส่งตรวจแล้ว รอประธานอนุมัติ`,
      cycleId: sec.cycleId, requirementId: sec.requirementId,
    }));
  }
  return sec;
}
