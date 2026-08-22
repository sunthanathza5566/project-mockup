'use client';

import { useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import { getStudentGrades, calcGPA, type StudentGradeRow } from '@/lib/api/academic.store';
import { exportStudentGradeReport, exportTranscriptPP1 } from '@/lib/utils/excel-export';
import { useDialog } from '@/context/DialogContext';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

/**
 * ผลการเรียน — อ่านคะแนน/เกรดจริงที่ครูบันทึกผ่านระบบบันทึกคะแนน (ปพ.5)
 * ดาวน์โหลดใบรายงานผลการเรียน (แนว ปพ.6) ได้
 */
export default function GradesView({ profile }: Props) {
  const { confirm, notify } = useDialog();
  const [rows, setRows] = useState<StudentGradeRow[]>([]);

  useEffect(() => {
    setRows(getStudentGrades(profile.studentId));
  }, [profile.studentId]);

  const gpa = calcGPA(rows);

  async function handleExport() {
    if (rows.length === 0) { notify({ title: 'ยังไม่มีข้อมูล', message: 'ยังไม่มีคะแนนให้ดาวน์โหลด', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'ดาวน์โหลดรายงานผลการเรียน (ปพ.6)?', message: `ผลการเรียน ${rows.length} วิชา`, confirmText: 'ดาวน์โหลด' }))) return;
    await exportStudentGradeReport(`${profile.firstName} ${profile.lastName}`, profile.studentId, rows);
    notify({ title: 'ดาวน์โหลดแล้ว', message: 'รายงานผลการเรียน (ปพ.6)', variant: 'success' });
  }

  async function handleExportPP1() {
    if (rows.length === 0) { notify({ title: 'ยังไม่มีข้อมูล', message: 'ยังไม่มีคะแนนให้ดาวน์โหลด', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'ดาวน์โหลดระเบียนแสดงผลการเรียน (ปพ.1)?', message: `ผลการเรียน ${rows.length} วิชา`, confirmText: 'ดาวน์โหลด' }))) return;
    await exportTranscriptPP1(`${profile.firstName} ${profile.lastName}`, profile.studentId, rows);
    notify({ title: 'ดาวน์โหลดแล้ว', message: 'ระเบียนแสดงผลการเรียน (ปพ.1)', variant: 'success' });
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
        <div className="stu-hw-sum stu-hw-sum-submitted"><strong>{rows.filter(r => r.gradingMode === 'numeric').length}</strong> วิชาที่คิดเกรด</div>
        <div className="stu-hw-sum stu-hw-sum-overdue"><strong>{rows.filter(r => r.gradingMode === 'symbol' || r.isSpecial).length}</strong> วิชากิจกรรม/ผลพิเศษ</div>
        <div className="stu-hw-sum stu-hw-sum-pending"><strong>{rows.filter(r => r.grade === '—').length}</strong> รอผลการเรียน</div>
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
                  {['รหัสวิชา', 'รายวิชา', 'ครูผู้สอน', 'รายละเอียดคะแนน', 'รวม', 'เกรด'].map((h, i) => (
                    <th key={i} style={{ padding: '0.55rem 0.7rem', textAlign: i >= 1 && i <= 3 ? 'left' : 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.courseId} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 ? 'rgba(107,79,47,0.03)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.courseCode}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{r.courseName}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)' }}>{r.teacherName}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {r.gradingMode === 'symbol'
                        ? 'วิชากิจกรรม — ประเมินผ่าน/ไม่ผ่าน (ไม่คิดเกรด)'
                        : r.breakdown.map(b => `${b.name} ${b.score ?? '—'}/${b.max}`).join(' · ')}
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center', fontWeight: 600, color: 'var(--brown-dark)', whiteSpace: 'nowrap' }}>
                      {r.gradingMode === 'symbol' || r.total === null ? '—' : `${r.total}/${r.maxTotal}`}
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center' }}>
                      <span className={`stu-hw-status-badge ${
                        r.grade === '—' ? 'badge-pending'
                          : r.isSpecial ? (r.grade === 'ผ' ? 'badge-graded' : 'badge-overdue')
                          : parseFloat(r.grade) >= 2 ? 'badge-graded' : 'badge-overdue'
                      }`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="stu-hw-submit-btn" onClick={handleExport}>
              📥 รายงานผลการเรียน ปพ.6 (Excel)
            </button>
            <button className="stu-hw-submit-btn" onClick={handleExportPP1}>
              📥 ระเบียนผลการเรียน ปพ.1 (Excel)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
