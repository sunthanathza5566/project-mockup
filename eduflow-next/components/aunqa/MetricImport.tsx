'use client';

import { useRef, useState } from 'react';
import {
  buildCohortTemplate, buildMetricTemplate, commitMetricImport, downloadBlob, importCohortFile, previewMetricImport,
} from '@/lib/api';
import type { CohortImportResult, MetricPreview } from '@/lib/api';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { AsyncButton, Badge } from './common';
import { errMsg } from '@/lib/ui/aunqa';

/** M6 นำเข้าตัวชี้วัดจาก Excel (template ตัวชี้วัด + ไฟล์รายคนของรุ่น) — preview ก่อนยืนยันเสมอ */
export default function MetricImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  return (
    <details className="aq-card" data-testid="import-panel">
      <summary className="aq-h3">นำเข้าจากไฟล์ Excel</summary>
      <p className="aq-muted" style={{ fontSize: '0.85rem' }} data-testid="import-privacy">
        ระบบอ่านไฟล์ในเบราว์เซอร์ของคุณและเก็บเฉพาะ <strong>ค่าสรุป</strong> (ตัวชี้วัดรายปี / อัตราต่อรุ่น) เท่านั้น
        ไฟล์ต้นฉบับและข้อมูลรายคนไม่ถูกเก็บไว้ในระบบ
      </p>
      <div className="aq-grid-2">
        <MetricFileImport user={user} programmeId={programmeId} onDone={onDone} />
        <CohortFileImport user={user} programmeId={programmeId} onDone={onDone} />
      </div>
    </details>
  );
}

// ───────────────────────── ตัวชี้วัดรายปี ─────────────────────────

function MetricFileImport({ user, programmeId, onDone }: { user: AppUser; programmeId: string; onDone: () => void }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prev, setPrev] = useState<MetricPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true); setErr(''); setPrev(null);
    try { setPrev(await previewMetricImport(user, programmeId, f)); }
    catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  function confirmImport() {
    if (!prev) return;
    try {
      const r = commitMetricImport(user, prev.previewId);
      showToast(`นำเข้าแล้ว: เพิ่ม ${r.inserted} · แทนที่ ${r.updated} · ข้าม ${r.skipped} แถว`, 'success');
      setPrev(null); onDone();
    } catch (e) { setErr(errMsg(e)); }
  }

  return (
    <section aria-labelledby="imp-m-h" data-testid="import-metric">
      <h3 id="imp-m-h" className="aq-h3">ตัวชี้วัดรายปี</h3>
      <p className="aq-muted" style={{ fontSize: '0.85rem' }}>กรอกตามแม่แบบ (1 แถว = ตัวชี้วัด 1 ปี) แล้วอัปโหลดเพื่อตรวจก่อนนำเข้า</p>
      <div className="aq-actions">
        <AsyncButton className="aq-btn aq-btn-sm" testId="metric-template" onClick={async () => downloadBlob(await buildMetricTemplate(), 'metrics-template.xlsx')}>ดาวน์โหลดแม่แบบ (.xlsx)</AsyncButton>
        <label className="aq-btn aq-btn-sm aq-file-btn">
          {busy ? 'กำลังตรวจไฟล์…' : 'เลือกไฟล์ที่กรอกแล้ว'}
          <input ref={inputRef} type="file" accept=".xlsx" className="aq-sr-only" disabled={busy} data-testid="metric-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <div className="auth-alert auth-alert-err" role="alert" data-testid="metric-import-error">{err}</div>}
      {prev && (
        <div data-testid="metric-preview">
          <div className="aq-chips" style={{ margin: '0.6rem 0' }}>
            <Badge tone="ok" testId="metric-ok-count">{`ผ่าน ${prev.okCount} แถว`}</Badge>
            <Badge tone={prev.errorCount ? 'bad' : 'neutral'} testId="metric-err-count">{`ไม่ผ่าน ${prev.errorCount} แถว`}</Badge>
          </div>
          {prev.warnings.length > 0 && (
            <ul className="aq-warnlist" data-testid="metric-warnings">{prev.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
          <div className="aq-table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="aq-table" data-testid="metric-preview-table">
              <thead><tr><th>แถว</th><th>ตัวชี้วัด</th><th>ปี</th><th>ค่า</th><th>ผลตรวจ</th></tr></thead>
              <tbody>
                {prev.rows.map(r => (
                  <tr key={r.rowNo} className={r.ok ? '' : 'aq-row-bad'} data-testid={`prev-row-${r.rowNo}`} data-ok={r.ok}>
                    <td>{r.rowNo}</td>
                    <td>{r.code || '—'}</td>
                    <td>{r.period ?? '—'}</td>
                    <td>{r.value ?? '—'}</td>
                    <td>
                      {r.ok
                        ? <><Badge tone="ok">ผ่าน</Badge>{r.existingValue !== undefined && <span className="aq-muted">{` แทนที่ค่าเดิม ${r.existingValue}`}</span>}</>
                        : <><Badge tone="bad">ไม่ผ่าน</Badge> {r.errors.join(' · ')}</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="aq-actions" style={{ marginTop: '0.6rem' }}>
            <button className="aq-btn aq-btn-primary" disabled={prev.okCount === 0} onClick={confirmImport} data-testid="metric-commit">
              {`ยืนยันนำเข้า ${prev.okCount} แถวที่ผ่าน`}
            </button>
            <button className="aq-btn" onClick={() => setPrev(null)} data-testid="metric-cancel">ยกเลิก</button>
          </div>
          {prev.errorCount > 0 && <p className="aq-muted" style={{ fontSize: '0.8rem' }}>แถวที่ไม่ผ่านจะถูกข้าม ไม่ถูกนำเข้า — แก้ไฟล์แล้วอัปโหลดใหม่ได้</p>}
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

  const std = Math.max(1, Math.min(10, Math.floor(Number(years)) || 4));

  async function check(f: File, standardYears = std) {
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await importCohortFile(user, programmeId, f, { standardYears, dryRun: true })); }
    catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }
  async function onFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    await check(f);
    if (inputRef.current) inputRef.current.value = '';
  }
  async function commit() {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const r = await importCohortFile(user, programmeId, file, { standardYears: std });
      showToast(`นำเข้าผลรวม ${r.cohorts.length} รุ่นแล้ว (เพิ่ม ${r.written.inserted} · แทนที่ ${r.written.updated})`, 'success');
      setRes(null); setFile(null); onDone();
    } catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  const rowErrors = res?.rowErrors ?? [];

  return (
    <section aria-labelledby="imp-c-h" data-testid="import-cohort">
      <h3 id="imp-c-h" className="aq-h3">ผลการศึกษารายรุ่น (cohort)</h3>
      <p className="aq-muted" style={{ fontSize: '0.85rem' }}>
        ไฟล์รายคนมีคอลัมน์ cohort, status, years_to_graduate — ระบบคำนวณอัตราสำเร็จการศึกษา อัตราพ้นสภาพ และเวลาเฉลี่ยต่อรุ่น
        โดยไม่อ่านชื่อ/รหัสนักศึกษา
      </p>
      <div className="aq-form-inline">
        <label>เวลาเรียนตามหลักสูตร (ปี)
          <input className="aq-input aq-input-sm" type="number" min={1} max={10} value={years} style={{ width: 80 }}
            onChange={e => {
              setYears(e.target.value);
              if (file) check(file, Math.max(1, Math.min(10, Math.floor(Number(e.target.value)) || 4)));
            }} data-testid="cohort-years" />
        </label>
      </div>
      <div className="aq-actions" style={{ marginTop: '0.4rem' }}>
        <AsyncButton className="aq-btn aq-btn-sm" testId="cohort-template" onClick={async () => downloadBlob(await buildCohortTemplate(), 'cohort-template.xlsx')}>ดาวน์โหลดแม่แบบ (.xlsx)</AsyncButton>
        <label className="aq-btn aq-btn-sm aq-file-btn">
          {busy ? 'กำลังตรวจไฟล์…' : 'เลือกไฟล์รายคน'}
          <input ref={inputRef} type="file" accept=".xlsx" className="aq-sr-only" disabled={busy} data-testid="cohort-file"
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {err && <div className="auth-alert auth-alert-err" role="alert" data-testid="cohort-import-error">{err}</div>}
      {res && (
        <div data-testid="cohort-preview">
          <div className="aq-chips" style={{ margin: '0.6rem 0' }}>
            <Badge>{`อ่าน ${res.rowsRead} แถว`}</Badge>
            <Badge tone={rowErrors.length ? 'bad' : 'ok'} testId="cohort-err-count">{rowErrors.length ? `แถวไม่ผ่าน ${rowErrors.length}` : 'ทุกแถวผ่าน'}</Badge>
          </div>
          {rowErrors.length > 0 && (
            <div className="auth-alert auth-alert-err" role="alert" data-testid="cohort-row-errors">
              มีแถวไม่ผ่าน จึงยังนำเข้าไม่ได้ (เพื่อไม่ให้อัตราคลาดเคลื่อนโดยไม่รู้ตัว) — แก้ไฟล์แล้วอัปโหลดใหม่
              <ul className="aq-warnlist">
                {rowErrors.slice(0, 20).map(r => <li key={r.rowNo}>{`แถว ${r.rowNo}: ${r.reason}`}</li>)}
                {rowErrors.length > 20 && <li>{`… และอีก ${rowErrors.length - 20} แถว`}</li>}
              </ul>
            </div>
          )}
          {res.warnings.length > 0 && <ul className="aq-warnlist" data-testid="cohort-warnings">{res.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          {res.cohorts.length > 0 && (
            <div className="aq-table-wrap">
              <table className="aq-table" data-testid="cohort-table">
                <thead><tr><th>รุ่น</th><th>จำนวน</th><th>จบตามเวลา</th><th>พ้นสภาพ</th><th>% จบ</th><th>% พ้นสภาพ</th><th>เวลาจบเฉลี่ย (ปี)</th></tr></thead>
                <tbody>
                  {res.cohorts.map(c => (
                    <tr key={c.cohort} data-testid={`cohort-${c.cohort}`}>
                      <td>{c.cohort}</td><td>{c.total}</td><td>{c.graduatedOnTime}</td><td>{c.droppedOut}</td>
                      <td>{c.passRate}</td><td>{c.dropoutRate}</td><td>{c.timeToGraduate ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="aq-actions" style={{ marginTop: '0.6rem' }}>
            <button className="aq-btn aq-btn-primary" disabled={busy || rowErrors.length > 0 || res.cohorts.length === 0} onClick={commit} data-testid="cohort-commit">
              {`ยืนยันนำเข้าผลรวม ${res.cohorts.length} รุ่น`}
            </button>
            <button className="aq-btn" onClick={() => { setRes(null); setFile(null); }} data-testid="cohort-cancel">ยกเลิก</button>
          </div>
        </div>
      )}
    </section>
  );
}
