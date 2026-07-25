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
  getClassroomStudents, addStudentToClassroom, removeStudentFromClassroom,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import { hasPermission } from '@/lib/api/permissions';
import { getSession } from '@/lib/api/auth.api';
import type { TeacherStudent } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props { onGoToPlan?: () => void }

export default function AcademicStructureView({ onGoToPlan }: Props) {
  const { showToast } = useToast();
  const allowed = hasPermission('manageAcademic');

  const [years,  setYears]  = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [rooms,  setRooms]  = useState<Classroom[]>([]);
  const [selYear,  setSelYear]  = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [selRoom,  setSelRoom]  = useState('');
  const [students, setStudents] = useState<TeacherStudent[]>([]);

  const [newYear,  setNewYear]  = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newRoom,  setNewRoom]  = useState('');
  const [newStuCode, setNewStuCode] = useState('');
  const [newStuName, setNewStuName] = useState('');

  const reloadYears = useCallback(() => setYears(getAllAcademicYears()), []);
  useEffect(() => { reloadYears(); }, [reloadYears]);
  useEffect(() => { setGrades(selYear ? getGradeLevels(selYear) : []); setSelGrade(''); setSelRoom(''); }, [selYear, years]);
  useEffect(() => { setRooms(selGrade ? getClassrooms(selGrade) : []); setSelRoom(''); }, [selGrade, grades]);
  useEffect(() => { setStudents(selRoom ? getClassroomStudents(selRoom) : []); }, [selRoom, rooms]);

  const gradeName = grades.find(g => g.id === selGrade)?.name || '';
  const roomNo = rooms.find(r => r.id === selRoom)?.room || '';

  function addStudent() {
    const code = newStuCode.trim(); const name = newStuName.trim();
    if (!selRoom) { showToast('⚠️ เลือกห้องก่อน'); return; }
    if (!code || !name) { showToast('⚠️ กรอกรหัสและชื่อนักเรียนให้ครบ'); return; }
    if (!addStudentToClassroom(selRoom, code, name)) { showToast('⚠️ รหัสนักเรียนนี้อยู่ในห้องแล้ว'); return; }
    showToast(`✅ เพิ่ม ${name} (${code}) เข้าห้อง ${gradeName}/${roomNo}`);
    setNewStuCode(''); setNewStuName(''); setStudents(getClassroomStudents(selRoom));
  }

  function removeStudent(s: TeacherStudent) {
    if (!window.confirm(`ลบ "${s.name}" ออกจากห้อง ${gradeName}/${roomNo}?`)) return;
    removeStudentFromClassroom(selRoom, s.code);
    showToast(`ลบ ${s.name} ออกจากห้องแล้ว`);
    setStudents(getClassroomStudents(selRoom));
  }

  function addYear() {
    const y = newYear.trim();
    if (!/^\d{4}$/.test(y)) { showToast('⚠️ ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2568'); return; }
    if (!createAcademicYear(y, getSession()?.username || 'teacher')) { showToast('⚠️ ปีการศึกษานี้มีอยู่แล้ว'); return; }
    showToast(`✅ เพิ่มปีการศึกษา ${y} แล้ว`); setNewYear(''); reloadYears();
  }

  function toggleYear(y: AcademicYear) {
    const on = y.active === false;
    setYearActive(y.id, on);
    showToast(on ? `▶️ เปิดใช้งานปี ${y.year}` : `⏸ ปิดใช้งานปี ${y.year} — ซ่อนจากตัวเลือก (ข้อมูลยังอยู่)`);
    reloadYears();
  }

  function removeYear(y: AcademicYear) {
    const u = yearUsage(y.id);
    const warn = u.classrooms > 0 || u.courses > 0
      ? `\n\n⚠️ ปีนี้มี ${u.classrooms} ห้อง และ ${u.courses} รายวิชาผูกอยู่ — จะถูกลบทั้งหมด (รวมคะแนน)`
      : '';
    if (!window.confirm(`ลบปีการศึกษา ${y.year}?${warn}`)) return;
    deleteAcademicYear(y.id);
    showToast(`🗑 ลบปีการศึกษา ${y.year} แล้ว`);
    if (selYear === y.id) setSelYear('');
    reloadYears();
  }

  function addGrade() {
    const g = newGrade.trim();
    if (!selYear) { showToast('⚠️ เลือกปีการศึกษาก่อน'); return; }
    if (!g) { showToast('⚠️ กรอกชื่อระดับชั้น เช่น ม.4'); return; }
    if (!createGradeLevel(selYear, g)) { showToast('⚠️ ระดับชั้นนี้มีอยู่แล้วในปีนี้'); return; }
    showToast(`✅ เพิ่มระดับชั้น ${g}`); setNewGrade(''); setGrades(getGradeLevels(selYear));
  }

  function removeGrade(g: GradeLevel) {
    if (!window.confirm(`ลบระดับชั้น ${g.name}? ห้อง/วิชา/คะแนนในชั้นนี้จะถูกลบด้วย`)) return;
    deleteGradeLevel(g.id);
    showToast(`🗑 ลบระดับชั้น ${g.name} แล้ว`);
    if (selGrade === g.id) setSelGrade('');
    setGrades(getGradeLevels(selYear));
  }

  function addRoom() {
    const r = newRoom.trim();
    if (!selGrade) { showToast('⚠️ เลือกระดับชั้นก่อน'); return; }
    if (!r) { showToast('⚠️ กรอกเลขห้อง เช่น 3'); return; }
    if (!createClassroom(selYear, selGrade, r)) { showToast('⚠️ ห้องนี้มีอยู่แล้ว'); return; }
    showToast(`✅ เพิ่มห้อง ${gradeName}/${r}`); setNewRoom(''); setRooms(getClassrooms(selGrade));
  }

  function removeRoom(c: Classroom) {
    const u = classroomUsage(c.id);
    const warn = u.courses > 0 ? `\n\n⚠️ ห้องนี้มี ${u.courses} รายวิชา${u.scored ? ' และมีคะแนนบันทึกแล้ว' : ''} — จะถูกลบด้วย` : '';
    if (!window.confirm(`ลบห้อง ${gradeName}/${c.room}?${warn}`)) return;
    deleteClassroom(c.id);
    showToast(`🗑 ลบห้อง ${gradeName}/${c.room} แล้ว`);
    setRooms(getClassrooms(selGrade));
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
          <h2 className="panel-title">🏫 โครงสร้าง<em>วิชาการ</em></h2>
          <p className="panel-sub">
            จัดการปีการศึกษา · ระดับชั้น · ห้องเรียน — ปิดปีเก่าเพื่อซ่อนจากตัวเลือก (ข้อมูลยังอยู่ครบ กดเปิดคืนได้)
          </p>
        </div>

        {/* ── ปีการศึกษา ── */}
        <div className="panel-body" style={{ marginBottom: '1rem' }}>
          <div className="stu-info-card-title">📅 ปีการศึกษา</div>
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
            <div className="stu-info-card-title">🎓 ระดับชั้น — ปี {years.find(y => y.id === selYear)?.year}</div>
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
            <div className="stu-info-card-title">🚪 ห้องเรียน — {gradeName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(คลิกห้องเพื่อจัดนักเรียน)</span></div>
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
            <div className="stu-info-card-title">👥 นักเรียนในห้อง {gradeName}/{roomNo} ({students.length} คน)</div>
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
