# ADR-UI-003 ภาคผนวก E — Design tokens "Earth / Friendly" (light เป็นค่าเริ่มต้น + warm dim)

> บังคับเท่า ADR-UI-003 · **แทน `ui/saas-tokens.md` §T1, §T2, §T12 (ค่า defaultTheme) และย่อหน้า "โหมดมืด" ของ `ui/saas-spec.md` §0** · หัวข้ออื่นใน saas-tokens (§T3 ตัวอักษร, §T4 spacing, §T5 target, §T6 radius, §T7 z-index, §T8 motion, §T9 โครง config, §T10 โครง globals/role class, §T11 focus) **ยังใช้ตามเดิม** ยกเว้นที่ระบุใน §E5
> ที่มาของตัวเลข: **[A]** = architect คำนวณด้วยสูตร WCAG 2.x relative luminance จาก hex (ตาราง linearize ทีละ byte, ทศนิยม 2 ตำแหน่ง) · ค่าที่ซ้ำกับ research `TASK-0002-r2.md` (สคริปต์ Python) ตรงกันทุกคู่ที่เทียบได้ (เช่น ink/bg 13.37, muted/bg 6.50, input/bg 3.62, ขาว/primary 6.05, primary/tint 5.08, dark ink/bg 12.68 ฯลฯ) · **ตัวเลขจากสคริปต์ของ qa-tester คือค่าจริง** — ถ้าคู่ใดตกเกณฑ์ = BLOCKED กลับ architect; ถ้าผ่านเกณฑ์แต่ต่างจากตาราง >0.10 ให้ qa แก้ตัวเลขในตาราง/เทสต์ตามสคริปต์แล้วจด Log (ไม่แก้ค่าสี)

## E0. แนวคิด
- **Sage & Sand + Clay**: พื้นทรายอุ่น (ไม่ขาวจ้า), สีหลักเขียวเสจเข้ม (สงบ ไม่ชนความหมาย "ผิดพลาด"), ดินเผา (clay) เป็นสีเน้นที่สอง **ใช้ตกแต่ง/ทักทาย/ภาพประกอบ/avatar เท่านั้น** ไม่ใช้เป็นสถานะ ไม่ใช้เป็นปุ่ม
- **ค่าเริ่มต้น = สว่าง** (เจ้าของสั่ง + Piepenbrock et al. 2013 ใน research R17)
- **โหมดมืด = warm dim**: พื้นน้ำตาลถ่านอุ่น `#26211C` (luminance 0.0158 — สว่างกว่า `#121212` ของ Material ราว 2.6 เท่า, ไม่ใช่ดำ), ตัวอักษรครีม `#EDE4D8` (ไม่ใช่ขาว) → ink/bg 12.67:1 (เกิน AAA แต่ไม่จ้าแบบ 21:1), พื้นยกระดับ (card) สว่างกว่าพื้นหน้า, สีหลักเป็นเสจอ่อนและตัวอักษรบนปุ่มใช้สีพื้นมืด
- ชื่อ token เดิมของ shadcn ทั้งหมดคงไว้ (component เดิมไม่ต้องแก้ชื่อ class) + เพิ่ม `--clay`, `--clay-muted` (รวม 34 token สี)

## E1. Token สี — **hex คือค่าอ้างอิง (normative)**
- `app/globals.css` ยังเขียนแบบ **HSL channel** (`--primary: <h> <s>% <l>%`) เหมือนเดิม — frontend-dev แปลง hex → HSL **ด้วยสคริปต์** (ทศนิยม 1 ตำแหน่ง; ถ้าแปลงกลับ HSL→hex 8 บิตไม่ตรงตารางให้ใช้ 2 ตำแหน่ง) แล้วจดค่า HSL ที่ใช้ใน Log · ห้ามเดา HSL ด้วยมือ
- เทสต์ (qa) ล็อกด้วย "HSL ใน CSS → hex 8 บิต = ค่าในตารางนี้" (แทนการล็อกสตริง HSL)

| token | light | dark (warm dim) | ใช้ที่ไหน |
|---|---|---|---|
| `--background` | `#F7F5EE` ทรายอ่อน | `#26211C` ถ่านอุ่น | พื้นหน้า (พื้นที่เนื้อหา) |
| `--foreground` | `#272A21` | `#EDE4D8` ครีม | ตัวอักษรหลัก |
| `--card` = `--popover` | `#FFFFFC` ขาวอุ่น | `#2F2923` | การ์ด, ตาราง, dialog, popover, panel แจ้งเตือน, เมนู avatar, sidebar, topbar, ช่องกรอก |
| `--card-foreground` = `--popover-foreground` | = foreground | = foreground | |
| `--primary` | `#3F6B5C` เสจเข้ม | `#8FC1AC` เสจอ่อน | ปุ่มหลัก, ลิงก์, เมนู active, ค่า progress, focus ring, จุด "ใหม่", ภาษาที่เลือก |
| `--primary-foreground` | `#FFFFFF` | `#26211C` (= background) | ตัวอักษรบนปุ่มหลัก / `.aq-count` |
| `--primary-muted` | `#E2EEE8` | `#2E3C36` | พื้น pill "ใหม่", chip ที่เลือก, เมนู active, แถวที่เลือก, `::selection` |
| `--secondary` = `--muted` = `--accent` | `#EFECE3` | `#39322B` | หัวตาราง, hover ของ ghost/เมนู/รายการแจ้งเตือน, skeleton, track progress, พื้นกล่องไอคอน |
| `--secondary-foreground` = `--accent-foreground` | = foreground | = foreground | |
| `--muted-foreground` | `#565A4B` | `#C2B5A6` | ข้อความรอง, help, meta, placeholder, เวลาในรายการแจ้งเตือน |
| `--border` | `#E2DED3` | `#463E36` | ขอบตกแต่ง (การ์ด/เส้นแบ่ง) — ไม่ต้องถึง 3:1 |
| `--input` | `#7E8270` | `#8C7E70` | **ขอบ control** (ช่องกรอก/select/checkbox/ปุ่ม outline/segmented) ≥3:1 |
| `--ring` | = primary | = primary | outline โฟกัส |
| `--destructive` | `#A5291F` | `#F2998C` | ปุ่มอันตราย/ข้อความ error/สถานะวิกฤต |
| `--destructive-foreground` | `#FFFFFF` | `#26211C` | ตัวอักษรบนปุ่ม destructive |
| `--destructive-muted` | `#FBE6E2` | `#4A2622` | พื้น alert/pill/heat วิกฤต |
| `--success` | `#356B3A` | `#9CC98A` | สำเร็จ/อนุมัติ (ต้องมีไอคอน ✓ + ข้อความเสมอ — เขียวใกล้ primary) |
| `--success-muted` | `#E5F0E4` | `#2F3A28` | พื้นสำเร็จ |
| `--warning` | `#8A5A0B` | `#E3B862` | เตือน/ใกล้กำหนด |
| `--warning-muted` | `#FBEFD5` | `#45371C` | พื้นเตือน |
| `--info` | `#2F5F86` | `#9CC3E6` | รอตรวจ/ข้อมูล |
| `--info-muted` | `#E4EEF5` | `#263646` | พื้น info |
| `--clay` **ใหม่** | `#A4482B` ดินเผา | `#E39B7B` | สีเน้นที่สอง: ไอคอนทักทาย, ภาพประกอบ, ตัวอักษรบน avatar, แถบตกแต่งบนการ์ดเด่น, ประกายฉลอง — **ห้ามใช้เป็นสถานะ/ปุ่ม/ข้อความ error** (ใกล้ destructive) |
| `--clay-muted` **ใหม่** | `#F6E4DA` | `#43302A` | พื้น avatar, พื้นกล่องไอคอนทักทาย |
| `--chart-1` | = primary | = primary | ค่าจริง |
| `--chart-2` | = info | = info | benchmark |
| `--chart-3` | = clay | = clay | ชุดที่ 3 (เปลี่ยนจาก warning — ลดความหมาย "เตือน" ในกราฟ) |
| `--chart-4` | = muted-foreground | = muted-foreground | เป้าหมาย (เส้นประ) |
| `--chart-5` | = success | = success | สำรอง |

ค่าที่ไม่ใช่สี (`:root` เท่านั้น): `--radius: 0.625rem` (10px — มุมนุ่มขึ้นจาก 8px), `--topbar-h: 4rem` (64px — ให้ปุ่มมีข้อความ+กระดิ่งมีป้ายหายใจได้), `--sidebar-w: 16.5rem`
Overlay ของ dialog/drawer/sheet: `bg-foreground/40` (light) · `dark:bg-black/60` — ห้าม `bg-black/70` ในโหมดสว่าง (ทึบเกิน)
**Token parity:** ทุก token สีใน `:root` ต้องมีใน `.dark` (34 ตัว)
**ข้อห้ามเพิ่มเติม:** `.dark` ห้ามมี `--background` ที่ luminance < 0.012 และห้าม `--foreground` = `#FFFFFF` (เทสต์ตรวจ — กันย้อนกลับไปดำสนิท/ขาวจ้า)

## E2. ตาราง contrast ทุกคู่ที่อนุญาต [A] (คู่ที่ไม่อยู่ในตาราง = ห้ามใช้เป็นข้อความ/ขอบที่มีความหมาย)
เกณฑ์: ข้อความ 4.5 · UI/กราฟิก/ขอบ control 3.0 · ลำดับ #1–#38 ความหมายเดียวกับ saas-tokens §T2 (เทสต์เดิมเปลี่ยนแค่ค่า) + #39–#42 ใหม่

| # | ตัวหน้า | พื้น | light | dark | เกณฑ์ | ใช้กับ |
|---|---|---|---|---|---|---|
| 1 | foreground | background | 13.37 | 12.67 | 4.5 | เนื้อหาบนพื้นหน้า |
| 2 | foreground | card | 14.56 | 11.41 | 4.5 | เนื้อหาในการ์ด/เมนู/panel |
| 3 | foreground | muted | 12.35 | 10.02 | 4.5 | หัวตาราง, hover |
| 4 | muted-foreground | background | 6.50 | 7.94 | 4.5 | meta บนพื้นหน้า |
| 5 | muted-foreground | card | 7.08 | 7.15 | 4.5 | help/meta/เวลาแจ้งเตือน |
| 6 | muted-foreground | muted | 6.01 | 6.28 | 4.5 | หัวคอลัมน์, disabled |
| 7 | primary-foreground | primary | 6.05 | 7.89 | 4.5 | ปุ่มหลัก, `.aq-count` |
| 8 | primary | background | 5.55 | 7.89 | 4.5 | ลิงก์/focus บนพื้นหน้า |
| 9 | primary | card | 6.04 | 7.11 | 4.5 | ลิงก์/focus/จุด "ใหม่" ในการ์ด |
| 10 | primary | muted | 5.12 | 6.24 | 4.5 | ลิงก์ในหัวตาราง, focus บน hover, progress บน track |
| 11 | primary | primary-muted | 5.08 | 5.72 | 4.5 | pill "ใหม่", chip, ไอคอนเมนู active |
| 12 | foreground | primary-muted | 12.25 | 9.19 | 4.5 | ข้อความเมนู active, ภาษาที่เลือก (segmented) |
| 13 | muted-foreground | primary-muted | 5.96 | 5.76 | 4.5 | meta ในแถวที่เลือก |
| 14 | input | background | 3.62 | 4.05 | 3.0 | ขอบ control บนพื้นหน้า |
| 15 | input | card | 3.94 | 3.65 | 3.0 | ขอบ control ในการ์ด/topbar/เมนู |
| 16 | input | muted | 3.35 | 3.20 | 3.0 | ขอบ control บนพื้น muted, heat "ว่าง" |
| 17 | destructive-foreground | destructive | 7.15 | 7.37 | 4.5 | ปุ่ม destructive |
| 18 | destructive | card | 7.14 | 6.64 | 4.5 | error ใต้ช่องกรอก |
| 19 | destructive | background | 6.55 | 7.37 | 4.5 | error บนพื้นหน้า |
| 20 | destructive | destructive-muted | 5.97 | 6.10 | 4.5 | pill/alert วิกฤต |
| 21 | success | success-muted | 5.40 | 6.34 | 4.5 | pill/alert สำเร็จ |
| 22 | success | card | 6.32 | 7.62 | 4.5 | "บันทึกแล้ว", ไอคอนสำเร็จ |
| 23 | success | background | 5.81 | 8.46 | 4.5 | ข้อความสำเร็จบนพื้นหน้า |
| 24 | warning | warning-muted | 5.19 | 6.22 | 4.5 | pill/alert เตือน |
| 25 | warning | card | 5.91 | 7.73 | 4.5 | ไอคอน/ข้อความเตือน |
| 26 | warning | background | 5.43 | 8.58 | 4.5 | ข้อความเตือนบนพื้นหน้า |
| 27 | info | info-muted | 5.75 | 6.69 | 4.5 | pill "รอตรวจ", alert info |
| 28 | info | card | 6.76 | 7.77 | 4.5 | ไอคอน info, กราฟชุด 2 |
| 29 | info | background | 6.21 | 8.63 | 4.5 | ข้อความ info บนพื้นหน้า |
| 30 | foreground | success-muted | 12.45 | 9.50 | 4.5 | เนื้อความ alert สำเร็จ |
| 31 | foreground | warning-muted | 12.79 | 9.19 | 4.5 | เนื้อความ alert เตือน |
| 32 | foreground | destructive-muted | 12.17 | 10.49 | 4.5 | เนื้อความ alert error |
| 33 | foreground | info-muted | 12.40 | 9.83 | 4.5 | เนื้อความ alert info |
| 34 | muted-foreground | success-muted | 6.05 | 5.95 | 4.5 | meta ใน alert สำเร็จ |
| 35 | muted-foreground | warning-muted | 6.22 | 5.76 | 4.5 | meta ใน alert เตือน |
| 36 | muted-foreground | destructive-muted | 5.92 | 6.57 | 4.5 | meta ใน alert error |
| 37 | muted-foreground | info-muted | 6.03 | 6.15 | 4.5 | meta ใน alert info |
| 38 | success | muted | 5.36 | 6.69 | 3.0 | progress ครบบน track |
| 39 | clay | background | 5.44 | 7.02 | 4.5 | ไอคอน/ข้อความตกแต่งบนพื้นหน้า (ทักทาย) |
| 40 | clay | card | 5.92 | 6.32 | 4.5 | ภาพประกอบ/ตัวเลขเน้นในการ์ด, กราฟชุด 3 |
| 41 | clay | clay-muted | 4.81 | 5.45 | 4.5 | ตัวอักษรย่อบน avatar, ไอคอนในกล่องทักทาย |
| 42 | foreground | clay-muted | 11.83 | 9.85 | 4.5 | ข้อความบนพื้น clay-muted (ถ้ามี) |

ค่าที่ไม่อยู่ใน token (ui-inspector วัดบนหน้าจริง): ปุ่มหลัก hover `bg-primary/90` — light ตัวขาวบนเสจที่ผสมพื้นทราย ≈5.6 · dark ตัวเข้มบนเสจผสมถ่าน ≈7.0 (คาด [A] — ต้อง ≥4.5)
คู่ที่ "ใกล้กัน" ต้องแยกด้วยรูป/ข้อความ (WCAG 1.4.1): primary ↔ success (เขียวทั้งคู่ — สถานะสำเร็จต้องมี ✓ + คำ) · clay ↔ destructive (แดงอมส้ม — clay ห้ามเป็นสถานะ, error ต้องมีไอคอน + คำ "ผิดพลาด"/ข้อความ)

**ข้อห้ามสี (คงตาม saas-tokens §T2 ทุกข้อ + ใหม่):**
- ห้าม `#000`/`bg-black` ทึบ, ห้าม `text-white`/`#FFF` เป็นตัวอักษรในโหมดมืด (ปุ่มหลัก dark ใช้ `text-primary-foreground` = สีพื้นมืด)
- ห้ามใช้ `--clay` กับสถานะ/ปุ่ม/ลิงก์/ข้อความ error · ห้าม `bg-clay` เป็นพื้นใหญ่ (ใช้ `bg-clay-muted` ได้เฉพาะ avatar/กล่องไอคอน ≤ 48px)
- พื้นใหญ่ = background/card/muted เท่านั้น (เหมือนเดิม)

## E3. Typography ที่ปรับ (นอกนั้นตาม saas-tokens §T3)
- ฟอนต์เดิม IBM Plex Sans Thai Looped (ไม่เปลี่ยน — เจ้าของไม่ได้ติด)
- h1 หน้าในแอป `text-2xl` (เดิม) · คำทักทายบนหน้าหลัก `text-xl font-semibold` (ไม่ใช่ h1 — h1 ยังเป็น "หน้าหลัก" เพื่อคงลำดับหัวเรื่อง)
- หัวกลุ่มเมนู (`aq-nav-group`) คง role SM (14px) แต่สี `text-muted-foreground` + `font-medium` (คู่ #4/#5 ≥6.5) — ไม่ uppercase
- ป้ายข้อความใต้ไอคอน/ข้างไอคอนในแถบบน = `text-base font-medium` (16px) — ห้ามลดเป็น 14px เพื่อให้พอดี (ให้ซ่อนป้ายตาม breakpoint แทน)

## E4. Elevation / radius / motion ที่ปรับ (นอกนั้นตาม saas-tokens §T6–T8)
- radius: การ์ด/panel/เมนู `rounded-xl` (= `var(--radius)` + 2px ≈ 12px) · ปุ่ม/ช่องกรอก/segmented `rounded-lg` (10px) · pill/avatar/badge นับ `rounded-full`
- เงา light: การ์ด `shadow-sm` · popover/panel/เมนู `shadow-lg` (นุ่ม ไม่ดำ: Tailwind ค่าเริ่ม) · dark: ไม่มีเงา ใช้ขอบ `--border` + พื้น card สว่างกว่าพื้นหน้าแทน
- motion ใหม่ (ทั้งหมดอยู่ใน `tailwind.config.ts` keyframes เดิม/เพิ่ม — ปิดด้วยกฎ reduced-motion global เดิม):
  | ชื่อ | ใช้กับ | ค่า |
  |---|---|---|
  | `animate-pop-in` (มีแล้ว) | เมนู avatar, panel แจ้งเตือน desktop, popover การแสดงผล | 150ms enter, scale .98→1 + fade |
  | `animate-sheet-in` **ใหม่** | panel แจ้งเตือนมือถือ (เลื่อนขึ้นจากล่าง) | 220ms enter, translateY(16px)→0 + fade |
  | `animate-bump` (มีแล้ว) | ตัวนับกระดิ่งเมื่อเพิ่ม (ครั้งเดียว) | เดิม |
  | `transition-colors duration-fast` | hover ปุ่ม/แถว/เมนู | 150ms |
  | `animate-fade-up` (มีแล้ว) | การ์ดทักทายบนหน้าหลัก (ครั้งแรกที่โหลด) | เดิม |
  ห้าม: animation วน (ยกเว้น spinner/skeleton ระหว่างโหลด), parallax, confetti เต็มจอ, ทัวร์บังจอ, การ์ดยก/translate ตอน hover

## E5. ไฟล์ที่ต้องแก้ตามภาคผนวกนี้ (R2-F0)
- `app/globals.css`: `:root` / `.dark` เปลี่ยนค่าตาม §E1 (HSL จากสคริปต์) + เพิ่ม `--clay`, `--clay-muted` · `--radius`, `--topbar-h`, `--sidebar-w` ตาม §E1 · กฎ `::selection` คงใช้ primary-muted
- `tailwind.config.ts`: เพิ่ม `clay: { DEFAULT: c('clay'), muted: c('clay-muted') }` ใน colors · `borderRadius.xl: 'calc(var(--radius) + 2px)'` · keyframes/animation `sheet-in` · ที่เหลือไม่แตะ
- `components/ui/ThemeProvider.tsx`: `defaultTheme="light"` (คง `enableSystem` เพื่อให้เลือก "ตามเครื่อง" ได้, storageKey `aunqa_theme` เดิม — ผู้ใช้ที่เคยเลือกไว้แล้วค่ายังอยู่)
