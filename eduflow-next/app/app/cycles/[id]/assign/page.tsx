'use client';

/**
 * มอบหมายงาน (ADR-UI-001 pages.md P8)
 * - แถบสรุป "มอบหมายแล้ว n/53" + ปุ่มไปข้อถัดไปที่ยังไม่มีเจ้าของ
 * - ต่อเกณฑ์: การ์ดพับได้ (เปิดเป็นค่าเริ่มต้น) + bar มอบหมาย + แถว bulk + ตาราง
 * - หลังบันทึก: aq-saved "บันทึกแล้ว" ข้างช่อง 2 วินาที + ไฮไลต์แถว (L5) + toast · ผิดพลาด = aq-field-error ใต้ช่อง
 * - P10: เจ้าของที่ไม่อยู่ในรายการที่มอบหมายได้ แสดงชื่อจริง + " (มอบหมายไว้เดิม)"
 * - คง owner-{id} / due-{id} / bulk-* / assessor-* / cycle-due / cycle-dates-save
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  assignAssessor, assignCriterion, assignSections, can, cycleScope, getCycle, listAssignableUsers, listCriteria,
  listRequirements, listSections, listUsers, updateCycleDates,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, InlineMessage, PageHeader, SectionStatusBadge, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { decodeParam, errMsg } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

type RowState = { field: 'owner' | 'due'; kind: 'saved' | 'error'; msg?: string };

export default function AssignPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const { showToast } = useToast();

  const q = useLoad(() => {
    const cycle = getCycle(user, id);
    const scope = cycleScope(cycle);
    const canAssign = can(user, 'cycle.assign', scope);
    const users = listUsers(cycle.universityId);
    return {
      cycle, canAssign,
      canAssessor: can(user, 'assessor.assign', scope),
      assignable: canAssign ? listAssignableUsers(user, id) : [],
      sections: listSections(user, id),
      names: new Map(users.map(u => [u.id, u.fullName])),
      assessors: users.filter(u => u.roles.some(r => r.role === 'assessor')),
    };
  }, [user.id, id]);

  const [bulk, setBulk] = useState<Record<number, { owner: string; due: string }>>({});
  const [dates, setDates] = useState<{ sub?: string; asm?: string }>({});
  const [assessorId, setAssessorId] = useState('');
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => { const t = timers.current; return () => t.forEach(clearTimeout); }, []);

  function run(fn: () => void, ok: string): boolean {
    try { fn(); showToast(ok, 'success'); notifyTodosChanged(); q.reload(); return true; }
    catch (e) { showToast(errMsg(e), 'error'); return false; }
  }

  /** บันทึกรายแถว: แสดงผลข้างช่อง (2 วินาทีเมื่อสำเร็จ) */
  function runRow(reqId: string, field: RowState['field'], fn: () => void, ok: string) {
    const prev = timers.current.get(reqId);
    if (prev) clearTimeout(prev);
    try {
      fn();
      showToast(ok, 'success');
      notifyTodosChanged();
      setRowState(s => ({ ...s, [reqId]: { field, kind: 'saved' } }));
      timers.current.set(reqId, setTimeout(() => setRowState(s => { const n = { ...s }; delete n[reqId]; return n; }), 2000));
    } catch (e) {
      setRowState(s => ({ ...s, [reqId]: { field, kind: 'error', msg: errMsg(e) } }));
    }
    q.reload(); // ค่าบนจอกลับเป็นค่าจริงใน store (ถ้าผิดพลาด = ค่าเดิม)
  }

  function gotoNextUnowned(sections: { requirementId: string; ownerUserId?: string; status: string }[]) {
    const next = sections.find(s => !s.ownerUserId && s.status !== 'approved');
    if (!next) return;
    const el = document.querySelector<HTMLSelectElement>(`[data-testid="owner-${next.requirementId}"]`);
    el?.closest('details')?.setAttribute('open', '');
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  }

  return (
    <Async q={q} skeleton="table">{({ cycle, canAssign, canAssessor, assignable, sections, names, assessors }) => {
      const owned = sections.filter(s => s.ownerUserId).length;
      // UX-U3-6: นับแบบเดียวกับ todo — ข้อที่อนุมัติแล้วไม่ต้องมีผู้เขียน
      const unowned = sections.filter(s => !s.ownerUserId && s.status !== 'approved').length;
      const unownedApproved = sections.filter(s => !s.ownerUserId && s.status === 'approved').length;
      const assignedAssessors = assessors.filter(a => a.roles.some(r => r.role === 'assessor' && r.scopeId === id));
      return (
        <>
          <PageHeader
            crumbs={[{ label: 'รอบประเมิน', href: '/app/cycles' }, { label: String(cycle.academicYear), href: `/app/cycles/${id}` }, { label: 'มอบหมายงาน' }]}
            title={`มอบหมายงาน — รอบ ${cycle.academicYear}`}
            status={<CycleStatusBadge status={cycle.status} />}
            sub="กำหนดส่งรายข้อต้องไม่เกินกำหนดส่งของรอบ"
            actions={<Link className="aq-btn" href={`/app/cycles/${id}`}><Icon name="chevron-left" size={20} />แดชบอร์ดรอบ</Link>}
          />
          {!canAssign && <InlineMessage tone="info">คุณไม่มีสิทธิ์มอบหมายงาน (ดูอย่างเดียว)</InlineMessage>}

          {(canAssign || canAssessor) && (
            <div className="aq-grid-2 aq-mb-4">
              {canAssign && (
                <section className="aq-card" aria-labelledby="dates-h">
                  <h2 id="dates-h" className="aq-h3">วันสำคัญของรอบ</h2>
                  <div className="aq-form-grid">
                    <div className="aq-field">
                      <label htmlFor="as-sub">กำหนดส่ง SAR</label>
                      <input id="as-sub" className="aq-input" type="date" data-testid="cycle-due"
                        value={dates.sub ?? cycle.submissionDue ?? ''} onChange={e => setDates(d => ({ ...d, sub: e.target.value }))} />
                    </div>
                    <div className="aq-field">
                      <label htmlFor="as-asm">วันประเมิน</label>
                      <input id="as-asm" className="aq-input" type="date"
                        value={dates.asm ?? cycle.assessmentDate ?? ''} onChange={e => setDates(d => ({ ...d, asm: e.target.value }))} />
                    </div>
                  </div>
                  <button type="button" className="aq-btn aq-mt-4" data-testid="cycle-dates-save"
                    onClick={() => run(() => updateCycleDates(user, id, {
                      submissionDue: dates.sub ?? cycle.submissionDue, assessmentDate: dates.asm ?? cycle.assessmentDate,
                    }), 'บันทึกวันที่แล้ว')}>บันทึกวันที่</button>
                </section>
              )}
              {canAssessor && (
                <section className="aq-card" aria-labelledby="asr-h">
                  <h2 id="asr-h" className="aq-h3">กรรมการประเมิน (อ่านอย่างเดียว)</h2>
                  <div className="aq-field">
                    <label htmlFor="as-asr">เลือกผู้ใช้ที่มีบทบาทกรรมการ</label>
                    <select id="as-asr" className="aq-input" value={assessorId} onChange={e => setAssessorId(e.target.value)} data-testid="assessor-select">
                      <option value="">— เลือก —</option>
                      {assessors.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                    </select>
                  </div>
                  <button type="button" className="aq-btn aq-mt-4" disabled={!assessorId} data-testid="assessor-add"
                    onClick={() => run(() => assignAssessor(user, id, assessorId), 'มอบหมายกรรมการแล้ว')}>มอบหมายเข้ารอบนี้</button>
                  <p className="aq-help aq-mt-2">กรรมการที่ได้รับมอบหมายแล้ว: {assignedAssessors.map(a => a.fullName).join(', ') || 'ยังไม่มี'}</p>
                </section>
              )}
            </div>
          )}

          <section className="aq-card aq-assign-summary" aria-label="สรุปการมอบหมาย">
            <ProgressBar value={owned} max={sections.length || 53} label={`มอบหมายแล้ว ${owned}/${sections.length} ข้อ`} />
            {unowned > 0 && (
              <div className="aq-cluster">
                <span data-testid="assign-unowned">{`ต้องมอบหมายผู้เขียน ${unowned} ข้อ (ยังไม่อนุมัติและยังไม่มีเจ้าของ)`}</span>
                {canAssign && (
                  <button type="button" className="aq-btn aq-btn-compact" onClick={() => gotoNextUnowned(sections)}>
                    ไปข้อถัดไปที่ยังไม่มีเจ้าของ<Icon name="chevron-down" size={20} />
                  </button>
                )}
              </div>
            )}
            {unownedApproved > 0 && (
              <p className="aq-help">{`อีก ${unownedApproved} ข้ออนุมัติแล้วโดยยังไม่มีเจ้าของ — ไม่ต้องมอบหมาย`}</p>
            )}
          </section>

          {listCriteria().map(c => {
            const reqs = listRequirements(c.no);
            const b = bulk[c.no] || { owner: '', due: '' };
            const secs = reqs.map(r => sections.find(x => x.requirementId === r.id)).filter(Boolean);
            const done = secs.filter(s => s!.ownerUserId).length;
            return (
              <details key={c.no} className="aq-card aq-collapse aq-assign-crit" open>
                <summary>
                  <span className="aq-flex-1">
                    <span className="aq-h3" id={`as-${c.no}`}>{`เกณฑ์ ${c.no}: ${c.nameTh}`}</span>
                    <ProgressBar value={done} max={secs.length || 1} label={`มอบหมาย ${done}/${secs.length}`} />
                  </span>
                  <Icon name="chevron-down" size={20} className="aq-collapse__chev" />
                </summary>
                {canAssign && (
                  <div className="aq-form-inline aq-bulk">
                    <div className="aq-field">
                      <label htmlFor={`bo-${c.no}`}>ทั้งเกณฑ์ — เจ้าของ</label>
                      <select id={`bo-${c.no}`} className="aq-input" value={b.owner} data-testid={`bulk-owner-${c.no}`}
                        onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, owner: e.target.value } }))}>
                        <option value="">— ไม่ระบุ —</option>
                        {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                    </div>
                    <div className="aq-field">
                      <label htmlFor={`bd-${c.no}`}>กำหนดส่ง</label>
                      <input id={`bd-${c.no}`} className="aq-input" type="date" value={b.due} data-testid={`bulk-due-${c.no}`}
                        onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, due: e.target.value } }))} />
                    </div>
                    <button type="button" className="aq-btn aq-btn-primary" data-testid={`bulk-apply-${c.no}`}
                      onClick={() => run(() => assignCriterion(user, id, c.no, b.owner || null, b.due || undefined), `มอบหมายเกณฑ์ ${c.no} แล้ว`)}>
                      มอบหมายทั้งเกณฑ์
                    </button>
                  </div>
                )}
                <div className="aq-table-wrap">
                  <table className="aq-table aq-table--stack" aria-labelledby={`as-${c.no}`}>
                    <thead><tr><th>ข้อ</th><th>สถานะ</th><th>เจ้าของ</th><th>กำหนดส่ง</th></tr></thead>
                    <tbody>
                      {reqs.map(r => {
                        const s = sections.find(x => x.requirementId === r.id);
                        if (!s) return null;
                        const st = rowState[r.id];
                        const ownerName = s.ownerUserId ? names.get(s.ownerUserId) : undefined;
                        return (
                          <tr key={r.id} className={st?.kind === 'saved' ? 'aq-row-new' : undefined}>
                            <td data-label="ข้อ">
                              <div>
                                <Link className="aq-link aq-code" href={`/app/sections/${encodeURIComponent(s.id)}`}><strong>{r.id}</strong></Link>
                                <div className="aq-muted aq-clamp">{r.textTh}</div>
                              </div>
                            </td>
                            <td data-label="สถานะ"><SectionStatusBadge status={s.status} /></td>
                            <td data-label="เจ้าของ">
                              <div className="aq-field">
                                <select className="aq-input" disabled={!canAssign} value={s.ownerUserId || ''} aria-label={`เจ้าของข้อ ${r.id}`}
                                  data-testid={`owner-${r.id}`} aria-invalid={st?.kind === 'error' && st.field === 'owner' ? true : undefined}
                                  onChange={e => runRow(r.id, 'owner', () => assignSections(user, id, [r.id], e.target.value || null, s.due), `มอบหมายข้อ ${r.id} แล้ว`)}>
                                  <option value="">— ไม่ระบุ —</option>
                                  {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                  {s.ownerUserId && !assignable.some(u => u.id === s.ownerUserId) && (
                                    <option value={s.ownerUserId}>{ownerName ? `${ownerName} (มอบหมายไว้เดิม)` : '(มอบหมายไว้เดิม)'}</option>
                                  )}
                                </select>
                                {st?.field === 'owner' && st.kind === 'saved' && <span className="aq-saved aq-saved--saved" role="status"><Icon name="check" size={16} />บันทึกแล้ว</span>}
                                {st?.field === 'owner' && st.kind === 'error' && <span className="aq-field-error"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{st.msg}</span>}
                              </div>
                            </td>
                            <td data-label="กำหนดส่ง">
                              <div className="aq-field">
                                <input className="aq-input" type="date" disabled={!canAssign} value={s.due || ''} aria-label={`กำหนดส่งข้อ ${r.id}`}
                                  data-testid={`due-${r.id}`} aria-invalid={st?.kind === 'error' && st.field === 'due' ? true : undefined}
                                  onChange={e => runRow(r.id, 'due', () => assignSections(user, id, [r.id], s.ownerUserId || null, e.target.value || undefined), `บันทึกกำหนดส่งข้อ ${r.id} แล้ว`)} />
                                {st?.field === 'due' && st.kind === 'saved' && <span className="aq-saved aq-saved--saved" role="status"><Icon name="check" size={16} />บันทึกแล้ว</span>}
                                {st?.field === 'due' && st.kind === 'error' && <span className="aq-field-error"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{st.msg}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </>
      );
    }}</Async>
  );
}
