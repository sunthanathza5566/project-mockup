'use client';

import { Fragment, useState } from 'react';
import {
  acceptAiRun, can, createClo, createCourse, createPlo, deleteClo, deleteCourse, deletePlo, getCurriculum,
  getCurriculumGaps, getCurriculumMatrix, programmeScope, runVerbChecker, setCloPloMap, updateClo, updateCourse, updatePlo,
} from '@/lib/api';
import type { AiRun, AppUser, Clo, Course, CurriculumData, MapLevel, Plo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, Empty, ModelBadge, PageHeader, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import Term from '@/components/ui/Term';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { Textarea } from '@/components/ui/primitives/textarea';
import { useScope } from '@/components/aunqa/useScope';
import { cn } from '@/lib/ui/cn';
import { MATRIX_LEVEL } from '@/lib/ui/tone';
import { BLOOM_TH, MAP_LEVEL_TH, errMsg, gapTextTh, truncateTh } from '@/lib/ui/aunqa';

type Tab = 'plo' | 'course' | 'matrix' | 'heat' | 'gaps' | 'prereq' | 'ai';
const TABS: [Tab, string][] = [
  ['plo', 'PLO'], ['course', 'รายวิชาและ CLO'], ['matrix', 'Matrix CLO→PLO'], ['heat', 'Heatmap วิชา×PLO'],
  ['gaps', 'ช่องว่างหลักสูตร'], ['prereq', 'ผัง prerequisite'], ['ai', 'ตรวจคำกริยา Bloom (AI)'],
];

/** §F13 การ์ด rounded-xl + ระยะใน p-5 md:p-6 */
const CARD = 'rounded-xl border bg-card p-5 shadow-sm dark:shadow-none md:p-6';
/** ตารางในหน้านี้: กรอบ rounded-xl + เงาเหมือนการ์ด */
const TABLE_WRAP = 'rounded-xl shadow-sm dark:shadow-none';
/** saas-spec §C11 แท็บเส้นใต้ */
const TAB_BTN =
  '-mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-base font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground aria-selected:border-primary aria-selected:text-foreground';
const FIELD = 'grid min-w-0 gap-1.5';
const LABEL = 'font-medium text-foreground';
const CHECK = 'flex min-h-11 cursor-pointer items-center gap-3 text-foreground';
const CHECK_BOX = 'h-5 w-5 shrink-0 accent-primary';
/** ช่องระดับ I/R/M (Badge MATRIX_LEVEL — ตัวอักษรเสมอ ไม่พึ่งสีอย่างเดียว) */
const LEVEL_CHIP = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-semibold';

/**
 * หลักสูตร (ADR-UI-001 pages.md P12 · saas-spec §P12 · friendly-spec §F13): PLO / รายวิชา / CLO / matrix I-R-M / heatmap / gap / prerequisite / AI-7
 * แท็บเส้นใต้ (C11) + ตัวเลขช่องว่างในแท็บ · I/R/M = MATRIX_LEVEL + ตัวอักษรเสมอ · matrix อยู่ใน wrapper `aq-matrix` · คง testid เดิมทั้งหมด
 */
export default function CurriculumPage() {
  const { user, programmes, programmeId, setProgrammeId } = useScope();
  const [tab, setTab] = useState<Tab>('plo');
  const canWrite = !!programmeId && can(user, 'curriculum.write', programmeScope(programmeId));
  const q = useLoad(() => {
    if (!programmeId) return null;
    return { cur: getCurriculum(user, programmeId), gaps: getCurriculumGaps(user, programmeId), matrix: getCurriculumMatrix(user, programmeId) };
  }, [user.id, programmeId]);

  return (
    <>
      <PageHeader title="หลักสูตร (PLO · รายวิชา · CLO)" sub={<>ผูก <Term k="clo">CLO</Term> เข้ากับ <Term k="plo">PLO</Term> ระดับ <Term k="irm">I/R/M</Term> แล้วระบบตรวจช่องว่างให้อัตโนมัติ (ผลไปที่ข้อ 1.2, 2.4, 2.5, 4.1 ในแดชบอร์ดรอบประเมิน)</>} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <NativeSelect wrapperClassName="w-full sm:w-auto sm:min-w-[20rem]" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="cur-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </NativeSelect>
        {!canWrite && <Badge icon="eye">ดูอย่างเดียว</Badge>}
      </div>
      <div className="mb-6 flex flex-wrap gap-x-1 border-b" role="tablist" aria-label="ส่วนของหลักสูตร">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-controls="cur-panel" onClick={() => setTab(k)} data-testid={`cur-tab-${k}`} className={TAB_BTN}>
            {l}{k === 'gaps' && q.data ? <span className="aq-count bg-muted text-foreground">{q.data.gaps.length}</span> : null}
          </button>
        ))}
      </div>
      <Async q={q}>{d => !d ? <Empty icon="book-open" title="ยังไม่มีหลักสูตรที่เข้าถึงได้" /> : (
        <div id="cur-panel" role="tabpanel" className="space-y-6" data-testid={`cur-panel-${tab}`}>
          {tab === 'plo' && <PloTab user={user} programmeId={programmeId} cur={d.cur} canWrite={canWrite} reload={q.reload} />}
          {tab === 'course' && <CourseTab user={user} programmeId={programmeId} cur={d.cur} canWrite={canWrite} reload={q.reload} />}
          {tab === 'matrix' && <MatrixTab user={user} cur={d.cur} canWrite={canWrite} reload={q.reload} />}
          {tab === 'heat' && <HeatTab cur={d.cur} matrix={d.matrix} />}
          {tab === 'gaps' && <GapTab gaps={d.gaps} />}
          {tab === 'prereq' && <PrereqTab cur={d.cur} />}
          {tab === 'ai' && <AiTab user={user} programmeId={programmeId} cur={d.cur} canWrite={canWrite} reload={q.reload} />}
        </div>
      )}</Async>
    </>
  );
}

type Reload = () => void;
interface TabProps { user: AppUser; cur: CurriculumData; canWrite: boolean; reload: Reload }

function useAct(reload: Reload) {
  const { showToast } = useToast();
  return (fn: () => void, ok: string) => {
    try { fn(); showToast(ok, 'success'); reload(); return true; } catch (e) { showToast(errMsg(e), 'error'); return false; }
  };
}

/** ปุ่มแก้/ลบในแถว (outline compact + ghost icon) */
function RowActions({ onEdit, onDelete, delLabel }: { onEdit: () => void; onDelete: () => void; delLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="compact" onClick={onEdit}><Icon name="pencil" size={20} />แก้</Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label={delLabel} title="ลบ"><Icon name="trash" size={20} /></Button>
    </div>
  );
}

// ───────────── PLO ─────────────
function PloTab({ user, programmeId, cur, canWrite, reload }: TabProps & { programmeId: string }) {
  const act = useAct(reload);
  const { confirm } = useDialog();
  const [edit, setEdit] = useState<Plo | 'new' | null>(null);
  const [f, setF] = useState({ code: '', textTh: '', textEn: '', type: 'specific' as Plo['type'], bloom: '3' });
  function open(p: Plo | 'new') {
    setEdit(p);
    setF(p === 'new'
      ? { code: `PLO${cur.plos.length + 1}`, textTh: '', textEn: '', type: 'specific', bloom: '3' }
      : { code: p.code, textTh: p.textTh, textEn: p.textEn, type: p.type, bloom: String(p.bloomLevel) });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { code: f.code, textTh: f.textTh, textEn: f.textEn, type: f.type, bloomLevel: Number(f.bloom) };
    const ok = edit === 'new'
      ? act(() => { createPlo(user, { programmeId, ...body }); }, 'เพิ่ม PLO แล้ว')
      : act(() => { updatePlo(user, (edit as Plo).id, body); }, 'บันทึก PLO แล้ว');
    if (ok) setEdit(null);
  }
  async function del(p: Plo) {
    if (!(await confirm({ title: 'ลบ PLO', message: `ลบ ${p.code}? การผูก CLO กับ PLO นี้จะถูกลบด้วย`, variant: 'danger', confirmText: 'ลบ' }))) return;
    act(() => deletePlo(user, p.id), 'ลบแล้ว');
  }
  return (
    <>
      {canWrite && !edit && <div className="flex flex-wrap gap-2"><Button onClick={() => open('new')} data-testid="plo-new"><Icon name="plus" size={20} />เพิ่ม PLO</Button></div>}
      {edit && (
        <form className={cn(CARD, 'animate-fade-in space-y-5')} onSubmit={submit} data-testid="plo-form">
          <h2 className="m-0 text-lg font-semibold text-foreground">{edit === 'new' ? 'เพิ่ม PLO' : `แก้ ${edit.code}`}</h2>
          <label className={cn(FIELD, 'max-w-[16rem]')}><span className={LABEL}>รหัส</span><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required data-testid="plo-code" /></label>
          <label className={FIELD}><span className={LABEL}>ผลลัพธ์การเรียนรู้ (ไทย)</span><Textarea rows={2} value={f.textTh} onChange={e => setF({ ...f, textTh: e.target.value })} required data-testid="plo-th" /></label>
          <label className={FIELD}><span className={LABEL}>English</span><Textarea rows={2} value={f.textEn} onChange={e => setF({ ...f, textEn: e.target.value })} lang="en" /></label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className={FIELD}><span className={LABEL}>ประเภท</span>
              <NativeSelect value={f.type} onChange={e => setF({ ...f, type: e.target.value as Plo['type'] })}>
                <option value="generic">ทั่วไป (generic)</option><option value="specific">เฉพาะสาขา (specific)</option>
              </NativeSelect>
            </label>
            <label className={FIELD}><span className={LABEL}>ระดับ Bloom</span>
              <NativeSelect value={f.bloom} onChange={e => setF({ ...f, bloom: e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{BLOOM_TH[n]}</option>)}
              </NativeSelect>
            </label>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" data-testid="plo-save">บันทึก</Button><Button variant="ghost" onClick={() => setEdit(null)}>ยกเลิก</Button></div>
        </form>
      )}
      {cur.plos.length === 0 ? <Empty icon="list-check" title="ยังไม่มี PLO" text="เพิ่ม PLO ข้อแรกเพื่อเริ่มผูกรายวิชา" /> : (
        <Table data-testid="plo-table" wrapperClassName={TABLE_WRAP}>
          <TableHeader><tr><TableHead>รหัส</TableHead><TableHead>ข้อความ</TableHead><TableHead>ประเภท</TableHead><TableHead>Bloom</TableHead>{canWrite && <TableHead><span className="sr-only">การกระทำ</span></TableHead>}</tr></TableHeader>
          <TableBody>
            {cur.plos.map(p => (
              <TableRow key={p.id} data-testid={`plo-${p.code}`}>
                <TableCell className="whitespace-nowrap"><strong>{p.code}</strong></TableCell>
                <TableCell className="min-w-[18rem]"><p className="m-0 text-foreground">{p.textTh}</p>{p.textEn && <p className="aq-meta m-0" lang="en">{p.textEn}</p>}</TableCell>
                <TableCell className="whitespace-nowrap">{p.type === 'generic' ? 'ทั่วไป' : 'เฉพาะสาขา'}</TableCell>
                <TableCell className="whitespace-nowrap">{BLOOM_TH[p.bloomLevel]}</TableCell>
                {canWrite && <TableCell><RowActions onEdit={() => open(p)} onDelete={() => del(p)} delLabel={`ลบ ${p.code}`} /></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

// ───────────── Course + CLO ─────────────
function CourseTab({ user, programmeId, cur, canWrite, reload }: TabProps & { programmeId: string }) {
  const act = useAct(reload);
  const { confirm } = useDialog();
  const [edit, setEdit] = useState<Course | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ code: '', nameTh: '', credits: '3', year: '1', semester: '1', category: '', isElective: false, pre: [] as string[] });
  function openForm(c: Course | 'new') {
    setEdit(c);
    setF(c === 'new'
      ? { code: '', nameTh: '', credits: '3', year: '1', semester: '1', category: '', isElective: false, pre: [] }
      : { code: c.code, nameTh: c.nameTh, credits: String(c.credits), year: String(c.year), semester: String(c.semester), category: c.category, isElective: c.isElective, pre: c.prerequisiteIds });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { code: f.code, nameTh: f.nameTh, credits: Number(f.credits), year: Number(f.year), semester: Number(f.semester), category: f.category, isElective: f.isElective, prerequisiteIds: f.pre };
    const ok = edit === 'new'
      ? act(() => { createCourse(user, { programmeId, ...body }); }, 'เพิ่มรายวิชาแล้ว')
      : act(() => { updateCourse(user, (edit as Course).id, body); }, 'บันทึกรายวิชาแล้ว');
    if (ok) setEdit(null);
  }
  async function del(c: Course) {
    if (!(await confirm({ title: 'ลบรายวิชา', message: `ลบ ${c.code} ${c.nameTh}? CLO และวิธีสอน/วัดผลของวิชานี้จะถูกลบด้วย`, variant: 'danger', confirmText: 'ลบ' }))) return;
    act(() => deleteCourse(user, c.id), 'ลบแล้ว');
  }
  const sorted = [...cur.courses].sort((a, b) => a.year - b.year || a.semester - b.semester || a.code.localeCompare(b.code));
  return (
    <>
      {canWrite && !edit && <div className="flex flex-wrap gap-2"><Button onClick={() => openForm('new')} data-testid="course-new"><Icon name="plus" size={20} />เพิ่มรายวิชา</Button></div>}
      {edit && (
        <form className={cn(CARD, 'animate-fade-in space-y-5')} onSubmit={submit} data-testid="course-form">
          <h2 className="m-0 text-lg font-semibold text-foreground">{edit === 'new' ? 'เพิ่มรายวิชา' : `แก้ ${edit.code}`}</h2>
          <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)]">
            <label className={FIELD}><span className={LABEL}>รหัสวิชา</span><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required data-testid="course-code" /></label>
            <label className={FIELD}><span className={LABEL}>ชื่อวิชา</span><Input value={f.nameTh} onChange={e => setF({ ...f, nameTh: e.target.value })} required data-testid="course-name" /></label>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <label className={FIELD}><span className={LABEL}>หน่วยกิต</span><Input type="number" min={0} max={30} value={f.credits} onChange={e => setF({ ...f, credits: e.target.value })} /></label>
            <label className={FIELD}><span className={LABEL}>ชั้นปี</span><Input type="number" min={1} max={8} value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></label>
            <label className={FIELD}><span className={LABEL}>ภาคเรียน</span><Input type="number" min={1} max={3} value={f.semester} onChange={e => setF({ ...f, semester: e.target.value })} /></label>
            <label className={FIELD}><span className={LABEL}>หมวดวิชา</span><Input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></label>
          </div>
          <label className={CHECK}><input type="checkbox" className={CHECK_BOX} checked={f.isElective} onChange={e => setF({ ...f, isElective: e.target.checked })} /> วิชาเลือก</label>
          <fieldset className="m-0 min-w-0 rounded-lg border p-4">
            <legend className="px-1 font-medium text-foreground">วิชาที่ต้องเรียนก่อน (prerequisite)</legend>
            <div className="flex flex-wrap gap-x-5">
              {cur.courses.filter(c => edit === 'new' || c.id !== edit.id).map(c => (
                <label key={c.id} className={CHECK}><input type="checkbox" className={CHECK_BOX} checked={f.pre.includes(c.id)} onChange={e => setF({ ...f, pre: e.target.checked ? [...f.pre, c.id] : f.pre.filter(x => x !== c.id) })} /> {c.code}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2"><Button type="submit" data-testid="course-save">บันทึก</Button><Button variant="ghost" onClick={() => setEdit(null)}>ยกเลิก</Button></div>
        </form>
      )}
      {sorted.length === 0 ? <Empty icon="book-open" title="ยังไม่มีรายวิชา" /> : (
        <Table data-testid="course-table" wrapperClassName={TABLE_WRAP}>
          <TableHeader><tr><TableHead>รหัส</TableHead><TableHead>ชื่อวิชา</TableHead><TableHead className="text-right">หน่วยกิต</TableHead><TableHead>ปี/ภาค</TableHead><TableHead className="text-right">CLO</TableHead><TableHead><span className="sr-only">การกระทำ</span></TableHead></tr></TableHeader>
          <TableBody>
            {sorted.map(c => {
              const clos = cur.clos.filter(x => x.courseId === c.id);
              const isOpen = open === c.id;
              return (
                <Fragment key={c.id}>
                  <TableRow data-testid={`course-${c.code}`} className={cn(isOpen && 'bg-muted/40')}>
                    <TableCell className="whitespace-nowrap"><strong>{c.code}</strong></TableCell>
                    <TableCell className="min-w-[14rem]">{c.nameTh}{c.isElective && <> <Badge>เลือก</Badge></>}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.credits}</TableCell>
                    <TableCell className="tabular-nums">{c.year}/{c.semester}</TableCell>
                    <TableCell className="text-right tabular-nums">{clos.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button variant="outline" size="compact" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} data-testid={`course-toggle-${c.code}`}>
                          CLO<Icon name="chevron-down" size={16} className={cn('transition-transform duration-fast', isOpen && 'rotate-180')} />
                        </Button>
                        {canWrite && <>
                          <Button variant="outline" size="compact" onClick={() => openForm(c)}><Icon name="pencil" size={20} />แก้</Button>
                          <Button variant="ghost" size="icon" onClick={() => del(c)} aria-label={`ลบ ${c.code}`} title="ลบ"><Icon name="trash" size={20} /></Button>
                        </>}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && <tr className="border-t"><td colSpan={6} className="bg-muted/40 px-4 py-3"><CloList user={user} course={c} clos={clos} canWrite={canWrite} reload={reload} /></td></tr>}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function CloList({ user, course, clos, canWrite, reload }: { user: AppUser; course: Course; clos: Clo[]; canWrite: boolean; reload: Reload }) {
  const act = useAct(reload);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ code: '', textTh: '', bloom: '3' });
  function begin(c: Clo | null) {
    setEditId(c ? c.id : 'new');
    setF(c ? { code: c.code, textTh: c.textTh, bloom: String(c.bloomLevel) } : { code: `${course.code}-CLO${clos.length + 1}`, textTh: '', bloom: '3' });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { code: f.code, textTh: f.textTh, bloomLevel: Number(f.bloom) };
    const ok = editId === 'new'
      ? act(() => { createClo(user, { courseId: course.id, ...body }); }, 'เพิ่ม CLO แล้ว')
      : act(() => { updateClo(user, editId as string, body); }, 'บันทึก CLO แล้ว');
    if (ok) setEditId(null);
  }
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4" data-testid={`clo-list-${course.code}`}>
      {clos.length === 0 ? <p className="m-0 text-muted-foreground">วิชานี้ยังไม่มี CLO</p> : (
        <ul className="m-0 list-none divide-y p-0">
          {clos.map(c => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
              <strong className="whitespace-nowrap">{c.code}</strong>
              <span className="min-w-0 flex-1 basis-60">{c.textTh} <Badge>{BLOOM_TH[c.bloomLevel]}</Badge></span>
              {canWrite && <RowActions onEdit={() => begin(c)} onDelete={() => act(() => deleteClo(user, c.id), 'ลบ CLO แล้ว')} delLabel={`ลบ ${c.code}`} />}
            </li>
          ))}
        </ul>
      )}
      {canWrite && !editId && <Button variant="outline" size="compact" onClick={() => begin(null)} data-testid={`clo-new-${course.code}`}><Icon name="plus" size={20} />เพิ่ม CLO</Button>}
      {editId && (
        <form className="grid items-end gap-3 md:grid-cols-[12rem_minmax(0,1fr)_12rem_auto]" onSubmit={submit} data-testid="clo-form">
          <label className={FIELD}><span className={LABEL}>รหัส</span><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required /></label>
          <label className={FIELD}><span className={LABEL}>ข้อความ</span><Input value={f.textTh} onChange={e => setF({ ...f, textTh: e.target.value })} required data-testid="clo-text" /></label>
          <label className={FIELD}><span className={LABEL}>Bloom</span>
            <NativeSelect value={f.bloom} onChange={e => setF({ ...f, bloom: e.target.value })}>
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{BLOOM_TH[n]}</option>)}
            </NativeSelect>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="compact" data-testid="clo-save">บันทึก</Button>
            <Button variant="ghost" size="compact" onClick={() => setEditId(null)}>ยกเลิก</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ───────────── Matrix CLO→PLO ─────────────
function MatrixTab({ user, cur, canWrite, reload }: TabProps) {
  const act = useAct(reload);
  if (cur.plos.length === 0 || cur.clos.length === 0) return <Empty text="ต้องมีทั้ง PLO และ CLO ก่อนจึงจะทำ matrix ได้" />;
  const level = (cloId: string, ploId: string) => cur.map.find(m => m.cloId === cloId && m.ploId === ploId)?.level ?? '';
  const courses = [...cur.courses].sort((a, b) => a.year - b.year || a.code.localeCompare(b.code));
  return (
    <>
      <p className="aq-help m-0">I = แนะนำ · R = ฝึกซ้ำ · M = เชี่ยวชาญ {canWrite ? '— เลือกในช่องเพื่อบันทึกทันที' : ''}</p>
      <Table data-testid="matrix-table" wrapperClassName={cn('aq-matrix', TABLE_WRAP)}>
        <TableHeader><tr><TableHead>CLO</TableHead>{cur.plos.map(p => <TableHead key={p.id} title={p.textTh} className="text-center">{p.code}</TableHead>)}</tr></TableHeader>
        <TableBody>
          {courses.map(c => {
            const clos = cur.clos.filter(x => x.courseId === c.id);
            if (!clos.length) return null;
            return (
              <Fragment key={c.id}>
                <tr className="border-t bg-muted/60"><td colSpan={cur.plos.length + 1} className="px-4 py-2 text-foreground"><strong>{c.code}</strong> {c.nameTh}</td></tr>
                {clos.map(clo => (
                  <TableRow key={clo.id}>
                    <TableCell title={clo.textTh} className="min-w-[14rem]">
                      <span className="font-medium">{clo.code}</span>
                      <p className="aq-meta m-0 line-clamp-2">{clo.textTh}</p>
                    </TableCell>
                    {cur.plos.map(p => {
                      const v = level(clo.id, p.id);
                      return (
                        <TableCell key={p.id} className="px-2 text-center align-middle">
                          {canWrite ? (
                            <NativeSelect wrapperClassName="mx-auto w-20" value={v} aria-label={`${clo.code} → ${p.code}`} data-testid={`map-${clo.code}-${p.code}`}
                              className={cn('pl-3 pr-7 font-semibold lg:min-h-10', v && MATRIX_LEVEL[v as MapLevel])}
                              onChange={e => act(() => { setCloPloMap(user, clo.id, p.id, (e.target.value || null) as MapLevel | null); }, 'บันทึกการผูกแล้ว')}>
                              <option value="">—</option><option value="I">I</option><option value="R">R</option><option value="M">M</option>
                            </NativeSelect>
                          ) : v ? <span className={cn(LEVEL_CHIP, MATRIX_LEVEL[v as MapLevel])}>{v}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

// ───────────── Heatmap ─────────────
function HeatTab({ cur, matrix }: { cur: CurriculumData; matrix: ReturnType<typeof getCurriculumMatrix> }) {
  if (cur.plos.length === 0) return <Empty icon="list-check" title="ยังไม่มี PLO" />;
  const rows = [...matrix.rows].sort((a, b) => a.course.year - b.course.year || a.course.code.localeCompare(b.course.code));
  const swatch = 'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-semibold';
  return (
    <>
      {/* U3-3: list มีระยะห่าง + ตัวอักษรในช่องสีเหมือน cell จริง (แยกได้ในขาวดำ) */}
      <ul className="aq-legend m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0" data-testid="heat-legend">
        <li className="inline-flex items-center gap-2 text-foreground"><span className={cn(swatch, MATRIX_LEVEL.I)} aria-hidden="true">I</span>{MAP_LEVEL_TH.I}</li>
        <li className="inline-flex items-center gap-2 text-foreground"><span className={cn(swatch, MATRIX_LEVEL.R)} aria-hidden="true">R</span>{MAP_LEVEL_TH.R}</li>
        <li className="inline-flex items-center gap-2 text-foreground"><span className={cn(swatch, MATRIX_LEVEL.M)} aria-hidden="true">M</span>{MAP_LEVEL_TH.M}</li>
        <li className="inline-flex items-center gap-2 text-foreground"><span className={cn(swatch, 'border border-dashed border-input bg-muted')} aria-hidden="true" />ไม่รับผิดชอบ</li>
      </ul>
      <Table data-testid="curriculum-heatmap" wrapperClassName={cn('aq-matrix', TABLE_WRAP)}>
        <TableHeader><tr><TableHead>วิชา</TableHead>{matrix.plos.map(p => <TableHead key={p.id} title={p.textTh} className="text-center">{p.code}</TableHead>)}</tr></TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.course.id}>
              <TableCell className="min-w-[14rem]"><strong>{r.course.code}</strong> <span className="text-muted-foreground">{r.course.nameTh}</span></TableCell>
              {matrix.plos.map(p => {
                const v = r.cells[p.id];
                return (
                  <TableCell key={p.id} className="px-2 text-center align-middle" data-level={v ?? ''} title={v ? MAP_LEVEL_TH[v] : 'ไม่รับผิดชอบ PLO นี้'}>
                    {v ? <span className={cn(LEVEL_CHIP, MATRIX_LEVEL[v])}>{v}</span> : <span className="text-muted-foreground">·</span>}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          <tr className="border-t-2 border-input bg-muted/60">
            <td className="px-4 py-3 font-semibold text-foreground">จำนวนวิชาต่อ PLO</td>
            {matrix.plos.map(p => {
              const n = rows.filter(r => r.cells[p.id]).length;
              return <td key={p.id} className="px-2 py-3 text-center font-semibold tabular-nums">{n === 0 ? <Badge tone="bad">0</Badge> : n}</td>;
            })}
          </tr>
        </TableBody>
      </Table>
    </>
  );
}

// ───────────── Gaps ─────────────
const GAP_KIND_TH = {
  plo_no_course: 'PLO ไม่มีวิชารองรับ', course_no_plo: 'วิชาไม่ผูก PLO', plo_no_assessment: 'PLO ไม่มีวิธีวัดผล', prereq_cycle: 'prerequisite วนซ้ำ',
} as const;
function GapTab({ gaps }: { gaps: ReturnType<typeof getCurriculumGaps> }) {
  if (gaps.length === 0) return <div data-testid="curriculum-gaps-none"><Empty icon="check-circle" title="ไม่พบช่องว่างของหลักสูตร" /></div>;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
      <ul className="m-0 list-none divide-y p-0" data-testid="curriculum-gaps">
        {gaps.map((g, i) => (
          <li key={`${g.kind}-${g.refId}-${i}`} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4 md:px-6">
            <Badge tone={g.kind === 'prereq_cycle' ? 'bad' : 'warn'}>{GAP_KIND_TH[g.kind]}</Badge>
            <span className="min-w-0 flex-1 basis-60 text-foreground">{gapTextTh(g.messageTh)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────── Prerequisite ─────────────
function PrereqTab({ cur }: { cur: CurriculumData }) {
  if (cur.courses.length === 0) return <Empty icon="book-open" title="ยังไม่มีรายวิชา" />;
  const years = Array.from(new Set(cur.courses.map(c => c.year))).sort((a, b) => a - b);
  const CW = 210, CH = 60, GX = 70, GY = 12, PADX = 10, PADY = 34; // U2Q-2: ป้ายในผัง 16px (ไม่ย่อด้วย viewBox)
  const pos = new Map<string, { x: number; y: number }>();
  let maxRows = 0;
  years.forEach((yr, xi) => {
    const list = cur.courses.filter(c => c.year === yr).sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
    maxRows = Math.max(maxRows, list.length);
    list.forEach((c, ri) => pos.set(c.id, { x: PADX + xi * (CW + GX), y: PADY + ri * (CH + GY) }));
  });
  const width = PADX * 2 + years.length * CW + (years.length - 1) * GX;
  const height = PADY + maxRows * (CH + GY);
  const withPre = cur.courses.filter(c => c.prerequisiteIds.length > 0);
  return (
    <div className={cn(CARD, 'space-y-5')}>
      <div className="overflow-x-auto">
        {/* เส้นลูกศรใช้ stroke-input (คู่ #16 ≥3:1) เพราะเป็นเส้นที่มีความหมาย (earth-tokens §E2) — ข้อความเทียบอยู่ใน prereq-list */}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ผัง prerequisite ของรายวิชาเรียงตามชั้นปี" data-testid="prereq-svg" className="block max-w-none">
          <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" className="fill-input" /></marker></defs>
          {years.map((yr, xi) => <text key={yr} x={PADX + xi * (CW + GX)} y={20} fontSize="16" fontWeight="600" className="fill-foreground">ชั้นปี {yr}</text>)}
          {cur.courses.flatMap(c => c.prerequisiteIds.map(pid => {
            const a = pos.get(pid), b = pos.get(c.id);
            if (!a || !b) return null;
            const x1 = a.x + CW, y1 = a.y + CH / 2, x2 = b.x, y2 = b.y + CH / 2;
            const same = a.x === b.x;
            const d = same
              ? `M${x1},${y1} C${x1 + 28},${y1} ${x1 + 28},${y2} ${x1},${y2}`
              : `M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2 - 2},${y2}`;
            return <path key={`${pid}>${c.id}`} d={d} fill="none" strokeWidth="1.5" markerEnd="url(#arr)" className="stroke-input" />;
          }))}
          {cur.courses.map(c => {
            const p = pos.get(c.id);
            if (!p) return null;
            return (
              <g key={c.id}>
                <rect x={p.x} y={p.y} width={CW} height={CH} rx="10" className="fill-card stroke-input" />
                <text x={p.x + 10} y={p.y + 23} fontSize="16" fontWeight="600" className="fill-foreground">{c.code}</text>
                <text x={p.x + 10} y={p.y + 48} fontSize="16" className="fill-muted-foreground">{truncateTh(c.nameTh, 17)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="space-y-2 border-t pt-4">
        <h2 className="m-0 text-lg font-semibold text-foreground">รายการลำดับวิชา (อ่านเป็นตัวอักษร)</h2>
        {withPre.length === 0 ? <p className="m-0 text-muted-foreground">ไม่มีวิชาที่กำหนด prerequisite</p> : (
          <ul className="m-0 list-none divide-y p-0" data-testid="prereq-list">
            {withPre.map(c => (
              <li key={c.id} className="flex flex-wrap gap-x-4 py-2"><strong className="whitespace-nowrap">{c.code}</strong><span className="min-w-0 flex-1">ต้องเรียนก่อน: {c.prerequisiteIds.map(id => cur.courses.find(x => x.id === id)?.code ?? id).join(', ')}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ───────────── AI-7 ─────────────
interface VerbRes {
  id: string; code: string; kind: 'plo' | 'clo'; verbs: string[]; detectedLevels: number[]; declaredLevel: number;
  measurable: boolean; levelMatch: boolean | null; note: string; suggestions: string[];
}
function AiTab({ user, programmeId, cur, canWrite, reload }: TabProps & { programmeId: string }) {
  const { showToast } = useToast();
  const [run, setRun] = useState<AiRun | null>(null);
  const out = (run?.output as { results?: VerbRes[] } | undefined)?.results ?? [];
  const canAi = can(user, 'ai.use', programmeScope(programmeId));
  async function go() {
    try { setRun(await runVerbChecker(user, programmeId)); } catch (e) { showToast(errMsg(e), 'error'); }
  }
  function apply(r: VerbRes) {
    const lv = Math.max(...r.detectedLevels);
    try {
      if (r.kind === 'plo') updatePlo(user, r.id, { bloomLevel: lv }); else updateClo(user, r.id, { bloomLevel: lv });
      showToast(`ปรับระดับ Bloom ของ ${r.code} เป็น ${lv} แล้ว`, 'success'); reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }
  function accept() {
    if (!run) return;
    try { acceptAiRun(user, run.id, {}); showToast('รับทราบผลตรวจแล้ว (ระบบไม่แก้ PLO/CLO ให้เอง)', 'success'); setRun(null); }
    catch (e) { showToast(errMsg(e), 'error'); }
  }
  const textOf = (r: VerbRes) => (r.kind === 'plo' ? cur.plos.find(p => p.id === r.id)?.textTh : cur.clos.find(c => c.id === r.id)?.textTh) ?? '';
  return (
    <div className={cn(CARD, 'space-y-5')} data-testid="ai-verb-panel">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true"><Icon name="sparkle" size={24} /></span>
        <p className="m-0 min-w-0 flex-1 text-muted-foreground">AI-7 ตรวจว่าคำกริยาใน PLO/CLO วัดผลได้และตรงกับระดับ Bloom ที่ตั้งไว้หรือไม่ — เป็นข้อเสนอเท่านั้น คุณเป็นผู้ตัดสินและกดแก้เอง</p>
      </div>
      <AsyncButton variant={run ? 'outline' : 'default'} testId="ai-verb-run" onClick={go} disabled={!canAi} title={!canAi ? 'ไม่มีสิทธิ์ใช้ AI' : undefined}>ตรวจคำกริยาทั้งหมด</AsyncButton>
      {run && (
        <div className="space-y-4 border-t pt-5" data-testid="ai-verb-result">
          <div className="flex flex-wrap gap-2">
            <ModelBadge run={run} />
            <Badge title="จำนวนข้อมูลส่วนบุคคลที่ปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
            <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจ' : 'พบข้อควรระวัง'}</Badge>
          </div>
          <Table>
            <TableHeader><tr><TableHead>รหัส</TableHead><TableHead>ข้อความ</TableHead><TableHead>กริยาที่พบ</TableHead><TableHead>Bloom ตั้งไว้ / ตรวจพบ</TableHead><TableHead>ผล</TableHead>{canWrite && <TableHead><span className="sr-only">การกระทำ</span></TableHead>}</tr></TableHeader>
            <TableBody>
              {out.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap"><strong>{r.code}</strong><p className="aq-meta m-0">{r.kind.toUpperCase()}</p></TableCell>
                  <TableCell className="min-w-[16rem]">
                    <p className="m-0 line-clamp-3">{textOf(r)}</p>
                    {r.note && <p className="aq-meta m-0">{r.note}</p>}
                    {r.suggestions.length > 0 && (
                      <ul className="m-0 mt-1 list-none space-y-1 p-0">
                        {r.suggestions.map((s, i) => <li key={i} className="flex gap-2"><Icon name="alert-triangle" size={16} className="mt-1 text-warning" /><span className="min-w-0">{s}</span></li>)}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>{r.verbs.join(', ') || '—'}</TableCell>
                  <TableCell className="tabular-nums">{r.declaredLevel} / {r.detectedLevels.join(', ') || '—'}</TableCell>
                  <TableCell>{!r.measurable ? <Badge tone="bad">วัดผลยาก</Badge> : r.levelMatch === false ? <Badge tone="warn">ระดับไม่ตรง</Badge> : <Badge tone="ok">ปกติ</Badge>}</TableCell>
                  {canWrite && <TableCell>{r.levelMatch === false && r.detectedLevels.length > 0 && <Button variant="outline" size="compact" onClick={() => apply(r)} data-testid={`verb-apply-${r.code}`}>ใช้ระดับที่ตรวจพบ</Button>}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap gap-2">
            <Button onClick={accept} data-testid="ai-verb-accept">รับทราบผลตรวจ</Button>
            <Button variant="ghost" onClick={() => setRun(null)}>ทิ้ง</Button>
          </div>
        </div>
      )}
    </div>
  );
}
