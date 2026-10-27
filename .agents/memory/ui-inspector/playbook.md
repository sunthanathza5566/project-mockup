# Playbook — ui-inspector

## RULES
- [TASK-0001 U3] ก่อน `next start` ตรวจว่ามี `.next/BUILD_ID` และไฟล์ source ไม่ใหม่กว่า build (build ค้างครึ่งทาง = 500). ใช้ซ้ำแล้ว 3 ครั้ง (D0 rebuild; TASK-0002 เฟส 7 BUILD_ID 02:12:10 > commit 02:11:37; re-check ทุกรอบ) — ถ้าใช้ server กลางที่ orchestrator เปิด ให้จด HEAD/BUILD_ID ที่ตรวจในรายงาน
- [incident: TASK-0002 N1 → N7] ตารางที่มีคอลัมน์ปุ่ม วัดทุกความกว้าง 1024–1366 (และ 768) ที่ fontScale 100% **และ 125%** ว่าปุ่มไม่หลุดกรอบ wrapper (`visibleW < w`) — h-scroll ทั้งหน้าไม่เห็นปัญหานี้; แล้วสแกนทุก wrapper `overflow-x:auto` ที่ sw>cw ทั้งระบบ (เจอ N8 ในหน้าที่ไม่ได้อยู่ในรายการแก้)

## LESSONS
- [TASK-0001 U3] component ที่ตั้ง `display` เองทำให้ attribute `hidden` ไม่มีผล — ตรวจทุก element `[hidden]` ว่า computed display = none (พบ U3-1 major). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3] ตัวเลขในวงแหวน: วัดความกว้างข้อความเทียบเส้นผ่านวงใน ต้องเหลือ ≥8px ต่อข้าง. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 V1] ตรวจ `::before/::after` ของ element ที่ active ด้วย — CSS เก่าที่ยังโหลดทำสีนอกธีมหลุดมาโดย class Tailwind ไม่เห็น (m1 แถบ indigo) · panel แจ้งเตือนว่างให้ใช้ผู้ใช้ที่ไม่มี deadline reminder. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 เฟส 7] หน้า "จัดการ" ที่มี control ต่อแถวหลายตัว วัด `select.scrollWidth > clientWidth` และความสูงปุ่ม (ตกบรรทัด) — contrast/clip ไม่จับปัญหา "แน่นเกิน" (พบ M1). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Re-check 3] ตารางโหมดการ์ด วัด `getComputedStyle(td,'::before').content` ว่าป้ายไม่ว่าง/ไม่เป็นไทยในโหมด EN/เซลล์มีป้ายแต่ไม่มีค่า + เทียบความสูงหน้ากับโหมดตาราง. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- U0 audit (TASK-0001): รายงาน `.agents/reviews/TASK-0001-ui-audit.md`; ภาพ `.agents/screenshots/u0/` 58 ภาพ (`NN-หน้า-d|m.png` d=1440, m=390); ข้อมูลดิบ `.agents/playtest/u0-stats.json`; สคริปต์ `.agents/playtest/u0-audit.mjs`
- วิธีวัดที่ใช้: production build + `next start` + Playwright; contrast ด้วยสูตร WCAG; หน้าล้น = scrollWidth > viewport; นับ element ที่ font-size < 13px
- ผล U0: blocker 2 / major 8 / minor 7 (เกณฑ์ WCAG 2.2 AA; ตอนนั้น ui-ux.md ยังไม่มี) — ใช้เป็น baseline เทียบ U3
- U1b: สคริปต์ `.agents/playtest/u1b/{contrast,shoot,crop,heat125}.mjs` + `style-tile.html` (contrast.mjs ถูกย้ายเป็น `tests/contrast.test.ts` แล้ว)
- U3: รายงาน `.agents/reviews/TASK-0001-ui-u3.md`, 100 ภาพ `.agents/screenshots/u3/`, สคริปต์ `.agents/playtest/u3/{shoot,ac,verify,en}.mjs`; ใช้ axe-core แทน Lighthouse; ข้อ U0 ปิดครบ
- D0: ภาพชุดสุดท้าย `.agents/screenshots/final/` 50 ภาพ (46 ที่ 1440 + 4 ที่ 390) + `INDEX.md` + `final-checks.json`; สคริปต์ `.agents/playtest/u3/final.mjs` (เดินรอบจริงผ่าน UI); docs-writer/thesis-writer เลือกภาพจาก INDEX นี้ · ยังขาดภาพผล AI-2/AI-4 โหมดออฟไลน์ (thesis-writer ขอ)
- font < 13px ใน `/app/metrics` 16 ตัว = ชื่อแกนหมุน −90° (ผลบวกลวง)
- ใช้ port แยกกับ playtester (3951 vs 3952) และระวัง rebuild ทับ `.next` ร่วมกัน
- TASK-0002: รายงาน `.agents/reviews/TASK-0002-ui-v1.md` + `TASK-0002-ui.md` (เฟส 7 + re-check 1–3), ภาพ `.agents/screenshots/TASK-0002/{v1,final}-*` + `INDEX.md`, สคริปต์ `.agents/playtest/final-ui/` (`recheck3-tables.mjs` ตรวจทุกตาราง 476 views, `recheck3-axe.mjs`)
- ใช้ axe-core จาก node_modules แทน Lighthouse; scan stylesheet หา `:hover` ที่มี transform เพื่อพิสูจน์ AC "การ์ดไม่เลื่อนตอน hover"
