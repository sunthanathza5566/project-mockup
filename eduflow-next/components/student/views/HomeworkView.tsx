'use client';

import { useState } from 'react';
import type { StudentProfile, Assignment } from '@/lib/types';
import { STU_COLORS } from './colors';
import { submitAssignment } from '@/lib/api/student.api';

interface Props {
  profile: StudentProfile;
  assignments: Assignment[];
  homeworkFilter: string;
  setHomeworkFilter: (f: string) => void;
  showToast: (m: string) => void;
}

const STATUS_FILTERS = ['all','pending','overdue','submitted','graded'];
const FILTERS = [
  { id:'all',       label:'ทั้งหมด' }, { id:'pending',   label:'ยังไม่ส่ง' },
  { id:'overdue',   label:'เกินกำหนด' }, { id:'submitted', label:'รอตรวจ' },
  { id:'graded',    label:'ได้คะแนนแล้ว' }, { id:'math', label:'คณิตศาสตร์' },
  { id:'thai',  label:'ภาษาไทย' }, { id:'sci', label:'วิทย์ฯ' },
  { id:'eng',   label:'อังกฤษ' },  { id:'social', label:'สังคมฯ' },
  { id:'com',   label:'คอมฯ' },
];
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label:'ยังไม่ส่ง',    cls:'badge-pending' },
  overdue:   { label:'เกินกำหนด',    cls:'badge-overdue' },
  submitted: { label:'รอตรวจ',       cls:'badge-submitted' },
  graded:    { label:'ได้คะแนนแล้ว', cls:'badge-graded' },
};

export default function HomeworkView({ profile, assignments, homeworkFilter, setHomeworkFilter, showToast }: Props) {
  const [submitId,   setSubmitId]   = useState<number | null>(null);
  const [submitNote, setSubmitNote] = useState('');

  let list = [...assignments];
  if (STATUS_FILTERS.includes(homeworkFilter)) {
    if (homeworkFilter !== 'all') list = list.filter(a => a.status === homeworkFilter);
  } else {
    list = list.filter(a => a.key === homeworkFilter);
  }

  const counts = {
    pending:   assignments.filter(a => a.status === 'pending').length,
    overdue:   assignments.filter(a => a.status === 'overdue').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
    graded:    assignments.filter(a => a.status === 'graded').length,
  };

  async function handleSubmit(id: number) {
    await submitAssignment(id, profile.studentId, submitNote, []);
    showToast('✅ ส่งการบ้านสำเร็จ!');
    setSubmitId(null);
    setSubmitNote('');
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📚 การบ้าน & งานที่มอบหมาย</h2>
        <p className="stu-page-sub">รวมทุกวิชา · ปีการศึกษา {profile.academicYear}</p>
      </div>

      {/* Summary */}
      <div className="stu-hw-summary-row">
        <div className="stu-hw-sum stu-hw-sum-pending"><strong>{counts.pending}</strong> ยังไม่ส่ง</div>
        <div className="stu-hw-sum stu-hw-sum-overdue"><strong>{counts.overdue}</strong> เกินกำหนด</div>
        <div className="stu-hw-sum stu-hw-sum-submitted"><strong>{counts.submitted}</strong> รอตรวจ</div>
        <div className="stu-hw-sum stu-hw-sum-graded"><strong>{counts.graded}</strong> ประเมินแล้ว</div>
      </div>

      {/* Filters */}
      <div className="stu-filters">
        {FILTERS.map(f => (
          <button key={f.id} className={`stu-filter-chip${homeworkFilter === f.id ? ' active' : ''}`} onClick={() => setHomeworkFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="stu-hw-cards">
        {list.length === 0
          ? <div className="stu-empty">ไม่มีการบ้านในหมวดนี้ ✓</div>
          : list.map(a => {
              const c   = STU_COLORS[a.key] || STU_COLORS.guidance;
              const st  = STATUS_MAP[a.status] || { label: a.status, cls: '' };
              const scored = a.myScore !== null ? `${a.myScore}/${a.maxScore} คะแนน` : `— /${a.maxScore} คะแนน`;
              return (
                <div key={a.id} className="stu-hw-card">
                  <div className="stu-hw-card-top">
                    <span className="stu-hw-subject-tag" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{a.subject}</span>
                    <span className={`stu-hw-status-badge ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="stu-hw-card-title">{a.title}</div>
                  <div className="stu-hw-card-meta">
                    <span>👩‍🏫 {a.teacher}</span>
                    <span>📅 ส่ง {a.due}</span>
                    <span>📊 {scored}</span>
                    {a.files > 0 && <span>📎 {a.files} ไฟล์</span>}
                  </div>
                  <details className="stu-hw-details">
                    <summary>รายละเอียด</summary>
                    <div className="stu-hw-desc">{a.details}</div>

                    {/* Submit form */}
                    {(a.status === 'pending' || a.status === 'overdue') && (
                      submitId === a.id ? (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            value={submitNote}
                            onChange={e => setSubmitNote(e.target.value)}
                            placeholder="หมายเหตุถึงครู (ไม่บังคับ)"
                            rows={3}
                            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', resize: 'vertical', outline: 'none' }}
                          />
                          {/* TODO(PostgreSQL): แนบไฟล์จริงจาก file input → upload to storage */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="stu-hw-submit-btn" onClick={() => handleSubmit(a.id)}>📤 ยืนยันส่งการบ้าน</button>
                            <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={() => setSubmitId(null)}>ยกเลิก</button>
                          </div>
                        </div>
                      ) : (
                        <button className="stu-hw-submit-btn" onClick={() => setSubmitId(a.id)}>📤 ส่งการบ้าน</button>
                      )
                    )}
                  </details>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
