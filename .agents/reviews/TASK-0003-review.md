# TASK-0003 Review (S5) — S3 (F1/F2/F3/F4 wire) + S4 (scenario seed) + S3d (UI loader)

- ขอบเขต: `git diff 7867278..HEAD -- eduflow-next` (21 ไฟล์, +1837/−55) บน `feat/TASK-0003-role-walkthrough` (HEAD 16c3477)
- Study: playbook reviewer LESSONS (grep ผู้เรียกทั้ง repo, facade `export *`, ตามรอย fix ไปถึง output จริง) + RULES ใน playbook ของ frontend-dev / backend-dev / db-engineer
- รันเอง: `npx tsc --noEmit -p .` → 0 error · `npx vitest run` → 31 files / 850 passed (5.6s) · สแกน emoji/`outline-none` ใน diff → ไม่พบในช่วง U+2600–27BF (เจอแค่ `↔` U+2194 ในคอมเมนต์ `standard-extras.ts:14` ซึ่งอยู่นอกช่วงที่ e2e grep) · lint: โปรเจกต์ยังไม่มี ESLint config (สภาพเดิม)

Verdict: **CHANGES_REQUESTED** (major 1 ข้อ — แก้ไม่ยาก โซน frontend เท่านั้น)

| # | severity | file:line | ปัญหา | ข้อเสนอแก้ (โซนเจ้าของ) |
|---|----------|-----------|-------|--------------------------|
| 1 | **major** | `eduflow-next/components/aunqa/SarWorkspace.tsx:347-353` (+ pattern `lib/i18n/dict-phase-u.ts:866`) | toast หลังส่งเมื่อ `notifiedCount === 0 && selfReview` บอกว่า "แนะนำมอบหมายข้อให้อาจารย์เป็นผู้เขียนและส่งตรวจ" พร้อมปุ่ม "ไปหน้ามอบหมายงาน" — แต่ตอนนั้นข้อเป็น `ready_for_review` แล้ว: อาจารย์ที่ได้รับมอบหมายแก้ไม่ได้ (`EDITABLE_SECTION` ไม่มี ready_for_review, `SarWorkspace.tsx:52`) และส่งซ้ำไม่ได้ (ไม่มี transition ready→ready, `workflow.ts:44-48`) ส่วนประธานที่เป็นผู้เขียนล่าสุดก็อนุมัติไม่ได้ (`workflow.ts:415-416`) → ทำตามคำแนะนำแล้ว**ติดทางตัน** ซึ่งเป็นอาการเดียวกับที่เจ้าของเจอ (AC1). ทางที่ถูกคือ "ส่งกลับแก้ไข → มอบหมาย → อาจารย์เขียนแล้วส่งใหม่" ตามที่ scenario `sec-self-written` เขียนไว้เองใน expectTh (`scenarios/sections.ts`). นอกจากนี้ toast ฟันธงโดยไม่มีเงื่อนไข ทั้งที่ `selfReview` ไม่ดู `lastAuthorId` (dialog ใช้ "ถ้า…" ถูกแล้ว แต่ toast ไม่ใช้ — ขัดกับ LESSON CANDIDATE ของ frontend-dev เอง) | เปลี่ยนข้อความ toast เป็นแบบมีเงื่อนไข + ขั้นที่ครบ เช่น `ส่งตรวจข้อ X แล้ว แต่ไม่มีประธานหลักสูตรคนอื่นได้รับแจ้งเตือน — ถ้าคุณเป็นผู้เขียนล่าสุด ให้ส่งกลับแก้ไขข้อนี้ แล้วมอบหมายให้อาจารย์เขียนและส่งตรวจใหม่` และปรับ pattern EN คู่กัน; ปุ่ม action จะคงไปหน้ามอบหมายก็ได้ (ไม่ผิดเมื่อข้อความบอกขั้นส่งกลับก่อนแล้ว) — **frontend-dev** |
| 2 | minor | `eduflow-next/lib/mock-data/aunqa/scenarios/**`, `standard-extras.ts` (ไม่มีเทสต์ใน `tests/`) | AC2 (27 เคส ~1,100 บรรทัด) และ F4 ไม่มีเทสต์ที่ commit เลย — smoke 38 เคสอยู่ใน scratchpad ของ db-engineer ซึ่งหายไปแล้ว; ถ้า API เปลี่ยน loader จะพังตอนกดในแท็บเดโม่โดยไม่มีอะไรเตือน. F4 ที่ผู้ใช้เห็น (chair1 ยังไม่อ่าน 5 รายการคู่ข้อ ready_for_review, staff1 เป็นเจ้าของ 3.6, เรียกซ้ำไม่เกิดแถวซ้ำ) ก็ยังไม่ถูกล็อก (`chair-notify.test.ts` ใช้ `unreadBefore` แบบสัมพัทธ์) | ทำใน S6 ก่อน merge (ตาม HANDOFF 2 ของ db-engineer) — อย่างน้อย: โหลดทีละ id ครบทุกเคสไม่ throw, `loadScenarioPack('all')` สองรอบติด (up→down→up), id ผิด reject โดยไม่แตะข้อมูล, `Date.now` กลับเป็นตัวเดิมหลัง `user-invited` แม้ fn throw, F4: N3 ของ chair1 = 5 และ `applyStandardSeedExtras` ครั้งที่ 2 คืน 0 — **qa-tester** (ถือเป็นเงื่อนไขด่าน S6) |
| 3 | minor | `docs/guide/11-lecturer.md:107`, `docs/guide/00-overview.md:338-339`, `docs/guide/10-programme-chair.md:24,54` | ตัวเลข/ข้อความในคู่มือเพี้ยนจากโค้ดใหม่: toast "ส่งตรวจข้อ 3.6 แล้ว — ประธานหลักสูตรได้รับแจ้งเตือน" ไม่มีแล้ว (F1), "มอบหมายผู้เขียน 7 ข้อ" → 6, ตัวอย่าง "มอบหมาย 3.6, 5.1, 7.9 ให้ staff1" / "งานเขียน 3 ข้อ" (3.6 เป็นของ staff1 แล้ว). handoff ของ db-engineer จดไว้แค่ 10:24 และ 00:338 — ขาด 11:107, 00:339, 10:54 | ใส่ใน Found Issues ให้ docs-writer (S7) แก้ครบทั้ง 5 จุด — **docs-writer** |
| 4 | nit | `eduflow-next/lib/mock-data/aunqa/scenarios/helpers.ts:89-94` | `withClockShift` แทน `Date.now` ทั้ง global ระหว่าง `await fn()` (hashPassword เป็น async) → โค้ดอื่นในแท็บที่รันช่วงนั้น (touchSession, toast timer) เห็นนาฬิกาย้อน 8 วัน. restore ใน finally ถูกต้อง และ loader ล้าง session ตอนจบ ผลกระทบจึงต่ำ | คงไว้ได้; ถ้าจะให้แน่นขึ้น จดคอมเมนต์ข้อจำกัดนี้ หรือสร้าง invitation ปกติแล้วค่อยเลื่อน `expiresAt` ผ่าน helper ภายใน — db-engineer |
| 5 | nit | `eduflow-next/lib/mock-data/aunqa/standard-extras.ts:53` | นิยาม "ผู้รับ N3" ใช้ `can(u,'sar.approve')` ขณะที่ workflow ใช้ `chairsOf` (role programme_chair) — ปัจจุบันให้ผลเท่ากัน แต่เป็นสองนิยามของเรื่องเดียว (ขัดกับ LESSON ของ backend-dev "preview กับการทำจริงต้องใช้ฟังก์ชันเลือกผู้รับตัวเดียวกัน") | ใช้ `submitRecipientsOf(cycle, s.lastAuthorId ?? '')` จาก `lib/api/workflow` (import ภายในได้ ไม่ผ่าน facade) — db-engineer |
| 6 | nit | `eduflow-next/components/aunqa/SarWorkspace.tsx:353` | ผู้ส่งที่ไม่ใช่ประธาน + ไม่มีประธาน active: toast ใช้คำ "ประธานหลักสูตร**คนอื่น**" ซึ่งชวนให้เข้าใจว่าผู้ส่งเป็นประธาน (dialog แยกข้อความไว้ถูกแล้ว) | กรณี `!selfReview` ใช้ "แต่ยังไม่มีประธานหลักสูตรที่ใช้งานอยู่ได้รับแจ้งเตือน" — frontend-dev (แก้พร้อมข้อ 1) |
| 7 | nit | `eduflow-next/lib/i18n/dict-phase-u.ts:876-878` | pattern EN ของ error ส่ง `m[1]` (ข้อความ error ไทยจาก loader) ออกไปตรง ๆ → โหมด EN ยังเห็นไทยครึ่งประโยค | ส่งผ่าน `tr(m[1])` แบบ pattern เกณฑ์ (ได้ผลเฉพาะ error ที่มีใน dict) หรือยอมรับเป็นข้อจำกัด (error ภายในเดโม่) — frontend-dev |
| 8 | nit | `eduflow-next/components/aunqa/admin/DemoTab.tsx:129-142` | ปุ่ม `reset-demo` เดิมไม่ตั้ง `busy` → ระหว่างรีเซ็ตแบบเดิม ปุ่ม scenario ยังกดได้ (ทางกลับกันถูกปิดแล้ว) | ให้ปุ่มเดิมใช้ `setBusy('reset')` เหมือนกัน หรือรวมเป็นปุ่มเดียวตามที่ frontend-dev เสนอ — frontend-dev |

## ตรวจตามจุดเน้นแล้วผ่าน
1. **F3 backend** — `transitionSectionCounted` คงลำดับ guard/error เดิมทุกบรรทัด (active → not_found → bad_transition → locked → forbidden → invalid note → segregation → narrative ว่าง); ข้อความแจ้งเตือนไม่เปลี่ยนตัวอักษร; `notified` นับเฉพาะ `notify()` ที่คืน non-null; `submitSectionCore` ไม่ export; `submitRecipientsOf`/`transitionSectionCounted` ไม่อยู่ใน allow-list ของ facade (`lib/api/index.ts` แบบรายชื่อ; `sar.store` `export *` ไม่ re-export) + มีเทสต์ยืนยัน; `previewSubmitRecipients` = active → not_found → `can(read)` (ต่าง tenant forbidden) แล้วคืนแค่จำนวน; preview กับของจริงใช้ `submitRecipientsOf` ตัวเดียว (ตัวเลข dialog = toast). API เดิมคืน `SarSection` ไม่ขยับ (ผ่าน RULE C2-1 / B7)
2. **F1/F2 dialog** — preview ล้มแล้วไม่อ้างจำนวน; หัว dialog กลาง ๆ เมื่อ 0; คำเตือนใช้ "ถ้าคุณเป็นผู้เขียนล่าสุด" (ไม่ฟันธง); ลิงก์มอบหมายแสดงเฉพาะ `cycle.assign` และ `dismissAll()`; testid เดิม/ปุ่ม "ยืนยันส่งตรวจ…"/"กลับไปเติมก่อน" ไม่เปลี่ยน; ไม่มีเทสต์/e2e อ้างข้อความ toast เก่า; i18n 5 key + 5 pattern ครบ
3. **F4 + init.ts** — วางหลังเขียนสถานะ narrative ก่อน `KEYS.seeded`; idempotent (มอบซ้ำข้าม, `dedupeKey` ต่อผู้ใช้ตาม `notify()` บรรทัด 39); ข้ามผู้เขียนล่าสุด; ไม่ import facade (ไม่มีวงจร); เทสต์ที่ผูกจำนวนตามแก้ครบ (7→6, 3.6→5.1)
4. **Scenario pack** — สร้างผ่าน API จริง (ข้อยกเว้นเดียว: องค์กร uni2 2 แถว จดไว้แล้ว); id ผิด reject ก่อนแตะข้อมูล; ล้มกลางทางล้าง session + ข้อความระบุเคส; ข้อมูลปลอมทั้งหมด (โดเมน `.example`, ชื่อ "(สมมติ)", ไม่มีเบอร์โทร); `withClockShift` คืนค่าใน `finally`
5. **UI loader** — guard super_admin สองชั้น (หน้า + คอมโพเนนต์ render null + handler ตรวจซ้ำ); ทุกปุ่ม confirm variant danger ก่อนล้าง; ล็อกปุ่มระหว่างโหลด + `aria-live`/`aria-busy`; native `<details>`/`<a>`/`<button>`; target ≥44px (`min-h-11`, `size="icon"` = h-11 w-11); container query `48rem`; token สี/ไอคอนที่ใช้มีจริง; ลิงก์เชิญถูกตัดออกจาก sessionStorage ทันทีที่อ่าน (ให้ security-auditor ยืนยันต่อ)

## ข้อดีที่ควรเก็บเป็นบทเรียน
- backend-dev: แยก `*Counted`/`*Core` คืน object แล้วให้ฟังก์ชันเดิมเป็น wrapper — API เดิมไม่ขยับ, helper ภายในไม่หลุด facade, และใช้ฟังก์ชันเลือกผู้รับตัวเดียวทั้ง preview และของจริง — ควรเลื่อนเป็น RULE
- db-engineer: seed ที่ต้องมีผลข้างเคียงเดินผ่าน API จริง และเมื่อจำเป็นต้องสร้างผลข้างเคียงเอง ใช้ข้อความเดียวกับโค้ดจริง + dedupeKey; จำลอง wire ด้วย vite transform เพื่อชี้เทสต์ที่จะพังแบบ file:line ก่อนแตะไฟล์นอกโซน
- frontend-dev: guard สองชั้นสำหรับฟังก์ชันที่ไม่ตรวจสิทธิ์เอง และ "take แล้วตัด token" สำหรับ sessionStorage ข้ามหน้า
- reviewer (บทเรียนตัวเอง): ข้อความแนะนำ "ขั้นต่อไป" ใน toast/dialog ต้องไล่ state machine จริงว่าทำตามได้ในสถานะ **หลัง** action ไม่ใช่สถานะก่อน — finding #1 เจอเพราะเอาคำแนะนำมาเดินตาม `SECTION_TRANSITIONS` + `EDITABLE_SECTION`

## ต้องตรวจซ้ำรอบถัดไป
- ข้อ 1 (บังคับ) + ข้อ 6 ถ้าแก้พร้อมกัน: diff `SarWorkspace.tsx` + `dict-phase-u.ts`, รัน tsc + vitest, ตรวจ EN ของข้อความใหม่ด้วย `lookupEn`
- ข้อ 2 ตรวจใน S6 (qa) — ถ้าไม่มีเทสต์ scenario/F4 ใน `tests/` ก่อน S8 ให้ถือเป็น major ในรอบตรวจสุดท้าย

---

# รอบ 2 (S5) — ตรวจ fix commit 4bd032a

- ขอบเขต: `git show 4bd032a -- eduflow-next` (8 ไฟล์ใน eduflow-next) เทียบ review รอบ 1 (#1, #4, #5, #6, #8) + security S-1/S-2/S-3 (ตรวจแทน security-auditor — **ตรวจแล้วจริงด้วย probe** ผลอยู่ด้านล่าง)
- รันเอง: `npx tsc --noEmit -p .` → 0 error · `npx vitest run` → 31 files / 850 passed · probe ของ reviewer (scratchpad ไม่ commit: `scratchpad/rev0003/probe.test.ts` + `vitest.probe.config.ts`) → **7/7 ผ่าน**
- Ownership: `lib/mock-data/aunqa/**` = db-engineer · `components/**`, `lib/ui/**`, `lib/i18n/**` = frontend-dev ตรงตาม Log ทั้งสอง ไม่มีไฟล์นอกโซน · ไม่มีของเกินที่ไม่ได้ขอ

Verdict: **APPROVE**

| # | severity | file:line | ปัญหา | ข้อเสนอแก้ |
|---|----------|-----------|-------|------------|
| R2-1 | minor | `eduflow-next/components/aunqa/SarWorkspace.tsx:409` (canSubmit) + `lib/api/workflow.ts:415` | ทางตันย่อยที่ยังเหลือ (ไม่ใช่ regression): หลังประธานส่งกลับ→มอบหมาย ถ้าอาจารย์กด "ส่งตรวจ" **โดยไม่แก้เนื้อหา** `lastAuthorId` ยังเป็นประธาน → ประธานได้แจ้งเตือน (toast ของอาจารย์บอก "แจ้งประธาน 1 คน") แต่อนุมัติไม่ได้ (probe R1b ยืนยัน) · กู้ได้: ประธานเห็น `segregation-note` และส่งกลับซ้ำได้ จึงไม่ใช่ทางตันจริง | dialog ส่งตรวจของผู้ที่ไม่ใช่ประธาน เตือนเมื่อ `section.lastAuthorId && section.lastAuthorId !== user.id` เช่น "เนื้อหาข้อนี้ยังเป็นของผู้เขียนคนก่อน ถ้าผู้เขียนคนก่อนเป็นประธาน ประธานจะอนุมัติไม่ได้ — แก้หรือเพิ่มเนื้อหาก่อนส่ง" — frontend-dev · qa-tester ใส่เคสนี้ใน S6 |
| R2-2 | nit | `eduflow-next/components/aunqa/SarWorkspace.tsx:547` (ของเดิม ไม่อยู่ใน diff) | `segregation-note` ตอนข้อเป็น `ready_for_review` แนะนำ "ให้มอบหมายข้อนี้ให้ผู้อื่นปรับหรือส่งตรวจ" — อาการเดียวกับ #1 (ผู้ถูกมอบหมายแก้ไม่ได้จนกว่าจะส่งกลับ) แต่ประโยคเดียวกันมี "หรือกด ส่งกลับแก้ไข" จึงไม่ตัน | ปรับเป็น "กด ส่งกลับแก้ไข แล้วมอบหมายให้ผู้อื่นปรับและส่งตรวจ จากนั้นคุณจึงอนุมัติได้" ให้ตรงกับ toast ใหม่ — frontend-dev (ทำพร้อม R2-1 ได้) |
| R2-3 | nit | `eduflow-next/lib/mock-data/aunqa/scenarios/index.ts` (`assertResetActor`) | เช็ก role จาก object ที่ส่งเข้ามา และ `requireActiveActor` เช็กสถานะจาก store — actor ปลอมที่ id ไม่มีใน store ผ่านได้ (เหมือน `resetDemo` เดิม และ `tests/helpers.ts` ใช้ TEST_ADMIN แบบนี้) · ในชั้น localStorage ยอมรับได้ | ไม่ต้องแก้ตอนนี้ · บน backend actor ต้องมาจาก session ฝั่ง server เท่านั้น (อยู่ใน (ก)-1 ของ security แล้ว) |

## ผลตรวจรายข้อจากรอบ 1

| รอบ 1 | สถานะ | หลักฐาน |
|-------|-------|---------|
| **#1 major** toast ทางตัน | **แก้แล้ว** | toast มีเงื่อนไข "ถ้าคุณเป็นผู้เขียนล่าสุด…" + ขั้นครบ (ส่งกลับ→มอบหมาย→อาจารย์เขียนและส่งใหม่) · ปุ่ม action เป็น "ส่งกลับแก้ไขข้อนี้" (แสดงเมื่อ `can(sar.return)`) → prompt บังคับ note ยกเลิกได้ → สำเร็จแล้ว toast + ปุ่ม "ไปหน้ามอบหมายงาน" (เมื่อ `canAssignWork`) · ไล่ state machine: `ready_for_review→changes_requested` ด้วย `sar.return` ไม่มี segregation · `assignSections` ไม่จำกัดสถานะข้อ · `changes_requested` อยู่ใน `SECTION_EDITABLE`/`EDITABLE_SECTION` · `saveSection` ตั้ง `lastAuthorId` = อาจารย์ · submit แจ้ง `submitRecipientsOf(cycle, lect)` = ประธาน · approve ผ่าน segregation · **probe R1 เดินครบทั้งเส้นทางผ่าน API จริง: chair เขียน → preview 0 → submit (notified 0, selfReview true) → approve ถูกปฏิเสธ → return → assign lect1 → แก้ได้ → lect บันทึก → preview 1 → submit (notified 1) → แจ้งเตือนประธาน +1 → approve = approved** · closure ของปุ่มใน toast หลัง `remount()` ใช้ `prompt`/`router` จาก context และ `remount` จาก parent จึงยังทำงานได้; ถ้าสถานะข้อเปลี่ยนก่อนกด `returnSection` จะ throw แล้วแสดง error toast (ไม่เงียบ) · dialog ก่อนส่งแนะนำ "ยังไม่ส่ง…(ถ้าส่งไปแล้ว ต้องส่งกลับแก้ไขก่อน)" ถูกต้อง |
| #4 nit `withClockShift` | แก้แล้ว (comment ข้อจำกัด + ห้ามพาไป backend) | `scenarios/helpers.ts` doc comment |
| #5 nit นิยามผู้รับ N3 | แก้แล้ว | `standard-extras.ts` ใช้ `submitRecipientsOf(cycle, s.lastAuthorId ?? '')` · ลบ import ที่ไม่ใช้ · probe: chair1 N3 = 5 = ข้อ ready ทั้งหมด, `applyStandardSeedExtras` ครั้งที่ 2 คืน 0 |
| #6 nit "คนอื่น" | แก้แล้ว | กรณี `!selfReview` = "แต่ยังไม่มีประธานหลักสูตรที่ใช้งานอยู่ได้รับแจ้งเตือน" |
| #7 nit EN error loader | ไม่แก้ (ยอมรับเป็นข้อจำกัดภายในเดโม่ — frontend-dev จดไว้) | ยอมรับ |
| #8 nit ปุ่ม reset-demo ไม่ล็อก | แก้แล้ว | `busy='legacy'` + แถบสถานะ · ล้มแล้ว `setBusy(null)` · สำเร็จแล้วไป /login (ไม่ต้องคืน busy) |
| #2 minor เทสต์ scenario/F4 | ยังค้าง → ด่าน S6 (ตามเดิม) | ถ้าไม่มีใน `tests/` ก่อน S8 = major |
| #3 minor คู่มือ | ยังค้าง → docs-writer S7 (เพิ่ม: ข้อความ toast ใหม่ทั้ง 3 แบบ) | — |
| EN | ผ่าน | pattern 3 ตัว + key 3 ตัวตรงตัวอักษรกับโค้ด (เทียบทีละตัว) · ลบ key/pattern เก่าครบ · ไม่ซ้ำ |

## Re-check security (แทน security-auditor — ตรวจแล้ว)

| ID | สถานะ | หลักฐาน (probe ของ reviewer) |
|----|-------|-------------------------------|
| **S-1** Medium | **ปิด** | `loadScenarioPack(actor, id?)` / `resetToStandardSeed(actor)` → `assertResetActor` เช็ก role super_admin จาก object **ก่อนแตะ storage ใด ๆ** (ก่อน `initAunqa`) แล้วจึง `requireActiveActor` · `resetDemo(actor)` เช็กซ้ำอีกชั้น · ไม่ใช้ `maybeUser('sadmin')` แล้ว · ผู้เรียกมีที่เดียว (`DemoTab.tsx:95,98` ส่ง `user`) · probe S1: lect1/chair1/uadmin × (load id, load all, reset) + id ผิดโดย lect1 + `null` → `forbidden` ทุกกรณี และ **snapshot localStorage ทั้งก้อนก่อน = หลัง** · probe S1-empty: non-super บน storage ว่าง → forbidden และ `localStorage.length === 0` (ไม่ seed) · probe S1b: sadmin ถูกระงับ → forbidden, storage ไม่เปลี่ยน · sadmin active + id ผิด → "ไม่รู้จัก scenario" storage ไม่เปลี่ยน · sadmin active โหลด `user-pending` สำเร็จ + session ถูกล้าง |
| **S-2** Low | **ปิด** | `isSafeLink` กรอง `labelTh` string + href ตรง `^/invite#t=[A-Za-z0-9_-]{43}$` · probe: `javascript:`, token 44 ตัว, `//evil.example/invite#t=…`, labelTh ไม่ใช่ string → ถูกกรองหมด เหลือลิงก์ถูกรูปตัวเดียว · panel ได้เฉพาะค่าหลังกรอง |
| **S-3** Low | **ปิด** | TTL 10 นาที (ขอบเขตรวม) · เกิน → `removeItem` ทั้งก้อนคืน null · `at` อนาคต → null · take ครั้งแรกลบลิงก์ออกจาก storage · ครั้งที่ 2 links = [] · comment ระบุข้อยกเว้นเดโม่ต่อ ADR R5 แล้ว |
| S-4 Low | รับทราบ (comment แล้ว) | ดู #4 |

## ข้อดีที่ควรเก็บเป็นบทเรียน
- db-engineer: guard ทำลายข้อมูลตรวจส่วนที่ไม่ต้องอ่าน store (role) **ก่อน** `initAunqa` ทำให้ non-super บน storage ว่างไม่ทำให้เกิด seed เลย — และทดสอบด้วย snapshot storage ทั้งก้อน ไม่ใช่แค่ดูว่า throw
- frontend-dev: แก้ทางตันด้วยการให้ปุ่มใน toast เป็น "ขั้นที่ทำได้จริงในสถานะใหม่" (ส่งกลับ) แล้วค่อยชี้ขั้นถัดไปหลังขั้นนั้นสำเร็จ · `take(now = Date.now())` ทำให้เทสต์ TTL ได้โดยไม่ต้อง mock นาฬิกา
- reviewer (บทเรียนตัวเอง): ตรวจทางตันต้องเดินเส้นทางที่ผู้ใช้อาจเบี่ยงด้วย (อาจารย์ส่งโดยไม่แก้ = R2-1) ไม่ใช่แค่เส้นทางที่ข้อความแนะนำ

## ส่งต่อ
- S6 qa-tester: ทำ probe R1 (เส้นทางเต็ม), R1b, S1/S1-empty/S1b (snapshot ก่อน/หลัง), S2/S3 (`take(now)`) ให้เป็นเทสต์ถาวร + #2 รอบ 1
- R2-1/R2-2 (minor/nit) ไม่ block — orchestrator ตัดสินว่าจะแก้ใน TASK นี้ก่อน S7 หรือยกไป follow-up
