'use client';

import { useState } from 'react';
import { validateQR, checkIn } from '@/lib/api/attendance.store';
import type { AttendanceSession } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface AttendanceScanViewProps {
  onClose: () => void;
}

/**
 * เช็คชื่อผ่าน QR — นักเรียนกรอกโค้ดจากหน้าจอครู
 * ระบบตัดสินสถานะเอง: ภายใน 10 นาทีแรก = ตรงเวลา, หลังจากนั้น = มาสาย
 */
export default function AttendanceScanView({ onClose }: AttendanceScanViewProps) {
  const [qrInput, setQrInput] = useState('');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [result, setResult] = useState<'on-time' | 'late' | null>(null);
  const { showToast } = useToast();
  const { session: authSession } = useAuth();

  function handleValidateQR() {
    if (!qrInput.trim()) { showToast('❌ กรุณากรอกโค้ดจากหน้าจอครู'); return; }
    const validated = validateQR(qrInput);
    if (!validated) { showToast('❌ โค้ดไม่ถูกต้องหรือหมดอายุแล้ว (15 นาที)'); return; }
    setSession(validated);
    showToast('✅ พบคาบเรียน — ยืนยันเพื่อเช็คชื่อ');
  }

  function handleCheckIn() {
    if (!session || !authSession) return;
    const res = checkIn(session.id, authSession.code, authSession.name);
    if (!res.ok) {
      if (res.reason === 'duplicate') showToast('⚠️ คุณเช็คชื่อคาบนี้ไปแล้ว');
      else showToast('❌ QR หมดอายุแล้ว — แจ้งครูให้สร้างใหม่');
      return;
    }
    setResult(res.record.status);
    showToast(res.record.status === 'on-time' ? '✅ เช็คชื่อสำเร็จ — มาตรงเวลา' : '⚠️ เช็คชื่อสำเร็จ — มาสาย');
    setTimeout(() => { onClose(); }, 2200);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: 'monospace', fontSize: '0.95rem', outline: 'none',
    background: 'var(--cream)', color: 'var(--text-body)',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--brown-dark)', fontSize: '1.05rem' }}>📱 เช็คชื่อผ่าน QR Code</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
      </div>

      {result ? (
        /* ── เช็คชื่อสำเร็จ ── */
        <div style={{
          padding: '2rem 1rem', textAlign: 'center', borderRadius: 12,
          background: result === 'on-time' ? 'rgba(92,138,92,0.12)' : 'rgba(196,128,74,0.12)',
          border: `1px solid ${result === 'on-time' ? 'var(--success)' : 'var(--late)'}`,
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{result === 'on-time' ? '✅' : '⚠️'}</div>
          <div style={{ fontWeight: 600, color: result === 'on-time' ? 'var(--success)' : 'var(--late)', fontSize: '1.1rem' }}>
            เช็คชื่อเรียบร้อย — {result === 'on-time' ? 'มาตรงเวลา' : 'มาสาย'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>ปิดหน้าต่างอัตโนมัติ...</p>
        </div>
      ) : !session ? (
        /* ── กรอกโค้ด ── */
        <>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.5rem' }}>
            กรอกโค้ดจากหน้าจอคุณครู
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input
              style={inputStyle}
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder="ATT-XXXXX-XXXXX"
              onKeyDown={e => e.key === 'Enter' && handleValidateQR()}
            />
            <button className="stu-hw-submit-btn" onClick={handleValidateQR}>ตรวจสอบ</button>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            💡 คุณครูจะแสดงโค้ดบนหน้าจอเมื่อเริ่มคาบ · โค้ดมีอายุ 15 นาที
            · เช็คชื่อภายใน 10 นาทีแรกนับเป็น "มาตรงเวลา"
          </p>
        </>
      ) : (
        /* ── ยืนยันเช็คชื่อ ── */
        <>
          <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: 1.9 }}>
            <div><strong style={{ color: 'var(--brown-dark)' }}>วิชา:</strong> {session.subject}</div>
            <div><strong style={{ color: 'var(--brown-dark)' }}>ห้อง:</strong> {session.classLabel || '—'} · คาบ {session.period}</div>
            <div><strong style={{ color: 'var(--brown-dark)' }}>ครูผู้สอน:</strong> {session.teacherName || '—'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ⏱️ หมดอายุ {new Date(session.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="stu-hw-submit-btn" style={{ flex: 1 }} onClick={handleCheckIn}>✅ ยืนยันเช็คชื่อ</button>
            <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={() => setSession(null)}>ย้อนกลับ</button>
          </div>
        </>
      )}
    </div>
  );
}
