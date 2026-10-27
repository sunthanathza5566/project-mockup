# TASK-0002 — เฟส 7 UI Inspection (ของจริงหลัง build ครบ) — ui-inspector

Verdict: **ISSUES** — blocker 0 · **major 1** · minor 9
(major ข้อเดียวอยู่ที่ตารางผู้ใช้หน้า `/app/admin` ส่วนหน้าอื่นทั้งหมดผ่าน AC ฝั่ง UI ที่วัดได้)

- วันที่ 2026-10-27 · HEAD `1ca6903` · production build ที่เปิดไว้แล้ว `http://localhost:3950` (`.next/BUILD_ID` 02:12:10 ใหม่กว่า commit 02:11:37; ไม่ได้ build/start/kill อะไร) · Playwright chromium · locale th-TH · ไม่มี HTTP 5xx / pageerror ระหว่างถ่าย
- ชุดภาพ: light/dark × 1440 / 768 / 390 → **298 ภาพ** `.agents/screenshots/TASK-0002/final-*` + `INDEX.md` · dark ใช้ `aunqa_theme=dark` ส่วน light ใช้ค่าเริ่มต้น
- สถิติดิบ: `.agents/playtest/final-ui/stats-{light,dark}-{1440,768,390}.json`, `checks.json` · สคริปต์ `shoot.mjs`, `checks.mjs`, `crop.mjs` (ใช้ซ้ำได้)
- ข้อมูลที่ใช้: แจ้งเตือน staff1 = ของจริง (chair1 มอบข้อ 3.6) + ฉีดแถวตัวอย่าง 4 แถวเพื่อให้เห็นครบ 3 กลุ่มวัน · คำขอเข้าใช้งานและคำเชิญสร้างผ่านหน้าจอจริงทั้งหมด (ลิงก์เชิญมาจาก `invite-link`) · panel ว่างใช้ sadmin · หน้า assess ตั้งรอบเป็น `under_assessment` ใน localStorage ของ browser ที่ถ่ายเท่านั้น
- Study: `standards/ui-ux.md` ข้อ 1.1 (ขนาด/line-height ไทย), 2 (target), 3 (contrast), 4.3/5.3 (error summary) + friendly-spec §F0–F13 + earth-tokens §E1–E4

## สรุปฟอนต์ที่ใช้จริง (รวม 38 หน้า/สถานะ ที่ light-1440)
ฟอนต์ที่โหลดจริงมีชุดเดียวคือ `IBM Plex Sans Thai Looped` น้ำหนัก 400/500/600 (next/font) ทุกหน้าทุกธีม · ไม่มี Sarabun/Cormorant/DM Sans · `ui-monospace` ใช้กับรหัส/ชื่อผู้ใช้/token (`<code>`, `invite-link`)

| font-family | size | weight | line-height | จำนวน element |
|---|---|---|---|---|
| IBM Plex Sans Thai Looped | 16px | 400 | 1.70 | 1170 |
| 〃 | 16px | 500 | 1.70 | 847 |
| 〃 | 16px | 600 | 1.70 | 386 |
| 〃 | 14px | 400 | 1.60 | 348 |
| 〃 | 13px | 500 | 1.50 | 320 (badge/pill/ตัวนับ — `.aq-badge`) |
| 〃 | 13px | 400 | 1.70 | 290 (ตัวอักษรในกราฟ `aq-chart-label` — SVG) |
| 〃 | 14px | 500 | 1.60 | 135 |
| 〃 | 18px | 600 | 1.60 | 74 |
| 〃 | 24px | 600 | 1.40 | 40 (h1) |
| 〃 | 20px | 600 | 1.50 | 33 (คำทักทาย, h2) |
| ui-monospace | 16px | 400/600 | 1.70 | 71 (รหัส/token) |

## ผลตาม AC ฝั่ง UI
| AC | วิธีวัด | ผล |
|---|---|---|
| AC-01b contrast หน้าจริง | วัด computed ทุก element ที่มีข้อความ (ไม่ใช่สุ่ม 10) รวม **23,066 element** ใน 38 หน้า × 6 ชุด + ขอบ control + ไอคอนสถานะ + focus | **ผ่าน** · ข้อความต่ำสุด light 4.81 / dark 5.45 (ตัวย่อบน avatar = คู่ #41) · ข้อความต่ำกว่าเกณฑ์ = 0 · ขอบ control ต่ำสุด 3.04 (dark `invite-link` บนพื้น success-muted) / 3.37 (light) · ไอคอนสถานะต่ำสุด 5.08 · focus ring (Tab 20 ครั้ง × 5 หน้า × 2 ธีม) ทุกตัว ≥2px ต่ำสุด 5.12 · ข้อยกเว้น: ขอบ tile KPI บนแดชบอร์ด 1.23/1.52 = ขอบตกแต่ง (tile มีข้อความ+ไอคอน, สถานะกดใช้ `border-primary`) ไม่นับ |
| AC-04 (ก) 125% | `aunqa_ui_prefs.fontScale=1.25` × 6 หน้า × 1440/390 × 2 ธีม | **ผ่าน** ไม่มี h-scroll · ไม่มีข้อความถูกตัด/ปุ่มล้น (`final-scale125-*`) |
| AC-04 (ข) text-spacing | CSS WCAG 1.4.12 × 6 หน้า × 1440/390 | **ผ่าน** ไม่มี h-scroll/ตัด/ล้น |
| AC-04 (ค) 360×800 | 6 หน้า | **ผ่าน** |
| AC-07 สถานะไม่พึ่งสี | grayscale dashboard (KPI+heatmap), review, evidence, panel แจ้งเตือน × 2 ธีม × 2 จอ | **ผ่าน** ทุก pill/ช่อง heat/KPI มีไอคอน + คำ (`final-gray-*`) |
| AC-16 R2 หน้าตาตามสเปก | ภาพทุกหน้า × 2 ธีม × 3 จอ | **ผ่านยกเว้น M1** · พื้นทราย/เสจ, clay เฉพาะ avatar/ไอคอนทักทาย, dark body `#26211C` (ไม่ดำ), การ์ด rounded-xl, ไม่มีแถบซ้ายสี indigo |
| AC-17 ไทยอ่านง่าย | line-height ทุก element ไทย ≥1.35 (เนื้อหา 1.6–1.7) · uppercase/letter-spacing บนไทย = 0 · ดูภาพ 125% @2x | **ผ่าน** ไม่พบสระบน/วรรณยุกต์ถูกตัด · มีการตัดคำไม่สวย 2 จุด (m1, m8) |
| AC-19 Lighthouse a11y | Lighthouse ไม่มีในเครื่อง → **axe-core** (wcag2a/aa, 21aa, 22aa) บน /login, /app, section editor, dashboard, admin × 2 ธีม | **violations = 0 ทั้ง 10 ชุด** · incomplete: color-contrast (พื้นซ้อน/ภาพ — วัดเองแล้วผ่าน), `aria-valid-attr-value` 1 จุด (aria-controls ชี้ panel ที่ยังไม่ render), dashboard `aria-prohibited-attr` 1 จุด (info) |
| AC-21 ไม่มีปุ่มไอคอนเดี่ยว | ดูภาพ topbar 1440 ทุก role | **ผ่าน** (ภาษา / แจ้งเตือน / ชื่อ+บทบาท มีข้อความ · <1024 กระดิ่ง/avatar เป็นข้อยกเว้นตามสเปก · ปุ่ม "เมนู" มีคำ) |
| AC-22 ปุ่มภาษา | ภาพทุกจอ + สลับ EN | **ผ่าน** segmented `ไทย│English` / `ไทย│EN` อยู่นอกเมนูทุกจอ รวม landing 390 · EN แปลเมนู/ทักทาย/todo ครบ (`final-home-chair1-en-*`) |
| AC-23 เมนูผู้ใช้ | ภาพ 1440/390 × 2 ธีม | **ผ่าน** ป้าย ปกติ/ใหญ่/ใหญ่มาก, สว่าง/มืด/ตามเครื่อง ไม่ตกบรรทัด · อีเมลไม่ตัดกลางโดเมน |
| AC-24 panel แจ้งเตือน | ภาพมีรายการ/ว่าง × 3 จอ × 2 ธีม | **ผ่าน** popover desktop, sheet เต็มจอ 390 มีปุ่ม "ปิด", "ใหม่" + ตัวหนา + จุด แยกได้ใน grayscale |
| AC-31 ลูกเล่นไม่รบกวน | scan stylesheet หากฎ `:hover` ที่มี transform/translate/scale + `getAnimations()` วน + reduced motion เปิด panel/เมนู | **ผ่าน** กฎ hover ยก/เลื่อน = 0 · animation วนหลังโหลด = 0 · reduced motion: running >10ms = 0 · ไม่มีทัวร์/confetti |
| h-scroll | ทุกหน้า × 6 ชุด | 0 |
| ตัวอักษร <13px | ทุกหน้า | 0 (13px เฉพาะ badge และตัวอักษรกราฟ) |

### จุดที่ S6 ฝากไว้
| เรื่อง | ค่าที่วัด | ความเห็น |
|---|---|---|
| badge สูง 24 (เดิม 28) | `.aq-badge` สูง 24px ทุกหน้า (ไม่มีค่าอื่น) · 13px/500 · ไม่ตัดบรรทัด | **ยอมรับได้** ข้อความไม่ชิดขอบ ไอคอน+คำอ่านชัดทั้งสองธีม ตารางแน่นน้อยลง |
| ป้าย KPI น้ำหนัก 400 | `aq-kpi__label` 14px/400 (muted, contrast ≥6) · ตัวเลข KPI ใหญ่หนา | **ยอมรับได้** ตัวเลขเป็นจุดเด่นอยู่แล้ว ป้ายบางลงทำให้ลำดับสายตาดีขึ้น |
| ป้ายกราฟน้ำหนัก 400 | `aq-chart-label` 13px/400 (290 element) | **ยอมรับได้** แต่เป็นจุดเล็กสุดของระบบ — ถ้าจะปรับ ให้เพิ่มเป็น 14px ก่อนเพิ่มน้ำหนัก (ดู m6) |
| แท็บ admin/แท็บภาษา SAR ไม่มีพื้นเทา | `[role=tab]` bg = `rgba(0,0,0,0)` ทุกตัว (admin, curriculum, SAR ไทย/English) · ที่เลือกใช้เส้นใต้สีเสจ + ตัวหนา | **ปิด** ตรงสเปก C11 |

## สถานะ minor รอบ V1
| # | เรื่อง | สถานะ | หลักฐาน |
|---|---|---|---|
| m1 | แถบซ้ายสี indigo บนเมนูที่เลือก | **ปิด** (legacy.css ถูกลบใน S6, ภาพไม่มีแถบ) | `final-shell-light-1440.png`, `final-drawer-light-390.png` |
| m2 | uadmin มีคำขอรอแต่หน้าหลักบอก "ไม่มีงานค้าง" | **ปิด** มีแถว "อนุมัติคำขอเข้าใช้งาน 1 รายการ" + ปุ่มทำงานถัดไป "ดูคำขอเข้าใช้งาน" | `final-home-uadmin-light-1440.png` |
| m3 | ประโยคทักทายขัดกับรายการ | **ปิด** "มี N งานรอท่าน · ยังไม่มีงานเร่งด่วน" ตรงกับ "(รวม N งาน)" | `final-home-chair1-light-1440.png` |
| m4 | "คุณอ.สมศรี" | **ปิด** "ยินดีต้อนรับ อ.สมศรี ขยันสอน" | `final-invite-light-1440.png` |
| m5 | landing 390 แถบบน 2 แถว, ☰ ไม่มีคำ | **ปิด** แถวเดียว `[แบรนด์][ไทย│EN][☰ เมนู]` | `final-landing-fold-light-390.png`, `final-landing-menu-light-390.png` |
| m6 | ฟอร์มขอเข้าใช้งานไม่มีสรุป error / แผงแบรนด์ลอยกลาง | **ปิดบางส่วน** สรุป error + ลิงก์ไปช่องมีแล้ว · แผงแบรนด์ขวายังอยู่กลางหน้า (ดู m7 ใหม่) | `final-request-error-light-1440.png` |
| m7 | "อ่านทั้งหมด" disabled มีพื้นเทา | **ปิด** | `final-noti-empty-dark-390.png` |
| m8 | อีเมลในเมนูผู้ใช้ตัดกลางโดเมน | **ปิด** | `final-usermenu-light-1440.png` |
| m9 | ลิงก์รหัสข้อในตารางเล็ก | **ปิดตามที่ orchestrator ตัดสิน** หน้า F3 เป็น 24×44 แล้ว · หน้าหลัก staff1 ยัง 24×27 (ผ่าน WCAG 2.5.8 — ยอมรับ) | `final-home-staff1-light-1440.png` |
| m10 | details พับงานเดียว | **ปิด** ≤4 แถวแสดงตรง | `final-home-chair1-light-1440.png` |

## ประเมินด้วยสายตาผู้ใช้อาจารย์/ผู้บริหารวัย 45–60+
ภาพรวม **ตอบโจทย์เจ้าของ "สวย ทันสมัย เป็นมิตร ใช้ง่าย earth tone ไม่ดำ"**
- หน้าหลักบอกทันทีว่า "วันนี้ต้องทำอะไร" มีปุ่มหลักปุ่มเดียว ("ทำงานถัดไป") และรายการงานที่มีปุ่ม "ไปทำ" ทุกแถว ผู้ใช้ไม่ต้องเดาเมนู
- ทุกปุ่มบนแถบบนมีคำ ปุ่มภาษาเห็นชัดว่าเลือกอันไหนอยู่ เมนูผู้ใช้รวมเรื่องการแสดงผลไว้ที่เดียว และขยายตัวอักษร 125% แล้วไม่มีอะไรพังทั้งมือถือและจอใหญ่ (สำคัญกับกลุ่มสายตายาว)
- สีทราย/เสจอ่อนสบายตา โหมดมืดเป็นน้ำตาลถ่านอ่านง่าย ไม่แสบตา สถานะทุกจุดมีไอคอนและคำ ไม่ต้องจำสี
- หน้าที่ยัง "หนัก" สำหรับกลุ่มนี้: **ตารางผู้ใช้ของผู้ดูแล** (M1) และ **แดชบอร์ด/ตัวชี้วัด** ที่ข้อมูลแน่นและยาวมาก (แดชบอร์ด heatmap 53 ช่องเกือบทั้งหมดเป็นสีแดง "วิกฤต" อาจดูน่าตกใจ แต่เป็นข้อมูลเดโม่ ไม่ใช่ปัญหาดีไซน์)

## Findings
| # | severity | หน้า/breakpoint | ปัญหา | ค่าที่เจอ vs ค่าที่ควรเป็น | screenshot | ผู้รับผิดชอบ |
|---|---|---|---|---|---|---|
| M1 | **major** | `/app/admin` แท็บผู้ใช้ — 1440 และ 390 ทั้ง 2 ธีม | ตารางผู้ใช้แน่นและอ่านยาก: ทุกแถวมีช่อง "เพิ่มบทบาท" (select 2 อัน + ปุ่ม) ทำให้คอลัมน์ชื่อแคบ | ที่ 1440: ค่าใน select ถูกตัด ("อาจารย์/เจ้าหน้า…", "ทั้งมหาวิทยาลั…"), ปุ่ม "ระงับบัญชี" ตกเป็น 2 บรรทัด, อีเมลถูกตัดกลางคำ ("super.admi / n@sample-uni.exa / mple"), ชื่อ 2 บรรทัด · ที่ 390: หน้ายาว 5,258px เพราะทุกการ์ดมีชุดเพิ่มบทบาท และแท็บ "Audit log" ตกไปบรรทัดที่ 2 · ควรเป็น: 1 แถว = ชื่อ+อีเมลบรรทัดเดียว (truncate + title), สถานะ, บทบาท, ปุ่ม "จัดการ" ปุ่มเดียวที่เปิดแผง/บรรทัดขยายสำหรับเพิ่ม/ถอนบทบาท และระงับ (หลัก 1 ปุ่มหลักต่อพื้นที่ §F13); ปุ่มทุกตัว `whitespace-nowrap`; แท็บเลื่อนแนวนอนได้ที่ <768 | `final-admin-users-light-1440.png`, `final-admin-invite-result-light-1440.png`, `final-admin-users-light-390.png` | frontend-dev (`components/aunqa/admin/UsersTab.tsx`, `app/app/admin/page.tsx`) |
| m1 | minor | section editor 1440 (ทั้ง 2 ธีม) | แท็บข้าง "ความเห็น" ตัดเป็น "ความ / เห็น" 2 บรรทัด เพราะแท็บ 3 อันแบ่งความกว้างเท่ากัน | แท็บ `sidetab-comments` สูงกว่าอีก 2 แท็บ · ควร `whitespace-nowrap` + ตัวนับชิดข้อความ หรือให้กว้างตามเนื้อหา | `final-section-light-1440.png` | frontend-dev (`SarWorkspace.tsx`) |
| m2 | minor | dashboard 1440 | ป้ายขั้นที่ 4 ของ stepper "คณบดีอนุมัติ/ล็อก" ตก 2 บรรทัด ขณะที่ขั้นอื่นบรรทัดเดียว | ควรเป็นบรรทัดเดียว (ลดช่องว่างเส้นเชื่อมหรือใช้ป้ายสั้น "คณบดีอนุมัติ") | `final-dashboard-light-1440.png` | frontend-dev (`cycles/[id]/page.tsx` / `Stepper.tsx`) |
| m3 | minor | panel แจ้งเตือน ทุกจอ | ข้อความแจ้งเตือนกำหนดส่งใช้วันที่แบบ ISO ค.ศ. "(2026-10-31)" ขณะที่ทั้งระบบใช้ "31 ต.ค. 2569" | ผู้ใช้วัยกลาง-สูงอ่านปี ค.ศ. แบบ ISO สะดุด · ควรเป็น "31 ต.ค. 2569" — แต่ `messageTh` ถูกล็อกโดย AC-25 ("ไม่เปลี่ยน") จึงต้องให้ architect ตัดสินว่าจะจัดรูปวันที่ตอนแสดง (frontend) หรือปลด AC | `final-noti-light-1440.png`, `final-noti-dark-390.png` | architect → backend-dev / frontend-dev |
| m4 | minor | topbar + เมนูผู้ใช้ ทุกจอ | ตัวย่อบน avatar ใช้คำนำหน้าแทนชื่อ: "ผศ" (ผศ.ดร.ปรีชา), "อ." (อ.วิภา) | ควรเป็นอักษรแรกของชื่อ ("ปร", "วิ") — ใช้ `hasHonorific`/ตัดคำนำหน้าจาก `lib/ui/name.ts` ที่มีอยู่แล้ว | `final-noti-light-1440.png`, `final-usermenu-light-1440.png` | frontend-dev (`UserMenu.tsx`) |
| m5 | minor | `/app/admin` แท็บผู้ใช้/คำขอ | ป้ายขอบเขตซ้ำคำและปนอังกฤษ: "คณะ คณะวิทยาศาสตร์และเทคโนโลยีตัวอย่าง", "ผู้ดูแลระบบสูงสุด (university)" | ตัดคำนำหน้าประเภทเมื่อชื่อขึ้นต้นด้วยคำเดียวกัน · แปล scopeType เป็นไทย ("ทั้งมหาวิทยาลัย") | `final-admin-requests-light-1440.png`, `final-admin-users-light-1440.png` | frontend-dev (`admin/shared.tsx`) |
| m6 | minor | `/app/metrics` 1440 | หน้ายาว 10,728px: กราฟ 18 ใบ + ตารางค่าทุกตัวชี้วัดทุกปีกางหมด · ตัวอักษรในกราฟ 13px/400 เป็นตัวเล็กที่สุดในระบบ | ตารางค่าแยกเป็น `<details>` ต่อตัวชี้วัด (หรือกรองตามตัวชี้วัด) · ตัวอักษรกราฟ 14px | `final-metrics-light-1440.png` | frontend-dev (`metrics/page.tsx`, `TrendChart.tsx`) |
| m7 | minor | `/request-access` 1440 (ค้างจาก V1 m6) | แผงแบรนด์ด้านขวาอยู่กลางความสูงของฟอร์มยาว (~2,600px) จึงลอยอยู่กลางหน้า ไม่เห็นตอนเปิดหน้า | แผงขวา `sticky top-0 h-screen` | `final-request-error-light-1440.png` | frontend-dev (`AuthLayout.tsx`) |
| m8 | minor | `/invite` 390 · ชื่อยาวทั่วไป | หัวข้อ "ยินดีต้อนรับ อ.สมศรี ขยัน / สอน" ตัดกลางนามสกุล | ห่อชื่อด้วย `whitespace-nowrap` (ตกทั้งชื่อ) หรือ `text-balance` | `final-invite-light-390.png` | frontend-dev (`InviteAcceptForm.tsx`) |
| m9 | minor | `/app/review` 1440 | วันที่ส่ง "27 ต.ค. / 2569 / 02:19" และชื่อเจ้าของ "อ.วิภา / เขียน / รายงาน" ตก 3 บรรทัด ทำให้แถวสูง | คอลัมน์วันที่/เจ้าของ `whitespace-nowrap` หรือวันที่ 2 บรรทัด (วัน / เวลา) | `final-review-light-1440.png` | frontend-dev (`review/page.tsx`) |

ข้อสังเกต (ไม่นับเป็น finding):
- ปุ่ม `todo-access_requests` ข้อความ "ไปทำ" (qa ถามไว้ใน Q2d) — **ตัดสิน: ใช้ "ไปทำ" เหมือนทุกแถวถูกต้องแล้ว** ข้อความ "ดูคำขอเข้าใช้งาน" แสดงในปุ่ม "ทำงานถัดไป" อยู่แล้ว ความสม่ำเสมอของปุ่มในรายการสำคัญกว่า
- ขอบ tile KPI บนแดชบอร์ดเป็นขอบตกแต่ง (1.23 light / 1.52 dark) — tile ระบุได้ด้วยข้อความ+ไอคอน และสถานะกดใช้ `border-primary` จึงไม่ขัด 1.4.11
- การ์ด stepper บน section ที่ 390 มีที่ว่างใต้ข้อความ ~40px (เล็กน้อยมาก)

## ข้อเสนอให้ frontend-dev
1. (M1) ปรับตารางผู้ใช้: ย้ายชุด "เพิ่มบทบาท" + ปุ่ม "ระงับบัญชี" เข้าแผงที่เปิดจากปุ่ม "จัดการ" ต่อแถว (คง testid เดิมใน DOM ของแผง: `user-suspend-*`, `user-reactivate-*`, select เพิ่มบทบาท) · คอลัมน์ผู้ใช้ `min-w-[14rem]` + อีเมล `truncate` + `title` · ปุ่มทั้งหมด `whitespace-nowrap` · แท็บ admin ที่ <768 `overflow-x-auto flex-nowrap` → แจ้ง qa-tester ถ้า selector ใน `onboarding.spec.ts` ต้องเปิดแผงก่อน
2. (m1, m2, m8, m9) ใส่ `whitespace-nowrap` ให้ป้ายสั้น/ชื่อ/วันที่ — แก้ได้ในรอบเดียว
3. (m4, m5) ใช้ `lib/ui/name.ts` ตัดคำนำหน้าก่อนทำตัวย่อ · แก้ label ขอบเขตใน `admin/shared.tsx`
4. (m6, m7) ปรับเมื่อมีเวลา; m3 รอ architect
5. สคริปต์ `.agents/playtest/final-ui/shoot.mjs` + `checks.mjs` ใช้ตรวจซ้ำหลังแก้ได้ทันที (`ONLY=light-1440`) · เสนอ qa-tester ย้ายเข้า e2e: (ก) ปุ่มใน `users-table` สูง ≤ 48px (ไม่ตกบรรทัด) และ select ไม่ตัดค่า (`scrollWidth<=clientWidth`) (ข) axe-core 0 violations บน 5 หน้า × 2 ธีม (ค) ไม่มีกฎ `:hover` ที่มี transform

## ภาพแนะนำให้เจ้าของดู
1. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-home-chair1-light-1440.png` — หน้าหลักประธานหลักสูตร: เห็นทันทีว่าวันนี้ต้องทำอะไร
2. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-home-chair1-dark-1440.png` — โหมดมืดแบบน้ำตาลถ่าน (ไม่ดำ)
3. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-noti-light-1440.png` — กดกระดิ่งแล้วเห็นรายการแจ้งเตือน แยกวันนี้/เมื่อวาน
4. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-dashboard-light-1440.png` — แดชบอร์ดรอบประเมิน (KPI + heatmap + ขั้นตอนถัดไป)
5. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-section-light-1440.png` — หน้าเขียน SAR
6. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-admin-requests-light-1440.png` — ผู้ดูแลอนุมัติคำขอเข้าใช้งาน
7. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-admin-users-light-1440.png` — ตารางผู้ใช้ (จุดที่ยังต้องแก้ M1)
8. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-scale125-dashboard-light-390.png` — มือถือ + ตัวอักษร "ใหญ่มาก" 125% ไม่มีอะไรพัง


---

# Re-check หลังรอบแก้ (R2-F10 / F11 / F12, R2-B4 / B5) — 2026-10-27

Verdict: **ISSUES** — blocker 0 · **major 1 (ใหม่ — regression จาก m9)** · minor 6 (ใหม่ 5 + m6 ค้าง)
M1 ปิดแล้วจริง และ minor เดิม 8/9 ปิด แต่การแก้ m9 (`whitespace-nowrap` คอลัมน์วันที่/เจ้าของ) ทำให้ตาราง `/app/review` กว้างเกินกรอบ ปุ่ม "ส่งกลับ" (และที่ 1280 ทั้ง "อนุมัติ"/"เปิดอ่าน") ถูกซ่อนไว้นอกกรอบ

- server `http://localhost:3960` (production build ของ HEAD ที่ orchestrator เปิดไว้ — ไม่ได้ build/start/kill; ไม่ใช้ :3950) · HEAD ขณะตรวจ `58238e4` · Playwright chromium th-TH · ไม่มี HTTP 5xx / pageerror
- ถ่ายใหม่: light/dark × 1440/390 ทุกหน้า (ทับชื่อเดิม) + สถานะใหม่ 10 ชุด + 125% / text-spacing / 360px (`checks.mjs`) · ภาพ 768 **ไม่ได้ถ่ายใหม่** (ยังเป็นของ build รอบแรก — ดูหมายเหตุใน INDEX)
- สคริปต์: `shoot.mjs` (เพิ่มขั้น admin ค้นหา/แผงจัดการ/ScopeSelect, fqa1, ข้อที่ล็อก, เหตุผลส่งกลับ, ภาษาทั้งระบบ + ตัววัด M1), `checks.mjs`, `recheck-misc.mjs` (sticky/แท็บข้าง/ปุ่ม 390/ภาษาข้ามแท็บ), `recheck-review.mjs` (ตาราง review หลายความกว้าง) · ผลดิบ `stats-{light,dark}-{1440,390}.json`, `checks.json`, `recheck-misc.json`

## สรุปฟอนต์ที่ใช้จริง (re-check, light-1440, 50 หน้า/สถานะ)
ไม่เปลี่ยนจากรอบแรก: โหลดเฉพาะ `IBM Plex Sans Thai Looped` 400/500/600 (+ fallback metric ของ next/font) ทุกหน้าทุกธีม · ไม่มีฟอนต์ระบบหลุด

| font-family | size | weight | line-height | จำนวน element |
|---|---|---|---|---|
| IBM Plex Sans Thai Looped | 16px | 400 / 500 / 600 | 1.70 | 1378 / 978 / 579 |
| 〃 | 14px | 400 / 500 / 600 | 1.60 | 466 / 263 / 64 |
| 〃 | 13px | 500 | 1.50 | 546 (badge) |
| 〃 | 13px | 400 | 1.70 | 290 (ป้ายกราฟ SVG — m6) |
| 〃 | 18px / 20px / 24px | 600 | 1.60 / 1.50 / 1.40 | 92 / 43 / 48 |
| ui-monospace | 16px / 14px | 400 | 1.70 / 1.60 | 51 / 32 |

## ผลวัดซ้ำ (regression)
| รายการ | ผล |
|---|---|
| contrast ข้อความ (~20,000 element × 4 ชุด) | ต่ำกว่าเกณฑ์ = 0 · ต่ำสุด light 4.81 / dark 5.45 (ตัวย่อ avatar) เท่าเดิม |
| h-scroll ทั้งหน้า | 0 ทุกหน้า × 4 ชุด (ตาราง review ล้นภายใน wrapper ของตัวเอง — N1) |
| ตัวอักษร <13px / line-height ไทย <1.35 / uppercase บนไทย | 0 / 0 / 0 |
| 125% (6 หน้า × 1440/390 × 2 ธีม), text-spacing, 360×800 | ไม่มี h-scroll / ข้อความตัด / ปุ่มล้น |
| axe-core 5 หน้า × 2 ธีม | violations 0 (incomplete เดิม: aria-valid-attr-value 1, color-contrast พื้นซ้อน) |
| focus ring (Tab 20 × 5 หน้า × 2 ธีม) | ไม่มีตัวผิด · ต่ำสุด 5.12 |
| กฎ hover ยก/เลื่อน · reduced motion | 0 · 0 |
| ขอบ control <3 | เฉพาะ tile KPI แดชบอร์ด (ขอบตกแต่ง — ยกเว้นเหมือนรอบแรก) |

## สถานะ finding เดิม
| # | สถานะ | หลักฐาน (ค่าที่วัด) |
|---|---|---|
| **M1** ตารางผู้ใช้ | **ปิด** | 1440: 4 คอลัมน์ แถวสูงเท่ากัน 97px · อีเมลบรรทัดเดียวไม่ตัด (10/10) · ปุ่มตกบรรทัด 0 · select ตัดค่า 0 · ปุ่ม "จัดการ" ปุ่มเดียวต่อแถว เปิดแผง 3 ส่วน · แท็บแถวเดียว · 390: หน้าสูง **3,453px (เดิม 5,258)** · ปุ่ม 99×44 · ทุก control ในแผง ≥44 · `final-admin-users-*`, `final-admin-panel-*`, `final-admin-panel-assessor-*`, `final-admin-search-*` |
| m1 แท็บข้าง "ความเห็น" | ปิด | 3 แท็บสูง 44px เท่ากัน |
| m2 stepper "คณบดีอนุมัติ" | ปิด | บรรทัดเดียว `final-dashboard-*-1440` |
| m3 วันที่ ISO ในแจ้งเตือน | ปิด | "ข้อ 1.5 ใกล้ถึงกำหนดส่ง (1 พ.ย. 2569)" `final-noti-*` |
| m4 ตัวย่อ avatar | ปิด | "ปรี", "วิ", "กม", "สม" (ไม่ใช่ "ผศ"/"อ.") |
| m5 ป้ายขอบเขตซ้ำ/อังกฤษ | ปิด (มีข้อใหม่ N3) | "คณะวิทยาศาสตร์และเทคโนโลยีตัวอย่าง" ไม่ซ้ำ · `final-admin-requests-*` |
| m6 metrics ยาว / ป้ายกราฟ 13px | **ยังค้าง** (frontend-dev เลื่อนไว้ — คงเป็น minor) | 290 element 13px/400 |
| m7 แผงแบรนด์ลอยกลาง | ปิด | `/request-access` เลื่อน 813px แผงยังอยู่ top 0 สูง 900 (sticky) |
| m8 ชื่อตัดกลางนามสกุล | ปิด | 390: "ยินดีต้อนรับ / อ.สมศรี ขยันสอน" `final-invite-light-390` |
| m9 review วันที่/เจ้าของ 3 บรรทัด | ปิด แต่ **ทำให้เกิด N1** | วันที่/ชื่อบรรทัดเดียวแล้ว |

## หน้าที่เปลี่ยนในรอบแก้ — ตรวจแล้ว
- ScopeSelect (คำขอ / เพิ่มผู้ใช้ / แผง): help "บทบาทนี้ใช้ขอบเขตระดับ…" 14px, option ว่าง "— เลือกขอบเขต —" ในคำขอ, เปลี่ยนเป็นกรรมการแล้วเหลือเฉพาะรอบ — ผ่าน (ดู N3)
- /invite ป้ายสาธิต: กล่อง info ทุกสถานะ อ่านง่ายทั้ง 2 ธีม — ผ่าน
- login / request-access / invite แผงแบรนด์ sticky — ผ่าน
- section ข้อที่อนุมัติแล้ว: ไม่มี × / ชุดผูก, กล่องล็อกพร้อมไอคอน + เหตุผล — ผ่าน `final-section-locked-*`
- ฟอร์มเพิ่มหลักฐาน: option ล็อกมีป้าย "ล็อกแล้ว" + เหตุผล, คำอธิบายใต้ช่องมีไอคอนกุญแจ — ผ่าน (ดู N4) `final-evidence-form-locked-*`
- รายละเอียดหลักฐาน: "ข้อ 1.1 อนุมัติแล้ว — เลิกผูกไม่ได้" — ผ่าน (ดู N2) `final-evidence-detail-locked-*`
- หน้ารอบ: กล่องเหตุผลส่งกลับ (ใคร/เมื่อไร/เหตุผล + ขั้น 1-2-3) — ผ่าน `final-dashboard-return-*` · fqa1 เห็นปุ่ม "มอบหมายกรรมการ" + หน้า assign มีคำอธิบายแทน "ไม่มีสิทธิ์" — ผ่าน `final-dashboard-fqa-*`, `final-assign-fqa-*`
- ภาษาค่าเดียว: สลับ EN ที่ /app แล้วไป /app/evidence ยังเป็น EN, แท็บอื่นตามทันที, key เก่า `eduflow_lang_pages` ถูกลบ — ผ่าน (ดู N5) `final-lang-global-*`

## Findings ใหม่
| # | severity | หน้า/breakpoint | ปัญหา | ค่าที่เจอ vs ค่าที่ควรเป็น | screenshot | ผู้รับผิดชอบ |
|---|---|---|---|---|---|---|
| N1 | **major** | `/app/review` 1440 / 1280 / 1024 / 768 (ทั้ง 2 ธีม) | หลังแก้ m9 ตารางกว้างขั้นต่ำ 1,177px เกินกรอบ → ปุ่มท้ายแถวถูกซ่อนในส่วนที่ต้องเลื่อนแนวนอน ไม่มีสัญญาณให้เลื่อน | 1440: wrapper 1,094 / เนื้อ 1,177 → "ส่งกลับ" เห็น 36/101px · 1280: wrapper 934 → "อนุมัติ" เห็น 45/70px, "เปิดอ่าน"/"ส่งกลับ" มองไม่เห็น · 1024/768: ไม่เห็นปุ่มใดเลย · ≥1600 ปกติ · ควร: ปุ่มทั้ง 3 เห็นครบที่ ≥768 เช่น ย้ายปุ่มลงใต้ "สรุป", วันที่ 2 บรรทัด (วัน / เวลา), nowrap เฉพาะ ≥1536 หรือคอลัมน์ปุ่ม `sticky right-0` | `final-review-light-1440.png`, `final-review-light-1280.png` | frontend-dev (`app/app/review/page.tsx`) |
| N2 | minor | `/app/evidence/[id]` 1440 | ปุ่มกลับ "คลังหลัก / ฐาน" ตก 2 บรรทัด | ควรบรรทัดเดียว `whitespace-nowrap` เหมือนปุ่ม "แดชบอร์ดรอบ" (P10) | `final-evidence-detail-locked-dark-1440.png` | frontend-dev (`app/app/evidence/[id]/page.tsx`) |
| N3 | minor | แผงจัดการ / ฟอร์มเพิ่มผู้ใช้ — ขอบเขตของกรรมการ | ตัวเลือกรอบแสดงรหัสภายใน "รอบ 2569 (cycle-demo-2569)" | ขัด P4 "ป้ายขอบเขตไม่มีรหัสอังกฤษ" · ควร "รอบ 2569 · CS-B-69" | `final-admin-panel-assessor-light-1440.png` | frontend-dev (`admin/shared.tsx`) |
| N4 | minor | ฟอร์มเพิ่มหลักฐาน 390 | ชื่อข้อใน picker ตัดเหลือ ~12 ตัวอักษร ("ผลการเรียนรู้ที่คาด…") ข้อ 1.1–1.3 ดูเหมือนกัน เพราะป้าย "ล็อกแล้ว" กินที่ | ควร line-clamp 2 บรรทัด หรือย้ายป้ายล็อกไปบรรทัดเหตุผล ("อนุมัติแล้ว · ล็อกแล้ว") ที่ <560 | `final-evidence-form-locked-dark-390.png` | frontend-dev (`RequirementPicker.tsx`) |
| N5 | minor (a11y, มีมาแต่เดิม) | ทุกหน้าเมื่อเลือก English | `<html lang>` คงเป็น "th" แม้ทั้งหน้าเป็นอังกฤษ (WCAG 3.1.1) | ควรตั้ง `document.documentElement.lang` ตามภาษาใน `LangContext` | `final-lang-global-light-1440.png` | frontend-dev (`context/LangContext.tsx`) |
| N6 | minor | `/app/admin` 390 | แท็บที่ 3 ถูกตัดเหลือ "Audi" ที่ขอบจอ (เลื่อนได้แต่ไม่มีเงา/ลูกศรบอก) | แถบ 406 / 358px · ควรมี fade ขอบขวา หรือย่อป้ายให้พอดี 358px | `final-admin-users-light-390.png` | frontend-dev (`app/app/admin/page.tsx`) |

ข้อสังเกต (ไม่นับ): ปุ่ม "จัดการ" ที่ 1440 สูง 41px (desktop, ผ่าน 2.5.8) · การตัดบรรทัดไทย "หลัก|ฐาน", "ผู้|ดูแล" ในกล่องข้อความยาวเป็นการตัดของเบราว์เซอร์ที่ขอบคำประสม ยอมรับได้ · บรรทัดใต้หัวหน้ารอบ "…· วัน / ประเมิน 24 ก.พ. 2570" ตกบรรทัด (มีมาแต่เดิม)

## ข้อเสนอให้ frontend-dev (re-check)
1. **N1 ก่อน** (บล็อกเฟส 7): ทำให้ปุ่ม 3 ปุ่มของ `/app/review` เห็นครบที่ 768–1599 · ตรวจด้วย `BASE=http://localhost:3960 node .agents/playtest/final-ui/recheck-review.mjs` (ต้องได้ `visibleW == w` ทุกปุ่มทุกความกว้าง)
2. N2, N3, N6 แก้ได้ในรอบเดียว (nowrap / label / fade) · N4, N5 เมื่อมีเวลา
3. เสนอ qa-tester ย้ายเข้า e2e: (ก) `/app/review` ที่ 1280×900 ปุ่มอนุมัติ/เปิดอ่าน/ส่งกลับ อยู่ในกรอบที่มองเห็นของ wrapper (ข) `user-manage-*` สูง ≥44 ที่ 390 และไม่มีปุ่มในตารางผู้ใช้สูง >48 ที่ 1440

## ภาพแนะนำให้เจ้าของดู (ชุดสุดท้าย)
1. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-admin-users-light-1440.png` — ตารางผู้ใช้ใหม่ (M1 ปิด)
2. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-admin-panel-assessor-light-1440.png` — แผงจัดการ + ขอบเขตตามบทบาท
3. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-admin-panel-dark-390.png` — แผงจัดการบนมือถือ โหมดมืด
4. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-dashboard-return-light-1440.png` — กล่องเหตุผลส่งกลับ + ขั้นตอนต่อไป
5. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-section-locked-light-1440.png` — ข้อที่อนุมัติแล้วล็อกหลักฐาน
6. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-evidence-form-locked-light-1440.png` — ฟอร์มหลักฐานแสดงข้อที่ล็อก
7. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-noti-light-1440.png` — แจ้งเตือนวันที่ พ.ศ. + avatar ใหม่
8. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\final-review-light-1280.png` — จุดที่ยังต้องแก้ (N1 ปุ่มถูกซ่อน)
