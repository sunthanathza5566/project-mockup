# Playbook — playtester

## RULES
- [TASK-0001 U3] สคริปต์ที่บันทึก storageState ตอนจบ ห้าม pipe ผ่าน `head` — SIGPIPE ฆ่า node ก่อนบันทึก ขั้นถัดไปเล่นบน state เก่า → เขียนลงไฟล์แล้วค่อยอ่าน. ใช้ซ้ำแล้ว 2 ครั้ง (TASK-0002 Play + Re-check)
- [TASK-0001 U3] เก็บ `state-<ขั้น>.json` ทุกขั้นของรอบ เพื่อย้อนเล่นขั้นเดียวซ้ำได้โดยไม่ต้องเดินรอบใหม่. ใช้ซ้ำแล้ว 2 ครั้ง (TASK-0002 `st-*.json` Play + Re-check) — state ผูกกับ origin: เปลี่ยน port ต้องเดินรอบใหม่ (st ของ :3950 ใช้กับ :3960 ไม่ได้)

## LESSONS
- [TASK-0002 Play] ระบบที่เก็บข้อมูลใน localStorage: flow "ส่งลิงก์ให้อีกคน" ลองทั้ง "แท็บใหม่ context เดิม" และ "context ใหม่" เสมอ (พบ U2). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Play] กดแจ้งเตือนแล้วอย่าดูแค่ URL — ตรวจว่าข้อมูลที่แจ้งเตือนพูดถึง (เหตุผล/งาน) อยู่บนหน้าปลายทางจริง (พบ U1). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Play] ตารางที่ทุกแถวมีปุ่มแก้ ลองกดในแถวที่ไม่ควรแก้ได้ (ตัวเอง, บทบาทสูงกว่า, บัญชีระงับ) ทุกครั้ง (พบ P4/P5). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 Re-check] ตรวจซ้ำ fix ที่ "เปิดทาง" ใหม่ ให้เดินต่อจนจบทางนั้น (P3 เปิดทางเพิ่มกรรมการ → พบ P12). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- svg `<text>` อ่านด้วย `textContent` ไม่ใช่ `innerText`
- รายงาน: U0 `.agents/playtest/TASK-0001-roles.md` (bug P1–P10), U1b `TASK-0001-spec-walkthrough.md` (paper walkthrough นับคลิกจาก wireframe), U3 `TASK-0001-roles-u3.md` + สคริปต์ `u3p/s0…s11`
- บัญชีเดโม่ (รหัส demo1234): lect1, staff1, chair1, data1, fqa1, dean1, assess1, uadmin; รอบเดโม่ `cycle-demo-2569`
- ให้ verdict หัวรายงานตรงกับจำนวนในเนื้อหา: U0 หัวเขียน major 6 แต่เนื้อหาติด major 15 จุด → xp-keeper นับตาม verdict (6)
- TASK-0002: รายงาน `.agents/reviews/TASK-0002-playtest.md` (รอบแรก major 5 → re-check PASS), สคริปต์ `.agents/playtest/final-play/` (`lib2.mjs`, `r01…r09.mjs`); state/`*.out`/log ไม่ commit · บัญชีเพิ่ม: uadmin2, sadmin (super admin)
