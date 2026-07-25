'use client';

/**
 * เอกสารผลการเรียนของนักเรียน (ปพ.) — ดาวน์โหลด + พรีวิว
 * เห็น/ดาวน์โหลดได้เฉพาะเอกสารที่ตรงกับ "ระดับชั้นของตัวเอง" (ไม่ใช่ permission)
 *   ปพ.1 (Transcript) → เฉพาะ ป.6/ม.3/ม.6 · ปพ.6 (รายงานประจำตัว) → ทุกชั้น
 *   ที่เหลือรอเชื่อมข้อมูลเพิ่ม
 */

import { useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import { getStudentGrades, calcGPA, type StudentGradeRow } from '@/lib/api/academic.store';
import { exportStudentGradeReport, exportTranscriptPP1 } from '@/lib/utils/excel-export';
import { PP_DOCS, isDocAllowedForGrade, allowedGradesLabel, type PPDoc } from '@/lib/report-docs';

interface Props { profile: StudentProfile; showToast: (m: string) => void }

/** เอกสารที่ออกให้นักเรียนได้จริงตอนนี้ (มีข้อมูลจากคะแนน) */
const STUDENT_READY: Record<string, 'transcript' | 'report'> = { pp1: 'transcript', pp6: 'report' };

export default function StudentDocsView({ profile, showToast }: Props) {
  const [rows, setRows] = useState<StudentGradeRow[]>([]);
  const [preview, setPreview] = useState<PPDoc | null>(null);

  useEffect(() => { setRows(getStudentGrades(profile.studentId)); }, [profile.studentId]);

  const gpa = calcGPA(rows);
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  function docState(doc: PPDoc): { status: 'ready' | 'locked' | 'soon'; note: string } {
    if (!isDocAllowedForGrade(doc, profile.grade))
      return { status: 'locked', note: `ออกเฉพาะชั้น ${allowedGradesLabel(doc)}` };
    if (STUDENT_READY[doc.id]) return { status: 'ready', note: 'ดาวน์โหลด/พรีวิวได้' };
    return { status: 'soon', note: 'กำลังพัฒนา' };
  }

  async function download(doc: PPDoc) {
    if (rows.length === 0) { showToast('⚠️ ยังไม่มีผลการเรียนให้ออกเอกสาร'); return; }
    if (STUDENT_READY[doc.id] === 'transcript') await exportTranscriptPP1(fullName, profile.studentId, rows);
    else await exportStudentGradeReport(fullName, profile.studentId, rows);
    showToast(`📥 ดาวน์โหลด ${doc.name} (${doc.title}) แล้ว`);
  }

  function handlePick(doc: PPDoc) {
    const st = docState(doc);
    if (st.status === 'locked') { showToast(`🔒 ${doc.name} ${st.note}`); return; }
    if (st.status === 'soon') { showToast(`📄 ${doc.name} (${doc.title}) กำลังพัฒนา`); return; }
    setPreview(doc); // เปิดพรีวิวก่อนดาวน์โหลด
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📄 เอกสารผลการเรียน</h2>
        <p className="stu-page-sub">
          {profile.grade}/{profile.room} · แสดงเฉพาะเอกสารที่ออกให้ระดับชั้นของท่าน · GPA {gpa !== null ? gpa.toFixed(2) : '—'}
        </p>
      </div>

      <div className="doc-grid">
        {PP_DOCS.map(doc => {
          const st = docState(doc);
          return (
            <button key={doc.id} className={`doc-card${st.status === 'locked' ? ' locked' : ''}`} onClick={() => handlePick(doc)}>
              <div className="doc-card-icon">{st.status === 'ready' ? '📄' : st.status === 'locked' ? '🔒' : '🚧'}</div>
              <div className="doc-card-head">
                <span className="doc-card-name">{doc.name}</span>
                <span className={`doc-card-status ${st.status === 'ready' ? 'doc-status-ready' : st.status === 'locked' ? 'doc-status-locked' : 'doc-status-soon'}`}>
                  {st.status === 'ready' ? 'พร้อมใช้' : st.status === 'locked' ? 'ไม่ใช่ระดับชั้นท่าน' : 'กำลังพัฒนา'}
                </span>
              </div>
              <div className="doc-card-title">{doc.title}</div>
              <div className="doc-card-desc">{doc.desc}</div>
              <div className="doc-card-status doc-status-soon" style={{ background: 'var(--cream-dark)', color: 'var(--text-muted)' }}>
                ระดับชั้น: {allowedGradesLabel(doc)}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── พรีวิวเอกสาร ── */}
      {preview && (
        <div className="sched-modal-wrap" onClick={() => setPreview(null)}>
          <div className="sched-modal" style={{ width: 'min(760px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div className="sched-modal-title">📄 พรีวิว {preview.name} — {preview.title}</div>
            <div className="sched-modal-sub">{fullName} · รหัส {profile.studentId} · {profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</div>

            {rows.length === 0 ? (
              <div className="stu-empty">ยังไม่มีผลการเรียนในระบบ</div>
            ) : (
              <div className="sched-scroll">
                <table className="sched-course-table">
                  <thead>
                    <tr><th>รหัสวิชา</th><th style={{ textAlign: 'left' }}>รายวิชา</th><th>หน่วยกิต</th><th>ผลการเรียน</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.courseId}>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{r.courseCode}</td>
                        <td>{r.courseName}</td>
                        <td style={{ textAlign: 'center' }}>{r.gradingMode === 'symbol' ? '—' : '1.0'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--brown-dark)' }}>{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ez-help-box" style={{ margin: '0.85rem 0' }}>
              เกรดเฉลี่ยสะสม (GPA): <b>{gpa !== null ? gpa.toFixed(2) : '—'}</b> · เอกสารฉบับเต็มอยู่ในไฟล์ที่ดาวน์โหลด
            </div>

            <div className="sched-modal-actions">
              <button className="ez-btn ez-btn-primary" onClick={() => { download(preview); setPreview(null); }}>📥 ดาวน์โหลด {preview.name} (Excel)</button>
              <button className="ez-btn ez-btn-ghost" onClick={() => setPreview(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
