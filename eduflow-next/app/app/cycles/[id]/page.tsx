'use client';

/**
 * แดชบอร์ดรอบ (ADR-UI-001 pages.md P7)
 * - Stepper แถบสถานะรอบ (track) · การ์ด "ขั้นตอนถัดไป" (cycle-next-info) แสดงเสมอ + preflight warnings ก่อนกด
 * - cycle-actions render เฉพาะเมื่อมีปุ่ม · ปุ่มไปข้างหน้า primary · ส่งกลับแก้ไข danger ขวาสุด
 * - KPI: ring อนุมัติ n/53 + "ความพร้อมด้านหลักฐาน" + tile ระดับ gap (กดกรอง ซิงก์กับ gap-filter) + kpi-summary (U1b M4)
 * - heatmap C13 (ไอคอนระดับ + ไอคอนสถานะข้อมุมขวาบน — P8) · gap จัดกลุ่มตามเกณฑ์ พับได้ + "แสดงทั้งหมด"
 * - L7 ฉลองครั้งเดียวต่อ cycle+revision ต่อผู้ใช้ (localStorage aunqa_celebrated) เฉพาะเมื่อไม่มีวิกฤต
 */
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CYCLE_TRANSITIONS, can, cycleScope, downloadBlob, exportSarDocx, getCycle, getProgramme, getReadiness,
  getTransitionPreflight, isAssessorOf, listReviewEvents, listSections, listUsers, openRevision, transitionCycle,
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
import {
  CYCLE_ACTION_TH, CYCLE_STATUS_TH, SECTION_STATUS_TH, SEVERITY_ORDER, SEVERITY_TH, decodeParam, errMsg, fmtDate,
  fmtDateTime, sectionHref,
} from '@/lib/ui/aunqa';
import { HEAT_VIEW, NEXT_ACTOR_TH, SECTION_STATUS_VIEW, SEVERITY_VIEW } from '@/lib/ui/status';
import { GAP_RULE_KEYS, GLOSSARY } from '@/lib/ui/glossary';
import { notifyTodosChanged } from '@/lib/ui/todo';

const TRACK: { key: string; label: string }[] = [
  { key: 'draft', label: 'ร่าง' }, { key: 'progress', label: 'ดำเนินการ' }, { key: 'qa', label: 'QA คณะตรวจ' },
  { key: 'dean', label: 'คณบดีอนุมัติ/ล็อก' }, { key: 'assess', label: 'ประเมิน' }, { key: 'close', label: 'ปิดรอบ' },
];
const TRACK_AT: Record<CycleStatus, number> = {
  draft: 0, in_progress: 1, revision_requested: 1, under_review: 2, faculty_approved: 3,
  final_approved: 4, under_assessment: 4, assessed: 5, closed: 6,
};
const CELEBRATED_KEY = 'aunqa_celebrated';

function ruleTitle(ruleId: string): string { return GLOSSARY[`gap_rule_${ruleId}`]?.titleTh ?? ruleId; }
function stripReq(msg: string, req: string): string { return msg.replace(new RegExp(`^ข้อ ${req.replace('.', '\\.')}:?\\s*`), ''); }

/** popover รายการกฎ R1–R11 (U1b m6) */
function GapRulesHelp() {
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
    <div className="aq-popwrap">
      <button ref={btn} type="button" className="aq-btn aq-btn-ghost aq-btn-compact" aria-expanded={open} aria-controls={id}
        data-testid="gap-rules-help" onClick={() => setOpen(o => !o)}>
        <Icon name="help-circle" size={20} />กฎ R1–R11 คืออะไร
      </button>
      {open && (
        <div ref={pop} id={id} className="aq-popover aq-popover--down aq-popover--wide" role="group" aria-label="กฎตรวจช่องว่าง R1–R11">
          <ul className="aq-rule-list">
            {GAP_RULE_KEYS.map(k => <li key={k}><strong>{GLOSSARY[k].titleTh}</strong><span className="aq-meta">{GLOSSARY[k].bodyTh}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function HeatCellLink({ h, cycleId, firstGap }: { h: HeatCell; cycleId: string; firstGap?: Gap }) {
  const st = SECTION_STATUS_VIEW[h.sectionStatus];
  const lv = HEAT_VIEW[h.level];
  const g = h.gaps;
  let tip = `ข้อ ${h.requirementId} · ${SECTION_STATUS_TH[h.sectionStatus]} · ${lv.label}`;
  if (g.critical > 0) tip += ` · ยังมีช่องว่างวิกฤต ${g.critical}`;
  else if (g.high + g.medium > 0) tip += ` · ช่องว่าง สูง ${g.high} กลาง ${g.medium}`;
  if (firstGap && (g.critical > 0 || g.high > 0)) tip += ` (${stripReq(firstGap.messageTh, h.requirementId)})`;
  return (
    <Link href={sectionHref(cycleId, h.requirementId)} className={`aq-heat-cell aq-heat-${h.level}`}
      title={tip} aria-label={tip} data-testid={`heat-${h.requirementId}`} data-level={h.level}>
      <Icon name={st.icon} size={16} className="aq-heat-cell__status" />
      <span className="aq-heat-cell__no">{h.requirementId}</span>
      <span className="aq-heat-cell__label"><Icon name={lv.icon} size={16} />{lv.label}</span>
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
    if (!q.data || q.data.cycle.status !== 'in_progress' || approvedNow < 53 || criticalNow > 0) return;
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
      const warns = pf?.warnings ?? [];
      const ok = await confirm({
        title: action,
        message: to === 'final_approved'
          ? 'เมื่ออนุมัติสุดท้าย รอบจะถูกล็อก แก้ไขเนื้อหา/หลักฐานไม่ได้ และบันทึกลายนิ้วมือเอกสาร (hash)'
          : `เปลี่ยนสถานะรอบเป็น “${CYCLE_STATUS_TH[to]}”`,
        details: warns.length ? (
          <ul>{warns.map(w => (
            <li key={w.code} className="aq-checkitem aq-checkitem--warn"><Icon name="alert-triangle" size={20} />{w.messageTh}</li>
          ))}</ul>
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
            sub={<>{prog?.nameTh} · revision {cycle.revision} · กำหนดส่ง {fmtDate(cycle.submissionDue)} · วันประเมิน {fmtDate(cycle.assessmentDate)}</>}
            actions={<>
              {showAssess && <Link className="aq-btn aq-btn-primary" href={`/app/cycles/${id}/assess`} data-testid="go-assess">{isAssessor ? 'พื้นที่ทำงานกรรมการ' : 'ดูผลประเมินของกรรมการ'}</Link>}
              {canAssign && <Link className="aq-btn" href={`/app/cycles/${id}/assign`} data-testid="go-assign"><Icon name="users" size={20} />มอบหมายงาน</Link>}
              <Link className="aq-btn" href="/app/export" data-testid="go-export"><Icon name="download" size={20} />ส่งออก</Link>
            </>}
          />

          <Stepper variant="track" ariaLabel="ขั้นของรอบประเมิน" steps={steps} />

          <section className="aq-card aq-card--accent" aria-labelledby="next-h" data-testid="cycle-next-info">
            <h2 id="next-h" className="aq-h3">ขั้นตอนถัดไป</h2>
            <p>ตอนนี้รอ: <strong>{NEXT_ACTOR_TH[cycle.status]}</strong>{youNext && cycle.status !== 'closed' ? ' (คุณ)' : ''}</p>
            {cycle.status === 'faculty_approved' && back && (
              <InlineMessage tone="info" testId="dean-return-hint">
                คณบดีพิจารณาแล้วพบว่ายังไม่พร้อม สามารถ “ส่งกลับแก้ไข” ได้ โดยต้องระบุเหตุผลให้ประธานหลักสูตรทราบ
              </InlineMessage>
            )}
            {prefWarns.length > 0 && (
              <InlineMessage tone="warn" title={`ก่อน${CYCLE_ACTION_TH[prefWarns[0].to]}:`} testId="preflight-warnings">
                {prefWarns.map(x => x.w.messageTh).join(' · ')}
                {prefWarns.some(x => x.w.requirementIds.length > 0) && (
                  <details className="aq-collapse">
                    <summary>ดูข้อที่เกี่ยวข้อง<Icon name="chevron-down" size={20} className="aq-collapse__chev" /></summary>
                    <p className="aq-cluster">
                      {Array.from(new Set(prefWarns.flatMap(x => x.w.requirementIds))).map(r => (
                        <Link key={r} className="aq-link aq-code" href={sectionHref(cycle.id, r)}>{r}</Link>
                      ))}
                    </p>
                  </details>
                )}
              </InlineMessage>
            )}
            {(transitions.length > 0 || canReopen) && (
              <div className="aq-next-actions" data-testid="cycle-actions">
                <div className="aq-cluster">
                  {forward.map(t => {
                    const pf = preflight.get(t.to);
                    const blocked = (pf?.blockers.length ?? 0) > 0;
                    return (
                      <span key={t.to} className="aq-btn-with-reason">
                        <AsyncButton testId={`cycle-to-${t.to}`} className="aq-btn aq-btn-primary" disabled={blocked}
                          busyText="กำลังเปลี่ยนสถานะ…" onClick={() => doTransition(t.to, !!t.requireNote, pf)}>
                          {CYCLE_ACTION_TH[t.to]}
                        </AsyncButton>
                        {blocked && <span className="aq-btn-reason">{pf!.blockers.join(' · ')}</span>}
                      </span>
                    );
                  })}
                  {canReopen && <AsyncButton className="aq-btn" testId="cycle-reopen" onClick={doRevision}>เปิด revision ใหม่</AsyncButton>}
                  {(cycle.status === 'under_review' || cycle.status === 'faculty_approved') && transitions.length > 0 && (
                    <AsyncButton className="aq-btn" testId="read-full-sar" busyText="กำลังสร้างไฟล์ Word…"
                      onClick={async () => {
                        try { downloadBlob(await exportSarDocx(user, cycle.id), `SAR_${prog?.code ?? 'SAR'}_${cycle.academicYear}.docx`); }
                        catch (e) { showToast(errMsg(e), 'error'); }
                      }}>
                      <Icon name="file-text" size={20} />อ่าน SAR ทั้งรอบ (.docx)
                    </AsyncButton>
                  )}
                </div>
                {back && (
                  <AsyncButton testId={`cycle-to-${back.to}`} className="aq-btn aq-btn-danger aq-actionbar__danger"
                    onClick={() => doTransition(back.to, true)}>
                    <Icon name="undo" size={20} />{CYCLE_ACTION_TH[back.to]}
                  </AsyncButton>
                )}
              </div>
            )}
          </section>

          {cycle.lockedAt && (
            <InlineMessage tone={verify?.ok ? 'success' : 'warn'} icon="lock" testId="lock-banner">
              <p>
                รอบนี้ถูกล็อกเมื่อ {fmtDateTime(cycle.lockedAt)} โดย {names.get(cycle.lockedBy || '') || '—'} ·{' '}
                <Term k="hash">hash</Term> <code className="aq-code">{(cycle.snapshotHash || '').slice(0, 16)}…</code>
                {' '}{verify ? (verify.ok ? '— ตรวจแล้ว เนื้อหา SAR ตรงกับที่ล็อก' : '— เนื้อหาไม่ตรงกับที่ล็อก') : ''}
              </p>
              {verify?.evidenceChanged && (
                <p className="aq-cluster" data-testid="evidence-changed">
                  <Icon name="alert-triangle" size={20} />ข้อมูลหลักฐาน (ชื่อ คำอธิบาย สถานะตรวจสอบ ฯลฯ) มีการเปลี่ยนแปลงหลังล็อก — ตัวเอกสาร SAR ยังตรงกับที่ล็อก แต่ควรตรวจประวัติใน audit log
                </p>
              )}
              {verify && verify.evidenceChanged === false && <p className="aq-muted" data-testid="evidence-unchanged">ข้อมูลหลักฐานยังตรงกับตอนล็อก</p>}
            </InlineMessage>
          )}

          <div className="aq-kpi-row" data-testid="kpi-row">
            <div className="aq-kpi aq-kpi--ring">
              <span className={`aq-celebrate${sparkle ? ' is-on' : ''}`}>
                <ProgressRing value={a} max={53} caption="อนุมัติแล้ว" clean={clean} ariaLabel={`อนุมัติแล้ว ${a} จาก 53 ข้อ`} />
                {sparkle && Array.from({ length: 8 }, (_, i) => (
                  <i key={i} className="aq-celebrate-spark" style={{ ['--a' as string]: `${i * 45}deg` } as React.CSSProperties} aria-hidden="true" />
                ))}
              </span>
            </div>
            <div className="aq-kpi aq-kpi--primary">
              <div className="aq-kpi__top"><Icon name="chart-line" size={20} /><span className="aq-kpi__label"><Term k="readiness">ความพร้อมด้านหลักฐาน</Term></span></div>
              <div className="aq-kpi__num" data-testid="readiness-percent">{readiness.percent}%</div>
            </div>
            {SEVERITY_ORDER.map(s => {
              const n = readiness.gapCounts[s];
              const v = SEVERITY_VIEW[s];
              const tone = n === 0 ? 'neutral' : v.tone === 'bad' ? 'bad' : v.tone;
              return (
                <button key={s} type="button" className={`aq-kpi aq-kpi--${tone}`} aria-pressed={sev === s}
                  onClick={() => setSev(cur => (cur === s ? 'all' : s))}>
                  <span className="aq-kpi__top"><Icon name={v.icon} size={20} /><span className="aq-kpi__label">ช่องว่างระดับ{SEVERITY_TH[s]}</span></span>
                  <span className="aq-kpi__num" data-testid={`gap-count-${s}`}>{n}</span>
                  {n === 0 && <span className="aq-kpi__label">ไม่มี</span>}
                </button>
              );
            })}
          </div>

          {c > 0 ? (
            <InlineMessage tone="warn" testId="kpi-summary" className="aq-kpi-summary">
              อนุมัติแล้ว {a} จาก 53 ข้อ แต่ {c} ข้อยังมีช่องว่างวิกฤต (เช่น ยังไม่มีหลักฐานผูก) — ควรเติมก่อนส่งต่อ
            </InlineMessage>
          ) : a < 53 ? (
            <InlineMessage tone="neutral" testId="kpi-summary" className="aq-kpi-summary">
              อนุมัติแล้ว {a} จาก 53 ข้อ ไม่มีช่องว่างวิกฤต — เหลืออีก {53 - a} ข้อ
            </InlineMessage>
          ) : (
            <InlineMessage tone="success" testId="kpi-summary" className="aq-kpi-summary">ครบทุกข้อและไม่มีช่องว่างวิกฤต</InlineMessage>
          )}
          {cycle.status === 'in_progress' && a === 53 && (
            c === 0
              ? <InlineMessage tone="success">ครบทุกข้อแล้ว พร้อมส่ง QA คณะตรวจ</InlineMessage>
              : <InlineMessage tone="info">อนุมัติครบ 53 ข้อแล้ว ส่ง QA คณะได้ — ยังมีช่องว่างวิกฤต {c} ข้อที่ควรเติม</InlineMessage>
          )}

          <section className="aq-card" aria-labelledby="heat-h">
            <h2 id="heat-h" className="aq-h2">Heatmap 53 ข้อ</h2>
            <HeatLegend />
            <div className="aq-heatmap" data-testid="heatmap">
              {rows.map(no => {
                const cells = readiness.heatmap.filter(h => h.criterionNo === no);
                const ok = cells.filter(h => h.sectionStatus === 'approved').length;
                return (
                  <div key={no} className="aq-heat-row">
                    <div className="aq-heat-label">
                      <span>เกณฑ์ {no}</span><span className="aq-tnum">{ok}/{cells.length}</span>
                      {ok === cells.length && <Badge tone="ok" icon="check">ครบ</Badge>}
                    </div>
                    <div className="aq-heat-cells">
                      {cells.map(h => <HeatCellLink key={h.requirementId} h={h} cycleId={cycle.id} firstGap={firstGap.get(h.requirementId)} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="aq-grid-2">
            <section className="aq-card" aria-labelledby="gap-h">
              <div className="aq-card__head">
                <h2 id="gap-h" className="aq-h2">ช่องว่างที่ต้องแก้ ({gaps.length})</h2>
                <div className="aq-cluster">
                  <select className="aq-input aq-input-sm" value={sev} onChange={e => setSev(e.target.value as GapSeverity | 'all')} aria-label="กรองระดับ" data-testid="gap-filter">
                    <option value="all">ทุกระดับ</option>
                    {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_TH[s]}</option>)}
                  </select>
                  <GapRulesHelp />
                </div>
              </div>
              {gaps.length === 0 ? <Empty icon="check-circle" title="ไม่พบช่องว่างในระดับนี้" /> : (
                <>
                  <button type="button" className="aq-btn aq-btn-compact aq-mb-2"
                    onClick={() => setOpenGroups(allOpen ? new Set() : new Set(groups.map(g => g.no)))}>
                    {allOpen ? 'ย่อทั้งหมด' : `แสดงทั้งหมด (${gaps.length})`}
                  </button>
                  <div data-testid="gap-list">
                    {groups.map(g => {
                      const open = openGroups.has(g.no);
                      const cnt = SEVERITY_ORDER.map(s => [s, g.items.filter(x => x.severity === s).length] as const).filter(([, n]) => n > 0);
                      return (
                        <div key={g.no} className="aq-gap-group">
                          <button type="button" className="aq-accordion__btn" aria-expanded={open} aria-controls={`gapg-${g.no}`}
                            onClick={() => setOpenGroups(cur => { const n = new Set(cur); if (n.has(g.no)) n.delete(g.no); else n.add(g.no); return n; })}>
                            <span>เกณฑ์ {g.no} — {g.items.length} รายการ <span className="aq-meta">({cnt.map(([s, n]) => `${SEVERITY_TH[s]} ${n}`).join(' · ')})</span></span>
                            <Icon name="chevron-down" size={20} />
                          </button>
                          <ul id={`gapg-${g.no}`} className="aq-accordion__panel aq-gap-items" hidden={!open}>
                            {g.items.map(x => {
                              const v = SEVERITY_VIEW[x.severity];
                              return (
                                <li key={x.id} className="aq-gap-row">
                                  <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>
                                  <Link className="aq-link aq-flex-1" href={sectionHref(cycle.id, x.requirementId)}>{x.messageTh}</Link>
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

            <section className="aq-card" aria-labelledby="pend-h">
              <h2 id="pend-h" className="aq-h2">งานค้างรายคน</h2>
              {readiness.pending.length === 0 ? <Empty icon="users" title="ยังไม่มีงานค้างที่มอบหมาย" /> : (
                <div className="aq-table-wrap">
                  <table className="aq-table" data-testid="pending-table">
                    <thead><tr><th>ผู้รับผิดชอบ</th><th className="aq-num">ค้าง</th><th className="aq-num">เลยกำหนด</th><th>ครบกำหนดถัดไป</th></tr></thead>
                    <tbody>
                      {readiness.pending.map(p => (
                        <tr key={p.userId}>
                          <td>{names.get(p.userId) || p.userId}<div className="aq-meta">ข้อ {p.requirementIds.slice(0, 8).join(', ')}{p.requirementIds.length > 8 ? '…' : ''}</div></td>
                          <td className="aq-num">{p.open}</td>
                          <td className="aq-num">{p.overdue > 0 ? <Badge tone="bad">{p.overdue}</Badge> : 0}</td>
                          <td>{fmtDate(p.nextDue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <details className="aq-collapse aq-mt-4">
                <summary>ประวัติการเปลี่ยนสถานะ ({events.length})<Icon name="chevron-down" size={20} className="aq-collapse__chev" /></summary>
                <ul className="aq-list">
                  {events.slice(-30).reverse().map(e => (
                    <li key={e.id}>
                      <span className="aq-meta">{fmtDateTime(e.at)}</span>
                      <span className="aq-flex-1">
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
