# TASK-0001 — UI Inspection U3 (หลัง build Phase U, อ่านอย่างเดียว)

Verdict: **ISSUES** — blocker 0 / major 1 (ใหม่) / minor 9 (ใหม่) + bug ที่รู้แล้ว 6 ตัว (ยืนยันว่ายังอยู่)
ภาพรวม: **ผ่านเป้าหมาย Phase U** ทุกข้อของ U0 (B1–B2, M1–M8, m1–m7) แก้แล้วจริง เหลือ major ใหม่ 1 ข้อที่แก้ได้ใน 1–2 บรรทัด CSS → แนะนำ U3 fix รอบเดียว (รวมกับ BUG-0001-U2Q-1..4, F5-1, F5-3) แล้วตรวจเฉพาะจุดซ้ำ ไม่ต้องรัน U3 ใหม่ทั้งชุด

วิธี: production build (commit 7b04487 — `.next` เดิมถูกทิ้งไว้ครึ่งทางหลัง session limit จึง `npm run build` ใหม่) + `next start -p 3951` (ปิดแล้ว) · Playwright Chromium · chair1 (เหมือน U0) · 1440×900 / 390×844 (+768×1024 สำหรับ shell, dashboard, section editor, evidence, login)
ภาพ: `.agents/screenshots/u3/` 100 ภาพ — ชื่อเดียวกับ U0 (`NN-หน้า-d|m.png`, `-t` = 768) + ภาพใหม่: `00-init-loader`, `04b-drawer`, `09c-section-sticky`, `10b-evidence-form`, `12b/12c-metrics-m`, `20-404`, `ac04-*`, `ac07-gray-*`, `ring-*`, `en-*`
สคริปต์ (ใช้ซ้ำได้): `.agents/playtest/u3/shoot.mjs` (ถ่าย + สถิติ → `u3-stats.json`), `ac.mjs` (AC-04ข/ค, AC-07, axe, contrast สุ่ม, line-height, วงแหวน → `u3-ac.json`), `verify.mjs` (ยืนยัน U3-1), `en.mjs` (โหมด EN / C-10)

## สรุปฟอนต์ที่ใช้จริง (รวม 59 หน้า×ขนาด)
ฟอนต์ที่โหลด: **Sarabun 400 / 600 / 700** ทุกหน้า · `body` = `Sarabun, "Leelawadee UI", Tahoma, "Noto Sans Thai", system-ui` · ไม่พบ DM Sans / Cormorant / fallback ระบบเลย (U0: DM Sans → ฟอนต์ระบบ, Sarabun โหลดแค่ 500)

| font-family | size | weight | line-height | จำนวน element |
|---|---|---|---|---|
| Sarabun | 16px | 400 | 1.70 | 3081 |
| Sarabun | 16px | 600 | 1.70 | 972 |
| Sarabun | 16px | 700 | 1.70 | 609 |
| Sarabun | 16px | 600 | 1.40 (ปุ่ม `.aq-btn`) | 581 |
| Sarabun | 14px | 600 / 400 | 1.60 | 545 / 390 |
| Sarabun | 13px | 600 | 1.70 / 1.40 (`.aq-chart-label`, `.aq-badge`, `.aq-heat-cell__label`) | 536 / 495 |
| Sarabun | 18px | 600 | 1.60 | 236 |
| Sarabun | 20–22px | 600/700 | 1.35–1.45 (h2/h3) | ~160 |
| Sarabun | 24 / 28px | 700 | 1.35 (h1 มือถือ / เดสก์ท็อป) | 28 / 35 |
| Sarabun | 36px | 700 | 1.15 (ตัวเลข KPI/ring) | 13 |
| **< 13px** | — | — | — | **0 ทุกหน้า** (U0: 17–598 ต่อหน้า) |

## AC ที่ตรวจด้วยตา
| AC | ผล | หลักฐาน |
|---|---|---|
| AC-01 (สุ่ม contrast) | **ผ่าน** — สุ่ม 120 element จาก 10 หน้า ต่ำสุด ≥4.5 ทุกตัว | `u3-ac.json` `contrast-*` |
| AC-03 (ซ้ำ) | **ผ่าน** — ไม่มี h-scroll ทั้ง 59 หน้า×ขนาด (U0: landing 1540, login-m 447, section 1483/500) | `u3-stats.json` |
| AC-04 (ข) text-spacing 1440/390 | **ผ่าน** — ไม่มี h-scroll, ไม่มีข้อความถูกตัด, heat cell ไม่ล้น (ที่ตรวจเจอ 2 ตัวเป็น `aq-user__text`/`thead` ที่ซ่อนแบบ sr-only ตั้งใจ) | `ac04-spacing-*` |
| AC-04 (ค) 360×800 | **ผ่าน** — เหมือนข้างบน | `ac04-zoom200-*` |
| AC-07 สถานะไม่พึ่งสี | **ผ่าน** — grayscale: heat cell มีไอคอน+คำ (วิกฤต/เตือน/อนุมัติ) + ไอคอนมุม, KPI มีไอคอน+label, pill มีไอคอน, matrix มีตัวอักษร I/R/M · ข้อสังเกต legend หลักสูตร (U3-3) | `ac07-gray-{dash,heat,evidence,review}.png` |
| AC-13 Lighthouse | **Lighthouse วัดไม่ได้** (ไม่มี CLI ในเครื่อง ไม่ติดตั้งเพิ่ม) → ใช้ **axe-core 4.12.1** (engine เดียวกับ Lighthouse a11y, มีใน node_modules อยู่แล้ว) tag wcag2a/2aa/21a/21aa/22aa: **0 violation** ที่ `/login`, `/app`, dashboard, section editor + AC-02/05/06 ของ qa ผ่าน | `u3-ac.json` `axe-*` |
| AC-17 (ส่วนที่ดูด้วยตา) | P8 ผ่าน (ไอคอนสถานะอนุมัติมุมขวาบน + คำอธิบาย "ไอคอนมุมขวาบน = สถานะการอนุมัติของข้อ") · C-10 ผ่าน (โหมด EN: placeholder/aria-label/title ภาษาไทย = 0 ที่ dashboard, ฟอร์มหลักฐาน, assign) · ที่เหลือเป็นงาน playtester | `en-*-d.png` |
| AC-18 ธีมเดียวกัน | **ผ่าน** — landing, login, AppLoader ×3 (init/login/logout), app, 404 ใช้ BrandMark + indigo/sand + Sarabun ชุดเดียว ไม่มีมาสคอต/emoji | `01`, `02`, `00/03/19`, `04`, `20` |
| AC-20 badge | **ผ่าน** — "หน้าหลัก 14" = "(รวม 14 งาน)", "รอตรวจ 5" = 5 แถวใน `/app/review` | `04-app-d`, `15-review-d` |
| AC-21 KPI | **ผ่าน** — ป้าย "ความพร้อมด้านหลักฐาน 28%" + `kpi-summary` warn "อนุมัติแล้ว 45 จาก 53 ข้อ แต่ 36 ข้อยังมีช่องว่างวิกฤต…" · ring สี primary `rgb(59,79,160)` ไม่ใช่ success | `07-cycle-dash-d` |

### ตัดสินขนาดเลขในวงแหวนใหญ่ (ที่ F3 ฝาก): **ใช้ fs-xl**
วัดจริง: วงใน (ขอบในของเส้น) กว้าง 100px · "45/53" ที่ fs-2xl 36px กว้าง **98px** (เหลือข้างละ 1px → ตัวเลขชนเส้นวงทั้ง landing hero และ dashboard ≥768) · ที่ fs-xl 28px กว้าง **76px** (เหลือข้างละ 12px, อ่านชัด) · มือถือ fs-2xl ลดเป็น 28 อยู่แล้วจึงไม่มีปัญหา → ให้ `.aq-ring--lg` ใช้ `--fs-xl` (28/24) ทุกขนาด และแก้ C20 ให้ตรง (ภาพ `ring-5353-2xl.png` vs `ring-5353-xl.png`) — เป็น finding U3-2

## Findings
| # | severity | หน้า/breakpoint | ปัญหา | ค่าที่เจอ vs ค่าที่ควรเป็น | screenshot |
|---|---|---|---|---|---|
| U3-1 | **major** | Section editor ทุกขนาด | แท็บ "ภาษาไทย / English" ไม่ได้สลับกล่อง — **textarea TH และ EN แสดงพร้อมกันเสมอ** (กล่อง EN ว่างสูง ~580px อยู่ใต้กล่องไทย) เพราะ `.aq-textarea { display:block }` (globals.css:249) ชนะ attribute `hidden` (SarWorkspace.tsx:408/415) และไม่มีกฎ `[hidden]{display:none}` ใน base layer · ผู้ใช้ 30–60+ จะพิมพ์ผิดกล่อง และปุ่ม AI/นับคำทำงานกับกล่องตามแท็บ ไม่ใช่กล่องที่เห็น | `hidden=true` แต่ `display:block` ทั้งสองแท็บ (verify.mjs) vs เห็นกล่องเดียวตามแท็บ (P9) | `09b-section-real-d.png`, `-m`, `-t` |
| U3-2 | minor | landing hero, dashboard ≥768 | เลขใน ring ใหญ่ชนเส้นวง | 98px ในวงใน 100px vs ควรมีระยะ ≥8px → fs-xl (ดูหัวข้อข้างบน) | `01-landing-d`, `ring-dash-d`, `ring-5353-*` |
| U3-3 | minor | หลักสูตร แท็บ Heatmap ทุกขนาด | legend I/R/M/ไม่รับผิดชอบ ติดกัน: ตัวอักษร "I" ชิดช่องสีถัดไป อ่านเป็น "□ I□ R■ M□ ไม่รับผิดชอบ" · ช่องสี I กับ R ในขาวดำแยกไม่ออก (ไม่มีตัวอักษรในช่อง ต่างจาก cell จริงที่มี) | `.aq-legend` ไม่ใช่ flex (ไม่มี gap) vs ใช้ `.aq-legend__list` (gap sp-2/sp-4) + ใส่ตัวอักษรในช่องสีเหมือน cell | `cur-heat-d`, `ac07-gray-heat` |
| U3-4 | minor | ตัวชี้วัด import panel ทุกขนาด | หัว summary กับคำอธิบายต่อกันไม่เว้น "นำเข้าจากไฟล์ Excelแนะนำเมื่อมี…" | `.aq-import__title/__sub` ไม่มี CSS (inline) vs `display:block` | `12b-metrics-m-top`, `12-metrics-d` |
| U3-5 | minor | 768 (dashboard, section editor) | stepper แนวนอนที่ 768 ชื่อขั้นตัดเป็น 2–3 บรรทัด ("QA/คณะ/ตรวจ", "คณบดี/อนุมัติ/ล็อก", "ปิด/รอบ") · การ์ด "งานค้างรายคน" ใน grid 2 คอลัมน์ ตารางแคบ ("อ.วิภา/เขียน/รายงาน", "27/ต.ค./2569") | horizontal ตั้งแต่ md vs ใช้แบบย่อ (ขั้น x จาก 6) ถึง <1024 และให้ `aq-grid-2` ซ้อนเป็นคอลัมน์เดียว <1024 | `07-cycle-dash-t` |
| U3-6 | minor | `/app` 390 | แถว "งานอื่น ๆ อีก 1 รายการ": ลิงก์ด้านขวากินพื้นที่ ข้อความ "ตรวจรับแผนปรับปรุง 1 รายการ" ถูกบีบเป็น 4 บรรทัด | flex แถวเดียว vs <480 ให้ลิงก์ขึ้นบรรทัดใหม่ (flex-wrap / column) | `04-app-m` |
| U3-7 | minor | มือถือ 390: ตัวชี้วัด, admin, assign | หน้ายาวกว่า U0 มากเพราะตารางซ้อนเป็นการ์ดทุกแถว: metrics **30,048px** (U0 11,665; ตาราง 94 แถว = 24,000px), admin 8,463 (3,025; audit 40 แถว), assign 18,322 (7,306) · pages P13 ให้ "จัดกลุ่มตามตัวชี้วัด" แต่มือถือไม่มีทางยุบ | vs มือถือ: ยุบรายตัวชี้วัด (`<details>` ปิดเริ่มต้น) หรือแสดง 3 ปีล่าสุด + "ดูทั้งหมด", audit log แบ่งหน้า 10 แถว | `12c-metrics-m-table`, `17-admin-m`, `08-assign-m` |
| U3-8 | minor | ทุกหน้า | ข้อความไทย 16px ที่ line-height 1.4: `.aq-btn` (581 el), `.aq-step__label`, `.aq-lang__on` — ขัด T2.2/F9 (lh <1.6 อนุญาตเฉพาะหัวข้อ ≥18px และตัวเลข KPI) · ยังไม่เห็นการตัด (overflow visible) แต่ปุ่มที่ห่อ 2 บรรทัดบนมือถือ/ขั้น stepper ที่ 768 วรรณยุกต์ชิดบรรทัดบน | 1.4 vs ≥1.5 (ปุ่มบรรทัดเดียวสูง 44 อยู่แล้ว ไม่ทำให้ปุ่มสูงขึ้น) หรือบันทึกข้อยกเว้นใน T2.2 | `07-cycle-dash-t` (stepper) |
| U3-9 | minor | `/app` empty state แจ้งเตือน | ภาพกระดิ่งใน "ไม่มีการแจ้งเตือน" มีจุด accent ที่มุม ดูเหมือนมีแจ้งเตือนค้าง (สัญญาณขัดกับข้อความ) | มีจุด vs empty state ไม่มีจุดนับ (จุดใช้ใน C16 badge เท่านั้น) | `04-app-d`, `04-app-m` |
| U3-10 | minor (ข้อเสนอ) | 768 | ปุ่ม compact / LangToggle สูง 40 ที่ 768 (AC-05 ไม่ครอบ 768 แต่แท็บเล็ตเป็นจอสัมผัส) — gap-filter 40 ที่ 768 คือ BUG-U2Q-3 ตัวเดียวกัน | 40 vs 44 ถ้าให้ compact เริ่มที่ ≥1024 | `07-cycle-dash-t` |

### bug ที่รู้แล้ว — ยืนยันสถานะ (ไม่นับซ้ำ)
| bug | ยังอยู่? | หมายเหตุ |
|---|---|---|
| BUG-0001-U2Q-1 TrendChart ป้ายเล็ก (major) | ยืนยัน | ที่ 390 ป้ายแกน/ค่าอ่านแทบไม่ออก และแกน Y ยังมี "9.9" ไม่มีหน่วย (`12b-metrics-m-top`) |
| BUG-0001-U2Q-2 ผัง prereq 13px | ยืนยัน | `<text>` 13px ไม่มี class 56 ตัวในสถิติ |
| BUG-0001-U2Q-3 gap-filter 40px | ยืนยัน | 1440 และ 768 = 110×40 |
| BUG-0001-U2Q-4 skip link ring บนแผงเข้ม | ไม่ได้ทดสอบซ้ำ | เชื่อผล qa |
| F5-1 ชื่อเกณฑ์ไม่ใช้ nameEn | ยืนยัน | โหมด EN หน้า assign: "Criterion 1: ผลการเรียนรู้ที่คาดหวัง…" (`en-assign-d`) |
| F5-3 เกณฑ์ 5 "Academic Staff" | ไม่ได้ตรวจซ้ำ | — |

## ตารางก่อน/หลัง U0
| ข้อ U0 | U0 (ก่อน) | U3 (หลัง) | ผล |
|---|---|---|---|
| B1 ฟอนต์ไทย | body DM Sans → ฟอนต์ระบบ, Sarabun โหลดแค่ 500 | Sarabun 400/600/700 ทุกหน้า ไม่มี fallback | **ปิด** |
| B2 ตัวเล็ก | element <13px 17–598/หน้า, ตัวหลัก 12.5–13.6px | <13px = 0 ทุกหน้า, ตัวหลัก 16px (เนื้อหา 16/1.7, รอง 14/1.6, ป้าย 13/600) | **ปิด** |
| M1 ลิงก์น้ำเงินดีฟอลต์ | #0000EE | ลิงก์ primary #3B4FA0 ขีดเส้นใต้ ชุดเดียว | **ปิด** |
| M2 landing ล้น | scrollWidth 1540 | 1440 | **ปิด** |
| M3 login มือถือพัง | nav บีบ 3 บรรทัด, 447px | layout แยก, 390px, มีตัวปรับขนาดอักษร | **ปิด** |
| M4 select ล้นใน section editor | 1483 / 500px | 1440 / 390 | **ปิด** |
| M5 section editor หลวม | 3 คอลัมน์, textarea 380px, ปุ่ม 30px | 2 คอลัมน์ + stepper + sticky bar, textarea 18 บรรทัด, ปุ่ม 40–44 | **ปิด** (แต่ดู U3-1) |
| M6 dashboard ยาว | 3,031px, gap 157 แถวซ้ำ, KPI เทาเหมือนกัน | 2,324px, gap จัดกลุ่มตามเกณฑ์ (ยุบ), KPI สี+ไอคอนตามสถานะ | **ปิด** |
| M7 heatmap contrast | ขาวบนสีกลาง 2.9–3.9, ตัว 10.4px | พื้นอ่อน/ตัวเข้ม ≥4.59, 13–16px + ไอคอน | **ปิด** |
| M8 target / เมนูมือถือ | 12+ ตัว <44/หน้า, pill 10 อันเลื่อนข้าง | มือถือ: <44 เหลือแค่ `.aq-term__btn` 32 (ข้อยกเว้น) · drawer จัดกลุ่ม | **ปิด** |
| m1 loader มาสคอต/emoji | การ์ตูน + emoji สีสด | BrandMark + ring + ข้อความ 2 บรรทัด, init/login/logout ชุดเดียว | **ปิด** |
| m2 landing ปุ่มซีด/การ์ดเหลื่อม | — | ปุ่มชัด, การ์ด 4 ใบเท่ากัน, Sarabun ทั้งหน้า | **ปิด** (ring ดู U3-2) |
| m3 login label เล็ก/ demo ยาว | — | label 16/600, demo พับใน details, error มีไอคอน | **ปิด** |
| m4 heading ปนฟอนต์ | Cormorant/DM Sans ปน | h1 28/700, h2 22/700, h3 18/600 สม่ำเสมอทุกหน้า | **ปิด** |
| m5 เมนู 10 pill | ไม่จัดกลุ่ม | sidebar 4 กลุ่ม + ไอคอน + badge | **ปิด** |
| m6 empty/loading จืด | กล่องเส้นประ | empty มีไอคอน/ภาพเส้น, skeleton | **ปิด** (ดู U3-9) |
| m7 focus บางปุ่มไม่มี | logout/lang/demo ไม่มี outline | ring 3px ทุกตัว (ยกเว้น BUG-U2Q-4) | **ปิด** |
| ความยาวหน้ามือถือ | metrics 11,665 / admin 3,025 / assign 7,306 | 30,048 / 8,463 / 18,322 | **แย่ลง** → U3-7 |

## ความรู้สึกโดยรวม "ไม่จืด แต่สบายตา"
ผ่าน: indigo ให้จุดนำสายตาชัด (ปุ่มหลัก/เมนู active/ring) บนพื้น sand ที่ยังอุ่นเหมือนเดิม · amber ใช้น้อยตามสเปก (badge, เส้นใต้หัว hero, แถบบนการ์ดแรก, จุดในโลโก้) · heatmap อ่านง่ายขึ้นมากแต่เป็นแดงเกือบทั้งตาราง (เป็นข้อมูลจริงของรอบเดโม่ ไม่ใช่ปัญหาดีไซน์) · ระยะห่าง/การ์ด/เงาสม่ำเสมอทุกหน้า · ไม่มีจุดหลุดธีม

## ข้อเสนอให้ frontend-dev (เรียงตามความสำคัญ)
1. **U3-1** — เพิ่มใน base layer ของ `globals.css`: `[hidden] { display: none !important; }` (กันทุก component ที่ตั้ง display เอง; ตอนนี้ใช้ `hidden` อีกที่เดียวคือ gap accordion ซึ่งไม่โดน) · แล้วให้ qa เพิ่มเทสต์: ที่ section editor ต้องมี `textarea.aq-textarea--prose` ที่มองเห็นได้ 1 ตัวต่อแท็บ (ย้ายจาก `.agents/playtest/u3/verify.mjs`)
2. **U3-2** — `.aq-ring--lg .aq-ring__mid` (ตัวเลข) ใช้ `var(--fs-xl)` · orchestrator/architect แก้ C20 จาก fs-2xl เป็น fs-xl
3. U3-3 — curriculum HeatTab legend ใช้ `<ul className="aq-legend__list">` และใส่ I/R/M ในช่องสี
4. U3-4 — `.aq-import__title, .aq-import__sub { display: block; }`
5. U3-6, U3-9 — แถว "งานอื่น ๆ" ให้ wrap ที่ <480 · ลบจุด accent ใน empty state ของแจ้งเตือน
6. U3-5, U3-10 — stepper แบบย่อและ `aq-grid-2` ซ้อนเป็นคอลัมน์เดียวต่ำกว่า 1024 · (ถ้าต้องการ) compact 40 เริ่มที่ ≥1024
7. U3-7 — มือถือ: metric-table ยุบรายตัวชี้วัด, audit log แบ่งหน้า (หรือตัดสินว่ายอมรับเพราะมือถือไม่ใช่ช่องทางหลักของงานข้อมูล — orchestrator ตัดสิน)
8. U3-8 — `.aq-btn`, `.aq-step__label`, `.aq-lang__on` line-height 1.5 หรือให้ architect บันทึกข้อยกเว้นใน T2.2
9. รวมกับ BUG-0001-U2Q-1..4, F5-1, F5-3 ใน U3 fix รอบเดียว

ตรวจซ้ำหลัง fix (ไม่ต้องทั้งชุด): `node verify.mjs` (U3-1), ภาพ `ring-*`, `cur-heat-d`, `12-metrics-*`, `04-app-m`, `07-cycle-dash-t` — `BASE=http://localhost:<port> node shoot.mjs` ถ่ายใหม่ได้ทั้งชุด
