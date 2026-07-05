'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms, getCourses, createCourse,
  getClassroomStudents, getScores, saveScores, calcTotal, calcGrade,
  type AcademicYear, type GradeLevel, type Classroom, type Course, type ScoreEntry,
} from '@/lib/api/academic.store';
import { exportScoreSheetToExcel } from '@/lib/utils/excel-export';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherId: string;
  teacherName: string;
}

/**
 * บันทึกคะแนน (แนว ปพ.5)
 * Flow: เลือกปีการศึกษา → ระดับชั้น → ห้องเรียน → รายวิชา → ตารางบันทึกคะแนน
 * ปี/ชั้น/ห้อง แอดมินสร้างเท่านั้น — ครูสร้างได้เฉพาะรายวิชา
 */
export default function GradebookView({ teacherId, teacherName }: Props) {
  const { showToast } = useToast();

  // ── โครงสร้างที่แอดมินสร้างไว้ ──
  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [classrooms,  setClassrooms]  = useState<Classroom[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);

  // ── การเลือกตาม flow ──
  const [selYear,   setSelYear]   = useState<AcademicYear | null>(null);
  const [selGrade,  setSelGrade]  = useState<GradeLevel | null>(null);
  const [selRoom,   setSelRoom]   = useState<Classroom | null>(null);
  const [selCourse, setSelCourse] = useState<Course | null>(null);

  // ── ฟอร์มสร้างรายวิชา ──
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [maxCollected, setMaxCollected] = useState(60);
  const [maxMidterm,   setMaxMidterm]   = useState(20);
  const [maxFinal,     setMaxFinal]     = useState(20);

  // ── ตารางคะแนน ──
  const [entries, setEntries] = useState<ScoreEntry[]>([]);

  useEffect(() => { setYears(getAcademicYears()); }, []);
  useEffect(() => { setGradeLevels(selYear ? getGradeLevels(selYear.id) : []); }, [selYear]);
  useEffect(() => { setClassrooms(selGrade ? getClassrooms(selGrade.id) : []); }, [selGrade]);

  const refreshCourses = useCallback(() => {
    setCourses(selRoom ? getCourses(selRoom.id) : []);
  }, [selRoom]);
  useEffect(() => { refreshCourses(); }, [refreshCourses]);

  useEffect(() => { setEntries(selCourse ? getScores(selCourse.id) : []); }, [selCourse]);

  // เลือกใหม่ระดับบน → ล้างระดับล่าง
  function pickYear(y: AcademicYear)  { setSelYear(y);  setSelGrade(null); setSelRoom(null); setSelCourse(null); }
  function pickGrade(g: GradeLevel)   { setSelGrade(g); setSelRoom(null);  setSelCourse(null); }
  function pickRoom(r: Classroom)     { setSelRoom(r);  setSelCourse(null); }

  function handleCreateCourse() {
    if (!selRoom) return;
    if (!courseCode.trim() || !courseName.trim()) { showToast('⚠️ กรอกรหัสวิชาและชื่อวิชาก่อน'); return; }
    if (maxCollected + maxMidterm + maxFinal !== 100) { showToast('⚠️ สัดส่วนคะแนนต้องรวมได้ 100 (ตอนนี้ ' + (maxCollected + maxMidterm + maxFinal) + ')'); return; }
    const course = createCourse({
      classroomId: selRoom.id, code: courseCode.trim(), name: courseName.trim(),
      key: 'math', teacherId, teacherName, maxCollected, maxMidterm, maxFinal,
    });
    showToast(`✅ สร้างรายวิชา ${course.name} แล้ว — กด "บันทึกคะแนน" เพื่อเริ่มกรอก`);
    setCourseCode(''); setCourseName(''); setShowCourseForm(false);
    refreshCourses();
  }

  function updateEntry(code: string, field: 'collected' | 'midterm' | 'final', raw: string, max: number) {
    setEntries(prev => prev.map(e => {
      if (e.studentCode !== code) return e;
      if (raw === '') return { ...e, [field]: null };
      const v = Math.min(Math.max(parseFloat(raw) || 0, 0), max);
      return { ...e, [field]: v };
    }));
  }

  function handleSaveScores() {
    if (!selCourse) return;
    saveScores(selCourse.id, entries);
    showToast('✅ บันทึกคะแนนแล้ว — พร้อมใช้คำนวณเกรดและออกเอกสาร ปพ.');
  }

  async function handleExport() {
    if (!selCourse || !selGrade || !selRoom || !selYear) return;
    await exportScoreSheetToExcel(selCourse, `${selGrade.name}/${selRoom.room}`, selYear.year, entries);
    showToast('📥 ดาวน์โหลดแบบบันทึกผลการเรียน (ปพ.5) แล้ว');
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.65rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none',
    background: 'var(--warm-white)', color: 'var(--text-body)', width: '100%',
  };
  const scoreInputStyle: React.CSSProperties = { ...inputStyle, width: 72, textAlign: 'center' };
  const chip = (active: boolean): string => `dash-tab-btn${active ? ' active' : ''}`;

  const students = selRoom ? getClassroomStudents(selRoom.id) : [];

  return (
    <div className="dash-section">
      <div className="dash-section-title">📝 บันทึกคะแนน (ปพ.5)</div>

      {/* ── Breadcrumb แสดง flow ── */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {selYear ? `ปีการศึกษา ${selYear.year}` : 'เลือกปีการศึกษา'}
        {selGrade && ` › ${selGrade.name}`}
        {selRoom && `/${selRoom.room}`}
        {selCourse && ` › ${selCourse.name} (${selCourse.code})`}
      </div>

      {/* ── ขั้นที่ 1: ปีการศึกษา ── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>1) ปีการศึกษา <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(สร้างโดยแอดมินเท่านั้น)</span></div>
        <div className="dash-tabs-bar">
          {years.length === 0
            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยังไม่มีปีการศึกษา — แจ้งแอดมินให้สร้างก่อน</span>
            : years.map(y => <button key={y.id} className={chip(selYear?.id === y.id)} onClick={() => pickYear(y)}>ปี {y.year}</button>)}
        </div>
      </div>

      {/* ── ขั้นที่ 2: ระดับชั้น ── */}
      {selYear && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>2) ระดับชั้น</div>
          <div className="dash-tabs-bar">
            {gradeLevels.length === 0
              ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยังไม่มีระดับชั้นในปีนี้ — แจ้งแอดมิน</span>
              : gradeLevels.map(g => <button key={g.id} className={chip(selGrade?.id === g.id)} onClick={() => pickGrade(g)}>{g.name}</button>)}
          </div>
        </div>
      )}

      {/* ── ขั้นที่ 3: ห้องเรียน ── */}
      {selGrade && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>3) ห้องเรียน</div>
          <div className="dash-tabs-bar">
            {classrooms.length === 0
              ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยังไม่มีห้องในระดับชั้นนี้ — แจ้งแอดมิน</span>
              : classrooms.map(r => <button key={r.id} className={chip(selRoom?.id === r.id)} onClick={() => pickRoom(r)}>{selGrade.name}/{r.room}</button>)}
          </div>
        </div>
      )}

      {/* ── ขั้นที่ 4: รายวิชา (ครูสร้างเองได้) ── */}
      {selRoom && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>4) รายวิชา <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ครูสร้างได้)</span></div>
          <div className="dash-tabs-bar" style={{ marginBottom: '0.6rem' }}>
            {courses.map(c => <button key={c.id} className={chip(selCourse?.id === c.id)} onClick={() => setSelCourse(c)}>{c.name} ({c.code})</button>)}
            <button className="dash-tab-btn" onClick={() => setShowCourseForm(s => !s)}>➕ สร้างรายวิชา</button>
          </div>

          {showCourseForm && (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>รหัสวิชา</label>
                  <input style={inputStyle} placeholder="เช่น ค21101" value={courseCode} onChange={e => setCourseCode(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ชื่อวิชา</label>
                  <input style={inputStyle} placeholder="เช่น คณิตศาสตร์พื้นฐาน" value={courseName} onChange={e => setCourseName(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>คะแนนเก็บ</label>
                  <input style={inputStyle} type="number" value={maxCollected} onChange={e => setMaxCollected(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>กลางภาค</label>
                  <input style={inputStyle} type="number" value={maxMidterm} onChange={e => setMaxMidterm(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ปลายภาค</label>
                  <input style={inputStyle} type="number" value={maxFinal} onChange={e => setMaxFinal(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: maxCollected + maxMidterm + maxFinal === 100 ? 'var(--success)' : 'var(--absent)' }}>
                สัดส่วนรวม: {maxCollected + maxMidterm + maxFinal}/100
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="dash-action-btn" onClick={handleCreateCourse}>✅ สร้างรายวิชา</button>
                <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={() => setShowCourseForm(false)}>ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ขั้นที่ 5: ตารางบันทึกคะแนน ── */}
      {selCourse && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.92rem' }}>
              ตารางคะแนน — {selCourse.name} ({selCourse.code}) · {students.length} คน
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="dash-action-btn" onClick={handleSaveScores}>💾 บันทึกคะแนน</button>
              <button className="dash-action-btn" onClick={handleExport}>📥 ดึงเอกสาร ปพ.5 (Excel)</button>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="stu-empty">ห้องนี้ยังไม่มีนักเรียนในระบบ — แอดมินต้องเพิ่มนักเรียนเข้าห้องก่อน</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--brown-dark)', color: 'var(--cream)' }}>
                    {['ลำดับ', 'รหัส', 'ชื่อ-นามสกุล', `เก็บ (${selCourse.maxCollected})`, `กลางภาค (${selCourse.maxMidterm})`, `ปลายภาค (${selCourse.maxFinal})`, 'รวม', 'เกรด'].map((h, i) => (
                      <th key={i} style={{ padding: '0.6rem 0.7rem', textAlign: i === 2 ? 'left' : 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => {
                    const total = calcTotal(e);
                    const grade = calcGrade(total);
                    return (
                      <tr key={e.studentCode} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 ? 'rgba(107,79,47,0.03)' : 'transparent' }}>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{e.studentCode}</td>
                        <td style={{ padding: '0.45rem 0.7rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{e.studentName}</td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center' }}>
                          <input style={scoreInputStyle} type="number" min={0} max={selCourse.maxCollected} value={e.collected ?? ''} onChange={ev => updateEntry(e.studentCode, 'collected', ev.target.value, selCourse.maxCollected)} />
                        </td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center' }}>
                          <input style={scoreInputStyle} type="number" min={0} max={selCourse.maxMidterm} value={e.midterm ?? ''} onChange={ev => updateEntry(e.studentCode, 'midterm', ev.target.value, selCourse.maxMidterm)} />
                        </td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center' }}>
                          <input style={scoreInputStyle} type="number" min={0} max={selCourse.maxFinal} value={e.final ?? ''} onChange={ev => updateEntry(e.studentCode, 'final', ev.target.value, selCourse.maxFinal)} />
                        </td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center', fontWeight: 600, color: 'var(--brown-dark)' }}>{total ?? '—'}</td>
                        <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center' }}>
                          <span className={`stu-hw-status-badge ${grade !== '—' && parseFloat(grade) >= 2 ? 'badge-graded' : grade === '—' ? 'badge-pending' : 'badge-overdue'}`}>{grade}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '0.9rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            💡 คะแนนที่บันทึกจะถูกเก็บไว้เพื่อคำนวณเกรด (เกณฑ์ สพฐ.: 80+ = 4, 75 = 3.5, 70 = 3, ...) และนำไปออกเอกสาร ปพ. / ใบออกเกรดต่อไป
            <br />TODO(PostgreSQL): ย้ายไป table score_records + สร้างเอกสาร ปพ.1/ปพ.6 จากข้อมูลจริง
          </div>
        </div>
      )}
    </div>
  );
}
