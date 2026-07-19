'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ROLE_LABELS, PEOPLE_DIRECTORY } from '@/lib/mock-data';
import { getAllUsers, addUserAccount, deleteUserById } from '@/lib/api/admin.api';
import { useToast } from '@/context/ToastContext';
import type { User, Role } from '@/lib/types';

type ManagedRole = 'teacher' | 'student' | 'parent' | 'school_admin';

const ROLE_CARDS: { role: ManagedRole; icon: string; desc: string }[] = [
  { role: 'teacher',      icon: '🧑‍🏫', desc: 'เพิ่มครูจากทำเนียบบุคลากร หรือค้นหาด้วยชื่อ/รหัสครู' },
  { role: 'student',      icon: '🎓',   desc: 'เพิ่มนักเรียนจากทะเบียนห้องเรียน หรือค้นหาด้วยชื่อ/รหัสนักเรียน' },
  { role: 'parent',       icon: '👨‍👩‍👧', desc: 'เพิ่มผู้ปกครองโดยผูกกับนักเรียนในระบบ' },
  { role: 'school_admin', icon: '🏫',   desc: 'เพิ่มผู้ดูแลระดับโรงเรียน (จำกัดเฉพาะบุคลากรที่ได้รับมอบหมาย)' },
];

const DEFAULT_PASSWORD = 'Eduflow1';

/**
 * จัดการผู้ใช้แบบแยกประเภท: เลือก role → จัดการรายชื่อของ role นั้น
 * เพิ่มรายชื่อ: dropdown จากทำเนียบในระบบ + ค้นหาด้วยชื่อ/รหัส → กดเพิ่ม → กดยืนยัน ถึงจะบันทึกจริง
 */
export default function UserManager() {
  const { showToast } = useToast();

  const [users,   setUsers]   = useState<User[]>([]);
  const [selRole, setSelRole] = useState<ManagedRole | null>(null);
  const [search,  setSearch]  = useState('');
  const [selCode, setSelCode] = useState('');
  const [pending, setPending] = useState<{ code: string; name: string } | null>(null);

  const refresh = useCallback(() => { getAllUsers().then(setUsers); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const roleUsers = users.filter(u => u.role === selRole);

  // ทำเนียบรายชื่อของ role ที่ยังไม่มีบัญชีในระบบ + กรองตามคำค้น (ชื่อ หรือ รหัส)
  const candidates = useMemo(() => {
    if (!selRole) return [];
    const existingCodes = new Set(roleUsers.map(u => u.code || u.username));
    const q = search.trim().toLowerCase();
    return PEOPLE_DIRECTORY[selRole]
      .filter(p => !existingCodes.has(p.code) && !roleUsers.some(u => u.name === p.name))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [selRole, roleUsers, search]);

  function pickRole(r: ManagedRole) {
    setSelRole(r); setSearch(''); setSelCode(''); setPending(null);
  }

  function handleAdd() {
    const person = candidates.find(p => p.code === selCode);
    if (!person) { showToast('⚠️ เลือกรายชื่อจาก dropdown ก่อน'); return; }
    setPending(person); // ขั้นที่ 1: เพิ่มเข้าคิว รอยืนยัน
  }

  async function handleConfirm() {
    if (!pending || !selRole) return;
    const res = await addUserAccount({
      username: pending.code.toLowerCase(),
      password: DEFAULT_PASSWORD,
      role: selRole as Role,
      name: pending.name,
      code: pending.code,
      school: 'โรงเรียนทดสอบ EduFlow',
    });
    if (!res.ok) { showToast(`⚠️ ${res.error}`); return; }
    showToast(`✅ เพิ่ม "${pending.name}" เป็น${ROLE_LABELS[selRole]}แล้ว (username: ${pending.code.toLowerCase()} รหัสผ่านเริ่มต้น: ${DEFAULT_PASSWORD})`);
    setPending(null); setSelCode(''); setSearch('');
    refresh();
  }

  async function handleDelete(u: User) {
    if (!confirm(`ยืนยันการลบ "${u.name}" (${u.username}) ออกจากระบบ?`)) return;
    await deleteUserById(u.username);
    showToast(`ลบบัญชี ${u.username} แล้ว`);
    refresh();
  }

  // ── หน้าเลือกประเภทผู้ใช้ ──
  if (!selRole) {
    return (
      <div className="dash-section">
        <div className="ez-title">👥 จัดการผู้ใช้</div>
        <div className="ez-subtitle">เลือกประเภทผู้ใช้ที่ต้องการจัดการ — แต่ละประเภทมีหน้าจัดการของตัวเอง</div>
        <div className="admin-menu-grid">
          {ROLE_CARDS.map(c => {
            const count = users.filter(u => u.role === c.role).length;
            return (
              <button key={c.role} className="admin-menu-card" onClick={() => pickRole(c.role)}>
                <div className="admin-menu-icon">{c.icon}</div>
                <div className="admin-menu-label">{ROLE_LABELS[c.role]} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({count} บัญชี)</span></div>
                <div className="admin-menu-desc">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── หน้าจัดการราย role ──
  return (
    <div className="dash-section">
      <button className="ez-btn ez-btn-ghost" style={{ marginBottom: '1rem', minHeight: 42 }} onClick={() => setSelRole(null)}>← กลับไปเลือกประเภท</button>
      <div className="ez-title">{ROLE_CARDS.find(c => c.role === selRole)?.icon} จัดการ{ROLE_LABELS[selRole]}</div>
      <div className="ez-subtitle">{ROLE_CARDS.find(c => c.role === selRole)?.desc}</div>

      {/* ── เพิ่มรายชื่อ ── */}
      <div style={{ background: 'var(--cream)', border: '2px solid var(--border)', borderRadius: 14, padding: '1.2rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.75rem' }}>➕ เพิ่ม{ROLE_LABELS[selRole]}เข้าระบบ</div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="ez-input" style={{ flex: 1, minWidth: 180, minHeight: 46 }}
            placeholder="🔍 ค้นหาด้วยชื่อ นามสกุล หรือรหัส"
            value={search} onChange={e => { setSearch(e.target.value); setPending(null); }}
          />
          <select
            className="ez-input" style={{ flex: 1.5, minWidth: 220, minHeight: 46, cursor: 'pointer' }}
            value={selCode} onChange={e => { setSelCode(e.target.value); setPending(null); }}
          >
            <option value="">— เลือกรายชื่อจากระบบ ({candidates.length} รายการ) —</option>
            {candidates.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
          </select>
          <button className="ez-btn ez-btn-primary" style={{ minHeight: 46 }} onClick={handleAdd}>➕ เพิ่ม</button>
        </div>

        {/* ขั้นยืนยันก่อนบันทึกจริง */}
        {pending && (
          <div style={{ marginTop: '0.9rem', background: 'rgba(196,128,74,0.1)', border: '1px solid rgba(196,128,74,0.4)', borderRadius: 12, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-body)', flex: 1, minWidth: 200 }}>
              ⏳ รอยืนยัน: เพิ่ม <b>{pending.name}</b> (รหัส {pending.code}) เป็น <b>{ROLE_LABELS[selRole]}</b>
            </span>
            <button className="ez-btn ez-btn-success" style={{ minHeight: 42 }} onClick={handleConfirm}>✅ ยืนยันการเพิ่ม</button>
            <button className="ez-btn ez-btn-ghost" style={{ minHeight: 42 }} onClick={() => setPending(null)}>ยกเลิก</button>
          </div>
        )}
      </div>

      {/* ── รายชื่อปัจจุบัน ── */}
      <div className="admin-list-header">
        <span>{ROLE_LABELS[selRole]}ในระบบ ({roleUsers.length} บัญชี)</span>
        <span className="admin-list-hint">บัญชีที่แอดมินเพิ่ม ใช้รหัสผ่านเริ่มต้น {DEFAULT_PASSWORD}</span>
      </div>
      <div className="dash-list">
        {roleUsers.length === 0
          ? <div className="stu-empty">ยังไม่มี{ROLE_LABELS[selRole]}ในระบบ — เพิ่มจากด้านบน</div>
          : roleUsers.map(u => (
              <div key={u.username} className="admin-user-row">
                <span className={`admin-role-pill role-${u.role}`}>{ROLE_LABELS[u.role]}</span>
                <span className="admin-uname">{u.username}</span>
                <span className="admin-uname-full">{u.name}{u.code ? ` · รหัส ${u.code}` : ''}</span>
                <button className="admin-del-btn" onClick={() => handleDelete(u)}>ลบ</button>
              </div>
            ))}
      </div>
    </div>
  );
}
