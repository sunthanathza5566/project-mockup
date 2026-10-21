# TASK-0001 Review — Phase A (AUN-QA Copilot MVP)

- Reviewer: reviewer (รวมเช็กลิสต์ security ตามที่เจ้าของสั่ง ไม่เรียก security-auditor แยก)
- วันที่: 2026-10-21
- ขอบเขต: diff ทั้งหมดที่ยังไม่ commit ใน `feat/TASK-0001-aunqa-pivot` เทียบ HEAD (102 files, +2648/−15887 และไฟล์ใหม่ใน `lib/api/**`, `lib/utils/**`, `lib/mock-data/aunqa/**`, `app/app/**`, `components/aunqa/**`, `tests/**`)
- โฟกัสตามคำสั่ง: bug ที่ทำให้ flow หลักพัง, กฎเหล็ก 3 ข้อ, RBAC/multi-tenant/XSS/secret ไม่จับ style

Verdict: **APPROVE**

ไม่พบ blocker หรือ major ทุกข้อด้านล่างเป็น minor/nit แก้ได้ใน Phase B หรือรอบ polish (แนะนำให้แก้ #1–#3 ก่อน commit ถ้ามี token เหลือ เพราะแก้ไม่กี่บรรทัด)

## ผลตรวจที่รันเอง (ใน `eduflow-next/`)
| คำสั่ง | ผล |
|---|---|
| `npx tsc --noEmit` | exit 0, 0 error |
| `npm test` (vitest) | 5 files, **140/140 passed** |
| `npx next build` | ผ่าน, 13 routes (`/app/cycles/[id]`, `/app/sections/[id]`, `/app/evidence/[id]` เป็น dynamic) |

## ตรวจ flow หลัก (อ่านโค้ดจริง)
login → สร้าง/เปิดรอบ (`createCycle` สร้าง 53 sections, `draft→in_progress`) → มอบหมาย (`assignSections/assignCriterion` ตรวจว่าผู้รับมีสิทธิ์ `sar.write` จริง) → อัปโหลด + ผูกหลักฐาน (sha256 dedupe, รหัส `E-x.x-nn` unique ต่อหลักสูตร, PII scan) → เขียน SAR (citation ต้องผูกกับรอบจริง, autosave + versions) → AI ร่าง/รีวิว → มนุษย์กดยอมรับ (`acceptAiRun` ผ่าน `saveSection` ที่ตรวจสิทธิ์/lock/citation ซ้ำ) → ส่งตรวจรายข้อ → ประธานอนุมัติ → ครบ 53 ข้อ → `under_review` → QA ส่งกลับ (`revision_requested`, ต้องมี note) หรืออนุมัติ (`faculty_approved`) → คณบดี `final_approved` = lock + snapshot sha256 + เก็บ snapshot JSON → export. เดินได้ครบ ไม่มีจุดตัน
- state machine: ทุก transition ผ่านตาราง `CYCLE_TRANSITIONS`/`SECTION_TRANSITIONS` เท่านั้น; transition ต้องห้าม → `bad_transition`; ต้องครบ 53 ข้อก่อน `under_review`/`faculty_approved`
- lock: section/rating/link/assign/evidence ที่ผูกรอบ lock ถูกบล็อกทุกทาง → snapshot hash คงที่ (`verifySnapshot` ใช้ได้จริง); เปิดแก้ได้ทางเดียวคือ `openRevision` โดยคณบดี (revision+1, เก็บ snapshot เก่า)

## กฎเหล็ก
1. **AI ห้ามให้คะแนน/อนุมัติ/สร้างตัวเลข-หลักฐาน** — ผ่าน: `ai.service.ts` ไม่ import transition/committee rating; provider interface ไม่มีฟังก์ชันให้คะแนน; post-check ตัด `[E-…]` ปลอม + ตัด/ติดธงตัวเลขที่ไม่อยู่ใน input; `ratings` committee รับเฉพาะ assessor + `under_assessment`; ผลเป็นข้อเสนอจนมนุษย์กดยอมรับ
2. **PII redaction ก่อน provider** — ผ่าน: ทุกข้อความเข้า provider ผ่าน `redactDeep` (title/summary/extracted text/narrative), บันทึก `redactedInputHash` + `redactionCount`; เคารพ `aiEnabled` ต่อมหาวิทยาลัย (ข้อจำกัด: ยังไม่มี NER ชื่อคน — ระบุไว้แล้วเป็น Phase B)
3. **audit ทุก write/อนุมัติ/ให้คะแนน** — ผ่าน: ทุก store write เรียก `appendAudit` (autosave throttle 60 วิ ต่อ actor+target ซึ่งยอมรับได้); ไม่มีฟังก์ชันแก้/ลบ audit (ยกเว้น `resetDemo` ดู #3)

## Security
- RBAC ตรวจที่ lib ทุก write (ไม่ใช่แค่ซ่อนปุ่ม) — ตรวจแล้ว UI ไม่เรียก raw writer (`save/load/saveUsers/saveCycle/appendAudit/transitionSection`) ตรงเลย
- multi-tenant: `can()` ตัดข้าม university ก่อนทุก role ยกเว้น super_admin; `acceptAiRun`/`listAiRuns` กรอง universityId
- XSS: `.doc` export escape ทุก field ผู้ใช้ (`esc`/`nl2br`, regex citation จับเฉพาะตัวเลข); `dangerouslySetInnerHTML` เหลือที่เดียว `components/landing/AboutSection.tsx:25` เป็นข้อความ static ในโค้ด ไม่มี input ผู้ใช้; URL หลักฐานบังคับ `^https?://` และเปิดด้วย `rel="noreferrer noopener"`; ไฟล์ dataUrl ใช้ `download` ไม่ render inline
- secret: ไม่พบ key/token ในโค้ด; ไม่แตะ `.env`; demo password เป็นค่าสมมติ `demo1234` และ hash ก่อนเก็บ
- ข้อจำกัดโดยธรรมชาติของ MVP (ไม่นับเป็น finding): session/สิทธิ์ทั้งหมดอยู่ใน browser (localStorage/sessionStorage) ผู้ใช้แก้เองได้ด้วย devtools — RBAC ตอนนี้ป้องกัน "การใช้งานผิดผ่าน UI" ไม่ใช่ผู้โจมตี ต้องย้ายไป server + RLS ใน Phase B ตาม TODO ที่เขียนไว้

## Findings
| # | severity | file:line | ปัญหา | ข้อเสนอแก้ | โซน |
|---|---|---|---|---|---|
| 1 | minor | `lib/api/evidence.store.ts:346-350`, `:360-363`; เรียกที่ `app/app/evidence/[id]/page.tsx:31` | assessor ส่ง `cycleId` ของรอบตัวเองแล้วเปิด `getEvidence` ของหลักฐาน **ใดก็ได้** ในมหาวิทยาลัยเดียวกัน (ต่างหลักสูตร/ไม่ได้ผูกกับรอบ) เพราะ `can()` ของ assessor ดูแค่ `cycleId`; และ `getExtractedText` ไม่ตรวจสิทธิ์เลย (UI กรองเฉพาะกรณี PII ยังไม่ resolve) ผิดกฎ 3.2 "assessor เห็นเฉพาะรอบที่ได้รับมอบหมาย" | ใน `getEvidence`: ถ้าส่ง cycleId ให้ตรวจ `cycle.programmeId === e.programmeId` และถ้าเป็น assessor ต้องมี link ของ evidence นั้นในรอบนั้น; เปลี่ยน `getExtractedText(user, id, cycleId?)` ให้ผ่าน guard เดียวกัน (UI แก้ call site 1 บรรทัด) | backend-dev (+frontend-dev 1 บรรทัด) |
| 2 | minor | `lib/api/storage-cache.ts:16-35` + `lib/api/cycle.store.ts:374-386`, `lib/api/evidence.store.ts:241-246` | cache คืน **object reference เดียวกับ cache** และ store แก้ object ในที่ก่อน `save` → ถ้า throw กลางลูป (เช่น `assignSections` เจอ rid ไม่มีจริงหลังแก้ไปแล้วบางแถว, `linkEvidence` เจอ rid ผิดหลัง push link แล้ว) ค่าที่แก้ค้างใน cache ทั้งที่ไม่ได้ save และจะถูก save ติดไปกับ write ครั้งถัดไป; `assignSections` ยัง `appendAudit` ก่อน save จึงมี audit ของงานที่ไม่สำเร็จ ตอนนี้ UI ส่งแต่ id ที่ถูกต้องจึงยังไม่เกิด แต่เป็นกับดักตอนย้าย DB | validate รายการ id ทั้งหมดก่อนเริ่ม mutate และ append audit หลัง save สำเร็จ; หรือให้ `readJSON` คืน `structuredClone` (ช้ากว่าเล็กน้อย) | backend-dev |
| 3 | minor | `lib/api/init.ts:76-81`; เรียกที่ `app/app/admin/page.tsx:189` | `resetDemo()` ไม่รับ actor/ไม่ตรวจสิทธิ์ (ซ่อนแค่ปุ่มใน UI) และล้าง audit ทั้งหมด ขัดหลัก "ตรวจสิทธิ์ที่ lib ทุก write" และ audit append-only ประเมินแล้ว: ความเสี่ยงจริงต่ำ (ข้อมูลอยู่ใน browser ของผู้ใช้เอง ล้างเองได้อยู่แล้ว) แต่ควรแก้เพื่อความสม่ำเสมอ และห้ามติดไป Phase B | เปลี่ยนเป็น `resetDemo(actor)` + `can(actor,'user.manage',{universityId})` ไม่ผ่าน → `forbidden`; ใน Phase B ปิดฟังก์ชันนี้เมื่อไม่ใช่โหมดเดโม่ (env flag) | backend-dev (+frontend-dev call site) |
| 4 | minor | `lib/api/workflow.ts:125-135`, `:337-340` | ตาราง 3.2 ให้คณบดี "Comment/ส่งกลับแก้" (dean มี `sar.return`) แต่ไม่มีทางส่งกลับจริง: ไม่มี transition ออกจาก `faculty_approved` ย้อนกลับ และ section return ใช้ได้ถึง `under_review` เท่านั้น คณบดีทำได้แค่ อนุมัติ→`openRevision` | ต้องให้ architect ตัดสินตาม spec 4.1 ว่าจะเพิ่ม `faculty_approved → revision_requested` (action `approve.final`, requireNote) หรือคงไว้แล้วเอา `sar.return` ออกจาก dean ให้ตรงกับพฤติกรรม | backend-dev (ตัดสินโดย architect) |
| 5 | minor | `lib/api/evidence.store.ts:65-71` | `assertNotInLockedCycle` บล็อกการแก้/verify/resolvePii หลักฐานตลอดไปเมื่อเคยผูกกับรอบใดที่ lock แล้ว → รอบปีถัดไปที่ `copyFromCycleId` ใช้หลักฐานเดิมจะ verify/แก้ metadata ไม่ได้ (Phase A มีรอบเดียวจึงยังไม่เจอ) | Phase B: เก็บ metadata หลักฐานลง snapshot แล้วให้แก้เป็นเวอร์ชันใหม่ได้ หรือบล็อกเฉพาะ field ที่อยู่ใน snapshot และให้ verify ต่อรอบ | backend-dev |
| 6 | minor | `lib/api/auth.api.ts:144-166` | uni_admin `setUserRoles` ให้บทบาทตัวเองได้ (เช่นเพิ่ม dean/faculty_qa แล้วอนุมัติสุดท้ายเอง) และแก้/ลบบัญชีที่ถือ super_admin ในมหาวิทยาลัยเดียวกันได้ | ห้ามแก้ role ของตัวเอง; ห้ามแตะ user ที่มี super_admin ถ้า actor ไม่ใช่ super_admin | backend-dev |
| 7 | minor | `lib/api/evidence.store.ts:27-31`, `app/app/evidence/page.tsx:55` | ไม่จำกัดขนาด/ชนิดไฟล์ (spec 11.3) ไฟล์ใหญ่ถูกอ่านทั้งก้อนเข้า memory; ไฟล์ binary (PDF/DOCX) ไม่ถูก extract text → PII scan ทำได้แค่ title/description (เลขบัตรใน PDF จะไม่ติดธง) | จำกัดขนาด (เช่น 20MB) + allowlist นามสกุลที่ `createEvidence/addFileVersion`; แสดงข้อความใน UI ว่าไฟล์ binary ยังไม่ถูกสแกน PII (Phase B: text extraction) | backend-dev + frontend-dev |
| 8 | minor | `lib/api/audit.store.ts:155-163` | `auditToCsv` ไม่กัน CSV/formula injection (ค่าที่ขึ้นต้น `= + - @` เช่นชื่อหลักฐาน/ชื่อผู้ใช้ จะถูก Excel ตีความเป็นสูตร) | เติม `'` หน้าค่าที่ขึ้นต้นด้วย `= + - @ \t \r` | backend-dev |
| 9 | minor | `lib/api/ai.service.ts:56-60`, `:211` | audit `ai.run.AI-1` (เมื่อไม่ส่ง cycleId) และ `ai.accept` ไม่มี `programmeId` → ประธานหลักสูตร (audit.view ระดับหลักสูตร) มองไม่เห็นรายการเหล่านี้ | ส่ง `programmeId` จาก evidence/cycle ของ run | backend-dev |
| 10 | minor | `lib/api/init.ts:28-59` | เดโม่: จะไปถึง lock/export ฉบับสมบูรณ์ต้องเขียนและอนุมัติเองครบ 53 ข้อ (seed ไม่มี narrative, ความพร้อมเริ่ม 0%) ทำให้โชว์ flow ส่งตรวจ→QA→คณบดี→lock ในเวลาสั้นไม่ได้ ไม่ใช่ bug แต่กระทบเป้าหมาย "เดโม่ได้ครบ flow" | seed narrative + approved ให้ ~50 ข้อ เหลือไม่กี่ข้อให้เดโม่สด หรือเพิ่มรอบเดโม่ที่สองที่อยู่สถานะ `under_review` | db-engineer + backend-dev (init.ts) |
| 11 | nit | `lib/api/rbac.ts:36-42`, `lib/api/ai.service.ts:196` | ประธานเขียนและอนุมัติข้อของตัวเองได้ (ไม่มี segregation of duties); link ที่มาจาก AI-1 ไม่บันทึก `confirmedBy` ทั้งที่มนุษย์กดยอมรับ (มีใน audit แล้ว) | Phase B: พิจารณาห้ามอนุมัติข้อที่ตัวเองเป็นคนเขียนล่าสุด; ใส่ `confirmedBy: actor.id` ตอน accept | backend-dev |
| 12 | nit (process) | `eduflow-next/package.json`, `lib/mock-data/index.ts` | `package.json`/lockfile เป็นโซน "Config กลาง" (architect ตัดสิน) แต่ frontend-dev (ลบ qrcode) และ qa-tester (เพิ่ม vitest) แก้โดยไม่มีบันทึกการตัดสินของ architect; orchestrator ลบไฟล์ในโซน db-engineer เอง ทั้งคู่บันทึกไว้ใน TASK แล้วและไม่กระทบผลลัพธ์ | บันทึกบรรทัด decision ใน TASK file ย้อนหลังให้ครบ | orchestrator |

ไม่มีข้อใดผิด RULES ใน playbook ของ backend-dev / frontend-dev / db-engineer / qa-tester (playbook ทุกตัวยังไม่มี RULES)

## ข้อดีที่ควรเก็บเป็นบทเรียน
- บังคับกฎ AI ด้วย "โครงสร้าง import" (`ai.service.ts` ไม่ import workflow/committee rating และ provider interface ไม่มีเมธอดให้คะแนน) แทนการเขียนแค่ใน prompt ทำให้ตรวจง่ายและทดสอบได้
- AI accept เดินผ่าน store ปกติ (`saveSection`/`linkEvidence`) จึงได้สิทธิ์ + lock + citation check + audit ฟรี ไม่มีทางลัดให้ AI
- ตาราง transition เดียวใช้ทั้งบังคับใน lib และสร้างปุ่มใน UI (`CYCLE_TRANSITIONS.filter(... can())`) ทำให้ UI กับ lib ไม่หลุดกัน
- snapshot เลือกเฉพาะ field ที่เป็นสาระ + `stableStringify` ทำให้ hash คงที่และ `verifySnapshot` ใช้งานจริงได้
- facade `@/lib/api` จุดเดียว + `AunqaError.code` ทำให้ UI จัดการ error สม่ำเสมอ
- บทเรียนเชิงลบ: cache ที่คืน reference ร่วม + mutate-ก่อน-validate เป็นกับดัก → ควรเป็นกฎ "validate ทั้งหมดก่อนแตะข้อมูล และ audit หลัง save"
