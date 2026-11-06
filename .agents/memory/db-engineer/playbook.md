# Playbook — db-engineer

## RULES
- [incident: TASK-0003 seed ไม่มีเส้นทางที่ถูก → เจ้าของเข้าใจผิดว่าประธานไม่ได้แจ้งเตือน] seed/fixture ที่ต้องมีผลข้างเคียง (แจ้งเตือน, audit, review event) ให้เดินผ่าน API จริง; ถ้าจำเป็นต้องเขียนสถานะตรง ต้องสร้างผลข้างเคียงคู่กันด้วยข้อความ/kind/target เดียวกับโค้ดจริง + `dedupeKey` ให้ idempotent · ทุก role ต้องมีเส้นทางสาธิตที่ถูกใน seed มาตรฐาน. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0003 security S-1 Medium] ฟังก์ชัน seed/reset ที่ทำลายข้อมูลต้องรับ `actor` ของคนที่กดจริงและตรวจสิทธิ์ (role + active) ก่อนแตะข้อมูล — ห้ามดึงบัญชี admin จาก store มาเรียกแทน (confused deputy); guard ที่ UI อย่างเดียวไม่นับ. ใช้ซ้ำแล้ว 0 ครั้ง

## LESSONS
- [TASK-0003 S4] ก่อนเปลี่ยน seed มาตรฐาน จำลองผลกับเทสต์ทั้งชุดโดยไม่แก้ไฟล์นอกโซน (vite `transform` plugin ใน config ชั่วคราว) แล้วระบุเทสต์ที่ต้องตามแก้แบบ file:line ให้เจ้าของโซน (ได้ผล: backend แก้ตรง 2 จุด 850 ผ่าน). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 S4] ข้อมูลที่ขึ้นกับวันที่ (deadline) ตรวจกับสูตรจริงของระบบ (`daysUntil` นับถึง 23:59 → +1 วัน = bucket 3) อย่าเดา offset. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 fix รอบ 1] เทสต์ "ปฏิเสธโดยไม่แตะข้อมูล" เทียบ snapshot localStorage ทั้งก้อนก่อน/หลัง (รวมกรณี storage ว่าง) ไม่ใช่เช็กแค่ throw · ตรวจ role จาก object ก่อน `initAunqa()` เพื่อไม่ให้ non-super ทำให้เกิด seed. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- seed ที่ `lib/mock-data/aunqa/{framework,metrics,org,evidence,metrics-demo,narratives,curriculum,actions,index}.ts`: 8 criteria / 53 requirements
- demo accounts (password demo1234): sadmin, uadmin, chair1, staff1, lect1, lect2, data1, fqa1, dean1, assess1 (cycle-demo-2569), uadmin2
- `DEMO_EVIDENCE[12].extractedText` มีเลขบัตร ปชช. ปลอม `1-1017-00123-45-6` ไว้ทดสอบ PII scan — ห้ามลบถ้า qa ยังอ้างอยู่
- narratives 53 ข้อ (approved 45 / ready 5 / drafting 3; TASK-0003 F4: 3.6 มีเจ้าของ staff1, ยังไม่มีเจ้าของ 5.1/7.9, chair1 มีแจ้งเตือน N3 ยังไม่อ่าน 5) + curriculum (6 PLO, 12 วิชา, 23 CLO; PLO6 ไม่มีวิชา, PLO4 ไม่มีวิธีวัด) + action items 6 รายการ — ใช้ทดสอบ R7 และ M14
- อีเมล/ชื่อ/เบอร์ทั้งหมดสมมติ (โดเมน *.example); textEn บางข้อใกล้ Guide v4.0 ไม่ใช่ verbatim → ตรวจกับต้นฉบับก่อนใส่เล่ม
- ยังไม่มี SQL migration ข้อมูลเป็น seed ล้วน
- (TASK-0003) F4 `lib/mock-data/aunqa/standard-extras.ts` (ไม่ export ผ่าน `aunqa/index.ts` — วงจร import) · scenario pack `lib/mock-data/aunqa/scenarios/` 27 เคส + `README.md`: `listScenarios()`, `loadScenarioPack(actor, id?)`, `resetToStandardSeed(actor)` · บัญชี scenario เพิ่ม (staff2, newreq1/2, rejreq1, exstaff, mrole1, chairu2 ฯลฯ ดู README) · โหลดทั้งหมด ≈ 5 วิ, localStorage ≈ 2.1M ตัวอักษร · `withClockShift` patch `Date.now` global — ห้ามใช้นอก loader/ห้ามพาไป backend · เทสต์ถาวร `tests/scenario-pack.test.ts`
- (TASK-0003, incident) `npx tsc --noEmit -p eduflow-next` จาก root repo ให้ผลเขียวปลอม (root ไม่มี typescript → npx ขึ้น "not the tsc command" แต่ exit 0) — รัน `cd eduflow-next && npx tsc --noEmit -p .` เสมอ (frontend-dev S3b เคยรายงาน "ไม่มี error" ด้วยรูปแบบนี้)
