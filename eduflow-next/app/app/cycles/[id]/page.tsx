'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CYCLE_TRANSITIONS, can, cycleScope, getCycle, getProgramme, getReadiness, listReviewEvents, listSections,
  listUsers, openRevision, transitionCycle, verifySnapshot,
} from '@/lib/api';
import type { CycleStatus, GapSeverity } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import {
  Async, AsyncButton, Badge, CycleStatusBadge, Empty, HeatLegend, PageHeader, useLoad, useMe,
} from '@/components/aunqa/common';
import {
  CYCLE_ACTION_TH, CYCLE_STATUS_TH, HEAT_TH, SECTION_STATUS_TH, SEVERITY_ORDER, SEVERITY_TH, decodeParam, errMsg,
  fmtDate, fmtDateTime, sectionHref,
} from '@/lib/ui/aunqa';

/** S4 แดชบอร์ดความพร้อมของรอบ: heatmap 53 ช่อง · % พร้อม · gap · งานค้างรายคน · ปุ่ม transition ตามสิทธิ์ */
export default function CycleDashboardPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const { showToast } = useToast();
  const { confirm, prompt } = useDialog();
  const [sev, setSev] = useState<GapSeverity | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const q = useLoad(async () => {
    const cycle = getCycle(user, id);
    const readiness = getReadiness(user, id);
    const sections = listSections(user, id);
    const names = new Map(listUsers(cycle.universityId).map(u => [u.id, u.fullName]));
    const events = listReviewEvents(user, id);
    const verify = cycle.lockedAt ? await verifySnapshot(id) : null;
    return { cycle, readiness, sections, names, events, verify };
  }, [user.id, id]);

  async function doTransition(to: CycleStatus, requireNote: boolean) {
    let note: string | undefined;
    if (requireNote) {
      const r = await prompt({ title: CYCLE_ACTION_TH[to], message: 'ระบุเหตุผล/ข้อเสนอแนะ (ผู้เขียนจะเห็นข้อความนี้)', required: true, placeholder: 'เช่น เกณฑ์ 4 ยังขาดหลักฐานการทวนสอบ…' });
      if (r === null) return;
      note = r;
    } else {
      const ok = await confirm({
        title: CYCLE_ACTION_TH[to],
        message: to === 'final_approved' ? 'เมื่ออนุมัติสุดท้าย รอบจะถูกล็อก แก้ไขเนื้อหา/หลักฐานไม่ได้ และบันทึกลายนิ้วมือเอกสาร (hash)' : `เปลี่ยนสถานะรอบเป็น “${CYCLE_STATUS_TH[to]}”`,
        variant: to === 'final_approved' ? 'warning' : 'primary',
      });
      if (!ok) return;
    }
    try {
      await transitionCycle(user, id, to, note);
      showToast(`เปลี่ยนสถานะเป็น “${CYCLE_STATUS_TH[to]}” แล้ว`, 'success');
      q.reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  async function doRevision() {
    const note = await prompt({ title: 'เปิด revision ใหม่', message: 'รอบจะปลดล็อกเพื่อแก้ไข และเลข revision เพิ่มขึ้น', required: true, placeholder: 'เหตุผลในการเปิด revision' });
    if (note === null) return;
    try { openRevision(user, id, note); showToast('เปิด revision ใหม่แล้ว', 'success'); q.reload(); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q}>{({ cycle, readiness, sections, names, events, verify }) => {
      const scope = cycleScope(cycle);
      const prog = getProgramme(cycle.programmeId);
      const transitions = CYCLE_TRANSITIONS.filter(t => t.from === cycle.status && can(user, t.action, scope));
      const canAssign = can(user, 'cycle.assign', scope);
      const canReopen = cycle.status === 'final_approved' && can(user, 'cycle.reopen', scope);
      const openCount = sections.filter(s => s.status !== 'approved').length;
      const gaps = readiness.gaps
        .filter(g => sev === 'all' || g.severity === sev)
        .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
      const shownGaps = showAll ? gaps : gaps.slice(0, 40);
      const rows = Array.from(new Set(readiness.heatmap.map(h => h.criterionNo))).sort((a, b) => a - b);

      return (
        <>
          <PageHeader
            title={<>รอบประเมิน {cycle.academicYear} <span className="aq-muted aq-h1-sub">{prog?.nameTh}</span></>}
            sub={<>สถานะ <CycleStatusBadge status={cycle.status} /> · revision {cycle.revision} · กำหนดส่ง {fmtDate(cycle.submissionDue)} · วันประเมิน {fmtDate(cycle.assessmentDate)}</>}
            actions={<>
              {canAssign && <Link className="aq-btn" href={`/app/cycles/${id}/assign`} data-testid="go-assign">มอบหมายงาน</Link>}
              <Link className="aq-btn" href="/app/export" data-testid="go-export">ส่งออก</Link>
            </>}
          />

          {(transitions.length > 0 || canReopen) && (
            <div className="aq-card aq-actions" data-testid="cycle-actions">
              <strong>ขั้นตอนถัดไป:</strong>
              {transitions.map(t => (
                <AsyncButton key={t.to} testId={`cycle-to-${t.to}`}
                  className={t.to === 'revision_requested' ? 'aq-btn aq-btn-danger' : 'aq-btn aq-btn-primary'}
                  onClick={() => doTransition(t.to, !!t.requireNote)}
                  disabled={(t.to === 'under_review' || t.to === 'faculty_approved') && openCount > 0}
                  title={(t.to === 'under_review' || t.to === 'faculty_approved') && openCount > 0 ? `ยังมี ${openCount} ข้อที่ยังไม่อนุมัติ` : undefined}>
                  {CYCLE_ACTION_TH[t.to]}
                </AsyncButton>
              ))}
              {canReopen && <AsyncButton className="aq-btn" testId="cycle-reopen" onClick={doRevision}>เปิด revision ใหม่</AsyncButton>}
              {openCount > 0 && <span className="aq-muted">ยังมี {openCount} จาก 53 ข้อที่ยังไม่อนุมัติ</span>}
            </div>
          )}

          {cycle.lockedAt && (
            <div className={`auth-alert ${verify?.ok ? 'auth-alert-ok' : 'auth-alert-warn'}`} data-testid="lock-banner">
              <div>
                🔒 รอบนี้ถูกล็อกเมื่อ {fmtDateTime(cycle.lockedAt)} โดย {names.get(cycle.lockedBy || '') || '—'} · hash <code>{(cycle.snapshotHash || '').slice(0, 16)}…</code>
                {' '}{verify ? (verify.ok ? '— ตรวจแล้ว เนื้อหาตรงกับที่ล็อก' : '— เนื้อหาไม่ตรงกับที่ล็อก!') : ''}
              </div>
            </div>
          )}

          <div className="dash-kpi-row" data-testid="kpi-row">
            <div className="dash-kpi"><div className="dash-kpi-num" data-testid="readiness-percent">{readiness.percent}%</div><div className="dash-kpi-label">ความพร้อมของ SAR</div></div>
            {SEVERITY_ORDER.map(s => (
              <div key={s} className="dash-kpi"><div className="dash-kpi-num" data-testid={`gap-count-${s}`}>{readiness.gapCounts[s]}</div><div className="dash-kpi-label">ช่องว่างระดับ{SEVERITY_TH[s]}</div></div>
            ))}
          </div>

          <section className="aq-card" aria-labelledby="heat-h">
            <h2 id="heat-h" className="aq-h2">Heatmap 53 ข้อ</h2>
            <HeatLegend />
            <div className="aq-heatmap" data-testid="heatmap">
              {rows.map(no => (
                <div key={no} className="aq-heat-row">
                  <div className="aq-heat-label">เกณฑ์ {no}</div>
                  <div className="aq-heat-cells">
                    {readiness.heatmap.filter(h => h.criterionNo === no).map(h => {
                      const g = h.gaps;
                      const tip = `ข้อ ${h.requirementId} · ${SECTION_STATUS_TH[h.sectionStatus]} · พร้อม ${h.score}% · ช่องว่าง วิกฤต ${g.critical} สูง ${g.high} กลาง ${g.medium} ต่ำ ${g.low}`;
                      return (
                        <Link key={h.requirementId} href={sectionHref(cycle.id, h.requirementId)}
                          className={`aq-heat aq-heat-cell aq-heat-${h.level}`} title={tip} aria-label={tip}
                          data-testid={`heat-${h.requirementId}`} data-level={h.level}>
                          <b>{h.requirementId}</b><small>{HEAT_TH[h.level]}</small>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="aq-grid-2">
            <section className="aq-card" aria-labelledby="gap-h">
              <div className="aq-row-between">
                <h2 id="gap-h" className="aq-h2">ช่องว่างที่ต้องแก้ ({gaps.length})</h2>
                <select className="aq-input aq-input-sm" value={sev} onChange={e => setSev(e.target.value as GapSeverity | 'all')} aria-label="กรองระดับ" data-testid="gap-filter">
                  <option value="all">ทุกระดับ</option>
                  {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_TH[s]}</option>)}
                </select>
              </div>
              {gaps.length === 0 ? <Empty text="ไม่พบช่องว่างในระดับนี้" /> : (
                <ul className="aq-list" data-testid="gap-list">
                  {shownGaps.map(g => (
                    <li key={g.id}>
                      <Badge tone={g.severity === 'critical' ? 'bad' : g.severity === 'high' ? 'warn' : 'neutral'}>{SEVERITY_TH[g.severity]}</Badge>
                      <Link href={sectionHref(cycle.id, g.requirementId)}>ข้อ {g.requirementId}</Link>
                      <span style={{ flex: 1 }}>{g.messageTh} <span className="aq-muted">({g.ruleId})</span></span>
                    </li>
                  ))}
                </ul>
              )}
              {gaps.length > 40 && !showAll && <button className="aq-btn aq-btn-sm" onClick={() => setShowAll(true)}>แสดงทั้งหมด ({gaps.length})</button>}
            </section>

            <section className="aq-card" aria-labelledby="pend-h">
              <h2 id="pend-h" className="aq-h2">งานค้างรายคน</h2>
              {readiness.pending.length === 0 ? <Empty text="ยังไม่มีงานค้างที่มอบหมาย" /> : (
                <div className="aq-table-wrap">
                  <table className="aq-table" data-testid="pending-table">
                    <thead><tr><th>ผู้รับผิดชอบ</th><th>ค้าง</th><th>เลยกำหนด</th><th>ครบกำหนดถัดไป</th></tr></thead>
                    <tbody>
                      {readiness.pending.map(p => (
                        <tr key={p.userId}>
                          <td>{names.get(p.userId) || p.userId}<div className="aq-muted">ข้อ {p.requirementIds.slice(0, 8).join(', ')}{p.requirementIds.length > 8 ? '…' : ''}</div></td>
                          <td>{p.open}</td>
                          <td>{p.overdue > 0 ? <Badge tone="bad">{p.overdue}</Badge> : 0}</td>
                          <td>{fmtDate(p.nextDue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <details style={{ marginTop: '1rem' }}>
                <summary>ประวัติการเปลี่ยนสถานะ ({events.length})</summary>
                <ul className="aq-list">
                  {events.slice(-30).reverse().map(e => (
                    <li key={e.id}>
                      <span className="aq-muted">{fmtDateTime(e.at)}</span>
                      <span style={{ flex: 1 }}>
                        {names.get(e.actorId) || e.actorId}: {e.targetType === 'cycle' ? 'รอบ' : `ข้อ ${e.targetId.split('::')[1]}`} → {e.toStatus}{e.note ? ` (${e.note})` : ''}
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
