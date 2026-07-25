'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getStudentProfile, getStudentStats, getStudentSchedule, getStudentSubjects, getStudentAssignments, getStudentAttendance, getNotifications, markNotificationRead } from '@/lib/api/student.api';
import type { StudentProfile, StudentStats, Subject, Assignment, Notification, SchedulePeriod } from '@/lib/types';
import LangToggle from '@/components/ui/LangToggle';
import BookingView from './views/BookingView';
import TopupView from './views/TopupView';
import TutoringView from './views/TutoringView';
import EbookView from './views/EbookView';
import StudentDocsView from './views/StudentDocsView';
import { useLang } from '@/context/LangContext';
import { getWalletBalance } from '@/lib/api/wallet.store';

import DashboardView from './views/DashboardView';
import FeedRail from '@/components/ui/FeedRail';
import ProfileView   from './views/ProfileView';
import ClassroomView from './views/ClassroomView';
import ScheduleView  from './views/ScheduleView';
import HomeworkView  from './views/HomeworkView';
import GradesView    from './views/GradesView';
import ShopView      from './views/ShopView';
import LibraryView   from './views/LibraryView';
import AttendanceScanView from './AttendanceScanView';
import TeacherRatingModal from './TeacherRatingModal';

export type StudentView = 'dashboard' | 'profile' | 'classroom' | 'schedule' | 'homework' | 'grades' | 'docs' | 'shop' | 'library' | 'booking' | 'ebook' | 'topup' | 'tutoring';

/** ลำดับหมวดหมู่ในเมนู ☰ ของนักเรียน */
const NAV_GROUPS = ['การเรียน', 'ห้องสมุด & บริการ', 'บัญชี & อื่น ๆ'] as const;
type StuNavGroup = typeof NAV_GROUPS[number];

const NAV_ITEMS: { view: StudentView; icon: string; label: string; group?: StuNavGroup }[] = [
  { view: 'dashboard', icon: '🏠', label: 'หน้าหลัก' },
  // ── การเรียน ──
  { view: 'classroom', icon: '🏫', label: 'ห้องเรียน',          group: 'การเรียน' },
  { view: 'schedule',  icon: '📅', label: 'ตารางเรียน',         group: 'การเรียน' },
  { view: 'homework',  icon: '📚', label: 'การบ้าน',            group: 'การเรียน' },
  { view: 'grades',    icon: '🎓', label: 'ผลการเรียน',         group: 'การเรียน' },
  { view: 'docs',      icon: '📄', label: 'เอกสารผลการเรียน',   group: 'การเรียน' },
  { view: 'tutoring',  icon: '🎓', label: 'จองเรียนพิเศษ',      group: 'การเรียน' },
  // ── ห้องสมุด & บริการ ──
  { view: 'library',   icon: '📖', label: 'ห้องสมุด',           group: 'ห้องสมุด & บริการ' },
  { view: 'ebook',     icon: '📱', label: 'ห้องสมุดออนไลน์',    group: 'ห้องสมุด & บริการ' },
  { view: 'booking',   icon: '📚', label: 'จองหนังสือ',         group: 'ห้องสมุด & บริการ' },
  { view: 'shop',      icon: '🛍', label: 'ร้านค้า',            group: 'ห้องสมุด & บริการ' },
  { view: 'topup',     icon: '💰', label: 'กระเป๋าเงิน',        group: 'ห้องสมุด & บริการ' },
  // ── บัญชี & อื่น ๆ ──
  { view: 'profile',   icon: '👤', label: 'โปรไฟล์',            group: 'บัญชี & อื่น ๆ' },
];

export default function StudentLayout() {
  const { session, isLoading, logout } = useAuth();
  const { showToast }       = useToast();
  const { t }               = useLang();
  const router              = useRouter();

  // ─── View state ──────────────────────────────────────
  const [currentView,    setCurrentView]    = useState<StudentView>('dashboard');
  const [homeworkFilter, setHomeworkFilter] = useState('all');
  const [currentDay,     setCurrentDay]     = useState<string>('mon');

  // ─── Burger / Notif panels ───────────────────────────
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [showAttendanceScan, setShowAttendanceScan] = useState(false);
  const [showRating, setShowRating] = useState(false);

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
    if (isLoading) return; // รอ AuthContext อ่าน session จาก storage ก่อน — ไม่งั้น refresh หน้าแล้วโดนดีดออก
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
  }, [session, isLoading]);

  const handleLogout = useCallback(() => { logout(); }, [logout]);  // logout จัดการอนิเมชั่น + redirect เอง

  const navigate = useCallback((view: StudentView) => {
    setCurrentView(view);
    setBurgerOpen(false);
    setNotifOpen(false);
  }, []);

  // กดแจ้งเตือน → mark อ่านแล้ว + พาไปหน้าที่เกี่ยวข้องกับ action นั้น
  const handleMarkNotif = useCallback(async (n: Notification) => {
    await markNotificationRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isNew: false } : x));
    if (n.type === 'overdue')     { setHomeworkFilter('overdue'); navigate('homework'); }
    else if (n.type === 'hw')     { setHomeworkFilter('pending'); navigate('homework'); }
    else if (n.type === 'grade')  { navigate('grades'); }
    else if (n.type === 'info') {
      // แยกปลายทางจากเนื้อหา: เงินเข้า → กระเป๋าเงิน · หนังสือ/คิว → จองหนังสือ
      if (n.title.includes('เงิน') || n.title.includes('💰')) navigate('topup');
      else if (n.title.includes('📚') || n.title.includes('คิว') || n.title.includes('หนังสือ')) navigate('booking');
    }
  }, [navigate]);

  // ยอดเงินจากกระเป๋ากลาง — ร้านค้า/เติมเงิน เปลี่ยนยอดแล้วเรียก refreshWallet ให้ตัวเลขบน nav ตรงเสมอ
  const [walletBalance, setWalletBalance] = useState(0);
  const refreshWallet = useCallback(() => {
    if (session) setWalletBalance(getWalletBalance(session.code || ''));
  }, [session]);
  useEffect(() => { refreshWallet(); }, [refreshWallet]);

  // refresh การบ้าน + แจ้งเตือน หลังนักเรียนส่งงาน (ครูให้คะแนนแล้วจะเห็นสถานะใหม่ด้วย)
  const refreshAssignments = useCallback(async () => {
    if (!session) return;
    const code = session.code || '';
    const [asgn, notif] = await Promise.all([getStudentAssignments(code), getNotifications(code)]);
    setAssignments(asgn);
    setNotifications(notif);
  }, [session]);

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
    refreshAssignments,
    refreshWallet,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Nav ── */}
      <nav className="stu-nav">
        <div className="stu-nav-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>

        <ul className="stu-nav-links">
          {([
            ['หน้าหลัก',   () => navigate('dashboard')],
            ['จองหนังสือ', () => navigate('booking')],
            ['ร้านค้า',    () => navigate('shop')],
            ['สั่งข้าว',   () => showToast('🍚 ระบบสั่งข้าวกำลังพัฒนา — เร็ว ๆ นี้')],
            ['เติมเงิน',   () => navigate('topup')],
          ] as [string, () => void][]).map(([lnk, go], i) => (
            <li key={i}>
              <a href="#" onClick={e => { e.preventDefault(); go(); }}>{lnk}</a>
            </li>
          ))}
        </ul>

        <div className="stu-nav-right">
          <LangToggle />
          <div className="stu-balance" style={{ cursor: 'pointer' }} onClick={() => navigate('topup')}>฿{walletBalance.toLocaleString('th-TH')}</div>

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
          {/* หน้าหลัก (ไม่อยู่ในหมวด) */}
          {NAV_ITEMS.filter(i => !i.group).map(item => (
            <button key={item.view} className={`stu-bm-item${currentView === item.view ? ' bm-active' : ''}`} data-bmview={item.view} onClick={() => navigate(item.view)}>
              <span className="stu-bm-iicon">{item.icon}</span>{t(item.label)}
            </button>
          ))}
          {/* เมนูจัดกลุ่มตามหมวด */}
          {NAV_GROUPS.map(group => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            const overdue = assignments.filter(a => a.status === 'overdue').length;
            return (
              <div key={group}>
                <div className="tch-bm-section">{t(group)}</div>
                {items.map(item => (
                  <button key={item.view} className={`stu-bm-item${currentView === item.view ? ' bm-active' : ''}`} data-bmview={item.view} onClick={() => navigate(item.view)}>
                    <span className="stu-bm-iicon">{item.icon}</span>{t(item.label)}
                    {item.view === 'homework' && overdue > 0 && <span className="stu-bm-ibadge">{overdue}</span>}
                  </button>
                ))}
                {/* ทำรายการด่วน (modal) อยู่ในหมวดการเรียน */}
                {group === 'การเรียน' && (
                  <>
                    <button className="stu-bm-item" onClick={() => { setBurgerOpen(false); setShowAttendanceScan(true); }}>
                      <span className="stu-bm-iicon">📱</span>{t('เช็คชื่อ QR')}
                    </button>
                    <button className="stu-bm-item" onClick={() => { setBurgerOpen(false); setShowRating(true); }}>
                      <span className="stu-bm-iicon">⭐</span>{t('ให้คะแนนการสอน')}
                    </button>
                  </>
                )}
              </div>
            );
          })}
          <div className="stu-bm-divider" />
          <button className="stu-bm-item stu-bm-item-logout" onClick={handleLogout}>
            <span className="stu-bm-iicon">🚪</span>{t('ออกจากระบบ')}
          </button>
        </nav>
      </div>

      {/* ── Notif overlay ── */}
      <div className={`stu-notif-overlay${notifOpen ? ' show' : ''}`} onClick={() => setNotifOpen(false)} />
      <div className={`stu-notif-panel${notifOpen ? ' open' : ''}`} id="stu-notif-panel">
        <div className="stu-notif-ph">
          <span className="stu-notif-ph-title">{t('การแจ้งเตือน')}</span>
          <button className="stu-notif-ph-close" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="stu-notif-list-inner" id="stu-notif-list">
          {notifications.length === 0
            ? <div className="stu-notif-empty">🔕<br />ไม่มีแจ้งเตือนใหม่</div>
            : notifications.map(n => {
                const meta: Record<string, { icon: string }> = { overdue: { icon: '⛔' }, grade: { icon: '📝' }, info: { icon: '📢' }, hw: { icon: '📚' } };
                return (
                  <div key={n.id} className={`stu-notif-item type-${n.type}${n.isNew ? ' is-new' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleMarkNotif(n)}>
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
        {currentView === 'dashboard' && (
          <div className="dash-3col">
            <FeedRail side="left" title="🗓 วันหยุด & ข่าวสาร" />
            <div className="dash-3col-main"><DashboardView {...viewProps} /></div>
            <FeedRail side="right" title="🎉 กิจกรรม & เกร็ดความรู้" />
          </div>
        )}
        {currentView === 'profile'   && <ProfileView   {...viewProps} />}
        {currentView === 'classroom' && <ClassroomView {...viewProps} />}
        {currentView === 'schedule'  && <ScheduleView  {...viewProps} />}
        {currentView === 'homework'  && <HomeworkView  {...viewProps} />}
        {currentView === 'grades'    && <GradesView    profile={profile} showToast={showToast} />}
        {currentView === 'docs'      && <StudentDocsView profile={profile} showToast={showToast} />}
        {currentView === 'shop'      && <ShopView      {...viewProps} stats={stats!} />}
        {currentView === 'library'   && <LibraryView   {...viewProps} />}
        {currentView === 'booking'   && <BookingView   profile={profile} showToast={showToast} />}
        {currentView === 'tutoring'  && <TutoringView  profile={profile} showToast={showToast} />}
        {currentView === 'ebook'     && <EbookView     profile={profile} showToast={showToast} />}
        {currentView === 'topup'     && <TopupView     profile={profile} showToast={showToast} />}
      </main>

      {/* ── Teacher Rating Modal (นิรนาม) ── */}
      {showRating && (
        <TeacherRatingModal
          todaySchedule={schedule[currentDay] || []}
          onClose={() => setShowRating(false)}
          showToast={showToast}
        />
      )}

      {/* ── Attendance Scan Modal ── */}
      {showAttendanceScan && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => setShowAttendanceScan(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 1000,
              width: 'min(90vw, 500px)',
            }}
          >
            <AttendanceScanView onClose={() => setShowAttendanceScan(false)} />
          </div>
        </>
      )}
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
