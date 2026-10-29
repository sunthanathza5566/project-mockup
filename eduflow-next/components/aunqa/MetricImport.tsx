'use client';

/**
 * นำเข้าตัวชี้วัดจาก Excel (ADR-UI-001 pages.md P13 · saas-spec §P13/§C2 `<details>` · friendly-spec §F13) — preview ก่อนยืนยันเสมอ
 * - `<details>` + `<summary>` ปิดเป็นค่าเริ่มต้น (E2E-14 คลิก summary) · การ์ด rounded-xl หัวมีไอคอนในกล่อง primary-muted
 * - C-7: ผู้เรียกใส่ `key={programmeId}` (เปลี่ยนหลักสูตร = state รีเซ็ต) · `reqSeq` ทิ้งผล dryRun ที่ไม่ใช่คำขอล่าสุด
 *        · ช่องจำนวนปี debounce 300ms ก่อนตรวจใหม่
 * - สำเร็จ: กล่อง success ในแผง (metric-import-done / cohort-import-done) + เช็กวาด L6 + toast
 * - cohort-{year}: td 7 ช่อง ค่าดิบเดิม (ห้ามจัดรูปแบบ — E2E-14)
 * - ปุ่มเลือกไฟล์ = `<label>` หน้าตาปุ่ม (buttonVariants) ห่อ input file `sr-only` → focus ของ input แสดงเป็น outline ที่ label
 */
import { useEffect, useRef, useState } from 'react';
import {
  buildCohortTemplate, buildMetricTemplate, commitMetricImport, downloadBlob, importCohortFile, previewMetricImport,
} from '@/lib/api';
import type { CohortImportResult, MetricPreview } from '@/lib/api';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import Icon from '@/components/ui/Icon';
import { StepCheck } from '@/components/ui/Stepper';
import { Button, buttonVariants } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { MSG_TONE } from '@/lib/ui/tone';
import { AsyncButton, Badge, InlineMessage } from './common';
import { errMsg } from '@/lib/ui/aunqa';

/** label ที่หน้าตาเป็นปุ่มหลัก (เลือกไฟล์) — outline โฟกัสตาม input ข้างใน (saas-tokens §T11) */
const FILE_BTN = cn(
  buttonVariants({ variant: 'default', size: 'compact' }),
  'relative cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
);
/** รายการคำเตือน (สี + ไอคอน) */
const WARN_LIST = 'm-0 list-none space-y-1 p-0';

export default function MetricImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  return (
    <details className="group mb-8 overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none" data-testid="import-panel">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-4 p-5 transition-colors duration-fast hover:bg-accent md:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary" aria-hidden="true">
          <Icon name="upload" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-foreground">นำเข้าจากไฟล์ Excel</span>
          <span className="aq-help block">แนะนำเมื่อมีข้อมูลหลายปี: ดาวน์โหลดแม่แบบ กรอก แล้วอัปโหลด</span>
        </span>
        <Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
      </summary>
      <div className="space-y-6 border-t p-5 md:p-6">
        <InlineMessage tone="info" testId="import-privacy" icon="shield-user">
          ระบบอ่านไฟล์ในเบราว์เซอร์ของคุณและเก็บเฉพาะ <strong>ค่าสรุป</strong> (ตัวชี้วัดรายปี / อัตราต่อรุ่น) เท่านั้น
          ไฟล์ต้นฉบับและข้อมูลรายคนไม่ถูกเก็บไว้ในระบบ
        </InlineMessage>
        <div className="grid gap-6 xl:grid-cols-2">
          <MetricFileImport user={user} programmeId={programmeId} onDone={onDone} />
          <CohortFileImport user={user} programmeId={programmeId} onDone={onDone} />
        </div>
      </div>
    </details>
  );
}

function Done({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4 text-foreground', MSG_TONE.success.box)} role="status" data-testid={testId}>
      <span className={cn('mt-0.5', MSG_TONE.success.icon)}><StepCheck drawn /></span>
      <p className="m-0 min-w-0 flex-1 text-base">{children}</p>
    </div>
  );
}

/** หัวส่วนย่อย: หัวข้อ + คำอธิบาย */
function PartHead({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 id={id} className="m-0 text-lg font-semibold text-foreground">{title}</h3>
      <p className="aq-help m-0">{children}</p>
    </div>
  );
}

function WarnItems({ items, testId }: { items: string[]; testId?: string }) {
  return (
    <ul className={WARN_LIST} data-testid={testId}>
      {items.map((w, i) => (
        <li key={i} className="flex gap-2 text-foreground">
          <Icon name="alert-triangle" size={16} className="mt-1 text-warning" />
          <span className="min-w-0">{w}</span>
        </li>
      ))}
    </ul>
  );
}

const PART = 'min-w-0 space-y-4 rounded-xl border bg-background/60 p-4 md:p-5';

// ───────────────────────── ตัวชี้วัดรายปี ─────────────────────────

function MetricFileImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prev, setPrev] = useState<MetricPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const seq = useRef(0);

  async function onFile(f: File | undefined) {
    if (!f) return;
    const my = ++seq.current;
    setBusy(true); setErr(''); setPrev(null); setDone('');
    try { const p = await previewMetricImport(user, programmeId, f); if (my === seq.current) setPrev(p); }
    catch (e) { if (my === seq.current) setErr(errMsg(e)); }
    finally { if (my === seq.current) setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  function confirmImport() {
    if (!prev) return;
    try {
      const r = commitMetricImport(user, prev.previewId);
      const msg = `นำเข้าแล้ว: เพิ่ม ${r.inserted} · แทนที่ ${r.updated} · ข้าม ${r.skipped} แถว`;
      showToast(msg, 'success'); setDone(msg);
      setPrev(null); onDone();
    } catch (e) { setErr(errMsg(e)); }
  }

  return (
    <section className={PART} aria-labelledby="imp-m-h" data-testid="import-metric">
      <PartHead id="imp-m-h" title="ตัวชี้วัดรายปี">กรอกตามแม่แบบ (1 แถว = ตัวชี้วัด 1 ปี) แล้วอัปโหลดเพื่อตรวจก่อนนำเข้า</PartHead>
      <div className="flex flex-wrap gap-2">
        <AsyncButton variant="outline" size="compact" testId="metric-template" busyText="กำลังสร้างไฟล์…" onClick={async () => downloadBlob(await buildMetricTemplate(), 'metrics-template.xlsx')}>
          <Icon name="download" size={20} />ดาวน์โหลดแม่แบบ (.xlsx)
        </AsyncButton>
        <label className={cn(FILE_BTN, busy && 'cursor-wait')} aria-busy={busy || undefined}>
          {busy ? <><Icon name="loader" size={20} className="animate-spin" />กำลังตรวจไฟล์…</> : <><Icon name="upload" size={20} />เลือกไฟล์ที่กรอกแล้ว</>}
          <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" disabled={busy} data-testid="metric-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <InlineMessage tone="danger" testId="metric-import-error">{err}</InlineMessage>}
      {done && <Done testId="metric-import-done">{done}</Done>}
      {prev && (
        <div className="space-y-3" data-testid="metric-preview">
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok" testId="metric-ok-count">{`ผ่าน ${prev.okCount} แถว`}</Badge>
            <Badge tone={prev.errorCount ? 'bad' : 'neutral'} testId="metric-err-count">{`ไม่ผ่าน ${prev.errorCount} แถว`}</Badge>
          </div>
          {prev.warnings.length > 0 && <WarnItems items={prev.warnings} testId="metric-warnings" />}
          <Table data-testid="metric-preview-table" wrapperClassName="max-h-[24rem] overflow-y-auto">
            <TableHeader>
              <tr><TableHead>แถว</TableHead><TableHead>ตัวชี้วัด</TableHead><TableHead>ปี</TableHead><TableHead className="text-right">ค่า</TableHead><TableHead>ผลตรวจ</TableHead></tr>
            </TableHeader>
            <TableBody>
              {prev.rows.map(r => (
                <TableRow key={r.rowNo} className={r.ok ? undefined : 'bg-destructive-muted hover:bg-destructive-muted'} data-testid={`prev-row-${r.rowNo}`} data-ok={r.ok}>
                  <TableCell className="tabular-nums">{r.rowNo}</TableCell>
                  <TableCell>{r.code || '—'}</TableCell>
                  <TableCell className="tabular-nums">{r.period ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.value ?? '—'}</TableCell>
                  <TableCell className="min-w-[12rem]">
                    {r.ok
                      ? <><Badge tone="ok">ผ่าน</Badge>{r.existingValue !== undefined && <span className="aq-meta">{` แทนที่ค่าเดิม ${r.existingValue}`}</span>}</>
                      : <><Badge tone="bad">ไม่ผ่าน</Badge> {r.errors.join(' · ')}</>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {prev.errorCount > 0 && (
            <InlineMessage tone="warn">{`มี ${prev.errorCount} แถวไม่ผ่าน จะถูกข้าม — แก้ไฟล์แล้วอัปโหลดใหม่ได้`}</InlineMessage>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={prev.okCount === 0} onClick={confirmImport} data-testid="metric-commit">
              {prev.errorCount > 0 ? `ยืนยันนำเข้าเฉพาะ ${prev.okCount} แถวที่ผ่าน` : `ยืนยันนำเข้า ${prev.okCount} แถวที่ผ่าน`}
            </Button>
            <Button variant="ghost" onClick={() => setPrev(null)} data-testid="metric-cancel">ยกเลิก</Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── รุ่นนักศึกษา (cohort) ─────────────────────────

function CohortFileImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [years, setYears] = useState('4');
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<CohortImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const reqSeq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const std = Math.max(1, Math.min(10, Math.floor(Number(years)) || 4));
  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  /** C-7: เฉพาะคำขอล่าสุดเท่านั้นที่ตั้งผล/ข้อผิดพลาด */
  async function check(f: File, standardYears = std) {
    const my = ++reqSeq.current;
    setBusy(true); setErr(''); setRes(null); setDone('');
    try {
      const r = await importCohortFile(user, programmeId, f, { standardYears, dryRun: true });
      if (my !== reqSeq.current) return;
      setRes(r);
    } catch (e) {
      if (my !== reqSeq.current) return;
      setErr(errMsg(e));
    } finally {
      if (my === reqSeq.current) setBusy(false);
    }
  }
  async function onFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    await check(f);
    if (inputRef.current) inputRef.current.value = '';
  }
  async function commit() {
    if (!file || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await importCohortFile(user, programmeId, file, { standardYears: std });
      const msg = `นำเข้าผลรวม ${r.cohorts.length} รุ่นแล้ว (เพิ่ม ${r.written.inserted} · แทนที่ ${r.written.updated})`;
      showToast(msg, 'success'); setDone(msg);
      setRes(null); setFile(null); onDone();
    } catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  const rowErrors = res?.rowErrors ?? [];
  const NUM = 'text-right tabular-nums';

  return (
    <section className={PART} aria-labelledby="imp-c-h" data-testid="import-cohort">
      <PartHead id="imp-c-h" title="ผลการศึกษารายรุ่น (cohort)">
        ไฟล์รายคนมีคอลัมน์ cohort, status, years_to_graduate — ระบบคำนวณอัตราสำเร็จการศึกษา อัตราพ้นสภาพ และเวลาเฉลี่ยต่อรุ่น
        โดยไม่อ่านชื่อ/รหัสนักศึกษา
      </PartHead>
      <div className="grid max-w-[16rem] gap-1.5">
        <label htmlFor="cohort-years" className="font-medium text-foreground">เวลาเรียนตามหลักสูตร (ปี)</label>
        <Input id="cohort-years" type="number" min={1} max={10} value={years}
          onChange={e => {
            const v = e.target.value;
            setYears(v);
            if (debounce.current) clearTimeout(debounce.current);
            if (file) debounce.current = setTimeout(() => check(file, Math.max(1, Math.min(10, Math.floor(Number(v)) || 4))), 300);
          }} data-testid="cohort-years" />
      </div>
      <div className="flex flex-wrap gap-2">
        <AsyncButton variant="outline" size="compact" testId="cohort-template" busyText="กำลังสร้างไฟล์…" onClick={async () => downloadBlob(await buildCohortTemplate(), 'cohort-template.xlsx')}>
          <Icon name="download" size={20} />ดาวน์โหลดแม่แบบ (.xlsx)
        </AsyncButton>
        <label className={cn(FILE_BTN, busy && 'cursor-wait')} aria-busy={busy || undefined}>
          {busy ? <><Icon name="loader" size={20} className="animate-spin" />กำลังตรวจไฟล์…</> : <><Icon name="upload" size={20} />เลือกไฟล์รายคน</>}
          <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" disabled={busy} data-testid="cohort-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <InlineMessage tone="danger" testId="cohort-import-error">{err}</InlineMessage>}
      {done && <Done testId="cohort-import-done">{done}</Done>}
      {res && (
        <div className="space-y-3" data-testid="cohort-preview">
          <div className="flex flex-wrap gap-2">
            <Badge>{`อ่าน ${res.rowsRead} แถว`}</Badge>
            <Badge tone={rowErrors.length ? 'bad' : 'ok'} testId="cohort-err-count">{rowErrors.length ? `แถวไม่ผ่าน ${rowErrors.length}` : 'ทุกแถวผ่าน'}</Badge>
          </div>
          {rowErrors.length > 0 && (
            <InlineMessage tone="danger" testId="cohort-row-errors" title="มีแถวไม่ผ่าน จึงยังนำเข้าไม่ได้ (เพื่อไม่ให้อัตราคลาดเคลื่อนโดยไม่รู้ตัว) — แก้ไฟล์แล้วอัปโหลดใหม่">
              <ul className="m-0 list-disc space-y-0.5 pl-5">
                {rowErrors.slice(0, 20).map(r => <li key={r.rowNo}>{`แถว ${r.rowNo}: ${r.reason}`}</li>)}
                {rowErrors.length > 20 && <li>{`… และอีก ${rowErrors.length - 20} แถว`}</li>}
              </ul>
            </InlineMessage>
          )}
          {res.warnings.length > 0 && <WarnItems items={res.warnings} testId="cohort-warnings" />}
          {res.cohorts.length > 0 && (
            <Table data-testid="cohort-table">
              <TableHeader>
                <tr>
                  <TableHead>รุ่น</TableHead><TableHead className="text-right">จำนวน</TableHead><TableHead className="text-right">จบตามเวลา</TableHead>
                  <TableHead className="text-right">พ้นสภาพ</TableHead><TableHead className="text-right">% จบ</TableHead><TableHead className="text-right">% พ้นสภาพ</TableHead>
                  <TableHead className="text-right">เวลาจบเฉลี่ย (ปี)</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {res.cohorts.map(c => (
                  <TableRow key={c.cohort} data-testid={`cohort-${c.cohort}`}>
                    <TableCell className="font-medium tabular-nums">{c.cohort}</TableCell><TableCell className={NUM}>{c.total}</TableCell>
                    <TableCell className={NUM}>{c.graduatedOnTime}</TableCell><TableCell className={NUM}>{c.droppedOut}</TableCell>
                    <TableCell className={NUM}>{c.passRate}</TableCell><TableCell className={NUM}>{c.dropoutRate}</TableCell>
                    <TableCell className={NUM}>{c.timeToGraduate ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || rowErrors.length > 0 || res.cohorts.length === 0} onClick={commit} data-testid="cohort-commit">
              {`ยืนยันนำเข้าผลรวม ${res.cohorts.length} รุ่น`}
            </Button>
            <Button variant="ghost" onClick={() => { reqSeq.current++; setRes(null); setFile(null); setBusy(false); }} data-testid="cohort-cancel">ยกเลิก</Button>
          </div>
        </div>
      )}
    </section>
  );
}
