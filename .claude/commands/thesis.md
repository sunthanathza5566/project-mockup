---
description: อัปเดตเล่มวิจัยให้ตรงกับระบบล่าสุด แล้ว export เป็น .docx และไฟล์สำหรับ Gemini
argument-hint: [บทที่ต้องการ เช่น 3 หรือ all] [หมายเหตุเพิ่มเติม]
---
คำขอเกี่ยวกับเล่มวิจัย: $ARGUMENTS

1. เรียก thesis-writer:
   - ถ้าระบุบท → อัปเดตเฉพาะบทนั้นจากข้อมูลล่าสุดในโปรเจกต์
   - ถ้าไม่ระบุ → ตรวจว่าตั้งแต่ export ครั้งล่าสุด (ดู `thesis/CHANGELOG.md`) มีงานไหนที่ยังไม่ถูกสะท้อนในเล่ม แล้วอัปเดต
2. รัน `python3 scripts/thesis/build.py all`
3. ส่ง `thesis/export/thesis.docx` และ `thesis/export/GEMINI_HANDOFF.md` ให้เจ้าของ
4. สรุป: บทที่เปลี่ยน, ป้ายที่ยังค้าง (ต้องการข้อมูลอะไรจากเจ้าของบ้าง)
5. เรียก xp-keeper ทำ Debrief
