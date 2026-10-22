# Playbook — architect

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U1] ก่อนออกแบบ UI ใหม่ grep selector ของ E2E ทุกไฟล์ทำ "รายการห้ามเปลี่ยน" รวม prefix ที่ถูกนับ (`[data-testid^=…]`), จำนวน h1, ชื่อปุ่มที่ match แบบ substring — ผลจริง: มีแค่ E2E-04/05 พังตามที่คาดไว้ล่วงหน้า. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U1] spec ที่ห้าม dev ตัดสินเอง ต้องระบุข้อความไทยจริง + class ที่อนุญาตต่อขนาดตัวอักษร (T2.3) ให้ AC ตรวจได้ด้วยสคริปต์ — ช่องว่างที่หลุด (`.aq-heat-label`) ถูก qa จับได้เพราะตรวจตามตัวอักษร. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U1] ค่า contrast ที่คำนวณมือ ให้ติดป้ายแหล่ง (R/A) และบังคับวัดซ้ำด้วยสคริปต์ก่อน build (U1b วัดซ้ำแล้วเพิ่มคู่ที่ขาดในตาราง). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- UI spec: `.agents/decisions/ADR-UI-001-redesign.md` + `ui/{tokens,components,pages}.md` (บังคับเท่ากัน) — Warm Academic: sand #FBF8F3 / indigo #3B4FA0 / amber #E9A23B ≤10%, Sarabun 400/600/700 อย่างเดียว, ไม่มี dark mode
- U1b: spec ตกรอบตรวจ 1 รอบเพราะ breakpoint ขัดกัน, ขนาดคงที่, ไม่มี variant บนพื้นเข้ม, todo ไม่ครบทุกขั้นของรอบ → ก่อนส่ง spec ให้ไล่ทุก role ครบวงจร (เริ่ม→ปิดรอบ) และใช้ min-width/max-width แบบเดียวทั้ง spec
- C20 เลขในวงแหวนใหญ่ = fs-xl (แก้ใน U3); line-height ปุ่ม 1.5 ตาม T2.2 ไม่มีข้อยกเว้น
