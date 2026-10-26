# SYSTEM MAP  (อัปเดต: 2026-10-26, ถึง commit b0fa21a — รอบ 2 ของ TASK-0002: โซน lib/ (โมดูล, Data Model, Flow, บทบาท, External, จุดเสี่ยง) อ่านใหม่ตรง HEAD; Routes & Pages + Frontend ยังเป็นฉบับ 732d06e)

> ที่มา: อ่านโค้ดจริงโดย code-reader. path อ้างอิงจาก `eduflow-next/` ยกเว้นระบุอย่างอื่น. ไม่ได้อ่านไฟล์ `.env`.
> **สถานะความสด:** หัวข้อ โมดูล / Data Model / Flow / บทบาท / External / จุดเสี่ยง = **ตรง HEAD b0fa21a** (อ่านใหม่ 2026-10-26, เนื้อหา EduFlow เดิมถูกแทนทั้งหมด). หัวข้อ "Routes & Pages" และ "Frontend (UI layer)" = ฉบับ 732d06e — โครง route ยังถูก แต่ S0–S2 ของ TASK-0002 เปลี่ยน markup/CSS ไปแล้ว (Tailwind + shadcn primitives ใน `components/ui/primitives/*`, `AppTopbar.tsx` ใหม่) ให้ถือส่วน F1–F5 เป็นประวัติ.
> **ไม่มีฐานข้อมูล/backend จริง:** ข้อมูลทั้งหมดอยู่ใน browser `localStorage` key `aunqa_*` (`lib/api/db.ts:7-37`) — ไม่มี migration/SQL ในโปรเจกต์; comment `TODO(PostgreSQL)` ในแต่ละ store คือแผนตารางในอนาคต (spec หัวข้อ 8). server มีแค่ `app/api/ai/route.ts`.
> dependencies (`package.json:13-38`): `next ^14.2`, `react ^18`, `docx`, `exceljs`, `next-themes`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`; dev: `tailwindcss 3.4.19`, `postcss`, `autoprefixer`, `vitest ^3.2.7`, `@playwright/test ^1.64.1`, `typescript ^5`. scripts: dev/build/start/lint/test (vitest)/e2e (playwright).

## โมดูล — ชื่อ / หน้าที่ / path หลัก

ทุก store เป็นฟังก์ชัน synchronous (ยกเว้นที่ต้อง hash/AI) รับ `actor: AppUser` เป็นอาร์กิวเมนต์แรก แล้วตรวจ `can()` เองที่ชั้น store; UI import ผ่าน facade `lib/api/index.ts` เท่านั้น (ไฟล์ `*.internal.ts` ไม่ export โดยเจตนา `index.ts:38`).

| โมดูล (spec) | หน้าที่ | path หลัก |
|---|---|---|
| Storage | key `aunqa_*`, `load/save`, `clearAllAunqa`, `AunqaError` (code ไทย) | `lib/api/db.ts`, `lib/api/storage-cache.ts` (แคช JSON.parse ตาม raw string) |
| Auth (M1) | login/lockout/hash, session localStorage idle 4 ชม./absolute 12 ชม., สร้าง/แก้ role/ลบผู้ใช้ | `lib/api/auth.api.ts`, `context/AuthContext.tsx` |
| RBAC | `can(user, action, scope)` ตาราง POLICY 8 role, multi-tenant ตาม universityId | `lib/api/rbac.ts:31-91` |
| Org (M1) | อ่าน university/faculty/programme/user (read-only; เขียนเฉพาะ seed) | `lib/api/org.store.ts` |
| Seed/Demo | seed ครั้งแรก + `resetDemo` | `lib/api/init.ts`, `lib/mock-data/aunqa/*` (ผู้ใช้ `org.ts:57-114`) |
| Framework (M2) | เกณฑ์ 8 / ข้อ 53 / metric definitions (global) | `lib/api/framework.ts`, `lib/mock-data/aunqa/framework.ts` |
| Cycle (M3) | สร้างรอบ (+53 section), มอบหมายข้อ/เกณฑ์, มอบหมายกรรมการ | `lib/api/cycle.store.ts` |
| Workflow (M10) | state machine รอบ/ข้อ, lock + snapshot hash, open revision, **แจ้งเตือนเปลี่ยนสถานะ** | `lib/api/workflow.ts` (ตาราง `:27-47`) |
| SAR (M8) | narrative TH/EN, PDCA, autosave+versions, citation, self-rating, comment | `lib/api/sar.store.ts` |
| Evidence (M5) | หลักฐาน + link หลายข้อ + version ไฟล์ + PII scan | `lib/api/evidence.store.ts`, `lib/utils/pii.ts` |
| Metrics (M6) | ค่าตัวชี้วัดรวม + import Excel | `lib/api/metrics.store.ts`, `lib/api/metrics-import.ts` |
| Curriculum (M4) | PLO/รายวิชา/CLO/map/วิธีสอน + gap | `lib/api/curriculum.store.ts`, `curriculum-gap.ts` |
| Gap/Dashboard (M9) | กฎ R1–R11 + readiness/heatmap (pure) | `lib/api/gap.ts`, `dashboard.ts` |
| Preflight / Todo | เช็กก่อนเปลี่ยนสถานะ; "สิ่งที่ต้องทำ" ต่อ role (อ่านอย่างเดียว) | `lib/api/preflight.ts`, `lib/api/todo.ts`, `lib/ui/todo.ts` |
| Action plan (M14) | action item open→in_progress→done→verified | `lib/api/action.store.ts` |
| Assessor (M12) | findings, คะแนนกรรมการ, verdict | `lib/api/assessor.store.ts`, `export-assessment.ts` |
| Notifications (M16) | in-app เท่านั้น; deadline คำนวณตอนอ่าน | `lib/api/notification.store.ts` |
| Audit (M17) | append-only, ดูตามสิทธิ์, CSV | `lib/api/audit.store.ts` |
| Export (M11) | .doc/.docx SAR, .xlsx | `lib/api/export*.ts` |
| AI | redact → provider (offline / Claude ผ่าน `/api/ai`) → post-check → AiRun | `lib/api/ai.service.ts`, `lib/api/ai/*`, `app/api/ai/route.ts` |
| UI helpers | ROLE_TH, `canAny`, `sectionHref`, status/tone map, prefs, glossary | `lib/ui/*` |
| i18n | dict ไทย/อังกฤษ + dom-translate | `lib/i18n/*`, `context/LangContext.tsx` |

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


## Data Model — interfaces (`lib/types.ts`) ↔ localStorage key (`lib/api/db.ts:7-37`), field ส่วนบุคคล

ไม่มี DB/migration — 1 key = 1 "ตาราง" (array JSON). ความสัมพันธ์เป็น id อ้างอิงเฉย ๆ ไม่มี FK/cascade.

| entity (types.ts) | key | field สำคัญ / ความสัมพันธ์ |
|---|---|---|
| `University` `:21` | `aunqa_universities` | `id, nameTh/En, emailDomain, aiEnabled` — `emailDomain` **ไม่ถูกใช้ที่ไหนเลย**; `aiEnabled` ใช้ใน `ai.service.ts:42,457` |
| `Faculty` `:22` | `aunqa_faculties` | `universityId` |
| `Programme` `:23-26` | `aunqa_programmes` | `universityId, facultyId, code, degreeLevel, curriculumYear` |
| `AppUser` `:28-31` | `aunqa_users` | `id ('u-<username>'), username, password ('sha256:…' หรือ plaintext seed), universityId, email, fullName, roles: RoleAssignment[]` — **ไม่มี** status/active/invitedAt/createdAt/lastLogin/locale |
| `RoleAssignment` `:27` | (ฝังใน user) | `{ role: RoleCode, scopeType: 'university'\|'faculty'\|'programme'\|'cycle', scopeId }` — 1 user มีหลาย role/หลาย scope ได้; super_admin ใช้ `scopeId:'*'` |
| `Session` `:230-237` | `aunqa_session` (localStorage) | `userId, username, fullName, universityId, roles (สำเนา ณ login), loginAt, lastActiveAt, expiresAt` |
| lockout | `aunqa_attempts` | `{ [usernameLower]: {count, lockUntil} }` (`auth.api.ts:39-46`) |
| `AssessmentCycle` `:52-69` | `aunqa_cycles` | `universityId, programmeId, academicYear, status (9 ค่า), submissionDue, revision, lockedAt, snapshotHash, createdBy` |
| `SarSection` `:73-90` | `aunqa_sections` | id = `${cycleId}::${requirementId}`; `ownerUserId, due, status (5 ค่า), lastAuthorId` |
| `Comment` `:105-110` / `ReviewEvent` `:112-115` / `Rating` `:98-103` / `SarSectionVersion` `:92-95` | `aunqa_comments` / `aunqa_review_events` / `aunqa_ratings` / `aunqa_section_versions` | ผูก `cycleId` + `targetId`(section id) |
| `Evidence` `:123-147` / `EvidenceLink` `:149-158` / `EvidenceFile` `:161-166` | `aunqa_evidence` / `aunqa_evidence_links` / `aunqa_files` | evidence ผูกหลายข้อผ่าน link (`requirementId, cycleId`) |
| `ActionItem` `:318-327` | `aunqa_action_items` | `programmeId, originCycleId?, requirementId, ownerUserId, status` |
| `AssessmentFinding` / `AssessmentVerdict` `:332-339` | `aunqa_findings` / `aunqa_verdicts` | `cycleId, assessorUserId` |
| `AppNotification` `:172-176` | `aunqa_notifications` | ดูหัวข้อ "Notification" ด้านล่าง |
| `AuditLog` `:178-182` | `aunqa_audit` | `universityId, programmeId?, actorId, actorName, action, targetType, targetId, before, after, ip ('local'), at` |
| `AiRun` `:191-201` | `aunqa_ai_runs` | `feature, inputRefs, redactedInputHash, output, postCheck, accepted` |
| อื่น | `aunqa_plos/courses/clos/clo_plo_map/course_methods`, `aunqa_metrics`, `aunqa_snapshots`, `aunqa_seeded_v1`, `aunqa_ui_prefs` (`lib/ui/prefs.ts`) | |

### Notification (`AppNotification`, `lib/types.ts:170-176`)
- field: `id ('ntf…'), universityId, userId (ผู้รับ 1 คน/แถว), kind, cycleId?, requirementId?, messageTh, dedupeKey?, createdAt, readAt?`
- **ไม่มี**: actorId (ใครทำ), programmeId, targetType/targetId หรือ href, actionItemId/commentId/evidenceId, ข้อความ EN (มีแค่ `messageTh` — สลับภาษาไม่ได้), severity
- `kind` 6 ค่า: `assigned | comment | changes_requested | approved | cycle_status | deadline`

### field ข้อมูลส่วนบุคคล (PDPA)
- `AppUser.email, fullName, username` (+ password hash) — แสดงใน admin, dropdown มอบหมาย (`cycle.store.ts listAssignableUsers` คืน email), audit `actorName`
- `AuditLog.actorName` เก็บชื่อจริงถาวร (append-only) — ลบผู้ใช้แล้วชื่อยังอยู่
- `Notification.messageTh` อาจมีชื่อผู้ทำ (`workflow.ts` ข้อความ revision_requested มี `actor.fullName`)
- `Evidence`/`EvidenceFile.extractedText/dataUrl` อาจมี PII จริง — สแกนด้วย `lib/utils/pii.ts` (`containsPii, piiKinds, piiResolved`)

## Flow สำคัญ — ทีละข้อ (ต้นแบบ sequence/activity diagram)

### F-A. เปิดแอป + seed (`init.ts:35-118`, เรียกจาก `AuthContext.tsx:156`)
1. `initAunqa()` ถ้ายังไม่มี `aunqa_seeded_v1` → save 2 university, 1 faculty, 2 programme (`:38-40`) → hash รหัส `DEMO_USERS` 11 คนแล้ว save (`:41-43`)
2. chair สร้าง `cycle-demo-2569` → มอบหมายเกณฑ์ 1 ให้ staff1 due +5 วัน → transition `in_progress` (`:46-52`) — ผลข้างเคียง: notification `assigned` + `cycle_status` ถูกสร้างตั้งแต่ seed
3. evidence, narrative, rating, curriculum, action, metrics → audit `system.seed` → set flag (`:54-103`). ล้มกลางทาง → `clearAllAunqa()` (`:110-114`)

### F-B. Login / Session (`auth.api.ts:167-192`, `context/AuthContext.tsx`)
1. ตรวจรูปแบบ (≤64/≤128) → `getLockUntil` (5 ครั้งผิด → ล็อก 5 นาที, key = username ตัวเล็ก `:17-18,51-56`)
2. หา user แบบไม่แยกตัวพิมพ์ → `verifyPassword` (`sha256("aunqa::"+pw)` หรือ plaintext seed แล้ว upgrade เป็น hash `:184-187`)
3. `setSession` ลง localStorage (`:94-101`) → audit `auth.login`
4. ระหว่างใช้: `getCurrentUser()` อ่าน user ใหม่จาก store ทุกครั้ง (role ที่แก้มีผลทันที `:151-156`) + `touchSession` throttle 60 วิ; หมดอายุ idle 4 ชม./absolute 12 ชม. (`:63-64`); แท็บอื่นออก → `subscribeSession` (`:140-148`) → AuthContext ไป `/login?reason=other-tab|expired`
5. Logout → audit `auth.logout` → `clearSession` (`:194-198`)

### F-C. วงจรชีวิตผู้ใช้ (ปัจจุบัน)
1. **ที่มา:** (ก) seed `DEMO_USERS` (`lib/mock-data/aunqa/org.ts:57-114`, รหัส `demo1234`) หรือ (ข) admin กด "เพิ่มผู้ใช้" ที่ `/app/admin` แท็บผู้ใช้ (`app/app/admin/page.tsx:112-140`) → `createUser(actor, {username,password,email,fullName,roles:[1 role]})` (`auth.api.ts:203-226`)
2. `createUser` ต้องมี `user.manage` ที่ university ของ actor (`:204-205`); username `^[A-Za-z0-9._-]{3,32}$`; password ≥6 (store `:208`) แต่ UI บังคับ ≥8 (`admin/page.tsx:125-126`); email ซ้ำ/username ซ้ำ = `duplicate`; uni_admin สร้าง super_admin ไม่ได้ (`:215-217`); `universityId` = ของ actor เสมอ (`:220`) → audit `user.create`
3. ผู้ใช้ได้รหัสผ่านจาก admin (นอกระบบ) แล้ว login ได้ทันที — **ไม่มี** หน้าสมัคร (register), ไม่มี invite/token, ไม่มีขั้นอนุมัติ, ไม่มี verify email, ไม่มีเปลี่ยน/รีเซ็ตรหัสผ่าน, ไม่มีปิดบัญชีชั่วคราว (มีแค่ลบถาวร)
4. **แก้ role:** `setUserRoles` (`auth.api.ts:228-242`) — ผู้มี `user.manage` (super_admin ทุก uni, uni_admin เฉพาะ uni ตน); non-super: ให้/แก้ super_admin ไม่ได้, แก้ role ตัวเองไม่ได้ → audit `user.set_roles` (before/after). UI: chip ลบ role + เพิ่ม role ทีละ 1 คู่ (role, scope) (`admin/page.tsx:152-175`); scope ให้เลือก university/faculty/programme/cycle จากข้อมูลจริง (`:81-89`)
5. **ช่องทางที่สองที่เพิ่ม role:** `assignAssessor` (`cycle.store.ts:183-195`) ผู้มี `assessor.assign` (uni_admin, faculty_qa) ต่อ role `assessor` scope `cycle` ให้ user ใน uni เดียวกัน + notify `assigned`
6. **ลบ:** `deleteUser` (`auth.api.ts:244-254`) hard delete; ลบตัวเองไม่ได้; ไม่ล้าง `ownerUserId`/notification/ActionItem ที่อ้างถึง → audit `user.delete`
7. ประธานหลักสูตร (chair) **เพิ่มคนเข้าหลักสูตรตัวเองไม่ได้** (ไม่มี `user.manage`) — ต้องขอ uni_admin

### F-D. Org (มหาวิทยาลัย/คณะ/หลักสูตร)
- มีแค่ getter (`org.store.ts:6-30`); เขียนได้ที่ `init.ts:38-40` เท่านั้น — ไม่มี API/หน้าสร้าง university/faculty/programme แม้ POLICY มี `university.manage` (`rbac.ts:31`, ไม่มีผู้ใช้ action นี้)
- `programmeScope(programmeId)` เติม universityId/facultyId ให้ scope (`org.store.ts:26-30`); `listUsers(universityId)` ตัด password (`:21-23`)

### F-E. สร้าง notification (`notify()` — `notification.store.ts:17-30`)
`notify` ไม่ตรวจ rbac (เป็นผลข้างเคียงของ action ที่ตรวจแล้ว), ข้ามถ้าไม่พบผู้รับ, dedupe เฉพาะถ้ามี `dedupeKey`; ทุกจุดข้ามตัว actor เอง

| จุดเรียก | trigger | ผู้รับ | kind | cycleId | requirementId | deep link ที่ทำได้ตอนนี้ |
|---|---|---|---|---|---|---|
| `cycle.store.ts:166-172` assignSections/assignCriterion | มอบหมายข้อ | owner ใหม่ | assigned | ✓ | ข้อแรกของชุด | section ข้อแรก (ข้ออื่นหาย) |
| `cycle.store.ts:194` assignAssessor | เพิ่มกรรมการ | กรรมการ | assigned | ✓ | – | `/app/cycles/{id}` (ควรเป็น `/assess`) |
| `workflow.ts:351-357` transitionSection → changes_requested/approved | ส่งกลับ/อนุมัติข้อ | เจ้าของข้อ | changes_requested / approved | ✓ | ✓ | section |
| `workflow.ts:358-362` transitionSection → ready_for_review | ส่งตรวจข้อ | ประธานหลักสูตร | cycle_status | ✓ | ✓ | section |
| `workflow.ts:231-284` notifyCycleChange (เรียก `:227`) | เปลี่ยนสถานะรอบ | under_review→ผู้มี approve.faculty; faculty_approved→approve.final; final_approved→assessor.assign; under_assessment→เจ้าของข้อ+ประธาน+กรรมการ; assessed→ประธาน+approve.faculty+cycle.close; + ข้อความเดิมถึงเจ้าของข้อ+ประธาน (in_progress/under_review/revision_requested/faculty_approved/final_approved) | cycle_status / changes_requested / approved | ✓ | – | `/app/cycles/{id}` (ไม่แยก `/app/review` หรือ `/assess`) |
| `sar.store.ts:263-264` addComment | comment ใหม่ | เจ้าของข้อ | comment | ✓ | ✓ | section (ไม่มี commentId → เลื่อนไป thread ไม่ได้) |
| `action.store.ts:93-94` createActionItem | มอบหมาย action | owner | assigned | – | ✓ | **ไม่มีลิงก์** (UI ต้องมี cycleId) |
| `action.store.ts:155-156` setActionStatus→verified | ยืนยัน action | owner | approved | – | ✓ | **ไม่มีลิงก์** |
| `notification.store.ts:47-67` syncDeadlineNotifications | ถูกเรียกทุกครั้งที่ `listNotifications`/`unreadCount` (เขียนตอนอ่าน) | เจ้าของ section ที่ยังไม่ approved, due ≤7/≤3/≤1/เลยกำหนด | deadline | ✓ | ข้อแรก (ข้อความรวมหลายข้อ) | section ข้อแรก; dedupeKey `deadline:${cycle}:${due}:${bucket}` |

ไม่มี notification สำหรับ: evidence (verify/PII), metric, user/role ถูกสร้าง/เปลี่ยน, action ถูกส่งกลับ, กรรมการส่ง finding, รอบปิด (closed)

### F-F. อ่าน notification (UI ปัจจุบัน)
1. **กระดิ่ง** `components/aunqa/AppTopbar.tsx:84-90` = `<Link href="/app#notifications">` (ไม่มี panel/dropdown) + badge จาก `unreadCount(user)` (`:51-61`) คำนวณใหม่เมื่อ `pathname` เปลี่ยน หรือ event `aunqa:todos-changed` (`lib/ui/todo.ts:12-14`, same-tab เท่านั้น — ไม่ฟัง `storage` event ข้ามแท็บ, ไม่มี polling)
2. **รายการ** อยู่ในหน้าหลัก `app/app/page.tsx:205-240` section `#notifications`: `listNotifications(user)` (`:100`) แสดง 30 รายการแรก, ปุ่ม "อ่านทั้งหมด" `markRead(user)` (`:103`), ต่อรายการ "ทำเครื่องหมายว่าอ่านแล้ว" `markRead(user,id)` (`:104`); ลิงก์ "เปิดข้อ" ถ้ามี cycleId+requirementId → `sectionHref` (`lib/ui/aunqa.ts:108`), "เปิดรอบ" ถ้ามีแค่ cycleId; **กดลิงก์ไม่ mark read**
3. ไม่มี: ลบ/ซ่อน, กรองตาม kind, แบ่งหน้า, เก็บ/หมดอายุ (โตไม่จำกัด), ไอคอนต่อ kind, ชื่อผู้กระทำ
4. เทสต์ที่พึ่ง: `tests/phase-u.test.ts`, `e2e/flows-b.spec.ts` (+ aria-label กระดิ่ง `แจ้งเตือนที่ยังไม่อ่าน N รายการ` — E2E-08, `.aq-count` ใน regress-u1b)

### F-G. Workflow รอบ (`workflow.ts:27-38` CYCLE_TRANSITIONS, `transitionCycle :181`)
draft→in_progress (cycle.create) → under_review (cycle.submit) → faculty_approved (approve.faculty) / revision_requested (approve.faculty + note) → final_approved (approve.final, lock + snapshotHash) / revision_requested (approve.final + note) → under_assessment (assessor.assign) → assessed (rating.committee) → closed (cycle.close). `openRevision` final_approved→in_progress (cycle.reopen = dean). ทุกขั้น: ReviewEvent + audit + notifyCycleChange
Section: not_started→drafting→ready_for_review→approved / changes_requested (`:40-47`); ผู้เขียนล่าสุดอนุมัติข้อตัวเองไม่ได้ (segregation)

### F-H. Audit (`audit.store.ts`)
- `appendAudit(actor|null, input, universityId?)` (`:19-35`) — actor null = `system`; `ip:'local'` (`:28`); ไม่มีฟังก์ชันแก้/ลบ (แต่ `resetDemo` → `clearAllAunqa` ล้าง key `aunqa_audit` ด้วย)
- `appendAuditThrottled` (`:38-46`) รวม autosave ภายใน 60 วิ
- `listAudit(user, filter)` (`:51-63`) ตรวจ `audit.view` รายแถว (chair เห็นเฉพาะหลักสูตรตน, faculty_qa/dean เฉพาะคณะ, uni_admin ทั้ง uni); `auditToCsv` กัน formula injection (`:65-78`)
- action ที่มี: `auth.login/logout`, `user.create/set_roles/delete`, `cycle.*`, `cycle.assign_assessor`, `section.assign`, `section.<status>`, `comment.add`, `action.*`, `system.seed` ฯลฯ — UI ที่ `/app/admin` แท็บ Audit (limit 300)

## บทบาทผู้ใช้และสิทธิ์ — POLICY (`lib/api/rbac.ts:31-59`), `can()` (`:71-91`)

กฎ `can`: ไม่ใช่ super_admin ต้อง `user.universityId === scope.universityId` (`:75`); super_admin ผ่านทุก action ที่มีใน POLICY ของตน; assessor ผ่านเฉพาะ `scope.cycleId === assignment.scopeId` (`:82-85`); อื่น ๆ ต้อง `covers(assignment, scope)` (`:62-69`: university / faculty / programme / cycle ตรง id) และ `'own'` ต้อง `scope.ownerUserId === user.id`

| role (ROLE_TH `lib/ui/aunqa.ts:7-11`) | scope ปกติ (seed) | action ที่มี |
|---|---|---|
| super_admin ผู้ดูแลระบบสูงสุด | university `*` | university.manage, user.manage, audit.view, read (ไม่มี cycle/sar ใด ๆ) |
| uni_admin ผู้ดูแลมหาวิทยาลัย | university | user.manage, cycle.create, assessor.assign, cycle.close, audit.view, read |
| programme_chair ประธานหลักสูตร | programme | cycle.create/assign/submit/close, sar.write/review/approve/return, evidence.write/verify, metric.write, ai.use/check, rating.self, comment, curriculum.write, action.write/verify, audit.view, read |
| programme_staff อาจารย์/เจ้าหน้าที่ | programme | sar.write(own), evidence.write, ai.use/check, rating.self(own), curriculum.write, action.write(own), read |
| data_staff เจ้าหน้าที่ข้อมูล | faculty | evidence.write, metric.write, ai.check, read |
| faculty_qa QA คณะ | faculty | comment, sar.review/return, approve.faculty, assessor.assign, evidence.verify, ai.use/check, cycle.close, action.verify, audit.view, read |
| dean คณบดี | faculty | comment, sar.review/return, approve.final, cycle.reopen, audit.view, read |
| assessor กรรมการประเมิน | cycle | comment, rating.committee, finding.write, ai.summarize, read |

- จัดการผู้ใช้ได้: super_admin + uni_admin เท่านั้น (`user.manage`); `resetDemo` ก็ใช้ `user.manage` (`init.ts:123`)
- `canAny(user, action)` (`lib/ui/aunqa.ts:122-125`) ใช้ซ่อน/แสดงเมนู
- multi-tenant: seed 2 university (`uni-demo`, `uni-demo-2` + `uadmin2`) — ทดสอบการแยก tenant

## External services / AI module
- **Claude (Anthropic Messages API)** ผ่าน server route เดียว `app/api/ai/route.ts` (GET = available/model, POST = `{task,input}`); env: `ANTHROPIC_API_KEY, CLAUDE_MODEL, TRUST_PROXY, AI_RATE_PER_IP, AI_RATE_GLOBAL, AI_DAILY_LIMIT` (`route.ts:13`); ป้องกันด้วย same-origin + header `x-aunqa-client`, rate limit ใน memory (`lib/api/ai/ratelimit.ts`), จำกัด body, ตรวจ shape in/out, redact ซ้ำฝั่ง server — **ไม่ตรวจตัวตนผู้ใช้** (auth อยู่ฝั่ง browser)
- client: `lib/api/ai/claude.ts` → `/api/ai`; fallback `lib/api/ai/offline.ts` (deterministic); เลือกใน `provider.ts`; `ai.service.ts` = redact (`ai/redact.ts`) → provider → post-check citation/ตัวเลข (`ai/postcheck.ts`) → บันทึก AiRun → ผู้ใช้กด accept; ปิดต่อมหาวิทยาลัยด้วย `University.aiEnabled`
- **ไม่มี**: อีเมล (spec M16 ต้องการ, ระบุ Phase B `notification.store.ts:2`), Google login/Supabase Auth, storage ไฟล์ (เก็บ dataUrl ≤1MB ใน localStorage), cron job

## จุดเสี่ยง & หนี้ทางเทคนิค (โซน lib)
1. **Auth ทั้งหมดอยู่ใน browser** — ผู้ใช้แก้ localStorage (`aunqa_users`, `aunqa_session`) ยกระดับ role ได้; hash SHA-256 salt ค่าคงที่ (`auth.api.ts:23-25`); session ไม่ใช่ httpOnly cookie (`:61-62`). ระบบเดโม่เท่านั้น
2. **register/invite ที่จะเพิ่มก็จะอยู่ใน localStorage เครื่องเดียว** — "ผู้ใช้สมัครเอง แล้ว admin อนุมัติ" ทำงานได้เฉพาะในเบราว์เซอร์เดียวกัน (ไม่มี server กลาง) ต้องออกแบบให้เดโม่ได้และระบุข้อจำกัดในเล่ม
3. `AppUser` ไม่มี `status` — `loginUser` ไม่เช็กสถานะบัญชี; จะเพิ่ม pending/invited/disabled ต้องแก้ `loginUser` (`:167-192`), `getCurrentUser`, และทุกที่ที่ list user (`listUsers`, `listAssignableUsers`, `usersWhoCan` `workflow.ts`, ผู้รับ notification) ให้กรองบัญชีที่ไม่ active
4. `createUser` ผูก `universityId` = ของ actor (`:220`) และ admin UI list เฉพาะ uni ตน → super_admin จัดการ uni อื่นไม่ได้จาก UI
5. password ขั้นต่ำไม่ตรงกัน: store 6 (`auth.api.ts:208`) vs UI 8 (`admin/page.tsx:125-126`)
6. `deleteUser` hard delete ไม่ cascade → `ownerUserId` ลอย, todo/notification ชี้ไปคนที่ไม่มี; `notify` ข้ามเงียบถ้าไม่พบผู้รับ
7. `resetDemo` ให้ uni_admin ของ **uni ใดก็ได้** ล้างข้อมูลทุก tenant + audit (`init.ts:121-128`, `db.ts:43-52`) — ขัดหลัก append-only
8. Notification: ไม่มี target/href ทั่วไป, `messageTh` ไทยอย่างเดียว (ปุ่มสลับภาษาแปลไม่ได้นอกจาก dom-translate), action-item noti ไม่มีลิงก์, assessor noti ลิงก์ผิดหน้า, `listNotifications`/`unreadCount` **เขียน store ตอนอ่าน** (sync deadline) → ถ้าเรียกใน render บ่อยจะเขียน localStorage บ่อย, ไม่มี retention, badge ไม่อัปเดตข้ามแท็บ
9. `university.manage` ไม่มี implementation; `emailDomain` ไม่ถูกใช้ (ใช้ได้กับ self-register จำกัดโดเมนตาม spec M1)
10. ไม่มีการเปลี่ยน/รีเซ็ตรหัสผ่าน และไม่มีหน้าโปรไฟล์
11. Session เก็บ `roles` สำเนา ณ login แต่สิทธิ์จริงอ่านจาก store ผ่าน `getCurrentUser` — ปัจจุบันไม่มี UI ใช้ `session.roles` (AuthContext ใช้ `getSession()` แค่เช็กหมดอายุ `:80,180`); ถ้าเพิ่ม flow ปิดบัญชี ต้องเช็กสถานะใน `getCurrentUser` ด้วย ไม่ใช่แค่ตอน login
12. ชื่อตกค้าง EduFlow: `context/LangContext.tsx:19` key `eduflow_lang_pages`
