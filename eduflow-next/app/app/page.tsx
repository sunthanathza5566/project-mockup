'use client';

/**
 * หน้าหลัก "สิ่งที่ต้องทำตอนนี้" ต่อ role (ADR-UI-001 pages.md P5)
 * - todo จาก listMyTodos → groupForHome (รวม write_section ที่ไม่เร่งด่วนเมื่อ > 3) → top 3 การ์ดใหญ่ + "งานอื่น ๆ"
 * - หัวการ์ด "รวม N งาน" = todoTotal (ตรงกับ badge เมนู "หน้าหลัก" — U1b M2)
 * - ข้อที่ได้รับมอบหมาย (#mywork) แสดงเมื่อมี ≥1 ข้อ · แจ้งเตือน (#notifications) · การ์ดรอบที่เข้าถึงได้
 */
import Link from 'next/link';
import type { AppUser, RoleCode, SarSection, TodoItem } from '@/lib/types';
import {
  daysUntil, getProgramme, getRequirement, listCycles, listMyTodos, listNotifications, listSections, markRead,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import {
  Async, Badge, CycleStatusBadge, Empty, PageHeader, SectionStatusBadge, useLoad, useMe,
} from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { fmtDate, fmtDateLongTh, fmtDateTime, greetingTh, sectionHref } from '@/lib/ui/aunqa';
import { groupForHome, notifyTodosChanged, todoTotal, type HomeTodo } from '@/lib/ui/todo';

/** ลำดับกลุ่มของตาราง "ข้อที่ได้รับมอบหมาย": ต้องแก้ → กำลังเขียน → รอตรวจ → อนุมัติแล้ว */
const MYWORK_ORDER: Record<SarSection['status'], number> = {
  changes_requested: 0, not_started: 1, drafting: 1, ready_for_review: 2, approved: 3,
};

/** ข้อความ empty state ตามบทบาทแรกที่มีตามลำดับ (U1b) */
const ROLE_ORDER: RoleCode[] = ['programme_chair', 'faculty_qa', 'dean', 'uni_admin', 'super_admin', 'data_staff', 'programme_staff', 'assessor'];

function EmptyTodos({ user, firstCycleId }: { user: AppUser; firstCycleId?: string }) {
  const role = ROLE_ORDER.find(r => user.roles.some(x => x.role === r));
  let text = '';
  let action: React.ReactNode = null;
  switch (role) {
    case 'programme_chair':
      text = 'ทุกข้อที่ส่งมาตรวจแล้ว';
      action = <Link className="aq-btn aq-btn-primary" href={firstCycleId ? `/app/cycles/${encodeURIComponent(firstCycleId)}` : '/app/cycles'}>ดูแดชบอร์ดรอบ</Link>;
      break;
    case 'faculty_qa': case 'dean':
      text = 'ยังไม่มีรอบที่รอการพิจารณาของคุณ — จะมีแจ้งเตือนเมื่อหลักสูตรส่งรอบมา';
      break;
    case 'uni_admin': case 'super_admin':
      text = 'ไม่มีงานค้าง';
      action = <Link className="aq-btn aq-btn-primary" href="/app/admin">จัดการผู้ใช้</Link>;
      break;
    case 'data_staff':
      text = 'อัปเดตตัวชี้วัดล่าสุดไว้ ระบบจะตรวจแนวโน้มให้';
      action = <Link className="aq-btn aq-btn-primary" href="/app/metrics">ไปหน้าตัวชี้วัด</Link>;
      break;
    case 'assessor':
      text = 'ยังไม่มีรอบที่เปิดให้ประเมิน — คุณจะได้รับแจ้งเตือนเมื่อ QA คณะเริ่มการประเมิน';
      break;
    default:
      text = 'เมื่อประธานหลักสูตรมอบหมายข้อให้ งานจะขึ้นที่นี่ทันที ระหว่างนี้คุณเพิ่มหลักฐานเข้าคลังไว้ก่อนได้';
      action = <Link className="aq-btn aq-btn-primary" href="/app/evidence?new=1">เพิ่มหลักฐาน</Link>;
  }
  return <Empty icon="check-circle" title="ตอนนี้ไม่มีงานรอท่าน" text={text} action={action} />;
}

/** บรรทัด meta ใต้หัวการ์ด: ปีของรอบ (เฉพาะเมื่อหัวข้อยังไม่บอก) */
function todoMeta(t: TodoItem): string {
  return t.academicYear && !t.titleTh.includes(String(t.academicYear)) ? `รอบ ${t.academicYear}` : '';
}

function TodoCard({ h, index, accent }: { h: HomeTodo; index: number; accent: boolean }) {
  const kind = h.kind === 'item' ? h.item.kind : h.kind;
  const title = h.kind === 'item' ? h.item.titleTh : h.titleTh;
  const urgent = h.kind === 'item' && h.item.urgent;
  return (
    <article className={`aq-card aq-todo${accent ? ' aq-card--accent' : ''}`} data-testid={`todo-${kind}-${index}`}>
      <div className="aq-todo__head">
        <Icon name={h.action.icon} size={24} />
        {urgent && <Badge tone="warn" icon="clock">เร่งด่วน</Badge>}
      </div>
      <h3 className="aq-todo__title">{title}</h3>
      {h.kind === 'item' && h.item.detailTh && <p className="aq-muted">“{h.item.detailTh}”</p>}
      {h.kind === 'item' && todoMeta(h.item) && <p className="aq-meta">{todoMeta(h.item)}</p>}
      <div className="aq-todo__actions">
        <Link className={`aq-btn${accent ? ' aq-btn-primary' : ''}`} href={h.action.href}>
          {h.action.label}<Icon name="chevron-right" size={20} />
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const user = useMe();
  const { showToast } = useToast();

  const q = useLoad(() => {
    const cycles = listCycles(user);
    const mine = cycles.flatMap(c =>
      listSections(user, c.id).filter(s => s.ownerUserId === user.id).map(s => ({ cycle: c, section: s })));
    mine.sort((a, b) => MYWORK_ORDER[a.section.status] - MYWORK_ORDER[b.section.status]
      || (a.section.due || '9999').localeCompare(b.section.due || '9999'));
    const progress = new Map(cycles.map(c => [c.id, listSections(user, c.id).filter(s => s.status === 'approved').length]));
    return { cycles, mine, progress, todos: listMyTodos(user), notes: listNotifications(user) };
  }, [user.id]);

  function readAll() { markRead(user); showToast('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด', 'success'); notifyTodosChanged(); q.reload(); }
  function readOne(id: string) { markRead(user, id); notifyTodosChanged(); q.reload(); }

  const now = new Date();
  return (
    <>
      <PageHeader title="หน้าหลัก" sub={`${greetingTh(now)} ${user.fullName} · ${fmtDateLongTh(now)}`} />
      <Async q={q} skeleton="cards">{({ cycles, mine, progress, todos, notes }) => {
        const home = groupForHome(todos);
        const top = home.slice(0, 3);
        const rest = home.slice(3);
        const unread = notes.filter(n => !n.readAt).length;
        return (
          <>
            <section className="aq-section" aria-labelledby="todo-h">
              <div className="aq-card__head">
                <h2 id="todo-h" className="aq-h2">สิ่งที่ต้องทำตอนนี้</h2>
                {todos.length > 0 && <span className="aq-muted">(รวม {todoTotal(todos)} งาน)</span>}
              </div>
              {home.length === 0 ? <EmptyTodos user={user} firstCycleId={cycles[0]?.id} /> : (
                <>
                  <div className="aq-todo-grid">
                    {top.map((h, i) => <TodoCard key={h.kind === 'item' ? h.item.id : 'group'} h={h} index={i} accent={i === 0} />)}
                  </div>
                  {rest.length > 0 && (
                    <details className="aq-collapse aq-card aq-mt-4" open={rest.length <= 5}>
                      <summary>
                        งานอื่น ๆ อีก {rest.length} รายการ
                        <Icon name="chevron-down" size={20} className="aq-collapse__chev" />
                      </summary>
                      <ul className="aq-todo-list">
                        {rest.map((h, i) => {
                          const kind = h.kind === 'item' ? h.item.kind : h.kind;
                          const title = h.kind === 'item' ? h.item.titleTh : h.titleTh;
                          return (
                            <li key={h.kind === 'item' ? h.item.id : 'group'} data-testid={`todo-${kind}-${i + 3}`}>
                              <Icon name={h.action.icon} size={20} />
                              <span className="aq-flex-1">{title}</span>
                              {h.kind === 'item' && h.item.urgent && <Badge tone="warn" icon="clock">เร่งด่วน</Badge>}
                              <Link className="aq-btn aq-btn-ghost aq-btn-compact" href={h.action.href}>
                                {h.action.label}<Icon name="chevron-right" size={20} />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </section>

            <div className={mine.length > 0 ? 'aq-grid-2' : undefined}>
              {mine.length > 0 && (
                <section className="aq-card" id="mywork" aria-labelledby="mywork-h">
                  <h2 id="mywork-h" className="aq-h2">ข้อที่ได้รับมอบหมาย ({mine.length})</h2>
                  <div className="aq-table-wrap">
                    <table className="aq-table aq-table--stack" data-testid="mywork-table">
                      <thead><tr><th>ข้อ</th><th>รอบ</th><th>สถานะ</th><th>กำหนดส่ง</th></tr></thead>
                      <tbody>
                        {mine.map(({ cycle, section }) => {
                          const left = section.due ? daysUntil(section.due) : null;
                          const req = getRequirement(section.requirementId);
                          return (
                            <tr key={section.id}>
                              <td data-label="ข้อ">
                                <div>
                                  <Link className="aq-link aq-code" href={sectionHref(cycle.id, section.requirementId)} data-testid={`mywork-${section.requirementId}`}>
                                    <strong>{section.requirementId}</strong>
                                  </Link>
                                  <div className="aq-muted aq-clamp">{req?.textTh}</div>
                                </div>
                              </td>
                              <td data-label="รอบ">{cycle.academicYear} · {getProgramme(cycle.programmeId)?.code}</td>
                              <td data-label="สถานะ"><SectionStatusBadge status={section.status} /></td>
                              <td data-label="กำหนดส่ง">
                                <div>
                                  {fmtDate(section.due)}
                                  {left !== null && section.status !== 'approved' && (
                                    <div>
                                      <Badge tone={left < 0 ? 'bad' : left <= 3 ? 'warn' : 'neutral'} icon="clock">
                                        {left < 0 ? `เลย ${-left} วัน` : left === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${left} วัน`}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="aq-card" id="notifications" aria-labelledby="noti-h">
                <div className="aq-card__head">
                  <h2 id="noti-h" className="aq-h2">แจ้งเตือน ({unread} ใหม่)</h2>
                  {unread > 0 && (
                    <button type="button" className="aq-btn aq-btn-compact" onClick={readAll} data-testid="noti-read-all">
                      ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                    </button>
                  )}
                </div>
                <p className="aq-help aq-mb-4">การทำเครื่องหมายว่าอ่านแล้วไม่ทำให้งานในรายการ “สิ่งที่ต้องทำ” หายไป</p>
                {notes.length === 0 ? <Empty icon="bell" title="ไม่มีการแจ้งเตือน" /> : (
                  <ul className="aq-noti-list" data-testid="noti-list">
                    {notes.slice(0, 30).map(n => (
                      <li key={n.id} className={n.readAt ? 'aq-noti' : 'aq-noti is-new'}>
                        {!n.readAt && <span className="aq-noti-dot" aria-label="ใหม่" role="img" />}
                        <div className="aq-noti__body">
                          <p className="aq-noti__msg">{n.messageTh}</p>
                          <p className="aq-meta">{fmtDateTime(n.createdAt)}</p>
                          <div className="aq-cluster">
                            {n.cycleId && n.requirementId && (
                              <Link className="aq-btn aq-btn-compact" href={sectionHref(n.cycleId, n.requirementId)}>เปิดข้อ</Link>
                            )}
                            {n.cycleId && !n.requirementId && (
                              <Link className="aq-btn aq-btn-compact" href={`/app/cycles/${encodeURIComponent(n.cycleId)}`}>เปิดรอบ</Link>
                            )}
                            {!n.readAt && (
                              <button type="button" className="aq-btn aq-btn-ghost aq-btn-compact" onClick={() => readOne(n.id)}>
                                ทำเครื่องหมายว่าอ่านแล้ว
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="aq-section aq-mt-6" aria-labelledby="cyc-h">
              <h2 id="cyc-h" className="aq-h2">รอบประเมินที่เข้าถึงได้</h2>
              {cycles.length === 0 ? <Empty icon="calendar-cycle" title="ยังไม่มีรอบประเมิน" /> : (
                <ul className="aq-cycle-cards">
                  {cycles.map(c => (
                    <li key={c.id} className="aq-card aq-card--link">
                      <Link className="aq-card__cover aq-cycle-card__title" href={`/app/cycles/${encodeURIComponent(c.id)}`} data-testid={`cycle-link-${c.id}`}>
                        ปี {c.academicYear} · {getProgramme(c.programmeId)?.nameTh}
                      </Link>
                      <div className="aq-cluster aq-mt-2"><CycleStatusBadge status={c.status} /></div>
                      <div className="aq-mt-2">
                        <ProgressBar value={progress.get(c.id) ?? 0} max={53} label={`อนุมัติ ${progress.get(c.id) ?? 0}/53`} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        );
      }}</Async>
    </>
  );
}
