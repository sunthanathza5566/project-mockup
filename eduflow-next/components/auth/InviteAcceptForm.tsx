'use client';

/**
 * รับคำเชิญ `/invite` (friendly-spec §F7 · ADR-AUTH-001 O1/A3/R5)
 * - token อ่านจาก **fragment** `#t=<token>` เท่านั้น (ไม่อยู่ใน path/query → ไม่ถูกส่งไป server, ไม่เข้า log/Referer)
 *   อ่านแล้วลบ hash ออกจากแถบที่อยู่ทันที (history.replaceState) — token อยู่แค่ใน state ของหน้า ไม่เขียน storage/console
 * - ไม่มี token → ช่องกรอก (รับทั้งลิงก์เต็มและรหัสล้วน: ตัดค่าหลัง `#t=` ถ้ามี) + ปุ่มถัดไป
 * - peekInvitation ผ่าน → สรุปคำเชิญ (dl) + ตั้งรหัสผ่าน ≥8 · ใช้ไม่ได้ (ไม่มี/หมดอายุ/ใช้แล้ว/ยกเลิก) → ข้อความเดียว `inv-invalid`
 * - สำเร็จ: acceptInvitation เข้าสู่ระบบให้แล้ว → refresh() → router.replace('/app') + toast
 * - state: กำลังเตรียมข้อมูล/ตรวจลิงก์ (skeleton) · initError · invalid · ฟอร์ม
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InvitePreview } from '@/lib/types';
import { AunqaError, INVITE_INVALID_MESSAGE, PASSWORD_MAX, PASSWORD_MIN, acceptInvitation, peekInvitation } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LangContext';
import { ROLE_TH } from '@/lib/ui/aunqa';
import { InlineMessage, Skeleton } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';

/** ลิงก์เต็ม (…/invite#t=xxx) หรือรหัสล้วน → token · ตัดช่องว่าง */
export function extractInviteToken(raw: string): string {
  const v = raw.trim();
  const i = v.indexOf('#t=');
  if (i >= 0) return v.slice(i + 3).split(/[&\s]/)[0];
  return v.startsWith('t=') ? v.slice(2) : v;
}

/** อ่าน token จาก location.hash แล้วลบ hash ออก (ไม่ให้ค้างในแถบที่อยู่/ประวัติ) */
function takeHashToken(): string {
  if (typeof window === 'undefined') return '';
  const h = window.location.hash;
  if (!h.startsWith('#t=')) return '';
  const token = extractInviteToken(h);
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  return token;
}

type Phase = 'checking' | 'enter' | 'invalid' | 'ready';

const LABEL = 'block text-base font-medium text-foreground';
const CARD = 'w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm dark:shadow-none md:p-8';

export default function InviteAcceptForm() {
  const { isLoading, initError, refresh } = useAuth();
  const { showToast } = useToast();
  const { lang } = useLang();
  const router = useRouter();
  const uid = useId();

  const [phase, setPhase] = useState<Phase>('checking');
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pw2Err, setPw2Err] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const seq = useRef(0);
  const firstHash = useRef<string | null>(null);

  const check = useCallback(async (t: string) => {
    const my = ++seq.current; // ผลของการตรวจครั้งก่อนที่ตอบช้ากว่าไม่ทับครั้งล่าสุด
    if (!t) { setPhase('enter'); return; }
    setPhase('checking');
    const p = await peekInvitation(t).catch(() => null);
    if (my !== seq.current) return;
    if (!p) { setToken(''); setPreview(null); setPhase('invalid'); return; }
    setToken(t); setPreview(p); setPhase('ready');
  }, []);

  // รอ seed ข้อมูลเดโม่เสร็จก่อน (peekInvitation อ่าน localStorage) · ลิงก์ใหม่ที่วางในแถบที่อยู่ (hashchange) ตรวจใหม่
  // firstHash: อ่าน hash ครั้งเดียว (effect ที่รันซ้ำใน dev strict mode ไม่ได้ค่าว่างหลัง hash ถูกลบ)
  useEffect(() => {
    if (isLoading || initError) return;
    if (firstHash.current === null) firstHash.current = takeHashToken();
    void check(firstHash.current);
    const onHash = () => { const t = takeHashToken(); if (t) void check(t); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isLoading, initError, check]);

  function onNext(e: FormEvent) {
    e.preventDefault();
    const t = extractInviteToken(code);
    if (!t) { setCodeErr('กรุณาวางลิงก์หรือรหัสเชิญ'); return; }
    setCodeErr(''); setCode('');
    void check(t);
  }

  async function onAccept(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError('');
    const e1 = password.length < PASSWORD_MIN ? 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'
      : password.length > PASSWORD_MAX ? 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร' : '';
    const e2 = !password2 ? 'กรุณายืนยันรหัสผ่าน' : password2 !== password ? 'รหัสผ่านไม่ตรงกัน' : '';
    setPwErr(e1); setPw2Err(e2);
    if (e1 || e2) { document.getElementById(e1 ? `${uid}-pw` : `${uid}-pw2`)?.focus(); return; }

    setBusy(true);
    try {
      const res = await acceptInvitation(token, password);
      if (res.success) {
        setToken(''); setPassword(''); setPassword2('');
        refresh();
        showToast('ตั้งรหัสผ่านเรียบร้อย ยินดีต้อนรับ', 'success');
        router.replace('/app');
        return;
      }
      setFormError('ตั้งรหัสผ่านแล้ว แต่ยังเข้าสู่ระบบไม่ได้ — ลองเข้าสู่ระบบอีกครั้งจากหน้าเข้าสู่ระบบ');
    } catch (err) {
      if (err instanceof AunqaError && err.message === INVITE_INVALID_MESSAGE) {
        setToken(''); setPreview(null); setPhase('invalid');
      } else if (err instanceof AunqaError && err.message.includes('รหัสผ่าน')) {
        setPwErr(err.message);
      } else {
        setFormError('ตั้งรหัสผ่านไม่สำเร็จ โปรดลองอีกครั้ง');
      }
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/login" className="inline-flex min-h-11 items-center gap-1 text-base">
      <Icon name="chevron-left" size={20} />กลับไปหน้าเข้าสู่ระบบ
    </Link>
  );

  if (initError) {
    return <div className={CARD}><InlineMessage tone="danger">{initError}</InlineMessage><div className="mt-4">{back}</div></div>;
  }
  if (isLoading || phase === 'checking') {
    return <div className={CARD} aria-busy="true"><Skeleton kind="form" /></div>;
  }

  if (phase === 'invalid' || phase === 'enter') {
    return (
      <div className={CARD}>
        <h1 className="text-2xl font-semibold text-foreground">ตั้งรหัสผ่านจากคำเชิญ</h1>
        {phase === 'invalid' && (
          <InlineMessage tone="danger" className="mt-6" testId="inv-invalid">{INVITE_INVALID_MESSAGE}</InlineMessage>
        )}
        <form noValidate onSubmit={onNext} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-code`} className={LABEL}>รหัสเชิญ</label>
            <Input
              id={`${uid}-code`} data-testid="inv-code" value={code} autoComplete="off" autoCapitalize="none"
              autoCorrect="off" spellCheck={false}
              onChange={e => { setCode(e.target.value); setCodeErr(''); }}
              aria-invalid={!!codeErr || undefined}
              aria-describedby={`${uid}-code-help${codeErr ? ` ${uid}-code-err` : ''}`}
            />
            <p className="aq-help" id={`${uid}-code-help`}>วางลิงก์หรือรหัสเชิญที่ได้รับจากผู้ดูแลระบบ</p>
            {codeErr && <p className="aq-field-error" id={`${uid}-code-err`}>{codeErr}</p>}
          </div>
          <Button type="submit" data-testid="inv-next" className="w-full">
            ถัดไป<Icon name="chevron-right" size={20} />
          </Button>
        </form>
        <div className="mt-4">{back}</div>
      </div>
    );
  }

  // phase === 'ready'
  const p = preview!;
  const uniName = lang === 'en' && p.universityNameEn ? p.universityNameEn : p.universityNameTh;
  const expires = new Date(p.expiresAt).toLocaleString(lang === 'en' ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  const DT = 'text-sm text-muted-foreground';
  const DD = 'm-0 text-base font-medium text-foreground';
  return (
    <div className={CARD}>
      <h1 className="text-2xl font-semibold text-foreground">{`ยินดีต้อนรับ คุณ${p.fullName}`}</h1>
      <dl className="mt-6 grid gap-3 rounded-lg border bg-muted p-4 sm:grid-cols-2" data-testid="inv-summary">
        <div><dt className={DT}>ชื่อผู้ใช้</dt><dd className={DD}><code data-no-i18n>{p.username}</code></dd></div>
        <div><dt className={DT}>มหาวิทยาลัย</dt><dd className={DD} data-no-i18n>{uniName}</dd></div>
        <div><dt className={DT}>บทบาท</dt><dd className={DD}>{p.roles.map(r => ROLE_TH[r] ?? r).join(', ')}</dd></div>
        <div><dt className={DT}>ลิงก์หมดอายุ</dt><dd className={DD} data-no-i18n>{expires}</dd></div>
      </dl>
      {formError && <InlineMessage tone="danger" className="mt-4">{formError}</InlineMessage>}

      <form noValidate onSubmit={onAccept} className="mt-6 space-y-5">
        {/* ช่อง username ซ่อนให้ password manager ผูกรหัสกับบัญชีที่ถูกต้อง */}
        <input type="text" name="username" autoComplete="username" value={p.username} readOnly hidden />
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-pw`} className={LABEL}>รหัสผ่านใหม่<span aria-hidden="true"> *</span></label>
          <div className="relative">
            <Input
              id={`${uid}-pw`} data-testid="inv-password" className="pr-12" type={showPw ? 'text' : 'password'}
              value={password} autoComplete="new-password" maxLength={PASSWORD_MAX}
              onChange={e => { setPassword(e.target.value); setPwErr(''); }}
              required aria-required="true" aria-invalid={!!pwErr || undefined}
              aria-describedby={`${uid}-pw-help${pwErr ? ` ${uid}-pw-err` : ''}`}
            />
            <Button
              variant="ghost" size="icon"
              className="absolute right-0 top-0 border-transparent bg-transparent aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-foreground aria-pressed:shadow-none"
              onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPw}
            >
              <Icon name={showPw ? 'eye-off' : 'eye'} size={20} />
            </Button>
          </div>
          <p className="aq-help" id={`${uid}-pw-help`}>อย่างน้อย 8 ตัวอักษร</p>
          {pwErr && <p className="aq-field-error" id={`${uid}-pw-err`}>{pwErr}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-pw2`} className={LABEL}>ยืนยันรหัสผ่าน<span aria-hidden="true"> *</span></label>
          <Input
            id={`${uid}-pw2`} data-testid="inv-password2" type={showPw ? 'text' : 'password'}
            value={password2} autoComplete="new-password" maxLength={PASSWORD_MAX}
            onChange={e => { setPassword2(e.target.value); setPw2Err(''); }}
            required aria-required="true" aria-invalid={!!pw2Err || undefined}
            aria-describedby={pw2Err ? `${uid}-pw2-err` : undefined}
          />
          {pw2Err && <p className="aq-field-error" id={`${uid}-pw2-err`}>{pw2Err}</p>}
        </div>
        <Button type="submit" data-testid="inv-submit" className="w-full" disabled={busy} aria-busy={busy || undefined}>
          {busy ? <><Icon name="loader" size={20} className="animate-spin" />กำลังตั้งรหัสผ่าน…</> : 'ตั้งรหัสผ่านและเข้าสู่ระบบ'}
        </Button>
      </form>
      <div className="mt-4">{back}</div>
    </div>
  );
}
