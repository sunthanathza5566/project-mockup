# Playbook — security-auditor

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 D-sec] ตัวกรองกฎ AI (judgement/number/citation) ต้องไล่ให้ครบทุก feature ที่คืนข้อความ — grep ว่า filter ถูกเรียกในทุก `run*` ของ `ai.service.ts` ไม่ใช่แค่ฟีเจอร์ที่เคยถูก review (พบ A-1: AI-1/2/7 ไม่ผ่าน `stripJudgement`). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D-sec] number post-check ที่ใช้ทั้ง input JSON เป็น context จะยอมเลขเล็ก (1–7) เสมอ → ใช้กันคำตัดสิน/คะแนนไม่ได้ ต้องมี filter คำตัดสินแยก. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D-sec] PII regex ภาษาไทยต้อง normalize เลขไทย ๐–๙/full-width และ +66/0066 ก่อนตรวจ — probe ด้วยชุดรูปแบบจริงทุกครั้ง และ **บันทึกรายการ probe ลงรายงาน** (D-sec ไม่ได้บันทึก 24 กรณี ทำให้ backend-dev ต้องสร้างตารางเอง). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- รายงาน D-sec: `.agents/reviews/TASK-0001-security.md` — verdict PASS เฉพาะขอบเขตเดโม่; ถ้า deploy ให้คนนอกเข้าถึง B-1..B-4 = High → FAIL
- ยังไม่มี `standards/security.md` (STUDY REQUEST D-sec เลื่อนไปหลัง TASK-0001) → ใช้ OWASP Top 10 2021 + ASVS 4.0.3 L1 + OWASP LLM01 + spec 0/3.2/7.3/11
- ค้าง: A-7/B-4 (Next 14.2.35 critical → ต้องขึ้น 16, uuid ผ่าน exceljs) ไม่ทำใน TASK-0001; A-4 artifact บน master = เจ้าของตัดสิน
- การตีความ XP: severity Medium ในกลุ่ม "แก้ก่อนส่ง" นับเป็น major (+8); Low และกลุ่ม B (ข้อจำกัดสถาปัตยกรรม) ไม่นับ
