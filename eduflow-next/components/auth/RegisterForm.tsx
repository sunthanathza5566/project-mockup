'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, verifyEmail } from '@/lib/api/auth.api';
import { useToast } from '@/context/ToastContext';

const ROLES = [
  { value: 'teacher',      label: 'ครู' },
  { value: 'student',      label: 'นักเรียน' },
  { value: 'parent',       label: 'ผู้ปกครอง' },
  { value: 'school_admin', label: 'Admin โรงเรียน' },
];

export default function RegisterForm() {
  const [role,      setRole]      = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [verifyStep, setVerifyStep] = useState(false); // สมัครสำเร็จ → รอกดลิงก์ยืนยันอีเมล

  const { showToast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = await registerUser(role, firstName.trim(), lastName.trim(), email.trim(), username.trim(), password, confirm);
    if (!result.success) { setError(result.error || ''); return; }
    setVerifyStep(true); // ไปขั้นยืนยันอีเมล (จำลองกล่องจดหมาย)
  }

  function handleVerify() {
    if (!verifyEmail(username.trim())) { showToast('⚠️ ไม่พบบัญชี'); return; }
    showToast('✅ ยืนยันอีเมลสำเร็จ! เข้าสู่ระบบได้เลย');
    router.push('/login');
  }

  // ── ขั้นยืนยันอีเมล (จำลอง — ระบบจริงจะส่งลิงก์ไปที่อีเมล ดู TODO ใน auth.api) ──
  if (verifyStep) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">Edu<span>Flow</span></div>
          <h1 className="auth-title">ยืนยันอีเมล</h1>
          <p className="auth-sub">เราส่งลิงก์ยืนยันไปที่ <b>{email}</b> แล้ว<br />กรุณาเปิดอีเมลและกดลิงก์เพื่อเปิดใช้งานบัญชี</p>

          {/* จำลองกล่องจดหมาย — ใช้ฟรี ไม่ต้องต่อบริการส่งอีเมล */}
          <div style={{ background: 'var(--cream)', border: '1px dashed var(--border)', borderRadius: 12, padding: '1.1rem', margin: '1.25rem 0', textAlign: 'left' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📥 กล่องจดหมายของคุณ (จำลอง)</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--brown-dark)', fontWeight: 600, marginBottom: '0.25rem' }}>EduFlow — ยืนยันการสมัครสมาชิก</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginBottom: '0.75rem' }}>สวัสดี {firstName} กดปุ่มด้านล่างเพื่อยืนยันว่าอีเมลนี้เป็นของคุณ</div>
            <button className="auth-btn-main" style={{ width: '100%' }} onClick={handleVerify}>
              ✅ ยืนยันอีเมลของฉัน
            </button>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            * ระบบทดสอบ: จำลองการกดลิงก์ในอีเมลโดยไม่มีค่าใช้จ่าย — ระบบจริงจะส่งอีเมลผ่านบริการฟรี (เช่น Resend / Gmail SMTP)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Edu<span>Flow</span></div>
        <h1 className="auth-title">สมัครสมาชิก</h1>
        <p className="auth-sub">สร้างบัญชีใหม่เพื่อเข้าใช้งาน EduFlow</p>

        {error && <div className="auth-alert auth-alert-err">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-role">ประเภทบัญชี</label>
            <select
              id="reg-role"
              className="auth-input auth-select"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
            >
              <option value="">เลือกประเภทบัญชี...</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-firstname">ชื่อ</label>
              <input id="reg-firstname" className="auth-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-lastname">นามสกุล</label>
              <input id="reg-lastname" className="auth-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">อีเมล (ใช้ยืนยันตัวตน)</label>
            <input id="reg-email" className="auth-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-username">Username (ภาษาอังกฤษ/ตัวเลข ไม่เกิน 8 ตัว)</label>
            {/* ไม่ใช้ maxLength — ให้ validation แจ้ง error ชัดเจนแทนการตัดตัวอักษรเงียบ ๆ */}
            <input id="reg-username" className="auth-input" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Password (ภาษาอังกฤษ/ตัวเลข ไม่เกิน 8 ตัว)</label>
            <div className="pw-wrap">
              <input id="reg-password" className="auth-input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="pw-eye" onClick={() => setShowPw(s => !s)}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">ยืนยัน Password</label>
            <input id="reg-confirm" className="auth-input" type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          <button type="submit" className="auth-btn-main">สมัครสมาชิก</button>
        </form>

        <div className="auth-or">มีบัญชีแล้ว?</div>
        <Link href="/login">
          <button type="button" className="auth-btn-outline">เข้าสู่ระบบ</button>
        </Link>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>← กลับหน้าหลัก</Link>
        </div>
      </div>
    </div>
  );
}
