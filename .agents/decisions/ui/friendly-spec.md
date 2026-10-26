# ADR-UI-003 ภาคผนวก F — หน้าจอแบบเป็นมิตร (shell, แจ้งเตือน, รับผู้ใช้ใหม่, หน้าหลัก)

> บังคับเท่า ADR-UI-003 · token อ้าง `ui/earth-tokens.md` (§E…) · **แทน `ui/saas-spec.md` §P2 (login), §P4 (AppShell), §P5 (หน้าหลัก), §C14 ย่อหน้า DisplayPrefs, §C16 ย่อหน้า LangToggle/ThemeToggle** · หน้าอื่น (§P6–P21) และ recipe อื่น (§C1–C13, C15, C17) ใช้ saas-spec ต่อ โดยเปลี่ยนแค่ค่า token + radius ตาม §E4
> testid/ข้อความที่ไม่ได้ระบุว่าย้าย/เปลี่ยน/ลบในไฟล์นี้ = **คงเดิม** (ADR-UI-002 D7) · เจอสิ่งที่ไม่ได้กำหนด → recipe ที่ใกล้ที่สุด + จด Log · ถ้าต้องเปลี่ยนข้อความ/testid/role ที่ไม่อยู่ใน §F11 = BLOCKED ถาม architect

## §F0 ทำไมรอบแรก "ไม่เป็นมิตร" (จากภาพ v0-*) → หลักใหม่
| ที่เห็นในภาพ | ผลกับผู้ใช้ 40–60+ | หลักใหม่ |
|---|---|---|
| topbar เป็นไอคอนเดี่ยว 3 ตัว (文A, พระจันทร์, กระดิ่ง) ไม่มีป้าย | ไม่รู้ว่ากดแล้วได้อะไร → ไม่กด (NN/g R18/R19) | ทุก control บน desktop มี **ข้อความที่มองเห็น**; มือถือยกเว้นได้เฉพาะกระดิ่ง/avatar (มี aria-label) |
| ปุ่มภาษา `ไทย EN` เป็นปุ่มเดียวกดสลับ ป้ายจาง | ไม่รู้ว่าอันไหนเลือกอยู่ | segmented 2 ปุ่ม `ไทย` `English` ช่องที่เลือก = พื้น primary-muted + ตัวหนา + aria-pressed |
| "การแสดงผล"/"ออกจากระบบ" ซ่อนท้าย sidebar, popover ล้นจอ ปุ่มธีมตกบรรทัด (v0-prefs) | หาไม่เจอ ใช้ยาก | ย้ายเข้า **เมนูผู้ใช้ (avatar)** หัวข้อ "การแสดงผล" กว้างพอ ปุ่มไม่ตกบรรทัด |
| ขนาดตัวอักษร `ก ก+ ก++` | ไม่เข้าใจสัญลักษณ์ | ป้ายคำ `ปกติ` `ใหญ่` `ใหญ่มาก` |
| กล่อง "แจ้งเตือน (0 ใหม่)" กินครึ่งหน้าหลัก | หน้าแรกรก งานจริงถูกดันลง | panel จากกระดิ่ง (desktop popover / มือถือ sheet) — หน้าหลักเหลือ "สิ่งที่ต้องทำ" |
| เมนู 5 กลุ่ม ป้ายกลุ่มเล็กจาง | สแกนยาก | ≤4 กลุ่ม ป้ายภาษาคน |
| โหมดมืดดำสนิท + การ์ดหน้าเก่ายังขาว ตัวอักษรหาย (v0-app-dark) | มองไม่เห็น/แสบตา | warm dim (§E0) + ค่าเริ่มต้นสว่าง (หน้าเก่าจะหายหลัง cutover) |
| indigo/เทา เย็นและแข็ง | ไม่อบอุ่น | ทรายอุ่น + เสจ + ดินเผา, มุมโค้ง 10–12px, ระยะหายใจมากขึ้น |

ลูกเล่นที่ "ช่วย" (ทำ): ทักทายตามเวลา + สรุปงานวันนี้, วงความคืบหน้ารอบ, ตัวนับกระดิ่งเด้งครั้งเดียว, panel/เมนูเปิดนุ่ม 150ms, แถวที่เพิ่งอ่านจางลง, ปุ่มกำลังบันทึก→"บันทึกแล้ว ✓" (มีแล้ว) · ที่ "รบกวน" (ห้าม): ทัวร์บังจอ, animation วน, confetti เต็มจอ, toast < 5 วิ, tooltip-only · ทุกอย่างปิดเมื่อ `prefers-reduced-motion: reduce` (กฎ global เดิม)

## §F1 AppShell
```
≥1024 ──────────────────────────────────────────────────────────────────────────────────────────────────
┌ #app-sidebar w-sidebar bg-card border-r ─┬ topbar h-topbar(64) bg-card/90 backdrop-blur border-b ───────────────────────┐
│ [▣] AUN-QA Copilot        (h-topbar)      │                       [🌐 ไทย │ English] [🔔 แจ้งเตือน ③] [(ปร) ผศ.ดร.ปรีชา ▾] │
│                                           │                                                      ประธานหลักสูตร        │
│ งานของฉัน               (aq-nav-group)     ├──────────────────────────────────────────────────────────────────────────┤
│ ▍⌂ หน้าหลัก                      (14)      │ <main id="main"> max-w-screen-xl px-4 md:px-6 lg:px-10 py-6 lg:py-8      │
│  ✓ รอตรวจ                         (5)      │                                                                          │
│ จัดทำรายงาน SAR                            │                                                                          │
│  ◷ รอบประเมิน  ▢ หลักฐาน  ⤓ ส่งออกเอกสาร    │                                                                          │
│ ข้อมูลหลักสูตร                              │                                                                          │
│  หลักสูตร · ตัวชี้วัด · แผนปรับปรุง · คลังเกณฑ์ │                                                                          │
│ ผู้ดูแล                                     │                                                                          │
│  ⚙ ผู้ดูแลระบบ                     (2)      │  ← ตัวนับ = คำขอเข้าใช้งานรออนุมัติ (เฉพาะผู้มี user.manage)            │
│ (ไม่มีส่วนล่าง "การแสดงผล/ออกจากระบบ" แล้ว) │                                                                          │
└───────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘
<1024 ──────────────────────────────────────────
┌ topbar h-topbar ──────────────────────────────┐
│ [☰ เมนู] [▣ ≥480]      [ไทย│EN] [🔔③] [(ปร)]   │  390px: 16+84+…+96+8+44+8+44+16 ≈ 316 (ไม่ล้น)
└───────────────────────────────────────────────┘
drawer #app-sidebar (is-open) = เมนูเดียวกับ desktop + หัว drawer [▣ AUN-QA Copilot] [✕ ปิด]
```
- **sidebar**: `bg-card` (ยกจากพื้นทราย) · nav item `aq-nav-item flex min-h-11 items-center gap-3 rounded-lg px-3 text-base text-foreground no-underline hover:bg-accent` · active: `bg-primary-muted font-semibold text-foreground` + ไอคอน `text-primary` (คู่ #11/#12) — **ไม่มีแถบซ้าย 2px แล้ว** (พื้นสีพอ) · ตัวนับ `.aq-count ml-auto`
- **กลุ่มเมนู 4 กลุ่ม** (ข้อความไทยใหม่ ดู §F12): `งานของฉัน` (หน้าหลัก, รอตรวจ) · `จัดทำรายงาน SAR` (รอบประเมิน, หลักฐาน, ส่งออกเอกสาร) · `ข้อมูลหลักสูตร` (หลักสูตร (PLO/รายวิชา), ตัวชี้วัด, แผนปรับปรุง, คลังเกณฑ์ AUN-QA) · `ผู้ดูแล` (ผู้ดูแลระบบ) — เงื่อนไขแสดงเมนูต่อ role **เดิมทุกข้อ** (กลุ่มว่าง = ไม่แสดงหัวกลุ่ม) · หัวกลุ่ม `aq-nav-group mt-6 px-3 pb-1.5` (ตัวแรก `mt-2`)
- ตัวนับบนเมนู "ผู้ดูแลระบบ" = `countPendingAccessRequests(user)` (แสดงเมื่อ > 0, ใช้ `countLabel` เดิม) · คำนวณใหม่เมื่อ pathname เปลี่ยน หรือ event `aunqa:todos-changed` (เหมือนตัวนับเดิม)
- drawer: คง `#app-sidebar` + class `is-open` + `data-open` + focus trap + Esc คืน focus ที่ `nav-menu` (เดิม) · เพิ่มปุ่ม "ปิด" มีข้อความในหัว drawer (`nav-drawer-close`)
- session-lost / readonly-banner: เดิม (InlineMessage ใต้ topbar)

## §F2 Topbar
ลำดับ (ซ้าย→ขวา): `[☰ เมนู <1024]` `[แบรนด์ <1024 และ ≥480]` `flex-1` `[LangSwitch]` `[NotificationBell]` `[UserMenu]` · `gap-2 md:gap-3` · `px-4 md:px-6`
### F2.1 LangSwitch (`components/ui/LangToggle.tsx` — default export ชื่อเดิม `LangToggle`)
```
 ≥768:  ┌─────────────────────────────┐        <768: ┌──────────────┐
        │ 🌐 │ ไทย ▓▓ │ English │      │              │ ไทย ▓▓ │ EN  │
        └─────────────────────────────┘              └──────────────┘
```
- `div role="group" aria-label="ภาษา / Language"` `inline-flex items-center rounded-lg border border-input bg-card p-1` + ไอคอน `globe` 18 `text-muted-foreground mx-1.5` (≥768 เท่านั้น, aria-hidden)
- ปุ่ม 2 ตัว `<button type="button" aria-pressed>` `min-h-9 min-w-11 rounded-md px-3 text-base font-medium` · ที่เลือก: `bg-primary-muted text-foreground font-semibold` (คู่ #12) · ไม่เลือก: `text-muted-foreground hover:bg-accent hover:text-foreground` · กล่องรวมสูง ≥44 (p-1 + 36 + ขอบ) — **ปุ่มย่อยนับเป็น target ใน segmented ที่สูง 44 รวม** (ตาม AC-05 เดิมของ FontScaleSeg; ถ้า target audit วัดปุ่มย่อย ให้ใช้ `min-h-11` แทน `min-h-9`)
- ป้าย: `ไทย` (`lang="th"`) · `English` (`lang="en"`) ที่ ≥768 / `EN` ที่ <768 พร้อม `aria-label="English"` + `lang="en"` (WCAG 3.1.2, R23–R24)
- กดปุ่มภาษาที่เลือกอยู่ = ไม่ทำอะไร · กดอีกปุ่ม = `setLang(x)` · **พฤติกรรม "จำภาษาแยกรายหน้า" เดิมคงไว้** (LangContext ไม่เปลี่ยนกติกา — เพิ่มแค่ `setLang`) และ `title` บอก "เปลี่ยนภาษาเฉพาะหน้านี้"
- ทั้ง group มี `data-no-i18n` (ป้ายภาษาไม่ถูกแปล) · testid: group `lang-switch`, ปุ่ม `lang-th`, `lang-en`
### F2.2 NotificationBell (ใน `components/aunqa/NotificationPanel.tsx`)
- `<button type="button" data-testid="nav-bell" aria-haspopup="dialog" aria-expanded aria-controls="noti-panel" aria-label="แจ้งเตือนที่ยังไม่อ่าน {n} รายการ">` (aria-label **เดิม** — E2E-08 regex `/ที่ยังไม่อ่าน [1-9]/`; ขึ้นต้นด้วยข้อความที่มองเห็น "แจ้งเตือน" จึงผ่าน WCAG 2.5.3)
- หน้าตา: Button ghost `min-h-11 gap-2 px-3` · ไอคอน `bell` 20 · ป้าย "แจ้งเตือน" `hidden lg:inline` · ตัวนับ `.aq-count` (ถ้า > 0, `countLabel` → 99+) อยู่**ท้ายป้าย**บน desktop / มุมขวาบนของไอคอนบนมือถือ · `animate-bump` ครั้งเดียวเมื่อเพิ่ม (เดิม)
- จำนวนอัปเดตเมื่อ: pathname เปลี่ยน, `aunqa:todos-changed`, และ **`storage` event ของ key `aunqa_notifications` (ข้ามแท็บ — ใหม่)**
### F2.3 UserMenu (ใหม่ `components/aunqa/UserMenu.tsx`)
```
trigger ≥768: [(ปร) ผศ.ดร.ปรีชา ตัวอย่างดี  ▾]      <768: [(ปร)]  (ชื่ออยู่ใน sr-only ตามเดิม — nav-user)
                     ประธานหลักสูตร
┌ เมนู (popover) w-80 max-w-[calc(100vw-1rem)] rounded-xl border bg-popover p-2 shadow-lg ┐
│ ┌ หัว px-3 py-3 ───────────────────────────────────────────────────────┐ │
│ │ (ปร)  ผศ.ดร.ปรีชา ตัวอย่างดี (font-semibold)                          │ │
│ │ 40px  ประธานหลักสูตร · prichart@sample-uni.example (aq-meta, ตัดคำ)   │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ── border-t ──                                                            │
│ การแสดงผล (aq-nav-group px-3 pt-3)                                        │
│ ขนาดตัวอักษร   [ ปกติ ▓ | ใหญ่ | ใหญ่มาก ]   ← FontScaleSeg (radiogroup)    │
│ ธีม           [ ☀ สว่าง ▓ | ☾ มืด | ▭ ตามเครื่อง ] ← ThemeSegment            │
│ [✓] เอฟเฟกต์ฉลอง (เมื่อรอบสำเร็จ)                                          │
│ ── border-t ──                                                            │
│ [⎋ ออกจากระบบ]  ← ปุ่ม ghost เต็มความกว้าง justify-start (testid logout)     │
└───────────────────────────────────────────────────────────────────────────┘
```
- trigger: `<button type="button" data-testid="user-menu" aria-haspopup="true" aria-expanded aria-controls="user-menu-panel">` · avatar `h-10 w-10 rounded-full bg-clay-muted text-clay font-semibold` (คู่ #41) initials เดิม · ชื่อ `nav-user` (testid **คงอยู่บน element ชื่อใน trigger**; <768 = `sr-only` เหมือนเดิม) + บทบาท `aq-meta` · `chevron-down` 16
- panel `id="user-menu-panel"` **ไม่ใช่ role=menu** (มี radiogroup/checkbox ข้างใน — ใช้ disclosure pattern APG: `div` ธรรมดา + `aria-labelledby` trigger) · เปิด `animate-pop-in` · ปิดเมื่อ: Esc (คืน focus ที่ trigger), คลิกนอก, เลือก "ออกจากระบบ" · **ไม่ปิด**เมื่อเปลี่ยนธีม/ขนาดตัวอักษร (ผู้ใช้เห็นผลทันทีแล้วปรับต่อได้)
- แถวควบคุม: label ซ้าย `text-base` + segmented ขวา (≥360px panel) / ซ้อนบรรทัดถ้าแคบ (`flex flex-wrap gap-2`) — **segmented ต้องไม่ตกบรรทัดภายในตัวเอง** (`flex-nowrap`, ปุ่ม `px-3`)
- ปุ่มออกจากระบบ = ฟังก์ชันเดิมของ sidebar (รวม dialog เตือนงานไม่บันทึก/conflict เดิม) ย้ายมาทั้งก้อน · testid `logout` เดิม
- ใช้ส่วน "การแสดงผล" ตัวเดียวกับ §F5 (`DisplayPrefsPanel` จาก `components/ui/DisplayPrefs.tsx`)

## §F3 Notification panel (`components/aunqa/NotificationPanel.tsx` — export `NotificationBell` ที่รวม trigger + panel)
### F3.1 Desktop ≥768 = popover ใต้กระดิ่ง (ชิดขวา)
```
┌ #noti-panel role="dialog" aria-labelledby="noti-h" w-[26rem] max-w-[calc(100vw-1rem)] rounded-xl border bg-popover shadow-lg ┐
│ ┌ หัว px-4 py-3 border-b flex items-center ──────────────────────────────────────┐ │
│ │ h2#noti-h "การแจ้งเตือน" text-lg   (ยังไม่อ่าน 3)aq-meta     [อ่านทั้งหมด] ghost compact │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ data-testid="noti-list" max-h-[min(70vh,36rem)] overflow-y-auto overscroll-contain ┐ │
│ │ วันนี้  (aq-nav-group px-4 pt-3 pb-1)                                           │ │
│ │ ┌ a.noti-item (unread) flex gap-3 px-4 py-3 hover:bg-accent ─────────────────┐ │ │
│ │ │ (◷)  ข้อ 4.2 ถูกส่งกลับแก้: เกณฑ์ 4 ยังขาดหลักฐาน…   font-semibold          │ │ │
│ │ │ 36px [ใหม่] · 5 นาทีที่แล้ว                                   ● (จุด primary) │ │ │
│ │ └──────────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌ a.noti-item (read) ─ ข้อความ font-normal text-foreground · เวลา aq-meta ────┐ │ │
│ │ เมื่อวาน / ก่อนหน้านี้ … (≤3 กลุ่ม)                                              │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ท้าย (ถ้า > 30 รายการ): aq-meta px-4 py-2 border-t "แสดง 30 รายการล่าสุด"            │
└────────────────────────────────────────────────────────────────────────────────────┘
```
### F3.2 มือถือ <768 = sheet เต็มจอ
```
┌ fixed inset-0 z-dialog bg-background animate-sheet-in (role="dialog" aria-modal="true") ┐
│ [การแจ้งเตือน (h2)]                        [อ่านทั้งหมด] [✕ ปิด] │  หัว sticky h-topbar border-b bg-card
│ noti-list เต็มความสูงที่เหลือ เลื่อนในตัว                          │
└─────────────────────────────────────────────────────────────────┘
```
- มือถือ: focus trap ใน sheet + Esc/ปุ่ม "ปิด" คืน focus ที่ `nav-bell` · ล็อก scroll ของ body ขณะเปิด · desktop: ไม่ trap (non-modal popover) แต่ Esc/คลิกนอก ปิดและคืน focus
- รายการ = `<Link href={notificationHref(n)} data-testid="noti-item-{id}">` **ทั้งแถวคลิกได้** (ไม่มีปุ่มย่อยในแถว) · onClick: `markRead(user, n.id)` → dispatch `aunqa:todos-changed` → ปิด panel → Link นำทาง (ถ้า href = path ปัจจุบันพร้อม hash → เลื่อนไปยัง anchor)
- **unread**: ข้อความ `font-semibold`, pill `ใหม่` (`aq-pill bg-primary-muted text-primary` คู่ #11), จุด 8px `bg-primary` aria-hidden · **read**: `font-normal`, ไม่มี pill/จุด — ไม่พึ่งสีอย่างเดียว (มีคำ "ใหม่") · `aria-label` ของลิงก์ไม่ต้อง (ข้อความในลิงก์อ่านได้ครบ) แต่ใส่ `<span class="sr-only">ยังไม่อ่าน: </span>` นำหน้าข้อความ unread
- ไอคอนตาม kind (วง 36px `bg-muted` ไอคอน 18): assigned `user-plus` primary · comment `message` info · changes_requested `undo` warning · approved `check` success · cycle_status `calendar` info · deadline `clock` warning · access_request `user-plus` clay · account `shield-check` success — ชื่อไอคอนที่ยังไม่มีใน `Icon.tsx` ให้เพิ่มจาก Lucide (ISC)
- เวลา: < 1 นาที "เมื่อสักครู่" · < 60 นาที "{n} นาทีที่แล้ว" · วันนี้ "วันนี้ {HH:MM}" · เมื่อวาน "เมื่อวาน {HH:MM}" · เก่ากว่า `fmtDateTime` เดิม · กลุ่ม: วันนี้ / เมื่อวาน / ก่อนหน้านี้ (ตามวันที่ท้องถิ่น) · EN ตาม §F12
- ข้อความ: `lang==='en' ? (n.messageEn ?? NOTI_KIND_EN[n.kind]) : n.messageTh` · กล่องรายการมี `data-no-i18n` (ไม่ให้ dom-translate แปลข้อความไทยทับ)
- "อ่านทั้งหมด": `data-testid="noti-read-all"` (ย้ายจากหน้าหลัก) · `markRead(user)` → dispatch event · disabled (ไม่ใช่ซ่อน) เมื่อ unread = 0
- **Empty**: วงไอคอน `bell` 48 `bg-muted` + "ยังไม่มีการแจ้งเตือน" (font-medium) + "เมื่อมีคนมอบหมายงาน ส่งกลับแก้ หรืออนุมัติ จะแจ้งให้ทราบที่นี่" (aq-meta) — `data-testid="noti-empty"`
- โหลดข้อมูลตอนเปิด panel (`listNotifications(user)` 30 รายการแรก) — ไม่ render รายการตอนปิด
- เรื่องที่ต้องทำทันทียังอยู่ใน "สิ่งที่ต้องทำ" ของหน้าหลัก (panel ไม่ใช่ที่เดียว — R11/R12)
### F3.3 ตาราง deep link (`lib/ui/notification.ts` → `notificationHref(n)`) — contract กับ ADR-AUTH-001 §A6
| `n.target.type` | href |
|---|---|
| `section` | `sectionHref(cycleId, requirementId)` + (`panel==='comments'` ? `#comments` : '') |
| `my_work` | `/app#mywork` |
| `cycle` | `/app/cycles/{enc(cycleId)}` |
| `assess` | `/app/cycles/{enc(cycleId)}/assess` |
| `action` | `/app/actions#action-{enc(actionId)}` |
| `admin` | `/app/admin?tab={users\|requests}` |
| `home` | `/app` |
| (ไม่มี target — แถวเก่า) | มี cycleId+requirementId → section · มีแค่ cycleId → cycle · นอกนั้น `/app` |
ปลายทางที่ต้องรองรับ anchor/param (งานของ subtask หน้านั้น): หน้าหลัก `id="mywork"` (F1) · SarWorkspace เปิดแท็บข้าง "ความเห็น" เมื่อ hash = `#comments` (F4) · หน้าแผนปรับปรุง แถว/การ์ด `id="action-{id}"` + `animate-highlight` เมื่อ hash ตรง (F5) · admin อ่าน `?tab=` เลือกแท็บ (F6)

## §F4 หน้าหลัก `/app` (`app/app/page.tsx`)
```
PageHeader: h1 "หน้าหลัก" (คงเดิม) — ไม่มี sub (ย้ายไปการ์ดทักทาย)       [+ เพิ่มหลักฐาน outline (home-add-evidence)]
┌ การ์ดทักทาย rounded-xl bg-card border p-5 md:p-6 animate-fade-up ───────────────────────────────────────────────┐
│ (☀ ใน กล่อง clay-muted 48)  สวัสดีตอนเย็น คุณปรีชา        text-xl font-semibold                                 │
│                            วันอาทิตย์ที่ 25 ตุลาคม 2569 · วันนี้มี 3 งานที่ควรทำก่อน (aq-meta / text-muted)        │
│                                                     ┌ ความคืบหน้ารอบ 2569 ─┐  (ProgressRing size md, ≥768 เท่านั้น) │
│                                                     │  ◔ 85%  อนุมัติ 45/53 │                                     │
│ [ทำงานถัดไป: ตรวจ 5 ข้อ →] (default — ปุ่ม primary เดียวของการ์ด = todo แรก)                                    │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
สิ่งที่ต้องทำตอนนี้ (h2 text-xl)                                                               (รวม 14 งาน) aq-meta
┌ การ์ดเดียว divide-y ───────────────────────────────────────────────────────────────────────────────────────────┐
│ (ไอคอนกล่อง muted 40) ตรวจและอนุมัติ 5 ข้อที่ส่งมา (รอบ 2569) font-medium   [เร่งด่วน]      [ไปทำ →] outline compact │  todo-<kind>-0
│ (…) มอบหมายผู้เขียน 7 ข้อที่ยังไม่มีเจ้าของ                                                     [ไปทำ →]          │  todo-<kind>-1
│ (…) จัดการข้อมูลส่วนบุคคลในหลักฐาน 1 ชิ้น                                                       [ไปทำ →]          │  todo-<kind>-2
│ ▸ งานอื่น ๆ อีก N รายการ (details — เนื้อในเหมือนเดิม testid todo-<kind>-{i+3})                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-6
┌ section#mywork "งานของฉัน" (mywork-table — เดิม) ┐  ┌ "รอบประเมินที่เข้าถึงได้" การ์ดรอบ (cycle-link-*) + progress bar ┐
└────────────────────────────────────────────────┘  └───────────────────────────────────────────────────────────────┘
(ไม่มีกล่อง "แจ้งเตือน" แล้ว — noti-list / noti-read-all ย้ายไป panel)
```
- คำทักทาย: ข้อความเดิมของ L12 (สวัสดีตอนเช้า/บ่าย/เย็น + ชื่อ) — แสดงชื่อแบบเดิม (ไม่ตัดคำนำหน้า) · บรรทัดสรุป "วันนี้มี {n} งานที่ควรทำก่อน" n = จำนวน todo ที่ urgent (ถ้า 0 → "ไม่มีงานเร่งด่วน — ทำต่อจากที่ค้างไว้ได้เลย")
- ปุ่ม "ทำงานถัดไป" = ลิงก์ของ todo ตัวแรก (ถ้าไม่มี todo → ไม่แสดงปุ่ม) · testid `home-next-task`
- แถว todo: **ทั้งแถวไม่ใช่ลิงก์** (เหมือนเดิม) ปุ่ม `ไปทำ` 1 ปุ่มต่อแถว (outline compact; ตัวแรกในการ์ดทักทายเป็น default แล้วจึงไม่มี primary ซ้ำ) · urgent = badge "เร่งด่วน" tone warning + ขอบซ้าย `border-l-4 border-l-warning`
- ข้อความ "(รวม N งาน)" เดิม (regress-u1b M2)

## §F5 Login `/login` (`components/auth/AuthLayout.tsx`, `LoginForm.tsx`)
```
≥1024 grid 2 คอลัมน์ (ซ้าย bg-background ฟอร์ม | ขวา bg-muted แผงแบรนด์ภาพเส้น — เดิม เปลี่ยนสีตาม token)
┌ ซ้าย ───────────────────────────────────────────────────────────┐
│ [▣ AUN-QA Copilot]                 [🌐 ไทย│English] [Aa การแสดงผล ▾] │  ← DisplayMenuButton (ปุ่มมีข้อความ เปิด DisplayPrefsPanel)
│                                                                 │
│   ┌ การ์ด rounded-xl border bg-card p-6 md:p-8 max-w-md ────────┐ │
│   │ h1 "เข้าสู่ระบบ" text-2xl · p muted "ผู้ช่วยจัดทำ SAR…"      │ │
│   │ [login-reason alert]                                       │ │
│   │ ชื่อผู้ใช้ [__________]                                      │ │
│   │ รหัสผ่าน  [__________][👁]                                   │ │
│   │ [ เข้าสู่ระบบ ] default w-full                              │ │
│   │ ── หรือ ── (เส้น border + คำ aq-meta)                       │ │
│   │ [ขอเข้าใช้งาน] outline   [มีรหัสเชิญ] outline  (grid 2 คอลัมน์ ≥480 / ซ้อน <480) │
│   │ ‹ กลับหน้าแรก                                               │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ▸ บัญชีทดสอบ (11) — รหัสผ่าน demo1234  (details เดิม)            │
└─────────────────────────────────────────────────────────────────┘
```
- ลบ: segmented `ก ก+ ก++` และปุ่มธีมไอคอน (`theme-toggle`) ออกจากแถบเครื่องมือ → แทนด้วย `DisplayMenuButton` (`data-testid="display-menu"`, ป้าย "การแสดงผล", ไอคอน `type`) เปิด popover `DisplayPrefsPanel` (ขนาดตัวอักษร + ธีม + เอฟเฟกต์ — ไม่มีออกจากระบบ)
- ปุ่มใหม่: `login-request-access` → `/request-access` · `login-have-invite` → `/invite`
- ข้อความ error ใหม่จาก `LoginResult.error`: `pending` → InlineMessage info "บัญชีนี้กำลังรอผู้ดูแลอนุมัติ — เมื่ออนุมัติแล้วจะเข้าสู่ระบบได้" · `suspended` → InlineMessage danger "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบของมหาวิทยาลัย" (testid `login-error` เดิมถ้ามี; ไม่มีก็ใช้ element error เดิม)
- testid เดิมทั้งหมดคง (`login-*`, `demo-*`, `demo-accounts`)

## §F6 ขอเข้าใช้งาน `/request-access` (ใหม่ `app/request-access/page.tsx` + `components/auth/RequestAccessForm.tsx` ใช้ `AuthLayout`)
```
h1 "ขอเข้าใช้งาน"   p muted "กรอกข้อมูลเพื่อขอบัญชี ผู้ดูแลระบบของมหาวิทยาลัยจะตรวจสอบและกำหนดบทบาทให้"
┌ การ์ด max-w-xl ─────────────────────────────────────────────────────────────┐
│ ① ข้อมูลของคุณ                                                                │
│ ชื่อ-สกุล *            [__________________]                                  │
│ อีเมลมหาวิทยาลัย *      [__________________]  help: ใช้อีเมลที่ลงท้ายด้วยโดเมนของมหาวิทยาลัย │
│                         (หลังกรอก: ✓ มหาวิทยาลัยตัวอย่างภาคเหนือ — aq-meta text-success / ✕ ข้อความ error) │
│ หลักสูตร/หน่วยงาน       [NativeSelect: -- เลือก -- / คณะ… / หลักสูตร… / อื่น ๆ (ทั้งมหาวิทยาลัย)] (disabled จนกว่าอีเมลผ่าน) │
│ ตำแหน่ง/หน้าที่          [__________________]  help: เช่น อาจารย์ประจำหลักสูตร (เป็นข้อมูลประกอบ ไม่ใช่การเลือกสิทธิ์) │
│ เหตุผลที่ขอใช้งาน *       [textarea 3 แถว]                                     │
│ ② ตั้งค่าการเข้าสู่ระบบ                                                          │
│ ชื่อผู้ใช้ *             [__________]  help: a-z 0-9 . _ - ยาว 3–32 ตัว           │
│ รหัสผ่าน *              [__________][👁] help: อย่างน้อย 8 ตัวอักษร (ยาวได้ถึง 64 — ใช้วลีที่จำง่ายได้) │
│ ยืนยันรหัสผ่าน *         [__________]                                          │
│ [✓] ฉันรับทราบว่าข้อมูลนี้ใช้เพื่อพิจารณาให้สิทธิ์ใช้งานเท่านั้น (privacy notice — §F12 P1) * │
│ [ ส่งคำขอ ] default                    ‹ กลับไปหน้าเข้าสู่ระบบ                  │
└──────────────────────────────────────────────────────────────────────────────┘
สำเร็จ → แทนฟอร์มด้วยการ์ด success: ✓ "ส่งคำขอแล้ว" + "ผู้ดูแลระบบจะตรวจสอบคำขอของคุณ เมื่ออนุมัติแล้วเข้าสู่ระบบด้วยชื่อผู้ใช้ {username} ได้ทันที" + [ไปหน้าเข้าสู่ระบบ]
```
- **ไม่มีช่อง/ค่าใดเกี่ยวกับบทบาท** (ไม่มี select role, ไม่มี hidden field) — ADR-AUTH-001 A3
- ตรวจฝั่ง client ก่อนส่ง (ข้อความใต้ช่อง `aq-field-error`): จำเป็น, รูปแบบอีเมล, โดเมน (`findUniversityByEmail`), username regex, รหัสผ่าน ≥8 และตรงกัน, consent · error จาก API แสดงใต้ช่องที่เกี่ยว (duplicate username/email)
- testid: `ra-name`, `ra-email`, `ra-unit`, `ra-position`, `ra-reason`, `ra-username`, `ra-password`, `ra-password2`, `ra-consent`, `ra-submit`, `ra-success`
- หมายเหตุเดโม่ (InlineMessage info เล็กบนสุดของการ์ด): "ระบบสาธิต: คำขอถูกเก็บในเบราว์เซอร์นี้เท่านั้น — ผู้ดูแลต้องเข้าสู่ระบบจากเบราว์เซอร์เดียวกันเพื่ออนุมัติ" (`ra-demo-note`)

## §F7 รับคำเชิญ `/invite` (ใหม่ `app/invite/page.tsx` + `components/auth/InviteAcceptForm.tsx` ใช้ `AuthLayout`)
```
ไม่มี token ใน hash:                         มี token (#t=…) และ peekInvitation ผ่าน:
h1 "ตั้งรหัสผ่านจากคำเชิญ"                     h1 "ยินดีต้อนรับ คุณ{fullName}"
p "วางลิงก์หรือรหัสเชิญที่ได้รับจากผู้ดูแลระบบ"   การ์ดสรุป (dl): ชื่อผู้ใช้ {username} · มหาวิทยาลัย {name} · บทบาท {ROLE_TH…} · ลิงก์หมดอายุ {วันที่}
[รหัสเชิญ/ลิงก์ ______________] [ถัดไป]        รหัสผ่านใหม่ * [____][👁] help ≥8 · ยืนยันรหัสผ่าน * [____]
                                              [ ตั้งรหัสผ่านและเข้าสู่ระบบ ] default w-full
token ใช้ไม่ได้ (ไม่มี/หมดอายุ/ใช้แล้ว/ยกเลิก — ข้อความเดียว):
InlineMessage danger "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว — ขอลิงก์ใหม่จากผู้ดูแลระบบ" + [กลับไปหน้าเข้าสู่ระบบ]
```
- อ่าน token จาก `location.hash` (`#t=<token>`) หรือช่องกรอก (รับทั้งลิงก์เต็มและรหัสล้วน — ตัดเอาค่าหลัง `#t=` ถ้ามี) · **ไม่ใส่ token ใน query/path** (ไม่ไปถึง log ของ server)
- สำเร็จ → `acceptInvitation` เข้าสู่ระบบให้แล้ว → `useAuth().refresh()` → `router.replace('/app')` + toast "ตั้งรหัสผ่านเรียบร้อย ยินดีต้อนรับ"
- testid: `inv-code`, `inv-next`, `inv-summary`, `inv-password`, `inv-password2`, `inv-submit`, `inv-invalid`

## §F8 ผู้ดูแลระบบ `/app/admin` (F6 — `app/app/admin/page.tsx` + แยกไฟล์ได้ใน `components/aunqa/admin/*`)
แท็บ (คง `button[role=tab]` เดิม, อ่าน `?tab=` เลือกแท็บเริ่ม): `ผู้ใช้และบทบาท` (tab-users) · **`คำขอเข้าใช้งาน` + ตัวนับ** (tab-requests, ใหม่ — แสดงเมื่อ user.manage) · `Audit log` (tab-audit) · `ข้อมูลเดโม่` (tab-demo — **แสดงเฉพาะ super_admin** ตาม ADR-AUTH-001 A8)
### F8.1 แท็บผู้ใช้
```
[+ เพิ่มผู้ใช้] (user-new)
ฟอร์ม (user-form) การ์ด grid md:2:
  ชื่อผู้ใช้ * (nu-username) · ชื่อ-สกุล * (nu-name) · อีเมล * (nu-email) · บทบาท (nu-role) · ขอบเขต (nu-scope)
  วิธีให้ผู้ใช้เข้าระบบ (radiogroup, col-span-2):
    (•) ส่งลิงก์เชิญให้ผู้ใช้ตั้งรหัสผ่านเอง (แนะนำ)   [nu-mode-invite]
    ( ) ตั้งรหัสผ่านให้เลย                           [nu-mode-password] → แสดงช่อง รหัสผ่าน * (nu-password, help ≥8)
  [บันทึก (nu-submit)] [ยกเลิก]
ผลการเชิญ (invite-result) — InlineMessage success large เหนือตาราง จนกว่าจะกดปิด:
  ✓ สร้างคำเชิญสำหรับ {fullName} แล้ว — คัดลอกลิงก์ส่งให้ผู้ใช้ทางช่องทางของหน่วยงาน (หมดอายุ {วันที่ เวลา})
  [ https://…/invite#t=xxxxxxxx  (input readonly, invite-link) ] [คัดลอกลิงก์ (invite-copy)]
  รหัสเชิญ: xxxxxxxx…  (invite-code, font-mono) · aq-meta "ระบบแสดงลิงก์นี้ครั้งเดียว — ถ้าหายให้กด 'สร้างลิงก์ใหม่'"
ตาราง users-table: ผู้ใช้ | สถานะ | บทบาท | เพิ่มบทบาท | การจัดการ
  สถานะ (user-status-{username}) Badge: ใช้งานอยู่ (success ✓) · รอตั้งรหัสผ่าน (info ✉) · ระงับ (warning ⏸)
  การจัดการ:  active → [ระงับบัญชี (user-suspend-{u}) destructiveOutline compact]
              suspended → [เปิดใช้อีกครั้ง (user-reactivate-{u}) outline compact]
              invited → [สร้างลิงก์ใหม่ (user-reinvite-{u}) outline compact] [ยกเลิกคำเชิญ (user-cancel-invite-{u}) destructiveOutline compact]
              ตัวเอง → ไม่มีปุ่ม
  (ไม่มีปุ่ม "ลบ" ผู้ใช้ที่เคยใช้งานแล้ว)
```
- ยืนยันระงับ: `confirm({ title:'ระงับบัญชี', message:'ระงับ {name}? ผู้ใช้จะเข้าสู่ระบบไม่ได้ งานที่มอบหมายไว้ยังอยู่ และเปิดใช้อีกครั้งได้ภายหลัง', variant:'danger', confirmText:'ยืนยันระงับ' })`
- ยกเลิกคำเชิญ: confirm danger "ยกเลิกคำเชิญของ {name}? ลิงก์เดิมจะใช้ไม่ได้และรายชื่อนี้จะถูกลบ"
- คัดลอก: `navigator.clipboard.writeText` → toast "คัดลอกลิงก์แล้ว"; ถ้า clipboard ใช้ไม่ได้ → select ข้อความใน input + toast "กด Ctrl+C เพื่อคัดลอก"
### F8.2 แท็บคำขอเข้าใช้งาน
```
ว่าง → Empty icon inbox "ไม่มีคำขอรออนุมัติ" "คำขอจากหน้า 'ขอเข้าใช้งาน' จะมาแสดงที่นี่"
แต่ละคำขอ = การ์ด (req-{userId}):
┌──────────────────────────────────────────────────────────────────────────────┐
│ สมชาย ใจดี (font-semibold) · somchai@sample-uni.example (aq-meta) · ส่งเมื่อ 2 ชม.ที่แล้ว │
│ หน่วยงานที่ขอ: หลักสูตร CS-B-69 · ตำแหน่ง: อาจารย์ประจำหลักสูตร                       │
│ เหตุผล: "ได้รับมอบหมายให้เขียน SAR เกณฑ์ 3"  (blockquote border-l-2 pl-3 muted)        │
│ บทบาทที่ให้ [NativeSelect req-role-{id}]  ขอบเขต [NativeSelect req-scope-{id} — ค่าเริ่ม = หน่วยงานที่ขอ] │
│ [อนุมัติ (req-approve-{id}) default]        [ปฏิเสธ (req-reject-{id}) destructiveOutline] (ห่าง ≥16px) │
└──────────────────────────────────────────────────────────────────────────────┘
```
- รายการบทบาทใน select: ทุก role ยกเว้น `super_admin` (เว้นผู้อนุมัติเป็น super_admin) — ค่าเริ่ม `programme_staff`
- ปฏิเสธ: `prompt`/confirm ของ DialogContext ขอเหตุผล (ไม่บังคับ) → "ปฏิเสธคำขอแล้ว — ลบข้อมูลผู้ขอออกจากระบบ"
- อนุมัติ → toast "อนุมัติแล้ว — {name} เข้าสู่ระบบได้ทันที" + การ์ดหายจากรายการ + ตัวนับลด + dispatch `aunqa:todos-changed`
### F8.3 แท็บข้อมูลเดโม่ — เดิม แต่แสดงเฉพาะ super_admin; ข้อความเพิ่ม "ล้างข้อมูลทุกมหาวิทยาลัยในเบราว์เซอร์นี้"

## §F9 Landing (`components/landing/LandingNav.tsx` เท่านั้น)
- แทนปุ่มธีมไอคอน (`theme-toggle`) ด้วย `DisplayMenuButton` ป้าย "การแสดงผล" ที่ ≥768 และป้ายสั้น "แสดงผล" ที่ <768 (มีข้อความทุกจอ — ไม่ใช้ไอคอนเดี่ยว) · LangToggle เปลี่ยนเป็น LangSwitch ใหม่อัตโนมัติ (component เดียวกัน) · เนื้อหา landing อื่นไม่แตะ (เปลี่ยนสีตาม token อัตโนมัติ)

## §F10 Responsive / a11y สรุป
- 390px: topbar ไม่ล้น (ตัวเลขใน §F1) · เมนูผู้ใช้กว้าง `max-w-[calc(100vw-1rem)]` ชิดขวา · panel แจ้งเตือนเป็น sheet
- target: ทุกปุ่ม ≥44 (segmented ภาษา/ธีม/ขนาดตัวอักษร: กล่องรวม 44, ปุ่มย่อย `min-h-11` ถ้า audit วัดรายปุ่ม)
- focus: outline กลางเดิม (saas-tokens §T11) · Esc ปิด popover/sheet ทุกตัวแล้วคืน focus ที่ trigger · ไม่มี focus trap ใน popover desktop
- `aria-expanded` บน trigger ทุกตัว (`nav-bell`, `user-menu`, `display-menu`, `nav-menu`)
- session-lost guard: control ใหม่ทุกตัวเป็น `button`/`a`/`input`/`select`/`label` เท่านั้น (ADR-UI-002 D7.4)

## §F11 testid contract (เพิ่ม / ย้าย / ลบ)
| testid | สถานะ | ที่อยู่ใหม่ |
|---|---|---|
| `noti-list`, `noti-read-all` | **ย้าย** | จากหน้าหลัก → ใน panel แจ้งเตือน (ต้องกด `nav-bell` ก่อน) |
| `nav-bell` | คง (เปลี่ยน `<a>` → `<button aria-expanded>`; aria-label เดิม) | topbar |
| `logout` | **ย้าย** | จาก sidebar → ใน panel เมนูผู้ใช้ (ต้องกด `user-menu` ก่อน) |
| `display-prefs` (ปุ่ม sidebar) | **ลบ** | แทนด้วย `user-menu` (ใน /app) และ `display-menu` (login/landing) |
| `theme-toggle` | **ลบ** | ใช้ `theme-segment-{light\|dark\|system}` ใน `user-menu`/`display-menu` |
| `theme-segment*`, `nav-user`, `nav-menu`, `#app-sidebar`, `.aq-count` | คง | |
| ใหม่ | — | `user-menu`, `user-menu-panel`, `display-menu`, `lang-switch`, `lang-th`, `lang-en`, `noti-panel`, `noti-item-{id}`, `noti-empty`, `nav-drawer-close`, `home-next-task`, `login-request-access`, `login-have-invite`, `ra-*`, `inv-*`, `tab-requests`, `req-*`, `nu-mode-invite`, `nu-mode-password`, `invite-result`, `invite-link`, `invite-copy`, `invite-code`, `user-status-*`, `user-suspend-*`, `user-reactivate-*`, `user-reinvite-*`, `user-cancel-invite-*` |

## §F12 ข้อความใหม่/เปลี่ยน (R2-F0 เพิ่มทั้งหมดใน `lib/i18n/dict-aunqa.ts` ครั้งเดียว)
| ไทย | EN | ที่ใช้ |
|---|---|---|
| เมนู | Menu | ปุ่ม burger |
| ปิด | Close | drawer/sheet |
| ภาษา / Language | Language | aria-label group |
| แจ้งเตือน | Notifications | ป้ายกระดิ่ง |
| การแจ้งเตือน | Notifications | หัว panel |
| อ่านทั้งหมด | Mark all as read | (มีแล้ว — ตรวจ) |
| ใหม่ | New | pill |
| ยังไม่อ่าน | Unread | sr-only |
| วันนี้ / เมื่อวาน / ก่อนหน้านี้ | Today / Yesterday / Earlier | กลุ่ม |
| เมื่อสักครู่ | Just now | เวลา |
| {n} นาทีที่แล้ว | {n} min ago | เวลา (สร้างใน `lib/ui/notification.ts` ทั้งสองภาษา ไม่ผ่าน dict) |
| ยังไม่มีการแจ้งเตือน | No notifications yet | empty |
| เมื่อมีคนมอบหมายงาน ส่งกลับแก้ หรืออนุมัติ จะแจ้งให้ทราบที่นี่ | When someone assigns, returns or approves your work, you'll see it here | empty |
| แสดง 30 รายการล่าสุด | Showing the latest 30 | ท้าย panel |
| การแสดงผล | Display | หัวข้อ/ปุ่ม |
| แสดงผล | Display | ป้ายสั้น landing |
| ขนาดตัวอักษร | Text size | (มีแล้ว — ตรวจ) |
| ปกติ / ใหญ่ / ใหญ่มาก | Normal / Large / Extra large | FontScaleSeg (แทน ก / ก+ / ก++) |
| ตามเครื่อง | Device | ThemeSegment (แทน "ตามระบบ") |
| เอฟเฟกต์ฉลอง (เมื่อรอบสำเร็จ) | Celebration effects | checkbox |
| ออกจากระบบ | Sign out | (มีแล้ว) |
| งานของฉัน / จัดทำรายงาน SAR / ข้อมูลหลักสูตร / ผู้ดูแล | My work / SAR reporting / Programme data / Administration | หัวกลุ่มเมนู |
| วันนี้มี {n} งานที่ควรทำก่อน | {n} task(s) to do first today | การ์ดทักทาย |
| ไม่มีงานเร่งด่วน — ทำต่อจากที่ค้างไว้ได้เลย | Nothing urgent — pick up where you left off | การ์ดทักทาย |
| ทำงานถัดไป | Next task | ปุ่ม |
| ไปทำ | Go | ปุ่มแถว todo |
| ความคืบหน้ารอบ {ปี} | Cycle {year} progress | การ์ดทักทาย |
| หรือ | or | เส้นคั่น login |
| ขอเข้าใช้งาน | Request access | ปุ่ม/หัวหน้า |
| มีรหัสเชิญ | I have an invitation | ปุ่ม login |
| บัญชีนี้กำลังรอผู้ดูแลอนุมัติ — เมื่ออนุมัติแล้วจะเข้าสู่ระบบได้ | This account is awaiting administrator approval | login |
| บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบของมหาวิทยาลัย | This account is suspended. Please contact your university administrator | login |
| กรอกข้อมูลเพื่อขอบัญชี ผู้ดูแลระบบของมหาวิทยาลัยจะตรวจสอบและกำหนดบทบาทให้ | Fill in your details. Your university administrator will review and assign your role | หน้าขอเข้าใช้งาน |
| ข้อมูลของคุณ / ตั้งค่าการเข้าสู่ระบบ | About you / Sign-in details | หัวส่วนฟอร์ม |
| อีเมลมหาวิทยาลัย | University email | label |
| ใช้อีเมลที่ลงท้ายด้วยโดเมนของมหาวิทยาลัย | Use your university email address | help |
| อีเมลนี้ไม่ใช่โดเมนของมหาวิทยาลัยที่ใช้ระบบนี้ | This email domain is not registered with any university in this system | error |
| หลักสูตร/หน่วยงาน | Programme / unit | label |
| อื่น ๆ (ทั้งมหาวิทยาลัย) | Other (whole university) | option |
| ตำแหน่ง/หน้าที่ | Position / duty | label |
| เป็นข้อมูลประกอบ ไม่ใช่การเลือกสิทธิ์ | For reference only — this does not grant permissions | help |
| เหตุผลที่ขอใช้งาน | Reason for access | label |
| ยืนยันรหัสผ่าน | Confirm password | label |
| รหัสผ่านไม่ตรงกัน | Passwords do not match | error |
| อย่างน้อย 8 ตัวอักษร | At least 8 characters | help (มีแล้ว — ตรวจ) |
| (P1) ฉันรับทราบว่าข้อมูลนี้ใช้เพื่อพิจารณาให้สิทธิ์ใช้งานระบบเท่านั้น หากคำขอถูกปฏิเสธ ข้อมูลจะถูกลบ | I understand this information is used only to review my access request and will be deleted if the request is rejected | consent |
| ส่งคำขอ / ส่งคำขอแล้ว | Send request / Request sent | ปุ่ม/สำเร็จ |
| ระบบสาธิต: คำขอถูกเก็บในเบราว์เซอร์นี้เท่านั้น — ผู้ดูแลต้องเข้าสู่ระบบจากเบราว์เซอร์เดียวกันเพื่ออนุมัติ | Demo: requests are stored in this browser only — the administrator must sign in on the same browser to approve | หมายเหตุเดโม่ |
| ตั้งรหัสผ่านจากคำเชิญ | Set your password from an invitation | หัวหน้า invite |
| วางลิงก์หรือรหัสเชิญที่ได้รับจากผู้ดูแลระบบ | Paste the invitation link or code from your administrator | help |
| รหัสเชิญ | Invitation code | label |
| ถัดไป | Next | ปุ่ม |
| ยินดีต้อนรับ | Welcome | หัว |
| ลิงก์หมดอายุ | Link expires | dl |
| ตั้งรหัสผ่านและเข้าสู่ระบบ | Set password and sign in | ปุ่ม |
| ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว — ขอลิงก์ใหม่จากผู้ดูแลระบบ | This invitation link is invalid or has expired — ask your administrator for a new one | error |
| ตั้งรหัสผ่านเรียบร้อย ยินดีต้อนรับ | Password set — welcome | toast |
| คำขอเข้าใช้งาน | Access requests | แท็บ |
| ไม่มีคำขอรออนุมัติ | No pending requests | empty |
| หน่วยงานที่ขอ / บทบาทที่ให้ | Requested unit / Role to grant | label |
| อนุมัติ / ปฏิเสธ | Approve / Reject | ปุ่ม |
| วิธีให้ผู้ใช้เข้าระบบ | How the user signs in | radiogroup |
| ส่งลิงก์เชิญให้ผู้ใช้ตั้งรหัสผ่านเอง (แนะนำ) | Send an invitation link (recommended) | radio |
| ตั้งรหัสผ่านให้เลย | Set a password now | radio |
| คัดลอกลิงก์ / คัดลอกลิงก์แล้ว | Copy link / Link copied | ปุ่ม/toast |
| สร้างลิงก์ใหม่ / ยกเลิกคำเชิญ | New link / Cancel invitation | ปุ่ม |
| ใช้งานอยู่ / รอตั้งรหัสผ่าน / ระงับ | Active / Invited / Suspended | badge สถานะ |
| ระงับบัญชี / เปิดใช้อีกครั้ง | Suspend / Reactivate | ปุ่ม |
ข้อความ notification ภาษาอังกฤษสร้างที่ backend (`messageEn`) — ไม่ผ่าน dict · fallback ตาม kind (`NOTI_KIND_EN` ใน `lib/ui/notification.ts`): assigned "You have a new assignment" · comment "New comment" · changes_requested "Returned for changes" · approved "Approved" · cycle_status "Cycle status updated" · deadline "Deadline reminder" · access_request "New access request" · account "Account update"

## §F13 หน้าที่เหลือ (F3/F4/F5) — ใช้ saas-spec §P6–P21 ตามเดิม + ปรับ
- token earth อัตโนมัติ · การ์ด `rounded-xl` · ปุ่ม/ช่องกรอก `rounded-lg` · ระยะในการ์ด `p-5 md:p-6`
- 1 ปุ่ม primary ต่อการ์ด/แถบ (ที่เหลือ outline/ghost) · ตารางแถวสูง ≥48 · ไอคอนที่อยู่เดี่ยวในตารางต้องมี `aria-label` (ข้อยกเว้นเดียวของ "ไอคอนต้องมีข้อความ")
- clay ใช้ได้เฉพาะตามข้อห้าม §E2
