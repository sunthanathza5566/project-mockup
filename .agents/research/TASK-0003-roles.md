# TASK-0003 — บทบาท / การส่งต่องาน / แจ้งเตือน / สาเหตุ "ประธานไม่ได้แจ้งเตือน"

> code-reader · 2026-11-04 · อ่านโค้ดจริงที่ commit `c63b43a` (branch feat/TASK-0003-role-walkthrough). path อ้างจาก `eduflow-next/` ยกเว้นระบุอย่างอื่น
> หลักฐานการทำซ้ำ: `.agents/playtest/TASK-0003/chair-notify.repro.test.ts` (10/10 ผ่าน) — รัน `cd eduflow-next && npx vitest run --config ../.agents/playtest/TASK-0003/vitest.repro.config.ts`

---

## สรุปสั้น (สำหรับ orchestrator / เจ้าของ)

**ประธานไม่ได้แจ้งเตือน = ส่วนใหญ่ "ใช้ผิดขั้น" แต่ UI ทำให้เข้าใจผิด (UX bug) และ seed ทำให้แทบเลี่ยงไม่ได้**

1. ใน seed เดโม่ ข้อที่ยัง "เขียน + ส่งตรวจ" ได้ มีแค่ **3.6, 5.1, 7.9** (drafting) และ**ไม่มีเจ้าของ** → คนเดียวที่แก้ได้คือ **chair1** (`programme_chair` มี `sar.write: true`; อาจารย์มีแค่ `'own'` — `lib/api/rbac.ts:39,46`). staff1 เป็นเจ้าของ 1.1–1.5 แต่ทุกข้ออนุมัติแล้ว/รอตรวจ จึงไม่มีปุ่มส่งตรวจเลย (repro R0)
2. เมื่อเข้าเป็น chair1 แล้วกด "บันทึกตอนนี้" + "ส่งตรวจ" ข้อ 3.6 → `transitionSection` แจ้ง `chairsOf(cycle).filter(u => u.id !== actor.id)` (`lib/api/workflow.ts:419-426`) → ประธานคนเดียวของหลักสูตรคือผู้กดเอง → **ไม่มีผู้รับเลย (0 แถวใหม่ทั้งระบบ)** (repro R1)
3. แต่ toast ยังขึ้น **"ส่งตรวจข้อ 3.6 แล้ว — ประธานหลักสูตรได้รับแจ้งเตือน"** (`components/aunqa/SarWorkspace.tsx:310`) และ dialog หัวเรื่อง "ส่งข้อ 3.6 ให้ประธานหลักสูตรตรวจ" (`:290`) แม้ผู้กดคือประธานเอง = ข้อความเท็จ → เจ้าของเข้าใจว่าระบบพัง
4. ซ้ำร้าย ประธานอนุมัติข้อที่ตัวเองเขียนล่าสุดไม่ได้ (`workflow.ts:395-396`) และไม่มี role อื่นมี `sar.approve` → ข้อค้างที่ "รอตรวจ" จนกว่าประธานจะ "ส่งกลับแก้ไข" แล้วมอบให้คนอื่นเขียน (repro R1-2) — คิว `/app/review` แสดงแถว "คุณเขียนเอง" ไม่มีปุ่มอนุมัติ, todo `review_sections` ไม่นับข้อนี้ (`lib/api/todo.ts:100`)
5. **ขั้นที่ถูกต้อง** (ตรงกับคู่มือ `docs/guide/00-overview.md:338`, `10-programme-chair.md:54`): chair1 มอบหมาย 3.6 ให้ staff1 ที่ `/app/cycles/cycle-demo-2569/assign` → ออกจากระบบ → staff1 เขียน + ส่งตรวจ → ออก → chair1 เห็นกระดิ่ง +1 "ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ" (repro R2 ผ่าน: unreadCount +1, deep link ไป section, อนุมัติได้, staff1 ได้ `approved`)
6. backend ของ path ที่ถูกต้อง **ไม่มีบั๊ก**: bell นับใหม่เมื่อเปลี่ยนหน้า / `aunqa:todos-changed` / `storage` event (`components/aunqa/NotificationPanel.tsx:66-89`), `useEffect` ขึ้นกับ `user` จึงรีเฟรชเมื่อสลับบัญชี, ไม่มี dedupeKey บนแจ้งเตือนส่งตรวจ (ส่งซ้ำได้ครั้งที่ 2 — R2-3), tenant/scope ของ `chairsOf` ถูก

**ข้อเสนอแก้ (ทั้งสองอย่าง):**

| # | โซน | ไฟล์:บรรทัด | แก้อะไร |
|---|---|---|---|
| F1 | frontend | `components/aunqa/SarWorkspace.tsx:310` | toast ต้องบอกความจริง: ถ้า `can(user,'sar.approve',scope)` (ผู้ส่งคือประธาน) → "ส่งตรวจข้อ X แล้ว — คุณเขียนข้อนี้เอง จึงอนุมัติเองไม่ได้ ไม่มีใครได้รับแจ้งเตือน" หรือดีกว่า: ให้ `submitSection` คืนจำนวนผู้รับ แล้วใช้ค่านั้น (0 → ข้อความเตือน) |
| F2 | frontend | `SarWorkspace.tsx:289-299` (`doSubmit` confirm) | ถ้าผู้กดเป็นประธาน (หรือไม่มีผู้อนุมัติอื่น) แสดงคำเตือนใน dialog ก่อนยืนยัน: "คุณเป็นผู้เขียนล่าสุด ส่งแล้วต้องให้ผู้อื่นอนุมัติ — แนะนำมอบหมายข้อนี้ให้อาจารย์เขียน/ส่งแทน" + ลิงก์ไป `/app/cycles/{id}/assign` |
| F3 | backend | `lib/api/workflow.ts:419-426` (+ `sar.store.ts:162-179`) | ให้ `transitionSection`/`submitSection` คืนข้อมูลผู้รับแจ้งเตือน (เช่น `{ section, notified: n }` หรือ field แยก) โดยไม่เปลี่ยน signature เดิมที่เทสต์ใช้ — เลือกได้: เพิ่มฟังก์ชันใหม่ `submitSectionWithResult`; และพิจารณา fallback ผู้รับเมื่อไม่มีประธานอื่น (ไม่แนะนำแจ้ง QA คณะ เพราะ QA ไม่มี `sar.approve`) |
| F4 | db (seed) | `lib/api/init.ts:49-77`, `lib/mock-data/aunqa/narratives.ts` | seed ให้ staff1 เป็นเจ้าของอย่างน้อย 1 ข้อที่ยัง drafting (เช่น 3.6) เพื่อให้เดโม่ "อาจารย์ส่ง → ประธานได้แจ้งเตือน" ทำได้ทันทีโดยไม่ต้องมอบหมายก่อน; และสร้างแจ้งเตือน "ส่งตรวจแล้ว" ให้ chair ตรงกับ 5 ข้อที่ seed เป็น ready_for_review (ตอนนี้ chair มี todo "ตรวจ 5 ข้อ" แต่กระดิ่ง 0 — repro R0-3) |
| F5 | docs | `docs/guide/00-overview.md:129` | แถว 6 "อาจารย์ / ประธาน … ประธานได้รับแจ้งเตือน" — ระบุว่าถ้าประธานเขียน/ส่งเอง ไม่มีใครได้แจ้งเตือนและอนุมัติเองไม่ได้ |
| T1 | qa | tests | เทสต์กันถอยหลัง: (ก) staff ส่ง → chair +1 unread (ข) chair ส่งเอง → 0 แถว + UI แสดงข้อความเตือน (ค) chair ถูกระงับ → 0 แถว — ย้ายจาก repro R1/R2/R4 |

ปัจจัยรองที่ควรเขียนใน doc (ไม่ใช่บั๊ก): ข้อมูลอยู่ใน `localStorage` ของเบราว์เซอร์ — ถ้าเปิด staff ใน Chrome และ chair ใน Edge/หน้าต่างไม่ระบุตัวตน จะไม่เห็นข้อมูลกัน (`lib/api/db.ts`); "บันทึก" อย่างเดียวไม่แจ้งใคร (repro R2-2); ปุ่ม "ส่งให้ QA คณะตรวจ" ระดับรอบแจ้ง QA คณะ ไม่ใช่ประธาน และกดไม่ได้จนอนุมัติครบ 53 ข้อ (seed ขาด 8 ข้อ — repro R3).

---

## (1) Role × หน้าที่ × เมนู × ส่งต่อให้ใคร

สิทธิ์จาก POLICY `lib/api/rbac.ts:31-59`; `can()` `:71-91` (ทุก role ยกเว้น super_admin ต้อง university ตรง; assessor ใช้ได้เฉพาะรอบที่ scopeId ตรง; `'own'` ต้องเป็นเจ้าของข้อ). ขอบเขตที่อนุญาตต่อ role `lib/api/auth.api.ts:75-84` (chair/staff = programme, data_staff/fqa/dean = faculty, assessor = cycle, admin = university). เมนู `components/aunqa/AppSidebar.tsx:99-123` (พื้นฐานทุกคน: หน้าหลัก, รอบประเมิน, หลักฐาน, ส่งออกเอกสาร, คลังเกณฑ์).

| role (บัญชีเดโม่, `lib/mock-data/aunqa/org.ts:57-114`, รหัส `demo1234`) | หน้าที่หลัก (action ใน POLICY) | เมนูเพิ่มจากพื้นฐาน | รับงานจาก | ส่งต่อให้ |
|---|---|---|---|---|
| super_admin (`sadmin`) | `university.manage`(ไม่มี implementation), `user.manage` ทุก uni, `audit.view`, read; รีเซ็ตเดโม่ได้คนเดียว (`init.ts:124`) | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (+แท็บข้อมูลเดโม่) | คำขอเข้าใช้งาน (N12) | อนุมัติ/เชิญผู้ใช้ → ผู้ใช้ใหม่ |
| uni_admin (`uadmin`, `uadmin2`=uni ที่ 2) | `user.manage`, `cycle.create`, `assessor.assign`, `cycle.close`, `audit.view` | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ | คำขอเข้าใช้งาน, รอบ final_approved (แจ้งให้เริ่มประเมิน), รอบ assessed | เชิญ/อนุมัติผู้ใช้ → ทุก role; มอบหมายกรรมการ + เริ่มประเมิน → assessor; ปิดรอบ |
| programme_chair (`chair1` @prog-demo-cs) | สร้าง/เริ่มรอบ, มอบหมายข้อ (`cycle.assign`), เขียนทุกข้อ, อนุมัติ/ส่งกลับข้อ, ส่งรอบให้ QA (`cycle.submit`), หลักฐาน+verify, ตัวชี้วัด, AI, คะแนนตนเอง, comment, หลักสูตร, action+verify, ปิดรอบ, audit หลักสูตรตน | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (เฉพาะ Audit) | staff ส่งตรวจข้อ; QA/คณบดีส่งกลับรอบ | มอบหมายข้อ → staff; ส่งรอบ → faculty_qa |
| programme_staff (`staff1`,`lect1` @cs; `lect2` @ds) | เขียนเฉพาะข้อที่เป็นเจ้าของ (`sar.write:'own'`), คะแนนตนเองข้อตน, หลักฐาน, AI, หลักสูตร, action ของตน; ตอบ comment thread ได้ (`sar.store.ts:259`) | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง | ประธานมอบหมายข้อ / ส่งกลับ / action item | ส่งตรวจข้อ → ประธาน |
| data_staff (`data1` @faculty) | หลักฐาน, ตัวชี้วัด (import), `ai.check` | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง | action item ที่ถูกมอบ (seed act-5) | ข้อมูลที่ประธาน/อาจารย์อ้างใน SAR (ไม่มีแจ้งเตือน) |
| faculty_qa (`fqa1` @faculty) | comment, `sar.review/return` (ส่งกลับรายข้อได้ถึงช่วง under_review — `workflow.ts:386-388`), `approve.faculty`, `assessor.assign`, `evidence.verify`, AI, `cycle.close`, `action.verify`, audit คณะ | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (Audit) | รอบ under_review; รอบ final_approved; รอบ assessed | อนุมัติ → คณบดี / ส่งกลับ → ประธาน+เจ้าของข้อ; เริ่มประเมิน → assessor |
| dean (`dean1` @faculty) | comment, `sar.review/return`, `approve.final` (lock+hash), `cycle.reopen` (เปิด revision), audit คณะ | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (Audit) | รอบ faculty_approved | อนุมัติสุดท้าย → uni_admin/fqa (มอบกรรมการ) / ส่งกลับ → ประธาน |
| assessor (`assess1` @cycle-demo-2569) | comment, `rating.committee`, `finding.write`, `ai.summarize`; read เฉพาะรอบที่ได้รับ | เฉพาะพื้นฐาน (ซ่อนหลักสูตร/ตัวชี้วัด/แผน) + `readonly-banner`; งานที่ `/app/cycles/[id]/assess` | ถูกมอบหมาย / รอบ under_assessment | "เสร็จสิ้นการประเมิน" (→ assessed) → ประธาน + QA + ผู้ปิดรอบ |
| ผู้ใช้ใหม่ (pending / invited) | ไม่มี role จนอนุมัติ; login ได้ไม่ได้ (`auth.api.ts:305-318`) | — | — | ส่งคำขอ → ผู้มี `user.manage` |

หมายเหตุสำคัญ
- ผู้อนุมัติรายข้อมี **ประธานเท่านั้น** (`sar.approve`) — QA/คณบดีส่งกลับได้แต่อนุมัติรายข้อไม่ได้
- segregation: ผู้เขียนล่าสุดอนุมัติข้อนั้นไม่ได้ (`workflow.ts:395`) → หลักสูตรที่มีประธานคนเดียว ประธานต้องไม่เขียนข้อที่ตัวเองจะอนุมัติ
- prog-demo-ds **ไม่มีประธาน** (seed) → ถ้าสร้างรอบให้ DS ไม่มีใครรับแจ้งเตือนส่งตรวจ/อนุมัติได้

## (2) ตารางแจ้งเตือน — ทุกจุดที่เรียก `notify()`

กติกากลาง `lib/api/notification.store.ts:35-49`: ผู้รับต้องมีอยู่และ `status` active (invited/pending/suspended → ข้ามเงียบ); dedupe เฉพาะเมื่อมี `dedupeKey`; ไม่ตรวจ rbac. ทุกจุด (ยกเว้น deadline/N13) ข้ามตัว actor. ปลายทาง `target` → href ใน `lib/ui/notification.ts:30-36`.

| # | trigger (ใครกด / ฟังก์ชัน) | ผู้รับ | kind | ข้อความ TH | ปลายทาง | path:line |
|---|---|---|---|---|---|---|
| N1 | มอบหมายข้อ/เกณฑ์ (chair, `assignSections`/`assignCriterion`) | เจ้าของใหม่ (ถ้าไม่ใช่ actor) | assigned | "คุณได้รับมอบหมายข้อ … กำหนดส่ง …" | 1 ข้อ → section · หลายข้อ → `/app#mywork` | `cycle.store.ts:170-179` |
| N2 | มอบหมายกรรมการ (uni_admin/fqa, `assignAssessor`) | กรรมการ | assigned | "คุณได้รับมอบหมายเป็นกรรมการประเมินรอบ …" | `/app/cycles/{id}/assess` | `cycle.store.ts:202-206` |
| N3 | ส่งตรวจข้อ → ready_for_review (เจ้าของ/chair, `submitSection`) | **ประธานของหลักสูตร ยกเว้น actor** (`chairsOf`) | cycle_status | "ข้อ X ส่งตรวจแล้ว รอประธานอนุมัติ" | section | `workflow.ts:419-426` (`chairsOf` `:198-203`) |
| N4 | อนุมัติข้อ (chair) | เจ้าของข้อ (ถ้ามีและไม่ใช่ actor) | approved | "ข้อ X ได้รับการอนุมัติแล้ว" | section | `workflow.ts:410-418` |
| N5 | ส่งกลับข้อ (chair/fqa/dean) | เจ้าของข้อ | changes_requested | "ข้อ X ถูกส่งกลับแก้: {note}" | section | `workflow.ts:410-418` |
| N6 | comment ใหม่ (ผู้มี `comment` / เจ้าของตอบ) | เจ้าของข้อ (ไม่ใช่ actor) | comment | "มี comment ใหม่ที่ข้อ X" | section `#comments` | `sar.store.ts:270-275` |
| N7a | รอบ → in_progress (chair) | เจ้าของข้อทุกคน + ประธาน − actor | cycle_status | "รอบประเมิน {ปี} เริ่มดำเนินการ" | `/app/cycles/{id}` | `workflow.ts:265,332-338` |
| N7b | รอบ → under_review (chair "ส่งให้ QA คณะตรวจ") | ผู้มี `approve.faculty` (fqa) | cycle_status | "รอบประเมิน {ปี} ({code}) ส่งมาให้ QA คณะตรวจแล้ว — รอการพิจารณาของท่าน" | รอบ | `workflow.ts:284-289` |
| | | เจ้าของข้อ + ประธาน − actor | cycle_status | "รอบประเมิน {ปี} ส่งให้ QA คณะตรวจ" | รอบ | `:266,332-338` |
| N7c | รอบ → revision_requested (fqa จาก under_review / dean จาก faculty_approved, ต้องมี note) | เจ้าของข้อ + ประธาน − actor | changes_requested | "รอบ {ปี} ถูกส่งกลับแก้ (โดย {ชื่อ}): {note}" | รอบ | `:267` |
| N7d | รอบ → faculty_approved (fqa) | ผู้มี `approve.final` (dean) | cycle_status | "QA คณะอนุมัติรอบ … แล้ว — รอคณบดีพิจารณาอนุมัติสุดท้าย" | รอบ | `:290-295` |
| | | เจ้าของข้อ + ประธาน | approved | "QA คณะอนุมัติรอบ {ปี} แล้ว รอคณบดี" | รอบ | `:268` |
| N7e | รอบ → final_approved (dean, lock) | ผู้มี `assessor.assign` (uni_admin, fqa) | cycle_status | "รอบ … อนุมัติสุดท้ายและล็อกแล้ว — เริ่มการประเมินและมอบหมายกรรมการได้" | รอบ | `:296-301` |
| | | เจ้าของข้อ + ประธาน | approved | "คณบดีอนุมัติสุดท้ายและล็อกรอบ {ปี} แล้ว" | รอบ | `:269` |
| N7f | รอบ → under_assessment (uni_admin/fqa) | เจ้าของข้อ + ประธาน | cycle_status | "รอบ {ปี} เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว" | รอบ | `:302-309` |
| | | กรรมการของรอบ (ทับ) | cycle_status | "รอบ … เปิดให้ประเมินแล้ว — เริ่มให้คะแนนได้ที่พื้นที่ทำงานกรรมการ" | assess | `:310-311` |
| N7g | รอบ → assessed (assessor "เสร็จสิ้นการประเมิน"; ต้องให้คะแนนครบทุกเกณฑ์ทุกคน + มี verdict — `:222-239`) | ประธาน + `approve.faculty` + `cycle.close` (chair, uni_admin, fqa) − actor | cycle_status | "กรรมการส่งผลประเมินรอบ … แล้ว — ดูผลได้ที่หน้าผลประเมิน" | assess | `:314-322` |
| N8 | สร้าง action item (chair/staff own) | owner (ไม่ใช่ actor) | assigned | "คุณได้รับมอบหมาย action item ข้อ …" | `/app/actions#action-{id}` | `action.store.ts:97-104` |
| N9 | action → verified (chair/fqa) | owner | approved | "action item ข้อ … ได้รับการยืนยันแล้ว" | action | `action.store.ts:167-174` |
| N10 | อ่านแจ้งเตือน/นับ badge (`listNotifications`/`unreadCount` → `syncDeadlineNotifications`) | เจ้าของ section ที่ยังไม่ approved, due ≤7/≤3/≤1/เลยกำหนด | deadline | "ข้อ … ใกล้ถึงกำหนดส่ง (…) — เหลือไม่เกิน N วัน" / "… เลยกำหนดส่งแล้ว" | 1 ข้อ section / หลายข้อ my_work; dedupe `deadline:{cycle}:{due}:{bucket}` | `notification.store.ts:66-92` |
| N12 | ส่งคำขอเข้าใช้งาน (สาธารณะ `/request-access`) | ผู้มี `user.manage` ของ uni นั้น (uni_admin + super_admin) ที่ active | access_request | "มีคำขอเข้าใช้งานใหม่จาก {ชื่อ}" | `/app/admin?tab=requests`; dedupe `access_request:{id}`; อนุมัติ → mark read ทุกคน, ปฏิเสธ → ลบทุกคน | `onboarding.store.ts:263-270`, `notification.internal.ts` |
| N13 | อนุมัติคำขอ (admin) | ผู้ขอ | account | "บัญชีของคุณได้รับอนุมัติแล้ว เริ่มใช้งานได้เลย" | `/app` | `onboarding.store.ts:320-325` |
| N14 | ผู้ถูกเชิญตั้งรหัสผ่าน (`/invite#t=`) | ผู้เชิญ | account | "{ชื่อ} ตั้งรหัสผ่านและเริ่มใช้งานแล้ว" | `/app/admin?tab=users` | `onboarding.store.ts:206-211` |

**ไม่มีแจ้งเตือน**: บันทึก/autosave, ข้อ not_started→drafting, ประธานส่งตรวจเอง (N3 ผู้รับ = 0), เปิด revision ใหม่ (`openRevision` `workflow.ts:355-372` — ไม่เรียก notify เลย), รอบ → closed / draft, สร้างรอบ, verify/PII หลักฐาน, ตัวชี้วัด, เปลี่ยน role / ระงับ / เปิดใช้บัญชี, ปฏิเสธคำขอ (ผู้ขอไม่รู้), เชิญ (ผู้ดูแลคัดลอกลิงก์ส่งเอง — ไม่มีอีเมล), กรรมการบันทึก finding/คะแนน, action ถูกส่งกลับ (done→in_progress)

การแสดงผล: กระดิ่ง `NotificationBell` (`components/aunqa/NotificationPanel.tsx:46-`) popover ≥768 / sheet <768, โหลด 30 รายการตอนเปิด, กดรายการ = markRead + ไปปลายทาง; นับใหม่เมื่อ pathname เปลี่ยน / `aunqa:todos-changed` / `storage` ของ `aunqa_notifications` (แท็บอื่น). ไม่มี polling — แท็บเดียวกันที่ไม่ได้ dispatch event จะไม่อัปเดตจนเปลี่ยนหน้า

## (3) Workflow ทุกสถานะ + ใครกด

### ข้อ (section) — `SECTION_TRANSITIONS` `workflow.ts:42-50`; ใช้ได้เฉพาะรอบ draft/in_progress/revision_requested และยังไม่ lock (`:71-77,385-389`) ยกเว้นส่งกลับใช้ได้ถึง under_review

| จาก → ไป | action / ใคร | ปุ่ม UI | เงื่อนไข | แจ้ง |
|---|---|---|---|---|
| not_started → drafting | sar.write (เจ้าของ/ประธาน) | อัตโนมัติเมื่อบันทึกเนื้อหาแรก (`sar.store.ts:94`) | — | — |
| drafting / not_started → ready_for_review | sar.write | "ส่งตรวจ" (`SarWorkspace.tsx:622`, ต้อง `editable`) | ต้องมี narrative (`workflow.ts:397`); not_started เดิน 2 ขั้น (`sar.store.ts:162-179`) | N3 |
| ready_for_review → approved | sar.approve (ประธานเท่านั้น) | "อนุมัติข้อนี้" / คิว `/app/review` | ไม่ใช่ผู้เขียนล่าสุด | N4 |
| ready_for_review → changes_requested | sar.return (ประธาน/QA/คณบดี) | "ส่งกลับแก้ไข" | ต้องมี note | N5 |
| approved → changes_requested | sar.return | "ส่งกลับแก้ไข" | ต้องมี note | N5 |
| changes_requested → drafting / ready_for_review | sar.write | แก้แล้ว "ส่งตรวจ" | — | N3 (เมื่อส่ง) |

### รอบ (cycle) — `CYCLE_TRANSITIONS` `workflow.ts:29-40`; ปุ่มที่ `/app/cycles/[id]` (`page.tsx:350-385`, ป้าย `CYCLE_ACTION_TH` `lib/ui/aunqa.ts:21-25`)

| จาก → ไป | action / ใคร | ป้ายปุ่ม | เงื่อนไข | แจ้ง |
|---|---|---|---|---|
| (สร้าง) → draft | cycle.create (chair, uni_admin) | ฟอร์มที่ `/app/cycles` | ห้ามซ้ำปีเดียวกัน; สร้าง 53 ข้อ | — |
| draft → in_progress | cycle.create | "เริ่ม/กลับไปดำเนินการ" | — | N7a |
| in_progress → under_review | cycle.submit (chair) | "ส่งให้ QA คณะตรวจ" | **ทุกข้อ approved** (`:217-220`) | N7b |
| under_review → faculty_approved | approve.faculty (fqa) | "อนุมัติ (QA คณะ)" | ทุกข้อ approved | N7d |
| under_review → revision_requested | approve.faculty | "ส่งกลับแก้ไข" | note | N7c |
| faculty_approved → final_approved | approve.final (dean) | "อนุมัติสุดท้ายและล็อก" | lock + snapshotHash (`:243-250`) | N7e |
| faculty_approved → revision_requested | approve.final | "ส่งกลับแก้ไข" | note | N7c |
| revision_requested → in_progress | cycle.submit (chair) | "เริ่ม/กลับไปดำเนินการ" | — | N7a |
| final_approved → in_progress (revision+1) | cycle.reopen (dean) | "เปิด revision ใหม่" (`openRevision`) | note; ล้าง lock | **ไม่มี** |
| final_approved → under_assessment | assessor.assign (uni_admin, fqa) | "เริ่มการประเมิน" | — | N7f |
| under_assessment → assessed | rating.committee (assessor) | "เสร็จสิ้นการประเมิน" (assess page) | ทุกกรรมการให้คะแนนครบทุกเกณฑ์ + มี verdict | N7g |
| assessed → closed | cycle.close (chair, uni_admin, fqa) | "ปิดรอบ" | — | **ไม่มี** |

### การรับผู้ใช้ใหม่ (สถานะ `AppUser.status` `lib/types.ts:41`: active (ค่าเริ่ม) / invited / pending / suspended)
1. **ขอเข้าใช้งานเอง** `/request-access` → `submitAccessRequest` (`onboarding.store.ts:220-277`): อีเมลต้องเป็นโดเมนของ uni (`findUniversityByEmail`), roles=[] status=pending, ต้อง consent → N12 ถึงผู้ดูแล → ผู้ดูแลที่ `/app/admin?tab=requests` **อนุมัติ** (กำหนด role+scope → active, N13) หรือ **ปฏิเสธ** (ลบแถวทันที, ลบ N12 ทุกคน, ผู้ขอไม่ได้แจ้ง). ระหว่าง pending login ได้ข้อความ "รออนุมัติ" (`auth.api.ts:315-318`)
2. **เชิญ** ผู้ดูแลกด "เชิญ" ที่แท็บผู้ใช้ → `inviteUser` (`:129-153`) สร้าง user status=invited + token → หน้าแสดงลิงก์ `/invite#t=<token>` ให้คัดลอกส่งเอง (`components/aunqa/admin/InviteResult.tsx`) → ผู้ถูกเชิญตั้งรหัสผ่าน `acceptInvitation` (`:192-213`) → active + login ทันที + N14 ถึงผู้เชิญ. ออกลิงก์ใหม่ / ยกเลิกเชิญได้
3. **สร้างตรง** `createUser` (`auth.api.ts:338`) ผ่าน `NewUserForm` (active ทันที)
4. **ระงับ/เปิดใช้** `setUserStatus` (`auth.api.ts:416-438`) — session ที่ค้างหมดผลที่ `getCurrentUser` ครั้งถัดไป (`:280`); ผู้ถูกระงับไม่ได้รับแจ้งเตือน / ไม่ถูกนับเป็นผู้รับมอบหมาย
5. **ลบ** ได้เฉพาะ invited/pending (`:398-400`) — ที่เคยใช้งานต้องระงับ
6. ข้อจำกัด: ทุกอย่างอยู่ใน localStorage เบราว์เซอร์เดียว — คำขอ/เชิญ/อนุมัติข้ามเครื่องไม่ได้

## (4) Root cause — ดูหัวข้อ "สรุปสั้น" ด้านบน
หลักฐาน (`.agents/playtest/TASK-0003/chair-notify.repro.test.ts`, ผล 10/10 ผ่าน 2026-11-04):
- R0-1 `[R0] editable [ '3.6:drafting:owner=-', '5.1:drafting:owner=-', '7.9:drafting:owner=-' ]`
- R0-2 `[R0] staff1 owns [ '1.1:approved' … '1.5:ready_for_review' ]`; staff1 `saveSection('3.6')` → forbidden
- R0-3 `[R0] chair notes at seed []` (แม้ seed มี ready_for_review 5 ข้อ: 1.5, 6.6, 8.1–8.3)
- R1-1 chair1 บันทึก+ส่ง 3.6 → `[R1] new notes []`, `unreadCount(chair)` ไม่เปลี่ยน
- R1-2 chair1 อนุมัติ 3.6 → "ไม่สามารถอนุมัติข้อที่ตนเองเป็นผู้เขียนล่าสุดได้"; fqa1/dean1/uadmin/staff1 อนุมัติไม่ได้
- R2-1 มอบ 3.6 ให้ staff1 → staff1 บันทึก+ส่ง → chair ได้ `cycle_status:ข้อ 3.6 ส่งตรวจแล้ว รอประธานอนุมัติ` target section, unread +1, อนุมัติได้, staff1 ได้ approved
- R2-2 บันทึกอย่างเดียว → ไม่แจ้ง · R2-3 ส่งกลับแล้วส่งซ้ำ → chair ได้ครั้งที่ 2
- R3 `transitionCycle(chair,'under_review')` → "ยังมี 8 ข้อที่ไม่ผ่านการอนุมัติ"
- R4 chair ถูกระงับ → ไม่ได้แจ้ง (by design)

สิ่งที่ตรวจแล้วว่า **ไม่ใช่สาเหตุ**: tenant/scope ของ `chairsOf` (ถูก, มีเทสต์ `tests/account-guards.test.ts:228`), dedupe (N3 ไม่มี dedupeKey), bell refresh เมื่อสลับบัญชี (deps `[user, pathname, tick]` `NotificationPanel.tsx:89`), cross-tab (`storage` listener `:68`), `isActiveUser` (chair1 active ใน seed)

## (5) เคสข้อมูลทดสอบ — seed ปัจจุบัน vs ที่ควรมี (ส่ง db-engineer)

Seed ปัจจุบัน (`lib/api/init.ts:34-103`): 2 uni (uni-demo, uni-demo-2 ไม่มีหลักสูตร), 1 คณะ, 2 หลักสูตร (CS มีประธาน, DS ไม่มีประธาน/ไม่มีรอบ), 11 ผู้ใช้ active ทั้งหมด role เดียวต่อคน, **รอบเดียว** `cycle-demo-2569` สถานะ in_progress: ข้อ approved 45, ready_for_review 5 (1.5, 6.6, 8.1, 8.2, 8.3), drafting 3 ไม่มีเจ้าของ (3.6, 5.1, 7.9), staff1 เป็นเจ้าของ C1 due +5 วัน (ข้อ 1.5 ยังไม่ approved → deadline 7 วัน), self-rating ทุกข้อ, หลักฐาน/ตัวชี้วัด/หลักสูตร/action 6 รายการ (open/in_progress/done/verified), แจ้งเตือน: staff1 ได้ assigned + in_progress, chair ไม่มี

| เคส | มีใน seed? | ควรเพิ่ม (ข้อเสนอ) |
|---|---|---|
| ข้อ not_started | ไม่ | ≥1 ข้อว่าง มีเจ้าของ (staff) |
| ข้อ drafting ที่ staff เป็นเจ้าของ (ส่งตรวจได้ทันที) | **ไม่** (สาเหตุบั๊กที่เจ้าของเจอ) | 3.6 → staff1, 5.1 → lect1 |
| ข้อ ready_for_review + แจ้งเตือนคู่กันให้ chair | สถานะมี แต่แจ้งเตือนไม่มี | สร้าง N3 ให้ chair ตรงกับ 5 ข้อ |
| ข้อ ready_for_review ที่ประธานเขียนเอง (segregation) | ไม่ | 1 ข้อ lastAuthorId = u-chair |
| ข้อ changes_requested + note + review event | ไม่ | 1 ข้อของ staff1 พร้อม N5 |
| ข้อ approved แล้วถูกส่งกลับ (approved → changes_requested) | ไม่ | 1 ข้อ |
| comment thread + ตอบกลับ + resolve | ไม่ (init ไม่สร้าง comment) | 1 thread ที่ข้อ ready_for_review |
| deadline buckets ≤3 / ≤1 / เลยกำหนด | มีแค่ ≤7 | ข้อ due −2 วัน (overdue), +1, +3 |
| ข้อ needsTranslationReview | ไม่ | 1 ข้อ |
| รอบทุกสถานะ: draft, under_review, revision_requested, faculty_approved, final_approved(lock), under_assessment, assessed, closed | มีแค่ in_progress | ปีอื่น/หลักสูตรอื่น ต่อสถานะ (หรือ scenario loader เลือกได้) |
| รอบ revision 2 (เปิด revision หลัง lock) + snapshot | ไม่ | 1 รอบ revision=2 |
| รอบ copyFrom รอบก่อน + action evidence materialize | ไม่ | รอบ 2568 closed → 2569 copy |
| กรรมการหลายคน: คนหนึ่งให้คะแนนครบ อีกคนยังไม่ครบ / ไม่มี verdict | ไม่ | assess2 + คะแนนบางส่วน |
| ผู้ใช้ pending (คำขอรออนุมัติ + N12) | ไม่ | 1 คน (ชื่อสมมติ) |
| ผู้ใช้ invited (ลิงก์ยังไม่ใช้ / หมดอายุ) | ไม่ | 2 คน |
| ผู้ใช้ suspended (เคยเป็นเจ้าของข้อ) | ไม่ | 1 คน เจ้าของ 1 ข้อ |
| ผู้ใช้หลาย role / หลาย scope (เช่น staff CS + chair DS, fqa + assessor) | ไม่ | 1–2 คน |
| หลักสูตรไม่มีประธาน (ส่งตรวจแล้วไม่มีผู้รับ) | มี (DS แต่ไม่มีรอบ) | รอบ DS + lect2 เจ้าของ |
| ข้าม tenant: uni-demo-2 มีหลักสูตร/รอบ/ประธานของตัว | uadmin2 เท่านั้น | prog + chair + cycle ของ uni 2 |
| หลักฐาน PII ยังไม่ resolve / verified / หลายเวอร์ชัน | บางส่วน (ขึ้นกับ DEMO_EVIDENCE) | ตรวจ + เติมให้ครบ |
| action ทุกสถานะ | มีครบ 4 | — |
| แจ้งเตือนอ่านแล้ว/ยังไม่อ่าน ปนกัน, >30 รายการ (ทดสอบ LIMIT) | ไม่ | ผู้ใช้ 1 คน 35 แถว |

ข้อเสนอโครง: `lib/mock-data/aunqa/scenarios/*` + ฟังก์ชัน loader (super_admin แท็บข้อมูลเดโม่ — `components/aunqa/admin/DemoTab.tsx`) เลือก "เดโม่มาตรฐาน / ทุกสถานะ" — เดินผ่าน API จริง (assign/submit/transition) เพื่อให้แจ้งเตือน/audit/review event ถูกสร้างครบ แทนการเขียน status ตรง (บทเรียนจาก R0-3). ระวัง `tests/helpers.ts:16-24` + เทสต์ที่ผูกจำนวน seed (เช่น "ยังมี 8 ข้อ", "ตรวจ 5 ข้อ" ใน `docs/guide/00-overview.md:338`, `tests/phase-u.test.ts:316`) — เปลี่ยน seed มาตรฐานต้องแก้เทสต์/คู่มือคู่กัน; ทางปลอดภัย = คง seed มาตรฐานเดิม (แก้แค่ F4 ที่จำเป็น) แล้วเพิ่ม scenario แยก

## (6) Flow ต่อ role ที่ควรถ่ายวิดีโอ

| # | บัญชี | flow |
|---|---|---|
| V0 | ผู้ใช้ใหม่ | (ก) `/request-access` กรอกคำขอ → login ได้ข้อความรออนุมัติ (ข) uadmin อนุมัติ + กำหนด role → ผู้ใช้ login เห็นแจ้งเตือน N13 (ค) uadmin เชิญ → คัดลอกลิงก์ → `/invite#t=` ตั้งรหัส → uadmin เห็น N14 |
| V1 | uadmin | แท็บผู้ใช้: สร้าง/เชิญ/แก้ role/ระงับ-เปิดใช้; คำขอ (อนุมัติ/ปฏิเสธ); Audit log; หลัง final_approved: มอบหมายกรรมการ + "เริ่มการประเมิน"; ปิดรอบ |
| V2 | sadmin | ข้อมูลเดโม่ (รีเซ็ต/โหลด scenario), เห็นคำขอทุก uni |
| V3 | chair1 | หน้าหลัก to-do → มอบหมายข้อ 3.6/5.1/7.9 ให้ staff1 (`/assign`) → (หลัง V4) กระดิ่ง → เปิดข้อ → อนุมัติ / ส่งกลับพร้อมเหตุผล → คิว `/app/review` → เมื่อครบ "ส่งให้ QA คณะตรวจ" · **ฉากสาธิตข้อควรระวัง**: ประธานเขียน+ส่งเอง → ไม่มีใครได้แจ้งเตือน + อนุมัติเองไม่ได้ |
| V4 | staff1 | กระดิ่ง "ได้รับมอบหมาย" → เขียน/AI ร่าง/ผูกหลักฐาน/อ้าง [E-…]/PDCA/คะแนนตนเอง → "บันทึกตอนนี้" → "ส่งตรวจ" (checklist) → ได้ส่งกลับ → แก้ → ส่งซ้ำ → ได้อนุมัติ |
| V5 | data1 | หลักฐาน (อัปโหลด, PII), นำเข้าตัวชี้วัด .xlsx |
| V6 | fqa1 | กระดิ่ง N7b → ตรวจรอบ, อ่าน SAR .docx, ส่งกลับรายข้อ/ทั้งรอบ หรือ "อนุมัติ (QA คณะ)"; verify หลักฐาน/action |
| V7 | dean1 | N7d → "อนุมัติสุดท้ายและล็อก" (เห็น lock + hash) หรือส่งกลับ; "เปิด revision ใหม่" |
| V8 | assess1 | N2/N7f → `/assess` ให้คะแนนรายเกณฑ์ + finding + verdict + AI summarize → "เสร็จสิ้นการประเมิน" |
| V9 | chair1 (ต่อ) | N7g ดูผลประเมิน → สร้าง action จาก AFI → ปิดรอบ |
| V10 | end-to-end | V0 → V3 → V4 → V3 → V6 → V7 → V1 → V8 → V9 ในวิดีโอเดียว พร้อมคำบรรยาย "ใครได้แจ้งเตือนอะไร" ทุกขั้น |
| V11 | ข้าม tenant | uadmin2 มองไม่เห็นข้อมูล uni-demo; assess1 เห็นเฉพาะรอบที่ได้รับ |

ข้อควรระวังตอนถ่าย: ใช้เบราว์เซอร์ / storageState เดียวกันทุกบัญชี (localStorage) และสลับบัญชีด้วยออกจากระบบ-เข้าใหม่
