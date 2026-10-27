'use client';

/**
 * คลังหลักฐาน (saas-spec §P10 + friendly-spec §F13 — earth: การ์ด rounded-xl, ตาราง C5 + การ์ดย่อยบนมือถือ, dropzone §C2)
 * - ev-new ใน PageHeader · toolbar หลัก (หลักสูตร/รอบ/ค้นหา) + "ตัวกรองเพิ่มเติม (n)" พับไว้
 * - ฟอร์ม 3 ช่อง: ① ชื่อ ② แนบ (dropzone / ลิงก์ / ข้อความ อย่างน้อย 1) ③ ผูกกับข้อ (ev-f-cycle + RequirementPicker)
 *   + รายละเอียดเพิ่มเติมพับไว้ · inline validate + error summary (P4) · แจ้งไฟล์ใหญ่ (P9) · บรรทัด "บันทึกเข้าหลักสูตร" (UX-8)
 * - สำเร็จ: ปิดฟอร์ม + toast + ไฮไลต์แถวใหม่ (L5) + scrollIntoView · PII = dialog notify "รับทราบ" (เดิม)
 * - query: ?new=1 เปิดฟอร์ม · &cycle= รอบ · &req= ใส่ chip · ?pii=1 ติ๊กตัวกรอง PII และเปิดตัวกรองเพิ่มเติม
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AunqaError, MAX_DATAURL_BYTES, can, createEvidence, getProgramme, isSectionEditable, listEvidence, listRequirements, listSections,
  programmeScope, readFileInput, validateFileMeta,
} from '@/lib/api';
import type { AppUser, EvidenceKind, PdcaStage } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, Badge, Empty, EvidenceStatusBadge, InlineMessage, PageHeader, useLoad } from '@/components/aunqa/common';
import { useScope } from '@/components/aunqa/useScope';
import RequirementPicker from '@/components/aunqa/RequirementPicker';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { Button, buttonVariants } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Textarea } from '@/components/ui/primitives/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { cn } from '@/lib/ui/cn';
import { KIND_LIST, KIND_TH, PDCA_TH, errMsg, isAssessorOnly } from '@/lib/ui/aunqa';
import { notifyTodosChanged } from '@/lib/ui/todo';

const WRITABLE = ['draft', 'in_progress', 'revision_requested'];
type Errors = { title?: string; attach?: string; url?: string; file?: string; reqs?: string; api?: string };

/** R2-F12: ข้อในรอบที่ล็อก (ส่งตรวจ/อนุมัติแล้ว) → เหตุผล — ตรงกับ assertSectionEditable ฝั่ง API (isSectionEditable) */
function sectionLocks(user: AppUser, cycleId: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!cycleId) return out;
  try {
    for (const s of listSections(user, cycleId)) {
      if (!isSectionEditable(s)) out.set(s.requirementId, s.status === 'approved' ? 'อนุมัติแล้ว' : 'ส่งตรวจแล้ว');
    }
  } catch { /* อ่านรอบนี้ไม่ได้ — ปล่อยให้ API ตัดสินตอนบันทึก */ }
  return out;
}
const blockedMsg = (ids: string[]) => `ผูกไม่ได้: ${ids.join(', ')} — ข้อที่ส่งตรวจหรืออนุมัติแล้วเปลี่ยนหลักฐานไม่ได้ เอาข้อนั้นออกจากรายการก่อน`;

// ─── หน้าตา (saas-spec §C2, §C5 + friendly-spec §F13) ───
const CARD = 'rounded-xl border bg-card p-5 text-card-foreground shadow-sm dark:shadow-none md:p-6';
const LABEL = 'text-base font-medium text-foreground';
const CHECK_ROW = 'flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground';
const CHECK_INPUT = 'h-5 w-5 shrink-0 accent-primary';
/** ตาราง C5: กรอบตาราง (container `tbl`) ≤ 51rem ทุกแถวเป็นการ์ดย่อย ป้ายคอลัมน์จาก data-label (container query หน่วย rem — R2-F14; min-content ≈ 48.6rem) */
const STACK_TABLE = '[@container_tbl_(max-width:51rem)]:block';
const STACK_HEAD = '[@container_tbl_(max-width:51rem)]:sr-only';
const STACK_BODY = '[@container_tbl_(max-width:51rem)]:block';
const STACK_ROW = '[@container_tbl_(max-width:51rem)]:block [@container_tbl_(max-width:51rem)]:p-4';
const STACK_CELL = '[@container_tbl_(max-width:51rem)]:block [@container_tbl_(max-width:51rem)]:px-0 [@container_tbl_(max-width:51rem)]:py-1 [@container_tbl_(max-width:51rem)]:before:block [@container_tbl_(max-width:51rem)]:before:text-sm [@container_tbl_(max-width:51rem)]:before:font-medium [@container_tbl_(max-width:51rem)]:before:text-muted-foreground [@container_tbl_(max-width:51rem)]:before:content-[attr(data-label)]';

/** เลขขั้นของฟอร์ม (① ② ③) — ตกแต่ง ซ่อนจาก screen reader */
function StepNo({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-muted font-semibold tabular-nums text-primary" aria-hidden="true">{n}</span>
  );
}

/** ข้อความผิดพลาดใต้ช่อง (saas-spec §C2: ไอคอน x-circle 16 + "ข้อผิดพลาด:" สำหรับ screen reader) */
function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p className="aq-field-error m-0 flex items-start gap-1.5" id={id}>
      <Icon name="x-circle" size={16} className="mt-0.5" /><span className="sr-only">ข้อผิดพลาด:</span><span>{children}</span>
    </p>
  );
}

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
  const [over, setOver] = useState(false); // ลากไฟล์อยู่เหนือ dropzone
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lockTick, setLockTick] = useState(0); // เพิ่มเมื่อ API ตอบ locked → อ่านสถานะข้อใหม่
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formLocks = useMemo(() => (open ? sectionLocks(user, formCycle) : new Map<string, string>()), [user.id, formCycle, open, lockTick]);
  const blockedReqs = formCycle ? reqIds.filter(id => formLocks.has(id)) : [];

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
    if (blockedReqs.length) e.reqs = blockedMsg(blockedReqs);
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
      if (err instanceof AunqaError && err.code === 'locked' && formCycle) {
        // สถานะข้อเปลี่ยนระหว่างกรอก → บอกรหัสข้อที่ล็อก + รีเฟรชป้ายใน picker
        const now = reqIds.filter(id => sectionLocks(user, formCycle).has(id));
        setLockTick(t => t + 1);
        setErrors(now.length
          ? { reqs: `ผูกไม่ได้: ${now.join(', ')} — ข้อนี้เพิ่งถูกส่งตรวจหรืออนุมัติระหว่างที่คุณกรอก เอาข้อนั้นออกจากรายการแล้วบันทึกอีกครั้ง` }
          : { api: errMsg(err) });
      } else {
        setErrors({ api: errMsg(err) });
      }
      setTimeout(() => summaryRef.current?.focus(), 0);
    } finally { setBusy(false); }
  }

  function clearFilters() { setQ(''); setYear(''); setKind(''); setStage(''); setPiiOnly(false); setReqFilter(''); }

  const errList = (Object.entries(errors) as [keyof Errors, string | undefined][]).filter(([, m]) => m);
  const fieldOf: Record<keyof Errors, string> = { title: 'ev-f-title', attach: 'ev-f-attach', url: 'ev-f-url', file: 'ev-f-file', reqs: 'ev-f-reqs-field', api: 'ev-f-title' };

  return (
    <>
      <PageHeader
        title="คลังหลักฐาน"
        sub={<>หลักฐานชิ้นเดียวผูกได้หลายข้อ โดยไม่ต้องคัดลอก — รหัส E-x.x-nn ใช้อ้างอิงใน SAR <Term k="evidence_code" label="รหัสหลักฐาน" /></>}
        actions={canWrite && !open ? (
          <Button onClick={openForm} data-testid="ev-new"><Icon name="plus" size={20} />เพิ่มหลักฐาน</Button>
        ) : undefined}
      />

      {/* แถบเครื่องมือ (saas-spec §P10) */}
      <div className={cn(CARD, 'mb-4 flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center md:py-4')}>
        <NativeSelect wrapperClassName="md:w-64" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="ev-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </NativeSelect>
        <NativeSelect wrapperClassName="md:w-48" value={cycleId} onChange={e => setCycleId(e.target.value)} aria-label="รอบประเมิน" data-testid="ev-cycle">
          {!assessor && <option value="">ทุกรอบ / ไม่ระบุรอบ</option>}
          {cycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
        </NativeSelect>
        <div className="relative min-w-0 md:w-80 md:flex-1 lg:flex-none">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" type="search" placeholder="ค้นหาชื่อ/รหัส/เนื้อหา…" aria-label="ค้นหาหลักฐาน" value={q} onChange={e => setQ(e.target.value)} data-testid="ev-search" />
        </div>
        <Button variant="outline" className={cn('md:ml-auto', moreOpen && 'border-primary bg-primary-muted')} aria-expanded={moreOpen} aria-controls="ev-more" onClick={() => setMoreOpen(o => !o)}>
          <Icon name="filter" size={20} />ตัวกรองเพิ่มเติม{extraFilters ? ` (${extraFilters})` : ''}
        </Button>
      </div>
      {moreOpen && (
        <div id="ev-more" className={cn(CARD, 'mb-4 grid animate-fade-in items-end gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
          <div className="space-y-1.5"><label htmlFor="ev-year" className={LABEL}>ปีการศึกษา</label>
            <Input id="ev-year" type="number" placeholder="พ.ศ." value={year} onChange={e => setYear(e.target.value)} data-testid="ev-year" /></div>
          <div className="space-y-1.5"><label htmlFor="ev-kind" className={LABEL}>ประเภท</label>
            <NativeSelect id="ev-kind" value={kind} onChange={e => setKind(e.target.value as EvidenceKind | '')} data-testid="ev-kind">
              <option value="">ทุกประเภท</option>{KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}
            </NativeSelect></div>
          <div className="space-y-1.5"><label htmlFor="ev-pdca" className={LABEL}>ขั้น PDCA</label>
            <NativeSelect id="ev-pdca" value={stage} onChange={e => setStage(e.target.value as PdcaStage | '')} data-testid="ev-pdca">
              <option value="">PDCA ทั้งหมด</option>{(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}
            </NativeSelect></div>
          <div className="space-y-1.5"><label htmlFor="ev-req" className={LABEL}>ข้อ</label>
            <NativeSelect id="ev-req" value={reqFilter} onChange={e => setReqFilter(e.target.value)} disabled={!cycleId} data-testid="ev-req">
              <option value="">ทุกข้อ</option>{reqs.map(r => <option key={r.id} value={r.id}>ข้อ {r.id}</option>)}
            </NativeSelect></div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2 lg:col-span-4">
            <label className={CHECK_ROW}><input type="checkbox" className={CHECK_INPUT} checked={piiOnly} onChange={e => setPiiOnly(e.target.checked)} data-testid="ev-pii" /> เฉพาะที่พบ PII</label>
            <Button variant="ghost" onClick={clearFilters}>ล้างตัวกรอง</Button>
          </div>
        </div>
      )}

      {canWrite && open && (
        <form className={cn(CARD, 'mb-6 animate-fade-in space-y-6')} onSubmit={submit} noValidate data-testid="ev-form" aria-labelledby="ev-form-h">
          <h2 id="ev-form-h" className="m-0 text-xl font-semibold text-foreground">เพิ่มหลักฐานใหม่</h2>
          {errList.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive-muted p-4 text-foreground" role="alert" tabIndex={-1} ref={summaryRef} data-testid="ev-error-summary">
              <Icon name="x-circle" size={20} className="mt-0.5 text-destructive" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="m-0 font-medium text-foreground">{`ยังบันทึกไม่ได้ — โปรดแก้ ${errList.length} จุด`}</p>
                <ul className="m-0 list-disc space-y-1 pl-5 text-base">{errList.map(([k, m]) => <li key={k}><a className="text-foreground" href={`#${fieldOf[k]}`}>{m}</a></li>)}</ul>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="ev-f-title" className={cn(LABEL, 'flex items-center gap-2')}><StepNo n={1} />ชื่อหลักฐาน *</label>
            <Input id="ev-f-title" maxLength={200} value={f.title} aria-required="true"
              aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? 'ev-f-title-err' : undefined}
              onChange={e => { setF({ ...f, title: e.target.value }); if (errors.title && e.target.value.trim()) setErrors(x => ({ ...x, title: undefined })); }} data-testid="ev-title" />
            {errors.title && <FieldError id="ev-f-title-err">{errors.title}</FieldError>}
          </div>

          <fieldset className="m-0 min-w-0 space-y-4 border-0 p-0" id="ev-f-attach" aria-describedby={errors.attach ? 'ev-f-attach-err' : undefined}>
            <legend className={cn(LABEL, 'mb-1.5 flex items-center gap-2 p-0')}><StepNo n={2} />แนบหลักฐาน * (อย่างน้อย 1 อย่าง)</legend>
            {errors.attach && <FieldError id="ev-f-attach-err">{errors.attach}</FieldError>}
            {!file ? (
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 px-6 py-8 text-center text-foreground transition-colors duration-fast hover:bg-muted focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                  over && 'border-primary bg-primary-muted',
                )}
                id="ev-f-file"
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={e => { e.preventDefault(); setOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary shadow-sm dark:shadow-none" aria-hidden="true"><Icon name="upload" size={24} /></span>
                <span><strong className="font-semibold">ลากไฟล์มาวาง หรือ เลือกไฟล์</strong></span>
                <span className="aq-help">PDF, DOCX, XLSX, PNG, JPG, TXT, CSV ไม่เกิน 50 MB</span>
                <input ref={fileRef} type="file" className="sr-only" onChange={e => pickFile(e.target.files?.[0] ?? null)} data-testid="ev-file"
                  aria-invalid={errors.file ? true : undefined} />
              </label>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground" aria-hidden="true"><Icon name="file-text" size={20} /></span>
                <span className="min-w-0 flex-1 break-words text-base text-foreground"><strong className="font-semibold">{file.name}</strong> · {fmtSize(file.size)}</span>
                <label className={cn(buttonVariants({ variant: 'outline', size: 'compact' }), 'cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring')}>เปลี่ยนไฟล์
                  <input type="file" className="sr-only" onChange={e => pickFile(e.target.files?.[0] ?? null)} data-testid="ev-file" />
                </label>
                <Button variant="ghost" size="compact" onClick={() => pickFile(null)}>เอาออก</Button>
              </div>
            )}
            {file && file.size > MAX_DATAURL_BYTES && (
              <InlineMessage tone="info">ไฟล์ใหญ่กว่า 1 MB: ระบบเดโม่เก็บเฉพาะชื่อไฟล์ ขนาด และลายนิ้วมือ (hash) ไม่เก็บตัวไฟล์ จึงเปิดดาวน์โหลดภายหลังไม่ได้</InlineMessage>
            )}
            {errors.file && <FieldError>{errors.file}</FieldError>}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="ev-f-url" className={LABEL}>หรือ ลิงก์</label>
                <Input id="ev-f-url" type="url" placeholder="https://…" value={f.url}
                  aria-invalid={errors.url ? true : undefined} onChange={e => { setF({ ...f, url: e.target.value }); if (errors.url || errors.attach) setErrors(x => ({ ...x, url: undefined, attach: undefined })); }} />
                {errors.url && <FieldError>{errors.url}</FieldError>}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="ev-f-text" className={LABEL}>หรือ วางข้อความ</label>
                <p className="aq-help m-0">ระบบใช้ตรวจข้อมูลส่วนบุคคลและให้ AI แนะนำข้อ</p>
                <Textarea id="ev-f-text" rows={3} value={f.text} onChange={e => { setF({ ...f, text: e.target.value }); if (errors.attach && e.target.value.trim()) setErrors(x => ({ ...x, attach: undefined })); }} data-testid="ev-text" />
              </div>
            </div>
          </fieldset>

          <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
            <legend className={cn(LABEL, 'mb-1.5 flex items-center gap-2 p-0')}><StepNo n={3} />ผูกกับข้อ</legend>
            <p className="aq-meta m-0">บันทึกเข้าหลักสูตร: {prog?.code} — {prog?.nameTh}</p>
            {writableCycles.length === 0 ? (
              <InlineMessage tone="info">ยังไม่มีรอบที่เปิดเขียน — บันทึกหลักฐานไว้ในคลังก่อน แล้วผูกกับข้อภายหลังจากหน้าข้อได้</InlineMessage>
            ) : (
              <div className="grid items-start gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="space-y-1.5">
                  <label htmlFor="ev-f-cycle" className={LABEL}>รอบ</label>
                  <NativeSelect id="ev-f-cycle" value={formCycle} onChange={e => setFormCycle(e.target.value)} data-testid="ev-f-cycle">
                    <option value="">— ไม่ผูกรอบ —</option>
                    {writableCycles.map(c => <option key={c.id} value={c.id}>รอบ {c.academicYear}</option>)}
                  </NativeSelect>
                </div>
                <div id="ev-f-reqs-field" className="min-w-0 space-y-2">
                  <RequirementPicker
                    label="ข้อที่เกี่ยวข้อง" value={reqIds} disabled={!formCycle} locked={formLocks}
                    onChange={ids => { setReqIds(ids); if (errors.reqs && !ids.some(id => formLocks.has(id))) setErrors(x => ({ ...x, reqs: undefined })); }}
                    disabledHint="เลือกรอบประเมินในช่อง “รอบ” ก่อน จึงจะผูกข้อได้"
                    help="ไม่ผูกตอนนี้ก็ได้ ภายหลังผูกจากหน้าข้อได้ — รหัสจะเป็น E-0.0-nn"
                  />
                  {blockedReqs.length > 0 && (
                    <InlineMessage tone="warn" testId="ev-f-req-blocked">{blockedMsg(blockedReqs)}</InlineMessage>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          <details className="group rounded-lg border bg-card">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">รายละเอียดเพิ่มเติม (ไม่บังคับ)</span>
              <Icon name="chevron-down" size={20} className="text-muted-foreground transition-transform duration-fast group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t p-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-3">
                <label htmlFor="ev-f-desc" className={LABEL}>คำอธิบาย</label>
                <Textarea id="ev-f-desc" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
              </div>
              <div className="space-y-1.5"><label htmlFor="ev-f-kind" className={LABEL}>ประเภท</label>
                <NativeSelect id="ev-f-kind" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as EvidenceKind })} data-testid="ev-f-kind">
                  {KIND_LIST.map(k => <option key={k} value={k}>{KIND_TH[k]}</option>)}
                </NativeSelect></div>
              <div className="space-y-1.5"><label htmlFor="ev-f-pdca" className={LABEL}>ขั้น PDCA</label>
                <NativeSelect id="ev-f-pdca" value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as PdcaStage })}>
                  {(['P', 'D', 'C', 'A'] as PdcaStage[]).map(s => <option key={s} value={s}>{PDCA_TH[s]}</option>)}
                </NativeSelect></div>
              <div className="space-y-1.5"><label htmlFor="ev-f-year" className={LABEL}>ปีการศึกษา (พ.ศ.)</label>
                <Input id="ev-f-year" type="number" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></div>
            </div>
          </details>

          <div className="flex flex-wrap gap-2 border-t pt-5">
            <Button type="submit" disabled={busy} aria-busy={busy || undefined} data-testid="ev-submit">
              {busy ? <><Icon name="loader" size={16} className="animate-spin" />กำลังบันทึก…</> : 'บันทึกหลักฐาน'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
          </div>
        </form>
      )}

      <Async q={list} skeleton="table">{rows => rows.length === 0 ? (
        (q || extraFilters)
          ? <Empty icon="search" title="ยังไม่มีหลักฐานตามเงื่อนไขนี้" text="ลองล้างตัวกรอง"
              action={<Button variant="outline" onClick={clearFilters}>ล้างตัวกรอง</Button>} />
          : <Empty icon="folder" title="ยังไม่มีหลักฐานตามเงื่อนไขนี้" text="เพิ่มหลักฐานชิ้นแรก เช่น รายงานการประชุม แผนพัฒนา หรือผลสำรวจ"
              action={canWrite && !open ? <Button onClick={openForm}><Icon name="plus" size={20} />เพิ่มหลักฐาน</Button> : undefined} />
      ) : (
        <Table className={STACK_TABLE} wrapperClassName="[container-type:inline-size] [container-name:tbl] rounded-xl shadow-sm dark:shadow-none" data-testid="ev-table">
          <TableHeader className={STACK_HEAD}>
            <TableRow><TableHead>รหัส</TableHead><TableHead>ชื่อ</TableHead><TableHead>ประเภท</TableHead><TableHead>PDCA</TableHead><TableHead>ปี</TableHead><TableHead>ข้อที่ผูก</TableHead><TableHead>สถานะ</TableHead></TableRow>
          </TableHeader>
          <TableBody className={STACK_BODY}>
            {rows.map(e => (
              <TableRow key={e.id} data-testid={`ev-row-${e.code}`} data-row-id={e.id} className={cn(STACK_ROW, newId === e.id && 'animate-highlight')}>
                <TableCell data-label="รหัส" className={cn(STACK_CELL, 'whitespace-nowrap')}>
                  <span className="inline-flex items-center">
                    <Link className="font-medium tabular-nums text-primary" href={`/app/evidence/${e.id}${cycleId ? `?cycle=${cycleId}` : ''}`}><strong>{e.code}</strong></Link>
                    {e.code.startsWith('E-0.0') && <Term k="evidence_code" label="รหัส E-0.0" />}
                  </span>
                </TableCell>
                <TableCell data-label="ชื่อ" className={cn(STACK_CELL, '[@container_tbl_(min-width:51.01rem)]:min-w-[14rem]')}>{e.title}{e.containsPii && !e.piiResolved && <> <Badge tone="bad" title="พบข้อมูลส่วนบุคคล">PII</Badge></>}</TableCell>
                <TableCell data-label="ประเภท" className={STACK_CELL}>{KIND_TH[e.kind]}</TableCell>
                <TableCell data-label="PDCA" className={STACK_CELL}>{e.pdcaStage}</TableCell>
                <TableCell data-label="ปี" className={cn(STACK_CELL, 'tabular-nums')}>{e.academicYear}</TableCell>
                <TableCell data-label="ข้อที่ผูก" className={cn(STACK_CELL, 'tabular-nums')}>{e.requirementIds.length ? e.requirementIds.join(', ') : <span className="text-muted-foreground">ยังไม่ผูก</span>}</TableCell>
                <TableCell data-label="สถานะ" className={cn('[@container_tbl_(min-width:51.01rem)]:min-w-max', STACK_CELL)}><EvidenceStatusBadge status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}</Async>
    </>
  );
}

export default function EvidencePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
