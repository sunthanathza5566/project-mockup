# TASK-0001 U1b — ui-inspector ตรวจ ADR-UI-001 ก่อน build

Verdict: **PASS-WITH-CHANGES** (ไม่มี blocker · major 5 · minor 8) — ทิศทาง palette/ฟอนต์/สเกลใช้ได้จริงและวัดผ่าน แต่ต้องแก้ spec 5 จุดก่อนส่ง frontend-dev เพราะถ้าไม่แก้ dev ต้องเดา หรือจะตก AC ตอน U3

- วันที่: 2026-10-22 · ผู้ตรวจ: ui-inspector · อ่านอย่างเดียวต่อโค้ด/ADR
- Input: `ADR-UI-001-redesign.md`, `ui/tokens.md`, `ui/components.md`, `ui/pages.md`, `research/standards/ui-ux.md` §9, `reviews/TASK-0001-ui-audit.md`
- เครื่องมือ: node + Playwright (chromium จาก `eduflow-next/node_modules`) เปิดไฟล์ HTML ตรง ๆ ไม่ได้เปิด server ของแอป
- สคริปต์ (`.agents/playtest/u1b/`): `contrast.mjs` (36 คู่ + คู่เสริม), `style-tile.html`, `shoot.mjs` (render + เก็บสถิติ), `crop.mjs` (ภาพซูม line-height), `heat125.mjs` (ช่อง heatmap ที่ 125%) — ทั้งหมดรันซ้ำได้; เสนอให้ qa-tester ย้าย `contrast.mjs` เข้า `tests/` ใน U2-Q (AC-01)

## 1. Contrast (AC-01) — วัดซ้ำด้วยสูตร WCAG relative luminance
**ทั้ง 36 คู่ใน T1.3 ผ่านเกณฑ์** (ข้อความ ≥4.5, UI ≥3.0) · ค่าที่วัดต่างจากตาราง ≤0.05 ทุกคู่

| # | คู่ | ตาราง | วัดได้ | ผล |
|---|---|---|---|---|
| 1 | ink / bg | 14.12 | 14.12 | PASS |
| 2 | ink / surface | ~14.9 | **14.95** | PASS (ต่าง 0.05 พอดีขอบ tolerance → แก้ตารางเป็น 14.95) |
| 3–4 | ink / surface-2, accent-tint | 13.06, 12.77 | 13.06, 12.77 | PASS |
| 5–8 | muted / bg, surface, surface-2, primary-tint | 6.88, 7.29, 6.36, 6.12 | 6.88, 7.29, 6.36, 6.13 | PASS |
| 9–10 | #FFF / primary, primary-strong | 7.47, 10.74 | 7.47, 10.74 | PASS |
| 11–15 | primary / bg, surface, surface-2, primary-tint; primary-strong / primary-tint | 7.05, 7.47, 6.52, 6.28, 9.03 | 7.05, 7.47, 6.52, 6.28, 9.04 | PASS |
| 16–19 | on-accent/accent; on-dark, on-dark-muted, accent / primary-strong | 6.71, 10.14, 6.90, 4.96 | 6.71, 10.14, 6.91, 4.96 | PASS (#19 ผ่านแบบเฉียด ใช้กับตัวหนา/ใหญ่เท่านั้นจะปลอดภัยกว่า) |
| 20–22 | success / success-bg, bg; #FFF / success | 4.59, 4.95, 5.24 | 4.59, 4.95, 5.24 | PASS (#20 เฉียด 4.5) |
| 23–24 | warn / warn-bg, surface | 5.81, 6.48 | 5.81, 6.48 | PASS |
| 25–27 | danger / danger-bg, surface; #FFF / danger | 5.55, 6.54, 6.54 | 5.55, 6.54, 6.54 | PASS |
| 28–30 | info / info-bg, surface, bg | 5.03, 5.83, 5.50 | 5.03, 5.83, 5.50 | PASS |
| 31–34 | border-control / bg, surface, surface-2, primary-tint | 3.59, 3.80, 3.32, 3.20 | 3.59, 3.80, 3.32, 3.20 | PASS (UI 3:1) |
| 35–36 | primary focus / bg; #FFF / primary | 7.05, 7.47 | 7.05, 7.47 | PASS |

**คู่ที่ spec ใช้จริงแต่ไม่อยู่ในตาราง** (T1.3 บอกว่า "ไม่อยู่ในตาราง = ห้ามใช้" → dev จะติด) — วัดแล้ว ควรเพิ่มเข้าตาราง:
| คู่ | วัดได้ | ใช้ที่ | ผล |
|---|---|---|---|
| ink / success-bg, warn-bg, danger-bg, info-bg | 13.08 / 13.39 / 12.69 / 12.91 | เนื้อความใน InlineMessage (C9) | PASS → เพิ่ม |
| muted / success-bg, warn-bg, danger-bg, info-bg | 6.37 / 6.52 / 6.18 / 6.29 | ข้อความรองใน InlineMessage | PASS → เพิ่ม |
| primary / accent-tint | 6.38 | ลิงก์รหัสในแถวที่ไฮไลต์ L5 | PASS → เพิ่ม |
| ring: primary / surface-2 (track) · success / surface-2 | 6.52 · 4.58 | ProgressRing (C20) ตามเกณฑ์ 1.4.11 | PASS → เพิ่ม |
| **accent / surface-2 (track)** | **1.89** | T1.1 ให้ accent เป็น "progress ring ช่วงสุดท้าย" | **FAIL 3:1** (ดู F4) |
| **primary (ปุ่ม) / primary-strong (แถบเข้ม)** | **1.44** | ปุ่ม primary ปกติบน CTA band/แผง login | ขอบปุ่มหายไปในพื้น (ดู F3) |
| **border-control / primary-strong** | **2.83** | ปุ่ม secondary ปกติบนแถบเข้ม | **FAIL 3:1** (ดู F3) |
| accent / bg, surface | 2.04 / 2.17 | (ห้ามใช้เป็นตัวอักษร — ตรงกับข้อห้ามใน T1.3) | — |

## 2. Style tile
- ไฟล์: `.agents/playtest/u1b/style-tile.html` (ไฟล์เดียว, CSS ล้วนตาม tokens, โหลด Sarabun 400/600/700 จาก Google Fonts)
- ภาพ: `.agents/screenshots/u1b/style-tile-1440.png`, `.agents/screenshots/u1b/style-tile-390.png` (เต็มหน้า) + ภาพซูม `ui-lh-test-390.png`, `ui-lh-stress-390.png`, `ui-buttons-390.png`, `ui-heat-scale1.png`, `ui-heat-scale1.25.png`
- มีครบ: palette, type scale ไทยจริง (รวม "ปั้นจั่น ผู้ใหญ่ ที่นี่ น้ำใจ ฤๅษี ญี่ปุ่น ฎีกา"), ปุ่ม 6 แบบ × default/hover/active/focus/disabled/loading + เหตุผลข้างปุ่ม, badge สถานะ 9 แบบ + count, input default/read-only/disabled/focus/error/success + error summary, KPI 5 tone, heatmap 6 ระดับ (รวม P8 ไอคอนมุม), progress ring 3 แบบ + bar, toast success/error + เส้นเวลา, InlineMessage 3 tone, tabs, ตาราง + แถวไฮไลต์, empty state, skeleton, AppLoader, แถบเข้ม + focus accent

### สรุปฟอนต์ที่ใช้จริงใน style tile (computed)
| font-family | size | weight | line-height | จำนวน element |
|---|---|---|---|---|
| Sarabun, "Leelawadee UI", Tahoma, "Noto Sans Thai", system-ui, sans-serif | 16px | 400/600 | 27.2px (1.7) | ส่วนใหญ่ (เนื้อหา ปุ่ม input) |
| ″ | 14px | 400/600 | 22.4px (1.6) | 67 (meta/help/th/KPI label) |
| ″ | 13px | 600 | 18.2px (1.4) | 21 (pill/count/heat label เท่านั้น) |
| ″ | 18/22/28/36/48px | 600/700 | 1.6/1.45/1.35/1.35(1.15 ตัวเลข)/1.35 | หัวข้อ |
- `document.fonts.check('16px Sarabun') = true` ทั้ง 1440 และ 390 · face ที่โหลด: Sarabun 400, 600, 700 (subset ไทย+ละติน) · ไม่มี fallback ที่ไม่ได้ตั้งใจ
- ไม่มี horizontal scroll (scrollWidth = 1440 / 390) · ปุ่ม/ช่องกรอกทุกตัวสูง ≥44px

### ผลวัด line-height ไทย (Sarabun, canvas measureText เทียบกับกล่องบรรทัด)
| ขนาด/lh | ink เหนือ baseline vs กล่องบรรทัด | ink ใต้ baseline vs กล่อง | ดูด้วยตา |
|---|---|---|---|
| 28 / 1.35 | 35.1 vs 30.9 (เกิน 4.2px) | 10.0 vs 6.9 | 2 บรรทัดไม่ชนกัน วรรณยุกต์ซ้อนเกือบแตะเส้นกรอบ — ใช้ได้ |
| 36 / 1.35 | 44.9 vs 39.3 (เกิน 5.6px) | 13.0 vs 9.3 | ไม่ชน — ใช้ได้ |
| 36 / 1.15 | 44.9 vs 35.7 (เกิน 9.2px) | 13.0 vs 5.7 | "ห้" บรรทัด 2 เกือบชนสระล่างบรรทัด 1 → **ใช้กับตัวเลขล้วนเท่านั้น ตามที่ T2.2 เขียนไว้ ถูกต้อง** |
| 22 / 1.45 | 27.3 vs 24.9 | 8.0 vs 6.9 | ใช้ได้ |
| 13 / 1.4 | 16.6 vs 14.6 | 5.0 vs 3.6 | ใช้ได้เพราะ pill สูง 28 |
สรุป: 1.35 ของหัวข้อใช้ได้กับ Sarabun **ตราบใดที่ element ไม่มี `overflow:hidden` / `text-overflow:ellipsis` / `line-clamp`** เพราะ ink ของวรรณยุกต์ซ้อนเกินกล่องบรรทัด 4–9px และจะถูกตัด (ดู F5)

## 3. เทียบ U0 (B1, B2, M1–M8) — spec แก้ครบไหม
| ข้อ U0 | แก้ใน spec | ครบ? |
|---|---|---|
| B1 ฟอนต์ไทยไม่โหลด | T2.1 Sarabun ตระกูลเดียว + ลบ Cormorant/DM Sans + AC-09 | ครบ (style tile ยืนยันว่าโหลดได้ 3 weight) |
| B2 ตัวเล็ก 10–13.6px | T2.2/T2.3 + AC-02 | ครบ (ข้อยกเว้น 13px ดู F9) |
| M1 ลิงก์สีดีฟอลต์ | C2 `a { color: primary }` ใน base | ครบ |
| M2 landing ล้น 1540px | P1 ลบ `.hero-bg-circle`, `overflow-x: clip` | ครบ |
| M3 login nav พังที่ 390 | P2 `AuthLayout` แยก | ครบ |
| M4 select ล้นใน editor | C3 `width:100%; min-width:0` + P9 `link-search` | ครบ |
| M5 editor 3 คอลัมน์หลวม | P9 2 คอลัมน์ + แผงข้าง 400px | ครบ |
| M6 dashboard ยาว 3,000px | P7 gap จัดกลุ่มตามเกณฑ์ + พับ | ครบ |
| M7 heatmap ตัวขาวบนสีกลาง | C13 fg บน bg ของ tone + ไอคอน + ข้อห้ามใน T1.3 | ครบ (แต่ขนาดช่องคงที่ — F2) |
| M8 ปุ่ม 30px | T4 44px, ลบ `.aq-btn-sm` + AC-05 | เกือบครบ (Term 32px / ปุ่ม × ของ chip ไม่ได้กำหนด — F6) |

เทียบ checklist `ui-ux.md` §9: ข้อ 1 (ขนาด/lh) มีข้อยกเว้นที่ต้องบันทึก (F9) · ข้อ 2–8, 10 ครอบคลุม · **ข้อ 9 (ซูม 200% + text-spacing 1.4.12) ไม่มี AC วัด** (F8)

## Findings
| # | severity | section ใน ADR | ปัญหา | ค่าที่เจอ vs ค่าที่ควรเป็น | screenshot |
|---|---|---|---|---|---|
| F1 | **major** | tokens T2.2, T3, T10; components C6, C7, C10, C14, C21; pages | breakpoint ขัดกันเอง: T10 เป็น mobile-first `min-width` (md ≥768) แต่ข้ออื่นเขียน "≤768" (fs-xl, fs-2xl, fs-3xl, padding การ์ด/เนื้อหา, KPI) ปนกับ "≤767" (top bar, toast, stepper) — **768 เป็นความกว้างที่ AC-03 ต้องทดสอบ** dev ต้องเดาว่าที่ 768 ใช้ค่าไหน | "≤768" และ "≤767" ปนกัน vs ควรเป็นกฎเดียว: "ต่ำกว่า md" = `@media (max-width: 767.98px)` ทุกจุด (หรือเขียนเป็น base แล้ว override ที่ `min-width:768px`) | — |
| F2 | **major** | components C13 (+ T2.2 กฎ "ห้าม height คงที่", AC-04) | ช่อง heatmap กำหนดขนาดคงที่ 76×68 (≤479: 68×64) มีเนื้อหา 3 บรรทัด ที่ fontScale 1.25 เนื้อหาเกินกล่อง → ถูกตัด/ล้น; และบรรทัด 3 เขียนกำกวม "แถวไอคอน: ไอคอนระดับ + ไอคอนสถานะข้อ ที่มุมขวาบน" (อยู่แถวล่างหรือมุมขวาบน?) | ต้องการสูง 69 / 67px vs กล่อง 66 / 62px (ข้างในหลังหักขอบ) ที่ 125% · ควรเป็น `min-width:76px; min-height:68px` (≤479: 68/64), เลขข้อ lh 1.3, และระบุให้ชัดว่า "ไอคอนระดับอยู่หน้าป้ายในบรรทัด 2; ไอคอนสถานะข้ออยู่มุมขวาบน (absolute)" — ตัดบรรทัด 3 ทิ้ง | ui-heat-scale1.25.png |
| F3 | **major** | components C1, tokens T1.3/T9, pages P1 (CTA band, footer), P2 (แผงแบรนด์ + LangToggle มุมล่าง) | ไม่มี variant ปุ่ม/LangToggle บนพื้นเข้ม (`aq-on-dark`) มีแค่ focus ring · ใช้ปุ่มปกติแล้ว: primary บน primary-strong ขอบแทบมองไม่เห็น, secondary ขอบไม่ถึง 3:1 | primary/primary-strong 1.44, border-control/primary-strong 2.83 vs ควรเพิ่ม `.aq-on-dark .aq-btn-primary` = พื้น surface ตัว primary-strong (10.74) และ `.aq-on-dark .aq-btn` = โปร่ง ตัว on-dark ขอบ on-dark-muted 1px (6.91) + LangToggle ใช้คู่เดียวกัน · เพิ่มคู่ใน T1.3 | style-tile-1440.png (§8 แถบเข้ม) |
| F4 | **major** | tokens T1.1 (accent "progress ring ช่วงสุดท้าย") vs components C20 (ring ≥100% = success) + ADR L7 | สองที่บอกต่างกันว่าสีช่วงท้ายของ ring เป็นอะไร และถ้าใช้ accent แท่งค่าบน track surface-2 ไม่ถึง 3:1 (1.4.11 เพราะ ring สื่อค่า) | accent/surface-2 = 1.89 vs ≥3.0 · ควรลบ "progress ring ช่วงสุดท้าย" ออกจาก T1.1 (accent ใช้แค่ประกาย L7) · C20 คงไว้: ค่า = primary, ครบ = success | style-tile-1440.png (§6) |
| F5 | **major** | tokens T2.2 (กฎ) + components C6 (nav-user ellipsis), C3 (select ellipsis), C4 (option 1 บรรทัด ellipsis), P9 (h1 "ตัด 60") | ไม่มีกฎกันวรรณยุกต์ไทยถูกตัด: ink ของ "ปั้น/ผู้ใหญ่/น้ำ" เกินกล่องบรรทัด 4–9px ทุกขนาดหัวข้อ ถ้า element มี `overflow:hidden`/ellipsis/line-clamp จะตัดวรรณยุกต์บนและสระล่าง | ink เกิน 4.2px (28/1.35), 5.6px (36/1.35), 2.0px (13/1.4) vs ควรเพิ่มกฎใน T2.2: "element ที่ใช้ `overflow:hidden`/`text-overflow`/`line-clamp` ต้อง lh ≥1.6 และ `padding-block ≥ 0.15em`; ห้ามใช้กับ h1–h3 และ pill" · P9 ตัดชื่อ 60 ตัวใน JS (ไม่ใช้ CSS clamp) | ui-lh-test-390.png, ui-lh-stress-390.png |
| F6 | minor | components C17 (Term 32×32), C4 (chip ×), ADR AC-05 | AC-05 วัด `button` ทุกตัว ≥44 ที่ 390 แต่ Term เป็น `<button>` 32×32 → script จะแจ้งตก · ปุ่ม × ของ chip ไม่ได้ระบุขนาด | Term 32 vs AC-05 44 · ควรเพิ่มข้อยกเว้น `.aq-term__btn` (inline, ≥24 ตาม 2.5.8) ใน AC-05 และกำหนดปุ่ม × chip = 32×32 ภายใน chip สูง 36 (ยกเว้นเหมือน Term) หรือ 44 | — |
| F7 | minor | ADR 7.4 AC-05 | ข้อความ "≥40px ที่ 1440 (≥44 ยกเว้น `.aq-btn-compact`)" อ่านได้สองแบบ | ควรเขียนใหม่: "ที่ 1440: ทุกตัว ≥44 ยกเว้น `.aq-btn-compact` ≥40 · ที่ 390: ทุกตัว ≥44 (compact ก็ 44)" | — |
| F8 | minor | ADR 7.4 AC-04 | ui-ux §9 ข้อ 9 (ซูมเบราว์เซอร์ 200% + text-spacing WCAG 1.4.12) ไม่มี AC วัด — AC-04 วัดแค่ user-scale 125% | ควรเพิ่มใน AC-04: ฉีด CSS text-spacing (lh 1.5, letter .12em, word .16em, p-spacing 2em) ที่ 1440/390 บน 5 หน้า → ไม่มีข้อความถูกตัด/ทับ · และ viewport 720 + zoom 200% เทียบเท่า 360px CSS | — |
| F9 | minor | tokens T2.2/T2.3 vs ui-ux §9 ข้อ 1 | checklist ของ researcher บอก "ไม่มีข้อความอ่าน <14px, line-height ไทย ≥1.6" แต่ spec อนุญาต 13px (pill/badge/heat label) และหัวข้อ lh 1.35–1.45 — วัดแล้วอ่านได้และไม่ชน แต่เป็นการเบี่ยงจาก Study ที่ไม่ได้บันทึก | ควรเพิ่มหมายเหตุใน T2.2: "เบี่ยงจาก ui-ux §9 ข้อ 1 โดยตั้งใจ: 13px เฉพาะป้ายสั้น ≤3 คำ weight 600; lh <1.6 เฉพาะหัวข้อ ≥18px — ui-inspector วัดแล้วใน U1b" | ui-lh-test-390.png |
| F10 | minor | components C1 | ไม่ได้กำหนด hover/active ของ `danger-solid` (state table พูดถึงแค่ primary/secondary/ghost/danger) | ควรเพิ่มสี hover ของ danger-solid เป็น token ใหม่ `--c-danger-strong #8F1D17` (#FFF/ค่านี้ ≈ 8.9) หรือบอกว่า "ไม่มี hover สี ใช้แค่ translateY" | ui-buttons-390.png |
| F11 | minor | components C11 (`Badge tone primary`) | ไม่ได้บอก fg ของ pill tone primary: primary (#14 6.28) หรือ primary-strong (#15 9.04) — heat "ok" ใช้ primary-strong | ควรระบุ primary-tint / primary-strong (คู่ #15) ให้ตรงกับ heat ok และเมนู active | style-tile (§4 "กำลังเขียน") |
| F12 | minor | components C10 + C13 | KPI ค่า 0 = "tone neutral + ข้อความ 'ไม่มี'" ไม่บอกว่า "ไม่มี" แทนตัวเลข (fs-2xl lh 1.15 = ไทยที่ lh 1.15 ห้ามใช้) หรืออยู่บรรทัดล่าง · heat level ok/empty ไม่ได้กำหนดไอคอน (T1.2 มีไอคอนแค่ success/warn/danger/info/neutral) | ควรระบุ: ตัวเลข "0" คงไว้ + "ไม่มี" ในบรรทัดล่าง fs-sm · heat ok = ไอคอน `check` , empty = `circle-dashed` | style-tile (§6) |
| F13 | minor | tokens T1.3 #2, T2.1 | (1) ค่า #2 เขียน "~14.9" วัดได้ 14.95 = ต่างพอดี tolerance 0.05 ของ AC-01 (2) ไม่ได้กำหนด `font-synthesis` — ถ้าโค้ดเผลอใช้ 500 หรือ `<em>` เบราว์เซอร์จะสังเคราะห์ตัวหนา/เอียงไทย | แก้ #2 เป็น 14.95 · เพิ่ม `html { font-synthesis: none; }` และ `em, i { font-style: normal; font-weight: 600 }` ใน base | — |

## ข้อเสนอให้ architect (แก้ ADR ก่อน U2) และ frontend-dev
1. architect แก้ F1–F5 ใน tokens.md / components.md / ADR 7.4 (ทุกข้อเป็นการเขียน spec ให้ชัด ไม่เปลี่ยนทิศทาง) แล้วส่ง frontend-dev ได้เลย **ไม่ต้องให้ ui-inspector ตรวจรอบใหม่** ถ้าแก้ตามค่าที่เสนอในตาราง (ค่าทุกค่าวัดแล้วข้างบน)
2. F6–F13 แก้พร้อมกันได้ ไม่บล็อก
3. frontend-dev ใช้ `style-tile.html` เป็นตัวอ้างอิงตอนเขียน `globals.css` ได้ (ชื่อ class ใน tile เป็นชื่อย่อ ไม่ใช่ `aq-*` — ห้ามคัดลอก class ตรง ๆ)
4. qa-tester (U2-Q): ย้าย `contrast.mjs` เข้า `tests/` เป็นเทสต์ AC-01 (อ่าน hex จาก `globals.css` แทน hard-code) และใช้วิธีวัดใน `shoot.mjs` (นับ font-size <16 ตาม class, เช็ก scrollWidth) เป็นฐานของ `e2e/ui-u.spec.ts`

## Log
- 2026-10-22 — รัน `contrast.mjs` (36/36 ผ่าน + คู่เสริม 23 คู่) → สร้าง style tile → render 1440/390 (Sarabun โหลดครบ 3 weight, ไม่มี overflow, target ≥44) → วัด ink Thai vs line box → ทดสอบ heat cell ที่ 125% (ล้น) → เขียนรายงาน · ไม่ได้เปิด dev server (ไม่มี process ค้าง) · ลบ `heat.mjs` (ใช้ครั้งเดียว)
