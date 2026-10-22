# Playbook — qa-tester

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U2-Q] วัดขนาดตัวอักษร SVG ต้องคูณ `getScreenCTM().a` — computed 13px ใน viewBox ที่ถูกย่อเหลือ 7.5px บนจอจริง (พบ BUG-0001-U2Q-1). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-Q] contrast ของ focus ring วัดพื้นที่อยู่ใต้ ring จริงด้วย `elementsFromPoint` นอกกรอบ element ไม่ใช่ ancestor ใน DOM (grid-area วางทับให้ผลต่าง — U2Q-4). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-Q] bug ที่พบระหว่างเขียนเทสต์ตรวจรวม: แยก `KNOWN_BUGS` + `test.fail` ต่อ bug (+ env แสดง error จริง) → ชุดเขียว bug ไม่หายเงียบ และขึ้น "expected to fail" ทันทีเมื่อถูกแก้ (ได้ผลจริงใน U3 fix). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3 fix] object ที่ store คืนอาจเป็น reference ของ cache → เก็บค่าที่ต้องเทียบ (เช่น updatedAt) เป็น primitive ทันที ไม่งั้น assertion ผิดเงียบ ๆ. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3 fix] ทดสอบคิว dialog ไม่ต้อง mock: ให้สอง flow เปิด dialog พร้อมกันจริง (logout ที่ flush เจอ conflict) แล้วตรวจ role=dialog ทีละ 1 ตัวจนครบ. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- vitest ต้องใช้ `^3` — vitest 5 ขัด peer `@types/node ^20` (TASK-0001)
- storage ของ lib no-op เมื่อไม่มี window → เทสต์ต้อง stub localStorage/sessionStorage (หรือ jsdom); crypto.subtle มีใน Node 20+
- helper ใน `tests/helpers.ts`: freshDemo (ว่าง), freshSeededDemo, driveToLocked, driveToAssessment
- regex ไทย JUDGEMENT_RE มีเทสต์ใน `tests/phase-b-review-fixes.test.ts` (BUG-0001-B4-1 ปิดแล้ว)
- เทสต์ล่าสุด (U3 fix + U2-1/U2-2): unit 21 ไฟล์ 528 ผ่าน, e2e 54 passed / 2 skip (E2E-01b, E2E-12b)
- การเพิ่ม dependency ใน package.json เป็นโซน Config กลาง → บันทึก decision ใน TASK ก่อนแก้
- E2E: `eduflow-next/e2e/` + `playwright.config.ts`; `npm run e2e` (webServer = build + `next start -p 3917`; `E2E_REUSE=1` ข้าม build); context ใหม่ทุก test; artifacts `e2e/artifacts/` (gitignore). ณ C3b: 14 ผ่าน, 2 skip (E2E-01b สร้างหลักสูตรผ่าน UI ไม่มี, E2E-12b API 403 ไม่มี HTTP endpoint)
- exceljs + fake timers ค้าง → ใช้ spy `Date.now` แทน (C3a)
- เทสต์ Phase C: `tests/phase-c1.test.ts` (83 เคส) + `tests/phase-c-review-fixes.test.ts`; ณ C4 รอบ 3: 408 ผ่าน
- `e2e/**`, `playwright.config.*` เป็นของ qa-tester; `package.json`/`.gitignore` เป็น config กลาง (C-12 orchestrator อนุมัติย้อนหลังแล้ว)
- ไฟล์เทสต์ Phase U: `tests/{phase-u,contrast,u3-fix}.test.ts`, `e2e/{ui-u,regress-u1b,regress-u3fix}.spec.ts`; helper `loginAs` ล้าง `aunqa_session` ทั้ง local+sessionStorage, `pickRequirements(page, ids, prefix)` แทน selectOption
- ข้อมูลเทสต์ห้ามมีเลข 13 หลัก (เช่น `Date.now()`) ในช่องที่ผ่านตัวตรวจ PII — ใช้ `Date.now() % 100000`
- ui-u ใช้ Google Fonts ออนไลน์ (AC-09 ล้มถ้าไม่มีเน็ต); ทั้งชุด e2e ~1.5 นาที; ตรวจ flaky ด้วย `--repeat-each=3`
