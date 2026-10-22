# Playbook — playtester

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U3] สคริปต์ที่บันทึก storageState ตอนจบ ห้าม pipe ผ่าน `head` — SIGPIPE ฆ่า node ก่อนบันทึก ขั้นถัดไปเล่นบน state เก่า → เขียนลงไฟล์แล้วค่อยอ่าน. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U3] เก็บ `state-<ขั้น>.json` ทุกขั้นของรอบ เพื่อย้อนเล่นขั้นเดียวซ้ำได้โดยไม่ต้องเดินรอบใหม่. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- svg `<text>` อ่านด้วย `textContent` ไม่ใช่ `innerText`
- รายงาน: U0 `.agents/playtest/TASK-0001-roles.md` (bug P1–P10), U1b `TASK-0001-spec-walkthrough.md` (paper walkthrough นับคลิกจาก wireframe), U3 `TASK-0001-roles-u3.md` + สคริปต์ `u3p/s0…s11`
- บัญชีเดโม่ (รหัส demo1234): lect1, staff1, chair1, data1, fqa1, dean1, assess1, uadmin; รอบเดโม่ `cycle-demo-2569`
- ให้ verdict หัวรายงานตรงกับจำนวนในเนื้อหา: U0 หัวเขียน major 6 แต่เนื้อหาติด major 15 จุด → xp-keeper นับตาม verdict (6)
