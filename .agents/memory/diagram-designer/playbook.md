# Playbook — diagram-designer

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 B5s, researcher] "mmdc ไม่ error" ไม่พอ ต้องเปิดดู PNG ทุกรูป เพราะ beta syntax ผิดได้เงียบ ๆ: use case ที่ถูกคือ `A ..> : include B` (`A ..> B : include` เป็น parse error) และ activity ใช้ `swimlane-beta`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B6a] ก่อนเสนอ diagram เช็กว่าชนิดนั้นมีใน Mermaid หรือไม่: deployment/component ไม่มี → ประยุกต์ด้วย flowchart + subgraph และเขียนใต้รูปว่า "ประยุกต์จาก UML"; ไม่ติดตั้งเครื่องมือใหม่เองจนกว่าจะได้รับอนุมัติ

## PROJECT KNOWLEDGE
- ไฟล์ diagram อยู่ `eduflow-next/docs/diagrams/*.mmd` (12 รูป, index ที่ INDEX.md); ของเดิมอยู่ `docs/diagrams/legacy/`
- เวอร์ชันที่ render ผ่าน: mmdc 12.0.0 / mermaid 12.2.0 (อย่าอัปเกรดกลางงาน)
- B6b เสร็จแล้ว: class-domain แยก 3 รูป (`class-domain-ai` 3.11, `class-domain-workflow` 3.12, `class-domain-support` 3.13), deploy-aunqa เป็น TB รูป 3.14 (ตัวอ่านได้ ~8pt ต้องย่อ method ≤4 ต่อคลาส)
- C4 reviewer สุ่มตรวจ state-cycle และ seq-ai-pipeline ผ่านแล้ว (ตรงโค้ด). seq-ai-pipeline ยังไม่มี AI-4 translate และ completeness check → อัปเดตใน D1
