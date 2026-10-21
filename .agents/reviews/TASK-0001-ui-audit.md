# TASK-0001 — UI Audit (U0, อ่านอย่างเดียว)

Verdict: ISSUES (blocker 2 / major 8 / minor 7)
วิธี: production build, `next start` พอร์ต 3941 (ปิดแล้ว), Playwright 1440 + 390, 29 หน้า/แท็บ x 2 ขนาด = 58 ภาพ ใน `.agents/screenshots/u0/` (ชื่อ `NN-หน้า-d|m.png`)
ข้อมูลดิบ: `.agents/playtest/u0-stats.json` (สคริปต์ `u0-audit.mjs` ใช้ซ้ำได้)
เกณฑ์: WCAG 2.2 AA (ไฟล์ research ui-ux.md ยังไม่มี)

## Palette ปัจจุบัน (contrast คำนวณจริง)
| คู่สี | อัตราส่วน | ผล |
|---|---|---|
| text-body #3A2A1B / warm-white #FAF7F2 | 12.9 | ผ่าน |
| text-muted #6E5D4C / warm-white / cream / cream-dark | 5.9 / 5.6 / 5.0 | ผ่าน |
| cream / brown-dark (ปุ่มหลัก) | 11.9 | ผ่าน |
| accent #8B6040 / warm-white | 5.1 | ผ่าน |
| brown-mid #9E7B56 / warm-white (section-label, em ใน H1/H2) | 3.6 | ตก (ข้อความเล็ก) |
| brown-light #C4A882 / cream (.motto-num) | 2.0 | ตก |
| ขาว / sage #8A9E7E (ช่อง "พร้อม" heatmap, ระดับ R) | 2.9 | ตก |
| ขาว / late #B5713C (ช่อง "เตือน") | 3.9 | ตก (ตัว 10-13px) |
| --late เป็นข้อความ / cream (.auth-hint) | 3.4 | ตก |
| ปุ่ม disabled (opacity .5): ข้อความ / พื้น | ~2.6 | ตก |
| ขาว / absent #9C4747, ขาว / success #4E7D4E | 6.2 / 4.8 | ผ่าน |
| ลิงก์ดีฟอลต์ #0000EE / cream | 8.3 | ผ่านแต่หลุดธีม (ดู A3) |

ภาพรวมสี: ทั้งแอปเป็นน้ำตาลเอกรงค์ + ครีม (warm-white พื้น, cream การ์ด, brown-dark ปุ่ม/แท็บ active) สีเดียวที่มี hue คือ heatmap (แดงอิฐ/ส้ม/เหลือง/เขียว) และ emoji บน loader/ไอคอนการ์ด จึงให้ความรู้สึก "จืด": ไม่มีสีเน้น (accent) ที่ชัดเจนสำหรับ action หลัก ทุกอย่าง (แท็บ, ปุ่มหลัก, เลขลำดับ, avatar, badge) ใช้ brown-dark/cream ชุดเดียวกัน ลำดับความสำคัญจึงแยกไม่ออก

## ฟอนต์จริงที่เจอ (รวมทุกหน้า)
| ฟอนต์ที่ resolve | size | weight | line-height | element (รวม) |
|---|---|---|---|---|
| DM Sans | 13.6px | 400 | 1.6 | 2114 |
| DM Sans | 12.8px | 400 | 1.6 / ไม่ระบุ | ~2570 |
| DM Sans | 14.08px | 400 | 1.6 | 668 |
| DM Sans | 13.6px | 600/700 | 1.6 | 1092 |
| DM Sans | 12.48px | 400-600 | ไม่ระบุ (normal) | ~800 |
| DM Sans | 11.52px / 11px / 10.4px / 10px | 400-500 | 1.2-1.6 | ~890 |
| DM Sans | 16px | 400 | 1.6 | 198 |
| Cormorant Garamond | 20.8px | 600 | 1.6 | 88 (โลโก้) |
ฟอนต์ที่โหลดจริง: Cormorant 500/600, DM Sans 400/500, **Sarabun 500 เท่านั้น**
เนื้อหา 16px มีแค่ ~198 element; ส่วนใหญ่ 12-14px

## Findings

### Blocker
| # | หน้า | ปัญหา | ค่าที่เจอ vs ควรเป็น | ภาพ |
|---|---|---|---|---|
| B1 | ทุกหน้า (ข้อความไทย) | `body{font-family:'DM Sans',sans-serif}` ไม่มี Sarabun ใน stack; DM Sans ไม่มี glyph ไทย จึงตกไปฟอนต์ระบบ (Tahoma/Leelawadee/Segoe) ฟอนต์ไทยขึ้นกับเครื่องผู้ใช้ น้ำหนัก 400/600/700 ของ Sarabun ไม่ถูกใช้ (โหลดแค่ 500 จาก .aq-h1/textarea) ตัวไทยเล็กและดูไม่เป็นชุดเดียวกับตัวอังกฤษ | ควร Sarabun (หรือ Noto Sans Thai/IBM Plex Sans Thai) เป็นฟอนต์หลักของ UI ไทย; โหลดน้ำหนักที่ใช้จริง | 04-app-d |
| B2 | ทั้งแอป | ขนาดตัวอักษรเล็กเกินสำหรับผู้ใช้ 30+: ตัวหลัก 12.5-13.6px, ตาราง .85rem, badge .72rem (11.5px), heatmap small 10.4px, label/ข้อความย่อย 10-11px; element ที่ <13px มี 17-598 ตัวต่อหน้า (matrix 598, metrics 411, assign 353) | ควร body UI ≥16px ไทย, secondary ≥14px, ไม่มีอะไร <12px | 08-assign-d, cur-matrix-d, 12-metrics-d |

### Major
| # | หน้า | ปัญหา | ค่าที่เจอ vs ควรเป็น | ภาพ |
|---|---|---|---|---|
| M1 | A3 ทั้งแอป | ลิงก์ในแอป (`<a>` ในรายการ/ข้อความ เช่น ปี 2569, ข้อ 1.2, E-1.1-01) ไม่มี style: น้ำเงิน #0000EE + ขีดเส้นใต้ ดีฟอลต์เบราว์เซอร์ หลุดธีมครีม/น้ำตาล และใกล้ .aq-cite (น้ำตาลขีดเส้นใต้) ที่เป็นมาตรฐานคนละแบบ | ควรมี token สีลิงก์เดียว (+ focus/visited) | 04-app-d, 07-cycle-dash-d, 09b-section-real-d |
| M2 | Landing 1440 | หน้าเลื่อนแนวนอน: `.hero-bg-circle` ล้น (scrollWidth 1540 > 1440) พื้นหลัง section/ footer ถูกตัดที่ 1440 เห็นแถบขาวด้านขวาในภาพ | ต้อง overflow-x:clip ที่ container ของ hero | 01-landing-d |
| M3 | Login 390 | nav ของ landing ใน /login พัง: โลโก้ "AUN-QA Copilot" ถูกบีบ 3 บรรทัด, ลิงก์ "จุดเด่น/ขั้นตอนใช้งาน/เริ่มใช้งาน" ตัดเป็นคำละบรรทัด, หน้าเลื่อนแนวนอน (447px > 390), ไม่มี hamburger ใน login | nav mobile ต้องยุบ/ซ่อนลิงก์ใน /login | 02-login-m |
| M4 | Section editor (1440 และ 390) | `<select>` "ผูกหลักฐานเพิ่ม" ล้นนอกการ์ดขวา/ทะลุขอบหน้า (หน้ากว้าง 1483px); overflow ตรวจพบทั้ง 2 ขนาด | select ต้อง width:100% min-width:0 | 09b-section-real-d |
| M5 | Section editor | จัดวางสามคอลัมน์หลวม: คอลัมน์กลางมีช่องว่าง ~90px ก่อน banner; textarea ผู้เขียน SAR (งานหลัก) สูงแค่ ~380px มี scroll ซ้อน; ปุ่ม AI/บันทึกคะแนนเป็นปุ่มเล็ก 30px สีซีด (disabled อ่านแทบไม่ออก) | งานหลักควรกว้าง/เด่นที่สุด; ปุ่ม disabled contrast ต้อง ≥3:1 | 09b-section-real-d |
| M6 | Cycle dashboard | หน้ายาว ~3000px: รายการ "ช่องว่างที่ต้องแก้ (157)" แสดงทั้งหมดเป็นแถวซ้ำ ๆ ข้อความเหมือนกัน ("ข้อ 1.2 ข้อ 1.2 ยังไม่มีหลักฐานผูก (R1)") ไม่มีการจัดกลุ่ม/paginate; KPI 5 ใบเลขเทา-น้ำตาลเหมือนกันหมดแม้สถานะต่างกัน (วิกฤต/สูง/ต่ำ) | ควรจัดกลุ่มตามเกณฑ์/ยุบ; KPI ใช้สีสถานะ | 07-cycle-dash-d |
| M7 | Heatmap สถานะ (cycle + curriculum) | ใช้สีเป็นตัวแยกหลัก ตัวอักษรเล็ก 10.4px บนพื้นขาว/ส้ม/เขียวเทา contrast 2.9-3.9; ผู้ใช้ตาบอดสี แดง/เขียว แยกยาก (ยังมีข้อความ "วิกฤต/เตือน" ช่วยอยู่) | text ≥12px, contrast ≥4.5 | 07-cycle-dash-d, cur-heat-d |
| M8 | Touch target / mobile | ปุ่ม/แท็บ/ select ต่ำกว่า 44px: lang-toggle 109x30, logout 107x33, tab 38px, aq-btn-sm 30px, aq-input-sm; 12 ตัวต่อหน้าแม้ที่ /app; แถบเมนู 10 แท็บเลื่อนแนวนอนบน mobile ไม่มีตัวบอกว่ามีต่อ (เมนูส่วนใหญ่ถูกตัดที่ขอบ) | ≥44px (WCAG 2.2 AA ขั้นต่ำ 24px แต่ผู้ใช้ 30+ ควร 44) | 04-app-m, 07-cycle-dash-m |

### Minor
| # | หน้า | ปัญหา | ภาพ |
|---|---|---|---|
| m1 | Loader (login+logout) | ไม่ได้ "คนละ theme" ในแง่สี (ใช้ token น้ำตาลเดียวกัน) แต่ **คนละ tone**: มาสคอตการ์ตูนหนังสือยิ้ม + emoji สีสด (✨📖⭐🎓👋💤 สี native ฟ้า/เหลือง/ม่วง) ปนกับ UI องค์กรเรียบ; ข้อความ Cormorant ตัวไทยตกฟอนต์ระบบ; ข้อความหมุน 4 ประโยค (หายไปใน 1.5-2 วิ); เป็น overlay เต็มจอ z-900 เวลาสั้น ผู้ใช้ 30+ อาจมองว่าเด็ก/ไม่เป็นมืออาชีพ | 03-login-loader-d, 19-logout-loader-d |
| m2 | Landing | Hero ปุ่ม "เริ่มใช้งาน" ซีด (ดูเหมือน disabled / ยังอยู่ใน animate-up ตอนถ่าย); การ์ด "จุดเด่น" 4 ใบแสดงต่างกัน (opacity/ตำแหน่ง animate คนละจังหวะ จึงเหลื่อมกัน); label เล็ก (.72rem สี brown-mid 3.6:1, .motto-num 2.0:1); H1/H2 ใช้ Cormorant weight 300 ตัวเลข "5" "SAR" เป็นอังกฤษบางเบาสลับกับไทยหนา ดูไม่เป็นชุดเดียวกัน | 01-landing-d |
| m3 | Login | label ฟิลด์ตัวพิมพ์ใหญ่ .75rem (ไม่มีผลกับไทย) เล็ก; รายการ demo 11 บัญชี ยาวเกินหน้าจอ 1440x900 (ฟอร์มจริงถูกดันขึ้น) ; ไม่มี error state ที่เห็นชัด/ไอคอน (ดู 02c); ตอน focus ใช้แค่เปลี่ยนสีขอบ+เงาจาง (ผ่านแต่จาง) | 02-login-d, 02c-login-error-d |
| m4 | Heading hierarchy | H1 Cormorant 32px weight 500 ไทยตกไป Sarabun 500 แต่ h2 (.aq-h2 17.6px/700) เป็น DM Sans→ระบบ; ไทยเส้นบางของ Cormorant ตัวอังกฤษ (เช่น "(PLO · ...)" ต่างน้ำหนักในหัวเรื่องเดียว) | cur-heat-d |
| m5 | Nav | 10 แท็บเมนูเป็น pill เท่ากันหมด ไม่จัดกลุ่ม ไม่มีไอคอน; "งานของฉัน" กับอื่น ๆ ต่างกันแค่สี fill; ไม่มี sub-nav ต่อบริบท (แท็บในแท็บในหลักสูตรซ้ำรูปแบบเดียวกัน = pill 2 ชั้น สับสน) | 06-cycles-d, cur-heat-d |
| m6 | Empty/loading state | empty state เป็นกล่องเส้นประจืด ไม่มีไอคอน/ปุ่มนำทาง; หน้าโหลดข้อมูลแค่ข้อความ "กำลังเตรียมข้อมูล…" ไม่มี skeleton | 04-app-d |
| m7 | Focus | focus-visible ของ .aq-btn/input ดี (outline 3px) แต่ `.dash-logout-btn`, `.lang-toggle`, `.aq-demo-item`, ลิงก์ในรายการ ไม่มี outline เฉพาะ | 18-focus-d |

## ตาราง หน้า x ปัญหา
| หน้า | B1 | B2 | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | อื่น ๆ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| landing | x | x | | x | | | | | | x | m2 |
| login | x | x | | | x | | | | | x | m3 |
| loader login/logout | x | | | | | | | | | | m1 |
| /app งานของฉัน | x | x | x | | | | | | | x | m6 |
| requirements | x | x | | | | | | | | x | |
| cycles / cycle dash | x | x | x | | | | | x | x | x | m5 |
| assign | x | x (353 el) | | | | | | | | x | |
| section editor | x | x | x | | | x | x | | | x | |
| evidence list/detail | x | x | x | | | | | | | x | |
| curriculum 7 แท็บ | x | x (matrix 598) | | | | | | | x (heat) | x | m4, m5 |
| metrics | x | x (411 el) | | | | | | | | x | |
| actions / assess / review / export / admin | x | x | x | | | | | | | x | |

## สิ่งที่ดีอยู่แล้ว ควรเก็บ
- ธีมครีม/น้ำตาลอุ่น ไม่แสบตา; text-body 12.9:1 และ text-muted ≥5:1 (ผ่านจริง) ควรคง "ความอุ่น" ไว้และเพิ่มสีเน้นเท่านั้น
- ปุ่มหลัก brown-dark/cream (11.9:1), pill form สม่ำเสมอ (aq-btn, badge, tab)
- การ์ดมุมโค้ง + เงานุ่ม (--card-shadow) เป็นมิตร ไม่แข็ง
- ภาษาไทยธรรมชาติ ป้ายข้อความตรงงาน; line-height 1.6 ไม่ตัดสระ/วรรณยุกต์ (ตรวจแล้วไม่เห็นการตัด)
- Heatmap ใส่ข้อความสถานะในช่อง (ไม่พึ่งสีอย่างเดียว); legend ชัด
- focus-visible ของปุ่ม/ input หลักมี outline 3px; มี prefers-reduced-motion สำหรับ loader
- Matrix I/R/M ใช้ตัวอักษรกำกับ; ตาราง sticky ซ้าย/ห่อ overflow-x ถูกต้อง; ไม่มี text ล้นกล่องที่ 390 ยกเว้น M3/M4
- โครง AppShell: เมนูตามสิทธิ์, กระดิ่ง, ชื่อ+บทบาท, สลับ ไทย/EN, ปุ่มออกระบบ ชัด
- Select/ตัวกรอง/ toolbar responsive (aq-toolbar flex-wrap)

## ข้อเสนอให้ architect (ทิศทางออกแบบใหม่)
1. ฟอนต์: ตั้ง Thai-first stack (Sarabun หรือ Noto Sans Thai/IBM Plex Sans Thai) เป็นฟอนต์ UI; ตัวอังกฤษเข้าชุดกัน; ใช้ serif (Cormorant) เฉพาะโลโก้/หัว landing เท่านั้น; scale: body 16, secondary 14, min 12.
2. สี: เพิ่ม accent เดียวที่ contrast ผ่าน (เช่น เขียวเซจเข้ม/เทอร์ราคอตต้า #A4552E-ish) สำหรับ action หลัก/ลิงก์/แท็บ active; แยกสีสถานะ (success/warn/danger/info) ให้ชัด; แก้ token ที่ตก (brown-mid ตัวเล็ก, sage+ขาว, late+ขาว, disabled).
3. ลิงก์/ปุ่ม: นิยาม link style เดียว, ปุ่ม ≥44px, primary/secondary/ghost ชัด, disabled อ่านได้ (ไม่ใช้ opacity .5).
4. ความหนาแน่น: ลด 10 pill-tab เป็นกลุ่ม/ sidebar หรือจัดกลุ่ม (ทำงาน / ข้อมูลหลักสูตร / ผู้ดูแล); รายการ 157 ช่องว่างจัดกลุ่ม+ยุบ; KPI ใช้สีสถานะ.
5. Loader/Login/Logout: ยก tone ให้เข้าชุดกับ UI (เส้น/โลโก้ AUN-QA + progress เรียบ, ไม่ใช้ emoji สีสด) ถ้าจะคงมาสคอตควรเป็น SVG ใน palette เดียวกันทั้งหมด; แยก layout ของ /login ออกจาก landing-nav (แก้ M3).
6. แก้ overflow (M2, M4) และตรวจ responsive 390 อีกรอบหลังออกแบบ.
