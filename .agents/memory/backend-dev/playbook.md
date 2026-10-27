# Playbook — backend-dev

## RULES
- [incident: TASK-0001 A#1 เกิดซ้ำที่ B7] ห้าม export ฟังก์ชันที่ข้าม guard ออกจาก facade `@/lib/api` ต้องอยู่ใน `*.internal.ts` เท่านั้น · getter ข้อมูลดิบต้องรับ `user` และผ่าน guard เดียวกับ getter หลัก. **ส่วนขยาย TASK-0002 (incident S-05/review #1 + S-09):** facade ใช้ **allow-list รายชื่อ** (ไม่ใช้ `export *` จากไฟล์ที่มี helper เขียน store) — สแกนด้วย regex ไม่จับ primitive ที่เขียนผ่านฟังก์ชันอื่น (`db.save` → `writeJSON`). ใช้ซ้ำแล้ว 3 ครั้ง (U2-B; R2-B2 helper กรรมการ active ไม่ export; R2-B5 allow-list ที่ facade) · **ผิด 1 ครั้งใน R2-B1** (`revokeInvitationsOf` หลุดผ่าน `export *` — reviewer จับ)
- [incident: TASK-0001 BUG-0001-B4-1] regex ที่ตัดข้อความไทย (เช่น JUDGEMENT_RE) ต้องมีตารางเทสต์สองฝั่ง: ต้องตัด (เช่น "ไม่ผ่านเกณฑ์ข้อนี้") และต้องไม่ตัด (เช่น "ความพึงพอใจ 4.51 คะแนน") เพราะประโยคไทยไม่มีตัวแบ่ง ตัด 1 ครั้งอาจหายทั้งย่อหน้า. ใช้ซ้ำแล้ว 2 ครั้ง (C4 รอบ 2 reviewer ยืนยันว่า C-1 test ทำตาม RULE นี้; D-sec PII ต้องจับ 22 / ต้องไม่จับ 15)
- [incident: TASK-0001 C-1 major, DOCX] export ที่สร้าง XML (DOCX/XLSX/SVG) ต้องตัด control char ที่ XML 1.0 ห้าม (`\u0000-\u0008`, `\u000B`, `\u000C`, `\u000E-\u001F`, U+FFFE/FFFF, surrogate เดี่ยว) ก่อนส่งเข้า library เพราะ `docx` escape แค่ `& < >`. ทดสอบด้วย `\u000b` แล้ว unzip `word/document.xml` ดู. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0001 C2-1 major] ถ้า orchestrator/review ระบุพฤติกรรมชัด (เช่น "ป้ายไม่เขียนลง narrative") ให้ทำตามนั้น; ถ้าเห็นว่าไม่ถูก ให้ BLOCKED แล้วถามก่อน ห้ามทำแบบอื่นแล้วเขียนเทสต์ล็อกพฤติกรรมนั้น. ใช้ซ้ำแล้ว 2 ครั้ง (U2-B จดจุดตีความ (ก)-(ช) ให้ยืนยัน; U3 fix BLOCKED signature saveSection)
- [incident: TASK-0001 C3-1 major] หลังแก้ regex ทุกครั้ง grep ไฟล์ยืนยันว่า `\` ยังอยู่ครบ (เครื่องมือเขียนไฟล์บางครั้งกิน `\`) และ probe ด้วย node ก่อนส่ง review เช่น `'students meet'.replace(/^\s+/,'')` ต้องยังขึ้นต้นด้วย "students". **ห้ามใช้ sed/node-stdin แก้ regex หรือข้อความไทยบน Git Bash Windows — ใช้ Edit เท่านั้น** (sed กิน `\`, stdin ทำไทยเพี้ยน — เกิดซ้ำใน D-sec). ใช้ซ้ำแล้ว 3 ครั้ง (D-sec; TASK-0002 R2-B1 `USERNAME_RE`/`EMAIL_RE`/`TOKEN_RE` ครบ; R2-B3 ข้อความไทยแก้ด้วย Edit)

- [TASK-0001 review #2, เลื่อนจาก LESSONS ใน Phase U] store ที่ load ผ่าน readJSON (cache คืน reference ร่วม): validate id/input ทั้งหมดก่อนแก้ object ใดๆ แล้วค่อย save; appendAudit หลัง save สำเร็จเท่านั้น; ค่าที่คืนให้ผู้เรียกที่อาจถือไว้ (เช่น detail.current) ให้คืนสำเนา. ใช้ซ้ำแล้ว 3 ครั้ง (U2-B x2; TASK-0002 R2-B1 setUserRoles/setUserStatus — reviewer ยืนยัน) · ค่าคืนของ write API ที่มี user ใช้ `withoutPassword` ตัวเดียวกันทุกตัว (S-06)

## LESSONS
- [TASK-0001 review] กฎ "AI ห้ามให้คะแนน/เปลี่ยน state" บังคับด้วยโครงสร้าง import + provider interface ที่ไม่มีเมธอดให้คะแนน ดีกว่าเขียนแค่ใน prompt. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B2] seed ที่เปลี่ยนสถานะเริ่มต้นของ entity กลางทำให้เทสต์เดิมพัง → แยก helper `freshDemo` (ว่าง) กับ `freshSeededDemo` ตั้งแต่แรก
- [TASK-0001 B2] กฎ segregation "ผู้เขียนล่าสุด" เก็บฟิลด์แยก (`lastAuthorId`) ไม่ใช้ `updatedBy` เพราะ transition ก็อัปเดต updatedBy
- [TASK-0001 B2 + review] ข้อมูลที่ต้องคงค่าหลัง lock: เก็บค่าตอน lock ไว้ใน snapshot แล้ว verify เทียบกับค่าที่เก็บ ไม่เทียบกับค่าปัจจุบัน; snapshot เลือกเฉพาะ field สาระ + stableStringify ให้ hash คงที่
- [TASK-0001 review R2] endpoint ที่ถือ secret/มีค่าใช้จ่าย: cap (global/นาที/รายวัน) ไม่ขึ้นกับ IP จาก client (ไม่เชื่อ x-forwarded-for เว้น TRUST_PROXY), นับหลัง input guard และก่อนยิง upstream, ตรวจ schema output ฝั่ง server ก่อนคืน
- [TASK-0001 review] ตารางการเปลี่ยนสถานะตารางเดียวใช้ทั้งบังคับใน lib และสร้างปุ่มใน UI
- [TASK-0001 review] AI accept ต้องเดินผ่าน store ปกติ (saveSection/linkEvidence) เพื่อได้สิทธิ์ + lock + citation check + audit โดยไม่มีทางลัดให้ AI
- [TASK-0001 C4 review] import ข้อมูลรายบุคคล (cohort): validate ทั้งชุดก่อน แถวผิดแถวเดียว = ไม่เขียนอะไรเลย, ทำ dryRun คืนผลสรุปก่อนเขียนจริง, ไม่เก็บไฟล์/แถวรายคนค้างไว้รอยืนยัน. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 C4 review] งานแปล/สร้างข้อความด้วย AI: post-check แบบ multiset เทียบรหัสและตัวเลขของต้นฉบับกับผลลัพธ์ (ขาด/เกิน = ธง) ดีกว่า check ทั่วไป. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 C4 review] preview ก่อน commit: ผูก actorId + TTL (30 นาที) + ใช้ได้ครั้งเดียว + จำกัดจำนวนรายการใน memory. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-B] ฟังก์ชัน "เวลาเหลือ/ประเภทหมดอายุ" ใช้ตัวอ่านเดียวกับ getSession (หมดอายุ = คืน null + ล้าง) เพื่อไม่ให้ UI เห็นค่าติดลบที่ขัดกับ getCurrentUser. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3 fix] รับ contract ที่เพิ่มพารามิเตอร์ ให้เทียบตำแหน่ง + ชนิด field กับ signature จริงทันที แล้ว BLOCKED เร็วก่อนฝั่งที่ทำขนานผูกผิด (พบ opts ชน `reason`, string vs number). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D-sec] ตัวกรองคำตัดสินต้องรู้บริบทของ feature — "ระดับ N" ใน AI-7 คือ Bloom ไม่ใช่คะแนน (`stripJudgement(text, {bloomLevels})`); ใช้ filter เดียวทุกที่แล้วผลถูกต้องหายเงียบ ๆ โดยเทสต์เดิมไม่จับ → เพิ่มเทสต์ "ต้องไม่ตัด" ต่อ feature. ใช้ซ้ำแล้ว 0 ครั้ง

- [TASK-0002 R2-B1] async ที่เขียน localStorage หลัง `await` (เช่น hash) ต้องอ่าน store ใหม่และตรวจซ้ำ (ซ้ำ/สถานะ) หลัง await ก่อน save — กันกดซ้ำ/แท็บอื่นแทรก. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-B1] ยืนยันว่าไม่ได้แก้ข้อความไทย: เทียบชุด template literal ที่มีอักษรไทยในบรรทัด `-` กับ `+` ของ diff (`comm -23`) (reviewer ใช้ซ้ำตรวจ). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-B2] guard สถานะบัญชีใส่ที่ helper `assert*` ที่ทุก writer ของโมดูลใช้ร่วม แล้วไล่เฉพาะ writer ที่ไม่ผ่าน helper (~72 จุดไม่ตกหล่น — reviewer สแกนยืนยัน) · กรณี "ไม่พบแถว" ต้องตัดสินให้ชัด ไม่ fail-open (review #4). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 review, reviewer] field ใหม่ที่ทุกผู้เรียกต้องส่ง (เช่น `NotifyInput.messageEn/target`) ทำเป็น required แล้วใช้ tsc พิสูจน์ความครบ แทนการนับจุดด้วยตา. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0002 P1/S-08, R2-B4] guard ที่ล็อก "เนื้อหา" ของ entity ต้องครอบทุก write ที่เปลี่ยนสิ่งที่ entity แสดง รวมตารางลิงก์ (ผูก/เลิกผูกหลักฐาน) และเนื้อหาของสิ่งที่อ้างถึง — หรือประกาศเป็น by-design. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0002 S-01, R2-B3] ข้อมูลส่วนบุคคลที่ประกาศว่า "ลบทันที" ต้องมี key ผูกกลับทุกสำเนา (เช่น `dedupeKey: access_request:<id>` ของแจ้งเตือน) ตั้งแต่ตอนสร้าง ไม่งั้นต้องไล่จับด้วยข้อความ. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- facade จุดเดียว `@/lib/api` (lib/api/index.ts); ทุก write รับ `actor: AppUser` และ throw `AunqaError` (.code/.message/.detail)
- storage: localStorage key prefix `aunqa_` ผ่าน lib/api/storage-cache.ts (readJSON/writeJSON); no-op เมื่อไม่มี window
- workflow: `CYCLE_TRANSITIONS`/`SECTION_TRANSITIONS`; action: `ACTION_TRANSITIONS`
- PII heuristic: เลขบัตรแบบมีขีดติดธงเสมอ; 13 หลักติดกันต้องผ่าน checksum; ยังไม่มี NER ชื่อคน; ไฟล์ binary ยังไม่ extract text
- AI route `app/api/ai/route.ts`: ratelimit/guards ที่ `lib/api/ai/{ratelimit,guards}.ts`; key อ่านจาก env ฝั่ง server เท่านั้น
- `.doc` export เป็น HTML (ไม่ใช่ DOCX จริง); audit ไม่มี hash chain; RBAC ยังอยู่ฝั่ง browser (MVP) → ต้องย้ายไป server + RLS
- ค้างจาก Phase B: หลักฐานข้ามปี (copyFromCycleId) ยังไม่ออกแบบ; dean ส่งกลับได้แล้ว; R7 ทำงานจริงแล้ว (curriculum)
- export DOCX: `lib/api/export-docx.ts` (ไลบรารี `docx`) ใช้ `xmlSafe` ทุก run/title; narrative แบ่งบรรทัดด้วย `/\r\n|\r|\n/`
- `lib/api/export-bundle.internal.ts` = loadBundle ที่ใช้ร่วมกับ export; ไม่ export ออก facade
- AI translate (AI-4): เพดาน 8,000 ตัวอักษร**หลัง** redact, `MAX_TOKENS.translate` 8192; ธง `needsTranslationReview` (R11) ล้างได้ทาง `confirmTranslationReviewed` เท่านั้น; offline translate ไม่มีป้ายใน narrative
- ค้างจาก C4 รอบ 1 ที่ฝั่ง frontend (C-7, C-10) ไม่ใช่งาน backend
- สคริปต์ตรวจชั่วคราวด้วย vitest ใน scratchpad: config เป็น object ธรรมดา (ไม่ import `vitest/config` — resolve ไม่เจอ) + `test.dir` ชี้ scratchpad + setupFiles ของโปรเจกต์ (U2-B)
- Phase U API: session localStorage (idle 4 ชม./absolute 12 ชม., `touchSession({force})`, `sessionTimeLeft`, `subscribeSession`), `listMyTodos` 15 kind (`lib/api/todo.ts`), `getTransitionPreflight` (`lib/api/preflight.ts`, รองรับ to:'closed'), `saveSection(..., reason, opts?: {baseUpdatedAt:number})` → `AunqaError('conflict')`; เหตุผลส่งกลับอ่านจาก `listReviewEvents`
- D-sec: `normalizeForPii` (เลขไทย/full-width → ASCII 1:1 ตำแหน่งตรง), +66/0066, keyword รหัสนักศึกษา 7–12 หลัก; false positive ที่ยอมรับ = เลข 8–11 หลักขึ้นต้น 4–6; prompt ห่อ `<input_data>` (escape `< >`); `inspectZipDirectory` ≤60MB/≤1,000 entry ก่อน `wb.xlsx.load`; `piiOf` รวมชื่อไฟล์; เทสต์ `tests/security-dsec.test.ts`
- ข้อค้าง (ไม่บล็อก): store คืน reference ของ cache; conflict ใช้ ms timestamp → ตอนย้าย PostgreSQL ใช้ revision counter; PII จับเลข 13 หลักในชื่อหลักฐาน (ตั้งใจ)
- (TASK-0002) onboarding: `lib/api/onboarding.store.ts` (คำขอเข้าใช้งาน/เชิญ: token 256 bit ใน fragment, เก็บแค่ tokenHash, ใช้ครั้งเดียว, TTL 7 วัน = deviation จาก NIST ห้ามเขียนว่า "ตาม NIST"), `invitation.internal.ts`, `notification.internal.ts` (purge) · สถานะบัญชี `UserStatus` (ไม่มี = active) + `requireActiveActor` ทุก writer · `ROLE_SCOPE_TYPES` (frozen) บังคับคู่บทบาท↔ขอบเขต · แจ้งเตือนมี `messageEn` + `target` บังคับ
- (TASK-0002) backlog backend: P12 ส่งผลประเมินรายกรรมการ (`submitAssessment` + submittedAt) · S-08 หลักฐานของข้อ approved ยังอัปเวอร์ชันได้ (Low, by-design ชั่วคราว)
