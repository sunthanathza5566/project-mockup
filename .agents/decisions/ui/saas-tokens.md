# ADR-UI-002 ภาคผนวก T — Design tokens "Modern SaaS" (light + dark)

> **SUPERSEDED บางส่วน (2026-10-26, ADR-UI-003):** §T1 (ค่าสีทั้งหมด), §T2 (ตาราง contrast), §T12 ค่า `defaultTheme` และค่า `--radius`/`--topbar-h`/`--sidebar-w` → ใช้ `ui/earth-tokens.md` (§E1, §E2, §E4) แทน · หัวข้ออื่น (§T3–§T11, โครง §T9/§T10) ยังมีผล

> บังคับเท่า ADR-UI-002 · แทน `ui/tokens.md` (ADR-UI-001) ในเรื่อง สี/ฟอนต์/radius/shadow/z-index/focus/dark mode · เรื่องที่ **ยังใช้ตาม tokens.md เดิม**: T2.3 (รายการ class ที่ใช้ 13/14px — กลายเป็น role class ใน §T10), T2.4 (ปรับขนาดตัวอักษร), T3 (4px grid), T4 (target), T8 (duration/easing), T10 (breakpoints mobile-first)
> ที่มาของตัวเลข contrast: **[A]** = architect คำนวณมือด้วยสูตร WCAG 2.x จาก hex ในตาราง (ทศนิยม 2 ตำแหน่ง) — **qa-tester ต้องวัดซ้ำด้วยสคริปต์ใน Q0 ก่อน S1 เริ่ม** (`tests/contrast.test.ts` คำนวณจากค่า HSL จริงใน CSS; ต่างจากตารางได้ ≤0.10 เพราะการปัดเศษ HSL) — ถ้าคู่ใดตกเกณฑ์ = BLOCKED กลับ architect ห้ามแก้ค่าเอง

## T1. Token สี (ตัวแปร shadcn รูปแบบ HSL channel — ห้ามใส่ `hsl()` ในค่า) — **SUPERSEDED → earth-tokens §E1** (กติกา HSL channel ยังใช้)
- **brand accent = `--primary` (indigo) สีเดียวทั้งระบบ** — ใช้กับสิ่งที่กดได้/สถานะเลือก/โฟกัส/ค่าความคืบหน้าเท่านั้น (ไม่เกิน ~10% พื้นที่)
- `--accent` / `--secondary` ของ shadcn = **พื้นเทาสำหรับ hover/ปุ่มรอง** ไม่ใช่สีแบรนด์ (คงชื่อเพื่อให้ component shadcn ทำงาน)
- ค่า hex ในวงเล็บ = ค่าอ้างอิงสำหรับคำนวณ contrast และสื่อสาร (โค้ดใช้ค่า HSL)

| token | light (HSL · hex) | dark (HSL · hex) | ใช้ที่ไหน |
|---|---|---|---|
| `--background` | `0 0% 98%` · #FAFAFA | `240 10% 3.9%` · #09090B | พื้นหน้า, sidebar, topbar |
| `--foreground` | `240 5.9% 10%` · #18181B | `0 0% 98%` · #FAFAFA | ตัวอักษรหลัก |
| `--card` / `--popover` | `0 0% 100%` · #FFFFFF | `240 5.9% 10%` · #18181B | การ์ด, ตาราง, dialog, toast, popover, ช่องกรอก |
| `--card-foreground` / `--popover-foreground` | = foreground | = foreground | |
| `--primary` | `243.4 75.4% 58.6%` · #4F46E5 | `234.5 89.5% 73.9%` · #818CF8 | ปุ่มหลัก, ลิงก์, เมนู active (แถบ), แท่งค่า progress, focus ring |
| `--primary-foreground` | `0 0% 100%` · #FFFFFF | `240 10% 3.9%` · #09090B | ตัวอักษรบนปุ่มหลัก/ตัวนับเมนู |
| `--primary-muted` | `225.9 100% 96.7%` · #EEF2FF | `243.8 47.1% 20%` · #1E1B4B | พื้น pill tone primary, chip ข้อที่เลือก, แถวที่เลือก, matrix I, `::selection` |
| `--secondary` / `--muted` / `--accent` | `240 4.8% 95.9%` · #F4F4F5 | `240 3.7% 15.9%` · #27272A | หัวตาราง, ช่อง read-only, hover ของ ghost/เมนู, skeleton, track ของ progress, พื้น empty icon |
| `--secondary-foreground` / `--accent-foreground` | = foreground | = foreground | |
| `--muted-foreground` | `240 5.2% 33.9%` · #52525B | `240 5% 64.9%` · #A1A1AA | ข้อความรอง, help, meta, placeholder, หัวคอลัมน์ (เข้มกว่า zinc-500 ของ shadcn โดยตั้งใจ — ผู้ใช้ 50+ และต้อง ≥4.5 บนพื้น muted) |
| `--border` | `240 5.9% 90%` · #E4E4E7 | `240 3.7% 15.9%` · #27272A | ขอบการ์ด/ตาราง/เส้นแบ่ง (ตกแต่ง — ไม่ต้องถึง 3:1) |
| `--input` | `240 3.4% 53.7%` · #85858D | `240 3.8% 46.1%` · #71717A | **ขอบช่องกรอก/select/checkbox/ปุ่ม outline** (ต้อง ≥3:1 — เข้มกว่า shadcn ปกติโดยตั้งใจ) |
| `--ring` | = primary | = primary | outline โฟกัส |
| `--destructive` | `0 73.7% 41.8%` · #B91C1C | `0 90.6% 70.8%` · #F87171 | ปุ่มลบ/ยืนยันอันตราย, ข้อความ error, ไอคอน/ตัวอักษรสถานะ "วิกฤต" |
| `--destructive-foreground` | `0 0% 100%` · #FFFFFF | `240 10% 3.9%` · #09090B | ตัวอักษรบนปุ่ม destructive |
| `--destructive-muted` | `0 85.7% 97.3%` · #FEF2F2 | `0 74.7% 15.5%` · #450A0A | พื้น alert/pill/heat "วิกฤต" |
| `--success` | `142.4 71.8% 29.2%` · #15803D | `141.9 69.2% 58%` · #4ADE80 | ตัวอักษร/ไอคอน "อนุมัติ/สำเร็จ", แท่ง progress เมื่อครบ |
| `--success-muted` | `138.5 76.5% 96.7%` · #F0FDF4 | `144.9 80.4% 10%` · #052E16 | พื้น pill/heat/alert สำเร็จ |
| `--warning` | `26 90.5% 37.1%` · #B45309 | `43.3 96.4% 56.3%` · #FBBF24 | ตัวอักษร/ไอคอนเตือน |
| `--warning-muted` | `48 100% 96.1%` · #FFFBEB | `20.9 91.7% 14.1%` · #451A03 | พื้นเตือน |
| `--info` | `192.9 82.3% 31%` · #0E7490 | `187.9 85.7% 53.3%` · #22D3EE | ตัวอักษร/ไอคอน "รอตรวจ/ข้อมูล" (cyan — แยกจาก indigo ชัด) |
| `--info-muted` | `183.2 100% 96.3%` · #ECFEFF | `197 78.9% 14.9%` · #083344 | พื้น info |
| `--chart-1` | = primary | = primary | กราฟชุด "ค่าจริง" (เส้นทึบ + จุดวงกลม) |
| `--chart-2` | = info | = info | ชุด benchmark (ประจุด + สี่เหลี่ยม) |
| `--chart-3` | = warning | = warning | ชุดที่ 3 |
| `--chart-4` | = muted-foreground | = muted-foreground | เป้าหมาย (เส้นประ) |
| `--chart-5` | = success | = success | สำรอง |
| `--radius` | `0.5rem` | — | |

ค่าที่ไม่ใช่สี (ใน `:root` เท่านั้น ไม่ต้องมีใน `.dark`): `--radius: 0.5rem; --topbar-h: 3.5rem; --sidebar-w: 16rem;`
Overlay dialog/drawer: `bg-black/50` (light) · `dark:bg-black/70`
**Token parity:** ทุกตัวแปรสีใน `:root` ต้องมีใน `.dark` (เทสต์ตรวจ)

## T2. ตาราง contrast ทุกคู่ที่อนุญาต (คู่ที่ไม่อยู่ในตาราง = ห้ามใช้เป็นข้อความ/ขอบที่มีความหมาย) [A] — **SUPERSEDED → earth-tokens §E2** (ข้อห้ามสีท้ายหัวข้อนี้ยังใช้ + ข้อห้ามเพิ่มใน §E2)
เกณฑ์: ข้อความ 4.5 · UI/กราฟิก/ขอบช่องกรอก 3.0
| # | ตัวหน้า | พื้น | light | dark | เกณฑ์ | ใช้กับ |
|---|---|---|---|---|---|---|
| 1 | foreground | background | 16.97 | 19.06 | 4.5 | เนื้อหาบนพื้นหน้า |
| 2 | foreground | card | 17.72 | 16.97 | 4.5 | เนื้อหาในการ์ด/ตาราง/dialog |
| 3 | foreground | muted | 16.12 | 14.27 | 4.5 | หัวตาราง, read-only, hover |
| 4 | muted-foreground | background | 7.41 | 7.76 | 4.5 | meta บนพื้นหน้า |
| 5 | muted-foreground | card | 7.73 | 6.91 | 4.5 | help/meta/placeholder ในการ์ด |
| 6 | muted-foreground | muted | 7.03 | 5.81 | 4.5 | หัวคอลัมน์, ปุ่ม disabled, placeholder ใน read-only |
| 7 | primary-foreground | primary | 6.29 | 6.67 | 4.5 | ปุ่มหลัก, ตัวนับเมนู `.aq-count`, matrix M |
| 8 | primary | background | 6.02 | 6.67 | 4.5 | ลิงก์, focus ring บนพื้นหน้า |
| 9 | primary | card | 6.29 | 5.94 | 4.5 | ลิงก์ในการ์ด, focus ring บนการ์ด |
| 10 | primary | muted | 5.72 | 4.99 | 4.5 | ลิงก์ในหัวตาราง, focus ring บนพื้น muted, แท่ง progress บน track (UI) |
| 11 | primary | primary-muted | 5.62 | 5.36 | 4.5 | pill tone primary, chip ที่เลือก |
| 12 | foreground | primary-muted | 15.84 | 15.32 | 4.5 | แถวที่เลือก, matrix I |
| 13 | muted-foreground | primary-muted | 6.91 | 6.24 | 4.5 | meta ในแถวที่เลือก |
| 14 | input | background | 3.51 | 4.12 | 3.0 | ขอบช่องกรอกบนพื้นหน้า |
| 15 | input | card | 3.66 | 3.67 | 3.0 | ขอบช่องกรอกในการ์ด, ปุ่ม outline |
| 16 | input | muted | 3.33 | 3.08 | 3.0 | ขอบช่องกรอกบนพื้น muted, heat "ว่าง" (เส้นประ) — dark เฉียด: ห้ามลดความหนาต่ำกว่า 1px |
| 17 | destructive-foreground | destructive | 6.47 | 7.19 | 4.5 | ปุ่ม destructive |
| 18 | destructive | card | 6.47 | 6.40 | 4.5 | error ใต้ช่องกรอก, ขอบช่อง error, ปุ่ม destructive-outline |
| 19 | destructive | background | 6.20 | 7.19 | 4.5 | ข้อความ error บนพื้นหน้า |
| 20 | destructive | destructive-muted | 5.91 | 5.84 | 4.5 | pill/heat/alert วิกฤต |
| 21 | success | success-muted | 4.79 | 8.55 | 4.5 | pill/heat/alert สำเร็จ (light เฉียด: ใช้ weight ≥500) |
| 22 | success | card | 5.02 | 10.17 | 4.5 | ไอคอน/ข้อความสำเร็จในการ์ด, "บันทึกแล้ว" |
| 23 | success | background | 4.81 | 11.42 | 4.5 | ข้อความสำเร็จบนพื้นหน้า |
| 24 | warning | warning-muted | 4.84 | 8.97 | 4.5 | pill/heat/alert เตือน |
| 25 | warning | card | 5.02 | 10.61 | 4.5 | ไอคอน/ข้อความเตือนในการ์ด, เส้นกราฟชุด 3 |
| 26 | warning | background | 4.81 | 11.92 | 4.5 | ข้อความเตือนบนพื้นหน้า |
| 27 | info | info-muted | 5.15 | 7.41 | 4.5 | pill/heat "รอตรวจ", matrix R, alert info |
| 28 | info | card | 5.36 | 9.80 | 4.5 | ไอคอน info, เส้นกราฟชุด 2 |
| 29 | info | background | 5.13 | 11.01 | 4.5 | ข้อความ info บนพื้นหน้า |
| 30 | foreground | success-muted | 16.92 | 14.28 | 4.5 | เนื้อความใน alert สำเร็จ |
| 31 | foreground | warning-muted | 17.08 | 14.35 | 4.5 | เนื้อความใน alert เตือน |
| 32 | foreground | destructive-muted | 16.20 | 15.47 | 4.5 | เนื้อความใน alert error |
| 33 | foreground | info-muted | 17.03 | 12.84 | 4.5 | เนื้อความใน alert info |
| 34 | muted-foreground | success-muted | 7.38 | 5.82 | 4.5 | meta ใน alert สำเร็จ |
| 35 | muted-foreground | warning-muted | 7.45 | 5.84 | 4.5 | meta ใน alert เตือน |
| 36 | muted-foreground | destructive-muted | 7.07 | 6.30 | 4.5 | meta ใน alert error |
| 37 | muted-foreground | info-muted | 7.43 | 5.23 | 4.5 | meta ใน alert info |
| 38 | success | muted | 4.56 | 8.55 | 3.0 | แท่ง progress เมื่อครบ บน track |

ค่าที่ไม่อยู่ใน token (วัดจากหน้าจริงโดย ui-inspector — คาดการณ์ [A]): ปุ่มหลัก hover `bg-primary/90` บนพื้นหน้า: light ตัวขาว ≈5.15 · dark ตัวเข้ม ≈5.56 · ปุ่ม destructive hover `/90`: light ≈5.59 · dark ≈5.9 → ทั้งหมด ≥4.5

**ข้อห้ามสี (ตรวจด้วย grep/สคริปต์ใน Q0/Q1):**
- ห้ามสีตายตัวใน tsx (`#[0-9a-f]{3,6}`, `rgb(`, `bg-white`, `bg-black` ยกเว้น `bg-black/50`/`bg-black/70` ของ overlay, `text-white`, `text-black`, palette Tailwind ตรง ๆ เช่น `text-zinc-500`, `bg-indigo-600`) — ใช้ token เท่านั้น เพื่อให้ dark mode ทำงานครบ
- ห้าม `opacity-*` < 100 กับข้อความ/ปุ่มเพื่อทำ disabled หรือ "ตัวจาง" (ใช้คู่ #6)
- ห้ามตัวขาว/ตัวเข้มบนสีสถานะทึบในช่อง heatmap/pill — ใช้คู่ `*` บน `*-muted` (#20, #21, #24, #27)
- ห้ามใช้ `--primary` เป็นพื้นใหญ่ (แถบ hero/footer สีเข้มแบบเดิม — ไม่มีแล้ว) — พื้นใหญ่ = background/card/muted เท่านั้น
- `--border` ใช้เป็นขอบตกแต่งเท่านั้น; ขอบที่บอกขอบเขตของ control = `--input`

## T3. ตัวอักษร
### T3.1 Family
`next/font/google` → `IBM_Plex_Sans_Thai_Looped({ weight: ['400','500','600'], subsets: ['thai','latin'], display: 'swap', variable: '--font-plex-thai' })` ใส่ `className={font.variable}` ที่ `<html>` · Tailwind `fontFamily.sans = ['var(--font-plex-thai)', 'Leelawadee UI', 'Tahoma', 'sans-serif']` · `fontFamily.mono = ['ui-monospace','SFMono-Regular','Consolas','monospace']` (hash/รหัสไฟล์/kbd)
### T3.2 Type scale (แทน `theme.fontSize` ทั้งชุด — ไม่ใช่ extend; ทุกค่าเป็น rem จึงขยายตาม `--user-scale`)
| class | rem / px@100% | line-height | weight | ใช้กับ |
|---|---|---|---|---|
| `text-xs` | 0.8125 / 13 | 1.5 | 500 | **เฉพาะใน XS role class** (§T10): pill, badge, ตัวนับ, ป้ายในช่อง heat, ป้ายกราฟ, kbd |
| `text-sm` | 0.875 / 14 | 1.6 | 400/500 | **เฉพาะใน SM role class** + `th`, `caption`, `figcaption` |
| `text-base` | 1 / 16 | 1.7 | 400 | **ค่าเริ่ม body**: ย่อหน้า, เซลล์ตาราง, label, ช่องกรอก, ปุ่ม, เมนู |
| `text-lg` | 1.125 / 18 | 1.6 | 600 | หัวการ์ด, หัว dialog, h3 |
| `text-xl` | 1.25 / 20 | 1.5 | 600 | h2 หัว section ในหน้า |
| `text-2xl` | 1.5 / 24 | 1.4 | 600 | h1 หน้าในแอป |
| `text-3xl` | 1.875 / 30 | 1.35 | 600 | ตัวเลข KPI (`tabular-nums`), h2 landing |
| `text-4xl` | 2.25 / 36 | 1.35 | 600 | h1 hero (<1024) |
| `text-5xl` | 3 / 48 | 1.35 | 600 | h1 hero (≥1024) |
กฎ:
- ข้อความไทยทุกขนาด line-height ≥1.35 (ห้าม `leading-none/tight/snug` และ `leading-[<1.35]`) · ข้อความยาวใน SAR editor ใช้ `leading-[1.75]`
- **ห้าม `tracking-*`** (letter-spacing) กับข้อความที่อาจเป็นไทย · ห้าม `uppercase` กับหัวกลุ่มเมนู (เป็นไทย)
- ห้าม `font-bold`/`font-extrabold` (ไม่ได้โหลด 700; `font-synthesis:none`) · `strong,b` = 600 ใน base
- ตัวเลขในตาราง/KPI/ตัวนับ = `tabular-nums` (ui-inspector ตรวจว่าฟอนต์รองรับ; ถ้าไม่รองรับยอมรับได้ จด Log)
- ย่อหน้ายาวชิดซ้าย `max-w-prose`-ish (`max-w-[46rem]`) ห้าม justify/center
- ไม่มีข้อความใด computed < 13px; 13px/14px ได้เฉพาะใน role class (AC-02 เดิม — เทสต์ไม่เปลี่ยน)

## T4. Spacing / density / layout
- 4px grid ของ Tailwind (rem) — ใช้ค่า: 1 (4), 1.5 (6), 2 (8), 3 (12), 4 (16), 6 (24), 8 (32), 12 (48), 16 (64)
- padding หน้าแอป: `px-4 md:px-6 lg:px-8`, `py-6 lg:py-8` · ความกว้างเนื้อหา `max-w-screen-xl mx-auto` (1280) ยกเว้น SAR editor ที่ใช้เต็มความกว้าง
- ระยะระหว่าง section ในหน้า `space-y-6` · ระหว่างการ์ดใน grid `gap-4 lg:gap-6` · ภายในการ์ด `p-4 md:p-6`, หัวการ์ด → เนื้อหา `space-y-1.5` + `pt-0`
- ตาราง: เซลล์ `px-4 py-3`, หัวคอลัมน์ `h-11 px-4` · แถวต่ำสุด 48px
- ฟอร์ม: ระหว่าง field `space-y-5`, label→ช่อง `gap-1.5`, ช่อง→help `mt-1.5`
- ปุ่มติดกัน `gap-2` (≥8px); ปุ่มทำลายห่างปุ่มหลัก ≥16px (`ml-4` หรือคนละฝั่ง)
- shell: topbar `h-[var(--topbar-h)]` → ใช้ `min-h-topbar` (spacing key `topbar`) · sidebar `w-sidebar` (16rem) · sticky ใต้ topbar: `top-[calc(var(--topbar-h)+1rem)]`

## T5. ขนาดควบคุม (target) — เท่าเดิม ใช้ `min-h-*` ไม่ใช่ `h-*` กับทุกอย่างที่มีข้อความ
| control | class | ทุกขนาดจอ | ≥1024 |
|---|---|---|---|
| ปุ่ม default/outline/ghost/destructive | `min-h-11 px-4` | 44 | 44 |
| ปุ่ม compact (ในตาราง/toolbar) | `min-h-11 lg:min-h-10 px-3` + hook `aq-btn-compact` | 44 | 40 |
| ปุ่มไอคอน | `h-11 w-11` (ไม่มีข้อความ → h ได้) | 44×44 | 44×44 |
| input / native select / ปุ่มไฟล์ | `min-h-11 px-3` | 44 | 44 |
| textarea | `min-h-24` (prose `min-h-[24rem]`) | — | — |
| tab | `min-h-11 px-3` | 44 | 44 |
| เมนู sidebar | `min-h-11 px-3` + hook `aq-nav-item` | 44 | 44 |
| select ใน matrix หลักสูตร | `min-h-11 lg:min-h-10` (อยู่ใต้ `.aq-matrix`) | 44 | 40 |
| ปุ่ม (?) ของ Term / × ของ chip | `h-8 w-8` + hook `aq-term__btn` / `aq-chip__remove` | 32×32 | 32×32 |
| checkbox/radio | `h-5 w-5 accent-[hsl(var(--primary))]` ใน label ที่สูง ≥44 | label 44 | label 44 |

## T6. Radius / shadow / border
- `--radius: 0.5rem` → `rounded-lg` 8px (การ์ด, dialog, ตาราง wrapper, toast, dropzone) · `rounded-md` 6px (ปุ่ม, input, select, tab, nav item, heat cell) · `rounded-sm` 4px (kbd, chip ด้านใน) · `rounded-full` (avatar, `.aq-count`, ProgressRing)
- **การ์ด = `border bg-card` + `shadow-sm` (light) / `dark:shadow-none`** — ไม่มีเงาหนัก · popover/dialog/toast = `shadow-lg dark:shadow-none` + border
- hover ของการ์ดที่กดได้: `hover:border-input` (+ `hover:shadow-sm`) — **ไม่ยกขึ้น (ไม่มี translate)**
- เส้นแบ่งในการ์ด/ตาราง = `border-border` 1px

## T7. z-index (Tailwind `zIndex` extend — ลำดับเท่าเดิม)
`sticky 10` (หัวตาราง, action bar, session-lost banner) · `topbar 30` · `drawer 40` (sidebar มือถือ + overlay — ทั้งคู่ `z-drawer`, overlay อยู่ก่อน panel ใน DOM) · `dialog 50` · `toast 60` · `loader 70` (AppLoader, skip link ตอนโฟกัส)

## T8. Motion (ค่าเดิมจาก legacy `--dur-*`/`--ease-*`)
duration: instant 100 · fast 150 · base 220 · slow 400 · progress 600 · celebrate 800 · highlight 1600 (ms) → ใส่ `transitionDuration` extend ชื่อเดียวกัน
easing (`transitionTimingFunction` extend): `enter: cubic-bezier(0,.4,0,1)` · `move: cubic-bezier(.4,0,0,1)` · `exit: cubic-bezier(.6,0,.8,.6)` · `hover: cubic-bezier(.4,1,.6,1)`
keyframes (ย้ายจาก legacy `@keyframes aq-*` เป็นชื่อไม่มี prefix): `fade-in`, `fade-up`, `pop-in`, `dialog-in`, `toast-in`, `toast-out`, `toast-time`, `highlight` (จาก `primary-muted` → transparent), `bump`, `draw`, `pop-circle`, `spark`; spinner ใช้ `animate-spin` · skeleton ใช้ `animate-pulse` (แทน shimmer)
reduced-motion: กฎ global ใน base (§T10) — ทุก animation/transition ≤0.01ms; AppLoader ยังต้องมี animation เมื่อ **ไม่** ลด motion (เทสต์ AC-08 เดิม)

## T9. `eduflow-next/tailwind.config.ts` (ฉบับที่ต้องได้หลัง S0)
```ts
import type { Config } from 'tailwindcss';

/** สีจาก CSS variable รูปแบบ HSL channel — รองรับ opacity modifier (bg-primary/90) */
const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

export default {
  darkMode: 'selector',                       // class "dark" บน <html> จาก next-themes (Tailwind ≥3.4.1)
  content: [
    './app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './context/**/*.{ts,tsx}',
    './lib/ui/**/*.{ts,tsx}', './lib/i18n/**/*.{ts,tsx}',
  ],
  corePlugins: { preflight: false },          // ADR-UI-002 D6 — ลบบรรทัดนี้ใน S6
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    fontSize: {
      xs: ['0.8125rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.6' }],
      base: ['1rem', { lineHeight: '1.7' }],
      lg: ['1.125rem', { lineHeight: '1.6' }],
      xl: ['1.25rem', { lineHeight: '1.5' }],
      '2xl': ['1.5rem', { lineHeight: '1.4' }],
      '3xl': ['1.875rem', { lineHeight: '1.35' }],
      '4xl': ['2.25rem', { lineHeight: '1.35' }],
      '5xl': ['3rem', { lineHeight: '1.35' }],
    },
    extend: {
      colors: {
        border: c('border'), input: c('input'), ring: c('ring'),
        background: c('background'), foreground: c('foreground'),
        primary: { DEFAULT: c('primary'), foreground: c('primary-foreground'), muted: c('primary-muted') },
        secondary: { DEFAULT: c('secondary'), foreground: c('secondary-foreground') },
        muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
        accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
        destructive: { DEFAULT: c('destructive'), foreground: c('destructive-foreground'), muted: c('destructive-muted') },
        success: { DEFAULT: c('success'), muted: c('success-muted') },
        warning: { DEFAULT: c('warning'), muted: c('warning-muted') },
        info: { DEFAULT: c('info'), muted: c('info-muted') },
        card: { DEFAULT: c('card'), foreground: c('card-foreground') },
        popover: { DEFAULT: c('popover'), foreground: c('popover-foreground') },
        chart: { 1: c('chart-1'), 2: c('chart-2'), 3: c('chart-3'), 4: c('chart-4'), 5: c('chart-5') },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['var(--font-plex-thai)', 'Leelawadee UI', 'Tahoma', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      spacing: { topbar: 'var(--topbar-h)', sidebar: 'var(--sidebar-w)' },
      zIndex: { sticky: '10', topbar: '30', drawer: '40', dialog: '50', toast: '60', loader: '70' },
      transitionDuration: { instant: '100ms', fast: '150ms', base: '220ms', slow: '400ms', progress: '600ms', celebrate: '800ms', highlight: '1600ms' },
      transitionTimingFunction: { enter: 'cubic-bezier(0,.4,0,1)', move: 'cubic-bezier(.4,0,0,1)', exit: 'cubic-bezier(.6,0,.8,.6)', hover: 'cubic-bezier(.4,1,.6,1)' },
      keyframes: { /* ย้ายจาก legacy ตาม §T8 — ค่าเหมือนเดิม; highlight ใช้ hsl(var(--primary-muted)) */ },
      animation: { /* 'fade-in': 'fade-in 150ms cubic-bezier(0,.4,0,1)', 'toast-in': 'toast-in 220ms …', 'highlight': 'highlight 1600ms …', ฯลฯ */ },
    },
  },
  plugins: [],
} satisfies Config;
```

## T10. โครง `eduflow-next/app/globals.css` ใหม่ (S0) — ลำดับ import ใน layout: `./legacy.css` ก่อน แล้ว `./globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root { /* ทุก token light ตาม §T1 + --radius --topbar-h --sidebar-w */ }
  .dark { /* ทุก token สีตาม §T1 คอลัมน์ dark */ }

  /* mini-base (แทน preflight ช่วงเปลี่ยนผ่าน — shadcn ต้องใช้; S6 ลบส่วนที่ซ้ำ preflight) */
  *, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: hsl(var(--border)); }

  [hidden] { display: none !important; }                 /* คงถาวร — narrative TH/EN ใช้ hidden (regress-u3fix) */
  html { font-size: var(--user-scale, 100%); font-synthesis: none; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body { @apply bg-background font-sans text-base text-foreground antialiased; min-height: 100vh; overflow-x: clip; }
  strong, b { font-weight: 600; }
  a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 3px; }   /* ลิงก์ในเนื้อหาต้องมีขีดเส้นใต้ (1.4.1); ลิงก์ที่เป็นปุ่ม/เมนูใส่ no-underline */
  ::placeholder { color: hsl(var(--muted-foreground)); opacity: 1; }
  ::selection { background: hsl(var(--primary-muted)); color: hsl(var(--foreground)); }
  :focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }      /* focus กลาง — ห้าม component ลบ */
  #main:focus { outline: none; }                         /* เป้า skip link (tabIndex=-1) เท่านั้น */
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
      transition-duration: .01ms !important; scroll-behavior: auto !important; }
  }
  html[data-effects="off"] .celebrate-spark { display: none; }   /* L7 — ชื่อ class ตาม saas-spec §M */
}

@layer components {
  /* skip link (hook a.aq-skip — เทสต์ AC-06) */
  .aq-skip { @apply absolute left-4 -top-24 z-loader inline-flex min-h-11 items-center rounded-md border bg-card px-5 font-medium text-primary no-underline shadow-lg; }
  .aq-skip:focus, .aq-skip:focus-visible { @apply top-4; }

  /* typography role — XS (≥13px) */
  .aq-pill, .aq-badge { @apply text-xs font-medium; }
  .aq-count { @apply inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-primary-foreground; }
  .aq-heat-cell__label { @apply text-xs font-medium; }
  .aq-kbd { @apply rounded-sm border bg-muted px-1 font-mono text-xs; }
  .aq-chart-label { font-size: 0.8125rem; fill: hsl(var(--muted-foreground)); }

  /* typography role — SM (≥14px) */
  .aq-help, .aq-meta, .aq-crumbs, .aq-btn-reason, .aq-saved, .aq-kpi__label, .aq-step__meta,
  .aq-legend, .aq-progress__label, .aq-term__body { @apply text-sm text-muted-foreground; }
  .aq-field-error { @apply text-sm font-medium text-destructive; }
  .aq-nav-group { @apply text-sm font-medium text-muted-foreground; }
  .aq-heat-label { @apply text-sm font-semibold; }
}
```
กฎ role class: ห้ามใส่ utility ขนาดตัวอักษรอื่น (`text-base` ฯลฯ) บน element เดียวกับ role class (utility มาทีหลังจะทับขนาด) · เปลี่ยนสีได้ด้วย utility (เช่น `aq-meta text-success`) · hook ที่ไม่มีสไตล์ (`aq-btn`, `aq-btn-compact`, `aq-nav-item`, `aq-term__btn`, `aq-chip__remove`, `aq-matrix`, `aq-textarea--prose`) **ไม่ต้องมีกฎ CSS**

## T11. Focus
- outline กลางใน base: **2px solid ring, offset 2px** ทุก element ที่โฟกัสได้ (เทสต์ AC-06 ต้อง ≥2px, contrast ≥3 กับพื้นจริง — คู่ #8/#9/#10 ทั้งสองธีม)
- ห้าม `outline-none`, `focus:outline-none`, `focus-visible:outline-none`, `focus-visible:ring-*`, `focus:ring-*` ใน tsx (grep = 0)
- การ์ดที่ทั้งใบกดได้: ให้ `<a>`/`<button>` **เป็นตัวการ์ดเอง** (outline ของ base วาดรอบการ์ดพอดี) — ห้ามซ่อน outline ของลิงก์ด้านในแล้วไปวาดที่ ancestor ด้วย `focus-within`
- ช่องกรอกที่มี border: base outline ทำงานอยู่แล้ว ไม่ต้องเพิ่ม ring

## T12. Dark mode — **`defaultTheme` SUPERSEDED → `"light"` (ADR-UI-003 D2)**; ที่เหลือยังใช้
- `next-themes` 0.4.6: `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="aunqa_theme">` ห่อ children ใน `<body>` (client component `components/ui/ThemeProvider.tsx`) · `<html lang="th" suppressHydrationWarning className={font.variable}>` · ลบ `export const viewport = { colorScheme: 'light' }` (next-themes ตั้ง `color-scheme` ให้เองด้วย `enableColorScheme` ค่าเริ่ม true)
- UI ที่ขึ้นกับธีม (ปุ่มสลับ) render placeholder ขนาดเท่ากันจน mounted (กัน hydration mismatch)
- **ห้ามกลับสีอัตโนมัติ** (`filter: invert`) · SVG (TrendChart, ProgressRing, prereq, heatmap, BrandMark, ภาพเส้น empty state) ใช้ `currentColor`/`stroke-chart-*`/`fill-muted` เท่านั้น ห้าม hex ใน SVG
- `PrefsInit` เขียน `--user-scale` (style) และ `data-effects` (attribute) บน `<html>` — ไม่ชนกับ class `dark` (next-themes แตะแค่ class + style `color-scheme`) → AC ตรวจว่าอยู่ร่วมกันหลังสลับธีม
