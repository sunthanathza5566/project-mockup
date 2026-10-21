/** escape ข้อความก่อนใส่ใน HTML (ใช้กับไฟล์ .doc ที่สร้างจาก HTML) */
export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/** escape + แปลงขึ้นบรรทัดใหม่เป็น <br/> */
export function escapeHtmlBr(s: unknown): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br/>');
}
