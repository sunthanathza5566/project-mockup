'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROLE_LABELS, SEEDED_USERS } from '@/lib/mock-data';
import AcademicManager from './AcademicManager';
import ParentDashboard from './ParentDashboard';
import LangToggle from '@/components/ui/LangToggle';

/**
 * Dashboard สำหรับ school_admin และ parent
 * web_admin ถูกส่งไปหน้า /admin (ทุกเมนูเป็นหน้าแยกของตัวเอง)
 */
export default function DashboardLayout() {
  const { session, isLoading, logout } = useAuth();
  const { showToast }       = useToast();
  const router              = useRouter();

  useEffect(() => {
    if (isLoading) return; // รอ AuthContext อ่าน session ก่อน — กัน refresh แล้วโดนดีดออก
    if (!session) { router.push('/login'); return; }
    if (session.role === 'student')   { router.push('/student'); return; }
    if (session.role === 'teacher')   { router.push('/teacher'); return; }
    if (session.role === 'web_admin') { router.push('/admin');   return; }
  }, [session, isLoading, router]);

  if (!session || !['school_admin', 'parent'].includes(session.role)) return null;

  function handleLogout() { logout(); showToast('ออกจากระบบแล้ว'); router.push('/'); }

  return (
    <div>
      <nav className="dash-nav">
        <div className="dash-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>
        <div className="dash-user-info">
          <div className="dash-user-avatar">{session.name.replace(/\s+/g, '').substring(0, 2)}</div>
          <div>
            <div className="dash-user-name">{session.name}</div>
            <div className="dash-user-role">{ROLE_LABELS[session.role] || session.role}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <LangToggle />
          <button className="dash-logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </nav>

      <div className="dash-content">
        {session.role === 'school_admin' && (
          <>
            <SchoolAdminContent school={session.school} showToast={showToast} />
            <AcademicManager adminUsername={session.username} />
          </>
        )}
        {session.role === 'parent' && (
          <ParentDashboard
            // fallback หา childCode จาก SEEDED_USERS เผื่อ session เก่าที่ยังไม่มี field นี้
            childCode={session.childCode || SEEDED_USERS.find(u => u.username === session.username)?.childCode || ''}
            childName={session.childName}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

function SchoolAdminContent({ school, showToast }: { school: string; showToast: (m: string) => void }) {
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
          {[['มาทัน', '#5C8A5C', 71], ['มาสาย', '#C4804A', 21], ['ขาดเรียน', '#A05050', 8]].map(([l, c, v], i) => (
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
