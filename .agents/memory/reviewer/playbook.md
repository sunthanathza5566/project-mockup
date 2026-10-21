# Playbook — reviewer

## RULES
- (ยังไม่มี)

## LESSONS
- เช็ก CSV export ทุกครั้ง: ค่าที่ขึ้นต้นด้วย `= + - @ \t \r` ต้องมี `'` นำหน้า (พบ TASK-0001 #8)

## PROJECT KNOWLEDGE
- คำสั่งตรวจมาตรฐาน (ใน eduflow-next/): `npx tsc --noEmit`, `npm test`, `npx next build`
- XSS: grep `dangerouslySetInnerHTML` ทุกรอบ — ตอน TASK-0001 เหลือที่เดียว components/landing/AboutSection.tsx:25 (ข้อความ static)
- RBAC: `can()` ตัด university ก่อน role (ยกเว้น super_admin); ตรวจว่า UI ไม่เรียก raw writer (save/load/saveUsers/appendAudit/transitionSection) ตรงๆ
- ข้อจำกัด MVP ไม่นับเป็น finding: session/สิทธิ์อยู่ใน browser (ต้องย้ายไป server + RLS ใน Phase B)
- ตรวจ store write: validate ก่อน mutate, audit หลัง save (ดู backend-dev LESSONS)
