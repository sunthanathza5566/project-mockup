'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getTeacherProfile, getTeacherClasses, getClassStudents, getTodayAttendance, getTeacherNotifications, markTeacherNotificationRead } from '@/lib/api/teacher.api';
import AttendanceView from './AttendanceView';
import type { TeacherProfile, ClassInfo, TeacherStudent, Notification } from '@/lib/types';

export default function TeacherLayout() {
  const { session, logout } = useAuth();
  const { showToast }       = useToast();
  const router              = useRouter();

  const [profile,     setProfile]     = useState<TeacherProfile | null>(null);
  const [classes,     setClasses]     = useState<ClassInfo[]>([]);
  const [selClass,    setSelClass]    = useState<string>('c1');
  const [students,    setStudents]    = useState<TeacherStudent[]>([]);
  const [currentView, setCurrentView] = useState<'overview' | 'attendance'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    if (session.role !== 'teacher') { router.push('/dashboard'); return; }
    const tid = session.username;
    Promise.all([getTeacherProfile(tid), getTeacherClasses(tid), getTeacherNotifications(tid)]).then(([p, cls, notifs]) => {
      setProfile(p); setClasses(cls); setNotifications(notifs);
      if (cls.length > 0) loadClass(cls[0].id);
    });
  }, [session]);

  async function loadClass(id: string) {
    setSelClass(id);
    const studs = await getClassStudents(id);
    setStudents(studs);
  }

  function handleLogout() { logout(); showToast('ออกจากระบบแล้ว'); router.push('/'); }

  if (!session || !profile) return null;

  const currentClass = classes.find(c => c.id === selClass);
  const initials     = profile.name.replace(/\s+/g,'').substring(0, 2);

  return (
    <div>
      <nav className="dash-nav">
        <div className="dash-logo" onClick={() => router.push('/')}>Edu<span>Flow</span></div>

        {/* Notification bell */}
        <button
          onClick={() => setNotifOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            position: 'relative',
            padding: '0.5rem 1rem',
            marginRight: 'auto',
          }}
        >
          🔔
          {notifications.filter(n => n.isNew).length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0.3rem',
              background: '#f44336',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}>
              {notifications.filter(n => n.isNew).length}
            </span>
          )}
        </button>

        {/* Profile menu */}
        <button
          onClick={() => setProfileMenuOpen(o => !o)}
          className="dash-user-info"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="dash-user-avatar">{initials}</div>
          <div>
            <div className="dash-user-name">{profile.name}</div>
            <div className="dash-user-role">ครู · {profile.school}</div>
          </div>
        </button>

        <button className="dash-logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      <div className="dash-content">
        {currentView === 'overview' ? (
          <>
            <div className="dash-section">
              <div className="section-label">ครู · {profile.school}</div>
              <h2 className="dash-h2">สวัสดี คุณครู<em>{profile.name.replace('ครู','').trim()}</em></h2>

              <div className="dash-kpi-row">
                {[{ num: classes.length, label: 'ห้องที่สอน' }, { num: students.length, label: 'นักเรียนในห้องนี้' }, { num: 3, label: 'คาบวันนี้' }].map((k, i) => (
                  <div key={i} className="dash-kpi">
                    <div className="dash-kpi-num">{k.num}</div>
                    <div className="dash-kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Class selector */}
            <div className="dash-section">
              <div className="dash-section-title">เลือกห้องเรียน</div>
              <div className="dash-tabs-bar">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    className={`dash-tab-btn${selClass === cls.id ? ' active' : ''}`}
                    onClick={() => loadClass(cls.id)}
                  >
                    {cls.icon} {cls.grade}/{cls.room} {cls.subject}
                  </button>
                ))}
              </div>

              {currentClass && (
                <div className="dash-section">
                  <div className="dash-section-title">รายชื่อนักเรียน — {currentClass.grade}/{currentClass.room} ({students.length} คน)</div>
                  <div className="dash-list">
                    {students.map(s => (
                      <div key={s.id} className="admin-user-row">
                        <div className="dash-user-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                          {s.name.substring(0, 2)}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{s.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="dash-actions-row">
                <button className="dash-action-btn" onClick={() => setCurrentView('attendance')}>🔲 สร้าง QR Code เช็คชื่อ</button>
                <button className="dash-action-btn" onClick={() => showToast('📊 กำลังดูรายงาน...')}>📊 ดูรายงาน</button>
                <button className="dash-action-btn" onClick={() => showToast('📚 กำลังมอบหมายการบ้าน...')}>📚 มอบหมายการบ้าน</button>
                <button className="dash-action-btn" onClick={() => showToast('📁 กำลังอัปโหลดสื่อการสอน...')}>📁 อัปโหลดสื่อการสอน</button>
              </div>
            </div>

            <div style={{ background: 'var(--cream)', border: '1px dashed var(--border)', borderRadius: 12, padding: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong>TODO (Teacher Dashboard):</strong> หน้านี้จะมีฟีเจอร์เพิ่มเติมเมื่อเชื่อมกับ PostgreSQL:<br />
              · ✅ เช็คชื่อนักเรียนแต่ละคาบแบบ QR Code (เสร็จแล้ว)<br />
              · ดู/ให้คะแนนการบ้านที่ส่งมา<br />
              · อัปโหลดสื่อการสอน (ไฟล์, วิดีโอ, ลิงก์)<br />
              · โพสต์ประกาศให้นักเรียน<br />
              · ดูสถิติการเข้าเรียนรายบุคคล
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setCurrentView('overview')}
              style={{
                padding: '0.5rem 1rem',
                marginBottom: '1.5rem',
                background: 'var(--brown-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              ← ย้อนกลับ
            </button>
            {currentClass && (
              <AttendanceView teacherId={session.username} selectedClass={currentClass} />
            )}
          </>
        )}
      </div>

      {/* Notification overlay */}
      <div className={`stu-notif-overlay${notifOpen ? ' show' : ''}`} onClick={() => setNotifOpen(false)} />
      <div className={`stu-notif-panel${notifOpen ? ' open' : ''}`}>
        <div className="stu-notif-ph">
          <span className="stu-notif-ph-title">การแจ้งเตือน</span>
          <button className="stu-notif-ph-close" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="stu-notif-list-inner">
          {notifications.length === 0 ? (
            <div className="stu-notif-empty">🔕<br />ไม่มีแจ้งเตือนใหม่</div>
          ) : (
            notifications.map(n => {
              const typeMap: Record<string, string> = {
                attendance_report: 'type-grade',
                assignment_submitted: 'type-grade',
                info: 'type-info',
                overdue: 'type-overdue',
                grade: 'type-grade',
                hw: 'type-info',
              };
              const iconMap: Record<string, string> = {
                attendance_report: '📊',
                assignment_submitted: '📝',
                info: '📢',
                overdue: '⛔',
                grade: '📊',
                hw: '📚',
              };
              return (
                <div
                  key={n.id}
                  className={`stu-notif-item ${typeMap[n.type] || 'type-info'}${n.isNew ? ' is-new' : ''}`}
                  onClick={() => {
                    markTeacherNotificationRead(n.id);
                    setNotifications(prev => prev.map(notif =>
                      notif.id === n.id ? { ...notif, isNew: false } : notif
                    ));
                  }}
                >
                  <div className="stu-notif-item-row">
                    {n.isNew && <div className="stu-notif-new-dot" />}
                    <div className="stu-notif-item-icon">{iconMap[n.type] || '📢'}</div>
                    <div className="stu-notif-item-content">
                      <div className="stu-notif-item-title">{n.title}</div>
                      <div className="stu-notif-item-body">{n.body}</div>
                      <div className="stu-notif-item-time">{new Date(n.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Profile Menu */}
      {profileMenuOpen && (
        <>
          <div
            onClick={() => setProfileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '70px',
              right: '1.5rem',
              background: 'white',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              minWidth: '200px',
            }}
          >
            <button
              onClick={() => {
                setEditingProfile(true);
                setProfileMenuOpen(false);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: 'var(--brown-dark)',
                borderBottom: '1px solid var(--border-light)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              ✏️ แก้ไขโปรไฟล์
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: '#f44336',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,67,54,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <>
          <div
            onClick={() => setEditingProfile(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              zIndex: 201,
            }}
          >
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--brown-dark)' }}>แก้ไขโปรไฟล์ครู</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
                โรงเรียน
              </label>
              <input
                type="text"
                value={profile.school}
                onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
                วิชาที่สอน
              </label>
              <input
                type="text"
                value={profile.subject}
                onChange={(e) => setProfile({ ...profile, subject: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                onClick={() => {
                  showToast('✅ บันทึกโปรไฟล์สำเร็จ');
                  setEditingProfile(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--brown-dark)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                💾 บันทึก
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: 'var(--brown-dark)',
                  border: '2px solid var(--brown-dark)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
