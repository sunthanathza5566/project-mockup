'use client';

import { useEffect, useState } from 'react';
import { getStudentAssignments, getStudentAttendance } from '@/lib/api/student.api';
import { getStudentAttendanceDetail, type StudentAttendanceDetail } from '@/lib/api/attendance.store';
import { getStudentGrades, calcGPA, type StudentGradeRow } from '@/lib/api/academic.store';
import { getSharedNotifications, markSharedNotificationRead } from '@/lib/api/assignments.store';
import { exportStudentGradeReport } from '@/lib/utils/excel-export';
import type { Assignment, Notification } from '@/lib/types';

interface Props {
  childCode: string;
  childName: string;
  showToast: (m: string) => void;
}

/**
 * Dashboard ผู้ปกครอง — ข้อมูลจริงของลูกจาก store เดียวกับครู/นักเรียน:
 * เช็คชื่อ (attendance.store) · การบ้าน (assignments.store) · เกรด (academic.store)
 */
export default function ParentDashboard({ childCode, childName, showToast }: Props) {
  const [attendance, setAttendance] = useState<{ month: { onTime: number; late: number; absent: number; total: number } } | null>(null);
  const [checkIns,   setCheckIns]   = useState<StudentAttendanceDetail[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades,     setGrades]     = useState<StudentGradeRow[]>([]);
  const [notifs,     setNotifs]     = useState<Notification[]>([]);

  useEffect(() => {
    if (!childCode) return;
    Promise.all([
      getStudentAttendance(childCode),
      getStudentAssignments(childCode),
    ]).then(([att, asgn]) => {
      setAttendance(att);
      setAssignments(asgn);
    });
    setCheckIns(getStudentAttendanceDetail(childCode));
    setGrades(getStudentGrades(childCode));
    setNotifs(getSharedNotifications(`parent:${childCode}`));
  }, [childCode]);

  const gpa = calcGPA(grades);
  const pendingHw = assignments.filter(a => a.status === 'pending' || a.status === 'overdue');

  // สถานะวันนี้จากการเช็คชื่อ QR จริง
  const today = new Date().toDateString();
  const todayCheckIn = checkIns.find(r => new Date(r.checkedAt).toDateString() === today);
  const todayStatus = todayCheckIn
    ? (todayCheckIn.status === 'on-time' ? 'มาทัน' : 'มาสาย')
    : 'ยังไม่เช็คชื่อ';
  const todayColor = todayCheckIn
    ? (todayCheckIn.status === 'on-time' ? 'var(--success)' : 'var(--late)')
    : 'var(--text-muted)';

  const monthPct = attendance && attendance.month.total > 0
    ? Math.round((attendance.month.onTime / attendance.month.total) * 100)
    : null;

  async function handleExportGrades() {
    if (grades.length === 0) { showToast('⚠️ ยังไม่มีคะแนนในระบบ'); return; }
    await exportStudentGradeReport(childName, childCode, grades);
    showToast('📥 ดาวน์โหลดใบรายงานผลการเรียนของลูกแล้ว');
  }

  function handleReadNotif(id: number) {
    markSharedNotificationRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isNew: false } : n));
  }

  return (
    <>
      <div className="dash-section">
        <div className="section-label">ผู้ปกครอง</div>
        <h2 className="dash-h2">สถานะบุตรหลาน<em>{childName || 'ของคุณ'}</em></h2>
        <div className="dash-kpi-row">
          {[
            { num: todayStatus, label: todayCheckIn ? `สถานะวันนี้ (${new Date(todayCheckIn.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })})` : 'สถานะวันนี้', color: todayColor },
            { num: monthPct !== null ? `${monthPct}%` : '—', label: 'มาตรงเวลาเดือนนี้' },
            { num: pendingHw.length, label: 'การบ้านค้าง' },
            { num: gpa !== null ? gpa.toFixed(2) : '—', label: 'เกรดเฉลี่ย (GPA)' },
          ].map((k, i) => (
            <div key={i} className="dash-kpi">
              <div className="dash-kpi-num" style={k.color ? { color: k.color } : {}}>{k.num}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── แจ้งเตือน (เช็คชื่อจริงของลูก) ── */}
      <div className="dash-section">
        <div className="dash-section-title">🔔 แจ้งเตือนล่าสุด</div>
        <div className="dash-notif-list">
          {notifs.length === 0
            ? <div className="dash-notif">ยังไม่มีแจ้งเตือน — จะแจ้งอัตโนมัติเมื่อ {childName || 'ลูก'} เช็คชื่อเข้าเรียน</div>
            : notifs.slice(0, 6).map(n => (
                <div
                  key={n.id}
                  className={`dash-notif${n.type === 'overdue' ? ' dash-notif-late' : ' dash-notif-ok'}`}
                  style={{ cursor: 'pointer', opacity: n.isNew ? 1 : 0.65 }}
                  onClick={() => handleReadNotif(n.id)}
                >
                  {n.title} — {n.body}
                </div>
              ))}
        </div>
      </div>

      {/* ── ผลการเรียนของลูก ── */}
      <div className="dash-section">
        <div className="dash-section-title">🎓 ผลการเรียน ({grades.length} วิชา)</div>
        {grades.length === 0 ? (
          <div className="stu-empty">ยังไม่มีคะแนนในระบบ — จะแสดงเมื่อครูบันทึกผ่านระบบบันทึกคะแนน</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'var(--brown-dark)', color: 'var(--cream)' }}>
                    {['รายวิชา', 'ครูผู้สอน', 'รวม', 'เกรด'].map((h, i) => (
                      <th key={i} style={{ padding: '0.5rem 0.7rem', textAlign: i < 2 ? 'left' : 'center', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, idx) => (
                    <tr key={g.courseId} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 ? 'rgba(107,79,47,0.03)' : 'transparent' }}>
                      <td style={{ padding: '0.45rem 0.7rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{g.courseName} ({g.courseCode})</td>
                      <td style={{ padding: '0.45rem 0.7rem', color: 'var(--text-muted)' }}>{g.teacherName}</td>
                      <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center', fontWeight: 600, color: 'var(--brown-dark)' }}>{g.total ?? '—'}</td>
                      <td style={{ padding: '0.45rem 0.7rem', textAlign: 'center' }}>
                        <span className={`stu-hw-status-badge ${g.grade !== '—' && parseFloat(g.grade) >= 2 ? 'badge-graded' : g.grade === '—' ? 'badge-pending' : 'badge-overdue'}`}>{g.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dash-actions-row" style={{ marginTop: '0.9rem' }}>
              <button className="dash-action-btn" onClick={handleExportGrades}>📥 ดาวน์โหลดใบรายงานผลการเรียน</button>
            </div>
          </>
        )}
      </div>

      {/* ── การเช็คชื่อล่าสุด ── */}
      <div className="dash-section">
        <div className="dash-section-title">📋 การเช็คชื่อล่าสุด (ผ่าน QR)</div>
        {checkIns.length === 0 ? (
          <div className="stu-empty">ยังไม่มีประวัติเช็คชื่อผ่าน QR</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {checkIns.slice(0, 5).map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.8rem' }}>
                <span style={{ flex: 1, color: 'var(--brown-dark)' }}>{r.subject} · คาบ {r.period} ({r.classLabel})</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  {new Date(r.checkedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`stu-hw-status-badge ${r.status === 'on-time' ? 'badge-graded' : 'badge-overdue'}`}>
                  {r.status === 'on-time' ? 'ตรงเวลา' : 'สาย'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── การบ้านค้างของลูก ── */}
      <div className="dash-section">
        <div className="dash-section-title">📚 การบ้านค้าง ({pendingHw.length} ชิ้น)</div>
        {pendingHw.length === 0 ? (
          <div className="stu-empty">ไม่มีการบ้านค้าง ✓</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {pendingHw.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.8rem' }}>
                <span style={{ flex: 1, color: 'var(--brown-dark)' }}>{a.subject} — {a.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ส่ง {a.due}</span>
                <span className={`stu-hw-status-badge ${a.status === 'overdue' ? 'badge-overdue' : 'badge-pending'}`}>
                  {a.status === 'overdue' ? 'เกินกำหนด' : 'ยังไม่ส่ง'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
