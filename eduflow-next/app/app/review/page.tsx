'use client';

import Link from 'next/link';
import {
  CYCLE_TRANSITIONS, approveSection, can, cycleScope, getProgramme, listCycles, listSections, listUsers, returnSection,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import { CYCLE_ACTION_TH, errMsg, fmtDateTime, sectionHref } from '@/lib/ui/aunqa';

/** S12 คิวรอตรวจ: ข้อที่ส่งตรวจ (approve/return) + รอบที่รอการพิจารณาของฉัน */
export default function ReviewPage() {
  const user = useMe();
  const { showToast } = useToast();
  const { prompt } = useDialog();

  const q = useLoad(() => {
    const cycles = listCycles(user);
    const names = new Map(listUsers(user.universityId).map(u => [u.id, u.fullName]));
    const items = cycles.flatMap(c => {
      const scope = cycleScope(c);
      return listSections(user, c.id).filter(s => s.status === 'ready_for_review').map(s => ({
        cycle: c, section: s, canApprove: can(user, 'sar.approve', scope), canReturn: can(user, 'sar.return', scope),
      }));
    }).filter(i => i.canApprove || i.canReturn);
    const cycleTasks = cycles
      .map(c => ({ cycle: c, rules: CYCLE_TRANSITIONS.filter(t => t.from === c.status && ['approve.faculty', 'approve.final'].includes(t.action) && can(user, t.action, cycleScope(c))) }))
      .filter(x => x.rules.length > 0);
    return { items, cycleTasks, names };
  }, [user.id]);

  async function approve(cycleId: string, req: string) {
    try { approveSection(user, cycleId, req); showToast(`อนุมัติข้อ ${req} แล้ว`, 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function back(cycleId: string, req: string) {
    const note = await prompt({ title: `ส่งข้อ ${req} กลับแก้ไข`, message: 'ระบุสิ่งที่ต้องแก้', required: true, variant: 'warning' });
    if (note === null) return;
    try { returnSection(user, cycleId, req, note); showToast('ส่งกลับแล้ว', 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <>
      <PageHeader title="รอตรวจ" sub="ข้อที่ส่งตรวจและรอบที่รอการพิจารณาของคุณ" />
      <Async q={q}>{({ items, cycleTasks, names }) => (
        <>
          {cycleTasks.length > 0 && (
            <section className="aq-card" aria-labelledby="ct-h">
              <h2 id="ct-h" className="aq-h2">รอบที่รอการพิจารณา</h2>
              <ul className="aq-list" data-testid="cycle-tasks">
                {cycleTasks.map(({ cycle, rules }) => (
                  <li key={cycle.id}>
                    <span style={{ flex: 1 }}>รอบ {cycle.academicYear} · {getProgramme(cycle.programmeId)?.nameTh} <CycleStatusBadge status={cycle.status} /></span>
                    <span className="aq-muted">{rules.map(r => CYCLE_ACTION_TH[r.to]).join(' / ')}</span>
                    <Link className="aq-btn aq-btn-sm aq-btn-primary" href={`/app/cycles/${cycle.id}`}>เปิดแดชบอร์ดเพื่อพิจารณา</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="aq-card" aria-labelledby="rq-h">
            <h2 id="rq-h" className="aq-h2">ข้อที่รอตรวจ ({items.length})</h2>
            {items.length === 0 ? <Empty text="ไม่มีข้อที่รอตรวจ" /> : (
              <div className="aq-table-wrap">
                <table className="aq-table" data-testid="review-table">
                  <thead><tr><th>ข้อ</th><th>รอบ</th><th>เจ้าของ</th><th>ส่งเมื่อ</th><th /></tr></thead>
                  <tbody>
                    {items.map(({ cycle, section, canApprove, canReturn }) => (
                      <tr key={section.id}>
                        <td><Link href={sectionHref(cycle.id, section.requirementId)}><strong>{section.requirementId}</strong></Link></td>
                        <td>{cycle.academicYear} · {getProgramme(cycle.programmeId)?.code}</td>
                        <td>{names.get(section.ownerUserId || '') || '—'}</td>
                        <td>{fmtDateTime(section.updatedAt)}</td>
                        <td className="aq-nowrap">
                          <Link className="aq-btn aq-btn-sm" href={sectionHref(cycle.id, section.requirementId)}>เปิดอ่าน</Link>{' '}
                          {canApprove && <AsyncButton className="aq-btn aq-btn-sm aq-btn-primary" testId={`approve-${section.requirementId}`} onClick={() => approve(cycle.id, section.requirementId)}>อนุมัติ</AsyncButton>}{' '}
                          {canReturn && <AsyncButton className="aq-btn aq-btn-sm aq-btn-danger" testId={`return-${section.requirementId}`} onClick={() => back(cycle.id, section.requirementId)}>ส่งกลับ</AsyncButton>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}</Async>
    </>
  );
}
