# Playbook — frontend-dev

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- ทุก call ผ่าน `@/lib/api`; ต้อง `await initAunqa()` ก่อนใช้ (client เท่านั้น)
- ปุ่ม/เมนูซ่อนตาม `can()` ได้ แต่ lib ตรวจซ้ำเสมอ อย่าถือว่า UI เป็นด่านเดียว
- route ของ section: `/app/sections/[id]` โดย id = encodeURIComponent(`${cycleId}::${reqId}`) เช่น `cycle-demo-2569%3A%3A1.1`
- หลักฐานหลายรอบ: หน้า evidence detail ต้องส่ง `?cycle=` (assessor ต้องมีตอนเปิดหลักฐาน)
- CSS ใหม่ใช้ prefix `.aq-*` ต่อท้าย app/globals.css ใช้ตัวแปรธีมเดิม (warm/cream); CSS เก่า (stu-/teacher) ยังค้างไม่กระทบ
- lint: ยังไม่มี ESLint config (`next lint` ถามแบบ interactive) → ข้าม
- smoke จริงใช้ Playwright กับ `next start` ได้; demo password `demo1234`
- ยังไม่ทำ (Phase B): i18n EN ยังไม่ขยาย dict; UI ยังไม่แสดงว่าไฟล์ binary ยังไม่สแกน PII (review #7)
