# Playbook — code-reader

## RULES
- [incident: TASK-0003 เจ้าของเข้าใจว่า "ประธานไม่ได้แจ้งเตือน" เป็นบั๊ก] สืบบั๊กพฤติกรรมทุกครั้งตรวจด้วยว่า seed มี "เส้นทางสาธิตที่ถูก" ให้แต่ละ role หรือไม่ — seed ที่เขียน status ตรงลง store ไม่มีแจ้งเตือน/review event คู่ และอาจบังคับผู้ทดลองให้ใช้บัญชีผิด (3.6/5.1/7.9 ไม่มีเจ้าของ → ต้องใช้ chair1 เขียนเอง). ใช้ซ้ำแล้ว 0 ครั้ง

## LESSONS
- [TASK-0002 R1] ก่อนแผน redesign grep เทสต์หา selector ที่เป็น class/element/getComputedStyle/ฟอนต์ ด้วย ไม่ใช่แค่ testid — เทสต์ design มักผูกชื่อ class, outline และฟอนต์จริง (พบ AC-09 Sarabun, hex lock, light-only). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R1] SYSTEM_MAP ที่เก่ากว่าการ pivot ใหญ่ ให้ใส่คำเตือนหัวไฟล์ระบุหัวข้อที่ยังล้าสมัย แทนการปล่อยให้ดูเหมือนตรง HEAD. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2] ก่อนออกแบบ deep link ของแจ้งเตือน ทำตาราง "จุดเรียก notify × field ที่มี × หน้าปลายทาง" — เห็นช่องว่าง (noti ที่ไม่มี cycleId) ทันที · ระบบที่ auth อยู่ใน localStorage ต้องเตือน architect ว่า flow หลายผู้ใช้ (ขอ/อนุมัติ/เชิญ) ข้ามเครื่องไม่ได้. ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0003 S1 ตาราง N1–N14 + จุดที่ไม่มีแจ้งเตือน)
- [TASK-0003 S1] บั๊ก "ไม่ได้แจ้งเตือน": ไล่สูตรผู้รับก่อน (`chairsOf(...).filter(u => u.id !== actor.id)` = ผู้รับ − actor) แล้วเช็กว่าผู้ทดลองถูกบังคับให้เป็น actor = ผู้รับหรือไม่ · ยืนยันด้วย repro vitest ก่อนส่งให้ build. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- SYSTEM_MAP: TASK-0002 อัปเดต Routes & Pages + Frontend (R1) และโซน lib auth/users/notifications/rbac (R2); ข้อมูลทั้งหมดอยู่ localStorage prefix `aunqa_` ไม่มี SQL/migration
- ชื่อตกค้างจาก EduFlow: `context/LangContext.tsx` key `eduflow_lang_pages` (ไม่กระทบการทำงาน)
- repro vitest นอก `tests/`: config เป็น object ธรรมดา (ห้าม import `vitest/config`) `root`=eduflow-next, `test.dir`=โฟลเดอร์ scratch, `globals:true`, `setupFiles: tests/setup.ts` — ตัวอย่าง `.agents/playtest/TASK-0003/vitest.repro.config.ts` (ความรู้เดียวกับ backend-dev)
- (TASK-0003) `.agents/research/TASK-0003-roles.md` = แผนที่ role/แจ้งเตือน N1–N14/workflow ทุกสถานะ/onboarding 4 ทาง — ใช้ก่อนอ่านโค้ดซ้ำ
- (TASK-0003, incident) `npx tsc --noEmit -p eduflow-next` จาก root repo ให้ผลเขียวปลอม (root ไม่มี typescript → npx ขึ้น "not the tsc command" แต่ exit 0) — รัน `cd eduflow-next && npx tsc --noEmit -p .` เสมอ (frontend-dev S3b เคยรายงาน "ไม่มี error" ด้วยรูปแบบนี้)
