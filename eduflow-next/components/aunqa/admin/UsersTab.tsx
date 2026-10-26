'use client';

/**
 * แท็บ "ผู้ใช้และบทบาท" (friendly-spec §F8.1 · saas-spec §P18/C5)
 * - ตาราง `users-table`: ผู้ใช้ | สถานะ | บทบาท | เพิ่มบทบาท | การจัดการ — มือถือซ้อนเป็นการ์ด (§C5)
 * - รายชื่อจาก `listUsers` (active + invited + suspended; ไม่รวม pending — อยู่แท็บคำขอ, ADR-AUTH-001 A5)
 *   ตารางนี้ "แสดงทุกสถานะโดยเจตนา" (เป็นหน้าจัดการบัญชี ไม่ใช่รายการเลือกผู้ใช้) — สถานะบอกด้วย Badge
 * - การจัดการตามสถานะ: active → ระงับบัญชี · suspended → เปิดใช้อีกครั้ง · invited → สร้างลิงก์ใหม่ + ยกเลิกคำเชิญ
 *   ตัวเอง = ไม่มีปุ่ม · non-super ไม่เห็นปุ่มของบัญชี super_admin (backend = forbidden อยู่แล้ว)
 *   **ไม่มีปุ่มลบผู้ใช้** (ADR-AUTH-001 A8.2 — บัญชีที่เคยใช้งานให้ระงับแทน)
 * - ผลการเชิญ/ออกลิงก์ใหม่ แสดงใน `invite-result` เหนือตารางจนกว่าจะกดปิด
 */
import { useState } from 'react';
import type { AppUser, RoleCode } from '@/lib/types';
import { cancelInvitation, listCycles, listUsers, reissueInvitation, setUserRoles, setUserStatus, userStatus } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, useLoad } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { NativeSelect } from '@/components/ui/primitives/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/primitives/table';
import { ROLE_TH, errMsg } from '@/lib/ui/aunqa';
import { cn } from '@/lib/ui/cn';
import NewUserForm, { type NewUserDone } from './NewUserForm';
import InviteResult, { type InviteShown } from './InviteResult';
import { STACK, UserStatusBadge, grantableRoles, isSuperAdmin, parseScope, scopeKey, scopeOptions } from './shared';

type Row = Omit<AppUser, 'password'>;

export default function UsersTab({ user }: { user: AppUser }) {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const q = useLoad(() => ({
    users: listUsers(user.universityId),
    scopes: scopeOptions(user.universityId, listCycles(user)),
  }), [user.id]);

  const roles = grantableRoles(user);
  const superActor = isSuperAdmin(user);
  const [formOpen, setFormOpen] = useState(false);
  const [invite, setInvite] = useState<InviteShown | null>(null);
  const [adding, setAdding] = useState<Record<string, { role: RoleCode; scope: string }>>({});

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

  async function suspend(u: Row) {
    const ok = await confirm({
      title: 'ระงับบัญชี',
      message: `ระงับ ${u.fullName}? ผู้ใช้จะเข้าสู่ระบบไม่ได้ งานที่มอบหมายไว้ยังอยู่ และเปิดใช้อีกครั้งได้ภายหลัง`,
      variant: 'danger', confirmText: 'ยืนยันระงับ',
    });
    if (ok) act(() => setUserStatus(user, u.id, 'suspended'), 'ระงับบัญชีแล้ว');
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
      variant: 'danger', confirmText: 'ยืนยันยกเลิกคำเชิญ',
    });
    if (!ok) return;
    // review nit #7: ปิดกล่องลิงก์เฉพาะเมื่อยกเลิกสำเร็จ — ถ้าล้ม ลิงก์ยังใช้ได้ต้องไม่หายจากจอ
    if (act(() => cancelInvitation(user, u.id), 'ยกเลิกคำเชิญแล้ว') && invite?.userId === u.id) setInvite(null);
  }

  function manageButtons(u: Row) {
    if (u.id === user.id) return null;
    if (!superActor && u.roles.some(r => r.role === 'super_admin')) return null;
    const st = userStatus(u);
    if (st === 'active') {
      return (
        <AsyncButton variant="destructiveOutline" size="compact" testId={`user-suspend-${u.username}`} onClick={() => suspend(u)}>
          ระงับบัญชี
        </AsyncButton>
      );
    }
    if (st === 'suspended') {
      return (
        <AsyncButton variant="outline" size="compact" testId={`user-reactivate-${u.username}`}
          onClick={() => { act(() => setUserStatus(user, u.id, 'active'), 'เปิดใช้บัญชีแล้ว'); }}>
          เปิดใช้อีกครั้ง
        </AsyncButton>
      );
    }
    if (st === 'invited') {
      return (
        <div className="flex flex-wrap gap-2">
          <AsyncButton variant="outline" size="compact" testId={`user-reinvite-${u.username}`} busyText="กำลังสร้างลิงก์…" onClick={() => reissue(u)}>
            สร้างลิงก์ใหม่
          </AsyncButton>
          <AsyncButton variant="destructiveOutline" size="compact" testId={`user-cancel-invite-${u.username}`} onClick={() => cancelInvite(u)}>
            ยกเลิกคำเชิญ
          </AsyncButton>
        </div>
      );
    }
    return null;
  }

  return (
    <Async q={q} skeleton="table">{({ users, scopes }) => (
      <>
        {invite && <InviteResult invite={invite} onClose={() => setInvite(null)} />}

        {formOpen ? (
          <NewUserForm user={user} scopes={scopes} onDone={onFormDone} onCancel={() => setFormOpen(false)} />
        ) : (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button onClick={() => setFormOpen(true)} data-testid="user-new">
              <Icon name="user-plus" size={20} />เพิ่มผู้ใช้
            </Button>
          </div>
        )}

        <Table data-testid="users-table" className={STACK.table} wrapperClassName="rounded-xl shadow-sm dark:shadow-none">
          <TableHeader className={STACK.thead}>
            <tr>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>เพิ่มบทบาท</TableHead>
              <TableHead>การจัดการ</TableHead>
            </tr>
          </TableHeader>
          <TableBody className={STACK.tbody}>
            {users.map(u => {
              const a = adding[u.id] || { role: 'programme_staff' as RoleCode, scope: scopes[0].key };
              const self = u.id === user.id;
              return (
                <TableRow key={u.id} data-testid={`user-${u.username}`} className={STACK.tr}>
                  <TableCell data-label="ผู้ใช้" className={STACK.td}>
                    <div className="min-w-0">
                      <strong className="font-semibold text-foreground">{u.fullName}</strong>
                      <div className="aq-meta break-all">{`${u.username} · ${u.email}`}</div>
                    </div>
                  </TableCell>
                  <TableCell data-label="สถานะ" className={cn(STACK.td, 'whitespace-nowrap')}>
                    <UserStatusBadge status={userStatus(u)} testId={`user-status-${u.username}`} />
                  </TableCell>
                  <TableCell data-label="บทบาท" className={STACK.td}>
                    <ul className="flex list-none flex-wrap gap-2">
                      {u.roles.map((r, i) => (
                        <li key={i} className={cn('inline-flex items-center gap-1 rounded-md bg-muted pl-2.5 text-base text-foreground', self && 'py-1 pr-2.5')} title={scopeKey(r)}>
                          <span>
                            {ROLE_TH[r.role]}{' '}
                            <span className="aq-meta">{`(${scopes.find(s => s.key === scopeKey(r))?.label ?? r.scopeType})`}</span>
                          </span>
                          {!self && (
                            <button
                              type="button" aria-label={`ลบบทบาท ${ROLE_TH[r.role]}`}
                              className="aq-chip__remove inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent transition-colors duration-fast hover:bg-card"
                              onClick={() => act(() => setUserRoles(user, u.id, u.roles.filter((_, j) => j !== i)), 'ถอนบทบาทแล้ว')}
                            >
                              <Icon name="x" size={16} />
                            </button>
                          )}
                        </li>
                      ))}
                      {u.roles.length === 0 && <li className="text-muted-foreground">ไม่มีบทบาท</li>}
                    </ul>
                  </TableCell>
                  <TableCell data-label="เพิ่มบทบาท" className={STACK.td}>
                    {self ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex flex-col gap-2 lg:min-w-[22rem] xl:flex-row xl:items-center">
                        <NativeSelect
                          value={a.role} aria-label="บทบาท" wrapperClassName="xl:flex-1"
                          onChange={e => setAdding({ ...adding, [u.id]: { ...a, role: e.target.value as RoleCode } })}
                        >
                          {roles.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
                        </NativeSelect>
                        <NativeSelect
                          value={a.scope} aria-label="ขอบเขต" wrapperClassName="xl:flex-1"
                          onChange={e => setAdding({ ...adding, [u.id]: { ...a, scope: e.target.value } })}
                        >
                          {scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </NativeSelect>
                        <Button
                          variant="outline" size="compact" className="self-start xl:self-auto"
                          onClick={() => act(() => setUserRoles(user, u.id, [...u.roles, { role: a.role, ...parseScope(a.scope) }]), 'เพิ่มบทบาทแล้ว')}
                        >
                          <Icon name="plus" size={20} />เพิ่ม
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell data-label="การจัดการ" className={STACK.td}>
                    {manageButtons(u) ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </>
    )}</Async>
  );
}
