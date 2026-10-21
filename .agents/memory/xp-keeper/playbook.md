# Playbook — xp-keeper

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- บน Windows: `python3`/`python` ใน PATH เป็น alias ของ Store ใช้ไม่ได้ → ใช้ `/c/Users/User/AppData/Local/Programs/Python/Python312/python.exe scripts/agents/xp.py ...`
- TASK-0001: reason ภาษาไทยที่ส่งผ่าน Git Bash เพี้ยนเป็นตัวอักษรขยะในไฟล์ ledger (แก้แล้วด้วยสคริปต์ปรับ field reason เฉพาะแถวนั้น, แต้มไม่เปลี่ยน) → หลัง award ทุกครั้งให้ตรวจข้อความใน ledger/board หนึ่งรายการ ก่อนส่งงานต่อ
- การตีความที่ใช้ใน TASK-0001 (คงไว้เพื่อให้สม่ำเสมอ):
  - ขนาดของ "ส่งงานเฟสตัวเอง" ใช้ขนาดของเฟสย่อยที่ได้รับมอบหมาย ไม่ใช่ขนาด TASK
  - review APPROVE พร้อม minor ไม่ใช่ CHANGES_REQUESTED → ไม่หัก -3; แต่ถ้าเจ้าของโค้ดแก้ minor หลัง review จะไม่ได้ +10 "ผ่านรอบแรกไม่ต้องแก้"
  - orchestrator ไม่อยู่ในระบบ XP; งานที่ orchestrator ทำแทน agent ไม่ให้ XP ใคร
