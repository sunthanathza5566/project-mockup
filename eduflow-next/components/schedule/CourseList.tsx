'use client';

/**
 * รายละเอียดรายวิชาที่ลงทะเบียนอยู่ในตารางสอนของห้องนั้น
 * แสดง: รหัสวิชา · ชื่อวิชา · ครูผู้สอน · ประเภทวิชา (พื้นฐาน/เพิ่มเติม/กิจกรรม) · หน่วยกิต · คาบ/สัปดาห์
 */

import type { CourseSummary, SubjectType } from '@/lib/api/schedule.store';
import { subjectColor } from '@/lib/ui/subject-colors';

const TYPE_BADGE: Record<SubjectType, string> = {
  'พื้นฐาน': 'sched-type-core',
  'เพิ่มเติม': 'sched-type-elective',
  'กิจกรรมพัฒนาผู้เรียน': 'sched-type-activity',
  'ชุมนุม/ชมรม': 'sched-type-club',
};

export default function CourseList({ courses, title = 'รายละเอียดรายวิชาในตารางสอน' }: { courses: CourseSummary[]; title?: string }) {
  if (courses.length === 0) return null;

  const totalCredit = courses.reduce((s, c) => s + (c.credit || 0), 0);
  const totalPeriods = courses.reduce((s, c) => s + c.periodsPerWeek, 0);

  return (
    <div className="sched-courses">
      <div className="sched-courses-head">
        <span className="sched-courses-title">{title}</span>
        <span className="sched-courses-sum">
          {courses.length} รายวิชา · {totalPeriods} คาบ/สัปดาห์ · รวม {totalCredit.toFixed(1)} หน่วยกิต
        </span>
      </div>

      <div className="sched-scroll">
        <table className="sched-course-table">
          <thead>
            <tr>
              <th>รหัสวิชา</th>
              <th style={{ textAlign: 'left' }}>ชื่อวิชา</th>
              <th style={{ textAlign: 'left' }}>ครูผู้สอน</th>
              <th>ประเภท</th>
              <th>หน่วยกิต</th>
              <th>คาบ/สัปดาห์</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(c => {
              const col = subjectColor(c.subjectKey);
              return (
                <tr key={`${c.subjectCode}-${c.teacherUsername}`}>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--brown-deep)' }}>{c.subjectCode}</td>
                  <td>
                    <span className="sched-course-dot" style={{ background: col.dot }} />
                    {c.subjectName}
                  </td>
                  <td>{c.teacherName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`sched-type-badge ${TYPE_BADGE[c.subjectType]}`}>{c.subjectType}</span>
                    {c.gradingMode === 'symbol' && (
                      <span className="sched-type-badge sched-type-club" style={{ marginLeft: '0.3rem' }}>ผ / มผ</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.gradingMode === 'symbol' ? '—' : c.credit ? c.credit.toFixed(1) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{c.periodsPerWeek}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
