# Playbook — frontend-dev

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- ทุก call ผ่าน `@/lib/api`; ต้อง `await initAunqa()` ก่อนใช้ (client เท่านั้น)
- ปุ่ม/เมนูซ่อนตาม can() ได้ แต่ lib ตรวจซ้ำเสมอ อย่าถือว่า UI เป็นด่านเดียว
- route ของ section: `/app/sections/[id]` โดย id = encodeURIComponent(cycleId::reqId) เช่น `cycle-demo-2569%3A%3A1.1`
- หน้า Phase B: `/app/curriculum`, `/app/actions`, `/app/cycles/[id]/assess` (กรรมการ); ปุ่มส่งกลับของคณบดีใช้ prompt บังคับ note
- CSS ใหม่ prefix `.aq-*` ต่อท้าย app/globals.css ใช้ตัวแปรธีมเดิม; ล้าง CSS เก่าแล้วใน B3
- lint: ยังไม่มี ESLint config → ข้าม; smoke จริงใช้ Playwright กับ `next start`; demo password demo1234
- ยังไม่ทำ: EN i18n ยังไม่ขยาย dict
