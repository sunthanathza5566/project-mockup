'use client';

import { useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import { getStudentGrades, calcGPA, type StudentGradeRow } from '@/lib/api/academic.store';
import { exportStudentGradeReport } from '@/lib/utils/excel-export';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

/**
 * ผลการเรียน — อ่านคะแนน/เกรดจริงที่ครูบันทึกผ่านระบบบันทึกคะแนน (ปพ.5)
 * ดาวน์โหลดใบรายงานผลการเรียน (แนว ปพ.6) ได้
 */
export default function GradesView({ profile, showToast }: Props) {
  const [rows, setRows] = useState<StudentGradeRow[]>([]);

  useEffect(() => {
    setRows(getStudentGrades(profile.studentId));
  }, [profile.studentId]);

  const gpa = calcGPA(rows);

  async function handleExport() {
    if (rows.length === 0) { showToast('⚠️ ยังไม่มีคะแนนให้ดาวน์โหลด'); return; }
    await exportStudentGradeReport(`${profile.firstName} ${profile.lastName}`, profile.studentId, rows);
    showToast('📥 ดาวน์โหลดใบรายงานผลการเรียนแล้ว');
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">🎓 ผลการเรียน</h2>
        <p className="stu-page-sub">คะแนนและเกรดที่ครูบันทึกผ่านระบบ · ปีการศึกษา {profile.academicYear}</p>
      </div>

      {/* GPA summary */}
      <div className="stu-hw-summary-row">
        <div className="stu-hw-sum stu-hw-sum-graded"><strong>{gpa !== null ? gpa.toFixed(2) : '—'}</strong> เกรดเฉลี่ย (GPA)</div>
        <div className="stu-hw-sum stu-hw-sum-submitted"><strong>{rows.length}</strong> วิชาที่มีคะแนน</div>
        <div className="stu-hw-sum stu-hw-sum-pending"><strong>{rows.filter(r => r.grade === '—').length}</strong> รอคะแนนครบ</div>
      </div>

      {rows.length === 0 ? (
        <div className="stu-empty">
          ยังไม่มีคะแนนในระบบ — คะแนนจะแสดงเมื่อครูบันทึกผ่านระบบบันทึกคะแนน (ปพ.5)
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--brown-dark)', color: 'var(--cream)' }}>
                  {['รหัสวิชา', 'รายวิชา', 'ครูผู้สอน', 'เก็บ', 'กลางภาค', 'ปลายภาค', 'รวม', 'เกรด'].map((h, i) => (
                    <th key={i} style={{ padding: '0.55rem 0.7rem', textAlign: i === 1 || i === 2 ? 'left' : 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.courseId} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 ? 'rgba(107,79,47,0.03)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.courseCode}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{r.courseName}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)' }}>{r.teacherName}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>{r.collected ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>{r.midterm ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>{r.final ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center', fontWeight: 600, color: 'var(--brown-dark)' }}>{r.total ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>
                      <span className={`stu-hw-status-badge ${r.grade !== '—' && parseFloat(r.grade) >= 2 ? 'badge-graded' : r.grade === '—' ? 'badge-pending' : 'badge-overdue'}`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button className="stu-hw-submit-btn" onClick={handleExport}>
              📥 ดาวน์โหลดใบรายงานผลการเรียน (Excel)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
