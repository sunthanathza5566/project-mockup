# Playbook — diagram-designer

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 B5s, researcher] "mmdc ไม่ error" ไม่พอ ต้องเปิดดู PNG ทุกรูป เพราะ beta syntax ผิดได้เงียบ ๆ: use case ที่ถูกคือ `A ..> : include B` (`A ..> B : include` เป็น parse error) และ activity ใช้ `swimlane-beta`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B6a] ก่อนเสนอ diagram เช็กว่าชนิดนั้นมีใน Mermaid หรือไม่: deployment/component ไม่มี → ประยุกต์ด้วย flowchart + subgraph และเขียนใต้รูปว่า "ประยุกต์จาก UML"; ไม่ติดตั้งเครื่องมือใหม่เองจนกว่าจะได้รับอนุมัติ

## PROJECT KNOWLEDGE
- ไฟล์ diagram อยู่ `eduflow-next/docs/diagrams/*.mmd` (12 รูป, index ที่ INDEX.md); ของเดิมอยู่ `docs/diagrams/legacy/`
- เวอร์ชันที่ render ผ่าน: mmdc 12.0.0 / mermaid 12.2.0 (อย่าอัปเกรดกลางงาน)
- เลขรูปในเล่ม 3.5–3.12 ยังค้าง: deploy-aunqa แคบเกิน, class-domain แน่น → รอ B6b (ตาม HANDOFF ของ thesis-writer)
