'use client';

/**
 * ฟอร์มเข้าสู่ระบบ (ADR-UI-001 pages.md P2/P3)
 * - label ไม่ uppercase · input 44 · ปุ่มแสดงรหัสผ่าน Icon eye/eye-off 44×44 · username ไม่แก้ตัวพิมพ์อัตโนมัติ (P7)
 * - ผิด: InlineMessage danger ที่หัวฟอร์ม + aria-invalid ทั้งสองช่อง + "เหลืออีก N ครั้ง…" ใต้ช่องรหัสผ่าน
 * - ?reason=expired|other-tab: ข้อความจาก ADR 6.4
 * - สำเร็จ: AppLoader "login" (รวม ≤700ms) → /app
 * - บัญชีทดสอบพับไว้เป็นค่าเริ่มต้น จำสถานะใน aunqa_ui_prefs.demoOpen · กดแล้วเติมฟอร์ม + focus ปุ่มเข้าสู่ระบบ
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getLockUntil, loginUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useUiPrefs } from '@/lib/ui/prefs';
import { InlineMessage } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import AppLoader from '@/components/ui/AppLoader';

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

const REASON_TH: Record<string, string> = {
  expired: 'หมดเวลาการใช้งาน งานที่ค้างถูกบันทึกแล้ว — เข้าสู่ระบบอีกครั้ง',
  'other-tab': 'ออกจากระบบจากแท็บอื่นแล้ว งานที่ค้างถูกบันทึกแล้ว',
};

const LOGIN_LOADER_MS = 500; // รวมกับการเปลี่ยนหน้า ≤ 700ms (C22)

function lockText(until: number): string {
  const s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  return `บัญชีถูกล็อก — โปรดรอ ${Math.floor(s / 60)} นาที ${s % 60} วินาที`;
}

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [lockMsg,  setLockMsg]  = useState('');
  const [hint,     setHint]     = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [prefs, setPrefs] = useUiPrefs();
  const submitRef = useRef<HTMLButtonElement>(null);

  const { refresh, isLoading, initError } = useAuth();
  const router = useRouter();
  const reason = useSearchParams()?.get('reason') ?? '';

  useEffect(() => {
    if (!lockMsg) return;
    const timer = setInterval(() => {
      const until = getLockUntil(username.trim());
      if (!until) {
        setLockMsg('บัญชีถูกปลดล็อกแล้ว — เข้าสู่ระบบได้อีกครั้ง');
        clearInterval(timer);
        return;
      }
      setLockMsg(lockText(until));
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
        await new Promise(r => setTimeout(r, LOGIN_LOADER_MS));
        refresh();
        router.push('/app');
        return;
      }
      if (result.error === 'locked') {
        setLockMsg(lockText(result.lockUntil || Date.now()));
        return;
      }
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบแล้วลองอีกครั้ง');
      if (result.error === 'invalid') setHint(`เหลืออีก ${result.remaining} ครั้งก่อนถูกล็อก 5 นาที`);
    } finally {
      setBusy(false);
    }
  }

  if (loadingName) return <AppLoader mode="login" name={loadingName} />;

  const invalid = !!error;
  return (
    <>
      <div className="aq-auth__card">
        <h1 className="aq-h1">เข้าสู่ระบบ</h1>
        <p className="aq-muted aq-auth__sub">ผู้ช่วยจัดทำ SAR ระดับหลักสูตร</p>

        {REASON_TH[reason] && !error && <InlineMessage tone="info" testId="login-reason">{REASON_TH[reason]}</InlineMessage>}
        {initError && <InlineMessage tone="danger">{initError}</InlineMessage>}
        {error && <InlineMessage tone="danger" testId="login-error">{error}</InlineMessage>}
        {lockMsg && <InlineMessage tone="warn">{lockMsg}</InlineMessage>}

        <form onSubmit={handleSubmit}>
          <div className="aq-field">
            <label htmlFor="login-username">ชื่อผู้ใช้ *</label>
            <input
              id="login-username" data-testid="login-username" className="aq-input" type="text"
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              required aria-required="true" aria-invalid={invalid || undefined}
            />
          </div>

          <div className="aq-field">
            <label htmlFor="login-password">รหัสผ่าน *</label>
            <div className="aq-pw">
              <input
                id="login-password" data-testid="login-password" className="aq-input"
                type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" required aria-required="true"
                aria-invalid={invalid || undefined} aria-describedby={hint ? 'login-hint' : undefined}
              />
              <button
                type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-pw__toggle"
                onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPw}
              >
                <Icon name={showPw ? 'eye-off' : 'eye'} size={20} />
              </button>
            </div>
            {hint && <p className="aq-help aq-help--warn" id="login-hint">{hint}</p>}
          </div>

          <button
            ref={submitRef} type="submit" data-testid="login-submit" className="aq-btn aq-btn-primary aq-btn-block"
            disabled={busy || isLoading} aria-busy={busy || undefined}
          >
            {busy ? <><span className="aq-spinner" aria-hidden="true" />กำลังตรวจสอบ…</>
              : isLoading ? 'กำลังเตรียมข้อมูล…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <Link href="/" className="aq-auth__back">
          <Icon name="chevron-left" size={20} />กลับหน้าแรก
        </Link>
      </div>

      <details
        className="aq-collapse aq-auth__demo" open={prefs.demoOpen}
        onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== prefs.demoOpen) setPrefs({ demoOpen: o }); }}
      >
        <summary>
          <Icon name="users" size={20} />
          {`บัญชีทดสอบ (${DEMO_ACCOUNTS.length}) — รหัสผ่าน demo1234`}
          <Icon name="chevron-down" size={20} className="aq-collapse__chev" />
        </summary>
        <div className="aq-demo-grid" data-testid="demo-accounts">
          {DEMO_ACCOUNTS.map(a => (
            <button
              key={a.username} type="button" className="aq-btn aq-demo-btn"
              data-testid={`demo-${a.username}`}
              onClick={() => {
                setUsername(a.username); setPassword('demo1234'); setError(''); setHint('');
                submitRef.current?.focus();
              }}
            >
              <code>{a.username}</code><span className="aq-meta">{a.label}</span>
            </button>
          ))}
        </div>
      </details>
    </>
  );
}
