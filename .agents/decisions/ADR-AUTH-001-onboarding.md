# ADR-AUTH-001 — การรับผู้ใช้ใหม่ (เชิญ + ขอเข้าใช้งาน) วงจรชีวิตบัญชี และโมเดลแจ้งเตือนแบบมีปลายทาง

- **สถานะ:** Accepted — เจ้าของมอบอำนาจให้ orchestrator/architect ตัดสิน (OWNER APPROVED: 2026-10-26 ใน TASK-0002 "รอบ 2" ข้อ 5) · orchestrator เลือก O1+O2 ไว้ก่อน architect ยืนยันตามเหตุผลด้านล่าง
- **วันที่:** 2026-10-26 · **ผู้เขียน:** architect · **งาน:** TASK-0002 รอบ 2
- **เกี่ยวข้อง:** ADR-UI-003 (หน้าจอ — `ui/friendly-spec.md` §F3, §F5–F8) · research `TASK-0002-r2.md` ข้อ 1–2 (R1–R15) · SYSTEM_MAP F-B, F-C, F-E, F-F, จุดเสี่ยง 1–8
- **Study:** `standards/ui-ux.md` ข้อ 4.1 (สถานะไม่พึ่งสี) และ 5.2 (empty state) สำหรับหน้าจอที่เกิดจาก ADR นี้; หลักความปลอดภัยใช้ OWASP/NIST ตาม research R1–R6 (ยังไม่มีไฟล์มาตรฐาน security ใน `standards/` — ดู STUDY REQUEST ใน TASK Log)

## บริบท
- เจ้าของ: "ไม่มีหน้าสมัคร แล้วเพิ่ม user อย่างไร role ไหนอนุมัติ → ขอ solution + ทำ"
- ปัจจุบัน (SYSTEM_MAP F-C): ผู้ใช้มาจาก seed หรือ admin (`user.manage` = super_admin, uni_admin) สร้างพร้อมตั้งรหัสผ่านให้ — admin รู้รหัสผ่านผู้ใช้, ไม่มีเชิญ/คำขอ/อนุมัติ/ระงับ, ลบแบบ hard delete ไม่ cascade, รหัสผ่านขั้นต่ำ store 6 ≠ UI 8, `resetDemo` ล้างทุก tenant ได้โดย uni_admin ใดก็ได้
- ข้อจำกัดใหญ่: **ไม่มี server/อีเมล — ทุกอย่างอยู่ใน localStorage ของเบราว์เซอร์เดียว** · การตรวจสิทธิ์ทั้งหมดเป็นการจำลอง (ผู้ใช้ที่เปิด DevTools แก้ข้อมูลได้)
- Notification (SYSTEM_MAP F-E/F-F): ไม่มีปลายทางทั่วไป, assessor ลิงก์ผิดหน้า, action item ไม่มีลิงก์, ไม่มีข้อความอังกฤษ

## ทางเลือกที่พิจารณา
| ทาง | สรุป | ตัดสิน |
|---|---|---|
| A. admin สร้าง + ตั้งรหัสให้ (มีอยู่) | ง่าย แต่ admin รู้รหัสผ่าน | **คงไว้เป็นทางรอง** ("ตั้งรหัสผ่านให้เลย") — E2E เดิมและกรณีอบรมหน้าห้องยังต้องใช้ |
| O1 = B. เชิญด้วยลิงก์/รหัสใช้ครั้งเดียว มีวันหมดอายุ, role ล็อกโดยผู้เชิญ, ผู้ใช้ตั้งรหัสเอง | admin ไม่รู้รหัส, กัน mass assignment, ตรงแนว Supabase `inviteUserByEmail` (R9) | **เลือก — เป็นค่าเริ่มต้นของฟอร์ม "เพิ่มผู้ใช้"** |
| O2 = C. หน้า "ขอเข้าใช้งาน" สาธารณะ (ไม่มีช่อง role) → pending → uni_admin อนุมัติ+กำหนด role / ปฏิเสธ | ตอบโจทย์ "ไม่มีหน้าสมัคร" ตรงตัว | **เลือก** โดยจำกัดโดเมนอีเมล (R7/R8), ไม่มีช่อง role (R2), least privilege (R3) |
| O3. สมัครเองแล้วเลือก role | ผู้อนุมัติกดผ่านโดยไม่ดู = ยกระดับสิทธิ์ | **ไม่เลือก** (R2, R3) — "ตำแหน่ง/หน้าที่" เป็นข้อความประกอบเท่านั้น |
| D. SSO/IdP | ต้องมี IdP + server | **ไม่ทำ** → งานอนาคตในเล่ม |
| เก็บคำขอเป็น entity แยก vs สถานะใน `AppUser` | แยก = key ใหม่ + join | **เก็บใน `AppUser` (`status:'pending'` + `accessRequest`)** — orchestrator กำหนด status 4 ค่า และทำให้ login/รายชื่อ/ผู้รับแจ้งเตือนกรองที่จุดเดียว |
| รหัสผ่านตอนขอเข้าใช้งาน: ตั้งตอนขอ vs ส่งลิงก์เชิญหลังอนุมัติ | ส่งลิงก์ = admin ต้องคัดลอกส่งอีกรอบ | **ตั้งตอนขอ** (hash ทันที) — อนุมัติแล้วเข้าได้เลย ไม่ต้องมีช่องทางส่งลิงก์ |
| ผู้อนุมัติ | uni_admin / chair ในหลักสูตรตน / two-person | **ผู้มี `user.manage` ของมหาวิทยาลัยนั้น (uni_admin) + super_admin** — ไม่เพิ่ม action ใหม่ใน POLICY; การให้ chair เสนอชื่อ = backlog |
| ลบผู้ใช้ | cascade ล้างการอ้างอิง / บังคับระงับ | **บังคับระงับ** — ลบได้เฉพาะบัญชีที่ไม่เคยใช้งาน (invited/pending) จึงไม่มีการอ้างอิงลอย; cascade เสี่ยงทำประวัติ SAR/audit ขาด |
| `resetDemo` | จำกัดต่อ tenant / เฉพาะ super_admin | **เฉพาะ super_admin** — seed สร้างข้อมูล 2 มหาวิทยาลัย + audit รวม การล้างเฉพาะ tenant ต้องเขียน seed แยก tenant (งานใหม่ที่ไม่ได้ขอ) |
| `listNotifications`/`unreadCount` "เขียนตอนอ่าน" | แยก sync ออก / คงไว้ | **คงไว้** — `notify` มี dedupeKey จึงเขียน localStorage เฉพาะตอนเกิด deadline bucket ใหม่จริง (ไม่ใช่ทุกครั้งที่อ่าน); การแยกจะเปลี่ยนความหมายของ unreadCount และเทสต์ B3 (`phase-u.test.ts:564`) โดยไม่ได้ประโยชน์เพิ่ม |
| ปลายทางแจ้งเตือน: เก็บ `href` vs เก็บเป้าหมายเชิงความหมาย | href ผูก route ไว้ใน data layer | **`target` เชิงความหมาย** (`{type, …ids}`) — frontend แปลงเป็น href (`lib/ui/notification.ts`) กัน open redirect, route เปลี่ยนได้โดยไม่ migrate ข้อมูล, ตรงกับตาราง DB อนาคต (`payload jsonb`) |
| ข้อความอังกฤษ | แปลจาก kind ที่ UI / เก็บ `messageEn` ตอนสร้าง | **ทั้งสอง**: ทุกจุด notify ใส่ `messageEn` (มีรายละเอียด เช่น เลขข้อ/ปี/หมายเหตุ) · แถวเก่าที่ไม่มี → UI ใช้ข้อความตาม kind |

## การตัดสินใจ

### A1. Data model (`lib/types.ts` — backend-dev แก้, เป็น contract กลาง)
```ts
export type UserStatus = 'active' | 'invited' | 'pending' | 'suspended';
export interface AccessRequestInfo {
  programmeId?: string; facultyId?: string;      // หน่วยงานที่ขอ (อย่างใดอย่างหนึ่งหรือไม่ระบุ = ทั้งมหาวิทยาลัย)
  positionText?: string;                          // ≤100 ตัว — ข้อความประกอบ ไม่ใช่สิทธิ์
  reason: string;                                 // 1–500 ตัว
  requestedAt: number;
}
export interface AppUser {
  /* field เดิมทั้งหมดคงเดิม */
  /** ไม่มี = 'active' (ข้อมูลเดิม/seed ไม่ต้อง migrate) */
  status?: UserStatus;
  /** มีเฉพาะ status 'pending' — ลบทิ้งเมื่ออนุมัติ/ปฏิเสธ */
  accessRequest?: AccessRequestInfo;
}
export interface Invitation {
  id: string;               // newId('inv')
  universityId: string;
  userId: string;           // ผู้ใช้ status 'invited'
  tokenHash: string;        // sha256Hex('aunqa-invite::' + token) — ไม่เก็บ token ดิบ
  createdBy: string;        // userId ผู้เชิญ
  createdAt: number;
  expiresAt: number;        // createdAt + INVITE_TTL_MS (7 วัน)
  usedAt?: number;
  revokedAt?: number;
}
export interface InvitePreview {
  fullName: string; username: string; universityNameTh: string; universityNameEn: string;
  roles: RoleCode[]; expiresAt: number;
}
export interface AccessRequestView {
  userId: string; username: string; fullName: string; email: string; universityId: string;
  programmeId?: string; facultyId?: string; positionText?: string; reason: string; requestedAt: number;
}
// ── Notification (แทนของเดิม — field เดิมคงทั้งหมด) ──
export type NotificationKind =
  | 'assigned' | 'comment' | 'changes_requested' | 'approved' | 'cycle_status' | 'deadline'
  | 'access_request' | 'account';
export type NotificationTarget =
  | { type: 'section'; cycleId: string; requirementId: string; panel?: 'comments' }
  | { type: 'my_work' }
  | { type: 'cycle'; cycleId: string }
  | { type: 'assess'; cycleId: string }
  | { type: 'action'; actionId: string }
  | { type: 'admin'; tab: 'users' | 'requests' }
  | { type: 'home' };
export interface AppNotification {
  id: string; universityId: string; userId: string; kind: NotificationKind;
  cycleId?: string; requirementId?: string; messageTh: string;
  dedupeKey?: string; createdAt: number; readAt?: number;
  /** ใหม่ (optional เพื่อให้แถวเก่าอ่านได้) */
  messageEn?: string; target?: NotificationTarget;
}
```
- `Session` ไม่เปลี่ยน · `LoginResult.error` เพิ่ม `'pending' | 'suspended'` (อยู่ใน `auth.api.ts`)
- **ไม่มี migration**: field ใหม่ optional ทั้งหมด; seed (`lib/mock-data/**`) ไม่ต้องแก้ → ไม่ต้องใช้ db-engineer

### A2. Storage key ใหม่ (`lib/api/db.ts`)
`KEYS.invitations = 'aunqa_invitations'` (ตัวเดียว) · `clearAllAunqa` ล้างด้วยอยู่แล้ว (prefix `aunqa_`)

### A3. API (export ผ่าน facade `lib/api/index.ts`)
ค่าคงที่: `PASSWORD_MIN = 8`, `PASSWORD_MAX = 128` (≥64 ตาม NIST; 128 = เพดาน login เดิม), `INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000` — export จาก `auth.api.ts` · ห้ามกฎผสมชนิดอักขระ (NIST R6)
helper กลาง (`auth.api.ts`): `userStatus(u: Pick<AppUser,'status'>): UserStatus` (= `u.status ?? 'active'`), `isActiveUser(u): boolean`, `validatePassword(pw): void` (throw `invalid` "รหัสผ่านต้องยาว 8–128 ตัวอักษร"), `validateRoleScopes(universityId, roles): void` (ทุก assignment ต้องอยู่ใน university นั้น: university→`scopeId===universityId` (ยกเว้น super_admin `*`), faculty/programme/cycle→มีจริงและ `universityId` ตรง; ไม่ผ่าน → `invalid` "ขอบเขตบทบาทไม่ถูกต้อง")

| ฟังก์ชัน (ไฟล์) | ใครเรียกได้ | ตรวจ | ผล | audit (`action`) | แจ้งเตือน |
|---|---|---|---|---|---|
| `createUser(actor, input)` (auth.api — เดิม) | `user.manage` | เดิม + `validatePassword` (8) + `validateRoleScopes` + อีเมลซ้ำเทียบตัวเล็ก | `status:'active'` | `user.create` (เดิม) | – |
| `inviteUser(actor, input: InviteInput): Promise<InviteResult>` (onboarding) | `user.manage` ใน uni ของ actor | username regex เดิม/ซ้ำ, อีเมลรูปแบบ/ซ้ำ, ชื่อ, roles ≥1, non-super ห้าม super_admin, `validateRoleScopes` | user `status:'invited'`, `password:''` + Invitation ใหม่ · คืน `{ user: Omit<AppUser,'password'>, token, expiresAt }` (token ดิบคืนครั้งเดียว) | `user.invite` after `{username, roles, expiresAt}` | – |
| `reissueInvitation(actor, userId): Promise<InviteResult>` | `user.manage` ของ uni เป้าหมาย | เป้าหมาย `invited` | ยกเลิกคำเชิญเดิมที่ยังใช้ได้ (`revokedAt`) + สร้างใหม่ | `user.invite_reissue` | – |
| `cancelInvitation(actor, userId): void` | `user.manage` | เป้าหมาย `invited` | revoke + ลบแถว user | `user.invite_cancel` before `{username}` | – |
| `peekInvitation(token): Promise<InvitePreview \| null>` | สาธารณะ | token ใช้ได้ (ดู A5) | อ่านอย่างเดียว | – | – |
| `acceptInvitation(token, password): Promise<LoginResult>` | สาธารณะ | `validatePassword` ก่อน · token ใช้ได้ — ไม่ได้ = `AunqaError('invalid', 'ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว — ขอลิงก์ใหม่จากผู้ดูแลระบบ')` **ข้อความเดียวทุกกรณี** | ตั้ง hash, `status:'active'`, `usedAt` → `return loginUser(username, password)` (session + audit `auth.login` ตามเดิม) | `user.invite_accept` (actor = ผู้ใช้เอง) | ผู้เชิญ: `account` (N14) |
| `findUniversityByEmail(email): University \| null` (org.store) | สาธารณะ | โดเมนหลัง `@` ตัวเล็ก = `emailDomain` หรือเป็น subdomain (`*.${emailDomain}`) | อ่านอย่างเดียว | – | – |
| `submitAccessRequest(input: AccessRequestInput): Promise<{ username: string }>` (onboarding) | สาธารณะ | allowlist field เท่านั้น (A7) · ชื่อ 1–100 · อีเมลรูปแบบ + `findUniversityByEmail` ≠ null (ไม่ผ่าน `invalid` "อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้") · username regex/ซ้ำ · อีเมลซ้ำ (ตัวเล็ก) → `duplicate` "อีเมลนี้มีบัญชีหรือคำขออยู่แล้ว" · `validatePassword` · programme/faculty อยู่ใน uni นั้น · position ≤100 · reason 1–500 · `consent === true` | user `status:'pending'`, `roles: []`, `universityId` จากโดเมน, password hash, `accessRequest` | `user.request` (actor `null` → "system", universityId ของคำขอ) after `{programmeId, facultyId}` — **ไม่มีรหัสผ่าน/hash** | ผู้อนุมัติทุกคน: `access_request` (N12) |
| `listAccessRequests(actor): AccessRequestView[]` | `user.manage` (super = ทุก uni, อื่น = uni ตน) | ไม่มีสิทธิ์ → `forbidden` | เรียงเก่า→ใหม่ | – | – |
| `countPendingAccessRequests(actor): number` | ใครก็ได้ | ไม่มีสิทธิ์ → 0 | สำหรับตัวนับเมนู/แท็บ | – | – |
| `approveAccessRequest(actor, userId, roles): AppUser` | `user.manage` ของ uni เป้าหมาย | เป้าหมาย `pending` · roles ≥1 · non-super ห้าม super_admin · `validateRoleScopes` | `status:'active'`, roles, ลบ `accessRequest` | `user.approve` before `{status:'pending'}` after `{status:'active', roles}` | ผู้ขอ: `account` (N13) |
| `rejectAccessRequest(actor, userId, note?): void` | `user.manage` ของ uni เป้าหมาย | เป้าหมาย `pending` | **ลบแถว user** (ลดข้อมูลส่วนบุคคล — PDPA ม.22 แหล่งรอง) | `user.reject` before `{emailDomain, programmeId, facultyId}` after `{note}` | – |
| `setUserStatus(actor, userId, status: 'active' \| 'suspended', reason?): AppUser` (auth.api) | `user.manage` ของ uni เป้าหมาย | ห้ามตัวเอง (`invalid`) · non-super แตะบัญชี super_admin ไม่ได้ (`forbidden`) · เปลี่ยนได้เฉพาะ active↔suspended (อื่น = `invalid`) | ตั้ง status | `user.suspend` / `user.reactivate` after `{reason}` | – |
| `deleteUser(actor, userId)` (เดิม) | เดิม | **เพิ่ม:** เป้าหมายที่ `status` ไม่ใช่ `invited`/`pending` → `AunqaError('conflict', 'ผู้ใช้นี้เคยใช้งานแล้ว ให้ระงับบัญชีแทนการลบ')` (ตรวจหลังเงื่อนไข forbidden เดิม — ลำดับ error เดิมไม่เปลี่ยน) | เดิม | `user.delete` (เดิม) | – |
| `resetDemo(actor)` (init) | **super_admin เท่านั้น** | ไม่ใช่ → `forbidden` "เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่รีเซ็ตข้อมูลเดโม่ได้" | เดิม | เดิม | – |
`InviteInput = { username; email; fullName; roles: RoleAssignment[] }` · `AccessRequestInput = { fullName; email; username; password; programmeId?; facultyId?; positionText?; reason; consent: boolean }`
ไฟล์: ฟังก์ชันเชิญ/คำขอ อยู่ใน **`lib/api/onboarding.store.ts` (ใหม่)**; `setUserStatus`, helper, ค่าคงที่ อยู่ใน `auth.api.ts`; `findUniversityByEmail` ใน `org.store.ts`
token: `crypto.getRandomValues(new Uint8Array(32))` → base64url (43 ตัว, 256 bit) · ห้าม `Math.random`

### A4. RBAC — ไม่เพิ่ม action ใน POLICY (`rbac.ts` ไม่แก้)
- เชิญ/อนุมัติ/ปฏิเสธ/ระงับ/เปิดใช้ = `user.manage` (super_admin ทุก uni, uni_admin uni ตน) — เหมือน `createUser`/`setUserRoles` เดิม
- กฎยกระดับสิทธิ์เดิมใช้ทุกทาง: non-super ให้/แตะ super_admin ไม่ได้, แก้บทบาท/ระงับตัวเองไม่ได้
- SoD: ผู้ขอ/ผู้ถูกเชิญไม่มีสิทธิ์ใด ๆ จนกว่าจะ active (pending/invited ไม่มี session) → "ผู้ขอ ≠ ผู้อนุมัติ" เป็นจริงโดยโครงสร้าง · role ของผู้ถูกเชิญถูกล็อกในแถว user ตั้งแต่ตอนเชิญ ผู้รับเชิญเปลี่ยนไม่ได้
- backlog (ไม่ทำรอบนี้): super_admin จัดการผู้ใช้ข้ามมหาวิทยาลัยจาก UI (SYSTEM_MAP จุดเสี่ยง 4), chair เสนอชื่อเข้าหลักสูตรตน (two-person), ให้ uni_admin เฉพาะ super_admin

### A5. ผลของสถานะต่อระบบ
| จุด | active | invited | pending | suspended |
|---|---|---|---|---|
| `loginUser` | เดิม | `invalid` (นับครั้งผิดเหมือนรหัสผิด) | รหัสถูก → `{success:false, error:'pending'}` (ล้างตัวนับผิด, ไม่สร้าง session) | รหัสถูก → `error:'suspended'` |
| `getCurrentUser` | เดิม | – | – | คืน `null` + `clearSession()` (session ที่ค้างอยู่หมดผลในการเรียกครั้งถัดไป → AuthContext พาไป `/login` ตามกลไกเดิม) |
| `notify()` | ส่ง | **ข้าม** | **ข้าม** | **ข้าม** |
| รายชื่อให้เลือกมอบหมาย/ผู้รับตามสิทธิ์ (`listAssignableUsers`, `usersWhoCan`, `chairsOf`, รายชื่อกรรมการที่เลือกได้, `assignSections` owner, `assignAssessor` target) | รวม | ไม่รวม / `invalid` | ไม่รวม / `invalid` | ไม่รวม / `invalid` |
| `listUsers` (admin) | รวม | รวม | **ไม่รวม** (อยู่แท็บคำขอ) | รวม |
backend-dev: grep `load<AppUser>(KEYS.users)` และ `getAllUsers()` ใน `lib/api/**` ทุกจุดที่คืนรายชื่อเพื่อเลือก/ส่งแจ้งเตือน ต้องกรอง `isActiveUser` — จดรายการจุดที่แก้ใน Log
token ใช้ได้ = มี Invitation ที่ `tokenHash` ตรง, ไม่มี `usedAt`/`revokedAt`, `expiresAt > now`, และ user ยัง `invited`

### A6. Notification — ปลายทาง + ข้อความอังกฤษ (ทุกจุด notify)
`NotifyInput` เพิ่ม **`messageEn: string` และ `target: NotificationTarget` (บังคับ)** · `messageTh` **ทุกจุดเหมือนเดิมทุกตัวอักษร** (เทสต์ `phase-u` B3 เทียบตรง) · `notify` ข้ามผู้รับที่ไม่ active · ฟังก์ชันอ่าน (`listNotifications`, `unreadCount`, `markRead`, `syncDeadlineNotifications`) signature เดิม
| # | จุด (ไฟล์) | kind | target | messageEn |
|---|---|---|---|---|
| N1 | `assignSections` (cycle.store) | assigned | 1 ข้อ → `section`; หลายข้อ → `my_work` | `You were assigned requirement(s) ${list}` + (due ? ` — due ${due}` : '') |
| N2 | `assignAssessor` (cycle.store) | assigned | `assess` | `You were appointed as an assessor for the ${year} assessment cycle` |
| N3 | `transitionSection`→approved (workflow) | approved | `section` | `Requirement ${id} was approved` |
| N4 | `transitionSection`→changes_requested | changes_requested | `section` | `Requirement ${id} was returned for changes: ${note}` |
| N5 | `transitionSection`→ready_for_review (ถึงประธาน) | cycle_status | `section` | `Requirement ${id} was submitted for review — awaiting chair approval` |
| N6a | `notifyCycleChange` under_review → ผู้มี approve.faculty | cycle_status | `cycle` | `Cycle ${year} (${code}) was submitted for faculty QA review — awaiting your decision` |
| N6b | faculty_approved → approve.final | cycle_status | `cycle` | `Faculty QA approved cycle ${year} (${code}) — awaiting the dean's final approval` |
| N6c | final_approved → assessor.assign | cycle_status | `cycle` | `Cycle ${year} (${code}) received final approval and is locked — you can start the assessment and appoint assessors` |
| N6d | under_assessment → เจ้าของข้อ+ประธาน | cycle_status | `cycle` | `Cycle ${year} has entered the assessment stage` |
| N6e | under_assessment → กรรมการ | cycle_status | **`assess`** | `Cycle ${year} (${code}) is open for assessment — start scoring in the assessor workspace` |
| N6f | assessed → ประธาน+approve.faculty+cycle.close | cycle_status | **`assess`** | `Assessors submitted results for cycle ${year} (${code}) — see the assessment results page` |
| N7 | `notifyCycleChange` ข้อความเดิมถึงเจ้าของข้อ+ประธาน (in_progress / under_review / revision_requested / faculty_approved / final_approved) | ตามเดิม | `cycle` | `Assessment cycle ${year} has started` / `Assessment cycle ${year} was sent to faculty QA` / `Cycle ${year} was returned for revision (by ${actor.fullName}): ${note}` / `Faculty QA approved cycle ${year} — awaiting the dean` / `The dean gave final approval and locked cycle ${year}` |
| N8 | `addComment` (sar.store) | comment | `section` + `panel:'comments'` | `New comment on requirement ${id}` |
| N9 | `createActionItem` (action.store) | assigned | **`action`** (`actionId: item.id`) | `You were assigned an action item for requirement ${id}` + (due ? ` — due ${due}` : '') |
| N10 | `setActionStatus`→verified (action.store) | approved | **`action`** | `The action item for requirement ${id} was verified` |
| N11 | `syncDeadlineNotifications` (notification.store) | deadline | 1 ข้อ → `section`; หลายข้อ → `my_work` | overdue: `Requirement(s) ${list} are past due (${due})` · ใกล้: `Requirement(s) ${list} are due soon (${due}) — ${b} day(s) or less left` |
| N12 | `submitAccessRequest` → ผู้มี `user.manage` ใน uni นั้น (รวม super_admin) ที่ active | access_request | `admin` tab `requests` | TH `มีคำขอเข้าใช้งานใหม่จาก ${fullName}` · EN `New access request from ${fullName}` |
| N13 | `approveAccessRequest` → ผู้ขอ | account | `home` | TH `บัญชีของคุณได้รับอนุมัติแล้ว เริ่มใช้งานได้เลย` · EN `Your account has been approved — you can start using the system` |
| N14 | `acceptInvitation` → ผู้เชิญ (ถ้ายัง active) | account | `admin` tab `users` | TH `${fullName} ตั้งรหัสผ่านและเริ่มใช้งานแล้ว` · EN `${fullName} has set a password and joined` |
ภายใน `notifyCycleChange`: เปลี่ยน `extra` จาก `Map<string,string>` เป็น `Map<string,{th,en,target}>` — ลำดับการทับข้อความ/ผู้รับเดิมทุกข้อ
**ไม่ทำ:** retention/ลบแจ้งเตือน, notification สำหรับ evidence/metric/finding (ไม่ได้ขอ)

### A7. ความปลอดภัย (ในขอบเขตระบบจำลอง)
- **Mass assignment (R2):** `submitAccessRequest`/`acceptInvitation` สร้าง object จาก allowlist field ที่ระบุใน A3 เท่านั้น (ไม่ spread input) — `roles: []` ตายตัว, `status` ตายตัว · เทสต์ส่ง `roles`/`status` ปลอมมาใน input แล้วต้องถูกละเลย
- **Token (R5):** 256 bit จาก CSPRNG, เก็บเฉพาะ hash, ใช้ครั้งเดียว, หมดอายุ 7 วัน, revoke เมื่อออกใหม่/ยกเลิก, ข้อความ error เดียวทุกกรณี, ลิงก์ใช้ fragment `#t=` (ไม่อยู่ใน path/query → ไม่เข้า log ของ server/Referer)
- **Enumeration:** login ของ pending/suspended บอกสถานะเฉพาะเมื่อรหัสผ่านถูก · หน้าขอเข้าใช้งานบอก "อีเมล/username ถูกใช้แล้ว" — **ยอมรับความเสี่ยงในเดโม่** (ระบบจริงต้องยืนยันอีเมลก่อน) → จดเป็นข้อจำกัดในเล่ม
- **รหัสผ่าน (R6):** ขั้นต่ำ 8 ทั้ง store และ UI, สูงสุด 128, ไม่บังคับผสมอักขระ · ยังไม่ทำ blocklist/MFA → NIST 800-63B-4 กำหนด 15 ตัวเมื่อไม่มี MFA = **ข้อจำกัด/งานอนาคต** (เจ้าของเลือก 8)
- **Audit:** ทุกการเชิญ/ออกใหม่/ยกเลิก/รับเชิญ/ขอ/อนุมัติ/ปฏิเสธ/ระงับ/เปิดใช้ มี audit · ห้ามมี password/hash/token/tokenHash ใน `before`/`after`
- **localStorage = จำลอง:** ทุกการตรวจข้างบนกันได้เฉพาะการใช้ผ่าน UI — ผู้ใช้ที่แก้ localStorage เองข้ามได้ (SYSTEM_MAP จุดเสี่ยง 1)

### A8. แก้บั๊กพร้อมกัน (SYSTEM_MAP จุดเสี่ยง 5, 6, 7)
1. รหัสผ่าน: `createUser` 6 → 8 (`validatePassword`) — ข้อความใหม่ "รหัสผ่านต้องยาว 8–128 ตัวอักษร"
2. `deleteUser`: ห้ามลบบัญชีที่เคยใช้งาน (A3) → UI เปลี่ยนเป็น "ระงับบัญชี"
3. `resetDemo`: super_admin เท่านั้น (A3) → UI แท็บข้อมูลเดโม่แสดงเฉพาะ super_admin
4. (ไม่ทำ — backlog) super_admin ข้ามมหาวิทยาลัยจาก UI

### A9. PDPA / ข้อจำกัดที่ต้องเขียนในเล่ม (thesis-writer)
- เก็บเท่าที่จำเป็น: ชื่อ อีเมล หน่วยงาน ตำแหน่ง เหตุผล + ข้อความแจ้งวัตถุประสงค์ (consent checkbox) — ม.21–23 (แหล่งรอง R10) · คำขอที่ถูกปฏิเสธถูกลบทันที (เหลือเฉพาะ audit ที่มีโดเมนอีเมล)
- เดโม่อยู่ใน localStorage เบราว์เซอร์เดียว: ผู้ขอและผู้อนุมัติต้องใช้เบราว์เซอร์เดียวกัน; ไม่มีอีเมลจริง → admin คัดลอกลิงก์เชิญไปส่งเอง; ไม่มีการยืนยันอีเมล
- งานอนาคต: Supabase Auth `inviteUserByEmail` (server, service-role key — R9), SSO โดเมนมหาวิทยาลัย, ยืนยันอีเมล, MFA + รหัสผ่าน 15 ตัว/blocklist, ระยะเก็บ audit, chair เสนอชื่อ (two-person rule)

### A10. ผลต่อเทสต์เดิม (qa-tester ปรับใน Q2b/Q2c — ไม่ลดสิ่งที่ทดสอบ)
| เทสต์ | เหตุ | แก้เป็น |
|---|---|---|
| `tests/review-fixes.test.ts` #3 | uni_admin รีเซ็ตเดโม่ไม่ได้แล้ว | `resetDemo(uadmin)` → `forbidden`; `resetDemo(sadmin)` → resolves (คง chair → forbidden) |
| `tests/phase-u.test.ts` B3 ข้อความแจ้งเตือน | `messageTh` ไม่เปลี่ยน | ไม่ต้องแก้ (ถ้าล้ม = backend เปลี่ยนข้อความไทยผิด → กลับไปแก้ backend) |
| `e2e/flows-a.spec.ts` E2E-01 | ฟอร์มเพิ่มผู้ใช้ค่าเริ่มเป็น "เชิญ" | เลือก `nu-mode-password` ก่อนกรอก `nu-password` (flow เดิมทั้งหมด) |
| `e2e/flows-b.spec.ts` E2E-08 | `noti-list` ย้ายไป panel | กด `nav-bell` ก่อน แล้ว assert เดิม + เพิ่ม: กดรายการ → URL ตรง deep link |
| `e2e/regress-u1b.spec.ts`, `regress-u3fix.spec.ts` (logout 5 จุด) | `logout` อยู่ในเมนูผู้ใช้ | helper `openUserMenu(page)` แล้วกด `logout` (dialog/conflict เดิมทุกขั้น) |
| `e2e/theme.spec.ts` AC-13 | ค่าเริ่มต้น light + ไม่มี `theme-toggle` | ดู AC-13 ใหม่ใน TASK |

## จุดที่ต้องให้เจ้าของอนุมัติ
- ไม่มีเพิ่ม: ไม่มี dependency ใหม่, ไม่มี migration ที่ลบข้อมูล (field ใหม่ optional), ไม่มี deploy/ค่าใช้จ่าย · การ "ลบคำขอที่ถูกปฏิเสธ" เป็นพฤติกรรมของระบบเดโม่ (ข้อมูลสมมติใน localStorage) ไม่ใช่การลบข้อมูลจริงของโปรเจกต์

## ผลที่ตามมา
- (+) เพิ่มผู้ใช้ได้ 3 ทาง (เชิญ — ค่าเริ่ม, ขอเข้าใช้งาน, ตั้งรหัสให้) โดยบทบาทถูกกำหนดโดยผู้มีสิทธิ์เสมอ; ระงับแทนลบ ไม่มีการอ้างอิงลอย
- (+) แจ้งเตือนทุกจุดพาไปหน้าที่ถูก (รวม assessor → /assess, action item) และมีข้อความอังกฤษ
- (−) `lib/api` + `lib/types.ts` เปลี่ยน → AC-20 เดิม (presentation only) ใช้ไม่ได้ทั้งก้อน — แทนด้วย AC-20 ฉบับรอบ 2 (จำกัดไฟล์ logic ที่เปลี่ยนได้)
- (−) เดโม่หลายผู้ใช้ต้องอยู่เบราว์เซอร์เดียว · ความปลอดภัยเป็นแบบจำลอง
- diagram/เล่ม: use case ใหม่ (ขอเข้าใช้งาน, เชิญ, รับเชิญ, อนุมัติ/ปฏิเสธ, ระงับ/เปิดใช้), state ของบัญชีและคำเชิญ, sequence เชิญ→รับเชิญ และ ขอ→อนุมัติ, ER เพิ่ม `status/accessRequest` + `Invitation`, sequence แจ้งเตือน→กด→deep link
