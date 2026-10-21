/**
 * งานที่ต้องทำต่อ role (ADR-UI-001 B2) — หน้าหลัก "สิ่งที่ต้องทำตอนนี้" + badge
 * อ่านอย่างเดียว: ไม่เขียน store / audit / ไม่เรียก syncDeadlineNotifications
 * ใช้เฉพาะรอบที่ listCycles(user) คืน (multi-tenant + assessor เฉพาะรอบที่ได้รับมอบหมาย) และตรวจด้วย can() ทุก kind
 * หลักสูตรของ kind ระดับหลักสูตร (resolve_pii, verify_actions) = หลักสูตรของรอบที่ listCycles(user) คืน
 * titleTh/detailTh ไม่มีชื่อบุคคลอื่น
 */
import type { ActionItem, AppUser, AssessmentCycle, CycleStatus, Evidence, SarSection, TodoItem, TodoKind } from '../types';
import { getAssessorProgress } from './assessor.store';
import { listCycles, listSections } from './cycle.store';
import { KEYS, load } from './db';
import { compareReqId, listCriteria } from './framework';
import { daysUntil } from './notification.store';
import { programmeScope } from './org.store';
import { can, isAssessorOf } from './rbac';
import { cycleScope, listReviewEvents } from './workflow';

/** ลำดับ kind สำหรับการเรียง (U1b) */
const TODO_KIND_ORDER: TodoKind[] = [
  'fix_section', 'write_section', 'translation_review', 'review_sections', 'revise_cycle', 'start_cycle',
  'assign_sections', 'submit_cycle', 'faculty_review', 'final_approve', 'start_assessment', 'assess_cycle',
  'close_cycle', 'resolve_pii', 'verify_actions',
];

const WRITABLE: CycleStatus[] = ['draft', 'in_progress', 'revision_requested'];
const SECTION_WRITE_STATUSES = ['not_started', 'drafting'] as const;
const SECTION_EDITABLE = ['not_started', 'drafting', 'changes_requested'] as const;
const URGENT_DAYS = 3;
const DETAIL_MAX = 120;

const cycleWritable = (c: AssessmentCycle) => !c.lockedAt && WRITABLE.includes(c.status);

function makeTodo(t: Omit<TodoItem, 'id'>): TodoItem {
  const reqs = t.requirementIds && t.requirementIds.length ? t.requirementIds.slice().sort(compareReqId) : undefined;
  const item: TodoItem = { ...t, requirementIds: reqs, id: `${t.kind}:${t.cycleId ?? t.programmeId}:${reqs?.[0] ?? ''}` };
  if (!item.requirementIds) delete item.requirementIds;
  (['detailTh', 'cycleId', 'academicYear', 'evidenceIds', 'actionIds', 'due', 'daysLeft'] as const)
    .forEach(k => { if (item[k] === undefined) delete item[k]; });
  return item;
}

function dueSuffix(daysLeft: number): string {
  if (daysLeft < 0) return ` · เลยกำหนด ${-daysLeft} วัน`;
  if (daysLeft === 0) return ' · ครบกำหนดวันนี้';
  return ` · เหลือ ${daysLeft} วัน`;
}

export function listMyTodos(user: AppUser, opts: { now?: number } = {}): TodoItem[] {
  const now = opts.now ?? Date.now();
  const out: TodoItem[] = [];
  const cycles = listCycles(user);
  const criteriaCount = listCriteria().length;

  for (const c of cycles) {
    const scope = cycleScope(c);
    const year = c.academicYear;
    const base = { programmeId: c.programmeId, cycleId: c.id, academicYear: year };
    const sections: SarSection[] = listSections(user, c.id);
    const writable = cycleWritable(c);
    let events: ReturnType<typeof listReviewEvents> | null = null;
    const reviewEvents = () => (events ??= listReviewEvents(user, c.id));

    // ── งานรายข้อของเจ้าของข้อ ──
    if (writable) {
      for (const s of sections) {
        if (s.ownerUserId !== user.id) continue;
        if (!can(user, 'sar.write', cycleScope(c, { ownerUserId: s.ownerUserId }))) continue;
        const rid = s.requirementId;
        if ((SECTION_WRITE_STATUSES as readonly string[]).includes(s.status)) {
          const daysLeft = s.due ? daysUntil(s.due, now) : undefined;
          out.push(makeTodo({
            ...base, kind: 'write_section', urgent: daysLeft !== undefined && daysLeft <= URGENT_DAYS,
            titleTh: `เขียนข้อ ${rid}${daysLeft !== undefined ? dueSuffix(daysLeft) : ''}`,
            requirementIds: [rid], due: s.due, daysLeft, count: 1,
          }));
        }
        if (s.status === 'changes_requested') {
          const last = reviewEvents().filter(e => e.targetType === 'section' && e.targetId === s.id && e.toStatus === 'changes_requested').pop();
          const note = last?.note?.trim();
          out.push(makeTodo({
            ...base, kind: 'fix_section', urgent: true, titleTh: `แก้ไขข้อ ${rid} ตามที่ถูกส่งกลับ`,
            detailTh: note ? note.slice(0, DETAIL_MAX) : undefined, requirementIds: [rid], count: 1,
          }));
        }
        const tr = s.needsTranslationReview;
        if ((tr?.th || tr?.en) && (SECTION_EDITABLE as readonly string[]).includes(s.status)) {
          const lang = tr.th && tr.en ? 'ไทยและอังกฤษ' : tr.th ? 'ไทย' : 'อังกฤษ';
          out.push(makeTodo({
            ...base, kind: 'translation_review', urgent: false, titleTh: `ตรวจคำแปลข้อ ${rid} (${lang})`,
            requirementIds: [rid], count: 1,
          }));
        }
      }
    }

    // ── ประธาน: ตรวจ/อนุมัติข้อที่ส่งมา ──
    if (can(user, 'sar.approve', scope)) {
      const ready = sections.filter(s => s.status === 'ready_for_review');
      const others = ready.filter(s => s.lastAuthorId !== user.id);
      const mine = ready.length - others.length;
      if (others.length) {
        out.push(makeTodo({
          ...base, kind: 'review_sections', urgent: false,
          titleTh: `ตรวจและอนุมัติ ${others.length} ข้อที่ส่งมา (รอบ ${year})`,
          detailTh: mine ? `อีก ${mine} ข้อคุณเขียนเอง ต้องให้ผู้อื่นอนุมัติ` : undefined,
          requirementIds: others.map(s => s.requirementId), count: others.length,
        }));
      }
    }

    // ── มอบหมายผู้เขียน ──
    if (can(user, 'cycle.assign', scope) && (c.status === 'draft' || c.status === 'in_progress')) {
      const unowned = sections.filter(s => !s.ownerUserId);
      if (unowned.length) {
        out.push(makeTodo({
          ...base, kind: 'assign_sections', urgent: false,
          titleTh: `มอบหมายผู้เขียน ${unowned.length} ข้อที่ยังไม่มีเจ้าของ (รอบ ${year})`,
          requirementIds: unowned.map(s => s.requirementId), count: unowned.length,
        }));
      }
    }

    // ── เริ่มดำเนินการรอบ (draft → in_progress) ──
    if (can(user, 'cycle.create', scope) && c.status === 'draft') {
      const owned = sections.filter(s => !!s.ownerUserId).length;
      const allApproved = sections.length > 0 && sections.every(s => s.status === 'approved');
      if (owned >= 1 || allApproved) {
        out.push(makeTodo({ ...base, kind: 'start_cycle', urgent: false, titleTh: `เริ่มดำเนินการรอบ ${year} (มอบหมายแล้ว ${owned} ข้อ)`, count: 1 }));
      }
    }

    // ── ส่งรอบ / แก้รอบ ──
    if (can(user, 'cycle.submit', scope)) {
      if (c.status === 'in_progress' && sections.length > 0 && sections.every(s => s.status === 'approved')) {
        const daysLeft = c.submissionDue ? daysUntil(c.submissionDue, now) : undefined;
        out.push(makeTodo({
          ...base, kind: 'submit_cycle', urgent: daysLeft !== undefined && daysLeft <= URGENT_DAYS,
          titleTh: `ส่งรอบ ${year} ให้ QA คณะตรวจ`, due: c.submissionDue, daysLeft, count: 1,
        }));
      }
      if (c.status === 'revision_requested') {
        const last = reviewEvents().filter(e => e.targetType === 'cycle' && e.toStatus === 'revision_requested').pop();
        const note = last?.note?.trim();
        out.push(makeTodo({
          ...base, kind: 'revise_cycle', urgent: true, titleTh: `รอบ ${year} ถูกส่งกลับแก้ไข`,
          detailTh: note || undefined, count: 1,
        }));
      }
    }

    if (can(user, 'approve.faculty', scope) && c.status === 'under_review')
      out.push(makeTodo({ ...base, kind: 'faculty_review', urgent: false, titleTh: `ตรวจรอบ ${year} ระดับคณะ`, count: 1 }));
    if (can(user, 'approve.final', scope) && c.status === 'faculty_approved')
      out.push(makeTodo({ ...base, kind: 'final_approve', urgent: false, titleTh: `พิจารณาอนุมัติสุดท้ายรอบ ${year}`, count: 1 }));
    if (can(user, 'assessor.assign', scope) && c.status === 'final_approved') {
      const hasAssessor = load<AppUser>(KEYS.users).some(u => isAssessorOf(u, c.id));
      out.push(makeTodo({
        ...base, kind: 'start_assessment', urgent: false, titleTh: `เริ่มการประเมินรอบ ${year}`,
        detailTh: hasAssessor ? undefined : 'ยังไม่ได้มอบหมายกรรมการประเมิน', count: 1,
      }));
    }

    // ── กรรมการ ──
    if (isAssessorOf(user, c.id) && c.status === 'under_assessment') {
      const p = getAssessorProgress(user, c.id);
      const k = p.ratedCriteria.length;
      const done = k >= criteriaCount;
      const daysLeft = c.assessmentDate ? daysUntil(c.assessmentDate, now) : undefined;
      const titleTh = !done ? `ประเมินรอบ ${year} (ให้คะแนนแล้ว ${k}/${criteriaCount})`
        : !p.hasVerdict ? `เลือก verdict และส่งผลประเมินรอบ ${year}` : `ส่งผลประเมินรอบ ${year}`;
      out.push(makeTodo({
        ...base, kind: 'assess_cycle', urgent: done || (daysLeft !== undefined && daysLeft <= URGENT_DAYS),
        titleTh, due: c.assessmentDate, daysLeft, count: 1,
      }));
    }

    if (can(user, 'cycle.close', scope) && c.status === 'assessed') {
      out.push(makeTodo({
        ...base, kind: 'close_cycle', urgent: false, titleTh: `ปิดรอบ ${year} หลังได้รับผลประเมิน`,
        detailTh: 'ตรวจผลและสร้างแผนปรับปรุงจากข้อเสนอแนะ (AFI) ก่อนปิดรอบ', count: 1,
      }));
    }
  }

  // ── ระดับหลักสูตร ──
  const programmeIds = Array.from(new Set(cycles.map(c => c.programmeId)));
  const assessorOnly = user.roles.length > 0 && user.roles.every(r => r.role === 'assessor');
  let evidence: Evidence[] | null = null;
  let actions: ActionItem[] | null = null;
  for (const pid of programmeIds) {
    const pscope = programmeScope(pid);
    if (!assessorOnly && can(user, 'evidence.write', pscope)) {
      const pii = (evidence ??= load<Evidence>(KEYS.evidence)).filter(e => e.programmeId === pid && e.containsPii && !e.piiResolved);
      if (pii.length) {
        out.push(makeTodo({
          kind: 'resolve_pii', urgent: false, programmeId: pid, titleTh: `จัดการข้อมูลส่วนบุคคลในหลักฐาน ${pii.length} ชิ้น`,
          evidenceIds: pii.map(e => e.id), count: pii.length,
        }));
      }
    }
    if (can(user, 'action.verify', pscope)) {
      const done = (actions ??= load<ActionItem>(KEYS.actionItems)).filter(a => a.programmeId === pid && a.status === 'done' && a.ownerUserId !== user.id);
      if (done.length) {
        out.push(makeTodo({
          kind: 'verify_actions', urgent: false, programmeId: pid, titleTh: `ตรวจรับแผนปรับปรุง ${done.length} รายการ`,
          actionIds: done.map(a => a.id), count: done.length,
        }));
      }
    }
  }

  const order = (k: TodoKind) => TODO_KIND_ORDER.indexOf(k);
  return out.sort((a, b) =>
    Number(b.urgent) - Number(a.urgent)
    || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity)
    || order(a.kind) - order(b.kind)
    || (a.requirementIds?.[0] && b.requirementIds?.[0] ? compareReqId(a.requirementIds[0], b.requirementIds[0]) : 0));
}
