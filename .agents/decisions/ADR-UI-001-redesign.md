# ADR-UI-001 — UI Redesign ของ AUN-QA Copilot (Phase U)

- **สถานะ:** Proposed → รอ U1b (ui-inspector + playtester ตรวจ spec ก่อน build) · ครอบคลุมโดย `OWNER APPROVED: 2026-10-21` ใน TASK-0001 (design/build) — ไม่มี deploy/migration/dependency ใหม่
- **วันที่:** 2026-10-22 · **ผู้เขียน:** architect · **งาน:** TASK-0001 Phase U (U1)
- **ไฟล์ประกอบ (เป็นส่วนหนึ่งของ ADR นี้ มีผลบังคับเท่ากัน):**
  - `ui/tokens.md` — ข้อ 2 design tokens + ตาราง contrast ทุกคู่
  - `ui/components.md` — ข้อ 3 component inventory + ทุก state
  - `ui/pages.md` — ข้อ 5 wireframe หน้าต่อหน้า
- **Study:** `.agents/research/standards/ui-ux.md` ข้อ 1 (ขนาด/ไทย), 2 (target 44px, focus), 3–4 (contrast, palette B, สถานะไม่พึ่งสี), 5 (loading/empty/error/success), 6 (motion + reduced-motion), 7 (gamification + ข้อห้าม), 9 (checklist → AC) · `.agents/reviews/TASK-0001-ui-audit.md` (B1–B2, M1–M8, m1–m7, "สิ่งที่ควรเก็บ") · `.agents/playtest/TASK-0001-roles.md` (P1–P10, pain point ต่อ role, ข้อเสนอ 10 ข้อ) · review "## Phase C" (C-7, C-8, C-10)

---

## บริบท
เจ้าของ (2026-10-22): สีจืด · หน้า loading/login/logout หลุดธีม · อยากมีลูกเล่นมากขึ้นแต่ไม่ยาก · ผู้ใช้หลักอายุ 30–60+ (อาจารย์/บุคลากร) ต้องใช้ง่าย สบายตา ไม่น่าเบื่อ · ออกแบบใหม่ได้ ไม่ผูกกับ cream/brown · "ออกแบบให้เสร็จก่อนค่อยลงมือ ห้ามออกแบบไปทำไป"
ผล U0: ฟอนต์ไทยไม่ถูกโหลดจริง (B1: body = DM Sans ไม่มีกลิฟไทย) · ตัวหนังสือ 10–13.6px เกือบทั้งแอป (B2) · ลิงก์สีน้ำเงินดีฟอลต์ (M1) · overflow แนวนอน landing/login/section editor (M2–M4) · section editor 3 คอลัมน์หลวม (M5) · dashboard ยาว 3,000px gap ซ้ำ ๆ (M6) · heatmap ตัวขาวบนสีกลาง (M7) · ปุ่ม 30px (M8) · loader มาสคอต+emoji (m1) · เมนู 10 pill ไม่จัดกลุ่ม (m5) · ทุก role ไม่รู้ว่า "ต้องทำอะไรต่อ" (playtest major) · bug P1–P10

## ทางเลือกที่พิจารณา
| เรื่อง | ทางเลือก | ตัดสิน | เหตุผลย่อ |
|---|---|---|---|
| Palette | A Lagoon (teal+amber) / **B Indigo & Sand** / C Forest & Coral | **B + info teal จาก A** | B คงความอุ่น (พื้น sand) ที่ audit บอกให้เก็บ แต่มีสีหลัก indigo ชัด = ไม่จืด, contrast สูงสุดของสามชุด (ปุ่ม 7.47), ผู้ใช้เดิมไม่ตกใจ · A เย็นเกินและตัดขาดจากเดิม · C สถานะ success ซ้อนกับสีหลัก (researcher ไม่แนะนำ) · info ของ B ใกล้ indigo → ใช้ teal ของ A ที่ตรวจแล้ว |
| ฟอนต์ | Sarabun / IBM Plex Sans Thai / Noto Sans Thai / Sarabun+ฟอนต์หัวข้อ | **Sarabun ตระกูลเดียว 400/600/700** | R1 (ผู้ใช้ไทยสูงวัยชอบไทยมีหัว) · อยู่ใน repo แล้ว ต่อเนื่องกับ DOCX (TH Sarabun New) · ฟอนต์เดียวแก้ปัญหาไทย/อังกฤษคนละน้ำหนัก (m2, m4) · ไม่ต้องให้ ui-inspector render เทียบฟอนต์ใหม่ (ลดงาน) |
| โครงนำทาง | pill tabs เดิม / top nav dropdown / **sidebar จัดกลุ่ม + drawer มือถือ** | sidebar | ผู้ใช้ 30+ สแกนรายการแนวตั้งที่มีไอคอน+หัวกลุ่มง่ายกว่า pill 10 อันเท่ากัน · มีที่ให้ badge "รอท่าน" · มือถือใช้ drawer แทนแถบเลื่อนข้างที่ซ่อนเมนู (M8) |
| Dark mode | ทำ / **ไม่ทำ** | ไม่ทำ | tokens.md T11 |
| Motion | lib (framer-motion/lottie/confetti) / **CSS + SVG ล้วน** | CSS+SVG | ทุกลูกเล่นในข้อ 4 ทำได้ด้วย CSS · ไม่เพิ่ม bundle · คุม reduced-motion ได้ที่เดียว · ไม่ต้องขออนุมัติ dependency |
| Class/CSS | CSS Modules / Tailwind / **คง globals.css + prefix `aq-`** | คงเดิม | ตามการตัดสินใจ orchestrator ข้อ 1 (CSS ล้วน) · คงชื่อ class ที่หน้าใช้อยู่ ลด churn และความเสี่ยง E2E |
| ฟอร์มผูกข้อ | multi-select เดิม / checkbox 53 ช่อง / **combobox + chip** | combobox | ค้นด้วยเลขข้อหรือคำได้ ไม่ต้อง Ctrl-click (playtest) · ต้องแก้ E2E 2 test (ยอมรับ) |
| อนุมัติเป็นชุด (playtest chair) | ทำ / **ไม่ทำ** | ไม่ทำ | สนับสนุนการอนุมัติโดยไม่อ่าน ขัดหลัก QA และ segregation · แก้ด้วยปุ่มขนาดจริง + "เปิดอ่าน" เป็นปุ่มหลัก + todo บอกจำนวน |

## การตัดสินใจ (สรุป)
ทำ redesign ทั้งระบบบน token ชุดเดียว (`ui/tokens.md`) · component ชุดเดียว (`ui/components.md`) · โครงหน้าใหม่ตาม `ui/pages.md` · ลูกเล่นตามข้อ 4 เท่านั้น · แก้ bug/งานค้างตามข้อ 6 · build ตามข้อ 7 · **ไม่เพิ่ม dependency, ไม่เปลี่ยน stack, ไม่มี migration ข้อมูลถาวร** (มีการย้าย session จาก sessionStorage → localStorage = ผู้ใช้ต้องล็อกอินใหม่ 1 ครั้ง)

---

## 1. ทิศทางการออกแบบ + บุคลิก
**ชื่อทิศทาง: "ห้องทำงานวิชาการที่อบอุ่นและเป็นระเบียบ" (Warm Academic Workspace)**
- **บุคลิก 4 คำ:** อบอุ่น · ชัดเจน · น่าเชื่อถือ · มีกำลังใจ (ไม่ใช่ "น่ารัก" และไม่ใช่ "ราชการแข็ง")
- **สีหลัก indigo `#3B4FA0`** = ความเป็นวิชาการ/เอกสารทางการ (ใกล้สีหมึกและปกเล่ม) ใช้กับสิ่งที่กดได้เท่านั้น → ผู้ใช้เรียนรู้เร็วว่า "สีน้ำเงินคราม = กดได้" · **พื้น sand `#FBF8F3`** คงความอุ่นของธีมเดิม ไม่ขาวจ้า · **accent amber `#E9A23B`** ใช้น้อย (≤10% พื้นที่) เป็น "ประกาย" บนโลโก้ ความคืบหน้า และการฉลอง → แก้ "สีจืด" โดยไม่ฉูดฉาด
- **ความชัด:** ตัวหนังสือ ≥16px, ฟอนต์ไทยจริง (Sarabun), ปุ่ม 44px, สถานะ = สี+ไอคอน+ข้อความ, หนึ่งพื้นที่มีปุ่มหลักหนึ่งปุ่ม
- **ไม่น่าเบื่อ:** ความคืบหน้าที่มองเห็น (ring/bar/stepper) ผูกกับงานจริง · ภาพประกอบเส้น SVG ใน empty state/hero/login · คำทักทายตามช่วงเวลา · micro-interaction ที่ยืนยันการกระทำ (ข้อ 4) · การฉลองเล็ก ๆ เมื่อครบงานจริง
- **ใช้ง่ายสำหรับ 30–60+:** หน้าหลักบอก "สิ่งที่ต้องทำตอนนี้" ตามบทบาท (ไม่ต้องรู้โครงระบบ) · เมนูจัดกลุ่มเป็นภาษาคน · ศัพท์เฉพาะมีปุ่ม (?) อธิบาย · ฟีดแบ็กใกล้จุดกด · ปรับขนาดตัวอักษรได้ 3 ระดับ · ไม่มีอะไรกระพริบ/เด้ง/วนไม่จบบนหน้าที่ต้องอ่าน
- **สิ่งที่คงไว้จากของเดิม** (audit "สิ่งที่ดีอยู่แล้ว"): ความอุ่นของพื้น · การ์ดมุมโค้ง+เงานุ่ม · ภาษาไทยตรงงาน · heatmap มีข้อความในช่อง · focus 3px · โครง AppShell (เมนูตามสิทธิ์, กระดิ่ง, ชื่อ+บทบาท, สลับภาษา) · toolbar wrap · ตาราง sticky ซ้าย · พฤติกรรม/RBAC ทั้งหมด

## 2. Design tokens → `ui/tokens.md`
สรุปสิ่งที่ล็อก: palette + 36 คู่ contrast ที่อนุญาต (T1) · Sarabun 400/600/700 + type scale 13/14/16/18/22/28/36/48 พร้อม line-height ไทย (T2) · ปรับขนาดผู้ใช้ 100/112.5/125% (T2.4) · spacing 4px grid (T3) · control 44px (T4) · radius 6/10/14/20/pill (T5) · shadow 3 ระดับ (T6) · z-index (T7) · motion duration/easing + reduced-motion (T8) · focus ring (T9) · breakpoints 480/768/1024/1280 (T10) · **ไม่ทำ dark mode** (T11) · แบรนด์ (T12)

## 3. Component inventory → `ui/components.md`
C0 Icon · C1 Button (primary/secondary/ghost/danger/danger-solid/icon) · C2 Link · C3 Form controls + error summary · C4 RequirementPicker · C5 Tabs · C6 Navigation จัดกลุ่มตาม role · C7 Card · C8 PageHeader · C9 InlineMessage · C10 KPI tile · C11 Status pill (ตารางแมปสถานะทุกชนิด) · C12 Table (+stack มือถือ) · C13 Heatmap cell · C14 Toast (คิว) · C15 Dialog · C16 Bell + badge · C17 Term/tooltip + glossary · C18 Empty · C19 Skeleton/Loading · C20 Progress ring/bar · C21 Stepper · C22 AppLoader · C23 Sticky action bar · C24 Save indicator — ทุกตัวมีตาราง state default/hover/active/focus/disabled/loading/error ที่เกี่ยวข้อง

## 4. ลูกเล่น (micro-interaction) — ทำเฉพาะรายการนี้ (CSS/SVG ล้วน)
| # | ลูกเล่น | ที่ไหน | ทำงานอย่างไร | duration / easing | หน้าที่ (ทำไม) | reduced-motion |
|---|---|---|---|---|---|---|
| L1 | ปุ่มกดยุบ + การ์ดยกเมื่อ hover | ปุ่มทุกแบบ; การ์ด `--link`, heat cell, todo card | กด: `translateY(1px)` + สีเข้มขึ้น · hover การ์ด: `translateY(-2px)` + เงา e-2 | 100ms / 150ms `--ease-hover` | ยืนยันว่ากดโดนแล้ว (ผู้ใช้สูงวัยกดซ้ำเพราะไม่แน่ใจ) / บอกว่าการ์ดคลิกได้ | เปลี่ยนสีอย่างเดียว ไม่เคลื่อน |
| L1b | hero fade-up | landing hero เท่านั้น | `opacity 0→1` + `translateY(12px→0)` ครั้งเดียว, delay ≤120ms | 400ms `--ease-enter` | ให้หน้าแรกมีชีวิต | แสดงทันที |
| L2 | Progress ring/bar เติมค่า | ring ใน dashboard, หน้าหลัก, assess, hero; bar ในรายการรอบ/assign | `stroke-dashoffset` (ring) / `scaleX` (bar) จาก 0 → ค่าจริง ตอน mount และเมื่อค่าเปลี่ยน | 600ms `--ease-move` | ทำให้ความคืบหน้า "รู้สึกได้" (NN/g R12) และเป็นกำลังใจ | ค่าแสดงทันที ตัวเลขอยู่ตรงกลางเสมอ |
| L3 | Skeleton shimmer | `Async` หลัง 300ms | แถบสว่างเลื่อนผ่านโครงหน้า | 1.4s linear infinite (เฉพาะระหว่างโหลด) | บอกว่ากำลังโหลดโครงอะไร ลดความรู้สึกรอ (R11) | สีนิ่ง surface-2 |
| L4 | Toast เลื่อนเข้า + เส้นเวลา | ทั้งระบบ | เข้า `translateY(16px)→0`+fade · เส้นล่าง `scaleX 1→0` ตามเวลา หยุดเมื่อ hover/focus | เข้า 220ms / ออก 150ms; เส้น 5s/8s linear | บอกว่าข้อความจะหายเมื่อไร (ผู้ใช้อ่านช้า) | ปรากฏ/หายทันที, เส้นเวลาไม่แสดง |
| L5 | ไฮไลต์แถวใหม่/เพิ่งแก้ | evidence ที่เพิ่งเพิ่ม, แถว assign ที่เพิ่งบันทึก, metric ที่เพิ่ง import/บันทึก, review แถวที่ถูกนำออก (จาง) | `background-color` accent-tint → โปร่ง | 1,600ms `--ease-exit` (จางออก) | ชี้ว่า "อันนี้แหละที่เพิ่งเปลี่ยน" แก้ปัญหาหน้าเลื่อนกลางตารางแล้วหาไม่เจอ | พื้น accent-tint ค้าง 1.6s แล้วหายทันที (ไม่ไล่สี) |
| L6 | เครื่องหมายถูกวาดเส้น | stepper ขั้นที่เพิ่งเสร็จ, แท็บเกณฑ์ assess ที่เพิ่งให้คะแนน, แผง import สำเร็จ, pill "ครบ" ของเกณฑ์ใน heatmap | SVG check `stroke-dashoffset` เต็ม → 0 + วงกลม success-bg `scale(.9→1)` | 500ms `--ease-move` | ยืนยันความสำเร็จแบบไม่รบกวน (แทน confetti) | แสดงเครื่องหมายถูกทันที |
| L7 | ฉลองครบงาน | dashboard รอบ เมื่อ section approved = 53 และสถานะ in_progress (พร้อมส่ง QA) — **ครั้งเดียว** ต่อ `cycleId+revision` ต่อผู้ใช้ (flag ใน localStorage `aunqa_celebrated`) | ring เต็ม + เปลี่ยนเป็น success + จุด accent 8 จุด (SVG `.aq-celebrate-spark`) กระจายออกรอบ ring ระยะ 28px แล้วจาง + InlineMessage success "ครบทุกข้อแล้ว พร้อมส่ง QA คณะตรวจ" | 800ms `--ease-enter` ครั้งเดียว | ให้กำลังใจที่หลักไมล์จริง ข้อความเป็นข้อเท็จจริง | ไม่มีประกาย เหลือ ring + ข้อความ · ปิดได้ด้วยสวิตช์ "เอฟเฟกต์ฉลอง" (`html[data-effects="off"]`) |
| L8 | เส้น stepper เติม | stepper section editor | เส้นเชื่อมระหว่างขั้น `scaleX 0→1` เมื่อขั้นก่อนหน้า done ในหน้านั้น | 400ms `--ease-move` | แสดงว่าคืบหน้าไปขั้นถัดไป | แสดงทันที |
| L9 | แผงพับ/กาง | gap group, accordion, details, ตัวกรองเพิ่มเติม | เนื้อหา `opacity 0→1` + chevron `rotate(0→180deg)` (ไม่ animate ความสูง) | 220ms / chevron 150ms | บอกทิศทางการเปิด | ทันที |
| L10 | เปลี่ยนแท็บแผงข้าง | section editor sidetab | panel ใหม่ fade-in | 150ms | ต่อเนื่องทางสายตา | ทันที |
| L11 | วงแหวน AppLoader | AppLoader เท่านั้น | arc 25% หมุน | 1.2s linear infinite (หยุดเมื่อปิด loader; มี timeout 10s) | บอกว่าระบบยังทำงาน | ซ่อน arc, ข้อความ "…" |
| L12 | คำทักทาย + ภาพเส้น | PageHeader หน้าหลัก, empty state ทุกตัว, แผงแบรนด์ login | ข้อความตามเวลา ("สวัสดีตอนเช้า/บ่าย/เย็น" ตาม 05–11:59/12–16:59/17–04:59) + วันที่ไทย · ภาพเส้น SVG นิ่ง | — (ไม่เคลื่อน) | ไม่น่าเบื่อโดยไม่ใช้ motion | — |
| L13 | กระดิ่งรับแจ้งเตือนใหม่ | จุดนับบนกระดิ่ง เมื่อจำนวนเพิ่มระหว่างอยู่ในหน้า | `scale(.9→1)` ครั้งเดียว | 220ms | ดึงสายตาเบา ๆ ว่ามีของใหม่ | ไม่เคลื่อน |
| L14 | Dialog / drawer / popover เข้า-ออก | dialog, drawer มือถือ, popover Term, dropdown | dialog: backdrop fade + panel `scale(.98→1)`+fade · drawer: `translateX(-100%→0)` · popover: fade+`translateY(4px→0)` | เข้า 220ms / ออก 150ms | เชื่อมว่าแผงมาจากไหน | ทันที |

**รายการข้อห้าม (ทุกข้อตรวจได้ใน U3):**
1. ห้าม confetti/ภาพเต็มจอ/ฉลองซ้ำเมื่อรีเฟรช — ฉลองได้เฉพาะ L6, L7
2. ห้าม bounce/overshoot/elastic/shake (รวม toast เดิม `cubic-bezier(0.34,1.56,…)`) · ห้ามสั่นฟอร์มเมื่อ error
3. ห้าม animation วนไม่จบบนหน้าที่ต้องอ่าน — วนได้เฉพาะ L3 (ระหว่างโหลด) และ L11 (ใน loader) และ spinner ในปุ่ม loading · ลบ `pulse` ของ hero-tag/live-dot และ `ll-*` ทั้งหมด
4. ห้าม parallax, auto-carousel, scroll-jacking, `scroll-behavior: smooth` เมื่อ reduced-motion
5. ห้ามตัวเลขนับวิ่ง (count-up) — ตัวเลขแสดงค่าจริงทันที (เคลื่อนเฉพาะ ring/bar)
6. ห้ามเสียงทุกชนิด
7. ห้าม gamification ที่ไม่ผูกงานจริง: leaderboard/จัดอันดับบุคคล, แต้ม, streak, เหรียญ, level, นับถอยหลังกดดัน, ข้อความทำให้รู้สึกผิดเมื่อไม่เข้าระบบ, progress หลอก
8. ห้ามแสดง "ผ่าน/ไม่ผ่านเกณฑ์" หรือคะแนนที่ AI ตัดสินเป็นรางวัล/สีฉลอง (กฎ 7.3) — ความคืบหน้าวัดจากสถานะงาน (อนุมัติ/ส่ง/ผูกหลักฐาน) เท่านั้น
9. ห้าม animate `width/height/top/left/margin` · ห้ามกระพริบ > 3 ครั้ง/วินาที
10. ห้ามข้อมูลที่บอกด้วย motion อย่างเดียว (ทุกอย่างมีข้อความ/ตัวเลขนิ่งกำกับ) · ห้าม hover-only (tooltip ต้องเปิดด้วยการกด/โฟกัสได้)
11. ห้าม emoji ในโครงหน้า (loader, nav, dialog, toast, ปุ่ม, banner) — ใช้ Icon.tsx
12. ห้ามเพิ่ม dependency ใด ๆ เพื่อ animation/ไอคอน/ฟอนต์

## 5. หน้าต่อหน้า → `ui/pages.md`
P1 landing · P2 login (layout แยก) · P3 loader init/login/logout · P4 app shell · P5 หน้าหลัก "สิ่งที่ต้องทำตอนนี้" ต่อ role · P6 รายการรอบ · P7 แดชบอร์ดรอบ · P8 มอบหมาย · P9 section editor · P10 คลังหลักฐาน + ฟอร์ม 3 ช่อง · P11 รายละเอียดหลักฐาน · P12 หลักสูตร · P13 ตัวชี้วัด (+C-7) · P14 แผนปรับปรุง · P15 assess · P16 รอตรวจ · P17 ส่งออก · P18 admin · P19 คลังเกณฑ์ · P20 404 · P21 error/no-access ร่วม

---

## 6. Bug + งานค้าง: ตัดสินทีละข้อ

### 6.1 ตารางตัดสิน
| ข้อ | ตัดสิน | ใคร | อย่างไร (สรุป — รายละเอียดใน pages.md / 6.2) |
|---|---|---|---|
| **P1** session แท็บใหม่เด้ง /login | แก้ U2 | backend (B1) + frontend (F2) | session ย้ายไป localStorage + หมดอายุ idle 4 ชม./สูงสุด 12 ชม. + `subscribeSession` ข้ามแท็บ (ล็อกเอาต์แท็บหนึ่ง = ทุกแท็บไปหน้าแรก) · AuthContext ฟังอีเวนต์ |
| **P2** ส่งตรวจข้อว่าง | แก้ U2 | backend (B5 ตรวจซ้ำ) + frontend (F4) | backend มีด่าน "ต้องมีเนื้อหา narrative ก่อนส่งตรวจ" อยู่แล้ว (`workflow.ts` transitionSection) → B5 พิสูจน์ด้วยสคริปต์ว่าข้อที่ TH/EN ว่างหรือมีแต่ช่องว่างถูกปฏิเสธ; ถ้าไม่ถูกปฏิเสธจริงให้แก้ให้ปฏิเสธ · frontend: checklist ก่อนส่ง (P9) เตือนไม่มีหลักฐาน/ไม่ให้คะแนน/เนื้อหาสั้น/R9/R11 |
| **P3** autosave หายเมื่อ refresh | แก้ U2 | frontend (F4 + F2) | save ทันทีเมื่อ blur / visibilitychange / beforeunload / `aunqa:flush-save` (logout) + สถานะ "ยังไม่บันทึก" (C24) |
| **P4** ฟอร์มหลักฐาน validate | แก้ U2 | frontend (F4) | inline validate + error summary + label "แนบหลักฐาน * (อย่างน้อย 1 อย่าง)" (P10) |
| **P5** select ล้น | แก้ U2 | frontend (F1 CSS + F4) | `width:100%; min-width:0` ทุก control + ช่องค้นหา `link-search` |
| **P6** คะแนนตนเองดูกดได้ตอน read-only | แก้ U2 | frontend (F4) | `canSelf` รวม `sectionEditable` + เหตุผลมองเห็นได้ |
| **P7** username แยกตัวพิมพ์ | แก้ U2 | backend (B1) + frontend (F2) | เทียบแบบไม่แยกตัวพิมพ์ใน login / ตรวจซ้ำตอน createUser / key lockout · input `autoCapitalize="none"` |
| **P8** heatmap แดงทั้งที่อนุมัติ + lect1 ไม่มีงานเดโม่ | แก้ส่วน UI ใน U2; **ไม่แก้ seed** | frontend (F3) | ช่อง heatmap แสดงไอคอนสถานะข้อแยกจากระดับคุณภาพ + tooltip อธิบาย (C13) · หน้าหลักมี empty state ต่อ role ที่บอกว่าทำอะไรได้ (P5) · ไม่เปลี่ยน `levelOf` (เป็นตรรกะคุณภาพที่ถูก: อนุมัติแล้วแต่ไม่มีหลักฐาน = ยังวิกฤต) และไม่แก้ seed (เสี่ยงต่อ 409 unit test + E2E โดยได้ประโยชน์น้อย) → บันทึกเป็น backlog ให้ playtester D0 ประเมินซ้ำ |
| **P9** E-0.0 + ไฟล์ใหญ่ไม่ถูกเก็บโดยไม่บอก | แก้ U2 (UI) | frontend (F4) | แจ้งขนาด + "เก็บเฉพาะข้อมูลไฟล์" เมื่อ > `MAX_DATAURL_BYTES` · Term อธิบาย E-0.0 · ไม่เปลี่ยนรูปแบบรหัส (regex citation/E2E อิงอยู่) |
| **P10** "ส่งกลับแก้" / "(ผู้ใช้เดิม)" | แก้ U2 | frontend (F1 label, F3 assign) | `SECTION_STATUS_TH.changes_requested = 'ส่งกลับแก้ไข'` · ชื่อจริงจาก `listUsers` |
| **C-7** import ไม่ reset ต่อหลักสูตร + race | แก้ U2 | frontend (F5) | `key={programmeId}` + `reqSeq` ทิ้งผลเก่า + debounce 300ms (P13) |
| **C-8 UI** | แก้ U2 | frontend (F4, F5, F2) | ปุ่ม `confirmTranslationReviewed` + banner R11 ต่อภาษา (P9) · ข้อความ R11 ใน dict EN (F5) · แจ้งเกิน 8,000 ตัวอักษรก่อนเรียก (P9, ใช้ `TRANSLATE_MAX_CHARS` จาก B4) · คำเตือน R11 หน้า export (P17) · AboutSection "R1–R11" (P1) |
| **C-10** dom-translate attributes | แก้ U2 | frontend (F5) | ดู 6.3 |
| แจ้งเตือนไม่ถึง role ถัดไป (fqa/dean/assessor) | แก้ U2 | backend (B3) | 6.2 B3 |
| คณบดีล็อกโดยไม่มีคำเตือน gap | แก้ U2 | backend (B4) + frontend (F3) | `getTransitionPreflight` + แสดงก่อนกดและใน dialog (P7) |
| todo ต่อ role ("ไม่มีอะไรบอกให้ไปทำ") | แก้ U2 | backend (B2) + frontend (F3, F2 badge) | `listMyTodos` (6.2 B2) + หน้าหลัก P5 + badge "รอท่าน" |
| กระดิ่งไม่ตรงกับหัวการ์ด | แก้ U2 | backend (B3) | `unreadCount` เรียก `syncDeadlineNotifications` ก่อนนับ |
| toast ทับกัน/หายเร็ว (timer bug) | แก้ U2 | frontend (F1) | C14 |
| อนุมัติเป็นชุด (playtest chair) | **ไม่ทำ** | — | เหตุผลในตาราง "ทางเลือก" |
| ให้คะแนน 8 เกณฑ์ต้องสลับแท็บ | แก้บางส่วน U2 | frontend (F3) | ปุ่ม "ไปเกณฑ์ถัดไป" (`crit-next`) + เหตุผลปุ่มส่งผล (P15) |

### 6.2 สเปก API ใหม่/เปลี่ยน (backend-dev) — import ผ่าน `@/lib/api` เหมือนเดิม · ทุกตัวเป็น read หรือผลข้างเคียงของ action ที่ตรวจสิทธิ์แล้ว · **ไม่เปลี่ยนสัญญาเดิม** ยกเว้นที่ระบุ

**B1 — Session ข้ามแท็บ + username ไม่แยกตัวพิมพ์** (`lib/api/auth.api.ts`, `lib/types.ts`)
```ts
// lib/types.ts — Session เพิ่มฟิลด์
export interface Session { /* เดิม: userId, username, fullName, universityId, roles, loginAt */
  lastActiveAt: number;   // ms
  expiresAt: number;      // loginAt + SESSION_ABSOLUTE_MS
}
// lib/api/auth.api.ts
export const SESSION_IDLE_MS = 4 * 60 * 60 * 1000;      // 4 ชม. ไม่มีการใช้งาน
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12 ชม. นับจาก login
export function getSession(): Session | null;            // อ่าน localStorage[KEYS.session]; หมดอายุ (now > expiresAt || now - lastActiveAt > IDLE) → clearSession() แล้วคืน null; ถ้าพบ key เดิมใน sessionStorage → ลบทิ้ง (ไม่ย้าย)
export function touchSession(now?: number): void;       // อัปเดต lastActiveAt ถ้าห่างจากค่าเดิม > 60_000 ms (กันเขียนถี่)
export function subscribeSession(cb: (s: Session | null) => void): () => void; // ฟัง window 'storage' เฉพาะ key KEYS.session; คืน unsubscribe; SSR = no-op
// getCurrentUser() เรียก touchSession() เมื่อมี session · setSession เขียน localStorage · clearSession ลบ localStorage (และ sessionStorage เผื่อค้าง)
// loginUser(username, password): เทียบ `u.username.toLowerCase() === un.toLowerCase()` (un = trim) · attempts/lockout ใช้ key ตัวพิมพ์เล็ก · getLockUntil/remainingAttempts lowercase ภายใน
// createUser: ปฏิเสธ duplicate แบบไม่แยกตัวพิมพ์ (`duplicate` 'Username นี้ถูกใช้แล้ว') · เก็บ username ตามที่พิมพ์ (trim)
```
RBAC: ไม่เปลี่ยน · audit `auth.login/logout` เดิม · **ข้อควรรู้ security (ส่ง D-sec):** session ใน localStorage อ่านได้จากทุกแท็บ origin เดียวกัน (เหมือน sessionStorage เดิมที่ JS อ่านได้) — เป็นโหมดเดโม่; ระบบจริงต้องใช้ httpOnly cookie ฝั่ง server (บันทึก TODO(PostgreSQL) ในโค้ด)

**B2 — งานที่ต้องทำต่อ role** (`lib/api/todo.ts` ใหม่, `lib/types.ts`, `lib/api/index.ts`)
```ts
export type TodoKind =
  | 'write_section' | 'fix_section' | 'translation_review'
  | 'review_sections' | 'assign_sections' | 'submit_cycle' | 'revise_cycle'
  | 'faculty_review' | 'final_approve' | 'start_assessment' | 'assess_cycle'
  | 'resolve_pii' | 'verify_actions';
export interface TodoItem {
  id: string;                // `${kind}:${cycleId ?? programmeId}:${requirementIds?.[0] ?? ''}` — คงที่ระหว่างการเรียก
  kind: TodoKind;
  urgent: boolean;           // ดูกฎ
  titleTh: string;           // พร้อมแสดง (ไม่มีชื่อบุคคลอื่น)
  detailTh?: string;
  programmeId: string;
  cycleId?: string;
  academicYear?: number;
  requirementIds?: string[]; // เรียงด้วย compareReqId
  evidenceIds?: string[];
  actionIds?: string[];
  due?: string;              // YYYY-MM-DD ใกล้สุดของกลุ่ม
  daysLeft?: number;         // daysUntil(due)
  count: number;             // ≥1
}
export function listMyTodos(user: AppUser, opts?: { now?: number }): TodoItem[];
```
กฎสร้างต่อ kind (อ่านอย่างเดียว ไม่เขียน store ไม่เขียน audit ไม่เรียก `syncDeadlineNotifications`; ใช้เฉพาะรอบที่ `listCycles(user)` คืน และตรวจด้วย `can()` เสมอ):
| kind | เงื่อนไข | จัดกลุ่ม | urgent | titleTh |
|---|---|---|---|---|
| write_section | `ownerUserId===user.id`, section `not_started|drafting`, รอบ `draft|in_progress|revision_requested` และไม่ lock | 1 รายการ/ข้อ | daysLeft ≤ 3 (รวมติดลบ) | `เขียนข้อ {id}` + ต่อท้าย due: `· เลยกำหนด {n} วัน` / `· ครบกำหนดวันนี้` / `· เหลือ {n} วัน` |
| fix_section | owner, `changes_requested`, รอบเขียนได้ | 1/ข้อ | true | `แก้ไขข้อ {id} ตามที่ถูกส่งกลับ` · detailTh = note ล่าสุดของ review event ที่ toStatus=`changes_requested` ของข้อนั้น (ตัด 120 ตัว) |
| translation_review | owner, `needsTranslationReview.th|en`, section แก้ได้, รอบเขียนได้ | 1/ข้อ | false | `ตรวจคำแปลข้อ {id} ({ไทย|อังกฤษ|ไทยและอังกฤษ})` |
| review_sections | `can(user,'sar.approve',cycleScope(c))` และมีข้อ `ready_for_review` ที่ `lastAuthorId !== user.id` | 1/รอบ | false | `ตรวจและอนุมัติ {n} ข้อที่ส่งมา (รอบ {ปี})` · detailTh ถ้ามีข้อที่เขียนเอง: `อีก {m} ข้อคุณเขียนเอง ต้องให้ผู้อื่นอนุมัติ` |
| assign_sections | `can(user,'cycle.assign',…)`, รอบ `draft|in_progress`, มีข้อไม่มีเจ้าของ | 1/รอบ | false | `มอบหมายผู้เขียน {n} ข้อที่ยังไม่มีเจ้าของ (รอบ {ปี})` |
| submit_cycle | `can(user,'cycle.submit',…)`, รอบ `in_progress`, ทุก section approved | 1/รอบ | submissionDue ≤ 3 วัน | `ส่งรอบ {ปี} ให้ QA คณะตรวจ` |
| revise_cycle | `can(user,'cycle.submit',…)`, รอบ `revision_requested` | 1/รอบ | true | `รอบ {ปี} ถูกส่งกลับแก้ไข` · detailTh = note ล่าสุดของ event รอบ → revision_requested |
| faculty_review | `can(user,'approve.faculty',…)`, รอบ `under_review` | 1/รอบ | false | `ตรวจรอบ {ปี} ระดับคณะ` |
| final_approve | `can(user,'approve.final',…)`, รอบ `faculty_approved` | 1/รอบ | false | `พิจารณาอนุมัติสุดท้ายรอบ {ปี}` |
| start_assessment | `can(user,'assessor.assign',…)`, รอบ `final_approved` | 1/รอบ | false | `เริ่มการประเมินรอบ {ปี}` · detailTh ถ้าไม่มีกรรมการ: `ยังไม่ได้มอบหมายกรรมการประเมิน` |
| assess_cycle | `isAssessorOf(user, c.id)`, รอบ `under_assessment` | 1/รอบ | assessmentDate ≤ 3 วัน | `ประเมินรอบ {ปี} (ให้คะแนนแล้ว {k}/8)` (k จาก `getAssessorProgress`) |
| resolve_pii | ผู้ใช้ไม่ใช่ assessor-only, `can(user,'evidence.write',programmeScope(p))`, หลักฐานของหลักสูตร `containsPii && !piiResolved` | 1/หลักสูตร | false | `จัดการข้อมูลส่วนบุคคลในหลักฐาน {n} ชิ้น` |
| verify_actions | `can(user,'action.verify',programmeScope(p))`, action `done` ที่ `ownerUserId !== user.id` | 1/หลักสูตร | false | `ตรวจรับแผนปรับปรุง {n} รายการ` |
เรียงลำดับ: `urgent` ก่อน → `daysLeft` น้อยไปมาก (ไม่มี = ท้าย) → ลำดับ kind ตามตาราง → `compareReqId` ของ requirementIds[0] · super_admin ใช้กฎเดียวกัน (ไม่ข้าม) · ผู้ใช้ข้ามมหาวิทยาลัยไม่เห็นของอีกที่ (มาจาก `listCycles`)

**B3 — แจ้งเตือนถึง role ถัดไป + unreadCount ตรงกัน** (`lib/api/workflow.ts`, `lib/api/notification.store.ts`)
- `notifyCycleChange` (ภายใน) เพิ่มผู้รับจากเดิม (เจ้าของข้อ + ประธาน) ตามตาราง; ผู้รับ "ตามสิทธิ์" = ผู้ใช้ใน university เดียวกันที่ `can(u, action, cycleScope(cycle))` เป็นจริง **ยกเว้น** ผู้ที่บทบาททั้งหมดเป็น `super_admin` และยกเว้น actor · kind `'cycle_status'` (revision_requested คง `'changes_requested'`) · ไม่ใช้ dedupeKey (transition เกิดซ้ำได้ใน revision เดียว)

| to | ผู้รับเพิ่ม | messageTh (ใช้ตรงตัว) |
|---|---|---|
| under_review | ผู้มี `approve.faculty` | `รอบประเมิน {ปี} ({รหัสหลักสูตร}) ส่งมาให้ QA คณะตรวจแล้ว — รอการพิจารณาของท่าน` |
| faculty_approved | ผู้มี `approve.final` | `QA คณะอนุมัติรอบ {ปี} ({รหัส}) แล้ว — รอคณบดีพิจารณาอนุมัติสุดท้าย` |
| final_approved | ผู้มี `assessor.assign` | `รอบ {ปี} ({รหัส}) อนุมัติสุดท้ายและล็อกแล้ว — เริ่มการประเมินและมอบหมายกรรมการได้` |
| under_assessment | กรรมการของรอบ (`isAssessorOf`) + เจ้าของข้อ/ประธาน (เดิมไม่มีข้อความ) | กรรมการ: `รอบ {ปี} ({รหัส}) เปิดให้ประเมินแล้ว — เริ่มให้คะแนนได้ที่พื้นที่ทำงานกรรมการ` · อื่น: `รอบ {ปี} เข้าสู่ขั้นการประเมินโดยกรรมการแล้ว` |
| assessed | ประธาน + ผู้มี `approve.faculty` + ผู้มี `cycle.close` | `กรรมการส่งผลประเมินรอบ {ปี} ({รหัส}) แล้ว — ดูผลได้ที่หน้าผลประเมิน` |
| in_progress / revision_requested / closed | เดิม | เดิม |
ข้อความเดิมของ in_progress/under_review/faculty_approved/final_approved ที่ส่งให้เจ้าของข้อ+ประธาน **คงเดิม** (ผู้รับกลุ่มใหม่ได้ข้อความใหม่; คนที่อยู่ทั้งสองกลุ่มได้ข้อความใหม่ข้อความเดียว)
- `unreadCount(user)` เรียก `syncDeadlineNotifications(user)` ก่อนนับ (ให้ตรงกับ `listNotifications`)

**B4 — Preflight ก่อนเปลี่ยนสถานะรอบ + ค่าคงที่แปล** (`lib/api/preflight.ts` ใหม่, `lib/api/ai.service.ts`, `lib/api/index.ts`, `lib/types.ts`)
```ts
export interface PreflightWarning {
  code: 'critical_gaps' | 'high_gaps' | 'pii_unresolved' | 'translation_review' | 'missing_self_rating' | 'no_assessor';
  count: number;
  messageTh: string;          // เช่น 'ยังมีช่องว่างระดับวิกฤต 36 รายการ'
  requirementIds: string[];   // unique, เรียง compareReqId
}
export interface TransitionPreflight {
  to: CycleStatus;
  allowed: boolean;           // มี rule จากสถานะปัจจุบัน && can(user, rule.action, cycleScope)
  blockers: string[];         // ข้อความไทยของเงื่อนไขที่ transitionCycle จะ throw: ข้อที่ยังไม่อนุมัติ (under_review/faculty_approved), assessed: เกณฑ์ที่กรรมการยังไม่ให้คะแนน/ไม่มี verdict
  warnings: PreflightWarning[];
  gapCounts: Record<GapSeverity, number>;
  approvedCount: number;
  totalSections: number;
}
export function getTransitionPreflight(user: AppUser, cycleId: string, to: CycleStatus): TransitionPreflight;
// ai.service.ts: export const TRANSLATE_MAX_CHARS = 8000;  (เปลี่ยนจาก const ภายในเป็น export — ค่าเดิม)
```
- สิทธิ์: ต้องอ่านรอบได้ (ใช้ `getCycle(user, id)` ที่ throw `forbidden`/`not_found` เดิม) · ไม่เขียน store/audit
- warnings คำนวณจาก `getReadiness`/`getGaps` ของรอบ เฉพาะเมื่อ `to ∈ {under_review, faculty_approved, final_approved}`: critical_gaps (severity critical), high_gaps (severity high), pii_unresolved (gap R6), translation_review (gap R11), missing_self_rating (section ที่ไม่มี rating `raterType:'self'`) · `to = under_assessment`: no_assessor ถ้ายังไม่มีกรรมการในรอบ · ไม่ใส่ warning ที่ count = 0
- **ไม่เปลี่ยนพฤติกรรม `transitionCycle`** (คำเตือนไม่บล็อก — ผู้มีอำนาจตัดสิน)

**B5 — ตรวจ P2** (ไม่มี API ใหม่): สคริปต์ชั่วคราวใน scratchpad พิสูจน์ว่า `submitSection` ปฏิเสธ (`invalid`) เมื่อ narrativeTh และ narrativeEn ว่างหรือมีแต่ whitespace ทั้งในรอบใหม่ (`createCycle` ปกติ) และรอบที่สร้างด้วย `copyFromCycleId` · บันทึกผลใน Log · ถ้าไม่ปฏิเสธจริง → แก้ใน `transitionSection` ให้ปฏิเสธ แล้ว handoff qa-tester เพิ่ม regression

**Facade:** `lib/api/index.ts` เพิ่ม `export * from './todo'` และ `export * from './preflight'` · อัปเดตหัวข้อ "API for frontend" ใน TASK file เป็น "#### Phase U additions"

### 6.3 C-10 — dom-translate attributes (frontend, `lib/i18n/dom-translate.ts`)
1. เพิ่ม `translatedAttrs = new WeakMap<Element, Partial<Record<string,string>>>()` เก็บค่าที่เราแปลไปแล้ว
2. ใน `translateAttrs` โหมด `en`: ถ้า `cur` ไม่เท่ากับ `saved[a]` (ต้นฉบับ) **และ** ไม่เท่ากับ `translatedAttrs[a]` → ถือว่า React เปลี่ยนค่าใหม่ ให้ `saved[a] = cur` (original ใหม่) แล้วแปลจากค่านั้น · ถ้า `cur === translatedAttrs[a]` → ข้าม (แปลแล้ว) · เมื่อแปลได้ ตั้ง `translatedAttrs[a] = tr`
3. โหมด `th`: คืนค่า original ก็ต่อเมื่อ `cur === translatedAttrs[a]` (ถ้า React เปลี่ยนค่าเป็นอย่างอื่นแล้ว ไม่ทับ)
4. observer: `OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder','aria-label','title'] }` · ใน callback ถ้า `m.type === 'attributes'` → push `m.target` · ป้องกันลูป: observer ถูก `disconnect()` ระหว่างที่เรา setAttribute (มีอยู่แล้ว) — คงไว้
5. ทดสอบมือ: สลับ EN → ปุ่ม `ai-accept` ที่ title เปลี่ยนตาม state ต้องแปล; สลับกลับ TH ได้ค่าปัจจุบันของ React

---

## 7. แผน build

### 7.1 ลำดับและผู้รับผิดชอบ (ไฟล์ไม่ทับกันระหว่าง agent)
```
B (backend-dev) ───────────────┐
F1 (frontend-dev) ─────────────┤ ขนานกันได้ (คนละโซน)
                               ├→ F2 → F3 → F4 → F5 (frontend-dev ต่อเนื่อง; F2 ต้องรอ B1, F3 ต้องรอ B2–B4)
                               └→ Q (qa-tester) หลัง B + F5 เสร็จ → U3 (ui-inspector + playtester + reviewer)
```
| # | subtask | agent | ไฟล์ที่แตะ (เขียน) | ขึ้นกับ |
|---|---|---|---|---|
| U2-B | API ข้อ 6.2 B1–B5 + อัปเดต "API for frontend" ใน TASK | backend-dev | `eduflow-next/lib/types.ts`, `lib/api/auth.api.ts`, `lib/api/todo.ts` (ใหม่), `lib/api/preflight.ts` (ใหม่), `lib/api/workflow.ts`, `lib/api/notification.store.ts`, `lib/api/ai.service.ts` (export const เท่านั้น), `lib/api/index.ts` · (ถ้าจำเป็น `lib/api/org.store.ts` สำหรับ helper ผู้รับ) | ADR นี้ |
| U2-F1 | Foundation: tokens + base CSS + primitives | frontend-dev | `app/globals.css` (เขียนใหม่ทั้งไฟล์: tokens → base → components → pages → utilities → reduced-motion), `app/layout.tsx` (ฟอนต์ Sarabun, `color-scheme`, skip link target), `components/ui/{Icon,BrandMark,ProgressRing,Stepper,Term,AppLoader,Toast}.tsx`, `context/ToastContext.tsx`, `context/DialogContext.tsx`, `components/aunqa/common.tsx` (PageHeader crumbs/status, Badge icon/primary, Loading/Skeleton+delay, Empty, ErrorBox code, AsyncButton busyText, `useLoad` เก็บ errorCode), `lib/ui/{aunqa,status,glossary,prefs,todo}.ts` (status/glossary/prefs/todo ใหม่) | ADR นี้ |
| U2-F2 | Shell + auth + landing + 404 | frontend-dev | `components/aunqa/{AppShell,AppSidebar,AppTopbar}.tsx`, `context/AuthContext.tsx` (subscribeSession, flush event, เวลา loader), `components/auth/{AuthLayout,LoginForm}.tsx`, `app/login/page.tsx`, ลบ `components/auth/{AuthNav,LoginLoader,LogoutLoader}.tsx`, `components/landing/*`, `app/page.tsx`, `app/not-found.tsx` (ใหม่), `components/ui/LangToggle.tsx` (restyle) | F1, B1 |
| U2-F3 | หน้าทำงาน: หน้าหลัก, รอบ, แดชบอร์ด, มอบหมาย, รอตรวจ, assess | frontend-dev | `app/app/page.tsx`, `app/app/cycles/page.tsx`, `app/app/cycles/[id]/page.tsx`, `app/app/cycles/[id]/assign/page.tsx`, `app/app/review/page.tsx`, `app/app/cycles/[id]/assess/page.tsx` | F2, B2, B3, B4 |
| U2-F4 | SAR + หลักฐาน + คลังเกณฑ์ | frontend-dev | `app/app/sections/[id]/page.tsx`, `components/aunqa/{SarWorkspace,TranslateResult,RequirementCard,RequirementPicker}.tsx` (Picker ใหม่), `app/app/evidence/page.tsx`, `app/app/evidence/[id]/page.tsx`, `app/app/requirements/page.tsx` | F3, B4 (TRANSLATE_MAX_CHARS) |
| U2-F5 | หน้าข้อมูล + i18n | frontend-dev | `app/app/curriculum/page.tsx`, `app/app/metrics/page.tsx`, `components/aunqa/{MetricImport,TrendChart}.tsx`, `app/app/actions/page.tsx`, `app/app/export/page.tsx`, `app/app/admin/page.tsx`, `lib/i18n/dict-aunqa.ts` (EN ของข้อความใหม่ทั้งหมด + pattern R11 + ข้อความแจ้งเตือนใหม่ของ B3 + titleTh ของ todo ทุกรูปแบบ), `lib/i18n/dom-translate.ts` (C-10) | F4 |
| U2-Q | E2E/เทสต์ให้ตรง UI ใหม่ + เช็กอัตโนมัติ AC | qa-tester | `eduflow-next/e2e/helpers.ts`, `e2e/flows-a.spec.ts` (E2E-04/05 เท่านั้น), `e2e/ui-u.spec.ts` (ใหม่), `eduflow-next/tests/phase-u.test.ts` (ใหม่: listMyTodos, preflight, notify ผู้รับ, session หมดอายุ/ข้ามแท็บ, username ไม่แยกตัวพิมพ์, unreadCount) | U2-B, U2-F5 |
- frontend-dev ทำ F1→F5 ต่อเนื่องใน session เดียวหรือหลาย session ได้ แต่ **commit แยกต่อ subtask** และรัน `npx tsc --noEmit` + `npx next build` ผ่านทุกครั้งก่อนปิด subtask
- ห้ามแก้ไฟล์นอกตาราง · เจอสิ่งที่ spec ไม่ได้กำหนด = `BLOCKED` ถาม architect (ห้ามตัดสินออกแบบเอง — เจ้าของสั่ง)
- ระหว่าง F1–F4 หน้าเก่าที่ยังไม่ย้ายอาจดูเพี้ยน (เพราะ CSS ใหม่) — ยอมรับ; E2E รันครบหลัง F5 เท่านั้น

### 7.2 Contract ระหว่างโซน (frontend ใช้ได้ทันทีเมื่อ B เสร็จ)
- types: `TodoKind`, `TodoItem`, `PreflightWarning`, `TransitionPreflight`, `Session.lastActiveAt/expiresAt` ตาม 6.2 (ชื่อ field ตรงตัว)
- functions: `listMyTodos(user, opts?)`, `getTransitionPreflight(user, cycleId, to)`, `subscribeSession(cb)`, `touchSession()`, `TRANSLATE_MAX_CHARS`, `SESSION_IDLE_MS`, `SESSION_ABSOLUTE_MS` + ของเดิม `confirmTranslationReviewed(actor, cycleId, reqId, lang)`, `getGaps(user, cycleId, reqId?)`, `citableCodes(cycleId)`, `searchRequirements(q)`, `validateFileMeta({name,size})`, `MAX_DATAURL_BYTES`, `MAX_FILE_BYTES`
- frontend ไม่ import อะไรจาก `lib/api/*` ตรง ๆ นอกจาก `@/lib/api` (facade)
- ถ้า F2 เริ่มก่อน B1 เสร็จ: ห้าม stub ฟังก์ชันใน lib — รอ

### 7.3 ผลกระทบต่อ E2E (14 pass / 2 skip ต้องคงเดิม)
**กฎ:** คง `data-testid` เดิมทุกตัวบน element บทบาทเดิม (รายการครบด้านล่าง) · ห้ามสร้าง testid ใหม่ที่ขึ้นต้นด้วย `heat-` หรือ `mywork-` · หน้าละ h1 เดียว · ปุ่มยืนยันใน dialog ขึ้นต้นด้วย "ยืนยัน" (notify = "รับทราบ") · ปุ่มที่ทำไม่ได้ (save/submit/self-save/approve/return/ai-*/link-btn) **ไม่ render** (ไม่ใช่ disabled) เมื่อไม่มีสิทธิ์ ตามพฤติกรรมเดิม
testid ที่ E2E ใช้ (ห้ามเปลี่ยน): `login-username, login-password, login-submit, nav-user, nav-bell (aria-label "แจ้งเตือนที่ยังไม่อ่าน N รายการ"), nav-curriculum, nav-metrics, readonly-banner, user-new, user-form, nu-username, nu-password, nu-name, nu-email, nu-submit, user-{u}, tab-audit, tab-users, cycles-table, cycle-new, cycle-year, cycle-submit, heatmap, heat-{id}, gap-list, owner-{id} (select), bulk-owner-{n}, bulk-apply-{n}, mywork-table, mywork-{id}, noti-list, ev-cycle, ev-new, ev-title, ev-text, ev-file, ev-submit, ev-table, pii-banner, linked-evidence, link-select, link-btn, ai-draft, ai-draft-text, postcheck, self-score, self-why, self-save, rating-panel, sar-editor, section-submit, section-approve, section-return, readonly-reason, narrative-th, save-manual, ai-translate, cycle-to-{s}, cycle-actions, lock-banner, evidence-unchanged, x-cycle, export-sar-docx, export-status, state-error, ev-links, ev-edit, assess-crit-{n}, assess-panel-{n}, crit-score, crit-why, crit-save, rated-count, verdict-score, verdict-why, verdict-save, assess-finish, assess-notopen, verdict-row, import-panel (+summary), cohort-file, cohort-{year}, cohort-commit, metric-{code}-{period}`
โครง DOM ที่ E2E อ้าง (ห้ามเปลี่ยน): `linked-evidence` = `ul > li` และรหัสอยู่ใน `li a strong` · `ev-table` แถวเป็น `tbody tr`, `td:first-child` มี `a > strong` รหัส, `td` ที่ 2 = ชื่อ · `cohort-{year}` มี `td` 7 ช่องตามลำดับเดิม · `owner-{id}` และ `self-score`, `crit-score`, `verdict-score`, `ev-cycle`, `link-select`, `bulk-owner-{n}` เป็น native `<select>` · `narrative-th` เป็น `<textarea>` ที่มี attribute `readonly` เมื่อแก้ไม่ได้ · `import-panel` เป็น `<details>` มี `<summary>` · dialog มี `role="dialog"` และ prompt ใช้ `<textarea>` · `gap-list` อ่านด้วย `innerText` หลังกด "แสดงทั้งหมด" (กลุ่มที่ปิดต้องเปิดครบ)
ข้อความที่ E2E อ้าง (ห้ามเปลี่ยน): "ข้อมูลส่วนบุคคล" ใน dialog PII + ปุ่ม "รับทราบ" · "PII" ในแถว · "เลขบัตรประชาชน" ใน pii-banner · "(R6)", "(R10)", messageTh ของ gap · "แสดงทั้งหมด" · "ผ่านการตรวจอ้างอิง/ตัวเลข" · "ล่าสุด: 5 คะแนน" · "ส่งกลับแก้ไข" · "ถูกส่งกลับแก้" (noti) · "ถูกล็อก", "hash {16hex}", "เนื้อหา SAR ตรงกับที่ล็อก" · "รอบถูกล็อกแล้ว" · "ประเมินตนเอง: N คะแนน" · "ส่งผลประเมินแล้ว" · "verdict" · label "บทบาท", "ขอบเขต" · option "รอบ 2570", "ทุกรอบ / ไม่ระบุรอบ", "ประธานหลักสูตร" · ชื่อผู้ใช้ใน option · ค่าเซลล์ cohort ดิบ
**E2E ที่ต้องแก้ (qa-tester, U2-Q — อนุญาตตาม ADR นี้):**
1. `helpers.ts` `loginAs`: ล้าง session ทั้ง `localStorage.removeItem('aunqa_session')` และ `sessionStorage.removeItem('aunqa_session')` (B1 ย้ายที่เก็บ)
2. `helpers.ts` เพิ่ม `pickRequirements(page, ids: string[])`: สำหรับแต่ละ id → `fill` ช่อง `ev-f-reqs-input` ด้วย id → คลิก `ev-f-req-opt-{id}` → `expect(ev-f-req-chip-{id}).toBeVisible()`
3. `flows-a.spec.ts` E2E-04 และ E2E-05: แทน `getByTestId('ev-f-reqs').selectOption([...])` ด้วย `pickRequirements(page, [...])` — นอกนั้นห้ามแก้
4. `e2e/ui-u.spec.ts` (ใหม่) — เช็ก AC-02/03/05/06/08/09/10 อัตโนมัติ (ดู 7.4)

### 7.4 Acceptance criteria (วัดได้ — ui-inspector/qa-tester/playtester ใช้ใน U3)
| # | เกณฑ์ | วิธีวัด | ผ่านเมื่อ |
|---|---|---|---|
| AC-01 | contrast | สคริปต์ node (สูตร WCAG) วัด 36 คู่ใน tokens.md T1.3 + สุ่ม computed style 10 element/หน้า บน 10 หน้า | ทุกคู่ข้อความ ≥4.5:1, UI ≥3:1; ค่าที่วัดต่างจากตาราง ≤0.05 |
| AC-02 | ขนาดตัวอักษร | Playwright: ทุก text node ที่มองเห็นในทุกหน้าที่ระบุใน AC-03 | ไม่มี <13px · 13px อยู่เฉพาะ class ใน T2.3 · `p, td, li, label, input, select, textarea, button, nav a` ≥16px ยกเว้นเมื่ออยู่ใน (หรือเป็น) class รายการ fs-sm ใน tokens.md T2.3 ซึ่งต้อง ≥14px (fs-sm ใช้ได้เฉพาะใน class เหล่านี้) |
| AC-03 | ไม่มี horizontal scroll | Playwright ที่ 390×844, 768×1024, 1440×900 บน: `/`, `/login`, `/app`, `/app/cycles`, `/app/cycles/cycle-demo-2569`, `/assign`, `/assess` (หลัง lock), `/app/sections/cycle-demo-2569::3.6`, `/app/evidence`, `/app/evidence/{id}`, `/app/curriculum` (ทุกแท็บ), `/app/metrics` (เปิด import), `/app/actions`, `/app/review`, `/app/export`, `/app/admin`, `/app/requirements`, `/zzz` | `document.documentElement.scrollWidth <= innerWidth` ทุกหน้า×ทุกขนาด (ตารางเลื่อนภายใน wrap ได้) |
| AC-04 | ขยายตัวอักษร | ตั้ง `aunqa_ui_prefs.fontScale=1.25` แล้วรัน AC-03 ที่ 1440 และ 390 | ผ่านเหมือน AC-03 และไม่มีข้อความถูกตัด/ทับ (ดูภาพ 5 หน้า) |
| AC-05 | target size | Playwright: `button, a.aq-btn, input:not([type=checkbox]):not([type=radio]), select, [role=tab], .aq-nav-item` ที่มองเห็น | สูง ≥44px ที่ 390 · ≥40px ที่ 1440 (≥44 ยกเว้น `.aq-btn-compact`) · ไม่มีปุ่ม <24×24 · ลิงก์ inline ในประโยคยกเว้น |
| AC-06 | focus | Tab ไล่ 30 ครั้งใน `/app`, `/login`, section editor | ทุก element ที่โฟกัสมี outline ≥2px ที่ contrast ≥3:1 · ไม่มี keyboard trap (ยกเว้น dialog/drawer ที่ Esc ออกได้) · skip link ทำงาน |
| AC-07 | สถานะไม่พึ่งสี | ui-inspector: grayscale screenshot ของ dashboard, heatmap, evidence table, review | ทุก pill/ช่อง heatmap/KPI มีไอคอนหรือข้อความแยกสถานะได้ |
| AC-08 | reduced motion | `emulateMedia({ reducedMotion: 'reduce' })` บน `/app`, dashboard, AppLoader (login) | `getAnimations()` ที่ playState running และ duration > 10ms = 0 (หลังโหลดเสร็จ) |
| AC-09 | ฟอนต์ไทยจริง | Playwright `document.fonts.check('16px Sarabun')` + computed `font-family` ของ body เริ่มด้วย Sarabun · grep | true · grep `Cormorant|DM Sans|DM\+Sans` ใน `app/ components/ context/` = 0 |
| AC-10 | ไม่มี emoji ในโครงหน้า | grep ช่วง emoji (U+1F300–1FAFF, U+2600–27BF ยกเว้น `✓`? → **ไม่ยกเว้น**) ใน `app/**/*.tsx`, `components/**/*.tsx`, `context/**/*.tsx` | 0 รายการ (ใช้ Icon แทน) |
| AC-11 | E2E เดิม | `npm run e2e` 2 รอบติด | 14 passed, 2 skipped (หลัง U2-Q แก้ E2E-04/05 ตาม 7.3) |
| AC-12 | unit/type/build | `npx tsc --noEmit`, `npm test`, `npx next build` | 0 error · 409 เดิม + ใหม่ผ่านทั้งหมด · build ผ่าน |
| AC-13 | Lighthouse a11y | ui-inspector ใช้ Chrome DevTools Lighthouse ที่มีในเครื่อง (ไม่ติดตั้งเพิ่ม) บน `/login`, `/app`, section editor | ≥ 90 ทุกหน้า · ถ้าเครื่องรันไม่ได้ ให้ระบุ "วัดไม่ได้" และใช้ AC-02/05/06/07 แทน (ไม่ติดตั้ง package) |
| AC-14 | usability: อัปโหลด+ผูก 1 ข้อ | playtester เล่นเป็นผู้ใช้ใหม่ (staff1) จาก `/app` ไม่ดูคู่มือ จับเวลาแบบคน (อ่านทุกข้อความ) | ≤ 3 นาที, ≤ 6 คลิก/การพิมพ์หลัก, จุดที่ต้องเดา ≤ 1 |
| AC-15 | usability: รู้ว่าต้องทำอะไร | playtester ล็อกอินทุก role ในเดโม่ (หลังเดินรอบไป under_review / faculty_approved / under_assessment ตามลำดับ) | ทุก role ที่มีงานเห็น todo ที่ถูกต้องเป็นการ์ดแรกของหน้าหลัก และไปถึงหน้าที่ต้องทำได้ใน 1 คลิก · fqa1/dean1/assess1 ได้แจ้งเตือนเมื่อถึงคิว |
| AC-16 | คณบดีเห็นคำเตือนก่อนล็อก | dean1 ที่ faculty_approved ของรอบเดโม่ | การ์ด "ขั้นตอนถัดไป" และ dialog แสดงจำนวน gap วิกฤต/PII ก่อนกดยืนยัน |
| AC-17 | bug P1–P10, C-7, C-8 UI, C-10 | playtester ทำซ้ำตามขั้นตอนในรายงาน U0 / review Phase C | ทำซ้ำไม่ได้ทุกข้อ (P8: เห็นไอคอนอนุมัติ + tooltip อธิบาย) |
| AC-18 | ธีมเดียวกัน | ui-inspector เทียบภาพ landing, login, AppLoader ×3, app, 404 | ใช้ token ชุดเดียว (สี/ฟอนต์/radius) ไม่มีมาสคอต/emoji · ไม่มี finding blocker/major |

### 7.5 ความเสี่ยง / ข้อควรรู้
- **ใหญ่:** globals.css เขียนใหม่ทั้งไฟล์ → หน้าที่ยังไม่ย้ายจะเพี้ยนระหว่าง F1–F4 (ไม่ commit เข้า master จนจบ U3) · สัดส่วนงานส่วนมากอยู่ที่ F3–F4
- localStorage session ทำให้ทุกคนต้องล็อกอินใหม่ 1 ครั้งหลังอัปเดต (ข้อมูลเดโม่ไม่หาย)
- notifications เพิ่มจำนวน (ผู้รับกลุ่มใหม่) — ไม่มีเทสต์เดิมนับจำนวนแจ้งเตือน (ตรวจแล้ว: ไม่มี `listNotifications` ใน tests)
- RequirementPicker เป็น combobox ARIA เขียนเอง — reviewer ต้องตรวจคีย์บอร์ด/screen reader
- `PROJECT.md` ยังเขียนว่า "Theme warm/cream … ห้ามเปลี่ยนธีม" และฟอนต์ Cormorant/DM Sans — ล้าสมัยหลัง ADR นี้ → orchestrator ต้องแก้ (โซน Team setup) ก่อน U2 เพื่อไม่ให้ agent อื่นทำตามของเก่า

## 8. จุดที่ต้องให้เจ้าของอนุมัติ
- **ไม่มีรายการที่ต้องอนุมัติเพิ่ม** ภายใต้ `OWNER APPROVED: 2026-10-21`: ไม่มี deploy, ไม่มี migration/ลบข้อมูล, ไม่เพิ่ม/เปลี่ยน dependency, ไม่มีค่าใช้จ่าย
- แนะนำ (ไม่บังคับ): orchestrator ส่งภาพรวมทิศทาง (ข้อ 1 + palette + ภาพ wireframe P5/P7/P9) ให้เจ้าของดูก่อน U2 เพราะเจ้าของสั่ง "ออกแบบให้เสร็จก่อน" และเป็นการเปลี่ยนหน้าตาที่ย้อนได้แต่ใช้แรงมาก

## ผลที่ตามมา
- (+) ฟอนต์ไทยถูกต้องทั้งระบบ, ตัวใหญ่ขึ้น, สีมีลำดับชัด, ทุก role รู้ว่าต้องทำอะไร, loader/login/logout เป็นธีมเดียว, bug U0 ปิด
- (+) token รวมศูนย์ → dark mode/ธีมสถาบันทำต่อได้ภายหลังโดยไม่แตะคอมโพเนนต์
- (−) งาน frontend ขนาด L (เขียน CSS ใหม่ + แตะทุกหน้า) · ต้องแก้ E2E 2 test + helper · thesis/diagram/screenshots เดิมล้าสมัย (Phase D ทำใหม่อยู่แล้ว)
- (−) session แบบ localStorage เป็นโหมดเดโม่ ต้องเปลี่ยนเมื่อมี backend จริง (TODO ในโค้ด)
