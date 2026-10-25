# SYSTEM MAP  (อัปเดต: 2026-10-25, ถึง commit 732d06e — อัปเดตเฉพาะส่วน Routes & Pages + Frontend (UI layer) โดย TASK-0002)

> ที่มา: อ่านโค้ดจริงโดย code-reader. path อ้างอิงจาก `eduflow-next/` ยกเว้นระบุอย่างอื่น. ไม่ได้อ่านไฟล์ `.env`.
> **คำเตือน (2026-10-25):** ระบบถูก pivot เป็น **AUN-QA Copilot** ใน TASK-0001 (74 commit หลัง 9e42156). หัวข้อ "Routes & Pages" และ "Frontend (UI layer)" ด้านล่าง **ตรง HEAD 732d06e แล้ว**. หัวข้อ โมดูล / Data Model / Flow / บทบาท / External / จุดเสี่ยง ที่เหลือยังเป็นของ **EduFlow (TASK-0000) — ล้าสมัย** (เช่น `/student`, `/teacher`, wallet ไม่มีแล้ว; ปัจจุบันมี `app/api/ai/route.ts`, 8 role, vitest+Playwright) ห้ามอ้างจนกว่าจะอ่านใหม่ (ดู Found Issues ใน TASK-0002).
> dependencies ปัจจุบัน: `next ^14.2`, `react ^18`, `docx`, `exceljs`; dev: `vitest ^3.2.7`, `@playwright/test ^1.64.1`, `typescript ^5`, `eslint-config-next 14.2.0` (`package.json:13-29`). scripts: dev/build/start/lint/**test (vitest run)**/**e2e (playwright test)** (`package.json:5-12`). `next.config.mjs` ว่าง. **ไม่มี** tailwind / postcss config / `components.json` / UI lib ภายนอกใด ๆ.

## โมดูล — ชื่อ / หน้าที่ / path หลัก

| โมดูล | หน้าที่ | path หลัก |
|---|---|---|
| Landing (หน้าแรก) | หน้าการตลาด + ข่าวสาร (NewsBoard) + hash-scroll | `app/page.tsx:67`, `components/landing/*`, `components/ui/NewsBoard.tsx` |
| Auth UI | ฟอร์ม login/register, loader ตอนเข้า/ออก | `components/auth/{LoginForm,RegisterForm,AuthNav,LoginLoader,LogoutLoader}.tsx` |
| Auth core | users/session/lockout/hash/permissions store | `lib/api/auth.api.ts`, `context/AuthContext.tsx` |
| Permissions | ตรวจสิทธิ์ฝั่ง client (merge กับ default) | `lib/api/permissions.ts:19-45`, `DEFAULT_PERMISSIONS` ที่ `lib/mock-data/index.ts:19` |
| Student portal | dashboard/schedule/homework/grades/shop/topup/library/booking/ebook/tutoring/profile/docs/QR scan | `components/student/StudentLayout.tsx`, `components/student/views/*`, `components/student/AttendanceScanView.tsx` |
| Teacher portal | โครงสร้างวิชาการ, ตารางสอน, QR เช็คชื่อ, การบ้าน, gradebook, ผลประเมิน, ปพ., สื่อ, สอนพิเศษ, โปรไฟล์ | `components/teacher/TeacherLayout.tsx` (nav: `:49-66`), `components/teacher/*` |
| School admin / Parent | หน้า `/dashboard` เดียวแยกตาม role | `components/dashboard/DashboardLayout.tsx`, `AcademicManager.tsx`, `ParentDashboard.tsx` |
| Web admin | KPI, จัดการ user/permission/content/log/academic | `components/admin/*` (`AdminShell.tsx`), `app/admin/**/page.tsx` |
| Academic store | ปีการศึกษา→ชั้น→ห้อง→วิชา→คะแนน→เกรด/GPA, เลื่อนชั้น, seed demo | `lib/api/academic.store.ts` (918 บรรทัด) |
| Schedule store | ตารางสอน (slot), ตรวจชนห้อง/ครู, log | `lib/api/schedule.store.ts` |
| Class resolver | แปลง classId/roomId ↔ นักเรียน | `lib/api/class-resolver.ts:20-76` |
| Assignments store | การบ้าน + submissions + **shared notifications** | `lib/api/assignments.store.ts` |
| Attendance store | QR session / check-in / report | `lib/api/attendance.store.ts` |
| Wallet store | กระเป๋าเงิน นักเรียน (topup/purchase) | `lib/api/wallet.store.ts` |
| Booking / E-book | จองหนังสือห้องสมุด / เช่า e-book | `lib/api/booking.store.ts`, `lib/api/ebook.store.ts` |
| Tutoring store | ครูเปิดสอนพิเศษ / นักเรียนจอง | `lib/api/tutoring.store.ts` |
| อื่น ๆ stores | materials+announcements, feed (ข่าว), ratings, subject-catalog, teacher-profile, assessment, activity log | `lib/api/{materials,feed,ratings,subject-catalog,teacher-profile,assessment}.store.ts`, `activity.log.ts` |
| API facade | re-export `auth/student/admin/teacher` api (store ตัวอื่นถูก import ตรง) | `lib/api/index.ts:11-14` |
| Storage cache | `readJSON/writeJSON` พร้อม cache (ใช้เฉพาะบาง store เช่น academic) | `lib/api/storage-cache.ts:61-82` |
| Mock data | SEEDED_USERS, DEFAULT_PERMISSIONS, โปรไฟล์/ตาราง/ร้านค้า/หนังสือ mock | `lib/mock-data/index.ts` |
| i18n | dict + dom-translate (LangContext) | `lib/i18n/*`, `context/LangContext.tsx` |
| Report docs / Excel | ปพ.1/4/6 + export Excel | `lib/report-docs*.ts`, `lib/utils/excel-export.ts`, `components/teacher/Report*.tsx` |
| Contexts | Auth, Lang, Toast, Dialog | `context/*.tsx`; ซ้อนใน `app/layout.tsx:25-33` |
| Legacy SPA | โปรโตไทป์ HTML เดิม (ไม่เกี่ยวกับ Next) | `index.html` (2276 บรรทัด), `css/styles.css`, `js/{app,auth,data,donut,schools,student,teacher}.js` (~3,900 บรรทัด). `js/auth.js:39-48` seed localStorage คล้ายของใหม่. ไม่ได้ trace ลึก |
| Tooling | caveman mod (Claude), usecase diagram | `.claude/mods/caveman/*`, `CAVEMAN.md`, `eduflow-next/docs/diagrams/*` |

## Routes & Pages — path → page/layout (path:line) → guard/สิทธิ์ที่ต้องมี  (ตรง HEAD 732d06e)

Root layout `app/layout.tsx`: `<html lang="th">`, `viewport.colorScheme:'light'` (`:16-18`, ADR-UI-001 T11 ไม่มี dark mode), โหลด Sarabun 400/600/700 ผ่าน `<link>` Google Fonts (`:24-29`, ไม่ใช้ next/font), ห่อ `PrefsInit` + `ToastProvider > DialogProvider > AuthProvider > LangProvider > {children} + <Toast/>` (`:31-43`). CSS ทั้งแอป = `import './globals.css'` (`:8`) ไฟล์เดียว. **ไม่มี middleware** — guard เป็น client (`AppShell.tsx:35-37` ไม่มี user → `/login`). สิทธิ์ในหน้า = `can()`/`canAny()` (`lib/api/rbac.ts`, `lib/ui/aunqa.ts:122-131`) ใช้ซ่อนปุ่ม/เมนู — store ตรวจซ้ำทุก write.

| path | page → component หลัก | h1 (PageHeader) | ใครเห็น / guard |
|---|---|---|---|
| `/` | `app/page.tsx` → LandingNav/Hero/About/Flow/Trust/Cta/Footer (`components/landing/*`) | (Hero) | public |
| `/login` | `app/login/page.tsx` → `AuthLayout` + `LoginForm` (Suspense) | ใน LoginForm | public; `?reason=` แสดง `login-reason` |
| `*` (404) | `app/not-found.tsx` → `components/ui/NotFoundView.tsx` | — | public |
| `/app/*` layout | `app/app/layout.tsx` → `components/aunqa/AppShell.tsx` | — | ต้องล็อกอิน; assessor-only เห็น `readonly-banner` (`AppShell.tsx:145-149`) |
| `/app` | `app/app/page.tsx` (to-do, งานของฉัน, แจ้งเตือน `#notifications`) | หน้าหลัก (`:109-110`) | ทุก role |
| `/app/review` | `app/app/review/page.tsx` | รอตรวจ (`:95`) | เมนูโชว์ถ้ามี sar.approve/sar.return/approve.faculty/approve.final (`AppSidebar.tsx:63-64`) → chair, faculty_qa, dean |
| `/app/cycles` | `app/app/cycles/page.tsx` (ตารางรอบ + ฟอร์มสร้าง) | รอบประเมิน (`:62-63`) | ทุก role; สร้างได้เฉพาะ `cycle.create` (`:28`) → chair, uni_admin |
| `/app/cycles/[id]` | `app/app/cycles/[id]/page.tsx` (KPI, heatmap 53 ข้อ, gap-list, transition, lock-banner, celebrate) | รอบประเมิน {ปี} (`:235-237`) | ทุก role; ปุ่ม transition ตาม `can(t.action)` (`:118`) |
| `/app/cycles/[id]/assign` | `.../assign/page.tsx` (owner/due ต่อข้อ, bulk, เพิ่มกรรมการ) | มอบหมายงาน — รอบ {ปี} (`:94-96`) | อ่านได้ทุกคน; แก้ `cycle.assign` (chair) / `assessor.assign` (uni_admin, faculty_qa) (`:35-39,101`) |
| `/app/cycles/[id]/assess` | `.../assess/page.tsx` (verdict, crit score, finding, AI summarize) | พื้นที่ทำงานกรรมการ / ผลการประเมินของกรรมการ (`:76-78`) | assessor เขียนได้เมื่อ under_assessment (`:72,224`); role อื่นอ่าน |
| `/app/sections/[id]` | `app/app/sections/[id]/page.tsx` → `components/aunqa/SarWorkspace.tsx` (833 บรรทัด — editor TH/EN, หลักฐาน, AI, ความเห็น, rating, versions) | ข้อ {id} … (`:71-77`) | ทุก role; เขียนได้ `sar.write` (staff เฉพาะข้อตน) |
| `/app/evidence` | `app/app/evidence/page.tsx` (ตาราง + ฟอร์ม/dropzone + RequirementPicker) | คลังหลักฐาน (`:174-175`) | ทุก role; สร้างได้ `evidence.write` และไม่ใช่ assessor (`:41,61`) |
| `/app/evidence/[id]` | `app/app/evidence/[id]/page.tsx` (รายละเอียด, ผูกข้อ, version, verify, PII, AI) | {code} · {title} (`:75-77`) | ทุก role; write/verify/AI ตาม `:51-53` |
| `/app/export` | `app/app/export/page.tsx` (.docx SAR, ภาคผนวก, .xlsx) | ส่งออกเอกสาร (`:44`) | ทุก role (assessor ได้ฉบับจำกัด `export-assessor-*`) |
| `/app/curriculum` | `app/app/curriculum/page.tsx` (แท็บ PLO/รายวิชา/CLO/matrix heatmap/prereq SVG/AI verb) | หลักสูตร (PLO · รายวิชา · CLO) (`:37`) | เมนูซ่อนจาก assessor (`AppSidebar.tsx:76`); แก้ `curriculum.write` (`:29`) |
| `/app/metrics` | `app/app/metrics/page.tsx` + `MetricImport` + `TrendChart` | ตัวชี้วัด (`:37`) | ซ่อนจาก assessor; แก้ `metric.write` (`:31`) → chair, data_staff |
| `/app/actions` | `app/app/actions/page.tsx` (action plan + AFI) | แผนปรับปรุง (Action plan) (`:77`) | ซ่อนจาก assessor; `action.write`/`action.verify` (`:47,115-128`) |
| `/app/requirements` | `app/app/requirements/page.tsx` + `RequirementCard` | คลังเกณฑ์ AUN-QA (`:34`) | ทุก role |
| `/app/admin` | `app/app/admin/page.tsx` (แท็บ ผู้ใช้/audit/demo) | ผู้ดูแลระบบ (`:37,60`) | เมนูโชว์ถ้า `user.manage` หรือ `audit.view` (`AppSidebar.tsx:84`); ไม่มีสิทธิ์ → Empty "คุณไม่มีสิทธิ์เข้าหน้านี้" (`:34-41`) |
| `GET/POST /api/ai` | `app/api/ai/route.ts` (server route เดียว) | — | ไม่ใช่หน้า UI — ไม่อยู่ใน scope TASK-0002 |

### หน้า × role (8 role `lib/types.ts:10`; บัญชีเดโม่ `lib/mock-data/aunqa/org.ts:59-110` รหัส `demo1234`; สิทธิ์ `lib/api/rbac.ts` POLICY)
| role (ชื่อไทย `lib/ui/aunqa.ts:7-11`) | demo user | เมนูที่เห็น เพิ่มจาก 5 เมนูพื้นฐาน (หน้าหลัก/รอบประเมิน/หลักฐาน/ส่งออก/คลังเกณฑ์) |
|---|---|---|
| super_admin ผู้ดูแลระบบสูงสุด | sadmin | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ |
| uni_admin ผู้ดูแลมหาวิทยาลัย | uadmin, uadmin2 | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ |
| programme_chair ประธานหลักสูตร | chair1 | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (audit) |
| programme_staff อาจารย์/เจ้าหน้าที่ | staff1, lect1, lect2 | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง |
| data_staff เจ้าหน้าที่ข้อมูล | data1 | หลักสูตร, ตัวชี้วัด, แผนปรับปรุง |
| faculty_qa QA คณะ | fqa1 | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (audit) |
| dean คณบดี | dean1 | รอตรวจ, หลักสูตร, ตัวชี้วัด, แผนปรับปรุง, ผู้ดูแลระบบ (audit) |
| assessor กรรมการประเมิน | assess1 | เฉพาะ 5 เมนูพื้นฐาน + `readonly-banner`; งานหลักที่ `/app/cycles/[id]/assess` |

ทุกหน้า `/app/*` ใช้ shell เดียวกัน — redesign ไม่ต้องแยก layout ต่อ role; ต่างกันแค่เมนู/ปุ่มที่ถูกซ่อน

## Frontend (UI layer) — แผนที่สำหรับ TASK-0002 (ย้ายไป Tailwind + shadcn/ui)

### F1. Component ร่วม (เขียนเองทั้งหมด ไม่มี UI lib)
| กลุ่ม | ไฟล์ (บรรทัด) | หมายเหตุสำคัญต่อการย้าย |
|---|---|---|
| App shell | `components/aunqa/AppShell.tsx` (155) | skip link `a.aq-skip` + `<main id="main" tabIndex=-1>` (`:137,143`); โหมด session-lost (`aq-shell--lost`, testid `shell-lost`) ดัก click/keydown ด้วย `closest('button, a, select, input, [role=button], [role=tab], summary, label')` (`:63-85`) ยกเว้น `[data-session-lost-ok], textarea` → ถ้า component ใหม่ใช้ role อื่น (Radix `[role=option]`, `[role=menuitem]`, `[role=checkbox]`) จะหลุดการดัก |
| Sidebar / drawer | `components/aunqa/AppSidebar.tsx` (141) | `aside#app-sidebar.aq-sidebar` + class `is-open` (`:91`), focus trap/Esc เขียนเอง (`:50-60`), overlay `aq-drawer-overlay` (`:90`); เมนู 5 กลุ่ม (`:65-86`), `a.aq-nav-item[data-testid=nav-*]` + `aria-current=page` + badge `span.aq-count` (`:114-122`); ท้าย: `DisplayPrefsButton` + ปุ่ม `logout` (`:132-136`) |
| Top bar | `components/aunqa/AppTopbar.tsx` (82) | `nav-menu` (aria-expanded/controls=app-sidebar `:61`), แบรนด์, `LangToggle`, กระดิ่ง `nav-bell` aria-label "แจ้งเตือนที่ยังไม่อ่าน N รายการ" (`:68`), avatar initials + `nav-user` + ชื่อ role (`:72-77`); state class `is-scrolled`, `is-bump` |
| Page primitives | `components/aunqa/common.tsx` (326) | `PageHeader` (`:56`, crumbs + `h1.aq-h1`), `InlineMessage` (`:99`, role alert/status, tone success/warn/danger/info/neutral), `Skeleton` 5 แบบ (`:131`), `Loading` (`:174`, testid `state-loading`, โชว์หลัง 300ms), `ErrorBox` (`:199`, `state-error`), `Empty` (`:219`, `state-empty`), `Badge` + 3 status badge (`:252-275`, testid `cycle-status`/`section-status`), `HeatLegend` (`:278`), `AsyncButton` (`:298`, aria-busy + `aq-spinner`), `ModelBadge` (`:323`), hooks `useMe`/`useLoad`/`Async` |
| Dialog (confirm/prompt) | `context/DialogContext.tsx` (284) | เขียนเอง: `div.aq-dialog[role=dialog][aria-modal]` + backdrop, focus trap, Esc/คลิก backdrop = ยกเลิก, prompt ใช้ `textarea.aq-textarea` (`:219-270`); API `confirm()/prompt()` คืน Promise ใช้ทั่วแอป → เปลี่ยนเป็น shadcn AlertDialog ได้ถ้าคง API + role + ชื่อปุ่ม |
| Toast | `context/ToastContext.tsx` (118) + `components/ui/Toast.tsx` (51) | `div.aq-toasts[aria-live=polite]`, รายการ `data-testid=toast`, error = role alert, ปุ่ม action + แถบเวลา `aq-toast__time` (animation) (`Toast.tsx:18-45`) |
| Popover / prefs | `components/ui/DisplayPrefs.tsx` (80), `ui/PrefsInit.tsx`, `lib/ui/prefs.ts` | popover เขียนเอง; `FontScaleSeg` role=radiogroup (`:27`); prefs เก็บ `aunqa_ui_prefs` → ตั้ง `--user-scale` บน `<html>` (`prefs.ts:48-49`) ซึ่ง `html{font-size:var(--user-scale)}` (`globals.css:103-104`) — **ทุกขนาดต้องเป็น rem** |
| Form controls | native ทั้งหมด: `<select>` 39 จุด, `<textarea>` 11, `<input type=file>` 5 (dropzone โปร่งใส), checkbox/switch native, `<details>` 11 จุด (`aq-collapse`, `aq-accordion`, import-panel) | E2E ใช้ `selectOption` 16 ครั้ง + `getByLabel('บทบาท').selectOption` + `setInputFiles` 3 + `locator('summary').click()` → **ห้ามแทน `<select>` ด้วย shadcn Select (Radix ไม่ใช่ native)**; ต้องคง `<details>/<summary>` หรือแก้ E2E |
| Combobox | `components/aunqa/RequirementPicker.tsx` (128) | testid `${prefix}s-input`, `${prefix}-opt-<id>`, `${prefix}-chip-<id>` (helper `pickRequirements`) |
| Tabs | `button[role=tab][aria-selected]` เขียนเอง 17 จุด (SarWorkspace `:459-460,572`, curriculum `:46`, admin) | E2E ใช้ `getByRole('tab')` + audit target size `[role=tab]` |
| Table | `table.aq-table` 18 ตาราง ใน `div.aq-table-wrap`; มือถือ `aq-table--stack` ใช้ `td[data-label]` (51 จุด) แสดงหัวคอลัมน์ผ่าน CSS | E2E อ่าน `tbody tr`, `td:first-child strong`, `td:first-child a`, `td.nth(1)` → คงลำดับคอลัมน์ + `<strong>` รหัสในคอลัมน์แรกของ `ev-table` |
| Heatmap | `app/app/cycles/[id]/page.tsx:91-94` (`a.aq-heat-cell.aq-heat-<level>` + `data-level`), curriculum matrix `aq-lv-*` | E2E นับ `[data-testid^="heat-"]` = 53 |
| Charts | `components/aunqa/TrendChart.tsx` (SVG เขียนเอง `:105-112`, `text.aq-chart-label`), prereq SVG (`curriculum/page.tsx:398`), `components/ui/ProgressRing.tsx` | **ไม่มี chart lib**; E2E วัดขนาดฟอนต์ที่เห็นจริงของ `text.aq-chart-label` ≥13px และ `[cur-panel-prereq] svg text` |
| อื่น ๆ | `ui/Icon.tsx` (SVG path จาก Lucide, ไม่ติดตั้ง package `:1-12`), `ui/BrandMark.tsx`, `ui/AppLoader.tsx` (`app-loader`, `data-mode` `:36`, มี animation), `ui/Stepper.tsx`, `ui/Term.tsx` (glossary popover `aq-term__btn`), `ui/LangToggle.tsx`, `ui/NotFoundView.tsx`, `aunqa/{MetricImport,TranslateResult,RequirementCard}.tsx` | — |
| Auth / Landing | `components/auth/{AuthLayout,LoginForm}.tsx` (login layout แยก, แผงแบรนด์พื้นเข้ม `aq-on-dark` ≥1280), `components/landing/*` 7 ไฟล์ (testid `hero-start`, `landing-login`) | — |
| i18n | `context/LangContext.tsx` + `lib/i18n/dom-translate` — **แปลโดยแก้ text ใน DOM ตรง ๆ** ต่อ pathname (key `eduflow_lang_pages`) | เสี่ยงชนกับ React/Radix portal ที่ re-render (ต้องทดสอบสลับภาษาหลังย้าย) |

### F2. globals.css (1258 บรรทัด, 433 class prefix `aq-`) — โครงและผู้ใช้
| ช่วง | เนื้อหา | ใช้ที่ |
|---|---|---|
| `:9-98` TOKENS | สี `--c-*` 27 ตัว (palette Indigo & Sand: bg #FBF8F3, primary #3B4FA0, accent #E9A23B …), `--font-sans` Sarabun→Leelawadee UI→Tahoma (`:41`), fs-xs…3xl (13–34px, ขยายที่ ≥768), `--sp-*`, `--control-h` 44 (compact 40 ที่ ≥1024 `:98`), `--r-*`, เงา `--e-0..3`, z-index, duration/easing, `--sidebar-w` 256, `--topbar-h` 64 | ทุกหน้า; **`tests/contrast.test.ts` parse `:root` ของไฟล์นี้ตรง ๆ** |
| `:100-155` BASE | reset, `html{font-size:var(--user-scale)}`, body line-height 1.7, h1-h4, ลิงก์ขีดเส้นใต้, `:focus-visible` outline 3px primary, `[hidden]{display:none!important}`, `.aq-skip`, `.aq-sr-only` | ทุกหน้า |
| `:157-864` COMPONENTS C0–C24 | Icon, Brand, **Button** (`aq-btn` 186 จุด, `-primary` 60, `-compact` 57, `-ghost` 35, `-icon` 11), Link, **Form** (`aq-field` 55, `aq-input` 88, `aq-textarea`, `aq-help`, `aq-field-error`, `aq-check`), Picker/chip, Tabs, Nav, **Card** (`aq-card` 68), PageHeader, InlineMessage, KPI, Pill/Badge/Count, **Table** (+stack), Heatmap, Toast, Dialog, Bell, Term, Empty, Skeleton, Progress, Stepper, AppLoader, Sticky actionbar, Save indicator, collapse/accordion | shell + ทุกหน้า |
| `:865-1212` PAGES | P1 landing (`aq-lnav`, `aq-hero`, `aq-features`, `aq-flow`, `aq-trust`, `aq-cta`, `aq-footer`), P2 login (`aq-auth*` grid 3 breakpoint), P5 home (`aq-todo*`, `aq-noti*`), P7 dashboard (`aq-kpi`, heatmap, `aq-celebrate*`), P9 SAR editor (`aq-sar-layout`, `aq-sidepanel` sticky), P20 404, evidence (`aq-ev-*`, `aq-dropzone`), curriculum (`aq-matrix`, `aq-lv-*`, `aq-clo*`), metrics (`aq-import*`, `aq-chart*`), export (`aq-export*`), requirements (`aq-reqgrid`, `aq-reqcard`) | ตามหน้า |
| `:1214-1258` UTILITIES + motion | `aq-stack`, `aq-cluster` (31), `aq-mt/mb-*`, `aq-tnum`, `aq-hide-md`/`aq-only-md`, 14 `@keyframes aq-*`, `prefers-reduced-motion` ปิด animation ทั้งระบบ (`:1243`), `html[data-effects="off"]` ปิด spark | ทุกหน้า |

- breakpoint ที่ใช้จริง: 480 / 768 / 1024 / 1280 (+ max-width 479.98, 767.98) — ต่างจาก Tailwind default (`sm` 640)
- class แบบ dynamic (template string) ที่ Tailwind JIT สแกนไม่เจอ: `aq-badge-${tone}`, `aq-msg--${tone}`, `aq-heat-${level}`, `aq-lv-${v}`, `aq-kpi--*`, `aq-dialog--*`, `aq-toast--*`, `aq-checkitem--*`, `aq-ring--*`, `aq-stepper--*`, `aq-skel--*`, `aq-wordmark--*` (54 class ใน CSS ไม่พบเป็นข้อความตรงใน tsx ส่วนใหญ่อยู่กลุ่มนี้)
- class ที่ใช้ใน tsx แต่ไม่มีใน CSS (hook ไม่มีสไตล์): `aq-chart-text`, `aq-chart-value`, `aq-cluster-cell`, `aq-done-check`, `aq-export-head`, `aq-group-row`, `aq-import__part/__years`, `aq-preview-wrap`, `aq-step__no`, `aq-stepper__compact-text`
- inline `style={{}}` 29 จุด (เช่น `--a` ของ spark `cycles/[id]/page.tsx:336`, ความกว้าง skeleton, `animationDuration` ของ toast)
- เอกสาร design เดิม: `.agents/decisions/ADR-UI-001-redesign.md` + `ui/{tokens,components,pages}.md` (ชื่อ C0–C24 / P1–P20 ในคอมเมนต์ CSS อ้างไฟล์เหล่านี้)

### F3. Selector ที่เทสต์พึ่ง (**เปลี่ยน markup ต้องแก้เทสต์คู่กัน**)
**Playwright** — `e2e/*.spec.ts` 5 ไฟล์ (flows-a, flows-b, regress-u1b, regress-u3fix, ui-u) + `e2e/helpers.ts`; `playwright.config.ts`: build + `next start` port 3917, locale th-TH, Desktop Chrome, workers 4
- **data-testid** (~115 ตัวที่เทสต์อ้าง) — หลัก: `login-username/password/submit`, `nav-user`, `nav-menu`, `nav-bell`, `nav-home/review/cycles/curriculum/metrics`, `logout`, `sar-editor`, `section-submit/approve/return`, `readonly-reason`, `return-reason`, `narrative-th/en` (30 ครั้ง), `tab-th/en`, `save-manual`, `save-conflict`, `conflict-reload`, `linked-evidence`, `link-select/btn`, `ev-table/new/title/text/cycle/file/submit/search/form/links/edit`, `ev-f-reqs-input`/`ev-f-req-opt-*`/`ev-f-req-chip-*`, `cycle-new/year/submit`, `cycles-table`, `cycle-actions`, `cycle-to-<status>`, `heatmap`, `heat-<req>`, `gap-list`, `gap-filter`, `lock-banner`, `owner-<req>`, `bulk-owner/apply-*`, `todo-<kind>-<n>`, `mywork-*`, `mywork-table`, `noti-list`, `home-add-evidence`, `approve-*`, `assess-*`, `crit-*`, `verdict-*`, `self-*`, `rating-panel`, `rated-count`, `import-panel`, `cohort-*`, `metric-<code>-<yr>`, `user-new/form`, `nu-*`, `tab-users/audit`, `export-status`, `export-sar-docx`, `x-cycle`, `cur-tab-prereq`, `cur-panel-prereq`, `app-loader`, `state-error`, `session-lost(-login)`, `shell-lost`, `readonly-banner`, `pii-banner`, `ai-draft(-text)`, `postcheck`, `review-history`, `sidetab-history`, `evidence-unchanged`, `probe-select`
- **class / id / โครง element ที่ผูกตรง**:
  - `#app-sidebar` + `toHaveClass(/is-open/)` (`ui-u.spec.ts:330,334`)
  - `getByTestId(nav).locator('.aq-count')` badge เมนู (`regress-u1b.spec.ts:12`)
  - `textarea.aq-textarea--prose` + นับตัวที่มองเห็น (ซ่อนด้วย attribute `hidden`) (`regress-u3fix.spec.ts:35-36`)
  - `a.aq-skip` เป็น focus แรก ข้อความ "ข้ามไปเนื้อหาหลัก" → Enter ไป `#main` (`ui-u.spec.ts:298-307,473`)
  - `text.aq-chart-label` (`ui-u.spec.ts:442`), `[data-testid="cur-panel-prereq"] svg text` (`:454`)
  - `select[data-testid^="owner-"]` = 53 (`flows-a.spec.ts:51`), `[data-testid^="heat-"]:not([data-testid="heatmap"])` = 53 (`:48`)
  - `tbody tr`, `td:first-child strong/a`, `td.nth(1)`, `li a strong` ใน `linked-evidence`, `locator('summary')`, `dlg.locator('textarea')`, `locator('h1')`, `locator('main')`, `locator('option')`
  - audit ขนาดใน `ui-u.spec.ts:22-25,85-95` ใช้ **ชื่อ class เป็นตัวกำหนดขนาดขั้นต่ำ**: XS ≥13px = `aq-pill aq-badge aq-count aq-heat-cell__label aq-chart-label aq-kbd`; SM ≥14px = `aq-help aq-meta aq-crumbs aq-btn-reason aq-field-error aq-saved aq-nav-group aq-kpi__label aq-step__meta aq-legend aq-progress__label aq-term__body aq-heat-label` + `th,caption,figcaption`; อื่น ๆ ≥16px. target: `button, a.aq-btn, input, select, [role=tab], .aq-nav-item` ≥44px (40 ได้ถ้า `.aq-btn-compact` หรือ `.aq-matrix select` ที่ 1440), `.aq-term__btn, .aq-chip__remove` ≥32
- **role / ข้อความ**: `getByRole('dialog')` + ปุ่ม `ยืนยัน`, `รับทราบ`, `กลับไปแก้`, `ยืนยันออกโดยไม่บันทึก`, `กลับไปคัดลอกข้อความ`, `ยืนยันไปหน้าเข้าสู่ระบบ`, `ยืนยันส่งกลับแก้ไข`, `คัดลอกข้อความของฉันก่อน`, `ยืนยันโหลดฉบับล่าสุด`; `getByRole('button',{name:/แสดงทั้งหมด/})`; `getByRole('link',{name:'แดชบอร์ดรอบ'|'ไปหน้ารอบประเมิน'})`; `getByRole('heading',{level:1})`; `getByRole('tab')`; `getByLabel('บทบาท'|'ขอบเขต')`; ข้อความ `ส่งกลับแก้ไข`, `(รวม N งาน)`, `ออกจากระบบจากแท็บอื่นแล้ว…`, `เปิดข้อถัดไปในคิว`, `ไม่พบข้อนี้`; `nav-bell` aria-label `/ที่ยังไม่อ่าน [1-9]/`; `narrative-th` มี attribute `readonly`
- **เทสต์ design โดยตรง (`ui-u.spec.ts`)**: ไม่มี h-scroll ที่ 390/768/1440 และที่ fontScale 125% (ตั้งผ่าน `localStorage.aunqa_ui_prefs`, เช็ก html font-size 20px); focus ring = **CSS `outline`** ≥2px contrast ≥3 กับพื้นจริง (`:237-263`); ไม่มี keyboard trap; drawer Esc คืน focus `nav-menu`; reduced-motion ไม่มี animation running >10ms แต่ AppLoader ต้องมี animation เมื่อไม่ลด motion; **AC-09: body font-family ต้องขึ้นต้น `Sarabun` และ FontFace ที่ loaded = `['Sarabun']` เท่านั้น** (`:386-401`); grep ห้าม `Cormorant|DM Sans` และห้าม emoji ใน `app/ components/ context/`

**Vitest** — `tests/*.test.ts` 24 ไฟล์ (~437 `it`), env node (`vitest.config.ts`) ทดสอบ `lib/` เกือบทั้งหมด ไม่แตะ markup. ข้อยกเว้น:
- `tests/contrast.test.ts` อ่าน `app/globals.css` (`:11`) → parse `:root`, เทียบ hex 27 ตัว **ต้องตรงค่าล็อกเดิม** (`:70-77`), contrast 44 คู่ตาม `tokens.md` T1.3, กฎ selector: ต้องมี `.aq-on-dark .aq-btn-primary` ใช้พื้น `--c-surface` (`:104-111`), ห้าม `color: var(--c-accent)` นอก `aq-on-dark|cta-band|footer|aq-auth__brand|aq-hero__em` (`:124-127`) → **เปลี่ยน palette/ย้ายไฟล์ = ล้มแน่ ต้องเขียนใหม่ให้อ่าน token ชุดใหม่ (light + dark)**
- `tests/ai-route.test.ts`, `tests/phase-c-review-fixes.test.ts` import `@/app/api/ai/route` (ไม่ใช่ UI แต่อยู่ใต้ `app/` — ห้ามย้าย)

### F4. Dependency UI ปัจจุบัน
- ฟอนต์: Sarabun 400/600/700 จาก Google Fonts `<link>` (`app/layout.tsx:24-29`); fallback Leelawadee UI/Tahoma/Noto Sans Thai (`globals.css:41`); `code/kbd/pre` ก็ใช้ Sarabun (`globals.css:136`)
- ไอคอน: `components/ui/Icon.tsx` SVG inline (path จาก Lucide ISC, ~40 ชื่อ), ไม่มี package — ถ้าเปลี่ยนเป็น `lucide-react` ต้อง map ชื่อ (`calendar-cycle`, `inbox-check` วาดเอง)
- Chart: ไม่มี lib (TrendChart / ProgressRing / prereq = SVG เขียนเอง)
- Dialog / Toast / Popover / Tabs / Drawer / Combobox: เขียนเองทั้งหมด (ไม่มี Radix)
- ไม่มี: Tailwind, PostCSS config, `clsx`/`cva`/`tailwind-merge`, `next-themes`, CSS modules

### F5. จุดเสี่ยงสำหรับการย้ายไป Tailwind + shadcn/ui
1. **Preflight ทับ base เดิม** — reset `h1-h6`, `a` (ไม่มีขีดเส้นใต้/สี), `button`, `img` → ถ้าสองระบบอยู่คู่กันระหว่างย้ายทีละหน้า หน้าที่ยังไม่ย้ายจะเพี้ยน; ต้องตัดสิน big-bang vs ปิด preflight ช่วงเปลี่ยนผ่าน
2. **attribute `hidden`** — narrative textarea TH/EN ซ่อนด้วย `hidden` (`SarWorkspace.tsx:502,509`) พึ่ง `[hidden]{display:none!important}`; ใส่ utility `block/flex` ร่วม → โผล่ทั้งคู่ → E2E `regress-u3fix` ล้ม
3. **shadcn Select/Checkbox/Tabs = Radix ไม่ใช่ native** — E2E `selectOption` 16 จุด, `.check()`, `role=tab` บน `<button>`; AppShell ดัก session-lost ด้วย selector ตายตัว → ใช้หน้าตาสไตล์ shadcn บน native element หรือแก้เทสต์ + AppShell คู่กัน
4. **Radix portal** (Dialog/Popover/Toast render ที่ body) — ต้องคง role=dialog + ชื่อปุ่มไทยเดิม + focus trap; `dom-translate` อาจชนกับ node ใน portal
5. **AC-09 ฟอนต์** ล็อกว่าโหลดได้แค่ Sarabun — ฟอนต์ SaaS (Inter/Geist + ไทย) ต้องแก้ ADR + เทสต์ `ui-u.spec.ts:386-401`; ถ้าย้ายไป `next/font` ชื่อ family จะเป็น `__Sarabun_xxx` → regex `/^Sarabun\b/` ล้ม
6. **contrast.test.ts ผูก hex + ชื่อ class** — palette ใหม่ + dark mode ต้องเขียนเทสต์ contrast ใหม่ (light/dark) ไม่ใช่ลบ
7. **Focus ring** — เทสต์อ่าน `outlineStyle/outlineWidth` จริง; shadcn default ใช้ `focus-visible:ring-*` (box-shadow) → ล้ม; ต้องใช้ `outline` utilities
8. **Font scale** — `html{font-size:var(--user-scale)}`; px ตายตัว (`text-[13px]`, `h-[44px]`) ไม่ขยาย → ใช้ rem; คงขั้นต่ำ 13/14/16px และ target 44/40/32
9. **Size audit อิงชื่อ class `aq-*`** — ลบ `aq-meta`, `aq-help`, `aq-badge`… แล้วข้อความ 13–14px จะถูกตัดสินว่าต้อง ≥16 → ล้ม; ต้องคง class marker หรือแก้รายการ XS/SM ในเทสต์
10. **Dynamic class names** (`aq-badge-${tone}` ฯลฯ) — แปลงเป็น Tailwind ต้องใช้ map object/cva ไม่ใช่ประกอบ string
11. **Breakpoints 480/768/1024/1280** ≠ Tailwind default — ตั้ง `screens` ให้ตรง หรือยอมรับ layout เปลี่ยน (เทสต์ h-scroll ที่ 390/768/1440)
12. **Dark mode ใหม่** — ตอนนี้ล็อก light (`layout.tsx:16-18`, ADR-UI-001 T11); SVG chart/heatmap/celebrate ต้องใช้สีผ่าน CSS variable; prefs เดิม `aunqa_ui_prefs` มีแค่ fontScale/effects — เพิ่ม theme ต้องไม่ทำ key เดิมพัง และกัน flash ตอนโหลด (ตอนนี้ PrefsInit ใช้ useEffect = กระพริบ 1 ครั้ง)
13. **Reduced motion** — กฎ global `*{animation-duration:.01ms!important}` ต้องคงไว้ (shadcn/tailwindcss-animate ใช้ keyframes) และ AppLoader ยังต้องมี animation เมื่อไม่ลด motion
14. **Sticky / z-index** — sidepanel sticky ใต้ topbar (`calc(var(--topbar-h)+…)`), z ชั้นเดิม (`--z-dialog` 1000, `--z-loader` 1100) ต้องสอดคล้อง z ของ Radix
15. **ขนาดงาน** — 16 หน้า + 26 component, ~1,000 การใช้ class `aq-*` ใน tsx; หนักสุด SarWorkspace (833) / curriculum (502) / cycles/[id] (489)

## Data Model — interfaces สำคัญ (lib/types.ts), localStorage keys ↔ store ที่เป็นเจ้าของ, field ส่วนบุคคล (PDPA)

### TS interfaces หลัก (`lib/types.ts`)
- `Role` (`:3`) = web_admin | school_admin | teacher | student | parent
- `User` (`:5-20`): username, **password** (hash/plaintext), role, name, **email**, emailVerified, school, code, class, childCode, childName, teacherId, createdAt, seeded
- `Session` (`:22-32`): username, role, name, school, code, childCode, childName, class, loginAt — เก็บ **sessionStorage**
- `Permissions` (`:34-39`): Record ต่อ role (teacher/student/parent/school_admin) — ไม่มี web_admin
- `StudentProfile` (`:45-67`), `TeacherProfile` (`:165-217`), `Assignment`/`TeacherAssignment`/`Submission` (`:99,250,239`), `AttendanceSession/Record/Report` (`:266-305`), `ClassInfo` (`:219`), `Notification` (`:137`), `ShopItem`, `LibraryBook`, `School`
- Interfaces ที่อยู่ใน store (ไม่อยู่ `types.ts`): `AcademicYear/GradeLevel/Classroom/ScoreComponent/Course/ScoreEntry` (`academic.store.ts:29-110`), `ScheduleSlot` (`schedule.store.ts:99`), `StoredAssignment/StoredSubmission` (`assignments.store.ts:22,34`), `WalletTxn/WalletData` (`wallet.store.ts:19-30`), `Reservation/CatalogBook` (`booking.store.ts:18,27`), `EbookRental` (`ebook.store.ts:19`), `TutorOffer/TutorBooking` (`tutoring.store.ts:42,76`), `Material/Announcement` (`materials.store.ts:18,33`), `FeedItem` (`feed.store.ts:27`), `TeacherRating` (`ratings.store.ts:15`)
- ข้อสังเกต: `AttendanceRecord.studentId` ใน types ถูกใช้เก็บ student **code** (`attendance.store.ts:212`); `Submission` (types `:239`) ไม่ตรงกับ `StoredSubmission` (store `:22-31`) — สอง shape คู่ขนาน

### localStorage / sessionStorage keys (de-facto DB)
| key | store เจ้าของ | เนื้อหา (หลักฐาน) |
|---|---|---|
| `eduflow_users` | `auth.api.ts:23` | `User[]` รวม password hash |
| `eduflow_session` (**sessionStorage**) | `auth.api.ts:24,58-76` | `Session` |
| `eduflow_attempts` | `auth.api.ts:25,102-130` | `{[username]:{count,lockUntil}}` (5 ครั้ง/ล็อก 5 นาที `:29-30`) |
| `eduflow_permissions`, `eduflow_perm_v2` | `auth.api.ts:26,167` | `Permissions`; flag migration |
| `eduflow_webadmin_log` | `auth.api.ts:27,138-146` | admins + loginHistory |
| `eduflow_activity_log` | `activity.log.ts:10` | audit log (admin/teacher/system) |
| `eduflow_academic` | `academic.store.ts:26` | `{years,gradeLevels,classrooms,courses,scores,roster...}` |
| `eduflow_schedule`, `eduflow_schedule_log`, `eduflow_lunch_config` | `schedule.store.ts:25,26,56` | slots / log / พักเที่ยง |
| `eduflow_subject_catalog` | `subject-catalog.store.ts:20` | คลังวิชา (หน่วยกิต) |
| `eduflow_assessments` | `assessment.store.ts:11` | ผลประเมินคุณลักษณะ/กิจกรรม ต่อ studentCode |
| `eduflow_assignments` | `assignments.store.ts:18` | การบ้าน + submissions |
| `eduflow_shared_notifs` | `assignments.store.ts:19,127-137` | แจ้งเตือนทุก audience รวม (cap 50 รายการ `:134`) |
| `eduflow_attendance` | `attendance.store.ts:20` | `{sessions,records,reports}` |
| `eduflow_wallet` | `wallet.store.ts:15` | `{balances[code],txns[code]}` (เก็บ 50 รายการล่าสุด `:54`) |
| `eduflow_booking`, `eduflow_ebook_rentals` | `booking.store.ts:16`, `ebook.store.ts:17` | catalog+reservations / rentals |
| `eduflow_tutor_offers`, `eduflow_tutor_bookings` | `tutoring.store.ts:24-25` | สอนพิเศษ |
| `eduflow_materials`, `eduflow_feed_v4` | `materials.store.ts:14`, `feed.store.ts:12` | สื่อ+ประกาศ / ข่าว (รูปเป็น data URL `feed.store.ts:159`) |
| `eduflow_teacher_ratings`, `eduflow_rated_periods` | `ratings.store.ts:12-13` | คะแนนครู (ไม่ผูกตัวตน) |
| `eduflow_teacher_profiles` | `teacher-profile.store.ts:15` | ประวัติครูเต็ม |
| `eduflow_doc_settings` | `components/teacher/DocSettingsView.tsx:14` | ตั้งค่าเอกสาร ปพ. |
| `eduflow_lang_pages` | `context/LangContext.tsx:19` | ภาษาตามหน้า |
| `eduflow_lib_done` | `student.api.ts:228` | หนังสือที่อ่านแล้ว |
| `eduflow_avatar_<studentId>` | `student/views/ProfileView.tsx:18` | รูปโปรไฟล์ (base64) |

### Notification audience (ใน `eduflow_shared_notifs`)
`student:<code>`, `teacher:<TEACHERID uppercase>`, `parent:<childCode>` — id สร้างด้วย `nextNotifId()` (`assignments.store.ts:122-126`).

### field ข้อมูลส่วนบุคคล (PDPA)
- **User**: `password` (hash), `email`, `name`, `childCode/childName` (`types.ts:5-20`)
- **StudentProfile**: `dob`, `bloodType` (สุขภาพ), `address`, `phone`, `email`, `lineId`, `religion`, `nationality`, **`citizenId`** (`:63`), ข้อมูลบิดา/มารดา (name/phone/occupation), `emergencyContact` (`:45-67`)
- **TeacherProfile**: `citizenId`, `dob`, `addressCurrent/Registered`, `phone`, `email`, `lineId`, `emergency*`, **สุขภาพ** `congenitalDisease/drugAllergy/foodAllergy/healthNote`, `maritalStatus`, `religion`, `teacherLicense` (`types.ts:165-217`)
- **Mock hardcode เลขบัตร ปชช.**: `STUDENT_PROFILE_MOCK.citizenId` (`mock-data/index.ts:127`), `STUDENT_CITIZEN_REGISTRY` (`:138-142`) — ถูก bundle ลง client ทุกคน
- ข้อมูลผลการเรียน/การเข้าเรียน/ยอดเงิน/ธุรกรรม ของเด็ก (ผูกด้วย student code) ใน `eduflow_academic`, `eduflow_attendance`, `eduflow_wallet`
- ข้อมูลเด็ก (ผู้เยาว์) → ความเสี่ยง PDPA สูงขึ้น

## Flow สำคัญ — ทีละข้อ (ใช้เป็นต้นแบบ sequence/activity diagram)

**1. Login**
1. `LoginForm.tsx:47` เรียก `loginUser(username,password)` (`auth.api.ts:193`)
2. ตรวจ format `^[a-zA-Z0-9]{1,8}$` ทั้ง username/password (`:79-81,194`) → `error:'format'`
3. ตรวจ lock (`getLockUntil` `:113`) → `locked`
4. ค้น user ใน `eduflow_users`; `verifyPassword` (SHA-256 + salt คงที่ `eduflow::`, `:88-98`; รองรับ plaintext เก่า)
5. ผิด → `recordFail` (ครบ 5 → ล็อก 5 นาที `:118-124`) → `invalid`+remaining
6. `emailVerified===false` → `unverified` (`:210`) → UI แสดงปุ่มยืนยัน (`LoginForm.tsx:60,125`)
7. ถูก: upgrade plaintext→hash (`:213-217`), `clearAttempts`, `setSession` (sessionStorage), ถ้า web_admin → `logWebAdminLogin` (`:221`)
8. UI: loader 1.6 วิ → `refresh()` → `router.push` student→`/student`, teacher→`/teacher`, อื่น ๆ→`/dashboard` (`LoginForm.tsx:51-56`)

**Logout**: `AuthContext.logout` (`:331-346`): แสดง `LogoutLoader` 1.3 วิ → `router.push('/')` → 450ms → `clearSession()`.
**Boot**: `AuthProvider` useEffect (`AuthContext.tsx:348-359`) เรียก `initAuth()` + seed demo ทั้งหมด (academics/cohort/fullGrades/rosterGrades/assessments) ทุกครั้งที่โหลดแอป แล้ว `refresh()`.

**2. Register + email verify**
1. `RegisterForm.tsx:34` → `registerUser` (`auth.api.ts:237`): role ต้องอยู่ใน `['teacher','student','parent','school_admin']` (`:244`, บล็อก web_admin); validate ชื่อ/อีเมล/username/password(1–8 ตัว)/confirm/ซ้ำ username+email
2. push user ใหม่ `emailVerified:false`, password hash (`:255-265`)
3. **ไม่มีการส่งอีเมลจริง**: `RegisterForm.tsx:40` เรียก `verifyEmail(username)` ทันที (จำลองการกดลิงก์ `auth.api.ts:274`) → `/login` (`:42`). ปุ่มยืนยันใน LoginForm ก็เรียก `verifyEmail` ตรง ๆ (`:125`) — ใครก็ยืนยันบัญชีใครก็ได้ที่รู้ username
4. ผู้ใช้ที่สมัครเองไม่มี `code`/`class`/`childCode` → นักเรียนใหม่ไม่ผูกห้อง/รหัส; ต้องให้ admin เพิ่ม (`addUserAccount` `admin.api.ts:18`)

**3. ตารางสอน → ห้อง → นักเรียน**
1. admin สร้างปีการศึกษา/ชั้น/ห้อง (`createAcademicYear :511`, `createGradeLevel :559`, `createClassroom :588`) ผ่าน `AcademicManager` (school_admin ที่ `/dashboard`, web_admin ที่ `/admin/academic`, ครูที่มีสิทธิ์ `manageAcademic` ใน `AcademicStructureView.tsx:27`)
2. ครูที่มี `manageTeachSchedule` เพิ่มคาบ `addSlot` (`schedule.store.ts:409`): เช็คสิทธิ์ `canManageSchedule` (`:223`) → หา classroom context → `findConflict` (ห้อง/ครูชนกัน `:349`) → เก็บ slot + `writeLog`
3. ครูเปิด Gradebook: `syncTeacherCourses(classroomId, classes, teacher)` (`GradebookView.tsx:58` → `academic.store.ts:639`) สร้าง `Course` ตามตารางสอน (สัดส่วนมาตรฐาน เก็บ60/กลาง20/ปลาย20, หน่วยกิตจากคลังวิชา)
4. นักเรียน ↔ ห้อง: `addStudentToClassroom` (`:726`), `getClassroomStudents` (`:699`); `getStudentRoomId`/`getStudentClassIds` (`class-resolver.ts:52-64`) วนทุกห้อง (O(n)) หา classId ของนักเรียน → ใช้กรอง ตารางเรียน/การบ้าน/สื่อ
5. `getTeacherClasses` (`teacher.api.ts:40`) รวม mock + ตารางจริง; ครู demo แยกด้วย `isDemoTeacher` (`:27`)

**4. บันทึกคะแนน → เกรด/GPA**
1. `GradebookView.tsx:82` `saveScores(courseId, next)` ทุกครั้งที่แก้ตัวเลข (auto-save) — ตรวจ `canManageScores` (`academic.store.ts:487`): web_admin ผ่านเสมอ; teacher ต้องเป็น `ownerUsername` (หรือชื่อตรงสำหรับ legacy); อื่น ๆ ปฏิเสธ
2. `calcTotal` (รวมเฉพาะหัวข้อที่ไม่ `excludeFromTotal` `:778`) → `calcPercent` (`:793`) → `calcGrade` ตามเกณฑ์ สพฐ. 80=4 … 50=1, <50=0 (`:818-828`); `resolveGrade` (`:806`) ให้สัญลักษณ์ผ/มผ/ร/มส/ขส/ขร มาก่อน, วิชา `gradingMode:'symbol'` → '—'
3. `getStudentGrades(code)` (`:872`) รวมทุก course ที่นักเรียนมี entry → `StudentGradeRow` (มี credit)
4. `calcGPA(rows)` (`:905`) = Σ(เกรด×หน่วยกิต)/Σหน่วยกิต เฉพาะวิชาคิดเกรด; หน่วยกิตไม่พบ→1.0
5. แสดงผลที่ `student/views/GradesView.tsx:23-26`, `dashboard/ParentDashboard.tsx:52,73`, `StudentDocsView.tsx:27`; เอกสาร ปพ. ที่ `teacher/Report*`, export Excel `lib/utils/excel-export.ts`
6. ผลประเมินแยก `assessment.store.ts` (`saveAssessment :44`)

**5. Wallet topup / shop**
- Topup ผู้ปกครอง: `ParentDashboard.tsx:58-67` `startPromptPay` → แสดง QR (จำลอง) → `simulatePaid` setTimeout → `addWalletFunds(childCode, amt, 'topup-promptpay', ...)` (`wallet.store.ts:62`) → อัปเดต balance+txn → `pushSharedNotification('student:<code>')`. **ไม่มี payment gateway จริง; ไม่มีการตรวจ role ใน addWalletFunds**
- Topup web admin: `UserManager.tsx:44` → `adminDirectTopup` (`wallet.store.ts:86`) ตรวจ citizenId+ชื่อกับ `STUDENT_CITIZEN_REGISTRY` (mock 3 รายการ) → `addWalletFunds(...'topup-admin')` + `logActivity`
- Shop: `ShopView.tsx:77` `placeOrder` (`student.api.ts:205`) → `deductWalletFunds` (`wallet.store.ts:75`): ยอดไม่พอ → `{ok:false}` ไม่หัก. ไม่มีตาราง orders. สินค้ามาจาก `SHOP_ITEMS_MOCK`.
- seed: นักเรียน `10021` มียอด 250 (`wallet.store.ts:36-41`)

**6. Homework submit**
1. ครู `createAssignmentStore` (`assignments.store.ts:166`) → `eduflow_assignments` (ผูก classId; มี `notifyClass` ส่งแจ้งเตือนนักเรียนทั้งห้อง ตามคอมเมนต์ `:117`)
2. นักเรียน `HomeworkView.tsx:84` `submitAssignment` → `submitAssignmentStore` (`:272`): เก็บ submission (ไฟล์เก็บแค่ชื่อ/ขนาด `fileName/fileSize` — **ไม่มีตัวไฟล์จริง**), push แจ้งเตือน `teacher:<id>` ชนิด `assignment_submitted`
3. ครูตรวจ `gradeSubmissionStore` (`:192`) → status `graded` + แจ้งเตือน `student:<code>` ชนิด `grade`
4. นักเรียนเห็นรายการจาก `getStudentAssignmentsStore` (`:240`) ผสาน `STUDENT_ASSIGNMENTS_MOCK` สำหรับบัญชี demo (`student.api.ts:155`)

**7. Attendance QR**
1. ครู `AttendanceView.tsx:59` `createAttendanceSession` (`attendance.store.ts:55`): qrCode = `ATT-<base36 time>-<Math.random 5 ตัว>`, อายุ 15 นาที (`:22`); วาด QR ด้วยไลบรารี `qrcode` (`AttendanceView.tsx:51`)
2. นักเรียน `AttendanceScanView.tsx:26-33`: **พิมพ์รหัส** (input) → `validateQR` (`:149`) → `checkIn(sessionId, code, name)` (`:200`): กัน expired/duplicate; ≤10 นาทีแรก=on-time else late (`:23,211`)
3. push แจ้งเตือน `parent:<studentCode>` (`:219-225`)
4. ครู `submitSessionReport` (`:99`): สรุป present/late/absent (absent = total − records) → `AttendanceReport` + แจ้งเตือนครู
5. ฝั่งนักเรียน `getStudentAttendance` (`student.api.ts:168`) overlay record จริงทับ mock

**8. Booking / E-book**
- จองหนังสือห้องสมุด: `BookingView.tsx:46` → `reserveBook` (`booking.store.ts:95`): ready ถ้า `availableCopies>0` else waiting (คิว) + แจ้งเตือน; `cancelReservation`, `queuePosition`
- เช่า e-book: `EbookView.tsx:72` → `rentEbook` (`ebook.store.ts:85`): ไม่ซ้ำถ้ายัง active, `expiresAt = now+days`, **ไม่คิดเงิน/ไม่ผ่าน wallet**; `EbookView` refresh ทุก 30 วิ (`:63`); มี rank ผู้อ่าน (`READER_RANKS :44`)
- Tutoring: ครู `createOffer` (`tutoring.store.ts:129`, perm `offerTutoring`), นักเรียน `bookTutoring` (`:198`, perm `bookTutoring` ตรวจที่ `student/views/TutoringView.tsx:29`)

**9. Notifications**
- แหล่ง: `pushSharedNotification(audience,type,title,body)` (`assignments.store.ts:127`) — เรียกจาก wallet, attendance, ebook, booking, assignments
- อ่าน: student `getNotifications` (`student.api.ts:233`: shared + mock เฉพาะ demo, TTL 3 วัน), teacher `getTeacherNotifications` (`teacher.api.ts:174`), parent `getSharedNotifications('parent:<childCode>')` (`ParentDashboard.tsx:53`)
- Real-time: ฟัง `window 'storage'` + `'focus'` ใน `StudentLayout.tsx:157-165` และ `TeacherLayout.tsx:124-132` (ข้ามแท็บเท่านั้น; ไม่มี websocket). อ่านแล้ว `markSharedNotificationRead` (`:144`).
- store เดียวเก็บทุก audience — ผู้ใช้ที่ใช้เครื่องเดียวกันเห็น data ของกัน (ผ่าน devtools)

## บทบาทผู้ใช้และสิทธิ์ — role → หน้า → permission keys

กลไก: `hasPermission(key, role?)` (`permissions.ts:29-36`): web_admin ผ่านทุกอย่าง; role อื่นอ่าน `eduflow_permissions` merge กับ `DEFAULT_PERMISSIONS` (`mock-data/index.ts:19-43`). web_admin แก้ผ่าน `/admin/permissions` → `updatePermission` (`admin.api.ts:50`, log ลง activity). `requirePermission` (`permissions.ts:39`) **ไม่มีผู้เรียกใช้ในโค้ด** (grep ไม่พบ).

| role | หน้า | permission keys (ค่า default) | บังคับใช้จริงที่ไหน |
|---|---|---|---|
| web_admin | `/admin/*` | ทุกอย่าง (bypass) | `AdminShell.tsx:28`; `canManageScores` bypass (`academic.store.ts:491`) |
| school_admin | `/dashboard` (AcademicManager + SchoolAdminContent) | manageTeachers✔ manageStudents✔ manageParents✘ manageAcademic✔ viewAllReports✔ exportData✔ broadcast✔ viewLogs✘ viewTeachSchedule✔ manageTeachSchedule✔ | แทบไม่ได้บังคับใน UI (grep `hasPermission` ไม่พบใน DashboardLayout) — เนื้อหาใช้ role อย่างเดียว; `schedule.store` ใช้ viewTeachSchedule/manageTeachSchedule (`:219,227`) |
| teacher | `/teacher` (15 view, `TeacherView`) | attendanceQR, editAttendance, viewReports, assignments, gradebook, gradeExport, materials, announcements, exportData, viewTeachSchedule, manageTeachSchedule, offerTutoring, manageSubjects, manageAcademic (ทั้งหมด ✔) | เมนู `TeacherLayout.tsx:165`; ปุ่มด่วน `TeacherOverview.tsx:83,270`; `AcademicStructureView.tsx:27`; `TutoringView.tsx:34`; store: `canManageSubjects` (`subject-catalog.store.ts:86`), `canManageSchedule`, `canManageScores` (ตามความเป็นเจ้าของวิชา) |
| student | `/student` (tabs: dashboard/schedule/homework/grades/shop/topup/library/booking/ebook/tutoring/profile/docs/QR) | checkin, viewSchedule, submitHomework, viewGrades, downloadReports, shop, library, rateTeacher, viewOwnHistory, bookTutoring (✔ ทั้งหมด) | **บังคับจริงเฉพาะ `bookTutoring`** (`student/views/TutoringView.tsx:29`); key อื่นของ student เป็นแค่ label ใน UI admin |
| parent | `/dashboard` → `ParentDashboard` (เกรด+GPA, wallet topup, แจ้งเตือน) | viewChildStatus✔ viewChildGrades✔ viewHistory✔ notifications✔ contactTeacher✔ realtimeTracking✘ | **ไม่ได้บังคับ** (ไม่มี hasPermission ใน ParentDashboard); ข้อมูลลูกอ้างจาก `session.childCode` (`DashboardLayout.tsx:60`) |

ข้อสังเกต: `teacher.editAttendance`, `announcements`, `exportData`, ฯลฯ ถูกนิยามแต่ผู้ตรวจในโค้ดที่ grep ได้มีเพียงรายการที่ระบุในคอลัมน์ "บังคับใช้จริง" (ผ่าน `hasPermission` + nav perm: manageAcademic, manageSubjects, manageTeachSchedule, viewTeachSchedule, gradebook, gradeExport, attendanceQR, viewReports, assignments, materials, offerTutoring).

## External services / AI module

- **ไม่มี AI module** และไม่มีการเรียก API ภายนอกใดในโค้ด (grep `fetch(`, openai, anthropic ใน `lib components app context` ไม่พบ)
- ภายนอกเพียง: Google Fonts (`app/layout.tsx:18-22`); ไลบรารี client `qrcode` (QR เช็คชื่อ), `exceljs` (export `lib/utils/excel-export.ts`)
- จำลอง/ยังไม่ต่อ: ส่งอีเมลยืนยัน (`auth.api.ts:269-273` TODO Resend/Nodemailer), PromptPay/payment gateway (`ParentDashboard.tsx:64` TODO webhook), file storage การบ้าน (`assignments.store.ts:30`), PostgreSQL/Prisma (`lib/api/index.ts:1-10`), next-auth/JWT (`auth.api.ts:57`, `AuthContext.tsx:349`)
- `.claude/mods/caveman/*` = เครื่องมือ Claude Code ของทีม ไม่เกี่ยวกับแอป

## จุดเสี่ยง & หนี้ทางเทคนิค

**ความปลอดภัย (สูง)**
1. **Auth/authorization ฝั่ง client ทั้งหมด**: session เป็น JSON ใน sessionStorage แก้ได้ (`auth.api.ts:58-72`); guard ด้วย `useEffect` + `router.push` (`AdminShell.tsx:25-29`) — ไม่มี middleware/server; ใครแก้ session เป็น `role:'web_admin'` ก็เข้า `/admin` ได้ และ `hasPermission`/`canManageScores` ตัดสินจาก session เดียวกัน. `permissions.ts:7-8` ยอมรับเองว่าเป็นแค่ซ่อน UI.
2. **รหัสผ่าน/เครดิต**: SEEDED_USERS มีรหัสผ่าน plaintext ใน source รวม `webadmin/Admin123` (`mock-data/index.ts:10-15`) และ bundle ไปที่ client; hash = SHA-256 + salt คงที่ ไม่ใช่ bcrypt/KDF (`auth.api.ts:88-92`); นโยบายรหัสผ่าน 1–8 ตัวอักษร/ตัวเลข (`:79-81`) อ่อนมาก; lockout เก็บใน localStorage ลบทิ้งได้ (`:102-130`); `users` ทั้งก้อนรวม hash อ่านได้จาก localStorage.
3. **การยืนยันอีเมลปลอม**: สมัครแล้วยืนยันเองอัตโนมัติ (`RegisterForm.tsx:40`) และ `verifyEmail(username)` ไม่ตรวจ token (`auth.api.ts:274`). สมัครเอง role `school_admin` ได้ (`:244`) โดยไม่มีการอนุมัติ.
4. **เงิน**: `addWalletFunds` ไม่ตรวจ role/ที่มา (`wallet.store.ts:62`) — ผู้ใช้ใดก็เติมเงินผ่าน console ได้; `STUDENT_CITIZEN_REGISTRY` ที่ใช้ยืนยัน admin topup อยู่ใน client bundle (`mock-data/index.ts:138`) และมีแค่ 3 นักเรียน (นักเรียนใหม่เติมโดย admin ไม่ได้).
5. **PDPA**: เลขบัตร ปชช., ข้อมูลสุขภาพ, ที่อยู่, เบอร์โทร ของเด็ก/ครู เก็บแบบ plaintext ใน localStorage/ mock ใน bundle (`mock-data/index.ts:127`, `types.ts:63,180,197-200`); ไม่มี consent, retention, encryption, access log จริง (activity log แก้/ล้างได้ `activity.log.ts:34`).
6. **Cross-tenant**: ข้อมูลทุกโรงเรียน/ทุก role อยู่ใน key เดียวกันของ browser เดียว; shared notifs เป็น list เดียวกรองด้วย audience (`assignments.store.ts:139`).
7. ปุ่มยืนยันอีเมลใน login ใช้ได้กับ username ใดก็ได้ที่ใส่ (`LoginForm.tsx:125`).

**สถาปัตยกรรม / หนี้เทคนิค**
8. **ไม่มี backend/DB**: `lib/api/*` เป็น sync store บน localStorage ห่อด้วย `async` หลอก (เช่น `student.api.ts:155`); เสี่ยง quota ~5MB (feed เก็บรูป data URL `feed.store.ts:159`, avatar base64), ไม่มี transaction/concurrency (read-modify-write ทั้งก้อน เช่น `wallet.store.ts:63-70`, `assignments.store.ts:192-201`), ข้อมูลหายเมื่อเคลียร์ browser/เปลี่ยนเครื่อง, ใช้ร่วมกันไม่ได้ระหว่างผู้ใช้จริง ("real-time" ใช้ได้เฉพาะแท็บเดียวกัน browser เดียวกัน).
9. **ไม่มีเทสต์เลย** (git ls-files ไม่พบ test/spec; ไม่มี test script ใน `package.json:5-9`); มี logic คำนวณสำคัญ (เกรด/GPA/หน่วยกิต/ตรวจชนตาราง/เลื่อนชั้น) ที่ไม่มี regression guard — เคยมีบั๊ก (audit_2026-08-16 ใน memory).
10. **Seed/migration ทุกครั้งที่โหลด**: `AuthProvider` รัน seed 5 ตัว (`AuthContext.tsx:350-357`) บน main thread ทุก mount; migration แบบ flag (`eduflow_perm_v2` `auth.api.ts:167`); ไม่มี schema versioning ทั่วไป (มีแค่ `feed_v4`). JSON.parse ไม่มี try/catch ในหลาย store (`auth.api.ts:36,48,60`, `wallet.store.ts:33`, `attendance.store.ts:17`) → ข้อมูลเสียทำให้แอปพัง; ใช้ `storage-cache` เฉพาะบาง store (academic).
11. **mock กับ real ปนกัน**: ข้อมูล demo ผูกกับ student code `10021` (`student.api.ts:30-31`) และครู demo (`teacher.api.ts:27`); ปัญหา shape ซ้ำ (`Submission` vs `StoredSubmission`), `AttendanceRecord.studentId` เก็บ code, `Permissions` ไม่รวม web_admin; `getSystemStats` hardcode 847 โรงเรียน (`admin.api.ts:68`), `getSchoolAdminStats` hardcode ทั้งหมด (`:77-85`), `/schools` mock (`app/schools/page.tsx:135`).
12. **Performance**: `getStudentRoomId` วนทุกปี→ชั้น→ห้อง (`class-resolver.ts:35-60`); `academic.store.ts` 918 บรรทัดเป็น god-store; layout ใหญ่ (`TeacherLayout`/`StudentLayout`) คุม view ด้วย state ไม่ใช่ route (deep-link/back ไม่ทำงาน).
13. **Unused / dead**: `requirePermission` ไม่ถูกเรียก; permission keys หลายตัวไม่ถูกบังคับ (ดูหมวดสิทธิ์); `lib/api/index.ts` export แค่ 4 api (store อื่น import ตรง).
14. **Legacy SPA ซ้ำซ้อน**: `index.html`+`js/*` (~6,000 บรรทัด) มี logic auth/seed ซ้ำคล้ายกัน (`js/auth.js:39-48`) — ไม่มีเอกสารบอกว่ายังใช้หรือไม่; ควรยืนยันกับ owner. `package.json` ที่ root มีอยู่ (ไม่ได้อ่านเนื้อหา).
15. i18n แบบ `dom-translate` (แปล DOM) — เสี่ยงต่อ hydration/performance (ยังไม่ได้อ่านโค้ดละเอียด).
16. **ไม่ได้ตรวจในรอบนี้ (ช่องว่างความรู้)**: เนื้อหา `SchoolAdminContent`/`ContentView`/`LogsView`/`PermissionsManager`, `report-docs*.ts`, `i18n/*`, `schedule.store` ส่วน log, `tutoring.store` รายละเอียดการจอง, `legacy js/*` — ควรอ่านเพิ่มก่อนแก้โมดูลเหล่านี้.
