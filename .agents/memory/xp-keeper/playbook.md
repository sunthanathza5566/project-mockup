# Playbook — xp-keeper

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- บน Windows: python3/python ใน PATH เป็น alias ของ Store → ใช้ `/c/Users/User/AppData/Local/Programs/Python/Python312/python.exe`
- argv ภาษาไทยจาก Git Bash เพี้ยน → เขียนสคริปต์ Python (UTF-8) ใน scratchpad, sys.path.insert ไปที่ scripts/agents แล้วเรียก xp.cmd_award(...) ตรง ๆ (วิธีที่ใช้ได้ใน TASK-0001 B7)
- ข้อความไทยใน console Windows แสดงเพี้ยนได้แม้ ledger ถูกต้อง → ตรวจด้วย json.loads ของไฟล์ ไม่ดูจาก terminal
- ก่อน award ทุกครั้ง อ่าน ledger ตรวจว่าไม่มีแถว task นั้นซ้ำ (กัน XP ซ้ำเมื่อ session ถูกตัดกลางงาน)
- การตีความที่ใช้ (คงไว้ให้สม่ำเสมอ):
  - ขนาดของ "ส่งงานเฟสตัวเอง" ใช้ขนาดของเฟสย่อย ไม่ใช่ขนาด TASK
  - review APPROVE พร้อม minor ไม่ใช่ CHANGES_REQUESTED → ไม่หัก -3; ถ้าเจ้าของโค้ดแก้ minor หลัง review จะไม่ได้ +10 "ผ่านรอบแรก"
  - review CHANGES_REQUESTED ทั้งเฟส แต่ไฟล์ของ agent ใดไม่มี finding → agent นั้นได้ +10 "ผ่านรอบ 1" (ยึดหลักฐานรายไฟล์); agent ที่มี finding ต้องแก้ → -3 ต่อรอบ
  - follow-up ที่ระบุว่า "ไม่บล็อก" และรอบถัดไป APPROVE → ไม่หัก
  - ไม่ให้ XP "ผ่านเทสต์ครบรอบแรก" ถ้า log ไม่ระบุว่ารอบแรก
  - ค่าที่รอ reviewer ตรวจ (เช่น diagram accuracy +5) ยังไม่ให้จนกว่า reviewer ตรวจจริง
  - orchestrator ไม่อยู่ในระบบ XP
  - บทเรียนที่เกิดซ้ำหลังรับเข้าแล้วเลื่อนเป็น RULES ได้ (เช่น A#1 → B7)
- TASK-0001 Phase A + B: ไม่มีบทเรียนที่ถูกอ้างว่าใช้ซ้ำ (counter 0 ทั้งหมด)
