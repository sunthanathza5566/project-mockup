# Playbook — db-engineer

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- seed ที่ `lib/mock-data/aunqa/{framework,metrics,org,evidence,metrics-demo,narratives,curriculum,actions,index}.ts`: 8 criteria / 53 requirements
- demo accounts (password demo1234): sadmin, uadmin, chair1, staff1, lect1, lect2, data1, fqa1, dean1, assess1 (cycle-demo-2569), uadmin2
- `DEMO_EVIDENCE[12].extractedText` มีเลขบัตร ปชช. ปลอม `1-1017-00123-45-6` ไว้ทดสอบ PII scan — ห้ามลบถ้า qa ยังอ้างอยู่
- narratives 53 ข้อ (approved 45 / ready 5 / drafting 3) + curriculum (6 PLO, 12 วิชา, 23 CLO; PLO6 ไม่มีวิชา, PLO4 ไม่มีวิธีวัด) + action items 6 รายการ — ใช้ทดสอบ R7 และ M14
- อีเมล/ชื่อ/เบอร์ทั้งหมดสมมติ (โดเมน *.example); textEn บางข้อใกล้ Guide v4.0 ไม่ใช่ verbatim → ตรวจกับต้นฉบับก่อนใส่เล่ม
- ยังไม่มี SQL migration ข้อมูลเป็น seed ล้วน
