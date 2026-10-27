# Playbook — frontend-dev

## RULES
- [incident: TASK-0002 AC-10 x3 + BUG-0002-Q1-1] ก่อน commit grep diff ของตัวเองหาอักขระ U+2600–27BF/emoji และคำที่เทสต์ grep (`outline-none` ฯลฯ) **รวมในคอมเมนต์** — grep ไม่แยกคอมเมนต์ (☰ ใน AppTopbar R2-F1, ☰ ใน LandingNav R2-F7, ✓ ใน assess R2-F3 หลุดถึง e2e แล้ว orchestrator ต้องแก้). หลัง R2-F10 สแกนทุกรอบแล้วไม่หลุดอีก
- [TASK-0001 U2-F1 → ใช้ซ้ำ S1, R2-F1, R2-F3] popover/tooltip ที่ห้ามทำให้เกิด h-scroll ใช้ `position: fixed` + คำนวณตำแหน่ง (right จาก getBoundingClientRect ใน useLayoutEffect) แล้วบีบใน `clientWidth`. ใช้ซ้ำแล้ว 3 ครั้ง
- [TASK-0001 U3 fix → ใช้ซ้ำ R2-F3, R2-F13, R2-F14] สลับ layout ด้วย early-return คนละโครง JSX ทำให้ children remount และข้อความที่พิมพ์ค้างหาย → คงโครง DOM/testid เดิมแล้วซ่อนบางส่วน. ใช้ซ้ำแล้ว 3 ครั้ง
- [incident: TASK-0002 N1 → N7] ตารางที่มีคอลัมน์ปุ่ม: ผลรวม min-content ต้อง < กรอบที่แคบสุดของโหมดตาราง ถ้าไม่ได้ให้สลับเป็นการ์ดเร็วขึ้น (ห้ามแก้ด้วย `whitespace-nowrap` อย่างเดียว) และจุดสลับใช้ **container query หน่วย rem** บนกรอบจริง ไม่ใช่ media query px (ไม่ขยายตาม fontScale 125%). ใช้ซ้ำแล้ว 1 ครั้ง (R2-F14)

## LESSONS
- [TASK-0001 U2-F1] เขียน CSS ใหม่ทั้งไฟล์: inventory `className` + `var(--…)` inline ก่อน แล้วให้ของเก่าอยู่ร่วม (alias/legacy.css) จนถึงขั้น cutover. ใช้ซ้ำแล้ว 1 ครั้ง (S0)
- [TASK-0001 U2-F2] control ที่อยู่คนละที่ตาม breakpoint แต่ testid เดียว: element เดียว + CSS ย้ายตำแหน่ง ไม่ render สองชุด. ใช้ซ้ำแล้ว 1 ครั้ง (S2)
- [TASK-0001 U2-F2] dialog ที่ "ยกเลิก" มีผลจริง ต้อง `dismissible:false`; dismiss แยกจาก cancel. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F4] handler ที่ถูกเรียกจากภายนอก (flush/beforeunload/hash listener) อ่านค่าผ่าน ref "live". ใช้ซ้ำแล้ว 1 ครั้ง (actions hash — reviewer ยืนยัน)
- [TASK-0001 U2-F4 + TASK-0002 R2-F7] ตัวเลข/ประโยคสรุปบนจอที่คู่กับรายการหรือกฎ backend ต้องคำนวณจากฟังก์ชันเดียวกัน (`countWords`, `homeTotal`). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U2-F5] pattern regex ของ dict แปลต้องแคบเท่ารูปแบบจริง วาง pattern ทั่วไปท้ายสุด; เพิ่ม pattern ของตัวเองด้วย `PATTERNS.unshift(…)` ใต้หัวหมวดตัวเอง. ใช้ซ้ำแล้ว 1 ครั้ง (R2-F8)
- [TASK-0001 U2-F5] วัดความครบ EN ด้วยสคริปต์ ไม่ไล่อ่าน — Playwright harvest หรือ esbuild bundle dict แล้วเรียก `lookupEn` กับข้อความที่ดึงจากไฟล์ (แทน `${}` ด้วย "1"); ผลต้อง "ไม่มีอักษรไทย" ไม่ใช่แค่ "มีผล" (pattern ท้ายสุดแปลได้ครึ่งเดียว — R2-F2b). ใช้ซ้ำแล้ว 3 ครั้ง (R2-F2b, R2-F9, R2-F15)
- [TASK-0002 S2] ช่วงที่ CSS เก่ายังโหลด utility ชนะได้เฉพาะ specificity เท่ากันและมาทีหลัง — ไล่กฎเก่าของ hook class (`:first-child`, `[aria-*]`, `::before`, `:visited`) แล้วใช้ variant ก่อน `!`. ใช้ซ้ำแล้ว 1 ครั้ง (S1.5)
- [TASK-0002 S0] shadcn CLI รุ่นเก่าใส่ dependency แบบ `^` → `npm install --save-exact <pkg>@<ver>` ซ้ำ; ก่อนรัน CLI ที่อาจทับ config ให้สำรองไว้ใน scratchpad แล้ว `diff -q` หลังรัน. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 S1.5] ก่อนสรุปว่า e2e ล้มเพราะงานตัวเอง stash ไฟล์ตัวเองแล้วรันเคสนั้นเดี่ยวบน HEAD · class ที่เทสต์อ้างด้วย regex (`toHaveClass(/is-open/)`) ห้ามโผล่ใน arbitrary variant ของ Tailwind. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F0] ก่อนเพิ่ม key ใน dict แปล สคริปต์ตรวจ key ซ้ำทุกไฟล์ dict — ซ้ำข้ามไฟล์ = override เงียบ (เช่น "อนุมัติ" ปุ่ม vs สถานะ). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F2] token ใน URL fragment: อ่านครั้งเดียวเก็บใน ref แล้ว `history.replaceState` ลบ (strict mode รัน effect ซ้ำ) · label ที่มี "*" แยก `<span aria-hidden> *</span>` เพื่อใช้ key dict เดิม. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F1] `backdrop-filter`/`filter`/`transform` บน ancestor ทำให้ลูก `position: fixed` อิง ancestor → วางพื้นเบลอบนชั้นลูก absolute `-z-10`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F4/F8] Next 14 app router เปลี่ยนแค่ hash ไม่ยิง `hashchange` → ปลายทางอ่าน hash ใน effect หลัง mount; `<Link>` ไป hash หน้าเดิมให้ดัก onClick แล้ว `pushState` + dispatch `HashChangeEvent` เอง. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F5] ปลายทาง deep link ที่อาจถูกตัวกรอง/ขอบเขตซ่อน ต้องปลดตัวกรองหรือสลับขอบเขตให้เอง. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F6] หน้าแท็บที่รับ `?tab=` ต้อง sync URL (replace) ตอนกดแท็บ · ตัวเลือกขอบเขตสร้างจาก tenant ของ "เป้าหมาย" ไม่ใช่ผู้ใช้ปัจจุบัน (super_admin เห็นข้าม tenant). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 S6] ตัด CSS เก่าทั้งก้อน: dump computed style ทุก element ก่อน/หลังด้วย Playwright แล้ว diff จัดกลุ่ม (reviewer ชม — เจอ badge ตัดบรรทัด/textarea ไม่ยืด) · ก่อนลบ shim ย้ายค่าเริ่มต้นของ shim ไปที่ prop default. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F9] กรองตัวเลือกตามสถานะ แยก "ชุดสำหรับเลือก" ออกจาก "ชุดสำหรับแสดงชื่อ" และคงค่าที่เลือกไว้เดิม. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 BUG-0002-Q6-1] element ที่ซ่อนด้วย `visibility` + transition จะ focus ไม่ได้ในเฟรมที่เพิ่งเปิด → ตอนเปิดอย่า transition visibility. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F11] ปุ่มที่ซ่อนตามสิทธิ์ต้อง OR ทุก action ที่หน้าปลายทางรองรับ (`cycle.assign | assessor.assign`) · ข้อความที่ถูกล็อกด้วยเทสต์ชั้นข้อมูล แปลงที่ชั้นแสดงผลด้วย pure function. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F10] ตารางที่มีหลาย action ต่อแถว: แถวแสดงข้อมูล + ปุ่ม "จัดการ" เปิดแผงใต้แถว (testid เดิมอยู่ใน container เดิม) · ตัวเลือกที่ให้สิทธิ์ถ้าเดาไม่ได้ตรงระดับ ให้ "ยังไม่เลือก" แล้วบังคับเลือก. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2-F12] ค่าที่ "ห้ามเลือก" ตามสถานะ ส่งเป็น prop map เหตุผล (aria-disabled + ป้าย) ไม่ซ่อน — หน้าที่ไม่ส่ง prop ไม่เปลี่ยน. ใช้ซ้ำแล้ว 1 ครั้ง (R2-F13 P13)
- [TASK-0002 R2-F15] ข้อความที่แสดงผ่าน CSS `content: attr(x)` คือข้อความที่ผู้ใช้เห็น → ต้องเพิ่ม attribute นั้นใน `ATTRS` ของ dom-translate. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- ทุก call ผ่าน `@/lib/api`; ต้อง `await initAunqa()` ก่อนใช้ (client เท่านั้น)
- ปุ่ม/เมนูซ่อนตาม can() ได้ แต่ lib ตรวจซ้ำเสมอ อย่าถือว่า UI เป็นด่านเดียว
- route ของ section: `/app/sections/[id]` โดย id = encodeURIComponent(cycleId::reqId) เช่น `cycle-demo-2569%3A%3A1.1`
- หน้า Phase B: `/app/curriculum`, `/app/actions`, `/app/cycles/[id]/assess` (กรรมการ); ปุ่มส่งกลับของคณบดีใช้ prompt บังคับ note
- (TASK-0002) stack: Tailwind 3.4 + shadcn primitives (`components/ui/primitives/*`, `cn()` จาก `@/lib/ui/cn`) + next-themes (ค่าเริ่มต้น light, dark ไม่ดำสนิท) · ฟอนต์ IBM Plex Sans Thai Looped · legacy.css ถูกลบใน S6, preflight เปิดแล้ว · token earth ตาม `.agents/decisions/ui/earth-tokens.md`
- (TASK-0002) class `aq-*` ใหม่ห้าม — allowlist อยู่ `tests/ui-cleanup.test.ts` (saas-spec §H); ใช้ arbitrary property/variant ของ Tailwind แทน
- (TASK-0002) ตารางโหมดการ์ด: wrapper `[container-type:inline-size]` + `data-label` ต่อเซลล์ (แปลผ่าน dom-translate แล้ว); จุดสลับต่อหน้าจด Log R2-F14
- lint: ยังไม่มี ESLint config → ข้าม; smoke จริงใช้ Playwright กับ `next start`; demo password demo1234
- EN i18n: `lib/i18n/dict-aunqa.ts` (EN dict + PATTERNS `^…$`) + `lib/i18n/dom-translate.ts` (แปล text/placeholder/aria-label/title/data-label ผ่าน node.data/setAttribute เท่านั้น ห้าม innerHTML); key = ข้อความไทยทั้ง text node → `{expr}` กลางประโยคต้องเป็น template string เดียว
- Next 14: `app/not-found.tsx` แบบ `'use client'` ทำ build ล้ม → server component ที่ render client view (`components/ui/NotFoundView.tsx`)
- Chrome ให้ `ul` ที่ scroll ได้รับ Tab → listbox ของ combobox ใส่ `tabIndex=-1`; combobox ต้องปิดเมื่อ blur ออกนอกกล่อง (U-6)
- SVG กราฟ: วาดที่ px จริง (ResizeObserver, viewBox = ขนาดจริง) ไม่งั้น font 13px ถูกย่อเหลือ 7.5px (BUG-0001-U2Q-1)
- Bash เครื่องนี้: heredoc ยาวที่มีไทย + backtick parse พัง, `cat > file` ไม่มี stdin ค้าง → เขียนไฟล์ด้วย Write tool
- ทำขนานกับ agent อื่นใน tree เดียว: ห้าม `next build`/e2e (rebuild `.next` ทำให้ `next start` ที่รันอยู่ชี้ CSS เก่า และ kill ไม่ได้) → พิสูจน์ diff ตัวเองด้วย `git worktree` ชั่วคราว + junction node_modules (ลบ junction ด้วย `(Get-Item).Delete()` ก่อน `worktree remove`) แล้ว commit ด้วย `git commit -- <paths>`
- session: AppShell ฟัง pointerdown/keydown/input ทั้งแอป → `touchSession()`; ระหว่าง `sessionLost` ซ่อน sidebar/topbar
- testid ห้ามขึ้นต้น `heat-`/`mywork-` ใหม่; testid รอบ 2: `user-menu`, `display-menu`, `theme-segment-*`, `nav-menu`, `landing-menu-btn`, `ra-*` (ขอเข้าใช้งาน), `invite-result`
