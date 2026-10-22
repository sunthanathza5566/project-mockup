# Playbook — ui-inspector

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U3] component ที่ตั้ง `display` เองทำให้ attribute `hidden` ไม่มีผล — ตรวจทุก element `[hidden]` ว่า computed display = none (พบ U3-1 major). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3] ตัวเลขในวงแหวน: วัดความกว้างข้อความเทียบเส้นผ่านวงใน ต้องเหลือ ≥8px ต่อข้าง. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3] ก่อน `next start` ตรวจว่ามี `.next/BUILD_ID` และไฟล์ source ไม่ใหม่กว่า build (build ค้างครึ่งทาง = 500). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- U0 audit (TASK-0001): รายงาน `.agents/reviews/TASK-0001-ui-audit.md`; ภาพ `.agents/screenshots/u0/` 58 ภาพ (`NN-หน้า-d|m.png` d=1440, m=390); ข้อมูลดิบ `.agents/playtest/u0-stats.json`; สคริปต์ `.agents/playtest/u0-audit.mjs`
- วิธีวัดที่ใช้: production build + `next start` + Playwright; contrast ด้วยสูตร WCAG; หน้าล้น = scrollWidth > viewport; นับ element ที่ font-size < 13px
- ผล U0: blocker 2 / major 8 / minor 7 (เกณฑ์ WCAG 2.2 AA; ตอนนั้น ui-ux.md ยังไม่มี) — ใช้เป็น baseline เทียบ U3
- U1b: สคริปต์ `.agents/playtest/u1b/{contrast,shoot,crop,heat125}.mjs` + `style-tile.html` (contrast.mjs ถูกย้ายเป็น `tests/contrast.test.ts` แล้ว)
- U3: รายงาน `.agents/reviews/TASK-0001-ui-u3.md`, 100 ภาพ `.agents/screenshots/u3/`, สคริปต์ `.agents/playtest/u3/{shoot,ac,verify,en}.mjs`; ใช้ axe-core แทน Lighthouse; ข้อ U0 ปิดครบ
- ใช้ port แยกกับ playtester (3951 vs 3952) และระวัง rebuild ทับ `.next` ร่วมกัน
