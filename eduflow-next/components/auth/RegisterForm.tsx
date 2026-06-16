'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/api/auth.api';
import { useToast } from '@/context/ToastContext';

const ROLES = [
  { value: 'teacher',      label: 'ครู' },
  { value: 'student',      label: 'นักเรียน' },
  { value: 'parent',       label: 'ผู้ปกครอง' },
  { value: 'school_admin', label: 'Admin โรงเรียน' },
];

export default function RegisterForm() {
  const [role,     setRole]     = useState('');
  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');

  const { showToast } = useToast();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = registerUser(role, name, username.trim(), password, confirm);
    if (!result.success) { setError(result.error || ''); return; }
    showToast('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    router.push('/login');
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

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-name">ชื่อ-นามสกุล</label>
            <input id="reg-name" className="auth-input" type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-username">Username (ภาษาอังกฤษ/ตัวเลข ไม่เกิน 8 ตัว)</label>
            <input id="reg-username" className="auth-input" type="text" value={username} onChange={e => setUsername(e.target.value)} maxLength={8} required />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">รหัสผ่าน (ภาษาอังกฤษ/ตัวเลข ไม่เกิน 8 ตัว)</label>
            <div className="pw-wrap">
              <input id="reg-password" className="auth-input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} maxLength={8} required />
              <button type="button" className="pw-eye" onClick={() => setShowPw(s => !s)}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">ยืนยันรหัสผ่าน</label>
            <input id="reg-confirm" className="auth-input" type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={8} required />
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
