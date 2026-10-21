'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { unreadCount } from '@/lib/api';
import { canAny, initials, isAssessorOnly, primaryRoleTh } from '@/lib/ui/aunqa';
import LangToggle from '@/components/ui/LangToggle';
import { Loading } from './common';

/** โครงหน้าแอป — nav + guard (ต้องล็อกอิน) + เมนูตามสิทธิ์ */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading) return <Loading text="กำลังเตรียมข้อมูล…" />;
  if (!user) return null;

  const assessor = isAssessorOnly(user);
  const canReview = canAny(user, 'sar.approve') || canAny(user, 'sar.return')
    || canAny(user, 'approve.faculty') || canAny(user, 'approve.final');
  const menus: { path: string; label: string; show: boolean; testId: string }[] = [
    { path: '/app',              label: 'งานของฉัน',   show: true, testId: 'nav-home' },
    { path: '/app/cycles',       label: 'รอบประเมิน',  show: true, testId: 'nav-cycles' },
    { path: '/app/requirements', label: 'คลังเกณฑ์',   show: true, testId: 'nav-requirements' },
    { path: '/app/evidence',     label: 'หลักฐาน',     show: true, testId: 'nav-evidence' },
    { path: '/app/curriculum',    label: 'หลักสูตร',     show: !assessor, testId: 'nav-curriculum' },
    { path: '/app/actions',       label: 'แผนปรับปรุง',  show: !assessor, testId: 'nav-actions' },
    { path: '/app/metrics',      label: 'ตัวชี้วัด',    show: !assessor, testId: 'nav-metrics' },
    { path: '/app/review',       label: 'รอตรวจ',      show: canReview, testId: 'nav-review' },
    { path: '/app/export',       label: 'ส่งออก',      show: true, testId: 'nav-export' },
    { path: '/app/admin',        label: 'ผู้ดูแลระบบ',  show: canAny(user, 'user.manage') || canAny(user, 'audit.view'), testId: 'nav-admin' },
  ];
  const unread = unreadCount(user);

  return (
    <div>
      <nav className="dash-nav aq-nav">
        <Link href="/app" className="dash-logo" style={{ textDecoration: 'none' }}>AUN-QA <span>Copilot</span></Link>
        <div className="dash-user-info">
          <Link href="/app" className="aq-bell" aria-label={`แจ้งเตือนที่ยังไม่อ่าน ${unread} รายการ`} data-testid="nav-bell">
            🔔{unread > 0 && <span className="aq-bell-n">{unread}</span>}
          </Link>
          <div className="dash-user-avatar" aria-hidden>{initials(user.fullName)}</div>
          <div>
            <div className="dash-user-name" data-testid="nav-user">{user.fullName}</div>
            <div className="dash-user-role">{primaryRoleTh(user)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LangToggle />
          <button className="dash-logout-btn" data-testid="logout" onClick={logout}>ออกจากระบบ</button>
        </div>
      </nav>

      <div className="aq-content">
        <div className="dash-tabs-bar aq-tabs" role="navigation" aria-label="เมนูหลัก">
          {menus.filter(m => m.show).map(m => {
            const active = m.path === '/app' ? pathname === '/app' : pathname.startsWith(m.path);
            return (
              <Link key={m.path} href={m.path} data-testid={m.testId}
                className={`dash-tab-btn${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                {m.label}
              </Link>
            );
          })}
        </div>
        {assessor && (
          <div className="auth-alert auth-alert-warn" data-testid="readonly-banner">
            คุณเข้าในฐานะกรรมการประเมิน — เห็นเฉพาะรอบที่ได้รับมอบหมาย (อ่านอย่างเดียว)
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
