'use client';

import type { StudentProfile, Subject, Assignment } from '@/lib/types';
import type { StudentView } from '../StudentLayout';
import { STU_COLORS } from './colors';

interface Props {
  profile: StudentProfile;
  subjects: Subject[];
  assignments: Assignment[];
  setView: (v: StudentView) => void;
  setHomeworkFilter: (f: string) => void;
}

export default function ClassroomView({ profile, subjects, assignments, setView, setHomeworkFilter }: Props) {
  function filterHomework(key: string) {
    setHomeworkFilter(key);
    setView('homework');
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">🏫 ห้องเรียนของฉัน</h2>
        <p className="stu-page-sub">ชั้น {profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</p>
      </div>

      <div className="stu-cls-grid">
        {subjects.map(s => {
          const c   = STU_COLORS[s.key] || STU_COLORS.guidance;
          const hw  = assignments.filter(a => a.key === s.key && (a.status === 'pending' || a.status === 'overdue'));
          return (
            <div key={s.key} className="stu-cls-card" style={{ borderTop: `3px solid ${c.dot}` }}>
              <div className="stu-cls-icon">{s.icon}</div>
              <div className="stu-cls-name">{s.name}</div>
              <div className="stu-cls-teacher">{s.teacher}</div>
              <div className="stu-cls-stats">
                <div>
                  <div className="stu-cls-stat-label">การเข้าเรียน</div>
                  <div className="stu-cls-bar-wrap">
                    <div className="stu-cls-bar-fill" style={{ width: `${s.attend}%`, background: c.dot }} />
                  </div>
                  <div className="stu-cls-stat-val" style={{ color: c.dot }}>{s.attend}%</div>
                </div>
                <div>
                  <div className="stu-cls-stat-label">คะแนนกลางภาค</div>
                  <div className="stu-cls-stat-big">{s.midterm !== null ? s.midterm : '—'}</div>
                </div>
                <div>
                  <div className="stu-cls-stat-label">งานที่มอบหมาย</div>
                  <div className="stu-cls-stat-big">{s.done}/{s.assign}</div>
                </div>
              </div>
              {hw.length > 0 && (
                <div className="stu-cls-hw-alert">📌 มีการบ้านค้างอยู่ {hw.length} ชิ้น</div>
              )}
              <button className="stu-cls-btn" onClick={() => filterHomework(s.key)}>ดูการบ้านวิชานี้ →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
