'use client';

import { useState } from 'react';
import { generateAttendanceQR, generateAttendanceReport, submitAttendanceReport } from '@/lib/api/teacher.api';
import { exportAttendanceReportToExcel } from '@/lib/utils/excel-export';
import type { AttendanceSession, AttendanceReport } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface AttendanceViewProps {
  teacherId: string;
  selectedClass: { id: string; grade: string; room: string; subject: string; key: string };
}

export default function AttendanceView({ teacherId, selectedClass }: AttendanceViewProps) {
  const [view, setView] = useState<'manager' | 'report'>('manager');
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const { showToast } = useToast();

  async function handleGenerateQR() {
    setLoading(true);
    try {
      const session = await generateAttendanceQR(teacherId, selectedClass.id, selectedClass.subject, 1);
      setActiveSession(session);
      setSessions([session, ...sessions]);
      showToast('✅ สร้าง QR code แล้ว (อายุ 15 นาที)');
    } catch (err) {
      showToast('❌ ผิดพลาด', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!activeSession) return;
    setLoading(true);
    try {
      const newReport = await generateAttendanceReport(
        activeSession.id,
        teacherId,
        selectedClass.id,
        selectedClass.subject,
        1
      );
      setReport(newReport);
      setView('report');
      showToast('📊 สร้างรายงานแล้ว');
    } catch (err) {
      showToast('❌ ผิดพลาด', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReport() {
    if (!report) return;
    setLoading(true);
    try {
      await submitAttendanceReport(report);
      setSessions(sessions.map(s => s.id === report.sessionId ? { ...s, status: 'submitted' as const } : s));
      setActiveSession(null);
      setReport(null);
      setView('manager');
      showToast('✅ ส่งรายงานแล้ว (แจ้งเตือนไปยังคุณครู)');
    } catch (err) {
      showToast('❌ ผิดพลาด', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--brown-dark)' }}>📋 เช็คชื่อสำหรับคลาส {selectedClass.room}</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
        <button
          onClick={() => setView('manager')}
          style={{
            padding: '0.75rem 1.5rem',
            background: view === 'manager' ? 'var(--brown-dark)' : 'transparent',
            color: view === 'manager' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: view === 'manager' ? '600' : '400',
            borderBottom: view === 'manager' ? '3px solid var(--brown-dark)' : 'none',
            marginBottom: '-2px',
          }}
        >
          QR Generator
        </button>
        <button
          onClick={() => setView('report')}
          style={{
            padding: '0.75rem 1.5rem',
            background: view === 'report' ? 'var(--brown-dark)' : 'transparent',
            color: view === 'report' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: view === 'report' ? '600' : '400',
            borderBottom: view === 'report' ? '3px solid var(--brown-dark)' : 'none',
            marginBottom: '-2px',
          }}
        >
          Attendance Report
        </button>
      </div>

      {view === 'manager' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* QR Generator */}
          <div
            style={{
              padding: '2rem',
              background: 'var(--warm-white)',
              borderRadius: '12px',
              border: '2px solid var(--border-light)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ marginBottom: '1rem', color: 'var(--brown-dark)' }}>สร้าง QR Code เช็คชื่อ</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              กดปุ่มเพื่อสร้าง QR code สำหรับเช็คชื่อเด็กๆ (อายุ 15 นาที)
            </p>
            <button
              onClick={handleGenerateQR}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                background: 'var(--brown-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'กำลังสร้าง...' : '🔳 สร้าง QR Code'}
            </button>
          </div>

          {/* Active Session */}
          {activeSession && (
            <div
              style={{
                padding: '2rem',
                background: '#f0f8ff',
                borderRadius: '12px',
                border: '2px solid #87ceeb',
              }}
            >
              <h3 style={{ marginBottom: '1rem', color: 'var(--brown-dark)' }}>🔳 Active QR Session</h3>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '3rem',
                    padding: '1rem',
                    letterSpacing: '2px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    color: 'var(--brown-dark)',
                  }}
                >
                  {activeSession.qrCode}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ⏱️ หมดอายุใน 15 นาที
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--brown-dark)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  {loading ? '...' : '📊 สร้างรายงาน'}
                </button>
                <button
                  onClick={() => setActiveSession(null)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    color: 'var(--brown-dark)',
                    border: '2px solid var(--brown-dark)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* Session History */}
          {sessions.length > 0 && (
            <div
              style={{
                padding: '2rem',
                background: 'var(--warm-white)',
                borderRadius: '12px',
                border: '2px solid var(--border-light)',
              }}
            >
              <h3 style={{ marginBottom: '1rem', color: 'var(--brown-dark)' }}>📜 ประวัติ QR Sessions</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {sessions.map(session => (
                  <div
                    key={session.id}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', color: 'var(--brown-dark)' }}>{session.qrCode}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(session.createdAt).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: session.status === 'submitted' ? '#90ee90' : '#ffd700',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'white',
                      }}
                    >
                      {session.status === 'submitted' ? '✅ Submitted' : session.status === 'active' ? '🔵 Active' : '⚪ Expired'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'report' && report && (
        <div
          style={{
            padding: '2rem',
            background: 'var(--warm-white)',
            borderRadius: '12px',
            border: '2px solid var(--border-light)',
          }}
        >
          <h3 style={{ marginBottom: '2rem', color: 'var(--brown-dark)' }}>📊 Attendance Report</h3>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>คนทั้งหมด</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--brown-dark)' }}>{report.totalStudents}</p>
            </div>
            <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>มาตรงเวลา</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>{report.presentCount}</p>
            </div>
            <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>มาสาย</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>{report.lateCount}</p>
            </div>
            <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ขาดเรียน</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>{report.absentCount}</p>
            </div>
          </div>

          {/* Details */}
          <div
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              marginBottom: '2rem',
              border: '1px solid var(--border-light)',
            }}
          >
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>วิชา:</strong> {report.subject}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>วันที่:</strong> {report.date}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>เวลา:</strong> {report.time}
            </p>
            <p>
              <strong>คาบ:</strong> คาบที่ {report.period}
            </p>
          </div>

          {/* Records */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--brown-dark)' }}>👥 รายชื่อผู้เช็คชื่อ</h4>
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {report.records.map(record => (
                <div
                  key={record.id}
                  style={{
                    padding: '0.75rem',
                    background: record.status === 'on-time' ? '#e8f5e9' : '#fff3cd',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9rem',
                  }}
                >
                  <span>{record.studentName}</span>
                  <span style={{ fontWeight: '600', color: record.status === 'on-time' ? '#4caf50' : '#ff9800' }}>
                    {record.status === 'on-time' ? '✅ On Time' : '⚠️ Late'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <button
              onClick={() => exportAttendanceReportToExcel(report)}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
              }}
            >
              📥 ดึง Excel
            </button>
            <button
              onClick={handleSubmitReport}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--brown-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
              }}
            >
              {loading ? 'กำลังส่ง...' : '✅ ส่งรายงาน'}
            </button>
            <button
              onClick={() => setView('manager')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: 'var(--brown-dark)',
                border: '2px solid var(--brown-dark)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
              }}
            >
              ← ย้อนกลับ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
