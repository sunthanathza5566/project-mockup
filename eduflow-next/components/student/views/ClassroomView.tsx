'use client';

import { useEffect, useState } from 'react';
import type { StudentProfile, Subject, Assignment } from '@/lib/types';
import type { StudentView } from '../StudentLayout';
import { STU_COLORS } from './colors';
import { getMaterials, getAnnouncements, type Material, type Announcement } from '@/lib/api/materials.store';
import { getStudentClassIds } from '@/lib/api/class-resolver';

interface Props {
  profile: StudentProfile;
  subjects: Subject[];
  assignments: Assignment[];
  setView: (v: StudentView) => void;
  setHomeworkFilter: (f: string) => void;
}

const MATERIAL_ICONS: Record<string, string> = { file: '📄', video: '🎬', link: '🔗' };

export default function ClassroomView({ profile, subjects, assignments, setView, setHomeworkFilter }: Props) {
  const [materials,     setMaterials]     = useState<Material[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // รวมสื่อ/ประกาศจากทุกวิชาที่นักเรียนเรียนอยู่ (ห้องเดิม + ห้องจริงจากตารางเรียน)
    // TODO(PostgreSQL): ดึงจาก enrollments จริงด้วย JOIN เดียว
    const ids = getStudentClassIds(profile.studentId);
    setMaterials(ids.flatMap(id => getMaterials(id)).sort((a, b) => b.createdAt - a.createdAt));
    setAnnouncements(ids.flatMap(id => getAnnouncements(id)).sort((a, b) => b.createdAt - a.createdAt));
  }, [profile.studentId]);

  function filterHomework(key: string) {
    setHomeworkFilter(key);
    setView('homework');
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">🏫 ห้องเรียนของฉัน</h2>
        <p className="stu-page-sub">ชั้น {profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</p>
      </div>

      {/* ── ประกาศจากครู ── */}
      {announcements.length > 0 && (
        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: 'var(--cream)', border: `1px solid ${a.pinned ? 'var(--brown-light)' : 'var(--border)'}`, borderRadius: 12, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.88rem' }}>
                📢 {a.pinned && '📌 '}{a.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginTop: '0.3rem', lineHeight: 1.6 }}>{a.body}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {a.teacherName} · {new Date(a.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── สื่อการสอนจากครู ── */}
      {materials.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.6rem' }}>📁 สื่อการสอนล่าสุด</div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {materials.map(m => (
              <div key={m.id} style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.7rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.15rem' }}>{MATERIAL_ICONS[m.type] || '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--brown-dark)' }}>{m.title}</div>
                  {m.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.description}</div>}
                </div>
                {m.type !== 'file' && m.url.startsWith('http') ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brown-deep)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>เปิด →</a>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.url}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stu-cls-grid">
        {subjects.map(s => {
          const c   = STU_COLORS[s.key] || STU_COLORS.guidance;
          const hw  = assignments.filter(a => a.key === s.key && (a.status === 'pending' || a.status === 'overdue'));
          return (
            <div key={s.key} className="stu-cls-card" style={{ borderTop: `3px solid ${c.dot}` }}>
              <div className="stu-cls-icon">{s.icon}</div>
              <div className="stu-cls-name">{s.name}</div>
              <div className="stu-cls-teacher">{s.teacher}</div>
              <div className="stu-cls-stats">
                <div>
                  <div className="stu-cls-stat-label">การเข้าเรียน</div>
                  <div className="stu-cls-bar-wrap">
                    <div className="stu-cls-bar-fill" style={{ width: `${s.attend}%`, background: c.dot }} />
                  </div>
                  <div className="stu-cls-stat-val" style={{ color: c.dot }}>{s.attend}%</div>
                </div>
                <div>
                  <div className="stu-cls-stat-label">คะแนนกลางภาค</div>
                  <div className="stu-cls-stat-big">{s.midterm !== null ? s.midterm : '—'}</div>
                </div>
                <div>
                  <div className="stu-cls-stat-label">งานที่มอบหมาย</div>
                  <div className="stu-cls-stat-big">{s.done}/{s.assign}</div>
                </div>
              </div>
              {hw.length > 0 && (
                <div className="stu-cls-hw-alert">📌 มีการบ้านค้างอยู่ {hw.length} ชิ้น</div>
              )}
              <button className="stu-cls-btn" onClick={() => filterHomework(s.key)}>ดูการบ้านวิชานี้ →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
