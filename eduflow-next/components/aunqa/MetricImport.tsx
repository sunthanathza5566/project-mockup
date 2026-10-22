'use client';

/**
 * นำเข้าตัวชี้วัดจาก Excel (ADR-UI-001 pages.md P13) — preview ก่อนยืนยันเสมอ
 * - `<details>` + `<summary>` ปิดเป็นค่าเริ่มต้น (E2E-14 คลิก summary) · การ์ดเด่น aq-card--accent
 * - C-7: ผู้เรียกใส่ `key={programmeId}` (เปลี่ยนหลักสูตร = state รีเซ็ต) · `reqSeq` ทิ้งผล dryRun ที่ไม่ใช่คำขอล่าสุด
 *        · ช่องจำนวนปี debounce 300ms ก่อนตรวจใหม่
 * - สำเร็จ: InlineMessage success ในแผง (metric-import-done / cohort-import-done) + เช็กวาด L6 + toast
 * - cohort-{year}: td 7 ช่อง ค่าดิบเดิม (ห้ามจัดรูปแบบ — E2E-14)
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
import { AsyncButton, Badge, InlineMessage } from './common';
import { errMsg } from '@/lib/ui/aunqa';

export default function MetricImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  return (
    <details className="aq-card aq-card--accent aq-collapse aq-import" data-testid="import-panel">
      <summary>
        <Icon name="upload" size={24} />
        <span className="aq-flex-1">
          <span className="aq-h3 aq-import__title">นำเข้าจากไฟล์ Excel</span>
          <span className="aq-help aq-import__sub">แนะนำเมื่อมีข้อมูลหลายปี: ดาวน์โหลดแม่แบบ กรอก แล้วอัปโหลด</span>
        </span>
        <Icon name="chevron-down" size={20} className="aq-collapse__chev" />
      </summary>
      <InlineMessage tone="info" testId="import-privacy" icon="shield-user">
        ระบบอ่านไฟล์ในเบราว์เซอร์ของคุณและเก็บเฉพาะ <strong>ค่าสรุป</strong> (ตัวชี้วัดรายปี / อัตราต่อรุ่น) เท่านั้น
        ไฟล์ต้นฉบับและข้อมูลรายคนไม่ถูกเก็บไว้ในระบบ
      </InlineMessage>
      <div className="aq-grid-2">
        <MetricFileImport user={user} programmeId={programmeId} onDone={onDone} />
        <CohortFileImport user={user} programmeId={programmeId} onDone={onDone} />
      </div>
    </details>
  );
}

function Done({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <div className="aq-msg aq-msg--success" role="status" data-testid={testId}>
      <span className="aq-msg__icon aq-done-check"><StepCheck drawn /></span>
      <div className="aq-msg__body"><p className="aq-msg__text">{children}</p></div>
    </div>
  );
}

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
    <section className="aq-import__part" aria-labelledby="imp-m-h" data-testid="import-metric">
      <h3 id="imp-m-h" className="aq-h3">ตัวชี้วัดรายปี</h3>
      <p className="aq-help">กรอกตามแม่แบบ (1 แถว = ตัวชี้วัด 1 ปี) แล้วอัปโหลดเพื่อตรวจก่อนนำเข้า</p>
      <div className="aq-actions">
        <AsyncButton className="aq-btn aq-btn-compact" testId="metric-template" busyText="กำลังสร้างไฟล์…" onClick={async () => downloadBlob(await buildMetricTemplate(), 'metrics-template.xlsx')}>
          <Icon name="download" size={20} />ดาวน์โหลดแม่แบบ (.xlsx)
        </AsyncButton>
        <label className="aq-btn aq-btn-compact aq-btn-primary aq-file-btn">
          {busy ? <><span className="aq-spinner" aria-hidden="true" />กำลังตรวจไฟล์…</> : <><Icon name="upload" size={20} />เลือกไฟล์ที่กรอกแล้ว</>}
          <input ref={inputRef} type="file" accept=".xlsx" className="aq-sr-only" disabled={busy} data-testid="metric-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <InlineMessage tone="danger" testId="metric-import-error">{err}</InlineMessage>}
      {done && <Done testId="metric-import-done">{done}</Done>}
      {prev && (
        <div data-testid="metric-preview">
          <div className="aq-cluster aq-mt-2">
            <Badge tone="ok" testId="metric-ok-count">{`ผ่าน ${prev.okCount} แถว`}</Badge>
            <Badge tone={prev.errorCount ? 'bad' : 'neutral'} testId="metric-err-count">{`ไม่ผ่าน ${prev.errorCount} แถว`}</Badge>
          </div>
          {prev.warnings.length > 0 && (
            <ul className="aq-warnlist" data-testid="metric-warnings">{prev.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
          <div className="aq-table-wrap aq-preview-wrap">
            <table className="aq-table" data-testid="metric-preview-table">
              <thead><tr><th>แถว</th><th>ตัวชี้วัด</th><th>ปี</th><th className="aq-num">ค่า</th><th>ผลตรวจ</th></tr></thead>
              <tbody>
                {prev.rows.map(r => (
                  <tr key={r.rowNo} className={r.ok ? '' : 'aq-row-bad'} data-testid={`prev-row-${r.rowNo}`} data-ok={r.ok}>
                    <td className="aq-tnum">{r.rowNo}</td>
                    <td>{r.code || '—'}</td>
                    <td className="aq-tnum">{r.period ?? '—'}</td>
                    <td className="aq-num">{r.value ?? '—'}</td>
                    <td>
                      {r.ok
                        ? <><Badge tone="ok">ผ่าน</Badge>{r.existingValue !== undefined && <span className="aq-meta">{` แทนที่ค่าเดิม ${r.existingValue}`}</span>}</>
                        : <><Badge tone="bad">ไม่ผ่าน</Badge> {r.errors.join(' · ')}</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prev.errorCount > 0 && (
            <InlineMessage tone="warn">{`มี ${prev.errorCount} แถวไม่ผ่าน จะถูกข้าม — แก้ไฟล์แล้วอัปโหลดใหม่ได้`}</InlineMessage>
          )}
          <div className="aq-actions aq-mt-2">
            <button type="button" className="aq-btn aq-btn-primary" disabled={prev.okCount === 0} onClick={confirmImport} data-testid="metric-commit">
              {prev.errorCount > 0 ? `ยืนยันนำเข้าเฉพาะ ${prev.okCount} แถวที่ผ่าน` : `ยืนยันนำเข้า ${prev.okCount} แถวที่ผ่าน`}
            </button>
            <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setPrev(null)} data-testid="metric-cancel">ยกเลิก</button>
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

  return (
    <section className="aq-import__part" aria-labelledby="imp-c-h" data-testid="import-cohort">
      <h3 id="imp-c-h" className="aq-h3">ผลการศึกษารายรุ่น (cohort)</h3>
      <p className="aq-help">
        ไฟล์รายคนมีคอลัมน์ cohort, status, years_to_graduate — ระบบคำนวณอัตราสำเร็จการศึกษา อัตราพ้นสภาพ และเวลาเฉลี่ยต่อรุ่น
        โดยไม่อ่านชื่อ/รหัสนักศึกษา
      </p>
      <div className="aq-field aq-import__years">
        <label htmlFor="cohort-years">เวลาเรียนตามหลักสูตร (ปี)</label>
        <input id="cohort-years" className="aq-input" type="number" min={1} max={10} value={years}
          onChange={e => {
            const v = e.target.value;
            setYears(v);
            if (debounce.current) clearTimeout(debounce.current);
            if (file) debounce.current = setTimeout(() => check(file, Math.max(1, Math.min(10, Math.floor(Number(v)) || 4))), 300);
          }} data-testid="cohort-years" />
      </div>
      <div className="aq-actions aq-mt-2">
        <AsyncButton className="aq-btn aq-btn-compact" testId="cohort-template" busyText="กำลังสร้างไฟล์…" onClick={async () => downloadBlob(await buildCohortTemplate(), 'cohort-template.xlsx')}>
          <Icon name="download" size={20} />ดาวน์โหลดแม่แบบ (.xlsx)
        </AsyncButton>
        <label className="aq-btn aq-btn-compact aq-btn-primary aq-file-btn">
          {busy ? <><span className="aq-spinner" aria-hidden="true" />กำลังตรวจไฟล์…</> : <><Icon name="upload" size={20} />เลือกไฟล์รายคน</>}
          <input ref={inputRef} type="file" accept=".xlsx" className="aq-sr-only" disabled={busy} data-testid="cohort-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <InlineMessage tone="danger" testId="cohort-import-error">{err}</InlineMessage>}
      {done && <Done testId="cohort-import-done">{done}</Done>}
      {res && (
        <div data-testid="cohort-preview">
          <div className="aq-cluster aq-mt-2">
            <Badge>{`อ่าน ${res.rowsRead} แถว`}</Badge>
            <Badge tone={rowErrors.length ? 'bad' : 'ok'} testId="cohort-err-count">{rowErrors.length ? `แถวไม่ผ่าน ${rowErrors.length}` : 'ทุกแถวผ่าน'}</Badge>
          </div>
          {rowErrors.length > 0 && (
            <InlineMessage tone="danger" testId="cohort-row-errors" title="มีแถวไม่ผ่าน จึงยังนำเข้าไม่ได้ (เพื่อไม่ให้อัตราคลาดเคลื่อนโดยไม่รู้ตัว) — แก้ไฟล์แล้วอัปโหลดใหม่">
              <ul className="aq-warnlist">
                {rowErrors.slice(0, 20).map(r => <li key={r.rowNo}>{`แถว ${r.rowNo}: ${r.reason}`}</li>)}
                {rowErrors.length > 20 && <li>{`… และอีก ${rowErrors.length - 20} แถว`}</li>}
              </ul>
            </InlineMessage>
          )}
          {res.warnings.length > 0 && <ul className="aq-warnlist" data-testid="cohort-warnings">{res.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          {res.cohorts.length > 0 && (
            <div className="aq-table-wrap">
              <table className="aq-table" data-testid="cohort-table">
                <thead><tr><th>รุ่น</th><th className="aq-num">จำนวน</th><th className="aq-num">จบตามเวลา</th><th className="aq-num">พ้นสภาพ</th><th className="aq-num">% จบ</th><th className="aq-num">% พ้นสภาพ</th><th className="aq-num">เวลาจบเฉลี่ย (ปี)</th></tr></thead>
                <tbody>
                  {res.cohorts.map(c => (
                    <tr key={c.cohort} data-testid={`cohort-${c.cohort}`}>
                      <td>{c.cohort}</td><td className="aq-num">{c.total}</td><td className="aq-num">{c.graduatedOnTime}</td><td className="aq-num">{c.droppedOut}</td>
                      <td className="aq-num">{c.passRate}</td><td className="aq-num">{c.dropoutRate}</td><td className="aq-num">{c.timeToGraduate ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="aq-actions aq-mt-2">
            <button type="button" className="aq-btn aq-btn-primary" disabled={busy || rowErrors.length > 0 || res.cohorts.length === 0} onClick={commit} data-testid="cohort-commit">
              {`ยืนยันนำเข้าผลรวม ${res.cohorts.length} รุ่น`}
            </button>
            <button type="button" className="aq-btn aq-btn-ghost" onClick={() => { reqSeq.current++; setRes(null); setFile(null); setBusy(false); }} data-testid="cohort-cancel">ยกเลิก</button>
          </div>
        </div>
      )}
    </section>
  );
}
