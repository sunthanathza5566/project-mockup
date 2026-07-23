'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, getLockUntil, verifyEmail } from '@/lib/api/auth.api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LoginLoader from './LoginLoader';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showUser, setShowUser] = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [lockMsg,  setLockMsg]  = useState('');
  const [hint,     setHint]     = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [needVerify, setNeedVerify] = useState(false); // บัญชียังไม่ยืนยันอีเมล
  const [loadingName, setLoadingName] = useState<string | null>(null); // แสดงหน้าโหลดมาสคอตตอนล็อกอินสำเร็จ

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLockMsg(''); setHint(''); setNeedVerify(false);

    const result = await loginUser(username.trim(), password);

    if (result.success && result.user) {
      // แสดงมาสคอตกำลังโหลด ~1.6 วิ ให้ล็อกอินมีลูกเล่นก่อนพาเข้าหน้าหลัก
      setLoadingName(result.user.name);
      const role = result.user.role;
      const dest = role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/dashboard';
      await new Promise(r => setTimeout(r, 1600));
      refresh();
      router.push(dest);
      return;
    }

    if (result.error === 'unverified') { setNeedVerify(true); return; }
    if (result.error === 'format')  { setError('รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง'); return; }
    if (result.error === 'locked')  { const until = result.lockUntil!; const s = Math.ceil((until - Date.now()) / 1000); setLockMsg(`บัญชีถูกล็อค — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`); return; }
    if (result.error === 'invalid') { setError('รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง'); setHint(`เหลืออีก ${result.remaining} ครั้งก่อนถูกล็อค 5 นาที`); }
  }

  if (loadingName) return <LoginLoader name={loadingName} />;

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
            <div className="auth-demo-hint" style={{ marginTop: '0.75rem', textAlign: 'left', lineHeight: 1.9 }}>
              <strong>บัญชีทดสอบทั้งหมด:</strong><br />
              🧑‍🏫 ครู (มีตารางสอน): <code>teacher1 / Teacher1</code><br />
              🎓 นักเรียน (มีข้อมูลครบ): <code>student1 / Student1</code><br />
              👨‍👧 ผู้ปกครองของ ธนาพร (10021): <code>parent1 / Parent01</code><br />
              👩‍👦 ผู้ปกครองของ สมศักดิ์ (10022): <code>parent2 / Parent02</code><br />
              🏫 Admin โรงเรียน: <code>schadmin / Admin001</code><br />
              🛠 Web Admin: <code>webadmin / Admin123</code><br />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                * บัญชีที่แอดมินเพิ่มเอง ใช้รหัสผ่านเริ่มต้น Eduflow1 · บัญชีสมัครใหม่ = เริ่มจาก 0 ไม่มีข้อมูลจำลอง
              </span>
            </div>
          )}
        </div>

        {error   && <div className="auth-alert auth-alert-err">⚠️ {error}</div>}
        {lockMsg && <div className="auth-alert auth-alert-warn">🔒 {lockMsg}</div>}
        {needVerify && (
          <div className="auth-alert auth-alert-warn">
            📧 บัญชีนี้ยังไม่ได้ยืนยันอีเมล
            <button
              type="button"
              className="auth-btn-main"
              style={{ width: '100%', marginTop: '0.6rem' }}
              onClick={() => {
                if (verifyEmail(username.trim())) { setNeedVerify(false); showToast('✅ ยืนยันอีเมลแล้ว — เข้าสู่ระบบได้เลย'); }
              }}
            >
              ✅ กดลิงก์ยืนยันในอีเมล (จำลอง)
            </button>
          </div>
        )}

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
            <label className="auth-label" htmlFor="login-password">Password</label>
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
