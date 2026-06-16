'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROLE_LABELS, PERMISSION_LABELS } from '@/lib/mock-data';
import { getAllUsers, deleteUserById, getAllPermissions, updatePermission, getAdminLog, getSystemStats } from '@/lib/api/admin.api';
import type { User, Permissions } from '@/lib/types';

type DashTab = 'users' | 'perms' | 'log';

export default function DashboardLayout() {
  const { session, logout } = useAuth();
  const { showToast }       = useToast();
  const router              = useRouter();

  const [users,  setUsers]  = useState<User[]>([]);
  const [perms,  setPerms]  = useState<Permissions | null>(null);
  const [log,    setLog]    = useState<{ admins: { username:string; name:string; addedAt:string; addedBy:string }[]; loginHistory: { username:string; timestamp:string; action:string }[] } | null>(null);
  const [stats,  setStats]  = useState<{ totalUsers: number; totalSchools: number; adminLoginCount: number; adminCount: number } | null>(null);
  const [tab,    setTab]    = useState<DashTab>('users');

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    if (session.role === 'student') { router.push('/student'); return; }
    if (session.role === 'teacher') { router.push('/teacher'); return; }
    loadData();
  }, [session]);

  async function loadData() {
    const [u, p, l, s] = await Promise.all([
      getAllUsers(), getAllPermissions(), getAdminLog(), getSystemStats(),
    ]);
    setUsers(u); setPerms(p); setLog(l); setStats(s);
  }

  function handleLogout() { logout(); showToast('ออกจากระบบแล้ว'); router.push('/'); }

  async function handleDelete(username: string) {
    if (!confirm(`ยืนยันการลบบัญชี "${username}"?`)) return;
    await deleteUserById(username);
    showToast(`ลบบัญชี ${username} แล้ว`);
    loadData();
  }

  async function handlePermToggle(role: string, perm: string, val: boolean) {
    await updatePermission(role, perm, val);
    showToast(`อัปเดตสิทธิ์ ${PERMISSION_LABELS[role]?.[perm] || perm} → ${val ? 'เปิด' : 'ปิด'}`);
    loadData();
  }

  if (!session) return null;

  const initials = session.name.replace(/\s+/g, '').substring(0, 2);

  return (
    <div>
      {/* Nav */}
      <nav className="dash-nav">
        <div className="dash-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>
        <div className="dash-user-info">
          <div className="dash-user-avatar">{initials}</div>
          <div>
            <div className="dash-user-name">{session.name}</div>
            <div className="dash-user-role">{ROLE_LABELS[session.role] || session.role}</div>
          </div>
        </div>
        <button className="dash-logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      {/* Content */}
      <div className="dash-content">
        {session.role === 'web_admin' && stats && (
          <>
            <div className="dash-section">
              <div className="section-label">Web Admin · ระดับสูงสุด</div>
              <h2 className="dash-h2">ภาพรวม<em>ระบบทั้งหมด</em></h2>
              <div className="dash-kpi-row">
                {[
                  { num: stats.totalUsers,       label: 'บัญชีผู้ใช้' },
                  { num: stats.totalSchools,     label: 'โรงเรียน' },
                  { num: stats.adminLoginCount,  label: 'เข้าระบบ (Admin)' },
                  { num: stats.adminCount,       label: 'Web Admins' },
                ].map((k, i) => (
                  <div key={i} className="dash-kpi">
                    <div className="dash-kpi-num">{k.num}</div>
                    <div className="dash-kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-section">
              <div className="dash-tabs-bar">
                {([['users','จัดการผู้ใช้'], ['perms','สิทธิ์การเข้าถึง'], ['log','Web Admin Log']] as [DashTab, string][]).map(([id, label]) => (
                  <button key={id} className={`dash-tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
                ))}
              </div>

              {tab === 'users' && (
                <div className="dash-list">
                  <div className="admin-list-header">
                    <span>บัญชีผู้ใช้ทั้งหมด ({users.length})</span>
                    <span className="admin-list-hint">* web_admin ไม่สามารถลบได้</span>
                  </div>
                  {users.map(u => (
                    <div key={u.username} className="admin-user-row">
                      <span className={`admin-role-pill role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                      <span className="admin-uname">{u.username}</span>
                      <span className="admin-uname-full">{u.name}</span>
                      {u.role !== 'web_admin'
                        ? <button className="admin-del-btn" onClick={() => handleDelete(u.username)}>ลบ</button>
                        : <span className="admin-protected">🔒</span>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'perms' && perms && (
                <div className="perm-grid">
                  {(['teacher','student','parent','school_admin'] as const).map(role => {
                    const rp = perms[role] || {};
                    const rl = PERMISSION_LABELS[role] || {};
                    const names: Record<string, string> = { teacher: 'ครู', student: 'นักเรียน', parent: 'ผู้ปกครอง', school_admin: 'Admin โรงเรียน' };
                    return (
                      <div key={role} className="perm-group">
                        <div className="perm-group-title">{names[role]}</div>
                        {Object.keys(rp).map(perm => (
                          <label key={perm} className="perm-row">
                            <input
                              type="checkbox"
                              checked={(rp as Record<string,boolean>)[perm]}
                              onChange={e => handlePermToggle(role, perm, e.target.checked)}
                            />
                            <span>{rl[perm] || perm}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'log' && log && (
                <div className="log-wrap">
                  <div className="log-section">
                    <div className="log-section-title">Web Admins ที่มีในระบบ</div>
                    {log.admins.map((a, i) => (
                      <div key={i} className="log-row">
                        <span className="log-badge">Admin</span>
                        <strong>{a.username}</strong> ({a.name}) — เพิ่มโดย {a.addedBy} เมื่อ {a.addedAt}
                      </div>
                    ))}
                  </div>
                  <div className="log-section">
                    <div className="log-section-title">ประวัติการเข้าสู่ระบบ (20 รายการล่าสุด)</div>
                    {log.loginHistory.length === 0
                      ? <div className="log-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</div>
                      : [...log.loginHistory].reverse().slice(0, 20).map((h, i) => (
                          <div key={i} className="log-row">
                            <span className="log-badge log-badge-login">LOGIN</span>
                            {h.username} — {h.timestamp}
                          </div>
                        ))}
                  </div>
                  <div className="log-note">* เพิ่ม Web Admin ใหม่ต้องแก้ไขที่ SEEDED_USERS ใน mock-data/index.ts</div>
                </div>
              )}
            </div>
          </>
        )}

        {session.role === 'school_admin' && <SchoolAdminContent name={session.name} school={session.school} showToast={showToast} />}
        {session.role === 'parent' && <ParentContent name={session.name} childName={session.childName} showToast={showToast} />}
      </div>
    </div>
  );
}

function SchoolAdminContent({ name, school, showToast }: { name: string; school: string; showToast: (m:string)=>void }) {
  return (
    <>
      <div className="dash-section">
        <div className="section-label">Admin โรงเรียน</div>
        <h2 className="dash-h2"><em>{school || 'โรงเรียนของคุณ'}</em></h2>
        <div className="dash-kpi-row">
          {[{ num: 42, label: 'ครู' }, { num: '1,240', label: 'นักเรียน' }, { num: '71%', label: 'มาทันวันนี้' }, { num: '8%', label: 'ขาดเรียน' }].map((k, i) => (
            <div key={i} className="dash-kpi">
              <div className="dash-kpi-num">{k.num}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-title">สรุปการเข้าเรียนวันนี้</div>
        <div className="dash-attendance-bars">
          {[['มาทัน','#5C8A5C',71], ['มาสาย','#C4804A',21], ['ขาดเรียน','#A05050',8]].map(([l,c,v], i) => (
            <div key={i} className="dash-bar-row">
              <span className="dash-bar-label">{l}</span>
              <div className="dash-bar-track"><div className="dash-bar-fill" style={{ width: `${v}%`, background: c as string }} /></div>
              <span className="dash-bar-val" style={{ color: c as string }}>{v}%</span>
            </div>
          ))}
        </div>
        <div className="dash-actions-row">
          <button className="dash-action-btn" onClick={() => showToast('กำลังสร้างรายงาน...')}>📊 Export รายงาน</button>
          <button className="dash-action-btn" onClick={() => showToast('กำลังส่งแจ้งเตือน...')}>📩 แจ้งผู้ปกครอง</button>
        </div>
      </div>
    </>
  );
}

function ParentContent({ name, childName, showToast }: { name: string; childName: string; showToast: (m:string)=>void }) {
  return (
    <>
      <div className="dash-section">
        <div className="section-label">ผู้ปกครอง</div>
        <h2 className="dash-h2">สถานะบุตรหลาน<em>{childName || 'ของคุณ'}</em></h2>
        <div className="dash-kpi-row">
          {[{ num: 'มาทัน', label: 'สถานะวันนี้ (08:02)', color: '#5C8A5C' }, { num: '80%', label: 'มาทันเดือนนี้' }, { num: '2', label: 'ขาดเรียนเดือนนี้' }].map((k, i) => (
            <div key={i} className="dash-kpi">
              <div className="dash-kpi-num" style={k.color ? { color: k.color } : {}}>{k.num}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-section">
        <div className="dash-section-title">แจ้งเตือนล่าสุด</div>
        <div className="dash-notif-list">
          <div className="dash-notif dash-notif-ok">🟢 วันนี้ {childName || 'บุตรหลาน'} มาโรงเรียนทัน เวลา 08:02 น.</div>
          <div className="dash-notif dash-notif-late">🟡 เมื่อวาน มาสาย 12 นาที — คาบ 1 วิทย์ฯ</div>
          <div className="dash-notif">📩 รายงานประจำเดือน พ.ค. 2567 พร้อมให้ดาวน์โหลด</div>
        </div>
        <div className="dash-actions-row">
          <button className="dash-action-btn" onClick={() => showToast('กำลังโหลดรายงาน...')}>📋 ดูรายงานทั้งหมด</button>
          <button className="dash-action-btn" onClick={() => showToast('กำลังติดต่อครู...')}>💬 ติดต่อครู</button>
        </div>
      </div>
    </>
  );
}
