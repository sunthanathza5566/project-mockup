'use client';

import { useState } from 'react';
import { validateQRCode, recordAttendance } from '@/lib/api/teacher.api';
import type { AttendanceSession } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface AttendanceScanViewProps {
  onClose: () => void;
}

export default function AttendanceScanView({ onClose }: AttendanceScanViewProps) {
  const [qrInput, setQrInput] = useState('');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { session: authSession } = useAuth();

  async function handleValidateQR() {
    if (!qrInput.trim()) {
      showToast('❌ กรุณาใส่ QR code หรือชื่อห้อง', 'error');
      return;
    }

    setLoading(true);
    try {
      // ใช้เป็น mock ตอนนี้ — อนาคตจะเชื่อม validateQRCode จริง
      const validated = await validateQRCode(qrInput);
      if (!validated) {
        showToast('❌ QR code ไม่ถูกต้องหรือหมดอายุแล้ว', 'error');
        return;
      }
      setSession(validated);
      showToast('✅ อ่าน QR codeสำเร็จ');
    } catch (err) {
      showToast('❌ ผิดพลาด', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(status: 'on-time' | 'late') {
    if (!session || !authSession) return;

    setLoading(true);
    try {
      const record = await recordAttendance(
        session.id,
        authSession.code,
        authSession.name,
        status
      );
      setCheckedIn(true);
      showToast(
        status === 'on-time'
          ? '✅ เช็คชื่อเรียบร้อย (ตรงเวลา)'
          : '⚠️ เช็คชื่อเรียบร้อย (มาสาย)',
        'success'
      );
      setTimeout(() => {
        onClose();
        setSession(null);
        setCheckedIn(false);
        setQrInput('');
      }, 2000);
    } catch (err) {
      showToast('❌ ผิดพลาด', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={onClose}
        style={{
          padding: '0.5rem 1rem',
          marginBottom: '1.5rem',
          background: 'transparent',
          color: 'var(--brown-dark)',
          border: '2px solid var(--brown-dark)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
        }}
      >
        ← ปิด
      </button>

      <div
        style={{
          padding: '2rem',
          background: 'var(--warm-white)',
          borderRadius: '12px',
          border: '2px solid var(--border-light)',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--brown-dark)', textAlign: 'center' }}>
          📱 เช็คชื่อผ่าน QR Code
        </h2>

        {!session ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
                ป้อน QR Code:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  placeholder="ATT-xxxxx-xxxxx"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                  }}
                  onKeyPress={e => e.key === 'Enter' && handleValidateQR()}
                />
                <button
                  onClick={handleValidateQR}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--brown-dark)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? '...' : 'ยืนยัน'}
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                💡 ให้คุณครูแสดง QR code แล้วป้อนรหัสข้างต้น
              </p>
            </div>
          </>
        ) : !checkedIn ? (
          <>
            <div
              style={{
                padding: '1.5rem',
                background: '#e8f4f8',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '2px solid #4db8d8',
              }}
            >
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>วิชา:</strong> {session.subject}
              </p>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>คาบที่:</strong> {session.period}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>QR Code:</strong> {session.qrCode}
              </p>
            </div>

            <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--brown-dark)', fontWeight: '600' }}>
              บอกสถานะการเช็คชื่อของคุณ
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                onClick={() => handleCheckIn('on-time')}
                disabled={loading}
                style={{
                  padding: '1rem',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                ✅ มาตรงเวลา
              </button>
              <button
                onClick={() => handleCheckIn('late')}
                disabled={loading}
                style={{
                  padding: '1rem',
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                ⚠️ มาสาย
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#e8f5e9',
              borderRadius: '8px',
              border: '2px solid #4caf50',
            }}
          >
            <h3 style={{ fontSize: '1.5rem', color: '#4caf50', marginBottom: '1rem' }}>✅ เช็คชื่อเรียบร้อย</h3>
            <p style={{ color: 'var(--text-muted)' }}>ปิดหน้านี้ใน 2 วินาที...</p>
          </div>
        )}
      </div>
    </div>
  );
}
