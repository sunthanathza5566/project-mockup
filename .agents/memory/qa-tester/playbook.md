# Playbook — qa-tester

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- vitest ต้องใช้ `^3` — vitest 5 ขัด peer `@types/node ^20` (TASK-0001)
- storage ของ lib no-op เมื่อไม่มี window → เทสต์ต้อง stub localStorage/sessionStorage (หรือ jsdom); crypto.subtle มีใน Node 20+
- helper ใน `tests/helpers.ts`: freshDemo (ว่าง), freshSeededDemo, driveToLocked, driveToAssessment
- regex ไทย JUDGEMENT_RE มีเทสต์ใน `tests/phase-b-review-fixes.test.ts` (BUG-0001-B4-1 ปิดแล้ว)
- เทสต์ล่าสุด 285 ผ่าน (ณ B6); R7 ทำงานจริงแล้ว
- การเพิ่ม dependency ใน package.json เป็นโซน Config กลาง → บันทึก decision ใน TASK ก่อนแก้
