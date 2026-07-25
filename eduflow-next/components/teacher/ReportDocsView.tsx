'use client';

/**
 * เอกสารผลการเรียน (ปพ.1–ปพ.9) — เมนูแยกของครู
 * เลือก ปี → ชั้น → ห้อง → วิชา แล้วเลือกเอกสารจากการ์ด ปพ.1–9 (3×3 การ์ดใหญ่)
 * เอกสารถูกจำกัดตาม "ระดับชั้น" ที่เลือก — การ์ดที่ไม่ตรงระดับชั้นจะถูกล็อก
 * ตอนนี้พร้อมออกจริงเฉพาะ ปพ.5 (บันทึกผลการเรียนรายวิชา)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms,
  syncTeacherCourses, getScores,
  type AcademicYear, type GradeLevel, type Classroom, type Course,
} from '@/lib/api/academic.store';
import { getSession } from '@/lib/api/auth.api';
import { logActivity } from '@/lib/api/activity.log';
import { exportScoreSheetToExcel } from '@/lib/utils/excel-export';
import { PP_DOCS, isDocAllowedForGrade, allowedGradesLabel, type PPDoc } from '@/lib/report-docs';
import type { ClassInfo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherId: string;
  teacherName: string;
  classes: ClassInfo[];
}

export default function ReportDocsView({ teacherId, teacherName, classes }: Props) {
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

  const selCourse = courses.find(c => c.id === selCourseId) || null;

  useEffect(() => { setYears(getAcademicYears()); }, []);
  useEffect(() => { setGradeLevels(selYear ? getGradeLevels(selYear.id) : []); }, [selYear]);
  useEffect(() => { setClassrooms(selGrade ? getClassrooms(selGrade.id) : []); }, [selGrade]);

  const refreshCourses = useCallback(() => {
    setCourses(selRoom ? syncTeacherCourses(selRoom.id, classes, { id: teacherId, name: teacherName }) : []);
  }, [selRoom, classes, teacherId, teacherName]);
  useEffect(() => { refreshCourses(); }, [refreshCourses]);

  function pickYear(y: AcademicYear)  { setSelYear(y);  setSelGrade(null); setSelRoom(null); setSelCourseId(null); }
  function pickGrade(g: GradeLevel)   { setSelGrade(g); setSelRoom(null);  setSelCourseId(null); }
  function pickRoom(r: Classroom)     { setSelRoom(r);  setSelCourseId(null); }

  const teachesInGrade = (g: GradeLevel) => isAdmin || classes.some(c => c.grade === g.name);
  const teachesInRoom  = (r: Classroom) => isAdmin || (selGrade ? classes.some(c => c.grade === selGrade.name && c.room === r.room) : false);
  const visibleGrades = gradeLevels.filter(teachesInGrade);
  const visibleRooms  = classrooms.filter(teachesInRoom);

  async function exportPP5() {
    if (!selCourse || !selGrade || !selRoom || !selYear) return;
    await exportScoreSheetToExcel(selCourse, `${selGrade.name}/${selRoom.room}`, selYear.year, getScores(selCourse.id));
    logActivity('teacher', 'ดาวน์โหลด ปพ.5', `${selCourse.name} (${selCourse.code}) ห้อง ${selGrade.name}/${selRoom.room}`);
    showToast('📥 ดาวน์โหลดแบบบันทึกผลการเรียน (ปพ.5) แล้ว');
  }

  /** สถานะของการ์ดตามระดับชั้นที่เลือก + ความพร้อมของเอกสาร */
  function docState(doc: PPDoc): { status: 'ready' | 'locked' | 'soon'; note: string } {
    if (selGrade && !isDocAllowedForGrade(doc, selGrade.name))
      return { status: 'locked', note: `ออกเฉพาะชั้น ${allowedGradesLabel(doc)}` };
    if (doc.id === 'pp5') return { status: 'ready', note: 'ดาวน์โหลด Excel' };
    return { status: 'soon', note: 'กำลังพัฒนา' };
  }

  function handlePick(doc: PPDoc) {
    const st = docState(doc);
    if (st.status === 'locked') { showToast(`🔒 ${doc.name} ${st.note}`); return; }
    if (doc.id === 'pp5') {
      if (!selCourse) { showToast('⚠️ เลือกปี → ชั้น → ห้อง → วิชา ก่อน แล้วจึงออก ปพ.5'); return; }
      exportPP5();
      return;
    }
    showToast(`📄 ${doc.name} (${doc.title}) กำลังพัฒนา — ต้องเชื่อมข้อมูลเพิ่ม (เช่น ความประพฤติ/อนุมัติจบ)`);
  }

  if (!session || (session.role !== 'teacher' && session.role !== 'web_admin')) {
    return (
      <div className="panel-shell"><div className="panel-card">
        <div className="perm-denied"><span className="perm-denied-icon">🔒</span>หน้าเอกสารผลการเรียน ใช้ได้เฉพาะ <b>ครู</b> และ <b>ผู้ดูแลระบบ</b> เท่านั้น</div>
      </div></div>
    );
  }

  function Picker({ num, label, value, disabled, empty, children, onChange }: {
    num: number; label: string; value: string; disabled?: boolean; empty?: string;
    children: React.ReactNode; onChange: (v: string) => void;
  }) {
    return (
      <div className="gb-pick">
        <label className="gb-pick-label"><span className={`gb-pick-num${value ? ' done' : ''}`}>{value ? '✓' : num}</span>{label}</label>
        <select className="sched-select" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
          <option value="">— เลือก{label} —</option>{children}
        </select>
        {!disabled && empty && <div className="gb-pick-hint">{empty}</div>}
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide ez-sm">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">📄 เอกสาร<em>ผลการเรียน</em></h2>
          <p className="panel-sub">
            เลือกปี → ชั้น → ห้อง → วิชา แล้วเลือกเอกสาร ปพ. ที่ต้องการออก ·
            เอกสารจำกัดตาม<b>ระดับชั้น</b> · ตอนนี้พร้อมใช้: <b>ปพ.5</b>
          </p>
        </div>

        <div className="panel-body">
          <div className="gb-picker-row">
            <Picker num={1} label="ปีการศึกษา" value={selYear?.id || ''}
              empty={years.length === 0 ? 'ยังไม่มีปีการศึกษา' : undefined}
              onChange={v => { const y = years.find(x => x.id === v); if (y) pickYear(y); else { setSelYear(null); setSelGrade(null); setSelRoom(null); setSelCourseId(null); } }}>
              {years.map(y => <option key={y.id} value={y.id}>ปี {y.year}</option>)}
            </Picker>
            <Picker num={2} label="ระดับชั้น" value={selGrade?.id || ''} disabled={!selYear}
              empty={selYear && visibleGrades.length === 0 ? 'ไม่พบชั้นที่ท่านสอน' : undefined}
              onChange={v => { const g = visibleGrades.find(x => x.id === v); if (g) pickGrade(g); else { setSelGrade(null); setSelRoom(null); setSelCourseId(null); } }}>
              {visibleGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Picker>
            <Picker num={3} label="ห้องที่สอน" value={selRoom?.id || ''} disabled={!selGrade}
              empty={selGrade && visibleRooms.length === 0 ? 'ไม่พบห้องที่ท่านสอน' : undefined}
              onChange={v => { const r = visibleRooms.find(x => x.id === v); if (r) pickRoom(r); else { setSelRoom(null); setSelCourseId(null); } }}>
              {visibleRooms.map(r => <option key={r.id} value={r.id}>ห้อง {selGrade?.name}/{r.room}</option>)}
            </Picker>
            <Picker num={4} label="วิชา" value={selCourseId || ''} disabled={!selRoom}
              empty={selRoom && courses.length === 0 ? 'ห้องนี้ไม่มีวิชาของท่าน' : undefined}
              onChange={v => setSelCourseId(v || null)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </Picker>
          </div>

          <div className="ez-help-box" style={{ marginBottom: '1.25rem' }}>
            {selGrade
              ? <>ระดับชั้น <b>{selGrade.name}</b> — เอกสารที่ไม่ตรงระดับชั้นจะถูกล็อก 🔒{selCourse && <> · พร้อมออก ปพ.5 ของ <b>{selCourse.name} ({selCourse.code})</b></>}</>
              : <>💡 เลือกปี → ชั้น → ห้อง → วิชา ก่อน · เอกสารจะเปิด/ล็อกตามระดับชั้นที่เลือก</>}
          </div>

          {/* การ์ดเอกสาร 3×3 */}
          <div className="doc-grid">
            {PP_DOCS.map(doc => {
              const st = docState(doc);
              return (
                <button key={doc.id} className={`doc-card${st.status === 'locked' ? ' locked' : ''}`} onClick={() => handlePick(doc)}>
                  <div className="doc-card-icon">{st.status === 'ready' ? '📥' : st.status === 'locked' ? '🔒' : '📄'}</div>
                  <div className="doc-card-head">
                    <span className="doc-card-name">{doc.name}</span>
                    <span className={`doc-card-status ${st.status === 'ready' ? 'doc-status-ready' : st.status === 'locked' ? 'doc-status-locked' : 'doc-status-soon'}`}>
                      {st.status === 'ready' ? 'พร้อมใช้' : st.status === 'locked' ? 'ล็อกตามระดับชั้น' : 'กำลังพัฒนา'}
                    </span>
                  </div>
                  <div className="doc-card-title">{doc.title}</div>
                  <div className="doc-card-desc">{doc.desc}</div>
                  <div className="doc-card-status doc-status-soon" style={{ background: 'var(--cream-dark)', color: 'var(--text-muted)' }}>
                    ระดับชั้น: {allowedGradesLabel(doc)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
