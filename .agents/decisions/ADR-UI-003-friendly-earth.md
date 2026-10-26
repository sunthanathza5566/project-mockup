# ADR-UI-003 — UI แบบเป็นมิตร โทน Earth (light เป็นค่าเริ่มต้น, dark แบบ warm dim) + shell ใหม่ + แจ้งเตือนแบบ panel

- **สถานะ:** Accepted — OWNER APPROVED: 2026-10-26 (TASK-0002 "รอบ 2": ทำได้เลยไม่ต้องขออนุมัติแผน) · การตัดสินใจย่อยตามที่เจ้าของมอบให้ orchestrator (ข้อ 1–7 ในคำสั่ง) — architect ยืนยันทุกข้อ ไม่มีข้อที่เห็นต่าง
- **วันที่:** 2026-10-26 · **ผู้เขียน:** architect · **งาน:** TASK-0002 รอบ 2
- **แทนที่ (supersedes) บางส่วนของ ADR-UI-002:** ทางเลือก "สี accent = indigo" และ "Neutral = zinc" · D5 (ค่า token — โครงสร้าง HSL channel คงเดิม) · ธีมเริ่มต้น "ตามระบบ" (จุดอนุมัติข้อ 4 + saas-tokens §T12 `defaultTheme`) · saas-tokens §T1/§T2 · saas-spec §0 ย่อหน้าโหมดมืด, §P2, §P4, §P5, §C14 (DisplayPrefs), §C16 (LangToggle/ThemeToggle) · AC-01, AC-13, AC-16, AC-20 ของ TASK-0002
- **ยังมีผล (ไม่เปลี่ยน):** ADR-UI-002 D1–D4 (stack, config, component ที่ใช้/ไม่ใช้, ฟอนต์), D6 (กลยุทธ์ legacy.css → cutover), D7 (กติกาคง selector — ยกเว้นรายการย้าย/ลบใน friendly-spec §F11), D8, D9 สำหรับหน้าที่ไม่ได้ระบุใหม่ · saas-tokens §T3–T11 · saas-spec §H, §C1–C13, C15, C17, §P1, §P3, §P6–P21, §M
- **ไฟล์ประกอบ (บังคับเท่า ADR นี้):** `ui/earth-tokens.md` (§E — token hex light/dark + ตาราง contrast 42 คู่ × 2 ธีม) · `ui/friendly-spec.md` (§F — wireframe shell/topbar/เมนูผู้ใช้/ปุ่มภาษา, panel แจ้งเตือน desktop+mobile, หน้าหลัก, login, ขอเข้าใช้งาน, รับคำเชิญ, admin, testid contract, ข้อความใหม่) · ส่วนข้อมูล/API อยู่ใน **ADR-AUTH-001**
- **Study:** `standards/ui-ux.md` ข้อ 1.1 (ขนาด/line-height ไทย), 2 (target 44, focus), 3 (AA ทุกคู่, ห้ามขั้วสุด #000/#FFF), 4.1 (สถานะไม่พึ่งสี), 4.3 (dark ต้องตรวจคู่ใหม่ทั้งหมด), 5.2 (empty state), 6 (motion + reduced motion) · research `TASK-0002-r2.md` ข้อ 2–5 (R11–R24) · ภาพ V0 `.agents/screenshots/TASK-0002/v0-*` (app/prefs/login/dark)

## บริบท
เจ้าของดูภาพ V0 แล้ว: "สีสวยแต่รูปแบบ UI ไม่เป็นมิตรกับ User เลย" + ขอโทน earth, กังวลสีดำมองยาก (ค่าเริ่มต้น light), ปุ่มภาษาใหม่, จัดกลุ่ม control, burger ได้ถ้าจำเป็น, ลูกเล่นได้, notification เป็น panel + deep link, ระบบรับผู้ใช้ใหม่
สิ่งที่พบในภาพ (friendly-spec §F0): ปุ่มไอคอนเดี่ยวไม่มีป้ายบน topbar, ปุ่มภาษาเป็นปุ่มเดียวป้ายจาง, "การแสดงผล"/"ออกจากระบบ" ซ่อนท้าย sidebar และ popover ล้น/ปุ่มตกบรรทัด, `ก ก+ ก++` ไม่สื่อความ, กล่องแจ้งเตือนว่างกินครึ่งหน้าหลัก, เมนู 5 กลุ่มป้ายจาง, โหมดมืดเกือบดำ + การ์ดหน้าที่ยังไม่ย้ายเป็นขาวทำตัวอักษรหาย
งานที่มีแล้ว (คงไว้เป็นฐาน): S0 (Tailwind/shadcn/token/next-themes/ฟอนต์), Q0 (contrast/theme/AC-09 tests), S1 (component กลาง), S1.5 (Button ชนะ legacy), S2 (shell + public) — รอบ 2 **เปลี่ยนค่า token และโครง shell/หน้าที่ระบุ** ไม่เริ่มใหม่

## ทางเลือกที่พิจารณา
| เรื่อง | ทางเลือก | ตัดสิน | เหตุผล |
|---|---|---|---|
| Palette | E1 Clay&Olive (terracotta หลัก) / E2 Olive&Sand / E3 Sage&Clay / ผสม | **ผสม: neutrals ทรายของ E2 (light) + สีหลักเสจของ E3 + พื้นมืดอุ่นของ E1 + ดินเผาเป็นสีเน้น** | สีหลักเขียวไม่ชนความหมาย error (ต่างจาก E1); เสจดูสงบและ "เป็นมิตร" กว่าโอลีฟ; พื้นมืดน้ำตาลอุ่นตรงคำว่า warm dim กว่าเทาเขียวของ E3; ทุกคู่คำนวณผ่าน AA (earth-tokens §E2) |
| สีเน้นที่สอง (clay) | ไม่มี / ตกแต่งเท่านั้น / เป็นปุ่มรอง | **ตกแต่งเท่านั้น** (เฉดเข้มที่ผ่าน 4.5 ไว้แล้วเผื่อเป็นข้อความตกแต่ง) | ใกล้สี destructive — ถ้าใช้เป็นปุ่ม/สถานะจะสับสน (research ข้อควรระวัง E1) |
| ธีมเริ่มต้น | ตามระบบ / **สว่าง** | สว่าง (คงตัวเลือก "ตามเครื่อง") | เจ้าของสั่ง + Piepenbrock et al. 2013 (R17) |
| โหมดมืด | ดำ zinc เดิม / **warm dim** | warm dim (bg luminance 0.016, ตัวอักษรครีม ≈12.7:1) | เจ้าของกังวลดำมองยาก; Material แนะนำเทาเข้มแทนดำ (R16) |
| ปุ่มภาษา | ปุ่มเดียวสลับ / dropdown / **segmented 2 ปุ่ม autonym** | segmented `ไทย │ English` นอกเมนู ทุกขนาดจอ | เห็นทันทีว่าเลือกอะไร, ไม่ใช้ธง, `lang="en"` (R23, R24) · พฤติกรรม "จำแยกรายหน้า" เดิมคงไว้ (ไม่ได้ถูกขอให้เปลี่ยน) |
| ธีม/ขนาดตัวอักษร/ออกจากระบบ | ปุ่มไอคอนบน topbar / ท้าย sidebar / **เมนูผู้ใช้ (avatar) หัวข้อ "การแสดงผล"** | เมนูผู้ใช้ (login/landing ใช้ปุ่ม "การแสดงผล" ที่มีข้อความ) | ลดไอคอนเดี่ยวบน topbar เหลือ 0 (R18/R19); ผู้ใช้คาดหวังออกจากระบบในเมนูชื่อตัวเอง |
| เมนูหลัก desktop | burger / **แสดงตลอดพร้อมข้อความ** | แสดงตลอด ≥1024; burger + คำว่า "เมนู" เฉพาะ <1024 | NN/g: ซ่อนเมนูบน desktop ลดการค้นพบ >20% (R21) |
| กลุ่มเมนู | 5 กลุ่มเดิม / **≤4 กลุ่ม** | 4 กลุ่ม (รวม "อ้างอิง" เข้า "ข้อมูลหลักสูตร") | สแกนง่าย, ป้ายภาษาคน |
| แจ้งเตือน | กล่องในหน้าหลัก / หน้าแยก / **panel จากกระดิ่ง** | popover ≥768, sheet เต็มจอ <768 | PatternFly drawer (R11) + APG disclosure (R14) + WCAG 4.1.3 (R15); หน้าหลักโล่งขึ้น |
| ปลายทางแจ้งเตือน | href ใน data / **target เชิงความหมาย → frontend map** | ADR-AUTH-001 A6 | กัน open redirect, route เปลี่ยนได้ |
| หน้าหลัก | การ์ด todo 3 ใบ + กล่องแจ้งเตือน / **การ์ดทักทาย + รายการ todo แถวเดียว + ปุ่ม "ทำงานถัดไป"** | ตาม friendly-spec §F4 | ผู้ใช้เห็น "ทำอะไรต่อ" ใน 1 จุด, 1 ปุ่ม primary ต่อพื้นที่ |
| Onboarding UI | — | ADR-AUTH-001 (O1+O2) | |
| เพิ่ม component lib (Radix DropdownMenu/Popover/Sheet) | ใช้ / **ไม่ใช้** | เขียนเองแบบ popover/sheet เดิม (DisplayPrefs/drawer) | คงเหตุผล ADR-UI-002 D3 (portal/aria-hidden ชน session-lost guard + dom-translate) — ไม่เพิ่ม dependency |

## การตัดสินใจ
- **D1 Token:** ใช้ `ui/earth-tokens.md` §E1 แทน saas-tokens §T1 ทั้งชุด (34 token สี, hex เป็นค่าอ้างอิง, CSS ยังเป็น HSL channel ที่แปลงด้วยสคริปต์) + `--radius 0.625rem`, `--topbar-h 4rem`, `--sidebar-w 16.5rem` · contrast 42 คู่ × 2 ธีม ผ่าน AA ทุกคู่ (§E2, [A] — qa วัดซ้ำ)
- **D2 ธีม:** `defaultTheme="light"`, `enableSystem` คงไว้ (ป้าย "ตามเครื่อง"), storageKey `aunqa_theme` เดิม, `disableTransitionOnChange` เดิม
- **D3 Shell:** friendly-spec §F1–F2 — topbar `[เมนู <1024][แบรนด์ <1024 ≥480] … [LangSwitch][แจ้งเตือน][เมนูผู้ใช้]`; sidebar 4 กลุ่ม `bg-card`; ส่วนล่าง sidebar (การแสดงผล/ออกจากระบบ) ย้ายเข้าเมนูผู้ใช้; ตัวนับคำขอเข้าใช้งานบนเมนู "ผู้ดูแลระบบ"
- **D4 ปุ่มภาษา:** friendly-spec §F2.1 — `LangToggle.tsx` เปลี่ยนเป็น segmented (ชื่อ component/ไฟล์เดิม) + `LangContext` เพิ่ม `setLang(lang)` (additive; `toggleLang` คงไว้)
- **D5 การแสดงผล:** `DisplayPrefs.tsx` แยกเป็น `DisplayPrefsPanel` (เนื้อ: ขนาดตัวอักษร `ปกติ/ใหญ่/ใหญ่มาก`, ธีม `สว่าง/มืด/ตามเครื่อง`, เอฟเฟกต์) + `DisplayMenuButton` (ปุ่มมีข้อความเปิด popover — ใช้ใน login/landing) · **คง export `DisplayPrefsButton` เดิมไว้จนกว่า F1 เอาออกจาก sidebar** (กัน tsc แตกระหว่าง subtask) · `ThemeToggleButton` เลิกใช้ทุกหน้า (ลบ export ได้ใน F2 เมื่อไม่มีผู้ใช้แล้ว)
- **D6 แจ้งเตือน:** friendly-spec §F3 (`NotificationBell` + panel ใหม่ใน `components/aunqa/NotificationPanel.tsx`, map ปลายทางใน `lib/ui/notification.ts`), กล่องแจ้งเตือนออกจากหน้าหลัก, testid `noti-list`/`noti-read-all` ย้ายตาม, กระดิ่งอัปเดตข้ามแท็บด้วย `storage` event
- **D7 หน้าหลักแบบเป็นมิตร:** friendly-spec §F4
- **D8 หน้าสาธารณะ + admin สำหรับ onboarding:** friendly-spec §F5–F8 (API ตาม ADR-AUTH-001 A3)
- **D9 ลูกเล่น:** friendly-spec §F0 รายการ "ช่วย" + earth-tokens §E4 motion — ทุกตัวปิดด้วยกฎ reduced-motion global เดิม; ห้ามรายการ "รบกวน"
- **D10 ขอบเขต logic (แทน AC-20 เดิม):** subtask frontend = presentation + การเรียก API ใหม่ของ ADR-AUTH-001 + state ของ UI (เปิด/ปิด panel/เมนู) เท่านั้น; การเปลี่ยน logic/data อยู่ใน subtask backend R2-B1 เท่านั้น (ไฟล์ที่ระบุ) · `lib/utils`, `lib/mock-data`, `app/api` ห้ามเปลี่ยน
- **D11 เทสต์ที่ต้องปรับ (qa — ไม่ลดสิ่งที่ทดสอบ):** contrast (hex lock 34 token × 2, 42 คู่ × 2, กฎ "ไม่ดำ/ไม่ขาวจ้า" ใน dark) · theme.spec (ค่าเริ่มต้น light, สลับผ่าน `user-menu` → `theme-segment-*`) · E2E-08 (เปิด panel) · logout ผ่านเมนูผู้ใช้ · E2E-01 (โหมดตั้งรหัสผ่าน) · เพิ่ม e2e ใหม่ shell/แจ้งเตือน/onboarding ตาม AC-21–AC-31

## จุดที่ต้องให้เจ้าของอนุมัติ
- ไม่มีเพิ่ม (อนุมัติแล้ว 2026-10-26) — ไม่มี dependency ใหม่, ไม่มี deploy/migration/ค่าใช้จ่าย · orchestrator ส่งภาพด่าน V1 ให้เจ้าของดูได้ก่อนทำหน้าที่เหลือ (ไม่บังคับ)

## ผลที่ตามมา
- (+) topbar/sidebar desktop ไม่มีปุ่มไอคอนเดี่ยว; ภาษาเห็นและกดได้ทันที; การแสดงผล/ออกจากระบบอยู่ที่ที่ผู้ใช้คาดหวัง; แจ้งเตือนกดแล้วพาไปหน้าที่ถูก
- (+) โทนอุ่น อ่านสบาย ทั้งสองธีมผ่าน AA; โหมดมืดไม่ดำ
- (−) ต้องเปลี่ยนเทสต์ที่ล็อกค่าดีไซน์รอบแรก (contrast, theme, testid ที่ย้าย) และ E2E ที่ใช้ `logout`/`noti-list`
- (−) หน้าที่ยังไม่ย้าย (legacy.css) ยังไม่เข้าธีมจนถึง S6 — โหมดมืดยังเพี้ยนบนหน้าเหล่านั้น (ค่าเริ่มต้น light ลดผลกระทบช่วงเปลี่ยนผ่าน)
- (−) diagram/ภาพหน้าจอในเล่มต้องทำใหม่ทั้งชุด (หลัง dev เสร็จตามกฎ)
