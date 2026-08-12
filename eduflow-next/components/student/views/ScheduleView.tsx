'use client';

/**
 * ตารางเรียนของนักเรียน — ดูอย่างเดียว (ยังไม่มีปุ่มทำรายการใด ๆ ตามที่ตกลงไว้)
 * ข้อมูลมาจากตารางสอนที่ครูจัดให้ห้องนี้ — ห้องต่างกันตารางต่างกัน
 */

import { Fragment, useEffect, useState } from 'react';
import type { StudentProfile, SchedulePeriod } from '@/lib/types';
import { STU_COLORS } from './colors';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import CourseList from '@/components/schedule/CourseList';
import { getStudentRoomId } from '@/lib/api/class-resolver';
import { getWeekGrid, getScheduleCourses, type ScheduleSlot, type DayKey, type CourseSummary } from '@/lib/api/schedule.store';
import { useLang } from '@/context/LangContext';

interface Props {
  profile: StudentProfile;
  schedule: Record<string, SchedulePeriod[]>;
  currentDay: string;
  setCurrentDay: (d: string) => void;
}

const DAY_KEYS:  string[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_THAI:  Record<string, string> = { mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ', thu: 'พฤหัสบดี', fri: 'ศุกร์' };
const DAY_SHORT: Record<string, string> = { mon: 'จ', tue: 'อ', wed: 'พ', thu: 'พฤ', fri: 'ศ' };

export default function ScheduleView({ profile, schedule, currentDay, setCurrentDay }: Props) {
  const { t } = useLang();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [grid, setGrid] = useState<Record<DayKey, (ScheduleSlot | null)[]> | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);

  useEffect(() => {
    const roomId = getStudentRoomId(profile.studentId);
    if (!roomId) { setGrid(null); setCourses([]); return; }
    const g = getWeekGrid(roomId);
    const hasAny = Object.values(g).some(row => row.some(c => c !== null));
    setGrid(hasAny ? g : null);
    setCourses(getScheduleCourses(roomId));
  }, [profile.studentId]);

  const sched = schedule[currentDay] || [];

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📅 {t('ตารางเรียน')}</h2>
        <p className="stu-page-sub">
          {profile.grade}/{profile.room} · {t('ปีการศึกษา')} {profile.academicYear} · ข้อมูลจากตารางสอนที่โรงเรียนจัดให้
        </p>
      </div>

      {/* สลับมุมมอง รายวัน / ทั้งสัปดาห์ (ดูอย่างเดียว) */}
      <div className="stu-filters">
        <button className={`stu-filter-chip${mode === 'day' ? ' active' : ''}`} onClick={() => setMode('day')}>รายวัน</button>
        <button className={`stu-filter-chip${mode === 'week' ? ' active' : ''}`} onClick={() => setMode('week')}>ทั้งสัปดาห์</button>
      </div>

      {mode === 'day' ? (
        <>
          <div className="stu-day-tabs">
            {DAY_KEYS.map(d => (
              <button key={d} className={`stu-day-tab${d === currentDay ? ' active' : ''}`} onClick={() => setCurrentDay(d)}>
                <span className="stu-day-short">{DAY_SHORT[d]}</span>
                <span className="stu-day-full">{DAY_THAI[d]}</span>
              </button>
            ))}
          </div>

          <div className="stu-periods-grid">
            {sched.length === 0
              ? <div className="stu-empty">{t('ไม่มีคาบเรียน')} 🎉</div>
              : sched.map((p, i) => {
                  const c = STU_COLORS[p.key] || STU_COLORS.guidance;
                  const isAfterLunch = sched[i - 1] && (sched[i - 1].time.split('–')[1]?.trim() || '').startsWith('12:');
                  return (
                    <Fragment key={`${currentDay}-${p.period}-${i}`}>
                      {isAfterLunch && (
                        <div className="stu-lunch-inline">
                          <span>🍱</span><span>{t('พักเที่ยง')}</span>
                          <span className="stu-lunch-inline-time">12:00 – 13:00</span>
                        </div>
                      )}
                      <div className="stu-period-card" style={{ background: c.bg, border: `1px solid ${c.border}`, cursor: 'default' }}>
                        <div className="stu-period-num" style={{ color: c.dot }}>{t('คาบ')} {p.period}</div>
                        <div className="stu-period-time">{p.time}</div>
                        <div className="stu-period-subj" style={{ color: c.text }}>{p.subject}</div>
                        <div className="stu-period-teacher">{p.teacher}</div>
                        <div className="stu-period-room">📍 {p.room}</div>
                      </div>
                    </Fragment>
                  );
                })
            }
          </div>
        </>
      ) : grid ? (
        <ScheduleGrid grid={grid} readOnly />
      ) : (
        <div className="stu-empty">ห้องเรียนของท่านยังไม่มีตารางเรียนในระบบ 🕐<br />รอครูจัดตารางสอนให้ห้องนี้</div>
      )}

      {courses.length > 0 && <CourseList courses={courses} title="รายวิชาที่ต้องเรียนในภาคเรียนนี้" />}
    </div>
  );
}
