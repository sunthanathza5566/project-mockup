import ExcelJS from 'exceljs';
import type { AttendanceReport } from '../types';
import { calcTotal, calcGrade, calcGPA, type Course, type ScoreEntry, type StudentGradeRow } from '../api/academic.store';

export async function exportAttendanceReportToExcel(report: AttendanceReport) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('รายงานเช็คชื่อ');

  // Set column widths
  worksheet.columns = [
    { header: 'ลำดับ', key: 'order', width: 8 },
    { header: 'ชื่อ-นามสกุล', key: 'name', width: 25 },
    { header: 'รหัสนักเรียน', key: 'code', width: 15 },
    { header: 'ระดับชั้น', key: 'grade', width: 12 },
    { header: 'คาบเรียน', key: 'period', width: 12 },
    { header: 'วันเดือนปี', key: 'date', width: 15 },
    { header: 'สถานะ', key: 'status', width: 12 },
    { header: 'เวลา', key: 'time', width: 15 },
  ];

  // Title
  worksheet.insertRows(1, [
    [
      `รายงานเช็คชื่อเรียน`,
      ``,
      ``,
      ``,
      ``,
      ``,
      ``,
      ``,
    ],
  ]);

  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Header info
  worksheet.insertRows(2, [
    [`วิชา: ${report.subject}`, ``, ``, ``, ``, ``, ``, ``],
    [`ห้องเรียน: ${report.subject}`, ``, ``, ``, ``, ``, ``, ``],
    [`คาบที่: ${report.period}`, ``, ``, ``, ``, ``, ``, ``],
    [`วันเดือนปี: ${report.date}`, ``, ``, ``, ``, ``, ``, ``],
    [`รวมทั้งสิ้น: ${report.totalStudents} คน (มา: ${report.presentCount}, สาย: ${report.lateCount}, ขาด: ${report.absentCount})`, ``, ``, ``, ``, ``, ``, ``],
  ]);

  // Data rows
  const dataStartRow = 7;
  const records = report.records.map((record, idx) => ({
    order: idx + 1,
    name: record.studentName,
    code: record.studentId,
    grade: 'ม.5', // TODO: ดึงจาก database
    period: report.period,
    date: report.date,
    status: record.status === 'on-time' ? 'มาตรงเวลา' : 'มาสาย',
    time: new Date(record.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  }));

  worksheet.addRows(records);

  // Format header row
  const headerRow = worksheet.getRow(dataStartRow);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B4F2F' }, // brown-dark
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Format data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > dataStartRow) {
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  });

  // Generate file
  const fileName = `แบบรายงานเช็คชื่อ_${report.date}_${report.subject}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}

/** ดาวน์โหลด workbook เป็นไฟล์ .xlsx */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * ส่งออกแบบบันทึกผลการเรียน (แนว ปพ.5) เป็น Excel
 * TODO(PostgreSQL): เมื่อมีข้อมูลโรงเรียน/ภาคเรียนจริง ให้เติมหัวเอกสารตามแบบฟอร์ม ปพ.5 ทางการ
 */
export async function exportScoreSheetToExcel(
  course: Course,
  classroomLabel: string,  // เช่น 'ม.1/1'
  academicYear: string,    // เช่น '2567'
  entries: ScoreEntry[],
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('บันทึกผลการเรียน');

  ws.columns = [
    { key: 'order',     width: 8 },
    { key: 'code',      width: 14 },
    { key: 'name',      width: 28 },
    { key: 'collected', width: 16 },
    { key: 'midterm',   width: 14 },
    { key: 'final',     width: 14 },
    { key: 'total',     width: 12 },
    { key: 'grade',     width: 10 },
  ];

  // ── หัวเอกสาร ──
  ws.addRow([`แบบบันทึกผลการเรียน (ปพ.5)`]);
  ws.addRow([`รายวิชา: ${course.name} (${course.code})`]);
  ws.addRow([`ห้องเรียน: ${classroomLabel} · ปีการศึกษา ${academicYear}`]);
  ws.addRow([`ครูผู้สอน: ${course.teacherName}`]);
  ws.addRow([]);
  ws.getRow(1).font = { bold: true, size: 14 };

  // ── หัวตาราง ──
  const headerRow = ws.addRow([
    'ลำดับ', 'รหัสนักเรียน', 'ชื่อ-นามสกุล',
    `คะแนนเก็บ (${course.maxCollected})`,
    `กลางภาค (${course.maxMidterm})`,
    `ปลายภาค (${course.maxFinal})`,
    'รวม (100)', 'เกรด',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B4F2F' } }; // brown-dark
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── ข้อมูลนักเรียน ──
  entries.forEach((e, idx) => {
    const total = calcTotal(e);
    const row = ws.addRow([
      idx + 1, e.studentCode, e.studentName,
      e.collected ?? '—', e.midterm ?? '—', e.final ?? '—',
      total ?? '—', calcGrade(total),
    ]);
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  // ── สรุปท้ายตาราง ──
  const graded = entries.map(calcTotal).filter((t): t is number => t !== null);
  ws.addRow([]);
  ws.addRow([`สรุป: บันทึกแล้ว ${graded.length}/${entries.length} คน`,
    '', '',
    graded.length ? `เฉลี่ยรวม ${(graded.reduce((s, t) => s + t, 0) / graded.length).toFixed(1)} คะแนน` : '']);

  const fileName = `ปพ5_${course.code}_${classroomLabel.replace('/', '-')}_${academicYear}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}

/**
 * ส่งออกใบรายงานผลการเรียนรายบุคคล (แนว ปพ.6) เป็น Excel
 * TODO(PostgreSQL): เติมหน่วยกิต, ผลการประเมินคุณลักษณะฯ ตามแบบฟอร์มทางการเมื่อมีข้อมูลจริง
 */
export async function exportStudentGradeReport(
  studentName: string,
  studentCode: string,
  rows: StudentGradeRow[],
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('ผลการเรียน');

  ws.columns = [
    { key: 'order',   width: 8 },
    { key: 'code',    width: 12 },
    { key: 'name',    width: 30 },
    { key: 'teacher', width: 22 },
    { key: 'total',   width: 12 },
    { key: 'grade',   width: 10 },
  ];

  // ── หัวเอกสาร ──
  const year = rows[0]?.academicYear || '—';
  const classroom = rows[0]?.classroomLabel || '—';
  ws.addRow(['ใบรายงานผลการเรียน (แนว ปพ.6)']);
  ws.addRow([`ชื่อ-นามสกุล: ${studentName} · รหัสนักเรียน ${studentCode}`]);
  ws.addRow([`ห้องเรียน: ${classroom} · ปีการศึกษา ${year}`]);
  ws.addRow([]);
  ws.getRow(1).font = { bold: true, size: 14 };

  // ── หัวตาราง ──
  const headerRow = ws.addRow(['ลำดับ', 'รหัสวิชา', 'รายวิชา', 'ครูผู้สอน', 'คะแนนรวม', 'เกรด']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B4F2F' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  rows.forEach((r, idx) => {
    const row = ws.addRow([idx + 1, r.courseCode, r.courseName, r.teacherName, r.total ?? '—', r.grade]);
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  // ── GPA ──
  const gpa = calcGPA(rows);
  ws.addRow([]);
  const gpaRow = ws.addRow(['', '', '', 'เกรดเฉลี่ย (GPA)', '', gpa !== null ? gpa.toFixed(2) : '—']);
  gpaRow.font = { bold: true };

  const fileName = `ผลการเรียน_${studentCode}_${year}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}
