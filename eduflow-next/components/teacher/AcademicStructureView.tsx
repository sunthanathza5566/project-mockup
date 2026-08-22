'use client';

/**
 * โครงสร้างวิชาการ (ฝั่งครู) — จัดการ ปีการศึกษา / ระดับชั้น / ห้องเรียน
 * เปิด-ปิดการใช้งานปีการศึกษา (ปิดปีเก่าเพื่อไม่ให้ตัวเลือกล้น) · ลบได้พร้อมเตือนถ้ามีข้อมูลผูกอยู่
 *
 * สิทธิ์: manageAcademic (แอดมินเปิดสิทธิ์นี้ให้หัวหน้าวิชาการ/ครูทะเบียน)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getAllAcademicYears, createAcademicYear, setYearActive, deleteAcademicYear, yearUsage,
  getGradeLevels, createGradeLevel, deleteGradeLevel,
  getClassrooms, createClassroom, deleteClassroom, classroomUsage,
  getClassroomStudents, addStudentToClassroom, removeStudentFromClassroom, promoteClassroom,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import { hasPermission } from '@/lib/api/permissions';
import { getSession } from '@/lib/api/auth.api';
import type { TeacherStudent } from '@/lib/types';
import { useDialog } from '@/context/DialogContext';

interface Props { onGoToPlan?: () => void }

export default function AcademicStructureView({ onGoToPlan }: Props) {
  const { confirm, notify } = useDialog();
  const allowed = hasPermission('manageAcademic');

  const [years,  setYears]  = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [rooms,  setRooms]  = useState<Classroom[]>([]);
  const [selYear,  setSelYear]  = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [selRoom,  setSelRoom]  = useState('');
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [promoteArm, setPromoteArm] = useState(false);   // ยืนยันเลื่อนชั้น 2 สเต็ป (กดอีกครั้ง)

  const [newYear,  setNewYear]  = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newRoom,  setNewRoom]  = useState('');
  const [newStuCode, setNewStuCode] = useState('');
  const [newStuName, setNewStuName] = useState('');

  const reloadYears = useCallback(() => setYears(getAllAcademicYears()), []);
  useEffect(() => { reloadYears(); }, [reloadYears]);
  useEffect(() => { setGrades(selYear ? getGradeLevels(selYear) : []); setSelGrade(''); setSelRoom(''); }, [selYear, years]);
  useEffect(() => { setRooms(selGrade ? getClassrooms(selGrade) : []); setSelRoom(''); }, [selGrade, grades]);
  useEffect(() => { setStudents(selRoom ? getClassroomStudents(selRoom) : []); setPromoteArm(false); }, [selRoom, rooms]);

  const gradeName = grades.find(g => g.id === selGrade)?.name || '';
  const roomNo = rooms.find(r => r.id === selRoom)?.room || '';

  async function addStudent() {
    const code = newStuCode.trim(); const name = newStuName.trim();
    if (!selRoom) { notify({ title: 'ยังทำรายการไม่ได้', message: 'เลือกห้องก่อนเพิ่มนักเรียน', variant: 'warning' }); return; }
    if (!code || !name) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกรหัสและชื่อนักเรียนให้ครบก่อน', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'เพิ่มนักเรียนเข้าห้อง?', message: <>เพิ่ม <b>{name}</b> ({code}) เข้าห้อง <b>{gradeName}/{roomNo}</b></>, confirmText: 'เพิ่มนักเรียน' }))) return;
    if (!addStudentToClassroom(selRoom, code, name)) { notify({ title: 'เพิ่มไม่สำเร็จ', message: 'รหัสนักเรียนนี้อยู่ในห้องแล้ว', variant: 'danger' }); return; }
    setNewStuCode(''); setNewStuName(''); setStudents(getClassroomStudents(selRoom));
    notify({ title: 'เพิ่มนักเรียนแล้ว', message: <>{name} ({code}) เข้าห้อง {gradeName}/{roomNo} เรียบร้อย</>, variant: 'success' });
  }

  async function removeStudent(s: TeacherStudent) {
    if (!(await confirm({ title: 'ลบนักเรียนออกจากห้อง?', message: <>ลบ <b>{s.name}</b> ออกจากห้อง {gradeName}/{roomNo}</>, variant: 'danger', confirmText: 'ลบ' }))) return;
    removeStudentFromClassroom(selRoom, s.code);
    setStudents(getClassroomStudents(selRoom));
    notify({ title: 'ลบนักเรียนแล้ว', message: `${s.name} ออกจากห้องเรียบร้อย`, variant: 'success' });
  }

  async function addYear() {
    const y = newYear.trim();
    if (!/^\d{4}$/.test(y)) { notify({ title: 'รูปแบบปีไม่ถูกต้อง', message: 'ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2568', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'เพิ่มปีการศึกษา?', message: <>เพิ่มปีการศึกษา <b>{y}</b> เข้าระบบ</>, confirmText: 'เพิ่มปี' }))) return;
    if (!createAcademicYear(y, getSession()?.username || 'teacher')) { notify({ title: 'เพิ่มไม่สำเร็จ', message: 'ปีการศึกษานี้มีอยู่แล้ว', variant: 'danger' }); return; }
    setNewYear(''); reloadYears();
    notify({ title: 'เพิ่มปีการศึกษาแล้ว', message: `ปีการศึกษา ${y} พร้อมใช้งาน`, variant: 'success' });
  }

  async function toggleYear(y: AcademicYear) {
    const on = y.active === false;
    if (!(await confirm({ title: on ? 'เปิดใช้งานปีการศึกษา?' : 'ปิดใช้งานปีการศึกษา?', message: on ? <>เปิดใช้งานปี <b>{y.year}</b> ให้แสดงในตัวเลือก</> : <>ปิดปี <b>{y.year}</b> — ซ่อนจากตัวเลือก (ข้อมูลยังอยู่ครบ เปิดคืนได้)</>, variant: on ? 'primary' : 'warning', confirmText: on ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }))) return;
    setYearActive(y.id, on);
    reloadYears();
    notify({ title: on ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว', message: `ปีการศึกษา ${y.year}`, variant: 'success' });
  }

  async function removeYear(y: AcademicYear) {
    const u = yearUsage(y.id);
    const warn = u.classrooms > 0 || u.courses > 0
      ? <><br /><br /><span style={{ color: 'var(--absent)' }}>⚠️ ปีนี้มี {u.classrooms} ห้อง และ {u.courses} รายวิชาผูกอยู่ — จะถูกลบทั้งหมด (รวมคะแนน)</span></> : null;
    if (!(await confirm({ title: `ลบปีการศึกษา ${y.year}?`, message: <>การลบย้อนกลับไม่ได้{warn}</>, variant: 'danger', confirmText: 'ลบปีการศึกษา' }))) return;
    deleteAcademicYear(y.id);
    if (selYear === y.id) setSelYear('');
    reloadYears();
    notify({ title: 'ลบปีการศึกษาแล้ว', message: `ปีการศึกษา ${y.year}`, variant: 'success' });
  }

  async function addGrade() {
    const g = newGrade.trim();
    if (!selYear) { notify({ title: 'ยังทำรายการไม่ได้', message: 'เลือกปีการศึกษาก่อน', variant: 'warning' }); return; }
    if (!g) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกชื่อระดับชั้น เช่น ม.4', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'เพิ่มระดับชั้น?', message: <>เพิ่มระดับชั้น <b>{g}</b></>, confirmText: 'เพิ่มชั้น' }))) return;
    if (!createGradeLevel(selYear, g)) { notify({ title: 'เพิ่มไม่สำเร็จ', message: 'ระดับชั้นนี้มีอยู่แล้วในปีนี้', variant: 'danger' }); return; }
    setNewGrade(''); setGrades(getGradeLevels(selYear));
    notify({ title: 'เพิ่มระดับชั้นแล้ว', message: g, variant: 'success' });
  }

  async function removeGrade(g: GradeLevel) {
    if (!(await confirm({ title: `ลบระดับชั้น ${g.name}?`, message: 'ห้อง/วิชา/คะแนนในชั้นนี้จะถูกลบด้วย — ย้อนกลับไม่ได้', variant: 'danger', confirmText: 'ลบระดับชั้น' }))) return;
    deleteGradeLevel(g.id);
    if (selGrade === g.id) setSelGrade('');
    setGrades(getGradeLevels(selYear));
    notify({ title: 'ลบระดับชั้นแล้ว', message: g.name, variant: 'success' });
  }

  async function addRoom() {
    const r = newRoom.trim();
    if (!selGrade) { notify({ title: 'ยังทำรายการไม่ได้', message: 'เลือกระดับชั้นก่อน', variant: 'warning' }); return; }
    if (!r) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกเลขห้อง เช่น 3', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'เพิ่มห้องเรียน?', message: <>เพิ่มห้อง <b>{gradeName}/{r}</b></>, confirmText: 'เพิ่มห้อง' }))) return;
    if (!createClassroom(selYear, selGrade, r)) { notify({ title: 'เพิ่มไม่สำเร็จ', message: 'ห้องนี้มีอยู่แล้ว', variant: 'danger' }); return; }
    setNewRoom(''); setRooms(getClassrooms(selGrade));
    notify({ title: 'เพิ่มห้องแล้ว', message: `${gradeName}/${r}`, variant: 'success' });
  }

  async function removeRoom(c: Classroom) {
    const u = classroomUsage(c.id);
    const warn = u.courses > 0 ? <><br /><br /><span style={{ color: 'var(--absent)' }}>⚠️ ห้องนี้มี {u.courses} รายวิชา{u.scored ? ' และมีคะแนนบันทึกแล้ว' : ''} — จะถูกลบด้วย</span></> : null;
    if (!(await confirm({ title: `ลบห้อง ${gradeName}/${c.room}?`, message: <>การลบย้อนกลับไม่ได้{warn}</>, variant: 'danger', confirmText: 'ลบห้อง' }))) return;
    deleteClassroom(c.id);
    setRooms(getClassrooms(selGrade));
    notify({ title: 'ลบห้องแล้ว', message: `${gradeName}/${c.room}`, variant: 'success' });
  }

  if (!allowed) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>จัดโครงสร้างวิชาการ</b><br />
            ผู้ดูแลระบบเปิดสิทธิ์ “จัดโครงสร้างวิชาการ (ปี/ชั้น/ห้อง)” ให้ครูที่รับผิดชอบได้ในหน้าสิทธิ์การเข้าถึง
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">โครงสร้าง<em>วิชาการ</em></h2>
          <p className="panel-sub">
            จัดการปีการศึกษา · ระดับชั้น · ห้องเรียน — ปิดปีเก่าเพื่อซ่อนจากตัวเลือก (ข้อมูลยังอยู่ครบ กดเปิดคืนได้)
          </p>
        </div>

        {/* ── ปีการศึกษา ── */}
        <div className="panel-body" style={{ marginBottom: '1rem' }}>
          <div className="stu-info-card-title">ปีการศึกษา</div>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {years.length === 0 ? <div className="acad-empty">ยังไม่มีปีการศึกษา</div> : years.map(y => {
              const active = y.active !== false;
              return (
                <div key={y.id} className={`sched-log-row${selYear === y.id ? '' : ''}`} style={{ alignItems: 'center', cursor: 'pointer', border: selYear === y.id ? '2px solid var(--brown-mid)' : undefined }} onClick={() => setSelYear(y.id)}>
                  <span className={`sched-type-badge ${active ? 'sched-type-activity' : 'sched-type-club'}`}>{active ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span>
                  <div className="sched-log-body"><div className="sched-log-detail" style={{ fontWeight: 700 }}>ปีการศึกษา {y.year}</div></div>
                  <button className="ez-btn ez-btn-ghost acad-btn" onClick={e => { e.stopPropagation(); toggleYear(y); }}>{active ? '⏸ ปิด' : '▶️ เปิด'}</button>
                  <button className="ez-btn ez-btn-ghost acad-btn" style={{ color: 'var(--absent)' }} onClick={e => { e.stopPropagation(); removeYear(y); }}>🗑</button>
                </div>
              );
            })}
          </div>
          <div className="acad-add-row">
            <input className="ez-input acad-input" placeholder="ปีใหม่ เช่น 2568" value={newYear} onChange={e => setNewYear(e.target.value)} />
            <button className="ez-btn ez-btn-primary acad-btn" onClick={addYear}>➕ เพิ่มปี</button>
          </div>
        </div>

        {/* ── ระดับชั้น ── */}
        {selYear && (
          <div className="panel-body" style={{ marginBottom: '1rem' }}>
            <div className="stu-info-card-title">ระดับชั้น — ปี {years.find(y => y.id === selYear)?.year}</div>
            <div className="acad-students" style={{ marginBottom: '0.85rem' }}>
              {grades.length === 0 ? <span className="acad-empty">ยังไม่มีระดับชั้น</span> : grades.map(g => (
                <div key={g.id} className={`acad-student-chip${selGrade === g.id ? '' : ''}`} style={{ cursor: 'pointer', borderColor: selGrade === g.id ? 'var(--brown-mid)' : undefined }} onClick={() => setSelGrade(g.id)}>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                  <button className="acad-student-del" onClick={e => { e.stopPropagation(); removeGrade(g); }}>✕</button>
                </div>
              ))}
            </div>
            <div className="acad-add-row">
              <input className="ez-input acad-input" placeholder="ชั้นใหม่ เช่น ม.4" value={newGrade} onChange={e => setNewGrade(e.target.value)} />
              <button className="ez-btn ez-btn-primary acad-btn" onClick={addGrade}>➕ เพิ่มชั้น</button>
            </div>
          </div>
        )}

        {/* ── ห้องเรียน ── */}
        {selGrade && (
          <div className="panel-body" style={{ marginBottom: '1rem' }}>
            <div className="stu-info-card-title">ห้องเรียน — {gradeName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(คลิกห้องเพื่อจัดนักเรียน)</span></div>
            <div className="acad-students" style={{ marginBottom: '0.85rem' }}>
              {rooms.length === 0 ? <span className="acad-empty">ยังไม่มีห้อง</span> : rooms.map(c => (
                <div key={c.id} className="acad-student-chip" style={{ cursor: 'pointer', borderColor: selRoom === c.id ? 'var(--brown-mid)' : undefined, background: selRoom === c.id ? 'var(--cream-dark)' : undefined }} onClick={() => setSelRoom(c.id)}>
                  <span style={{ fontWeight: 600 }}>{gradeName}/{c.room}</span>
                  <button className="acad-student-del" onClick={e => { e.stopPropagation(); removeRoom(c); }}>✕</button>
                </div>
              ))}
            </div>
            <div className="acad-add-row">
              <input className="ez-input acad-input" placeholder="เลขห้องใหม่ เช่น 3" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
              <button className="ez-btn ez-btn-primary acad-btn" onClick={addRoom}>➕ เพิ่มห้อง</button>
            </div>
          </div>
        )}

        {/* ── นักเรียนในห้อง (ให้ระบบบันทึกคะแนนดึงไปใช้จริง) ── */}
        {selRoom && (
          <div className="panel-body">
            <div className="stu-info-card-title">นักเรียนในห้อง {gradeName}/{roomNo} ({students.length} คน)</div>
            <div className="ez-help-box" style={{ marginBottom: '0.85rem' }}>
              รายชื่อนี้คือทะเบียนห้องจริง — <b>ระบบบันทึกคะแนนและตารางเรียนของนักเรียนจะดึงจากตรงนี้</b>
            </div>
            <div className="acad-students" style={{ marginBottom: '0.85rem' }}>
              {students.length === 0 ? <span className="acad-empty">ยังไม่มีนักเรียนในห้องนี้ — เพิ่มด้านล่าง</span> : students.map(s => (
                <div key={s.code} className="acad-student-chip">
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.code}</span>
                  <span>{s.name}</span>
                  {s.classId === selRoom && <button className="acad-student-del" onClick={() => removeStudent(s)}>✕</button>}
                </div>
              ))}
            </div>
            <div className="acad-add-row">
              <input className="ez-input acad-input" placeholder="รหัสนักเรียน เช่น 10026" value={newStuCode} onChange={e => setNewStuCode(e.target.value)} />
              <input className="ez-input acad-input" style={{ flex: 1.5 }} placeholder="ชื่อ-นามสกุล" value={newStuName} onChange={e => setNewStuName(e.target.value)} />
              <button className="ez-btn ez-btn-primary acad-btn" onClick={addStudent}>➕ เพิ่มนักเรียน</button>
            </div>
            {students.length > 0 && (
              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className={`ez-btn ${promoteArm ? 'ez-btn-primary' : 'ez-btn-ghost'}`} onClick={async () => {
                  if (!(await confirm({ title: 'เลื่อนทั้งห้องขึ้นชั้นถัดไป?', message: <>สร้างห้องปีถัดไปให้อัตโนมัติ + คัดลอกรายชื่อ <b>{students.length} คน</b> (รหัสเดิม)</>, confirmText: 'เลื่อนชั้น' }))) return;
                  const r = promoteClassroom(selRoom);
                  setPromoteArm(false);
                  if (r.ok) { reloadYears(); notify({ title: 'เลื่อนชั้นสำเร็จ', message: `เลื่อนขึ้น ${r.targetGrade} ปีการศึกษา ${r.targetYear} (${students.length} คน)`, variant: 'success' }); }
                  else notify({ title: 'เลื่อนชั้นไม่สำเร็จ', message: r.error || '', variant: 'danger' });
                }}>{promoteArm ? '⬆ กดอีกครั้งเพื่อยืนยันการเลื่อนชั้น' : '⬆ เลื่อนทั้งห้องขึ้นชั้นถัดไป (ปีถัดไป)'}</button>
                {promoteArm
                  ? <button className="ez-btn ez-btn-ghost" onClick={() => setPromoteArm(false)}>ยกเลิก</button>
                  : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>สร้างห้องปีถัดไปให้อัตโนมัติ + คัดลอกรายชื่อ (รหัสเดิม)</span>}
              </div>
            )}
          </div>
        )}

        {onGoToPlan && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="ez-btn ez-btn-primary" style={{ minWidth: 260 }} onClick={onGoToPlan}>ไปต่อที่แผนการเรียน →</button>
          </div>
        )}
      </div>
    </div>
  );
}
