'use client';

/**
 * ตัวชี้วัด (ADR-UI-001 pages.md P13)
 * toolbar หลักสูตร · [+ เพิ่ม/แก้ค่าตัวชี้วัด] · แผงนำเข้า (เด่น อยู่เหนือกราฟ/ตาราง; C-7 key={programmeId})
 * แนวโน้ม 3–5 ปี · metric-table จัดกลุ่มตามตัวชี้วัด (แถวหัวกลุ่ม: รหัส + ชื่อ + หน่วย) แล้วแถวปี
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
import { errMsg } from '@/lib/ui/aunqa';

const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

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
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="m-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
      </div>

      {canWrite && <AddForm key={`add-${programmeId}`} user={user} programmeId={programmeId} onDone={q.reload} />}
      {/* C-7: เปลี่ยนหลักสูตร = แผงนำเข้าเริ่มใหม่ทั้งหมด (ล้าง preview/ไฟล์ cohort ของหลักสูตรเดิม) */}
      {canWrite && <MetricImport key={programmeId} user={user} programmeId={programmeId} onDone={q.reload} />}

      <Async q={q} skeleton="table">{rows => rows.length === 0 ? (
        <Empty icon="chart-line" title="ยังไม่มีข้อมูลตัวชี้วัด" text={canWrite ? 'เพิ่มค่าทีละปี หรือนำเข้าจากไฟล์ Excel ด้านบน' : undefined} />
      ) : (
        <>
          <section className="aq-section" aria-labelledby="trend-h" data-testid="trend-section">
            <h2 id="trend-h" className="aq-h2">แนวโน้ม 3–5 ปี</h2>
            <div className="aq-grid-2">
              {Array.from(new Set(rows.map(r => r.code))).map(code => {
                const d = getMetricDefinition(code);
                return <TrendChart key={code} code={code} name={lang === 'en' ? d?.nameEn || d?.nameTh : d?.nameTh} unit={d?.unit} rows={rows.filter(r => r.code === code)} />;
              })}
            </div>
          </section>
          <section className="aq-card" aria-labelledby="mt-h">
            <h2 id="mt-h" className="aq-h2">ค่าตัวชี้วัดรายปี</h2>
            <div className="aq-table-wrap">
              <table className="aq-table aq-table--stack" data-testid="metric-table">
                <thead><tr><th>ปี</th><th className="aq-num">ค่า</th><th className="aq-num">เป้าหมาย</th><th className="aq-num">benchmark</th><th>แหล่ง benchmark</th>{canWrite && <th><span className="aq-sr-only">การกระทำ</span></th>}</tr></thead>
                <tbody>
                  {Array.from(new Set(rows.map(r => r.code))).map(code => {
                    const d = getMetricDefinition(code);
                    return (
                      <Fragment key={code}>
                        <tr className="aq-group-row"><th colSpan={canWrite ? 6 : 5} scope="colgroup">{code} — {d?.nameTh}{d?.unit ? ` (${d.unit})` : ''}</th></tr>
                        {rows.filter(r => r.code === code).sort((a, b) => a.period - b.period).map(m => (
                          <Row key={m.id + JSON.stringify(m)} m={m} user={user} canWrite={canWrite} onDone={q.reload} toast={showToast} />
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}</Async>
      <p className="aq-meta">ตัวชี้วัดที่ระบบรู้จัก: {defs.map(d => d.code).join(', ')}</p>
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

  return (
    <tr data-testid={`metric-${m.code}-${m.period}`}>
      <td data-label="ปี" className="aq-tnum">{m.period}</td>
      {edit ? (
        <>
          <td data-label="ค่า"><input className="aq-input aq-input-sm" type="number" step="any" value={v.value} onChange={e => setV({ ...v, value: e.target.value })} aria-label="ค่า" data-testid="metric-edit-value" /></td>
          <td data-label="เป้าหมาย"><input className="aq-input aq-input-sm" type="number" step="any" value={v.target} onChange={e => setV({ ...v, target: e.target.value })} aria-label="เป้าหมาย" /></td>
          <td data-label="benchmark"><input className="aq-input aq-input-sm" type="number" step="any" value={v.bench} onChange={e => setV({ ...v, bench: e.target.value })} aria-label="benchmark" /></td>
          <td data-label="แหล่ง benchmark"><input className="aq-input aq-input-sm" value={v.src} onChange={e => setV({ ...v, src: e.target.value })} aria-label="แหล่ง benchmark" /></td>
        </>
      ) : (
        <>
          <td data-label="ค่า" className="aq-num">{m.value}</td>
          <td data-label="เป้าหมาย" className="aq-num">{m.targetValue ?? '—'}</td>
          <td data-label="benchmark" className="aq-num">{m.benchmarkValue ?? '—'}</td>
          <td data-label="แหล่ง benchmark">{m.benchmarkSource ?? '—'}</td>
        </>
      )}
      {canWrite && (
        <td>
          <div className="aq-cluster">
            {edit
              ? <><button type="button" className="aq-btn aq-btn-compact aq-btn-primary" onClick={save} data-testid="metric-save">บันทึก</button><button type="button" className="aq-btn aq-btn-ghost aq-btn-compact" onClick={() => setEdit(false)}>ยกเลิก</button></>
              : <><button type="button" className="aq-btn aq-btn-compact" onClick={() => setEdit(true)} data-testid={`metric-edit-${m.code}-${m.period}`}><Icon name="pencil" size={20} />แก้</button>
                <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-btn-compact" onClick={del} aria-label={`ลบ ${m.code} ปี ${m.period}`} title="ลบ"><Icon name="trash" size={20} /></button></>}
          </div>
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

  if (!open) {
    return (
      <div className="aq-actions aq-mb-4">
        <button type="button" className="aq-btn aq-btn-primary" onClick={() => setOpen(true)} data-testid="metric-new"><Icon name="plus" size={20} />เพิ่ม/แก้ค่าตัวชี้วัด</button>
      </div>
    );
  }
  return (
    <form className="aq-card aq-form-grid" onSubmit={submit} data-testid="metric-form">
      <h2 className="aq-h3 aq-span-all">เพิ่ม/แก้ค่าตัวชี้วัด</h2>
      <div className="aq-field aq-span-all"><label htmlFor="mf-code">ตัวชี้วัด</label>
        <select id="mf-code" className="aq-input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} data-testid="metric-code">
          {defs.map(d => <option key={d.code} value={d.code}>{d.code} {d.nameTh} ({d.unit})</option>)}
        </select></div>
      <div className="aq-field"><label htmlFor="mf-period">ปี *</label>
        <input id="mf-period" className="aq-input" type="number" required value={f.period} onChange={e => setF({ ...f, period: e.target.value })} data-testid="metric-period" /></div>
      <div className="aq-field"><label htmlFor="mf-value">ค่า *</label>
        <input id="mf-value" className="aq-input" type="number" step="any" required value={f.value} onChange={e => setF({ ...f, value: e.target.value })} data-testid="metric-value" /></div>
      <div className="aq-field"><label htmlFor="mf-target">เป้าหมาย</label>
        <input id="mf-target" className="aq-input" type="number" step="any" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} /></div>
      <div className="aq-field"><label htmlFor="mf-bench">benchmark</label>
        <input id="mf-bench" className="aq-input" type="number" step="any" value={f.bench} onChange={e => setF({ ...f, bench: e.target.value })} /></div>
      <div className="aq-field aq-span-all"><label htmlFor="mf-src">แหล่ง benchmark</label>
        <input id="mf-src" className="aq-input" value={f.src} onChange={e => setF({ ...f, src: e.target.value })} /></div>
      <div className="aq-actions aq-span-all">
        <button className="aq-btn aq-btn-primary" data-testid="metric-submit">บันทึก</button>
        <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
      </div>
    </form>
  );
}
