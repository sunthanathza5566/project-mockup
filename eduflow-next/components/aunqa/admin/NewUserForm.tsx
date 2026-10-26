'use client';

/**
 * ฟอร์มเพิ่มผู้ใช้ (friendly-spec §F8.1 `user-form`) — 2 โหมด:
 *   (•) ส่งลิงก์เชิญ (`nu-mode-invite`, ค่าเริ่ม) → `inviteUser` → คืน token ครั้งเดียวให้หน้าแสดงใน `invite-result`
 *   ( ) ตั้งรหัสผ่านให้เลย (`nu-mode-password`) → แสดงช่อง `nu-password` (≥8) → `createUser`
 * - คง testid เดิม `nu-username/nu-name/nu-email/nu-submit` · label "บทบาท"/"ขอบเขต" มีที่เดียวในฟอร์ม (E2E getByLabel)
 * - error จาก API แสดงเป็นสรุปหัวฟอร์ม (§C2) แล้ว focus กล่องนั้น — ไม่ล้างค่าที่กรอก
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppUser, RoleCode } from '@/lib/types';
import { PASSWORD_MAX, PASSWORD_MIN, createUser, inviteUser } from '@/lib/api';
import { InlineMessage } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { ROLE_TH, errMsg } from '@/lib/ui/aunqa';
import { CARD, LABEL, grantableRoles, parseScope, type ScopeOption } from './shared';
import type { InviteShown } from './InviteResult';

type Mode = 'invite' | 'password';
export type NewUserDone = { kind: 'invited'; invite: InviteShown } | { kind: 'created' };

export default function NewUserForm({ user, scopes, onDone, onCancel }: {
  user: AppUser; scopes: ScopeOption[]; onDone: (r: NewUserDone) => void; onCancel: () => void;
}) {
  const roles = grantableRoles(user);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleCode>('programme_staff');
  const [scope, setScope] = useState(scopes[0]?.key ?? '');
  const [mode, setMode] = useState<Mode>('invite');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { if (error) errRef.current?.focus(); }, [error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (mode === 'password' && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) {
      setError('รหัสผ่านต้องยาว 8–128 ตัวอักษร');
      return;
    }
    const grant = [{ role, ...parseScope(scope || scopes[0].key) }];
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

  return (
    <form className={`${CARD} mb-6 animate-fade-in`} data-testid="user-form" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold text-foreground">เพิ่มผู้ใช้</h2>
      {error && (
        <div ref={errRef} tabIndex={-1} className="mt-4 outline-none">
          <InlineMessage tone="danger" title="บันทึกไม่สำเร็จ">{error}</InlineMessage>
        </div>
      )}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="nu-username" className={LABEL}>ชื่อผู้ใช้ *</label>
          <Input
            ref={firstRef} id="nu-username" required autoCapitalize="none" autoCorrect="off" spellCheck={false}
            autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} data-testid="nu-username"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-name" className={LABEL}>ชื่อ-สกุล *</label>
          <Input id="nu-name" required autoComplete="off" value={fullName} onChange={e => setFullName(e.target.value)} data-testid="nu-name" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-email" className={LABEL}>อีเมล *</label>
          <Input id="nu-email" type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} data-testid="nu-email" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="nu-role" className={LABEL}>บทบาท</label>
          <NativeSelect id="nu-role" value={role} onChange={e => setRole(e.target.value as RoleCode)} data-testid="nu-role">
            {roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="nu-scope" className={LABEL}>ขอบเขต</label>
          <NativeSelect id="nu-scope" value={scope} onChange={e => setScope(e.target.value)} data-testid="nu-scope">
            {scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </NativeSelect>
        </div>

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
                onChange={() => setMode('password')} data-testid="nu-mode-password"
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
              autoComplete="new-password" aria-describedby="nu-password-help" value={password}
              onChange={e => setPassword(e.target.value)} data-testid="nu-password"
            />
            <p className="aq-help" id="nu-password-help">อย่างน้อย 8 ตัวอักษร</p>
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
