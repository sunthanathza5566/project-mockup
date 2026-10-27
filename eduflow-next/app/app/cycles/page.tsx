'use client';

/**
 * รายการรอบประเมิน + สร้างรอบใหม่ (saas-spec §P6 + friendly-spec §F13)
 * - PageHeader + ปุ่ม `cycle-new` (default) · ฟอร์มสร้างเป็นการ์ด rounded-xl
 * - ตาราง `cycles-table` (§C5): ปี | หลักสูตร | สถานะ | ความคืบหน้า (bar อนุมัติ n/53 กว้าง w-24+) | ขั้นถัดไปโดย | เปิด
 *   มือถือ <768 แต่ละแถวเป็นการ์ดย่อย ป้ายคอลัมน์จาก data-label
 * - presentation only (R2-F3): logic/testid/ข้อความเดิมทุกตัว
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { can, createCycle, getProgramme, getProgrammes, isAssessorOf, listCycles, listSections, programmeScope } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Async, CycleStatusBadge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { errMsg, fmtDate } from '@/lib/ui/aunqa';
import { NEXT_ACTOR_TH } from '@/lib/ui/status';
import { notifyTodosChanged } from '@/lib/ui/todo';

/** §C5 ตาราง → การ์ด เมื่อกรอบตาราง (container `tbl`) ≤ 54rem — container query หน่วย rem ขยายตามขนาดตัวอักษร (R2-F14; min-content ≈ 51.6rem) · class literal ให้ JIT สแกนเจอ */
const STACK_TABLE = '[@container_tbl_(max-width:54rem)]:block';
const STACK_HEAD = '[@container_tbl_(max-width:54rem)]:sr-only';
const STACK_BODY = '[@container_tbl_(max-width:54rem)]:block';
const STACK_ROW = '[@container_tbl_(max-width:54rem)]:block [@container_tbl_(max-width:54rem)]:p-4';
const STACK_CELL = '[@container_tbl_(max-width:54rem)]:block [@container_tbl_(max-width:54rem)]:px-0 [@container_tbl_(max-width:54rem)]:py-1 [@container_tbl_(max-width:54rem)]:before:block [@container_tbl_(max-width:54rem)]:before:text-sm [@container_tbl_(max-width:54rem)]:before:font-medium [@container_tbl_(max-width:54rem)]:before:text-muted-foreground [@container_tbl_(max-width:54rem)]:before:content-[attr(data-label)]';
const STACK_ACTIONS = '[@container_tbl_(max-width:54rem)]:block [@container_tbl_(max-width:54rem)]:px-0 [@container_tbl_(max-width:54rem)]:pb-0 [@container_tbl_(max-width:54rem)]:pt-3';
const LABEL = 'block text-base font-medium text-foreground';

export default function CyclesPage() {
  const user = useMe();
  const router = useRouter();
  const { showToast } = useToast();
  const q = useLoad(() => {
    const cycles = listCycles(user);
    return {
      cycles,
      approved: new Map(cycles.map(c => [c.id, listSections(user, c.id).filter(s => s.status === 'approved').length])),
      creatable: getProgrammes(user.universityId).filter(p => can(user, 'cycle.create', programmeScope(p.id))),
    };
  }, [user.id]);

  const [open, setOpen] = useState(false);
  const [programmeId, setProgrammeId] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear() + 543));
  const [due, setDue] = useState('');
  const [assess, setAssess] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent, creatable: { id: string }[]) {
    e.preventDefault();
    const pid = programmeId || creatable[0]?.id;
    if (!pid) return;
    setBusy(true);
    try {
      const c = createCycle(user, {
        programmeId: pid, academicYear: Number(year),
        submissionDue: due || undefined, assessmentDate: assess || undefined,
        copyFromCycleId: copyFrom || undefined,
      });
      showToast(`สร้างรอบ ${c.academicYear} แล้ว — มี 53 ข้อพร้อมให้มอบหมาย`, 'success');
      notifyTodosChanged();
      router.push(`/app/cycles/${c.id}`);
    } catch (err) {
      showToast(errMsg(err), 'error');
    } finally { setBusy(false); }
  }

  return (
    <Async q={q} skeleton="table">{({ cycles, approved, creatable }) => (
      <>
        <PageHeader
          title="รอบประเมิน"
          sub="รอบประเมินแต่ละปีของแต่ละหลักสูตร — เปิดดูแดชบอร์ดความพร้อมได้ที่นี่"
          actions={creatable.length > 0 && !open ? (
            <Button type="button" onClick={() => setOpen(true)} data-testid="cycle-new">
              <Icon name="plus" size={20} />สร้างรอบใหม่
            </Button>
          ) : undefined}
        />

        {creatable.length > 0 && open && (
          <form
            onSubmit={e => submit(e, creatable)}
            className="mb-8 animate-fade-in rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6"
            data-testid="cycle-form" aria-labelledby="cy-form-h"
          >
            <div className="mb-5 space-y-1">
              <h2 id="cy-form-h" className="text-xl font-semibold text-foreground">สร้างรอบประเมินใหม่</h2>
              <p className="aq-help">ระบบจะสร้างครบ 53 ข้อให้อัตโนมัติ</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="cy-prog" className={LABEL}>หลักสูตร</label>
                <NativeSelect id="cy-prog" value={programmeId || creatable[0].id} onChange={e => { setProgrammeId(e.target.value); setCopyFrom(''); }} data-testid="cycle-programme">
                  {creatable.map(p => { const pr = getProgramme(p.id); return <option key={p.id} value={p.id}>{pr?.code} — {pr?.nameTh}</option>; })}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cy-year" className={LABEL}>ปีการศึกษา (พ.ศ.) *</label>
                <Input id="cy-year" type="number" min={2500} max={2700} required aria-required="true" value={year} onChange={e => setYear(e.target.value)} data-testid="cycle-year" className="tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cy-due" className={LABEL}>กำหนดส่ง SAR</label>
                <Input id="cy-due" type="date" value={due} onChange={e => setDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cy-asm" className={LABEL}>วันประเมิน (ถ้าทราบ)</label>
                <Input id="cy-asm" type="date" value={assess} onChange={e => setAssess(e.target.value)} />
              </div>
              {cycles.some(c => c.programmeId === (programmeId || creatable[0].id)) && (
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="cy-copy" className={LABEL}>คัดลอกร่างและลิงก์หลักฐานจากรอบก่อน</label>
                  <p className="aq-help" id="cy-copy-help">ไม่ต้องคัดลอกไฟล์</p>
                  <NativeSelect id="cy-copy" value={copyFrom} onChange={e => setCopyFrom(e.target.value)} aria-describedby="cy-copy-help" wrapperClassName="md:max-w-sm">
                    <option value="">ไม่คัดลอก</option>
                    {cycles.filter(c => c.programmeId === (programmeId || creatable[0].id)).map(c => <option key={c.id} value={c.id}>ปี {c.academicYear}</option>)}
                  </NativeSelect>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-5">
              <Button type="submit" disabled={busy} aria-busy={busy || undefined} data-testid="cycle-submit">
                {busy ? <><Icon name="loader" size={16} className="animate-spin" />กำลังสร้าง…</> : 'สร้างรอบ'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
            </div>
          </form>
        )}

        {cycles.length === 0 ? (
          <Empty icon="calendar-cycle" title="ยังไม่มีรอบประเมินที่คุณเข้าถึงได้" />
        ) : (
          <Table data-testid="cycles-table" className={STACK_TABLE} wrapperClassName="[container-type:inline-size] [container-name:tbl] rounded-xl shadow-sm dark:shadow-none">
            <TableHeader className={STACK_HEAD}>
              <tr>
                <TableHead>ปี</TableHead><TableHead>หลักสูตร</TableHead><TableHead>สถานะ</TableHead>
                <TableHead>ความคืบหน้า</TableHead><TableHead>ขั้นถัดไปโดย</TableHead><TableHead><span className="sr-only">เปิด</span></TableHead>
              </tr>
            </TableHeader>
            <TableBody className={STACK_BODY}>
              {cycles.map(c => {
                const a = approved.get(c.id) ?? 0;
                return (
                  <TableRow key={c.id} className={STACK_ROW}>
                    <TableCell data-label="ปี" className={STACK_CELL}>
                      <strong className="text-lg font-semibold tabular-nums text-foreground">{c.academicYear}</strong>
                      {c.revision > 1 && <div className="aq-meta">revision {c.revision}</div>}
                    </TableCell>
                    <TableCell data-label="หลักสูตร" className={`[@container_tbl_(min-width:54.01rem)]:min-w-[14rem] ${STACK_CELL}`}>
                      <div className="font-medium text-foreground">{getProgramme(c.programmeId)?.nameTh}</div>
                      <div className="aq-meta">กำหนดส่ง {fmtDate(c.submissionDue)}</div>
                    </TableCell>
                    <TableCell data-label="สถานะ" className={STACK_CELL}><CycleStatusBadge status={c.status} /></TableCell>
                    <TableCell data-label="ความคืบหน้า" className={STACK_CELL}>
                      <ProgressBar value={a} max={53} label={`อนุมัติ ${a}/53`} className="w-full min-w-24 [@container_tbl_(min-width:54.01rem)]:w-32" />
                    </TableCell>
                    <TableCell data-label="ขั้นถัดไปโดย" className={STACK_CELL}>{NEXT_ACTOR_TH[c.status]}</TableCell>
                    <TableCell className={STACK_ACTIONS}>
                      <div className="flex flex-wrap items-center gap-2 [@container_tbl_(min-width:54.01rem)]:justify-end">
                        <Button asChild variant="outline" size="compact">
                          <Link href={`/app/cycles/${c.id}`}>เปิด<Icon name="chevron-right" size={20} /></Link>
                        </Button>
                        {(isAssessorOf(user, c.id) || c.status === 'assessed' || c.status === 'closed') && (
                          <Button asChild variant="ghost" size="compact">
                            <Link href={`/app/cycles/${c.id}/assess`} data-testid={`assess-link-${c.id}`}>ผลประเมิน</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </>
    )}</Async>
  );
}
