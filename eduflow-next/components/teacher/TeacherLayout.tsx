'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getTeacherProfile, getTeacherClasses, getClassStudents, getTodayAttendance } from '@/lib/api/teacher.api';
import AttendanceView from './AttendanceView';
import type { TeacherProfile, ClassInfo, TeacherStudent } from '@/lib/types';

export default function TeacherLayout() {
  const { session, logout } = useAuth();
  const { showToast }       = useToast();
  const router              = useRouter();

  const [profile,     setProfile]     = useState<TeacherProfile | null>(null);
  const [classes,     setClasses]     = useState<ClassInfo[]>([]);
  const [selClass,    setSelClass]    = useState<string>('c1');
  const [students,    setStudents]    = useState<TeacherStudent[]>([]);
  const [currentView, setCurrentView] = useState<'overview' | 'attendance'>('overview');

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    if (session.role !== 'teacher') { router.push('/dashboard'); return; }
    const tid = session.username;
    Promise.all([getTeacherProfile(tid), getTeacherClasses(tid)]).then(([p, cls]) => {
      setProfile(p); setClasses(cls);
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
    </div>
  );
}
