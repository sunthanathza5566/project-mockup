# Playbook — code-reader

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0002 R1] ก่อนแผน redesign grep เทสต์หา selector ที่เป็น class/element/getComputedStyle/ฟอนต์ ด้วย ไม่ใช่แค่ testid — เทสต์ design มักผูกชื่อ class, outline และฟอนต์จริง (พบ AC-09 Sarabun, hex lock, light-only). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R1] SYSTEM_MAP ที่เก่ากว่าการ pivot ใหญ่ ให้ใส่คำเตือนหัวไฟล์ระบุหัวข้อที่ยังล้าสมัย แทนการปล่อยให้ดูเหมือนตรง HEAD. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 R2] ก่อนออกแบบ deep link ของแจ้งเตือน ทำตาราง "จุดเรียก notify × field ที่มี × หน้าปลายทาง" — เห็นช่องว่าง (noti ที่ไม่มี cycleId) ทันที · ระบบที่ auth อยู่ใน localStorage ต้องเตือน architect ว่า flow หลายผู้ใช้ (ขอ/อนุมัติ/เชิญ) ข้ามเครื่องไม่ได้. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- SYSTEM_MAP: TASK-0002 อัปเดต Routes & Pages + Frontend (R1) และโซน lib auth/users/notifications/rbac (R2); ข้อมูลทั้งหมดอยู่ localStorage prefix `aunqa_` ไม่มี SQL/migration
- ชื่อตกค้างจาก EduFlow: `context/LangContext.tsx` key `eduflow_lang_pages` (ไม่กระทบการทำงาน)
