# Playbook — docs-writer

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 D0.5] คู่มือราย role ให้ไล่สิทธิ์จาก `lib/api/rbac.ts` POLICY คู่กับเงื่อนไขแสดงปุ่มในหน้าจริง — สิทธิ์ใน rbac อย่างเดียวไม่พอ (ปุ่ม "ให้ AI แนะนำ" ต้องมีทั้ง ai.check และ evidence.write ทำให้ QA คณะไม่เห็น). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002: ROLE_SCOPE_TYPES, ปุ่มมอบหมายกรรมการ)
- [TASK-0001 D0.5] role ที่ playtester ไม่ได้เล่นจริง ต้องติดหมายเหตุ "อ้างอิงจากโค้ด" ในไฟล์คู่มือ ห้ามเขียนเหมือนผ่านการทดสอบ (เช่น `17-super-admin.md`). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002 17-super-admin)
- [TASK-0002 เฟส 8] ตาราง "คู่มือไม่ตรงระบบ" ของ playtester อาจล้าหลังรอบแก้ล่าสุด (แถว 15-assessor P12 ถูกแก้ใน R2-F13) — ตรวจ Log ของ Build รอบหลังสุดก่อนเขียนตามตาราง. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- คู่มือผู้ใช้อยู่ `docs/guide/` (README, 00-overview, 01-new-user, 10–17 ราย role, 90-glossary) + `CHANGELOG.md` ที่ root (Keep a Changelog 1.1.0) · ภาพอ้างแบบ relative `../../.agents/screenshots/TASK-0002/final-*.png` (ไม่คัดลอกภาพ — รอ orchestrator ตัดสิน)
- แหล่งความจริงของขั้นตอน: `.agents/playtest/TASK-0001-roles-u3.md` + Log U3 fix; บัญชีเดโม่ `lib/mock-data/aunqa/org.ts`; ข้อจำกัด = `TASK-0001-security.md` กลุ่ม B
- ไม่มี Bash: ตรวจลิงก์ภาพด้วย Grep -o นับรูปแบบเต็ม `](../../.agents/screenshots/final/<ชื่อ>.png)` เทียบจำนวน `.png)` ทั้งหมด แล้วเทียบชื่อกับ Glob
- ยังไม่มี `standards/user-docs.md` (ช่องว่างอยู่ใน INDEX แล้ว) — ใช้ `ui-ux.md` ข้อ 1/5 เป็นแนวเขียน
- backlog จาก D0.5: UI ตอบกลับความเห็น, super_admin จัดการมหาวิทยาลัยอื่น, รหัสผ่าน 8 (UI) vs 6 (lib), ชื่อ .bat "EduFlow", `.env.example`
