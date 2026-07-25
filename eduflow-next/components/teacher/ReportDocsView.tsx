'use client';

/**
 * เอกสารผลการเรียน (ปพ.1–ปพ.9) — เมนูแยกของครู
 * เลือก ปี → ชั้น → ห้อง → วิชา แล้วเลือกเอกสารที่ต้องการออกจากการ์ด ปพ.1–9
 * ตอนนี้พร้อมเฉพาะ ปพ.5 (แบบบันทึกผลการเรียนประจำรายวิชา) · ที่เหลือรอเชื่อมข้อมูลเพิ่ม
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
import type { ClassInfo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherId: string;
  teacherName: string;
  classes: ClassInfo[];
}

/** เอกสาร ปพ.1–ปพ.9 ตามระเบียบงานทะเบียนวัดผล */
const PP_DOCS: { id: string; name: string; title: string; desc: string; ready: boolean; needCourse?: boolean }[] = [
  { id: 'pp1', name: 'ปพ.1', title: 'ระเบียนแสดงผลการเรียน',              desc: 'ผลการเรียนรายบุคคลตลอดหลักสูตร (Transcript)', ready: false },
  { id: 'pp2', name: 'ปพ.2', title: 'ประกาศนียบัตร',                      desc: 'หลักฐานแสดงการสำเร็จการศึกษา',              ready: false },
  { id: 'pp3', name: 'ปพ.3', title: 'แบบรายงานผู้สำเร็จการศึกษา',         desc: 'บัญชีรายชื่อผู้จบหลักสูตร',                  ready: false },
  { id: 'pp4', name: 'ปพ.4', title: 'ผลการพัฒนาคุณลักษณะอันพึงประสงค์',  desc: 'ผลการประเมินคุณลักษณะ 8 ประการ',           ready: false },
  { id: 'pp5', name: 'ปพ.5', title: 'แบบบันทึกผลการเรียนประจำรายวิชา',    desc: 'สมุดบันทึกคะแนนของวิชานี้ (Excel)',         ready: true, needCourse: true },
  { id: 'pp6', name: 'ปพ.6', title: 'รายงานผลการพัฒนาคุณภาพผู้เรียน',     desc: 'สมุดรายงานประจำตัว (ออกรายบุคคล)',          ready: false },
  { id: 'pp7', name: 'ปพ.7', title: 'ใบรับรองผลการศึกษา',                 desc: 'หนังสือรับรองการเป็นนักเรียน',              ready: false },
  { id: 'pp8', name: 'ปพ.8', title: 'ระเบียนสะสม',                        desc: 'ข้อมูลพัฒนาการรายบุคคล',                    ready: false },
  { id: 'pp9', name: 'ปพ.9', title: 'สมุดบันทึกผลการเรียนรู้',            desc: 'สมุดประจำวิชา',                            ready: false },
];

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
    const entries = getScores(selCourse.id);
    await exportScoreSheetToExcel(selCourse, `${selGrade.name}/${selRoom.room}`, selYear.year, entries);
    logActivity('teacher', 'ดาวน์โหลด ปพ.5', `${selCourse.name} (${selCourse.code}) ห้อง ${selGrade.name}/${selRoom.room}`);
    showToast('📥 ดาวน์โหลดแบบบันทึกผลการเรียน (ปพ.5) แล้ว');
  }

  function handlePick(doc: typeof PP_DOCS[number]) {
    if (doc.id === 'pp5') {
      if (!selCourse) { showToast('⚠️ เลือกปี → ชั้น → ห้อง → วิชา ก่อน แล้วจึงออก ปพ.5'); return; }
      exportPP5();
      return;
    }
    showToast(`📄 ${doc.name} (${doc.title}) กำลังพัฒนา — ต้องเชื่อมข้อมูลเพิ่ม (เช่น ความประพฤติ/อนุมัติจบ/ข้อมูลตลอดหลักสูตร)`);
  }

  if (!session || (session.role !== 'teacher' && session.role !== 'web_admin')) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            หน้าเอกสารผลการเรียน ใช้ได้เฉพาะ <b>ครู</b> และ <b>ผู้ดูแลระบบ</b> เท่านั้น
          </div>
        </div>
      </div>
    );
  }

  function Picker({ num, label, value, disabled, empty, children, onChange }: {
    num: number; label: string; value: string; disabled?: boolean; empty?: string;
    children: React.ReactNode; onChange: (v: string) => void;
  }) {
    return (
      <div className="gb-pick">
        <label className="gb-pick-label">
          <span className={`gb-pick-num${value ? ' done' : ''}`}>{value ? '✓' : num}</span>{label}
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
          <h2 className="panel-title">📄 เอกสาร<em>ผลการเรียน</em></h2>
          <p className="panel-sub">
            เลือกปี → ชั้น → ห้อง → วิชา แล้วเลือกเอกสาร ปพ. ที่ต้องการออก ·
            ตอนนี้พร้อมใช้: <b>ปพ.5</b> (แบบบันทึกผลการเรียนประจำรายวิชา)
          </p>
        </div>

        <div className="panel-body">
          {/* เลือกปี/ชั้น/ห้อง/วิชา (ปพ.5 ต้องเลือกวิชา · เอกสารอื่นเลือกแค่ห้องก็พอในอนาคต) */}
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
            {selCourse
              ? <>พร้อมออกเอกสารของวิชา <b>{selCourse.name} ({selCourse.code})</b> · ห้อง {selGrade?.name}/{selRoom?.room} · ปี {selYear?.year}</>
              : <>💡 เลือกให้ครบเพื่อออก <b>ปพ.5</b> — เอกสารอื่น (ปพ.1–4, 6–9) ยังอยู่ระหว่างพัฒนา</>}
          </div>

          {/* การ์ดเอกสาร ปพ.1–9 */}
          <div className="admin-menu-grid">
            {PP_DOCS.map(doc => {
              const usable = doc.ready && (!doc.needCourse || !!selCourse);
              return (
                <button key={doc.id} className="admin-menu-card" style={{ opacity: usable ? 1 : 0.62 }} onClick={() => handlePick(doc)}>
                  <div className="admin-menu-icon">{doc.ready ? '📥' : '📄'}</div>
                  <div className="admin-menu-label">
                    {doc.name}
                    {doc.ready
                      ? <span className="sched-type-badge sched-type-activity" style={{ marginLeft: '0.4rem', fontSize: '0.62rem' }}>พร้อมใช้</span>
                      : <span className="sched-type-badge sched-type-club" style={{ marginLeft: '0.4rem', fontSize: '0.62rem' }}>กำลังพัฒนา</span>}
                  </div>
                  <div className="admin-menu-desc">{doc.title}<br />{doc.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
