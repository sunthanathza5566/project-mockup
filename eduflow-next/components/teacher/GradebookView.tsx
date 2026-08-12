'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms, getClassroomStudents,
  syncTeacherCourses, updateCourseComponents, getScores, saveScores,
  calcTotal, maxTotal, PRESET_COMPONENTS, resolveGrade, isSpecialGrade, specialGradesFor,
  type AcademicYear, type GradeLevel, type Classroom, type Course, type ScoreEntry, type ScoreComponent,
} from '@/lib/api/academic.store';
import { getSession } from '@/lib/api/auth.api';
import { logActivity, logActivityThrottled } from '@/lib/api/activity.log';
import type { ClassInfo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherId: string;
  teacherName: string;
  classes: ClassInfo[];   // ตารางสอนของครู — ใช้ดึงรายวิชาอัตโนมัติ
}

/**
 * บันทึกคะแนน
 * Flow: ปีการศึกษา → ระดับชั้น → ห้องที่มีรายการสอน → วิชาแสดงอัตโนมัติจากตารางสอน
 * นักเรียนดึงจากทะเบียนห้องจริง (getClassroomStudents) — ครูจัดนักเรียนเข้าห้องได้ที่หน้าโครงสร้างวิชาการ
 * สิทธิ์: เฉพาะครูประจำวิชา + super admin (บังคับซ้ำใน academic.store ทุกจุดเขียนข้อมูล)
 * เอกสารผลการเรียน ปพ.1–9 อยู่ที่เมนูแยก "เอกสารผลการเรียน" · บันทึกอัตโนมัติ real-time — ไม่มีปุ่มบันทึก
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
      showToast('ไม่มีสิทธิ์บันทึกคะแนนวิชานี้ — เฉพาะครูประจำวิชาเท่านั้น');
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

  /** เลือกผลการเรียนแบบสัญลักษณ์ (ผ/มผ/ร/มส/ขส/ขร) — ค่าว่าง = กลับไปใช้เกรดจากคะแนน */
  function updateSymbol(code: string, symbol: string) {
    setEntries(prev => {
      const next = prev.map(e => e.studentCode === code ? { ...e, symbol: symbol || null } : e);
      autoSave(next);
      const student = next.find(e => e.studentCode === code);
      if (symbol && student) {
        logActivity('teacher', 'บันทึกผลการเรียนพิเศษ',
          `${student.studentName} (${code}) → ${symbol} · ${selCourse?.name} (${selCourse?.code})`);
      }
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
      showToast('ไม่มีสิทธิ์แก้สัดส่วนคะแนนวิชานี้');
    }
  }

  function editComponent(id: string, field: 'name' | 'max', value: string) {
    if (!selCourse) return;
    applyComponents(selCourse.components.map(c =>
      c.id !== id ? c : field === 'name' ? { ...c, name: value } : { ...c, max: Math.max(parseInt(value) || 0, 0) }
    ));
  }

  function addComponent(name: string, max: number) {
    if (!selCourse || !name.trim() || max <= 0) { showToast('ใส่ชื่อหัวข้อและคะแนนเต็มก่อน'); return; }
    if (selCourse.components.some(c => c.name === name.trim())) { showToast('มีหัวข้อนี้อยู่แล้ว'); return; }
    applyComponents([...selCourse.components, { id: `cmp${Date.now()}`, name: name.trim(), max }]);
    showToast(`เพิ่มหัวข้อ "${name.trim()}" แล้ว`);
  }

  function removeComponent(c: ScoreComponent) {
    if (!selCourse) return;
    if (selCourse.components.length <= 1) { showToast('ต้องมีหัวข้อคะแนนอย่างน้อย 1 หัวข้อ'); return; }
    if (!window.confirm(`ลบหัวข้อ "${c.name}"? คะแนนที่กรอกไว้ในหัวข้อนี้จะถูกลบด้วย`)) return;
    applyComponents(selCourse.components.filter(x => x.id !== c.id));
  }

  // ── ไม่มีสิทธิ์เข้าหน้านี้ ──
  if (!session || (session.role !== 'teacher' && session.role !== 'web_admin')) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            หน้าบันทึกคะแนน ใช้ได้เฉพาะ <b>ครูประจำวิชา</b> และ <b>ผู้ดูแลระบบ</b> เท่านั้น
          </div>
        </div>
      </div>
    );
  }

  const students = selRoom ? getClassroomStudents(selRoom.id) : [];
  const courseMax = selCourse ? maxTotal(selCourse) : 0;
  // วิชากิจกรรม/ชุมนุม = ไม่คิดเกรด → ซ่อนช่องคะแนน เหลือเฉพาะการประเมิน ผ/มผ
  const isSymbolCourse = selCourse?.gradingMode === 'symbol';
  const symbolOptions = selCourse ? specialGradesFor(selCourse.gradingMode) : [];
  const filledCount = entries.filter(e => e.symbol || Object.values(e.scores).some(v => v !== null)).length;

  /** ช่องเลือก 1 ช่องในแถวเลือกวิชา — มีเลขลำดับกำกับ และติ๊กถูกเมื่อเลือกแล้ว */
  function Picker({ num, label, value, disabled, empty, children, onChange }: {
    num: number; label: string; value: string; disabled?: boolean; empty?: string;
    children: React.ReactNode; onChange: (v: string) => void;
  }) {
    return (
      <div className="gb-pick">
        <label className="gb-pick-label">
          <span className={`gb-pick-num${value ? ' done' : ''}`}>{value ? '✓' : num}</span>
          {label}
        </label>
        <select className="sched-select" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
          <option value="">— เลือก{label} —</option>
          {children}
        </select>
        {!disabled && empty && <div className="gb-pick-hint">{empty}</div>}
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide ez-sm">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">บันทึก<em>คะแนน</em></h2>
          <p className="panel-sub">
            เลือกปี → ชั้น → ห้องที่ท่านสอน แล้ววิชาของท่านจะแสดงอัตโนมัติจากตารางสอน ·
            คะแนนบันทึกทันทีที่พิมพ์ ไม่ต้องกดปุ่มใด ๆ
          </p>
        </div>

        <div className="panel-body">

      {/* ── เลือก ปี → ชั้น → ห้อง → วิชา ในแถวเดียว ── */}
      <div className="gb-picker-row">
        <Picker
          num={1} label="ปีการศึกษา"
          value={selYear?.id || ''}
          empty={years.length === 0 ? 'ยังไม่มีปีการศึกษา — แจ้งแอดมินให้สร้างก่อน' : undefined}
          onChange={v => { const y = years.find(x => x.id === v); if (y) pickYear(y); else { setSelYear(null); setSelGrade(null); setSelRoom(null); setSelCourseId(null); } }}
        >
          {years.map(y => <option key={y.id} value={y.id}>ปี {y.year}</option>)}
        </Picker>

        <Picker
          num={2} label="ระดับชั้น"
          value={selGrade?.id || ''}
          disabled={!selYear}
          empty={selYear && visibleGrades.length === 0 ? 'ไม่พบชั้นที่ท่านสอนในปีนี้' : undefined}
          onChange={v => { const g = visibleGrades.find(x => x.id === v); if (g) pickGrade(g); else { setSelGrade(null); setSelRoom(null); setSelCourseId(null); } }}
        >
          {visibleGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Picker>

        <Picker
          num={3} label="ห้องที่สอน"
          value={selRoom?.id || ''}
          disabled={!selGrade}
          empty={selGrade && visibleRooms.length === 0 ? 'ไม่พบห้องที่ท่านสอนในชั้นนี้' : undefined}
          onChange={v => { const r = visibleRooms.find(x => x.id === v); if (r) pickRoom(r); else { setSelRoom(null); setSelCourseId(null); } }}
        >
          {visibleRooms.map(r => <option key={r.id} value={r.id}>ห้อง {selGrade?.name}/{r.room}</option>)}
        </Picker>

        <Picker
          num={4} label="วิชาที่สอนในห้องนี้"
          value={selCourseId || ''}
          disabled={!selRoom}
          empty={selRoom && courses.length === 0 ? 'ตารางสอนของท่านไม่มีวิชาในห้องนี้ — ติดต่อแอดมินหากข้อมูลไม่ถูกต้อง' : undefined}
          onChange={v => setSelCourseId(v || null)}
        >
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </Picker>
      </div>

      {/* ── ตารางกรอกคะแนน (เต็มความกว้างหน้าจอ) ── */}
      {selCourse && (
        <div className="gb-score-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>
                {isSymbolCourse ? 'ประเมินผล' : 'กรอกคะแนน'} — {selCourse.name} ({selCourse.code})
                {isSymbolCourse && <span className="sched-type-badge sched-type-activity" style={{ marginLeft: '0.5rem' }}>ไม่คิดเกรด · ผ / มผ</span>}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                ห้อง {selGrade?.name}/{selRoom?.room} · นักเรียน {students.length} คน · กรอกแล้ว {filledCount} คน · ครูประจำวิชา: {selCourse.teacherName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {lastSaved
                ? <span className="ez-autosave">✓ บันทึกอัตโนมัติ {lastSaved}</span>
                : <span className="ez-autosave" style={{ color: 'var(--text-muted)', background: 'var(--cream-dark)' }}>บันทึกอัตโนมัติเมื่อพิมพ์</span>}
              {!isSymbolCourse && <button className="ez-btn ez-btn-ghost" onClick={() => setShowSettings(s => !s)}>⚙️ ตั้งค่าสัดส่วนคะแนน</button>}
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
                      {!isSymbolCourse && selCourse.components.map(c => (
                        <th key={c.id}>{c.name}<br /><span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(เต็ม {c.max})</span></th>
                      ))}
                      {!isSymbolCourse && <th>รวม<br /><span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(เต็ม {courseMax})</span></th>}
                      <th>ผลพิเศษ<br /><span style={{ fontWeight: 400, fontSize: '0.8rem' }}>{isSymbolCourse ? '(ผ / มผ)' : '(ถ้ามี)'}</span></th>
                      <th>{isSymbolCourse ? 'ผลการประเมิน' : 'เกรด'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const total = calcTotal(e);
                      const grade = resolveGrade(e, selCourse);
                      const special = isSpecialGrade(grade);
                      return (
                        <tr key={e.studentCode}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--brown-dark)' }}>{e.studentName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รหัส {e.studentCode}</div>
                          </td>
                          {!isSymbolCourse && selCourse.components.map(c => (
                            <td key={c.id} style={{ textAlign: 'center' }}>
                              <input
                                className="ez-score-input" type="number" min={0} max={c.max}
                                value={e.scores[c.id] ?? ''}
                                disabled={!!e.symbol}   // เลือกผลพิเศษแล้ว = ไม่ต้องกรอกคะแนน
                                title={e.symbol ? `บันทึกผลเป็น "${e.symbol}" แล้ว — ล้างช่องผลพิเศษก่อนจึงจะกรอกคะแนนได้` : ''}
                                onChange={ev => updateEntry(e.studentCode, c.id, ev.target.value, c.max)}
                              />
                            </td>
                          ))}
                          {!isSymbolCourse && (
                            <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: 'var(--brown-dark)' }}>
                              {e.symbol ? '—' : total ?? '—'}
                            </td>
                          )}
                          <td style={{ textAlign: 'center' }}>
                            <select
                              className="sched-select gb-symbol-select"
                              value={e.symbol || ''}
                              onChange={ev => updateSymbol(e.studentCode, ev.target.value)}
                            >
                              <option value="">{isSymbolCourse ? '— ยังไม่ประเมิน —' : '— ปกติ —'}</option>
                              {symbolOptions.map(g => (
                                <option key={g.code} value={g.code}>{g.code} — {g.label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`ez-badge ${
                              grade === '—' ? 'ez-badge-wait'
                                : special ? (grade === 'ผ' ? 'ez-badge-done' : 'ez-badge-miss')
                                : parseFloat(grade) >= 2 ? 'ez-badge-done' : 'ez-badge-miss'
                            }`}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ez-help-box" style={{ marginTop: '1rem' }}>
                {isSymbolCourse ? (
                  <>
                    💡 <b>วิชานี้ไม่คิดเกรด</b> — ประเมินเป็น <b>ผ</b> (ผ่าน) / <b>มผ</b> (ไม่ผ่าน) และไม่ถูกนำไปคิด GPA
                    · เปลี่ยนวิธีตัดสินผลได้ที่เมนู “จัดการตารางสอน” ของวิชานี้
                  </>
                ) : (
                  <>
                    💡 <b>การคำนวณ (ตรวจสอบได้):</b> รวม = ผลบวกคะแนนทุกหัวข้อ · เกรดคิดจากเปอร์เซ็นต์ (รวม ÷ {courseMax} × 100)
                    ตามเกณฑ์ สพฐ.: 80% ขึ้นไป = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1
                  </>
                )}
                <br />
                📌 <b>ผลพิเศษ:</b> {symbolOptions.map(g => `${g.code} = ${g.label}`).join(' · ')}
                — เลือกแล้วจะใช้แทนเกรดของนักเรียนคนนั้น และไม่นำไปคิด GPA · บันทึกอัตโนมัติทันที ✓
              </div>
            </>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
