'use client';

/**
 * ตัวชี้วัด (ADR-UI-001 pages.md P13 · saas-spec §P13 · friendly-spec §F13)
 * toolbar หลักสูตร · [+ เพิ่ม/แก้ค่าตัวชี้วัด] · แผงนำเข้า (เด่น อยู่เหนือกราฟ/ตาราง; C-7 key={programmeId})
 * แนวโน้ม 3–5 ปี (การ์ดต่อ metric) · metric-table จัดกลุ่มตามตัวชี้วัด (แถวหัวกลุ่ม: รหัส + ชื่อ + หน่วย) แล้วแถวปี
 * มือถือ <768: ตารางเป็นการ์ดย่อยต่อแถว (saas-spec §C5) — คอลัมน์/ลำดับเดิม
 */
import { Fragment, useState } from 'react';
import {
  can, deleteMetric, getMetricDefinition, listMetricDefinitions, listMetrics, programmeScope, upsertMetric,
} from '@/lib/api';
import type { AppUser, MetricValue } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, Empty, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import TrendChart from '@/components/aunqa/TrendChart';
import { useLang } from '@/context/LangContext';
import MetricImport from '@/components/aunqa/MetricImport';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { errMsg } from '@/lib/ui/aunqa';

const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
/** saas-spec §C5 มือถือ: แถวเป็นการ์ดย่อย + ป้ายคอลัมน์จาก data-label */
const STACK_TD =
  'max-md:block max-md:px-0 max-md:py-1 max-md:before:block max-md:before:text-sm max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';
const NUM = 'text-right tabular-nums max-md:text-left';

export default function MetricsPage() {
  const { user, programmes, programmeId, setProgrammeId } = useScope();
  const { showToast } = useToast();
  const { lang } = useLang();
  const defs = listMetricDefinitions();
  const canWrite = !!programmeId && can(user, 'metric.write', programmeScope(programmeId));

  const q = useLoad(() => (programmeId ? listMetrics(user, programmeId) : []), [user.id, programmeId]);

  return (
    <>
      <PageHeader title="ตัวชี้วัด" sub={<>ข้อมูลตัวเลขที่ใช้ตรวจแนวโน้มและ <Term k="benchmark">benchmark</Term> (เช่น ผลลัพธ์ผู้สำเร็จการศึกษา เกณฑ์ที่ 8) — ระบบตรวจช่องว่างจากข้อมูลนี้</>} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[20rem]" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="m-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </NativeSelect>
      </div>

      {canWrite && <AddForm key={`add-${programmeId}`} user={user} programmeId={programmeId} onDone={q.reload} />}
      {/* C-7: เปลี่ยนหลักสูตร = แผงนำเข้าเริ่มใหม่ทั้งหมด (ล้าง preview/ไฟล์ cohort ของหลักสูตรเดิม) */}
      {canWrite && <MetricImport key={programmeId} user={user} programmeId={programmeId} onDone={q.reload} />}

      <Async q={q} skeleton="table">{rows => rows.length === 0 ? (
        <Empty icon="chart-line" title="ยังไม่มีข้อมูลตัวชี้วัด" text={canWrite ? 'เพิ่มค่าทีละปี หรือนำเข้าจากไฟล์ Excel ด้านบน' : undefined} />
      ) : (
        <>
          <section className="mb-8" aria-labelledby="trend-h" data-testid="trend-section">
            <h2 id="trend-h" className="m-0 mb-3 text-xl font-semibold text-foreground">แนวโน้ม 3–5 ปี</h2>
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {Array.from(new Set(rows.map(r => r.code))).map(code => {
                const d = getMetricDefinition(code);
                return <TrendChart key={code} code={code} name={lang === 'en' ? d?.nameEn || d?.nameTh : d?.nameTh} unit={d?.unit} rows={rows.filter(r => r.code === code)} />;
              })}
            </div>
          </section>
          <section className="mb-6" aria-labelledby="mt-h">
            <h2 id="mt-h" className="m-0 mb-3 text-xl font-semibold text-foreground">ค่าตัวชี้วัดรายปี</h2>
            <Table data-testid="metric-table" className="max-md:block" wrapperClassName="rounded-xl shadow-sm dark:shadow-none">
              <TableHeader className="max-md:sr-only">
                <tr>
                  <TableHead>ปี</TableHead><TableHead className="text-right">ค่า</TableHead><TableHead className="text-right">เป้าหมาย</TableHead>
                  <TableHead className="text-right">benchmark</TableHead><TableHead>แหล่ง benchmark</TableHead>
                  {canWrite && <TableHead><span className="sr-only">การกระทำ</span></TableHead>}
                </tr>
              </TableHeader>
              <TableBody className="max-md:block">
                {Array.from(new Set(rows.map(r => r.code))).map(code => {
                  const d = getMetricDefinition(code);
                  return (
                    <Fragment key={code}>
                      <tr className="border-t bg-muted/60 max-md:block">
                        <th colSpan={canWrite ? 6 : 5} scope="colgroup" className="px-4 py-3 text-left text-base font-semibold text-foreground max-md:block">
                          {code} — {d?.nameTh}{d?.unit ? ` (${d.unit})` : ''}
                        </th>
                      </tr>
                      {rows.filter(r => r.code === code).sort((a, b) => a.period - b.period).map(m => (
                        <Row key={m.id + JSON.stringify(m)} m={m} user={user} canWrite={canWrite} onDone={q.reload} toast={showToast} />
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </>
      )}</Async>
      <p className="aq-meta m-0">ตัวชี้วัดที่ระบบรู้จัก: {defs.map(d => d.code).join(', ')}</p>
    </>
  );
}

function Row({ m, user, canWrite, onDone, toast }: {
  m: MetricValue; user: AppUser; canWrite: boolean; onDone: () => void; toast: (s: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const { confirm } = useDialog();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState({ value: String(m.value), target: m.targetValue?.toString() ?? '', bench: m.benchmarkValue?.toString() ?? '', src: m.benchmarkSource ?? '' });

  function save() {
    try {
      upsertMetric(user, { programmeId: m.programmeId, code: m.code, period: m.period, value: Number(v.value), targetValue: num(v.target), benchmarkValue: num(v.bench), benchmarkSource: v.src || undefined });
      toast('บันทึกแล้ว', 'success'); setEdit(false); onDone();
    } catch (e) { toast(errMsg(e), 'error'); }
  }
  async function del() {
    if (!(await confirm({ title: 'ลบข้อมูล', message: `ลบ ${m.code} ปี ${m.period}?`, variant: 'danger', confirmText: 'ยืนยันลบ' }))) return;
    try { deleteMetric(user, m.id); toast('ลบแล้ว', 'success'); onDone(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  const cellInput = 'min-w-[6rem] text-right tabular-nums max-md:text-left';
  return (
    <TableRow data-testid={`metric-${m.code}-${m.period}`} className="max-md:block max-md:p-4">
      <TableCell data-label="ปี" className={cn('font-medium tabular-nums', STACK_TD)}>{m.period}</TableCell>
      {edit ? (
        <>
          <TableCell data-label="ค่า" className={STACK_TD}><Input className={cellInput} type="number" step="any" value={v.value} onChange={e => setV({ ...v, value: e.target.value })} aria-label="ค่า" data-testid="metric-edit-value" /></TableCell>
          <TableCell data-label="เป้าหมาย" className={STACK_TD}><Input className={cellInput} type="number" step="any" value={v.target} onChange={e => setV({ ...v, target: e.target.value })} aria-label="เป้าหมาย" /></TableCell>
          <TableCell data-label="benchmark" className={STACK_TD}><Input className={cellInput} type="number" step="any" value={v.bench} onChange={e => setV({ ...v, bench: e.target.value })} aria-label="benchmark" /></TableCell>
          <TableCell data-label="แหล่ง benchmark" className={STACK_TD}><Input className="min-w-[10rem]" value={v.src} onChange={e => setV({ ...v, src: e.target.value })} aria-label="แหล่ง benchmark" /></TableCell>
        </>
      ) : (
        <>
          <TableCell data-label="ค่า" className={cn(NUM, 'font-medium', STACK_TD)}>{m.value}</TableCell>
          <TableCell data-label="เป้าหมาย" className={cn(NUM, STACK_TD)}>{m.targetValue ?? '—'}</TableCell>
          <TableCell data-label="benchmark" className={cn(NUM, STACK_TD)}>{m.benchmarkValue ?? '—'}</TableCell>
          <TableCell data-label="แหล่ง benchmark" className={STACK_TD}>{m.benchmarkSource ?? '—'}</TableCell>
        </>
      )}
      {canWrite && (
        <TableCell className="max-md:block max-md:px-0 max-md:pb-0 max-md:pt-3">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {edit
              ? <><Button size="compact" onClick={save} data-testid="metric-save">บันทึก</Button><Button variant="ghost" size="compact" onClick={() => setEdit(false)}>ยกเลิก</Button></>
              : <><Button variant="outline" size="compact" onClick={() => setEdit(true)} data-testid={`metric-edit-${m.code}-${m.period}`}><Icon name="pencil" size={20} />แก้</Button>
                <Button variant="ghost" size="icon" onClick={del} aria-label={`ลบ ${m.code} ปี ${m.period}`} title="ลบ"><Icon name="trash" size={20} /></Button></>}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

const FIELD = 'grid min-w-0 gap-1.5';
const LABEL = 'font-medium text-foreground';

function AddForm({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  const defs = listMetricDefinitions();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: defs[0]?.code ?? '', period: String(new Date().getFullYear() + 543), value: '', target: '', bench: '', src: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      upsertMetric(user, { programmeId, code: f.code, period: Number(f.period), value: Number(f.value), targetValue: num(f.target), benchmarkValue: num(f.bench), benchmarkSource: f.src || undefined });
      showToast('บันทึกตัวชี้วัดแล้ว', 'success'); setOpen(false); setF({ ...f, value: '', target: '', bench: '', src: '' }); onDone();
    } catch (err) { showToast(errMsg(err), 'error'); }
  }

  if (!open) {
    return (
      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={() => setOpen(true)} data-testid="metric-new"><Icon name="plus" size={20} />เพิ่ม/แก้ค่าตัวชี้วัด</Button>
      </div>
    );
  }
  return (
    <form className={cn(CARD, 'mb-6 grid animate-fade-in gap-5 md:grid-cols-2')} onSubmit={submit} data-testid="metric-form">
      <h2 className="m-0 text-lg font-semibold text-foreground md:col-span-2">เพิ่ม/แก้ค่าตัวชี้วัด</h2>
      <div className={cn(FIELD, 'md:col-span-2')}><label htmlFor="mf-code" className={LABEL}>ตัวชี้วัด</label>
        <NativeSelect id="mf-code" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} data-testid="metric-code">
          {defs.map(d => <option key={d.code} value={d.code}>{d.code} {d.nameTh} ({d.unit})</option>)}
        </NativeSelect></div>
      <div className={FIELD}><label htmlFor="mf-period" className={LABEL}>ปี *</label>
        <Input id="mf-period" type="number" required value={f.period} onChange={e => setF({ ...f, period: e.target.value })} data-testid="metric-period" /></div>
      <div className={FIELD}><label htmlFor="mf-value" className={LABEL}>ค่า *</label>
        <Input id="mf-value" type="number" step="any" required value={f.value} onChange={e => setF({ ...f, value: e.target.value })} data-testid="metric-value" /></div>
      <div className={FIELD}><label htmlFor="mf-target" className={LABEL}>เป้าหมาย</label>
        <Input id="mf-target" type="number" step="any" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} /></div>
      <div className={FIELD}><label htmlFor="mf-bench" className={LABEL}>benchmark</label>
        <Input id="mf-bench" type="number" step="any" value={f.bench} onChange={e => setF({ ...f, bench: e.target.value })} /></div>
      <div className={cn(FIELD, 'md:col-span-2')}><label htmlFor="mf-src" className={LABEL}>แหล่ง benchmark</label>
        <Input id="mf-src" value={f.src} onChange={e => setF({ ...f, src: e.target.value })} /></div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" data-testid="metric-submit">บันทึก</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
      </div>
    </form>
  );
}
