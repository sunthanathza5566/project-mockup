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
import Term from '@/components/ui/Term';
import { useScope } from '@/components/aunqa/useScope';
import { BLOOM_TH, MAP_LEVEL_TH, errMsg, truncateTh } from '@/lib/ui/aunqa';

type Tab = 'plo' | 'course' | 'matrix' | 'heat' | 'gaps' | 'prereq' | 'ai';
const TABS: [Tab, string][] = [
  ['plo', 'PLO'], ['course', 'รายวิชาและ CLO'], ['matrix', 'Matrix CLO→PLO'], ['heat', 'Heatmap วิชา×PLO'],
  ['gaps', 'ช่องว่างหลักสูตร'], ['prereq', 'ผัง prerequisite'], ['ai', 'ตรวจคำกริยา Bloom (AI)'],
];

/**
 * หลักสูตร (ADR-UI-001 pages.md P12): PLO / รายวิชา / CLO / matrix I-R-M / heatmap / gap / prerequisite / AI-7
 * แท็บเส้นใต้ (C5) + ตัวเลขช่องว่างในแท็บ · I/R/M ตาม T1.3 #15/#28/#36 + ตัวอักษรเสมอ · คง testid เดิมทั้งหมด
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
      <div className="aq-toolbar">
        <select className="aq-input" value={programmeId} onChange={e => setProgrammeId(e.target.value)} aria-label="หลักสูตร" data-testid="cur-programme">
          {programmes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.nameTh}</option>)}
        </select>
        {!canWrite && <Badge icon="eye">ดูอย่างเดียว</Badge>}
      </div>
      <div className="aq-tabs" role="tablist" aria-label="ส่วนของหลักสูตร">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-controls="cur-panel" onClick={() => setTab(k)} data-testid={`cur-tab-${k}`}>
            {l}{k === 'gaps' && q.data ? <span className="aq-count aq-count--muted">{q.data.gaps.length}</span> : null}
          </button>
        ))}
      </div>
      <Async q={q}>{d => !d ? <Empty icon="book-open" title="ยังไม่มีหลักสูตรที่เข้าถึงได้" /> : (
        <div id="cur-panel" role="tabpanel" className="aq-tabpanel" data-testid={`cur-panel-${tab}`}>
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
      {canWrite && !edit && <div className="aq-card"><button className="aq-btn aq-btn-primary" onClick={() => open('new')} data-testid="plo-new">+ เพิ่ม PLO</button></div>}
      {edit && (
        <form className="aq-card aq-form" onSubmit={submit} data-testid="plo-form">
          <h2 className="aq-h2">{edit === 'new' ? 'เพิ่ม PLO' : `แก้ ${edit.code}`}</h2>
          <label>รหัส<input className="aq-input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required data-testid="plo-code" /></label>
          <label>ผลลัพธ์การเรียนรู้ (ไทย)<textarea className="aq-textarea" rows={2} value={f.textTh} onChange={e => setF({ ...f, textTh: e.target.value })} required data-testid="plo-th" /></label>
          <label>English<textarea className="aq-textarea" rows={2} value={f.textEn} onChange={e => setF({ ...f, textEn: e.target.value })} lang="en" /></label>
          <div className="aq-form-inline">
            <label>ประเภท
              <select className="aq-input" value={f.type} onChange={e => setF({ ...f, type: e.target.value as Plo['type'] })}>
                <option value="generic">ทั่วไป (generic)</option><option value="specific">เฉพาะสาขา (specific)</option>
              </select>
            </label>
            <label>ระดับ Bloom
              <select className="aq-input" value={f.bloom} onChange={e => setF({ ...f, bloom: e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{BLOOM_TH[n]}</option>)}
              </select>
            </label>
          </div>
          <div className="aq-actions"><button className="aq-btn aq-btn-primary" data-testid="plo-save">บันทึก</button><button type="button" className="aq-btn" onClick={() => setEdit(null)}>ยกเลิก</button></div>
        </form>
      )}
      {cur.plos.length === 0 ? <Empty icon="list-check" title="ยังไม่มี PLO" text="เพิ่ม PLO ข้อแรกเพื่อเริ่มผูกรายวิชา" /> : (
        <div className="aq-card aq-table-wrap">
          <table className="aq-table" data-testid="plo-table">
            <thead><tr><th>รหัส</th><th>ข้อความ</th><th>ประเภท</th><th>Bloom</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {cur.plos.map(p => (
                <tr key={p.id} data-testid={`plo-${p.code}`}>
                  <td><strong>{p.code}</strong></td>
                  <td>{p.textTh}<div className="aq-muted" lang="en">{p.textEn}</div></td>
                  <td>{p.type === 'generic' ? 'ทั่วไป' : 'เฉพาะสาขา'}</td>
                  <td>{BLOOM_TH[p.bloomLevel]}</td>
                  {canWrite && <td className="aq-cluster-cell"><button className="aq-btn aq-btn-compact" onClick={() => open(p)}>แก้</button> <button className="aq-btn aq-btn-compact" onClick={() => del(p)} aria-label={`ลบ ${p.code}`}>ลบ</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      {canWrite && !edit && <div className="aq-card"><button className="aq-btn aq-btn-primary" onClick={() => openForm('new')} data-testid="course-new">+ เพิ่มรายวิชา</button></div>}
      {edit && (
        <form className="aq-card aq-form" onSubmit={submit} data-testid="course-form">
          <h2 className="aq-h2">{edit === 'new' ? 'เพิ่มรายวิชา' : `แก้ ${edit.code}`}</h2>
          <div className="aq-form-inline">
            <label>รหัสวิชา<input className="aq-input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required data-testid="course-code" /></label>
            <label className="aq-flex-1">ชื่อวิชา<input className="aq-input" value={f.nameTh} onChange={e => setF({ ...f, nameTh: e.target.value })} required data-testid="course-name" /></label>
          </div>
          <div className="aq-form-inline">
            <label>หน่วยกิต<input className="aq-input aq-input-sm" type="number" min={0} max={30} value={f.credits} onChange={e => setF({ ...f, credits: e.target.value })} /></label>
            <label>ชั้นปี<input className="aq-input aq-input-sm" type="number" min={1} max={8} value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></label>
            <label>ภาคเรียน<input className="aq-input aq-input-sm" type="number" min={1} max={3} value={f.semester} onChange={e => setF({ ...f, semester: e.target.value })} /></label>
            <label>หมวดวิชา<input className="aq-input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></label>
            <label className="aq-check"><input type="checkbox" checked={f.isElective} onChange={e => setF({ ...f, isElective: e.target.checked })} /> วิชาเลือก</label>
          </div>
          <fieldset className="aq-pdca"><legend className="aq-h3">วิชาที่ต้องเรียนก่อน (prerequisite)</legend>
            {cur.courses.filter(c => edit === 'new' || c.id !== edit.id).map(c => (
              <label key={c.id} className="aq-check"><input type="checkbox" checked={f.pre.includes(c.id)} onChange={e => setF({ ...f, pre: e.target.checked ? [...f.pre, c.id] : f.pre.filter(x => x !== c.id) })} /> {c.code}</label>
            ))}
          </fieldset>
          <div className="aq-actions"><button className="aq-btn aq-btn-primary" data-testid="course-save">บันทึก</button><button type="button" className="aq-btn" onClick={() => setEdit(null)}>ยกเลิก</button></div>
        </form>
      )}
      {sorted.length === 0 ? <Empty icon="book-open" title="ยังไม่มีรายวิชา" /> : (
        <div className="aq-card aq-table-wrap">
          <table className="aq-table" data-testid="course-table">
            <thead><tr><th>รหัส</th><th>ชื่อวิชา</th><th>หน่วยกิต</th><th>ปี/ภาค</th><th>CLO</th><th /></tr></thead>
            <tbody>
              {sorted.map(c => {
                const clos = cur.clos.filter(x => x.courseId === c.id);
                return (
                  <Fragment key={c.id}>
                    <tr data-testid={`course-${c.code}`}>
                      <td><strong>{c.code}</strong></td>
                      <td>{c.nameTh}{c.isElective && <> <Badge>เลือก</Badge></>}</td>
                      <td>{c.credits}</td><td>{c.year}/{c.semester}</td><td>{clos.length}</td>
                      <td className="aq-cluster-cell">
                        <button className="aq-btn aq-btn-compact" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)} data-testid={`course-toggle-${c.code}`}>CLO</button>
                        {canWrite && <> <button className="aq-btn aq-btn-compact" onClick={() => openForm(c)}>แก้</button> <button className="aq-btn aq-btn-compact" onClick={() => del(c)} aria-label={`ลบ ${c.code}`}>ลบ</button></>}
                      </td>
                    </tr>
                    {open === c.id && <tr><td colSpan={6}><CloList user={user} course={c} clos={clos} canWrite={canWrite} reload={reload} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
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
    <div className="aq-clo-box" data-testid={`clo-list-${course.code}`}>
      {clos.length === 0 ? <p className="aq-muted">วิชานี้ยังไม่มี CLO</p> : (
        <ul className="aq-list">
          {clos.map(c => (
            <li key={c.id}>
              <strong>{c.code}</strong>
              <span className="aq-flex-1">{c.textTh} <Badge>{BLOOM_TH[c.bloomLevel]}</Badge></span>
              {canWrite && <>
                <button className="aq-btn aq-btn-compact" onClick={() => begin(c)}>แก้</button>
                <button className="aq-btn aq-btn-compact" aria-label={`ลบ ${c.code}`} onClick={() => act(() => deleteClo(user, c.id), 'ลบ CLO แล้ว')}>ลบ</button>
              </>}
            </li>
          ))}
        </ul>
      )}
      {canWrite && !editId && <button className="aq-btn aq-btn-compact" onClick={() => begin(null)} data-testid={`clo-new-${course.code}`}>+ เพิ่ม CLO</button>}
      {editId && (
        <form className="aq-form-inline" onSubmit={submit} data-testid="clo-form">
          <label>รหัส<input className="aq-input aq-input-sm" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} required /></label>
          <label className="aq-flex-1">ข้อความ<input className="aq-input" value={f.textTh} onChange={e => setF({ ...f, textTh: e.target.value })} required data-testid="clo-text" /></label>
          <label>Bloom
            <select className="aq-input aq-input-sm" value={f.bloom} onChange={e => setF({ ...f, bloom: e.target.value })}>
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{BLOOM_TH[n]}</option>)}
            </select>
          </label>
          <button className="aq-btn aq-btn-compact aq-btn-primary" data-testid="clo-save">บันทึก</button>
          <button type="button" className="aq-btn aq-btn-compact" onClick={() => setEditId(null)}>ยกเลิก</button>
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
    <div className="aq-card aq-table-wrap">
      <p className="aq-muted">I = แนะนำ · R = ฝึกซ้ำ · M = เชี่ยวชาญ {canWrite ? '— เลือกในช่องเพื่อบันทึกทันที' : ''}</p>
      <table className="aq-table aq-matrix" data-testid="matrix-table">
        <thead><tr><th>CLO</th>{cur.plos.map(p => <th key={p.id} title={p.textTh}>{p.code}</th>)}</tr></thead>
        <tbody>
          {courses.map(c => {
            const clos = cur.clos.filter(x => x.courseId === c.id);
            if (!clos.length) return null;
            return (
              <Fragment key={c.id}>
                <tr className="aq-matrix-group"><td colSpan={cur.plos.length + 1}><strong>{c.code}</strong> {c.nameTh}</td></tr>
                {clos.map(clo => (
                  <tr key={clo.id}>
                    <td title={clo.textTh}>{clo.code}<div className="aq-clamp aq-muted">{clo.textTh}</div></td>
                    {cur.plos.map(p => {
                      const v = level(clo.id, p.id);
                      return (
                        <td key={p.id} className={v ? `aq-lv aq-lv-${v}` : ''}>
                          {canWrite ? (
                            <select className="aq-input aq-input-sm" value={v} aria-label={`${clo.code} → ${p.code}`} data-testid={`map-${clo.code}-${p.code}`}
                              onChange={e => act(() => { setCloPloMap(user, clo.id, p.id, (e.target.value || null) as MapLevel | null); }, 'บันทึกการผูกแล้ว')}>
                              <option value="">—</option><option value="I">I</option><option value="R">R</option><option value="M">M</option>
                            </select>
                          ) : (v || '—')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────── Heatmap ─────────────
function HeatTab({ cur, matrix }: { cur: CurriculumData; matrix: ReturnType<typeof getCurriculumMatrix> }) {
  if (cur.plos.length === 0) return <Empty icon="list-check" title="ยังไม่มี PLO" />;
  const rows = [...matrix.rows].sort((a, b) => a.course.year - b.course.year || a.course.code.localeCompare(b.course.code));
  return (
    <div className="aq-card aq-table-wrap">
      {/* U3-3: ใช้ list มีระยะห่าง + ตัวอักษรในช่องสีเหมือน cell จริง (แยกได้ในขาวดำ) */}
      <ul className="aq-legend aq-legend__list" data-testid="heat-legend">
        <li><i className="aq-heat aq-lv-I" aria-hidden="true">I</i>{MAP_LEVEL_TH.I}</li>
        <li><i className="aq-heat aq-lv-R" aria-hidden="true">R</i>{MAP_LEVEL_TH.R}</li>
        <li><i className="aq-heat aq-lv-M" aria-hidden="true">M</i>{MAP_LEVEL_TH.M}</li>
        <li><i className="aq-heat aq-heat-empty" aria-hidden="true" />ไม่รับผิดชอบ</li>
      </ul>
      <table className="aq-table aq-matrix" data-testid="curriculum-heatmap">
        <thead><tr><th>วิชา</th>{matrix.plos.map(p => <th key={p.id} title={p.textTh}>{p.code}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.course.id}>
              <td><strong>{r.course.code}</strong> <span className="aq-muted">{r.course.nameTh}</span></td>
              {matrix.plos.map(p => {
                const v = r.cells[p.id];
                return <td key={p.id} className={v ? `aq-lv aq-lv-${v}` : 'aq-lv-none'} data-level={v ?? ''} title={v ? MAP_LEVEL_TH[v] : 'ไม่รับผิดชอบ PLO นี้'}>{v ?? '·'}</td>;
              })}
            </tr>
          ))}
          <tr className="aq-matrix-total">
            <td>จำนวนวิชาต่อ PLO</td>
            {matrix.plos.map(p => {
              const n = rows.filter(r => r.cells[p.id]).length;
              return <td key={p.id}>{n === 0 ? <Badge tone="bad">0</Badge> : n}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ───────────── Gaps ─────────────
const GAP_KIND_TH = {
  plo_no_course: 'PLO ไม่มีวิชารองรับ', course_no_plo: 'วิชาไม่ผูก PLO', plo_no_assessment: 'PLO ไม่มีวิธีวัดผล', prereq_cycle: 'prerequisite วนซ้ำ',
} as const;
function GapTab({ gaps }: { gaps: ReturnType<typeof getCurriculumGaps> }) {
  if (gaps.length === 0) return <div data-testid="curriculum-gaps-none"><Empty icon="check-circle" title="ไม่พบช่องว่างของหลักสูตร" /></div>;
  return (
    <div className="aq-card">
      <ul className="aq-list" data-testid="curriculum-gaps">
        {gaps.map((g, i) => (
          <li key={`${g.kind}-${g.refId}-${i}`}>
            <Badge tone={g.kind === 'prereq_cycle' ? 'bad' : 'warn'}>{GAP_KIND_TH[g.kind]}</Badge>
            <span className="aq-flex-1">{g.messageTh}</span>
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
    <div className="aq-card">
      <div className="aq-table-wrap">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ผัง prerequisite ของรายวิชาเรียงตามชั้นปี" data-testid="prereq-svg">
          <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" style={{ fill: 'var(--c-muted)' }} /></marker></defs>
          {years.map((yr, xi) => <text key={yr} x={PADX + xi * (CW + GX)} y={20} fontSize="16" fontWeight="700" style={{ fill: 'var(--c-ink)' }}>ชั้นปี {yr}</text>)}
          {cur.courses.flatMap(c => c.prerequisiteIds.map(pid => {
            const a = pos.get(pid), b = pos.get(c.id);
            if (!a || !b) return null;
            const x1 = a.x + CW, y1 = a.y + CH / 2, x2 = b.x, y2 = b.y + CH / 2;
            const same = a.x === b.x;
            const d = same
              ? `M${x1},${y1} C${x1 + 28},${y1} ${x1 + 28},${y2} ${x1},${y2}`
              : `M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2 - 2},${y2}`;
            return <path key={`${pid}>${c.id}`} d={d} fill="none" strokeWidth="1.5" markerEnd="url(#arr)" style={{ stroke: 'var(--c-muted)' }} />;
          }))}
          {cur.courses.map(c => {
            const p = pos.get(c.id);
            if (!p) return null;
            return (
              <g key={c.id}>
                <rect x={p.x} y={p.y} width={CW} height={CH} rx="8" style={{ fill: 'var(--c-surface)', stroke: 'var(--c-border-control)' }} />
                <text x={p.x + 8} y={p.y + 23} fontSize="16" fontWeight="700" style={{ fill: 'var(--c-primary-strong)' }}>{c.code}</text>
                <text x={p.x + 8} y={p.y + 48} fontSize="16" style={{ fill: 'var(--c-muted)' }}>{truncateTh(c.nameTh, 17)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <h2 className="aq-h3 aq-mt-4">รายการลำดับวิชา (อ่านเป็นตัวอักษร)</h2>
      {withPre.length === 0 ? <p className="aq-muted">ไม่มีวิชาที่กำหนด prerequisite</p> : (
        <ul className="aq-list" data-testid="prereq-list">
          {withPre.map(c => (
            <li key={c.id}><strong>{c.code}</strong><span className="aq-flex-1">ต้องเรียนก่อน: {c.prerequisiteIds.map(id => cur.courses.find(x => x.id === id)?.code ?? id).join(', ')}</span></li>
          ))}
        </ul>
      )}
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
    <div className="aq-card" data-testid="ai-verb-panel">
      <p className="aq-muted">AI-7 ตรวจว่าคำกริยาใน PLO/CLO วัดผลได้และตรงกับระดับ Bloom ที่ตั้งไว้หรือไม่ — เป็นข้อเสนอเท่านั้น คุณเป็นผู้ตัดสินและกดแก้เอง</p>
      <AsyncButton className="aq-btn aq-btn-primary" testId="ai-verb-run" onClick={go} disabled={!canAi} title={!canAi ? 'ไม่มีสิทธิ์ใช้ AI' : undefined}>ตรวจคำกริยาทั้งหมด</AsyncButton>
      {run && (
        <div className="aq-ai-result" data-testid="ai-verb-result">
          <div className="aq-chips">
            <ModelBadge run={run} />
            <Badge title="จำนวนข้อมูลส่วนบุคคลที่ปกปิดก่อนส่ง">ปกปิด {run.redactionCount} จุด</Badge>
            <Badge tone={run.postCheck.ok ? 'ok' : 'warn'}>{run.postCheck.ok ? 'ผ่านการตรวจ' : 'พบข้อควรระวัง'}</Badge>
          </div>
          <div className="aq-table-wrap">
            <table className="aq-table">
              <thead><tr><th>รหัส</th><th>ข้อความ</th><th>กริยาที่พบ</th><th>Bloom ตั้งไว้ / ตรวจพบ</th><th>ผล</th>{canWrite && <th />}</tr></thead>
              <tbody>
                {out.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.code}</strong><div className="aq-muted">{r.kind.toUpperCase()}</div></td>
                    <td>
                      <div className="aq-clamp">{textOf(r)}</div>
                      {r.note && <div className="aq-muted">{r.note}</div>}
                      {r.suggestions.length > 0 && <ul className="aq-warnlist">{r.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                    </td>
                    <td>{r.verbs.join(', ') || '—'}</td>
                    <td>{r.declaredLevel} / {r.detectedLevels.join(', ') || '—'}</td>
                    <td>{!r.measurable ? <Badge tone="bad">วัดผลยาก</Badge> : r.levelMatch === false ? <Badge tone="warn">ระดับไม่ตรง</Badge> : <Badge tone="ok">ปกติ</Badge>}</td>
                    {canWrite && <td>{r.levelMatch === false && r.detectedLevels.length > 0 && <button className="aq-btn aq-btn-compact" onClick={() => apply(r)} data-testid={`verb-apply-${r.code}`}>ใช้ระดับที่ตรวจพบ</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="aq-actions">
            <button className="aq-btn aq-btn-primary" onClick={accept} data-testid="ai-verb-accept">รับทราบผลตรวจ</button>
            <button className="aq-btn" onClick={() => setRun(null)}>ทิ้ง</button>
          </div>
        </div>
      )}
    </div>
  );
}
