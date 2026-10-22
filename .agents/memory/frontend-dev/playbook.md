# Playbook — frontend-dev

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U2-F1] เขียน globals.css ใหม่ทั้งไฟล์: inventory `className` + `var(--…)` inline ในทุก TSX ก่อน แล้ว alias ตัวแปรเก่าไป token ใหม่ในหมวด LEGACY ชั่วคราว → หน้าเดิมไม่แตก E2E ผ่านรอบแรก. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F1] popover/tooltip ที่ห้ามทำให้เกิด h-scroll ใช้ `position: fixed` + บีบตำแหน่งใน `clientWidth` ตอนเปิด. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F2] control ที่อยู่คนละที่ตาม breakpoint แต่ testid เดียว: element เดียว + CSS grid-area ย้าย ไม่ render สองชุด. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F2] dialog ที่ "ยกเลิก" มีผลจริง (เช่น ออกจากระบบ) ต้อง `dismissible:false`; ผลของ dismiss ต้องแยกจาก cancel (`choose()` คืน 'dismissed' — U2-1). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F4] handler ที่ถูกเรียกจากภายนอก (flush/beforeunload/visibilitychange) อ่านค่าผ่าน ref "live" ที่อัปเดตทุก render (reviewer ยืนยันว่าเป็นแบบที่ดี). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F4] ตัวนับใน UI ที่แสดงคู่กฎ backend ต้องใช้ฟังก์ชันเดียวกัน (`countWords` ของ lib/utils/text) — นับคำไทยด้วยช่องว่างได้ 24 แต่ Segmenter ได้ 108. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F5] pattern regex ของ dict แปลต้องแคบเท่ารูปแบบจริง (`\S+` แปลผิดเงียบ ๆ) และวาง pattern ทั่วไปไว้ท้ายสุด. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F5] วัดความครบของ EN ด้วย Playwright harvest ข้อความไทยทุกหน้าหลังสลับ EN (748 → เหลือ seed) ดีกว่าไล่อ่านโค้ด. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3 fix] สลับ layout ด้วย early-return คนละโครง JSX ทำให้ children remount และข้อความที่พิมพ์ค้างหาย → คงโครง DOM เดิมแล้วซ่อนบางส่วน. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- ทุก call ผ่าน `@/lib/api`; ต้อง `await initAunqa()` ก่อนใช้ (client เท่านั้น)
- ปุ่ม/เมนูซ่อนตาม can() ได้ แต่ lib ตรวจซ้ำเสมอ อย่าถือว่า UI เป็นด่านเดียว
- route ของ section: `/app/sections/[id]` โดย id = encodeURIComponent(cycleId::reqId) เช่น `cycle-demo-2569%3A%3A1.1`
- หน้า Phase B: `/app/curriculum`, `/app/actions`, `/app/cycles/[id]/assess` (กรรมการ); ปุ่มส่งกลับของคณบดีใช้ prompt บังคับ note
- globals.css (Phase U) เรียง: tokens → base → components C0–C24 → 4. PAGES → utilities → reduced-motion; หมวด LEGACY ลบแล้วใน F5; หน้าใหม่เติม CSS ได้เฉพาะหมวด PAGES; base มี `[hidden]{display:none!important}` (U3-1)
- lint: ยังไม่มี ESLint config → ข้าม; smoke จริงใช้ Playwright กับ `next start`; demo password demo1234
- EN i18n (C2): `lib/i18n/dict-aunqa.ts` (EN dict + PATTERNS regex แบบ `^…$`) + `lib/i18n/dom-translate.ts` (แปล text/placeholder/aria-label/title ผ่าน node.data/setAttribute เท่านั้น ห้าม innerHTML); key = ข้อความไทย
- หน้า import metric: `app/app/metrics/page.tsx` + `components/aunqa/MetricImport.tsx`; ปุ่ม DOCX หลัก + `.doc` สำรอง
- C-7 (MetricImport key + seq ทิ้ง dryRun เก่า) และ C-10 (dom-translate แปล attribute) ปิดแล้วใน U2-F5
- Next 14: `app/not-found.tsx` แบบ `'use client'` ทำ build ล้ม (`PageNotFoundError: /_document`) → server component ที่ render client view (`components/ui/NotFoundView.tsx`)
- dom-translate ใช้ text node ทั้งก้อนเป็น key → JSX ที่มี `{expr}` กลางประโยคต้องเป็น template string เดียว; dict Phase U อยู่ `lib/i18n/dict-phase-u.ts`
- Chrome ให้ `ul` ที่ scroll ได้รับ Tab → listbox ของ combobox ใส่ `tabIndex=-1`; combobox ต้องปิดเมื่อ blur ออกนอกกล่อง (U-6)
- SVG กราฟ: วาดที่ px จริง (ResizeObserver, viewBox = ขนาดจริง) ไม่งั้น font 13px ถูกย่อเหลือ 7.5px (BUG-0001-U2Q-1)
- heredoc ยาวที่มีไทย + backtick ใน Bash ของเครื่องนี้ parse พัง → เขียนสคริปต์ด้วย Write tool แล้วค่อยรัน (xp-keeper เจอซ้ำใน Phase U debrief)
- session: AppShell ฟัง pointerdown/keydown/input ทั้งแอป → `touchSession()`; ระหว่าง `sessionLost` ซ่อน sidebar/topbar, ดัก click/keydown ใน `<main>` ถามก่อน `endSession()`
- testid ใหม่ Phase U: `return-reason`, `review-history`, `save-conflict`, `conflict-reload`, `shell-lost`, `session-lost-login`, `home-add-evidence`, `assign-unowned`, `heat-legend`, `cycle-closed-next`; ห้ามขึ้นต้น `heat-`/`mywork-` ใหม่
