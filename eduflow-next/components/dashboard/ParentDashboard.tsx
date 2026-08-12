'use client';

import { useEffect, useState } from 'react';
import { getStudentAssignments, getStudentAttendance } from '@/lib/api/student.api';
import { getStudentAttendanceDetail, type StudentAttendanceDetail } from '@/lib/api/attendance.store';
import { getStudentGrades, calcGPA, type StudentGradeRow } from '@/lib/api/academic.store';
import { getSharedNotifications, markSharedNotificationRead } from '@/lib/api/assignments.store';
import { getWalletBalance, getWalletTxns, addWalletFunds, type WalletTxn } from '@/lib/api/wallet.store';
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

  // ── กระเป๋าเงินลูก — ผู้ปกครองเท่านั้นที่เติมได้ ──
  const [balance,    setBalance]    = useState(0);
  const [txns,       setTxns]       = useState<WalletTxn[]>([]);
  const [topupAmt,   setTopupAmt]   = useState(100);
  const [ppStep,     setPpStep]     = useState<'idle' | 'qr' | 'verifying' | 'done'>('idle');

  function refreshWallet() {
    setBalance(getWalletBalance(childCode));
    setTxns(getWalletTxns(childCode));
  }

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
    setBalance(getWalletBalance(childCode));
    setTxns(getWalletTxns(childCode));
  }, [childCode]);

  /** เติมผ่าน PromptPay (จำลอง): แสดง QR → ระบบตรวจสอบยอดอัตโนมัติ → ยืนยันเข้ากระเป๋า */
  function startPromptPay() {
    if (topupAmt <= 0) { showToast('ใส่จำนวนเงินก่อน'); return; }
    setPpStep('qr');
  }
  function simulatePaid() {
    setPpStep('verifying');
    // TODO(Production): จุดนี้คือ webhook จาก payment gateway ยืนยันยอดจริง — ตอนนี้จำลองการตรวจสอบ
    setTimeout(() => {
      addWalletFunds(childCode, topupAmt, 'topup-promptpay', `ผู้ปกครองของ ${childName}`);
      refreshWallet();
      setPpStep('done');
    }, 1800);
  }

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
    if (grades.length === 0) { showToast('ยังไม่มีคะแนนในระบบ'); return; }
    await exportStudentGradeReport(childName, childCode, grades);
    showToast('ดาวน์โหลดใบรายงานผลการเรียนของลูกแล้ว');
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

      {/* ── กระเป๋าเงินลูก — เติมเงินได้เฉพาะผู้ปกครอง (ควบคุมขอบเขตการใช้จ่าย) ── */}
      <div className="dash-section">
        <div className="dash-section-title">กระเป๋าเงินของ {childName || 'ลูก'}</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 220, background: 'var(--brown-dark)', color: 'var(--cream)', borderRadius: 14, padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>ยอดเงินคงเหลือ</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>฿{balance.toLocaleString('th-TH')}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: '0.25rem' }}>นักเรียนใช้ซื้อของที่ร้านค้าโรงเรียนเท่านั้น</div>
          </div>
          <div style={{ flex: 1.4, minWidth: 260, background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.6rem' }}>เติมเงินผ่าน PromptPay</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              {[50, 100, 200, 300].map(a => (
                <button key={a} className={`dash-tab-btn${topupAmt === a ? ' active' : ''}`} onClick={() => setTopupAmt(a)}>฿{a}</button>
              ))}
              <input
                type="number" min={1} value={topupAmt}
                onChange={e => setTopupAmt(parseInt(e.target.value) || 0)}
                style={{ width: 90, padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none', background: 'var(--warm-white)' }}
              />
            </div>
            <button className="dash-action-btn" style={{ background: 'var(--brown-dark)', color: 'var(--cream)' }} onClick={startPromptPay}>📲 เติม ฿{topupAmt.toLocaleString('th-TH')} ผ่าน PromptPay</button>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              เติมเงินได้เฉพาะผู้ปกครอง — นักเรียนเติมเองไม่ได้ · ระบบตรวจสอบและยืนยันยอดอัตโนมัติ
            </div>
          </div>
        </div>
        {txns.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {txns.slice(0, 5).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--text-body)', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
                <span style={{ flex: 1 }}>{t.detail}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(t.at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ fontWeight: 700, color: t.amount > 0 ? 'var(--success)' : 'var(--absent)' }}>{t.amount > 0 ? '+' : ''}฿{Math.abs(t.amount).toLocaleString('th-TH')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Popup PromptPay (จำลอง) ── */}
      {ppStep !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(18,10,4,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(340px, 92vw)', background: 'var(--warm-white)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {ppStep === 'qr' && (
              <>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>สแกนจ่ายด้วย PromptPay</div>
                <div style={{ width: 170, height: 170, margin: '0 auto 0.75rem', background: 'var(--cream)', border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  ▦<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>QR จำลอง (ระบบทดสอบ)</div>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>ยอดเติม <b>฿{topupAmt.toLocaleString('th-TH')}</b> เข้ากระเป๋า {childName}</div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button className="stu-hw-submit-btn" style={{ flex: 1, background: '#2E8B5B' }} onClick={simulatePaid}>สแกนจ่ายแล้ว</button>
                  <button className="stu-hw-submit-btn" style={{ flex: 1, background: 'var(--text-muted)' }} onClick={() => setPpStep('idle')}>ยกเลิก</button>
                </div>
              </>
            )}
            {ppStep === 'verifying' && (
              <>
                <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>⏳</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brown-dark)' }}>ระบบกำลังตรวจสอบยอดเงิน...</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>ยืนยันอัตโนมัติเมื่อตรวจสอบว่าเงินเข้าจริง</div>
              </>
            )}
            {ppStep === 'done' && (
              <>
                <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.4rem' }}>เติมเงินสำเร็จ!</div>
                <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>ยอดใหม่ของ {childName}: <b>฿{balance.toLocaleString('th-TH')}</b><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>แจ้งเตือนถึงนักเรียนแล้ว</span></div>
                <button className="stu-hw-submit-btn" style={{ width: '100%' }} onClick={() => setPpStep('idle')}>ปิด</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── แจ้งเตือน (เช็คชื่อจริงของลูก) ── */}
      <div className="dash-section">
        <div className="dash-section-title">แจ้งเตือนล่าสุด</div>
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
        <div className="dash-section-title">ผลการเรียน ({grades.length} วิชา)</div>
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
        <div className="dash-section-title">การเช็คชื่อล่าสุด (ผ่าน QR)</div>
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
        <div className="dash-section-title">การบ้านค้าง ({pendingHw.length} ชิ้น)</div>
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
