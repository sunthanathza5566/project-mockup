'use client';

import type { StudentProfile, SchedulePeriod } from '@/lib/types';
import { STU_COLORS } from './colors';

interface Props {
  profile: StudentProfile;
  schedule: Record<string, SchedulePeriod[]>;
  currentDay: string;
  setCurrentDay: (d: string) => void;
  showToast: (m: string) => void;
}

const DAY_KEYS:  string[] = ['mon','tue','wed','thu','fri'];
const DAY_THAI:  Record<string,string> = { mon:'จันทร์', tue:'อังคาร', wed:'พุธ', thu:'พฤหัสบดี', fri:'ศุกร์' };
const DAY_SHORT: Record<string,string> = { mon:'จ', tue:'อ', wed:'พ', thu:'พฤ', fri:'ศ' };

export default function ScheduleView({ profile, schedule, currentDay, setCurrentDay, showToast }: Props) {
  const sched = schedule[currentDay] || [];

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📅 ตารางเรียน</h2>
        <p className="stu-page-sub">{profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</p>
      </div>

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
          ? <div className="stu-empty">ไม่มีคาบเรียน 🎉</div>
          : sched.map((p, i) => {
              const c = STU_COLORS[p.key] || STU_COLORS.guidance;
              const endTime = p.time.split('–')[1]?.trim() || '';
              const isBeforeLunch = endTime.startsWith('12:');
              const isAfterLunch  = sched[i - 1] && (sched[i - 1].time.split('–')[1]?.trim() || '').startsWith('12:');
              return (
                <>
                  {isAfterLunch && (
                    <div key={`lunch-${i}`} className="stu-lunch-inline">
                      <span>🍱</span><span>พักเที่ยง</span>
                      <span className="stu-lunch-inline-time">12:00 – 13:00</span>
                    </div>
                  )}
                  <div
                    key={i}
                    className="stu-period-card"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}
                    onClick={() => showToast(`${p.subject} · ${p.teacher} · ${p.room}`)}
                  >
                    <div className="stu-period-num" style={{ color: c.dot }}>คาบ {p.period}</div>
                    <div className="stu-period-time">{p.time}</div>
                    <div className="stu-period-subj" style={{ color: c.text }}>{p.subject}</div>
                    <div className="stu-period-teacher">{p.teacher}</div>
                    <div className="stu-period-room">📍 {p.room}</div>
                    <div className="stu-period-tap-hint">กดเพื่อดูรายละเอียด →</div>
                  </div>
                </>
              );
            })
        }
      </div>
    </div>
  );
}
