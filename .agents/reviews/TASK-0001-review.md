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

---

## Phase B

- Reviewer: reviewer (รวมเช็กลิสต์ security เพราะแตะ API สาธารณะ `app/api/ai/route.ts`)
- วันที่: 2026-10-21
- ขอบเขต: `git diff cc5029b..HEAD` (commit 6f294d9 backend + 1ad07d7 UI/tests) 54 files, +4171/−864
- โฟกัส: สิ่งที่ใช้งานไม่ได้จริง / กฎเหล็ก AI 7.3 / ความปลอดภัย (ไม่จับ style)

Verdict: **CHANGES_REQUESTED**

เหตุผล: major 1 ข้อ (#B1) ที่ route `/api/ai` — ตัวกันที่ประกาศไว้ (rate limit) ข้ามได้ง่าย และ server ส่ง output ของ Claude กลับโดยไม่ตรวจรูปแบบ เมื่อเจ้าของใส่ `ANTHROPIC_API_KEY` ใครก็ใช้ endpoint นี้เป็น proxy เรียก Claude ด้วยเงินของเจ้าของได้ไม่จำกัด ส่วนอื่นผ่านดี แก้ #B1 (+ #B2, #B3 ถ้าทำพร้อมกันได้) แล้วส่งรีวิวรอบสั้นเฉพาะ route ก็พอ

### ผลตรวจที่รันเอง (ใน `eduflow-next/`)
| คำสั่ง | ผล |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 11 files, **204/204 passed** |
| `npx next build` | ผ่าน 19 routes (`/api/ai` = ƒ dynamic, `/app/cycles/[id]/assess` ใหม่) |
| grep `.next/static` หา `ANTHROPIC` / `api.anthropic.com` / `x-api-key` | ไม่พบ (key ไม่หลุดไป client bundle) |

### ปิด finding ของ Phase A
| # | ผล | หลักฐาน |
|---|---|---|
| 4 คณบดีส่งกลับ | **ปิด** | `workflow.ts:33` `faculty_approved → revision_requested` (approve.final, requireNote) + ALLOWED_CYCLE ใน `workflow.test.ts` + ข้อความแจ้งเตือนระบุผู้ส่งกลับ |
| 5 หลักฐานหลัง lock | **ปิด** | ถอด `assertNotInLockedCycle` ออกจาก update/verify/resolvePii/setAiSummary (ยังบล็อกการเปลี่ยนไฟล์), `verifySnapshot` ใช้ metadata หลักฐานจาก snapshot ที่เก็บตอน lock + ตรวจ hash ของ snapshot ที่เก็บด้วย, คืน `evidenceChanged`; มีเทสต์ |
| 11 segregation / confirmedBy | **ปิด** | `SarSection.lastAuthorId` + `workflow.ts:276` ห้ามอนุมัติข้อที่ตนเขียนล่าสุด, UI ซ่อนปุ่มและแสดงเหตุผล (`SarWorkspace.tsx:128-129,245`); AI-1 accept ส่ง `confirmedBy` |

### เช็กตามโฟกัส
- **`/api/ai`**: key อ่านจาก `process.env` ฝั่ง server เท่านั้น ไม่อยู่ใน response/log (log แค่ status กับ `e.name`), URL upstream คงที่ (ไม่มี SSRF), error คืนแค่ code กลาง ๆ, redact ซ้ำฝั่ง server, timeout 60s — ดี; ปัญหาอยู่ที่ rate limit / การตรวจ output / body limit (#B1–#B3)
- **AI ห้ามให้คะแนน/verdict/เปลี่ยน state**: provider interface ไม่มีเมธอดให้คะแนน, AI-7/AI-9 accept = รับทราบเท่านั้น, Claude output ผ่าน type-guard ฝั่ง client แล้วเข้า post-check เดิมใน `ai.service` ทุก feature (มีเทสต์ mock fetch ที่ NODE_ENV=production) — ผ่าน; ช่องโหว่เล็กอยู่ที่ข้อความ AI-9 (#B4) และ AI-7 (#B5)
- **Assessor**: verdict เลือกเองไม่มีฟังก์ชันคำนวณ/เฉลี่ย, committee rating เป็นแถว `raterType:'committee'` แยกจาก self (key ด้วย criterionNo + raterUserId), role assessor ไม่มี `sar.write`/`evidence.write` (read-only ต่อ SAR), เขียนได้เฉพาะรอบที่ได้รับมอบ + สถานะ `under_assessment`, ซ่อนผลจากหลักสูตรจนกว่า `assessed/closed` — ผ่าน
- **XSS**: Appendix B/D escape ทุก field ผู้ใช้ด้วย `escapeHtml/escapeHtmlBr` (ตัวเลขคะแนนผ่าน `checkScore` แล้ว), UI ใหม่ไม่มี `dangerouslySetInnerHTML` (ยังเหลือที่เดียว `components/landing/AboutSection.tsx:25` static เหมือนเดิม), กราฟ SVG ใช้ React render — ผ่าน
- **action → evidence ขั้น A**: กันสร้างซ้ำด้วย `item.evidenceId` + กันลิงก์ซ้ำต่อ (evidence, cycle, requirement), กรองด้วย `programmeId` ของรอบ (ไม่ข้าม tenant), เทสต์ 3 รอบ — ผ่าน (มีประเด็นออกแบบ #B6)
- **CSS cleanup**: เทียบ class ที่ถูกลบ 491 ตัวกับ source ทั้งหมด (รวม landing/auth) ไม่พบ class ที่ยังใช้อยู่หาย (ที่ grep เจอเป็น false positive เช่น `kpi-num` อยู่ใน `dash-kpi-num` ซึ่งยังมี); class แบบ dynamic `aq-badge-${tone}`, `aq-heat-${level}`, `aq-lv-${v}` มีครบ — ผ่าน

### Findings
| # | severity | file:line | ปัญหา | ข้อเสนอแก้ | โซนเจ้าของ |
|---|---|---|---|---|---|
| B1 | **major** | `eduflow-next/app/api/ai/route.ts:24-33`, `:49`, `:84` | (1) rate limit ใช้ IP จาก `x-forwarded-for` ที่ client ตั้งเองได้ → สุ่มค่า header ก็ข้าม limit ได้ทุกครั้ง และ `hits.clear()` เมื่อเกิน 5000 key ล้าง limit ของทุกคนด้วย (2) server คืน `output` ที่ parse ได้ทุกแบบโดยไม่ตรวจ schema และรับ `input` เป็น object อะไรก็ได้ → เรียกจาก curl (ไม่ติด CORS, ใส่ `x-aunqa-client: 1` เองได้) ให้ Claude ทำงานอะไรก็ได้ max_tokens 4096 ด้วย key ของเจ้าของแบบไม่จำกัด — ไม่ใช่เรื่อง "สิทธิ์อยู่ใน browser" ของ MVP แต่เป็นค่าใช้จ่ายจริงฝั่ง server ที่ตัวกันที่ประกาศไว้ไม่ทำงาน | ก) ไม่เชื่อ `x-forwarded-for` เว้นแต่ตั้ง env `TRUST_PROXY=1` และเพิ่ม **global cap** ต่อนาที + งบรายวัน (เช่น `AI_DAILY_LIMIT`) ที่ไม่ขึ้นกับ IP; evict key เก่าแทน `clear()` ข) ย้าย type-guard ใน `lib/api/ai/claude.ts` ไปไฟล์ร่วม (เช่น `lib/api/ai/guards.ts`) แล้วให้ route ตรวจ output ก่อนคืน (ไม่ผ่าน → 502 `bad_output`) และตรวจ shape ของ `input` ต่อ task คร่าว ๆ ค) ตั้ง `max_tokens` ต่อ task | backend-dev |
| B2 | minor | `eduflow-next/app/api/ai/route.ts:55-57` | อ่าน body ทั้งก้อนด้วย `req.text()` ก่อนเช็ก `MAX_BODY_CHARS` → body ใหญ่มากยังกินหน่วยความจำ server ได้ | เช็ก `content-length` ก่อน (เกิน → 413) แล้วค่อยอ่าน หรืออ่านแบบ stream ตัดเมื่อเกิน | backend-dev |
| B3 | minor | `eduflow-next/tests/` (ไม่มีไฟล์ทดสอบ route) | route handler สาธารณะไม่มีเทสต์ตรงเลย (เทสต์ปัจจุบัน mock `fetch('/api/ai')` ฝั่ง client) | เพิ่มเทสต์เรียก `GET/POST` จาก `app/api/ai/route.ts` ตรง ๆ: 503 ไม่มี key, 403 ไม่มี header / origin ต่าง host, 413, 400 task ผิด, 429, output ผิด schema → 502, response ไม่มี key; mock fetch upstream | qa-tester |
| B4 | minor | `eduflow-next/lib/api/ai.service.ts:251-273` | AI-9 post-check ใส่ `1 2 3 4 5 6 7 8 9` ใน input context และไม่มีตัวกรองคำให้คะแนน → Claude เขียน "ควรได้ระดับ 5" / "ผ่านเกณฑ์" ในสรุป/strengths/concerns ก็ผ่าน post-check ไปแสดงในหน้ากรรมการได้ (prompt ห้ามแล้ว แต่กฎ 7.3 ควรบังคับในโค้ด) | เพิ่ม filter ตัดประโยคที่เข้ารูปให้คะแนน/ตัดสิน (คำว่า คะแนน, ระดับ + เลข 1–7, score, verdict, ผ่าน/ไม่ผ่าน, adequate) ใน AI-9 (และ AI-3) + เทสต์ด้วย mock Claude | backend-dev |
| B5 | minor | `eduflow-next/lib/api/ai.service.ts:209-213`, `:116-119` | AI-7 กรองแค่ `id` ที่รู้จัก แต่ยังเชื่อ `code/kind/declaredLevel/detectedLevels` จาก Claude (เช่น `detectedLevels:[9]` ไปโชว์และปุ่ม "ใช้ระดับที่ตรวจพบ" — store `bloom()` กันค่าเพี้ยนได้ จึงไม่เสียข้อมูล แต่ UI แสดงผิด); AI-1 `confidence` จาก Claude ไม่ clamp 0–1 ก่อนเก็บลง link | AI-7: override `code/kind/declaredLevel` จาก `known` และกรอง `detectedLevels` ให้อยู่ 1–6; AI-1: clamp `confidence` | backend-dev |
| B6 | minor (ออกแบบ) | `eduflow-next/lib/api/action.store.ts:184-187` | `materializeActionEvidence` ผูก action ที่ done/verified **ทุกตัวตลอดกาล** เข้าทุกรอบใหม่ (2570, 2571, 2572 …) ไม่ใช่เฉพาะรอบถัดไป → หลักฐานขั้น A เก่าสะสมเรื่อย ๆ | ให้ architect ตัดสิน: จำกัดเฉพาะ action ที่ done หลังรอบก่อนหน้าสร้าง / ยังไม่เคยผูกรอบใด หรือผูกเฉพาะ `originCycleId` = รอบก่อนหน้า | backend-dev (ตัดสินโดย architect) |
| B7 | minor | `eduflow-next/lib/api/index.ts:27` | `export * from './action.store'` ทำให้ `materializeActionEvidence` (ไม่ตรวจสิทธิ์ตามคอมเมนต์) หลุดออก facade — แบบเดียวกับ `extractedTextOf` ที่เพิ่งแก้ | export แบบเลือกรายชื่อ หรือย้ายไป `action-evidence.internal.ts` | backend-dev |
| B8 | minor (ออกแบบ) | `eduflow-next/lib/api/workflow.ts:192-199` | `→ assessed` เช็กครบเฉพาะของ actor → ถ้ารอบมีกรรมการหลายคน คนแรกที่ครบจะปิดการประเมินทั้งรอบ คนอื่นบันทึกต่อไม่ได้ (`assertAssessorWrite` ต้อง `under_assessment`) | architect ตัดสิน: ต้องครบทุกกรรมการที่ได้รับมอบ หรือมีบทบาท lead assessor | backend-dev (ตัดสินโดย architect) |
| B9 | nit | `eduflow-next/lib/api/cycle.store.ts:69`, `workflow.ts:276` | `lastAuthorId` ถูก copy ข้ามรอบ + มีแค่ `programme_chair` ที่อนุมัติข้อได้ → ข้อที่ประธานเขียนในปีก่อนจะอนุมัติในปีใหม่ไม่ได้จนกว่าจะมอบให้ staff แก้ (มีทางออกและ UI บอกเหตุผล แต่เป็นกับดักในหลักสูตรที่มีประธานคนเดียว) | บันทึกในคู่มือ / พิจารณาไม่ copy `lastAuthorId` หรือให้ QA คณะอนุมัติแทนได้ | backend-dev (ตัดสินโดย architect) |
| B10 | nit | `eduflow-next/lib/api/ai/prompts.ts:9` | `CLAUDE_MODEL` hard-code; ถ้า id ผิด upstream คืน 4xx ทุกครั้งแล้ว fallback offline เงียบ ๆ (ผู้ใช้ไม่รู้ว่า Claude ไม่เคยทำงาน) | อ่านจาก env `ANTHROPIC_MODEL` (default ค่าเดิม) และให้ researcher ยืนยัน model id | backend-dev |

ไม่มีข้อใดผิด RULES ใน playbook ของ backend-dev / frontend-dev / db-engineer / qa-tester (ยังไม่มี RULES); ไฟล์ที่แก้อยู่ในโซนของผู้แก้ตาม OWNERSHIP (`app/api/**` = backend, `lib/mock-data/**` = db-engineer, `tests/**` = qa-tester)

### ข้อดีที่ควรเก็บเป็นบทเรียน
- Claude provider ออกแบบให้ "ล้ม = offline" ทุกทาง (no key / 503 / throw / bad shape) และ post-check อยู่ที่ `ai.service` ร่วมกันทุก provider → เปลี่ยน provider ไม่ทำให้กฎ 7.3 หลุด พร้อมเทสต์ mock fetch ยืนยัน
- `verifySnapshot` เทียบ metadata หลักฐานกับค่าที่เก็บตอน lock (ไม่ใช่ค่าปัจจุบัน) + ตรวจ hash ของ snapshot ที่เก็บด้วย → แก้ #5 โดยไม่เสีย integrity
- แยก `freshDemo` (ว่าง) / `freshSeededDemo` + helper `driveToLocked/driveToAssessment` ทำให้เทสต์ flow ยาวอ่านง่าย
- ซ่อนฟังก์ชันไม่มี guard ด้วยไฟล์ `*.internal.ts` ที่ไม่อยู่ใน facade — ควรใช้กับทุกฟังก์ชัน side-effect ที่ข้ามการตรวจสิทธิ์ (ดู #B7)
- บทเรียนเชิงลบ: endpoint ที่ถือ secret ที่มีค่าใช้จ่าย ต้องมี cap ที่ไม่ขึ้นกับข้อมูลจาก client (global/daily) และตรวจ schema ของ output ฝั่ง server เสมอ อย่าพึ่ง `x-forwarded-for`

### Log (reviewer)
- 2026-10-21 Phase B: อ่าน diff cc5029b..HEAD เฉพาะ route/AI/assessor/action/export/workflow/evidence/CSS; รัน tsc/test/build ผ่าน; ตรวจ bundle ไม่มี key; ปิด A#4 #5 #11; เปิด B1 (major) + B2–B8 minor + B9–B10 nit → CHANGES_REQUESTED

## Phase B — round 2

- Reviewer: reviewer · วันที่ 2026-10-21 · ขอบเขต: `git diff 1ad07d7..HEAD -- eduflow-next` (4939d72 + aa6922c, 18 files +624/−78) เฉพาะ fix
- ผลรันเอง: `npx tsc --noEmit` exit 0 · `npm test` 14 files **234/234 passed** · `npx next build` ผ่าน 19 routes (`/api/ai` ƒ)

Verdict: **APPROVE**

### ปิด finding Phase B
| # | ผล | หลักฐาน |
|---|---|---|
| B1 major | **ปิด** | `lib/api/ai/ratelimit.ts`: ไม่เชื่อ XFF เว้นแต่ `TRUST_PROXY=1` (ใช้ค่าท้ายสุด), global cap/นาที + งบรายวัน (นับเฉพาะคำขอที่ผ่านด่านและกำลังยิง upstream), evict แทน `clear()` · `guards.ts` input/output guard ต่อ task, route คืน 502 `bad_output` เมื่อ output ผิด shape, `MAX_TOKENS` ต่อ task · เทสต์ route ครอบทุกด่าน |
| B2 | **ปิด** | `readBodyLimited`: เช็ก content-length ก่อน + อ่าน stream ตัดเมื่อเกิน 120k; `JSON.parse('null')` กันด้วย `!body` |
| B3 | **ปิด** | `tests/ai-route.test.ts` (GET/503/403/413 ทั้งสองแบบ/400/429 ต่อ IP-global-daily/502/200/redact) |
| B4 + BUG-0001-B4-1 | **ปิด** (มีข้อเหลือ #R2-1) | `stripJudgement` ใช้ใน AI-3 (unanswered/suggestions) และ AI-9 (summary/strengths/concerns/questions) + ธง `postCheck.ok=false`; "ไม่ผ่านเกณฑ์ข้อนี้" ถูกตัดแล้ว; "เผยแพร่ผ่านเว็บไซต์", "ผ่านการประชุม" ไม่ถูกตัด |
| B5 | **ปิด** | AI-7 ใช้ `code/kind/declaredLevel` จาก `known`, `detectedLevels` กรอง 1–6 + unique; AI-1 clamp `confidence` 0–1 (ไม่ finite → 0) |
| B6 | **ปิด** (ตามที่ orchestrator ตัดสิน) | `materializedCycleId` — ผูกเฉพาะรอบแรกหลัง action เสร็จ, ข้อมูลเก่าที่มี evidenceId ไม่ผูกซ้ำ; รอบที่ copy ยกลิงก์มาตามปกติ (เทสต์ c3/c4) |
| B7 | **ปิด** | facade export เป็นรายชื่อ ไม่มี `materializeActionEvidence`; ผู้เรียกเดียวคือ `cycle.store.ts:83` |
| B8 | **ปิด** (ตามที่ตัดสิน) | `→ assessed` ต้องครบทุกกรรมการที่มี role `assessor` scope cycle นั้น + มี verdict ≥1; error ระบุชื่อคนที่ยังขาด; เทสต์ 2 กรณี |
| B9 | **ปิด** (ตามที่ตัดสิน) | ไม่ copy `lastAuthorId` ข้ามรอบ |
| B10 | **ปิด** | `getClaudeModel()` อ่าน env `CLAUDE_MODEL` (validate รูปแบบ, default เดิม) + log `error.type` ของ upstream (ตัด 60 ตัว ไม่มี key/ข้อความผู้ใช้) ทำให้รู้เมื่อ model id ผิด |

### ตรวจ `JUDGEMENT_RE` (เลี่ยงได้ไหม) — probe ด้วย node
- ตัดถูก: `ไม่ผ่านเกณฑ์ข้อนี้`, `ข้อนี้ไม่ผ่าน`, `ผ่านการประเมินจาก...`, `ควรได้ระดับ`, `ระดับ 5`, `คะแนน`
- **เลี่ยงได้**: `ข้อนี้ไม่ผ่าน.` (มีจุดท้าย — `\s*$` ไม่ยอม `.`), `ถือว่าผ่าน`, `ผ่านตามเกณฑ์`, `เป็นไปตามเกณฑ์`, `เพียงพอ` / `ไม่เพียงพอ` (คำแปลไทยของ Adequate/Inadequate ในสเกล AUN-QA โดยตรง), `อยู่ในระดับที่ 5`, `ระดับ ๕` (เลขไทย)
- **ตัดเกิน (false positive)**: `ความพึงพอใจอยู่ในระดับ 4.51 จาก 5`, `ผลประเมินความพึงพอใจ 4.21 คะแนน` — ข้อเท็จจริงปกติใน SAR (ตัวเลขผ่าน post-check ตัวเลขแล้ว) แต่ถูกตัดทั้งบรรทัด เพราะประโยคไทยไม่มีจุดจึง `splitSentences` คืนทั้งย่อหน้าเป็นประโยคเดียว → สรุป AI-9 อาจกลายเป็นข้อความ fallback บ่อย
- สรุป: เป็นชั้นเสริมจาก prompt + human-in-the-loop (verdict/คะแนนเลือกเองโดยกรรมการ ไม่มีทางให้ AI เปลี่ยน state) จึงไม่ถึงระดับ major

### Findings ใหม่
| # | severity | file:line | ปัญหา | ข้อเสนอแก้ | โซนเจ้าของ |
|---|---|---|---|---|---|
| R2-1 | minor | `eduflow-next/lib/api/ai/postcheck.ts:396` | `JUDGEMENT_RE` เลี่ยงได้ด้วยคำตัดสินไทยที่พบบ่อย (`เพียงพอ/ไม่เพียงพอ`, `ถือว่าผ่าน`, `ผ่านตามเกณฑ์`, `เป็นไปตามเกณฑ์`, `ระดับที่ N`, เลขไทย, `ไม่ผ่าน.`) | เพิ่ม `(?:ไม่)?เพียงพอ(?:ตามที่คาดหวัง)?`, `(?:ถือว่า|ควร|สมควร)(?:ไม่)?ผ่าน`, `ผ่านตามเกณฑ์`, `(?:ไม่)?เป็นไปตามเกณฑ์`, `ระดับ(?:ที่)?\s*[1-7๑-๗](?![\d.])`, เปลี่ยน `ไม่ผ่าน\s*$` → `ไม่ผ่าน[\s.!?]*$` + เทสต์ตารางคำเหล่านี้ | backend-dev (+qa-tester เทสต์) |
| R2-2 | minor | `eduflow-next/lib/api/ai/postcheck.ts:396`, `:398-407` | ตัดเกิน: `คะแนน` เปล่า ๆ และ `ระดับ\s*[1-7]\b` จับ "ระดับ 4.51", "4.21 คะแนน" (ผลความพึงพอใจ) และเพราะประโยคไทยไม่มีตัวแบ่ง จึงหายทั้งย่อหน้า | จับเฉพาะรูปตัดสิน เช่น `(?:ให้|ได้|ควรได้)\s*คะแนน`, `คะแนน(?:ของ)?(?:เกณฑ์|ข้อ)นี้`, และ `ระดับ\s*[1-7](?![\d.])`; เทสต์ว่าข้อความความพึงพอใจไม่ถูกตัด | backend-dev |
| R2-3 | nit | `eduflow-next/tests/` | B5 (clamp `confidence`, override `code/kind/declaredLevel`, กรอง `detectedLevels`) ไม่มีเทสต์ตรง | เพิ่ม case mock Claude คืน `confidence: 3`, `detectedLevels:[0,9,2,2]`, `code` ปลอม | qa-tester |

R2-1/R2-2 ไม่บล็อก — ทำเป็น follow-up ได้ (ควรทำก่อนเปิดใช้ key จริง) · ไม่มีข้อใดผิด RULES ใน playbook ของผู้แก้ · ไฟล์อยู่ในโซนผู้แก้ (`app/api/**`, `lib/**` = backend-dev, `tests/**` = qa-tester); `postcheck.ts` ส่วนที่ orchestrator ปรับเองเป็นงานแก้ regex บรรทัดเดียวตามข้อยกเว้นใน CLAUDE.md

### ข้อดีที่ควรเก็บเป็นบทเรียน
- งบรายวันนับหลังผ่าน input guard และก่อนยิง upstream → คำขอขยะ (400) ไม่กินงบ แต่ทุกการเรียกจริงถูกนับ — มีเทสต์ยืนยันทั้งสองด้าน
- type-guard ย้ายเป็นไฟล์ pure ร่วม (`guards.ts`) ใช้ทั้ง client และ server → schema เดียว ไม่ drift
- ฟิลด์ที่ระบบรู้อยู่แล้ว (code/kind/declaredLevel) เขียนทับจาก input แทนการเชื่อ LLM — แนวทางที่ควรใช้กับทุก output AI
- บทเรียนเชิงลบ: regex ตัดคำตัดสินภาษาไทยต้องมีตารางเทสต์ทั้ง "ต้องตัด" และ "ต้องไม่ตัด" (โดยเฉพาะคำแปลไทยของสเกลมาตรฐาน) และระวังว่าประโยคไทยไม่มีตัวแบ่ง → ตัด 1 ครั้ง = หายทั้งย่อหน้า

### Log (reviewer)
- 2026-10-21 Phase B round 2: อ่าน diff 1ad07d7..HEAD (route/ratelimit/guards/postcheck/ai.service/action/workflow/cycle/index + tests); รัน tsc 0 / test 234/234 / build ผ่าน; probe `JUDGEMENT_RE` 17 ประโยค; ปิด B1–B10 + BUG-0001-B4-1; เปิด R2-1, R2-2 (minor), R2-3 (nit) → **APPROVE**

---

## Phase C (C4 — diff `890e0b9..HEAD -- eduflow-next`, 34 ไฟล์ +3003/-47)

Verdict: **CHANGES_REQUESTED** (major 1 ข้อ — C-1)

Study: อ่าน PROTOCOL ข้อ 5 + `standards/INDEX.md` — ไม่มีมาตรฐานโซน reviewer/security; ใช้ spec 7.3, 11.2, 11.3 (OWASP: validate input, จำกัดชนิด/ขนาดไฟล์) และ LESSONS ใน playbook (escape export, grep innerHTML, key ใน bundle) แทน

### Findings
| # | severity | file:line | ปัญหา | ข้อเสนอแก้ | โซนเจ้าของ |
|---|---|---|---|---|---|
| C-1 | **major** | `eduflow-next/lib/api/export-docx.ts:35-36` (`run()`) — ใช้กับข้อความผู้ใช้ทุกจุด (narrative `:132-134`, rationale `:162`, ชื่อหลักฐาน `:171`) | ไลบรารี `docx` escape แค่ `& < >` แต่**ไม่ตัด control char ที่ XML 1.0 ห้าม** — probe ด้วย node: `TextRun('a\u000bb\u0001c')` ออกมาเป็น `<w:t>a\u000bb\u0001c</w:t>` ดิบ ทำให้ Word บอกว่าไฟล์เสียทั้งเล่ม. `\u000b` (vertical tab) ติดมาตอนคัดลอกข้อความที่มี manual line break จาก Word/PowerPoint ซึ่งหลักสูตรไทยทำกันจริง; มีตัวเดียวใน 53 ข้อ = export DOCX (Must M11) ของทั้งรอบเปิดไม่ได้ และหลัง lock แก้ข้อความไม่ได้ ต้องให้คณบดีเปิด revision | ใน `run()` ตัดอักขระก่อนสร้าง TextRun: ช่วง `\u0000-\u0008`, `\u000B`, `\u000C`, `\u000E-\u001F`, `￾`, `￿` และ surrogate ที่ไม่มีคู่ · ใน `richParas` split ด้วย `/\r?\n/` · เทสต์: narrative ที่มี `\u000b`/`\u0001` แล้ว unzip `word/document.xml` ยืนยันว่าไม่มี control char | backend-dev (+qa-tester เทสต์) |
| C-2 | minor | `eduflow-next/lib/api/ai.service.ts:228-235` | (C3a obs 1 — เห็นด้วย) `runTranslate` ไม่เช็กว่ารอบเขียนได้ไหม → รอบที่ lock หรืออยู่ระหว่างตรวจยังเรียก AI ได้ (เปลือง rate-limit/งบรายวันของ `/api/ai`) แล้วค่อยไปติดตอน accept. UI ปิดปุ่มแล้ว (`SarWorkspace.tsx` `disabled={!editable}`) แต่ API ควรปฏิเสธเอง | หลัง `assertAiEnabled` เรียก `assertCycleWritable(cycle)` (จาก workflow.ts) ก่อนเรียก provider · ปรับเทสต์ `tests/phase-c1.test.ts:260` ให้คาด `locked` | backend-dev (+qa-tester) |
| C-3 | minor | `eduflow-next/lib/api/ai/glossary.ts:131` | (C3a obs 3 — เห็นด้วย) แปล TH→EN แล้วศัพท์ที่แทนติดกับคำไทย: "หลักสูตรมี" → "programmeมี" อ่านยาก และ Word ตัดคำผิด | ใน callback ของ `replace` ใช้ `(m, offset, s)` เติมช่องว่างหน้า/หลังเมื่ออักขระข้าง ๆ ไม่ใช่ช่องว่าง/วรรคตอน (เฉพาะ `from==='th'`) · เทสต์แบบตาราง: กลางประโยค, ต้นบรรทัด, ติดวงเล็บ, ติด [E-…] | backend-dev (+qa-tester) |
| C-4 | minor | `eduflow-next/lib/api/ai/guards.ts:21` (`translate: 4096`) เทียบกับ cap 20000 ตัวอักษรใน `ai.service.ts` และ `guards.ts:48` | ข้อความไทย 20,000 ตัวอักษร พอแปลเป็นอังกฤษและห่อ JSON แล้วเกิน 4096 token ได้ → output ถูกตัด → 502 `bad_output` → fallback ไป offline เงียบ ๆ (เสีย call เต็ม ๆ ผู้ใช้ได้แค่ glossary) · redaction ทำให้ข้อความยาวขึ้นได้ (`[STUDENT_ID]` ยาวกว่าเลข 10 หลัก) จนเกิน 20000 แล้วโดน 400 | ลด cap ของ translate ฝั่ง service เหลือราว 8,000 ตัวอักษร (หรือแปลทีละย่อหน้า) หรือเพิ่ม `MAX_TOKENS.translate` เป็น 8192 · เช็กความยาว**หลัง** redact | backend-dev |
| C-5 | minor | `eduflow-next/lib/api/metrics-import.ts:65-69, 192` | เซลล์ที่ผู้ใช้ตั้งรูปแบบเป็น % ใน Excel (พิมพ์ "85%") ถูกเก็บเป็น 0.85 → ผ่าน validate 0–100 และบันทึก 0.85% โดยไม่มีคำเตือน — ขัด acceptance M6 "ตัวเลขตรงกับคำนวณมือ" | ถ้า `cell.numFmt` มี `%` และ metric มีหน่วย `%` → คูณ 100 (หรือแจ้ง error "กรอกเป็นตัวเลข 0–100 ไม่ใช่รูปแบบ %") · เทสต์ไฟล์ที่ตั้ง `numFmt='0%'` | backend-dev (+qa-tester) |
| C-6 | minor | `eduflow-next/lib/api/metrics-import.ts:254, 260` | ตอน commit ถ้าคอลัมน์ว่าง `targetValue/benchmarkValue/benchmarkSource` เดิมจะถูกทับเป็น `undefined` (preview บอกแค่ "แทนที่ค่าเดิม" ของ value) และ audit `metric.import` เก็บแค่จำนวน → ย้อนดูไม่ได้ว่าค่าไหนถูกทับ (ต่างจาก `upsertMetric` ที่เก็บ before/after) | (ก) คอลัมน์ว่าง = คงค่าเดิม หรือให้ preview บอกว่าเป้า/benchmark จะถูกล้าง (ข) audit เก็บ `before` ของแถวที่ถูกทับ `[{code, period, value, targetValue, benchmarkValue}]` (เป็นข้อมูลระดับหลักสูตร ไม่ใช่ PII) | backend-dev |
| C-7 | minor | `eduflow-next/app/app/metrics/page.tsx:37`, `components/aunqa/MetricImport.tsx:116-161` | state ของการ import ไม่ reset เมื่อเปลี่ยนหลักสูตรใน dropdown: preview metric ที่ค้างอยู่จะ commit ลงหลักสูตร**เดิม** ทั้งที่หน้าจอแสดงหลักสูตรใหม่ ส่วน cohort จะเอาไฟล์ที่เลือกไว้ไป commit ลงหลักสูตร**ใหม่** · ถ้าเปลี่ยน "เวลาเรียนตามหลักสูตร" เร็ว ๆ จะยิง dryRun ซ้อนกัน ผลที่กลับมาช้ากว่าอาจทับผลล่าสุด (ตารางไม่ตรงกับค่า std ที่ commit) | ใส่ `<MetricImport key={programmeId} …/>` · ใน `check()` จำ request id/std ล่าสุด แล้วทิ้งผลที่ไม่ใช่ของคำขอล่าสุด | frontend-dev |
| C-8 | minor | `eduflow-next/lib/api/ai.service.ts:405-411`, `lib/api/ai/offline.ts` (`OFFLINE_TRANSLATE_LABEL`) | accept คำแปล offline แล้วป้าย `[ต้องแปลต่อโดยผู้ใช้ …]` กับประโยคภาษาเดิมถูกเขียนลง narrative และไม่มีด่านไหนเตือนก่อนส่งตรวจ/lock/export → ป้ายอาจหลุดเข้า SAR ฉบับส่งจริง | เพิ่ม gap rule (หรือเงื่อนไขใน `submitSection`/readiness) เมื่อ narrative ยังมี `OFFLINE_TRANSLATE_LABEL` · หรือให้หน้า export แสดงคำเตือน | backend-dev |
| C-9 | nit | `eduflow-next/tests/ai-route.test.ts` | ยังไม่มีเทสต์ route ของ task `translate` (input guard: `from===to`, text >20000, glossary >200; output guard กรณีไม่มี `translation`) — guard ใหม่ทั้งสองตัวไม่มีเทสต์ครอบ | เพิ่ม 3–4 case ตามแบบเทสต์ route เดิม | qa-tester |
| C-10 | nit | `eduflow-next/lib/i18n/dom-translate.ts:41-57`, `:102` | ค่าไทยเดิมของ attribute ถูกจำครั้งแรกครั้งเดียว และ MutationObserver ไม่ได้ฟัง `attributes` → ถ้า React เปลี่ยน `title`/`aria-label` (เช่นปุ่ม ai-accept) ตอนเป็น EN จะไม่ถูกแปล และตอนสลับกลับ TH จะได้ค่าเก่าที่ไม่ตรงกับ state | ถ้า `cur` ไม่ใช่ทั้งค่าเดิมและค่าที่เราแปลไว้ ให้ถือเป็น original ใหม่ · เพิ่ม `attributes: true, attributeFilter: ATTRS` ใน observer (ระวังวนลูป เพราะเราเองก็ setAttribute) | frontend-dev |
| C-11 | nit | `eduflow-next/lib/api/metrics-import.ts:318` | ข้อความ error บอก "0–20" แต่ค่า `y <= 0` ถูกปฏิเสธ | เปลี่ยนเป็น "มากกว่า 0 และไม่เกิน 20" | backend-dev |
| C-12 | nit | `eduflow-next/.gitignore`, `eduflow-next/package.json` (script `e2e`) | qa-tester แก้ไฟล์ config กลาง (ตาม OWNERSHIP ต้องให้ architect ตัดสิน) — แก้น้อยและไม่กระทบ runtime จึงไม่นับว่าผิดกฎร้ายแรง แต่ควรมีบรรทัดอนุญาตจาก orchestrator ใน TASK file เหมือนตอนเพิ่ม `docx` | orchestrator บันทึกย้อนหลังว่าอนุญาตแล้ว | orchestrator |

### ประเมินหมายเหตุของ orchestrator (C3a obs)
1. **translate รอบที่ lock แล้ว** — เห็นด้วยว่าควรปฏิเสธตั้งแต่ตอนขอ → C-2 (minor) ไม่ใช่ช่องโหว่ข้อมูล เพราะ accept ผ่าน `saveSection` ที่เช็ก lock อยู่แล้ว แค่เปลือง AI call
2. **assessor export DOCX ได้** — ยอมรับ: `loadBundle` ใช้สิทธิ์ `read` เดียวกับ `.doc`/xlsx ที่มีอยู่เดิม และกรรมการต้องอ่าน SAR ได้ตาม M12 · ไม่นับเป็น finding
3. **glossary แทนศัพท์กลางคำไทย** — ยืนยันจากโค้ด `glossary.ts:131` → C-3 (minor)

### ตรวจตามโฟกัส (ผ่าน)
- **Cohort/PII (11.2):** อ่านแค่ 3 คอลัมน์ (`cohort/status/years_to_graduate`) โดยหาเลขคอลัมน์จากแถวหัว คอลัมน์อื่นไม่ถูกแตะเลย · ลง metrics เฉพาะ rate/ค่าเฉลี่ยต่อรุ่น (ไม่เก็บ `total`) · audit `metric.import_cohort` มีแค่จำนวน ไม่มีชื่อไฟล์ · `rowErrors` มีแค่ `{rowNo, reason}` ไม่ดึงค่าในเซลล์ออกมาแสดง · ไม่มี preview ของ cohort ค้างใน module (dryRun คืนผลแล้วจบ) · `File` อยู่ใน React state จนกดยืนยัน/ยกเลิกเท่านั้น ไม่ลง localStorage
- **Metric preview หมดอายุ:** เก็บใน Map ในหน่วยความจำ TTL 30 นาที จำกัด 20 รายการ, ตอน commit เช็ก TTL/เจ้าของ/สิทธิ์ซ้ำ และลบทิ้งหลังใช้ · ข้อมูลใน preview เป็นค่าระดับหลักสูตร ไม่ใช่รายคน (รายการที่หมดอายุแล้วยังค้างอยู่จนกว่าจะมี preview ถัดไป — ยอมรับได้)
- **xlsx parsing:** เช็กขนาด 5 MB ก่อน `arrayBuffer`, ไฟล์ผิดรูป → `invalid` ไม่ throw error ดิบ, จำกัดแถว 5,000 / 100,000, เซลล์ formula/rich text/hyperlink/error แปลงเป็น primitive, ตัวเลขใช้ regex เข้มงวด, ข้อความไม่เกิน 300 ตัว · ข้อสังเกต (ไม่นับ finding): zip bomb จะขยายในหน่วยความจำ browser ของคนอัปโหลดเองก่อนจะเช็กจำนวนแถว — กระทบแค่แท็บตัวเอง
- **DOCX injection:** ข้อความทุกส่วนผ่าน `TextRun` (escape `& < >`), ชื่อ bookmark ถูก sanitize `[^A-Za-z0-9]`, URL หลักฐานเป็นข้อความธรรมดา ไม่ใช่ hyperlink ออกนอก → ไม่มี XML/field injection (ที่เหลือคือ control char = C-1)
- **translate กับกฎ 7.3/post-check:** redact ก่อนส่ง, `postCheckText` ตัด `[E-…]` ที่ไม่มีในต้นฉบับและติดธงตัวเลขที่ไม่มีใน input, completeness (multiset) ติดธงรหัส/ตัวเลขที่หายไป, ผลเป็น `ai_run accepted=false` จนกว่าคนจะกด accept ผ่าน `saveSection` (เช็ก can/lock/citation) · ไม่ผ่าน judgement filter โดยตั้งใจ — ยอมรับได้ เพราะเป็นข้อความของผู้ใช้เอง ไม่ใช่ verdict/คะแนนทางการ (คะแนนอยู่ที่ API ratings) และถ้า AI แต่งเลขระดับเพิ่มก็จะโดนธงตัวเลข · ไม่เป็นช่องเลี่ยง 7.3
- **`/api/ai` task translate:** มี input guard (ไม่เกิน 20000, from≠to, glossary ไม่เกิน 200), output guard, `MAX_TOKENS` 4096 (ดู C-4), ผ่าน rate-limit/งบรายวัน/origin/redact ซ้ำฝั่ง server เหมือน task อื่น · grep `.next/static` ไม่พบ `ANTHROPIC_API_KEY`/`sk-ant`
- **XSS:** EN dict/PATTERNS เขียนผ่าน `node.data` และ `setAttribute` เท่านั้น ไม่มี innerHTML; regex ใน PATTERNS anchor `^…$` ไม่มี nested quantifier · `TranslateResult`/`MetricImport` render เป็น text node (`<pre>{…}</pre>`) · `dangerouslySetInnerHTML` ยังเหลือที่เดียวคือ `components/landing/AboutSection.tsx:25` (ข้อความ static)
- **E2E:** ไม่มี `waitForTimeout`/sleep ใช้ web-first assertion (`toBeVisible`, `waitForURL`) ทั้งหมด และเปิด context ใหม่ทุกเทสต์ · `fullyParallel` + workers 4 ปลอดภัย เพราะ storage แยกต่อ context
- **RULES:** ไม่พบการผิด RULES ใน playbook ของ backend-dev/frontend-dev/qa-tester (facade ไม่ export `loadBundle`/ตัว internal ของ glossary; รอบนี้ไม่ได้แก้ regex ไทย) · ไฟล์ที่แก้อยู่ในโซนผู้แก้ ยกเว้น C-12

### ข้อดีที่ควรเก็บเป็นบทเรียน
- cohort import แบบ "มีแถวผิดแถวเดียว = ไม่เขียนอะไรเลย" และใช้ `dryRun` เป็น preview ทำให้อัตราไม่เพี้ยนเงียบ ๆ และไม่ต้องเก็บไฟล์รายคนไว้รอยืนยัน — ควรใช้กับการ import ข้อมูลรายบุคคลทุกตัว (รวม M7 survey)
- completeness check แบบ multiset (รหัส/ตัวเลขของต้นฉบับต้องอยู่ในคำแปลครบจำนวน) เป็น post-check ที่เหมาะกับงานแปล ดีกว่าใช้ post-check ทั่วไปอย่างเดียว
- preview ผูก `actorId` + มี TTL + ใช้ได้ครั้งเดียว — เป็นรูปแบบ two-phase commit ฝั่ง client ที่ดี
- บทเรียนเชิงลบ (เสนอเข้า LESSONS ของ reviewer/backend-dev): export ที่สร้าง XML (DOCX/XLSX/SVG) ต้องตัด control char ที่ XML 1.0 ห้ามด้วย ไม่ใช่แค่ escape `& < >` — probe ด้วย `\u000b` ทุกครั้ง

### Log (reviewer)
- 2026-10-22 Phase C (C4): อ่าน diff `890e0b9..HEAD -- eduflow-next` ทั้งหมด (metrics-import, export-docx, export-bundle, ai.service/glossary/guards/offline/prompts/claude, MetricImport, TranslateResult, SarWorkspace, dict/dom-translate, e2e/*, playwright.config) + spec ข้อ 0, 5 (M6/M8/M11), 7.3, 11.2
- รันเอง: `npx tsc --noEmit` → 0 error · `npm test` → 17 ไฟล์ 368/368 ผ่าน · `npx next build` → ผ่าน · `npm run e2e` → ไม่ได้รัน (ไม่บังคับ และ build ของ e2e จะเขียนทับ `.next` — อิงผล C3b 14 pass/2 skip)
- probe: ส่ง `\u000b\u0001` เข้า `TextRun` ของ `docx` → หลุดลง `word/document.xml` ดิบ (ยืนยัน C-1)
- สุ่มตรวจ diagram (diagram-designer ค้าง +10): `docs/diagrams/state-cycle.mmd` — **ตรง** กับ `CYCLE_TRANSITIONS` (`workflow.ts:27-38`) ครบ 10 transition + `openRevision` + guard "ทุกข้ออนุมัติแล้ว" และ "กรรมการครบ+มี verdict" (ขาดแค่ guard "ต้องมีหมายเหตุ" บนเส้น reopen — nit) · `docs/diagrams/seq-ai-pipeline.mmd` — **ตรง** กับลำดับ redact → provider → GET/POST `/api/ai` → guards → fallback → postCheck → finalize → accept ผ่าน saveSection (ไม่แสดงด่าน `dailyExhausted`/413/400 — ยอมรับได้ในระดับ abstraction นี้; ยังไม่มี AI-4 translate และ completeness check ในรูป → อัปเดตใน D1) · Study `uml.md` สอดคล้อง (stateDiagram-v2 มี [*] จุดเริ่ม/จบ, guard อยู่ในวงเล็บเหลี่ยม; sequence ใช้ alt/opt และ activation ถูกต้อง)
- ผล: **CHANGES_REQUESTED** — ต้องแก้ C-1 (major) แล้วรีวิวรอบสั้นอีกครั้ง; C-2..C-8 (minor) แนะนำให้แก้ในรอบเดียวกัน (C-2, C-3, C-5 แก้ไม่กี่บรรทัด); C-9..C-12 เป็น nit

## Phase C — round 2 (diff `e64af2f -- eduflow-next`, 11 ไฟล์ +430/-23)

Verdict: **CHANGES_REQUESTED** (major 1 ข้อ — C2-1 = C-8 ไม่ตรงคำสั่ง orchestrator)

Study: PROTOCOL ข้อ 5 — ไม่มีมาตรฐานใหม่ในโซน reviewer; ใช้ findings Phase C เดิมเป็นเกณฑ์

### สถานะ finding เดิม
| # | ผล | หลักฐาน |
|---|---|---|
| C-1 | ปิด | `export-docx.ts:36-40` `xmlSafe` ตัด `\u0000-\u0008\u000B\u000C\u000E-\u001F` + U+FFFE/U+FFFF + surrogate เดี่ยว ใช้ใน `run()`, `richParas` (split `\r\n|\r|\n`), `title` · เทสต์ unzip ทุก part ของ zip แล้วไม่เจออักขระต้องห้าม + เทสต์ว่าเนื้อหาปกติ/emoji/แท็บไม่ถูกตัด |
| C-2 | ปิด | `ai.service.ts:238` `assertCycleWritable` ก่อนเรียก provider · เทสต์ว่ารอบ lock ไม่สร้าง ai_run |
| C-3 | ปิด | `glossary.ts:126-143` เติมช่องว่างเฉพาะ TH→EN, ศัพท์ติดกันไม่เติมซ้ำ (`lastEnd`), `[`/`(` ข้างหน้าไม่เติม · เทสต์ตาราง + EN→TH ไม่เปลี่ยน |
| C-4 | ปิด | เช็กความยาวหลัง redact ที่ 8,000 (`ai.service.ts:246`) + guard route 8000 + `MAX_TOKENS.translate` 8192 · เทสต์กรณี redact แล้วยาวขึ้นจนเกิน |
| C-5 | ปิด | `metrics-import.ts:189-198` numFmt `%` + หน่วย `%` → ×100 (ปัดทศนิยมกันค่าเพี้ยน) · หน่วยอื่น = error ไม่เงียบ · เทสต์ commit ได้ 85 ไม่ใช่ 0.85 |
| C-6 | ปิด | คอลัมน์ว่างคงค่าเดิม + audit `before.replaced` (สูงสุด 500 + `replacedTotal`) เป็นข้อมูลระดับหลักสูตรล้วน |
| C-8 | **ไม่ปิด** → C2-1 | ดูด้านล่าง |
| C-9 | ปิด | `phase-c-review-fixes.test.ts:257-308` route translate: 200, 400 ×5 แบบ (ไม่ยิง upstream), เส้นขอบ 8000/200, 502 bad_output |
| C-11 | ปิด | `metrics-import.ts:336` ข้อความ "มากกว่า 0 และไม่เกิน 20" + เทสต์ปฏิเสธ 0 |

### Findings รอบ 2
| # | severity | file:line | ปัญหา | ข้อเสนอแก้ |
|---|---|---|---|---|
| C2-1 | **major** | `eduflow-next/lib/api/ai/offline.ts:268-269` + `lib/api/ai.service.ts:415-422` (`acceptAiRun` AI-4) | orchestrator สั่งชัดว่า "ป้าย 'ต้องแปลต่อ' ไม่เขียนลง narrative" แต่ offline `translate` ยังต่อ `OFFLINE_TRANSLATE_LABEL` ไว้หัว `translation` และ `acceptAiRun` เขียน `out.translation` ลง narrative ตรง ๆ → ป้าย `[ต้องแปลต่อโดยผู้ใช้ — … needs human translation; glossary terms only]` อยู่ใน `narrativeEn` แล้วไปออกใน DOCX (`richParas` render narrative ทุกบรรทัด) และ R11 ตั้งใจ "ไม่บล็อก export" → ป้ายหลุดเข้า SAR ฉบับส่งจริงได้ · เทสต์ยังล็อกพฤติกรรมผิดไว้: `tests/phase-c1.test.ts:206` คาด `narrativeEn.startsWith(OFFLINE_TRANSLATE_LABEL)` และชื่อเทสต์ `phase-c-review-fixes.test.ts:210` "ป้ายไม่ถูกลบจาก narrative" | ให้ text ที่ accept ไม่มีป้าย: (ทางเลือกที่แนะนำ) offline `translate` คืน `translation = r.text` (ไม่มีป้าย) และใช้ `needsHumanTranslation: true` บอก UI แทน — `TranslateResult.tsx:36` แสดงคำเตือนจาก flag นี้อยู่แล้ว · หรือถ้าจะให้ป้ายยังโชว์ใน preview ก็ตัดป้ายออกใน `acceptAiRun` ก่อน `saveSection` · flag `needsTranslationReview` + R11 + `confirmTranslationReviewed` คงไว้ตามเดิม · เทสต์: หลัง accept offline (append และ replace) `narrativeEn` ไม่มี `OFFLINE_TRANSLATE_LABEL` และ `word/document.xml` ไม่มีข้อความป้าย · แก้ `phase-c1.test.ts:114/206` ตามสัญญาใหม่ · อัปเดตสัญญาใน TASK file บรรทัด 178 ("translation ขึ้นต้นด้วยป้าย") |
| C2-2 | minor | `.agents/board/TASK-0001.md` | ไม่มี Log ของ backend-dev สำหรับรอบแก้นี้ใน TASK file (commit มีแค่บรรทัดของ researcher) — orchestrator ต้องอ่านจากรายงานแทน ซึ่งผิด PROTOCOL เรื่องบันทึกงาน | เพิ่ม `### Log — backend-dev (C4 fix)` สรุปว่าแก้อะไร + เทสต์อะไร + ข้อที่ตัดสินใจเอง (R11, `confirmTranslationReviewed`, 8,000 ตัวอักษร) |
| C2-3 | nit | `eduflow-next/tests/phase-c-review-fixes.test.ts` (ใหม่), `tests/phase-c1.test.ts:260` | backend-dev เขียน/แก้ไฟล์ในโซน Tests (OWNERSHIP = qa-tester) และ C-9 มอบให้ qa-tester · เทสต์คุณภาพดีและตรงกับ fix จึงไม่นับเป็นการผิดร้ายแรง | orchestrator บันทึกใน TASK file ว่าอนุญาตแล้ว (หรือให้ qa-tester รับรองในเฟส Test) |

ข้อสังเกต (ไม่นับเป็น finding): `confirmTranslationReviewed` ยังไม่มี UI (อยู่ใน U2 แล้ว) · ระหว่างนี้ R11 ไม่มีทางล้างจากหน้าจอ แต่เป็น medium ไม่บล็อก จึงรับได้ · `saveSection` ตั้งธงได้อย่างเดียว ล้างผ่าน input ไม่ได้ (มีเทสต์) — ดี

### ข้อดีที่ควรเก็บเป็นบทเรียน
- regex `XML_FORBIDDEN` ครอบ surrogate เดี่ยวด้วย lookahead/lookbehind และเทสต์ฝั่ง "ต้องไม่ตัด" (emoji คู่ surrogate, แท็บ, ขึ้นบรรทัด) — ทำตาม RULE ตารางเทสต์สองฝั่งของ backend-dev
- เช็กเพดานความยาว**หลัง** redact พร้อมเทสต์กรณีที่ redact ทำให้ยาวขึ้น
- import ที่ทับค่าเดิม: เก็บ `before` แบบจำกัดจำนวน + `replacedTotal` ทำให้ audit ย้อนดูได้โดยไม่บวม
- บทเรียนเชิงลบ (เสนอ LESSONS backend-dev): ถ้าคำสั่งแก้ระบุพฤติกรรมชัด ("ไม่เขียนลง narrative") แล้วเลือกทำต่างออกไป ต้องถาม orchestrator ก่อน ไม่ใช่ทำแบบอื่นแล้วเขียนเทสต์ล็อกพฤติกรรมเดิม

### Log (reviewer) — Phase C round 2
- 2026-10-22: อ่าน `git show e64af2f -- eduflow-next` ทั้งหมด (export-docx, ai.service, glossary, guards, gap, metrics-import, sar.store, types, tests) + offline.ts, TranslateResult.tsx, TASK file บรรทัด 117/125/178
- ตามรอยป้าย C-8: `offline.ts:268` ใส่ป้ายใน `translation` → `postCheckText` ตัดแค่ `[E-…]` ที่ไม่มีในต้นฉบับ (ป้ายผ่าน) → `acceptAiRun` เขียน `out.translation` ลง narrative → `exportSarDocx` render narrative → ป้ายหลุดลง DOCX · ยืนยันด้วยเทสต์ที่มีอยู่ `phase-c1.test.ts:206`
- รันเอง: `npx tsc --noEmit` → 0 error · `npm test` → 18 ไฟล์ 406/406 ผ่าน
- ผล: **CHANGES_REQUESTED** — แก้ C2-1 (major) + C2-2 แล้วรีวิวสั้นอีกรอบ (เฉพาะ C2-1)
