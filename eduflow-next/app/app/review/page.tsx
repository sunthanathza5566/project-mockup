'use client';

/**
 * คิวรอตรวจ (ADR-UI-001 pages.md P16)
 * - การ์ดรอบที่รอการพิจารณา (cycle-tasks)
 * - review-table: ข้อ | รอบ | เจ้าของ | ส่งเมื่อ | สรุป (UX-7) | [เปิดอ่าน](primary) [อนุมัติ] ··· [ส่งกลับ](danger)
 * - แถวที่ผู้ใช้เป็นผู้เขียนล่าสุด: ไม่ render ปุ่มอนุมัติ + pill "คุณเขียนเอง" + Term segregation
 * - หลังอนุมัติ/ส่งกลับ: แถวจาง 220ms แล้วหาย + toast · ไม่มีอนุมัติเป็นชุด
 */
import { useState } from 'react';
import Link from 'next/link';
import {
  CYCLE_TRANSITIONS, approveSection, can, cycleScope, getProgramme, getReadiness, getRequirement, listCycles, listLinks,
  listRatings, listSections, listUsers, returnSection,
} from '@/lib/api';
import type { GapSeverity } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { CYCLE_ACTION_TH, errMsg, fmtDateTime, sectionHref, truncateTh } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const LEAVE_MS = 220;

export default function ReviewPage() {
  const user = useMe();
  const { showToast } = useToast();
  const { prompt } = useDialog();
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const q = useLoad(() => {
    const cycles = listCycles(user);
    const names = new Map(listUsers(user.universityId).map(u => [u.id, u.fullName]));
    const items = cycles.flatMap(c => {
      const scope = cycleScope(c);
      const ready = listSections(user, c.id).filter(s => s.status === 'ready_for_review');
      if (!ready.length) return [];
      const canApprove = can(user, 'sar.approve', scope);
      const canReturn = can(user, 'sar.return', scope);
      if (!canApprove && !canReturn) return [];
      // ข้อมูลช่วยตัดสิน (UX-7) — API เดิม เรียกครั้งเดียวต่อรอบ
      const links = listLinks(user, c.id);
      let ratings: ReturnType<typeof listRatings> = [];
      try { ratings = listRatings(user, c.id).filter(r => r.raterType === 'self'); } catch { /* ไม่มีสิทธิ์ดูคะแนน */ }
      let gapsBy = new Map<string, Record<GapSeverity, number>>();
      try { gapsBy = new Map(getReadiness(user, c.id).heatmap.map(h => [h.requirementId, h.gaps])); } catch { /* ไม่มีสิทธิ์ */ }
      return ready.map(s => {
        const self = ratings.filter(r => r.requirementId === s.requirementId).sort((x, y) => y.at - x.at)[0];
        return {
          cycle: c, section: s, canApprove, canReturn,
          ownWork: s.lastAuthorId === user.id,
          evidence: new Set(links.filter(l => l.requirementId === s.requirementId).map(l => l.evidenceId)).size,
          self: self?.score, gaps: gapsBy.get(s.requirementId),
        };
      });
    });
    const cycleTasks = cycles
      .map(c => ({ cycle: c, rules: CYCLE_TRANSITIONS.filter(t => t.from === c.status && ['approve.faculty', 'approve.final'].includes(t.action) && can(user, t.action, cycleScope(c)) && t.to !== 'revision_requested') }))
      .filter(x => x.rules.length > 0);
    return { items, cycleTasks, names };
  }, [user.id]);

  function finish(sectionId: string) {
    setLeaving(s => new Set(s).add(sectionId));
    notifyTodosChanged();
    setTimeout(() => { q.reload(); setLeaving(s => { const n = new Set(s); n.delete(sectionId); return n; }); }, LEAVE_MS);
  }

  async function approve(cycleId: string, sectionId: string, req: string) {
    try { approveSection(user, cycleId, req); showToast(`อนุมัติข้อ ${req} แล้ว`, 'success'); finish(sectionId); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  async function back(cycleId: string, sectionId: string, req: string) {
    const note = await prompt({
      title: `ส่งข้อ ${req} กลับแก้ไข`, message: 'ระบุสิ่งที่ต้องแก้', required: true, variant: 'warning', confirmText: 'ยืนยันส่งกลับแก้ไข',
    });
    if (note === null) return;
    try { returnSection(user, cycleId, req, note); showToast(`ส่งข้อ ${req} กลับแก้ไขแล้ว`, 'success'); finish(sectionId); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <>
      <PageHeader title="รอตรวจ" sub="ข้อที่ส่งตรวจและรอบที่รอการพิจารณาของคุณ" />
      <Async q={q} skeleton="table">{({ items, cycleTasks, names }) => (
        <>
          {cycleTasks.length > 0 && (
            <section className="aq-section" aria-labelledby="ct-h">
              <h2 id="ct-h" className="aq-h2">รอบที่รอการพิจารณา</h2>
              <ul className="aq-cycle-cards" data-testid="cycle-tasks">
                {cycleTasks.map(({ cycle, rules }) => (
                  <li key={cycle.id} className="aq-card">
                    <p className="aq-cycle-card__title">รอบ {cycle.academicYear} · {getProgramme(cycle.programmeId)?.nameTh}</p>
                    <div className="aq-cluster aq-mt-2"><CycleStatusBadge status={cycle.status} /></div>
                    <p className="aq-mt-2">รอ: {rules.map(r => CYCLE_ACTION_TH[r.to]).join(' / ')}</p>
                    <Link className="aq-btn aq-btn-primary aq-mt-2" href={`/app/cycles/${cycle.id}`}>
                      เปิดแดชบอร์ดเพื่อพิจารณา<Icon name="chevron-right" size={20} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="aq-card" aria-labelledby="rq-h">
            <h2 id="rq-h" className="aq-h2">{`ข้อที่รอตรวจ (${items.length})`}</h2>
            {items.length === 0 ? (
              <Empty icon="inbox-check" title="ไม่มีข้อที่รอตรวจ" text="เมื่ออาจารย์ส่งข้อมา จะขึ้นที่นี่และมีแจ้งเตือน" />
            ) : (
              <div className="aq-table-wrap">
                <table className="aq-table aq-table--stack" data-testid="review-table">
                  <thead><tr><th>ข้อ</th><th>รอบ</th><th>เจ้าของ</th><th>ส่งเมื่อ</th><th>สรุป</th><th><span className="aq-sr-only">การกระทำ</span></th></tr></thead>
                  <tbody>
                    {items.map(({ cycle, section, canApprove, canReturn, ownWork, evidence, self, gaps }) => {
                      const req = getRequirement(section.requirementId);
                      return (
                        <tr key={section.id} className={leaving.has(section.id) ? 'aq-row-leaving' : undefined}>
                          <td data-label="ข้อ">
                            <div>
                              <Link className="aq-link aq-code" href={sectionHref(cycle.id, section.requirementId)}><strong>{section.requirementId}</strong></Link>
                              {req && <div className="aq-meta">{truncateTh(req.textTh, 60)}</div>}
                            </div>
                          </td>
                          <td data-label="รอบ">{cycle.academicYear} · {getProgramme(cycle.programmeId)?.code}</td>
                          <td data-label="เจ้าของ">{names.get(section.ownerUserId || '') || '—'}</td>
                          <td data-label="ส่งเมื่อ">{fmtDateTime(section.updatedAt)}</td>
                          <td data-label="สรุป">
                            <div className="aq-meta">
                              {`หลักฐาน ${evidence} ชิ้น · ${section.wordCount} คำ · คะแนนตนเอง ${self ?? '—'}`}
                              {gaps && (gaps.critical > 0 || gaps.high > 0) && (
                                <div className="aq-cluster aq-mt-2">
                                  {gaps.critical > 0 && <Badge tone="bad">วิกฤต {gaps.critical}</Badge>}
                                  {gaps.high > 0 && <Badge tone="warn">สูง {gaps.high}</Badge>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="aq-row-actions">
                              <div className="aq-cluster">
                                <Link className="aq-btn aq-btn-primary aq-btn-compact" href={sectionHref(cycle.id, section.requirementId)}>เปิดอ่าน</Link>
                                {canApprove && !ownWork && (
                                  <AsyncButton className="aq-btn aq-btn-compact" testId={`approve-${section.requirementId}`}
                                    onClick={() => approve(cycle.id, section.id, section.requirementId)}>อนุมัติ</AsyncButton>
                                )}
                                {canApprove && ownWork && (
                                  <span><Badge tone="neutral" icon="user">คุณเขียนเอง</Badge><Term k="segregation" label="การแยกหน้าที่" /></span>
                                )}
                              </div>
                              {canReturn && (
                                <AsyncButton className="aq-btn aq-btn-danger aq-btn-compact" testId={`return-${section.requirementId}`}
                                  onClick={() => back(cycle.id, section.id, section.requirementId)}>ส่งกลับ</AsyncButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
