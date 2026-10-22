'use client';

/**
 * ผู้ดูแลระบบ (ADR-UI-001 pages.md P18): ผู้ใช้+บทบาท · audit log · รีเซ็ตข้อมูลเดโม่
 * tabs C5 · ตารางผู้ใช้ stack บนมือถือ · ฟอร์มเพิ่มผู้ใช้ 2 คอลัมน์ (≥480) · ไม่มีสิทธิ์ = Empty icon lock
 * คง testid: tab-users/audit/demo, user-new, user-form, nu-*, user-{username} · label "บทบาท"/"ขอบเขต" (E2E getByLabel)
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
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
import Icon from '@/components/ui/Icon';
import { ROLE_TH, canAny, errMsg, fmtDateTime } from '@/lib/ui/aunqa';

type Tab = 'users' | 'audit' | 'demo';
const ROLES = Object.keys(ROLE_TH) as RoleCode[];

export default function AdminPage() {
  const user = useMe();
  const [tab, setTab] = useState<Tab>('users');
  const canUsers = canAny(user, 'user.manage');
  const canAudit = canAny(user, 'audit.view');
  const active: Tab = tab === 'users' && !canUsers ? 'audit' : tab;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!canUsers && !canAudit) {
    return (
      <>
        <PageHeader title="ผู้ดูแลระบบ" />
        <Empty icon="lock" title="คุณไม่มีสิทธิ์เข้าหน้านี้" text="หน้านี้สำหรับผู้ดูแลมหาวิทยาลัยและผู้ที่ดู audit log ได้"
          action={<Link className="aq-btn aq-btn-primary" href="/app">กลับหน้าหลัก</Link>} />
      </>
    );
  }

  const tabs: { k: Tab; label: string; show: boolean; testId: string }[] = [
    { k: 'users', label: 'ผู้ใช้และบทบาท', show: canUsers, testId: 'tab-users' },
    { k: 'audit', label: 'Audit log', show: canAudit, testId: 'tab-audit' },
    { k: 'demo', label: 'ข้อมูลเดโม่', show: canUsers, testId: 'tab-demo' },
  ];
  const shown = tabs.filter(t => t.show);
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = shown.findIndex(t => t.k === active);
    const n = e.key === 'ArrowRight' ? (i + 1) % shown.length : e.key === 'ArrowLeft' ? (i - 1 + shown.length) % shown.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? shown.length - 1 : -1;
    if (n < 0) return;
    e.preventDefault(); setTab(shown[n].k); tabRefs.current[n]?.focus();
  }

  return (
    <>
      <PageHeader title="ผู้ดูแลระบบ" sub="จัดการผู้ใช้และบทบาท ตรวจ audit log (บันทึกถาวร แก้ไม่ได้)" />
      <div className="aq-tabs" role="tablist" aria-label="ส่วนของผู้ดูแลระบบ" onKeyDown={onKey}>
        {shown.map((t, i) => (
          <button key={t.k} ref={el => { tabRefs.current[i] = el; }} type="button" role="tab" id={`admin-tab-${t.k}`}
            aria-selected={active === t.k} aria-controls={`admin-panel-${t.k}`} tabIndex={active === t.k ? 0 : -1}
            onClick={() => setTab(t.k)} data-testid={t.testId}>{t.label}</button>
        ))}
      </div>
      <div id={`admin-panel-${active}`} role="tabpanel" aria-labelledby={`admin-tab-${active}`} className="aq-tabpanel">
        {active === 'users' && <UsersTab user={user} />}
        {active === 'audit' && <AuditTab user={user} />}
        {active === 'demo' && <DemoTab user={user} />}
      </div>
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
    <Async q={q} skeleton="table">{({ users, scopes }) => (
      <>
        {!nu.open ? (
          <div className="aq-actions aq-mb-4">
            <button type="button" className="aq-btn aq-btn-primary" onClick={() => setNu({ ...nu, open: true, scope: scopes[0].key })} data-testid="user-new">
              <Icon name="plus" size={20} />เพิ่มผู้ใช้
            </button>
          </div>
        ) : (
          <form className="aq-card aq-form-grid" data-testid="user-form" onSubmit={async e => {
            e.preventDefault();
            try {
              await createUser(user, { username: nu.username, password: nu.password, fullName: nu.fullName, email: nu.email, roles: [{ role: nu.role, ...parse(nu.scope || scopes[0].key) }] });
              showToast('เพิ่มผู้ใช้แล้ว', 'success'); setNu({ ...nu, open: false, username: '', password: '', fullName: '', email: '' }); q.reload();
            } catch (err) { showToast(errMsg(err), 'error'); }
          }}>
            <h2 className="aq-h3 aq-span-all">เพิ่มผู้ใช้</h2>
            <div className="aq-field"><label htmlFor="nu-username">ชื่อผู้ใช้ *</label>
              <input id="nu-username" className="aq-input" required autoCapitalize="none" autoCorrect="off" spellCheck={false} value={nu.username} onChange={e => setNu({ ...nu, username: e.target.value })} data-testid="nu-username" /></div>
            <div className="aq-field"><label htmlFor="nu-password">รหัสผ่าน *</label>
              <p className="aq-help">อย่างน้อย 8 ตัวอักษร</p>
              <input id="nu-password" className="aq-input" type="password" required minLength={8} value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} data-testid="nu-password" /></div>
            <div className="aq-field"><label htmlFor="nu-name">ชื่อ-สกุล *</label>
              <input id="nu-name" className="aq-input" required value={nu.fullName} onChange={e => setNu({ ...nu, fullName: e.target.value })} data-testid="nu-name" /></div>
            <div className="aq-field"><label htmlFor="nu-email">อีเมล *</label>
              <input id="nu-email" className="aq-input" type="email" required value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} data-testid="nu-email" /></div>
            <div className="aq-field"><label htmlFor="nu-role">บทบาท</label>
              <select id="nu-role" className="aq-input" value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value as RoleCode })}>{ROLES.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}</select></div>
            <div className="aq-field"><label htmlFor="nu-scope">ขอบเขต</label>
              <select id="nu-scope" className="aq-input" value={nu.scope} onChange={e => setNu({ ...nu, scope: e.target.value })}>{scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
            <div className="aq-actions aq-span-all">
              <button className="aq-btn aq-btn-primary" data-testid="nu-submit">บันทึก</button>
              <button type="button" className="aq-btn aq-btn-ghost" onClick={() => setNu({ ...nu, open: false })}>ยกเลิก</button>
            </div>
          </form>
        )}

        <div className="aq-card">
          <div className="aq-table-wrap">
            <table className="aq-table aq-table--stack" data-testid="users-table">
              <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>เพิ่มบทบาท</th><th><span className="aq-sr-only">การกระทำ</span></th></tr></thead>
              <tbody>
                {users.map(u => {
                  const a = adding[u.id] || { role: 'programme_staff' as RoleCode, scope: scopes[0].key };
                  return (
                    <tr key={u.id} data-testid={`user-${u.username}`}>
                      <td data-label="ผู้ใช้"><div><strong>{u.fullName}</strong><div className="aq-meta">{u.username} · {u.email}</div></div></td>
                      <td data-label="บทบาท">
                        <ul className="aq-chips">
                          {u.roles.map((r, i) => (
                            <li key={i} className="aq-chip" title={`${r.scopeType}:${r.scopeId}`}>
                              {ROLE_TH[r.role]} <span className="aq-meta">({scopes.find(s => s.key === `${r.scopeType}:${r.scopeId}`)?.label ?? r.scopeType})</span>
                              <button type="button" className="aq-chip__remove" aria-label={`ลบบทบาท ${ROLE_TH[r.role]}`}
                                onClick={() => act(() => setUserRoles(user, u.id, u.roles.filter((_, j) => j !== i)), 'ถอนบทบาทแล้ว')}>
                                <Icon name="x" size={16} />
                              </button>
                            </li>
                          ))}
                          {u.roles.length === 0 && <li className="aq-muted">ไม่มีบทบาท</li>}
                        </ul>
                      </td>
                      <td data-label="เพิ่มบทบาท">
                        <div className="aq-form-inline">
                          <select className="aq-input aq-input-sm" value={a.role} aria-label="บทบาท" onChange={e => setAdding({ ...adding, [u.id]: { ...a, role: e.target.value as RoleCode } })}>{ROLES.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}</select>
                          <select className="aq-input aq-input-sm" value={a.scope} aria-label="ขอบเขต" onChange={e => setAdding({ ...adding, [u.id]: { ...a, scope: e.target.value } })}>{scopes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
                          <button type="button" className="aq-btn aq-btn-compact" onClick={() => act(() => setUserRoles(user, u.id, [...u.roles, { role: a.role, ...parse(a.scope) }]), 'เพิ่มบทบาทแล้ว')}>
                            <Icon name="plus" size={20} />เพิ่ม
                          </button>
                        </div>
                      </td>
                      <td>
                        {u.id !== user.id && (
                          <button type="button" className="aq-btn aq-btn-compact aq-btn-danger" onClick={async () => {
                            if (await confirm({ title: 'ลบผู้ใช้', message: `ลบ ${u.fullName} ออกจากระบบ?`, variant: 'danger', confirmText: 'ยืนยันลบ' })) act(() => deleteUser(user, u.id), 'ลบผู้ใช้แล้ว');
                          }}><Icon name="trash" size={20} />ลบ</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    <Async q={q} skeleton="table">{rows => {
      const shown = rows.filter(r => !filter || `${r.action} ${r.actorName} ${r.targetType} ${r.targetId}`.toLowerCase().includes(filter.toLowerCase()));
      return (
        <>
          <div className="aq-toolbar">
            <input className="aq-input" type="search" placeholder="กรองตาม action / ผู้ทำ / เป้าหมาย" aria-label="กรอง audit" value={filter} onChange={e => setFilter(e.target.value)} data-testid="audit-filter" />
            <button type="button" className="aq-btn" data-testid="audit-csv" onClick={() => downloadBlob(new Blob(['﻿' + auditToCsv(shown)], { type: 'text/csv;charset=utf-8' }), 'audit-log.csv')}>
              <Icon name="download" size={20} />ดาวน์โหลด CSV
            </button>
            <span className="aq-meta">{`${shown.length} จาก ${rows.length} รายการล่าสุด`}</span>
          </div>
          {shown.length === 0 ? <Empty icon="search" title="ไม่พบรายการ" /> : (
            <div className="aq-card">
              <div className="aq-table-wrap">
                <table className="aq-table aq-table--stack" data-testid="audit-table">
                  <thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>เป้าหมาย</th></tr></thead>
                  <tbody>
                    {shown.map(r => (
                      <tr key={r.id}>
                        <td data-label="เวลา">{fmtDateTime(r.at)}</td>
                        <td data-label="ผู้ทำ">{r.actorName}</td>
                        <td data-label="การกระทำ"><code className="aq-code">{r.action}</code></td>
                        <td data-label="เป้าหมาย">{r.targetType}: {r.targetId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
    <section className="aq-card" aria-labelledby="demo-h">
      <h2 id="demo-h" className="aq-h3">รีเซ็ตข้อมูลเดโม่</h2>
      <p className="aq-muted">ล้างข้อมูลทั้งหมดของระบบนี้ (รอบ หลักฐาน SAR audit log) และสร้างข้อมูลสมมติใหม่ — ต้องเข้าสู่ระบบใหม่</p>
      <AsyncButton className="aq-btn aq-btn-danger aq-mt-4" testId="reset-demo" busyText="กำลังรีเซ็ต…" onClick={async () => {
        const ok = await confirm({
          title: 'รีเซ็ตข้อมูลเดโม่?', message: 'ข้อมูลที่แก้ไขทั้งหมดจะหาย และย้อนกลับไม่ได้', variant: 'danger',
          confirmText: 'ยืนยันล้างและสร้างข้อมูลเดโม่ใหม่',
        });
        if (!ok) return;
        try {
          await resetDemo(user);
          await notify({ title: 'รีเซ็ตเรียบร้อย', message: 'กรุณาเข้าสู่ระบบใหม่' });
          refresh();
          router.push('/login');
        } catch (e) { await notify({ title: 'รีเซ็ตไม่สำเร็จ', message: errMsg(e), variant: 'danger' }); }
      }}><Icon name="trash" size={20} />รีเซ็ตข้อมูลเดโม่</AsyncButton>
    </section>
  );
}
