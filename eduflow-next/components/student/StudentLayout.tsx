'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getStudentProfile, getStudentStats, getStudentSchedule, getStudentSubjects, getStudentAssignments, getStudentAttendance, getNotifications, markNotificationRead } from '@/lib/api/student.api';
import type { StudentProfile, StudentStats, Subject, Assignment, Notification, SchedulePeriod } from '@/lib/types';

import DashboardView from './views/DashboardView';
import ProfileView   from './views/ProfileView';
import ClassroomView from './views/ClassroomView';
import ScheduleView  from './views/ScheduleView';
import HomeworkView  from './views/HomeworkView';
import ShopView      from './views/ShopView';
import LibraryView   from './views/LibraryView';

export type StudentView = 'dashboard' | 'profile' | 'classroom' | 'schedule' | 'homework' | 'shop' | 'library';

const NAV_ITEMS: { view: StudentView; icon: string; label: string }[] = [
  { view: 'dashboard', icon: '🏠', label: 'หน้าหลัก' },
  { view: 'profile',   icon: '👤', label: 'โปรไฟล์' },
  { view: 'classroom', icon: '🏫', label: 'ห้องเรียน' },
  { view: 'schedule',  icon: '📅', label: 'ตารางเรียน' },
  { view: 'homework',  icon: '📚', label: 'การบ้าน' },
  { view: 'shop',      icon: '🛍', label: 'ร้านค้า' },
  { view: 'library',   icon: '📖', label: 'ห้องสมุด' },
];

export default function StudentLayout() {
  const { session, logout } = useAuth();
  const { showToast }       = useToast();
  const router              = useRouter();

  // ─── View state ──────────────────────────────────────
  const [currentView,    setCurrentView]    = useState<StudentView>('dashboard');
  const [homeworkFilter, setHomeworkFilter] = useState('all');
  const [currentDay,     setCurrentDay]     = useState<string>('mon');

  // ─── Burger / Notif panels ───────────────────────────
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);

  // ─── Data state ───────────────────────────────────────
  // TODO(PostgreSQL): replace useState + useEffect fetch with useSWR or React Query
  const [profile,      setProfile]      = useState<StudentProfile | null>(null);
  const [stats,        setStats]        = useState<StudentStats | null>(null);
  const [schedule,     setSchedule]     = useState<Record<string, SchedulePeriod[]>>({});
  const [subjects,     setSubjects]     = useState<Subject[]>([]);
  const [assignments,  setAssignments]  = useState<Assignment[]>([]);
  const [attendance,   setAttendance]   = useState<{ week: ('on-time'|'late'|'absent')[]; month: { onTime:number; late:number; absent:number; total:number } } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    if (session.role !== 'student') { router.push('/dashboard'); return; }

    const dayMap: Record<number, string> = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' };
    setCurrentDay(dayMap[new Date().getDay()] || 'mon');

    const code = session.code || '';
    Promise.all([
      getStudentProfile(code),
      getStudentStats(code),
      getStudentSchedule(code),
      getStudentSubjects(code),
      getStudentAssignments(code),
      getStudentAttendance(code),
      getNotifications(code),
    ]).then(([p, st, sc, sub, asgn, att, notif]) => {
      const merged = {
        ...p,
        firstName: session.name.split(' ')[0] || p.firstName,
        lastName: session.name.split(' ')[1] || p.lastName,
        studentId: session.code || p.studentId,
        grade: session.class?.split('/')[0] || p.grade,
        room: session.class?.split('/')[1] || p.room,
      };
      setProfile(merged);
      setStats(st);
      setSchedule(sc as Record<string, SchedulePeriod[]>);
      setSubjects(sub);
      setAssignments(asgn);
      setAttendance(att);
      setNotifications(notif);
    });
  }, [session]);

  const handleLogout = useCallback(() => {
    logout(); showToast('ออกจากระบบแล้ว'); router.push('/');
  }, [logout, showToast, router]);

  const navigate = useCallback((view: StudentView) => {
    setCurrentView(view);
    setBurgerOpen(false);
    setNotifOpen(false);
  }, []);

  const handleMarkNotif = useCallback(async (id: number) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isNew: false } : n));
  }, []);

  const newNotifCount = notifications.filter(n => n.isNew).length;
  const initials      = profile ? (profile.firstName[0] || '') + (profile.lastName?.[0] || '') : '??';

  if (!session || !profile) return null;

  // Props shared across views
  const viewProps = {
    profile, stats: stats!, schedule, subjects, assignments, attendance: attendance!,
    currentDay, setCurrentDay,
    homeworkFilter, setHomeworkFilter,
    setView: navigate,
    showToast,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Nav ── */}
      <nav className="stu-nav">
        <div className="stu-nav-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>

        <ul className="stu-nav-links">
          {['หน้าหลัก','จองหนังสือ','ร้านค้า','สั่งข้าว','เติมเงิน'].map((lnk, i) => (
            <li key={i}>
              <a href="#" onClick={e => { e.preventDefault(); if (i === 0) navigate('dashboard'); else if (i === 2) navigate('shop'); else showToast(`กำลังเปิด${lnk}...`); }}>
                {lnk}
              </a>
            </li>
          ))}
        </ul>

        <div className="stu-nav-right">
          <div className="stu-balance">฿{stats?.balance.toLocaleString('th-TH') ?? '—'}</div>

          <button className="stu-notif-btn" onClick={() => { setBurgerOpen(false); setNotifOpen(o => !o); }}>
            🔔
            {newNotifCount > 0 && <span className="stu-notif-badge" id="stu-notif-badge">{newNotifCount}</span>}
          </button>

          <button className="stu-burger" onClick={() => { setNotifOpen(false); setBurgerOpen(o => !o); }}>☰</button>
        </div>
      </nav>

      {/* ── Burger overlay ── */}
      <div className={`stu-bm-overlay${burgerOpen ? ' show' : ''}`} onClick={() => setBurgerOpen(false)} />
      <div className={`stu-bm-panel${burgerOpen ? ' open' : ''}`}>
        <div className="stu-bm-profile" onClick={() => navigate('profile')}>
          <div className="stu-bm-avatar">{initials}</div>
          <div className="stu-bm-pinfo">
            <div className="stu-bm-pname">{profile.firstName} {profile.lastName}</div>
            <div className="stu-bm-pclass">{profile.grade}/{profile.room} · รหัส {profile.studentId}</div>
          </div>
          <span className="stu-bm-pchevron">›</span>
        </div>
        <nav className="stu-bm-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.view}
              className={`stu-bm-item${currentView === item.view ? ' bm-active' : ''}`}
              data-bmview={item.view}
              onClick={() => navigate(item.view)}
            >
              <span className="stu-bm-iicon">{item.icon}</span>
              {item.label}
              {item.view === 'homework' && assignments.filter(a => a.status === 'overdue').length > 0 && (
                <span className="stu-bm-ibadge">{assignments.filter(a => a.status === 'overdue').length}</span>
              )}
            </button>
          ))}
          <div className="stu-bm-divider" />
          <button className="stu-bm-item stu-bm-item-logout" onClick={handleLogout}>
            <span className="stu-bm-iicon">🚪</span>ออกจากระบบ
          </button>
        </nav>
      </div>

      {/* ── Notif overlay ── */}
      <div className={`stu-notif-overlay${notifOpen ? ' show' : ''}`} onClick={() => setNotifOpen(false)} />
      <div className={`stu-notif-panel${notifOpen ? ' open' : ''}`} id="stu-notif-panel">
        <div className="stu-notif-ph">
          <span className="stu-notif-ph-title">การแจ้งเตือน</span>
          <button className="stu-notif-ph-close" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="stu-notif-list-inner" id="stu-notif-list">
          {notifications.length === 0
            ? <div className="stu-notif-empty">🔕<br />ไม่มีแจ้งเตือนใหม่</div>
            : notifications.map(n => {
                const meta: Record<string, { icon: string }> = { overdue: { icon: '⛔' }, grade: { icon: '📝' }, info: { icon: '📢' }, hw: { icon: '📚' } };
                return (
                  <div key={n.id} className={`stu-notif-item type-${n.type}${n.isNew ? ' is-new' : ''}`} onClick={() => handleMarkNotif(n.id)}>
                    <div className="stu-notif-item-row">
                      {n.isNew && <div className="stu-notif-new-dot" />}
                      <div className="stu-notif-item-icon">{meta[n.type]?.icon ?? '📢'}</div>
                      <div className="stu-notif-item-content">
                        <div className="stu-notif-item-title">{n.title}</div>
                        <div className="stu-notif-item-body">{n.body}</div>
                        <div className="stu-notif-item-time">{timeAgo(n.time)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="stu-main" style={{ flex: 1, overflowY: 'auto' }}>
        {currentView === 'dashboard' && <DashboardView {...viewProps} />}
        {currentView === 'profile'   && <ProfileView   {...viewProps} />}
        {currentView === 'classroom' && <ClassroomView {...viewProps} />}
        {currentView === 'schedule'  && <ScheduleView  {...viewProps} />}
        {currentView === 'homework'  && <HomeworkView  {...viewProps} />}
        {currentView === 'shop'      && <ShopView      {...viewProps} stats={stats!} />}
        {currentView === 'library'   && <LibraryView   {...viewProps} />}
      </main>
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days >= 1) return `${days} วันที่แล้ว`;
  if (hrs  >= 1) return `${hrs} ชั่วโมงที่แล้ว`;
  if (mins >= 1) return `${mins} นาทีที่แล้ว`;
  return 'เมื่อกี้';
}
