'use client';

/**
 * ฟอร์มเข้าสู่ระบบ (ADR-UI-001 pages.md P2/P3)
 * - label ตัวพิมพ์ตามจริง · input 44 · ปุ่มแสดงรหัสผ่าน Icon eye/eye-off 44×44 · username ไม่แก้ตัวพิมพ์อัตโนมัติ (P7)
 * - ผิด: InlineMessage danger ที่หัวฟอร์ม + aria-invalid ทั้งสองช่อง + "เหลืออีก N ครั้ง…" ใต้ช่องรหัสผ่าน
 * - ?reason=expired|other-tab: ข้อความจาก ADR 6.4
 * - สำเร็จ: AppLoader "login" (รวม ≤700ms) → /app
 * - บัญชีทดสอบพับไว้เป็นค่าเริ่มต้น จำสถานะใน aunqa_ui_prefs.demoOpen · กดแล้วเติมฟอร์ม + focus ปุ่มเข้าสู่ระบบ
 * - TASK-0002 S2 (saas-spec §P2, §C1, §C2): Input/Button primitives · details ตาม C2
 * - TASK-0002 R2-F2 (friendly-spec §F5): ฟอร์มอยู่ในการ์ด rounded-xl max-w-md · เส้นคั่น "หรือ" + ปุ่ม `login-request-access`
 *   (/request-access) และ `login-have-invite` (/invite) · LoginResult.error `pending` = info / `suspended` = danger
 *   (testid `login-error` เดียวกัน — backend บอกสถานะเฉพาะเมื่อรหัสผ่านถูก จึงไม่เปิดเผยว่ามีบัญชีอยู่)
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
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';

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

/** สถานะบัญชีที่รหัสผ่านถูกแต่ยังเข้าไม่ได้ (ADR-AUTH-001 A5) — friendly-spec §F5 */
const STATUS_MSG: Record<'pending' | 'suspended', { tone: 'info' | 'danger'; text: string }> = {
  pending: { tone: 'info', text: 'บัญชีนี้กำลังรอผู้ดูแลอนุมัติ — เมื่ออนุมัติแล้วจะเข้าสู่ระบบได้' },
  suspended: { tone: 'danger', text: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบของมหาวิทยาลัย' },
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
  const [status,   setStatus]   = useState<'pending' | 'suspended' | null>(null);
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
    setError(''); setStatus(null); setLockMsg(''); setHint('');
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
      if (result.error === 'pending' || result.error === 'suspended') {
        setStatus(result.error);
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
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm dark:shadow-none md:p-8">
        <h1 className="text-2xl font-semibold text-foreground">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-base text-muted-foreground">ผู้ช่วยจัดทำ SAR ระดับหลักสูตร</p>

        <div className="mt-6 space-y-3 empty:hidden">
          {REASON_TH[reason] && !error && !status && <InlineMessage tone="info" testId="login-reason">{REASON_TH[reason]}</InlineMessage>}
          {initError && <InlineMessage tone="danger">{initError}</InlineMessage>}
          {error && <InlineMessage tone="danger" testId="login-error">{error}</InlineMessage>}
          {status && <InlineMessage tone={STATUS_MSG[status].tone} testId="login-error">{STATUS_MSG[status].text}</InlineMessage>}
          {lockMsg && <InlineMessage tone="warn">{lockMsg}</InlineMessage>}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="block text-base font-medium text-foreground">ชื่อผู้ใช้ *</label>
            <Input
              id="login-username" data-testid="login-username" type="text"
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              required aria-required="true" aria-invalid={invalid || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-base font-medium text-foreground">รหัสผ่าน *</label>
            <div className="relative">
              <Input
                id="login-password" data-testid="login-password" className="pr-12"
                type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" required aria-required="true"
                aria-invalid={invalid || undefined} aria-describedby={hint ? 'login-hint' : undefined}
              />
              <Button
                variant="ghost" size="icon"
                className="absolute right-0 top-0 border-transparent bg-transparent aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-foreground aria-pressed:shadow-none"
                onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPw}
              >
                <Icon name={showPw ? 'eye-off' : 'eye'} size={20} />
              </Button>
            </div>
            {hint && <p className="aq-help text-warning" id="login-hint">{hint}</p>}
          </div>

          <Button
            ref={submitRef} type="submit" data-testid="login-submit" className="w-full"
            disabled={busy || isLoading} aria-busy={busy || undefined}
          >
            {busy ? <><Icon name="loader" size={20} className="animate-spin" />กำลังตรวจสอบ…</>
              : isLoading ? 'กำลังเตรียมข้อมูล…' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        {/* ผู้ที่ยังไม่มีบัญชี: ขอเข้าใช้งาน (O2) / มีคำเชิญ (O1) — ADR-AUTH-001 */}
        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="aq-meta">หรือ</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/request-access" data-testid="login-request-access">
              <Icon name="user-plus" size={20} />ขอเข้าใช้งาน
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/invite" data-testid="login-have-invite">
              <Icon name="link" size={20} />มีรหัสเชิญ
            </Link>
          </Button>
        </div>

        <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-1 text-base">
          <Icon name="chevron-left" size={20} />กลับหน้าแรก
        </Link>
      </div>

      <details
        className="group w-full max-w-md rounded-lg border bg-card text-card-foreground" open={prefs.demoOpen}
        onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== prefs.demoOpen) setPrefs({ demoOpen: o }); }}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-medium [&::-webkit-details-marker]:hidden">
          <Icon name="users" size={20} className="text-muted-foreground" />
          {`บัญชีทดสอบ (${DEMO_ACCOUNTS.length}) — รหัสผ่าน demo1234`}
          <Icon name="chevron-down" size={20} className="ml-auto text-muted-foreground transition-transform duration-fast ease-move group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 border-t p-4" data-testid="demo-accounts">
          {DEMO_ACCOUNTS.map(a => (
            <Button
              key={a.username} variant="outline"
              className="w-full flex-col items-start justify-start gap-0 px-3 py-2 text-left visited:text-foreground"
              data-testid={`demo-${a.username}`}
              onClick={() => {
                setUsername(a.username); setPassword('demo1234'); setError(''); setStatus(null); setHint('');
                submitRef.current?.focus();
              }}
            >
              <code className="font-semibold text-primary">{a.username}</code><span className="aq-meta font-normal">{a.label}</span>
            </Button>
          ))}
        </div>
      </details>
    </>
  );
}
