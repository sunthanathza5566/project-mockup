import ExcelJS from 'exceljs';
import type { AttendanceReport } from '../types';
import {
  calcTotal, calcGPA, maxTotal, resolveGrade,
  type Course, type ScoreEntry, type StudentGradeRow,
} from '../api/academic.store';

const BROWN_DARK = 'FF6B4F2F'; // theme brown-dark

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

/** จัดหัวตารางเป็นแถบน้ำตาลตาม theme */
function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BROWN_DARK } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
}

function borderRow(row: ExcelJS.Row) {
  row.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  };
}

export async function exportAttendanceReportToExcel(report: AttendanceReport) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('รายงานเช็คชื่อ');

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

  worksheet.insertRows(1, [[`รายงานเช็คชื่อเรียน`, ``, ``, ``, ``, ``, ``, ``]]);
  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.insertRows(2, [
    [`วิชา: ${report.subject}`, ``, ``, ``, ``, ``, ``, ``],
    [`ห้องเรียน: ${report.subject}`, ``, ``, ``, ``, ``, ``, ``],
    [`คาบที่: ${report.period}`, ``, ``, ``, ``, ``, ``, ``],
    [`วันเดือนปี: ${report.date}`, ``, ``, ``, ``, ``, ``, ``],
    [`รวมทั้งสิ้น: ${report.totalStudents} คน (มา: ${report.presentCount}, สาย: ${report.lateCount}, ขาด: ${report.absentCount})`, ``, ``, ``, ``, ``, ``, ``],
  ]);

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

  styleHeaderRow(worksheet.getRow(dataStartRow));
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > dataStartRow) {
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      borderRow(row);
    }
  });

  await downloadWorkbook(workbook, `แบบรายงานเช็คชื่อ_${report.date}_${report.subject}.xlsx`);
}

/**
 * ปพ.5 — แบบบันทึกผลการเรียนประจำรายวิชา
 * คอลัมน์คะแนนสร้างตามสัดส่วนคะแนน (components) ของวิชานั้น ๆ
 * TODO(PostgreSQL): เติมหัวเอกสารตามแบบฟอร์มทางการเมื่อมีข้อมูลโรงเรียน/ภาคเรียนจริง
 */
export async function exportScoreSheetToExcel(
  course: Course,
  classroomLabel: string,  // เช่น 'ม.1/1'
  academicYear: string,    // เช่น '2567'
  entries: ScoreEntry[],
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('บันทึกผลการเรียน');
  const max = maxTotal(course);
  // วิชากิจกรรม/ชุมนุมไม่คิดเกรด — ไม่ต้องมีคอลัมน์คะแนนและคอลัมน์รวม
  const isSymbol = course.gradingMode === 'symbol';
  const components = isSymbol ? [] : course.components;

  ws.columns = [
    { key: 'order', width: 8 },
    { key: 'code',  width: 14 },
    { key: 'name',  width: 28 },
    ...components.map(c => ({ key: c.id, width: 16 })),
    ...(isSymbol ? [] : [{ key: 'total', width: 12 }]),
    { key: 'grade', width: 12 },
  ];

  ws.addRow([`แบบบันทึกผลการเรียน (ปพ.5)`]);
  ws.addRow([`รายวิชา: ${course.name} (${course.code})`]);
  ws.addRow([`ห้องเรียน: ${classroomLabel} · ปีการศึกษา ${academicYear}`]);
  ws.addRow([`ครูผู้สอน: ${course.teacherName}`]);
  ws.addRow([isSymbol
    ? 'วิชาไม่คิดเกรด — ประเมินผลเป็น ผ (ผ่าน) / มผ (ไม่ผ่าน) ไม่นำไปคิด GPA'
    : `เกณฑ์เกรด สพฐ. คิดจากเปอร์เซ็นต์ของคะแนนเต็มรวม ${max} คะแนน`]);
  ws.addRow(['สัญลักษณ์ผลการเรียน: ผ = ผ่าน · มผ = ไม่ผ่าน · ร = รอการตัดสิน · มส = ไม่มีสิทธิ์สอบปลายภาค · ขส = ขาดสอบ · ขร = ขาดเรียน']);
  ws.addRow([]);
  ws.getRow(1).font = { bold: true, size: 14 };

  const headerRow = ws.addRow([
    'ลำดับ', 'รหัสนักเรียน', 'ชื่อ-นามสกุล',
    ...components.map(c => `${c.name} (${c.max})`),
    ...(isSymbol ? [] : [`รวม (${max})`]),
    isSymbol ? 'ผลการประเมิน' : 'เกรด',
  ]);
  styleHeaderRow(headerRow);

  entries.forEach((e, idx) => {
    const total = calcTotal(e);
    const row = ws.addRow([
      idx + 1, e.studentCode, e.studentName,
      ...components.map(c => (e.symbol ? '—' : e.scores[c.id] ?? '—')),
      ...(isSymbol ? [] : [e.symbol ? '—' : total ?? '—']),
      resolveGrade(e, course),
    ]);
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    borderRow(row);
  });

  // นับว่า "บันทึกแล้ว" ทั้งที่กรอกคะแนน และที่ให้ผลแบบสัญลักษณ์
  const recorded = entries.filter(e => e.symbol || calcTotal(e) !== null).length;
  const totals = entries.filter(e => !e.symbol).map(calcTotal).filter((t): t is number => t !== null);
  ws.addRow([]);
  ws.addRow([`สรุป: บันทึกแล้ว ${recorded}/${entries.length} คน`,
    '', '',
    !isSymbol && totals.length ? `เฉลี่ยรวม ${(totals.reduce((s, t) => s + t, 0) / totals.length).toFixed(1)} คะแนน` : '']);

  await downloadWorkbook(workbook, `ปพ5_${course.code}_${classroomLabel.replace('/', '-')}_${academicYear}.xlsx`);
}

/**
 * ปพ.6 — รายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ฉบับย่อ)
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
    { key: 'name',    width: 28 },
    { key: 'teacher', width: 22 },
    { key: 'detail',  width: 45 },
    { key: 'total',   width: 14 },
    { key: 'grade',   width: 10 },
  ];

  const year = rows[0]?.academicYear || '—';
  const classroom = rows[0]?.classroomLabel || '—';
  ws.addRow(['รายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.6)']);
  ws.addRow([`ชื่อ-นามสกุล: ${studentName} · รหัสนักเรียน ${studentCode}`]);
  ws.addRow([`ห้องเรียน: ${classroom} · ปีการศึกษา ${year}`]);
  ws.addRow([]);
  ws.getRow(1).font = { bold: true, size: 14 };

  const headerRow = ws.addRow(['ลำดับ', 'รหัสวิชา', 'รายวิชา', 'ครูผู้สอน', 'รายละเอียดคะแนน', 'รวม', 'เกรด']);
  styleHeaderRow(headerRow);

  rows.forEach((r, idx) => {
    const detail = r.breakdown.map(b => `${b.name} ${b.score ?? '—'}/${b.max}`).join(' · ');
    const row = ws.addRow([
      idx + 1, r.courseCode, r.courseName, r.teacherName,
      detail, r.total !== null ? `${r.total}/${r.maxTotal}` : '—', r.grade,
    ]);
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    [3, 4, 5].forEach(i => { row.getCell(i).alignment = { horizontal: 'left', vertical: 'middle' }; });
    borderRow(row);
  });

  const gpa = calcGPA(rows);
  ws.addRow([]);
  const gpaRow = ws.addRow(['', '', '', '', 'เกรดเฉลี่ย (GPA)', '', gpa !== null ? gpa.toFixed(2) : '—']);
  gpaRow.font = { bold: true };

  await downloadWorkbook(workbook, `ปพ6_${studentCode}_${year}.xlsx`);
}

/**
 * ปพ.1 — ระเบียนแสดงผลการเรียน (ฉบับย่อ/transcript)
 * รวมผลการเรียนทุกปีการศึกษาที่มีในระบบ จัดกลุ่มตามปี พร้อม GPA รายปีและ GPA สะสม
 * TODO(PostgreSQL): เติมหน่วยกิต, วันเข้า-จบการศึกษา, ผลประเมินกิจกรรมฯ ตามแบบฟอร์มทางการ
 */
export async function exportTranscriptPP1(
  studentName: string,
  studentCode: string,
  rows: StudentGradeRow[],
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('ปพ.1');

  ws.columns = [
    { key: 'order', width: 8 },
    { key: 'code',  width: 12 },
    { key: 'name',  width: 32 },
    { key: 'room',  width: 12 },
    { key: 'total', width: 14 },
    { key: 'grade', width: 10 },
  ];

  ws.addRow(['ระเบียนแสดงผลการเรียน (ปพ.1) — ฉบับข้อมูลจากระบบ']);
  ws.addRow([`ชื่อ-นามสกุล: ${studentName} · รหัสนักเรียน ${studentCode}`]);
  ws.addRow([]);
  ws.getRow(1).font = { bold: true, size: 14 };

  // จัดกลุ่มตามปีการศึกษา (เรียงปีเก่า → ใหม่)
  const years = [...new Set(rows.map(r => r.academicYear))].sort();
  for (const year of years) {
    const yearRows = rows.filter(r => r.academicYear === year);
    const yr = ws.addRow([`ปีการศึกษา ${year}`]);
    yr.font = { bold: true, size: 12 };

    const headerRow = ws.addRow(['ลำดับ', 'รหัสวิชา', 'รายวิชา', 'ห้อง', 'คะแนน', 'เกรด']);
    styleHeaderRow(headerRow);

    yearRows.forEach((r, idx) => {
      const row = ws.addRow([
        idx + 1, r.courseCode, r.courseName, r.classroomLabel,
        r.total !== null ? `${r.total}/${r.maxTotal}` : '—', r.grade,
      ]);
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      borderRow(row);
    });

    const yearGPA = calcGPA(yearRows);
    const sumRow = ws.addRow(['', '', '', '', 'GPA ประจำปี', yearGPA !== null ? yearGPA.toFixed(2) : '—']);
    sumRow.font = { bold: true };
    ws.addRow([]);
  }

  const gpa = calcGPA(rows);
  const gpaRow = ws.addRow(['', '', '', '', 'GPA สะสม (GPAX)', gpa !== null ? gpa.toFixed(2) : '—']);
  gpaRow.font = { bold: true, size: 12 };

  await downloadWorkbook(workbook, `ปพ1_${studentCode}.xlsx`);
}
