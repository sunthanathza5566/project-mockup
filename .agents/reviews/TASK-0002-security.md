# TASK-0002 — Phase 5 Security Audit (security-auditor)

- **วันที่:** 2026-10-26 · **branch:** `feat/TASK-0002-saas-redesign` @ `3645878` · **ขอบเขต:** `git diff master...HEAD` ใต้ `eduflow-next/` — `lib/api/**`, `lib/types.ts`, `components/auth/**`, `app/request-access`, `app/invite`, `components/aunqa/admin/**`, `NotificationPanel.tsx`, `lib/ui/notification.ts`, `context/AuthContext.tsx` (อ่านประกอบ), `package.json`/lockfile
- **มาตรฐานที่ใช้:** `.agents/research/standards/security-auth.md` checklist C1–C15 (NIST SP 800-63B-4, OWASP ASVS 5.0.0, PDPA ม.21–24 [แปลไม่เป็นทางการ]) + ADR-AUTH-001 A3/A5/A7/A9 · ไม่มี `standards/security.md` (ใช้ OWASP Top 10 2021 สำหรับ XSS/dependency)
- **บริบท:** MVP ฝั่ง client ล้วน (localStorage) — ทุก control เป็น "การจำลองพฤติกรรม" ไม่ใช่ security boundary จริง; finding แยกเป็น **(ก) ต้องแก้/ควรแก้ใน MVP** และ **(ข) ข้อจำกัดสถาปัตยกรรม → เขียนในเล่มบท 5 / ทำเมื่อย้ายไป server**

## Verdict: **PASS WITH FIXES**

- Critical 0 · High 0 · **Medium 1 (ก)** · Low 6 (ก) · Info 3 · ข้อจำกัดสถาปัตยกรรม (ข) 16 ข้อ
- ไม่มี critical/high ที่เกิดจาก diff นี้ → ไม่ FAIL · **S-01 (Medium) ต้องแก้ก่อนปิด TASK** เพราะข้อความประกาศความเป็นส่วนตัวที่แสดงต่อผู้ใช้ ("ถูกปฏิเสธ = ลบทันที") ไม่ตรงพฤติกรรมจริง
- npm audit (prod) ไม่มีช่องโหว่ใหม่จาก dependency 8 ตัว — ช่องโหว่ที่เหลือเป็นของเดิม (Next 14.2.35 critical, ค้างจาก TASK-0001 A-7/B-4) → อยู่กลุ่ม (ข)/งานแยก

---

## ตาราง Finding

### (ก) แก้ใน MVP นี้

| ID | ระดับ | ตำแหน่ง | ปัญหา / ผลกระทบ | หลักฐาน | วิธีแก้ | ผู้รับผิดชอบ |
|---|---|---|---|---|---|---|
| **S-01** | **Medium** | `lib/api/onboarding.store.ts:251-256` (notify N12) · `:312-326` (`rejectAccessRequest`) | ปฏิเสธคำขอแล้ว **แถวผู้ใช้ถูกลบ แต่ชื่อ-สกุลผู้ขอยังค้างใน `aunqa_notifications`** ของผู้อนุมัติทุกคน (`มีคำขอเข้าใช้งานใหม่จาก ${fullName}` ทั้ง TH/EN) ไม่มีวันหมดอายุ · ขัดกับประกาศความเป็นส่วนตัวที่ผู้ขอเห็นก่อนกดส่ง ("ถ้าคำขอถูกปฏิเสธ ลบทันที", `RequestAccessForm.tsx:375,386`) → PDPA ม.22/ม.23(3) (เก็บเกินจำเป็น + แจ้งระยะเก็บไม่ตรงจริง), ASVS 14.2.7, checklist C13 | P03: หลัง reject เหลือ 2 แถว (`u-super`, `u-uniadm`) ที่มีชื่อผู้ขอ · P14: `storageText().includes('Rej One') === true` | ตอน notify N12 ใส่ `dedupeKey: \`access_request:${user.id}\`` แล้วใน `rejectAccessRequest` (และ `approveAccessRequest` เพื่อความสะอาด) ลบแถว notification ที่ `dedupeKey` นั้นทุกผู้รับ — หรือทางเลือก: ข้อความ N12 ไม่ใส่ชื่อ ("มีคำขอเข้าใช้งานใหม่ 1 รายการ") · เพิ่มเทสต์: reject แล้ว `JSON.stringify(localStorage)` ไม่มี fullName/email ของผู้ขอ | backend-dev (+ qa-tester เทสต์) |
| S-02 | Low | `components/auth/RequestAccessForm.tsx:376` | ประกาศบอก "ผู้ที่เห็นข้อมูล: ผู้ดูแลระบบของมหาวิทยาลัยที่คุณสังกัด**เท่านั้น**" แต่ super_admin ก็เห็นคำขอทุกมหาวิทยาลัย (`pendingVisibleTo` `onboarding.store.ts:261`) และได้แจ้งเตือน N12 → ม.23(4) แจ้งผู้รับข้อมูลไม่ครบ | P04: `listAccessRequests(sadmin)` เห็นคำขอของ uni-demo-2 + มี N12 ถึง `u-super` | แก้ข้อความเป็น "ผู้ดูแลระบบของมหาวิทยาลัยที่คุณสังกัด และผู้ดูแลระบบส่วนกลางของระบบ" (+ คำแปล EN ใน dict) | frontend-dev |
| S-03 | Low | `context/AuthContext.tsx:78-84, 177-217` · `lib/api/export*.ts` | **C8 ฝั่งอ่าน:** `getCurrentUser()` (ตัวตัด session เมื่อถูกระงับ) ถูกเรียกเฉพาะตอน init/login/refresh — tick 30 วินาทีเช็กแค่เวลา session · แท็บที่เปิดค้างของผู้ถูกระงับยังอ่านข้อมูลได้ (รวม PII คำขอ, export SAR/xlsx ซึ่งยังเขียน audit โดยไม่ผ่าน `requireActiveActor`) จนกว่าจะ reload · **ตัดสิน: ยอมรับได้ใน MVP** เพราะในสถาปัตยกรรมเบราว์เซอร์เดียว session key มีตัวเดียว — admin จะระงับได้ต้อง login ทับ ซึ่งทำให้แท็บเดิมโดน `handleLost('other-tab')` อยู่แล้ว (เข้าถึงได้จริงเฉพาะแก้ store เอง) และฝั่งเขียนถูกกันครบ | P08: uadmin ถูกระงับ ถือ object เดิม → เขียนทุกตัว `forbidden` แต่ `listAccessRequests` คืน 1 แถว (มีอีเมล), `listUsers` 10 แถว · ตรวจสคริปต์: writer ที่รับ actor และไม่มี guard เหลือเฉพาะ `export*` 7 ตัว (audit อย่างเดียว) + `materializeActionEvidence` (internal, ถูกเรียกหลัง guard ของ `createCycle`) | (แนะนำ ไม่บังคับ) ใน tick ของ AuthContext เรียก `getCurrentUser()` แล้ว `null` → `handleLost(...)` (1–2 บรรทัด) · ใส่ `requireActiveActor(user)` ใน `export*.ts` 7 ฟังก์ชัน · ระบบจริง → ข-01 | frontend-dev / backend-dev |
| S-04 | Low | `lib/api/onboarding.store.ts:105-114` (`findValidInvitation`) · `auth.api.ts:370-391` | คำเชิญที่ admin ออกไว้ **ยังใช้ได้หลัง admin คนนั้นถูกระงับ** — admin ที่ถูกระงับเพราะพฤติกรรมไม่ชอบมาพากลอาจเชิญพวกเป็น uni_admin ไว้ล่วงหน้า แล้วผู้รับเชิญเปิดใช้ได้ภายใน 7 วัน (SoD/insider) | P11: เชิญ `acc1` เป็น uni_admin → ระงับ uadmin → `acceptInvitation` success, roles uni_admin | ทางใดทางหนึ่ง: (a) `setUserStatus→suspended` revoke คำเชิญที่ `createdBy === target.id` และยังใช้ได้ (b) `findValidInvitation` ตรวจว่าผู้เชิญยัง active · บันทึก audit | backend-dev |
| S-05 | Low | `lib/api/index.ts:9` (`export * from './auth.api'`) → `auth.api.ts:354` | `revokeInvitationsOf(userId)` (ใหม่ใน diff) **ไม่ตรวจสิทธิ์และหลุดออก facade** `@/lib/api` — ขัดกฎ B7 ของโปรเจกต์ ("ห้าม export ฟังก์ชันที่ข้าม guard ออก facade") · UI ใดก็ revoke คำเชิญของใครก็ได้ (ใน client-only เป็นแค่ความสะอาดของ API แต่จะกลายเป็นรูจริงถ้า signature นี้ย้ายไป server ตรง ๆ) | P19: `api.revokeInvitationsOf(id)` ไม่มี actor → revoke 1, `peekInvitation` = null | ย้ายไปไฟล์ internal (เช่น `invitation.internal.ts`) หรือเปลี่ยน facade เป็น export รายชื่อสำหรับ auth.api (เหมือน action.store) · พิจารณาซ่อน `getUsers`/`saveUsers`/`hashPassword` ด้วย (ของเดิม) | backend-dev |
| S-06 | Low | `onboarding.store.ts:308` · `auth.api.ts:390` · `auth.api.ts:313` (เดิม) | `approveAccessRequest`, `setUserStatus`, `createUser` คืน `AppUser` **ที่มี password hash** ให้ UI (ASVS 15.3.1 คืนเฉพาะฟิลด์ที่จำเป็น) — `inviteUser` ทำถูกแล้ว (`withoutPassword`) | P06: ผลของ `approveAccessRequest` มี `password` ขึ้นต้น `sha256:` | คืนผ่าน `withoutPassword()` (ย้าย helper ไป auth.api) · ปรับ type คืนเป็น `Omit<AppUser,'password'>` | backend-dev |
| S-07 | Low | `components/aunqa/admin/RequestsTab.tsx:66-153` | ไม่มีการยืนยันอีเมล (ข-06) → ใครก็ส่งคำขอด้วยอีเมลสถาบันของเพื่อนร่วมงานได้ แล้วผู้อนุมัติเห็นแค่ชื่อ/อีเมล | อ่านโค้ด + P01/P15 (โดเมนถูก = ผ่าน) | เพิ่มข้อความเตือนในการ์ดคำขอ: "อีเมลนี้ยังไม่ได้ยืนยัน — ตรวจสอบตัวตนผู้ขอก่อนอนุมัติ" (UI 1 บรรทัด) | frontend-dev |

### Info (ไม่ต้องแก้ — บันทึกไว้)

| ID | ตำแหน่ง | สาระ | หลักฐาน |
|---|---|---|---|
| I-01 | `onboarding.store.ts:181-202` | username ของบัญชี invited ถูกล็อกได้จากการ login ผิด 5 ครั้ง (นับผิดตาม A5) → `acceptInvitation` ใช้ token ไป ตั้งรหัส + active แล้ว แต่ `loginUser` คืน `locked` → UI แสดง "ตั้งรหัสผ่านแล้ว แต่ยังเข้าสู่ระบบไม่ได้…" (`InviteAcceptForm.tsx:122`) ผู้ใช้รอ 5 นาทีแล้ว login ได้ — ปลอดภัย แค่ DoS ชั่วคราว | P12: `{success:false,error:'locked'}`, status `active`, invitation `usedAt` ตั้งแล้ว |
| I-02 | `auth.api.ts:316-334` | `setUserRoles` ใช้กับเป้าหมาย pending/invited ได้ — ไม่เป็นทางลัดอนุมัติ (pending ยัง login ไม่ได้) และผู้รับเชิญยังแก้ role เองไม่ได้ | P21: roles เปลี่ยน, status ยัง `pending`, login ไม่สำเร็จ |
| I-03 | `auth.api.ts:370-381` | uni_admin ระงับ uni_admin คนอื่นในมหาวิทยาลัยเดียวกันได้ (ตาม ADR A4 — ทุก admin เท่ากัน) → ถ้าระงับกันจนหมด ต้องให้ super_admin กู้ · มี audit ทุกครั้ง | P07 |

### (ข) ข้อจำกัดสถาปัตยกรรม client-only → เล่มบท 5 + งานเมื่อย้ายไป server (thesis-writer / architect)

| ID | ข้อจำกัด | อ้างอิง | หลักฐาน / หมายเหตุ |
|---|---|---|---|
| ข-01 | ไม่มี trusted service layer: RBAC/validation ทั้งหมดรันในเบราว์เซอร์ — แก้ localStorage หรือส่ง actor ปลอมได้; `requireActiveActor` ปล่อยผ่าน actor ที่ไม่มีแถวใน store (ตั้งใจเพื่อเทสต์/resetDemo) และ `can()` เชื่อ `roles` ใน object | ASVS 8.3.1/2.2.2 | P10: actor ปลอม `u-ghost` + super_admin → `setUserStatus(..., 'u-uniadm','suspended')` สำเร็จ · server ต้องโหลด actor จาก session ฝั่ง server ทุก request และ deny เมื่อไม่พบแถว |
| ข-02 | ทั้ง DB (รวม password hash, PII คำขอ) อยู่ใน localStorage | ASVS 14.3.3 | |
| ข-03 | `hashPassword` = SHA-256 + prefix คงที่ ไม่มี salt ต่อผู้ใช้/work factor | ASVS 11.4.2 | `auth.api.ts:90-92` — server: argon2id/bcrypt หรือ Supabase Auth |
| ข-04 | รหัสผ่าน 8 ตัวโดยไม่มี MFA (NIST กำหนด 15 เมื่อเป็นปัจจัยเดียว) + ไม่มี blocklist | NIST 800-63B-4 §3.1.1.2 (N1, N6), ASVS 6.2.4 | P17: 8 ช่องว่างยอมรับ (ถูกตามนโยบาย ไม่ trim) — blocklist จะกันกรณีนี้ |
| ข-05 | อายุลิงก์เชิญ 7 วัน = **deviation** จากแนวเทียบเคียง NIST (อีเมล 24 ชม.) — ห้ามเขียนว่า "ตาม NIST" | C4, std §1.5 | P13: หมดอายุที่ `expiresAt` พอดี, `expiresAt-1` ใช้ได้ |
| ข-06 | ไม่มีการยืนยันอีเมล — ผู้ขอแอบอ้างอีเมลสถาบันของผู้อื่นได้ (ดู S-07 สำหรับมาตรการ UI ชั่วคราว) | ASVS 6.x, NIST 63A-4 §3.8 | ADR A9 ยอมรับแล้ว |
| ข-07 | User enumeration ที่หน้าขอเข้าใช้งาน: บอก "Username นี้ถูกใช้แล้ว" / "อีเมลนี้มีบัญชีหรือคำขออยู่แล้ว" / โดเมนไม่ใช่ลูกค้า | ASVS 6.3.8 (L3), C10 | P15 · login ไม่รั่ว: pending+รหัสผิด = `invalid` เหมือนไม่มีบัญชี |
| ข-08 | ไม่มี rate limit / anti-automation ที่ฟอร์มสาธารณะ (ท่วมคำขอ + แจ้งเตือน) | ASVS 2.4.1 | |
| ข-09 | admin ยุติ session ของผู้ใช้รายคนไม่ได้ / ตัด session ฝั่งอ่านอาศัย reload (S-03) | ASVS 7.4.2/7.4.5 | server: ตรวจ status ทุก request + revoke refresh token |
| ข-10 | ลิงก์ `/invite#t=` ยังอยู่ในประวัติเบราว์เซอร์/clipboard history ของผู้ดูแล (หน้า /invite ลบ hash ด้วย `replaceState` แล้ว — `InviteAcceptForm.tsx:41`) | ASVS 14.2.1 | บรรเทาด้วยใช้ครั้งเดียว + อายุ 7 วัน |
| ข-11 | ไม่มี audit ของ login ล้มเหลว | ASVS 16.3.1 | มีแค่ `auth.login` สำเร็จ |
| ข-12 | คำขอที่ค้าง pending ไม่มีระยะลบอัตโนมัติ และผู้ขอถอนคำขอเองไม่ได้ (ใช้สิทธิ์ลบผ่าน admin เท่านั้น) | PDPA ม.23(3), P5; ASVS 14.2.7 | |
| ข-13 | ประกาศความเป็นส่วนตัวไม่มีช่องทางติดต่อผู้ควบคุมข้อมูล/DPO จริง (ระบุแค่ "ผู้ดูแลระบบของมหาวิทยาลัย") | PDPA ม.23(5) | ยอมรับในเดโม่ — ระบบจริงต้องใส่อีเมล/DPO |
| ข-14 | ฐานกฎหมาย ม.24(3) เป็นข้ออนุมานของ researcher ต้องให้อาจารย์/ที่ปรึกษายืนยัน · ถ้อยคำไทย ม.21–23 ยังไม่ได้ตรวจจากราชกิจจาฯ | std §3.1, P4 | ติดป้าย `[ต้องตรวจตัวบทไทย]` |
| ข-15 | Next 14.2.35 มี advisory critical/high (RCE ใน image optimizer, SSRF ฯลฯ) — **ของเดิม** ไม่ใช่จาก diff นี้; ปิดได้ด้วย Next 16 (breaking) | OWASP A06 | ค้างจาก TASK-0001 A-7/B-4 → ต้องแก้ก่อน deploy ให้คนนอกเข้าถึง |
| ข-16 | `tailwindcss@3.4.19` (dev, ใหม่) ดึง `postcss-selector-parser@6.1.5` (moderate: quadratic CPU ตอน parse selector) — build-time เท่านั้น อินพุตเป็น CSS ของเราเอง | OWASP A06 | ไม่มีผล runtime |

---

## ผลตาม checklist C1–C15 (standards/security-auth.md §4)

| # | ผล | หลักฐาน |
|---|---|---|
| C1 รหัสผ่านใช้ `validatePassword` ทุกทาง 8–128, ไม่ trim/lower, ไม่ผสมอักขระ | **ผ่าน** | `auth.api.ts:51-54` เรียกใน createUser (:290), acceptInvitation (onboarding :182), submitAccessRequest (:225) · `grep "length < 6"` ใน lib/api = 0 · P17 (7→invalid, 8 ช่องว่าง→ok, " 1234567" ไม่ถูก trim, 128 ok/129 invalid) · UI `maxLength=128` + help "อย่างน้อย 8 ตัวอักษร" ไม่มีกฎผสม |
| C2 token CSPRNG ≥128 bit, เก็บแต่ hash, ไม่ใช้ Math.random/UUID | **ผ่าน** | `onboarding.store.ts:64` `crypto.getRandomValues(new Uint8Array(32))` → base64url 43 ตัว (256 bit) · เก็บ `sha256('aunqa-invite::'+token)` · P13 |
| C3 ใช้ครั้งเดียว/หมดอายุ/revoke/ตรวจซ้ำใน accept/ข้อความเดียว | **ผ่าน** | `findValidInvitation` เรียกซ้ำหลัง await (:187) · P13: token เก่าหลัง reissue, หมดอายุ, ใช้แล้ว, มั่ว, ว่าง, 44 ตัว → ข้อความเดียว `INVITE_INVALID_MESSAGE`; token ดิบไม่อยู่ใน storage |
| C4 7 วัน + deviation | **ผ่านแบบมีเงื่อนไข** → ข-05 (ต้องเขียนในเล่ม) | |
| C5 fragment + ล้าง hash | **ผ่าน** | `InviteAcceptForm.tsx:36-43` `replaceState` ทันทีหลังอ่าน; token อยู่ใน state เท่านั้น ไม่มี console/storage (grep) · `InviteResult.tsx` token อยู่ใน React state ของหน้า admin เท่านั้น · ประวัติ/clipboard → ข-10 |
| C6 mass assignment | **ผ่าน** | `submitAccessRequest` สร้าง object ทีละฟิลด์ (:242-245) `roles: []`/`status:'pending'` ตายตัว · P01: ส่ง roles super_admin/status active/universityId/id/accessRequest ปลอม → ทิ้งหมด, key ของแถว = allowlist · P02 consent ต้องเป็น `true` แบบ boolean · UI ไม่มีช่อง/ hidden field บทบาท (`RequestAccessForm.tsx` + e2e AC-27) |
| C7 สิทธิ์ admin action + uni เป้าหมาย + ห้าม super/ตัวเอง | **ผ่าน** (+S-04) | `managedTarget` (:84-93), `setUserStatus` (:370-381) · P05 ข้าม uni ทุก action = forbidden · P06 ให้ super_admin = forbidden, scope uni อื่น/role มั่ว/roles ว่าง = invalid, field แปลกใน role ถูกตัด · P07 ตัวเอง invalid, แตะ super forbidden |
| C8 ระงับ/ลบ → session ตาย + guard writer | **ผ่าน (ฝั่งเขียน + session)** · ฝั่งอ่าน = ยอมรับใน MVP (S-03) | P09: suspend → `getCurrentUser()`/`getSession()` null; แถวถูกลบ → null · P08: writer ทุกตัวที่ลอง = forbidden; สคริปต์ไล่ export ทุกตัวใน lib/api ที่รับ `AppUser` และเขียน store/audit → ไม่มี guard เหลือเฉพาะ `export*` 7 ตัว + `materializeActionEvidence` (internal) |
| C9 login pending/suspended เผยเฉพาะรหัสถูก; invited นับผิด | **ผ่าน** | `auth.api.ts:252-264` · P15 pending+รหัสผิด = `invalid`, ถูก = `pending` · P12 invited นับครั้งผิด |
| C10 enumeration หน้าขอ = ข้อจำกัดที่บันทึก | **ผ่าน** (ADR A7) → ข-07 | |
| C11 audit ครบ + ไม่มีความลับ | **ผ่าน** | P14: flow เชิญ→ออกใหม่→รับ→ขอ→อนุมัติ→ระงับ→เปิดใช้→ขอ→ปฏิเสธ — audit ไม่มี token ×2, tokenHash, รหัสดิบ ×2, hash ×2, อีเมล/ชื่อผู้ถูกปฏิเสธ · `user.reject` = `{before:{emailDomain}, after:{}}` · CSV export มีกัน formula injection (`audit.store.ts:66-70`) |
| C12 ฟิลด์ P1 + ประกาศ ม.23 ก่อนส่ง | **ผ่านบางส่วน** | P1 ผ่าน (ไม่มีเลขบัตร/โทร/วันเกิด) · checkbox = "รับทราบ" (P4 ผ่าน) · ประกาศ 6 ข้อแสดงไม่พับ — แต่ (4) ผู้รับข้อมูลไม่ครบ = **S-02**, (3) ระยะเก็บไม่ตรงจริง = **S-01**, (5) ไม่มีช่องทางติดต่อจริง = ข-13 |
| C13 reject ลบแถวทันที ไม่เหลือ PII นอก audit โดเมน | **ไม่ผ่าน** → **S-01** | แถว user ลบจริง แต่ชื่อค้างใน notifications (P03/P14) |
| C14 resetDemo เฉพาะ super | **ผ่าน** | `init.ts:120-128` · P18 uadmin/chair forbidden + ข้อมูลไม่ถูกล้าง, sadmin ok · UI แท็บเดโม่เฉพาะ super (`admin/page.tsx:56`) |
| C15 ข้อจำกัดที่ไม่ผ่านโดยสภาพอยู่ในเล่มบท 5 | **รอเฟส 10** | รายการครบอยู่ในตาราง (ข) ด้านบน — thesis-writer ใช้ตารางนี้ |

## XSS / Injection / Open redirect
- ข้อมูลจากผู้ขอ (ชื่อ, อีเมล, ตำแหน่ง, เหตุผล) แสดงในหน้า admin (`RequestsTab.tsx:104-124`), toast/confirm (`:82,90`), แจ้งเตือน N12 — ทั้งหมดผ่าน React text node (escape อัตโนมัติ) · `grep dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|eval|new Function` ใน app/components/lib/context = 0 (มีแค่คอมเมนต์ใน AboutSection) · `dom-translate.ts` แทนข้อความด้วย `node.data`/`setAttribute` (ไม่ตีความ HTML; `replace` ใช้ฟังก์ชันกัน `$&`) → **ไม่พบ XSS** (P20: payload `<img onerror>`/`<script>`/`"><svg onload>` เก็บเป็นข้อความดิบ, target N12 = `{type:'admin',tab:'requests'}`)
- `notificationHref` (`lib/ui/notification.ts:26-43`) สร้าง path ภายใน `/app…` จาก `target` เชิงความหมาย + `encodeURIComponent` ทุก id; `tab` จำกัด 2 ค่า → **ไม่มี open redirect** · `NotificationPanel.tsx:183-191` `pushState` ใช้ href ภายในเท่านั้น · `/app/admin?tab=` และ `/login?reason=` แปลงผ่าน allowlist/lookup
- `findUniversityByEmail` (`org.store.ts:34-44`): P16 — `evilsample-uni.example`, `sample-uni.example.evil.com`, `sample-uni.example.`, `x-sample-uni.example` = null; subdomain ตัวใหญ่ = ผ่าน (ตั้งใจ); `a@b@…` หาเจอแต่ `EMAIL_RE` ปฏิเสธก่อนใน store

## Secrets
- สแกน `git diff master...HEAD` (ไม่รวม lockfile) หา `sk-…`, `AKIA…`, `ghp_…`, JWT, private key, `api_key=`/`secret=` = 0 · ไม่มีไฟล์ `.env*`/`.pem`/`.key` ใน diff · ไม่มี `console.*` ใหม่ใน lib/components/app/context · seed/เทสต์ใช้ชื่อสมมติและโดเมน `.example`

## Dependency ใหม่ 8 ตัว (ADR-UI-002 D1)
| package | D1 | ติดตั้ง (npm ls) | กลุ่ม | สถานะ |
|---|---|---|---|---|
| tailwindcss | 3.4.19 exact | 3.4.19 | dev | ตรง · moderate ผ่าน postcss-selector-parser (ข-16) |
| postcss | สาย 8 → บันทึก | 8.5.31 | dev | ตรง (≥8.5.23 พ้น advisory postcss) · ตัวใน `next/node_modules/postcss@8.4.31` เป็นของ Next เดิม |
| autoprefixer | สาย 10.4 → บันทึก | 10.4.27 | dev | ตรง |
| clsx | 2.1.1 | 2.1.1 | dep | ตรง |
| tailwind-merge | 2.6.1 (ห้าม 3.x) | 2.6.1 | dep | ตรง |
| class-variance-authority | 0.7.1 | 0.7.1 | dep | ตรง |
| next-themes | 0.4.6 | 0.4.6 | dep | ตรง · peer React 18 |
| @radix-ui/react-slot | บันทึกค่า + peer React 18 | 1.5.0 | dep | peer `react ^16.8‖^17‖^18‖^19` ผ่าน · react/react-dom 18.3.1 ชุดเดียว |
- ทุกตัว pin exact ใน `package.json` · repo ต้นทางถูกต้อง (radix-ui/primitives, joe-bell/cva, lukeed/clsx, pacocoursey/next-themes, dcastil/tailwind-merge, tailwindlabs/tailwindcss, postcss/*) · `npm audit signatures` → **535 packages verified registry signatures, 66 attestations** · lockfile ที่เพิ่ม resolve จาก `registry.npmjs.org` ทั้งหมด (98 รายการ, ไม่มีโดเมนอื่น) · ไม่มี package ในรายการห้ามของ D1
- `npm audit --omit=dev` → 5 (1 critical `next`, 2 high `next/node_modules/postcss` + `brace-expansion` ผ่าน exceljs/readdir-glob, 2 moderate `uuid`/`exceljs`) — **ทั้งหมดของเดิม ไม่เกี่ยวกับ 8 ตัวใหม่** → ข-15 · `npm audit` ทั้งหมด 18 (dev tooling: vitest/tinypool critical, eslint chain high — dev only, ของเดิม ยกเว้น tailwindcss moderate ข-16)

---

## ชุด probe ที่รัน (บันทึกครบตามบทเรียน TASK-0001)

**วิธีรัน:** ไฟล์ `sec.probe.ts` + `probe.config.mts` ใน scratchpad ของ session (ไม่ commit) — `cd eduflow-next && npx vitest run --config <scratch>/probe.config.mts` · config: `root`=eduflow-next, alias `@`→eduflow-next, `globals: true`, `environment: 'node'`, `setupFiles: tests/setup.ts`, include `**/*.probe.ts` ในโฟลเดอร์ scratch · ทุกเคส `beforeEach: freshSeededDemo(); logoutUser()` · **ผล: 21/21 ผ่าน** (assert ยืนยันพฤติกรรมที่บรรยาย — เคสที่เป็น finding เขียน assert ให้ "ยืนยันว่ามีปัญหา" และพิมพ์ค่าออก)

| Probe | ตรวจอะไร | ผลที่ได้ | ใช้กับ |
|---|---|---|---|
| P01 | `submitAccessRequest` + roles super_admin, status active, universityId uni-demo-2, id u-super, isAdmin, accessRequest ปลอม | roles `[]`, pending, uni-demo (จากโดเมน), id ใหม่, key = allowlist 9 ตัว, accessRequest มีแค่ reason/requestedAt | C6 |
| P02 | `consent: 'true'` (string) | `invalid` | C6/C12 |
| P03 | ขอ → reject → หาแจ้งเตือนที่มีชื่อผู้ขอ | **เหลือ 2 แถว (u-super, u-uniadm)** | **S-01** |
| P04 | คำขอโดเมน uni-demo-2 | sadmin เห็น + ได้ N12; uadmin (uni-demo) ไม่เห็น | S-02, C7 |
| P05 | uadmin กระทำต่อเป้าหมาย uni-demo-2: approve/reject/setUserStatus/setUserRoles/deleteUser/reissue/cancel | ทั้งหมด `forbidden` | C7 / ASVS 8.4.1 |
| P06 | uadmin ให้ super_admin (approve/invite), scope uni อื่น, role `root`, roles ว่าง, field แปลกใน role | forbidden / invalid / invalid / invalid / ถูกตัด · **ค่าคืนมี password hash** | C7, **S-06** |
| P07 | uadmin ระงับ uni_admin อีกคน; คนถูกระงับใช้ object เก่าระงับกลับ; ระงับตัวเอง; ระงับ super | ok / forbidden / invalid / forbidden | I-03, C7, C8 |
| P08 | uadmin ถูกระงับ ถือ object เดิม: inviteUser, approve, resetDemo, listAccessRequests, countPending, listUsers | เขียน = forbidden ทั้งหมด · **อ่านได้ (1 คำขอพร้อมอีเมล, นับ 1, users 10)** | C8, **S-03** |
| P09 | login lect1 → ระงับ → getCurrentUser/getSession; login lect2 → ลบแถว | null ทั้งหมด | C8 |
| P10 | actor ปลอม (ไม่อยู่ใน store, role super_admin) | `isActorActive` true, ระงับ uadmin ได้ | ข-01 |
| P11 | เชิญเป็น uni_admin → ระงับผู้เชิญ → รับเชิญ | **success, ได้ uni_admin** | **S-04** |
| P12 | login ผิด 5 ครั้งด้วย username invited → accept | `locked`, บัญชี active, token used | I-01, C9 |
| P13 | ความสุ่ม (2000 ค่าไม่ซ้ำ), รูปแบบ 43 ตัว, reissue ทำให้ token เก่าใช้ไม่ได้, ขอบหมดอายุ, ข้อความเดียว 5 กรณี, token ไม่อยู่ใน storage | ผ่านทุกข้อ | C2, C3, C5 |
| P14 | flow ครบ 9 ขั้น แล้วค้น audit หา token×2, tokenHash, รหัสดิบ×2, hash×2, อีเมล/ชื่อผู้ถูกปฏิเสธ | ไม่พบใน audit · **แต่ชื่อผู้ถูกปฏิเสธยังอยู่ใน storage** | C11, **S-01** |
| P15 | enumeration: username ซ้ำ / อีเมลซ้ำ / โดเมนอื่น; login pending ผิด/ถูก/ไม่มีบัญชี | ข้อความแยกกัน 3 แบบ (ข-07) · login `invalid`/`pending`/`invalid` | C9, C10 |
| P16 | `findUniversityByEmail` 9 รูปแบบ | ดูหัวข้อ XSS/Injection | domain allowlist |
| P17 | รหัสผ่าน 7 / 8 ช่องว่าง / ไม่ trim / 129 / 128 บน 3 ทาง | invalid / ok / ไม่ trim / invalid / ok | C1 |
| P18 | resetDemo uadmin, chair1, sadmin | forbidden, forbidden (ข้อมูลอยู่ครบ), ok | C14 |
| P19 | `api.revokeInvitationsOf(id)` จาก facade ไม่มี actor | revoke 1 → peek null | **S-05** |
| P20 | payload XSS ในชื่อ/เหตุผล/ตำแหน่ง | เก็บเป็นข้อความดิบ; N12 target ภายใน | XSS (render = React text) |
| P21 | `setUserRoles` กับคำขอ pending | ok แต่ยัง pending, login ไม่ได้ | I-02 |

ตรวจด้วยการอ่านโค้ด/grep เพิ่มเติม: สคริปต์ node ไล่ทุก `export function` ใน `lib/api/*.ts` ที่รับ `AppUser` และเขียน `save*/appendAudit` แต่ไม่มี guard (`requireActiveActor|assert*|managedTarget|isActorActive`) → `export*` 7 ตัว, `materializeActionEvidence` (internal) · grep sink HTML/eval · grep `console.*` ใหม่ · grep `localStorage|sessionStorage` ในหน้า onboarding/admin (ไม่มีการเขียน token) · secret regex บน diff · `npm ls`, `npm audit --omit=dev`, `npm audit`, `npm audit signatures`, `npm view <pkg> repository.url peerDependencies`

---

## ส่งต่อ
- **backend-dev:** S-01 (บังคับ), S-04, S-05, S-06 (+ S-03 ส่วน `requireActiveActor` ใน `export*` ถ้าทำ)
- **frontend-dev:** S-02, S-07 (+ S-03 ส่วน AuthContext tick ถ้าทำ)
- **qa-tester:** เทสต์ใหม่ — reject แล้ว storage ไม่มีชื่อ/อีเมลผู้ขอ (S-01); suspend admin แล้วคำเชิญที่เขาออกใช้ไม่ได้ (S-04 ถ้าแก้); facade ไม่มี `revokeInvitationsOf` (S-05)
- **thesis-writer (เฟส 10):** ตาราง (ข) ทั้ง 16 ข้อ = เนื้อหาข้อจำกัดบท 5 ตาม C15 — ห้ามเขียน "ปลอดภัยตาม NIST/ASVS"
- หลังแก้ S-01 (และ Low ที่เลือกทำ) → security-auditor ตรวจซ้ำเฉพาะจุด (re-run P03/P14 + เคสใหม่)

---

## Re-check หลังแก้ (2026-10-27) — commit `d54f93e` (R2-B3) + `195a7ce` (R2-F9) · HEAD `195a7ce`

### Verdict ใหม่: **PASS**
- Critical 0 · High 0 · Medium 0 (S-01 ปิด) · Low ที่ยังเปิด 0 — S-02/S-04/S-05/S-06/S-07 ปิด · S-03 = ข้อจำกัดที่ยอมรับใน MVP (ตัดสินไว้ตั้งแต่รอบแรก ไม่ได้แก้ในรอบนี้) · ข้อจำกัดใหม่ 3 ข้อ (ข-17..ข-19) ยอมรับได้ → ส่งให้เล่มบท 5
- ไม่มี dependency ใหม่ (diff ไม่แตะ package.json/lockfile) · สแกนบรรทัด `+` ของ `git diff ea00d7b..HEAD -- eduflow-next/` หา secret/`console.*`/HTML sink = 0 · `npx tsc --noEmit` = 0 error (working tree ณ เวลาตรวจ รวมไฟล์เทสต์ที่ qa-tester กำลังแก้)

### สถานะ finding

| ID | สถานะ | หลักฐาน |
|---|---|---|
| **S-01** (Medium) | **closed** | N12 มี `dedupeKey: access_request:<id>` (`onboarding.store.ts:262-269`) · `rejectAccessRequest` และ `deleteUser` (pending) เรียก `purgeAccessRequestNotices` (`notification.internal.ts`) ลบให้ทุกผู้รับ · P03: เหลือ 0 แถว, storage ไม่มีชื่อ/อีเมล · P14: `storageText()` ไม่มี "Rej One"/`rej1@…` · P22: แถว legacy (ไม่มี dedupeKey) ถูกลบ, N12 ของคำขออื่น 2 แถวยังอยู่ · P24: deleteUser(pending) ไม่เหลือชื่อ · dedupe ของ `notify` เป็นราย userId → ยังได้ผู้รับครบ 2 คน (u-super, u-uniadm) |
| S-02 | closed | `RequestAccessForm.tsx:376` + dict EN ระบุ "ผู้ดูแลระบบของมหาวิทยาลัยที่คุณสังกัด และผู้ดูแลระบบส่วนกลางของระบบ" ตรงกับ P04 (super เห็นคำขอ + ได้ N12) |
| S-03 | accepted-limitation (MVP) | ไม่เปลี่ยน — P08 ผลเหมือนเดิม (เขียน = forbidden, อ่านได้) · คงอยู่ใน ข-09 |
| S-04 | **closed** (เลือกทาง b) | `findValidInvitation` ตรวจว่าผู้เชิญยัง active และยังมี `user.manage` ของ uni ผู้รับเชิญ, ไม่พบผู้เชิญ = null · P11: ระงับผู้เชิญ → peek `null`, accept `invalid` ด้วยข้อความ**เดียวกับ** token มั่ว, บัญชียัง invited; เปิดใช้ผู้เชิญอีกครั้ง → accept สำเร็จ · P25: ถอน uni_admin ของผู้เชิญ → invalid; admin ที่ active ออกคำเชิญใหม่ (reissue, `createdBy` = ผู้ออกใหม่) → ใช้ได้; ผู้เชิญไม่มีในระบบ → invalid (fail-closed) · P26: สั่งระงับขณะ accept ยังค้างอยู่ → invalid, บัญชีไม่ถูกเปิดใช้ (`acceptInvitation` เรียก `findValidInvitation` ซ้ำหลัง await, `:198`) |
| S-05 | closed | `revokeInvitationsOf` → `invitation.internal.ts`; `purgeAccessRequestNotices`/`accessRequestNoticeKey` → `notification.internal.ts` ไม่อยู่ใน facade · P19: `['revokeInvitationsOf','purgeAccessRequestNotices','accessRequestNoticeKey'].filter(k => k in api)` = `[]` |
| S-06 | closed | `withoutPassword` ใช้ร่วมกันใน `createUser`/`setUserRoles`/`setUserStatus`/`approveAccessRequest` (+ `inviteUser` เดิม) · P06: ผลคืนทั้ง 4 ตัวไม่มี key `password`, store ยังเก็บ `sha256:` · แก้ `roles` ในผลคืนของ `setUserRoles` แล้วไม่กระทบ store (ไม่คืน reference ของ cache แล้ว) |
| S-07 | closed | `RequestsTab.tsx:112-115` `InlineMessage tone="warn"` testid `req-unverified-{id}` + คำแปล EN ใน dict · render เป็น React text |
| I-01..I-03 | ไม่เปลี่ยน | P07/P12/P21 ผลเหมือนเดิม |

### ตัดสินข้อจำกัดที่ backend-dev แจ้ง
- **ชื่อซ้ำ (fallback ของ S-01 สำหรับแถว legacy) → ยอมรับได้** (ข-17): แถวที่ไม่มี dedupeKey ถูกจับด้วย `kind==='access_request'` + `messageTh` ที่ตรงทุกตัวอักษร → P23: ถ้ามีคำขอค้างอีกคนชื่อเดียวกันพอดี แจ้งเตือน**แบบเก่า**ของคนนั้นหายไปด้วย แต่คำขอยัง pending ยังอยู่ใน `listAccessRequests` และ `countPendingAccessRequests` = 1 → กระทบแค่ availability ของการแจ้งเตือน ไม่มีข้อมูลรั่วและไม่ข้ามสิทธิ์ (ถูกเรียกหลัง guard ของ reject/delete เท่านั้น) · แถวที่สร้างหลัง fix มี dedupeKey ทุกแถว จึงไม่เกิดกรณีนี้ (P23 ส่วน keyed: ของอีกคนเหลือ 2) · ทางเลือกอื่นคือปล่อยชื่อค้างไว้ ซึ่งขัด PDPA → ทางที่เลือกถูกแล้ว
- **เปิดใช้ผู้เชิญอีกครั้งแล้วคำเชิญกลับมาใช้ได้ → ยอมรับได้** (ข-18): การเปิดใช้เป็นการตัดสินใจโดยตรงของ admin ที่ active (มี audit `user.reactivate`) ซึ่งเท่ากับคืนความไว้วางใจให้ผู้เชิญ · คำเชิญยังจำกัดด้วยอายุ 7 วันเดิม (ไม่ต่ออายุ) และใช้ได้ครั้งเดียว · admin ยกเลิกคำเชิญรายตัวได้ (`cancelInvitation`) · สอดคล้อง ADR A3 (ระงับ↔เปิดใช้ย้อนกลับได้) และดีกว่า revoke ถาวรซึ่งย้อนกลับไม่ได้ · ข้อความเดียว `INVITE_INVALID_MESSAGE` ไม่บอกว่าผู้เชิญถูกระงับ (P11) · **ข้อแนะนำ (ไม่บังคับ):** ตอนเปิดใช้บัญชี UI แจ้ง admin ว่า "คำเชิญที่บัญชีนี้ออกไว้และยังไม่หมดอายุจะกลับมาใช้ได้"
- **อนุมัติแล้วคง N12 → ยอมรับได้**: ตรงกับประกาศ "ถ้าอนุมัติ เก็บตลอดอายุบัญชี" (P24 คงไว้ 2 แถว)
- **`isActorActive` fail-open เมื่อไม่พบแถว** = ข-01 เดิม (ไม่ใช่ finding ใหม่) → บันทึกเป็น ข-19 คู่กับ ข-01 ในเล่ม

### ข้อจำกัดเพิ่มเติม → เล่มบท 5 (thesis-writer)
| ID | ข้อจำกัด | หมายเหตุ |
|---|---|---|
| ข-17 | ลบแจ้งเตือน N12 แบบ legacy ด้วยการจับข้อความ — ชื่อซ้ำทำให้แจ้งเตือนเก่าของคำขออื่นหายไปด้วย | เกิดกับข้อมูลก่อน R2-B3 เท่านั้น; ระบบจริงใช้ FK notification→request + ON DELETE CASCADE |
| ข-18 | คำเชิญใช้ได้หรือไม่ขึ้นกับสถานะและสิทธิ์ของผู้เชิญ ณ เวลาที่ใช้ (ระงับ = พักไว้, เปิดใช้ = กลับมาใช้ได้) | อธิบายใน state diagram ของคำเชิญ |
| ข-19 | `isActorActive` fail-open เมื่อ actor ไม่มีแถวใน store | ส่วนหนึ่งของ ข-01 |

### Probe รอบนี้ (ไฟล์เดิม `sec.probe.ts` ใน scratchpad ของ session — ไม่ commit; เปลี่ยน assert ของ P03/P06/P11/P14/P19 ให้ "ยืนยันว่าแก้แล้ว" + เพิ่ม P22–P26) · **ผล: 26/26 ผ่าน**
| Probe | ตรวจอะไร | ผลที่ได้ | ใช้กับ |
|---|---|---|---|
| P03 | ส่งคำขอ (ชื่อไทย) → reject | แจ้งเตือนที่มีชื่อ = 0, storage ไม่มีชื่อ/อีเมล | S-01 |
| P06 | ผลคืนของ approve/createUser/setUserRoles/setUserStatus | ไม่มี `password` ทั้ง 4 ตัว; store ยังมี hash; ผลคืนไม่ใช่ reference ของ cache | S-06 |
| P11 | ระงับผู้เชิญ → peek/accept; เปิดใช้ → accept | null / `invalid` ข้อความเดียวกับ token มั่ว, ยัง invited / สำเร็จ | S-04 |
| P14 | flow 9 ขั้น + ค้นทั้ง audit และ storage | audit ไม่มีความลับ (เหมือนเดิม) + storage ไม่มี "Rej One"/อีเมล | S-01, C11, C13 |
| P19 | helper ที่ไม่มี guard บน facade | `[]` | S-05 |
| P22 | แถว N12 legacy (ลบ dedupeKey ออก) → reject | ลบแล้ว; N12 ของคำขออื่นเหลือ 2 | S-01 |
| P23 | 2 คำขอชื่อซ้ำ: แบบ legacy / แบบ keyed | legacy: N12 ของอีกคนหาย (คำขอยัง pending + นับได้ 1) · keyed: เหลือ 2 | ข-17 |
| P24 | deleteUser(pending) / approve | ไม่เหลือชื่อ / คง N12 2 แถว | S-01 |
| P25 | ผู้เชิญถูกถอน uni_admin / reissue โดย admin ที่ active / ผู้เชิญไม่มีในระบบ | invalid / สำเร็จ / invalid | S-04 |
| P26 | สั่งระงับผู้เชิญขณะ accept ยังค้าง | invalid, บัญชียัง invited | S-04 (TOCTOU) |

P01, P02, P04, P05, P07–P10, P12, P13, P15–P18, P20, P21 ได้ผลเหมือนรอบแรก (ไม่ regress)

### ส่งต่อ
- C13 → **ผ่าน** · C12 → ผ่าน (เหลือ ข-13 เดิม) · C7 → ผ่าน (S-04 ปิดแล้ว)
- qa-tester: เทสต์ถาวรตาม HANDOFF ของ backend-dev ครอบ P03/P11/P19/P06 แล้ว — แนะนำเพิ่ม P22 (legacy) และ P25 (ผู้เชิญถูกถอนสิทธิ์)
- thesis-writer: ตาราง (ข) = ข-01..ข-19

---

## Re-check 2 (2026-10-27) — R2-B4 `c3c188d` (authz) + R2-F10 `f4f42ca` (แผงจัดการผู้ใช้/ScopeSelect) · HEAD `f4f42ca`

### Verdict: **PASS**
- Critical 0 · High 0 · Medium 0 · **Low 2 (ใหม่: S-08, S-09)** · Info 2 (I-04, I-05) · ไม่มี regression
- ขอบเขต: `git diff 75b0f05..HEAD -- eduflow-next/lib eduflow-next/components/aunqa/admin` (อ่านโค้ดทุกไฟล์ใน lib/api ที่เปลี่ยน + UsersTab/ScopeSelect/shared/RequestsTab/NewUserForm) · diff ไม่แตะ package.json/lockfile → ไม่มี dependency ใหม่ · สแกนบรรทัด `+` หา secret/`console.*`/HTML sink/`localStorage.setItem` = 0
- ไม่ได้รัน next build / e2e ตามกติกา (qa-tester ทำขนาน)

### ตอบคำถาม 5 ข้อของ orchestrator

| # | คำถาม | ผล | หลักฐาน |
|---|---|---|---|
| 1 | `validateRoleScopes` + role↔scope: ข้ามมหาวิทยาลัย / ยกระดับ / คงบทบาทเดิมผิดคู่ผ่าน `setUserRoles` | **ไม่มีช่องโหว่** — ข้อยกเว้น `existing` จับคู่ตรงทั้ง role+scopeType+scopeId และใช้เฉพาะบทบาทเดิม**ของเป้าหมายคนนั้น**; การตรวจ tenant/การมีอยู่จริงยังทำก่อนเสมอ; ข้อยกเว้นไม่ใช้กับ createUser/inviteUser/approve (ไม่ส่ง existing) | P27: 7 role × 4 scopeType × (uadmin createUser + sadmin inviteUser) = 56 กรณี ตรงตาราง `ROLE_SCOPE_TYPES` ทั้งหมด; approve ที่มีคู่ผิด 1 ตัวในรายการ = `invalid` ทั้งคำขอ ยัง pending; super_admin@faculty = invalid · P28: บทบาทเดิมผิดคู่คงไว้ได้ + เพิ่มคู่ถูกได้; คัดลอกคู่เดิมไปให้อีกคน = invalid; เปลี่ยน scopeId/role ของคู่เดิม = invalid; คู่เดิมที่ข้าม tenant = invalid (ถอดออกได้); แนบ super_admin มาด้วย = forbidden; เป้าหมายมี super_admin (แม้ผิดคู่) = forbidden |
| 2 | ล็อกหลักฐานบน section ที่ล็อก — bypass ผ่าน createEvidence/ฟังก์ชันอื่นที่ผูกหลักฐาน | **การผูก/เลิกผูกไม่มีทาง bypass** — ทุก writer ของ `KEYS.links` (grep): `linkEvidence`/`unlinkEvidence` (มี guard), `createEvidence` และ `acceptAiRun` AI-1 (เรียก `linkEvidence`), `materializeActionEvidence` + การคัดลอกลิงก์ใน `createCycle` (เขียนลงรอบ**ใหม่**ที่ section ยังไม่ล็อก) · **แต่เนื้อหาของหลักฐานที่ข้อที่อนุมัติแล้วอ้างถึงยังแก้ได้** → **S-08** · AI-1 accept ไม่ atomic → I-05 | P30: createEvidence บนข้อ approved/ready_for_review (เดี่ยว และผสมกับข้อที่แก้ได้) = `locked` ×4 และจำนวน evidence/file/link ไม่เพิ่ม (ไม่มีกำพร้า); link ผสม [แก้ได้, ล็อก] = `locked` ไม่มีลิงก์บางส่วน; link source `ai` = locked; unlink ข้อ approved = locked ลิงก์ยังอยู่; ผูกซ้ำ = no-op; ส่งกลับแก้ (changes_requested) แล้ว unlink ได้ · AI-1 accept [1.3 แก้ได้, 1.1 ล็อก] = `locked` ไม่มีลิงก์ 1.1 · P31: addFileVersion / updateEvidence(title) บนหลักฐานที่ข้อ approved อ้าง = ok |
| 3 | N12 mark read หลังอนุมัติ แตะแจ้งเตือนของผู้อื่น/ข้ามมหาวิทยาลัยไหม | **ไม่** — `markAccessRequestNoticesRead` เลือกด้วย `dedupeKey === access_request:<userId>` เท่านั้น (ผู้รับ = ผู้ดูแล uni เดียวกับผู้ขอ + super ตามที่ notify ไว้ตอนส่งคำขอ) · เรียกหลัง `managedTarget` + `validateGrantedRoles` + save → approve ที่ forbidden/invalid ไม่ mark อะไร · ไม่อยู่ใน facade | P32: คำขอ A, B (uni-demo), C (uni-demo-2) · approve C โดย uadmin = forbidden, approve A คู่ผิด = invalid → readAt = 0 แถว · approve A → แถวของ A ทั้ง u-uniadm และ u-super เป็นอ่านแล้ว; B และ C ยังไม่อ่าน; uadmin ไม่มีแถวของ C; แจ้งเตือนชนิดอื่นทุกแถว readAt ไม่เปลี่ยน; `'markAccessRequestNoticesRead' in api` = false |
| 4 | export ใหม่ผ่าน facade เขียนข้อมูลโดยไม่มี guard ไหม (B7) | **export ใหม่ทั้ง 6 ตัวไม่เขียนข้อมูล** — `ROLE_SCOPE_TYPES`, `allowedScopeTypes`, `isRoleScopeCompatible`, `ScopeType` (type), `isSectionEditable` (pure), `assertSectionsEditable` (อ่าน + throw) · `ROLE_SCOPE_TYPES` แก้ได้ตอน runtime → I-04 · **สแกนใหม่ทั้ง facade (ไม่กรองเฉพาะฟังก์ชันที่รับ AppUser แบบรอบก่อน) เจอ writer ไม่มี guard ของเดิม 5 ตัว** → **S-09** | P33: เรียก export ใหม่ทุกตัวแล้ว `storageText()` ไม่เปลี่ยน · สคริปต์ `facade-scan.cjs` (scratchpad): writer ที่ไม่มี guard บน facade = `saveUsers`, `saveCycle`, `addReviewEvent`, `notify`, `appendAudit`(+`Throttled`) + `export*` 7 ตัว (S-03 เดิม) + `getSession/touchSession/loginUser/logoutUser` (ไม่ต้องมี actor โดยธรรมชาติ) + `nextEvidenceCode`/`getProvider` (ไม่เขียนข้อมูลผู้ใช้) — **ไม่มีตัวไหนมาจาก diff นี้** · P34 |
| 5 | UI ซ่อนปุ่มให้ตัวเอง/super_admin — API ยังกันจริงไหม | **กันจริง** — `canManage` ใน UsersTab เป็นแค่ UX; ทุก action ตรวจซ้ำที่ store | P29 (uadmin): setUserRoles ตัวเอง (เพิ่ม/ล้าง) = forbidden · setUserRoles(sadmin) = forbidden ข้อความ "ไม่มีสิทธิ์แก้บัญชี super_admin" (ลำดับ P4 ถูก) · setUserStatus ตัวเอง = invalid, super = forbidden · deleteUser ตัวเอง = invalid, super = forbidden · reissue/cancel บน super = invalid · chair1 setUserRoles = forbidden · roles ของ sadmin/uadmin ใน store ไม่เปลี่ยน · UI: `UsersTab` สร้างตัวเลือกขอบเขตจาก uni ของผู้ใช้ปัจจุบัน + `listCycles(user)` และ `scopeOptions` กรอง `c.universityId` → ไม่โชว์หน่วยงานของ uni อื่น; ข้อความทั้งหมดเป็น React text |

### Finding ใหม่

| ID | ระดับ | ตำแหน่ง | ปัญหา / ผลกระทบ | หลักฐาน | วิธีแก้ | ผู้รับผิดชอบ |
|---|---|---|---|---|---|---|
| **S-08** | Low | `lib/api/evidence.store.ts:233` (`addFileVersion`), `:206` (`updateEvidence`) | กติกา R2-B4 "ข้อที่ส่งตรวจ/อนุมัติแล้ว = ล็อกเนื้อหา" ครอบตารางลิงก์แล้ว แต่**ไม่ครอบเนื้อหาของหลักฐานที่ข้อนั้นอ้าง** — ผู้มี `evidence.write` ในหลักสูตรอัปไฟล์เวอร์ชันใหม่/เปลี่ยนชื่อหลักฐานที่ข้อ approved อ้างได้ขณะรอบยัง in_progress → ประธานอนุมัติข้อจากไฟล์ v1 แต่เล่มที่ส่งอ้างไฟล์ v2 (integrity / ASVS 2.x business logic) · บรรเทาอยู่แล้ว: เวอร์ชันเก่าเก็บไว้, มี audit `evidence.new_version`/`evidence.update`, verified → tagged, `addFileVersion` กันรอบที่ล็อกแล้ว, `verifySnapshot` แจ้ง `evidenceChanged` หลังล็อกรอบ · ไม่ใช่ regression (พฤติกรรมเดิม) | P31: ข้อ 1.3 approved อ้างหลักฐาน → `addFileVersion` = ok, `updateEvidence({title})` = ok | architect ตัดสิน 1 ใน 3: (a) by-design → เขียนในเล่ม + UI หน้าหลักฐานเตือน "ข้อ X อนุมัติแล้วอ้างหลักฐานนี้"; (b) `addFileVersion`/`updateEvidence` เรียก `assertSectionsEditable` กับทุกข้อที่หลักฐานผูกอยู่ในรอบที่ยังเขียนได้; (c) ยอมให้แก้แต่ตั้งข้อที่อ้างกลับเป็น `changes_requested` + แจ้งประธาน | architect → backend-dev |
| **S-09** | Low (ของเดิม — ไม่ได้มาจาก diff นี้) | `lib/api/workflow.ts:107` `saveCycle`, `:116` `addReviewEvent` · `lib/api/notification.store.ts:35` `notify` · `lib/api/audit.store.ts:19,38` `appendAudit*` · `lib/api/auth.api.ts:152` `saveUsers` — ทั้งหมดออก facade ผ่าน `export *` | ขัดกฎ B7 "ห้าม helper ไม่ตรวจสิทธิ์หลุด facade" — โค้ด UI ใดก็ปลดล็อกรอบที่ final_approved, ปลอมประวัติอนุมัติ, ส่งแจ้งเตือนในนามระบบถึงใครก็ได้ (รวมปลอม `dedupeKey: access_request:*`), เขียน audit ปลอม หรือเขียนทับตาราง users ได้ **โดยไม่มี actor** · ใน client-only มีผลเท่ากับแก้ localStorage (ข-01) จึงเป็น Low แต่ถ้า signature นี้ย้ายขึ้น server ตรง ๆ = ช่องโหว่ระดับ High · ไม่มี UI ใช้ตัวเหล่านี้ (grep `components/ app/ context/` = 0; `notify` ใน UI เป็นของ DialogContext คนละตัว) · รอบแรก/รอบ 1 ไม่เจอเพราะสคริปต์กรองเฉพาะฟังก์ชันที่รับ `AppUser` — **ความผิดพลาดของวิธีตรวจของ security-auditor เอง** | P34: `['saveCycle','addReviewEvent','notify','appendAudit','saveUsers'].filter(k => k in api)` = ครบ 5 · `api.saveCycle({...c, status:'final_approved', lockedAt})` → `assertCycleWritable` = locked แล้ว `saveCycle({... status:'in_progress', lockedAt: undefined})` → ok ไม่มี actor/audit | ย้ายไป `*.internal.ts` (แบบ S-05) หรือเปลี่ยน `export *` ของ workflow/notification.store/audit.store/auth.api เป็นรายชื่อ (แบบ action.store) · เพิ่มเทสต์ facade: ชื่อเหล่านี้ไม่อยู่ใน `@/lib/api` · ไม่บังคับก่อนปิด TASK-0002 (ไม่ใช่ regression) แต่**ต้องทำก่อนย้ายขึ้น server** | backend-dev (+ qa-tester เทสต์ facade) |

### Info

| ID | ตำแหน่ง | สาระ | หลักฐาน |
|---|---|---|---|
| I-04 | `lib/api/auth.api.ts:71` `ROLE_SCOPE_TYPES` | `Readonly<…>` เป็นแค่ type — object/array ไม่ได้ freeze; โค้ดใดที่ import จาก facade `push` เข้าไปได้แล้ว `validateRoleScopes` ยอมคู่ผิด (client-only = ข-01) · แนะนำ `Object.freeze` ทั้งตัวนอกและ array ด้านใน (2 บรรทัด) | P33: `isFrozen` = [false, false]; push 'university' เข้า dean → `validateRoleScopes(dean@university)` = ok (คืนค่าหลังทดสอบ) |
| I-05 | `lib/api/ai.service.ts:403-420` `acceptAiRun` AI-1 | วนลูป `linkEvidence` ทีละข้อหลัง `setAiSummary` — ถ้าข้อหลัง ๆ ล็อก จะ throw หลังเขียน summary + ลิงก์ข้อก่อนหน้าไปแล้ว (`run.accepted` ยัง false) → **ไม่ใช่ bypass** (ข้อที่ล็อกไม่ถูกผูก) แต่ผลไม่ atomic · แนะนำตรวจ `assertCycleWritable` + `assertSectionsEditable(run.cycleId, wanted)` ก่อนเขียนอะไร (หรือข้ามข้อที่ล็อกแล้วรายงานกลับ) | P30: links ของหลักฐานหลัง accept ล้ม = ['1.3'], accepted = false |

### ข้อจำกัดเพิ่ม → เล่มบท 5
| ID | ข้อจำกัด | หมายเหตุ |
|---|---|---|
| ข-20 | ตาราง role↔ระดับขอบเขตบังคับที่ store เฉพาะการ**มอบใหม่** — บทบาทเดิมที่ผิดคู่ (ข้อมูลก่อนกติกา) คงอยู่จนถูกถอด และ `rbac.can` ยังประเมินตามที่เก็บไว้ | ระบบจริง: migration ตรวจ/ล้างคู่ผิดครั้งเดียว + CHECK constraint |

### Probe รอบนี้ (ไฟล์เดิม `sec.probe.ts` ใน scratchpad — ไม่ commit) · **ผล: 34/34 ผ่าน**
- รัน P01–P26 ซ้ำ: **25/26 ผ่านทันที; P05 ล้มเพราะ fixture** (`inviteUser(uadmin2, programme_staff@university)` ตอนนี้ = `invalid` ตามกติกา R2-B4 — เป็นหลักฐานว่ากติกาใหม่ทำงาน) → เปลี่ยน fixture เป็น `uni_admin@university` แล้วผ่าน; ผลของ P01–P26 ที่เหลือเหมือน Re-check 1 ทุกค่า (ไม่ regress)

| Probe | ตรวจอะไร | ผลที่ได้ | ใช้กับ |
|---|---|---|---|
| P27 | ตาราง 7 role × 4 scopeType ผ่าน createUser (uadmin) + inviteUser (sadmin) = 56 กรณี; approve คู่ผิด/รายการผสม; super_admin@faculty | ตรง `isRoleScopeCompatible` ทั้ง 56; approve = invalid ยัง pending; super@faculty invalid | ข้อ 1 |
| P28 | ข้อยกเว้น `existing`: คงไว้ / คัดลอกให้คนอื่น / เปลี่ยน scopeId / เปลี่ยน role / ข้าม tenant / แนบ super / เป้าหมายมี super ผิดคู่ | ok / invalid / invalid / invalid / invalid (ถอดได้) / forbidden / forbidden | ข้อ 1, ข-20 |
| P29 | API ของปุ่มที่ UI ซ่อน: self / super / chair | forbidden หรือ invalid ทุกตัว, roles ใน store ไม่เปลี่ยน | ข้อ 5 |
| P30 | createEvidence / link (ผสม, ai) / unlink / ผูกซ้ำ / AI-1 accept บนข้อ approved & ready_for_review (seed: approved 45, ready_for_review 5, drafting 3, รอบ in_progress) | locked ทุกทาง ไม่มีกำพร้า/ลิงก์บางส่วน; ผูกซ้ำ no-op; ส่งกลับแล้วแก้ได้; AI-1 ไม่ atomic | ข้อ 2, I-05 |
| P31 | addFileVersion / updateEvidence บนหลักฐานที่ข้อ approved อ้าง | ok / ok | **S-08** |
| P32 | N12 mark-read: 3 คำขอ 2 uni, approve ที่ล้มก่อน, แถวอื่น | เฉพาะแถวของผู้ขอที่อนุมัติ, ทุกผู้รับ, ล้ม = ไม่แตะ | ข้อ 3 |
| P33 | export ใหม่เขียน store ไหม; `ROLE_SCOPE_TYPES` freeze | ไม่เขียน; ไม่ freeze → แก้ตาราง runtime ได้ | ข้อ 4, I-04 |
| P34 | writer ไม่มี guard บน facade (ของเดิม) + `saveCycle` ปลดล็อกรอบ | 5 ตัวอยู่บน facade; ปลดล็อกได้โดยไม่มี actor | **S-09** |

### ส่งต่อ
- **architect:** S-08 ตัดสิน a/b/c (ถ้า a = เขียนเล่ม + เตือน UI)
- **backend-dev:** S-09 (ย้าย/จำกัด export — ไม่บังคับก่อนปิด TASK แต่ต้องก่อน server) · I-04 freeze · I-05 ตรวจล่วงหน้าใน acceptAiRun (ไม่บังคับ)
- **qa-tester:** แนะนำเทสต์ถาวรเพิ่ม — P28 (ข้อยกเว้น existing ไม่ข้ามคน/ไม่ข้าม tenant), P32 (mark-read ไม่แตะคำขออื่น/uni อื่น/approve ที่ล้ม), เทสต์ facade ไม่มี 5 ชื่อของ S-09 (หลังแก้)
- **thesis-writer:** ตาราง (ข) = ข-01..ข-20 · กติกา role↔scope + ล็อกเนื้อหาข้อ (รวมขอบเขตที่ S-08 ตัดสิน)
