'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms, getClassroomStudents,
  syncTeacherCourses, updateCourseComponents, getScores, saveScores,
  calcTotal, calcGrade, calcPercent, maxTotal, PRESET_COMPONENTS,
  type AcademicYear, type GradeLevel, type Classroom, type Course, type ScoreEntry, type ScoreComponent,
} from '@/lib/api/academic.store';
import { getSession } from '@/lib/api/auth.api';
import { logActivity, logActivityThrottled } from '@/lib/api/activity.log';
import { exportScoreSheetToExcel } from '@/lib/utils/excel-export';
import type { ClassInfo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherId: string;
  teacherName: string;
  classes: ClassInfo[];   // ตารางสอนของครู — ใช้ดึงรายวิชาอัตโนมัติ
}

/**
 * บันทึกคะแนน (ปพ.5)
 * Flow: ปีการศึกษา → ระดับชั้น → ห้องที่มีรายการสอน → วิชาแสดงอัตโนมัติจากตารางสอน
 * สิทธิ์: เฉพาะครูประจำวิชา + super admin (บังคับซ้ำใน academic.store ทุกจุดเขียนข้อมูล)
 * บันทึกอัตโนมัติ real-time — ไม่มีปุ่มบันทึก
 */
export default function GradebookView({ teacherId, teacherName, classes }: Props) {
  const { showToast } = useToast();
  const session = getSession();
  const isAdmin = session?.role === 'web_admin';

  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [classrooms,  setClassrooms]  = useState<Classroom[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);

  const [selYear,     setSelYear]     = useState<AcademicYear | null>(null);
  const [selGrade,    setSelGrade]    = useState<GradeLevel | null>(null);
  const [selRoom,     setSelRoom]     = useState<Classroom | null>(null);
  const [selCourseId, setSelCourseId] = useState<string | null>(null);

  const [entries,     setEntries]     = useState<ScoreEntry[]>([]);
  const [lastSaved,   setLastSaved]   = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customName,  setCustomName]  = useState('');
  const [customMax,   setCustomMax]   = useState(10);

  const selCourse = courses.find(c => c.id === selCourseId) || null;

  useEffect(() => { setYears(getAcademicYears()); }, []);
  useEffect(() => { setGradeLevels(selYear ? getGradeLevels(selYear.id) : []); }, [selYear]);
  useEffect(() => { setClassrooms(selGrade ? getClassrooms(selGrade.id) : []); }, [selGrade]);

  const refreshCourses = useCallback(() => {
    setCourses(selRoom ? syncTeacherCourses(selRoom.id, classes, { id: teacherId, name: teacherName }) : []);
  }, [selRoom, classes, teacherId, teacherName]);
  useEffect(() => { refreshCourses(); }, [refreshCourses]);

  useEffect(() => {
    setEntries(selCourseId ? getScores(selCourseId) : []);
    setLastSaved(null);
    setShowSettings(false);
  }, [selCourseId]);

  // เลือกใหม่ระดับบน → ล้างระดับล่าง
  function pickYear(y: AcademicYear)  { setSelYear(y);  setSelGrade(null); setSelRoom(null); setSelCourseId(null); }
  function pickGrade(g: GradeLevel)   { setSelGrade(g); setSelRoom(null);  setSelCourseId(null); }
  function pickRoom(r: Classroom)     { setSelRoom(r);  setSelCourseId(null); }

  // ── กรองตามตารางสอนของครู (super admin เห็นทั้งหมด) ──
  const teachesInGrade = (g: GradeLevel) => isAdmin || classes.some(c => c.grade === g.name);
  const teachesInRoom  = (r: Classroom) => isAdmin || (selGrade ? classes.some(c => c.grade === selGrade.name && c.room === r.room) : false);
  const visibleGrades = gradeLevels.filter(teachesInGrade);
  const visibleRooms  = classrooms.filter(teachesInRoom);

  // ── บันทึกอัตโนมัติ real-time ──
  function autoSave(next: ScoreEntry[]) {
    if (!selCourseId) return;
    if (saveScores(selCourseId, next)) {
      setLastSaved(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      // log กันถี่ — การพิมพ์ต่อเนื่องในวิชาเดียวกัน บันทึก log ครั้งเดียวต่อนาที
      logActivityThrottled('teacher', 'บันทึกคะแนน', `${selCourse?.name} (${selCourse?.code})`, `score:${selCourseId}`);
    } else {
      showToast('🔒 ไม่มีสิทธิ์บันทึกคะแนนวิชานี้ — เฉพาะครูประจำวิชาเท่านั้น');
    }
  }

  function updateEntry(code: string, componentId: string, raw: string, max: number) {
    setEntries(prev => {
      const next = prev.map(e => {
        if (e.studentCode !== code) return e;
        const v = raw === '' ? null : Math.min(Math.max(parseFloat(raw) || 0, 0), max);
        return { ...e, scores: { ...e.scores, [componentId]: v } };
      });
      autoSave(next);
      return next;
    });
  }

  // ── ตั้งค่าสัดส่วนคะแนน (real-time เช่นกัน) ──
  function applyComponents(components: ScoreComponent[]) {
    if (!selCourse) return;
    if (updateCourseComponents(selCourse.id, components)) {
      logActivity('teacher', 'แก้สัดส่วนคะแนน', `${selCourse.name} (${selCourse.code}) → ${components.map(c => `${c.name} ${c.max}`).join(' / ')}`);
      refreshCourses();
      setEntries(getScores(selCourse.id));
      setLastSaved(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      showToast('🔒 ไม่มีสิทธิ์แก้สัดส่วนคะแนนวิชานี้');
    }
  }

  function editComponent(id: string, field: 'name' | 'max', value: string) {
    if (!selCourse) return;
    applyComponents(selCourse.components.map(c =>
      c.id !== id ? c : field === 'name' ? { ...c, name: value } : { ...c, max: Math.max(parseInt(value) || 0, 0) }
    ));
  }

  function addComponent(name: string, max: number) {
    if (!selCourse || !name.trim() || max <= 0) { showToast('⚠️ ใส่ชื่อหัวข้อและคะแนนเต็มก่อน'); return; }
    if (selCourse.components.some(c => c.name === name.trim())) { showToast('⚠️ มีหัวข้อนี้อยู่แล้ว'); return; }
    applyComponents([...selCourse.components, { id: `cmp${Date.now()}`, name: name.trim(), max }]);
    showToast(`✅ เพิ่มหัวข้อ "${name.trim()}" แล้ว`);
  }

  function removeComponent(c: ScoreComponent) {
    if (!selCourse) return;
    if (selCourse.components.length <= 1) { showToast('⚠️ ต้องมีหัวข้อคะแนนอย่างน้อย 1 หัวข้อ'); return; }
    if (!window.confirm(`ลบหัวข้อ "${c.name}"? คะแนนที่กรอกไว้ในหัวข้อนี้จะถูกลบด้วย`)) return;
    applyComponents(selCourse.components.filter(x => x.id !== c.id));
  }

  async function handleExport() {
    if (!selCourse || !selGrade || !selRoom || !selYear) return;
    await exportScoreSheetToExcel(selCourse, `${selGrade.name}/${selRoom.room}`, selYear.year, entries);
    logActivity('teacher', 'ดาวน์โหลด ปพ.5', `${selCourse.name} (${selCourse.code}) ห้อง ${selGrade.name}/${selRoom.room}`);
    showToast('📥 ดาวน์โหลดแบบบันทึกผลการเรียน (ปพ.5) แล้ว');
  }

  // ── ไม่มีสิทธิ์เข้าหน้านี้ ──
  if (!session || (session.role !== 'teacher' && session.role !== 'web_admin')) {
    return (
      <div className="dash-section ez-sm">
        <div className="ez-title">📝 บันทึกคะแนน (ปพ.5)</div>
        <div className="ez-help-box" style={{ background: 'rgba(160,80,80,0.08)', borderColor: 'rgba(160,80,80,0.3)' }}>
          🔒 หน้านี้ใช้ได้เฉพาะ <b>ครูประจำวิชา</b> และ <b>ผู้ดูแลระบบ (super admin)</b> เท่านั้น
        </div>
      </div>
    );
  }

  const students = selRoom ? getClassroomStudents(selRoom.id) : [];
  const filledCount = entries.filter(e => Object.values(e.scores).some(v => v !== null)).length;
  const courseMax = selCourse ? maxTotal(selCourse) : 0;

  function StepHead({ num, title, picked, hint }: { num: number; title: string; picked?: string; hint?: string }) {
    return (
      <div className="ez-step-head">
        <div className={`ez-step-num${picked ? ' done' : ''}`}>{picked ? '✓' : num}</div>
        <div>
          <span className="ez-step-title">{title}</span>
          {picked && <span className="ez-step-picked"> — {picked}</span>}
          {!picked && hint && <div className="ez-step-hint">{hint}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section ez-sm">
      <div className="ez-title">📝 บันทึกคะแนน (ปพ.5)</div>
      <div className="ez-subtitle">
        เลือกปี → ชั้น → ห้องที่ท่านสอน แล้ววิชาของท่านจะแสดงอัตโนมัติจากตารางสอน · คะแนนบันทึกทันทีที่พิมพ์ ไม่ต้องกดปุ่มใด ๆ
      </div>

      {/* ── ขั้นที่ 1: ปีการศึกษา ── */}
      <div className="ez-step">
        <StepHead num={1} title="ปีการศึกษา" picked={selYear ? `ปี ${selYear.year}` : undefined} />
        <div className="ez-choice-row">
          {years.length === 0
            ? <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ยังไม่มีปีการศึกษา — แจ้งแอดมินให้สร้างก่อน</span>
            : years.map(y => <button key={y.id} className={`ez-choice-btn${selYear?.id === y.id ? ' active' : ''}`} onClick={() => pickYear(y)}>{selYear?.id === y.id ? '✓ ' : ''}ปี {y.year}</button>)}
        </div>
      </div>

      {/* ── ขั้นที่ 2: ระดับชั้น (เฉพาะชั้นที่มีรายการสอน) ── */}
      {selYear && (
        <div className="ez-step">
          <StepHead num={2} title="ระดับชั้น" picked={selGrade?.name} hint={isAdmin ? undefined : 'แสดงเฉพาะชั้นที่ท่านมีชั่วโมงสอน'} />
          <div className="ez-choice-row">
            {visibleGrades.length === 0
              ? <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ไม่พบชั้นที่ท่านสอนในปีนี้</span>
              : visibleGrades.map(g => <button key={g.id} className={`ez-choice-btn${selGrade?.id === g.id ? ' active' : ''}`} onClick={() => pickGrade(g)}>{selGrade?.id === g.id ? '✓ ' : ''}{g.name}</button>)}
          </div>
        </div>
      )}

      {/* ── ขั้นที่ 3: ห้องที่มีรายการสอน ── */}
      {selGrade && (
        <div className="ez-step">
          <StepHead num={3} title="ห้องที่สอน" picked={selRoom ? `${selGrade.name}/${selRoom.room}` : undefined} />
          <div className="ez-choice-row">
            {visibleRooms.length === 0
              ? <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ไม่พบห้องที่ท่านสอนในชั้นนี้</span>
              : visibleRooms.map(r => <button key={r.id} className={`ez-choice-btn${selRoom?.id === r.id ? ' active' : ''}`} onClick={() => pickRoom(r)}>{selRoom?.id === r.id ? '✓ ' : ''}ห้อง {selGrade.name}/{r.room}</button>)}
          </div>
        </div>
      )}

      {/* ── ขั้นที่ 4: วิชาที่สอน (อัตโนมัติจากตารางสอน) ── */}
      {selRoom && (
        <div className="ez-step">
          <StepHead num={4} title="วิชาที่ท่านสอนในห้องนี้" picked={selCourse ? `${selCourse.name} (${selCourse.code})` : undefined} hint="ดึงจากตารางสอนโดยอัตโนมัติ" />
          <div className="ez-choice-row">
            {courses.length === 0
              ? <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ตารางสอนของท่านไม่มีวิชาในห้องนี้ — ติดต่อแอดมินหากข้อมูลไม่ถูกต้อง</span>
              : courses.map(c => <button key={c.id} className={`ez-choice-btn${selCourseId === c.id ? ' active' : ''}`} onClick={() => setSelCourseId(c.id)}>{selCourseId === c.id ? '✓ ' : ''}{c.name} ({c.code})</button>)}
          </div>
        </div>
      )}

      {/* ── ขั้นที่ 5: ตารางคะแนน ── */}
      {selCourse && (
        <div style={{ background: 'var(--cream)', border: '2px solid var(--border)', borderRadius: 14, padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>
                กรอกคะแนน — {selCourse.name} ({selCourse.code})
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                ห้อง {selGrade?.name}/{selRoom?.room} · นักเรียน {students.length} คน · กรอกแล้ว {filledCount} คน · ครูประจำวิชา: {selCourse.teacherName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {lastSaved
                ? <span className="ez-autosave">✓ บันทึกอัตโนมัติ {lastSaved}</span>
                : <span className="ez-autosave" style={{ color: 'var(--text-muted)', background: 'var(--cream-dark)' }}>บันทึกอัตโนมัติเมื่อพิมพ์</span>}
              <button className="ez-btn ez-btn-ghost" onClick={() => setShowSettings(s => !s)}>⚙️ ตั้งค่าสัดส่วนคะแนน</button>
              <button className="ez-btn ez-btn-ghost" onClick={handleExport}>📥 ปพ.5 (Excel)</button>
            </div>
          </div>

          {/* ── ตั้งค่าสัดส่วนคะแนน ── */}
          {showSettings && (
            <div style={{ background: 'var(--warm-white)', border: '2px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.6rem' }}>
                ⚙️ สัดส่วนคะแนน — รวมคะแนนเต็ม {courseMax} คะแนน (เกรดคิดจากเปอร์เซ็นต์ของคะแนนเต็มรวม)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
                {selCourse.components.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="ez-input" style={{ flex: 1, minWidth: 160 }} value={c.name} onChange={e => editComponent(c.id, 'name', e.target.value)} />
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>เต็ม</span>
                    <input className="ez-score-input" type="number" min={1} value={c.max} onChange={e => editComponent(c.id, 'max', e.target.value)} />
                    <button className="ez-btn ez-btn-ghost" style={{ color: 'var(--absent)', minHeight: 42 }} onClick={() => removeComponent(c)}>🗑 ลบ</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>เพิ่มหัวข้อคะแนน:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                {PRESET_COMPONENTS.filter(p => !selCourse.components.some(c => c.name === p.name)).map(p => (
                  <button key={p.name} className="ez-choice-btn" onClick={() => addComponent(p.name, p.max)}>➕ {p.name} ({p.max})</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="ez-input" style={{ flex: 1, minWidth: 160 }} placeholder="ชื่อหัวข้อกำหนดเอง เช่น คะแนนจิตพิสัย" value={customName} onChange={e => setCustomName(e.target.value)} />
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>เต็ม</span>
                <input className="ez-score-input" type="number" min={1} value={customMax} onChange={e => setCustomMax(parseInt(e.target.value) || 0)} />
                <button className="ez-btn ez-btn-primary" style={{ minHeight: 42 }} onClick={() => { addComponent(customName, customMax); setCustomName(''); setCustomMax(10); }}>➕ เพิ่ม</button>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="stu-empty">ห้องนี้ยังไม่มีนักเรียนในระบบ — แอดมินต้องเพิ่มนักเรียนเข้าห้องก่อน</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="ez-table">
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th style={{ textAlign: 'left' }}>ชื่อ-นามสกุล</th>
                      {selCourse.components.map(c => (
                        <th key={c.id}>{c.name}<br /><span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(เต็ม {c.max})</span></th>
                      ))}
                      <th>รวม<br /><span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(เต็ม {courseMax})</span></th>
                      <th>เกรด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const total = calcTotal(e);
                      const grade = calcGrade(calcPercent(e, selCourse));
                      return (
                        <tr key={e.studentCode}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--brown-dark)' }}>{e.studentName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รหัส {e.studentCode}</div>
                          </td>
                          {selCourse.components.map(c => (
                            <td key={c.id} style={{ textAlign: 'center' }}>
                              <input className="ez-score-input" type="number" min={0} max={c.max} value={e.scores[c.id] ?? ''} onChange={ev => updateEntry(e.studentCode, c.id, ev.target.value, c.max)} />
                            </td>
                          ))}
                          <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: 'var(--brown-dark)' }}>{total ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`ez-badge ${grade !== '—' && parseFloat(grade) >= 2 ? 'ez-badge-done' : grade === '—' ? 'ez-badge-wait' : 'ez-badge-miss'}`}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ez-help-box" style={{ marginTop: '1rem' }}>
                💡 <b>การคำนวณ (ตรวจสอบได้):</b> รวม = ผลบวกคะแนนทุกหัวข้อ · เกรดคิดจากเปอร์เซ็นต์ (รวม ÷ {courseMax} × 100)
                ตามเกณฑ์ สพฐ.: 80% ขึ้นไป = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1
                · คะแนนบันทึกอัตโนมัติทันทีที่พิมพ์ ✓
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
