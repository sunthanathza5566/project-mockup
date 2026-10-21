'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  assignAssessor, assignCriterion, assignSections, can, cycleScope, getCycle, listAssignableUsers, listCriteria,
  listRequirements, listSections, listUsers, updateCycleDates,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, PageHeader, SectionStatusBadge, useLoad, useMe } from '@/components/aunqa/common';
import { decodeParam, errMsg } from '@/lib/ui/aunqa';

/** S5 มอบหมายงาน: เจ้าของ + deadline รายข้อหรือทั้งเกณฑ์ · วันที่ของรอบ · กรรมการประเมิน */
export default function AssignPage() {
  const user = useMe();
  const id = decodeParam(useParams().id);
  const { showToast } = useToast();

  const q = useLoad(() => {
    const cycle = getCycle(user, id);
    const scope = cycleScope(cycle);
    const canAssign = can(user, 'cycle.assign', scope);
    return {
      cycle, canAssign,
      canAssessor: can(user, 'assessor.assign', scope),
      assignable: canAssign ? listAssignableUsers(user, id) : [],
      sections: listSections(user, id),
      assessors: listUsers(cycle.universityId).filter(u => u.roles.some(r => r.role === 'assessor')),
    };
  }, [user.id, id]);

  const [bulk, setBulk] = useState<Record<number, { owner: string; due: string }>>({});
  const [dates, setDates] = useState<{ sub?: string; asm?: string }>({});
  const [assessorId, setAssessorId] = useState('');

  function run(fn: () => void, ok: string) {
    try { fn(); showToast(ok, 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q}>{({ cycle, canAssign, canAssessor, assignable, sections, assessors }) => (
      <>
        <PageHeader
          title={`มอบหมายงาน — รอบ ${cycle.academicYear}`}
          sub={<>สถานะ <CycleStatusBadge status={cycle.status} /> · กำหนดส่งรายข้อต้องไม่เกินกำหนดส่งของรอบ</>}
          actions={<Link className="aq-btn" href={`/app/cycles/${id}`}>← กลับแดชบอร์ด</Link>}
        />
        {!canAssign && <div className="auth-alert auth-alert-warn">คุณไม่มีสิทธิ์มอบหมายงาน (ดูอย่างเดียว)</div>}

        {canAssign && (
          <section className="aq-card aq-form-inline" aria-labelledby="dates-h">
            <h2 id="dates-h" className="aq-h2">วันสำคัญของรอบ</h2>
            <label>กำหนดส่ง SAR
              <input className="aq-input" type="date" data-testid="cycle-due"
                value={dates.sub ?? cycle.submissionDue ?? ''} onChange={e => setDates(d => ({ ...d, sub: e.target.value }))} />
            </label>
            <label>วันประเมิน
              <input className="aq-input" type="date"
                value={dates.asm ?? cycle.assessmentDate ?? ''} onChange={e => setDates(d => ({ ...d, asm: e.target.value }))} />
            </label>
            <button className="aq-btn" data-testid="cycle-dates-save"
              onClick={() => run(() => updateCycleDates(user, id, {
                submissionDue: dates.sub ?? cycle.submissionDue, assessmentDate: dates.asm ?? cycle.assessmentDate,
              }), 'บันทึกวันที่แล้ว')}>บันทึกวันที่</button>
          </section>
        )}

        {canAssessor && (
          <section className="aq-card aq-form-inline" aria-labelledby="asr-h">
            <h2 id="asr-h" className="aq-h2">กรรมการประเมิน (อ่านอย่างเดียว)</h2>
            <label>เลือกผู้ใช้ที่มีบทบาทกรรมการ
              <select className="aq-input" value={assessorId} onChange={e => setAssessorId(e.target.value)} data-testid="assessor-select">
                <option value="">— เลือก —</option>
                {assessors.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
              </select>
            </label>
            <button className="aq-btn" disabled={!assessorId} data-testid="assessor-add"
              onClick={() => run(() => assignAssessor(user, id, assessorId), 'มอบหมายกรรมการแล้ว')}>มอบหมายเข้ารอบนี้</button>
            <p className="aq-muted" style={{ width: '100%' }}>
              กรรมการที่ได้รับมอบหมายแล้ว: {assessors.filter(a => a.roles.some(r => r.role === 'assessor' && r.scopeId === id)).map(a => a.fullName).join(', ') || 'ยังไม่มี'}
            </p>
          </section>
        )}

        {listCriteria().map(c => {
          const reqs = listRequirements(c.no);
          const b = bulk[c.no] || { owner: '', due: '' };
          return (
            <section key={c.no} className="aq-card" aria-labelledby={`as-${c.no}`}>
              <h2 id={`as-${c.no}`} className="aq-h2">เกณฑ์ {c.no}: {c.nameTh}</h2>
              {canAssign && (
                <div className="aq-form-inline aq-bulk">
                  <label>ทั้งเกณฑ์ — เจ้าของ
                    <select className="aq-input" value={b.owner} data-testid={`bulk-owner-${c.no}`}
                      onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, owner: e.target.value } }))}>
                      <option value="">— ไม่ระบุ —</option>
                      {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </label>
                  <label>กำหนดส่ง
                    <input className="aq-input" type="date" value={b.due} data-testid={`bulk-due-${c.no}`}
                      onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, due: e.target.value } }))} />
                  </label>
                  <button className="aq-btn aq-btn-primary" data-testid={`bulk-apply-${c.no}`}
                    onClick={() => run(() => assignCriterion(user, id, c.no, b.owner || null, b.due || undefined), `มอบหมายเกณฑ์ ${c.no} แล้ว`)}>
                    มอบหมายทั้งเกณฑ์
                  </button>
                </div>
              )}
              <div className="aq-table-wrap">
                <table className="aq-table">
                  <thead><tr><th>ข้อ</th><th>สถานะ</th><th>เจ้าของ</th><th>กำหนดส่ง</th></tr></thead>
                  <tbody>
                    {reqs.map(r => {
                      const s = sections.find(x => x.requirementId === r.id);
                      if (!s) return null;
                      return (
                        <tr key={r.id}>
                          <td><Link href={`/app/sections/${encodeURIComponent(s.id)}`}><strong>{r.id}</strong></Link><div className="aq-muted aq-clamp">{r.textTh}</div></td>
                          <td><SectionStatusBadge status={s.status} /></td>
                          <td>
                            <select className="aq-input aq-input-sm" disabled={!canAssign} value={s.ownerUserId || ''} aria-label={`เจ้าของข้อ ${r.id}`}
                              data-testid={`owner-${r.id}`}
                              onChange={e => run(() => assignSections(user, id, [r.id], e.target.value || null, s.due), `มอบหมายข้อ ${r.id} แล้ว`)}>
                              <option value="">— ไม่ระบุ —</option>
                              {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                              {s.ownerUserId && !assignable.some(u => u.id === s.ownerUserId) && <option value={s.ownerUserId}>(ผู้ใช้เดิม)</option>}
                            </select>
                          </td>
                          <td>
                            <input className="aq-input aq-input-sm" type="date" disabled={!canAssign} value={s.due || ''} aria-label={`กำหนดส่งข้อ ${r.id}`}
                              data-testid={`due-${r.id}`}
                              onChange={e => run(() => assignSections(user, id, [r.id], s.ownerUserId || null, e.target.value || undefined), `บันทึกกำหนดส่งข้อ ${r.id} แล้ว`)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </>
    )}</Async>
  );
}
