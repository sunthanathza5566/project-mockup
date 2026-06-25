'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, getLockUntil } from '@/lib/api/auth.api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showUser, setShowUser] = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [lockMsg,  setLockMsg]  = useState('');
  const [hint,     setHint]     = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const { refresh } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // countdown timer when locked
  useEffect(() => {
    if (!lockMsg) return;
    const timer = setInterval(() => {
      const until = getLockUntil(username);
      if (!until) {
        setLockMsg('บัญชีถูกปลดล็อคแล้ว — สามารถเข้าสู่ระบบได้อีกครั้ง');
        clearInterval(timer);
        return;
      }
      const s = Math.ceil((until - Date.now()) / 1000);
      setLockMsg(`บัญชีถูกล็อค — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockMsg, username]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLockMsg(''); setHint('');

    const result = loginUser(username.trim(), password);

    if (result.success && result.user) {
      refresh();
      showToast(`ยินดีต้อนรับ ${result.user.name}`);
      const role = result.user.role;
      if (role === 'student')     router.push('/student');
      else if (role === 'teacher') router.push('/teacher');
      else                         router.push('/dashboard');
      return;
    }

    if (result.error === 'format')  { setError('รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง'); return; }
    if (result.error === 'locked')  { const until = result.lockUntil!; const s = Math.ceil((until - Date.now()) / 1000); setLockMsg(`บัญชีถูกล็อค — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`); return; }
    if (result.error === 'invalid') { setError('รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง'); setHint(`เหลืออีก ${result.remaining} ครั้งก่อนถูกล็อค 5 นาที`); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Edu<span>Flow</span></div>
        <h1 className="auth-title">เข้าสู่ระบบ</h1>
        <p className="auth-sub">ใส่ข้อมูลผู้ใช้เพื่อเข้าสู่ระบบ EduFlow</p>

        {/* Demo Accounts Accordion */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--cream)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--brown-dark)',
            }}
          >
            <span>📋 บัญชีทดสอบ</span>
            <span style={{ fontSize: '1.2rem' }}>{showDemo ? '▼' : '▶'}</span>
          </button>

          {showDemo && (
            <div className="auth-demo-hint" style={{ marginTop: '0.75rem' }}>
              <strong>บัญชีทดสอบ:</strong><br />
              ครู: <code>teacher1 / Teacher1</code><br />
              นักเรียน: <code>student1 / Student1</code><br />
              Admin: <code>webadmin / Admin123</code>
            </div>
          )}
        </div>

        {error   && <div className="auth-alert auth-alert-err">⚠️ {error}</div>}
        {lockMsg && <div className="auth-alert auth-alert-warn">🔒 {lockMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-username">Username</label>
            <div className="pw-wrap">
              <input
                id="login-username"
                className="auth-input"
                type={showUser ? 'text' : 'password'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <button type="button" className="pw-eye" onClick={() => setShowUser(s => !s)}>
                {showUser ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {hint && <p className="auth-hint">{hint}</p>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">รหัสผ่าน</label>
            <div className="pw-wrap">
              <input
                id="login-password"
                className="auth-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="pw-eye" onClick={() => setShowPw(s => !s)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn-main">เข้าสู่ระบบ</button>
        </form>

        <div className="auth-or">หรือ</div>
        <Link href="/register">
          <button type="button" className="auth-btn-outline">สมัครสมาชิกใหม่</button>
        </Link>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
