'use client';

import Link from 'next/link';
import {
  getProgramme, getRequirement, listCycles, listNotifications, listSections, markRead, daysUntil,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, Badge, CycleStatusBadge, Empty, PageHeader, SectionStatusBadge, useLoad, useMe } from '@/components/aunqa/common';
import { fmtDate, fmtDateTime, sectionHref } from '@/lib/ui/aunqa';

/** S2 งานของฉัน — section ที่ได้รับมอบหมาย, deadline, แจ้งเตือน */
export default function MyWorkPage() {
  const user = useMe();
  const { showToast } = useToast();

  const q = useLoad(() => {
    const cycles = listCycles(user);
    const mine = cycles.flatMap(c =>
      listSections(user, c.id).filter(s => s.ownerUserId === user.id).map(s => ({ cycle: c, section: s })));
    mine.sort((a, b) => (a.section.due || '9999').localeCompare(b.section.due || '9999'));
    return { cycles, mine, notes: listNotifications(user) };
  }, [user.id]);

  function readAll() { markRead(user); showToast('ทำเครื่องหมายอ่านแล้วทั้งหมด', 'success'); q.reload(); }
  function readOne(id: string) { markRead(user, id); q.reload(); }

  return (
    <>
      <PageHeader title="งานของฉัน" sub={`สวัสดี ${user.fullName} — งานที่ได้รับมอบหมายและการแจ้งเตือนของคุณ`} />
      <Async q={q}>{({ cycles, mine, notes }) => (
        <div className="aq-grid-2">
          <section className="aq-card" aria-labelledby="mywork-h">
            <h2 id="mywork-h" className="aq-h2">ข้อที่ได้รับมอบหมาย ({mine.length})</h2>
            {mine.length === 0 ? (
              <Empty text="ยังไม่มีข้อที่มอบหมายให้คุณ">
                <p className="aq-muted" style={{ marginTop: '0.4rem' }}>ประธานหลักสูตรมอบหมายข้อให้ได้ที่หน้าแดชบอร์ดของรอบประเมิน</p>
              </Empty>
            ) : (
              <div className="aq-table-wrap">
                <table className="aq-table" data-testid="mywork-table">
                  <thead><tr><th>ข้อ</th><th>รอบ</th><th>สถานะ</th><th>กำหนดส่ง</th></tr></thead>
                  <tbody>
                    {mine.map(({ cycle, section }) => {
                      const left = section.due ? daysUntil(section.due) : null;
                      const req = getRequirement(section.requirementId);
                      return (
                        <tr key={section.id}>
                          <td>
                            <Link href={sectionHref(cycle.id, section.requirementId)} data-testid={`mywork-${section.requirementId}`}>
                              <strong>{section.requirementId}</strong>
                            </Link>
                            <div className="aq-muted aq-clamp">{req?.textTh}</div>
                          </td>
                          <td>{cycle.academicYear}<div className="aq-muted">{getProgramme(cycle.programmeId)?.code}</div></td>
                          <td><SectionStatusBadge status={section.status} /></td>
                          <td>
                            {fmtDate(section.due)}
                            {left !== null && section.status !== 'approved' && (
                              <div>
                                <Badge tone={left < 0 ? 'bad' : left <= 3 ? 'warn' : 'neutral'}>
                                  {left < 0 ? `เลย ${-left} วัน` : left === 0 ? 'วันนี้' : `อีก ${left} วัน`}
                                </Badge>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="aq-h2" style={{ marginTop: '1.5rem' }}>รอบประเมินที่เข้าถึงได้</h2>
            {cycles.length === 0 ? <Empty text="ยังไม่มีรอบประเมิน" /> : (
              <ul className="aq-list">
                {cycles.map(c => (
                  <li key={c.id}>
                    <Link href={`/app/cycles/${c.id}`} data-testid={`cycle-link-${c.id}`}>
                      ปี {c.academicYear} · {getProgramme(c.programmeId)?.nameTh}
                    </Link>
                    <CycleStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="aq-card" aria-labelledby="noti-h">
            <div className="aq-row-between">
              <h2 id="noti-h" className="aq-h2">แจ้งเตือน ({notes.filter(n => !n.readAt).length} ใหม่)</h2>
              {notes.some(n => !n.readAt) && <button className="aq-btn aq-btn-sm" onClick={readAll} data-testid="noti-read-all">อ่านทั้งหมด</button>}
            </div>
            {notes.length === 0 ? <Empty text="ไม่มีการแจ้งเตือน" /> : (
              <ul className="aq-list" data-testid="noti-list">
                {notes.slice(0, 30).map(n => (
                  <li key={n.id} className={n.readAt ? 'aq-noti' : 'aq-noti aq-noti-new'}>
                    <div style={{ flex: 1 }}>
                      <div>{n.messageTh}</div>
                      <div className="aq-muted" style={{ fontSize: '0.75rem' }}>{fmtDateTime(n.createdAt)}</div>
                    </div>
                    {n.cycleId && n.requirementId && <Link className="aq-btn aq-btn-sm" href={sectionHref(n.cycleId, n.requirementId)}>เปิด</Link>}
                    {!n.readAt && <button className="aq-btn aq-btn-sm" onClick={() => readOne(n.id)}>อ่านแล้ว</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}</Async>
    </>
  );
}
