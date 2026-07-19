'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROLE_LABELS } from '@/lib/mock-data';

export const ADMIN_MENUS = [
  { path: '/admin/users',       icon: '👥', label: 'จัดการผู้ใช้',      desc: 'เพิ่ม/ลบผู้ใช้ แยกตามประเภท ครู นักเรียน ผู้ปกครอง แอดมินโรงเรียน' },
  { path: '/admin/permissions', icon: '🔐', label: 'สิทธิ์การเข้าถึง',   desc: 'กำหนดสิทธิ์ทุกฟังก์ชันของแต่ละ role — web admin เป็นผู้ตั้งค่าทั้งหมด' },
  { path: '/admin/academic',    icon: '🏫', label: 'โครงสร้างวิชาการ',  desc: 'ปีการศึกษา ระดับชั้น ห้องเรียน นักเรียน — ยืนยันก่อนขึ้นระบบจริงทุกครั้ง' },
  { path: '/admin/logs',        icon: '📋', label: 'Log ระบบ',          desc: 'ประวัติการใช้งานของแอดมินและครู ตรวจสอบย้อนหลังได้' },
];

/** โครงหน้า Web Admin — nav + guard สิทธิ์ + เมนูลิงก์ไปแต่ละหน้าแยก */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    if (session.role !== 'web_admin') { router.push('/dashboard'); }
  }, [session, router]);

  if (!session || session.role !== 'web_admin') return null;

  function handleLogout() { logout(); showToast('ออกจากระบบแล้ว'); router.push('/'); }

  return (
    <div>
      <nav className="dash-nav">
        <div className="dash-logo" onClick={() => router.push('/admin')}>Edu<span>Flow</span></div>
        <div className="dash-user-info">
          <div className="dash-user-avatar">{session.name.replace(/\s+/g, '').substring(0, 2)}</div>
          <div>
            <div className="dash-user-name">{session.name}</div>
            <div className="dash-user-role">{ROLE_LABELS[session.role]}</div>
          </div>
        </div>
        <button className="dash-logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      <div className="dash-content">
        {/* แถบเมนู — ทุกเมนูเป็นหน้าแยกของตัวเอง */}
        <div className="dash-tabs-bar" style={{ marginBottom: '1.5rem' }}>
          <button className={`dash-tab-btn${pathname === '/admin' ? ' active' : ''}`} onClick={() => router.push('/admin')}>🏠 ภาพรวม</button>
          {ADMIN_MENUS.map(m => (
            <button key={m.path} className={`dash-tab-btn${pathname?.startsWith(m.path) ? ' active' : ''}`} onClick={() => router.push(m.path)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
