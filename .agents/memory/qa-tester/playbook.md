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
- E2E: `eduflow-next/e2e/` + `playwright.config.ts`; `npm run e2e` (webServer = build + `next start -p 3917`; `E2E_REUSE=1` ข้าม build); context ใหม่ทุก test; artifacts `e2e/artifacts/` (gitignore). ณ C3b: 14 ผ่าน, 2 skip (E2E-01b สร้างหลักสูตรผ่าน UI ไม่มี, E2E-12b API 403 ไม่มี HTTP endpoint)
- exceljs + fake timers ค้าง → ใช้ spy `Date.now` แทน (C3a)
- เทสต์ Phase C: `tests/phase-c1.test.ts` (83 เคส) + `tests/phase-c-review-fixes.test.ts`; ณ C4 รอบ 3: 408 ผ่าน
- `e2e/**`, `playwright.config.*` เป็นของ qa-tester; `package.json`/`.gitignore` เป็น config กลาง (C-12 ยังรอ orchestrator บันทึกอนุมัติ)
