'use client';

/**
 * แดชบอร์ดรอบ (saas-spec §P7 + friendly-spec §F13)
 * - Stepper แถบสถานะรอบ (track) · การ์ด "ขั้นตอนถัดไป" (cycle-next-info) แสดงเสมอ + preflight warnings ก่อนกด
 *   ≥1280 อยู่คอลัมน์ขวา 22rem (DOM มาก่อน → มือถือ/แท็บเล็ตอยู่บนสุดเหมือนเดิม)
 * - cycle-actions render เฉพาะเมื่อมีปุ่ม · ปุ่มไปข้างหน้า default · ส่งกลับแก้ไข destructiveOutline แยกท้าย
 * - KPI (§C8): ring อนุมัติ n/53 + "ความพร้อมด้านหลักฐาน" + tile ระดับ gap (กดกรอง ซิงก์กับ gap-filter) + kpi-summary (U1b M4)
 * - heatmap (§C9 — HEAT_CLASS, ไอคอนระดับ + ไอคอนสถานะข้อมุมขวาบน) · gap จัดกลุ่มตามเกณฑ์ พับได้ + "แสดงทั้งหมด"
 * - กฎ R1–R11: แผงเปิดในหน้า (เต็มความกว้างการ์ด) แทน popover ลอย — ไม่ล้นจอ 390
 * - L7 ฉลองครั้งเดียวต่อ cycle+revision ต่อผู้ใช้ (localStorage aunqa_celebrated) เฉพาะเมื่อไม่มีวิกฤต — ประกาย `celebrate-spark` bg-primary
 * - presentation only (R2-F3): logic/testid/ข้อความเดิมทุกตัว
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CYCLE_TRANSITIONS, can, cycleScope, downloadBlob, exportSarDocx, getCycle, getProgramme, getReadiness,
  getTransitionPreflight, isAssessorOf, listActionItems, listReviewEvents, listSections, listUsers, openRevision, transitionCycle,
  verifySnapshot,
} from '@/lib/api';
import type { CycleStatus, Gap, GapSeverity, HeatCell, TransitionPreflight } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import {
  Async, AsyncButton, Badge, CycleStatusBadge, Empty, HeatLegend, InlineMessage, PageHeader, useLoad, useMe,
} from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import ProgressRing from '@/components/ui/ProgressRing';
import Stepper, { type StepItem } from '@/components/ui/Stepper';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { HEAT_CLASS, TONE_TEXT } from '@/lib/ui/tone';
import {
  CYCLE_ACTION_TH, CYCLE_STATUS_TH, SECTION_STATUS_TH, SEVERITY_ORDER, SEVERITY_TH, decodeParam, errMsg, fmtDate,
  fmtDateTime, gapTextTh, sectionHref,
} from '@/lib/ui/aunqa';
import { HEAT_VIEW, NEXT_ACTOR_TH, SECTION_STATUS_VIEW, SEVERITY_VIEW } from '@/lib/ui/status';
import { GAP_RULE_KEYS, GLOSSARY } from '@/lib/ui/glossary';
import { notifyTodosChanged } from '@/lib/ui/todo';
import { useLang } from '@/context/LangContext';

const TRACK: { key: string; label: string }[] = [
  { key: 'draft', label: 'ร่าง' }, { key: 'progress', label: 'ดำเนินการ' }, { key: 'qa', label: 'QA คณะตรวจ' },
  { key: 'dean', label: 'คณบดีอนุมัติ' }, { key: 'assess', label: 'ประเมิน' }, { key: 'close', label: 'ปิดรอบ' },
];
const TRACK_AT: Record<CycleStatus, number> = {
  draft: 0, in_progress: 1, revision_requested: 1, under_review: 2, faculty_approved: 3,
  final_approved: 4, under_assessment: 4, assessed: 5, closed: 6,
};
const CELEBRATED_KEY = 'aunqa_celebrated';

function ruleTitle(ruleId: string): string { return GLOSSARY[`gap_rule_${ruleId}`]?.titleTh ?? ruleId; }
function stripReq(msg: string, req: string): string { return msg.replace(new RegExp(`^ข้อ ${req.replace('.', '\\.')}:?\\s*`), ''); }

const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
const H2 = 'text-xl font-semibold text-foreground';
const CODE_LINK = 'inline-flex min-h-11 items-center rounded-md px-1 font-semibold tabular-nums text-primary underline underline-offset-4 hover:decoration-2';

/** แผงรายการกฎ R1–R11 (U1b m6) — คืน fragment 2 ชิ้นให้หัวการ์ดที่เป็น flex-wrap: [ตัวกรอง + ปุ่ม] และแผง (basis-full) */
function GapRulesHelp({ children }: { children?: ReactNode }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false); };
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button ref={btn} type="button" variant="ghost" size="compact" aria-expanded={open} aria-controls={id}
          data-testid="gap-rules-help" onClick={() => setOpen(o => !o)}>
          <Icon name="help-circle" size={20} className="text-muted-foreground" />กฎ R1–R11 คืออะไร
        </Button>
      </div>
      {open && (
        <div ref={pop} id={id} className="basis-full animate-pop-in rounded-xl border bg-muted/40 p-4" role="group" aria-label="กฎตรวจช่องว่าง R1–R11" data-no-i18n={lang === 'en' ? '' : undefined}>
          <ul className="grid list-none gap-x-6 gap-y-3 md:grid-cols-2">
            {GAP_RULE_KEYS.map(k => (
              <li key={k} className="min-w-0">
                <strong className="block font-medium text-foreground">{lang === 'en' ? t(GLOSSARY[k].titleTh) : GLOSSARY[k].titleTh}</strong>
                <span className="aq-meta block">{lang === 'en' ? GLOSSARY[k].bodyEn : GLOSSARY[k].bodyTh}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function HeatCellLink({ h, cycleId, firstGap }: { h: HeatCell; cycleId: string; firstGap?: Gap }) {
  const st = SECTION_STATUS_VIEW[h.sectionStatus];
  const lv = HEAT_VIEW[h.level];
  const g = h.gaps;
  let tip = `ข้อ ${h.requirementId} · ${SECTION_STATUS_TH[h.sectionStatus]} · ${lv.label}`;
  if (g.critical > 0) tip += ` · ยังมีช่องว่างวิกฤต ${g.critical}`;
  else if (g.high + g.medium > 0) tip += ` · ช่องว่าง สูง ${g.high} กลาง ${g.medium}`;
  if (firstGap && (g.critical > 0 || g.high > 0)) tip += ` (${stripReq(gapTextTh(firstGap.messageTh), h.requirementId)})`;
  return (
    <Link
      href={sectionHref(cycleId, h.requirementId)}
      className={cn(
        'relative flex min-h-[4.25rem] min-w-0 flex-col justify-center rounded-md border px-2 py-1.5 no-underline transition-colors duration-fast hover:border-foreground/30 max-sm:min-h-16',
        HEAT_CLASS[h.level],
      )}
      title={tip} aria-label={tip} data-testid={`heat-${h.requirementId}`} data-level={h.level}
    >
      <Icon name={st.icon} size={14} className="absolute right-1.5 top-1.5" />
      <span className="text-base font-semibold tabular-nums">{h.requirementId}</span>
      <span className="aq-heat-cell__label inline-flex items-center gap-0.5"><Icon name={lv.icon} size={14} />{lv.label}</span>
    </Link>
  );
}

export default function CycleDashboardPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const { showToast } = useToast();
  const { confirm, prompt } = useDialog();
  const [sev, setSev] = useState<GapSeverity | 'all'>('all');
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  const [sparkle, setSparkle] = useState(false);

  const q = useLoad(async () => {
    const cycle = getCycle(user, id);
    const readiness = getReadiness(user, id);
    const sections = listSections(user, id);
    const names = new Map(listUsers(cycle.universityId).map(u => [u.id, u.fullName]));
    const events = listReviewEvents(user, id);
    const verify = cycle.lockedAt ? await verifySnapshot(id) : null;
    const scope = cycleScope(cycle);
    // การส่งผลประเมิน (→ assessed) ทำจากหน้ากรรมการ
    const transitions = CYCLE_TRANSITIONS.filter(t => t.from === cycle.status && t.to !== 'assessed' && can(user, t.action, scope));
    const preflight = new Map<CycleStatus, TransitionPreflight>();
    for (const t of transitions) {
      if (t.to === 'revision_requested') continue;
      try { preflight.set(t.to, getTransitionPreflight(user, id, t.to)); } catch { /* อ่านไม่ได้ = ไม่มีคำเตือน */ }
    }
    return { cycle, readiness, sections, names, events, verify, transitions, preflight };
  }, [user.id, id]);

  const cycleKey = q.data ? `${user.id}:${q.data.cycle.id}:${q.data.cycle.revision}` : '';
  const approvedNow = q.data ? q.data.sections.filter(s => s.status === 'approved').length : 0;
  const criticalNow = q.data ? q.data.readiness.heatmap.filter(h => h.gaps.critical > 0).length : 0;
  useEffect(() => {
    if (!q.data || q.data.cycle.status !== 'in_progress' || approvedNow < q.data.sections.length || criticalNow > 0) return; // U-8
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(CELEBRATED_KEY) || '[]');
      if (seen.includes(cycleKey)) return;
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...seen, cycleKey]));
      setSparkle(true);
    } catch { /* storage ปิด — ไม่ฉลอง */ }
  }, [q.data, cycleKey, approvedNow, criticalNow]);

  async function doTransition(to: CycleStatus, requireNote: boolean, pf?: TransitionPreflight) {
    const action = CYCLE_ACTION_TH[to];
    let note: string | undefined;
    if (requireNote) {
      const r = await prompt({
        title: action, message: 'ระบุเหตุผล/ข้อเสนอแนะ (ผู้เขียนจะเห็นข้อความนี้)', required: true, variant: 'warning',
        placeholder: 'เช่น เกณฑ์ 4 ยังขาดหลักฐานการทวนสอบ…', confirmText: `ยืนยัน${action}`,
      });
      if (r === null) return;
      note = r;
    } else {
      const warns: { code: string; messageTh: ReactNode }[] = [...(pf?.warnings ?? [])];
      // UX-U3-8: ปิดรอบ — เตือนถ้ายังไม่มีแผนปรับปรุงที่สร้างจาก AFI ของรอบนี้
      let closeOk: ReactNode[] = [];
      if (to === 'closed' && q.data) {
        let made = 0;
        try { made = listActionItems(user, q.data.cycle.programmeId).filter(a => a.originCycleId === id).length; } catch { /* ไม่มีสิทธิ์อ่าน */ }
        if (made === 0) {
          warns.push({ code: 'no_actions', messageTh: <>ยังไม่มีแผนปรับปรุงที่สร้างจากข้อเสนอแนะ (<Term k="afi">AFI</Term>) ของรอบนี้ — สร้างได้ที่หน้า “แผนปรับปรุง” (ปุ่มสร้างจาก AFI)</> });
        } else closeOk = [`มีแผนปรับปรุงจากรอบนี้แล้ว ${made} รายการ`];
      }
      const ok = await confirm({
        title: action,
        message: to === 'final_approved'
          ? 'เมื่ออนุมัติสุดท้าย รอบจะถูกล็อก แก้ไขเนื้อหา/หลักฐานไม่ได้ และบันทึกลายนิ้วมือเอกสาร (hash)'
          : to === 'closed'
            ? 'เมื่อปิดรอบแล้ว ผลประเมินจะแก้ไขไม่ได้ และรอบจะย้ายไปอยู่ในรายการรอบที่ปิดแล้ว'
            : `เปลี่ยนสถานะรอบเป็น “${CYCLE_STATUS_TH[to]}”`,
        details: warns.length || closeOk.length ? (
          <ul className="list-none space-y-2">
            {closeOk.map((t, i) => (
              <li key={`ok${i}`} className="flex items-start gap-2 text-foreground">
                <Icon name="check-circle" size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT.ok)} /><span>{t}</span>
              </li>
            ))}
            {warns.map(w => (
              <li key={w.code} className="flex items-start gap-2 text-foreground">
                <Icon name="alert-triangle" size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT.warn)} /><span>{w.messageTh}</span>
              </li>
            ))}
          </ul>
        ) : undefined,
        variant: warns.length || to === 'final_approved' ? 'warning' : 'primary',
        confirmText: warns.length ? `ยืนยัน${action} (มีข้อควรระวัง ${warns.length} เรื่อง)` : `ยืนยัน${action}`,
        cancelText: 'กลับไปตรวจก่อน',
        initialFocus: warns.length ? 'cancel' : undefined,
      });
      if (!ok) return;
    }
    try {
      await transitionCycle(user, id, to, note);
      showToast(`เปลี่ยนสถานะเป็น “${CYCLE_STATUS_TH[to]}” แล้ว`, 'success');
      notifyTodosChanged();
      q.reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  async function doRevision() {
    const note = await prompt({
      title: 'เปิด revision ใหม่', message: 'รอบจะปลดล็อกเพื่อแก้ไข และเลข revision เพิ่มขึ้น', required: true,
      placeholder: 'เหตุผลในการเปิด revision', confirmText: 'ยืนยันเปิด revision ใหม่', variant: 'warning',
    });
    if (note === null) return;
    try { openRevision(user, id, note); showToast('เปิด revision ใหม่แล้ว', 'success'); notifyTodosChanged(); q.reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q} skeleton="dashboard">{({ cycle, readiness, sections, names, events, verify, transitions, preflight }) => {
      const scope = cycleScope(cycle);
      const prog = getProgramme(cycle.programmeId);
      const isAssessor = isAssessorOf(user, cycle.id);
      const showAssess = isAssessor || cycle.status === 'assessed' || cycle.status === 'closed';
      const canAssign = can(user, 'cycle.assign', scope);
      // P3 (R2-F11): QA คณะ/ผู้ดูแลมหาวิทยาลัยมี assessor.assign อย่างเดียว ก็ต้องเห็นทางไปหน้ามอบหมาย (มอบหมายกรรมการ)
      const canAssignAssessor = can(user, 'assessor.assign', scope);
      // U1 (R2-F11): เหตุผลที่รอบถูกส่งกลับล่าสุด — แสดงจนกว่าจะส่งให้ QA คณะตรวจอีกครั้ง
      const cycleEvents = events.filter(e => e.targetType === 'cycle');
      const lastCycleReturn = [...cycleEvents].reverse().find(e => e.toStatus === 'revision_requested');
      const showReturn = !!lastCycleReturn && (cycle.status === 'revision_requested' || cycle.status === 'in_progress')
        && !cycleEvents.some(e => e.at > lastCycleReturn.at && e.toStatus === 'under_review');
      const canReopen = cycle.status === 'final_approved' && can(user, 'cycle.reopen', scope);
      const a = sections.filter(s => s.status === 'approved').length;
      const c = readiness.heatmap.filter(h => h.gaps.critical > 0).length;
      const clean = a === 53 && c === 0;
      const forward = transitions.filter(t => t.to !== 'revision_requested');
      const back = transitions.find(t => t.to === 'revision_requested');
      const youNext = transitions.length > 0 || canReopen;
      const at = TRACK_AT[cycle.status];
      const steps: StepItem[] = TRACK.map((s, i) => ({
        key: s.key, label: s.label, state: i < at ? 'done' : i === at ? 'current' : 'todo',
      }));
      const firstGap = new Map<string, Gap>();
      for (const g of readiness.gaps) if (!firstGap.has(g.requirementId)) firstGap.set(g.requirementId, g);

      const gaps = readiness.gaps
        .filter(g => sev === 'all' || g.severity === sev)
        .sort((x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity)
          || x.requirementId.localeCompare(y.requirementId, undefined, { numeric: true }));
      const critNo = (g: Gap) => readiness.heatmap.find(h => h.requirementId === g.requirementId)?.criterionNo ?? Number(g.requirementId.split('.')[0]);
      const groups = Array.from(new Set(gaps.map(critNo))).sort((x, y) => x - y)
        .map(no => ({ no, items: gaps.filter(g => critNo(g) === no) }));
      const allOpen = groups.length > 0 && groups.every(g => openGroups.has(g.no));
      const rows = Array.from(new Set(readiness.heatmap.map(h => h.criterionNo))).sort((x, y) => x - y);
      const prefWarns = forward.flatMap(t => (preflight.get(t.to)?.warnings ?? []).map(w => ({ to: t.to, w })));

      return (
        <>
          <PageHeader
            crumbs={[{ label: 'รอบประเมิน', href: '/app/cycles' }, { label: String(cycle.academicYear) }]}
            title={`รอบประเมิน ${cycle.academicYear}`}
            status={<CycleStatusBadge status={cycle.status} />}
            sub={<>{prog?.nameTh} · <Term k="revision">ฉบับที่</Term> {cycle.revision} · กำหนดส่ง {fmtDate(cycle.submissionDue)} · วันประเมิน {fmtDate(cycle.assessmentDate)}</>}
            actions={<>
              {showAssess && <Button asChild><Link href={`/app/cycles/${id}/assess`} data-testid="go-assess">{isAssessor ? 'พื้นที่ทำงานกรรมการ' : 'ดูผลประเมินของกรรมการ'}</Link></Button>}
              {(canAssign || canAssignAssessor) && (
                <Button asChild variant="outline" className="whitespace-nowrap">
                  <Link href={`/app/cycles/${id}/assign`} data-testid="go-assign">
                    <Icon name="users" size={20} />{canAssign ? 'มอบหมายงาน' : 'มอบหมายกรรมการ'}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline"><Link href="/app/export" data-testid="go-export"><Icon name="download" size={20} />ส่งออก</Link></Button>
            </>}
          />

          {showReturn && lastCycleReturn && (
            <InlineMessage tone="warn" icon="undo" testId="cycle-return-reason" className="mb-6"
              title={`${names.get(lastCycleReturn.actorId) || 'ผู้ตรวจ'} ส่งรอบนี้กลับแก้ไขเมื่อ ${fmtDateTime(lastCycleReturn.at)}`}>
              <p className="whitespace-pre-wrap break-words">
                {lastCycleReturn.note?.trim() ? `เหตุผล: “${lastCycleReturn.note.trim()}”` : 'ไม่ได้ระบุเหตุผล'}
              </p>
              {can(user, 'cycle.submit', scope) && (<ol className="mt-3 list-decimal space-y-1 pl-6" data-testid="cycle-return-steps">
                <li className={cn(cycle.status === 'in_progress' && 'text-muted-foreground')}>
                  {cycle.status === 'in_progress'
                    ? `กด “${CYCLE_ACTION_TH.in_progress}” เพื่อเปิดรอบให้แก้ไขได้ (ทำแล้ว)`
                    : `กด “${CYCLE_ACTION_TH.in_progress}” เพื่อเปิดรอบให้แก้ไขได้`}
                </li>
                <li>เปิดข้อที่ต้องแก้ แล้วกด “ส่งกลับแก้ไข” ที่ข้อนั้นให้ผู้เขียนแก้ (ข้อที่อนุมัติแล้วต้องส่งกลับก่อนจึงแก้ได้)</li>
                <li>{`เมื่อแก้ครบแล้ว กด “${CYCLE_ACTION_TH.under_review}” อีกครั้ง`}</li>
              </ol>)}
            </InlineMessage>
          )}

          <Stepper variant="track" ariaLabel="ขั้นของรอบประเมิน" steps={steps} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* ขั้นตอนถัดไป — DOM มาก่อน (มือถืออยู่บนสุด) · ≥1280 ย้ายไปคอลัมน์ขวา */}
            <section className={cn(CARD, 'min-w-0 space-y-4 self-start xl:col-start-2 xl:row-start-1')} aria-labelledby="next-h" data-testid="cycle-next-info">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary" aria-hidden="true">
                  <Icon name="chevron-right" size={20} />
                </span>
                <h2 id="next-h" className="text-lg font-semibold text-foreground">ขั้นตอนถัดไป</h2>
              </div>
              {cycle.status === 'closed' ? (
                <p className="text-foreground" data-testid="cycle-closed-next">
                  รอบนี้ปิดแล้ว — <Link className="font-medium text-primary underline underline-offset-4" href={`/app/cycles/${encodeURIComponent(cycle.id)}/assess`}>ดูผลประเมิน</Link> หรือ <Link className="font-medium text-primary underline underline-offset-4" href="/app/export">ส่งออกเอกสาร</Link>
                </p>
              ) : (
                <p className="text-foreground">ตอนนี้รอ: <strong className="font-semibold">{NEXT_ACTOR_TH[cycle.status]}</strong>{youNext ? ' (คุณ)' : ''}</p>
              )}
              {cycle.status === 'faculty_approved' && back && (
                <InlineMessage tone="info" testId="dean-return-hint">
                  คณบดีพิจารณาแล้วพบว่ายังไม่พร้อม สามารถ “ส่งกลับแก้ไข” ได้ โดยต้องระบุเหตุผลให้ประธานหลักสูตรทราบ
                </InlineMessage>
              )}
              {prefWarns.length > 0 && (
                <InlineMessage tone="warn" title={`ก่อน${CYCLE_ACTION_TH[prefWarns[0].to]}:`} testId="preflight-warnings">
                  {prefWarns.map(x => x.w.messageTh).join(' · ')}
                  {prefWarns.some(x => x.w.requirementIds.length > 0) && (
                    <details className="group/pf mt-2">
                      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                        ดูข้อที่เกี่ยวข้อง<Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open/pf:rotate-180" />
                      </summary>
                      <p className="flex flex-wrap gap-x-1">
                        {Array.from(new Set(prefWarns.flatMap(x => x.w.requirementIds))).map(r => (
                          <Link key={r} className={CODE_LINK} href={sectionHref(cycle.id, r)}>{r}</Link>
                        ))}
                      </p>
                    </details>
                  )}
                </InlineMessage>
              )}
              {(transitions.length > 0 || canReopen) && (
                <div className="space-y-3 border-t pt-4" data-testid="cycle-actions">
                  <div className="flex flex-wrap items-start gap-2">
                    {forward.map(t => {
                      const pf = preflight.get(t.to);
                      const blocked = (pf?.blockers.length ?? 0) > 0;
                      return (
                        <span key={t.to} className="inline-flex max-w-full flex-col gap-1">
                          <AsyncButton testId={`cycle-to-${t.to}`} variant="default" disabled={blocked}
                            busyText="กำลังเปลี่ยนสถานะ…" onClick={() => doTransition(t.to, !!t.requireNote, pf)}>
                            {CYCLE_ACTION_TH[t.to]}
                          </AsyncButton>
                          {blocked && <span className="aq-btn-reason">{pf!.blockers.join(' · ')}</span>}
                        </span>
                      );
                    })}
                    {canReopen && <AsyncButton variant="outline" testId="cycle-reopen" onClick={doRevision}>เปิด revision ใหม่</AsyncButton>}
                    {(cycle.status === 'under_review' || cycle.status === 'faculty_approved') && transitions.length > 0 && (
                      <AsyncButton variant="outline" testId="read-full-sar" busyText="กำลังสร้างไฟล์ Word…"
                        onClick={async () => {
                          try { downloadBlob(await exportSarDocx(user, cycle.id), `SAR_${prog?.code ?? 'SAR'}_${cycle.academicYear}.docx`); }
                          catch (e) { showToast(errMsg(e), 'error'); }
                        }}>
                        <Icon name="file-text" size={20} />อ่าน SAR ทั้งรอบ (.docx)
                      </AsyncButton>
                    )}
                  </div>
                  {back && (
                    <div className="border-t pt-3">
                      <AsyncButton testId={`cycle-to-${back.to}`} variant="destructiveOutline"
                        onClick={() => doTransition(back.to, true)}>
                        <Icon name="undo" size={20} />{CYCLE_ACTION_TH[back.to]}
                      </AsyncButton>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-1">
              {cycle.lockedAt && (
                <InlineMessage tone={verify?.ok ? 'success' : 'warn'} icon="lock" testId="lock-banner">
                  <p>
                    รอบนี้ถูกล็อกเมื่อ {fmtDateTime(cycle.lockedAt)} โดย {names.get(cycle.lockedBy || '') || '—'} ·{' '}
                    <Term k="hash">hash</Term> <code className="break-all rounded-md bg-card/70 px-1 font-mono text-base">{(cycle.snapshotHash || '').slice(0, 16)}…</code>
                    {' '}{verify ? (verify.ok ? '— ตรวจแล้ว เนื้อหา SAR ตรงกับที่ล็อก' : '— เนื้อหาไม่ตรงกับที่ล็อก') : ''}
                  </p>
                  {verify?.evidenceChanged && (
                    <p className="mt-2 flex items-start gap-2" data-testid="evidence-changed">
                      <Icon name="alert-triangle" size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT.warn)} />ข้อมูลหลักฐาน (ชื่อ คำอธิบาย สถานะตรวจสอบ ฯลฯ) มีการเปลี่ยนแปลงหลังล็อก — ตัวเอกสาร SAR ยังตรงกับที่ล็อก แต่ควรตรวจประวัติใน audit log
                    </p>
                  )}
                  {verify && verify.evidenceChanged === false && <p className="mt-1 text-muted-foreground" data-testid="evidence-unchanged">ข้อมูลหลักฐานยังตรงกับตอนล็อก</p>}
                </InlineMessage>
              )}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3" data-testid="kpi-row">
                <div className="flex items-center justify-center rounded-xl border bg-card p-4 shadow-sm dark:shadow-none md:p-5">
                  <span className="relative inline-flex">
                    <ProgressRing value={a} max={53} caption="อนุมัติแล้ว" clean={clean} ariaLabel={`อนุมัติแล้ว ${a} จาก 53 ข้อ`} />
                    {sparkle && Array.from({ length: 8 }, (_, i) => (
                      <i
                        key={i} aria-hidden="true"
                        className="celebrate-spark pointer-events-none absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 animate-spark rounded-full bg-primary"
                        style={{ ['--a' as string]: `${i * 45}deg` } as React.CSSProperties}
                      />
                    ))}
                  </span>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm dark:shadow-none md:p-5">
                  <div className="flex items-start gap-2">
                    <Icon name="chart-line" size={20} className="mt-0.5 shrink-0 text-primary" />
                    <span className="aq-kpi__label"><Term k="readiness">ความพร้อมด้านหลักฐาน</Term></span>
                  </div>
                  <div className="text-3xl font-semibold tabular-nums text-foreground" data-testid="readiness-percent">{readiness.percent}%</div>
                </div>
                {SEVERITY_ORDER.map(s => {
                  const n = readiness.gapCounts[s];
                  const v = SEVERITY_VIEW[s];
                  const tone = n === 0 ? 'neutral' : v.tone === 'bad' ? 'bad' : v.tone;
                  return (
                    <button
                      key={s} type="button" aria-pressed={sev === s}
                      className="flex min-h-11 flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left text-foreground shadow-sm transition-colors duration-fast hover:border-input hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary-muted dark:shadow-none md:p-5"
                      onClick={() => setSev(cur => (cur === s ? 'all' : s))}
                    >
                      <span className="flex items-start gap-2">
                        <Icon name={v.icon} size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT[tone])} />
                        <span className="aq-kpi__label">ช่องว่างระดับ{SEVERITY_TH[s]}</span>
                      </span>
                      <span className="text-3xl font-semibold tabular-nums text-foreground" data-testid={`gap-count-${s}`}>{n}</span>
                      {n === 0 && <span className="aq-kpi__label">ไม่มี</span>}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {c > 0 ? (
                  <InlineMessage tone="warn" testId="kpi-summary">
                    {`อนุมัติแล้ว ${a} จาก 53 ข้อ แต่ ${c} ข้อยังมีช่องว่างวิกฤต (เช่น ยังไม่มีหลักฐานผูก) — ควรเติมก่อนส่งต่อ`}
                  </InlineMessage>
                ) : a < 53 ? (
                  <InlineMessage tone="neutral" testId="kpi-summary">
                    {`อนุมัติแล้ว ${a} จาก 53 ข้อ ไม่มีช่องว่างวิกฤต — เหลืออีก ${53 - a} ข้อ`}
                  </InlineMessage>
                ) : (
                  <InlineMessage tone="success" testId="kpi-summary">ครบทุกข้อและไม่มีช่องว่างวิกฤต</InlineMessage>
                )}
                {cycle.status === 'in_progress' && a === 53 && (
                  c === 0
                    ? <InlineMessage tone="success">ครบทุกข้อแล้ว พร้อมส่ง QA คณะตรวจ</InlineMessage>
                    : <InlineMessage tone="info">{`อนุมัติครบ 53 ข้อแล้ว ส่ง QA คณะได้ — ยังมีช่องว่างวิกฤต ${c} ข้อที่ควรเติม`}</InlineMessage>
                )}
              </div>

              <section className={cn(CARD, 'space-y-5')} aria-labelledby="heat-h">
                <div className="space-y-3">
                  <h2 id="heat-h" className={H2}>Heatmap 53 ข้อ</h2>
                  <HeatLegend />
                </div>
                <div className="space-y-5" data-testid="heatmap">
                  {rows.map(no => {
                    const cells = readiness.heatmap.filter(h => h.criterionNo === no);
                    const ok = cells.filter(h => h.sectionStatus === 'approved').length;
                    return (
                      <div key={no} className="space-y-2">
                        <div className="aq-heat-label flex flex-wrap items-center gap-2 text-foreground">
                          <span>เกณฑ์ {no}</span><span className="tabular-nums text-muted-foreground">{ok}/{cells.length}</span>
                          {ok === cells.length && <Badge tone="ok" icon="check">ครบ</Badge>}
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))]">
                          {cells.map(h => <HeatCellLink key={h.requirementId} h={h} cycleId={cycle.id} firstGap={firstGap.get(h.requirementId)} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className={cn(CARD, 'min-w-0')} aria-labelledby="gap-h">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="gap-h" className={H2}>{`ช่องว่างที่ต้องแก้ (${gaps.length})`}</h2>
                <GapRulesHelp>
                  <NativeSelect value={sev} onChange={e => setSev(e.target.value as GapSeverity | 'all')} aria-label="กรองระดับ" data-testid="gap-filter" wrapperClassName="w-40">
                    <option value="all">ทุกระดับ</option>
                    {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_TH[s]}</option>)}
                  </NativeSelect>
                </GapRulesHelp>
              </div>
              {gaps.length === 0 ? <Empty icon="check-circle" title="ไม่พบช่องว่างในระดับนี้" /> : (
                <>
                  <Button type="button" variant="outline" size="compact" className="mb-3"
                    onClick={() => setOpenGroups(allOpen ? new Set() : new Set(groups.map(g => g.no)))}>
                    {allOpen ? 'ย่อทั้งหมด' : `แสดงทั้งหมด (${gaps.length})`}
                  </Button>
                  <div className="divide-y rounded-lg border" data-testid="gap-list">
                    {groups.map(g => {
                      const open = openGroups.has(g.no);
                      const cnt = SEVERITY_ORDER.map(s => [s, g.items.filter(x => x.severity === s).length] as const).filter(([, n]) => n > 0);
                      return (
                        <div key={g.no}>
                          <button type="button" aria-expanded={open} aria-controls={`gapg-${g.no}`}
                            className="flex min-h-11 w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-2 text-left font-medium text-foreground transition-colors duration-fast hover:bg-accent"
                            onClick={() => setOpenGroups(cur => { const n = new Set(cur); if (n.has(g.no)) n.delete(g.no); else n.add(g.no); return n; })}>
                            <span className="min-w-0">เกณฑ์ {g.no} — {g.items.length} รายการ <span className="aq-meta">({cnt.map(([s, n]) => `${SEVERITY_TH[s]} ${n}`).join(' · ')})</span></span>
                            <Icon name="chevron-down" size={20} className={cn('shrink-0 text-muted-foreground transition-transform duration-fast', open && 'rotate-180')} />
                          </button>
                          <ul id={`gapg-${g.no}`} className="list-none divide-y border-t bg-muted/30" hidden={!open}>
                            {g.items.map(x => {
                              const v = SEVERITY_VIEW[x.severity];
                              return (
                                <li key={x.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
                                  <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>
                                  <Link className="min-w-0 flex-1 basis-48 text-foreground underline underline-offset-4 hover:text-primary" href={sectionHref(cycle.id, x.requirementId)}>{gapTextTh(x.messageTh)}</Link>
                                  <span className="aq-meta" title={ruleTitle(x.ruleId)}>({x.ruleId})</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className={cn(CARD, 'min-w-0')} aria-labelledby="pend-h">
              <h2 id="pend-h" className={cn(H2, 'mb-4')}>งานค้างรายคน</h2>
              {readiness.pending.length === 0 ? <Empty icon="users" title="ยังไม่มีงานค้างที่มอบหมาย" /> : (
                <Table data-testid="pending-table">
                  <TableHeader>
                    <tr>
                      <TableHead>ผู้รับผิดชอบ</TableHead><TableHead className="text-right">ค้าง</TableHead>
                      <TableHead className="text-right">เลยกำหนด</TableHead><TableHead>ครบกำหนดถัดไป</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {readiness.pending.map(p => (
                      <TableRow key={p.userId}>
                        <TableCell className="min-w-[10rem]">
                          <span className="font-medium text-foreground">{names.get(p.userId) || p.userId}</span>
                          <div className="aq-meta">ข้อ {p.requirementIds.slice(0, 8).join(', ')}{p.requirementIds.length > 8 ? '…' : ''}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.open}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.overdue > 0 ? <Badge tone="bad">{p.overdue}</Badge> : 0}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(p.nextDue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <details className="group/hist mt-5 rounded-lg border bg-card">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium text-foreground transition-colors duration-fast hover:bg-accent [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">ประวัติการเปลี่ยนสถานะ ({events.length})</span>
                  <Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open/hist:rotate-180" />
                </summary>
                <ul className="list-none divide-y border-t">
                  {events.slice(-30).reverse().map(e => (
                    <li key={e.id} className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 py-2.5">
                      <span className="aq-meta whitespace-nowrap tabular-nums">{fmtDateTime(e.at)}</span>
                      <span className="min-w-0 flex-1 text-foreground">
                        {names.get(e.actorId) || e.actorId}: {e.targetType === 'cycle' ? 'รอบ' : `ข้อ ${e.targetId.split('::')[1]}`} →{' '}
                        {e.targetType === 'cycle'
                          ? CYCLE_STATUS_TH[e.toStatus as CycleStatus] ?? e.toStatus
                          : SECTION_STATUS_TH[e.toStatus as keyof typeof SECTION_STATUS_TH] ?? e.toStatus}
                        {e.note ? ` (${e.note})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          </div>
        </>
      );
    }}</Async>
  );
}
