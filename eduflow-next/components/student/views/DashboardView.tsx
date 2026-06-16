'use client';

import type { StudentProfile, StudentStats, Assignment, SchedulePeriod } from '@/lib/types';
import type { StudentView } from '../StudentLayout';
import { STU_COLORS } from './colors';

interface Props {
  profile: StudentProfile;
  stats: StudentStats;
  schedule: Record<string, SchedulePeriod[]>;
  assignments: Assignment[];
  attendance: { week: ('on-time'|'late'|'absent')[]; month: { onTime:number; late:number; absent:number; total:number } };
  currentDay: string;
  setView: (v: StudentView) => void;
  showToast: (m: string) => void;
}

const DAY_KEYS  = ['mon','tue','wed','thu','fri'];
const DAY_LABEL: Record<string,string> = { mon:'จ', tue:'อ', wed:'พ', thu:'พฤ', fri:'ศ' };
const THAI_DAYS: Record<string,string> = { mon:'วันจันทร์', tue:'วันอังคาร', wed:'วันพุธ', thu:'วันพฤหัสบดี', fri:'วันศุกร์' };

export default function DashboardView({ profile, stats, schedule, assignments, attendance, currentDay, setView, showToast }: Props) {
  const todaySched = schedule[currentDay] || schedule.mon || [];
  const pending    = assignments.filter(a => a.status === 'pending' || a.status === 'overdue').slice(0, 3);

  const now        = new Date();
  const dateStr    = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const greeting   = now.getHours() < 12 ? 'อรุณสวัสดิ์ 🌅' : now.getHours() < 17 ? 'สวัสดีตอนบ่าย ☀️' : 'สวัสดีตอนเย็น 🌆';

  const statusLabel: Record<string, string> = { pending: 'ยังไม่ส่ง', overdue: 'เกินกำหนด', submitted: 'รอตรวจ', graded: 'ได้คะแนนแล้ว' };
  const dotClass: Record<string, string>    = { 'on-time': 'dot-ok', late: 'dot-late', absent: 'dot-absent' };
  const dotLabel: Record<string, string>    = { 'on-time': 'ทัน', late: 'สาย', absent: 'ขาด' };

  return (
    <div className="stu-view-wrap">
      {/* Greeting */}
      <div className="stu-greeting-bar">
        <div>
          <div className="stu-greeting-sub">{greeting}</div>
          <h1 className="stu-greeting-name">{profile.firstName} <em>{profile.lastName}</em></h1>
          <div className="stu-greeting-date">{dateStr} · {THAI_DAYS[currentDay]}</div>
        </div>
        <div className="stu-greeting-id">
          <div className="stu-id-num">{profile.studentId}</div>
          <div className="stu-id-label">{profile.grade}/{profile.room}</div>
        </div>
      </div>

      {/* KPI */}
      <div className="stu-kpi-grid">
        {[
          { icon: '📅', val: todaySched.length, lbl: 'คาบเรียนวันนี้', warn: false, alert: false, onClick: () => setView('schedule') },
          { icon: '✅', val: `${stats.attendancePct}%`, lbl: 'เข้าเรียนเดือนนี้', warn: stats.attendancePct < 80, alert: false, onClick: () => setView('classroom') },
          { icon: '📚', val: stats.homeworkPending, lbl: 'การบ้านค้างส่ง', warn: false, alert: stats.homeworkPending > 0, onClick: () => setView('homework') },
          { icon: '⭐', val: stats.gpa, lbl: 'GPA ภาคเรียน', warn: false, alert: false, onClick: undefined },
          { icon: '💰', val: `฿${stats.balance}`, lbl: 'ยอดเงินคงเหลือ', warn: false, alert: false, onClick: () => showToast('กำลังเปิดระบบเติมเงิน...') },
        ].map((k, i) => (
          <div key={i} className={`stu-kpi-card${k.warn ? ' kpi-warn' : ''}${k.alert ? ' kpi-alert' : ''}`} onClick={k.onClick}>
            <div className="stu-kpi-icon">{k.icon}</div>
            <div className="stu-kpi-val">{k.val}</div>
            <div className="stu-kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* Today schedule */}
      <div className="stu-section">
        <div className="stu-section-header">
          <div className="stu-section-title">ตารางเรียน{THAI_DAYS[currentDay]}นี้</div>
          <button className="stu-link-btn" onClick={() => setView('schedule')}>ดูทั้งหมด →</button>
        </div>
        <div className="stu-sched-list">
          {todaySched.map((p, i) => {
            const c = STU_COLORS[p.key] || STU_COLORS.guidance;
            return (
              <div key={i} className="stu-sched-item" style={{ borderLeft: `3px solid ${c.dot}`, background: c.bg }}>
                <div className="stu-sched-period">คาบ {p.period}</div>
                <div className="stu-sched-subj" style={{ color: c.text }}>{p.subject}</div>
                <div className="stu-sched-meta">{p.time} · {p.room}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Homework */}
      <div className="stu-section">
        <div className="stu-section-header">
          <div className="stu-section-title">การบ้านที่ต้องส่ง</div>
          <button className="stu-link-btn" onClick={() => setView('homework')}>ดูทั้งหมด →</button>
        </div>
        <div className="stu-hw-list">
          {pending.length === 0
            ? <div className="stu-empty">ไม่มีการบ้านที่รอส่ง 🎉</div>
            : pending.map(a => {
                const c = STU_COLORS[a.key] || STU_COLORS.guidance;
                return (
                  <div key={a.id} className="stu-hw-row" onClick={() => setView('homework')}>
                    <div className="stu-hw-dot" style={{ background: c.dot }} />
                    <div className="stu-hw-info">
                      <div className="stu-hw-title">{a.title}</div>
                      <div className="stu-hw-meta">{a.subject} · ครบกำหนด {a.due}</div>
                    </div>
                    <span className={`stu-hw-badge ${a.status === 'overdue' ? 'badge-overdue' : 'badge-pending'}`}>
                      {statusLabel[a.status]}
                    </span>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* Attendance week */}
      <div className="stu-section">
        <div className="stu-section-title">การมาเรียนสัปดาห์นี้</div>
        <div className="stu-att-week">
          {attendance.week.map((s, i) => (
            <div key={i} className="stu-att-day">
              <div className="stu-att-label">{DAY_LABEL[DAY_KEYS[i]]}</div>
              <div className={`dash-day-dot ${dotClass[s]}`} />
              <div className="stu-att-status">{dotLabel[s]}</div>
            </div>
          ))}
        </div>
        <div className="stu-att-summary">
          มาทัน {attendance.month.onTime} วัน · มาสาย {attendance.month.late} วัน · ขาด {attendance.month.absent} วัน (เดือนนี้)
        </div>
      </div>

      {/* Quick actions */}
      <div className="stu-section">
        <div className="stu-section-title">ทำรายการด่วน</div>
        <div className="stu-quick-actions">
          {[
            { label: '🔲 สแกน QR',  action: () => showToast('เปิดระบบสแกน QR...') },
            { label: '📚 ส่งการบ้าน', action: () => setView('homework') },
            { label: '🍱 สั่งข้าว',  action: () => showToast('เปิดระบบสั่งข้าว...') },
            { label: '🛍 ร้านค้า',   action: () => setView('shop') },
            { label: '💳 เติมเงิน',  action: () => showToast('กำลังเติมเงิน...') },
            { label: '👤 โปรไฟล์',   action: () => setView('profile') },
          ].map((btn, i) => (
            <button key={i} className="stu-quick-btn" onClick={btn.action}>{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
