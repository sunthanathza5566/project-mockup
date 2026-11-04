# TASK-0003 — Security review (S5)

- ผู้ตรวจ: security-auditor (Lv2) · วันที่ 2026-11-04
- ขอบเขต: `git diff 7867278..HEAD -- eduflow-next` (scenario loader, standard-extras, scenario summary/login panel, previewSubmitRecipients/submitSectionWithNotice, ข้อความแจ้งเตือนใหม่)
- มาตรฐาน: `.agents/research/standards/security-auth.md` (C1–C15, P1–P6) + OWASP Top 10 2021 (A01 Broken Access Control, A03 Injection/XSS, A04 Insecure Design) + ADR-AUTH-001 A8.3/R5
- บริบท: localStorage prototype — การตรวจสิทธิ์ทั้งหมดเป็นการจำลอง (ADR-AUTH-001 บรรทัด 11, 168) ใครเปิด DevTools ก็ข้ามได้ ผมจึงประเมินว่าโค้ด "รักษากฎของแอปไว้ในชั้น lib หรือไม่" และ "ต้องแก้อะไรก่อนย้ายไป backend จริง"

## Verdict: **APPROVE** (PASS — critical 0 · high 0 · medium 1 · low 3 · info 2)

ไม่มี critical/high · S-1 (Medium) ไม่ block เฟสนี้ แต่ควรแก้ในรอบนี้เลย (แก้ราว 5 บรรทัด) เพื่อให้ตรง ADR A8.3 ในชั้น lib

## Findings

| ID | Severity | ตำแหน่ง | ผลกระทบ | วิธีแก้ | โซนเจ้าของ |
|----|----------|---------|---------|---------|-----------|
| S-1 | **Medium** | `lib/mock-data/aunqa/scenarios/index.ts:52-60` (`resetToStandardSeed`), `:66-72` (`loadScenarioPack`) | ล้างข้อมูลทุก tenant โดยใช้บัญชี `sadmin` ที่ดึงจาก store (`maybeUser('sadmin')`) แทนตัวผู้เรียก → guard super_admin + `requireActiveActor` ของ `resetDemo` (`lib/api/init.ts:125-127`, ADR A8.3) **ไม่ได้ตรวจคนที่กดจริงเลย** สิทธิ์จึงเหลือแค่ guard ระดับ UI (confused-deputy) ถ้าในอนาคตมีคนเรียก loader จากที่อื่น (หน้า login `?scenario=`, e2e helper, หน้า public) ก็จะข้าม A8.3 ไปเงียบ ๆ · probe P1 ยืนยันแล้ว: ล็อกอินเป็น `lect1` แล้วเรียก `loadScenarioPack('user-pending')` สำเร็จ | ให้รับ actor เข้ามา: `resetToStandardSeed(actor)` / `loadScenarioPack(actor, id?)` → เรียก `requireActiveActor(actor)` + เช็ก `super_admin` (ข้อความเดียวกับ `resetDemo`) **ก่อน**ล้างข้อมูล แล้วใช้ `sadmin` ได้เฉพาะหลังรีเซ็ต (ตอนนั้น id ของ actor อาจหายไปแล้ว) · `DemoTab.tsx:94,97` ส่ง `user` เข้าไป · เพิ่มเทสต์: non-super → `forbidden` โดยข้อมูลไม่ถูกแตะ | db-engineer (loader) + frontend-dev (DemoTab ส่ง actor) |
| S-2 | Low | `lib/ui/scenario-summary.ts:29-32` (`isSummary`), `components/auth/ScenarioSummaryPanel.tsx:124` | `href` ของลิงก์อ่านมาจาก sessionStorage โดยไม่ตรวจรูปแบบ แล้วใส่ใน `<a href>` · React 18 ไม่บล็อก `javascript:` (แค่ warn ใน dev) → ถ้ามีโค้ด same-origin เขียน key `aunqa_ui_scenario_summary` ได้ = เกิด XSS ตอนคลิกบนหน้า /login · probe P4 ยืนยันว่า `javascript:alert(1)` ผ่าน `takeScenarioSummary` ได้ (ต้องมีสิทธิ์เขียน storage ก่อน = self-XSS/ต่อยอดจาก XSS อื่น จึงให้ Low) | ใน `isSummary`/`take` ให้กรอง `links` เหลือเฉพาะ `typeof href === 'string' && /^\/invite#t=[A-Za-z0-9_-]{43}$/.test(href)` และ `labelTh` เป็น string · ส่วน text อื่นทั้งหมด render เป็น text node อยู่แล้ว (ไม่มี `dangerouslySetInnerHTML`) | frontend-dev |
| S-3 | Low | `lib/ui/scenario-summary.ts:25-27, 35-47` | invite token ดิบถูกเขียนลง sessionStorage ทั้งที่ระบบตั้งหลักไว้ว่า token ไม่ลง storage (ADR R5 / `InviteAcceptForm.tsx:6`) · ลบหลังอ่านครั้งแรกแล้ว ✓ (probe P4) แต่ (ก) ไม่มีอายุ — `at` ไม่ได้ใช้ตรวจหมดอายุ ถ้าผู้ใช้ไม่ได้ไปถึง /login (ปิด dialog/ไปหน้าอื่น) token จะค้างจนปิดแท็บ (ข) ส่วนบัญชี/เคสค้างจนกดปิด panel · ความเสี่ยงต่ำเพราะเป็นบัญชีเดโม่ใน tab เดียวกันและ token อายุ 7 วันในระบบจำลอง | `take`: ถ้า `Date.now() - s.at > 10 นาที` ให้ทิ้งทั้งก้อน (`removeItem`) · ใส่ comment ว่าเป็นข้อยกเว้นของเดโม่ (บอกในเล่ม) | frontend-dev |
| S-4 | Low | `lib/mock-data/aunqa/scenarios/helpers.ts:175-180` (`withClockShift`) | แก้ `Date.now` ของทั้ง global ระหว่าง `await` (inviteUser มี sha256 async) → โค้ดอื่นในหน้าเดียวกันที่ทำงานพร้อมกัน (touchSession, deadline notice, timer) เห็นเวลาย้อน 8 วัน และ audit/invitation ที่สร้างช่วงนั้นถูกลงเวลาย้อนหลัง · ตอนนี้ยอมรับได้ (ข้อมูลเดโม่ ล้าง session ตอนจบ) แต่เป็นรูปแบบที่ห้ามติดไปถึง backend | ระยะยาว: ให้ `inviteUser` รับ `now`/clock ที่ inject ได้เฉพาะใน seed script ฝั่ง server · ระยะสั้น: comment ว่าห้ามใช้นอก scenario loader (มีแล้วบางส่วน) | db-engineer |
| S-5 | Info | `lib/api/sar.store.ts:188-195` (`previewSubmitRecipients`) | ตรวจ `requireActiveActor` + `can('read', cycleScope)` ✓ · คืน **จำนวน** เท่านั้น ไม่มีรายชื่อ ✓ · `submitRecipientsOf`/`transitionSectionCounted` ไม่หลุดออก facade ✓ · ข้าม tenant (`uadmin2` → รอบ uni 1) = `forbidden` ✓ (probe P3) · เหลือแค่ error ต่างกัน `not_found` (ไม่มีข้อ) กับ `forbidden` (มีแต่ไม่มีสิทธิ์) = existence oracle แต่ id รอบ/ข้อเดาได้อยู่แล้ว และเป็นรูปแบบเดิมของ `getSectionRaw` ทั้งระบบ | ไม่ต้องแก้ตอนนี้ · บน backend ให้คืน 404 เดียวกันทั้งสองกรณี | backend-dev (ตอนย้าย backend) |
| S-6 | Info | `components/aunqa/SarWorkspace.tsx:289-291` + toast | ผู้ที่อ่านรอบได้รู้ว่าหลักสูตรมีประธาน active กี่คน (tenant เดียวกัน) — เป็นข้อมูลที่ต้องให้รู้ตามโจทย์ F1/F2 ไม่เกินสิทธิ์ | ไม่ต้องแก้ | — |

## ผลตรวจตามหัวข้อที่สั่ง

1. **การเข้าถึง loader** — import มีที่เดียวคือ `components/aunqa/admin/DemoTab.tsx:23` (+ type-only ใน `lib/ui/scenario-summary.ts:10`) · ไม่มี global `window.*`/`globalThis`, ไม่มี `?scenario=` handler, ไม่ export ผ่าน `lib/mock-data/aunqa/index.ts` หรือ facade `lib/api` · guard 3 ชั้นใน UI: แท็บแสดงเฉพาะ `isSuperAdmin` (`app/app/admin/page.tsx:57`), `DemoTab` คืน `null` เมื่อไม่ใช่ super (`DemoTab.tsx:65`), handler เช็กซ้ำ (`:68`) → **ทาง UI เข้าถึงได้เฉพาะ super_admin ✓** · แต่ขัด A8.3 ในชั้น lib → S-1 · หมายเหตุ: โมดูลถูก bundle ไปกับ chunk ของ `/app/admin` ที่ผู้ใช้ทุกคนที่เปิดหน้านี้โหลดได้ (รวม logic + รหัส demo1234) — ยอมรับได้ในเดโม่ ดู (ก)-1
2. **invite token ผ่าน sessionStorage** — ลบลิงก์ทันทีหลังอ่านครั้งแรก ✓, กัน strict mode ด้วย ref ✓, token ดิบ **ไม่**ลง localStorage ✓ (P5: ไม่พบ token ใน storage ทั้งก้อน), รูปแบบ href จาก loader = `/invite#t=<43 ตัว base64url>` ทุกลิงก์ ✓ (P5), React escape ข้อความทุกช่อง ✓ · ช่องโหว่ที่เหลือ: S-2 (ไม่ตรวจ href), S-3 (ไม่มีอายุ)
3. **PII ใน scenario** — ของปลอมทั้งหมด ✓ · probe P5 โหลดทุกเคสแล้วสแกน localStorage ทั้งหมด: อีเมล 25 รายการ ลงท้าย `.example` ทั้งหมด (`sample-uni.example`, `test-uni.example`, `student.test-mail.example`, `employer-sample.example`), เบอร์โทรไทย 0 รายการ, เลข 13 หลักที่เจอเป็น epoch ms (timestamp) ไม่ใช่เลขบัตร · ชื่อผู้ใช้ใหม่ทุกคนลงท้าย "(สมมติ)" · รหัสนักศึกษา `6512345678` ใน `evidence-actions.ts:40` เป็นเลขเรียงปลอม ใช้ทดสอบตัวกรอง PII โดยเจตนา (README บอกไว้) ✓ · ชื่อ "สมปอง ผู้ดูแลมหาวิทยาลัยที่สอง" (`org.ts:111`) เป็นของเดิมก่อน diff นี้ เป็นชื่อสมมติชัดเจน
4. **previewSubmitRecipients** — ดู S-5: ไม่รั่วข้าม tenant ไม่คืนรายชื่อ ✓
5. **ข้อความแจ้งเตือนใหม่** — N3 "ข้อ X ส่งตรวจแล้ว รอประธานอนุมัติ" มีแค่รหัสข้อ ✓ · ผู้รับกรอง active + `universityId` เดียวกัน (`workflow.ts:198-203`, `standard-extras.ts:51`) ✓ · ข้ามผู้เขียนล่าสุด ✓ · P5: แจ้งเตือน 1,004 แถวหลังโหลดทุกเคส ไม่มีแถวที่มีอีเมล/เลขยาว ✓ · toast บอกแค่จำนวน ✓
6. **Secrets / dependency** — ไม่มี key/token จริงใน diff; `demo1234` เป็นรหัสเดโม่ที่ประกาศไว้ · ไม่มี dependency ใหม่ (package.json/lock ไม่เปลี่ยน) → ไม่ได้รัน `npm audit` รอบนี้ (ค้างเดิม: Next 14 critical A-7/B-4 จาก TASK-0001) · ไม่มี `console.log` ในไฟล์ใหม่

## (ก) ต้องแก้ก่อนย้ายไป backend จริง / ก่อน deploy ให้คนนอกใช้ (ถ้าไม่แก้ = High)
1. scenario loader + `resetDemo` ต้องเป็น endpoint ฝั่ง server ที่เปิดได้เฉพาะ env flag `DEMO_MODE` + session super_admin (TODO Phase B ที่ `init.ts:128`) และ**ไม่ bundle** โมดูล `scenarios/*` ไปกับ build production (dynamic import หลัง flag หรือแยก build)
2. loader ปลอมตัวเป็นบัญชี seed (`sadmin`, `uadmin`, `uadmin2`, `chair1`, `lect2`…) และเขียน audit ในชื่อคนเหล่านั้น — บน backend ต้องเป็น seed script ที่ ops รันเอง ห้ามเปิดเป็น HTTP ที่ impersonate ผู้ใช้
3. ห้ามส่ง invite token ผ่าน storage ฝั่ง client — แสดงจาก response ของ server ครั้งเดียว
4. panel สรุป + คำใบ้ `demo1234` บนหน้า /login ต้องอยู่หลัง demo flag
5. `withClockShift` → clock injection ใน seed script; ห้าม monkey-patch เวลาใน process server
6. แถวองค์กร uni 2 ที่เขียนตรงผ่าน `save()` (`tenant.ts:169-174`) → migration/seed script
7. API คืน 404 เดียวกันทั้ง "ไม่มี" และ "ไม่มีสิทธิ์" (S-5)

## Probes (scratchpad ไม่ commit)
ไฟล์: `C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Documents-GitHub-project-mockup\b85653ea-25bb-4cbb-9333-9c61c0884223\scratchpad\sec0003\probe.test.ts` + `vitest.probe.config.ts` (รันจาก `eduflow-next`: `npx vitest run --config <scratchpad>/sec0003/vitest.probe.config.ts`) → **6/6 ผ่าน**

| Probe | ยืนยัน | ผล |
|------|--------|----|
| P1 | loader ทำงานได้ขณะล็อกอินเป็น lect1 / ไม่ส่ง actor (ไม่มี gate ใน lib) | ยืนยัน S-1 — re-check: เปลี่ยน assert เป็น `rejects forbidden` |
| P2 | ถ้า `sadmin` ถูกระงับ `resetToStandardSeed` ล้มแบบ fail-closed | ✓ |
| P3 | `previewSubmitRecipients` ข้าม tenant = forbidden, คืน number, helper ภายในไม่หลุด facade | ✓ |
| P3b | ไม่มีข้อ → `not_found` / ข้าม tenant → `forbidden` | S-5 (info) |
| P4 | ลิงก์ถูกลบหลัง take ครั้งแรก · href `javascript:` ผ่านได้ · `at=0` ไม่หมดอายุ | ยืนยัน S-2, S-3 — re-check: assert ว่า href ถูกกรองออก และ summary เก่าคืน null |
| P5 | โหลดทุกเคส: รูปแบบลิงก์เชิญ, สแกน PII ทั้ง storage, token ดิบไม่ลง localStorage, ข้อความแจ้งเตือนไม่มี PII | ✓ |
