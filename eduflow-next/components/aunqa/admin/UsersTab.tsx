'use client';

/**
 * แท็บ "ผู้ใช้และบทบาท" (friendly-spec §F8.1 · saas-spec §P18/C5)
 * R2-F10 (ui M1 / playtest U7, P4, P5 · security ข-18) — ออกแบบใหม่ให้อ่านง่าย:
 * - ตาราง `users-table` เหลือ 4 คอลัมน์: ผู้ใช้ (ชื่อ + ชื่อผู้ใช้ + อีเมลบรรทัดเดียว truncate + title) | บทบาท (badge)
 *   | สถานะ | ปุ่ม "จัดการ" (`user-manage-{u}`, aria-expanded) — มือถือซ้อนเป็นการ์ดกระชับ (§C5)
 * - กด "จัดการ" เปิดแผงใต้แถว (`user-panel-{u}` อยู่ใน users-table) — เปิดได้ทีละแผง ทำรายการแล้วแผงยังเปิดอยู่:
 *   บทบาทปัจจุบัน + ปุ่ม × ถอน (aria-label "ลบบทบาท …", **ยืนยันก่อนถอน** P5) · เพิ่มบทบาท (ขอบเขตกรองตามบทบาท P2;
 *   บัญชีระงับเพิ่มไม่ได้ P5) · สถานะบัญชี: ระงับ / เปิดใช้อีกครั้ง (ยืนยัน + แจ้งเรื่องคำเชิญที่กลับมาใช้ได้ ข-18)
 *   / สร้างลิงก์ใหม่ + ยกเลิกคำเชิญ — testid เดิมทั้งหมด (`user-suspend-*`, `user-reactivate-*`, `user-reinvite-*`,
 *   `user-cancel-invite-*`) อยู่ในแผงนี้
 * - ตัวเอง / บัญชี super_admin (เมื่อผู้ใช้ไม่ใช่ super) = ไม่มีปุ่มจัดการ (P4 — backend forbidden อยู่แล้ว)
 * - ช่องค้นหา `users-search` (ชื่อ / ชื่อผู้ใช้ / อีเมล) — U7
 * - รายชื่อจาก `listUsers` (active + invited + suspended; ไม่รวม pending — อยู่แท็บคำขอ, ADR-AUTH-001 A5)
 * - **ไม่มีปุ่มลบผู้ใช้** (ADR-AUTH-001 A8.2 — บัญชีที่เคยใช้งานให้ระงับแทน)
 * - ผลการเชิญ/ออกลิงก์ใหม่ แสดงใน `invite-result` เหนือตารางจนกว่าจะกดปิด
 */
import { Fragment, useState } from 'react';
import type { AppUser, RoleCode } from '@/lib/types';
import { can, cancelInvitation, listCycles, listUsers, reissueInvitation, setUserRoles, setUserStatus, userStatus } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { Input } from '@/components/ui/primitives/input';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { ROLE_TH, errMsg } from '@/lib/ui/aunqa';
import { cn } from '@/lib/ui/cn';
import NewUserForm, { type NewUserDone } from './NewUserForm';
import InviteResult, { type InviteShown } from './InviteResult';
import ScopeSelect from './ScopeSelect';
import {
  LABEL, STACK, UserStatusBadge, grantableRoles, isSuperAdmin, parseScope, pickScope, scopeKey, scopeLabel, scopeOptions, scopesForRole,
  type ScopeOption,
} from './shared';

type Row = Omit<AppUser, 'password'>;

export default function UsersTab({ user }: { user: AppUser }) {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const q = useLoad(() => ({
    users: listUsers(user.universityId),
    scopes: scopeOptions(user.universityId, listCycles(user)),
  }), [user.id]);

  const superActor = isSuperAdmin(user);
  const [formOpen, setFormOpen] = useState(false);
  const [invite, setInvite] = useState<InviteShown | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /** คืน true เมื่อสำเร็จ — ผู้เรียกที่ต้องทำต่อหลังสำเร็จ (เช่น ปิดกล่องลิงก์) ใช้ค่านี้ */
  function act(fn: () => void, ok: string): boolean {
    try { fn(); showToast(ok, 'success'); q.reload(); return true; } catch (e) { showToast(errMsg(e), 'error'); return false; }
  }

  function onFormDone(r: NewUserDone) {
    setFormOpen(false);
    if (r.kind === 'invited') setInvite(r.invite);
    else showToast('เพิ่มผู้ใช้แล้ว', 'success');
    q.reload();
  }

  /** แก้ไขบัญชีนี้ได้ไหม — ตัวเองไม่ได้ · non-super แก้บัญชี super_admin ไม่ได้ (P4) */
  function canManage(u: Row): boolean {
    if (u.id === user.id) return false;
    return superActor || !u.roles.some(r => r.role === 'super_admin');
  }

  async function suspend(u: Row) {
    const ok = await confirm({
      title: 'ระงับบัญชี',
      message: `ระงับ ${u.fullName}? ผู้ใช้จะเข้าสู่ระบบไม่ได้ งานที่มอบหมายไว้ยังอยู่ และเปิดใช้อีกครั้งได้ภายหลัง`,
      variant: 'danger', confirmText: 'ยืนยันระงับ',
    });
    if (ok) act(() => setUserStatus(user, u.id, 'suspended'), 'ระงับบัญชีแล้ว');
  }

  /**
   * ข-18: เปิดใช้อีกครั้งทำให้คำเชิญที่ผู้ใช้นี้เคยออก (ยังไม่หมดอายุ) กลับมาใช้ได้ — บอกผู้ดูแลก่อนยืนยัน
   * U11 R2-F13: พูดถึงคำเชิญเฉพาะบัญชีที่มีสิทธิ์เชิญ (user.manage) — บัญชีอื่นออกคำเชิญไม่ได้อยู่แล้ว
   */
  async function reactivate(u: Row) {
    const canInvite = can(u as AppUser, 'user.manage', { universityId: u.universityId });
    const ok = await confirm({
      title: 'เปิดใช้บัญชีอีกครั้ง',
      message: canInvite
        ? `เปิดใช้บัญชี ${u.fullName} อีกครั้ง? ผู้ใช้จะเข้าสู่ระบบได้ตามบทบาทเดิม และคำเชิญที่บัญชีนี้เคยออกไว้ซึ่งยังไม่หมดอายุจะกลับมาใช้ได้ — ถ้าไม่ต้องการ ให้ยกเลิกคำเชิญนั้นในตารางนี้`
        : `เปิดใช้บัญชี ${u.fullName} อีกครั้ง? ผู้ใช้จะเข้าสู่ระบบได้ตามบทบาทเดิม`,
      confirmText: 'ยืนยันเปิดใช้',
    });
    if (ok) act(() => setUserStatus(user, u.id, 'active'), 'เปิดใช้บัญชีแล้ว');
  }

  async function reissue(u: Row) {
    try {
      const res = await reissueInvitation(user, u.id);
      setInvite({ userId: res.user.id, fullName: res.user.fullName, token: res.token, expiresAt: res.expiresAt });
      q.reload();
    } catch (e) { showToast(errMsg(e), 'error'); }
  }

  async function cancelInvite(u: Row) {
    const ok = await confirm({
      title: 'ยกเลิกคำเชิญ',
      message: `ยกเลิกคำเชิญของ ${u.fullName}? ลิงก์เดิมจะใช้ไม่ได้และรายชื่อนี้จะถูกลบ`,
      // U8: ปุ่มปิดไม่ใช้คำว่า "ยกเลิก" ซ้ำกับปุ่มยืนยัน — กดผิดฝั่งยาก
      variant: 'danger', confirmText: 'ยืนยันยกเลิกคำเชิญ', cancelText: 'เก็บคำเชิญไว้',
    });
    if (!ok) return;
    // review nit #7: ปิดกล่องลิงก์เฉพาะเมื่อยกเลิกสำเร็จ — ถ้าล้ม ลิงก์ยังใช้ได้ต้องไม่หายจากจอ
    if (act(() => cancelInvitation(user, u.id), 'ยกเลิกคำเชิญแล้ว')) {
      if (invite?.userId === u.id) setInvite(null);
      if (openId === u.id) setOpenId(null);
    }
  }

  /** P5: ถอนบทบาทต้องยืนยัน — บทบาทสุดท้ายเตือนว่าผู้ใช้จะใช้งานไม่ได้ */
  async function removeRole(u: Row, i: number, scopes: ScopeOption[]) {
    const r = u.roles[i];
    const last = u.roles.length === 1;
    const ok = await confirm({
      title: 'ถอนบทบาท',
      message: last
        ? `ถอนบทบาท ${ROLE_TH[r.role]} (${scopeLabel(r, scopes)}) จาก ${u.fullName}? นี่คือบทบาทสุดท้าย ผู้ใช้จะใช้งานระบบไม่ได้จนกว่าจะเพิ่มบทบาทใหม่`
        : `ถอนบทบาท ${ROLE_TH[r.role]} (${scopeLabel(r, scopes)}) จาก ${u.fullName}?`,
      variant: 'danger', confirmText: 'ยืนยันถอนบทบาท', cancelText: 'เก็บบทบาทไว้',
    });
    if (ok) act(() => setUserRoles(user, u.id, u.roles.filter((_, j) => j !== i)), 'ถอนบทบาทแล้ว');
  }

  function addRole(u: Row, role: RoleCode, scope: string): boolean {
    const grant = { role, ...parseScope(scope) };
    if (u.roles.some(r => r.role === grant.role && scopeKey(r) === scope)) {
      showToast('ผู้ใช้มีบทบาทนี้ในขอบเขตนี้อยู่แล้ว', 'info');
      return false;
    }
    return act(() => setUserRoles(user, u.id, [...u.roles, grant]), 'เพิ่มบทบาทแล้ว');
  }

  return (
    <Async q={q} skeleton="table">{({ users, scopes }) => {
      const needle = search.trim().toLowerCase();
      const rows = needle
        ? users.filter(u => [u.fullName, u.username, u.email].some(v => v.toLowerCase().includes(needle)))
        : users;
      return (
        <>
          {invite && <InviteResult invite={invite} onClose={() => setInvite(null)} />}

          {formOpen ? (
            <NewUserForm user={user} scopes={scopes} onDone={onFormDone} onCancel={() => setFormOpen(false)} />
          ) : (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Button onClick={() => setFormOpen(true)} data-testid="user-new" className="self-start whitespace-nowrap">
                <Icon name="user-plus" size={20} />เพิ่มผู้ใช้
              </Button>
              <div className="w-full space-y-1.5 sm:max-w-xs">
                <label htmlFor="users-search" className={LABEL}>ค้นหาผู้ใช้</label>
                <div className="relative">
                  <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="users-search" type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="ชื่อ ชื่อผู้ใช้ หรืออีเมล" className="pl-9" data-testid="users-search" autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}

          {needle && rows.length === 0 && (
            <p className="mb-4 text-base text-muted-foreground" role="status" data-testid="users-search-empty">
              ไม่พบผู้ใช้ที่ตรงกับคำค้น
            </p>
          )}

          <Table data-testid="users-table" className={STACK.table} wrapperClassName="rounded-xl shadow-sm dark:shadow-none">
            <TableHeader className={STACK.thead}>
              <tr>
                <TableHead className="min-w-[14rem]">ผู้ใช้</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-px whitespace-nowrap"><span className="sr-only">การจัดการ</span></TableHead>
              </tr>
            </TableHeader>
            <TableBody className={STACK.tbody}>
              {rows.map(u => {
                const open = openId === u.id;
                const manageable = canManage(u);
                const panelId = `user-panel-${u.username}`;
                return (
                  <Fragment key={u.id}>
                  <TableRow data-testid={`user-${u.username}`} className={cn(STACK.tr, open && 'bg-muted/50')}>
                    <TableCell data-label="ผู้ใช้" className={STACK.td}>
                      <div className="min-w-0 md:max-w-[20rem]">
                        <strong className="block font-semibold text-foreground">{u.fullName}</strong>
                        <div className="aq-meta truncate" title={u.username}><code className="font-mono">{u.username}</code></div>
                        <div className="aq-meta truncate" title={u.email}>{u.email}</div>
                      </div>
                    </TableCell>
                    <TableCell data-label="บทบาท" className={STACK.td}>
                      {u.roles.length === 0 ? (
                        <span className="text-muted-foreground">ไม่มีบทบาท</span>
                      ) : (
                        <ul className="flex list-none flex-wrap gap-1.5">
                          {u.roles.map((r, i) => (
                            <li key={i}>
                              <Badge tone="neutral" icon={false} title={scopeLabel(r, scopes)}>{ROLE_TH[r.role]}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell data-label="สถานะ" className={cn(STACK.td, 'whitespace-nowrap')}>
                      <UserStatusBadge status={userStatus(u)} testId={`user-status-${u.username}`} />
                    </TableCell>
                    <TableCell className={cn(STACK.td, 'whitespace-nowrap max-md:before:hidden max-md:pt-2 md:text-right')}>
                      {manageable ? (
                        <Button
                          variant={open ? 'default' : 'outline'} size="compact" className="whitespace-nowrap"
                          aria-expanded={open} aria-controls={open ? panelId : undefined} data-testid={`user-manage-${u.username}`}
                          onClick={() => setOpenId(open ? null : u.id)}
                        >
                          จัดการ<Icon name="chevron-down" size={16} className={cn('transition-transform duration-fast', open && 'rotate-180')} />
                        </Button>
                      ) : (
                        <span className="aq-meta">{u.id === user.id ? 'บัญชีของคุณ' : '—'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {open && manageable && (
                    <TableRow className={cn(STACK.tr, 'bg-muted/50 hover:bg-muted/50')}>
                      <TableCell colSpan={4} className="max-md:block max-md:px-0 max-md:py-1">
                        <ManagePanel
                          id={panelId} actor={user} target={u} scopes={scopes}
                          onRemoveRole={i => removeRole(u, i, scopes)} onAddRole={(r, s) => addRole(u, r, s)}
                          onSuspend={() => suspend(u)} onReactivate={() => reactivate(u)}
                          onReissue={() => reissue(u)} onCancelInvite={() => cancelInvite(u)}
                          onClose={() => {
                            setOpenId(null);
                            requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="user-manage-${u.username}"]`)?.focus());
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </>
      );
    }}</Async>
  );
}

const SECTION_H = 'text-base font-semibold text-foreground';

/** แผงจัดการผู้ใช้หนึ่งคน (เปิดจากปุ่ม "จัดการ") — 3 ส่วน: บทบาทปัจจุบัน · เพิ่มบทบาท · สถานะบัญชี */
function ManagePanel({ id, actor, target: u, scopes, onRemoveRole, onAddRole, onSuspend, onReactivate, onReissue, onCancelInvite, onClose }: {
  id: string; actor: AppUser; target: Row; scopes: ScopeOption[];
  onRemoveRole: (i: number) => Promise<void>; onAddRole: (role: RoleCode, scope: string) => boolean;
  onSuspend: () => Promise<void>; onReactivate: () => Promise<void>; onReissue: () => Promise<void>; onCancelInvite: () => Promise<void>;
  onClose: () => void;
}) {
  const roles = grantableRoles(actor);
  const st = userStatus(u);
  const [role, setRole] = useState<RoleCode>('programme_staff');
  const [scope, setScope] = useState(() => pickScope(scopesForRole(scopes, 'programme_staff'), ''));
  const [scopeErr, setScopeErr] = useState('');

  function changeRole(r: RoleCode) {
    setRole(r);
    setScope(s => pickScope(scopesForRole(scopes, r), s));
    setScopeErr('');
  }

  function submitAdd() {
    if (!scope) { setScopeErr('กรุณาเลือกขอบเขต'); return; }
    onAddRole(role, scope);
  }

  return (
    <section
      id={id} data-testid={id} aria-label={`จัดการบัญชี ${u.fullName}`}
      className="animate-fade-in space-y-6 rounded-lg border bg-card p-4 md:p-5"
    >
      <div className="space-y-2">
        <h3 className={SECTION_H}>บทบาทปัจจุบัน</h3>
        {u.roles.length === 0 ? (
          <p className="text-muted-foreground">ไม่มีบทบาท</p>
        ) : (
          <ul className="grid list-none gap-2">
            {u.roles.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-muted py-1 pl-3 pr-1">
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{ROLE_TH[r.role]}</span>{' '}
                  <span className="aq-meta">{`(${scopeLabel(r, scopes)})`}</span>
                </span>
                <Button
                  variant="ghost" size="icon" aria-label={`ลบบทบาท ${ROLE_TH[r.role]}`} title={`ลบบทบาท ${ROLE_TH[r.role]}`}
                  className="shrink-0" onClick={() => { void onRemoveRole(i); }}
                >
                  <Icon name="x" size={20} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className={SECTION_H}>เพิ่มบทบาท</h3>
        {st === 'suspended' ? (
          <p className="text-muted-foreground" data-testid={`user-add-blocked-${u.username}`}>เปิดใช้บัญชีก่อน จึงจะเพิ่มบทบาทได้</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
            <div className="space-y-1.5">
              <label htmlFor={`${id}-role`} className={LABEL}>บทบาท</label>
              <NativeSelect
                id={`${id}-role`} value={role} onChange={e => changeRole(e.target.value as RoleCode)}
                data-testid={`user-add-role-${u.username}`}
              >
                {roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
              </NativeSelect>
            </div>
            <ScopeSelect
              id={`${id}-scope`} role={role} scopes={scopes} value={scope}
              onChange={v => { setScope(v); setScopeErr(''); }} testId={`user-add-scope-${u.username}`} error={scopeErr}
            />
            <Button
              variant="outline" className="self-start whitespace-nowrap md:mt-8" onClick={submitAdd}
              data-testid={`user-add-submit-${u.username}`} disabled={scopesForRole(scopes, role).length === 0}
            >
              <Icon name="plus" size={20} />เพิ่มบทบาท
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className={SECTION_H}>สถานะบัญชี</h3>
        <div className="flex flex-wrap items-center gap-4">
          <UserStatusBadge status={st} />
          {st === 'active' && (
            <AsyncButton variant="destructiveOutline" size="compact" className="whitespace-nowrap" testId={`user-suspend-${u.username}`} onClick={onSuspend}>
              ระงับบัญชี
            </AsyncButton>
          )}
          {st === 'suspended' && (
            <AsyncButton variant="outline" size="compact" className="whitespace-nowrap" testId={`user-reactivate-${u.username}`} onClick={onReactivate}>
              เปิดใช้อีกครั้ง
            </AsyncButton>
          )}
          {st === 'invited' && (
            <>
              <AsyncButton variant="outline" size="compact" className="whitespace-nowrap" testId={`user-reinvite-${u.username}`} busyText="กำลังสร้างลิงก์…" onClick={onReissue}>
                สร้างลิงก์ใหม่
              </AsyncButton>
              <AsyncButton variant="destructiveOutline" size="compact" className="whitespace-nowrap" testId={`user-cancel-invite-${u.username}`} onClick={onCancelInvite}>
                ยกเลิกคำเชิญ
              </AsyncButton>
            </>
          )}
        </div>
        {st === 'active' && <p className="aq-help">ระงับแล้วผู้ใช้เข้าสู่ระบบไม่ได้ งานที่มอบหมายไว้ยังอยู่ เปิดใช้อีกครั้งได้ภายหลัง</p>}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button variant="ghost" size="compact" className="whitespace-nowrap" onClick={onClose} data-testid={`user-panel-close-${u.username}`}>
          ปิดแผงจัดการ
        </Button>
      </div>
    </section>
  );
}
