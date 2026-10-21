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
  - (C6) -3 หักเฉพาะเมื่อเจ้าของโค้ดต้องแก้เองจริง; ถ้า orchestrator/เครื่องมือเป็นคนแก้ (C3-1) ไม่หักเจ้าของ
  - (C6) การแก้ที่ทำให้เกิด major ใหม่ (C2-1 จาก fix ของ C-8) → reviewer +8 ในฐานะ major ใหม่ และเจ้าของ -3 ต่อรอบ; ไม่ใช้ -30 เว้นแต่ละเมิด PROTOCOL ข้อห้าม
  - (C6) ทำ finding รอบที่ยังไม่ APPROVE ไม่ให้ +10 "ผ่านรอบ 1" และไม่ให้ XP เจ้าของจนกว่า reviewer ยืนยัน
  - (C6) เลื่อน fix ไปเฟสถัดไปโดย orchestrator (C-7/C-10 → U2) ไม่หักตอนนี้; ตัดสินตอนเฟสนั้นจบ
  - (C6) ข้อค้างเรื่องการอนุมัติ config/ownership (C-12) ไม่หัก -30 จนกว่าจะชัดว่าไม่ได้รับอนุมัติ — ให้ orchestrator ยืนยันใน TASK
  - (C6) ui-inspector/playtester: +8 ต่อ finding ระดับ major ขึ้นไป (blocker นับรวม); playtester รอ U0 จบก่อนให้
- TASK-0001 Phase A + B: ไม่มีบทเรียนที่ถูกอ้างว่าใช้ซ้ำ (counter 0 ทั้งหมด)
- TASK-0001 Phase C + U0 (C6): บทเรียนของ reviewer (regex สองฝั่ง) ถูกอ้างว่าช่วยใน C-1 fix → +5 ให้ reviewer (ผู้เขียนบท); บทเรียนรับเข้า 6 ข้อ (backend-dev LESSONS 3 / RULES 3)
