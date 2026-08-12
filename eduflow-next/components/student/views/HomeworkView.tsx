'use client';

import { useState, useRef } from 'react';
import type { StudentProfile, Assignment, SubmitFileType } from '@/lib/types';
import { STU_COLORS } from './colors';
import { submitAssignment } from '@/lib/api/student.api';

interface Props {
  profile: StudentProfile;
  assignments: Assignment[];
  homeworkFilter: string;
  setHomeworkFilter: (f: string) => void;
  showToast: (m: string) => void;
  refreshAssignments?: () => Promise<void>;
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

/** กติกาไฟล์ตามที่ครูกำหนด: pdf = ใบงาน/เอกสาร (บังคับ .pdf เท่านั้น), video/slides ตามงานที่สั่ง */
const FILE_RULES: Record<SubmitFileType, { accept: string; label: string; check: (f: File) => boolean }> = {
  pdf:    { accept: '.pdf,application/pdf', label: 'ไฟล์ PDF เท่านั้น (.pdf)', check: f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') },
  video:  { accept: 'video/*',              label: 'ไฟล์วิดีโอ (.mp4, .mov ฯลฯ)', check: f => f.type.startsWith('video/') },
  slides: { accept: '.ppt,.pptx,.pdf',      label: 'ไฟล์สไลด์ (.ppt, .pptx) หรือ PDF', check: f => /\.(pptx?|pdf)$/i.test(f.name) },
};

export default function HomeworkView({ profile, assignments, homeworkFilter, setHomeworkFilter, showToast, refreshAssignments }: Props) {
  const [submitId,    setSubmitId]    = useState<number | null>(null);
  const [submitNote,  setSubmitNote]  = useState('');
  const [file,        setFile]        = useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function openSubmitForm(id: number) {
    setSubmitId(id); setSubmitNote(''); setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  }

  function handlePickFile(a: Assignment, f: File | undefined) {
    if (!f) return;
    const rule = FILE_RULES[a.submitType || 'pdf'];
    if (!rule.check(f)) {
      showToast(`งานนี้ครูกำหนดให้ส่ง ${rule.label} — ไฟล์ "${f.name}" ไม่ตรงประเภท`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function confirmSubmit(a: Assignment) {
    if (!file) { showToast('แนบไฟล์งานก่อนส่ง'); return; }
    const name = `${profile.firstName} ${profile.lastName}`.trim() || profile.studentId;
    await submitAssignment(a.id, profile.studentId, name, submitNote, { name: file.name, size: file.size });
    showToast('ส่งการบ้านสำเร็จ! — แจ้งเตือนถึงครูแล้ว');
    setConfirmOpen(false); setSubmitId(null); setSubmitNote(''); setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    await refreshAssignments?.();
  }

  const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

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
              const rule = FILE_RULES[a.submitType || 'pdf'];
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
                    <span>📎 {rule.label}</span>
                  </div>
                  <details className="stu-hw-details">
                    <summary>รายละเอียด</summary>
                    <div className="stu-hw-desc">{a.details}</div>

                    {/* ⛔ เลยกำหนดส่ง — ปิดการแนบไฟล์/ส่งงานจริง ๆ */}
                    {a.status === 'overdue' && (
                      <div style={{ marginTop: '0.75rem', background: 'rgba(160,80,80,0.08)', border: '1px solid rgba(160,80,80,0.3)', borderRadius: 10, padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--absent)', fontWeight: 600 }}>
                        ⛔ เลยกำหนดส่งแล้ว ({a.due}) — ไม่สามารถแนบไฟล์หรือส่งงานได้
                        <div style={{ fontWeight: 400, fontSize: '0.78rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>หากต้องการส่งย้อนหลัง กรุณาติดต่อครูผู้สอนโดยตรง</div>
                      </div>
                    )}

                    {/* ฟอร์มส่งงาน — เฉพาะยังไม่เลยกำหนด */}
                    {a.status === 'pending' && (
                      submitId === a.id ? (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* แนบไฟล์ (บังคับตามประเภทที่ครูกำหนด) */}
                          <div style={{ background: 'var(--cream)', border: '1px dashed var(--border)', borderRadius: 10, padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: '0.4rem' }}>
                              📎 แนบไฟล์งาน — {rule.label}
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept={rule.accept}
                              onChange={e => handlePickFile(a, e.target.files?.[0])}
                              style={{ fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif" }}
                            />
                            {/* Preview ไฟล์ก่อนกดส่ง */}
                            {file && (
                              <div style={{ marginTop: '0.6rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600, marginBottom: '0.35rem' }}>
                                  ✓ {file.name} ({fmtSize(file.size)}) — ตรวจสอบตัวอย่างก่อนส่ง
                                </div>
                                {(a.submitType || 'pdf') === 'pdf' || file.name.toLowerCase().endsWith('.pdf')
                                  ? <iframe src={previewUrl} title="preview" style={{ width: '100%', height: 260, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
                                  : a.submitType === 'video'
                                    ? <video src={previewUrl} controls style={{ width: '100%', maxHeight: 260, borderRadius: 8, background: '#000' }} />
                                    : <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--warm-white)', borderRadius: 8, padding: '0.6rem' }}>📑 ไฟล์สไลด์พร้อมส่ง — แสดงตัวอย่างเต็มรูปแบบเมื่อเชื่อมต่อ storage จริง</div>}
                              </div>
                            )}
                          </div>
                          <textarea
                            value={submitNote}
                            onChange={e => setSubmitNote(e.target.value)}
                            placeholder="หมายเหตุถึงครู (ไม่บังคับ)"
                            rows={2}
                            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', resize: 'vertical', outline: 'none' }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="stu-hw-submit-btn" onClick={() => file ? setConfirmOpen(true) : showToast('แนบไฟล์งานก่อนส่ง')}>📤 ส่งการบ้าน</button>
                            <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={() => setSubmitId(null)}>ยกเลิก</button>
                          </div>

                          {/* Popup ยืนยันการส่ง */}
                          {confirmOpen && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(18,10,4,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                              <div style={{ width: 'min(340px, 92vw)', background: 'var(--warm-white)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                                <div style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>📤</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.5rem' }}>ยืนยันการส่งการบ้าน?</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', marginBottom: '1rem' }}>
                                  งาน &quot;{a.title}&quot;<br />ไฟล์: {file?.name}
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                  <button className="stu-hw-submit-btn" style={{ flex: 1, background: '#2E8B5B' }} onClick={() => confirmSubmit(a)}>✅ ยืนยันส่ง</button>
                                  <button className="stu-hw-submit-btn" style={{ flex: 1, background: 'var(--text-muted)' }} onClick={() => setConfirmOpen(false)}>ยกเลิก</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button className="stu-hw-submit-btn" onClick={() => openSubmitForm(a.id)}>📤 ส่งการบ้าน</button>
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
