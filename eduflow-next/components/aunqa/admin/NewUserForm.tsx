'use client';

/**
 * ฟอร์มเพิ่มผู้ใช้ (friendly-spec §F8.1 `user-form`) — 2 โหมด:
 *   (•) ส่งลิงก์เชิญ (`nu-mode-invite`, ค่าเริ่ม) → `inviteUser` → คืน token ครั้งเดียวให้หน้าแสดงใน `invite-result`
 *   ( ) ตั้งรหัสผ่านให้เลย (`nu-mode-password`) → แสดงช่อง `nu-password` (≥8) → `createUser`
 * - คง testid เดิม `nu-username/nu-name/nu-email/nu-submit` · label "บทบาท"/"ขอบเขต" มีที่เดียวในฟอร์ม (E2E getByLabel)
 * - R2-F10 (P2): ขอบเขตกรองตามบทบาท (ScopeSelect) — เปลี่ยนบทบาทแล้วเลือกขอบเขตแรกของระดับที่ใช้ได้
 * - R2-F10 (U10/P9): ตรวจฝั่ง client แบบเดียวกับ RequestAccessForm — สรุป error หัวฟอร์ม `nu-error-summary`
 *   (ลิงก์ → focus ช่อง) + ข้อความใต้ช่อง · พิมพ์แก้แล้วข้อความของช่องนั้นหายทันที
 * - error จาก API แสดงเป็นสรุปหัวฟอร์ม (§C2) แล้ว focus กล่องนั้น — ไม่ล้างค่าที่กรอก
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppUser, RoleCode } from '@/lib/types';
import { EMAIL_RE, PASSWORD_MAX, PASSWORD_MIN, USERNAME_RE, createUser, inviteUser } from '@/lib/api';
import { InlineMessage } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { ROLE_TH, errMsg } from '@/lib/ui/aunqa';
import ScopeSelect from './ScopeSelect';
import { CARD, LABEL, grantableRoles, parseScope, pickScope, scopesForRole, type ScopeOption } from './shared';
import type { InviteShown } from './InviteResult';

type Mode = 'invite' | 'password';
type Field = 'username' | 'name' | 'email' | 'scope' | 'password';
const ORDER: Field[] = ['username', 'name', 'email', 'scope', 'password'];
const FIELD_ID: Record<Field, string> = { username: 'nu-username', name: 'nu-name', email: 'nu-email', scope: 'nu-scope', password: 'nu-password' };
export type NewUserDone = { kind: 'invited'; invite: InviteShown } | { kind: 'created' };

export default function NewUserForm({ user, scopes, onDone, onCancel }: {
  user: AppUser; scopes: ScopeOption[]; onDone: (r: NewUserDone) => void; onCancel: () => void;
}) {
  const roles = grantableRoles(user);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleCode>('programme_staff');
  const [scope, setScope] = useState(() => pickScope(scopesForRole(scopes, 'programme_staff'), ''));
  const [mode, setMode] = useState<Mode>('invite');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const firstRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { if (error) errRef.current?.focus(); }, [error]);

  function clearErr(f: Field) { if (errors[f]) setErrors(e => ({ ...e, [f]: undefined })); }

  function changeRole(r: RoleCode) {
    setRole(r);
    setScope(s => pickScope(scopesForRole(scopes, r), s));
    clearErr('scope');
  }

  function validate(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (!USERNAME_RE.test(username.trim())) e.username = 'ชื่อผู้ใช้ต้องเป็นตัวอักษรอังกฤษ ตัวเลข หรือ . _ - ยาว 3–32 ตัว';
    if (!fullName.trim()) e.name = 'กรุณากรอกชื่อ-สกุล';
    if (!email.trim()) e.email = 'กรุณากรอกอีเมล';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!scope) e.scope = 'กรุณาเลือกขอบเขตให้ตรงกับบทบาท';
    if (mode === 'password' && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) e.password = 'รหัสผ่านต้องยาว 8–128 ตัวอักษร';
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    const errs = validate();
    setErrors(errs);
    const first = ORDER.find(f => errs[f]);
    if (first) { setTimeout(() => document.getElementById(FIELD_ID[first])?.focus(), 0); return; }

    const grant = [{ role, ...parseScope(scope) }];
    const base = { username: username.trim(), fullName: fullName.trim(), email: email.trim(), roles: grant };
    setBusy(true);
    try {
      if (mode === 'password') {
        await createUser(user, { ...base, password });
        setPassword('');
        onDone({ kind: 'created' });
      } else {
        const res = await inviteUser(user, base);
        onDone({ kind: 'invited', invite: { userId: res.user.id, fullName: res.user.fullName, token: res.token, expiresAt: res.expiresAt } });
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  const radio = 'h-5 w-5 shrink-0 accent-primary';
  const radioRow = 'flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground';
  const live = ORDER.filter(f => errors[f]);
  const desc = (f: Field, help?: string) => [help, errors[f] && `${FIELD_ID[f]}-err`].filter(Boolean).join(' ') || undefined;
  const fieldErr = (f: Field) => errors[f] && <p className="aq-field-error" id={`${FIELD_ID[f]}-err`}>{errors[f]}</p>;

  return (
    <form noValidate className={`${CARD} mb-6 animate-fade-in`} data-testid="user-form" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold text-foreground">เพิ่มผู้ใช้</h2>
      {error && (
        <div ref={errRef} tabIndex={-1} className="mt-4">
          <InlineMessage tone="danger" title="บันทึกไม่สำเร็จ">{error}</InlineMessage>
        </div>
      )}
      {live.length > 0 && (
        <InlineMessage tone="danger" className="mt-4" testId="nu-error-summary" title="ยังบันทึกไม่ได้ — กรุณาแก้ไขช่องต่อไปนี้">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {live.map(f => (
              <li key={f}>
                <a
                  href={`#${FIELD_ID[f]}`} data-testid={`nu-error-link-${f}`}
                  className="font-medium text-foreground underline underline-offset-4 hover:decoration-2"
                  onClick={ev => { ev.preventDefault(); document.getElementById(FIELD_ID[f])?.focus(); }}
                >
                  {errors[f]}
                </a>
              </li>
            ))}
          </ul>
        </InlineMessage>
      )}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="nu-username" className={LABEL}>ชื่อผู้ใช้ *</label>
          <Input
            ref={firstRef} id="nu-username" required autoCapitalize="none" autoCorrect="off" spellCheck={false}
            autoComplete="off" value={username} onChange={e => { setUsername(e.target.value); clearErr('username'); }}
            data-testid="nu-username" aria-invalid={!!errors.username || undefined} aria-describedby={desc('username', 'nu-username-help')}
          />
          <p className="aq-help" id="nu-username-help">ตัวอักษรอังกฤษ ตัวเลข หรือ . _ - ยาว 3–32 ตัว</p>
          {fieldErr('username')}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-name" className={LABEL}>ชื่อ-สกุล *</label>
          <Input
            id="nu-name" required autoComplete="off" value={fullName} onChange={e => { setFullName(e.target.value); clearErr('name'); }}
            data-testid="nu-name" aria-invalid={!!errors.name || undefined} aria-describedby={desc('name')}
          />
          {fieldErr('name')}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-email" className={LABEL}>อีเมล *</label>
          <Input
            id="nu-email" type="email" required autoComplete="off" value={email} onChange={e => { setEmail(e.target.value); clearErr('email'); }}
            data-testid="nu-email" aria-invalid={!!errors.email || undefined} aria-describedby={desc('email')}
          />
          {fieldErr('email')}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-role" className={LABEL}>บทบาท</label>
          <NativeSelect id="nu-role" value={role} onChange={e => changeRole(e.target.value as RoleCode)} data-testid="nu-role">
            {roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
          </NativeSelect>
        </div>
        <ScopeSelect
          id="nu-scope" role={role} scopes={scopes} value={scope} testId="nu-scope" error={errors.scope}
          className="space-y-1.5 md:col-span-2" onChange={v => { setScope(v); clearErr('scope'); }}
        />

        <fieldset role="radiogroup" aria-labelledby="nu-mode-legend" className="space-y-1 md:col-span-2">
          <legend id="nu-mode-legend" className={`${LABEL} mb-1`}>วิธีให้ผู้ใช้เข้าระบบ</legend>
          <div>
            <label className={radioRow}>
              <input
                type="radio" name="nu-mode" className={radio} value="invite" checked={mode === 'invite'}
                onChange={() => setMode('invite')} data-testid="nu-mode-invite"
              />
              <span>ส่งลิงก์เชิญให้ผู้ใช้ตั้งรหัสผ่านเอง (แนะนำ)</span>
            </label>
            <label className={radioRow}>
              <input
                type="radio" name="nu-mode" className={radio} value="password" checked={mode === 'password'}
                onChange={() => { setMode('password'); }} data-testid="nu-mode-password"
              />
              <span>ตั้งรหัสผ่านให้เลย</span>
            </label>
          </div>
        </fieldset>

        {mode === 'password' && (
          <div className="space-y-1.5 animate-fade-in">
            <label htmlFor="nu-password" className={LABEL}>รหัสผ่าน *</label>
            <Input
              id="nu-password" type="password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX}
              autoComplete="new-password" aria-describedby={desc('password', 'nu-password-help')} value={password}
              aria-invalid={!!errors.password || undefined}
              onChange={e => { setPassword(e.target.value); clearErr('password'); }} data-testid="nu-password"
            />
            <p className="aq-help" id="nu-password-help">อย่างน้อย 8 ตัวอักษร</p>
            {fieldErr('password')}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} aria-busy={busy || undefined} data-testid="nu-submit">
          {busy ? <><Icon name="loader" size={16} className="animate-spin" />กำลังบันทึก…</> : 'บันทึก'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>ยกเลิก</Button>
      </div>
    </form>
  );
}
