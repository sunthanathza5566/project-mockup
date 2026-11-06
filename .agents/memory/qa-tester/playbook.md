# Playbook — qa-tester

## RULES
- [TASK-0001 U2-Q → ใช้ซ้ำ TASK-0002 Q2c, Q2d, Q1, 6 Test] bug ที่พบระหว่างเขียนเทสต์ตรวจรวม: แยก `KNOWN_BUGS` + `test.fail`/`it.fails` ต่อ bug → ชุดเขียว bug ไม่หายเงียบ และขึ้น "expected to fail" ทันทีเมื่อถูกแก้ แล้วถอดออกเมื่อแก้ (reviewer ยืนยัน). ใช้ซ้ำแล้ว 4 ครั้ง
- [incident: TASK-0002 Q2c + R2-F13] `toHaveText` ใช้ textContent → ป้าย responsive (span ซ่อนตามจอ `hidden md:inline`) ได้ข้อความซ้อน → ป้ายที่ "มองเห็น" เทียบด้วย `innerText`. เกิดซ้ำ 2 ครั้ง
- [incident: TASK-0002 Q1 AC-06 dark] ตัวตรวจทุกตัวต้องพิสูจน์ว่าวัดสิ่งที่ตั้งใจจริง: เทสต์ grep มีเคส negative + ตรวจว่าสแกนไฟล์ > N ไฟล์ · เมื่อ ADR เปลี่ยนค่าเริ่มต้น (defaultTheme) ใส่ `afterEach` assert ว่าอยู่ในธีม/สถานะที่ตั้งใจ · เทสต์ fontScale ต้อง assert `--user-scale` ถูกใช้ก่อนวัด · ตัวตรวจ "ปุ่มถูกซ่อน" ฉีด DOM ล้นจริงเป็นเคส negative. ใช้ซ้ำแล้ว 4 ครั้ง (6 Test สุดท้าย, ui-inspector Re-check 3, TASK-0003 S6a, S6b) · เทสต์ "ไม่แตะข้อมูล" (snapshot ก่อน = หลัง) ต้องคู่กับ negative control ที่พิสูจน์ว่า snapshot เปลี่ยนจริงเมื่อเรียกสำเร็จ (TASK-0003 S6a)
- [incident: TASK-0003 tsc เขียวปลอม] `npx tsc --noEmit -p eduflow-next` จาก root repo ได้ exit 0 ปลอม (root ไม่มี typescript → npx ขึ้น "not the tsc command") — รัน `cd eduflow-next && npx tsc --noEmit -p .` เสมอ และอ่านผลว่ามีบรรทัดจาก tsc จริง ไม่ดูแค่ exit code. ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0003 S8)

## LESSONS
- [TASK-0001 U2-Q] วัดขนาดตัวอักษร SVG ต้องคูณ `getScreenCTM().a`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-Q] contrast ของ focus ring วัดพื้นที่อยู่ใต้ ring จริงด้วย `elementsFromPoint`. ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002 Q0 AC-06 dark)
- [TASK-0001 U3 fix] object ที่ store คืนอาจเป็น reference ของ cache → เก็บค่าที่ต้องเทียบเป็น primitive ทันที. ใช้ซ้ำแล้ว 1 ครั้ง (Q2b)
- [TASK-0001 U3 fix] ทดสอบคิว dialog ด้วยสอง flow จริง ตรวจ role=dialog ทีละตัว. ใช้ซ้ำแล้ว 1 ครั้ง (Q2c)
- [TASK-0002 Q0] `page.addInitScript` รันก่อน parser สร้าง `<html>` — สังเกต attribute ของ html ด้วย `observe(document, {subtree:true})` แล้วกรอง `target === documentElement`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Q2b] ทดสอบ "ข้อความไม่เปลี่ยน" ดึงข้อความคาดหวังจาก diff ของ commit ก่อนแก้ ไม่ใช่จากโค้ดปัจจุบัน · ทดสอบ "ไม่มีความลับใน storage" รวมทุก key เป็นข้อความเดียวแล้ว `not.toContain` ทุก secret (token, tokenHash, password hash) — ใช้ส่วนที่เป็นความลับเฉพาะ (`/invite#t=`) ไม่ใช่คำทั่วไปที่อาจอยู่ใน id/fixture (`invite` ชน id `user-invited`, TASK-0003). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0003 S6a scenario-summary)
- [TASK-0002 Q2c] ย้ายปุ่มเข้าเมนูแล้ว คลิกเปิดเมนู = blur ช่องพิมพ์ (autosave ทำงานก่อน) → เปิดเมนูก่อนพิมพ์ถ้าต้องการจังหวะเดิม · ตัวตรวจ "focus ค้าง" เทียบตัว element (WeakMap id) ไม่ใช่ข้อความ. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Q2d] deep link หน้าเดียวกัน: assert "ยังไม่ไฮไลต์" ก่อนคลิก แล้วค่อยตรวจหลังคลิก. ใช้ซ้ำแล้ว 1 ครั้ง (Q1)
- [TASK-0002 6 Test] เทสต์ "กด Tab N ครั้งแล้วอยู่ใน X" ผ่านโดยบังเอิญได้ — แยกตรวจ focus แรก กับ trap (พบ BUG-0002-Q6-1) · จำลอง "การกระทำล้ม" ด้วย page.evaluate แก้ store ระหว่างจอเปิดค้าง ไม่ต้อง mock. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 6 Test r1] guard ใหม่ที่ล็อกข้อมูลตามสถานะทำเทสต์เดิมที่ "ใช้ข้อแรกของ seed" ล้มเงียบ (1.1 = approved) → เทสต์ที่สร้าง/ผูกข้อมูลเลือกข้อที่ยังเขียนได้ (3.6/5.1). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 6 Test r1.5] เทสต์ "ชื่อไม่อยู่ใน facade" ต้องคู่กับ assert ว่าชื่อนั้นยังมีในโมดูลจริง · Playwright นับ `aria-disabled` เป็น disabled → เทสต์ "คลิกแล้วไม่เกิดผล" ใช้ `force: true`. ใช้ซ้ำแล้ว 1 ครั้ง (6 Test หลัง R2-F13)
- [TASK-0003 S6b] วิดีโอสาธิตที่มี toast ค้างจำกัดเวลา: บรรยายรวบเป็นคำบรรยายเดียวก่อนกดปุ่มใน toast แล้วค่อยอธิบายต่อหลังกด (ไม่งั้น toast หายกลางคำบรรยาย). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 S6b] ffmpeg ของ Playwright ไม่มี h264 → บีบ VP9 crf 40 (`compress-videos.mjs`) ลดขนาด ~5 เท่า ตัวหนังสือยังคม คง .webm. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 S6b → S8] ต้อง build แต่ `.next` ถูก dev server ใช้อยู่: `git archive HEAD eduflow-next | tar -x` ลง scratchpad + junction `node_modules` แล้ว build/start ที่นั่น — ได้ HEAD ตรงเป๊ะ ไม่ติด `.next`/artifacts และ saveVideo (path ตาม configFile) เขียนลงสำเนา ไม่ทับ docs ใน repo. ใช้ซ้ำแล้ว 1 ครั้ง (S8)
- [TASK-0003 S8] junction บน Git Bash ใช้ PowerShell `New-Item -ItemType Junction` — `cmd //c mklink /J` ที่ใส่ quote ทำ path เพี้ยนเป็น `\C:\...` แต่ยังขึ้นว่า created. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- vitest ต้องใช้ `^3` — vitest 5 ขัด peer `@types/node ^20`; vitest ไม่ type-check → เรียก API ผิด signature ผ่านเงียบได้ (รัน tsc ด้วย)
- storage ของ lib no-op เมื่อไม่มี window → stub localStorage/sessionStorage; crypto.subtle มีใน Node 20+
- helper ใน `tests/helpers.ts`: freshDemo (ว่าง), freshSeededDemo, driveToLocked, driveToAssessment
- E2E: `eduflow-next/e2e/` + `playwright.config.ts`; `npm run e2e` (webServer = build + `next start -p 3917`; `E2E_REUSE=1` ข้าม build; `E2E_PORT` เปลี่ยน port); context ใหม่ทุก test
- `e2e/**`, `playwright.config.*` เป็นของ qa-tester; `package.json`/`.gitignore` เป็น config กลาง
- ข้อมูลเทสต์ห้ามมีเลข 13 หลัก (เช่น `Date.now()`) ในช่องที่ผ่านตัวตรวจ PII — ใช้ `Date.now() % 100000`; ตรวจ flaky ด้วย `--repeat-each=3`
- helper e2e: `loginAs` ล้าง `aunqa_session`, `pickRequirements(page, ids, prefix)`, `openUserMenu` (logout/ธีม/ขนาดตัวอักษรอยู่ในเมนูผู้ใช้ตั้งแต่ TASK-0002)
- เทสต์ TASK-0002: `tests/{contrast,onboarding,notification-target,account-guards,ui-cleanup,security-r2b3}.test.ts`, `e2e/{theme,shell-r2,onboarding,security-fixes,fix-r2f13,fix-r2f14-f15}.spec.ts` · ผลสุดท้าย (b7a4b4a): vitest 30 ไฟล์ / 837 · e2e 176 passed / 2 skipped x2
- server/build: ก่อน build ตรวจ process `next dev/start` ใน tree เดียวกัน (`Get-CimInstance Win32_Process`) — มีอยู่ = ห้าม build ขนาน · 500 "reading 'call'" จาก `next start` = `.next` ถูกทับ → เทียบเวลา `build-manifest.json` กับ `BUILD_ID` ก่อนสงสัยโค้ด · รอบตรวจที่มีหลาย agent ใช้ server กลางตัวเดียวที่ orchestrator เปิด (ไม่ build/kill เอง)
- Bash: ห้าม `node -e "…"` ที่มี template literal ใน double quote (backtick ถูก shell กิน) → เขียนไฟล์ด้วย Write tool
- (TASK-0003) walkthrough: `playwright.walkthrough.config.ts` (testDir `e2e/walkthrough`, video 1280x720, workers 1) + config หลัก `testIgnore: '**/walkthrough/**'` · helper `e2e/walkthrough/narrate.ts` (caption/setRole/hclick/asUser/loadScenario/saveVideo) · วิดีโอ + `INDEX.md` ที่ `docs/walkthrough/videos/` · ผลสุดท้าย (c97c9ff): vitest 34 ไฟล์/888, e2e 179 passed/2 skipped, walkthrough 12/12 (~20 นาที) · chair1 มี unread 5 ตั้งแต่ seed (F4) · เทสต์ใหม่ `tests/{chair-notify,scenario-pack,scenario-summary,chair-flow}.test.ts`, `e2e/stale-author.spec.ts`
- เครื่องนี้มี `next start` เก่าค้าง (3917, 3926, 3927, 3950, 3951, 3960, 3970–3980) ไม่ใช่ของ qa — ใช้ port ใหม่ (3990/3991) และ kill เฉพาะของตัวเอง
