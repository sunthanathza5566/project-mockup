# Playbook — architect

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 U1] ก่อนออกแบบ UI ใหม่ grep selector ของ E2E ทุกไฟล์ทำ "รายการห้ามเปลี่ยน" รวม prefix ที่ถูกนับ (`[data-testid^=…]`), จำนวน h1, ชื่อปุ่มที่ match แบบ substring — ผลจริง: มีแค่ E2E-04/05 พังตามที่คาดไว้ล่วงหน้า. ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002 ADR-UI-002 D8 รายการเทสต์ที่ต้องย้าย)
- [TASK-0001 U1] spec ที่ห้าม dev ตัดสินเอง ต้องระบุข้อความไทยจริง + class ที่อนุญาตต่อขนาดตัวอักษร (T2.3) ให้ AC ตรวจได้ด้วยสคริปต์ — ช่องว่างที่หลุด (`.aq-heat-label`) ถูก qa จับได้เพราะตรวจตามตัวอักษร. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 U1] ค่า contrast ที่คำนวณมือ ให้ติดป้ายแหล่ง (R/A) และบังคับวัดซ้ำด้วยสคริปต์ก่อน build (U1b วัดซ้ำแล้วเพิ่มคู่ที่ขาดในตาราง). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002 รอบ 2: ล็อก hex ในสเปก + ให้ dev แปลง HSL ด้วยสคริปต์, qa วัดซ้ำ 42 คู่ x 2 ธีม)
- [TASK-0002 D1] เทสต์ design ที่ผูกชื่อ class เป็นเกณฑ์ (size/target audit) ให้คงชื่อนั้นเป็น "role class" ที่ `@apply` สไตล์ใหม่ — ไม่ต้องแก้เทสต์และไม่ลดสิ่งที่ทดสอบ · เทสต์ธีมใหม่ที่ผ่านได้หลัง cutover เท่านั้น ให้เขียนเป็น `fixme` พร้อมระบุ subtask ที่เปิด. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 D2] ก่อนย้าย control เข้าเมนู grep testid ใน E2E นับจุดที่ต้องเปิดเมนูก่อน แล้วระบุ helper ที่ qa ต้องสร้าง (`openUserMenu`) ในแผน. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 review, reviewer] AC ที่วัดด้วย "⊆ ไฟล์ในแผน" ต้องอัปเดตแผนทุกครั้งที่มี follow-up subtask (R2-B2 ไม่มีแถวในแผน) ไม่งั้น AC ตกตามตัวอักษรทั้งที่งานถูก. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0002 BUG-0002-Q2C-1] สเปก responsive ต้องระบุตำแหน่งของ control ที่ AC บังคับ "มองเห็นทุกจอ" ในทุก breakpoint (LangSwitch ใน hamburger ไม่ได้ระบุ). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- UI spec: `.agents/decisions/ADR-UI-001-redesign.md` + `ui/{tokens,components,pages}.md` (บังคับเท่ากัน) — Warm Academic: sand #FBF8F3 / indigo #3B4FA0 / amber #E9A23B ≤10%, Sarabun 400/600/700 อย่างเดียว, ไม่มี dark mode
- U1b: spec ตกรอบตรวจ 1 รอบเพราะ breakpoint ขัดกัน, ขนาดคงที่, ไม่มี variant บนพื้นเข้ม, todo ไม่ครบทุกขั้นของรอบ → ก่อนส่ง spec ให้ไล่ทุก role ครบวงจร (เริ่ม→ปิดรอบ) และใช้ min-width/max-width แบบเดียวทั้ง spec
- C20 เลขในวงแหวนใหญ่ = fs-xl (แก้ใน U3); line-height ปุ่ม 1.5 ตาม T2.2 ไม่มีข้อยกเว้น
- (TASK-0002 แทน ADR-UI-001) UI spec ปัจจุบัน: `ADR-UI-002-saas-tailwind.md` (stack/cutover) + `ADR-UI-003-friendly-earth.md` + `ui/earth-tokens.md` + `ui/friendly-spec.md` (+ `ui/saas-spec.md`/`saas-tokens.md` ส่วนที่ไม่ถูกแทน) · onboarding: `ADR-AUTH-001-onboarding.md` (O1 admin เชิญ/อนุมัติคำขอ, ไม่มีหน้าสมัครเปิด)
