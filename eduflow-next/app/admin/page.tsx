'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell, { ADMIN_MENUS } from '@/components/admin/AdminShell';
import { getSystemStats } from '@/lib/api/admin.api';

/** หน้าภาพรวม Web Admin — KPI + เมนูลิงก์ไปหน้าแยกทั้ง 4 */
export default function AdminHomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<{ totalUsers: number; totalSchools: number; adminLoginCount: number; adminCount: number } | null>(null);

  useEffect(() => { getSystemStats().then(setStats); }, []);

  return (
    <AdminShell>
      <div className="dash-section">
        <div className="section-label">Web Admin · ระดับสูงสุด</div>
        <h2 className="dash-h2">ภาพรวม<em>ระบบทั้งหมด</em></h2>
        {stats && (
          <div className="dash-kpi-row">
            {[
              { num: stats.totalUsers,      label: 'บัญชีผู้ใช้' },
              { num: stats.totalSchools,    label: 'โรงเรียน' },
              { num: stats.adminLoginCount, label: 'เข้าระบบ (Admin)' },
              { num: stats.adminCount,      label: 'Web Admins' },
            ].map((k, i) => (
              <div key={i} className="dash-kpi">
                <div className="dash-kpi-num">{k.num}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-menu-grid">
        {ADMIN_MENUS.map(m => (
          <button key={m.path} className="admin-menu-card" onClick={() => router.push(m.path)}>
            <div className="admin-menu-icon">{m.icon}</div>
            <div className="admin-menu-label">{m.label}</div>
            <div className="admin-menu-desc">{m.desc}</div>
          </button>
        ))}
      </div>
    </AdminShell>
  );
}
