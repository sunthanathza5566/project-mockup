# ADR-UI-001 ภาคผนวก T — Design tokens (ฉบับล็อก)

> ใช้คู่กับ `../ADR-UI-001-redesign.md` · เขียนโดย architect · 2026-10-22 · TASK-0001 U1
> ทุกค่าในไฟล์นี้เป็น "ค่าที่ต้องใช้" ไม่ใช่ตัวอย่าง — frontend-dev ใส่เป็น CSS custom properties ใน `:root` ของ `eduflow-next/app/globals.css` บล็อกแรก **ที่เดียวเท่านั้น** ห้าม hard-code hex/px ซ้ำในคอมโพเนนต์ (ยกเว้น SVG path)
> ที่มาค่า contrast: **[R]** = researcher คำนวณแล้วใน `.agents/research/standards/ui-ux.md` ข้อ 4.2 · **[A]** = architect คำนวณด้วยสูตร WCAG relative luminance ด้วยมือ (ทศนิยม 2 ตำแหน่ง) — ui-inspector ต้องรันสคริปต์วัดซ้ำทุกคู่ใน U1b (ดู AC-01)

## T1. Palette ที่เลือก: "Indigo & Sand" (Palette B ของ researcher) + info สีน้ำเงินอมเขียว (teal จาก Palette A)

### T1.1 สีพื้นฐาน
| token | hex | ใช้ที่ไหน |
|---|---|---|
| `--c-bg` | `#FBF8F3` | พื้นหน้า (sand นวล ไม่ขาวจ้า) |
| `--c-surface` | `#FFFFFF` | การ์ด, dialog, ช่องกรอก, sidebar |
| `--c-surface-2` | `#F4EFE6` | พื้นยุบ: หัวตาราง, ช่อง read-only, ปุ่ม disabled, heat "ว่าง", skeleton base |
| `--c-ink` | `#2B2623` | ตัวอักษรหลัก |
| `--c-muted` | `#5E554D` | ตัวรอง, placeholder, ข้อความช่วย |
| `--c-primary` | `#3B4FA0` | ปุ่มหลัก, ลิงก์, focus ring, เมนู active, ตัวเลข KPI หลัก |
| `--c-primary-strong` | `#2A3978` | hover/pressed ของปุ่มหลัก, แถบเข้ม (CTA band, footer, แผงซ้ายหน้า login) |
| `--c-primary-tint` | `#E8EBF8` | พื้นเมนู active, แถว selected, heat "พอใช้", chip ข้อที่เลือก |
| `--c-accent` | `#E9A23B` | **ตกแต่งเท่านั้น**: จุดในโลโก้, เส้นใต้หัวข้อ, ประกายฉลอง (L7), focus ring บนพื้นเข้ม — **ห้ามใช้เป็นแท่งค่าของ progress ring/bar** (accent/surface-2 = 1.89 ไม่ถึง 3:1; U1b F4) |
| `--c-danger-strong` | `#8F1D17` | hover/pressed ของปุ่ม `danger-solid` (U1b F10) |
| `--c-on-accent` | `#3A2500` | ตัวอักษรบนพื้น accent (chip "ใหม่", ป้ายฉลอง) |
| `--c-accent-tint` | `#FCEBD0` | ไฮไลต์แถวที่เพิ่งเพิ่ม/แก้ (จางออก), แถบ "เคล็ดลับ" |
| `--c-border-control` | `#8C8178` | ขอบช่องกรอก/select/checkbox/ปุ่ม secondary (ต้อง ≥3:1) |
| `--c-border-subtle` | `#E5DED3` | เส้นแบ่งตาราง, ขอบการ์ด (ตกแต่ง — ไม่ต้องถึง 3:1 เพราะการ์ดมีเงา+ข้อความกำกับ) |
| `--c-on-dark` | `#FBF8F3` | ตัวอักษรบน `--c-primary-strong` |
| `--c-on-dark-muted` | `#C9CEEA` | ตัวรองบน `--c-primary-strong` |
| `--c-overlay` | `rgba(43,38,35,0.55)` | ฉากหลัง dialog / drawer |

### T1.2 สีสถานะ (ทุกสถานะ = สี + ไอคอนรูปทรงต่างกัน + ข้อความ เสมอ)
| สถานะ | fg token / hex | bg token / hex | ไอคอน (ชื่อใน Icon.tsx) |
|---|---|---|---|
| success | `--c-success` `#2F7A4B` | `--c-success-bg` `#E6F3EA` | `check-circle` |
| warning | `--c-warn` `#85530A` | `--c-warn-bg` `#FFF1D6` | `alert-triangle` |
| danger | `--c-danger` `#B3261E` | `--c-danger-bg` `#FCE8E6` | `x-circle` |
| info | `--c-info` `#1F6F78` | `--c-info-bg` `#E3F1F2` | `info` |
| neutral | `--c-ink` | `--c-surface-2` | `circle-dashed` |

เหตุผล info ใช้ teal แทน `#2459A8` ของ Palette B: น้ำเงินของ B ใกล้ indigo ของ primary จนแยกปุ่มกับป้ายข้อมูลไม่ออก (researcher เตือนไว้ใน 4.2) — teal ต่างทั้ง hue และความสว่าง

### T1.3 ตาราง contrast ทุกคู่ที่อนุญาตให้ใช้ (คู่ที่ไม่อยู่ในตารางนี้ = ห้ามใช้)
| # | ตัวหน้า | พื้น | อัตราส่วน | เกณฑ์ | ที่มา | ใช้กับ |
|---|---|---|---|---|---|---|
| 1 | ink | bg | 14.12 | 4.5 | R | เนื้อหาทั้งหมด |
| 2 | ink | surface | 14.95 | 4.5 | A (U1b วัดแล้ว) | เนื้อหาในการ์ด |
| 3 | ink | surface-2 | 13.06 | 4.5 | A | หัวตาราง, read-only |
| 4 | ink | accent-tint | 12.77 | 4.5 | A | แถวไฮไลต์ |
| 5 | muted | bg | 6.88 | 4.5 | R | ข้อความรอง |
| 6 | muted | surface | 7.29 | 4.5 | R | ข้อความรอง, placeholder |
| 7 | muted | surface-2 | 6.36 | 4.5 | A | ปุ่ม disabled, placeholder ในช่อง read-only |
| 8 | muted | primary-tint | 6.12 | 4.5 | A | ข้อความรองในแถว selected |
| 9 | #FFFFFF | primary | 7.47 | 4.5 | R | ปุ่มหลัก |
| 10 | #FFFFFF | primary-strong | 10.74 | 4.5 | R | ปุ่มหลัก hover/pressed |
| 11 | primary | bg | 7.05 | 4.5 | R | ลิงก์, ตัวเลข KPI |
| 12 | primary | surface | 7.47 | 4.5 | R | ลิงก์ในการ์ด, ปุ่ม secondary |
| 13 | primary | surface-2 | 6.52 | 4.5 | A | ลิงก์ในหัวตาราง |
| 14 | primary | primary-tint | 6.28 | 4.5 | R | chip ข้อที่เลือก |
| 15 | primary-strong | primary-tint | 9.03 | 4.5 | A | เมนู active, heat "พอใช้", matrix I |
| 16 | on-accent | accent | 6.71 | 4.5 | R | chip ฉลอง/"ใหม่" |
| 17 | on-dark | primary-strong | 10.14 | 4.5 | A | ข้อความบนแถบเข้ม |
| 18 | on-dark-muted | primary-strong | 6.90 | 4.5 | A | ข้อความรองบนแถบเข้ม |
| 19 | accent | primary-strong | 4.96 | 4.5 | A | คำเน้นในหัวข้อบนแถบเข้ม, focus ring บนพื้นเข้ม |
| 20 | success | success-bg | 4.59 | 4.5 | R | pill/heat "อนุมัติ" |
| 21 | success | bg | 4.95 | 4.5 | A | ไอคอน/ข้อความสำเร็จบนพื้นหน้า |
| 22 | #FFFFFF | success | 5.24 | 4.5 | A | (สำรอง — ไม่ใช้เป็นปุ่ม) |
| 23 | warn | warn-bg | 5.81 | 4.5 | R | pill/heat "เตือน", แถบเตือน |
| 24 | warn | surface | 6.48 | 4.5 | A | ไอคอน/ข้อความเตือนบนการ์ด, เส้นกราฟชุดที่ 3 |
| 25 | danger | danger-bg | 5.55 | 4.5 | R | pill/heat "วิกฤต", แถบ error |
| 26 | danger | surface | 6.54 | 4.5 | A | ข้อความ error ใต้ช่องกรอก, ขอบช่อง error, ปุ่ม danger (ข้อความ) |
| 27 | #FFFFFF | danger | 6.54 | 4.5 | A | ปุ่มยืนยันลบใน dialog (danger solid) |
| 28 | info | info-bg | 5.03 | 4.5 | R(A palette) | pill/heat "รอตรวจ", matrix R |
| 29 | info | surface | 5.83 | 4.5 | R(A palette) | ไอคอน info, เส้นกราฟชุดที่ 2 |
| 30 | info | bg | 5.50 | 4.5 | A | ข้อความ info บนพื้นหน้า |
| 31 | border-control | bg | 3.59 | 3.0 (UI) | R | ขอบช่องกรอก |
| 32 | border-control | surface | 3.80 | 3.0 | R | ขอบช่องกรอกในการ์ด |
| 33 | border-control | surface-2 | 3.32 | 3.0 | A | ขอบ heat "ว่าง" (เส้นประ) |
| 34 | border-control | primary-tint | 3.20 | 3.0 | A | ขอบ chip |
| 35 | primary (focus ring) | bg / surface | 7.05 / 7.47 | 3.0 | R | focus ring ทุกที่บนพื้นสว่าง |
| 36 | #FFFFFF | primary (matrix M) | 7.47 | 4.5 | R | matrix ระดับ M |

คู่เพิ่มจาก U1b (ui-inspector วัดด้วย `.agents/playtest/u1b/contrast.mjs` แล้ว — ที่มา **[U]**):
| # | ตัวหน้า | พื้น | อัตราส่วน | เกณฑ์ | ใช้กับ |
|---|---|---|---|---|---|
| 37 | ink | success-bg / warn-bg / danger-bg / info-bg | 13.08 / 13.39 / 12.69 / 12.91 | 4.5 | เนื้อความใน InlineMessage (C9) |
| 38 | muted | success-bg / warn-bg / danger-bg / info-bg | 6.37 / 6.52 / 6.18 / 6.29 | 4.5 | ข้อความรองใน InlineMessage |
| 39 | primary | accent-tint | 6.38 | 4.5 | ลิงก์รหัสในแถวที่ไฮไลต์ (L5) |
| 40 | primary (แท่งค่า ring/bar) | surface-2 (track) | 6.52 | 3.0 | ProgressRing/bar ค่าระหว่างทาง (C20) |
| 41 | success (แท่งค่า ring/bar) | surface-2 (track) | 4.58 | 3.0 | ProgressRing/bar เมื่อครบและไม่มี gap วิกฤต |
| 42 | surface (#FFF พื้นปุ่ม) / primary-strong (ตัว) | primary-strong (แถบเข้ม) | 10.74 | 4.5 / 3.0 ขอบเขตปุ่ม | ปุ่ม primary บนแถบเข้ม `.aq-on-dark .aq-btn-primary` (U1b F3) |
| 43 | on-dark (ตัว) + on-dark-muted (ขอบ 1px) | primary-strong | 10.14 / 6.91 | 4.5 / 3.0 | ปุ่ม secondary/ghost และ LangToggle บนแถบเข้ม (U1b F3) |
| 44 | #FFFFFF | danger-strong | 8.91 | 4.5 | ปุ่ม danger-solid hover/pressed (A คำนวณ) |
คู่ที่ **ห้ามใช้** (วัดแล้วตก — แทนด้วยคู่ข้างบน): accent บน surface-2 (1.89) → ใช้ #40/#41 · ปุ่ม primary ปกติบน primary-strong (1.44) → ใช้ #42 · border-control บน primary-strong (2.83) → ใช้ #43
หมายเหตุ #19 (accent/primary-strong 4.96) และ #20 (success/success-bg 4.59) ผ่านแบบเฉียด: #19 ใช้กับตัวอักษร 600+ ขนาด ≥18px หรือ focus ring เท่านั้น · #20 ใช้กับ pill/heat (13px 600) ได้ตามที่วัด ห้ามลดน้ำหนักเป็น 400

ข้อห้ามสี (ตรวจได้ด้วย grep/สคริปต์):
- `--c-accent` ห้ามเป็นสีตัวอักษร/ไอคอนบนพื้นสว่าง (2.04:1) — ใช้เป็นพื้น/เส้นตกแต่งเท่านั้น
- ห้ามใช้ `opacity` < 1 กับข้อความหรือปุ่มเพื่อทำ disabled/ซีด (ปัญหา M5 เดิม) — ใช้คู่ #7
- ห้ามตัวขาวบนสีสถานะในช่อง heatmap (ปัญหา M7) — ใช้ fg บน bg ของสถานะนั้น (#20, #23, #25, #28)
- ห้ามใช้ `#000`/`#FFF` เป็นพื้นใหญ่ของหน้า (พื้นหน้า = `--c-bg`)

### T1.4 สีกราฟ (TrendChart) — ไม่พึ่งสีอย่างเดียว
| ชุด | สี | เส้น | จุด |
|---|---|---|---|
| ค่าจริง | primary | ทึบ 2.5px | วงกลม r=4 |
| เป้าหมาย | muted | ประ `6 4` 2px | ไม่มีจุด |
| benchmark | info | ประจุด `2 4` 2px | สี่เหลี่ยม 7px |
| ชุดที่ 4 (ถ้ามี) | warn | ทึบ 2px | สามเหลี่ยม |
ทุกเส้นมีป้ายชื่อที่ปลายเส้น (direct label) + ชื่อแกน Y พร้อมหน่วย เช่น "อัตรา (%)" + แกน X "ปีการศึกษา (พ.ศ.)"

## T2. ตัวอักษร

### T2.1 Family — ตัดสิน: **Sarabun ตระกูลเดียวทั้งระบบ**
```css
--font-sans: 'Sarabun', 'Leelawadee UI', 'Tahoma', 'Noto Sans Thai', system-ui, sans-serif;
```
- โหลดผ่าน `<link>` เดิมใน `app/layout.tsx` (ไม่ใช้ `next/font` — คงกลไกเดิม ลดความเสี่ยง build ที่ต้องดึงฟอนต์ตอน build): `https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap` + `preconnect` ทั้ง `fonts.googleapis.com` และ `fonts.gstatic.com` (`crossOrigin="anonymous"`)
- **weight ที่โหลด 3 ค่า: 400 (เนื้อหา), 600 (ปุ่ม/label/เน้น/หัวการ์ด), 700 (หัวข้อ/ตัวเลข KPI)** — ห้ามใช้ 300/500/800 ในโค้ด (เบราว์เซอร์จะสังเคราะห์ ทำให้ไทยเพี้ยน)
- **ลบ Cormorant Garamond และ DM Sans ออกทั้งหมด** (ไม่มีกลิฟไทย = ต้นเหตุ B1) — ตรวจด้วย grep ไม่พบคำว่า `Cormorant`, `DM Sans`, `DM+Sans` ใน `eduflow-next/app/**`, `eduflow-next/components/**`, `eduflow-next/context/**`
- ตัวเลขใน KPI/ตาราง/heatmap: `font-variant-numeric: tabular-nums;`
- เหตุผล: R1 ผู้ใช้ไทยสูงวัยชอบฟอนต์ไทยแบบมีหัว (conservative) · Sarabun อยู่ใน repo แล้ว และ DOCX ใช้ TH Sarabun New → เว็บกับเอกสารรู้สึกเป็นชุดเดียว · ฟอนต์เดียว = โหลดเร็ว ไม่มีปัญหาไทย/อังกฤษคนละน้ำหนัก (m2, m4) · "บุคลิก" ได้จากสี แบรนด์มาร์ก SVG และขนาด/น้ำหนัก ไม่ต้องใช้ฟอนต์ที่สอง

### T2.2 Type scale (root = 16px; ทุกค่าเป็น rem)
| token | px | rem | line-height | weight | ใช้กับ |
|---|---|---|---|---|---|
| `--fs-xs` | 13 | 0.8125 | 1.4 | 600 | **เฉพาะ** pill/badge, ตัวเลขนับบน badge, ป้ายในช่อง heatmap, ป้ายแกนกราฟ, `kbd` |
| `--fs-sm` | 14 | 0.875 | 1.6 | 400 / 600 | ข้อความช่วยใต้ช่อง, meta (วันที่/ผู้แก้), breadcrumb, หัวกลุ่มเมนู, caption ตาราง |
| `--fs-base` | 16 | 1 | 1.7 | 400 (ปุ่ม 600) | เนื้อหา, ช่องกรอก, ปุ่ม, เซลล์ตาราง, เมนู, toast |
| `--fs-md` | 18 | 1.125 | 1.6 | 600 (narrative 400) | h3/หัวการ์ด, lead paragraph, **textarea เขียน SAR (400, lh 1.8)** |
| `--fs-lg` | 22 | 1.375 | 1.45 | 700 | h2 หัว section ในหน้า |
| `--fs-xl` | 28 (≤768: 24) | 1.75 (1.5) | 1.35 | 700 | h1 ของหน้า (หนึ่งเดียวต่อหน้า) |
| `--fs-2xl` | 36 (≤768: 28) | 2.25 (1.75) | 1.15 ถ้าเป็นตัวเลขล้วน / 1.35 ถ้ามีไทย | 700 | ตัวเลข KPI, h2 หน้า landing |
| `--fs-3xl` | 48 (≤768: 34) | 3 (2.125) | 1.35 | 700 | h1 หน้า landing เท่านั้น |

กฎ:
- ไม่มีข้อความใดที่ computed font-size < 13px · ข้อความ 13px อนุญาตเฉพาะ class ในรายการ T2.3 · ย่อหน้า/เซลล์ตาราง/label/input/ปุ่ม/เมนู ≥16px
- `letter-spacing` ≤ 0.01em ทุกที่ · ห้าม `text-transform: uppercase` · ห้ามตัวเอียงในข้อความไทย · ย่อหน้ายาวชิดซ้าย ห้าม `text-align: justify`
- ความกว้างย่อหน้าอ่าน: `--measure: 46rem` (ใช้กับ `.aq-prose`, คำอธิบายข้อกำหนด, ร่าง AI)
- ห้ามกำหนด `height` คงที่ให้กล่องที่มีข้อความ (ใช้ `min-height`) — รองรับ WCAG 1.4.12 และการขยาย 125%
- **กันวรรณยุกต์/สระไทยถูกตัด (U1b F5 — ink ของ "ปั้น/ผู้ใหญ่/น้ำ" เกินกล่องบรรทัด 4–9px):** element ที่ใช้ `overflow:hidden`, `text-overflow:ellipsis` หรือ `line-clamp` ต้องมี `line-height ≥ 1.6` และ `padding-block ≥ 0.15em` · **ห้ามใช้ overflow/ellipsis/clamp กับ h1–h3 และ pill/badge** · ข้อความที่ต้องสั้นลง (เช่นชื่อข้อใน h1 ของ P9) ให้ตัดใน JS (`truncateTh(s, n)` ใน `lib/ui/aunqa.ts`: ตัดที่ n ตัวอักษร แล้วถอยไปตำแหน่งที่ไม่ใช่สระบน/ล่าง/วรรณยุกต์ ช่วง U+0E31, U+0E34–U+0E3A, U+0E47–U+0E4E เพื่อไม่ตัดกลางพยางค์ แล้วต่อ "…") · ที่อนุญาต ellipsis ด้วย CSS: `nav-user` ชื่อใน top bar, option ใน RequirementPicker, ข้อความใน select (ทั้งหมด fs-base lh 1.7 อยู่แล้ว + padding-block 0.15em)
- base layer: `html { font-synthesis: none; }` และ `em, i { font-style: normal; font-weight: 600; }` (U1b F13 — กันเบราว์เซอร์สังเคราะห์ตัวหนา/เอียงไทย)
- **บันทึกการเบี่ยงจาก ui-ux.md §9 ข้อ 1 โดยตั้งใจ (U1b F9):** (1) 13px อนุญาตเฉพาะป้ายสั้น ≤3 คำ weight 600 ใน class T2.3 (2) line-height <1.6 อนุญาตเฉพาะหัวข้อ ≥18px (1.35–1.45) และตัวเลข KPI ล้วน (1.15) — ui-inspector วัดใน U1b แล้วว่าไม่ชนกันที่ Sarabun (`ui-lh-test-390.png`, `ui-lh-stress-390.png`)

### T2.3 class ที่อนุญาตให้เป็น 13px
`.aq-pill`, `.aq-badge`, `.aq-count`, `.aq-heat-cell__label`, `.aq-chart-label`, `.aq-kbd` — นอกจากนี้ห้าม (AC-02 ตรวจด้วยสคริปต์)
class ที่ใช้ `--fs-sm` (14px) ได้: `.aq-help`, `.aq-meta`, `.aq-crumbs`, `.aq-btn-reason`, `.aq-field-error`, `.aq-saved`, `.aq-nav-group` (หัวกลุ่มเมนู), `.aq-kpi__label`, `.aq-step__meta`, `.aq-legend`, `.aq-progress__label`, `.aq-term__body`, `th`, `caption`, `figcaption` — ข้อความอื่นทั้งหมด ≥16px

### T2.4 การปรับขนาดตัวอักษรโดยผู้ใช้
`html { font-size: var(--user-scale, 100%); }` · ค่า 3 ระดับ: `100%` (ก), `112.5%` (ก+), `125%` (ก++) · เก็บที่ localStorage `aunqa_ui_prefs` = `{ fontScale: 1 | 1.125 | 1.25, effects: boolean }` · ตั้งค่า `document.documentElement.style.setProperty('--user-scale', …)` ใน `lib/ui/prefs.ts` ตอน mount (ก่อน paint ของ AppShell ไม่จำเป็น — ยอมกระพริบครั้งเดียว) · layout ต้องไม่ล้นแนวนอนที่ 125% (AC-04)

## T3. Spacing (4px grid)
| token | px | | token | px |
|---|---|---|---|---|
| `--sp-1` | 4 | | `--sp-6` | 24 |
| `--sp-2` | 8 | | `--sp-8` | 32 |
| `--sp-3` | 12 | | `--sp-10` | 40 |
| `--sp-4` | 16 | | `--sp-12` | 48 |
| `--sp-5` | 20 | | `--sp-16` | 64 |
- ระยะระหว่างเป้าที่กดได้ติดกัน ≥ `--sp-2` · ปุ่มทำลาย (ลบ/ส่งกลับ) ห่างจากปุ่มหลัก ≥ `--sp-4` และอยู่ฝั่งตรงข้ามหรือคั่นด้วยเส้น
- padding การ์ด: `--sp-6` (≤768: `--sp-4`) · ช่องว่างระหว่างการ์ด: `--sp-4` · ระหว่าง section ในหน้า: `--sp-8`
- ความกว้างเนื้อหา: `--content-max: 1280px`; padding ข้าง `--sp-8` (≤768: `--sp-4`)

## T4. ขนาดควบคุม (target size)
| token | ค่า | ใช้กับ |
|---|---|---|
| `--control-h` | 44px | ปุ่มทุกแบบ, input, select, เมนู sidebar, tab, ปุ่มไอคอน (กว้าง×สูง 44×44) |
| `--control-h-sm` | 40px (<768: 44px) | ปุ่มในแถวตาราง/ปุ่มเล็กในการ์ด **บนเดสก์ท็อปเท่านั้น** |
| checkbox/radio | กล่อง 20×20, label ทั้งแถวกดได้ สูง ≥44px | ฟอร์ม |
ไม่มี `.aq-btn-sm` ที่ 30px อีกต่อไป (M8)

## T5. Radius
| token | ค่า | ใช้กับ |
|---|---|---|
| `--r-sm` | 6px | kbd, ช่อง heatmap ด้านใน, code |
| `--r-md` | 10px | ปุ่ม, input, select, textarea, toast, tab แบบ segmented |
| `--r-lg` | 14px | การ์ด, KPI tile, ช่อง heatmap, dropdown/popover |
| `--r-xl` | 20px | dialog, hero card, แผง login |
| `--r-pill` | 999px | **เฉพาะ** pill/badge/chip/count และ progress bar |
ตัดสิน: ปุ่มเป็นมุมโค้ง 10px (ไม่ใช่ pill) เพื่อแยก "สิ่งที่กดได้" ออกจาก "ป้ายสถานะ" ที่เป็น pill — แก้ปัญหา m5 (ทุกอย่างเป็น pill เหมือนกันหมด)

## T6. Shadow / elevation
| token | ค่า | ใช้กับ |
|---|---|---|
| `--e-0` | none | พื้นเรียบ, ตาราง |
| `--e-1` | `0 1px 2px rgba(43,38,35,.06), 0 2px 8px rgba(43,38,35,.05)` | การ์ด, KPI, sidebar, top bar (เมื่อ scroll) |
| `--e-2` | `0 2px 4px rgba(43,38,35,.06), 0 8px 20px rgba(43,38,35,.10)` | hover การ์ดที่คลิกได้, dropdown, popover, sticky action bar |
| `--e-3` | `0 16px 40px rgba(43,38,35,.18)` | dialog, toast, drawer มือถือ |
ลบพื้นผิว noise (`body::before` ลาย SVG เดิม) — ทำให้ข้อความดูหม่นบนจอคุณภาพต่ำ และไม่มีหน้าที่

## T7. z-index
| token | ค่า | ใช้กับ |
|---|---|---|
| `--z-base` | 0 | เนื้อหา |
| `--z-sticky` | 100 | top bar, หัวตาราง sticky |
| `--z-sidebar` | 110 | sidebar (เดสก์ท็อป), sticky action bar ของ section editor |
| `--z-dropdown` | 200 | dropdown, combobox listbox, user menu, popover ศัพท์ |
| `--z-drawer` | 400 | drawer เมนูมือถือ + overlay (overlay = 399) |
| `--z-toast` | 500 | toast stack |
| `--z-dialog` | 1000 | dialog backdrop + panel |
| `--z-loader` | 1100 | AppLoader เต็มจอ (login/logout/init) |

## T8. Motion
| token | ค่า | ใช้กับ |
|---|---|---|
| `--dur-instant` | 100ms | กดปุ่ม (pressed) |
| `--dur-fast` | 150ms | hover, เปลี่ยนสีเมนู, chevron หมุน, toast ออก |
| `--dur-base` | 220ms | เปิด dropdown/popover, toast เข้า, dialog เข้า, แผงพับ (fade) |
| `--dur-slow` | 400ms | stepper เส้นเติม, เปลี่ยนแท็บแผงข้าง (fade) |
| `--dur-progress` | 600ms | progress ring/bar เติมค่า (ครั้งแรกที่แสดง/เมื่อค่าเปลี่ยน) |
| `--dur-celebrate` | 800ms | ฉลอง (L7) และเส้นเช็กถูกวาด (L6 ใช้ 500ms) |
| `--dur-highlight` | 1600ms | ไฮไลต์แถวใหม่จางออก |
| `--ease-enter` | `cubic-bezier(0, .4, 0, 1)` | ของที่เข้ามา |
| `--ease-move` | `cubic-bezier(.4, 0, 0, 1)` | เคลื่อน/เติม progress |
| `--ease-exit` | `cubic-bezier(.6, 0, .8, .6)` | ของที่ออกไป |
| `--ease-hover` | `cubic-bezier(.4, 1, .6, 1)` | hover/pressed |
- เคลื่อนเฉพาะ `transform` / `opacity` / `stroke-dashoffset` / `background-color` / `color` / `box-shadow` — ห้าม animate `width`, `height`, `top`, `left`, `margin`
- ทางออกเร็วกว่าทางเข้าเสมอ · ห้าม cubic-bezier ที่ค่า y > 1 หรือ < 0 (overshoot/bounce)
- reduced motion (บังคับทั้งระบบ วางท้าย globals.css):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important; }
  .aq-skeleton { animation: none !important; background: var(--c-surface-2) !important; }
  .aq-celebrate-spark, .aq-loader-ring__arc { display: none !important; }
}
html[data-effects="off"] .aq-celebrate-spark { display: none !important; }
```
และ `html { scroll-behavior: smooth; }` ต้องอยู่ใน `@media (prefers-reduced-motion: no-preference)` เท่านั้น

## T9. Focus ring
```css
:focus-visible { outline: 3px solid var(--c-primary); outline-offset: 2px; border-radius: inherit; }
.aq-on-dark :focus-visible { outline-color: var(--c-accent); }
```
- ใช้กับทุก element ที่โต้ตอบได้ (button, a, input, select, textarea, summary, [tabindex], [role=tab], [role=option] ที่ active-descendant ใช้ `outline` บน option ที่ active)
- ห้าม `outline: none` ทุกกรณี เว้นแต่มี `:focus-visible` แทนในกฎเดียวกัน · ช่องกรอกเพิ่ม `border-color: var(--c-primary)` ตอน focus
- skip link: `<a href="#main" class="aq-skip">ข้ามไปเนื้อหาหลัก</a>` ตัวแรกของ body ใน AppShell และ landing — มองเห็นเมื่อ focus เท่านั้น

## T10. Breakpoints (mobile-first, ใช้ `min-width`)
| ชื่อ | ค่า | สิ่งที่เปลี่ยน |
|---|---|---|
| base | 0–479 | คอลัมน์เดียว, ตารางเป็นการ์ดซ้อน (`.aq-table--stack`), h1 24px |
| `sm` | ≥480px | ฟอร์ม 2 ช่องต่อแถวได้ |
| `md` | ≥768px | grid 2 คอลัมน์, ตารางปกติ, LangToggle แสดงใน top bar, ชื่อผู้ใช้แสดงข้าง avatar |
| `lg` | ≥1024px | **sidebar ถาวร** (ต่ำกว่านี้ = drawer), section editor 2 คอลัมน์ |
| `xl` | ≥1280px | KPI 5 ช่องแถวเดียว, หน้า login แบบแบ่งครึ่ง |
ความกว้างที่ต้องทดสอบ: **390, 768, 1024, 1440** (AC-03)

**กฎการอ่าน breakpoint ทั้ง spec (U1b F1 — มีผลเหนือทุกไฟล์):** เขียน CSS แบบ mobile-first ด้วย `min-width` ตามตารางข้างบนเท่านั้น · ข้อความใน spec ที่เขียน "≤767", "≤768" หรือ "<768" ทั้งหมดหมายถึง **ต่ำกว่า md** = ความกว้าง 0–767.98px (ถ้าต้องเขียน max-width ให้ใช้ `@media (max-width: 767.98px)`) · "≤479" = 0–479.98 · "≤1023" = 0–1023.98 · "≤1279" = 0–1279.98 · **ที่ 768px พอดีใช้ค่าของ md (เดสก์ท็อปเล็ก) เสมอ** เช่น h1 28px, padding การ์ด 24px, toast มุมขวาล่าง, top bar แสดงชื่อผู้ใช้

## T11. Dark mode — ตัดสิน: **ไม่ทำใน Phase U**
เหตุผล: (1) ผู้ใช้หลักทำงานกลางวันในสำนักงาน/ห้องประชุมที่ฉายโปรเจกเตอร์ — โหมดสว่างอ่านง่ายกว่าบนโปรเจกเตอร์ (2) ต้องตรวจ contrast ใหม่ทั้ง 36 คู่ + สีสถานะ + heatmap + กราฟ เท่ากับทำงานสองเท่า ขณะที่เจ้าของไม่ได้ขอ (3) token ทุกตัวอยู่ใน `:root` ที่เดียว ถ้าจะทำภายหลังให้เพิ่ม `@media (prefers-color-scheme: dark)` ได้โดยไม่แตะคอมโพเนนต์ (บันทึกเป็น backlog) · ใส่ `<meta name="color-scheme" content="light">` ใน layout เพื่อไม่ให้เบราว์เซอร์กลับสีฟอร์มเอง

## T12. แบรนด์
- **BrandMark** (inline SVG 32×32, `components/ui/BrandMark.tsx`): สี่เหลี่ยมมุมโค้ง rx=8 พื้น primary · ข้างในเป็นกระดาษสีขาว (path สี่เหลี่ยมพับมุมขวาบน) มีเส้นข้อความ 3 เส้นสี primary-tint · วงกลม accent r=6 มุมขวาล่างทับกระดาษ มีเครื่องหมายถูกสี on-accent ในวงกลม · `aria-hidden` (ชื่ออยู่ใน wordmark)
- **Wordmark**: "AUN-QA" weight 700 สี ink + ช่องว่าง + "Copilot" weight 600 สี primary · ขนาด 20px ใน sidebar/top bar, 22px ใน login, 24px บน landing nav
- ห้ามใช้มาสคอตการ์ตูน/emoji ใดในโครงหน้า (loader, nav, dialog, toast, ปุ่ม) — ใช้ Icon.tsx เท่านั้น (emoji อนุญาตเฉพาะในข้อความที่ผู้ใช้พิมพ์เอง)
