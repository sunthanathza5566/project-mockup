'use client';

import { useState } from 'react';
import {
  can, deleteMetric, getMetricDefinition, listMetricDefinitions, listMetrics, programmeScope, upsertMetric,
} from '@/lib/api';
import type { AppUser, MetricValue } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, Empty, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import { errMsg } from '@/lib/ui/aunqa';

const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

/** S10 ตัวชี้วัด (C8 ฯลฯ) แบบตาราง — แก้ค่าได้ตามสิทธิ์ ใช้โดยกฎ gap R3/R8 */
export default function MetricsPage() {
  const { user, programmes, programmeId, setProgrammeId } = useScope();
  const { showToast } = useToast();
  const defs = listMetricDefinitions();
  const canWrite = !!programmeId && can(user, 'metric.write', programmeScope(programmeId));

  const q = useLoad(() => (programmeId ? listMetrics(user, programmeId) : []), [user.id, programmeId]);

  return (
    <>
      <PageHeader title="ตัวชี้วัด" sub="ข้อมูลตัวเลขที่ใช้ตรวจแนวโน้มและ benchmark (เช่น ผลลัพธ์ผู้สำเร็จการศึกษา เกณฑ์ที่ 8) — ระบบตรวจช่องว่างจากข้อมูลนี้" />
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="m-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
      </div>

      {canWrite && <AddForm user={user} programmeId={programmeId} onDone={q.reload} />}

      <Async q={q}>{rows => rows.length === 0 ? <Empty text="ยังไม่มีข้อมูลตัวชี้วัด" /> : (
        <div className="aq-card aq-table-wrap">
          <table className="aq-table" data-testid="metric-table">
            <thead><tr><th>ตัวชี้วัด</th><th>ปี</th><th>ค่า</th><th>เป้าหมาย</th><th>benchmark</th><th>แหล่ง benchmark</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {rows.map(m => <Row key={m.id + JSON.stringify(m)} m={m} user={user} canWrite={canWrite} onDone={q.reload} toast={showToast} />)}
            </tbody>
          </table>
        </div>
      )}</Async>
      <p className="aq-muted">ตัวชี้วัดที่ระบบรู้จัก: {defs.map(d => d.code).join(', ')}</p>
    </>
  );
}

function Row({ m, user, canWrite, onDone, toast }: {
  m: MetricValue; user: AppUser; canWrite: boolean; onDone: () => void; toast: (s: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const def = getMetricDefinition(m.code);
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
    if (!(await confirm({ title: 'ลบข้อมูล', message: `ลบ ${m.code} ปี ${m.period}?`, variant: 'danger', confirmText: 'ลบ' }))) return;
    try { deleteMetric(user, m.id); toast('ลบแล้ว', 'success'); onDone(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  return (
    <tr data-testid={`metric-${m.code}-${m.period}`}>
      <td><strong>{m.code}</strong><div className="aq-muted">{def?.nameTh} ({def?.unit})</div></td>
      <td>{m.period}</td>
      {edit ? (
        <>
          <td><input className="aq-input aq-input-sm" type="number" step="any" value={v.value} onChange={e => setV({ ...v, value: e.target.value })} aria-label="ค่า" data-testid="metric-edit-value" /></td>
          <td><input className="aq-input aq-input-sm" type="number" step="any" value={v.target} onChange={e => setV({ ...v, target: e.target.value })} aria-label="เป้าหมาย" /></td>
          <td><input className="aq-input aq-input-sm" type="number" step="any" value={v.bench} onChange={e => setV({ ...v, bench: e.target.value })} aria-label="benchmark" /></td>
          <td><input className="aq-input aq-input-sm" value={v.src} onChange={e => setV({ ...v, src: e.target.value })} aria-label="แหล่ง" /></td>
        </>
      ) : (
        <><td>{m.value}</td><td>{m.targetValue ?? '—'}</td><td>{m.benchmarkValue ?? '—'}</td><td>{m.benchmarkSource ?? '—'}</td></>
      )}
      {canWrite && (
        <td className="aq-nowrap">
          {edit ? <><button className="aq-btn aq-btn-sm aq-btn-primary" onClick={save} data-testid="metric-save">บันทึก</button> <button className="aq-btn aq-btn-sm" onClick={() => setEdit(false)}>ยกเลิก</button></>
            : <><button className="aq-btn aq-btn-sm" onClick={() => setEdit(true)} data-testid={`metric-edit-${m.code}-${m.period}`}>แก้</button> <button className="aq-btn aq-btn-sm" onClick={del} aria-label="ลบ">ลบ</button></>}
        </td>
      )}
    </tr>
  );
}

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

  return (
    <div className="aq-card">
      {!open ? <button className="aq-btn aq-btn-primary" onClick={() => setOpen(true)} data-testid="metric-new">+ เพิ่ม/แก้ค่าตัวชี้วัด</button> : (
        <form className="aq-form-inline" onSubmit={submit} data-testid="metric-form">
          <label>ตัวชี้วัด
            <select className="aq-input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} data-testid="metric-code">
              {defs.map(d => <option key={d.code} value={d.code}>{d.code} {d.nameTh} ({d.unit})</option>)}
            </select>
          </label>
          <label>ปี<input className="aq-input aq-input-sm" type="number" required value={f.period} onChange={e => setF({ ...f, period: e.target.value })} style={{ width: 100 }} data-testid="metric-period" /></label>
          <label>ค่า<input className="aq-input aq-input-sm" type="number" step="any" required value={f.value} onChange={e => setF({ ...f, value: e.target.value })} style={{ width: 100 }} data-testid="metric-value" /></label>
          <label>เป้าหมาย<input className="aq-input aq-input-sm" type="number" step="any" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} style={{ width: 100 }} /></label>
          <label>benchmark<input className="aq-input aq-input-sm" type="number" step="any" value={f.bench} onChange={e => setF({ ...f, bench: e.target.value })} style={{ width: 100 }} /></label>
          <label>แหล่ง benchmark<input className="aq-input aq-input-sm" value={f.src} onChange={e => setF({ ...f, src: e.target.value })} /></label>
          <button className="aq-btn aq-btn-primary" data-testid="metric-submit">บันทึก</button>
          <button type="button" className="aq-btn" onClick={() => setOpen(false)}>ยกเลิก</button>
        </form>
      )}
    </div>
  );
}
