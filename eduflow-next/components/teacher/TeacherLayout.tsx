'use client';

/**
 * หน้าหลักฝั่งครู
 *
 * โครงสร้าง: ทุกฟังก์ชันย้ายเข้าไปอยู่ใน "ปุ่มเมนู ☰" แบบเดียวกับฝั่งนักเรียน
 * เรียงตามลำดับการใช้งานจริง: ตารางสอน → จัดตาราง → เช็คชื่อ → การบ้าน → คะแนน → สื่อ → สอนพิเศษ → ประวัติ
 * หน้าแรกแสดง "ข่าวสารโรงเรียน" แทนรายชื่อห้อง/รายชื่อนักเรียน
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LangContext';
import {
  getTeacherProfile, getTeacherClasses, getTeacherNotifications, markTeacherNotificationRead, isDemoTeacher,
} from '@/lib/api/teacher.api';
import { getTeacherRatingSummary } from '@/lib/api/ratings.store';
import { getFullTeacherProfile } from '@/lib/api/teacher-profile.store';
import { getTeacherSlots, canManageSchedule } from '@/lib/api/schedule.store';
import { hasPermission } from '@/lib/api/permissions';
import AttendanceView from './AttendanceView';
import AssignmentsView from './AssignmentsView';
import GradebookView from './GradebookView';
import MaterialsView from './MaterialsView';
import ProfileView from './ProfileView';
import ScheduleView from './ScheduleView';
import ScheduleManagerView from './ScheduleManagerView';
import SubjectCatalogView from './SubjectCatalogView';
import AcademicStructureView from './AcademicStructureView';
import TutoringView from './TutoringView';
import NewsBoard from '@/components/ui/NewsBoard';
import LangToggle from '@/components/ui/LangToggle';
import type { TeacherProfile, ClassInfo, Notification } from '@/lib/types';

type TeacherView =
  | 'overview' | 'academic' | 'subjects' | 'schedule' | 'schedule-manager' | 'attendance' | 'attendance-report'
  | 'assignments' | 'gradebook' | 'materials' | 'tutoring' | 'profile';

/** เมนูในปุ่ม ☰ — เรียงตามลำดับการใช้งานที่ควรเป็น (pipeline: โครงสร้าง → วิชา → แผน → ตารางสอน) */
const NAV_ITEMS: { view: TeacherView; icon: string; label: string; perm?: string; needClass?: boolean }[] = [
  { view: 'overview',         icon: '🏠', label: 'หน้าหลัก' },
  { view: 'academic',         icon: '🏫', label: 'โครงสร้างวิชาการ',       perm: 'manageAcademic' },
  { view: 'subjects',         icon: '📚', label: 'จัดการวิชา',             perm: 'manageSubjects' },
  { view: 'schedule-manager', icon: '🗓', label: 'แผนการเรียนการสอน',     perm: 'manageTeachSchedule' },
  { view: 'schedule',         icon: '📅', label: 'ตารางสอน',              perm: 'viewTeachSchedule' },
  { view: 'attendance',       icon: '🔲', label: 'สร้าง QR Code เช็คชื่อ', perm: 'attendanceQR',  needClass: true },
  { view: 'attendance-report',icon: '📊', label: 'รายงานเช็คชื่อย้อนหลัง', perm: 'viewReports',   needClass: true },
  { view: 'assignments',      icon: '📚', label: 'การบ้าน & ตรวจงาน',      perm: 'assignments',   needClass: true },
  { view: 'gradebook',        icon: '📝', label: 'บันทึกคะแนน (ปพ.5)',     perm: 'gradebook' },
  { view: 'materials',        icon: '📁', label: 'สื่อการสอน & ประกาศ',    perm: 'materials',     needClass: true },
  { view: 'tutoring',         icon: '🎓', label: 'เปิดสอนพิเศษ',           perm: 'offerTutoring' },
  { view: 'profile',          icon: '👤', label: 'ประวัติของฉัน' },
];

/** หน้าที่มีตารางกว้าง — ให้ใช้พื้นที่เต็มหน้าจอ */
const WIDE_VIEWS: TeacherView[] = ['gradebook', 'schedule', 'schedule-manager', 'subjects', 'academic'];

export default function TeacherLayout() {
  const { session, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const { t } = useLang();
  const router = useRouter();

  const [profile,     setProfile]     = useState<TeacherProfile | null>(null);
  const [classes,     setClasses]     = useState<ClassInfo[]>([]);
  const [selClass,    setSelClass]    = useState<string>('');
  const [currentView, setCurrentView] = useState<TeacherView>('overview');
  const [ratingSummary, setRatingSummary] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [todayPeriods, setTodayPeriods] = useState(0);
  const [weekPeriods,  setWeekPeriods]  = useState(0);

  useEffect(() => {
    if (isLoading) return; // รอ AuthContext อ่าน session ก่อน — กัน refresh แล้วโดนดีดออก
    if (!session) { router.push('/login'); return; }
    if (session.role !== 'teacher') { router.push('/dashboard'); return; }

    const tid = session.username;
    Promise.all([getTeacherProfile(tid), getTeacherClasses(tid), getTeacherNotifications(tid)]).then(([p, cls, notifs]) => {
      // ทับข้อมูล mock ด้วยตัวตนจริงจาก session — ไม่งั้นครูทุกคนจะกลายเป็นชื่อครูใน mock
      // รหัสครู: ใช้รหัสจากบัญชีก่อน แล้วค่อยตกไปที่รหัสในทะเบียนครู — ต้องตรงกันเพื่อให้แจ้งเตือนส่งถึง
      const base = { ...p, name: session.name, teacherId: session.code || p.teacherId || session.username.toUpperCase(), school: session.school || p.school };
      const full = getFullTeacherProfile(tid, base, isDemoTeacher(tid));
      setProfile(full);
      setClasses(cls);
      setNotifications(notifs);
      setRatingSummary(getTeacherRatingSummary(full.name));
      if (cls.length > 0) setSelClass(cls[0].id);

      // สรุปคาบสอนจากตารางสอนจริง
      const slots = getTeacherSlots(tid);
      const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
      const today = dayMap[new Date().getDay()];
      setWeekPeriods(slots.length);
      setTodayPeriods(today ? slots.filter(s => s.day === today).length : 0);
    });
  }, [session, isLoading, router]);

  const handleLogout = useCallback(() => {
    logout(); showToast('ออกจากระบบแล้ว'); router.push('/');
  }, [logout, showToast, router]);

  /** โหลดห้อง/วิชาที่สอนใหม่จากตารางสอน — เรียกหลังครูแก้ตารางเสร็จ ทุกเมนูจะเห็นข้อมูลล่าสุดทันที */
  const reloadClasses = useCallback(async () => {
    if (!session) return;
    const cls = await getTeacherClasses(session.username);
    setClasses(cls);
    setSelClass(prev => (cls.some(c => c.id === prev) ? prev : cls[0]?.id || ''));

    const slots = getTeacherSlots(session.username);
    const dayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
    const today = dayMap[new Date().getDay()];
    setWeekPeriods(slots.length);
    setTodayPeriods(today ? slots.filter(s => s.day === today).length : 0);
  }, [session]);

  const navigate = useCallback((view: TeacherView) => {
    // ออกจากหน้าจัดโครงสร้าง/แผน = ข้อมูลอาจเปลี่ยน → ดึงห้อง/วิชาที่สอนใหม่ ทุกเมนูเห็นล่าสุด
    const structural: TeacherView[] = ['schedule-manager', 'academic', 'subjects'];
    setCurrentView(prev => {
      if (structural.includes(prev) && prev !== view) reloadClasses();
      return view;
    });
    setBurgerOpen(false);
    setNotifOpen(false);
  }, [reloadClasses]);

  if (!session || !profile) return null;

  const currentClass = classes.find(c => c.id === selClass);
  const initials = profile.name.replace(/^ครู\s*/, '').replace(/\s+/g, '').substring(0, 2);
  const canManage = canManageSchedule();
  const visibleNav = NAV_ITEMS.filter(item => !item.perm || hasPermission(item.perm));
  const activeItem = NAV_ITEMS.find(i => i.view === currentView);
  const needsClass = !!activeItem?.needClass;

  return (
    <div>
      {/* ── Nav ── */}
      <nav className="dash-nav">
        <div className="dash-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '0.5rem' }}>
          <LangToggle />

          <button className="stu-notif-btn" onClick={() => { setBurgerOpen(false); setNotifOpen(o => !o); }}>
            🔔
            {notifications.filter(n => n.isNew).length > 0 && (
              <span className="stu-notif-badge">{notifications.filter(n => n.isNew).length}</span>
            )}
          </button>

          <button className="stu-burger" onClick={() => { setNotifOpen(false); setBurgerOpen(o => !o); }}>☰</button>
        </div>
      </nav>

      {/* ── Burger menu (แถวยาวลงมา เรียงตามลำดับการใช้งาน) ── */}
      <div className={`stu-bm-overlay${burgerOpen ? ' show' : ''}`} onClick={() => setBurgerOpen(false)} />
      <div className={`stu-bm-panel${burgerOpen ? ' open' : ''}`}>
        <div className="stu-bm-profile" onClick={() => navigate('profile')}>
          <div className="stu-bm-avatar">{initials}</div>
          <div className="stu-bm-pinfo">
            <div className="stu-bm-pname">{profile.name}</div>
            <div className="stu-bm-pclass">{t('ครู')} · รหัส {profile.teacherId}</div>
          </div>
          <span className="stu-bm-pchevron">›</span>
        </div>
        <nav className="stu-bm-nav">
          <div className="tch-bm-section">เมนูการสอน</div>
          {visibleNav.map(item => (
            <button
              key={item.view}
              className={`stu-bm-item${currentView === item.view ? ' bm-active' : ''}`}
              onClick={() => navigate(item.view)}
            >
              <span className="stu-bm-iicon">{item.icon}</span>
              {t(item.label)}
            </button>
          ))}
          <div className="stu-bm-divider" />
          <button className="stu-bm-item stu-bm-item-logout" onClick={handleLogout}>
            <span className="stu-bm-iicon">🚪</span>{t('ออกจากระบบ')}
          </button>
        </nav>
      </div>

      {/* ── Notification panel ── */}
      <div className={`stu-notif-overlay${notifOpen ? ' show' : ''}`} onClick={() => setNotifOpen(false)} />
      <div className={`stu-notif-panel${notifOpen ? ' open' : ''}`}>
        <div className="stu-notif-ph">
          <span className="stu-notif-ph-title">{t('การแจ้งเตือน')}</span>
          <button className="stu-notif-ph-close" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="stu-notif-list-inner">
          {notifications.length === 0 ? (
            <div className="stu-notif-empty">🔕<br />{t('ไม่มีแจ้งเตือนใหม่')}</div>
          ) : (
            notifications.map(n => {
              const typeMap: Record<string, string> = {
                attendance_report: 'type-grade', assignment_submitted: 'type-grade',
                info: 'type-info', overdue: 'type-overdue', grade: 'type-grade', hw: 'type-info',
              };
              const iconMap: Record<string, string> = {
                attendance_report: '📊', assignment_submitted: '📝',
                info: '📢', overdue: '⛔', grade: '📊', hw: '📚',
              };
              return (
                <div
                  key={n.id}
                  className={`stu-notif-item ${typeMap[n.type] || 'type-info'}${n.isNew ? ' is-new' : ''}`}
                  onClick={() => {
                    markTeacherNotificationRead(n.id);
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isNew: false } : x));
                  }}
                >
                  <div className="stu-notif-item-row">
                    {n.isNew && <div className="stu-notif-new-dot" />}
                    <div className="stu-notif-item-icon">{iconMap[n.type] || '📢'}</div>
                    <div className="stu-notif-item-content">
                      <div className="stu-notif-item-title">{n.title}</div>
                      <div className="stu-notif-item-body">{n.body}</div>
                      <div className="stu-notif-item-time">
                        {new Date(n.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {/* หน้าที่ต้องใช้พื้นที่กว้าง (ตารางคะแนน/ตารางสอน) ขยายเต็มจอ — หน้าอื่นคุมความกว้างให้อ่านง่าย */}
      <div className="dash-content" style={{ maxWidth: WIDE_VIEWS.includes(currentView) ? 'none' : currentView === 'overview' ? 960 : 1120 }}>
        {currentView === 'overview' ? (
          <>
            <div className="dash-section">
              <div className="section-label">{t('ครู')} · {profile.school}</div>
              <h2 className="dash-h2">สวัสดี คุณครู<em>{profile.name.replace('ครู', '').trim()}</em></h2>

              <div className="dash-kpi-row">
                {[
                  { num: classes.length, label: t('ห้องที่สอน') },
                  { num: todayPeriods, label: t('คาบวันนี้') },
                  { num: weekPeriods, label: 'คาบต่อสัปดาห์' },
                  {
                    num: ratingSummary.avg !== null ? `⭐ ${ratingSummary.avg.toFixed(1)}` : '⭐ —',
                    label: `ผลประเมินการสอน (${ratingSummary.count} ครั้ง)`,
                  },
                ].map((k, i) => (
                  <div key={i} className="dash-kpi">
                    <div className="dash-kpi-num">{k.num}</div>
                    <div className="dash-kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>

              <div className="ez-help-box">
                💡 ทุกฟังก์ชันการสอนอยู่ในปุ่ม <b>☰ มุมขวาบน</b> — กดเพื่อเปิดเมนู กดซ้ำเพื่อซ่อน
                {classes.length === 0 && <><br />🕐 ยังไม่มีห้องสอน — เริ่มที่เมนู “จัดการตารางสอน” เพื่อจัดคาบสอนของท่าน</>}
              </div>
            </div>

            {/* ข่าวสารโรงเรียนประจำวัน */}
            <NewsBoard />
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('overview')}
              style={{
                padding: '0.5rem 1rem', marginBottom: '1.25rem', background: 'var(--brown-dark)',
                color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              ← {t('ย้อนกลับ')}
            </button>

            {/* ตัวเลือกห้อง — เฉพาะเมนูที่ต้องระบุห้อง */}
            {needsClass && (
              <div className="dash-section">
                <div className="dash-section-title">{t('เลือกห้องเรียน')}</div>
                {classes.length === 0 ? (
                  <div className="ez-help-box">
                    🕐 ยังไม่มีห้องสอน — จัดตารางสอนของท่านก่อนที่เมนู “จัดการตารางสอน”
                    แล้วห้อง/วิชาจะปรากฏในทุกเมนูโดยอัตโนมัติ
                  </div>
                ) : (
                  <div className="dash-tabs-bar">
                    {classes.map(cls => (
                      <button
                        key={cls.id}
                        className={`dash-tab-btn${selClass === cls.id ? ' active' : ''}`}
                        onClick={() => setSelClass(cls.id)}
                      >
                        {cls.icon} {cls.grade}/{cls.room} {cls.subject}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView === 'academic' && (
              <AcademicStructureView onGoToPlan={() => navigate('subjects')} />
            )}

            {currentView === 'subjects' && (
              <SubjectCatalogView onGoToPlan={() => navigate('schedule-manager')} />
            )}

            {currentView === 'schedule' && (
              <ScheduleView
                teacherUsername={session.username}
                teacherName={profile.name}
                canManage={canManage}
                onManage={() => navigate('schedule-manager')}
              />
            )}

            {currentView === 'schedule-manager' && (
              <ScheduleManagerView
                teacherUsername={session.username}
                teacherId={profile.teacherId}
                teacherName={profile.name}
                onBack={() => navigate('schedule')}
              />
            )}

            {currentClass && (currentView === 'attendance' || currentView === 'attendance-report') && (
              <AttendanceView
                key={`${currentView}-${currentClass.id}`}
                teacherId={profile.teacherId}
                teacherName={profile.name}
                selectedClass={currentClass}
                initialTab={currentView === 'attendance' ? 'manager' : 'report'}
              />
            )}

            {currentClass && currentView === 'assignments' && (
              <AssignmentsView teacherName={profile.name} teacherId={profile.teacherId} selectedClass={currentClass} />
            )}

            {currentView === 'gradebook' && (
              <GradebookView teacherId={profile.teacherId} teacherName={profile.name} classes={classes} />
            )}

            {currentClass && currentView === 'materials' && (
              <MaterialsView teacherName={profile.name} selectedClass={currentClass} />
            )}

            {currentView === 'tutoring' && (
              <TutoringView
                teacherUsername={session.username}
                teacherId={profile.teacherId}
                teacherName={profile.name}
                classes={classes}
                onBack={() => navigate('overview')}
              />
            )}

            {currentView === 'profile' && (
              <ProfileView
                profile={profile}
                username={session.username}
                onClose={() => navigate('overview')}
                onSaved={setProfile}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
