'use client';

import { useEffect, useState } from 'react';
import { getAdminLog } from '@/lib/api/admin.api';
import { getActivityLog, clearActivityLog, type ActivityEntry, type LogCategory } from '@/lib/api/activity.log';
import { getSession } from '@/lib/api/auth.api';
import { useToast } from '@/context/ToastContext';
import LogControls from '@/components/ui/LogControls';

type Filter = 'all' | LogCategory;

const CAT_META: Record<LogCategory, { label: string; cls: string }> = {
  admin:   { label: 'ADMIN',  cls: 'log-badge' },
  teacher: { label: 'ครู',    cls: 'log-badge log-badge-teacher' },
  system:  { label: 'ระบบ',   cls: 'log-badge log-badge-login' },
};

/** Log ระบบ — รวมประวัติ web admin + activity log ของแอดมิน/ครู เพื่อตรวจสอบย้อนหลัง */
export default function LogsView() {
  const { showToast } = useToast();
  const [adminLog, setAdminLog] = useState<{ admins: { username: string; name: string; addedAt: string; addedBy: string }[]; loginHistory: { username: string; timestamp: string; action: string }[] } | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [filter,   setFilter]   = useState<Filter>('all');
  const [pageSize, setPageSize] = useState(20);

  const isWebAdmin = getSession()?.role === 'web_admin';

  useEffect(() => {
    getAdminLog().then(setAdminLog);
    setActivity(getActivityLog());
  }, []);

  function handleClear() {
    if (!window.confirm('ล้างประวัติการใช้งานทั้งหมด?\nการกระทำนี้ย้อนกลับไม่ได้')) return;
    if (clearActivityLog()) { setActivity([]); showToast('ล้าง log แล้ว'); }
    else showToast('เฉพาะเว็บแอดมินเท่านั้นที่ล้าง log ได้');
  }

  const filtered = activity.filter(e => filter === 'all' || e.category === filter);
  const shown = pageSize === -1 ? filtered : filtered.slice(0, pageSize);

  return (
    <div className="dash-section">
      <div className="ez-title">Log ระบบ</div>
      <div className="ez-subtitle">ทุก action ของแอดมินและครูถูกบันทึกไว้ — หากพบ bug หรือ user error สามารถไล่ตรวจสอบและแก้เป็นจุด ๆ ได้</div>

      {/* ── Activity Log ── */}
      <div className="log-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div className="log-section-title" style={{ marginBottom: 0 }}>ประวัติการใช้งาน ({filtered.length} รายการ)</div>
          <div className="dash-tabs-bar">
            {([['all', 'ทั้งหมด'], ['admin', 'แอดมิน'], ['teacher', 'ครู']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} className={`dash-tab-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{label}</button>
            ))}
          </div>
        </div>
        <LogControls
          total={filtered.length}
          shown={shown.length}
          pageSize={pageSize}
          onPageSize={setPageSize}
          onClear={isWebAdmin ? handleClear : undefined}
        />
        {filtered.length === 0
          ? <div className="log-empty">ยังไม่มีประวัติการใช้งานในหมวดนี้</div>
          : shown.map((e, i) => (
              <div key={i} className="log-row">
                <span className={CAT_META[e.category]?.cls || 'log-badge'}>{CAT_META[e.category]?.label || e.category}</span>
                <strong>{e.action}</strong>{e.detail ? ` — ${e.detail}` : ''}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> · โดย {e.actorName} ({e.actor}) · {e.timestamp}</span>
              </div>
            ))}
      </div>

      {/* ── Web Admin Log เดิม ── */}
      {adminLog && (
        <>
          <div className="log-section">
            <div className="log-section-title">Web Admins ที่มีในระบบ</div>
            {adminLog.admins.map((a, i) => (
              <div key={i} className="log-row">
                <span className="log-badge">Admin</span>
                <strong>{a.username}</strong> ({a.name}) — เพิ่มโดย {a.addedBy} เมื่อ {a.addedAt}
              </div>
            ))}
          </div>
          <div className="log-section">
            <div className="log-section-title">ประวัติการเข้าสู่ระบบ (20 รายการล่าสุด)</div>
            {adminLog.loginHistory.length === 0
              ? <div className="log-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</div>
              : [...adminLog.loginHistory].reverse().slice(0, 20).map((h, i) => (
                  <div key={i} className="log-row">
                    <span className="log-badge log-badge-login">LOGIN</span>
                    {h.username} — {h.timestamp}
                  </div>
                ))}
          </div>
        </>
      )}
    </div>
  );
}
