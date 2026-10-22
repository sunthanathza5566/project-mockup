'use client';

/**
 * คลังหลักฐาน (ADR-UI-001 pages.md P10)
 * - ev-new ใน PageHeader · toolbar หลัก (หลักสูตร/รอบ/ค้นหา) + "ตัวกรองเพิ่มเติม (n)" พับไว้
 * - ฟอร์ม 3 ช่อง: ① ชื่อ ② แนบ (dropzone / ลิงก์ / ข้อความ อย่างน้อย 1) ③ ผูกกับข้อ (ev-f-cycle + RequirementPicker)
 *   + รายละเอียดเพิ่มเติมพับไว้ · inline validate + error summary (P4) · แจ้งไฟล์ใหญ่ (P9) · บรรทัด "บันทึกเข้าหลักสูตร" (UX-8)
 * - สำเร็จ: ปิดฟอร์ม + toast + ไฮไลต์แถวใหม่ (L5) + scrollIntoView · PII = dialog notify "รับทราบ" (เดิม)
 * - query: ?new=1 เปิดฟอร์ม · &cycle= รอบ · &req= ใส่ chip · ?pii=1 ติ๊กตัวกรอง PII และเปิดตัวกรองเพิ่มเติม
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AunqaError, MAX_DATAURL_BYTES, can, createEvidence, getProgramme, listEvidence, listRequirements, programmeScope,
  readFileInput, validateFileMeta,
} from '@/lib/api';
import type { EvidenceKind, PdcaStage } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, Badge, Empty, EvidenceStatusBadge, InlineMessage, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import RequirementPicker from '@/components/aunqa/RequirementPicker';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { KIND_LIST, KIND_TH, PDCA_TH, errMsg, isAssessorOnly } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const WRITABLE = ['draft', 'in_progress', 'revision_requested'];
type Errors = { title?: string; attach?: string; url?: string; file?: string; api?: string };

function fmtSize(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function Inner() {
  const { user, programmes, cycles, programmeId, cycleId, setProgrammeId, setCycleId } = useScope();
  const params = useSearchParams();
  const { showToast } = useToast();
  const { confirm, notify } = useDialog();
  const assessor = isAssessorOnly(user);

  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [kind, setKind] = useState<EvidenceKind | ''>('');
  const [stage, setStage] = useState<PdcaStage | ''>('');
  const [piiOnly, setPiiOnly] = useState(false);
  const [reqFilter, setReqFilter] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [newId, setNewId] = useState('');

  const list = useLoad(() => {
    if (!programmeId) return [];
    return listEvidence(user, {
      programmeId, cycleId: cycleId || undefined, q: q || undefined, year: year ? Number(year) : undefined,
      kind: kind || undefined, pdcaStage: stage || undefined, containsPii: piiOnly ? true : undefined,
      requirementId: reqFilter || undefined, onlyLinked: assessor,
    });
  }, [user.id, programmeId, cycleId, q, year, kind, stage, piiOnly, reqFilter]);

  const canWrite = !!programmeId && !assessor && can(user, 'evidence.write', programmeScope(programmeId));
  const reqs = listRequirements();
  const writableCycles = cycles.filter(c => WRITABLE.includes(c.status)).sort((a, b) => b.academicYear - a.academicYear);
  const prog = getProgramme(programmeId);
  const extraFilters = [year, kind, stage, reqFilter].filter(Boolean).length + (piiOnly ? 1 : 0);

  // ─── upload form ───
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: '', description: '', kind: 'other' as EvidenceKind, stage: 'D' as PdcaStage,
    year: String(new Date().getFullYear() + 543), url: '', text: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [formCycle, setFormCycle] = useState('');
  const [reqIds, setReqIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function defaultFormCycle(): string {
    if (cycleId && writableCycles.some(c => c.id === cycleId)) return cycleId;
    return writableCycles[0]?.id ?? '';
  }
  function openForm() { setErrors({}); setFormCycle(defaultFormCycle()); setOpen(true); }

  // query params (ครั้งแรก)
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !programmeId) return;
    applied.current = true;
    const qc = params.get('cycle');
    if (qc && cycles.some(c => c.id === qc)) setCycleId(qc);
    if (params.get('pii') === '1') { setPiiOnly(true); setMoreOpen(true); }
    if (params.get('new') === '1' && canWrite) {
      setErrors({});
      setFormCycle(qc && writableCycles.some(c => c.id === qc) ? qc : defaultFormCycle());
      const r = params.get('req');
      if (r) setReqIds([r]);
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeId]);

  // ไฮไลต์ + เลื่อนไปแถวใหม่
  useEffect(() => {
    if (!newId || list.loading) return;
    const row = document.querySelector(`[data-row-id="${newId}"]`);
    row?.scrollIntoView({ block: 'center' });
    const t = setTimeout(() => setNewId(''), 1700);
    return () => clearTimeout(t);
  }, [newId, list.loading, list.data]);

  function pickFile(fl: File | null) {
    setErrors(e => ({ ...e, file: undefined, attach: undefined }));
    if (!fl) { setFile(null); return; }
    try { validateFileMeta({ name: fl.name, size: fl.size }); setFile(fl); }
    catch (err) { setFile(null); if (fileRef.current) fileRef.current.value = ''; setErrors(e => ({ ...e, file: errMsg(err) })); }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!f.title.trim()) e.title = 'กรอกชื่อหลักฐาน เช่น รายงานการประชุมกรรมการหลักสูตร ครั้งที่ 1/2569';
    if (!file && !f.url.trim() && !f.text.trim()) e.attach = 'แนบไฟล์ ใส่ลิงก์ หรือวางข้อความอย่างน้อยหนึ่งอย่าง';
    if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) e.url = 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); setTimeout(() => summaryRef.current?.focus(), 0); return; }
    setErrors({});
    setBusy(true);
    try {
      const fileInput = file ? await readFileInput(file) : undefined;
      const base = {
        programmeId, title: f.title.trim(), description: f.description, kind: f.kind, pdcaStage: f.stage,
        academicYear: Number(f.year), cycleId: formCycle || undefined, requirementIds: formCycle ? reqIds : [],
        url: f.url.trim() || undefined, file: fileInput, extractedText: f.text || undefined,
      };
      let ev;
      try {
        ev = await createEvidence(user, base);
      } catch (err) {
        if (err instanceof AunqaError && err.code === 'duplicate') {
          const ok = await confirm({ title: 'พบไฟล์ซ้ำ', message: `${err.message} ต้องการสร้างหลักฐานใหม่ซ้ำอีกชิ้นหรือไม่?`, variant: 'warning', confirmText: 'สร้างซ้ำ' });
          if (!ok) return;
          ev = await createEvidence(user, { ...base, allowDuplicate: true });
        } else throw err;
      }
      showToast(`เพิ่มหลักฐาน ${ev.code} แล้ว`, 'success');
      notifyTodosChanged();
      if (ev.containsPii) {
        await notify({ title: 'พบข้อมูลส่วนบุคคล', variant: 'warning', message: `หลักฐาน ${ev.code} มีข้อมูลที่อาจเป็นข้อมูลส่วนบุคคล (เช่น เลขบัตรประชาชน) กรุณาตรวจและปกปิดก่อนใช้งานต่อ` });
      }
      setF(s => ({ ...s, title: '', description: '', url: '', text: '' })); setFile(null); setReqIds([]); setOpen(false);
      if (formCycle && formCycle !== cycleId) setCycleId(formCycle);
      setNewId(ev.id);
      list.reload();
    } catch (err) {
      setErrors({ api: errMsg(err) });
      setTimeout(() => summaryRef.current?.focus(), 0);
    } finally { setBusy(false); }
  }

  function clearFilters() { setQ(''); setYear(''); setKind(''); setStage(''); setPiiOnly(false); setReqFilter(''); }

  const errList = (Object.entries(errors) as [keyof Errors, string | undefined][]).filter(([, m]) => m);
  const fieldOf: Record<keyof Errors, string> = { title: 'ev-f-title', attach: 'ev-f-attach', url: 'ev-f-url', file: 'ev-f-file', api: 'ev-f-title' };

  return (
    <>
      <PageHeader
        title="คลังหลักฐาน"
        sub={<>หลักฐานชิ้นเดียวผูกได้หลายข้อ โดยไม่ต้องคัดลอก — รหัส E-x.x-nn ใช้อ้างอิงใน SAR <Term k="evidence_code" label="รหัสหลักฐาน" /></>}
        actions={canWrite && !open ? (
          <button type="button" className="aq-btn aq-btn-primary" onClick={openForm} data-testid="ev-new"><Icon name="plus" size={20} />เพิ่มหลักฐาน</button>
        ) : undefined}
      />

      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="ev-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        <select className="aq-input" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบประเมิน" data-testid="ev-cycle">
          {!assessor && <option value="">ทุกรอบ / ไม่ระบุรอบ</option>}
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </select>
        <input className="aq-input" type="search" placeholder="ค้นหาชื่อ/รหัส/เนื้อหา…" aria-label="ค้นหาหลักฐาน" value={q} onChange={e => setQ(e.target.value)} data-testid="ev-search" />
        <button type="button" className="aq-btn" aria-expanded={moreOpen} aria-controls="ev-more" onClick={() => setMoreOpen(o => !o)}>
          <Icon name="filter" size={20} />ตัวกรองเพิ่มเติม{extraFilters ? ` (${extraFilters})` : ''}
        </button>
      </div>
      {moreOpen && (
        <div id="ev-more" className="aq-card aq-filter-panel">
          <div className="aq-field"><label htmlFor="ev-year">ปีการศึกษา</label>
            <input id="ev-year" className="aq-input" type="number" placeholder="พ.ศ." value={year} onChange={e => setYear(e.target.value)} data-testid="ev-year" /></div>
          <div className="aq-field"><label htmlFor="ev-kind">ประเภท</label>
            <select id="ev-kind" className="aq-input" value={kind} onChange={e => setKind(e.target.value as EvidenceKind | '')} data-testid="ev-kind">
              <option value="">ทุกประเภท</option>{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}
            </select></div>
          <div className="aq-field"><label htmlFor="ev-pdca">ขั้น PDCA</label>
            <select id="ev-pdca" className="aq-input" value={stage} onChange={e => setStage(e.target.value as PdcaStage | '')} data-testid="ev-pdca">
              <option value="">PDCA ทั้งหมด</option>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}
            </select></div>
          <div className="aq-field"><label htmlFor="ev-req">ข้อ</label>
            <select id="ev-req" className="aq-input" value={reqFilter} onChange={e => setReqFilter(e.target.value)} disabled={!cycleId} data-testid="ev-req">
              <option value="">ทุกข้อ</option>{reqs.map(r => <option key={r.id} value={r.id}>ข้อ {r.id}</option>)}
            </select></div>
          <label className="aq-check"><input type="checkbox" checked={piiOnly} onChange={e => setPiiOnly(e.target.checked)} data-testid="ev-pii" /> เฉพาะที่พบ PII</label>
          <button type="button" className="aq-btn aq-btn-ghost" onClick={clearFilters}>ล้างตัวกรอง</button>
        </div>
      )}

      {canWrite && open && (
        <form className="aq-card aq-ev-form" onSubmit={submit} noValidate data-testid="ev-form" aria-labelledby="ev-form-h">
          <h2 id="ev-form-h" className="aq-h2">เพิ่มหลักฐานใหม่</h2>
          {errList.length > 0 && (
            <div className="aq-error-summary" role="alert" tabIndex={-1} ref={summaryRef} data-testid="ev-error-summary">
              <p className="aq-error-summary__title">{`ยังบันทึกไม่ได้ — โปรดแก้ ${errList.length} จุด`}</p>
              <ul>{errList.map(([k, m]) => <li key={k}><a href={`#${fieldOf[k]}`}>{m}</a></li>)}</ul>
            </div>
          )}

          <div className="aq-field aq-ev-step">
            <label htmlFor="ev-f-title"><span className="aq-step-badge" aria-hidden="true">1</span>ชื่อหลักฐาน *</label>
            <input id="ev-f-title" className="aq-input" maxLength={200} value={f.title} aria-required="true"
              aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? 'ev-f-title-err' : undefined}
              onChange={e => setF({ ...f, title: e.target.value })} data-testid="ev-title" />
            {errors.title && <p className="aq-field-error" id="ev-f-title-err"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{errors.title}</p>}
          </div>

          <fieldset className="aq-ev-step" id="ev-f-attach" aria-describedby={errors.attach ? 'ev-f-attach-err' : undefined}>
            <legend className="aq-label"><span className="aq-step-badge" aria-hidden="true">2</span>แนบหลักฐาน * (อย่างน้อย 1 อย่าง)</legend>
            {errors.attach && <p className="aq-field-error" id="ev-f-attach-err"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{errors.attach}</p>}
            {!file ? (
              <label className="aq-dropzone" id="ev-f-file"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('is-over'); }}
                onDragLeave={e => e.currentTarget.classList.remove('is-over')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); pickFile(e.dataTransfer.files?.[0] ?? null); }}>
                <Icon name="upload" size={24} />
                <span><strong>ลากไฟล์มาวาง หรือ เลือกไฟล์</strong></span>
                <span className="aq-help">PDF, DOCX, XLSX, PNG, JPG, TXT, CSV ไม่เกิน 50 MB</span>
                <input ref={fileRef} type="file" className="aq-sr-only" onChange={e => pickFile(e.target.files?.[0] ?? null)} data-testid="ev-file"
                  aria-invalid={errors.file ? true : undefined} />
              </label>
            ) : (
              <div className="aq-file-chosen">
                <Icon name="file-text" size={20} />
                <span className="aq-flex-1"><strong>{file.name}</strong> · {fmtSize(file.size)}</span>
                <label className="aq-btn aq-btn-compact">เปลี่ยนไฟล์
                  <input type="file" className="aq-sr-only" onChange={e => pickFile(e.target.files?.[0] ?? null)} data-testid="ev-file" />
                </label>
                <button type="button" className="aq-btn aq-btn-ghost aq-btn-compact" onClick={() => pickFile(null)}>เอาออก</button>
              </div>
            )}
            {file && file.size > MAX_DATAURL_BYTES && (
              <InlineMessage tone="info">ไฟล์ใหญ่กว่า 1 MB: ระบบเดโม่เก็บเฉพาะชื่อไฟล์ ขนาด และลายนิ้วมือ (hash) ไม่เก็บตัวไฟล์ จึงเปิดดาวน์โหลดภายหลังไม่ได้</InlineMessage>
            )}
            {errors.file && <p className="aq-field-error"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{errors.file}</p>}
            <div className="aq-field">
              <label htmlFor="ev-f-url">หรือ ลิงก์</label>
              <input id="ev-f-url" className="aq-input" type="url" placeholder="https://…" value={f.url}
                aria-invalid={errors.url ? true : undefined} onChange={e => setF({ ...f, url: e.target.value })} />
              {errors.url && <p className="aq-field-error"><Icon name="x-circle" size={16} /><span className="aq-sr-only">ข้อผิดพลาด:</span>{errors.url}</p>}
            </div>
            <div className="aq-field">
              <label htmlFor="ev-f-text">หรือ วางข้อความ</label>
              <p className="aq-help">ระบบใช้ตรวจข้อมูลส่วนบุคคลและให้ AI แนะนำข้อ</p>
              <textarea id="ev-f-text" className="aq-textarea" rows={3} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} data-testid="ev-text" />
            </div>
          </fieldset>

          <fieldset className="aq-ev-step">
            <legend className="aq-label"><span className="aq-step-badge" aria-hidden="true">3</span>ผูกกับข้อ</legend>
            <p className="aq-meta">บันทึกเข้าหลักสูตร: {prog?.code} — {prog?.nameTh}</p>
            {writableCycles.length === 0 ? (
              <InlineMessage tone="info">ยังไม่มีรอบที่เปิดเขียน — บันทึกหลักฐานไว้ในคลังก่อน แล้วผูกกับข้อภายหลังจากหน้าข้อได้</InlineMessage>
            ) : (
              <div className="aq-ev-link">
                <div className="aq-field">
                  <label htmlFor="ev-f-cycle">รอบ</label>
                  <select id="ev-f-cycle" className="aq-input" value={formCycle} onChange={e => setFormCycle(e.target.value)} data-testid="ev-f-cycle">
                    <option value="">— ไม่ผูกรอบ —</option>
                    {writableCycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
                  </select>
                </div>
                <RequirementPicker
                  label="ข้อที่เกี่ยวข้อง" value={reqIds} onChange={setReqIds} disabled={!formCycle}
                  disabledHint="เลือกรอบประเมินในช่อง “รอบ” ก่อน จึงจะผูกข้อได้"
                  help="ไม่ผูกตอนนี้ก็ได้ ภายหลังผูกจากหน้าข้อได้ — รหัสจะเป็น E-0.0-nn"
                />
              </div>
            )}
          </fieldset>

          <details className="aq-collapse">
            <summary>รายละเอียดเพิ่มเติม (ไม่บังคับ)<Icon name="chevron-down" size={20} className="aq-collapse__chev" /></summary>
            <div className="aq-form-grid aq-mt-2">
              <div className="aq-field aq-span-all">
                <label htmlFor="ev-f-desc">คำอธิบาย</label>
                <textarea id="ev-f-desc" className="aq-textarea" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
              </div>
              <div className="aq-field"><label htmlFor="ev-f-kind">ประเภท</label>
                <select id="ev-f-kind" className="aq-input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })} data-testid="ev-f-kind">
                  {KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}
                </select></div>
              <div className="aq-field"><label htmlFor="ev-f-pdca">ขั้น PDCA</label>
                <select id="ev-f-pdca" className="aq-input" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })}>
                  {(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}
                </select></div>
              <div className="aq-field"><label htmlFor="ev-f-year">ปีการศึกษา (พ.ศ.)</label>
                <input id="ev-f-year" className="aq-input" type="number" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></div>
            </div>
          </details>

          <div className="aq-actions">
            <button className="aq-btn aq-btn-primary" disabled={busy} aria-busy={busy || undefined} data-testid="ev-submit">
              {busy ? <><span className="aq-spinner" aria-hidden="true" />กำลังบันทึก…</> : 'บันทึกหลักฐาน'}
            </button>
            <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
          </div>
        </form>
      )}

      <Async q={list} skeleton="table">{rows => rows.length === 0 ? (
        (q || extraFilters)
          ? <Empty icon="search" title="ยังไม่มีหลักฐานตามเงื่อนไขนี้" text="ลองล้างตัวกรอง"
              action={<button type="button" className="aq-btn" onClick={clearFilters}>ล้างตัวกรอง</button>} />
          : <Empty icon="folder" title="ยังไม่มีหลักฐานตามเงื่อนไขนี้" text="เพิ่มหลักฐานชิ้นแรก เช่น รายงานการประชุม แผนพัฒนา หรือผลสำรวจ"
              action={canWrite && !open ? <button type="button" className="aq-btn aq-btn-primary" onClick={openForm}><Icon name="plus" size={20} />เพิ่มหลักฐาน</button> : undefined} />
      ) : (
        <div className="aq-card">
          <div className="aq-table-wrap">
            <table className="aq-table aq-table--stack" data-testid="ev-table">
              <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ประเภท</th><th>PDCA</th><th>ปี</th><th>ข้อที่ผูก</th><th>สถานะ</th></tr></thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} data-testid={`ev-row-${e.code}`} data-row-id={e.id} className={newId === e.id ? 'aq-row-new' : undefined}>
                    <td data-label="รหัส">
                      <span>
                        <Link className="aq-link aq-code" href={`/app/evidence/${e.id}${cycleId ? `?cycle=${cycleId}` : ''}`}><strong>{e.code}</strong></Link>
                        {e.code.startsWith('E-0.0') && <Term k="evidence_code" label="รหัส E-0.0" />}
                      </span>
                    </td>
                    <td data-label="ชื่อ">{e.title}{e.containsPii && !e.piiResolved && <> <Badge tone="bad" title="พบข้อมูลส่วนบุคคล">PII</Badge></>}</td>
                    <td data-label="ประเภท">{KIND_TH[e.kind]}</td>
                    <td data-label="PDCA">{e.pdcaStage}</td>
                    <td data-label="ปี" className="aq-tnum">{e.academicYear}</td>
                    <td data-label="ข้อที่ผูก">{e.requirementIds.length ? e.requirementIds.join(', ') : <span className="aq-muted">ยังไม่ผูก</span>}</td>
                    <td data-label="สถานะ"><EvidenceStatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}</Async>
    </>
  );
}

export default function EvidencePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
