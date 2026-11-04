# FIGMA-INTAKE — แผนรับงานออกแบบจาก Figma (ยังไม่แก้ UI)

- **สถานะ:** พร้อมใช้ (เตรียมการ) · **วันที่:** 2026-11-04 · **ผู้เขียน:** architect · **งาน:** TASK-0003 S2 (AC5)
- **ฐานปัจจุบัน:** ADR-UI-002 (stack Tailwind 3.4 + shadcn primitives + next-themes) + ADR-UI-003 (Earth/Friendly) + `ui/earth-tokens.md` + `ui/friendly-spec.md`
- **ใช้เมื่อ:** เจ้าของส่ง Figma มา → orchestrator เปิด TASK ใหม่ (ขนาด L) แล้วเดินตาม §5

---

## 1. สิ่งที่ขอจากเจ้าของ (copy ส่งได้เลย)

> **ขอของจาก Figma เพื่อให้ทีมทำตามได้ตรงแบบครับ**
>
> **ทางที่ 1 (ดีที่สุด) — แชร์ลิงก์ไฟล์**
> - [ ] ลิงก์ไฟล์ Figma ตั้งสิทธิ์ "Anyone with the link can view" (ถ้ามี Dev Mode เปิดให้ด้วยจะดีมาก)
> - [ ] บอกชื่อ Page ใน Figma ที่เป็นฉบับจริง (ไม่ใช่หน้าร่าง/ทดลอง)
>
> **ทางที่ 2 — ถ้าแชร์ลิงก์ไม่ได้ ส่งไฟล์แทน**
> - [ ] Export PNG ทุกเฟรม ที่ 2x (ตั้งชื่อเฟรมตามหน้า เช่น `app-home-1440`, `login-390`)
> - [ ] บอกขนาดจอของแต่ละเฟรม — ทีมใช้ 3 ขนาดหลัก: มือถือ 390, แท็บเล็ต 768, คอม 1440 (ถ้าออกแบบแค่บางขนาด บอกด้วยว่าขนาดที่เหลือให้ทีมจัดเอง)
> - [ ] ถ้ามีทั้งโหมดสว่างและโหมดมืด ส่งทั้งสองชุด (ถ้าไม่มีโหมดมืด ทีมจะคุมโหมดมืดเดิมให้เข้าโทนเอง)
>
> **ค่าดีไซน์ (สำคัญมาก — ทำให้ไม่ต้องเดาสี)**
> - [ ] Variables / Styles: สี (แยก Light/Dark ถ้ามี), ฟอนต์ (ชื่อ, ขนาด, น้ำหนัก, ระยะบรรทัด), ระยะห่าง (spacing), ความมนมุม (radius), เงา
> - [ ] ถ้าไม่ได้ทำ Variables ไว้ — แค่จดค่าสีหลัก ๆ เป็น hex ในเฟรมเดียวก็พอ
>
> **ชิ้นส่วนและการทำงาน**
> - [ ] รายการ component (ปุ่ม, ช่องกรอก, การ์ด, ตาราง, แท็บ, ป้ายสถานะ, แจ้งเตือน ฯลฯ) พร้อมสถานะ ปกติ / ชี้ / กด / ปิดใช้ / ผิดพลาด
> - [ ] Prototype flow หรือลูกศรบอกว่ากดอะไรแล้วไปไหน (เฉพาะจุดที่เปลี่ยนจากเดิม)
> - [ ] ไอคอน/โลโก้/ภาพประกอบ เป็น SVG (ไอคอนถ้าใช้ชุด Lucide บอกชื่อก็พอ)
> - [ ] ฟอนต์: ถ้าเปลี่ยนจาก IBM Plex Sans Thai Looped บอกชื่อฟอนต์ + ต้องเป็นฟอนต์ที่มีภาษาไทยและใช้ฟรีได้
>
> **ขอบเขต**
> - [ ] หน้าไหน **เปลี่ยน** / หน้าไหน **คงเดิม** (ดูรายการหน้าในข้อ 2.3 แล้วติ๊กได้เลย)
> - [ ] อะไรที่ "แค่ไอเดีย" ไม่ต้องตรงเป๊ะ vs อะไรที่ "ต้องตรงทุกพิกเซล"
> - [ ] ถ้าดีไซน์ใหม่ขัดกับเรื่องอ่านง่าย (ตัวเล็กกว่า 16px, ปุ่มเล็กกว่า 44px, สีจางเกิน) ทีมจะปรับให้ผ่านเกณฑ์แล้วแจ้งกลับ — ตกลงไหมครับ

---

## 2. Inventory ปัจจุบัน (ฐานที่ Figma จะมาแทน)

### 2.1 Design token — ที่อยู่จริง
| กลุ่ม | ที่กำหนด | ค่าปัจจุบัน (สรุป) |
|---|---|---|
| สี 34 token × 2 ธีม | `eduflow-next/app/globals.css` `:root` / `.dark` (HSL channel) · ค่าอ้างอิง hex = `ui/earth-tokens.md` §E1 | background, foreground, card(+fg), popover(+fg), primary(+fg, muted), secondary(+fg), muted(+fg), accent(+fg), border, input, ring, destructive(+fg, muted), success(+muted), warning(+muted), info(+muted), clay(+muted), chart-1..5 · light: ทราย `#F7F5EE` / เสจ `#3F6B5C` · dark: ถ่านอุ่น `#26211C` / ครีม `#EDE4D8` |
| ไม่ใช่สี | `globals.css :root` | `--radius 0.625rem`, `--topbar-h 4rem`, `--sidebar-w 16.5rem`, `--user-scale` (ตั้งจาก `lib/ui/prefs.ts`) |
| Tailwind mapping | `eduflow-next/tailwind.config.ts` | `colors` = `hsl(var(--x) / <alpha-value>)` · `screens` sm480 md768 lg1024 xl1280 2xl1536 · `fontSize` xs .8125 / sm .875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875 / 4xl 2.25 / 5xl 3 rem (line-height 1.35–1.7) · `borderRadius` sm/md/lg/xl จาก `--radius` · `fontFamily.sans` = `var(--font-plex-thai)` · `spacing.topbar/sidebar` · `zIndex` sticky10 topbar30 drawer40 dialog50 toast60 loader70 · `transitionDuration` instant100…highlight1600 · easing enter/move/exit/hover · keyframes 14 ตัว |
| spacing | Tailwind ค่าเริ่ม (4px = `1` = 0.25rem) | ไม่มี token แยก |
| เงา | Tailwind ค่าเริ่ม | light: การ์ด `shadow-sm`, popover/panel `shadow-lg` · dark: ไม่มีเงา ใช้ขอบ |
| ฟอนต์ | `next/font` (self-host) ใน `app/layout.tsx` | IBM Plex Sans Thai Looped |
| role class (เทสต์ใช้วัดขนาด) | `globals.css @layer components` | XS: `aq-pill aq-badge aq-count aq-heat-cell__label aq-chart-label aq-kbd` · SM: `aq-help aq-meta aq-crumbs aq-btn-reason aq-field-error aq-saved aq-nav-group aq-kpi__label aq-step__meta aq-legend aq-progress__label aq-term__body aq-heat-label` |
| ADR ที่ล็อกค่า | ADR-UI-003 D1 + earth-tokens §E2 (contrast 42 คู่ × 2 ธีม) | `tests/contrast.test.ts` ล็อก hex ทั้ง 34 × 2 |

### 2.2 Component
| ชั้น | ไฟล์ | export / หมายเหตุ |
|---|---|---|
| Primitives (shadcn ดัดแปลง) | `eduflow-next/components/ui/primitives/` | `button.tsx` (variant default/outline/ghost/destructive/destructiveOutline · size default/compact/icon · hook `aq-btn`, `aq-btn-compact`) · `badge.tsx` · `card.tsx` (Card/Header/Title/Description/Content/Footer) · `input.tsx` · `textarea.tsx` · `native-select.tsx` (native `<select>`) · `alert.tsx` · `table.tsx` · `skeleton.tsx` |
| Page primitives | `eduflow-next/components/aunqa/common.tsx` | `PageHeader`, `InlineMessage`, `Skeleton`(5 แบบ), `Loading`, `ErrorBox`, `Empty`, `Badge` + `Cycle/Section/EvidenceStatusBadge`, `HeatLegend`, `AsyncButton`, `ModelBadge` |
| Shell | `components/aunqa/` | `AppShell`, `AppTopbar`, `AppSidebar` (drawer <1024), `UserMenu`, `NotificationPanel` (popover ≥768 / sheet <768) |
| ส่วนกลางอื่น | `components/ui/` | `Icon` (SVG Lucide inline ไม่มี package), `BrandMark`, `AppLoader`, `ProgressRing`, `Stepper`, `Term`, `Toast`, `DisplayPrefs`, `LangToggle` (segmented), `ThemeProvider/ThemeToggle`, `NotFoundView` · dialog: `context/DialogContext.tsx` |
| เฉพาะงาน | `components/aunqa/` | `SarWorkspace`, `RequirementPicker`, `RequirementCard`, `MetricImport`, `TrendChart` (SVG เอง), `TranslateResult` |
| Auth / Landing | `components/auth/*` (AuthLayout, LoginForm, RequestAccessForm, InviteAcceptForm) · `components/landing/*` 7 ไฟล์ | |

### 2.3 หน้า/route ที่ต้องมีเฟรมเทียบ (เจ้าของติ๊ก เปลี่ยน/คงเดิม)
| # | route | เปลี่ยน? | หมายเหตุ |
|---|---|---|---|
| P1 | `/` landing | ☐ | |
| P2 | `/login` | ☐ | มี `?reason=` (ข้อความเหตุผล) |
| P3 | `/request-access` | ☐ | |
| P4 | `/invite` | ☐ | |
| P5 | 404 | ☐ | |
| S | Shell: topbar, sidebar, drawer มือถือ, เมนูผู้ใช้, panel แจ้งเตือน (desktop+มือถือ) | ☐ | ใช้ทุกหน้าใน `/app` |
| P6 | `/app` หน้าหลัก | ☐ | |
| P7 | `/app/review` | ☐ | |
| P8 | `/app/cycles` | ☐ | |
| P9 | `/app/cycles/[id]` แดชบอร์ด + heatmap | ☐ | |
| P10 | `/app/cycles/[id]/assign` | ☐ | |
| P11 | `/app/cycles/[id]/assess` | ☐ | |
| P12 | `/app/sections/[id]` SAR editor | ☐ | หน้าซับซ้อนสุด |
| P13 | `/app/evidence` + ฟอร์ม | ☐ | |
| P14 | `/app/evidence/[id]` | ☐ | |
| P15 | `/app/curriculum` (ทุกแท็บ) | ☐ | |
| P16 | `/app/metrics` | ☐ | |
| P17 | `/app/actions` | ☐ | |
| P18 | `/app/requirements` | ☐ | |
| P19 | `/app/export` | ☐ | |
| P20 | `/app/admin` (ผู้ใช้/คำขอ/audit/demo) | ☐ | |
| X | สถานะกลาง: loading/skeleton, empty, error, session-lost, readonly-banner, dialog ยืนยัน, toast | ☐ | |

---

## 3. Mapping แม่แบบ Figma → CSS variable / Tailwind key

กติกา: **ชื่อ CSS variable และชื่อ Tailwind key คงเดิมเสมอ** (ทั้งแอปอ้างชื่อเหล่านี้) — เปลี่ยนแค่ "ค่า" · ถ้า Figma มี token ที่ไม่มีคู่ → เพิ่มใหม่ใน ADR (additive) ห้ามเปลี่ยนชื่อเดิม

| Figma (ชื่อแนะนำ / ที่มักพบ) | CSS variable | Tailwind | หมายเหตุ |
|---|---|---|---|
| color/bg, surface/page | `--background` | `bg-background` | mode Light→`:root`, Dark→`.dark` |
| color/text, text/primary | `--foreground` | `text-foreground` | |
| surface/card, surface/raised | `--card` (+`--popover` ถ้าไม่แยก) | `bg-card`, `bg-popover` | |
| brand/primary | `--primary` / `--ring` | `bg-primary`, `text-primary`, outline focus | ring = primary ถ้าไม่ระบุ |
| brand/on-primary | `--primary-foreground` | `text-primary-foreground` | |
| brand/primary-subtle | `--primary-muted` | `bg-primary-muted` | |
| surface/subtle, neutral/100 | `--muted` = `--secondary` = `--accent` | `bg-muted` ฯลฯ | ถ้า Figma แยก 3 ค่า → แยกได้ (ชื่อมีอยู่แล้ว) |
| text/secondary | `--muted-foreground` | `text-muted-foreground` | ต้อง ≥4.5:1 บน bg/card/muted |
| border/subtle | `--border` | `border` (ค่าเริ่ม) | ตกแต่ง |
| border/control | `--input` | `border-input` | ต้อง ≥3:1 |
| status/danger, -subtle, on-danger | `--destructive`, `-muted`, `-foreground` | `*-destructive*` | |
| status/success, warning, info (+subtle) | `--success(-muted)`, `--warning(-muted)`, `--info(-muted)` | `*-success*` ฯลฯ | สถานะต้องมีไอคอน+ข้อความด้วย |
| accent/secondary (ตกแต่ง) | `--clay`, `--clay-muted` | `*-clay*` | ห้ามใช้เป็นปุ่ม/สถานะ |
| chart/1..5 | `--chart-1..5` | `*-chart-N` | |
| radius/sm, md, lg, xl | `--radius` (ค่ากลาง = lg) | `rounded-sm/md/lg/xl` (คำนวณจาก `--radius`) | ถ้า Figma ไม่เป็นขั้นบันได ±2px → ADR กำหนด `borderRadius` ตรงตัว (rem) |
| radius/full | — | `rounded-full` | |
| spacing/1..N (px) | — | Tailwind scale (`p-4` = 16px = 1rem) | แปลง px→rem /16; ค่านอก scale → เพิ่ม `theme.extend.spacing` เป็น rem (ห้าม `p-[13px]`) |
| typography/{caption, body-sm, body, h4..h1, display} | — | `text-xs … text-5xl` (+line-height ในตัว) | ขั้นต่ำ: caption ≥13px (เฉพาะ role XS), รอง ≥14px (role SM), เนื้อหา ≥16px |
| font weight | — | `font-normal/medium/semibold/bold` | ต้องมีน้ำหนักนั้นใน next/font |
| font family | `--font-plex-thai` (next/font) | `font-sans` | เปลี่ยนฟอนต์ = แก้ `app/layout.tsx` + AC-09 ใน `ui-u.spec.ts` |
| shadow/sm, md, lg | — | `shadow-sm/md/lg` (หรือ `theme.extend.boxShadow`) | dark ไม่ใช้เงา |
| layout/topbar-height, sidebar-width | `--topbar-h`, `--sidebar-w` | `h-topbar`, `w-sidebar` | |
| breakpoints (frame width) | — | `screens` 480/768/1024/1280 | เฟรม 390→ base, 768→`md`, 1440→`xl` |
| motion/duration, easing | — | `duration-*`, `ease-*` | |
| elevation/z | — | `z-sticky…z-loader` | ไม่ต้องรับจาก Figma |

ขั้นแปลงค่าสี: hex จาก Figma → HSL channel **ด้วยสคริปต์** (round-trip 8 บิตต้องตรง) ตาม earth-tokens §E1 · ห้ามแปลงมือ

---

## 4. ข้อจำกัดที่ต้องรักษา (ดีไซน์ใหม่ห้ามทำให้ข้อเหล่านี้พัง)

| # | ข้อจำกัด | ที่มา / เทสต์ที่พึ่ง |
|---|---|---|
| L1 | **native control**: `<select>` (ผ่าน `NativeSelect`), `<details>/<summary>`, `<input type=file>` แบบ dropzone โปร่งใส, checkbox native — ห้ามแทนด้วย Radix Select/Accordion/Checkbox แม้ Figma วาดเป็น dropdown custom (แต่งหน้าตาบน native แทน) | E2E `selectOption`, `locator('summary').click()`, `setInputFiles` |
| L2 | **แท็บ = `button[role=tab][aria-selected]`** | `getByRole('tab')` + target audit |
| L3 | **ทุกขนาดเป็น rem** (`html{font-size:var(--user-scale)}`) — ห้าม px ตายตัวสำหรับตัวอักษร/ความสูง control | `ui-u.spec` fontScale 125% ไม่มี h-scroll |
| L4 | ตัวอักษร ≥16px (≥14 role SM, ≥13 role XS) · target ≥44px (compact 40 ที่ ≥1024, `aq-term__btn`/`aq-chip__remove` ≥32) · ไม่มี h-scroll ที่ 390/768/1440 · ต้องคงชื่อ role class `aq-*` ของข้อความเล็ก | `ui-u.spec.ts` AC-02/03/05 |
| L5 | focus = CSS `outline` ≥2px contrast ≥3 (ห้ามใช้ `ring-*`/box-shadow แทน, ห้าม `outline-none`) · skip link `a.aq-skip` เป็น focus แรก · drawer trap + Esc คืน focus `nav-menu` | `ui-u.spec.ts` AC-06 |
| L6 | contrast AA ทุกคู่ข้อความ (4.5 / 3 สำหรับขอบ control+ไอคอน) **ทั้งสองธีม** — ถ้าสี Figma ไม่ผ่าน ทีมปรับเฉดแล้วแจ้งเจ้าของ | `tests/contrast.test.ts` |
| L7 | **ห้ามดำสนิท/ขาวจ้าใน dark**: `.dark --background` luminance ≥0.012, `--foreground` ≠ `#FFFFFF`, ห้าม `bg-black` ทึบ / `text-white` ใน dark · token parity :root = .dark | contrast.test + earth-tokens §E2 |
| L8 | reduced-motion: กฎ global ปิด animation ต้องคง · ห้าม animation วน (ยกเว้น loading) · AppLoader ต้องมี animation เมื่อไม่ลด motion | `ui-u.spec.ts` AC-08/AC-31 |
| L9 | **i18n แปลโดยแก้ text ใน DOM** (`lib/i18n/dom-translate` + `dict*.ts`): ข้อความใหม่ต้องเพิ่มใน dict ทั้ง TH/EN · เผื่อความยาวอังกฤษ · ห้าม portal ที่ re-render ข้อความ (Radix Popover/Dialog) | ADR-UI-002 D3, ADR-UI-003 (ไม่เพิ่ม lib) |
| L10 | **session-lost guard** (`AppShell.tsx:71-85`) ดัก click ด้วย `closest('button, a, select, input, [role="button"], [role="tab"], summary, label')` และ keydown ด้วย `closest('button, a, select, input, [role="button"], [role="tab"], [role="combobox"], summary, [contenteditable="true"]')` ยกเว้น `[data-session-lost-ok], textarea` — control แบบใหม่ต้องเป็น element/role ในรายการนี้ ไม่งั้นต้องแก้ AppShell + เทสต์คู่กัน | flows-b session-lost |
| L11 | **testid / ข้อความ / โครงที่เทสต์อ้าง**: data-testid ทั้งหมด (SYSTEM_MAP F3 + friendly-spec testid contract), h1 หน้าละ 1, ชื่อปุ่มไทยใน dialog, `#app-sidebar.is-open`, `#main`, `[hidden]` ของ narrative TH/EN, ลำดับคอลัมน์ตาราง + `<strong>` คอลัมน์แรก, 53 `heat-*` / `owner-*` | e2e 12 ไฟล์ |
| L12 | ไอคอนเดี่ยวบน topbar ต้องมีป้าย (ADR-UI-003) · ไม่มี emoji ใน UI · ฟอนต์ self-host ห้ามเรียก Google Fonts · ไม่เพิ่ม UI dependency โดยไม่ผ่าน ADR + เจ้าของ | AC-09/AC-10 |
| L13 | logic/data ไม่เปลี่ยนในงาน UI: `lib/api`, `lib/utils`, `lib/mock-data` ห้ามแตะ (ADR-UI-003 D10) | review |

---

## 5. ขั้นตอนทำงานเมื่อได้ Figma

| ขั้น | agent | ทำอะไร | ไฟล์ที่แตะ | ด่าน |
|---|---|---|---|---|
| F0 Intake | orchestrator | เปิด TASK ใหม่ (L), เก็บ PNG/ลิงก์ไว้ `.agents/decisions/ui/figma/<YYYY-MM-DD>/` (ผ่าน architect), ตรวจ checklist §1 ครบไหม ขาด → ถามเจ้าของ ≤3 ข้อ | TASK file | |
| F1 Read | code-reader | อัปเดต SYSTEM_MAP หัวข้อ Frontend (ตอนนี้บางส่วนยังเป็นสภาพก่อน TASK-0002) + grep testid/role/ข้อความที่ E2E อ้าง ทำ "รายการห้ามเปลี่ยน" | `.agents/SYSTEM_MAP.md` | |
| F2 Design | architect (+ ui-inspector อ่าน Figma ทำตาราง diff เฟรม↔หน้าปัจจุบัน) | **ADR-UI-004** + `ui/figma-tokens.md` (ตาราง §3 ใส่ค่าจริง hex light/dark + ตาราง contrast ทุกคู่) + `ui/figma-spec.md` (ต่อหน้า: เปลี่ยนอะไร, testid, ข้อความ TH/EN ใหม่, breakpoint ของทุก control) · ระบุจุดที่ Figma ขัด §4 และทางแก้ | `.agents/decisions/**` | **เจ้าของอนุมัติแผน** (+ เปลี่ยนฟอนต์/เพิ่ม dependency ต้องอนุมัติแยก) |
| F3 Token | frontend-dev | แก้ค่า `:root/.dark` (สคริปต์แปลง hex→HSL), `tailwind.config.ts` (fontSize/radius/spacing/shadow ที่เพิ่ม) | `app/globals.css`, `tailwind.config.ts`, (`app/layout.tsx` ถ้าเปลี่ยนฟอนต์) | qa ปรับ `tests/contrast.test.ts` ล็อก hex ชุดใหม่ **ก่อน**ไปขั้นถัดไป |
| F4 Primitives | frontend-dev | ปรับ variant/size ใน `components/ui/primitives/*` + `components/aunqa/common.tsx` + shell (`AppTopbar/AppSidebar/UserMenu/NotificationPanel`) — คง API/prop/testid เดิม (เพิ่ม variant ได้ ไม่ลบ) | `components/ui/**`, `components/aunqa/{common,App*,UserMenu,NotificationPanel}.tsx` | ui-inspector ตรวจหน้า component + shell เทียบเฟรม |
| F5 ทีละหน้า | frontend-dev (แตกเป็น subtask ต่อกลุ่มหน้า — ทำต่อเนื่องคนเดียวเพราะโซนเดียว ไม่ขนานกันในไฟล์เดียว) | ลำดับ: public (P1–P5) → หน้าหลัก P6 → รายการ (P7, P8, P13, P17–P19) → แดชบอร์ด/assign/assess (P9–P11) → หลักสูตร/ตัวชี้วัด (P15, P16) → SAR editor P12 → admin P20 · ข้อความใหม่เพิ่ม `lib/i18n/dict*.ts` | `app/**/page.tsx`, `components/**`, `lib/i18n/**` | ต่อกลุ่ม: tsc + e2e ที่เกี่ยว + ui-inspector เทียบเฟรม |
| F6 Review | reviewer | review diff ทั้งชุดเทียบ ADR-UI-004 + §4 | `.agents/reviews/` | APPROVE |
| F7 Test | qa-tester | ปรับเทสต์ที่ผูกค่าดีไซน์ (contrast, theme, testid ที่ย้ายตาม spec — ไม่ลดสิ่งที่ทดสอบ) + เพิ่ม visual check (ข้างล่าง) + รัน tsc/vitest/e2e ครบ | `eduflow-next/tests/**`, `eduflow-next/e2e/**` | ผ่านหมด |
| F8 UI & Play | ui-inspector + playtester | เทียบเฟรมทุกหน้า × 390/768/1440 × light/dark; เล่นครบทุก role | `.agents/reviews/`, `.agents/screenshots/` | ไม่มี blocker/major |
| หลัง dev ทุกเฟส | docs-writer, diagram-designer, thesis-writer | ภาพหน้าจอในเล่ม/คู่มือทำใหม่ (ตามกฎ docs last) | | |

### วิธีเทียบภาพ (Playwright — ไม่ต้องเพิ่ม dependency)
1. **ภาพอ้างอิง:** PNG จาก Figma ต่อเฟรม ชื่อ `<route-slug>-<width>-<theme>.png` ใน `.agents/decisions/ui/figma/<date>/`
2. **ภาพจริง:** สคริปต์ ui-inspector (`.agents/playtest/`) ใช้ `page.setViewportSize({width: <ความกว้างเฟรม>, height: 900})` → `loginAs` role ที่เหมาะ → ตั้งธีมผ่าน `localStorage.aunqa_theme` → `emulateMedia({reducedMotion:'reduce'})` (กันภาพกลาง animation) → รอ `settle` แบบเดียวกับ `ui-u.spec.ts` → `page.screenshot({ fullPage: true })` เก็บ `.agents/screenshots/TASK-xxxx/`
3. **เทียบ:** สร้างหน้า HTML side-by-side + overlay (ภาพจริงทับเฟรม opacity 50%) แล้ว ui-inspector ตรวจด้วยตา ตามรายการ: สี token, ระยะห่าง, ขนาดตัวอักษร, ลำดับชิ้นส่วน, สถานะ hover/focus/disabled — **ไม่ใช้ pixel diff เทียบกับ Figma เป็นเกณฑ์ผ่าน** (ฟอนต์ render ต่างกันจะแดงทั้งภาพ)
4. **กันถอยหลังหลังทำเสร็จ:** qa ใช้ `expect(page).toHaveScreenshot()` ของ Playwright (มีในตัว) เก็บ baseline จาก "หน้าจริงที่ผ่านการเทียบแล้ว" สำหรับหน้าหลัก ๆ — ข้อมูลเดโม่ต้องคงที่ (ใช้ seed + mask เวลา/วันที่ด้วย `mask`)

---

## 6. ถ้าเจ้าของมี Figma MCP / Dev Mode MCP

ไม่ต้องติดตั้งตอนนี้ — ทางเลือกเรียงจากแนะนำ (รายละเอียด endpoint/ชื่อ tool ให้ researcher ยืนยันกับเอกสาร Figma ปัจจุบันก่อนตั้งจริง เพราะเปลี่ยนบ่อย):

| ทางเลือก | ต้องมี | วิธีเชื่อม (คร่าว ๆ) | ข้อดี / ข้อควรระวัง |
|---|---|---|---|
| A. **Figma Dev Mode MCP (local)** | Figma Desktop + สิทธิ์ Dev Mode (แผน Professional ขึ้นไป หรือ seat ที่มี Dev Mode) | เปิดใน Figma Desktop: Preferences → Enable Dev Mode MCP Server → ได้ endpoint ภายในเครื่อง (`http://127.0.0.1:3845/...`) → เพิ่มใน Claude Code เช่น `claude mcp add --transport http figma-dev-mode http://127.0.0.1:3845/mcp` | agent ดึงค่า variables, โค้ดอ้างอิง, ภาพของเฟรมที่เลือกได้ตรง ไม่ต้อง export · ต้องเปิด Figma ค้างไว้บนเครื่องเดียวกัน |
| B. **Figma remote MCP** (ของ Figma ทางเว็บ) | บัญชี Figma + login OAuth | เพิ่ม server แบบ http ชี้ endpoint ของ Figma แล้ว login ครั้งแรก | ไม่ต้องเปิดแอป · ต้องยืนยันว่าแผนบัญชีรองรับ |
| C. Figma REST API (personal access token) | token ของเจ้าของ | สคริปต์อ่าน `/v1/files/:key`, `/v1/files/:key/variables/local`, `/v1/images` | ใช้ได้ทุกแผน (variables API อาจต้องแผน Enterprise) · **token = secret** เก็บใน `.env` เท่านั้น ห้าม commit/พิมพ์ |
| D. ไม่มี MCP | — | ใช้ export PNG/SVG + ตารางค่าตาม §1 | ช้ากว่าแต่ใช้ได้เสมอ |

ข้อตกลงเมื่อใช้ MCP:
- การเพิ่ม MCP server = แก้ config ของ Claude Code (`.mcp.json` / `.claude/**`) → **orchestrator ทำ + เจ้าของอนุมัติ** (โซน Team setup)
- โค้ดที่ MCP สร้าง (React + Tailwind แบบ absolute/px) **ใช้เป็นข้อมูลอ้างอิงเท่านั้น** — ห้ามวางตรง; ต้องแปลงเป็น primitives เดิม + rem + token ตาม §3–4
- ค่า variables ที่ดึงได้ → architect ลงตาราง `ui/figma-tokens.md` (เป็นแหล่งจริงแทน PNG)

---

## จุดที่ต้องให้เจ้าของอนุมัติ (ตอนเริ่มงาน Figma จริง)
- แผน ADR-UI-004 (งาน L) · เปลี่ยนฟอนต์ · เพิ่ม dependency UI ใด ๆ · ติดตั้ง/ตั้งค่า MCP หรือใช้ token Figma · ถ้า Figma ขัด §4 แล้วเจ้าของอยากคงตามแบบ (ต้องยอมแก้/ลดเทสต์ — ทีมไม่ตัดสินเอง)
