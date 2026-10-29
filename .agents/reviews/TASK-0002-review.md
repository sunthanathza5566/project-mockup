# TASK-0002 — Code Review (เฟส 5)

- ผู้รีวิว: reviewer · วันที่ 2026-10-26
- ขอบเขต: `git diff master...HEAD` บน `feat/TASK-0002-saas-redesign` (44 commit, 290 ไฟล์, +19,220/−4,286) ใต้ `eduflow-next/` · HEAD = `3645878`
- อ้างอิง: TASK-0002 (AC ฉบับ R2, แผนรอบ 2, Log ทุก subtask), ADR-UI-002/003, ADR-AUTH-001 (A1–A10, ตาราง N1–N14), earth-tokens, friendly-spec, playbook RULES ของ backend-dev/frontend-dev
- Study: อ่าน playbook reviewer แล้ว ใช้ข้อ (1) ตาม spec "X เรียก Y" ไปถึงผู้เรียกจริงทั้ง repo (ใช้กับ requireActiveActor, notify, listUsers) (2) state "ไม่ active/ออกจากระบบแล้ว" ต้องครอบทั้งแอป (ตรวจ AppShell session-lost, กระดิ่ง, markRead) (3) ตามรอย fix ไปถึงผลจริง ไม่ดูแค่ตัวเทสต์

## Verdict: **APPROVE**

ไม่พบ blocker หรือ major ส่วน minor/nit ด้านล่างแก้ตามหลังได้ หรือรวมไปทำในรอบแก้ของเฟส 6–7 (ไม่ต้องวน review ใหม่ ยกเว้นข้อ 1 ถ้าแก้ด้วยการย้ายไฟล์)

## ตรวจแล้ว (คำสั่งที่รันจริง)
- `npx tsc --noEmit` → 0 error
- `npx vitest run` → **26 files / 766 passed** (= 767 ของ Q1 − 1 `it.fails` ที่ถอดออกหลังแก้ BUG-0002-Q1-1 ใน `3645878` ถูกต้อง)
- ไม่ได้รัน next build/e2e ตามคำสั่ง → ใช้ผล Q1 (126 passed / 2 skipped / 0 failed × 2 รอบ) · commit `3645878` แก้แค่ลบคำ `outline-none` 1 คำ + เทสต์ grep ไม่กระทบ e2e
- **AC-20 R2:** `git diff master...HEAD --stat -- lib/utils lib/mock-data app/api` = **ว่าง** ✔ · `lib/api` + `lib/types.ts` มีแค่ 2 commit คือ `1304612` (R2-B1) และ `3fee125` (R2-B2) ซึ่งเป็นของ backend-dev ทั้งคู่ → ไม่มี subtask frontend แตะ lib/api ✔ (แต่ดู minor #2 เรื่องไฟล์ของ R2-B2 ที่ไม่อยู่ในแถว R2-B1)
- **UI เป็น presentation only:** grep บรรทัดเปลี่ยนในไฟล์ UI ที่มีอยู่เดิม (import `@/lib/api`, `await`, `router.`, `useEffect`, `addEventListener`, `localStorage`, `location.hash`) → logic ใหม่มีแค่จุดที่แผนสั่ง: deep link `#action-*` (actions), `#comments` (SarWorkspace), `?tab=` + ตัวนับคำขอ (admin), `setLang` (LangContext), เอาปุ่มลบผู้ใช้ออก, ย้าย resetDemo ไปแท็บ super · การเรียก API อื่นแค่จัดย่อหน้าใหม่ (signature/argument เดิม)
- **`messageTh` ไม่เปลี่ยน:** ดึง template literal ที่มีอักษรไทยจากบรรทัด `-` และ `+` ของ diff `lib/api` แล้ว `comm -23` → **ไม่มีข้อความไทยที่หายหรือถูกแก้** ✔ · `NotifyInput` บังคับ `messageEn` + `target` แล้ว → tsc เป็นตัวยืนยันว่าทั้ง 13 จุดที่เรียก `notify(` ส่งครบ · เทียบตาราง ADR A6 N1–N14 กับโค้ดทีละแถว: ปลายทาง/ข้อความ EN ตรงทุกแถว (ต่างแค่เอกพจน์/พหูพจน์ตามที่ backend จดใน Log ไว้)
- **requireActiveActor (~72 จุด):** เขียนสคริปต์สแกนทุก `export function` ใน `lib/api/*.ts` ที่รับ `actor`/`user` และมีการเขียน (`save(`, `saveUsers`, `appendAudit`, `notify(`, transition) แต่ไม่มี guard → ที่เหลือมีแค่ (ก) ตัวที่ส่งต่อไปตัวที่มี guard: `restoreVersion`→`saveSection`, `approveSection/returnSection/setSectionStatus`→`transitionSection`, `assignCriterion`→`assignSections` (ข) `materializeActionEvidence` (ภายใน ไม่ออก facade เรียกจาก `createCycle` ที่มี guard) (ค) export/audit/preflight/`syncDeadlineNotifications` ที่เป็นการอ่าน หรือมี `notify` กรองผู้ไม่ active อยู่แล้ว · evidence/curriculum/metrics-import/assessor ใช้ `assert*` ร่วมกันที่มี guard ครบทุกตัวที่เขียน → **ไม่พบฟังก์ชันเขียนที่ตกหล่น**
- **ข้อมูลเดิมใน localStorage:** `status` ไม่มี = `'active'` (`userStatus`) · `aunqa_invitations` ไม่มี = `[]` · แจ้งเตือนเก่าไม่มี `target` → `notificationHref` ใช้ cycleId/requirementId แทน (มีเทสต์) · login ของบัญชีเก่าที่รหัสสั้นกว่า 8 ยังเข้าได้ (ตรวจความยาวเฉพาะตอนสร้าง/ตั้งรหัส) · `clearAllAunqa` ล้างตาม prefix จึงรวม key ใหม่ → **ไม่ต้อง migrate และไม่พบ regression**
- **ด่านเทสต์:** ไม่มี `.only`/`it.fails`/`test.fail`/`fixme` ค้าง (skip มีแค่ E2E-01b, E2E-12b เดิม) · `KNOWN_BUGS` ว่างทั้งสองไฟล์ · assertion ที่ถูกลบใน e2e มีแค่ AC-09 Sarabun (แทนตาม D8) และ nav-bell เดิม (ย้ายไป shell-r2) · ไฟล์ใหม่ที่ตรวจด้วย `expect(` ค่อนข้างแน่น (onboarding 205, notification-target 94, account-guards 55, e2e onboarding 107, shell-r2 184) และใช้ `toBeTruthy/Defined` น้อย · ครอบ HANDOFF R2-B2 ครบทั้ง 7 กลุ่ม (`tests/account-guards.test.ts`)

## Findings

| # | severity | file:line | ปัญหา | ข้อเสนอแก้ | ผู้รับผิดชอบ |
|---|---|---|---|---|---|
| 1 | minor (**ผิด RULE ข้อ 1 ของ backend-dev**) | `eduflow-next/lib/api/auth.api.ts:354` + `lib/api/index.ts:9` | `revokeInvitationsOf(userId)` เขียน `aunqa_invitations` โดยไม่รับ actor และไม่ตรวจสิทธิ์ แต่หลุดออก facade ผ่าน `export * from './auth.api'` → UI เรียกยกเลิกคำเชิญของใครก็ได้โดยไม่มี authz/audit · เป็นรูปแบบเดียวกับ B7 ใน TASK-0001 (ระดับเดียวกัน = minor) · ตัวที่หลุดเดิม `saveUsers`/`getUsers`/`notify` มีมาก่อนงานนี้ ไม่นับ | ย้าย `revokeInvitationsOf` ไปไว้ใน `lib/api/invitation.internal.ts` (มีผู้เรียกแค่ `deleteUser` กับ onboarding.store) หรือเลิก export แล้ว import ตรงในไฟล์ · ถ้าจะปิดของเดิมด้วย ให้ทำเป็น follow-up แยก | backend-dev |
| 2 | minor (process) | `.agents/board/TASK-0002.md:36, :72, :117` | (ก) AC-20 R2 ชุดแรกต้อง "⊆ ไฟล์ของ R2-B1 ในแผน" แต่ R2-B2 แตะ `ai.service`, `assessor.store`, `curriculum.store`, `evidence.store`, `metrics.store`, `metrics-import`, `preflight`, `todo` ซึ่งไม่มีแถวในแผน (แถว B1 บอกแค่ "ไฟล์อื่นที่ต้องกรอง active ตาม A5") → ถ้าวัดตามตัวอักษร AC นี้ตก แม้เนื้องานจะถูกต้องและอยู่ในโซน backend (ข) Progress Checklist ยังไม่ติ๊ก R2-B1, Q2a, Q2b ทั้งที่ Log เป็น DONE แล้ว | orchestrator เพิ่มแถว R2-B2 (ไฟล์ + เหตุผล C8) ในแผนรอบ 2 และแก้ AC-20 R2 เป็น "⊆ ไฟล์ของ R2-B1 ∪ R2-B2" · ติ๊ก checklist ให้ตรง Log | orchestrator |
| 3 | minor | `eduflow-next/app/app/actions/page.tsx:70` | รายชื่อผู้รับผิดชอบ (`people`) มาจาก `listUsers` ซึ่งรวมบัญชี invited/suspended → เลือกแล้วกดบันทึกได้ error "ผู้รับผิดชอบไม่ถูกต้อง" (backend กันไว้แล้ว ข้อมูลไม่เสีย) · Found Issue (ง) ของ R2-B1 แก้แล้วที่ assign (`assessors.filter(isActiveUser)`) แต่ยังไม่แก้ที่หน้านี้ | กรอง `isActiveUser(u) \|\| u.id === item?.ownerUserId` (ต้องคงผู้รับผิดชอบเดิมที่ถูกระงับไว้ใน dropdown ตอนแก้รายการ ไม่งั้น select จะว่าง) | frontend-dev |
| 4 | minor | `eduflow-next/lib/api/auth.api.ts:42-45` | `isActorActive` เป็น fail-open เมื่อไม่พบแถว (ใช้ `status` ใน object ที่ UI ส่งมาแทน) · กรณีจริงที่เจอได้: super_admin `resetDemo` แล้วแท็บอื่นยังถือ object ของผู้ใช้ที่สร้าง/เชิญหลัง seed (id `u_…` ไม่มีในข้อมูลใหม่) → guard ปล่อยผ่าน แล้ว `can()` เชื่อ role ใน object · ผลจำกัด (getCurrentUser ตัด session ในการ render ถัดไป และ RBAC ฝั่ง browser เป็นข้อจำกัด MVP อยู่แล้ว) | ส่ง security-auditor ตัดสิน: fail-closed (`row ? isActiveUser(row) : false`) แล้วให้เทสต์/seed ใช้ actor ที่อยู่ใน store หรือ flag ระบบที่ชัดเจน · ถ้าคงไว้ ให้จดเป็นข้อจำกัดในเล่ม | backend-dev (หลัง security-auditor ตัดสิน) |
| 5 | minor | `eduflow-next/components/aunqa/UserMenu.tsx:70` | `aria-haspopup="true"` เท่ากับ `"menu"` ตาม ARIA แต่ panel เป็น disclosure (ไม่มี role=menu ตามที่คอมเมนต์หัวไฟล์ตั้งใจไว้) → screen reader ประกาศว่า "เมนู" แล้วผู้ใช้กดลูกศรไม่ได้ผล | ลบ `aria-haspopup` (disclosure ใช้แค่ `aria-expanded` + `aria-controls`) · e2e AC-23 ตรวจแค่ `aria-expanded` จึงไม่กระทบเทสต์ | frontend-dev |
| 6 | minor | `lib/api/auth.api.ts`, `lib/api/onboarding.store.ts`, `lib/api/init.ts` (ข้อความ `AunqaError`) | ข้อความ error ใหม่บางข้อที่ผู้ดูแลเห็นใน toast ไม่มีใน dict EN: "ขอบเขตบทบาทไม่ถูกต้อง", "ต้องกำหนดบทบาทอย่างน้อย 1 บทบาท", "เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่รีเซ็ตข้อมูลเดโม่ได้", "ผู้ใช้นี้เคยใช้งานแล้ว ให้ระงับบัญชีแทนการลบ", "เปลี่ยนสถานะบัญชีของตัวเองไม่ได้" (ส่วนข้อความของหน้า public ครบแล้ว) · ส่วนใหญ่ UI ปัจจุบันไปไม่ถึง (UI กันไว้ก่อน) | เพิ่ม key ใน `lib/i18n/dict-aunqa.ts` (โซน frontend — ไม่ต้องแตะ lib/api) | frontend-dev |
| 7 | nit | `eduflow-next/components/aunqa/admin/UsersTab.tsx:80-81` | `cancelInvite` ปิดกล่อง `invite-result` แม้ `cancelInvitation` ล้ม (`act` จับ error ไว้เอง) → ลิงก์ที่ยังใช้ได้หายจากจอ | ให้ `act` คืน boolean แล้วปิดกล่องเฉพาะเมื่อสำเร็จ | frontend-dev |
| 8 | nit | `eduflow-next/components/aunqa/SarWorkspace.tsx:104-105` | มีบรรทัดว่างซ้อน 2 บรรทัดหลัง `resetCommentsDeepLink` | ลบ 1 บรรทัด | frontend-dev |
| 9 | nit (ส่งต่อ security-auditor) | `eduflow-next/lib/api/onboarding.store.ts:267, :286` | `listAccessRequests` / `countPendingAccessRequests` ไม่ตรวจว่าผู้ดูแลยัง active (ตั้งใจตาม R2-B2 "ไม่ใส่ guard ใน getter") → ผู้ดูแลที่ถูกระงับแต่ถือ object เก่ายังอ่านชื่อ/อีเมล/เหตุผลของผู้ขอได้จนกว่าจะ render ใหม่ · เป็นข้อมูลส่วนบุคคล | security-auditor ตัดสินว่าจะเพิ่ม `requireActiveActor` ใน getter ที่คืน PII หรือจดเป็นข้อจำกัด | security-auditor → backend-dev |

## RULES ของผู้เขียน
- **backend-dev RULE 1 (ห้าม export ฟังก์ชันที่ข้าม guard ออก facade): ผิด 1 จุด** — finding #1 (`revokeInvitationsOf`) · นอกนั้นทำตาม: helper กรรมการ active (`activeAssessorsOf`) ไม่ export, `materializeActionEvidence` ยังไม่ออก facade
- backend-dev RULE "validate ก่อน mutate / audit หลัง save / คืนสำเนา": **ทำตาม** — `setUserRoles` เรียก `validateRoleScopes` ก่อนแก้ object ใน cache, `setUserStatus`/`approveAccessRequest`/`acceptInvitation` สร้าง object ใหม่แล้ว save ก่อน `appendAudit`, คืน `{ ...updated }` · onboarding อ่าน store ใหม่และตรวจซ้ำหลัง `await` ทุกจุด
- backend-dev RULE ข้อความไทย/regex: ไม่พบตัวอักษรไทยใน template แจ้งเตือนหาย (ตรวจด้วย comm) · regex ใหม่ (`USERNAME_RE`, `EMAIL_RE`, `TOKEN_RE`) มี `\` ครบ
- frontend-dev: ยังไม่มี RULES · LESSON ที่ถูกใช้ซ้ำในงานนี้: popover fixed + บีบใน clientWidth (NotificationPanel), handler ภายนอกอ่าน ref (actions hash), dom-translate ใช้ template string เดียว (UsersTab/RequestsTab)
- qa-tester: ทำตาม KNOWN_BUGS + `it.fails` และถอดออกเมื่อแก้แล้ว (Q1 → `3645878`) ถูกต้อง

## ข้อดีที่ควรเก็บเป็นบทเรียน
- **บังคับ contract ด้วย type แทนการไล่ด้วยตา:** ทำให้ `NotifyInput.messageEn/target` เป็น required → ทุกจุดที่เรียก `notify` ต้องส่งครบ ไม่งั้น tsc ไม่ผ่าน (จุดเรียกใหม่ในอนาคตก็ลืมไม่ได้) — ใช้ซ้ำได้กับ field ใหม่ที่ "ทุกผู้เรียกต้องส่ง"
- **ตรวจ "ข้อความไม่เปลี่ยน" ด้วย diff ของตัวเอง:** ดึง template ไทยจากบรรทัด `-`/`+` แล้ว `comm -23` (backend) + เทสต์คาดหวังข้อความจาก commit ก่อนแก้ (qa) — ตรวจได้ 2 ชั้นโดยไม่ต้องเชื่อโค้ดปัจจุบัน
- **guard สถานะใส่ที่ helper `assert*` ที่ทุก writer ใช้ร่วมกัน** แล้วไล่เฉพาะ writer ที่ไม่ผ่าน helper → ~72 จุดแต่ไม่ตกหล่น (สแกนด้วยสคริปต์ยืนยันแล้ว)
- **token ใน fragment + ลบออกจากแถบที่อยู่ทันที + เก็บแค่ hash + ข้อความ error เดียวทุกกรณี** (InviteAcceptForm/onboarding.store) — รูปแบบลิงก์ครั้งเดียวที่ควรใช้ซ้ำ
- **computed-style diff ก่อน/หลัง cutover CSS** (S6) จับ regression ที่ตาไม่เห็นได้ (badge ตัดบรรทัด, textarea ไม่ยืด)
- **เทสต์ grep ทุกตัวมีเคส negative + `afterEach` ยืนยันว่าอยู่ในธีมที่ตั้งใจจริง** (Q1) — กันเทสต์เขียวปลอม

## สิ่งที่ส่งต่อ
- security-auditor: finding #4, #9 + เรื่อง enumeration/ไม่มี rate limit ของ `submitAccessRequest` (หน้า public — backend บอก username/อีเมลซ้ำ) ตาม ADR A7
- qa-tester (เฟส 6): ถ้าแก้ #3 เพิ่ม e2e "dropdown ผู้รับผิดชอบไม่มีบัญชีที่ถูกระงับ แต่ยังแสดงผู้รับผิดชอบเดิมของรายการ"
- ui-inspector (เฟส 7): ตรวจ #5 ด้วย screen reader/axe ระหว่างตรวจ AC-23
