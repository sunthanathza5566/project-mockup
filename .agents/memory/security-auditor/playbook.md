# Playbook — security-auditor

## RULES
- [TASK-0001 D-sec → ใช้ซ้ำ TASK-0002 audit, re-check 1, re-check 2] **บันทึกรายการ probe ทุกตัวลงรายงาน** (ไฟล์ probe อยู่ scratchpad ไม่ commit) และตอน re-check เปลี่ยน assert ของ probe เดิมจาก "ยืนยันว่ามีปัญหา" เป็น "ยืนยันว่าแก้แล้ว" ในไฟล์เดียวกัน แล้วรันทั้งชุดเพื่อจับ regression. ใช้ซ้ำแล้ว 3 ครั้ง
- [incident: TASK-0002 S-09 พบช้า 1 รอบ] สแกน B7 ไล่ **ทุก export ที่เขียน store** ไม่ใช่เฉพาะที่รับ actor — ฟังก์ชันที่ไม่รับ actor เลยอันตรายที่สุด; regex body ไม่จับ primitive ที่เขียนผ่านฟังก์ชันอื่น → ตรวจ allow-list ของ facade แทน

## LESSONS
- [TASK-0001 D-sec] ตัวกรองกฎ AI (judgement/number/citation) ต้องไล่ให้ครบทุก feature ที่คืนข้อความ — grep ว่า filter ถูกเรียกในทุก `run*` ของ `ai.service.ts` ไม่ใช่แค่ฟีเจอร์ที่เคยถูก review (พบ A-1: AI-1/2/7 ไม่ผ่าน `stripJudgement`). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D-sec] number post-check ที่ใช้ทั้ง input JSON เป็น context จะยอมเลขเล็ก (1–7) เสมอ → ใช้กันคำตัดสิน/คะแนนไม่ได้ ต้องมี filter คำตัดสินแยก. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D-sec] PII regex ภาษาไทยต้อง normalize เลขไทย ๐–๙/full-width และ +66/0066 ก่อนตรวจ — probe ด้วยชุดรูปแบบจริงทุกครั้ง (D-sec ไม่ได้บันทึก 24 กรณี ทำให้ backend-dev ต้องสร้างตารางเอง). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 audit] ตรวจ "ลบข้อมูลส่วนบุคคลทันที" ค้นทั้ง storage (`JSON.stringify` ทุก key) หาชื่อ/อีเมล ไม่ใช่แค่ตารางหลัก + audit — แจ้งเตือน/แคชมักสำเนาชื่อไว้ (พบ S-01). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 audit] ตรวจ C8 (ตัด session เมื่อระงับ) ให้ไล่ว่าใครเรียก `getCurrentUser` และบ่อยแค่ไหนใน UI — ตัวตัดที่ไม่ถูกเรียกซ้ำไม่มีผลกับแท็บที่เปิดค้าง (S-03). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 re-check] fix ที่มี fallback ข้อมูลเก่า ต้องมี probe ที่สร้างข้อมูลรูปแบบเก่าจริง (เช่น ลบ dedupeKey ออก) ไม่ใช่ทดสอบแค่ทางใหม่. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- รายงาน D-sec: `.agents/reviews/TASK-0001-security.md` — verdict PASS เฉพาะขอบเขตเดโม่; ถ้า deploy ให้คนนอกเข้าถึง B-1..B-4 = High → FAIL
- ยังไม่มี `standards/security.md` (STUDY REQUEST D-sec เลื่อนไปหลัง TASK-0001) → ใช้ OWASP Top 10 2021 + ASVS 4.0.3 L1 + OWASP LLM01 + spec 0/3.2/7.3/11
- ค้าง: A-7/B-4 (Next 14.2.35 critical → ต้องขึ้น 16, uuid ผ่าน exceljs) ไม่ทำใน TASK-0001; A-4 artifact บน master = เจ้าของตัดสิน
- การตีความ XP: severity Medium ในกลุ่ม "แก้ก่อนส่ง" นับเป็น major (+8); Low และกลุ่ม B (ข้อจำกัดสถาปัตยกรรม) ไม่นับ
- มี `standards/security-auth.md` แล้ว (NIST 63B-4/63A-4, ASVS 5.0, PDPA ม.21–24; checklist §4 C1–C15 + P1–P6) — ใช้แทน ASVS 4.0.3 สำหรับโซน auth/onboarding
- TASK-0002 รายงาน `.agents/reviews/TASK-0002-security.md`: S-01 Medium ปิด, S-03 ยอมรับใน MVP, S-08/S-09 Low (S-09 ปิดใน R2-B5), ข้อจำกัด (ข) ข-01..ข-20 ส่งเล่มบท 5
