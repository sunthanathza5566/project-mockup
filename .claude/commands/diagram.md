---
description: สร้างหรืออัปเดต diagram (sequence / activity / usecase / er / class / state / deploy)
argument-hint: <ชนิด> <เรื่อง> เช่น sequence การอัปโหลดหลักฐาน
---
คำขอ diagram: $ARGUMENTS

1. สร้าง TASK file ขนาด S (ถ้ายังไม่มีงานที่เกี่ยวข้อง)
2. เรียก code-reader สรุป flow ที่เกี่ยวข้องจากโค้ดจริง (ข้ามได้ถ้า SYSTEM_MAP มี flow นี้และอัปเดตแล้ว)
3. เรียก diagram-designer สร้าง/อัปเดตไฟล์ `.mmd` + INDEX.md แล้ว render ตรวจ
4. ถ้า diagram นี้อยู่ในเล่มวิจัย → เรียก thesis-writer อัปเดตบทที่ใช้และ export
5. เรียก xp-keeper ทำ Debrief
6. ส่งรูปที่ render แล้ว (`thesis/export/figures/<ชื่อ>.png`) ให้เจ้าของดู
