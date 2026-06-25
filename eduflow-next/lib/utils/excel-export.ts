import ExcelJS from 'exceljs';
import type { AttendanceReport } from '../types';

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
  titleRow.alignment = { horizontal: 'center', vertical: 'center' };

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
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  // Format data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > dataStartRow) {
      row.alignment = { horizontal: 'center', vertical: 'center' };
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
  const buffer = await workbook.xlsx.writeBuffer();

  // Download
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
