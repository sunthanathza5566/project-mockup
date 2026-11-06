# Playbook — docs-writer

## RULES
- [TASK-0001 D0.5 → เลื่อนจาก LESSONS ใน TASK-0003] คู่มือราย role ให้ไล่สิทธิ์จาก `lib/api/rbac.ts` POLICY คู่กับเงื่อนไขแสดงปุ่มในหน้าจริง — สิทธิ์ใน rbac อย่างเดียวไม่พอ (ปุ่ม "ให้ AI แนะนำ" ต้องมีทั้ง ai.check และ evidence.write ทำให้ QA คณะไม่เห็น). ใช้ซ้ำแล้ว 2 ครั้ง (TASK-0002: ROLE_SCOPE_TYPES, ปุ่มมอบหมายกรรมการ; TASK-0003 S7 sar.approve มีแค่ประธาน)
- [TASK-0002 เฟส 8 → เลื่อนจาก LESSONS ใน TASK-0003] ตาราง/แผน/research (เช่น ตาราง "คู่มือไม่ตรงระบบ" ของ playtester) อาจล้าหลังรอบแก้ล่าสุด (แถว 15-assessor P12 ถูกแก้ใน R2-F13) — ตรวจ Log ของ Build รอบหลังสุดก่อนเขียนตามตาราง. ใช้ซ้ำแล้ว 2 ครั้ง (TASK-0003 S7 ใช้ข้อความ toast หลัง c0059bd แทน research; S7b ยึด INDEX + Glob ไฟล์วิดีโอจริงแทนชื่อตามแผน)

## LESSONS
- [TASK-0001 D0.5] role ที่ playtester ไม่ได้เล่นจริง ต้องติดหมายเหตุ "อ้างอิงจากโค้ด" ในไฟล์คู่มือ ห้ามเขียนเหมือนผ่านการทดสอบ (เช่น `17-super-admin.md`). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002 17-super-admin)
- [TASK-0003 S7] คำแนะนำในคู่มือว่า "ให้คนอื่นทำแทน" ต้องเช็กกับ POLICY ว่ามี role อื่นทำ action นั้นได้จริง และสถานะข้อยังให้ทำได้ (sar.approve มีแค่ประธาน; ready_for_review แก้ไม่ได้ → ต้อง "ส่งกลับแก้ไขก่อน") — พบจุดผิดเพิ่ม 4 จุดนอกรายการ review. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 S7] เอกสารที่จะแปลงเป็น .docx ด้วย pandoc ใช้ตาราง/ข้อความลูกศรแทน code block และ mermaid (render รูปไม่ได้เมื่อไม่มี shell + code block ทำภาษาไทยเป็น monospace). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0003 S7b] อธิบายทางสำรองของปุ่มใน toast ต้องเทียบ flow ทั้งสองทางในโค้ด (ทางสำรองอาจไม่มี action ต่อเนื่องเหมือนกัน เช่น ปุ่มลัดไปหน้ามอบหมาย) แล้วบอกส่วนต่างให้ผู้ใช้. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- คู่มือผู้ใช้อยู่ `docs/guide/` (README, 00-overview, 01-new-user, 10–17 ราย role, 90-glossary) + `CHANGELOG.md` ที่ root (Keep a Changelog 1.1.0) · ภาพอ้างแบบ relative `../../.agents/screenshots/TASK-0002/final-*.png` (ไม่คัดลอกภาพ — รอ orchestrator ตัดสิน)
- แหล่งความจริงของขั้นตอน: `.agents/playtest/TASK-0001-roles-u3.md` + Log U3 fix; บัญชีเดโม่ `lib/mock-data/aunqa/org.ts`; ข้อจำกัด = `TASK-0001-security.md` กลุ่ม B
- ไม่มี Bash: ตรวจลิงก์ภาพด้วย Grep -o นับรูปแบบเต็ม `](../../.agents/screenshots/final/<ชื่อ>.png)` เทียบจำนวน `.png)` ทั้งหมด แล้วเทียบชื่อกับ Glob
- ยังไม่มี `standards/user-docs.md` (ช่องว่างอยู่ใน INDEX แล้ว) — ใช้ `ui-ux.md` ข้อ 1/5 เป็นแนวเขียน
- backlog จาก D0.5: UI ตอบกลับความเห็น, super_admin จัดการมหาวิทยาลัยอื่น, รหัสผ่าน 8 (UI) vs 6 (lib), ชื่อ .bat "EduFlow", `.env.example`
- (TASK-0003) คู่มือบทบาท `docs/walkthrough/ROLE_GUIDE.md` + `.docx` (8 หัวข้อ, ตาราง N1–N14, ชุดข้อมูล 27 เคส, วิดีโอ V00–V11, FAQ) · แปลง docx: `pandoc docs/walkthrough/ROLE_GUIDE.md -o docs/walkthrough/ROLE_GUIDE.docx --reference-doc thesis/templates/reference.docx` — docs-writer ไม่มี shell ต้องส่ง orchestrator รันพร้อมคำสั่งตรวจ (Heading/ตาราง/รูป) · ทุกข้อเท็จจริงใส่ file:line อ้างอิง (reviewer สุ่ม 14 จุดตรงหมด)
