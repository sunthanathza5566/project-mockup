'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, getLockUntil } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import LoginLoader from './LoginLoader';

/** บัญชีเดโม่ (ข้อมูลสมมติ) — กดเพื่อเติมในฟอร์ม */
const DEMO_ACCOUNTS: { username: string; label: string }[] = [
  { username: 'chair1',  label: 'ประธานหลักสูตร (ดูแลรอบประเมิน/อนุมัติข้อ)' },
  { username: 'staff1',  label: 'อาจารย์ผู้เขียน SAR (ได้รับมอบหมายเกณฑ์ที่ 1)' },
  { username: 'lect1',   label: 'อาจารย์หลักสูตร วิทยาการคอมพิวเตอร์' },
  { username: 'lect2',   label: 'อาจารย์หลักสูตร วิทยาการข้อมูล' },
  { username: 'data1',   label: 'เจ้าหน้าที่ข้อมูล (หลักฐาน/ตัวชี้วัด)' },
  { username: 'fqa1',    label: 'QA คณะ (ตรวจ/อนุมัติระดับคณะ)' },
  { username: 'dean1',   label: 'คณบดี (อนุมัติสุดท้าย/เปิด revision)' },
  { username: 'assess1', label: 'กรรมการประเมิน (อ่านอย่างเดียว)' },
  { username: 'uadmin',  label: 'ผู้ดูแลมหาวิทยาลัย' },
  { username: 'sadmin',  label: 'ผู้ดูแลระบบสูงสุด' },
  { username: 'uadmin2', label: 'ผู้ดูแลอีกมหาวิทยาลัย (ทดสอบการแยกข้อมูล)' },
];

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [lockMsg,  setLockMsg]  = useState('');
  const [hint,     setHint]     = useState('');
  const [showDemo, setShowDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingName, setLoadingName] = useState<string | null>(null);

  const { refresh, isLoading, initError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!lockMsg) return;
    const timer = setInterval(() => {
      const until = getLockUntil(username.trim());
      if (!until) {
        setLockMsg('บัญชีถูกปลดล็อกแล้ว — เข้าสู่ระบบได้อีกครั้ง');
        clearInterval(timer);
        return;
      }
      const s = Math.ceil((until - Date.now()) / 1000);
      setLockMsg(`บัญชีถูกล็อก — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockMsg, username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLockMsg(''); setHint('');
    setBusy(true);
    try {
      const result = await loginUser(username.trim(), password);
      if (result.success && result.user) {
        setLoadingName(result.user.fullName);
        await new Promise(r => setTimeout(r, 1200));
        refresh();
        router.push('/app');
        return;
      }
      if (result.error === 'locked') {
        const s = Math.ceil(((result.lockUntil || Date.now()) - Date.now()) / 1000);
        setLockMsg(`บัญชีถูกล็อก — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`);
        return;
      }
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบแล้วลองอีกครั้ง');
      if (result.error === 'invalid') setHint(`เหลืออีก ${result.remaining} ครั้งก่อนถูกล็อก 5 นาที`);
    } finally {
      setBusy(false);
    }
  }

  if (loadingName) return <LoginLoader name={loadingName} />;

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">AUN-QA <span>Copilot</span></div>
        <h1 className="auth-title">เข้าสู่ระบบ</h1>
        <p className="auth-sub">ผู้ช่วยจัดทำรายงานประเมินตนเอง (SAR) ตามเกณฑ์ AUN-QA ระดับหลักสูตร</p>

        {initError && <div className="auth-alert auth-alert-err" role="alert">{initError}</div>}
        {error   && <div className="auth-alert auth-alert-err" role="alert" data-testid="login-error">{error}</div>}
        {lockMsg && <div className="auth-alert auth-alert-warn" role="alert">{lockMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-username">ชื่อผู้ใช้</label>
            <input
              id="login-username" data-testid="login-username" className="auth-input" type="text"
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" required
            />
          </div>
          {hint && <p className="auth-hint">{hint}</p>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">รหัสผ่าน</label>
            <div className="pw-wrap">
              <input
                id="login-password" data-testid="login-password" className="auth-input"
                type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" required
              />
              <button type="button" className="pw-eye" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" data-testid="login-submit" className="auth-btn-main" disabled={busy || isLoading}>
            {busy ? 'กำลังตรวจสอบ…' : isLoading ? 'กำลังเตรียมข้อมูล…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="aq-demo-toggle" onClick={() => setShowDemo(s => !s)} aria-expanded={showDemo}>
            <span>บัญชีทดสอบ (ข้อมูลสมมติ)</span><span>{showDemo ? '▼' : '▶'}</span>
          </button>
          {showDemo && (
            <div className="aq-demo-list" data-testid="demo-accounts">
              <p className="aq-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                กดเพื่อเติมชื่อผู้ใช้และรหัสผ่านอัตโนมัติ · รหัสผ่านทุกบัญชี: <code>demo1234</code>
              </p>
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.username} type="button" className="aq-demo-item"
                  data-testid={`demo-${a.username}`}
                  onClick={() => { setUsername(a.username); setPassword('demo1234'); setError(''); setHint(''); }}
                >
                  <code>{a.username}</code><span>{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
