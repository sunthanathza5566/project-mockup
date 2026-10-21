# Playbook — qa-tester

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- vitest ต้องใช้ `^3` — vitest 5 ขัด peer `@types/node ^20` (TASK-0001)
- storage ของ lib no-op เมื่อไม่มี `window` → เทสต์ต้อง stub `window.localStorage`/`sessionStorage` (หรือ jsdom); `crypto.subtle` มีใน Node 20+
- `tests/helpers.freshDemo` ใช้ actor super_admin
- เทสต์ล่าสุด 147/147 (รวม `tests/review-fixes.test.ts` 7 เทสต์) ครอบ gap R1–R10, state machine, postcheck, evidence code, PII
- R7 ล็อกว่าคืน [] (รอ M4) — ต้องแก้เทสต์เมื่อทำ M4
- การเพิ่ม dependency ใน package.json เป็นโซน Config กลาง (architect ตัดสิน): TASK-0001 ทำตามคำสั่ง orchestrator แต่ไม่มีบันทึก decision → ครั้งหน้าต้องบันทึกใน TASK ก่อนแก้
