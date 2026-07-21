'use client';

import { useEffect, useState, useCallback } from 'react';
import { getClassAssignments, createAssignment, gradeSubmission, getClassStudents, type StoredAssignment } from '@/lib/api/teacher.api';
import type { ClassInfo, TeacherStudent } from '@/lib/types';
import { STU_COLORS } from '@/components/student/views/colors';
import { logActivity } from '@/lib/api/activity.log';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherName: string;
  teacherId?: string;   // ใช้ส่งแจ้งเตือนกลับหาครูเจ้าของงานเมื่อนักเรียนส่งงาน
  selectedClass: ClassInfo;
}

export default function AssignmentsView({ teacherName, teacherId, selectedClass }: Props) {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState<StoredAssignment[]>([]);
  const [students,    setStudents]    = useState<TeacherStudent[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [openId,      setOpenId]      = useState<number | null>(null);

  // ── Create form state ──
  const [title,    setTitle]    = useState('');
  const [details,  setDetails]  = useState('');
  const [due,      setDue]      = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [submitType, setSubmitType] = useState<'pdf' | 'video' | 'slides'>('pdf');

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
      maxScore, teacher: teacherName, teacherId, submitType,
    });
    logActivity('teacher', 'สั่งการบ้าน', `${title.trim()} — ${selectedClass.grade}/${selectedClass.room} ${selectedClass.subject}`);
    showToast('✅ มอบหมายการบ้านแล้ว — แจ้งเตือนถึงนักเรียนทุกคนในห้อง');
    setTitle(''); setDetails(''); setDue(''); setMaxScore(10); setSubmitType('pdf'); setShowForm(false);
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
    logActivity('teacher', 'ให้คะแนนการบ้าน', `นักเรียน ${studentCode} ได้ ${score}/${maxScoreOfWork} — ${selectedClass.grade}/${selectedClass.room} ${selectedClass.subject}`);
    showToast('✅ ให้คะแนนแล้ว — แจ้งเตือนถึงนักเรียน');
    refresh();
  }

  const c = STU_COLORS[selectedClass.key] || STU_COLORS.guidance;

  return (
    <div className="dash-section">
      <div className="ez-title">📚 การบ้าน — ห้อง {selectedClass.grade}/{selectedClass.room} วิชา{selectedClass.subject}</div>
      <div className="ez-subtitle">สั่งการบ้าน ดูว่าใครส่งแล้ว และกดตรวจให้คะแนนได้จากหน้านี้</div>

      {/* ── สั่งการบ้านใหม่ ── */}
      {!showForm ? (
        <button className="ez-btn ez-btn-primary" style={{ marginBottom: '1.5rem' }} onClick={() => setShowForm(true)}>
          ➕ สั่งการบ้านใหม่
        </button>
      ) : (
        <div style={{ background: 'var(--cream)', border: '2px solid var(--border)', borderRadius: 14, padding: '1.4rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brown-dark)' }}>📝 สั่งการบ้านใหม่ — วิชา{selectedClass.subject}</div>
          <div>
            <label className="ez-label">ชื่องาน</label>
            <input className="ez-input" placeholder="เช่น แบบฝึกหัดบทที่ 4" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="ez-label">รายละเอียดงาน (ไม่บังคับ)</label>
            <textarea className="ez-input" style={{ resize: 'vertical', minHeight: 90 }} rows={3} placeholder="อธิบายสิ่งที่ให้นักเรียนทำ" value={details} onChange={e => setDetails(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="ez-label">กำหนดส่ง (วัน/เดือน/ปี พ.ศ.)</label>
              <input className="ez-input" placeholder="เช่น 20/07/2569" value={due} onChange={e => setDue(e.target.value)} />
            </div>
            <div>
              <label className="ez-label">คะแนนเต็ม</label>
              <input className="ez-input" type="number" min={1} value={maxScore} onChange={e => setMaxScore(parseInt(e.target.value) || 10)} />
            </div>
            <div>
              <label className="ez-label">ประเภทไฟล์ที่ให้นักเรียนส่ง</label>
              <select className="ez-input" value={submitType} onChange={e => setSubmitType(e.target.value as 'pdf' | 'video' | 'slides')} style={{ cursor: 'pointer' }}>
                <option value="pdf">📄 ใบงาน/เอกสาร — PDF เท่านั้น</option>
                <option value="video">🎬 คลิปวิดีโอ</option>
                <option value="slides">📑 สไลด์นำเสนอ (.ppt/.pptx/PDF)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="ez-btn ez-btn-success" onClick={handleCreate}>📤 มอบหมายงานให้นักเรียน</button>
            <button className="ez-btn ez-btn-ghost" onClick={() => setShowForm(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* ── รายการการบ้าน ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {assignments.length === 0
          ? <div className="stu-empty" style={{ fontSize: '1.05rem' }}>ยังไม่มีการบ้านในห้องนี้ — กดปุ่ม &quot;สั่งการบ้านใหม่&quot; ด้านบนเพื่อเริ่ม</div>
          : assignments.map(a => {
              const subs = Object.values(a.submissions);
              const gradedCount  = subs.filter(s => s.status === 'graded').length;
              const waiting      = subs.filter(s => s.status === 'submitted');
              const notSubmitted = students.filter(s => !a.submissions[s.code]);
              const isOpen = openId === a.id;
              return (
                <div key={a.id} style={{ background: 'var(--cream)', border: `2px solid ${waiting.length > 0 ? 'rgba(196,128,74,0.5)' : 'var(--border)'}`, borderRadius: 14, padding: '1.25rem' }}>
                  {/* หัวการ์ด */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span className="ez-badge" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{a.subject}</span>
                    {waiting.length > 0
                      ? <span className="ez-badge ez-badge-wait">⏳ รอตรวจ {waiting.length} งาน</span>
                      : <span className="ez-badge ez-badge-done">✅ ตรวจครบแล้ว</span>}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.5rem' }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span>📅 กำหนดส่ง {a.due}</span>
                    <span>💯 คะแนนเต็ม {a.maxScore}</span>
                    <span>📥 ส่งแล้ว {subs.length} จาก {students.length} คน</span>
                  </div>

                  {/* ปุ่มเปิด/ปิดโซนตรวจงาน — ชัดเจน ไม่ซ่อน */}
                  <button
                    className={`ez-btn ${waiting.length > 0 ? 'ez-btn-primary' : 'ez-btn-ghost'}`}
                    onClick={() => setOpenId(isOpen ? null : a.id)}
                  >
                    {isOpen ? '▲ ปิดหน้าตรวจงาน' : waiting.length > 0 ? `📝 ตรวจงาน (รอตรวจ ${waiting.length} งาน)` : '👁️ ดูงานที่ตรวจแล้ว'}
                  </button>

                  {isOpen && (
                    <div style={{ marginTop: '1.1rem' }}>
                      {a.details && (
                        <div style={{ fontSize: '1rem', color: 'var(--text-body)', lineHeight: 1.7, padding: '0.9rem 1.1rem', background: 'var(--warm-white)', borderRadius: 10, marginBottom: '1rem' }}>
                          📖 โจทย์: {a.details}
                        </div>
                      )}

                      {/* งานของนักเรียนแต่ละคน */}
                      {subs.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {subs.map(sub => {
                            const key = `${a.id}:${sub.studentCode}`;
                            return (
                              <div key={sub.studentCode} className={`ez-student-card${sub.status === 'submitted' ? ' waiting' : ''}`}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                  <div className="dash-user-avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>{sub.studentName.substring(0, 2)}</div>
                                  <div style={{ flex: 1, minWidth: 140 }}>
                                    <div className="ez-student-name">{sub.studentName}</div>
                                    <div className="ez-student-meta">
                                      รหัส {sub.studentCode} · ส่งเมื่อ {new Date(sub.submittedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} น.
                                    </div>
                                  </div>
                                  {sub.status === 'graded'
                                    ? <span className="ez-badge ez-badge-done">✅ ได้ {sub.score} / {a.maxScore} คะแนน</span>
                                    : <span className="ez-badge ez-badge-wait">⏳ รอตรวจ</span>}
                                </div>
                                {sub.fileName && (
                                  <div style={{ fontSize: '0.95rem', color: 'var(--brown-dark)', marginBottom: '0.4rem', background: 'var(--cream)', borderRadius: 8, padding: '0.4rem 0.7rem', display: 'inline-block' }}>
                                    📎 ไฟล์แนบ: <b>{sub.fileName}</b>{sub.fileSize ? ` (${sub.fileSize > 1048576 ? (sub.fileSize / 1048576).toFixed(1) + ' MB' : Math.ceil(sub.fileSize / 1024) + ' KB'})` : ''}
                                  </div>
                                )}
                                {sub.note && <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📝 นักเรียนฝากบอก: {sub.note}</div>}

                                {sub.status === 'submitted' ? (
                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)' }}>
                                    <div>
                                      <label className="ez-label">คะแนนที่ได้ (เต็ม {a.maxScore})</label>
                                      <input
                                        className="ez-score-input"
                                        type="number" min={0} max={a.maxScore}
                                        placeholder={`0–${a.maxScore}`}
                                        value={gradeScores[key] || ''}
                                        onChange={e => setGradeScores(p => ({ ...p, [key]: e.target.value }))}
                                      />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 180 }}>
                                      <label className="ez-label">คำชม / คำแนะนำ (ไม่บังคับ)</label>
                                      <input
                                        className="ez-input"
                                        placeholder="เช่น ทำได้ดีมาก"
                                        value={gradeNotes[key] || ''}
                                        onChange={e => setGradeNotes(p => ({ ...p, [key]: e.target.value }))}
                                      />
                                    </div>
                                    <button className="ez-btn ez-btn-success" onClick={() => handleGrade(a.id, sub.studentCode, a.maxScore)}>
                                      ✅ ให้คะแนน
                                    </button>
                                  </div>
                                ) : (
                                  sub.teacherNote && <div style={{ fontSize: '1rem', color: 'var(--success)', fontWeight: 600 }}>💬 คอมเมนต์ของครู: {sub.teacherNote}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* นักเรียนที่ยังไม่ส่ง */}
                      {notSubmitted.length > 0 && (
                        <div style={{ marginTop: '1rem', background: 'rgba(160,80,80,0.06)', border: '1px solid rgba(160,80,80,0.2)', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--absent)', marginBottom: '0.5rem' }}>
                            ⏳ ยังไม่ส่งงาน ({notSubmitted.length} คน)
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {notSubmitted.map(s => (
                              <span key={s.id} style={{ fontSize: '0.95rem', background: 'var(--warm-white)', color: 'var(--text-body)', padding: '0.35rem 0.85rem', borderRadius: 50, border: '1px solid var(--border)' }}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
