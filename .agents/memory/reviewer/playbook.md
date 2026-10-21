# Playbook — reviewer

## RULES
- (ยังไม่มี)

## LESSONS
- เช็ก CSV export ทุกครั้ง: ค่าที่ขึ้นต้นด้วย = + - @ หรือ tab/CR ต้องมี apostrophe นำหน้า (พบ TASK-0001 #8)

## PROJECT KNOWLEDGE
- คำสั่งตรวจมาตรฐาน (ใน eduflow-next/): `npx tsc --noEmit`, `npm test`, `npx next build`
- XSS: grep `dangerouslySetInnerHTML` ทุกรอบ — ณ Phase B เหลือที่เดียว components/landing/AboutSection.tsx:25 (ข้อความ static)
- RBAC: `can()` ตัด university ก่อน role (ยกเว้น super_admin); ตรวจ UI ไม่เรียก raw writer ตรง ๆ
- route สาธารณะ `app/api/ai`: ตรวจ input/output guard, cap, key ไม่หลุดใน bundle (grep `.next/static`)
- probe regex ตัดข้อความไทยด้วย node ทุกครั้งที่แก้ (ดู backend-dev RULES)
- ตรวจ export ที่สร้าง XML: unzip `word/document.xml` (และ part อื่น) แล้วค้นอักขระต้องห้าม (`\u0000-\u0008\u000B\u000C\u000E-\u001F`) — C4 รอบ 1 พบ C-1 ด้วยวิธีนี้
- ก่อนปิด finding ที่ fix แล้ว ให้ตามรอยจาก fix ไปถึง output จริง (เช่น narrative → DOCX) อย่าดูแค่ตัวเทสต์ — C4 รอบ 2 พบว่าเทสต์ล็อกพฤติกรรมผิดไว้
- ข้อจำกัด MVP ไม่นับเป็น finding: session/สิทธิ์อยู่ใน browser
