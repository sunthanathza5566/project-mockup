# ADR-UI-001 ภาคผนวก C — Component inventory + states (ฉบับล็อก)

> ใช้คู่กับ `../ADR-UI-001-redesign.md` และ `tokens.md` · ค่าทุกตัวอ้าง token ใน tokens.md
> กฎรวม: (1) **class prefix เดียว `aq-`** (คงชื่อเดิมที่หน้าใช้อยู่ เช่น `aq-btn`, `aq-card`, `aq-input`, `aq-table` แล้ว restyle; ลบ `dash-*`, `auth-*`, `ll-*`, `nav-*`, `hero*`, `motto-*`, `btn-*`, `cta-*`, `toast` เดิมเมื่อย้ายครบ) (2) **`data-testid` เดิมทุกตัวต้องคงอยู่บน element ที่มีบทบาทเดิม** (รายการใน ADR หัวข้อ 7.3) (3) ทุกสถานะ = สี + ไอคอน + ข้อความ (4) ข้อความไทยใหม่ทุกข้อความต้องเพิ่มคู่ EN ใน `lib/i18n/dict-aunqa.ts`
> ทุกจุดที่เขียนว่า "fs-sm" ต้องใช้ class ในรายการ tokens.md T2.3 (meta ทั่วไป เช่น บทบาทใต้ชื่อ วันที่ ชื่อเกณฑ์ใน option = `.aq-meta`) · "fs-xs" ใช้ได้เฉพาะ class 13px ใน T2.3
> ตำแหน่งไฟล์: primitive ใหม่อยู่ใน `eduflow-next/components/ui/` · คอมโพเนนต์ที่ผูกโดเมนอยู่ใน `eduflow-next/components/aunqa/` · ป้ายข้อความ/ตารางแมปอยู่ใน `eduflow-next/lib/ui/`

## C0. Icon (`components/ui/Icon.tsx`) — ใหม่
- API: `<Icon name="check-circle" size={20} label?="..." />` · ไม่มี label = `aria-hidden="true"`; มี label = `role="img" aria-label`
- SVG 24×24 viewBox, `stroke="currentColor"`, `stroke-width=1.75`, `fill="none"`, round cap/join · ขนาดที่ใช้: 16 (ใน pill), 20 (ปุ่ม/เมนู), 24 (empty state หัว), 40 (empty state ใหญ่)
- ชื่อที่ต้องมี (ครบชุดนี้เท่านั้น): `home, inbox-check, calendar-cycle, folder, book-open, chart-line, list-check, library, download, shield-user, bell, user, log-out, menu, x, chevron-down, chevron-right, chevron-left, check, check-circle, alert-triangle, x-circle, info, clock, lock, pencil, undo, upload, link, search, filter, sparkle, languages, eye, eye-off, plus, trash, external, help-circle, circle-dashed, settings, type (ขนาดตัวอักษร), file-text, users`
- path data: วาดเองหรือคัดลอกจาก Lucide (ISC) ได้ โดยใส่ comment ลิขสิทธิ์ ISC ของ Lucide ไว้หัวไฟล์ — **ไม่ติดตั้ง package**

## C1. Button (`.aq-btn`)
| variant | class | พื้น / ตัวอักษร / ขอบ | ใช้เมื่อ |
|---|---|---|---|
| primary | `aq-btn aq-btn-primary` | primary / #FFF / primary | การกระทำหลัก 1 ปุ่มต่อพื้นที่ (ส่งตรวจ, บันทึกหลักฐาน, อนุมัติ) |
| secondary | `aq-btn` (default) | surface / primary / border-control 1px | การกระทำรอง |
| ghost | `aq-btn aq-btn-ghost` | transparent / primary / none | ในแถบเครื่องมือ, ยกเลิก, ปุ่มไอคอน |
| danger | `aq-btn aq-btn-danger` | surface / danger / danger 1px | ส่งกลับแก้ไข, ลบ (ก่อนยืนยัน) |
| danger-solid | `aq-btn aq-btn-danger-solid` | danger / #FFF | ปุ่มยืนยันลบ **ใน dialog เท่านั้น** |
| icon | `aq-btn aq-btn-icon` + variant | 44×44, ไอคอน 20 | ต้องมี `aria-label` + Tooltip |
ขนาด: สูง `--control-h` (44) padding-inline `--sp-5` font `--fs-base` 600 · `aq-btn-compact` = `--control-h-sm` (ใช้ในแถวตาราง) · ไอคอนนำหน้าห่าง `--sp-2` · `radius --r-md`

| state | กฎ |
|---|---|
| default | ตามตาราง |
| hover | primary → primary-strong; secondary/ghost → พื้น primary-tint; danger → พื้น danger-bg · `--dur-fast --ease-hover` |
| active (pressed) | `transform: translateY(1px)`, primary → primary-strong, เงา none · `--dur-instant` |
| focus-visible | T9 (outline 3px primary offset 2px) |
| disabled | พื้น surface-2, ตัว muted (คู่ #7), ขอบ border-subtle, `cursor:not-allowed`, **ไม่ใช้ opacity** · ถ้าปุ่มสำคัญ disabled ต้องมีข้อความเหตุผลมองเห็นได้ข้างปุ่ม (`.aq-btn-reason`, fs-sm muted) ไม่ใช่แค่ title |
| loading | `aria-busy="true"`, disabled, ไอคอน spinner 16px (วงแหวน stroke หมุน 0.9s linear; reduced-motion = จุดนิ่ง) + ข้อความเฉพาะการกระทำ เช่น "กำลังส่งตรวจ…" (`AsyncButton` รับ prop `busyText`; ค่า default "กำลังทำงาน…") · ความกว้างไม่กระโดด (`min-width` = ความกว้างตอนปกติ) |
| error | ปุ่มไม่มี state error เอง — ผลผิดพลาดแสดงเป็น InlineMessage ใต้กลุ่มปุ่ม (C9) |

## C2. Link (`a` ทั่วไป, `.aq-link`)
- default: สี primary, `text-decoration: underline`, `text-underline-offset: 3px`, หนา 1px · ในเมนู/การ์ดที่ทั้งกล่องเป็นลิงก์ ไม่ต้องขีดเส้นใต้แต่ต้องมีไอคอน chevron-right หรือลักษณะการ์ดคลิกได้
- hover: primary-strong + เส้นใต้ 2px · visited: สีเดิม (ไม่ใช้ม่วง) · focus: T9 · ลิงก์ภายนอก: ไอคอน `external` 16px + `target="_blank" rel="noopener"` + aria "(เปิดแท็บใหม่)"
- รหัสหลักฐาน/ข้อในตาราง (`E-1.1-01`, `1.2`) = `.aq-link aq-code` (font 600, tabular-nums) — แทน `.aq-cite` และลิงก์ดีฟอลต์ #0000EE (M1)
- กฎ global: `a { color: var(--c-primary); }` ใน base layer → ไม่มีลิงก์สีน้ำเงินดีฟอลต์หลุดอีก

## C3. Form controls
| control | class | รายละเอียด |
|---|---|---|
| text/number/date/url/search | `.aq-input` | สูง 44, พื้น surface, ขอบ 1px border-control, radius md, padding 0 `--sp-3`, font base 400 · `width:100%; min-width:0` เสมอ (แก้ M4/P5) |
| select | `.aq-select` (ใช้ class เดียวกับ input + `appearance:none` + ไอคอน chevron-down ด้านขวา 20px) | option ยาวตัดด้วย `text-overflow: ellipsis` ในกล่อง; ต้องอยู่ใน container ที่ `min-width:0` |
| textarea | `.aq-textarea` | padding `--sp-3`, `min-height: 6lh`, resize vertical · narrative editor ใช้ `.aq-textarea aq-textarea--prose` = fs-md 400 lh 1.8 `min-height: 18lh` (ตามความสูงเนื้อหา, ไม่มี scroll ซ้อนจนถึง 70vh แล้วค่อย scroll) |
| file | `.aq-dropzone` | กล่องเส้นประ 2px border-control radius lg สูง ≥96px: ไอคอน upload + "ลากไฟล์มาวาง หรือ เลือกไฟล์" + บรรทัดชนิดไฟล์ที่รับ/ขนาด · input จริงเป็น `aq-sr-only` แต่ label ทั้งกล่องกดได้ + focus-within ring · หลังเลือก: แสดงชื่อไฟล์ + ขนาด (KB/MB) + ปุ่ม "เปลี่ยนไฟล์"/"เอาออก" · `data-testid` เดิมอยู่บน `<input type=file>` |
| checkbox/radio | `.aq-check` | native input 20×20 `accent-color: var(--c-primary)` + label ทั้งแถว สูง ≥44 |
| segmented | `.aq-seg` | กลุ่มปุ่ม radio แบบติดกัน (ใช้กับ TH/EN ใน editor, ต่อท้าย/แทนที่, ขนาดตัวอักษร) role="radiogroup" |
| label | `.aq-field > label` | อยู่เหนือช่องเสมอ fs-base 600 ink · ช่องบังคับ: ต่อท้าย " *" และ `aria-required` · ข้อความช่วย `.aq-help` fs-sm muted ใต้ label (ไม่ใช้ placeholder แทน label) |

| state | กฎ |
|---|---|
| default | ตามตาราง |
| hover | ขอบ ink |
| focus | ขอบ primary + T9 ring |
| disabled | พื้น surface-2, ตัว muted, ขอบ border-subtle, `cursor:not-allowed` |
| read-only | พื้น surface-2, ตัว ink, ขอบ border-subtle, ไม่มี ring พิเศษ + ป้าย "อ่านอย่างเดียว" ใกล้ช่องถ้าทั้งฟอร์มอ่านอย่างเดียว |
| loading (ตรวจไฟล์ ฯลฯ) | spinner 16px ในช่อง/ปุ่มข้างช่อง + ข้อความ "กำลังตรวจไฟล์…" ใน `.aq-help` (`aria-live="polite"`) |
| error | ขอบ 2px danger, `aria-invalid="true"`, `aria-describedby` → `.aq-field-error` ใต้ช่อง: ไอคอน x-circle 16 + "ข้อผิดพลาด:" (sr-only) + ข้อความบอกวิธีแก้ (fs-sm 600 danger) · ไม่ล้างค่าที่กรอก |
| success (ตรวจผ่าน) | ไอคอน check-circle success ข้างช่อง + ข้อความสั้น (เช่น "ไฟล์ใช้ได้ · 2.4 MB") |

**Error summary ของฟอร์ม** (`.aq-error-summary`, role="alert", tabindex=-1 แล้ว focus เมื่อ submit ไม่ผ่าน): หัว "ยังบันทึกไม่ได้ — โปรดแก้ N จุด" + รายการลิงก์ไปยังช่อง (`href="#field-id"`) · พื้น danger-bg ขอบซ้าย 4px danger

## C4. RequirementPicker (`components/aunqa/RequirementPicker.tsx`) — ใหม่ (ฟอร์มหลักฐาน)
- ARIA combobox (pattern ของ WAI-ARIA APG "combobox with listbox popup"): `<input role="combobox" aria-expanded aria-controls aria-activedescendant data-testid="ev-f-reqs-input">` + `<ul role="listbox">` + chips
- container `data-testid="ev-f-reqs"` · option `role="option" data-testid="ev-f-req-opt-{id}"` · chip `data-testid="ev-f-req-chip-{id}"` (ปุ่ม × `aria-label="เอาข้อ {id} ออก"`)
- พิมพ์เลขข้อ ("1.1", "3") หรือคำ ("หลักสูตร", "PLO", คำอังกฤษ) → กรองจาก `searchRequirements(q)` (ว่าง = แสดงทั้ง 53 จัดกลุ่มตามเกณฑ์ หัวกลุ่ม `role="presentation"`) · แต่ละ option: "1.1" (600) + ข้อความไทย 1 บรรทัดตัดด้วย ellipsis + ชื่อเกณฑ์ fs-sm muted
- คีย์บอร์ด: ↓/↑ เลื่อน, Enter = เพิ่ม/เอาออก (toggle) แล้วคงกล่องเปิดและล้างคำค้น, Esc ปิด, Backspace ในช่องว่าง = ลบ chip ล่าสุด · คลิก option = toggle · option ที่เลือกแล้วมีไอคอน check และ `aria-selected="true"`
- ใต้ช่อง: "เลือกแล้ว: 1.1, 2.1" (`aria-live="polite"`) · ถ้ายังไม่เลือกรอบ → ช่อง disabled + ข้อความช่วย "เลือกรอบประเมินในช่องด้านบนก่อน จึงจะผูกข้อได้"
- listbox สูงสูงสุด 320px, z `--z-dropdown`, เงา e-2, ปิดเมื่อคลิกนอก
- **ข้อเสนอ AI**: ถ้ามีข้อความ/ไฟล์และผู้ใช้กด "ให้ AI แนะนำข้อ" ไม่อยู่ใน scope U2 (ไม่ทำ) — ปุ่มนี้ไม่มี

## C5. Tabs (`.aq-tabs`) — แท็บภายในหน้า (ไม่ใช่เมนูหลัก)
- รูปแบบ: แถบแนวนอน ตัวอักษร fs-base 600 สี muted, active = สี primary-strong + เส้นใต้ 3px primary (ไม่ใช่ pill เพื่อแยกจากเมนูหลักและป้ายสถานะ) · สูง 44 · ตัวนับในแท็บใช้ `.aq-count`
- ARIA: `role="tablist"` + `role="tab" aria-selected aria-controls` + `role="tabpanel"` · ←/→ เลื่อน, Home/End
- overflow บนมือถือ: เลื่อนแนวนอนได้ + เงาจางที่ขอบ (`mask-image` linear-gradient) แสดงว่ามีต่อ + แท็บ active `scrollIntoView({inline:'nearest'})` ตอนเปลี่ยน
- states: hover = พื้น primary-tint · focus T9 · disabled = muted + `aria-disabled`
- ใช้กับ: curriculum (7 แท็บ, testid `cur-tab-*` เดิม), admin (`tab-users/audit/demo`), assess (`assess-crit-*`), แผงข้าง section editor (`sidetab-evidence`, `sidetab-comments`, `sidetab-history`), editor ภาษา (TH/EN ใช้ segmented C3 แต่คง `tab-th`/`tab-en` และ `role="tab"` เดิม)

## C6. Navigation (AppShell) — เมนูหลักจัดกลุ่ม
โครง: **sidebar** (≥1024 ถาวร กว้าง 256px / <1024 เป็น drawer ซ้าย กว้าง min(320px, 86vw)) + **top bar** สูง 64px sticky
- รายการเมนู: สูง 44, padding `--sp-3`, ไอคอน 20 + label fs-base · active: พื้น primary-tint, ตัว primary-strong 600, แถบซ้าย 4px primary, `aria-current="page"` · hover: พื้น surface-2 · focus T9
- หัวกลุ่ม: fs-sm 600 muted, margin-top `--sp-5`, ไม่ใช่ปุ่ม (ไม่พับ)
- badge "รอท่าน": `.aq-count` (pill พื้น accent ตัว on-accent fs-xs 600) ชิดขวาของรายการ "หน้าหลัก" = จำนวน todo (`listMyTodos(user).length`, ซ่อนเมื่อ 0) และของ "รอตรวจ" = จำนวน todo kind `review_sections`+`faculty_review`+`final_approve` · aria-label ของลิงก์ = "หน้าหลัก — มีงานรอท่าน 3 รายการ"

| กลุ่ม | รายการ (path · testid · ไอคอน) | แสดงเมื่อ (คงเงื่อนไขเดิมของ AppShell ทุกข้อ) |
|---|---|---|
| งานของฉัน | หน้าหลัก `/app` · `nav-home` · home | ทุกคน |
| | รอตรวจ `/app/review` · `nav-review` · inbox-check | `canReview` เดิม |
| จัดทำ SAR | รอบประเมิน `/app/cycles` · `nav-cycles` · calendar-cycle | ทุกคน |
| | หลักฐาน `/app/evidence` · `nav-evidence` · folder | ทุกคน |
| | ส่งออกเอกสาร `/app/export` · `nav-export` · download | ทุกคน |
| ข้อมูลหลักสูตร | หลักสูตร (PLO/รายวิชา) `/app/curriculum` · `nav-curriculum` · book-open | `!assessor` |
| | ตัวชี้วัด `/app/metrics` · `nav-metrics` · chart-line | `!assessor` |
| | แผนปรับปรุง `/app/actions` · `nav-actions` · list-check | `!assessor` |
| อ้างอิง | คลังเกณฑ์ AUN-QA `/app/requirements` · `nav-requirements` · library | ทุกคน |
| ผู้ดูแล | ผู้ดูแลระบบ `/app/admin` · `nav-admin` · shield-user | `user.manage` หรือ `audit.view` เดิม |
กลุ่มที่ไม่มีรายการแสดง = ไม่แสดงหัวกลุ่ม · ลำดับคงที่ตามตาราง (ไม่สลับตาม role) · กรรมการประเมินเห็น 3 กลุ่มแรก (ยกเว้นข้อมูลหลักสูตร) + อ้างอิง

- **Sidebar ส่วนบน**: BrandMark + Wordmark (ลิงก์ `/app`) · **ส่วนล่าง (sticky ล่าง)**: ปุ่ม "การแสดงผล" (ไอคอน type, เปิด popover C17: ขนาดตัวอักษร ก/ก+/ก++ และสวิตช์ "เอฟเฟกต์ฉลอง") + ปุ่ม "ออกจากระบบ" (`data-testid="logout"`, ghost, ไอคอน log-out) — ห่างจากเมนูด้วยเส้นแบ่ง
- **Top bar**: [ปุ่มเมนู (≤1023, aria-label "เปิดเมนู", `aria-expanded`, testid `nav-menu`)] [BrandMark+Wordmark เฉพาะ ≤1023] … [LangToggle (≥768)] [กระดิ่ง (C16)] [ผู้ใช้: avatar วงกลม 36px พื้น primary-tint ตัว primary-strong 600 + ชื่อ (`data-testid="nav-user"`, fs-base 600, ตัดด้วย ellipsis max 220px) + บทบาท fs-sm muted ใต้ชื่อ; ≤767 แสดง avatar อย่างเดียว ชื่อเป็น sr-only… **ยกเว้น** element `nav-user` ต้องมองเห็นได้ที่ ≥768 (E2E รันที่ 1280)] · พื้น surface, เงา e-1 เมื่อ scroll > 0
- **Drawer (<1024)**: เปิดจากปุ่มเมนู, overlay `--c-overlay`, เลื่อนเข้าจากซ้าย `transform: translateX(-100%) → 0` `--dur-base --ease-enter` (ออก `--dur-fast --ease-exit`), focus trap, Esc ปิด, คลิก overlay ปิด, ปิดเองเมื่อเปลี่ยนหน้า, คืน focus ไปปุ่มเมนู · ใช้ DOM เดียวกับ sidebar (component เดียว `AppSidebar` เปลี่ยนโหมดด้วย CSS + state) → testid ไม่ซ้ำ
- breadcrumb อยู่ใน PageHeader (C8) ไม่ใช่ top bar · **top bar ห้ามมี h1** (หน้ามี h1 เดียว = PageHeader)
- banner กรรมการ (`data-testid="readonly-banner"`) อยู่บนสุดของ `<main>` ทุกหน้า: InlineMessage tone info "คุณเข้าในฐานะกรรมการประเมิน — เห็นเฉพาะรอบที่ได้รับมอบหมาย (อ่านอย่างเดียว)"

## C7. Card (`.aq-card`)
- พื้น surface, ขอบ 1px border-subtle, radius lg, padding `--sp-6` (≤768 `--sp-4`), เงา e-1, `min-width:0`
- header ของการ์ด: `.aq-card__head` = h2/h3 + actions ขวา (wrap ได้) · footer `.aq-card__foot` เส้นบน border-subtle
- variant: `aq-card--accent` (แถบบน 4px gradient primary→accent ใช้กับการ์ด "สิ่งที่ต้องทำ" อันดับแรก และ hero card landing), `aq-card--link` (ทั้งการ์ดคลิกได้: hover ยก `translateY(-2px)` + เงา e-2 `--dur-fast`; focus-within ring) , `aq-card--muted` (พื้น surface-2 ไม่มีเงา ใช้กับข้อมูลอ้างอิง)
- states: default/hover (เฉพาะ --link)/focus-within (--link)/loading = Skeleton ข้างในตามโครง/error = ErrorState ข้างใน/empty = EmptyState ข้างใน

## C8. PageHeader (`common.tsx` — ปรับ)
- props: `title` (h1 หนึ่งเดียว), `sub?`, `actions?`, `crumbs?: {label, href?}[]`, `status?: ReactNode` (pill)
- เค้าโครง: crumbs (fs-sm, คั่นด้วย chevron-right 16, รายการสุดท้าย `aria-current="page"`) → h1 fs-xl + status pill ในบรรทัดเดียวกัน (wrap) → sub fs-base muted max `--measure` → actions ขวา (≥768) / ใต้ (≤767) · margin-bottom `--sp-6`

## C9. InlineMessage (`.aq-msg`) — แทน `auth-alert` ทั้งหมด
- tone: `success | warn | danger | info | neutral` → พื้น bg ของ tone, ขอบซ้าย 4px fg, ไอคอนตาม T1.2 ขนาด 20, หัวข้อ (600) + ข้อความ (400) fs-base, ปุ่มตามมาได้ (`.aq-msg__actions`)
- role: danger = `alert`; อื่น = `status` · ปิดได้ถ้า `onClose` (ปุ่มไอคอน x 44×44)
- ใช้แทน: `readonly-reason`, `lock-banner`, `dean-return-hint`, `citation-warn`, `translate-needs-human`, `pii-banner`, `segregation-note`, `assess-notopen`, `assess-hidden`, `export-status` ฯลฯ — คง testid เดิมบน root ของ InlineMessage

## C10. KPI tile (`.aq-kpi`)
- การ์ดเล็ก radius lg พื้น surface เงา e-1 padding `--sp-5` · บรรทัดบน: ไอคอน 20 สี tone + label fs-sm 600 muted · บรรทัดกลาง: ตัวเลข fs-2xl 700 tabular-nums สี tone fg (ไม่ใช่สีเทาเหมือนกันหมด — M6) · บรรทัดล่าง (option): คำอธิบาย fs-sm muted หรือปุ่ม Term "?"
- tone ตามความหมาย: ความพร้อม = primary · วิกฤต = danger · สูง = warn · กลาง = info · ต่ำ = neutral · ค่าเป็น 0 → tone neutral + ข้อความ "ไม่มี"
- ถ้าคลิกได้ (กรองรายการ gap ตามระดับ) = `<button>` ทั้งใบ `aria-pressed` เมื่อเป็นตัวกรองที่เลือก (กดซ้ำ = ยกเลิกกรอง) — แทน select `gap-filter` แต่ **คง select `gap-filter` ไว้ด้วย** ในหัวการ์ด gap (testid เดิม) และสองทางซิงก์ state เดียวกัน
- testid เดิม: `kpi-row` (container), `readiness-percent`, `gap-count-{critical|high|medium|low}` บน element ตัวเลข

## C11. Status pill / Badge (`.aq-pill`, คง `Badge` + `.aq-badge`)
- รูป: pill radius pill, สูง 28 (ไม่ใช่เป้ากด), padding 0 `--sp-3`, ไอคอน 16 + ข้อความ fs-xs 600, พื้น/ตัวตาม tone (T1.2) · `Badge` API เดิม (`tone: neutral|ok|warn|bad|info`) + เพิ่ม `primary` + prop `icon?: IconName` (ค่า default ตาม tone: ok→check-circle, warn→alert-triangle, bad→x-circle, info→info, neutral→circle-dashed, primary→ไม่มี)
- ตารางแมปสถานะ (ไฟล์ `lib/ui/status.ts` ใหม่; ข้อความไทยอยู่ `lib/ui/aunqa.ts` เดิม):

| ชนิด | ค่า | ข้อความ | tone | ไอคอน |
|---|---|---|---|---|
| section | not_started | ยังไม่เริ่ม | neutral | circle-dashed |
| | drafting | กำลังเขียน | primary | pencil |
| | ready_for_review | รอตรวจ | info | clock |
| | changes_requested | **ส่งกลับแก้ไข** (P10) | warn | undo |
| | approved | อนุมัติแล้ว | ok | check-circle |
| cycle | draft | ร่าง | neutral | circle-dashed |
| | in_progress | กำลังดำเนินการ | primary | pencil |
| | under_review | รอ QA คณะตรวจ | info | clock |
| | revision_requested | ส่งกลับแก้ไข | warn | undo |
| | faculty_approved | QA คณะอนุมัติ รอคณบดี | info | clock |
| | final_approved | อนุมัติสุดท้าย (ล็อกแล้ว) | ok | lock |
| | under_assessment | อยู่ระหว่างประเมิน | info | clock |
| | assessed | ประเมินแล้ว | ok | check-circle |
| | closed | ปิดรอบ | neutral | check |
| evidence | uploaded | อัปโหลดแล้ว | neutral | file-text |
| | tagged | AI แนะนำข้อแล้ว | info | sparkle |
| | verified | ตรวจสอบแล้ว | ok | check-circle |
| PII | containsPii && !piiResolved | PII ยังไม่จัดการ | bad | alert-triangle |
| | piiScan not_scanned | ยังไม่ได้ตรวจ PII | neutral | circle-dashed |
| gap severity | critical / high / medium / low | วิกฤต / สูง / กลาง / ต่ำ | bad / warn / info / neutral | x-circle / alert-triangle / info / circle-dashed |
| AI model | offline-* / claude-* | โหมดในเครื่อง (offline) / Claude | neutral / info | settings / sparkle |
- testid เดิม `cycle-status`, `section-status`, `postcheck`, `ai-model` คงบน pill

## C12. Table (`.aq-table` ใน `.aq-table-wrap`)
- เซลล์ fs-base, padding `--sp-3` `--sp-4`, หัวตาราง พื้น surface-2 fs-sm 600 ink, sticky top ภายใน wrap ถ้าตารางยาว >10 แถว · เส้นแบ่งแถว border-subtle · แถว hover พื้น primary-tint (ถ้าแถวคลิกได้) · `tabular-nums` คอลัมน์ตัวเลขชิดขวา
- **≤767px**: class `aq-table--stack` (ใส่ในตารางรายการหลัก: mywork, evidence, review, cycles, actions, users, audit) → CSS แสดงแต่ละ `tr` เป็นการ์ด, `td` เป็นบรรทัด "label: ค่า" ด้วย `td::before { content: attr(data-label) }` (เพิ่ม `data-label` ทุก td) — **DOM ตารางเดิมไม่เปลี่ยน** (E2E ใช้ `tr`, `td:first-child strong`) · ตาราง matrix/preview/metric ไม่ stack แต่เลื่อนแนวนอนใน wrap พร้อมคอลัมน์แรก sticky
- states: loading = Skeleton แบบตาราง 5 แถว · empty = EmptyState ใต้หัวตาราง (ไม่แสดงตารางว่าง) · error = ErrorState · แถวใหม่ = ไฮไลต์ L5 · แถวผิดใน preview = พื้น danger-bg + ไอคอน x-circle ในเซลล์ผลตรวจ (คง `aq-row-bad`)

## C13. Heatmap cell (`.aq-heat-cell`)
- ขนาด 76×68 (≤479: 68×64) radius lg, ขอบ 1px ตาม tone, เป็น `<a>` ไปหน้าข้อ (testid `heat-{id}` เดิม, `data-level` เดิม)
- เนื้อใน 3 บรรทัด: (1) เลขข้อ fs-base 700 tabular-nums (2) ป้ายระดับ `.aq-heat-cell__label` fs-xs 600 (3) แถวไอคอน: ไอคอนระดับ 16 + **ไอคอนสถานะข้อ 16** (จากตาราง C11 section) ที่มุมขวาบน
- tone ตาม `level`: empty = surface-2 + ขอบประ border-control + ink · critical = danger-bg/danger · warning = warn-bg/warn · ok = primary-tint/primary-strong · ready = info-bg/info · approved = success-bg/success (คู่ contrast #3, #25, #23, #15, #28, #20)
- **P8**: ข้อที่ `sectionStatus=approved` แต่ level critical/warning แสดงไอคอนสถานะ check-circle ที่มุม + aria-label/Tooltip "ข้อ 1.2 · อนุมัติแล้ว · ยังมีช่องว่างวิกฤต 1 (ยังไม่มีหลักฐานผูก)" → ผู้ใช้เห็นว่า "อนุมัติแล้วแต่ยังขาด" ไม่ใช่สถานะขัดกัน
- states: hover ยก 2px + เงา e-2 `--dur-fast` · focus T9 · ไม่มี disabled
- legend (`HeatLegend`): รายการ ไอคอน+สี+ข้อความ ทุกระดับ + บรรทัด "ไอคอนมุมขวาบน = สถานะการอนุมัติของข้อ" · ห้าม testid ที่ขึ้นต้นด้วย `heat-` นอกจากช่อง 53 ช่องและ `heatmap` (E2E-02 นับ `heat-*`)
- แถวเกณฑ์: label "เกณฑ์ 3" fs-sm 600 + จำนวนอนุมัติ "5/6" + ถ้าครบทั้งเกณฑ์ = pill ok "ครบ" พร้อม L6 เมื่อเปลี่ยนเป็นครบในหน้านั้น

## C14. Toast (`components/ui/Toast.tsx` + `context/ToastContext.tsx` — เขียนใหม่)
- API คงเดิม `showToast(msg, type?)` + เพิ่ม option ที่สาม `{ action?: { label, onClick }, durationMs? }`
- **คิวสูงสุด 3 อัน** ซ้อนจากล่างขึ้นบน (ใหม่อยู่ล่าง) — ไม่ทับกันอีก (แก้ data1 toast ถูกแทน) · ตำแหน่ง: ≥768 มุมขวาล่าง ห่างขอบ `--sp-6`, กว้าง 400 · ≤767 ล่างกลาง เต็มความกว้าง − `--sp-4`×2 (อยู่เหนือ sticky action bar ถ้ามี: `bottom: calc(var(--actionbar-h, 0px) + 16px)`)
- รูป: พื้น surface, ขอบซ้าย 4px สี tone, เงา e-3, radius md, ไอคอน tone 20, ข้อความ fs-base ink, ปุ่มปิด (x, 44×44, aria-label "ปิดข้อความ"), ปุ่ม action (ghost) ถ้ามี, เส้นเวลาที่เหลือ 3px ล่างสุด (สี tone, `transform: scaleX` ลดลงตามเวลา; หยุดเมื่อ hover/focus)
- ระยะเวลา: success/info **5,000 ms**, error **8,000 ms** (หรือค้างจนปิดถ้ามี action) · hover/focus = หยุดนับ
- ARIA: container `aria-live="polite"` (success/info) และ toast error ใช้ `role="alert"`
- motion L4: เข้า `translateY(16px)→0 + opacity` `--dur-base --ease-enter`; ออก `--dur-fast --ease-exit` · reduced motion: ปรากฏทันที
- แก้บั๊ก timer: เก็บ timeout ใน `useRef` ต่อ toast id (ของเดิมเป็นตัวแปร local ทุก render → clearTimeout ไม่ทำงาน)
- กฎใช้งาน: การกระทำในฟอร์ม/ใกล้จุดกดให้แสดง InlineMessage หรือ `aq-saved` ใกล้ปุ่ม **ด้วย** (toast เป็นข้อมูลเสริม) — ระบุต่อหน้าใน pages.md

## C15. Dialog (`context/DialogContext.tsx` — restyle, API เดิม)
- API คง `confirm/notify/prompt` + เพิ่ม `details?: ReactNode` (กล่องรายการเตือน/ checklist ใต้ message) และ `variant` เดิม
- panel: กว้าง `min(520px, 94vw)`, พื้น surface, radius xl, padding `--sp-6`, เงา e-3, **ชิดซ้าย** (ไม่จัดกลาง) · หัว: ไอคอน tone 24 (ไม่ใช้ emoji) + title fs-lg 700 (ไม่ใช่ Cormorant) · message fs-base · details · ปุ่มขวาล่าง: ปุ่มยกเลิก (secondary) ซ้ายของปุ่มยืนยัน, ระยะ `--sp-3`; มือถือ ≤479 ปุ่มเต็มความกว้างเรียงยืนยันบน
- **ชื่อปุ่มยืนยันต้องขึ้นต้นด้วย "ยืนยัน" + คำกริยาเฉพาะ** เช่น "ยืนยันส่งตรวจ", "ยืนยันอนุมัติและล็อก", "ยืนยันลบ" (E2E ใช้ `getByRole('button', { name: 'ยืนยัน' })` แบบ substring) · ยกเว้น notify = "รับทราบ" (E2E-05 ใช้) และ duplicate = "สร้างซ้ำ"
- variant → ปุ่มยืนยัน: primary → aq-btn-primary · warning → aq-btn-primary + ไอคอน alert-triangle ที่หัว · danger → aq-btn-danger-solid
- ARIA: `role="dialog" aria-modal="true" aria-labelledby aria-describedby` · focus ไปปุ่มยกเลิกสำหรับ danger, ปุ่มยืนยันสำหรับอื่น, textarea สำหรับ prompt · focus trap · Esc = ยกเลิก · คลิก backdrop = ยกเลิก (ยกเว้น prompt ที่พิมพ์แล้ว = ไม่ปิด) · ปิดแล้วคืน focus ให้ element ที่เปิด
- motion L14: backdrop fade `--dur-fast`; panel `scale(.98)→1 + opacity` `--dur-base --ease-enter`
- prompt: textarea `.aq-textarea` 3 แถว, ปุ่มยืนยัน disabled เมื่อ required ว่าง + ข้อความช่วย "ต้องระบุเหตุผล" (ไม่ใช่ opacity)

## C16. Notification bell + badge
- ปุ่มไอคอน bell 44×44 ใน top bar เป็น `<Link href="/app#notifications">` (คง `data-testid="nav-bell"` และ aria-label รูปแบบเดิม **"แจ้งเตือนที่ยังไม่อ่าน N รายการ"** — E2E-08 ตรวจ regex นี้)
- จุดนับ `.aq-count` มุมขวาบน (พื้น danger ตัว #FFF คู่ #27, fs-xs 600, min-width 20, สูง 20) แสดงเมื่อ N>0, N>99 = "99+"
- ตัวเลขต้องตรงกับหัวการ์ดแจ้งเตือนในหน้าหลัก (แก้ backend `unreadCount` ให้ sync deadline ก่อนนับ — ดู ADR 6.2 B3) · เมื่อ N เพิ่มระหว่างอยู่ในหน้า: จุดนับ `scale(.9)→1` 220ms ครั้งเดียว
- "รอท่าน" = C6 badge บนเมนู (คนละความหมายกับกระดิ่ง: กระดิ่ง = ข่าว, รอท่าน = งานที่ต้องลงมือ)

## C17. Tooltip / คำอธิบายศัพท์ (`components/ui/Term.tsx`) — ใหม่
- `<Term k="pdca">PDCA</Term>` → ข้อความเดิม + ปุ่มเล็ก help-circle 20 (พื้นที่กด 32×32 ภายในบรรทัด — ยกเว้นตาม WCAG 2.5.8 inline) `aria-label="ความหมายของ PDCA"` `aria-expanded`
- กด/Enter/Space = เปิด popover (ไม่ใช่ hover-only; hover เปิดได้ด้วยหลัง 300ms บนเดสก์ท็อป) · Esc/คลิกนอก = ปิด · popover: พื้น surface, ขอบ border-subtle, เงา e-2, radius lg, กว้าง ≤320, padding `--sp-4`, หัว (600) + คำอธิบาย fs-sm 1–3 ประโยคภาษาง่าย · `role="tooltip"` + `aria-describedby` ชี้จากปุ่ม · z `--z-dropdown`
- พจนานุกรม `lib/ui/glossary.ts` (`GLOSSARY: Record<string,{titleTh, bodyTh, bodyEn}>`) ต้องมีอย่างน้อย: `pdca, offline, redaction (ปกปิดข้อมูลส่วนบุคคล), append_replace, tagged, gap_rule_R1…R11 (ชื่อกฎ+ความหมาย 1 ประโยค), readiness (สูตร % ความพร้อม จาก gap.ts), revision, hash (ลายนิ้วมือเอกสาร), verdict, appendix_a, appendix_b, appendix_d, benchmark, plo, clo, irm, bloom, self_rating (สเกล 1–7 ตาม RATING_SCALE), pii, evidence_code (รูปแบบ E-x.x-nn และ E-0.0 = ยังไม่ผูกข้อตอนสร้าง), segregation`
- ไอคอนปุ่ม (icon button) ใช้ Tooltip แบบเดียวกันแต่แสดงเมื่อ hover/focus อย่างเดียว (ข้อความ = aria-label)

## C18. Empty state (`Empty` ใน common.tsx — ปรับ)
- props: `title`, `text?`, `icon?: IconName` (default `folder`), `action?: ReactNode`, `tip?` · testid `state-empty` เดิม
- รูป: กล่องพื้น surface (ไม่ใช่เส้นประจืด) radius lg padding `--sp-8` จัดกลาง · ภาพประกอบ = วงกลม 72px พื้น primary-tint + ไอคอน 40 สี primary + จุด accent 10px มุมขวาบน · title fs-md 600 · text fs-base muted ≤ `--measure` · action = ปุ่ม primary · ลิงก์คู่มือ (ถ้ามี) ghost
- เนื้อหาต้อง: บอกสาเหตุ + สอนว่าทำอย่างไรให้มีข้อมูล + ปุ่มทำต่อ (ข้อความต่อหน้าอยู่ใน pages.md)
- ห้ามแสดง empty ระหว่างโหลด (Async ต้องแยก)

## C19. Skeleton + Loading (`Skeleton`, `Loading` ใน common.tsx — ปรับ)
- `Async` แสดง **ไม่มีอะไรเลย 300ms แรก** → จากนั้น Skeleton ตาม prop `skeleton?: 'cards' | 'table' | 'editor' | 'dashboard' | 'form'` (default `cards`) · container `role="status" aria-live="polite" aria-busy="true"` + ข้อความ sr-only "กำลังโหลด…" · คง `data-testid="state-loading"` บน container
- shimmer: `.aq-skeleton` พื้น surface-2 + `linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)` เลื่อนด้วย `background-position` 1.4s linear infinite (L3) · reduced motion = สีนิ่ง
- โครงแต่ละแบบ: cards = 3 การ์ด (หัว 1 เส้น 40% + 3 เส้น) · table = หัว + 5 แถว · editor = กล่องซ้ายใหญ่ (หัว+textarea) + แผงขวา 3 แถว · dashboard = แถว KPI 5 + กล่อง heatmap 8 แถว · form = 3 ช่อง
- เกิน 10 วินาที: แทนที่ด้วย InlineMessage warn "ใช้เวลานานกว่าปกติ" + ปุ่ม "ลองใหม่" (เรียก `q.reload`)
- งาน > 2 วินาทีที่เป็นขั้นตอน (export DOCX, import Excel, AI): ใช้ปุ่ม loading + ข้อความขั้นตอนใน `.aq-help` (เช่น "กำลังสร้างไฟล์ Word…") — ไม่ใช้ skeleton

## C20. Progress ring (`components/ui/ProgressRing.tsx`) + Progress bar (`.aq-progress`)
- ring: SVG ขนาด 120 (เล็ก 56), stroke 10 (เล็ก 6), วงพื้น surface-2, วงค่า primary, **ช่วง ≥100% เปลี่ยนเป็น success** · ตรงกลาง: ตัวเลข "45/53" หรือ "85%" fs-2xl (เล็ก fs-base) 700 + label fs-sm ใต้ · `role="img" aria-label="อนุมัติแล้ว 45 จาก 53 ข้อ"`
- เติมค่า L2: `stroke-dashoffset` จากเต็มไปค่าจริง `--dur-progress --ease-move` เมื่อ mount/ค่าเปลี่ยน · reduced motion = แสดงค่าทันที · ค่าต้องมาจากข้อมูลจริงเท่านั้น (ห้ามแถบหลอก)
- bar: สูง 8 radius pill พื้น surface-2 แท่ง primary (`transform: scaleX(p)` origin left) + ข้อความ "อนุมัติ 45/53" ข้างบน/ข้าง · ใช้ในรายการรอบ, การ์ดรอบในหน้าหลัก, หัวเกณฑ์ใน assign

## C21. Stepper (`components/ui/Stepper.tsx`) — ใหม่
- แนวนอน (≥768) / แนวตั้งย่อ (≤767 แสดงขั้นปัจจุบัน "ขั้น 2 จาก 4: เขียนเนื้อหา" + จุด 4 จุด) · `<ol>` + `aria-current="step"` ที่ขั้นปัจจุบัน
- แต่ละขั้น: วงกลม 32 (done = พื้น success-bg ขอบ success ไอคอน check; current = พื้น primary ตัว #FFF เลขขั้น; todo = พื้น surface ขอบ border-control เลขขั้น ink) + ชื่อขั้น fs-base 600 + สถานะย่อ fs-sm muted (เช่น "ผูกแล้ว 3 ชิ้น") · เส้นเชื่อม 2px (done = success, อื่น = border-subtle), เติมด้วย `scaleX` `--dur-slow` (L8)
- ขั้นเป็นปุ่ม/ลิงก์ (`href="#step-evidence"` เลื่อนไปส่วนนั้น + focus หัวข้อ) ไม่ใช่ตัวล็อก (ไม่บังคับลำดับ)
- เมื่อขั้นเปลี่ยนเป็น done ในหน้านั้น: เส้นเช็กวาด L6 (500ms)
- ใช้กับ: section editor (4 ขั้น), cycle dashboard (แถบสถานะรอบ 6 ขั้นแบบอ่านอย่างเดียว `variant="track"` ไม่มีลิงก์)

## C22. AppLoader (`components/ui/AppLoader.tsx`) — ใหม่ แทน LoginLoader/LogoutLoader/Loading ของ AppShell
- เต็มจอ z `--z-loader`, พื้น `--c-bg` + radial-gradient จาง `rgba(59,79,160,.08)` กลางจอ · กลางจอ: BrandMark 56px + Wordmark 22px · ใต้: วงแหวน 48px (วงพื้น surface-2 stroke 4 + arc primary ยาว 25% หมุน 1.2s linear infinite = `.aq-loader-ring__arc`) · ข้อความ 1 บรรทัด fs-md 600 ink + บรรทัดรอง fs-sm muted (ไม่หมุนเปลี่ยนข้อความ) · `role="status" aria-live="polite"`
- props: `mode: 'init' | 'login' | 'logout'`, `name?`
  - init: "กำลังเตรียมข้อมูล…" / "ครั้งแรกอาจใช้เวลาสักครู่"
  - login: "ยินดีต้อนรับ คุณ{name}" / "กำลังเปิดพื้นที่ทำงานของคุณ…"
  - logout: "กำลังออกจากระบบ…" / "บันทึกงานที่ค้างแล้ว ปลอดภัย" (ข้อความรองแสดงหลัง flush autosave เสร็จ — ดู ADR P3)
- เวลา: แสดงขั้นต่ำ 400ms (กันกระพริบ) · login รวมไม่เกิน 700ms หลัง login สำเร็จ (ลดจาก 1,200ms) · logout รวม 600ms (ลดจาก 1,450ms) · init = จนกว่าจะพร้อม; **เกิน 10 วินาที** = เปลี่ยนเป็นข้อความ "ใช้เวลานานกว่าปกติ" + ปุ่ม "ลองใหม่" (`location.reload()`) + ลิงก์ "กลับหน้าแรก"
- reduced motion: arc ไม่หมุน (ซ่อน arc, แสดงวงพื้น + "…" ในข้อความ) · fade เข้า 150ms ปิดได้
- ไม่มี emoji/มาสคอต (m1) — ลบ `LoginLoader.tsx`, `LogoutLoader.tsx` และ CSS `ll-*`

## C23. Sticky action bar (`.aq-actionbar`) — section editor / ฟอร์มยาว
- `position: sticky; bottom: 0;` ภายในคอลัมน์หลัก, พื้น surface, ขอบบน border-subtle, เงา e-2 (ด้านบน), padding `--sp-3 --sp-4`, z `--z-sidebar`, ตั้งตัวแปร `--actionbar-h` ให้ toast หลบ
- ซ้าย: สถานะบันทึก (`save-status`) · ขวา: ปุ่มรอง (บันทึกตอนนี้ `save-manual`) + ปุ่มหลัก (ส่งตรวจ/อนุมัติ) + ปุ่ม danger ส่งกลับ (คั่นห่าง `--sp-4`)
- คง testid `section-actions` บน container ปุ่ม workflow

## C24. Save indicator (`.aq-saved`)
- สถานะ 4 แบบ (ข้อความ + ไอคอน): idle "พร้อมแก้ไข" (pencil muted) · dirty "ยังไม่บันทึก — กำลังพิมพ์…" (clock warn) · saved "บันทึกแล้ว 14:32" (check-circle success; เปลี่ยนเข้าด้วย fade 150ms) · error "ยังไม่ได้บันทึก: <เหตุผล>" (x-circle danger) + ปุ่ม "ลองบันทึกอีกครั้ง" · `role="status"`, testid `save-status` เดิม
