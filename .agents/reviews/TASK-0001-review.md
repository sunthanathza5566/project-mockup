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
