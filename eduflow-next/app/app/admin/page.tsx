'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  auditToCsv, createUser, deleteUser, downloadBlob, getFaculties, getProgrammes, listAudit, listCycles,
  listUsers, resetDemo, setUserRoles,
} from '@/lib/api';
import type { AppUser, RoleAssignment, RoleCode } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { Async, AsyncButton, Badge, Empty, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import { ROLE_TH, canAny, errMsg, fmtDateTime } from '@/lib/ui/aunqa';

type Tab = 'users' | 'audit' | 'demo';
const ROLES = Object.keys(ROLE_TH) as RoleCode[];

/** S16 ผู้ดูแล: ผู้ใช้+บทบาท · audit log · รีเซ็ตข้อมูลเดโม่ */
export default function AdminPage() {
  const user = useMe();
  const [tab, setTab] = useState<Tab>('users');
  const canUsers = canAny(user, 'user.manage');
  const canAudit = canAny(user, 'audit.view');
  const active: Tab = tab === 'users' && !canUsers ? 'audit' : tab;

  if (!canUsers && !canAudit) {
    return <><PageHeader title="ผู้ดูแลระบบ" /><div className="auth-alert auth-alert-err" role="alert">คุณไม่มีสิทธิ์เข้าหน้านี้</div></>;
  }

  return (
    <>
      <PageHeader title="ผู้ดูแลระบบ" sub="จัดการผู้ใช้และบทบาท ตรวจ audit log (บันทึกถาวร แก้ไม่ได้)" />
      <div className="dash-tabs-bar" role="tablist">
        {canUsers && <button role="tab" aria-selected={active === 'users'} className={`dash-tab-btn${active === 'users' ? ' active' : ''}`} onClick={() => setTab('users')} data-testid="tab-users">ผู้ใช้และบทบาท</button>}
        {canAudit && <button role="tab" aria-selected={active === 'audit'} className={`dash-tab-btn${active === 'audit' ? ' active' : ''}`} onClick={() => setTab('audit')} data-testid="tab-audit">Audit log</button>}
        {canUsers && <button role="tab" aria-selected={active === 'demo'} className={`dash-tab-btn${active === 'demo' ? ' active' : ''}`} onClick={() => setTab('demo')} data-testid="tab-demo">ข้อมูลเดโม่</button>}
      </div>
      {active === 'users' && <UsersTab user={user} />}
      {active === 'audit' && <AuditTab user={user} />}
      {active === 'demo' && <DemoTab user={user} />}
    </>
  );
}

// ───────────────────────── ผู้ใช้ ─────────────────────────

function UsersTab({ user }: { user: AppUser }) {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const q = useLoad(() => ({
    users: listUsers(user.universityId),
    scopes: [
      { key: `university:${user.universityId}`, label: 'ทั้งมหาวิทยาลัย' },
      ...getFaculties(user.universityId).map(f => ({ key: `faculty:${f.id}`, label: `คณะ ${f.nameTh}` })),
      ...getProgrammes(user.universityId).map(p => ({ key: `programme:${p.id}`, label: `หลักสูตร ${p.code}` })),
      ...listCycles(user).map(c => ({ key: `cycle:${c.id}`, label: `รอบ ${c.academicYear} (${c.id})` })),
    ],
  }), [user.id]);

  const [adding, setAdding] = useState<Record<string, { role: RoleCode; scope: string }>>({});
  const [nu, setNu] = useState({ open: false, username: '', password: '', fullName: '', email: '', role: 'programme_staff' as RoleCode, scope: '' });

  const parse = (key: string): Pick<RoleAssignment, 'scopeType' | 'scopeId'> => {
    const i = key.indexOf(':');
    return { scopeType: key.slice(0, i) as RoleAssignment['scopeType'], scopeId: key.slice(i + 1) };
  };

  function act(fn: () => void, ok: string) {
    try { fn(); showToast(ok, 'success'); q.reload(); } catch (e) { showToast(errMsg(e), 'error'); }
  }

  return (
    <Async q={q}>{({ users, scopes }) => (
      <>
        <div className="aq-card">
          {!nu.open ? <button className="aq-btn aq-btn-primary" onClick={() => setNu({ ...nu, open: true, scope: scopes[0].key })} data-testid="user-new">+ เพิ่มผู้ใช้</button> : (
            <form className="aq-form-inline" data-testid="user-form" onSubmit={async e => {
              e.preventDefault();
              try {
                await createUser(user, { username: nu.username, password: nu.password, fullName: nu.fullName, email: nu.email, roles: [{ role: nu.role, ...parse(nu.scope || scopes[0].key) }] });
                showToast('เพิ่มผู้ใช้แล้ว', 'success'); setNu({ ...nu, open: false, username: '', password: '', fullName: '', email: '' }); q.reload();
              } catch (err) { showToast(errMsg(err), 'error'); }
            }}>
              <label>ชื่อผู้ใช้<input className="aq-input aq-input-sm" required value={nu.username} onChange={e => setNu({ ...nu, username: e.target.value })} data-testid="nu-username" /></label>
              <label>รหัสผ่าน<input className="aq-input aq-input-sm" type="password" required minLength={8} value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} data-testid="nu-password" /></label>
              <label>ชื่อ-สกุล<input className="aq-input aq-input-sm" required value={nu.fullName} onChange={e => setNu({ ...nu, fullName: e.target.value })} data-testid="nu-name" /></label>
              <label>อีเมล<input className="aq-input aq-input-sm" type="email" required value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} data-testid="nu-email" /></label>
              <label>บทบาท<select className="aq-input aq-input-sm" value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value as RoleCode })}>{ROLES.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}</select></label>
              <label>ขอบเขต<select className="aq-input aq-input-sm" value={nu.scope} onChange={e => setNu({ ...nu, scope: e.target.value })}>{scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
              <button className="aq-btn aq-btn-primary" data-testid="nu-submit">บันทึก</button>
              <button type="button" className="aq-btn" onClick={() => setNu({ ...nu, open: false })}>ยกเลิก</button>
            </form>
          )}
        </div>

        <div className="aq-card aq-table-wrap">
          <table className="aq-table" data-testid="users-table">
            <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>เพิ่มบทบาท</th><th /></tr></thead>
            <tbody>
              {users.map(u => {
                const a = adding[u.id] || { role: 'programme_staff' as RoleCode, scope: scopes[0].key };
                return (
                  <tr key={u.id} data-testid={`user-${u.username}`}>
                    <td><strong>{u.fullName}</strong><div className="aq-muted">{u.username} · {u.email}</div></td>
                    <td>
                      <div className="aq-chips">
                        {u.roles.map((r, i) => (
                          <Badge key={i} title={`${r.scopeType}:${r.scopeId}`}>
                            {ROLE_TH[r.role]} <span className="aq-muted">({scopes.find(s => s.key === `${r.scopeType}:${r.scopeId}`)?.label ?? r.scopeType})</span>{' '}
                            <button className="aq-x" aria-label={`ลบบทบาท ${ROLE_TH[r.role]}`} onClick={() => act(() => setUserRoles(user, u.id, u.roles.filter((_, j) => j !== i)), 'ถอนบทบาทแล้ว')}>✕</button>
                          </Badge>
                        ))}
                        {u.roles.length === 0 && <span className="aq-muted">ไม่มีบทบาท</span>}
                      </div>
                    </td>
                    <td>
                      <div className="aq-form-inline">
                        <select className="aq-input aq-input-sm" value={a.role} aria-label="บทบาท" onChange={e => setAdding({ ...adding, [u.id]: { ...a, role: e.target.value as RoleCode } })}>{ROLES.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}</select>
                        <select className="aq-input aq-input-sm" value={a.scope} aria-label="ขอบเขต" onChange={e => setAdding({ ...adding, [u.id]: { ...a, scope: e.target.value } })}>{scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
                        <button className="aq-btn aq-btn-sm" onClick={() => act(() => setUserRoles(user, u.id, [...u.roles, { role: a.role, ...parse(a.scope) }]), 'เพิ่มบทบาทแล้ว')}>เพิ่ม</button>
                      </div>
                    </td>
                    <td>
                      {u.id !== user.id && (
                        <button className="aq-btn aq-btn-sm aq-btn-danger" onClick={async () => {
                          if (await confirm({ title: 'ลบผู้ใช้', message: `ลบ ${u.fullName} ออกจากระบบ?`, variant: 'danger', confirmText: 'ลบ' })) act(() => deleteUser(user, u.id), 'ลบผู้ใช้แล้ว');
                        }}>ลบ</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}</Async>
  );
}

// ───────────────────────── audit ─────────────────────────

function AuditTab({ user }: { user: AppUser }) {
  const [filter, setFilter] = useState('');
  const q = useLoad(() => listAudit(user, { limit: 300 }), [user.id]);
  return (
    <Async q={q}>{rows => {
      const shown = rows.filter(r => !filter || `${r.action} ${r.actorName} ${r.targetType} ${r.targetId}`.toLowerCase().includes(filter.toLowerCase()));
      return (
        <>
          <div className="aq-toolbar">
            <input className="aq-input" type="search" placeholder="กรองตาม action / ผู้ทำ / เป้าหมาย" aria-label="กรอง audit" value={filter} onChange={e => setFilter(e.target.value)} data-testid="audit-filter" />
            <button className="aq-btn" data-testid="audit-csv" onClick={() => downloadBlob(new Blob(['﻿' + auditToCsv(shown)], { type: 'text/csv;charset=utf-8' }), 'audit-log.csv')}>ดาวน์โหลด CSV</button>
            <span className="aq-muted">{shown.length} จาก {rows.length} รายการล่าสุด</span>
          </div>
          {shown.length === 0 ? <Empty text="ไม่พบรายการ" /> : (
            <div className="aq-card aq-table-wrap">
              <table className="aq-table" data-testid="audit-table">
                <thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>เป้าหมาย</th></tr></thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.id}><td className="aq-nowrap">{fmtDateTime(r.at)}</td><td>{r.actorName}</td><td><code>{r.action}</code></td><td>{r.targetType}: {r.targetId}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    }}</Async>
  );
}

// ───────────────────────── demo ─────────────────────────

function DemoTab({ user }: { user: AppUser }) {
  const { confirm, notify } = useDialog();
  const { refresh } = useAuth();
  const router = useRouter();
  return (
    <div className="aq-card">
      <h2 className="aq-h2">รีเซ็ตข้อมูลเดโม่</h2>
      <p className="aq-muted">ล้างข้อมูลทั้งหมดของระบบนี้ (รอบ หลักฐาน SAR audit log) และสร้างข้อมูลสมมติใหม่ — ต้องเข้าสู่ระบบใหม่</p>
      <AsyncButton className="aq-btn aq-btn-danger" testId="reset-demo" onClick={async () => {
        const ok = await confirm({ title: 'รีเซ็ตข้อมูลเดโม่?', message: 'ข้อมูลที่แก้ไขทั้งหมดจะหาย และย้อนกลับไม่ได้', variant: 'danger', confirmText: 'รีเซ็ต' });
        if (!ok) return;
        try {
          await resetDemo(user);
          await notify({ title: 'รีเซ็ตเรียบร้อย', message: 'กรุณาเข้าสู่ระบบใหม่' });
          refresh();
          router.push('/login');
        } catch (e) { await notify({ title: 'รีเซ็ตไม่สำเร็จ', message: errMsg(e), variant: 'danger' }); }
      }}>รีเซ็ตข้อมูลเดโม่</AsyncButton>
    </div>
  );
}
