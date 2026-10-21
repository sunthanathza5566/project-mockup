# Playbook — thesis-writer

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 B6] ตัวเลขผลทดสอบในเล่มต้องรันซ้ำในวันที่เขียน แล้วใส่ comment source (คำสั่ง + วันที่) ใน markdown ไม่คัดจาก log อย่างเดียว. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B6] เติมผู้แต่ง/ชื่อบทความจากความจำ = แต่งอ้างอิง → ใช้เฉพาะที่ researcher เปิดอ่านแล้ว ที่ขาดให้ใช้ "et al." + ป้าย [ต้องตรวจสอบ]. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B6] pandoc ย่อรูปเฉพาะตามความกว้าง ต้องตรวจความสูงรูปใน docx (wp:extent) ทุกครั้งที่เพิ่ม diagram แนวตั้ง. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- build: `python scripts/thesis/build.py all` และ `build.py verify`; pandoc ใช้ pypandoc_binary เมื่อไม่มีใน PATH
- ป้ายค้าง ณ B6: 98 จุด — ห้ามลบก่อนมีหลักฐาน
- ยังไม่มีในเล่ม (ส่งต่อ): ปก/ใบรับรอง/เลขหน้า ก ข ค ต้องจัดใน Word/Gemini; screenshot ยังไม่มี (บท 4.1.2 เป็นป้าย)
- ตัวเลขทดสอบ ณ B6: vitest 285 tests ผ่าน
