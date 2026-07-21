'use client';

/**
 * ตารางสอน/ตารางเรียน แบบสัปดาห์ (แถวคือวัน · คอลัมน์คือคาบ)
 * ใช้ร่วมกัน 3 ที่: ครูดูตาราง · ครูจัดตาราง (คลิกช่องได้) · นักเรียนดูอย่างเดียว
 *
 * readOnly = true → ไม่มี hover/คลิก ใช้สำหรับฝั่งนักเรียน
 */

import { Fragment } from 'react';
import { DAYS, PERIODS, LUNCH_AFTER_PERIOD, LUNCH_TIME, type ScheduleSlot, type DayKey } from '@/lib/api/schedule.store';
import { subjectColor } from '@/lib/ui/subject-colors';

interface Props {
  grid: Record<DayKey, (ScheduleSlot | null)[]>;
  readOnly?: boolean;
  /** ไฮไลต์คาบของครูคนนี้ (ใช้ในหน้า "ตารางสอนของฉัน") */
  highlightTeacher?: string;
  onCellClick?: (day: DayKey, period: number, slot: ScheduleSlot | null) => void;
}

export default function ScheduleGrid({ grid, readOnly = false, highlightTeacher, onCellClick }: Props) {
  return (
    <div className="sched-scroll">
      <table className="sched-table">
        <thead>
          <tr>
            <th className="sched-day-col">วัน \ คาบ</th>
            {PERIODS.map(p => (
              <Fragment key={`head-${p.period}`}>
                <th>
                  คาบ {p.period}
                  <div className="sched-th-time">{p.time}</div>
                </th>
                {p.period === LUNCH_AFTER_PERIOD && (
                  <th className="sched-lunch-col">
                    พัก
                    <div className="sched-th-time">{LUNCH_TIME}</div>
                  </th>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(d => (
            <tr key={d.key}>
              <th className="sched-day-col">{d.th}</th>
              {PERIODS.map((p, i) => {
                const slot = grid[d.key]?.[i] || null;
                const c = slot ? subjectColor(slot.subjectKey) : null;
                const mine = !!(slot && highlightTeacher && slot.teacherUsername === highlightTeacher);
                return (
                  <Fragment key={`${d.key}-${p.period}`}>
                    <td
                      className={`sched-cell${slot ? ' filled' : ' empty'}${readOnly ? ' ro' : ''}${mine ? ' mine' : ''}`}
                      style={slot && c ? { background: c.bg, borderColor: c.border } : undefined}
                      onClick={readOnly ? undefined : () => onCellClick?.(d.key, p.period, slot)}
                      title={slot ? `${slot.subjectName} · ${slot.teacherName} · ${slot.room}` : readOnly ? '' : 'คลิกเพื่อเพิ่มคาบสอน'}
                    >
                      {slot && c ? (
                        <>
                          <div className="sched-cell-subj" style={{ color: c.text }}>{slot.subjectName}</div>
                          <div className="sched-cell-code">{slot.subjectCode}</div>
                          <div className="sched-cell-teacher">{slot.teacherName}</div>
                          {slot.room && <div className="sched-cell-room">📍 {slot.room}</div>}
                        </>
                      ) : (
                        <span className="sched-cell-plus">{readOnly ? '' : '+'}</span>
                      )}
                    </td>
                    {p.period === LUNCH_AFTER_PERIOD && <td className="sched-lunch-cell">🍱</td>}
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
