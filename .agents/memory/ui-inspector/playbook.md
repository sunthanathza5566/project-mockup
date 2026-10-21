# Playbook — ui-inspector

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- U0 audit (TASK-0001): รายงาน `.agents/reviews/TASK-0001-ui-audit.md`; ภาพ `.agents/screenshots/u0/` 58 ภาพ (`NN-หน้า-d|m.png` d=1440, m=390); ข้อมูลดิบ `.agents/playtest/u0-stats.json`; สคริปต์ `.agents/playtest/u0-audit.mjs`
- วิธีวัดที่ใช้: production build + `next start` + Playwright; contrast ด้วยสูตร WCAG; หน้าล้น = scrollWidth > viewport; นับ element ที่ font-size < 13px
- ผล U0: blocker 2 / major 8 / minor 7 (เกณฑ์ WCAG 2.2 AA; ตอนนั้น ui-ux.md ยังไม่มี) — ใช้เป็น baseline เทียบ U3
