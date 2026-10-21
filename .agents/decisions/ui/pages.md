# ADR-UI-001 ภาคผนวก P — หน้าต่อหน้า (wireframe ข้อความ + สิ่งที่เปลี่ยน/คงไว้)

> ใช้คู่กับ `../ADR-UI-001-redesign.md`, `tokens.md`, `components.md`
> สัญลักษณ์ wireframe: `[ปุ่ม]`, `(pill)`, `{ช่องกรอก}`, `▸` = ลิงก์/การ์ดคลิกได้, `▾` = พับได้, `◔` = progress ring · ทุกหน้าในแอปอยู่ใน AppShell (P4) · ทุกหน้ามี h1 เดียวจาก PageHeader
> สัญลักษณ์ ✓ ✕ ! ⚠ ◷ ⌂ ▢ ฯลฯ ใน wireframe = **ไอคอนจาก Icon.tsx** ไม่ใช่ตัวอักษรในโค้ด (AC-10 ห้าม emoji/สัญลักษณ์ U+2600–27BF)
> breakpoint ใน wireframe ("≤767", "≤1023" ฯลฯ) อ่านตามกฎ tokens.md T10 (768 พอดี = ค่า md)
> "คงไว้" = ห้ามเปลี่ยนพฤติกรรม/ข้อความที่ E2E อ้าง (ดู ADR 7.3) · "เปลี่ยน" = ทำตามนี้เท่านั้น
> ข้อความในเครื่องหมาย "…" เป็นข้อความจริงที่ต้องใช้ (ไทย) — คู่ EN ต้องเพิ่มใน dict-aunqa

---

## P1. Landing `/` (`app/page.tsx`, `components/landing/*`)
```
┌ nav (sticky, surface 92% + blur, สูง 72) ───────────────────────────────────────┐
│ [■ AUN-QA Copilot]      จุดเด่น  ขั้นตอนใช้งาน  ทำไมเชื่อถือได้   [TH|EN] [เข้าสู่ระบบ →]│  ≤767: [■ AUN-QA Copilot] ......... [☰]
└─────────────────────────────────────────────────────────────────────────────────┘
┌ HERO (bg + radial tint primary 6% มุมขวา, overflow-x: clip) ───────────────────────┐
│ (AUN-QA ระดับหลักสูตร · Version 4.0)                 ┌ hero card (aq-card--accent) ┐ │
│ ทำ SAR ให้เสร็จ                                       │ รอบประเมินเดโม่ 2569        │ │
│ อย่างมีหลักฐาน  ← h1 fs-3xl 700, คำว่า "หลักฐาน"     │  ◔ 45/53 อนุมัติแล้ว         │ │
│                    มีเส้นใต้ accent 6px              │ mini heatmap 8 แถว (จุดสี)  │ │
│ ผู้ช่วยจัดทำรายงานประเมินตนเองตามเกณฑ์ AUN-QA ครบ 8   │ (✓ ผ่านการตรวจอ้างอิง)     │ │
│ เกณฑ์ 53 ข้อ — AI เป็นผู้ช่วยเสนอ ไม่ใช่ผู้ตัดสิน       └────────────────────────────┘ │
│ [เริ่มใช้งาน →] [ดูขั้นตอน]                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
 จุดเด่น (#about)  4 การ์ด: ไอคอนในวงกลม primary-tint + หัว fs-md + ข้อความ
   ▸ หลักฐานชิ้นเดียว ผูกได้หลายข้อ  ▸ ตรวจช่องว่าง R1–R11 + heatmap  ▸ อนุมัติตามบทบาท + ล็อก + hash  ▸ AI ปกปิดข้อมูลส่วนบุคคล + ต้องกดยอมรับ
 ขั้นตอนใช้งาน (#flow)  5 ขั้น เป็นเส้นเวลาแนวนอน (≤767 แนวตั้ง) วงกลมเลข primary เชื่อมด้วยเส้น
 ทำไมเชื่อถือได้ (#trust)  3 ข้อ: ไม่ให้คะแนนแทนกรรมการ · ไม่แต่งหลักฐาน · ทุกการแก้ไขมี audit log
 CTA band (#contact, พื้น primary-strong, class aq-on-dark)  "พร้อมเริ่มรอบประเมินแล้วหรือยัง" [เข้าสู่ระบบ / ลองบัญชีเดโม่]
 footer (พื้น primary-strong เข้มต่อเนื่อง) โลโก้ขาว + "ข้อมูลทั้งหมดเป็นข้อมูลสมมติเพื่อการสาธิต"
```
- เปลี่ยน: ฟอนต์ Sarabun ทั้งหมด (ลบ Cormorant/`em` ตัวเอียง) · ลบ `.hero-bg-circle` ที่ล้น 1540px (M2) — ใช้ `background: radial-gradient(...)` บน `.hero` + `overflow-x: clip` บน `body` · ลบ `animate-up` ที่เริ่ม opacity 0 + delay ยาว (m2) → ใช้ L1-landing: fade-up 12px 400ms `--ease-enter` delay ≤120ms เฉพาะ hero (เนื้อหาเห็นได้ทันทีถ้าไม่มี JS เพราะเป็น CSS animation `animation-fill-mode: both` และ reduced-motion = ไม่ animate) · About: ข้อความ **"R1–R11"** (C-8 UI, เดิม R1–R10) · การ์ดจุดเด่นแสดงพร้อมกันไม่เหลื่อม · ไอคอนจาก Icon.tsx แทน emoji (🔗🧭✅🛡️) · `dangerouslySetInnerHTML` ใน AboutSection เปลี่ยนเป็น JSX (ไม่จำเป็นต้อง render HTML จาก string)
- hero card: progress ring ค่าคงที่ 45/53 พร้อมป้าย "ตัวอย่างข้อมูลเดโม่" (ไม่ใช่ข้อมูลจริงของผู้ใช้) เติม L2 ครั้งเดียว · mini heatmap = 53 จุด 12px ตามสีระดับ (ตกแต่ง, `aria-hidden`, มีข้อความสรุปข้างบน)
- mobile nav: hamburger → แผงเต็มจอ (เดิม) แต่ปุ่มสูง 44, ปิดด้วย Esc/ปุ่ม x, focus trap
- คงไว้: testid `landing-login`, `hero-start` · เมื่อล็อกอินอยู่ ปุ่มเป็น "เข้าสู่แอป →" · `HashScroller`

## P2. Login `/login` (`app/login/page.tsx`, `components/auth/*`) — **layout แยกจาก landing nav**
```
≥1280 (แบ่งครึ่ง)                                         ≤1279 (คอลัมน์เดียว)
┌──────────────────────┬──────────────────────────────┐   ┌ top: [■ AUN-QA Copilot]  [TH|EN] ┐
│ แผงแบรนด์ (primary-  │  ┌ form card (surface, r-xl) ┐ │   │ ┌ form card ───────────────────┐ │
│ strong, aq-on-dark)  │  │ เข้าสู่ระบบ   ← h1 fs-xl    │ │   │ │ เข้าสู่ระบบ                   │ │
│ ■ AUN-QA Copilot     │  │ ผู้ช่วยจัดทำ SAR ระดับหลักสูตร│ │   │ │ ...เหมือนซ้าย...             │ │
│                      │  │ (msg danger ถ้าผิด)        │ │   │ └──────────────────────────────┘ │
│ "ทำ SAR อย่างมีหลักฐาน"│  │ ชื่อผู้ใช้ *               │ │   │ ▾ บัญชีทดสอบ (11)               │
│ ✓ มอบหมาย ติดตาม     │  │ {               }          │ │   └──────────────────────────────────┘
│ ✓ ผูกหลักฐาน ตรวจช่องว่าง│  │ รหัสผ่าน *                │ │
│ ✓ ส่งออก Word ครบ 53 ข้อ│  │ {               } [👁 SVG] │ │
│ (ภาพเส้น SVG: เอกสาร  │  │ [ เข้าสู่ระบบ           ]  │ │
│  + วงแหวน accent)    │  │ ← กลับหน้าแรก             │ │
│ [TH|EN] มุมล่าง       │  └───────────────────────────┘ │
│                      │  ▾ บัญชีทดสอบ (11) — รหัสผ่าน demo1234 │
└──────────────────────┴──────────────────────────────┘
```
- เปลี่ยน: ลบ `AuthNav` (ที่ลอกลิงก์ของ landing มาและพังที่ 390 — M3) → `components/auth/AuthLayout.tsx` ใหม่ (top bar แค่ Wordmark ลิงก์ `/` + **ตัวปรับขนาดตัวอักษร** segmented "ก | ก+ | ก++" `aria-label="ขนาดตัวอักษร"` testid `login-fontscale` เขียนลง `aunqa_ui_prefs.fontScale` ตัวเดียวกับใน sidebar (U1b m3) + LangToggle) · บน ≥1280 ตัวปรับและ LangToggle อยู่มุมล่างของแผงแบรนด์ (ใช้ปุ่มแบบพื้นเข้ม C1) · label ไม่ uppercase (m3) fs-base 600 · input สูง 44 · ปุ่มแสดงรหัสผ่านใช้ Icon `eye`/`eye-off` 44×44 (ไม่ใช่ emoji 👁🙈) · input username: `autoCapitalize="none" autoCorrect="off" spellCheck={false}` (P7)
- error: InlineMessage danger ที่หัวฟอร์ม "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบแล้วลองอีกครั้ง" + ทั้งสองช่อง `aria-invalid` ขอบ danger + ข้อความ "เหลืออีก N ครั้งก่อนถูกล็อก 5 นาที" (`.aq-help` warn ใต้ช่องรหัสผ่าน) · ล็อก: InlineMessage warn + นับถอยหลัง (เดิม)
- บัญชีทดสอบ: **พับไว้เป็นค่าเริ่มต้น** (m3: รายการยาวดันฟอร์ม) จำสถานะเปิด/ปิดใน `aunqa_ui_prefs.demoOpen` · เปิดแล้วเป็นกริด 2 คอลัมน์ (≥768) ของปุ่มสูง 44: `code` username + บทบาท fs-sm · กดแล้วเติมฟอร์ม + focus ปุ่มเข้าสู่ระบบ
- หลังกด: ปุ่ม loading "กำลังตรวจสอบ…" → สำเร็จ = AppLoader mode login (C22) แล้ว `router.push('/app')`
- คงไว้: testid `login-username`, `login-password`, `login-submit`, `login-error`, `demo-accounts`, `demo-{username}` · h1 "เข้าสู่ระบบ" · ข้อความ error เดิม

## P3. Loader ตอน init / login / logout
- AppShell ระหว่าง `isLoading` (init seed) → `<AppLoader mode="init" />` (ไม่ใช่กล่องข้อความ "กำลังเตรียมข้อมูล…" เดิม)
- login สำเร็จ → `<AppLoader mode="login" name={fullName} />` ≤700ms
- logout (AuthContext) → `flushAll()` (ADR 6.4 M3) → ถ้า **ทุกตัวสำเร็จ**: `<AppLoader mode="logout" />` 600ms → `router.push('/')` → `logoutUser()` (ลำดับเดิม: ไปหน้าแรกก่อนล้าง session) · ถ้า **มีตัวล้มเหลว**: ไม่แสดง loader, เปิด dialog variant danger title "ยังบันทึกงานไม่ได้" message "ข้อ {label}: {error}" ปุ่มยกเลิก (focus เริ่มต้น) "กลับไปแก้" และปุ่มยืนยัน danger-solid "ยืนยันออกโดยไม่บันทึก" → กลับไปแก้ = ยกเลิก logout ทั้งหมด
- ทั้งสามใช้ component/สี/ฟอนต์เดียวกัน (แก้โจทย์เจ้าของ "loading/login/logout หลุด theme")

## P4. App shell (`components/aunqa/AppShell.tsx` + `AppSidebar.tsx` + `AppTopbar.tsx` ใหม่)
```
≥1024
┌ sidebar 256 (surface, sticky 100vh) ┬ top bar 64 (sticky) ──────────────────────────────┐
│ ■ AUN-QA Copilot                    │                       [TH|EN] [🔔3] (อธ) อ.ธนา สอนดี │
│                                     │                                    อาจารย์หลักสูตร   │
│ งานของฉัน                           ├──────────────────────────────────────────────────────┤
│ ▌⌂ หน้าหลัก              (11)       │ <main id="main"> (max 1280, padding 32)              │
│  ☑ รอตรวจ                 (6)       │  (readonly-banner ถ้าเป็นกรรมการ)                   │
│ จัดทำรายงาน (SAR)                   │  PageHeader: crumbs / h1 (status) / sub / actions    │
│  ◷ รอบประเมิน                       │  … เนื้อหาหน้า …                                     │
│  ▢ หลักฐาน                          │                                                      │
│  ⤓ ส่งออกเอกสาร                     │                                                      │
│ ข้อมูลหลักสูตร                       │                                                      │
│  ▤ หลักสูตร (PLO/รายวิชา)           │                                                      │
│  ∿ ตัวชี้วัด                         │                                                      │
│  ☰ แผนปรับปรุง                      │                                                      │
│ อ้างอิง                              │                                                      │
│  ⌸ คลังเกณฑ์ AUN-QA                 │                                                      │
│ ─────────────                       │                                                      │
│ [Aa การแสดงผล]  [⎋ ออกจากระบบ]       │                                                      │
└─────────────────────────────────────┴──────────────────────────────────────────────────────┘
<1024: top bar = [☰] [■ AUN-QA Copilot] …… [🔔] (อธ)   · sidebar เป็น drawer
```
- เปลี่ยน: เลิกแถบ pill 10 แท็บ (m5, M8) → เมนูจัดกลุ่มตาม C6 · ไอคอนทุกรายการ · badge "รอท่าน" · ปุ่มทุกตัว 44px · guard เดิม (ไม่ล็อกอิน → `/login`) · `<a class="aq-skip">` · ฟัง `subscribeSession` ข้ามแท็บ (ADR 6.2 B1)
- คงไว้: testid `nav-home|cycles|requirements|evidence|curriculum|actions|metrics|review|export|admin`, `nav-bell` (+aria-label เดิม), `nav-user`, `logout`, `readonly-banner` · เงื่อนไขแสดงเมนูเดิมทุกข้อ

## P5. หน้าหลัก `/app` — "สิ่งที่ต้องทำตอนนี้" ต่อ role (`app/app/page.tsx`)
```
PageHeader: h1 "หน้าหลัก"  sub: "สวัสดีตอนบ่าย อ.ธนา สอนดี · วันพุธที่ 22 ตุลาคม 2569"   (fullName ตรงตัว — U1b m2)
┌ สิ่งที่ต้องทำตอนนี้ (h2) ─────────────────────────────── (รวม 11 งาน = todoTotal) ┐
│ ┌ todo #1 (aq-card--accent, ใหญ่) ┐ ┌ todo #2 ┐ ┌ todo #3 ┐  ← top 3 (≤767 ซ้อนแนวตั้ง) │
│ │ (เร่งด่วน) ไอคอน pencil          │ │ …       │ │ …       │                            │
│ │ แก้ไขข้อ 3.6 ตามที่ถูกส่งกลับ     │ │         │ │         │                            │
│ │ "เกณฑ์ 4 ยังขาดหลักฐาน…"         │ │         │ │         │                            │
│ │ รอบ 2569 · เหลือ 2 วัน           │ │         │ │         │                            │
│ │ [ไปแก้ไขข้อนี้ →]                │ │ [..→]   │ │ [..→]   │                            │
│ └──────────────────────────────────┘ └─────────┘ └─────────┘                            │
│ ▾ งานอื่น ๆ อีก 4 รายการ  (รายการบรรทัดเดียว: ไอคอน · ข้อความ · กำหนด · ปุ่ม ghost →)      │
└────────────────────────────────────────────────────────────────────────────────────┘
┌ ข้อที่ได้รับมอบหมาย (11) — mywork-table ┐ ┌ แจ้งเตือน (2 ใหม่) #notifications ─────┐
│ ข้อ | รอบ | สถานะ(pill) | กำหนดส่ง(pill)│ │ ● ข้อ 3.6 ถูกส่งกลับแก้: …  10:24      │
│ (จัดกลุ่ม: ต้องแก้ → กำลังเขียน → รอตรวจ │ │   [เปิดข้อ] [ทำเครื่องหมายว่าอ่านแล้ว]  │
│  → อนุมัติแล้ว; ภายในกลุ่มเรียงตามกำหนด) │ │ [ทำเครื่องหมายว่าอ่านแล้วทั้งหมด]       │
└──────────────────────────────────────────┘ └──────────────────────────────────────────┘
┌ รอบประเมินที่เข้าถึงได้ ─ การ์ดต่อรอบ: ปี · หลักสูตร · (สถานะ) · bar อนุมัติ 45/53 · ▸ ┐
```
- todo มาจาก `listMyTodos(user)` (ADR 6.2 B2) · ป้ายปุ่ม + ปลายทางแมปตาม kind ใน `lib/ui/todo.ts` (ใหม่):

| kind | ไอคอน | ปุ่ม | ไปที่ |
|---|---|---|---|
| write_section | pencil | "เขียนข้อนี้" | `sectionHref(cycleId, reqIds[0])` |
| fix_section | undo | "ไปแก้ไขข้อนี้" | `sectionHref` |
| translation_review | languages | "ตรวจคำแปล" | `sectionHref` |
| review_sections | inbox-check | "ตรวจ {count} ข้อ" | `/app/review` |
| assign_sections | users | "มอบหมายงาน" | `/app/cycles/{id}/assign` |
| submit_cycle | check-circle | "ส่งให้ QA คณะ" | `/app/cycles/{id}` |
| revise_cycle | undo | "เปิดรอบเพื่อแก้ไข" | `/app/cycles/{id}` |
| faculty_review | inbox-check | "ตรวจรอบนี้" | `/app/cycles/{id}` |
| final_approve | lock | "พิจารณาอนุมัติ" | `/app/cycles/{id}` |
| start_assessment | calendar-cycle | "เริ่มการประเมิน" | `/app/cycles/{id}` (ถ้ายังไม่มีกรรมการ: `/app/cycles/{id}/assign`) |
| assess_cycle | library | "ไปพื้นที่ทำงานกรรมการ" | `/app/cycles/{id}/assess` |
| resolve_pii | alert-triangle | "ดูหลักฐานที่มี PII" | `/app/evidence?pii=1` (หน้า evidence อ่าน query `pii=1` ตั้งตัวกรอง) |
| verify_actions | list-check | "ตรวจรับแผนปรับปรุง" | `/app/actions?status=done` (อ่าน query ตั้งตัวกรอง) |
| start_cycle | calendar-cycle | "เริ่มดำเนินการรอบ" | `/app/cycles/{id}` (U1b M1) |
| close_cycle | check | "ปิดรอบ" | `/app/cycles/{id}` (U1b M1) |
| assess_cycle (ครบ 8/8) | check-circle | "ส่งผลประเมิน" | `/app/cycles/{id}/assess#assess-progress` |
- **รวมการ์ดเขียน (U1b m5):** ใน `lib/ui/todo.ts` ฟังก์ชัน `groupForHome(items)` — ถ้า `write_section` ที่ `urgent=false` มีมากกว่า 3 รายการ ให้รวมทั้งหมด (ที่ไม่ urgent) เป็นการ์ดเดียว kind แสดงผล `write_section_group` ไอคอน pencil ข้อความ "เขียนอีก {n} ข้อ (ใกล้สุด {id} · {เหลือ x วัน|ยังไม่กำหนดส่ง})" ปุ่ม "ดูรายการข้อของฉัน" → เลื่อนไป `#mywork` (การ์ด "ข้อที่ได้รับมอบหมาย") · write_section ที่ urgent ยังแสดงทีละใบ · การรวมนี้เป็นการแสดงผลเท่านั้น `todoTotal` ยังนับทุกข้อ
- top 3 การ์ดใหญ่ = 3 รายการแรกหลัง `groupForHome` · ที่เหลืออยู่ใน "▾ งานอื่น ๆ อีก {n} รายการ" (ค่าเริ่มต้น **เปิด** ถ้ามี ≤5 รายการ, ปิดถ้ามากกว่า)
- การทำเครื่องหมายแจ้งเตือนว่าอ่านแล้ว **ไม่ลบ todo** (todo หายเมื่องานเสร็จจริงเท่านั้น) — ข้อความช่วยใต้หัวการ์ดแจ้งเตือน `.aq-help`: "การทำเครื่องหมายว่าอ่านแล้วไม่ทำให้งานในรายการ “สิ่งที่ต้องทำ” หายไป"
- urgent = pill warn "เร่งด่วน" (ไอคอน clock) ไม่ใช้แดงทั้งการ์ด · testid การ์ด `todo-{kind}-{index}` (**ห้ามใช้ prefix `mywork-`** — E2E-03 นับ `a[data-testid^="mywork-"]`)
- ไม่มี todo: EmptyState icon `check-circle` title "ตอนนี้ไม่มีงานรอท่าน" + text ตาม role — **ผู้ใช้หลายบทบาทใช้ข้อความของบทบาทแรกที่มีตามลำดับ** `programme_chair > faculty_qa > dean > uni_admin/super_admin > data_staff > programme_staff > assessor` (U1b) :
  - อาจารย์/เจ้าหน้าที่ (ไม่มีข้อ): "เมื่อประธานหลักสูตรมอบหมายข้อให้ งานจะขึ้นที่นี่ทันที ระหว่างนี้คุณเพิ่มหลักฐานเข้าคลังไว้ก่อนได้" + [เพิ่มหลักฐาน] → `/app/evidence?new=1`
  - เจ้าหน้าที่ข้อมูล: "อัปเดตตัวชี้วัดล่าสุดไว้ ระบบจะตรวจแนวโน้มให้" + [ไปหน้าตัวชี้วัด]
  - ประธาน: "ทุกข้อที่ส่งมาตรวจแล้ว" + [ดูแดชบอร์ดรอบ]
  - QA คณะ/คณบดี: "ยังไม่มีรอบที่รอการพิจารณาของคุณ — จะมีแจ้งเตือนเมื่อหลักสูตรส่งรอบมา"
  - กรรมการ: "ยังไม่มีรอบที่เปิดให้ประเมิน — คุณจะได้รับแจ้งเตือนเมื่อ QA คณะเริ่มการประเมิน"
  - ผู้ดูแล: "ไม่มีงานค้าง" + [จัดการผู้ใช้]
- "ข้อที่ได้รับมอบหมาย" (section `id="mywork"`) แสดงเฉพาะเมื่อมี ≥1 ข้อ (ซ่อนข้อความ "ประธานหลักสูตรมอบหมายข้อให้ได้ที่…" ที่ขึ้นให้ทุก role เดิม) · ลิงก์ข้อ `mywork-{reqId}` (เดิม) · คอลัมน์กำหนดส่ง pill: เลย = bad "เลย 2 วัน", ≤3 = warn, อื่น = neutral
- แจ้งเตือน: id `notifications` (anchor ของกระดิ่ง) · ปุ่ม "อ่านแล้ว" → **"ทำเครื่องหมายว่าอ่านแล้ว"** · ใหม่ = จุด primary 8px ซ้าย + ตัว 600 · ปุ่ม "เปิดข้อ"/"เปิดรอบ" ตาม `requirementId`/`cycleId` · คง testid `noti-list`, `noti-read-all` · หัวการ์ดนับใหม่ต้องเท่ากับตัวเลขกระดิ่ง
- คงไว้: `mywork-table`, `mywork-{id}`, `cycle-link-{id}`, `noti-list`

## P6. รายการรอบ `/app/cycles`
```
PageHeader h1 "รอบประเมิน" actions [+ สร้างรอบใหม่](cycle-new, ถ้ามีสิทธิ์)
(ฟอร์มสร้างรอบ เปิดในการ์ดบนสุด: ปีการศึกษา {2570} · หลักสูตร · คัดลอกจากรอบ ▾ (ถ้ามี) · กำหนดส่ง · [สร้างรอบ](cycle-submit) [ยกเลิก])
cycles-table: ปี | หลักสูตร | สถานะ(pill) | ความคืบหน้า (bar อนุมัติ n/53) | ขั้นถัดไปโดย | ▸เปิด
```
- เปลี่ยน: เพิ่มคอลัมน์ความคืบหน้า (นับ section approved จาก `listSections`) + "ขั้นถัดไปโดย" (ข้อความจากตาราง: draft/in_progress/revision_requested → "ประธานหลักสูตร", under_review → "QA คณะ", faculty_approved → "คณบดี", final_approved → "QA คณะ/ผู้ดูแล (เริ่มประเมิน)", under_assessment → "กรรมการ", assessed → "ผู้ดูแล (ปิดรอบ)", closed → "—") · ฟอร์มสร้าง: ข้อความช่วย "ระบบจะสร้างครบ 53 ข้อให้อัตโนมัติ" · สำเร็จ = toast "สร้างรอบ 2570 แล้ว — มี 53 ข้อพร้อมให้มอบหมาย" + ไปหน้ารอบ (เดิม)
- คงไว้: `cycles-table`, `cycle-new`, `cycle-year`, `cycle-submit`, ข้อความสถานะในแถว (E2E-08 หา "ส่งกลับแก้ไข")

## P7. แดชบอร์ดรอบ `/app/cycles/[id]` — เน้นความคืบหน้า, gap จัดกลุ่ม/พับ
```
crumbs: รอบประเมิน › 2569
h1 "รอบประเมิน 2569" (pill สถานะ)   sub: หลักสูตร… · revision 1 · กำหนดส่ง … · วันประเมิน …
actions: [พื้นที่ทำงานกรรมการ/ดูผลประเมิน](go-assess) [มอบหมายงาน](go-assign) [ส่งออก](go-export)

ติดตามขั้นของรอบ (Stepper variant=track): ร่าง ─ ดำเนินการ ─ QA คณะตรวจ ─ คณบดีอนุมัติ/ล็อก ─ ประเมิน ─ ปิดรอบ
┌ ขั้นตอนถัดไป (cycle-next-info, aq-card) ───────────────────────────────────────────────┐
│ ตอนนี้รอ: คณบดี (คุณ)                                                                    │
│ (msg warn ถ้ามี preflight warnings) ก่อนอนุมัติสุดท้าย: ยังมีช่องว่างวิกฤต 36 รายการ · PII 1 │
│   ▾ ดูข้อที่เกี่ยวข้อง (1.2, 1.3, …)                                                     │
│ cycle-actions: [อนุมัติสุดท้ายและล็อก](primary) ······ [ส่งกลับแก้ไข](danger, ห่าง 16)      │
│ (ถ้าปุ่ม disabled: .aq-btn-reason "ยังมี 8 จาก 53 ข้อที่ยังไม่อนุมัติ")                     │
└───────────────────────────────────────────────────────────────────────────────────────┘
(lock-banner msg success/warn) · (evidence-changed / evidence-unchanged)
kpi-row: [◔ อนุมัติแล้ว 45/53] [ความพร้อมด้านหลักฐาน 28% (?)] [วิกฤต 36] [สูง 71] [กลาง 40] [ต่ำ 10]
kpi-summary: "อนุมัติแล้ว 45 จาก 53 ข้อ แต่ 36 ข้อยังมีช่องว่างวิกฤต (เช่น ยังไม่มีหลักฐานผูก) — ควรเติมก่อนส่งต่อ"
┌ Heatmap 53 ข้อ (heatmap) + legend ───────────────────────────────────────────────────┐
│ เกณฑ์ 1  5/5 (ครบ)  [1.1][1.2][1.3][1.4][1.5]                                          │
│ …                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
┌ ช่องว่างที่ต้องแก้ (157) [ระดับ ▾](gap-filter) [แสดงทั้งหมด (157)] ┐ ┌ งานค้างรายคน (pending-table) ┐
│ gap-list:                                                        │ │ ...                           │
│ ▸ เกณฑ์ 1 — 12 รายการ (วิกฤต 3 · สูง 5)            [▾]          │ │ ▾ ประวัติการเปลี่ยนสถานะ (n)  │
│ ▸ เกณฑ์ 2 — 20 รายการ …                                        │ └──────────────────────────────┘
│   (เปิดแล้ว) (วิกฤต) ข้อ 1.2 ยังไม่มีหลักฐานผูก (R1) [?]  ▸เปิดข้อ │
└──────────────────────────────────────────────────────────────────┘
```
- KPI: ring ใหญ่ = **จำนวนข้อที่อนุมัติ** (ตัวชี้วัดซื่อตรง เข้าใจง่าย) · ป้าย tile % = **"ความพร้อมด้านหลักฐาน"** (U1b M4) คง `readiness-percent` + Term `readiness` อธิบายสูตร ("คะแนนตามสถานะข้อ หักตามช่องว่าง เฉลี่ย 53 ข้อ") · tile ระดับ gap คลิกเพื่อกรอง (C10) คง `gap-count-*`
- **ประโยคสรุปใต้ KPI (U1b M4)** `.aq-kpi-summary` testid `kpi-summary` fs-base (ใช้ c = จำนวนข้อที่ `heatmap[i].gaps.critical > 0`, a = approved):
  - c > 0: "อนุมัติแล้ว {a} จาก 53 ข้อ แต่ {c} ข้อยังมีช่องว่างวิกฤต (เช่น ยังไม่มีหลักฐานผูก) — ควรเติมก่อนส่งต่อ" (InlineMessage warn)
  - c = 0 และ a < 53: "อนุมัติแล้ว {a} จาก 53 ข้อ ไม่มีช่องว่างวิกฤต — เหลืออีก {53−a} ข้อ" (neutral)
  - c = 0 และ a = 53: "ครบทุกข้อและไม่มีช่องว่างวิกฤต" (success)
  - ring เป็นสี success เฉพาะ a = 53 และ c = 0 (`clean`)
- heatmap: C13 (P8 ไอคอนสถานะ) · ป้ายแถวเกณฑ์มีจำนวนอนุมัติ + pill "ครบ"
- **คำอธิบายกฎครั้งเดียว (U1b m6):** หัวการ์ด gap มีปุ่ม ghost "กฎ R1–R11 คืออะไร" (testid `gap-rules-help`, ไอคอน help-circle) เปิด popover รายการกฎทั้ง 11 ข้อจาก `GLOSSARY.gap_rule_R*` · **แถว gap ไม่มีปุ่ม Term** — ข้อความ "(R6)" เป็นตัวอักษรธรรมดา `.aq-meta` มี `title` = ชื่อกฎ
- **gap-list จัดกลุ่มตามเกณฑ์** (accordion; หัวกลุ่มเป็น `<button aria-expanded>` + region `hidden` เมื่อปิด) — ค่าเริ่มต้น: ปิดทุกกลุ่ม · ปุ่ม **"แสดงทั้งหมด (N)"** = เปิดทุกกลุ่ม (ต้องมีเสมอเมื่อมีกลุ่มที่ปิดอยู่; หลังกดเปลี่ยนเป็น "ย่อทั้งหมด") — E2E `gapListText` กดปุ่มนี้แล้วอ่าน `innerText` · แถว gap: pill ระดับ + ข้อความ `messageTh` เป็นลิงก์ไปหน้าข้อ + **ตัวอักษร "(R6)"** (Term ของกฎ) — **ลบ "ข้อ x.x" ที่ UI เติมหน้าข้อความ** (ซ้ำกับ messageTh: "ข้อ 1.2 ข้อ 1.2 …" M6) · ในกลุ่มเรียงตามระดับแล้วตามข้อ · ไม่ตัด 40 แถวแรกแล้ว (กลุ่มพับแทน)
- preflight: เรียก `getTransitionPreflight(user, id, to)` สำหรับทุกปุ่มใน cycle-actions (ADR 6.2 B4) → แสดง warnings ในการ์ด "ขั้นตอนถัดไป" ก่อนกด **และ** ใน dialog ยืนยัน (`details`) · ชื่อปุ่มยืนยัน: ไม่มี warning = "ยืนยัน{ชื่อการกระทำ}" เช่น "ยืนยันอนุมัติสุดท้ายและล็อก"; มี warning = "ยืนยัน{ชื่อการกระทำ} (มีข้อควรระวัง {n} เรื่อง)" · dialog variant warning · blockers → ปุ่ม disabled + reason
- ปุ่ม transition: ปุ่มที่ไปข้างหน้า = primary, `revision_requested` = danger อยู่ขวาสุดห่าง 16px (แก้ dean กดผิดเพราะปุ่มเท่ากัน)
- "ขั้นตอนถัดไป" แสดงเสมอ (แม้ผู้ใช้ไม่มีปุ่ม) เพื่อบอกว่ารอใคร — testid ใหม่ `cycle-next-info`; **`cycle-actions` render เฉพาะเมื่อมีปุ่ม** (E2E-08 คาด hidden)
- **อ่าน SAR ทั้งรอบ (U1b UX-5 — ทำใน U2 แบบเบา):** ในการ์ด "ขั้นตอนถัดไป" เมื่อสถานะเป็น `under_review` หรือ `faculty_approved` และผู้ใช้มีปุ่ม transition → ปุ่ม secondary "อ่าน SAR ทั้งรอบ (.docx)" (testid `read-full-sar`, ไอคอน file-text) เรียก `exportSarDocx(user, cycleId)` + `downloadBlob(…, 'SAR_{รหัส}_{ปี}.docx')` พร้อมปุ่ม loading "กำลังสร้างไฟล์ Word…" · หน้าอ่านต่อเนื่องในเว็บ = backlog (ไม่ทำใน U2)
- preflight dialog: ปุ่มยกเลิก "กลับไปตรวจก่อน" และ focus เริ่มที่ปุ่มนี้เมื่อมี warning (C15, U1b UX-3)
- L7 ฉลอง: เมื่อ approved = 53 และสถานะ in_progress → ถ้า c = 0: InlineMessage success "ครบทุกข้อแล้ว พร้อมส่ง QA คณะตรวจ" + ring success + ประกาย · ถ้า c > 0: **ไม่มีประกาย** ring คง primary + InlineMessage info "อนุมัติครบ 53 ข้อแล้ว ส่ง QA คณะได้ — ยังมีช่องว่างวิกฤต {c} ข้อที่ควรเติม" (U1b M4) · ครั้งเดียวต่อ cycle+revision ต่อผู้ใช้
- คงไว้: `kpi-row`, `readiness-percent`, `gap-count-*`, `heatmap`, `heat-*`, `gap-list`, `gap-filter`, `pending-table`, `cycle-actions`, `cycle-to-{status}`, `cycle-reopen`, `lock-banner` (ข้อความ "ถูกล็อก", "hash <16 hex>", "เนื้อหา SAR ตรงกับที่ล็อก"), `evidence-changed`, `evidence-unchanged`, `dean-return-hint`, `go-assess`, `go-assign`, `go-export`, `state-error` เมื่อไม่มีสิทธิ์ · ไอคอน 🔒 → Icon lock

## P8. มอบหมายงาน `/app/cycles/[id]/assign`
```
crumbs: รอบประเมิน › 2569 › มอบหมายงาน   h1 "มอบหมายงาน — รอบ 2569"
การ์ด "วันสำคัญของรอบ" (2 ช่อง date + [บันทึกวันที่])   การ์ด "กรรมการประเมิน" (ถ้ามีสิทธิ์)
แถบสรุป: มอบหมายแล้ว 41/53 ข้อ (bar) · ยังไม่มีเจ้าของ 12 ข้อ [ไปข้อถัดไปที่ยังไม่มีเจ้าของ ↓]
ต่อเกณฑ์ (การ์ด ▾ พับได้ ค่าเริ่มต้นเปิด): หัว "เกณฑ์ 1: ผลลัพธ์การเรียนรู้ที่คาดหวัง" + bar มอบหมาย 5/5
  แถว bulk: ทั้งเกณฑ์ — เจ้าของ {▾} กำหนดส่ง {date} [มอบหมายทั้งเกณฑ์]
  ตาราง: ข้อ | สถานะ | เจ้าของ {select} ✓บันทึกแล้ว | กำหนดส่ง {date}
```
- เปลี่ยน: หลังเปลี่ยน select/date สำเร็จ → `aq-saved` "✓ บันทึกแล้ว" ข้างช่อง 2 วินาที + ไฮไลต์แถว L5 + toast (เดิมมีแต่ toast ที่ผู้ใช้ไม่เห็น) · ผิดพลาด = `.aq-field-error` ใต้ช่อง + ค่ากลับเป็นเดิม · **P10**: มุมมองอ่านอย่างเดียวแสดงชื่อเจ้าของจาก `listUsers` (ไม่ใช่ "(ผู้ใช้เดิม)") — ถ้าเจ้าของไม่อยู่ในรายการที่มอบหมายได้ ให้ option label = ชื่อจริง + " (มอบหมายไว้เดิม)"
- คงไว้: `cycle-due`, `cycle-dates-save`, `assessor-select`, `assessor-add`, `bulk-owner-{n}`, `bulk-due-{n}`, `bulk-apply-{n}`, `owner-{id}` (เป็น `<select>` 53 ตัว), `due-{id}` · option label ชื่อผู้ใช้ตรงตัว (E2E เลือก "อ.วิภา เขียนรายงาน", "อ.ธนา สอนดี")

## P9. Section editor `/app/sections/[id]` — stepper + sticky ส่งตรวจ + checklist ก่อนส่ง
```
crumbs: รอบประเมิน › 2569 › ข้อ 3.6
h1 "ข้อ 3.6 การพัฒนาวิชาชีพของอาจารย์"(ชื่อสั้นจาก textTh ตัด 60) (pill สถานะข้อ)   sub: รอบ 2569 · หลักสูตร · เจ้าของ อ.วิภา · กำหนดส่ง 30 ต.ค. (pill เหลือ 8 วัน)
actions: [← แดชบอร์ดรอบ]
Stepper: ① หลักฐาน (ผูกแล้ว 3) ─ ② เขียนเนื้อหา (412 คำ) ─ ③ PDCA และคะแนนตนเอง ("คะแนนตนเอง 5" เมื่อให้แล้ว / "ยังไม่ให้คะแนน" เมื่อยัง — ห้ามเขียน "5/7"; U1b m1) ─ ④ ส่งตรวจ
(readonly-reason msg ถ้าแก้ไม่ได้) (segregation-note msg warn ถ้าเป็นผู้เขียนล่าสุด)
┌ คอลัมน์หลัก (1fr) ───────────────────────────────┐ ┌ แผงข้าง 400px (≥1024; ≤1023 อยู่ใต้) ┐
│ ▾ ข้อกำหนด (RequirementCard พับ: แสดงข้อความไทย   │ │ tabs: [หลักฐาน (3)] [ความเห็น (1)] │
│   1 บรรทัด + "ดูคำอธิบาย/ตัวอย่างหลักฐาน/วิธีถึง  │ │       [ประวัติ (5)]                │
│   ระดับ 4")                                       │ │ แท็บหลักฐาน (#step-evidence):     │
│ ② เนื้อหา SAR  #step-write                        │ │  linked-evidence: E-3.6-01 ชื่อ…  │
│ [ภาษาไทย|English](tab-th/tab-en)    412 คำ         │ │   (P) (PII) [แทรก [E-3.6-01]] [×]  │
│ AI: [✦ ร่างจากหลักฐาน] [ตรวจเนื้อหา] [แปลเป็น EN]   │ │  ผูกเพิ่ม: {ค้นหารหัส/ชื่อ}       │
│ (msg info translation-review ถ้ามีธง R11)          │ │   {select link-select (เต็มกว้าง)}│
│ {textarea prose fs-md, สูงตามเนื้อหา}              │ │   [ผูก](link-btn)                 │
│ (citation-warn msg danger + รายการรหัสที่ใช้ได้)    │ │  [+ อัปโหลดหลักฐานใหม่สำหรับข้อนี้]│
│ อ้างอิงแล้ว: [E-3.6-01] [E-3.6-02]                 │ │ แท็บความเห็น: comments + ช่องใหม่ │
│ (ai-result / TranslateResult แสดงตรงนี้ใต้ textarea)│ │ แท็บประวัติ: versions + กู้คืน    │
│ ③ PDCA ที่ครอบคลุม (4 checkbox ใหญ่) + (?) PDCA     │ └───────────────────────────────────┘
│ rating-panel: คะแนนประเมินตนเอง 1–7 {▾} เหตุผล {..} │
│   [บันทึกคะแนน]  ล่าสุด: 5 คะแนน (…)               │
├ sticky action bar ─────────────────────────────────┤
│ ✓ บันทึกแล้ว 14:32   [บันทึกตอนนี้]   [ส่งตรวจ →]   ····  [ส่งกลับแก้ไข] (ประธาน) │
└────────────────────────────────────────────────────┘
```
- เปลี่ยน (M5, ข้อเสนอ UX 3):
  - จาก 3 คอลัมน์ → 2 คอลัมน์ (งานเขียนกว้างที่สุด) · ข้อกำหนดพับไว้บนคอลัมน์หลัก · AI ย้ายมาเป็นแถบเครื่องมือเหนือ textarea และผลแสดงใต้ textarea (ใกล้ข้อความที่จะได้รับผล) — **ไม่อยู่ในแท็บ** เพื่อให้ `ai-draft` มองเห็นได้เสมอ (E2E-06)
  - แผงข้าง 3 แท็บ (C5) ค่าเริ่มต้น = หลักฐาน (`link-select`, `linked-evidence` มองเห็นทันที — E2E-04/06) · testid แท็บ `sidetab-evidence|comments|history`
  - Stepper (C21): ① done ถ้า linked ≥1 · ② done ถ้าไม่มี gap R4 ของข้อนี้ (`getGaps(user,cycleId,reqId)`) · ③ done ถ้ามี self-rating และ PDCA ติ๊ก ≥1 · ④ done ถ้าสถานะ ready_for_review/approved · คลิกขั้น = เลื่อนไปส่วนนั้น (ขั้น ① เปิดแท็บหลักฐาน)
  - **Checklist ก่อนส่ง (P2)**: กด "ส่งตรวจ" → บันทึกก่อน (เดิม) → dialog confirm title "ส่งข้อ 3.6 ให้ประธานหลักสูตรตรวจ" message "หลังส่งแล้วจะแก้ไขไม่ได้จนกว่าจะถูกส่งกลับ" details = รายการ (✓ success / ! warn):
    1. "มีเนื้อหา (412 คำ)" — warn ถ้ามี gap R4 ของข้อนี้ (แสดง messageTh)
    2. "ผูกหลักฐานแล้ว 3 ชิ้น" — warn "ยังไม่ได้ผูกหลักฐาน" ถ้า 0
    3. "อ้างอิงหลักฐานในเนื้อหาครบ" — warn ถ้ามี gap R9 ของข้อนี้
    4. "ให้คะแนนประเมินตนเองแล้ว (5)" — warn ถ้าไม่มี
    5. "คำแปลได้รับการยืนยัน" — แสดงเฉพาะถ้ามีธง R11 (warn)
    6. gap ระดับ critical/high อื่นของข้อนี้ — warn ต่อรายการ
    - ปุ่ม: ไม่มี warn = "ยืนยันส่งตรวจ" · มี warn = "ยืนยันส่งตรวจ (ยังมี {n} จุดที่ควรเติม)" · ปุ่มยกเลิก = "กลับไปเติมก่อน" และเป็น focus เริ่มต้นเมื่อมี warn (C15, U1b UX-3) · ไม่บล็อก (ให้ประธานเป็นผู้ตัดสิน) ยกเว้นเนื้อหาว่าง (backend บล็อกอยู่แล้ว → แสดง error ใน dialog/toast)
    - สำเร็จ: toast "ส่งตรวจข้อ 3.6 แล้ว — ประธานหลักสูตรได้รับแจ้งเตือน" + ขั้น ④ วาดเช็ก L6 · **toast มี action "ไปข้อถัดไปของฉัน →"** (U1b UX-6): เรียก `listMyTodos(user)` หลังส่ง หา todo แรกที่ kind ∈ {fix_section, write_section, translation_review} → `router.push(sectionHref(...))`; ไม่มี = ไม่แสดง action · toast ที่มี action ค้างจนปิดหรือ 8 วินาที
  - Autosave (P3): debounce 1,500ms เดิม + **บันทึกทันทีเมื่อ** textarea blur, `visibilitychange`→hidden, `beforeunload` (sync), `registerFlush` handler ที่ `flushAll()` เรียก (ตอน logout/หมดอายุ/ออกจากแท็บอื่น — สัญญาใน ADR 6.4), เปลี่ยนแท็บภาษา · onChange ของ textarea/PDCA/คะแนน เรียก `touchSession()` (นับการพิมพ์เป็นการใช้งาน; backend throttle 60 วินาทีเอง — U1b M3) · ถ้าบันทึกใน beforeunload ไม่สำเร็จ (เช่น citation_invalid) → `event.preventDefault()` ให้เบราว์เซอร์ถามก่อนออก · save-status ใช้ C24 ("ยังไม่บันทึก — กำลังพิมพ์…" ระหว่าง dirty)
  - **P6**: คะแนนตนเอง select/เหตุผล/ปุ่ม disabled เมื่อ `!sectionEditable` และแสดงเหตุผล "ข้อนี้อยู่ระหว่างตรวจหรืออนุมัติแล้ว จึงแก้คะแนนไม่ได้" (`canSelf = can(rating.self) && cycleWritable && sectionEditable`)
  - **P5/M4**: select ผูกหลักฐาน `width:100%` ภายในแผงที่ `min-width:0` + ช่องค้นหาเหนือ select (`link-search`) กรอง option ตามรหัส/ชื่อ (ว่าง = ทั้งหมด) · option label "E-3.6-01 · ชื่อหลักฐาน" · ปุ่ม "+ อัปโหลดหลักฐานใหม่สำหรับข้อนี้" → `/app/evidence?new=1&cycle={cycleId}&req={reqId}` (หน้า evidence เปิดฟอร์มพร้อมเลือกรอบ+ข้อไว้)
  - citation-warn: เพิ่ม "รหัสที่อ้างได้ในรอบนี้: …" (จาก `citableCodes(cycleId)` แสดงสูงสุด 12 + "และอีก n") และวิธีแก้ "ลบหรือแก้รหัสที่ไม่มีอยู่ หรือผูกหลักฐานนั้นกับรอบนี้ก่อน"
  - AI result (AiResult): `pre` → `div.aq-prose` (white-space pre-wrap) คง `ai-draft-text` · ป้าย "ปกปิด n จุด" → Term redaction "ปกปิดข้อมูลส่วนบุคคล {n} จุด" · ร่างว่าง ("(ไม่มีร่าง)") → **ซ่อน pill post-check และ disable ปุ่มยอมรับ** + InlineMessage info "ยังร่างไม่ได้เพราะยังไม่มีหลักฐานที่ผูก — ผูกหลักฐานในแท็บหลักฐานก่อน" · โหมด offline: pill neutral "โหมดในเครื่อง (offline)" + Term offline + (เฉพาะ AI-2 ร่าง) `.aq-help` ใต้ pill testid `ai-offline-note`: "โหมดในเครื่องสร้างเป็นโครงร่างหัวข้อจากหลักฐานที่ผูก ไม่ใช่ร่างฉบับเต็ม — ใช้เป็นจุดเริ่มแล้วเขียนต่อเอง" (U1b m4) · ต่อท้าย/แทนที่ = segmented "ต่อท้ายข้อความเดิม | แทนที่ทั้งหมด" + Term append_replace
  - **C-8 UI**: (1) ถ้า `section.needsTranslationReview?.[lang]` → InlineMessage info เหนือ textarea ภาษานั้น testid `translation-review-{lang}`: หัว "ข้อความส่วนนี้มาจากคำแปลอัตโนมัติแบบแทนศัพท์" + "แปลประโยคที่เหลือให้ครบแล้วกดยืนยัน ระบบจะเลิกเตือน (กฎ R11)" + ปุ่ม secondary **"ยืนยันว่าตรวจคำแปลแล้ว"** testid `translation-confirm-{lang}` (แสดงเมื่อ editable) → `confirmTranslationReviewed(user, cycleId, reqId, lang)` → toast "ยืนยันคำแปลแล้ว" + reload (2) ก่อนเรียกแปล: ถ้าความยาวต้นฉบับ > `TRANSLATE_MAX_CHARS` (8,000) → ไม่เรียก API, ปุ่มแปล disabled + `.aq-btn-reason` testid `translate-too-long`: "เนื้อหายาว {n:,} ตัวอักษร เกินที่แปลอัตโนมัติได้ครั้งละ 8,000 ตัวอักษร — แปลด้วยตนเอง หรือแบ่งเนื้อหาเป็นช่วงแล้วแปลทีละช่วงโดยย้ายส่วนที่ยังไม่แปลออกชั่วคราว" (3) TranslateResult คงเดิมแต่ restyle + ป้าย needs-human ใช้ InlineMessage warn
- คงไว้: ทุก testid ในรายการ ADR 7.3 กลุ่ม section editor · ข้อความ readonly-reason "รอบถูกล็อกแล้ว แก้ไขไม่ได้" · `rating-panel` ข้อความ "ล่าสุด: 5 คะแนน" · `narrative-th` readonly เมื่อแก้ไม่ได้ · ปุ่ม save/submit/self-save ไม่ render เมื่อแก้ไม่ได้ (ไม่ใช่แค่ disabled — E2E-09/12 ตรวจ hidden/count 0) — **ยกเว้น P6**: select/เหตุผลคะแนนยัง render แบบ disabled ได้ แต่ `self-save` ต้องไม่ render เมื่อ `!canSelf`

## P10. คลังหลักฐาน `/app/evidence` — ฟอร์ม 3 ช่อง + autocomplete + inline validate
```
h1 "คลังหลักฐาน"  sub "หลักฐานชิ้นเดียวผูกได้หลายข้อ โดยไม่ต้องคัดลอก — รหัส E-x.x-nn ใช้อ้างอิงใน SAR (?)"
actions: [+ เพิ่มหลักฐาน](ev-new, primary)
toolbar หลัก: {หลักสูตร ▾}(ev-programme) {รอบ ▾}(ev-cycle) {ค้นหาชื่อ/รหัส/เนื้อหา…}(ev-search) [ตัวกรองเพิ่มเติม (2)]
  ▾ ตัวกรองเพิ่มเติม: ปี(ev-year) ประเภท(ev-kind) PDCA(ev-pdca) ข้อ(ev-req) ☐ เฉพาะที่พบ PII(ev-pii)  [ล้างตัวกรอง]
┌ ฟอร์มเพิ่มหลักฐาน (ev-form) — เปิดเป็นการ์ดบนสุดเมื่อกด ev-new ──────────────────────────┐
│ (error summary ถ้า submit ไม่ผ่าน)                                                        │
│ 1 ชื่อหลักฐาน *  {………………………………}(ev-title)                                                │
│ 2 แนบหลักฐาน * (อย่างน้อย 1 อย่าง)                                                        │
│   ┌ dropzone: ⤒ ลากไฟล์มาวาง หรือ เลือกไฟล์ (ev-file) — PDF, DOCX, XLSX, PNG, JPG, TXT, CSV ไม่เกิน 50 MB ┐ │
│   หรือ ลิงก์ {https://…}     หรือ วางข้อความ {textarea 3 แถว}(ev-text)                       │
│   (หลังเลือกไฟล์: report.pdf · 12.4 MB · msg info "ไฟล์ใหญ่กว่า 1 MB: ระบบเดโม่เก็บเฉพาะชื่อไฟล์ ขนาด และลายนิ้วมือ (hash) ไม่เก็บตัวไฟล์ จึงเปิดดาวน์โหลดภายหลังไม่ได้") │
│ 3 ผูกกับข้อ  รอบ {รอบ 2570 ▾}(ev-f-cycle)  {พิมพ์เลขข้อหรือคำค้น…}(RequirementPicker ev-f-reqs) │
│   chips: [1.1 ×] [2.1 ×]   (help "ไม่ผูกตอนนี้ก็ได้ ภายหลังผูกจากหน้าข้อได้ — รหัสจะเป็น E-0.0-nn") │
│ ▾ รายละเอียดเพิ่มเติม (ไม่บังคับ): คำอธิบาย · ประเภท(ev-f-kind) · ขั้น PDCA · ปีการศึกษา      │
│ [บันทึกหลักฐาน](ev-submit)   [ยกเลิก]                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
ev-table (stack บนมือถือ): รหัส | ชื่อ (+pill PII) | ประเภท | PDCA | ปี | ข้อที่ผูก | สถานะ
```
- เปลี่ยน: ปุ่ม `ev-new` อยู่ใน PageHeader actions (เห็นทันที ไม่ต้องผ่าน 6 ตัวกรอง) · ตัวกรองรองพับไว้ (แสดงจำนวนตัวกรองที่ใช้อยู่ในปุ่ม) · ฟอร์ม 3 ช่องหลัก + พับรายละเอียด (ค่าเริ่มต้น ประเภท=อื่น ๆ, PDCA=D, ปี=ปีปัจจุบัน พ.ศ. — เดิม) · ช่อง "รอบ" อยู่ในฟอร์ม (`ev-f-cycle`, ค่าเริ่มต้น = ค่าของ `ev-cycle`; ถ้า `ev-cycle` ว่าง ("ทุกรอบ") = รอบล่าสุดที่ยังเขียนได้ (`draft|in_progress|revision_requested`) ของหลักสูตร; ถ้าไม่มีรอบเขียนได้ = ซ่อน picker + ข้อความตาม C4) · บรรทัด "บันทึกเข้าหลักสูตร: {รหัส} — {ชื่อ}" เหนือช่องรอบ (U1b UX-8) · RequirementPicker แทน multi-select 53 บรรทัด (C4)
- **inline validate (P4)**: ตรวจฝั่ง client ก่อนเรียก `createEvidence`: (ก) ชื่อว่าง → error ใต้ ev-title "กรอกชื่อหลักฐาน เช่น รายงานการประชุมกรรมการหลักสูตร ครั้งที่ 1/2569" (ข) ไม่มีไฟล์/ลิงก์/ข้อความ → error ที่ fieldset 2 "แนบไฟล์ ใส่ลิงก์ หรือวางข้อความอย่างน้อยหนึ่งอย่าง" (ค) ลิงก์ไม่ขึ้นต้น http(s):// → error ใต้ช่องลิงก์ (ง) ตอนเลือกไฟล์: เรียก `validateFileMeta({name,size})` ทันที → ผิด = error ใต้ dropzone (ชนิด/ขนาด) และไม่เก็บไฟล์ · ไม่ผ่าน = error summary + focus summary · ฟอร์มค้างพร้อมค่าเดิม · error จาก API (AunqaError) แสดงใน error summary ด้วย (ไม่ใช่แค่ toast)
- สำเร็จ: ปิดฟอร์ม + toast "เพิ่มหลักฐาน E-1.2-01 แล้ว" + แถวใหม่ไฮไลต์ L5 + `scrollIntoView({block:'center'})` (แก้ "หน้าเลื่อนกลางตาราง" ให้มีจุดโฟกัส) · PII = dialog notify เดิม ("รับทราบ")
- query: `?new=1` เปิดฟอร์ม · `&cycle=` ตั้งรอบ · `&req=` ใส่ chip ข้อนั้น · `?pii=1` ติ๊ก ev-pii และเปิดตัวกรองเพิ่มเติม
- **P9**: ข้อความไฟล์ใหญ่ (ด้านบน) ใช้ `MAX_DATAURL_BYTES` จาก `@/lib/api` · ตาราง: รหัส `E-0.0-*` มี Term evidence_code
- empty: title "ยังไม่มีหลักฐานตามเงื่อนไขนี้" text (ถ้ามีตัวกรอง) "ลองล้างตัวกรอง" + [ล้างตัวกรอง] / (ไม่มีเลย) "เพิ่มหลักฐานชิ้นแรก เช่น รายงานการประชุม แผนพัฒนา หรือผลสำรวจ" + [+ เพิ่มหลักฐาน]
- คงไว้: `ev-programme`, `ev-cycle` (option "ทุกรอบ / ไม่ระบุรอบ", "รอบ 2570"), `ev-search`, `ev-year`, `ev-kind`, `ev-pdca`, `ev-req`, `ev-pii`, `ev-new`, `ev-form`, `ev-title`, `ev-file` (input type=file), `ev-text`, `ev-f-kind`, `ev-submit`, `ev-table`, `ev-row-{code}`, ลำดับคอลัมน์ (td แรก = รหัสใน `strong` + ลิงก์, td ที่ 2 = ชื่อ), pill มีคำว่า "PII" · **เปลี่ยน testid**: `ev-f-reqs` เป็น container ของ picker (ไม่ใช่ `<select>`) → qa-tester แก้ E2E-04/05 (ADR 7.3)

## P11. รายละเอียดหลักฐาน `/app/evidence/[id]`
```
crumbs: หลักฐาน › E-1.1-01   h1 "E-1.1-01 · {ชื่อ}" (pill สถานะ) (pill PII)
(pii-banner msg danger: พบ เลขบัตรประชาชน … [ทำเครื่องหมายว่าจัดการแล้ว])
grid 2 (≥1024): ซ้าย การ์ดข้อมูล (aq-dl: ประเภท, PDCA, ปี, ผู้เพิ่ม, ไฟล์: ชื่อ · ขนาด · (เก็บไฟล์แล้ว|เก็บเฉพาะข้อมูลไฟล์) · hash 16 ตัว + Term hash) + ev-edit
                ขวา ข้อที่ผูก (ev-links) ต่อรอบ + ผูกเพิ่ม · เวอร์ชันไฟล์ · AI แนะนำข้อ (AI-1)
```
- เปลี่ยน: restyle ตาม C7/C9/C12 · แสดงสถานะการเก็บไฟล์ (P9) · ปุ่ม 44px · ลิงก์ข้อเป็น `.aq-link aq-code`
- คงไว้: h1 มีทั้งรหัสและชื่อ (E2E-06, E2E-11) · `pii-banner` มีคำว่า "เลขบัตรประชาชน" · `ev-links`, `ev-edit` (ไม่ render เมื่อไม่มีสิทธิ์) · `state-error` เมื่อไม่มีสิทธิ์

## P12. หลักสูตร `/app/curriculum`
```
h1 "หลักสูตร (PLO · รายวิชา · CLO)"  sub เดิม  toolbar {หลักสูตร ▾}(cur-programme) (pill ดูอย่างเดียว)
tabs (C5): PLO | รายวิชาและ CLO | Matrix CLO→PLO | Heatmap วิชา×PLO | ช่องว่างหลักสูตร (4) | ผัง prerequisite | ตรวจคำกริยา Bloom (AI)
panel (cur-panel-{tab})
```
- เปลี่ยน: แท็บเป็นแบบเส้นใต้ (ไม่ใช่ pill ซ้อน pill — m5) · ตัวเลขช่องว่างในแท็บ · matrix: เซลล์ ≥40×40, ตัวอักษร I/R/M ในเซลล์ fs-base 700, ชื่อวิชา/PLO ≥16 (select ระดับในโหมดแก้ไขสูง 40), I/R/M สีตาม T1.3 #15/#28/#36 + ตัวอักษรเสมอ · heatmap วิชา×PLO ใช้ tone เดียวกับ C13 · Term: PLO, CLO, irm, bloom · ปุ่มเพิ่ม/แก้ 44 (compact 40 ในตาราง)
- empty ต่อแท็บ: PLO = "ยังไม่มี PLO — เพิ่ม PLO ข้อแรกเพื่อเริ่มผูกรายวิชา" + [+ เพิ่ม PLO] ; รายวิชา = "ยังไม่มีรายวิชา" + [+ เพิ่มรายวิชา] ; ช่องว่าง = title "ไม่พบช่องว่างของหลักสูตร" icon check-circle
- คงไว้: `cur-programme`, `cur-tab-{plo|course|matrix|heat|gaps|prereq|ai}`, `cur-panel-{tab}` และ testid ภายในแท็บทุกตัว (34 ตัวเดิม — แตะเฉพาะ className/โครงห่อ)

## P13. ตัวชี้วัด `/app/metrics` (+ C-7)
```
h1 "ตัวชี้วัด"  sub เดิม  toolbar {หลักสูตร ▾}(m-programme)
แถวการกระทำ (canWrite): [+ เพิ่ม/แก้ค่าตัวชี้วัด](metric-new)
┌ import-panel (details, การ์ดเด่น aq-card--accent, อยู่ "เหนือ" ตาราง/กราฟ) ───────────────┐
│ summary: ⤒ นำเข้าจากไฟล์ Excel — "แนะนำเมื่อมีข้อมูลหลายปี: ดาวน์โหลดแม่แบบ กรอก แล้วอัปโหลด" ▾ │
│ (เปิด) msg info ความเป็นส่วนตัว (import-privacy)                                           │
│ grid 2: [ตัวชี้วัดรายปี] [ผลการศึกษารายรุ่น]                                              │
└───────────────────────────────────────────────────────────────────────────────────────────┘
แนวโน้ม 3–5 ปี (trend-section): กราฟ 2 คอลัมน์ (มีชื่อแกน+หน่วย+ป้ายเส้น T1.4)
metric-table: จัดกลุ่มตามตัวชี้วัด (แถวหัวกลุ่ม: รหัส + ชื่อ + หน่วย) แล้วแถวปี
```
- เปลี่ยน: import panel ย้ายขึ้นและเด่น (data1 หาไม่เจอ) — **ยังเป็น `<details>` ปิดเป็นค่าเริ่มต้น** (E2E-14 คลิก summary เพื่อเปิด) · preview metric: เมื่อมีแถวไม่ผ่าน InlineMessage warn **เหนือ**ปุ่ม "มี {e} แถวไม่ผ่าน จะถูกข้าม — แก้ไฟล์แล้วอัปโหลดใหม่ได้" และปุ่ม = "ยืนยันนำเข้าเฉพาะ {ok} แถวที่ผ่าน" · สำเร็จ = InlineMessage success ในแผง (`metric-import-done`, `role="status"`) "นำเข้าแล้ว: เพิ่ม {i} · แทนที่ {u} · ข้าม {s} แถว" + check-draw L6 + toast (คิวไม่ทับคำเตือน) · cohort สำเร็จเหมือนกัน (`cohort-import-done`) · TrendChart: ชื่อแกน Y "{ชื่อ} ({หน่วย})", แกน X "ปีการศึกษา (พ.ศ.)", ค่าเลขแกนด้วย `toLocaleString('th-TH')` ตามหน่วย, ป้ายเส้นปลายทาง, ไม่แสดงตัวเลขแปลก "9.9" ที่ไม่มีหน่วย
- **C-7**: (1) `<MetricImport key={programmeId} …/>` ใน metrics page → เปลี่ยนหลักสูตร = state preview/ไฟล์ cohort รีเซ็ตทั้งหมด (2) ใน `CohortFileImport.check()` ใช้ `reqSeq = useRef(0)`: ก่อนเรียก `const my = ++reqSeq.current`; หลังได้ผล `if (my !== reqSeq.current) return;` (ทิ้งผลเก่า) ทั้งผลสำเร็จและ error · `commit()` ใช้ค่า `std` ปัจจุบันและ disabled ระหว่าง `busy` (มีอยู่) (3) ช่องจำนวนปีเปลี่ยนเร็ว ๆ = debounce 300ms ก่อน `check`
- คงไว้: `m-programme`, `metric-new`, `metric-form`, `metric-code`, `metric-period`, `metric-value`, `metric-submit`, `metric-table`, `metric-{code}-{period}`, `metric-edit-*`, `metric-save`, `trend-section`, `import-panel` (details + summary), `import-privacy`, `import-metric`, `metric-template`, `metric-file`, `metric-import-error`, `metric-preview`, `metric-ok-count`, `metric-err-count`, `metric-warnings`, `metric-preview-table`, `prev-row-{n}`, `metric-commit`, `metric-cancel`, `import-cohort`, `cohort-years`, `cohort-template`, `cohort-file`, `cohort-import-error`, `cohort-preview`, `cohort-err-count`, `cohort-row-errors`, `cohort-warnings`, `cohort-table`, `cohort-{year}` (**เซลล์ td 7 ช่อง ข้อความดิบเดิม ห้ามเติม % หรือจัดรูปแบบ** — E2E-14 เทียบตรง), `cohort-commit`, `cohort-cancel`

## P14. แผนปรับปรุง `/app/actions`
- เปลี่ยน: restyle · สถานะใช้ pill (open neutral "ยังไม่เริ่ม", in_progress primary "กำลังทำ", done info "ทำเสร็จแล้ว (รอตรวจ)", verified ok "ตรวจรับแล้ว") · ปุ่มเปลี่ยนสถานะ 44 · ตัวกรองสถานะอ่าน query `?status=` · การ์ดคำอธิบายด้านบน: "รายการที่ตรวจรับแล้ว จะกลายเป็นหลักฐานขั้น A ในรอบถัดไปโดยอัตโนมัติ" (Term pdca) · empty: "ยังไม่มีแผนปรับปรุง — สร้างจากข้อเสนอแนะของกรรมการ (AFI) หลังประเมิน หรือเพิ่มเอง" + [+ เพิ่มรายการ]
- คงไว้: testid เดิมทั้ง 14 ตัว

## P15. พื้นที่กรรมการ / ผลประเมิน `/app/cycles/[id]/assess`
```
crumbs: รอบประเมิน › 2569 › ประเมิน   h1 "พื้นที่ทำงานกรรมการ" (pill สถานะ)
(assess-notopen msg info: "รอบนี้ยังไม่เข้าสู่ขั้นการประเมิน — QA คณะหรือผู้ดูแลจะเป็นผู้เริ่ม และคุณจะได้รับแจ้งเตือนทันที")
assess-progress (การ์ด): ◔ ให้คะแนนแล้ว 3/8 · checklist ✓/○ · verdict {▾} เหตุผล {…} [บันทึก verdict]
   [ส่งผลการประเมิน (เสร็จสิ้น)](assess-finish) + .aq-btn-reason "ยังขาด: ให้คะแนนเกณฑ์ 4, 5, 6, 7, 8 · เลือก verdict"
   [Appendix B (.doc)] [Appendix D (.doc)]
tabs เกณฑ์ 1…8 (assess-crit-n, มี ✓ เมื่อให้คะแนนแล้ว)
assess-panel-n: ข้อในเกณฑ์ (SAR อ่านอย่างเดียว + หลักฐาน + คะแนนตนเองของหลักสูตร) · ข้อค้นพบ · คะแนนเกณฑ์ {▾}(crit-score) {เหตุผล}(crit-why) [บันทึกคะแนนเกณฑ์นี้](crit-save)
   หลังบันทึก: aq-saved "บันทึกแล้ว" (ไอคอน check) + [ไปเกณฑ์ {n+1} →] (testid crit-next) · **เกณฑ์ 8:** ปุ่มเดียวกัน (testid crit-next) ข้อความ "ไปสรุปผลและเลือก verdict ↓" → `scrollIntoView` การ์ด `assess-progress` + focus ช่อง `verdict-score` (U1b UX-9)
```
- เปลี่ยน: เหตุผลที่ปุ่มส่งผล disabled แสดงเป็นข้อความ (ไม่ใช่แค่ title) · ปุ่ม "ไปเกณฑ์ถัดไป" ลดการหาแท็บ (ไม่ auto-advance) · tab ✓ ใช้ Icon check + วาด L6 ตอนเพิ่งบันทึก · verdict ใช้ Term verdict · RATING_SCALE แสดงชื่อระดับไทยใน option
- คงไว้: `assess-crit-{n}`, `assess-panel-{n}`, `crit-score`, `crit-why`, `crit-save`, `rated-count` (ข้อความ "n/8"), `verdict-score`, `verdict-why`, `verdict-save`, `assess-finish`, `assess-appb`, `assess-appd`, `assess-notopen` (ข้อความ "ส่งผลประเมินแล้ว" เมื่อส่งแล้ว), `assess-hidden`, `assess-results`, `verdict-row` (มีคำว่า "verdict" และตัวเลข), ข้อความ "ประเมินตนเอง: N คะแนน" ในแผงเกณฑ์ (E2E-13 regex)

## P16. คิวรอตรวจ `/app/review`
```
h1 "รอตรวจ"  sub "ข้อที่ส่งตรวจและรอบที่รอการพิจารณาของคุณ"
(cycle-tasks) การ์ดต่อรอบ: รอบ 2569 · หลักสูตร (pill) — "รอ: อนุมัติ (QA คณะ)" [เปิดแดชบอร์ดเพื่อพิจารณา →]
review-table: ข้อ (ลิงก์+ชื่อย่อ) | รอบ | เจ้าของ | ส่งเมื่อ | สรุป | [เปิดอ่าน](primary) [อนุมัติ](secondary) ··· [ส่งกลับ](danger)
  คอลัมน์ "สรุป" (U1b UX-7, `.aq-meta` หลายบรรทัด): "หลักฐาน {n} ชิ้น · {w} คำ · คะแนนตนเอง {s|—}" + ถ้ามี pill bad "วิกฤต {c}" / pill warn "สูง {h}"
  ที่มาข้อมูล (ไม่มี API ใหม่): n = `listLinks(user, cycleId)` กรอง requirementId · w = คำของ `narrativeTh` (นับแบบเดียวกับ editor) · s = `listRatings(user, cycleId)` self ล่าสุด · c/h = `getReadiness(user, cycleId).heatmap[...].gaps` (เรียกครั้งเดียวต่อรอบ)
```
- เปลี่ยน: ปุ่มเป็นขนาดจริง (compact 40 บนเดสก์ท็อป, 44 มือถือ) ไม่ใช่ลิงก์ข้อความเล็ก · "เปิดอ่าน" เป็นปุ่มหลัก (สนับสนุนให้อ่านก่อนอนุมัติ) · แถวที่ผู้ใช้เป็นผู้เขียนล่าสุด: ปุ่มอนุมัติไม่ render + pill neutral "คุณเขียนเอง" + Term segregation · หลังอนุมัติ/ส่งกลับ: แถวจาง (opacity เฉพาะแถวที่ถูกนำออก 220ms แล้วหาย) + toast · **ไม่ทำอนุมัติเป็นชุด** (ADR 6.1 เหตุผล)
- empty: icon inbox-check "ไม่มีข้อที่รอตรวจ — เมื่ออาจารย์ส่งข้อมา จะขึ้นที่นี่และมีแจ้งเตือน"
- คงไว้: `cycle-tasks`, `review-table`, `approve-{id}`, `return-{id}`

## P17. ส่งออก `/app/export`
```
h1 "ส่งออกเอกสาร"  toolbar {หลักสูตร}(x-programme) {รอบ}(x-cycle) (pill สถานะ)
(msg warn ถ้ารอบยังไม่ล็อก: "รอบนี้ยังไม่ล็อก เนื้อหาในไฟล์เป็นฉบับร่างล่าสุด")
(msg warn export-r11-warning ถ้ามี gap R11: "มี {n} ข้อที่คำแปลยังไม่ได้ยืนยัน: 1.2 (EN), … — ตรวจก่อนส่งเอกสารจริง" + ลิงก์ไปข้อ)
grid 3: การ์ด SAR (ไอคอน file-text) [ดาวน์โหลด SAR (.docx)](primary) [ไฟล์สำรอง (.doc)] + หมายเหตุ update field
        การ์ด ดัชนีหลักฐาน [ดาวน์โหลด (.xlsx)]   การ์ด Appendix A [Appendix A (.xlsx)] [รวมทั้งสองในไฟล์เดียว]
export-assessor-section: Appendix B/D
(export-status msg success: "ดาวน์โหลด SAR_CS-B-69_2569.docx แล้ว")
```
- เปลี่ยน: ปุ่ม loading ข้อความ "กำลังสร้างไฟล์ Word…" (งาน >1s) · Term appendix_a/b/d · คำเตือน R11 (C-8 ด้านหน้า export — ข้อมูลจาก `getGaps(user, cycleId)` กรอง `ruleId==='R11'`) · หมายเหตุ "ยังไม่ล็อก" ย้ายขึ้นบนและเป็น InlineMessage
- คงไว้: `x-programme`, `x-cycle`, `export-sar-docx`, `export-sar`, `export-docx-note`, `export-index`, `export-appendix`, `export-both`, `export-assessor-section`, `export-appendix-b`, `export-appendix-d`, `export-assessor-locked`, `export-status` (ข้อความมีชื่อไฟล์ `SAR_…`)

## P18. ผู้ดูแลระบบ `/app/admin`
- เปลี่ยน: tabs C5 · ตารางผู้ใช้ stack บนมือถือ · ฟอร์มเพิ่มผู้ใช้เป็นการ์ด 2 คอลัมน์ (≥768) ด้วย `.aq-field` + inline error เหมือน P10 · ไม่มีสิทธิ์ = `NoAccess` (EmptyState icon lock title "คุณไม่มีสิทธิ์เข้าหน้านี้" text "หน้านี้สำหรับผู้ดูแลมหาวิทยาลัยและผู้ที่ดู audit log ได้" + [กลับหน้าหลัก]) · audit log: ตาราง + ปุ่มส่งออก CSV เดิม · แท็บข้อมูลเดโม่: ปุ่ม reset เป็น danger + dialog danger "ยืนยันล้างและสร้างข้อมูลเดโม่ใหม่"
- คงไว้: `tab-users`, `tab-audit`, `tab-demo`, `user-new`, `user-form`, `nu-username`, `nu-password`, `nu-name`, `nu-email`, `nu-submit`, `user-{username}`, label "บทบาท" และ "ขอบเขต" (E2E ใช้ getByLabel), ข้อความ "คุณไม่มีสิทธิ์เข้าหน้านี้"

## P19. คลังเกณฑ์ `/app/requirements`
- เปลี่ยน: ช่องค้นหาใหญ่ (44) + chip กรองเกณฑ์ 1–8 (ปุ่ม toggle `aria-pressed`) · การ์ดข้อ (RequirementCard) restyle: เลขข้อใน pill primary-tint, ข้อความไทย fs-md 600, อังกฤษ fs-sm muted, "อธิบายแบบภาษาคน" fs-base, `details` คำถามวินิจฉัย/ตัวอย่างหลักฐาน/วิธีถึงระดับ 4 (summary 44px) · ไม่พบผลค้นหา = EmptyState "ไม่พบข้อที่ตรงกับ “{q}”" + [ล้างคำค้น]
- คงไว้: testid เดิม 3 ตัว

## P20. 404 `app/not-found.tsx` (ใหม่) + เส้นทางไม่ถูกต้องในแอป
```
(พื้น bg)  ■ AUN-QA Copilot
           วงกลม primary-tint + Icon search 40
           h1 "ไม่พบหน้าที่ต้องการ"
           "ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายแล้ว"
           [กลับหน้าหลัก] (→ /app ถ้าล็อกอิน, / ถ้าไม่) [ไปหน้าแรก] (ghost → /)
```
- ทำเป็น client component อ่าน `useAuth().user` เพื่อเลือกปลายทาง · `/app/sections/xxx` ที่ไม่พบ = ErrorState (เดิม "ไม่พบรอบประเมิน") แต่เพิ่มปุ่ม [กลับรายการรอบ] · `/zzz` (หน้าเปล่าเดิม) = หน้านี้

## P21. Error / no-access / empty ที่ใช้ร่วม
- `ErrorBox` (state-error): InlineMessage danger ขนาดใหญ่ในการ์ด: หัว "โหลดข้อมูลไม่สำเร็จ" + ข้อความจาก `errMsg` + [ลองใหม่] · ถ้า `AunqaError.code === 'forbidden' | 'not_found'` → หัว "คุณไม่มีสิทธิ์ดูข้อมูลนี้" / "ไม่พบข้อมูล" + ปุ่ม [กลับหน้าหลัก] (ไม่มี "ลองใหม่") — ต้องส่ง `code` เข้า ErrorBox (ปรับ `useLoad` เก็บ `errorCode`)
