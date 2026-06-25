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
        <div className="dash-user-info">
          <div className="dash-user-avatar">{initials}</div>
          <div>
            <div className="dash-user-name">{profile.name}</div>
            <div className="dash-user-role">ครู · {profile.school}</div>
          </div>
        </div>
        <button
          onClick={() => setNotifOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            position: 'relative',
            padding: '0.5rem 1rem',
          }}
        >
          🔔
          {notifications.filter(n => n.isNew).length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: '#f44336',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}>
              {notifications.filter(n => n.isNew).length}
            </span>
          )}
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

      {/* Notification Panel */}
      {notifOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: '3.5rem',
              right: 0,
              width: '350px',
              maxWidth: '90vw',
              maxHeight: 'calc(100vh - 4rem)',
              background: 'white',
              borderLeft: '1px solid var(--border-light)',
              boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
              overflowY: 'auto',
              zIndex: 999,
            }}
          >
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-light)',
              fontWeight: '600',
              color: 'var(--brown-dark)',
            }}>
              🔔 แจ้งเตือน ({notifications.length})
            </div>
            <div>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}>
                  ไม่มีแจ้งเตือน
                </div>
              ) : (
                notifications.map(n => {
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
                      onClick={() => {
                        markTeacherNotificationRead(n.id);
                        setNotifications(prev => prev.map(notif =>
                          notif.id === n.id ? { ...notif, isNew: false } : notif
                        ));
                      }}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        background: n.isNew ? 'rgba(61,43,26,0.03)' : 'white',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(61,43,26,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = n.isNew ? 'rgba(61,43,26,0.03)' : 'white')}
                    >
                      {n.isNew && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#f44336',
                          marginBottom: '0.5rem',
                        }} />
                      )}
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--brown-dark)', marginBottom: '0.25rem' }}>
                        {iconMap[n.type] || '📢'} {n.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(n.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div
            onClick={() => setNotifOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0)',
              zIndex: 998,
            }}
          />
        </>
      )}
    </div>
  );
}
