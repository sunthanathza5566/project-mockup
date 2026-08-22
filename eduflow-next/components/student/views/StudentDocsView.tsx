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
import { PP_DOCS, isDocAllowedForGrade, allowedGradesLabel, type PPDoc } from '@/lib/report-docs';
import ReportDocPreview from '@/components/teacher/ReportDocPreview';
import { useDialog } from '@/context/DialogContext';

interface Props { profile: StudentProfile; showToast: (m: string) => void }

/** เอกสารที่ออกให้นักเรียนได้จริงตอนนี้ (มีข้อมูลจากคะแนน) */
const STUDENT_READY: Record<string, 'transcript' | 'report'> = { pp1: 'transcript', pp6: 'report' };

export default function StudentDocsView({ profile }: Props) {
  const { notify } = useDialog();
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

  function handlePick(doc: PPDoc) {
    const st = docState(doc);
    if (st.status === 'locked') { notify({ title: `${doc.name} ถูกล็อก`, message: st.note, variant: 'warning' }); return; }
    if (st.status === 'soon') { notify({ title: `${doc.name} กำลังพัฒนา`, message: doc.title, variant: 'info' }); return; }
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

      {/* ── พรีวิวเอกสาร (ตัวเดียวกับฝั่งครู — พิมพ์/บันทึก PDF ได้) ── */}
      {preview && (
        <ReportDocPreview
          doc={preview}
          classroomLabel={`${profile.grade}/${profile.room}`}
          academicYear={profile.academicYear}
          classroomId=""
          student={{ code: profile.studentId, name: fullName }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
