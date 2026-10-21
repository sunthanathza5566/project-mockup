# Playbook — db-engineer

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- seed อยู่ที่ `lib/mock-data/aunqa/{framework,metrics,org,evidence,metrics-demo,index}.ts`: 8 criteria / 53 requirements (จำนวนต่อเกณฑ์ 5/7/6/7/8/6/9/5)
- demo accounts (password `demo1234`): sadmin, uadmin, chair1, staff1, lect1, lect2, data1, fqa1, dean1, assess1 (cycle-demo-2569), uadmin2 (มหาวิทยาลัยที่สอง)
- `DEMO_EVIDENCE[12].extractedText` มีเลขบัตร ปชช. ปลอม `1-1017-00123-45-6` ไว้ทดสอบ PII scan — ห้ามลบถ้า qa ยังอ้างอยู่
- อีเมล/ชื่อ/เบอร์ทั้งหมดสมมติ (โดเมน *.example)
- `textEn` บางข้อเป็นการเรียบเรียงใกล้ Guide v4.0 ไม่ใช่ verbatim → ตรวจกับต้นฉบับก่อนใส่เล่มวิจัย
- seed ไม่มี narrative → ความพร้อมเริ่ม 0% และ lock ไม่ได้ถ้าไม่กรอกเอง 53 ข้อ (review #10 ค้างไว้; ควรเพิ่มรอบเดโม่ที่สองสถานะ under_review)
- ยังไม่มี SQL migration (Phase B) ข้อมูลตอนนี้เป็น seed ล้วน
