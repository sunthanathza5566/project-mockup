'use client';

import { useEffect, useState, useCallback } from 'react';
import { getClassAssignments, createAssignment, gradeSubmission, getClassStudents, type StoredAssignment } from '@/lib/api/teacher.api';
import type { ClassInfo, TeacherStudent } from '@/lib/types';
import { STU_COLORS } from '@/components/student/views/colors';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherName: string;
  selectedClass: ClassInfo;
}

export default function AssignmentsView({ teacherName, selectedClass }: Props) {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState<StoredAssignment[]>([]);
  const [students,    setStudents]    = useState<TeacherStudent[]>([]);
  const [showForm,    setShowForm]    = useState(false);

  // ── Create form state ──
  const [title,    setTitle]    = useState('');
  const [details,  setDetails]  = useState('');
  const [due,      setDue]      = useState('');
  const [maxScore, setMaxScore] = useState(10);

  // ── Grading state ──
  const [gradeScores, setGradeScores] = useState<Record<string, string>>({});
  const [gradeNotes,  setGradeNotes]  = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const [asgn, studs] = await Promise.all([
      getClassAssignments(selectedClass.id),
      getClassStudents(selectedClass.id),
    ]);
    setAssignments(asgn);
    setStudents(studs);
  }, [selectedClass.id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!title.trim() || !due.trim()) { showToast('⚠️ กรอกชื่องานและกำหนดส่งก่อน'); return; }
    await createAssignment({
      classId: selectedClass.id, key: selectedClass.key, subject: selectedClass.subject,
      title: title.trim(), details: details.trim(), due: due.trim(),
      maxScore, teacher: teacherName,
    });
    showToast('✅ มอบหมายการบ้านแล้ว — แจ้งเตือนถึงนักเรียนทุกคนในห้อง');
    setTitle(''); setDetails(''); setDue(''); setMaxScore(10); setShowForm(false);
    refresh();
  }

  async function handleGrade(assignmentId: number, studentCode: string, maxScoreOfWork: number) {
    const key = `${assignmentId}:${studentCode}`;
    const score = parseFloat(gradeScores[key]);
    if (isNaN(score) || score < 0 || score > maxScoreOfWork) {
      showToast(`⚠️ คะแนนต้องอยู่ระหว่าง 0–${maxScoreOfWork}`);
      return;
    }
    await gradeSubmission(assignmentId, studentCode, score, gradeNotes[key] || '');
    showToast('✅ ให้คะแนนแล้ว — แจ้งเตือนถึงนักเรียน');
    refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)',
    borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem',
    outline: 'none', background: 'var(--warm-white)', color: 'var(--text-body)',
  };

  const c = STU_COLORS[selectedClass.key] || STU_COLORS.guidance;

  return (
    <div className="dash-section">
      <div className="dash-section-title">
        📚 การบ้าน — {selectedClass.grade}/{selectedClass.room} {selectedClass.subject}
      </div>

      {/* ── สร้างการบ้านใหม่ ── */}
      {!showForm ? (
        <button className="dash-action-btn" style={{ marginBottom: '1.25rem' }} onClick={() => setShowForm(true)}>
          ➕ สั่งการบ้านใหม่
        </button>
      ) : (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.9rem' }}>สั่งการบ้านใหม่ — {selectedClass.subject}</div>
          <input style={inputStyle} placeholder="ชื่องาน เช่น แบบฝึกหัดบทที่ 4" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="รายละเอียดงาน" value={details} onChange={e => setDetails(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>กำหนดส่ง (วว/ดด/ปปปป พ.ศ.)</label>
              <input style={inputStyle} placeholder="เช่น 20/07/2569" value={due} onChange={e => setDue(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>คะแนนเต็ม</label>
              <input style={inputStyle} type="number" min={1} value={maxScore} onChange={e => setMaxScore(parseInt(e.target.value) || 10)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="dash-action-btn" onClick={handleCreate}>📤 มอบหมายงาน</button>
            <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={() => setShowForm(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* ── รายการการบ้าน ── */}
      <div className="stu-hw-cards">
        {assignments.length === 0
          ? <div className="stu-empty">ยังไม่มีการบ้านในห้องนี้ — กด "สั่งการบ้านใหม่" เพื่อเริ่ม</div>
          : assignments.map(a => {
              const subs = Object.values(a.submissions);
              const gradedCount = subs.filter(s => s.status === 'graded').length;
              const waiting     = subs.filter(s => s.status === 'submitted');
              const notSubmitted = students.filter(s => !a.submissions[s.code]);
              return (
                <div key={a.id} className="stu-hw-card">
                  <div className="stu-hw-card-top">
                    <span className="stu-hw-subject-tag" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{a.subject}</span>
                    <span className={`stu-hw-status-badge ${waiting.length > 0 ? 'badge-submitted' : 'badge-graded'}`}>
                      {waiting.length > 0 ? `รอตรวจ ${waiting.length} งาน` : 'ตรวจครบแล้ว'}
                    </span>
                  </div>
                  <div className="stu-hw-card-title">{a.title}</div>
                  <div className="stu-hw-card-meta">
                    <span>📅 ส่ง {a.due}</span>
                    <span>📊 เต็ม {a.maxScore} คะแนน</span>
                    <span>📥 ส่งแล้ว {subs.length}/{students.length} คน</span>
                    <span>✅ ตรวจแล้ว {gradedCount}</span>
                  </div>

                  <details className="stu-hw-details">
                    <summary>รายละเอียด & ตรวจงาน</summary>
                    <div className="stu-hw-desc">{a.details || '—'}</div>

                    {/* งานที่รอตรวจ / ตรวจแล้ว */}
                    {subs.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {subs.map(sub => {
                          const key = `${a.id}:${sub.studentCode}`;
                          return (
                            <div key={sub.studentCode} style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                                <div className="dash-user-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{sub.studentName.substring(0, 2)}</div>
                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--brown-dark)' }}>{sub.studentName}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{sub.studentCode}</span>
                                {sub.status === 'graded'
                                  ? <span className="stu-hw-status-badge badge-graded">{sub.score}/{a.maxScore}</span>
                                  : <span className="stu-hw-status-badge badge-submitted">รอตรวจ</span>}
                              </div>
                              {sub.note && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>📝 หมายเหตุนักเรียน: {sub.note}</div>}
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                ส่งเมื่อ {new Date(sub.submittedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>

                              {sub.status === 'submitted' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <input
                                    style={{ ...inputStyle, width: 90 }}
                                    type="number" min={0} max={a.maxScore}
                                    placeholder={`0–${a.maxScore}`}
                                    value={gradeScores[key] || ''}
                                    onChange={e => setGradeScores(p => ({ ...p, [key]: e.target.value }))}
                                  />
                                  <input
                                    style={{ ...inputStyle, flex: 1, minWidth: 140 }}
                                    placeholder="คอมเมนต์ถึงนักเรียน (ไม่บังคับ)"
                                    value={gradeNotes[key] || ''}
                                    onChange={e => setGradeNotes(p => ({ ...p, [key]: e.target.value }))}
                                  />
                                  <button className="stu-hw-submit-btn" onClick={() => handleGrade(a.id, sub.studentCode, a.maxScore)}>
                                    ✅ ให้คะแนน
                                  </button>
                                </div>
                              ) : (
                                sub.teacherNote && <div style={{ fontSize: '0.78rem', color: 'var(--success)' }}>💬 คอมเมนต์: {sub.teacherNote}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* นักเรียนที่ยังไม่ส่ง */}
                    {notSubmitted.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--absent)', marginBottom: '0.35rem' }}>
                          ⏳ ยังไม่ส่ง ({notSubmitted.length} คน)
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {notSubmitted.map(s => (
                            <span key={s.id} style={{ fontSize: '0.72rem', background: 'var(--cream-dark)', color: 'var(--text-muted)', padding: '0.2rem 0.6rem', borderRadius: 50 }}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
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
