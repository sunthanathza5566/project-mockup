'use client';

/**
 * หน้าหลัก "สิ่งที่ต้องทำตอนนี้" ต่อ role (ADR-UI-003 D7 / friendly-spec §F4 — แทน saas-spec §P5)
 * - การ์ดทักทาย: คำทักทายตามเวลา + ชื่อ, วันที่, สรุป "วันนี้มี N งานที่ควรทำก่อน" (N = todo ที่ urgent),
 *   วงความคืบหน้ารอบแรก (≥768) และปุ่ม primary เดียว "ทำงานถัดไป" = todo ตัวแรก (`home-next-task`)
 * - todo จาก listMyTodos → groupForHome → รายการแถวเดียวในการ์ดเดียว (top 3 + "งานอื่น ๆ" แบบ details)
 *   แถวไม่ใช่ลิงก์ทั้งแถว — ปุ่ม "ไปทำ" 1 ปุ่ม/แถว (outline) · urgent = badge "เร่งด่วน" + ขอบซ้าย warning
 * - "(รวม N งาน)" = todoTotal (ตรงกับตัวนับเมนู "หน้าหลัก" — U1b M2)
 * - ข้อที่ได้รับมอบหมาย `section#mywork` (ปลายทางแจ้งเตือน my_work) + การ์ดรอบที่เข้าถึงได้
 * - ไม่มีกล่องแจ้งเตือนแล้ว (ย้ายไป panel จากกระดิ่ง — §F11)
 */
import Link from 'next/link';
import type { AppUser, RoleCode, SarSection, TodoItem } from '@/lib/types';
import {
  can, daysUntil, getProgramme, getRequirement, listCycles, listMyTodos, listSections, programmeScope,
} from '@/lib/api';
import { useLang } from '@/context/LangContext';
import {
  Async, Badge, CycleStatusBadge, Empty, PageHeader, SectionStatusBadge, useLoad, useMe,
} from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import ProgressRing, { ProgressBar } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/primitives/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { fmtDate, fmtDateLongTh, greetingTh, sectionHref } from '@/lib/ui/aunqa';
import { groupForHome, todoTotal, type HomeTodo } from '@/lib/ui/todo';

/** จำนวนข้อเกณฑ์ต่อรอบ (เดิม) */
const REQ_TOTAL = 53;

/** ลำดับกลุ่มของตาราง "ข้อที่ได้รับมอบหมาย": ต้องแก้ → กำลังเขียน → รอตรวจ → อนุมัติแล้ว */
const MYWORK_ORDER: Record<SarSection['status'], number> = {
  changes_requested: 0, not_started: 1, drafting: 1, ready_for_review: 2, approved: 3,
};

/** ข้อความ empty state ตามบทบาทแรกที่มีตามลำดับ (U1b) */
const ROLE_ORDER: RoleCode[] = ['programme_chair', 'faculty_qa', 'dean', 'uni_admin', 'super_admin', 'data_staff', 'programme_staff', 'assessor'];

const GREET_EN: Record<string, string> = { 'สวัสดีตอนเช้า': 'Good morning', 'สวัสดีตอนบ่าย': 'Good afternoon', 'สวัสดีตอนเย็น': 'Good evening' };

function EmptyTodos({ user, firstCycleId }: { user: AppUser; firstCycleId?: string }) {
  const role = ROLE_ORDER.find(r => user.roles.some(x => x.role === r));
  let text = '';
  let action: { href: string; label: string } | null = null;
  switch (role) {
    case 'programme_chair':
      text = 'ทุกข้อที่ส่งมาตรวจแล้ว';
      action = { href: firstCycleId ? `/app/cycles/${encodeURIComponent(firstCycleId)}` : '/app/cycles', label: 'ดูแดชบอร์ดรอบ' };
      break;
    case 'faculty_qa': case 'dean':
      text = 'ยังไม่มีรอบที่รอการพิจารณาของคุณ — จะมีแจ้งเตือนเมื่อหลักสูตรส่งรอบมา';
      break;
    case 'uni_admin': case 'super_admin':
      text = 'ไม่มีงานค้าง';
      action = { href: '/app/admin', label: 'จัดการผู้ใช้' };
      break;
    case 'data_staff':
      text = 'อัปเดตตัวชี้วัดล่าสุดไว้ ระบบจะตรวจแนวโน้มให้';
      action = { href: '/app/metrics', label: 'ไปหน้าตัวชี้วัด' };
      break;
    case 'assessor':
      text = 'ยังไม่มีรอบที่เปิดให้ประเมิน — คุณจะได้รับแจ้งเตือนเมื่อ QA คณะเริ่มการประเมิน';
      break;
    default:
      text = 'เมื่อประธานหลักสูตรมอบหมายข้อให้ งานจะขึ้นที่นี่ทันที ระหว่างนี้คุณเพิ่มหลักฐานเข้าคลังไว้ก่อนได้';
      action = { href: '/app/evidence?new=1', label: 'เพิ่มหลักฐาน' };
  }
  return (
    <Empty
      icon="check-circle" title="ตอนนี้ไม่มีงานรอท่าน" text={text}
      action={action ? <Button asChild><Link href={action.href}>{action.label}</Link></Button> : undefined}
    />
  );
}

/** บรรทัด meta ใต้หัวแถว: ปีของรอบ (เฉพาะเมื่อหัวข้อยังไม่บอก) */
function todoMeta(t: TodoItem): string {
  return t.academicYear && !t.titleTh.includes(String(t.academicYear)) ? `รอบ ${t.academicYear}` : '';
}

/** แถว todo — ทั้งแถวไม่ใช่ลิงก์ · ปุ่ม "ไปทำ" อ้างชื่องานด้วย aria-describedby */
function TodoRow({ h, index }: { h: HomeTodo; index: number }) {
  const kind = h.kind === 'item' ? h.item.kind : h.kind;
  const title = h.kind === 'item' ? h.item.titleTh : h.titleTh;
  const urgent = h.kind === 'item' && h.item.urgent;
  const detail = h.kind === 'item' ? h.item.detailTh : undefined;
  const meta = h.kind === 'item' ? todoMeta(h.item) : '';
  const titleId = `todo-title-${index}`;
  return (
    <li
      data-testid={`todo-${kind}-${index}`}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-5',
        urgent && 'border-l-4 border-l-warning',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
        <Icon name={h.action.icon} size={20} />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p id={titleId} className="m-0 font-medium text-foreground">{title}</p>
        {detail && <p className="aq-meta m-0">“{detail}”</p>}
        {meta && <p className="aq-meta m-0">{meta}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {urgent && <Badge tone="warn" icon="clock">เร่งด่วน</Badge>}
        <Button asChild variant="outline" size="compact">
          <Link href={h.action.href} aria-describedby={titleId}>
            ไปทำ<Icon name="chevron-right" size={20} />
          </Link>
        </Button>
      </div>
    </li>
  );
}

export default function HomePage() {
  const user = useMe();
  const { lang } = useLang();

  const q = useLoad(() => {
    const cycles = listCycles(user);
    const mine = cycles.flatMap(c =>
      listSections(user, c.id).filter(s => s.ownerUserId === user.id).map(s => ({ cycle: c, section: s })));
    mine.sort((a, b) => MYWORK_ORDER[a.section.status] - MYWORK_ORDER[b.section.status]
      || (a.section.due || '9999').localeCompare(b.section.due || '9999'));
    const progress = new Map(cycles.map(c => [c.id, listSections(user, c.id).filter(s => s.status === 'approved').length]));
    const canUpload = cycles.some(c => can(user, 'evidence.write', programmeScope(c.programmeId)));
    return { cycles, mine, progress, todos: listMyTodos(user), canUpload };
  }, [user.id]);

  const now = new Date();
  const greet = greetingTh(now);
  const evening = greet === 'สวัสดีตอนเย็น';
  return (
    <>
      <PageHeader
        title="หน้าหลัก"
        actions={q.data?.canUpload ? (
          // AC-14 / UX-U3-3: ทางลัดเพิ่มหลักฐาน → ฟอร์มเปิดทันที
          <Button asChild variant="outline">
            <Link href="/app/evidence?new=1" data-testid="home-add-evidence"><Icon name="plus" size={20} />เพิ่มหลักฐาน</Link>
          </Button>
        ) : undefined}
      />
      <Async q={q} skeleton="cards">{({ cycles, mine, progress, todos }) => {
        const home = groupForHome(todos);
        const top = home.slice(0, 3);
        const rest = home.slice(3);
        const next = home[0];
        const urgent = todos.filter(t => t.urgent).length;
        const first = cycles[0];
        const firstDone = first ? progress.get(first.id) ?? 0 : 0;
        return (
          <>
            {/* การ์ดทักทาย (§F4) */}
            <section
              className="mb-8 animate-fade-up rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6"
              aria-labelledby="greet-h" data-testid="home-greeting"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clay-muted text-clay" aria-hidden="true">
                    <Icon name={evening ? 'moon' : 'sun'} size={24} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h2 id="greet-h" className="m-0 break-words text-xl font-semibold text-foreground" data-no-i18n="">
                      {lang === 'en' ? `${GREET_EN[greet] ?? greet}, ${user.fullName}` : `${greet} ${user.fullName}`}
                    </h2>
                    <p className="m-0 text-base text-muted-foreground">
                      <span>{fmtDateLongTh(now)}</span>
                      <span aria-hidden="true">{' · '}</span>
                      <span>{urgent > 0 ? `วันนี้มี ${urgent} งานที่ควรทำก่อน` : 'ไม่มีงานเร่งด่วน — ทำต่อจากที่ค้างไว้ได้เลย'}</span>
                    </p>
                  </div>
                </div>
                {first && (
                  <div className="hidden shrink-0 items-center gap-4 rounded-xl bg-muted px-4 py-3 md:flex" data-testid="home-progress">
                    <ProgressRing
                      size="sm" value={firstDone} max={REQ_TOTAL}
                      center={`${Math.round((firstDone / REQ_TOTAL) * 100)}%`}
                      ariaLabel={`อนุมัติแล้ว ${firstDone} จาก ${REQ_TOTAL} ข้อ`}
                    />
                    <div className="min-w-0">
                      <p className="aq-meta m-0">{`ความคืบหน้ารอบ ${first.academicYear}`}</p>
                      <p className="m-0 font-medium tabular-nums text-foreground">{`อนุมัติ ${firstDone}/${REQ_TOTAL}`}</p>
                    </div>
                  </div>
                )}
              </div>
              {next && (
                <div className="mt-5">
                  <Button asChild>
                    <Link href={next.action.href} data-testid="home-next-task">
                      <span>ทำงานถัดไป</span>
                      <span aria-hidden="true">·</span>
                      <span>{next.action.label}</span>
                      <Icon name="chevron-right" size={20} />
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            {/* สิ่งที่ต้องทำ — รายการแถวเดียว */}
            <section className="mb-8" aria-labelledby="todo-h">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id="todo-h" className="m-0 text-xl font-semibold text-foreground">สิ่งที่ต้องทำตอนนี้</h2>
                {todos.length > 0 && <span className="aq-meta">{`(รวม ${todoTotal(todos)} งาน)`}</span>}
              </div>
              {home.length === 0 ? <EmptyTodos user={user} firstCycleId={cycles[0]?.id} /> : (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
                  <ul className="m-0 list-none divide-y p-0">
                    {top.map((h, i) => <TodoRow key={h.kind === 'item' ? h.item.id : 'group'} h={h} index={i} />)}
                  </ul>
                  {rest.length > 0 && (
                    <details className="group/more border-t" open={rest.length <= 5}>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-medium text-foreground transition-colors duration-fast hover:bg-accent md:px-5 [&::-webkit-details-marker]:hidden">
                        <Icon name="chevron-right" size={20} className="text-muted-foreground transition-transform duration-fast group-open/more:rotate-90" />
                        {`งานอื่น ๆ อีก ${rest.length} รายการ`}
                      </summary>
                      <ul className="m-0 list-none divide-y border-t p-0">
                        {rest.map((h, i) => <TodoRow key={h.kind === 'item' ? h.item.id : 'group'} h={h} index={i + 3} />)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </section>

            <div className={cn('grid gap-8', mine.length > 0 && 'lg:grid-cols-[minmax(0,1fr)_22rem]')}>
              {mine.length > 0 && (
                <section id="mywork" className="min-w-0 scroll-mt-20" aria-labelledby="mywork-h">
                  <h2 id="mywork-h" className="m-0 mb-3 text-xl font-semibold text-foreground">{`ข้อที่ได้รับมอบหมาย (${mine.length})`}</h2>
                  <Table data-testid="mywork-table">
                    <TableHeader>
                      <tr><TableHead>ข้อ</TableHead><TableHead>รอบ</TableHead><TableHead>สถานะ</TableHead><TableHead>กำหนดส่ง</TableHead></tr>
                    </TableHeader>
                    <TableBody>
                      {mine.map(({ cycle, section }) => {
                        const left = section.due ? daysUntil(section.due) : null;
                        const req = getRequirement(section.requirementId);
                        return (
                          <TableRow key={section.id}>
                            <TableCell className="min-w-[12rem]">
                              <Link
                                className="font-semibold text-primary underline-offset-4 visited:text-primary hover:underline"
                                href={sectionHref(cycle.id, section.requirementId)} data-testid={`mywork-${section.requirementId}`}
                              >
                                {section.requirementId}
                              </Link>
                              {req?.textTh && <p className="aq-meta m-0 line-clamp-2">{req.textTh}</p>}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{cycle.academicYear} · {getProgramme(cycle.programmeId)?.code}</TableCell>
                            <TableCell><SectionStatusBadge status={section.status} /></TableCell>
                            <TableCell>
                              <div className="whitespace-nowrap">{fmtDate(section.due)}</div>
                              {left !== null && section.status !== 'approved' && (
                                <div className="mt-1">
                                  <Badge tone={left < 0 ? 'bad' : left <= 3 ? 'warn' : 'neutral'} icon="clock">
                                    {left < 0 ? `เลย ${-left} วัน` : left === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${left} วัน`}
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </section>
              )}

              <section className="min-w-0" aria-labelledby="cyc-h">
                <h2 id="cyc-h" className="m-0 mb-3 text-xl font-semibold text-foreground">รอบประเมินที่เข้าถึงได้</h2>
                {cycles.length === 0 ? <Empty icon="calendar-cycle" title="ยังไม่มีรอบประเมิน" /> : (
                  <ul className={cn('m-0 grid list-none gap-3 p-0', mine.length === 0 && 'md:grid-cols-2 xl:grid-cols-3')}>
                    {cycles.map(c => {
                      const done = progress.get(c.id) ?? 0;
                      return (
                        <li key={c.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm dark:shadow-none">
                          <Link
                            className="block font-semibold text-foreground no-underline visited:text-foreground hover:text-primary hover:underline"
                            href={`/app/cycles/${encodeURIComponent(c.id)}`} data-testid={`cycle-link-${c.id}`}
                          >
                            ปี {c.academicYear} · {getProgramme(c.programmeId)?.nameTh}
                          </Link>
                          <div className="flex flex-wrap gap-2"><CycleStatusBadge status={c.status} /></div>
                          <ProgressBar value={done} max={REQ_TOTAL} label={`อนุมัติ ${done}/${REQ_TOTAL}`} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        );
      }}</Async>
    </>
  );
}
