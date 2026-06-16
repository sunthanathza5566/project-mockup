'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SCHOOL_LEVEL_SEGMENTS } from '@/lib/mock-data';
import { Suspense } from 'react';

function SchoolsContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const levelKey     = searchParams.get('level') || 'primary';
  const seg          = SCHOOL_LEVEL_SEGMENTS.find(s => s.key === levelKey) || SCHOOL_LEVEL_SEGMENTS[1];

  // TODO(PostgreSQL): ดึงจาก GET /api/schools?level=${levelKey}
  const mockSchools = [
    { id: 1, name: 'โรงเรียนทดสอบ EduFlow', district: 'เขตบางนา', province: 'กรุงเทพฯ', logo: '🏫', rating: 4.8, students: 1240, teachers: 42, tags: ['Smart School', 'STEM', 'English Program'] },
    { id: 2, name: 'โรงเรียนตัวอย่างที่ 2', district: 'เขตลาดกระบัง', province: 'กรุงเทพฯ', logo: '📚', rating: 4.5, students: 980, teachers: 35, tags: ['Art & Music', 'Sport'] },
    { id: 3, name: 'โรงเรียนตัวอย่างที่ 3', district: 'อำเภอเมือง', province: 'เชียงใหม่', logo: '🌿', rating: 4.7, students: 760, teachers: 28, tags: ['EF Program', 'Bilingual'] },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--warm-white)' }}>
      <nav className="schools-nav">
        <button className="back-btn" onClick={() => router.push('/')}>← กลับ</button>
        <div className="breadcrumb">
          หน้าหลัก / <span>{seg.label}</span>
        </div>
      </nav>

      <div className="schools-hero">
        <div>
          <h2>โรงเรียน<em>{seg.label}</em><br />ที่ใช้ EduFlow</h2>
          <p>พบโรงเรียนในระดับ{seg.label}ที่เข้าร่วมโครงการ EduFlow</p>
        </div>
        <div className="hero-kpi">
          <div className="kpi-box">
            <div className="kpi-num">{Math.round(847 * seg.pct / 100)}</div>
            <div className="kpi-label">โรงเรียน</div>
          </div>
          <div className="kpi-box" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
            <div className="kpi-num">4.7</div>
            <div className="kpi-label">คะแนนเฉลี่ย</div>
          </div>
        </div>
      </div>

      <div className="schools-body">
        <div className="schools-toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="ค้นหาโรงเรียน..." />
          </div>
          <select style={{ padding: '0.55rem 1rem', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', background: 'var(--cream)', outline: 'none', cursor: 'pointer' }}>
            <option>เรียงตามคะแนน</option>
            <option>เรียงตามชื่อ</option>
            <option>เรียงตามจำนวนนักเรียน</option>
          </select>
        </div>

        <div className="schools-grid">
          {mockSchools.map(school => (
            <div key={school.id} className="school-card">
              <div className="school-card-header">
                <div className="school-logo">{school.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="school-name">{school.name}</div>
                  <div className="school-meta">{school.district}, {school.province}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 500, color: 'var(--brown-deep)', background: 'var(--cream-dark)', padding: '0.2rem 0.5rem', borderRadius: 6, flexShrink: 0 }}>
                  ⭐ {school.rating}
                </div>
              </div>
              <div className="school-tags">
                {school.tags.map(tag => <span key={tag} className="school-tag">{tag}</span>)}
              </div>
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>👥 {school.students.toLocaleString('th-TH')} นักเรียน</span>
                <span>👩‍🏫 {school.teachers} ครู</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense>
      <SchoolsContent />
    </Suspense>
  );
}
