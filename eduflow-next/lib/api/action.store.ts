/**
 * Action plan / continuous improvement (M14) — ปิดวงจร PDCA ข้ามปี
 * สถานะ: open → in_progress → done → verified (done → in_progress เปิดซ้ำได้ ถ้ายังไม่ถูกใช้เป็นหลักฐาน)
 * เมื่อสร้างรอบใหม่: action ที่ done/verified ของหลักสูตร → evidence ขั้น A ผูกกับข้อเดิมในรอบใหม่อัตโนมัติ (materializeActionEvidence)
 * TODO(PostgreSQL): action_items(evidence_id) + trigger/transaction ตอนสร้างรอบ
 */
import type {
  ActionItem, ActionStatus, AppUser, AssessmentCycle, AssessmentFinding, Evidence, EvidenceLink,
} from '../types';
import { newId } from '../utils/hash';
import { scanPii } from '../utils/pii';
import { appendAudit } from './audit.store';
import { AunqaError, KEYS, load, save } from './db';
import { nextEvidenceCode } from './evidence.store';
import { getRequirement } from './framework';
import { notify } from './notification.store';
import { getProgramme, getUserById, programmeScope } from './org.store';
import { can, type Action } from './rbac';
import { getCycleRaw } from './workflow';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 1000;

export interface ActionTransition { from: ActionStatus; to: ActionStatus; action: Action }
export const ACTION_TRANSITIONS: ActionTransition[] = [
  { from: 'open', to: 'in_progress', action: 'action.write' },
  { from: 'in_progress', to: 'done', action: 'action.write' },
  { from: 'done', to: 'verified', action: 'action.verify' },
  { from: 'done', to: 'in_progress', action: 'action.write' },
];
export const nextActionStatuses = (from: ActionStatus): ActionStatus[] => ACTION_TRANSITIONS.filter(t => t.from === from).map(t => t.to);

function getRaw(id: string): ActionItem {
  const a = load<ActionItem>(KEYS.actionItems).find(x => x.id === id);
  if (!a) throw new AunqaError('not_found', 'ไม่พบ action item');
  return a;
}
function str(v: string | undefined, label: string, required: boolean): string | undefined {
  const t = (v ?? '').trim();
  if (!t) { if (required) throw new AunqaError('invalid', `${label}ต้องไม่ว่าง`); return undefined; }
  if (t.length > MAX_TEXT) throw new AunqaError('invalid', `${label}ยาวเกินไป`);
  return t;
}
function checkDue(d: string | undefined): string | undefined {
  if (!d) return undefined;
  if (!ISO_DATE.test(d)) throw new AunqaError('invalid', 'กำหนดเสร็จต้องเป็นรูปแบบ YYYY-MM-DD');
  return d;
}
function checkOwner(ownerUserId: string | undefined, programmeId: string, universityId: string): void {
  if (!ownerUserId) return;
  const u = getUserById(ownerUserId);
  if (!u || u.universityId !== universityId || !can(u, 'read', programmeScope(programmeId))) throw new AunqaError('invalid', 'ผู้รับผิดชอบไม่ถูกต้อง');
}

// ─── Read ────────────────────────────────────────────────────────────────
export function listActionItems(
  user: AppUser, programmeId: string, filter: { status?: ActionStatus; requirementId?: string; ownerUserId?: string } = {},
): ActionItem[] {
  if (!getProgramme(programmeId)) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(user, 'read', programmeScope(programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ดู action plan ของหลักสูตรนี้');
  return load<ActionItem>(KEYS.actionItems)
    .filter(a => a.programmeId === programmeId
      && (!filter.status || a.status === filter.status)
      && (!filter.requirementId || a.requirementId === filter.requirementId)
      && (!filter.ownerUserId || a.ownerUserId === filter.ownerUserId))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt);
}

// ─── Create / update ─────────────────────────────────────────────────────
export interface ActionItemInput {
  programmeId: string; requirementId: string; description: string; originCycleId?: string;
  ownerUserId?: string; due?: string; kpi?: string;
}

export function createActionItem(actor: AppUser, input: ActionItemInput): ActionItem {
  const prog = getProgramme(input.programmeId);
  if (!prog) throw new AunqaError('not_found', 'ไม่พบหลักสูตร');
  if (!can(actor, 'action.write', programmeScope(prog.id, { ownerUserId: input.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์สร้าง action item (อาจารย์สร้างได้เฉพาะรายการที่ตนเองรับผิดชอบ)');
  if (!getRequirement(input.requirementId)) throw new AunqaError('invalid', `ไม่พบข้อ ${input.requirementId}`);
  if (input.originCycleId && getCycleRaw(input.originCycleId).programmeId !== prog.id)
    throw new AunqaError('invalid', 'รอบต้นทางต้องเป็นของหลักสูตรเดียวกัน');
  checkOwner(input.ownerUserId, prog.id, prog.universityId);
  const now = Date.now();
  const item: ActionItem = {
    id: newId('act'), universityId: prog.universityId, programmeId: prog.id, originCycleId: input.originCycleId,
    requirementId: input.requirementId, description: str(input.description, 'รายละเอียด', true)!,
    ownerUserId: input.ownerUserId, due: checkDue(input.due), kpi: str(input.kpi, 'ตัวชี้วัดความสำเร็จ', false),
    status: 'open', createdAt: now, createdBy: actor.id, updatedAt: now,
  };
  save(KEYS.actionItems, [...load<ActionItem>(KEYS.actionItems), item]);
  appendAudit(actor, { action: 'action.create', targetType: 'action_item', targetId: item.id, programmeId: prog.id, after: { requirementId: item.requirementId, ownerUserId: item.ownerUserId, due: item.due } });
  if (item.ownerUserId && item.ownerUserId !== actor.id)
    notify({ userId: item.ownerUserId, kind: 'assigned', requirementId: item.requirementId, messageTh: `คุณได้รับมอบหมาย action item ข้อ ${item.requirementId}${item.due ? ` กำหนดเสร็จ ${item.due}` : ''}` });
  return item;
}

export function updateActionItem(
  actor: AppUser, id: string, patch: Partial<Pick<ActionItemInput, 'description' | 'ownerUserId' | 'due' | 'kpi'>>,
): ActionItem {
  const rows = load<ActionItem>(KEYS.actionItems);
  const cur = rows.find(a => a.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ action item');
  if (!can(actor, 'action.write', programmeScope(cur.programmeId, { ownerUserId: cur.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์แก้ action item นี้');
  if (cur.status === 'done' || cur.status === 'verified') throw new AunqaError('locked', 'action ที่เสร็จแล้วแก้ไขไม่ได้');
  // staff (own) ห้ามโอนงานให้คนอื่น — เฉพาะผู้ที่มีสิทธิ์ระดับหลักสูตร
  if (patch.ownerUserId !== undefined && patch.ownerUserId !== cur.ownerUserId
    && !can(actor, 'action.write', programmeScope(cur.programmeId, { ownerUserId: patch.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เปลี่ยนผู้รับผิดชอบ');
  checkOwner(patch.ownerUserId, cur.programmeId, cur.universityId);
  const next: ActionItem = {
    ...cur,
    description: patch.description !== undefined ? str(patch.description, 'รายละเอียด', true)! : cur.description,
    ownerUserId: patch.ownerUserId !== undefined ? (patch.ownerUserId || undefined) : cur.ownerUserId,
    due: patch.due !== undefined ? checkDue(patch.due) : cur.due,
    kpi: patch.kpi !== undefined ? str(patch.kpi, 'ตัวชี้วัดความสำเร็จ', false) : cur.kpi,
    updatedAt: Date.now(),
  };
  save(KEYS.actionItems, rows.map(a => (a.id === id ? next : a)));
  appendAudit(actor, { action: 'action.update', targetType: 'action_item', targetId: id, programmeId: cur.programmeId, before: patch && { description: cur.description, ownerUserId: cur.ownerUserId, due: cur.due, kpi: cur.kpi }, after: patch });
  return next;
}

export function deleteActionItem(actor: AppUser, id: string): void {
  const cur = getRaw(id);
  if (!can(actor, 'action.write', programmeScope(cur.programmeId, { ownerUserId: cur.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์ลบ action item นี้');
  if (cur.status !== 'open') throw new AunqaError('locked', 'ลบได้เฉพาะรายการที่ยังไม่เริ่ม');
  save(KEYS.actionItems, load<ActionItem>(KEYS.actionItems).filter(a => a.id !== id));
  appendAudit(actor, { action: 'action.delete', targetType: 'action_item', targetId: id, programmeId: cur.programmeId, before: { requirementId: cur.requirementId } });
}

// ─── Status ──────────────────────────────────────────────────────────────
export function setActionStatus(actor: AppUser, id: string, to: ActionStatus, note?: string): ActionItem {
  const rows = load<ActionItem>(KEYS.actionItems);
  const cur = rows.find(a => a.id === id);
  if (!cur) throw new AunqaError('not_found', 'ไม่พบ action item');
  const rule = ACTION_TRANSITIONS.find(t => t.from === cur.status && t.to === to);
  if (!rule) throw new AunqaError('bad_transition', `เปลี่ยนสถานะจาก "${cur.status}" เป็น "${to}" ไม่ได้`);
  if (!can(actor, rule.action, programmeScope(cur.programmeId, { ownerUserId: cur.ownerUserId })))
    throw new AunqaError('forbidden', 'ไม่มีสิทธิ์เปลี่ยนสถานะ action นี้');
  // segregation: เจ้าของงานยืนยัน (verify) งานของตัวเองไม่ได้
  if (to === 'verified' && cur.ownerUserId === actor.id) throw new AunqaError('forbidden', 'ผู้รับผิดชอบยืนยันงานของตนเองไม่ได้');
  if (cur.status === 'done' && to === 'in_progress' && cur.evidenceId)
    throw new AunqaError('locked', 'action นี้ถูกใช้เป็นหลักฐานในรอบประเมินแล้ว เปิดซ้ำไม่ได้');

  const now = Date.now();
  const next: ActionItem = { ...cur, status: to, updatedAt: now };
  if (to === 'done') next.doneAt = now;
  if (to === 'in_progress') next.doneAt = undefined;
  if (to === 'verified') { next.verifiedBy = actor.id; next.verifiedAt = now; }
  save(KEYS.actionItems, rows.map(a => (a.id === id ? next : a)));
  appendAudit(actor, { action: `action.${to}`, targetType: 'action_item', targetId: id, programmeId: cur.programmeId, before: { status: cur.status }, after: { status: to, note } });
  if (to === 'verified' && cur.ownerUserId)
    notify({ userId: cur.ownerUserId, kind: 'approved', requirementId: cur.requirementId, messageTh: `action item ข้อ ${cur.requirementId} ได้รับการยืนยันแล้ว` });
  return next;
}

// ─── จาก AFI ของกรรมการ ───────────────────────────────────────────────────
/** สร้าง action item จาก AFI ในรายงานกรรมการ (รอบ assessed/closed) — ข้ามรายการที่เคยสร้างแล้ว คืนรายการใหม่ */
export function createActionsFromAfi(actor: AppUser, cycleId: string): ActionItem[] {
  const cycle = getCycleRaw(cycleId);
  if (cycle.status !== 'assessed' && cycle.status !== 'closed') throw new AunqaError('invalid', 'สร้างจาก AFI ได้เมื่อรอบประเมินเสร็จสิ้นแล้ว');
  if (!can(actor, 'action.write', programmeScope(cycle.programmeId))) throw new AunqaError('forbidden', 'ไม่มีสิทธิ์สร้าง action item');
  const existing = load<ActionItem>(KEYS.actionItems).filter(a => a.originCycleId === cycleId);
  const out: ActionItem[] = [];
  const seen = new Set(existing.map(a => `${a.requirementId}|${a.description}`));
  for (const f of load<AssessmentFinding>(KEYS.findings).filter(x => x.cycleId === cycleId && x.afi.trim())) {
    const description = f.afi.trim().slice(0, MAX_TEXT);
    if (seen.has(`${f.requirementId}|${description}`)) continue;
    seen.add(`${f.requirementId}|${description}`);
    out.push(createActionItem(actor, { programmeId: cycle.programmeId, requirementId: f.requirementId, description, originCycleId: cycleId }));
  }
  return out;
}

// ─── เปิดรอบใหม่ → action ที่เสร็จแล้วกลายเป็นหลักฐานขั้น Act ─────────────────
function piiKindsOf(text: string) { return Array.from(new Set(scanPii(text).map(f => f.kind))); }

/**
 * เรียกจาก createCycle หลังสร้างรอบ+sections แล้ว: action ที่ done/verified ของหลักสูตร →
 * evidence ขั้น A (สร้างครั้งเดียวต่อ action เก็บ evidenceId + materializedCycleId) แล้วผูก (source 'action') กับข้อเดิมในรอบใหม่
 * เฉพาะ "รอบแรกที่ถูกสร้างหลัง action เสร็จ" — รอบถัด ๆ ไปไม่ผูกอัตโนมัติ (ยัง copy link ต่อจากรอบก่อนตามปกติ)
 * ไม่ตรวจสิทธิ์ซ้ำ: เป็นผลข้างเคียงของ createCycle ที่ตรวจสิทธิ์แล้ว · คืนรหัสหลักฐานที่ผูก
 */
export function materializeActionEvidence(actor: AppUser, cycle: AssessmentCycle): string[] {
  const items = load<ActionItem>(KEYS.actionItems)
    .filter(a => a.programmeId === cycle.programmeId && (a.status === 'done' || a.status === 'verified') && !!getRequirement(a.requirementId)
      // B6: ผูกเฉพาะรอบแรกที่สร้างหลัง action เสร็จ — ถ้าเคยผูกรอบอื่นแล้ว (หรือข้อมูลเก่าที่มี evidenceId แต่ไม่มีบันทึกรอบ) ไม่ผูกซ้ำ
      && (a.materializedCycleId ? a.materializedCycleId === cycle.id : !a.evidenceId));
  if (!items.length) return [];
  const prog = getProgramme(cycle.programmeId);
  const linked: string[] = [];
  const now = Date.now();
  for (const item of items) {
    let ev = item.evidenceId ? load<Evidence>(KEYS.evidence).find(e => e.id === item.evidenceId) : undefined;
    if (!ev) {
      const description = `${item.description}${item.kpi ? `\nตัวชี้วัดความสำเร็จ: ${item.kpi}` : ''}${item.due ? `\nกำหนดเสร็จ: ${item.due}` : ''}`;
      const pii = piiKindsOf(description);
      const doneYear = new Date(item.doneAt ?? item.updatedAt).getFullYear() + 543;
      ev = {
        id: newId('evd'), universityId: cycle.universityId, programmeId: cycle.programmeId,
        code: nextEvidenceCode(cycle.programmeId, item.requirementId),
        title: `ผลดำเนินการตามแผนปรับปรุง ข้อ ${item.requirementId}`, description,
        kind: 'plan', pdcaStage: 'A', academicYear: Math.min(cycle.academicYear, doneYear),
        containsPii: pii.length > 0, piiKinds: pii, piiResolved: false,
        status: item.status === 'verified' ? 'verified' : 'tagged',
        verifiedBy: item.status === 'verified' ? item.verifiedBy : undefined,
        verifiedAt: item.status === 'verified' ? item.verifiedAt : undefined,
        createdAt: now, createdBy: actor.id, updatedAt: now,
      };
      save(KEYS.evidence, [...load<Evidence>(KEYS.evidence), ev]);
      const rows = load<ActionItem>(KEYS.actionItems);
      save(KEYS.actionItems, rows.map(a => (a.id === item.id ? { ...a, evidenceId: ev!.id, materializedCycleId: cycle.id, updatedAt: now } : a)));
      appendAudit(actor, { action: 'evidence.create', targetType: 'evidence', targetId: ev.id, programmeId: cycle.programmeId, after: { code: ev.code, source: 'action_plan', actionId: item.id } });
    }
    const links = load<EvidenceLink>(KEYS.links);
    if (!links.some(l => l.evidenceId === ev!.id && l.cycleId === cycle.id && l.requirementId === item.requirementId)) {
      save(KEYS.links, [...links, { id: newId('lnk'), evidenceId: ev.id, requirementId: item.requirementId, cycleId: cycle.id, source: 'action', at: now }]);
      linked.push(ev.code);
    }
  }
  if (linked.length)
    appendAudit(actor, { action: 'action.materialize_evidence', targetType: 'cycle', targetId: cycle.id, programmeId: cycle.programmeId, after: { codes: linked, universityId: prog?.universityId } });
  return linked;
}
