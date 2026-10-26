'use client';

/**
 * มอบหมายงาน (saas-spec §P8 + friendly-spec §F13)
 * - แถบสรุป "มอบหมายแล้ว n/53" + ปุ่มไปข้อถัดไปที่ยังไม่มีเจ้าของ
 * - ต่อเกณฑ์: การ์ด <details> พับได้ (เปิดเป็นค่าเริ่มต้น) + bar มอบหมาย + แถบ bulk (toolbar flex-wrap) + ตาราง §C5
 *   มือถือ <768 แถวเป็นการ์ดย่อย · select/date ในแถวสูง 44 ทุกจอ (AC-05: compact 40 ใช้กับปุ่มเท่านั้น — ต่างจาก §P8)
 * - หลังบันทึก: aq-saved "บันทึกแล้ว" ใต้ช่อง 2 วินาที + `animate-highlight` ที่แถว (L5) + toast · ผิดพลาด = aq-field-error ใต้ช่อง
 * - P10: เจ้าของที่ไม่อยู่ในรายการที่มอบหมายได้ แสดงชื่อจริง + " (มอบหมายไว้เดิม)"
 * - คง owner-{id} / due-{id} / bulk-* / assessor-* / cycle-due / cycle-dates-save
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  assignAssessor, assignCriterion, assignSections, can, cycleScope, getCycle, isActiveUser, listAssignableUsers, listCriteria,
  listRequirements, listSections, listUsers, updateCycleDates,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, InlineMessage, PageHeader, SectionStatusBadge, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { TONE_TEXT } from '@/lib/ui/tone';
import { decodeParam, errMsg } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
const H2 = 'text-xl font-semibold text-foreground';
const LABEL = 'block text-base font-medium text-foreground';
const CODE_LINK = 'inline-flex min-h-11 items-center font-semibold tabular-nums text-primary underline underline-offset-4 hover:decoration-2';
const SAVED = 'aq-saved inline-flex items-center gap-1 text-success';
const FIELD_ERR = 'aq-field-error flex items-start gap-1';
/** §C5 ตารางแบบ stack บนมือถือ (<768) — class literal ให้ JIT สแกนเจอ */
const STACK_TABLE = 'max-md:block';
const STACK_HEAD = 'max-md:sr-only';
const STACK_BODY = 'max-md:block';
const STACK_ROW = 'max-md:block max-md:p-4';
const STACK_CELL = 'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';

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
            actions={<Button asChild variant="outline"><Link href={`/app/cycles/${id}`}><Icon name="chevron-left" size={20} />แดชบอร์ดรอบ</Link></Button>}
          />
          {!canAssign && <InlineMessage tone="info" className="mb-6">คุณไม่มีสิทธิ์มอบหมายงาน (ดูอย่างเดียว)</InlineMessage>}

          {(canAssign || canAssessor) && (
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {canAssign && (
                <section className={cn(CARD, 'min-w-0')} aria-labelledby="dates-h">
                  <h2 id="dates-h" className={cn(H2, 'mb-4')}>วันสำคัญของรอบ</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="as-sub" className={LABEL}>กำหนดส่ง SAR</label>
                      <Input id="as-sub" type="date" data-testid="cycle-due"
                        value={dates.sub ?? cycle.submissionDue ?? ''} onChange={e => setDates(d => ({ ...d, sub: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="as-asm" className={LABEL}>วันประเมิน</label>
                      <Input id="as-asm" type="date"
                        value={dates.asm ?? cycle.assessmentDate ?? ''} onChange={e => setDates(d => ({ ...d, asm: e.target.value }))} />
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="mt-5" data-testid="cycle-dates-save"
                    onClick={() => run(() => updateCycleDates(user, id, {
                      submissionDue: dates.sub ?? cycle.submissionDue, assessmentDate: dates.asm ?? cycle.assessmentDate,
                    }), 'บันทึกวันที่แล้ว')}>บันทึกวันที่</Button>
                </section>
              )}
              {canAssessor && (
                <section className={cn(CARD, 'min-w-0')} aria-labelledby="asr-h">
                  <h2 id="asr-h" className={cn(H2, 'mb-4')}>กรรมการประเมิน (อ่านอย่างเดียว)</h2>
                  <div className="space-y-1.5">
                    <label htmlFor="as-asr" className={LABEL}>เลือกผู้ใช้ที่มีบทบาทกรรมการ</label>
                    <NativeSelect id="as-asr" value={assessorId} onChange={e => setAssessorId(e.target.value)} data-testid="assessor-select">
                      <option value="">— เลือก —</option>
                      {assessors.filter(isActiveUser).map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                    </NativeSelect>
                  </div>
                  <Button type="button" variant="outline" className="mt-5" disabled={!assessorId} data-testid="assessor-add"
                    onClick={() => run(() => assignAssessor(user, id, assessorId), 'มอบหมายกรรมการแล้ว')}>มอบหมายเข้ารอบนี้</Button>
                  <p className="aq-help mt-3">กรรมการที่ได้รับมอบหมายแล้ว: {assignedAssessors.map(a => a.fullName).join(', ') || 'ยังไม่มี'}</p>
                </section>
              )}
            </div>
          )}

          <section className={cn(CARD, 'mb-6 space-y-3')} aria-label="สรุปการมอบหมาย">
            <ProgressBar value={owned} max={sections.length || 53} label={`มอบหมายแล้ว ${owned}/${sections.length} ข้อ`} className="max-w-xl" />
            {unowned > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2 text-foreground" data-testid="assign-unowned">
                  <Icon name="alert-triangle" size={20} className={cn('shrink-0', TONE_TEXT.warn)} />
                  {`ต้องมอบหมายผู้เขียน ${unowned} ข้อ (ยังไม่อนุมัติและยังไม่มีเจ้าของ)`}
                </span>
                {canAssign && (
                  <Button type="button" variant="outline" size="compact" onClick={() => gotoNextUnowned(sections)}>
                    ไปข้อถัดไปที่ยังไม่มีเจ้าของ<Icon name="chevron-down" size={20} />
                  </Button>
                )}
              </div>
            )}
            {unownedApproved > 0 && (
              <p className="aq-help">{`อีก ${unownedApproved} ข้ออนุมัติแล้วโดยยังไม่มีเจ้าของ — ไม่ต้องมอบหมาย`}</p>
            )}
          </section>

          <div className="space-y-4">
            {listCriteria().map(c => {
              const reqs = listRequirements(c.no);
              const b = bulk[c.no] || { owner: '', due: '' };
              const secs = reqs.map(r => sections.find(x => x.requirementId === r.id)).filter(Boolean);
              const done = secs.filter(s => s!.ownerUserId).length;
              return (
                <details key={c.no} className="group/crit overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none" open>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-accent/60 md:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <span className="text-lg font-semibold text-foreground" id={`as-${c.no}`}>{`เกณฑ์ ${c.no}: ${c.nameTh}`}</span>
                      <ProgressBar value={done} max={secs.length || 1} label={`มอบหมาย ${done}/${secs.length}`} className="w-full shrink-0 md:w-48" />
                    </span>
                    <Icon name="chevron-down" size={20} className="shrink-0 text-muted-foreground transition-transform duration-fast group-open/crit:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t p-5 md:p-6">
                    {canAssign && (
                      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="min-w-[12rem] flex-1 space-y-1.5">
                          <label htmlFor={`bo-${c.no}`} className={LABEL}>ทั้งเกณฑ์ — เจ้าของ</label>
                          <NativeSelect id={`bo-${c.no}`} value={b.owner} data-testid={`bulk-owner-${c.no}`}
                            onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, owner: e.target.value } }))}>
                            <option value="">— ไม่ระบุ —</option>
                            {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                          </NativeSelect>
                        </div>
                        <div className="min-w-[10rem] space-y-1.5 max-sm:flex-1">
                          <label htmlFor={`bd-${c.no}`} className={LABEL}>กำหนดส่ง</label>
                          <Input id={`bd-${c.no}`} type="date" value={b.due} data-testid={`bulk-due-${c.no}`}
                            onChange={e => setBulk(s => ({ ...s, [c.no]: { ...b, due: e.target.value } }))} />
                        </div>
                        <Button type="button" className="max-sm:w-full" data-testid={`bulk-apply-${c.no}`}
                          onClick={() => run(() => assignCriterion(user, id, c.no, b.owner || null, b.due || undefined), `มอบหมายเกณฑ์ ${c.no} แล้ว`)}>
                          มอบหมายทั้งเกณฑ์
                        </Button>
                      </div>
                    )}
                    <Table aria-labelledby={`as-${c.no}`} className={STACK_TABLE}>
                      <TableHeader className={STACK_HEAD}>
                        <tr><TableHead>ข้อ</TableHead><TableHead>สถานะ</TableHead><TableHead>เจ้าของ</TableHead><TableHead>กำหนดส่ง</TableHead></tr>
                      </TableHeader>
                      <TableBody className={STACK_BODY}>
                        {reqs.map(r => {
                          const s = sections.find(x => x.requirementId === r.id);
                          if (!s) return null;
                          const st = rowState[r.id];
                          const ownerName = s.ownerUserId ? names.get(s.ownerUserId) : undefined;
                          return (
                            <TableRow key={r.id} className={cn(STACK_ROW, st?.kind === 'saved' && 'animate-highlight')}>
                              <TableCell data-label="ข้อ" className={cn('min-w-[14rem]', STACK_CELL)}>
                                <Link className={CODE_LINK} href={`/app/sections/${encodeURIComponent(s.id)}`}><strong className="font-semibold">{r.id}</strong></Link>
                                <p className="line-clamp-2 text-muted-foreground">{r.textTh}</p>
                              </TableCell>
                              <TableCell data-label="สถานะ" className={STACK_CELL}><SectionStatusBadge status={s.status} /></TableCell>
                              <TableCell data-label="เจ้าของ" className={cn('md:min-w-[13rem]', STACK_CELL)}>
                                <div className="space-y-1">
                                  <NativeSelect disabled={!canAssign} value={s.ownerUserId || ''} aria-label={`เจ้าของข้อ ${r.id}`}
                                    data-testid={`owner-${r.id}`} aria-invalid={st?.kind === 'error' && st.field === 'owner' ? true : undefined}
                                    onChange={e => runRow(r.id, 'owner', () => assignSections(user, id, [r.id], e.target.value || null, s.due), `มอบหมายข้อ ${r.id} แล้ว`)}>
                                    <option value="">— ไม่ระบุ —</option>
                                    {assignable.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                    {s.ownerUserId && !assignable.some(u => u.id === s.ownerUserId) && (
                                      <option value={s.ownerUserId}>{ownerName ? `${ownerName} (มอบหมายไว้เดิม)` : '(มอบหมายไว้เดิม)'}</option>
                                    )}
                                  </NativeSelect>
                                  {st?.field === 'owner' && st.kind === 'saved' && <span className={SAVED} role="status"><Icon name="check" size={16} />บันทึกแล้ว</span>}
                                  {st?.field === 'owner' && st.kind === 'error' && <span className={FIELD_ERR}><Icon name="x-circle" size={16} className="shrink-0" /><span className="sr-only">ข้อผิดพลาด:</span>{st.msg}</span>}
                                </div>
                              </TableCell>
                              <TableCell data-label="กำหนดส่ง" className={cn('md:min-w-[11rem]', STACK_CELL)}>
                                <div className="space-y-1">
                                  <Input type="date" disabled={!canAssign} value={s.due || ''} aria-label={`กำหนดส่งข้อ ${r.id}`}
                                    data-testid={`due-${r.id}`} aria-invalid={st?.kind === 'error' && st.field === 'due' ? true : undefined}
                                    onChange={e => runRow(r.id, 'due', () => assignSections(user, id, [r.id], s.ownerUserId || null, e.target.value || undefined), `บันทึกกำหนดส่งข้อ ${r.id} แล้ว`)} />
                                  {st?.field === 'due' && st.kind === 'saved' && <span className={SAVED} role="status"><Icon name="check" size={16} />บันทึกแล้ว</span>}
                                  {st?.field === 'due' && st.kind === 'error' && <span className={FIELD_ERR}><Icon name="x-circle" size={16} className="shrink-0" /><span className="sr-only">ข้อผิดพลาด:</span>{st.msg}</span>}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      );
    }}</Async>
  );
}
