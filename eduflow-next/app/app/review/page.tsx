'use client';

/**
 * คิวรอตรวจ (saas-spec §P16 + friendly-spec §F13)
 * - การ์ดรอบที่รอการพิจารณา (cycle-tasks) grid md:2 xl:3 — ปุ่มหลัก 1 ปุ่มต่อการ์ด
 * - review-table (§C5): ข้อ | รอบ | เจ้าของ | ส่งเมื่อ | สรุป (UX-7) | [อนุมัติ](default compact) [เปิดอ่าน](outline) ··· [ส่งกลับ](destructiveOutline)
 *   มือถือ <768 แต่ละแถวเป็นการ์ดย่อย ป้ายคอลัมน์จาก data-label
 * - แถวที่ผู้ใช้เป็นผู้เขียนล่าสุด: ไม่ render ปุ่มอนุมัติ + pill "คุณเขียนเอง" + Term segregation
 * - หลังอนุมัติ/ส่งกลับ: แถวจาง 220ms แล้วหาย + toast · ไม่มีอนุมัติเป็นชุด
 * - ปุ่ม "อนุมัติ" (การกระทำ) แปล EN เป็น "Approve" เอง (data-no-i18n) เพราะ key "อนุมัติ" ใน dict = ป้ายสถานะ "Approved"
 *   (orchestrator ตัดสิน 2026-10-26 — Found Issues TASK-0002)
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
import { useLang } from '@/context/LangContext';
import { Async, AsyncButton, Badge, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { CYCLE_ACTION_TH, errMsg, fmtDateTime, sectionHref, truncateTh } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const LEAVE_MS = 220;

/** ป้ายปุ่มอนุมัติ (การกระทำ) — แยกจากป้ายสถานะ "อนุมัติ" = "Approved" ใน dict */
const APPROVE_LABEL = { th: 'อนุมัติ', en: 'Approve' } as const;

/** §C5 ตารางแบบ stack บนมือถือ (<768) — class literal ให้ JIT สแกนเจอ */
const STACK_TABLE = 'max-md:block';
const STACK_HEAD = 'max-md:sr-only';
const STACK_BODY = 'max-md:block';
const STACK_ROW = 'max-md:block max-md:p-4';
const STACK_CELL = 'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';
const STACK_ACTIONS = 'max-md:block max-md:px-0 max-md:pb-0 max-md:pt-3';
const CODE_LINK = 'inline-flex min-h-11 items-center font-semibold tabular-nums text-primary underline underline-offset-4 hover:decoration-2';

export default function ReviewPage() {
  const user = useMe();
  const { lang } = useLang();
  const { showToast } = useToast();
  const { prompt, confirm } = useDialog();
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

  async function approve(cycleId: string, sectionId: string, req: string, critical = 0) {
    // UX-U3-5: อนุมัติจากแถวโดยไม่เปิดอ่าน ขณะข้อนั้นยังมีช่องว่างวิกฤต → เตือนก่อน
    if (critical > 0) {
      const ok = await confirm({
        title: `อนุมัติข้อ ${req} ทั้งที่ยังมีช่องว่างวิกฤต`,
        message: `ข้อนี้ยังมีช่องว่างระดับวิกฤต ${critical} รายการ (เช่น ยังไม่มีหลักฐานผูก) แนะนำให้เปิดอ่านก่อนอนุมัติ`,
        variant: 'warning', cancelText: 'กลับไปเปิดอ่านก่อน', confirmText: 'ยืนยันอนุมัติ',
      });
      if (!ok) return;
    }
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
            <section className="mb-8" aria-labelledby="ct-h">
              <h2 id="ct-h" className="mb-3 text-xl font-semibold text-foreground">รอบที่รอการพิจารณา</h2>
              <ul className="grid list-none gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="cycle-tasks">
                {cycleTasks.map(({ cycle, rules }) => (
                  <li key={cycle.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                        <Icon name="calendar-cycle" size={20} />
                      </span>
                      <p className="min-w-0 font-semibold text-foreground">รอบ {cycle.academicYear} · {getProgramme(cycle.programmeId)?.nameTh}</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><CycleStatusBadge status={cycle.status} /></div>
                    <p className="text-base text-foreground">รอ: {rules.map(r => CYCLE_ACTION_TH[r.to]).join(' / ')}</p>
                    <div className="mt-auto pt-1">
                      <Button asChild>
                        <Link href={`/app/cycles/${cycle.id}`}>
                          เปิดแดชบอร์ดเพื่อพิจารณา<Icon name="chevron-right" size={20} />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="rq-h">
            <h2 id="rq-h" className="mb-3 text-xl font-semibold text-foreground">{`ข้อที่รอตรวจ (${items.length})`}</h2>
            {items.length === 0 ? (
              <Empty icon="inbox-check" title="ไม่มีข้อที่รอตรวจ" text="เมื่ออาจารย์ส่งข้อมา จะขึ้นที่นี่และมีแจ้งเตือน" />
            ) : (
              <Table data-testid="review-table" className={STACK_TABLE} wrapperClassName="rounded-xl shadow-sm dark:shadow-none">
                <TableHeader className={STACK_HEAD}>
                  <tr>
                    <TableHead>ข้อ</TableHead><TableHead>รอบ</TableHead><TableHead>เจ้าของ</TableHead>
                    <TableHead>ส่งเมื่อ</TableHead><TableHead>สรุป</TableHead><TableHead><span className="sr-only">การกระทำ</span></TableHead>
                  </tr>
                </TableHeader>
                <TableBody className={STACK_BODY}>
                  {items.map(({ cycle, section, canApprove, canReturn, ownWork, evidence, self, gaps }) => {
                    const req = getRequirement(section.requirementId);
                    return (
                      <TableRow
                        key={section.id}
                        className={cn(STACK_ROW, 'transition-opacity duration-base ease-exit', leaving.has(section.id) && 'opacity-0')}
                      >
                        <TableCell data-label="ข้อ" className={cn('min-w-[12rem]', STACK_CELL)}>
                          <Link className={CODE_LINK} href={sectionHref(cycle.id, section.requirementId)}><strong className="font-semibold">{section.requirementId}</strong></Link>
                          {req && <p className="aq-meta line-clamp-2">{truncateTh(req.textTh, 60)}</p>}
                        </TableCell>
                        <TableCell data-label="รอบ" className={cn('whitespace-nowrap', STACK_CELL)}>{cycle.academicYear} · {getProgramme(cycle.programmeId)?.code}</TableCell>
                        <TableCell data-label="เจ้าของ" className={STACK_CELL}>{names.get(section.ownerUserId || '') || '—'}</TableCell>
                        <TableCell data-label="ส่งเมื่อ" className={cn('tabular-nums', STACK_CELL)}>{fmtDateTime(section.updatedAt)}</TableCell>
                        <TableCell data-label="สรุป" className={cn('min-w-[12rem]', STACK_CELL)}>
                          <p className="aq-meta">{`หลักฐาน ${evidence} ชิ้น · ${section.wordCount} คำ · คะแนนตนเอง ${self ?? '—'}`}</p>
                          {gaps && (gaps.critical > 0 || gaps.high > 0) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {gaps.critical > 0 && <Badge tone="bad">วิกฤต {gaps.critical}</Badge>}
                              {gaps.high > 0 && <Badge tone="warn">สูง {gaps.high}</Badge>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={STACK_ACTIONS}>
                          <div className="flex flex-wrap items-center gap-2 md:min-w-[17rem] md:justify-end">
                            {canApprove && !ownWork && (
                              <AsyncButton variant="default" size="compact" testId={`approve-${section.requirementId}`}
                                onClick={() => approve(cycle.id, section.id, section.requirementId, gaps?.critical ?? 0)}>
                                <span data-no-i18n="">{APPROVE_LABEL[lang === 'en' ? 'en' : 'th']}</span>
                              </AsyncButton>
                            )}
                            <Button asChild variant="outline" size="compact">
                              <Link href={sectionHref(cycle.id, section.requirementId)}>เปิดอ่าน</Link>
                            </Button>
                            {canApprove && ownWork && (
                              <span className="inline-flex items-center gap-1">
                                <Badge tone="neutral" icon="user">คุณเขียนเอง</Badge><Term k="segregation" label="การแยกหน้าที่" />
                              </span>
                            )}
                            {canReturn && (
                              <AsyncButton variant="destructiveOutline" size="compact" testId={`return-${section.requirementId}`}
                                onClick={() => back(cycle.id, section.id, section.requirementId)}>
                                <Icon name="undo" size={16} />ส่งกลับ
                              </AsyncButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}</Async>
    </>
  );
}
