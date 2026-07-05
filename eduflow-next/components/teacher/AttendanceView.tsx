'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  createAttendanceSession, getClassSessions, getSessionRecords,
  submitSessionReport, getAttendanceReports,
} from '@/lib/api/attendance.store';
import { exportAttendanceReportToExcel } from '@/lib/utils/excel-export';
import type { AttendanceSession, AttendanceRecord, AttendanceReport } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface AttendanceViewProps {
  teacherId: string;
  teacherName: string;
  selectedClass: { id: string; grade: string; room: string; subject: string; key: string };
  initialTab?: 'manager' | 'report';
}

export default function AttendanceView({ teacherId, teacherName, selectedClass, initialTab = 'manager' }: AttendanceViewProps) {
  const [view, setView] = useState<'manager' | 'report'>(initialTab);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [liveRecords, setLiveRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [qrImage, setQrImage] = useState<string>('');
  const { showToast } = useToast();

  const classLabel = `${selectedClass.grade}/${selectedClass.room}`;
  const activeSession = sessions.find(s => s.status === 'active') || null;

  const refresh = useCallback(() => {
    setSessions(getClassSessions(selectedClass.id));
    setReports(getAttendanceReports(selectedClass.id));
  }, [selectedClass.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // live update จำนวนเช็คชื่อทุก 5 วินาที ระหว่างมี session active
  useEffect(() => {
    if (!activeSession) { setLiveRecords([]); return; }
    const update = () => setLiveRecords(getSessionRecords(activeSession.id));
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [activeSession?.id]);

  // สร้างภาพ QR จริงจากโค้ด session
  useEffect(() => {
    if (!activeSession) { setQrImage(''); return; }
    QRCode.toDataURL(activeSession.qrCode, {
      width: 220, margin: 1,
      color: { dark: '#3D2B1A', light: '#FAF7F2' }, // โทนสีธีมเว็บ
    }).then(setQrImage).catch(() => setQrImage(''));
  }, [activeSession?.id]);

  function handleGenerateQR() {
    if (activeSession) { showToast('⚠️ มี QR ที่ยังไม่หมดอายุอยู่แล้ว — ใช้อันเดิมหรือส่งรายงานก่อน'); return; }
    createAttendanceSession({
      teacherId, teacherName,
      classId: selectedClass.id, classLabel,
      subject: selectedClass.subject, period: 1,
    });
    refresh();
    showToast('✅ สร้าง QR แล้ว (อายุ 15 นาที · 10 นาทีแรก = ตรงเวลา)');
  }

  function handleSubmitReport(sessionId: string) {
    const report = submitSessionReport(sessionId);
    if (!report) { showToast('❌ ไม่พบ session'); return; }
    refresh();
    setView('report');
    showToast('✅ ส่งรายงานแล้ว — ดูย้อนหลังได้ที่แท็บรายงาน');
  }

  async function handleExport(report: AttendanceReport) {
    await exportAttendanceReportToExcel(report);
    showToast('📥 ดาวน์โหลดรายงานเช็คชื่อแล้ว');
  }

  const timeLeft = activeSession ? Math.max(0, Math.ceil((activeSession.expiresAt - Date.now()) / 60000)) : 0;

  return (
    <div className="dash-section">
      <div className="dash-section-title">📋 เช็คชื่อ — {classLabel} {selectedClass.subject}</div>

      {/* Tabs */}
      <div className="dash-tabs-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`dash-tab-btn${view === 'manager' ? ' active' : ''}`} onClick={() => setView('manager')}>🔳 สร้าง QR</button>
        <button className={`dash-tab-btn${view === 'report' ? ' active' : ''}`} onClick={() => setView('report')}>📊 รายงานย้อนหลัง ({reports.length})</button>
      </div>

      {view === 'manager' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* สร้าง QR */}
          {!activeSession && (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>สร้าง QR Code เช็คชื่อ</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.1rem' }}>
                QR มีอายุ 15 นาที · เช็คชื่อภายใน 10 นาทีแรกนับเป็น "มาตรงเวลา" หลังจากนั้นเป็น "มาสาย"
              </p>
              <button className="dash-action-btn" onClick={handleGenerateQR}>🔳 สร้าง QR Code</button>
            </div>
          )}

          {/* Active session + live count */}
          {activeSession && (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--brown-light)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--brown-dark)' }}>🔵 QR กำลังใช้งาน — เหลือ ~{timeLeft} นาที</span>
                <span className="stu-hw-status-badge badge-submitted">เช็คชื่อแล้ว {liveRecords.length} คน</span>
              </div>

              <div style={{ background: 'var(--warm-white)', border: '1px dashed var(--border)', borderRadius: 10, padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
                {qrImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrImage} alt="QR Code เช็คชื่อ" style={{ width: 200, height: 200, borderRadius: 8, marginBottom: '0.6rem' }} />
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>สแกน QR หรือกรอกโค้ดด้านล่างในเมนู "เช็คชื่อ QR"</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: '2px', color: 'var(--brown-dark)', wordBreak: 'break-all' }}>
                  {activeSession.qrCode}
                </div>
              </div>

              {/* รายชื่อสดๆ */}
              {liveRecords.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem', maxHeight: 220, overflowY: 'auto' }}>
                  {liveRecords.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
                      <span style={{ flex: 1, color: 'var(--brown-dark)', fontWeight: 500 }}>{r.studentName}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.studentId}</span>
                      <span className={`stu-hw-status-badge ${r.status === 'on-time' ? 'badge-graded' : 'badge-overdue'}`}>
                        {r.status === 'on-time' ? 'ตรงเวลา' : 'สาย'} · {new Date(r.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button className="dash-action-btn" onClick={() => handleSubmitReport(activeSession.id)}>
                ✅ ปิดคาบ & ส่งรายงาน
              </button>
            </div>
          )}

          {/* ประวัติ session วันนี้ */}
          {sessions.length > 0 && (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>📜 ประวัติ QR Sessions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.7rem' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', flex: 1 }}>{s.qrCode}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{new Date(s.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`stu-hw-status-badge ${s.status === 'submitted' ? 'badge-graded' : s.status === 'active' ? 'badge-submitted' : 'badge-pending'}`}>
                      {s.status === 'submitted' ? '✅ ส่งแล้ว' : s.status === 'active' ? '🔵 ใช้งานอยู่' : '⚪ หมดอายุ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'report' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reports.length === 0 ? (
            <div className="stu-empty">ยังไม่มีรายงานเช็คชื่อ — สร้าง QR แล้วกด "ปิดคาบ & ส่งรายงาน" ก่อน</div>
          ) : (
            reports.map(rpt => (
              <div key={rpt.id} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.92rem' }}>
                      {rpt.subject} · {rpt.classLabel || rpt.classId} · คาบ {rpt.period}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {rpt.date} · ⏰ {rpt.time}</div>
                  </div>
                  <button className="dash-action-btn" onClick={() => handleExport(rpt)}>📥 Excel</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
                  {[
                    { label: 'ทั้งหมด', num: rpt.totalStudents, color: 'var(--brown-dark)' },
                    { label: 'ตรงเวลา', num: rpt.presentCount, color: 'var(--success)' },
                    { label: 'มาสาย',   num: rpt.lateCount,    color: 'var(--late)' },
                    { label: 'ขาด',     num: rpt.absentCount,  color: 'var(--absent)' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.color }}>{k.num}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {rpt.records.length > 0 && (
                  <details className="stu-hw-details" style={{ marginTop: '0.75rem' }}>
                    <summary>รายชื่อผู้เช็คชื่อ ({rpt.records.length})</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {rpt.records.map(r => (
                        <div key={r.id} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}>
                          <span style={{ flex: 1, color: 'var(--brown-dark)' }}>{r.studentName}</span>
                          <span style={{ color: r.status === 'on-time' ? 'var(--success)' : 'var(--late)', fontWeight: 600 }}>
                            {r.status === 'on-time' ? '✓ ตรงเวลา' : '⚠ สาย'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
