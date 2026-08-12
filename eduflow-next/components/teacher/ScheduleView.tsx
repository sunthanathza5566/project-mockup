'use client';

/**
 * ตารางสอน (ดูอย่างเดียว) — ฝั่งครู
 *
 * 2 โหมด:
 *   1. ตารางสอนของฉัน — รวมทุกห้องที่ครูคนนี้มีคาบ (ไฮไลต์คาบตัวเอง)
 *   2. ตารางเรียนรายห้อง — เลือก ปีการศึกษา → ระดับชั้น → ห้อง (ทุกห้องมีตารางไม่เหมือนกัน)
 *
 * ใต้ตารางแสดงรายละเอียดรายวิชา: รหัสวิชา ชื่อวิชา ครูผู้สอน ประเภทวิชา
 * สิทธิ์: viewTeachSchedule (web_admin ผ่านเสมอ)
 */

import { useEffect, useMemo, useState } from 'react';
import {
  getAcademicYears, getGradeLevels, getClassrooms,
  type AcademicYear, type GradeLevel, type Classroom,
} from '@/lib/api/academic.store';
import {
  getWeekGrid, getScheduleCourses, getTeacherSlots, canViewSchedule,
  buildWeekGrid, summarizeCourses,
} from '@/lib/api/schedule.store';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import CourseList from '@/components/schedule/CourseList';
import { useLang } from '@/context/LangContext';

interface Props {
  teacherUsername: string;
  teacherName: string;
  /** เปิดหน้าจัดการตารางสอน (ปุ่มลัด — แสดงเมื่อมีสิทธิ์) */
  onManage?: () => void;
  canManage?: boolean;
}

type Mode = 'mine' | 'room';

export default function ScheduleView({ teacherUsername, teacherName, onManage, canManage }: Props) {
  const { t } = useLang();

  const [mode, setMode] = useState<Mode>('mine');
  const [years,      setYears]      = useState<AcademicYear[]>([]);
  const [grades,     setGrades]     = useState<GradeLevel[]>([]);
  const [rooms,      setRooms]      = useState<Classroom[]>([]);
  const [selYear,    setSelYear]    = useState<AcademicYear | null>(null);
  const [selGrade,   setSelGrade]   = useState<GradeLevel | null>(null);
  const [selRoom,    setSelRoom]    = useState<Classroom | null>(null);

  useEffect(() => {
    const ys = getAcademicYears();
    setYears(ys);
    if (ys.length > 0) setSelYear(ys[0]);
  }, []);
  useEffect(() => { setGrades(selYear ? getGradeLevels(selYear.id) : []); setSelGrade(null); setSelRoom(null); }, [selYear]);
  useEffect(() => { setRooms(selGrade ? getClassrooms(selGrade.id) : []); setSelRoom(null); }, [selGrade]);

  // ── ตารางสอนของฉัน: รวมคาบทุกห้องมาเป็นตารางเดียว (ใช้ helper ชุดเดียวกับตารางของห้อง) ──
  const mySlots   = useMemo(() => getTeacherSlots(teacherUsername), [teacherUsername, mode]);
  const myGrid    = useMemo(() => buildWeekGrid(mySlots), [mySlots]);
  const myCourses = useMemo(() => summarizeCourses(mySlots, 'classroom'), [mySlots]);

  const roomGrid    = selRoom ? getWeekGrid(selRoom.id) : null;
  const roomCourses = selRoom ? getScheduleCourses(selRoom.id) : [];

  if (!canViewSchedule()) {
    return (
      <div className="panel-shell panel-shell-wide">
        <div className="panel-card">
          <div className="perm-denied">
            <span className="perm-denied-icon">🔒</span>
            บัญชีของท่านไม่ได้รับสิทธิ์ <b>ดูตารางสอน</b><br />
            ติดต่อผู้ดูแลระบบเพื่อขอเปิดสิทธิ์ในหน้า “สิทธิ์การเข้าถึง”
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell panel-shell-wide">
      <div className="panel-card">
        <div className="panel-head">
          <h2 className="panel-title">{t('ตารางสอน')}</h2>
          <p className="panel-sub">
            ทุกห้องเรียนมีตารางของตัวเอง — ข้อมูลดึงจากแผนการเรียน (ปีการศึกษา · ระดับชั้น · ห้อง)
            {canManage && ' · ท่านมีสิทธิ์จัดตารางสอน'}
          </p>
        </div>

        <div className="panel-toolbar">
          <button className={`ez-choice-btn acad-chip${mode === 'mine' ? ' active' : ''}`} onClick={() => setMode('mine')}>
            👤 ตารางสอนของฉัน
          </button>
          <button className={`ez-choice-btn acad-chip${mode === 'room' ? ' active' : ''}`} onClick={() => setMode('room')}>
            🏫 ตารางเรียนรายห้อง
          </button>
          {canManage && onManage && (
            <button className="ez-btn ez-btn-primary" style={{ minHeight: 42, fontSize: '0.92rem' }} onClick={onManage}>
              ⚙️ {t('จัดการตารางสอน')}
            </button>
          )}
        </div>

        <div className="panel-body">
          {mode === 'mine' ? (
            <>
              <div className="sched-courses-head" style={{ marginTop: 0 }}>
                <span className="sched-courses-title">{teacherName}</span>
                <span className="sched-courses-sum">{mySlots.length} คาบ/สัปดาห์ · {new Set(mySlots.map(s => s.classroomId)).size} ห้อง</span>
              </div>
              {mySlots.length === 0 ? (
                <div className="stu-empty">
                  ยังไม่มีคาบสอนในตาราง 🕐<br />
                  {canManage ? 'กด “จัดการตารางสอน” เพื่อเพิ่มคาบสอนของท่าน' : 'ติดต่อฝ่ายวิชาการเพื่อจัดสรรคาบสอน'}
                </div>
              ) : (
                <>
                  <ScheduleGrid grid={myGrid} readOnly highlightTeacher={teacherUsername} />
                  <CourseList courses={myCourses} title="รายวิชาที่ท่านสอน" />
                </>
              )}
            </>
          ) : (
            <>
              {/* ── เลือก ปี → ชั้น → ห้อง ── */}
              <div className="sched-form-grid">
                <div className="sched-form-field">
                  <label className="sched-form-label">{t('ปีการศึกษา')}</label>
                  <select className="sched-select" value={selYear?.id || ''} onChange={e => setSelYear(years.find(y => y.id === e.target.value) || null)}>
                    <option value="">— เลือกปีการศึกษา —</option>
                    {years.map(y => <option key={y.id} value={y.id}>ปี {y.year}</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">{t('ระดับชั้น')}</label>
                  <select className="sched-select" value={selGrade?.id || ''} disabled={!selYear} onChange={e => setSelGrade(grades.find(g => g.id === e.target.value) || null)}>
                    <option value="">— เลือกระดับชั้น —</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="sched-form-field">
                  <label className="sched-form-label">{t('ห้องเรียน')}</label>
                  <select className="sched-select" value={selRoom?.id || ''} disabled={!selGrade} onChange={e => setSelRoom(rooms.find(r => r.id === e.target.value) || null)}>
                    <option value="">— เลือกห้อง —</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{selGrade?.name}/{r.room}</option>)}
                  </select>
                </div>
              </div>

              {!selRoom ? (
                <div className="ez-help-box">
                  💡 เลือก <b>ปีการศึกษา → ระดับชั้น → ห้อง</b> เพื่อดูตารางเรียนของห้องนั้น
                  {grades.length === 0 && selYear && <><br />ปีนี้ยังไม่มีระดับชั้น — ให้แอดมินสร้างในหน้า “โครงสร้างวิชาการ” ก่อน</>}
                </div>
              ) : roomGrid && Object.values(roomGrid).every(row => row.every(c => c === null)) ? (
                <div className="stu-empty">
                  ห้อง {selGrade?.name}/{selRoom.room} ยังไม่มีตารางสอน 🕐<br />
                  {canManage ? 'กด “จัดการตารางสอน” เพื่อเริ่มจัดตาราง' : 'รอฝ่ายวิชาการจัดตารางให้'}
                </div>
              ) : roomGrid && (
                <>
                  <div className="sched-courses-head" style={{ marginTop: 0 }}>
                    <span className="sched-courses-title">ห้อง {selGrade?.name}/{selRoom.room}</span>
                    <span className="sched-courses-sum">ปีการศึกษา {selYear?.year}</span>
                  </div>
                  <ScheduleGrid grid={roomGrid} readOnly highlightTeacher={teacherUsername} />
                  <CourseList courses={roomCourses} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
