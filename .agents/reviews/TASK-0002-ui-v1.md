# TASK-0002 — V1 ด่านตรวจทิศทางรอบ 2 (earth / friendly) — ui-inspector

Verdict: **PASS พร้อม minor 10 ข้อ** (blocker 0 · major 0 · minor 10) → R2-F3–F6 เริ่มได้ ข้อ m1 (แถบน้ำเงินบนเมนู) ควรแก้ก่อนส่งภาพชุดสุดท้ายให้เจ้าของ

- วันที่ 2026-10-26 · HEAD `7af86af` · production build (`.next/BUILD_ID` ใหม่กว่า source ทุกไฟล์ — ตรวจแล้ว) + `next start -p 3930` + Playwright (chromium) · locale th-TH
- 4 ชุด: light/dark × 1440×900 / 390×844 · dark ใช้ `aunqa_theme=dark` ส่วน light ใช้ค่าเริ่มต้น
- ภาพ 100 ไฟล์ `.agents/screenshots/TASK-0002/v1-*` · สถิติดิบ `.agents/playtest/v1/v1-stats.json`, `v1-extra.json` · สคริปต์ `.agents/playtest/v1/{shoot,extra}.mjs`
- ข้อมูลที่ใช้: แจ้งเตือนของ staff1 = ของจริง (chair1 มอบข้อ 3.6 ผ่านหน้า assign และ deadline reminder ที่ระบบสร้าง) + **ฉีดแถวตัวอย่าง 5 แถว** (changes_requested, comment, approved เมื่อวาน, deadline, cycle_status 5 วันก่อน) ลง `aunqa_notifications` เพื่อให้เห็นครบทั้ง 3 กลุ่มวัน · panel ว่างใช้ uadmin (staff1 มี deadline reminder ที่ระบบสร้างใหม่ทุกครั้งจึงไม่ว่าง) · คำเชิญสร้างแถว `invited` และ `Invitation` (sha256 `aunqa-invite::token`) ตรงรูปแบบ `onboarding.store` เพราะ admin ยังไม่มีปุ่มเชิญ (R2-F6) · คำขอเข้าใช้งานส่งผ่านฟอร์มจริง (โดเมน `sample-uni.example`)
- Study: อ่าน `standards/ui-ux.md` ข้อ 1.1, 2, 3, 4.3, 5.2/5.3 และ checklist ข้อ 9 (ใช้ข้อ 1, 2, 3, 5, 6, 7 ในรอบนี้) + friendly-spec §F0–F7, F9–F10 + earth-tokens §E1–E4

## สรุปฟอนต์ที่ใช้จริง (รวมทุกหน้าที่ light-1440 นับ element ที่มีข้อความตรง)
ฟอนต์ที่โหลดจริงมีชุดเดียวคือ `IBM Plex Sans Thai Looped` น้ำหนัก 400/500/600 (next/font self-host) · body = `IBM Plex Sans Thai Looped, …Fallback, "Leelawadee UI", Tahoma, sans-serif` · ไม่มี Sarabun/Cormorant/DM Sans · ไม่มีข้อความไทยที่ใช้ uppercase หรือ letter-spacing กว้าง

| font-family | size | weight | line-height | จำนวน |
|---|---|---|---|---|
| IBM Plex Sans Thai Looped | 16px | 500 | 1.70 | 132 |
| 〃 | 16px | 400 | 1.70 | 91 |
| 〃 | 14px | 400 | 1.60 | 74 |
| 〃 | 16px | 600 | 1.70 | 73 |
| 〃 | 18px | 400 | 1.60 | 25 |
| 〃 | 14px | 500 | 1.60 | 24 |
| 〃 | 24px | 600 | 1.40 | 20 (h1) |
| 〃 | 13px | 500 | 1.50 | 20 (pill สถานะ, "ใหม่", ตัวนับ) |
| 〃 | 18px | 600 | 1.60 | 20 |
| 〃 | 20px | 600 | 1.50 | 14 (คำทักทาย, h2) |
| 〃 | 30px / 48px | 600 | 1.35 | 6 (หัว landing) |

## ผลวัดรวม (ทั้ง 4 ชุด, 50+ หน้าหรือสถานะ)
- **h-scroll:** ไม่มีเลยทุกหน้าทุกจอ (`scrollWidth = innerWidth`) · เมนูผู้ใช้ที่ 390 วางที่ x=58–378 ไม่ล้น · sheet แจ้งเตือนที่ 390 = 390×844 เต็มจอ
- **contrast (computed, ผสมพื้นจริง):** ไม่มีคู่ไหนต่ำกว่าเกณฑ์ · ต่ำสุด light 4.81 (ตัวย่อบน avatar clay/clay-muted ซึ่งเป็นคู่ #41 ตามตาราง) · pill "ใหม่" 5.08 (light) / 5.72 (dark) · dark ต่ำสุด 5.45
- **โหมดมืด:** body `rgb(38,33,28)` = `#26211C` (ไม่ใช่ดำ) · ตัวอักษรเป็นครีม ไม่มีพื้นขาวหลงในหน้าที่ตรวจ · ปุ่มหลักใน dark เป็นเสจอ่อนกับตัวอักษรเข้ม
- **ขนาดตัวอักษร < 14px:** มีแค่ 13px ใน pill สถานะ, "ใหม่", ตัวนับ และ badge บน landing ซึ่งอยู่ในข้อยกเว้น ui-ux 1.1 (badge/ป้ายสั้น ≥13) · ไม่มีเนื้อหาที่เล็กกว่า 14px
- **line-height ไทย:** เนื้อหา 1.6–1.7 · หัวข้อ 1.35–1.5 · จากการขยายดู crop 2x (`v1-crop-*`) ไม่พบสระบนหรือวรรณยุกต์ถูกตัด
- **target:** ปุ่ม/ช่องกรอกหลักสูง ≥44 · ปุ่ม compact "ไปทำ" 91×41 และ "อ่านทั้งหมด" 137×41 (desktop ≥40 ตาม AC-05) · ข้อยกเว้นที่เหลือดู m9
- **grayscale pill "ใหม่":** แยกรายการที่ยังไม่อ่านได้ชัดทั้งสองธีม เพราะมีคำ "ใหม่", ตัวหนา 600 และจุดท้ายแถว (`v1-noti-gray-*`) ✓
- **ลูกเล่น:** ไม่มีทัวร์ ไม่มี confetti และไม่มี animation วน
- **AC-21/22/23 (ด้วยสายตา):** topbar ที่ desktop ทุกปุ่มมีป้ายข้อความ · ปุ่มภาษาเป็น segmented `ไทย | English` และช่องที่เลือกเห็นชัด · เมนูผู้ใช้มีป้าย ปกติ/ใหญ่/ใหญ่มาก และ สว่าง/มืด/ตามเครื่อง โดยไม่ตกบรรทัด

## ประเมินแบบผู้ใช้อาจารย์/ผู้บริหารวัย 45–60+ (เทียบ v0)
| ประเด็นที่เจ้าของไม่ชอบในรอบแรก | v1 | ผล |
|---|---|---|
| ปุ่มบนแถบบนเป็นไอคอนเดี่ยว เดาไม่ออก | มีข้อความครบ ("แจ้งเตือน", ชื่อ+บทบาท, ไทย/English) | ✓ ชัดเจนขึ้นมาก |
| การแสดงผลและออกจากระบบซ่อนท้ายเมนู และ popover ล้น | อยู่ในเมนูชื่อตัวเอง เป็นสัดส่วน ป้ายเป็นคำ | ✓ (`v1-cmp-prefs-vs-usermenu-light-1440.png`) |
| กล่องแจ้งเตือนว่างกินพื้นที่ครึ่งหน้า | ย้ายเข้า panel ทำให้หน้าหลักเหลือ "ทักทาย, ทำงานถัดไป, สิ่งที่ต้องทำ" | ✓ เห็นทันทีว่าต้องทำอะไรต่อ |
| ดำสนิทมองยาก | warm dim เป็นน้ำตาลถ่าน อ่านสบาย และค่าเริ่มต้นเป็นสว่าง | ✓ |
| สีเย็นแข็ง | ทราย + เสจ + ดินเผา มุมโค้งและเว้นที่หายใจมากขึ้น | ✓ ดูอบอุ่นและเป็นทางการพอดี |
| login | ฟอร์มเดียวชัดเจน มีทาง "ขอเข้าใช้งาน" และ "มีรหัสเชิญ" ที่มีข้อความ | ✓ |

สรุปความรู้สึก: ทิศทางรอบ 2 ตอบโจทย์ "เป็นมิตร" ชัดเจน ภาษาบนจอเป็นภาษาคน ทุกปุ่มบอกว่ากดแล้วได้อะไร และมีปุ่มหลักเพียงปุ่มเดียวต่อพื้นที่ จุดที่ยังทำให้สะดุดเป็นเรื่องข้อความและรายละเอียดเล็กตาม m2–m4

## Findings
| # | severity | หน้า/breakpoint | ปัญหา | ค่าที่เจอ vs ค่าที่ควรเป็น | screenshot |
|---|---|---|---|---|---|
| m1 | minor (ควรแก้ก่อนส่งภาพสุดท้าย) | shell ทุกหน้า ทุกจอ ทั้ง 2 ธีม (sidebar + drawer) | เมนูที่เลือกอยู่มี**แถบซ้ายสีน้ำเงิน indigo** ค้างจากรอบแรก | `::before` w=4px bg=`rgb(59,79,160)` (#3B4FA0) มาจาก `app/legacy.css:401-405` `.aq-nav-item[aria-current=page]::before` vs friendly-spec §F1 "ไม่มีแถบซ้ายแล้ว" และสีต้องอยู่ใน earth token | `v1-crop-sidebar-dark.png`, `v1-crop-sidebar-light.png`, `v1-drawer-light-390.png` |
| m2 | minor (ช่องว่างในสเปก → architect/F1) | หน้าหลัก uadmin ทุกจอ | มีคำขอเข้าใช้งานรออนุมัติ 1 รายการ (ตัวนับบนเมนูผู้ดูแลระบบ = 1, กระดิ่ง = 1) แต่การ์ด "สิ่งที่ต้องทำ" บอก "ตอนนี้ไม่มีงานรอท่าน · ไม่มีงานค้าง" | ควรมี todo "อนุมัติคำขอเข้าใช้งาน N รายการ" → `/app/admin?tab=requests` (ไม่ให้ผู้ดูแลพลาดงานหลักของ onboarding) | `v1-home-uadmin-light-1440.png` |
| m3 | minor (ข้อความ) | การ์ดทักทาย ทุก role | ประโยค "ไม่มีงานเร่งด่วน — ทำต่อจากที่ค้างไว้ได้เลย" ขัดกับ "ไม่มีงานค้าง" ในการ์ดถัดไป (uadmin) และ staff1 ที่มีกำหนดส่งใน 5 วันก็ยังขึ้น "ไม่มีงานเร่งด่วน" | ถ้า todo = 0 → "วันนี้ไม่มีงานค้าง" · ถ้ามีกำหนดส่ง ≤7 วันควรนับเป็นเร่งด่วนหรือบอกวันที่ | `v1-home-uadmin-light-1440.png`, `v1-home-staff1-light-1440.png` |
| m4 | minor (ข้อความ → architect §F7) | `/invite` (token ถูกต้อง) | หัวข้อขึ้น "ยินดีต้อนรับ คุณอ.สมศรี ขยันสอน" ซึ่งเป็นคำว่า "คุณ" ติดคำนำหน้าวิชาการ ผู้ใช้จริงจะเห็น "คุณผศ.ดร.…" | ใช้ "ยินดีต้อนรับ {fullName}" หรือตัด "คุณ" เมื่อชื่อขึ้นต้นด้วยคำนำหน้า | `v1-invite-light-1440.png` |
| m5 | minor | landing `/` ที่ 390 | แถบบนแตกเป็น 2 แถว (แบรนด์+ภาษา / แสดงผล+☰) · ปุ่ม ☰ เป็นไอคอนเดี่ยวไม่มีคำว่า "เมนู" ซึ่งต่างจากใน /app · ปุ่มเข้าสู่ระบบซ่อนอยู่ใน ☰ | แถวเดียว `[แบรนด์][ไทย│EN][☰ เมนู]` แล้วย้าย "แสดงผล" เข้าแผงเมนู หรือคงปุ่มเข้าสู่ระบบไว้นอกเมนู | `v1-landing-fold-light-390.png`, `v1-landing-menu-light-390.png` |
| m6 | minor | `/request-access` error ทั้ง 2 จอ | ฟอร์มยาว (≈2,000px ที่ 1440) เมื่อส่งแล้วมี error 7 จุด แต่ไม่มีสรุป error ด้านบน (focus ไปที่ `ra-name` แล้ว ✓) · แผงแบรนด์ด้านขวาลอยอยู่กลางหน้า | เพิ่ม InlineMessage สรุป "กรอกไม่ครบ N ช่อง" พร้อมลิงก์ไปแต่ละช่อง (GOV.UK error summary) · แผงขวาใช้ `sticky top` | `v1-request-error-light-1440.png`, `v1-request-error-light-390.png` |
| m7 | minor | sheet แจ้งเตือน 390 (ว่าง / อ่านหมดแล้ว) | "อ่านทั้งหมด" ตอน disabled มีพื้นเทาทึบ จึงดูเด่นกว่าปุ่ม "ปิด" ที่ใช้ได้ (ชัดที่สุดใน dark) | disabled ของ ghost ไม่ควรมีพื้น ใช้แค่สีตัวอักษร muted | `v1-noti-empty-dark-390.png` |
| m8 | minor | เมนูผู้ใช้ ทุกจอ | อีเมลตัดบรรทัดกลางโดเมน "chair.cs@sample / -uni.example" | ตัดที่ `@` (`<wbr>`) หรือ truncate แล้วมี `title` | `v1-crop-usermenu-light.png` |
| m9 | minor | หน้าหลัก staff1 (ตาราง "ข้อที่ได้รับมอบหมาย") และแบรนด์ | ลิงก์รหัสข้อ "3.6" 24×27 · ลิงก์แบรนด์ 187×32 | ผ่าน AA 24px แต่ต่ำกว่าเกณฑ์โปรเจกต์ 44 → ให้ทั้งเซลล์หรือทั้งแถวเป็นพื้นที่กด หรือเพิ่ม `py-2` (ตาราง = งาน F3 ถ้าเป็นตารางร่วม) | `v1-home-staff1-light-1440.png` |
| m10 | minor | หน้าหลัก chair1 | `details` "งานอื่น ๆ อีก 1 รายการ" เปิดไว้ตั้งแต่แรก (`open={rest.length<=5}`) จึงมีแถวหัวข้อเพิ่มมาเพื่อซ่อนงานเพียง 1 รายการ | ถ้าเหลือ ≤2 รายการให้แสดงตรง ๆ โดยไม่มี details | `v1-home-chair1-light-1440.png` |

ข้อสังเกตที่ไม่นับเป็น finding: (ก) ภาพ fullPage ของ /app ที่ sidebar พื้นขาดตอนท้ายเกิดจาก sticky `h-screen` ตอนจับภาพ ไม่ใช่บั๊ก (ข) จุดสถานะบน landing แยกด้วยสีอย่างเดียว แต่เป็นภาพตกแต่งเดโม่ที่มีตัวเลขสรุปอยู่ข้าง ๆ (AC-07 ตรวจในเฟส 7) (ค) หน้าทำงานอื่นยังเป็นสไตล์เดิม (R2-F3–F6)

## ข้อเสนอให้ frontend-dev
1. (m1) ใน `AppSidebar.tsx` ปิด pseudo ของ legacy เช่นเพิ่ม `before:hidden` ใน className ของ `aq-nav-item` (หรือ `aria-[current=page]:before:content-none`) — แก้ 1 จุด ไม่ต้องรอ S6
2. (m2, m3) F1 + architect: เพิ่ม todo kind "คำขอเข้าใช้งาน" ให้ผู้มี `user.manage` และปรับประโยคสรุปในการ์ดทักทายตาม m3
3. (m4) architect แก้ข้อความ §F7 แล้ว F2 ปรับ `InviteAcceptForm`
4. (m5) F2/architect: จัดแถบบน landing ที่ <768 ให้เป็นแถวเดียว และให้ปุ่มเมนูมีคำว่า "เมนู" ตามหลัก AC-21
5. (m6–m8, m10) ปรับรายละเอียดเล็กในรอบเดียวกับ F2/F1 ได้
6. สคริปต์ `.agents/playtest/v1/shoot.mjs` ใช้ซ้ำในเฟส 7 ได้ (เพิ่มหน้า F3–F6) · qa-tester ย้ายเช็ก "active nav ไม่มี `::before` ที่มีสี" และ "ไม่มีสี `#3B4FA0` ใน computed style ของ shell" เข้า e2e ได้

## ภาพแนะนำให้เจ้าของดู
1. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-cmp-app-light-1440.png` — หน้าหลักก่อน/หลัง (สว่าง)
2. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-cmp-prefs-vs-usermenu-light-1440.png` — การแสดงผลและออกจากระบบ ก่อน/หลัง
3. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-cmp-app-dark-1440.png` — โหมดมืด ก่อน (ดำ) / หลัง (warm dim)
4. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-noti-light-1440.png` — panel แจ้งเตือน (มีรายการ)
5. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-noti-light-390.png` — แจ้งเตือนบนมือถือ (sheet)
6. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-usermenu-light-390.png` — เมนูผู้ใช้บนมือถือ
7. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-login-light-1440.png` — หน้าเข้าสู่ระบบใหม่
8. `C:\Users\User\Documents\GitHub\project mockup\.agents\screenshots\TASK-0002\v1-invite-light-1440.png` — รับคำเชิญ ตั้งรหัสผ่าน

## ดัชนีภาพ (ชื่อ `v1-<หน้า>-<theme>-<1440|390>.png`)
shell, shell-uadmin, usermenu, drawer (390), noti, noti-empty, noti-gray, home-chair1, home-staff1, home-uadmin, landing, landing-fold, landing-display, landing-menu (390), login, login-display, login-error, request, request-error, request-filled/request-success (1440), invite-empty, invite-invalid, invite · crop 2x: crop-topbar/sidebar/usermenu-{light,dark} · เทียบ v0/v1: cmp-app-light-1440, cmp-app-dark-1440, cmp-prefs-vs-usermenu-light-1440, cmp-login-light-1440, cmp-shell-light-390, cmp-topbar-light
