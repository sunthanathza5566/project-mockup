# ทะเบียน Diagram
เครื่องมือ: mmdc 12.0.0 / mermaid 12.2.0 (ห้ามอัปเกรดกลางงาน — `usecase-beta` และ `swimlane-beta` เป็น beta) · render ด้วย `-s 2 -b white`
เลขรูปตรงเล่ม 3.1–3.10 · class แยก 3 รูป (3.11–3.13) และ deploy เป็น 3.14 รอ thesis-writer ปรับ placeholder

| ไฟล์ | ชนิด | เรื่อง | เลขรูปในเล่ม | บทที่ใช้ | อัปเดตล่าสุด | เวอร์ชัน mmdc |
|------|------|--------|-------------------|---------|-------------|--------------|
| uc-aunqa-programme.mmd | Use Case | ฝั่งหลักสูตร: ประธาน, อาจารย์ผู้รับผิดชอบข้อ, เจ้าหน้าที่ข้อมูล | 3.1 | 3 | 2026-10-21 | 12.0.0 |
| uc-aunqa-review.mmd | Use Case | ฝั่งตรวจ/อนุมัติ: QA คณะ, คณบดี | 3.2 | 3 | 2026-10-21 | 12.0.0 |
| uc-aunqa-assess.mmd | Use Case | ฝั่งประเมินและผู้ดูแล: กรรมการ, ผู้ดูแลมหาวิทยาลัย, ผู้ดูแลระบบ | 3.3 | 3 | 2026-10-21 | 12.0.0 |
| act-sar-lifecycle.mmd | Activity (swimlane) | วงจร SAR ตั้งแต่สร้างรอบ ล็อก ประเมิน จนแผนปรับปรุง | 3.4 | 3 | 2026-10-21 | 12.0.0 |
| seq-evidence-upload.mmd | Sequence | อัปโหลดหลักฐาน: validate, sha256 dedupe, PII scan, รหัส, ผูกข้อ | 3.5 | 3 | 2026-10-21 | 12.0.0 |
| seq-ai-pipeline.mmd | Sequence | AI pipeline (ตัวอย่าง AI-2): redact, Claude/offline, post-check, AiRun, accept | 3.6 | 3 | 2026-10-21 | 12.0.0 |
| state-cycle.mmd | State | สถานะรอบประเมิน (CYCLE_TRANSITIONS + openRevision) | 3.7 | 3 | 2026-10-21 | 12.0.0 |
| state-section.mmd | State | สถานะรายข้อ SAR (SECTION_TRANSITIONS) | 3.8 | 3 | 2026-10-21 | 12.0.0 |
| er-aunqa.mmd | ER (crow's foot) | ข้อมูลหลัก: องค์กร, รอบ, SAR, หลักฐาน, AI, audit, action, assessor | 3.9 | 3 | 2026-10-21 | 12.0.0 |
| er-curriculum.mmd | ER (crow's foot) | หลักสูตร PLO/COURSE/CLO และตารางเชื่อม | 3.10 | 3 | 2026-10-21 | 12.0.0 |
| class-domain-ai.mmd | Class (design) | บริการ AI: AiService, AiProvider, Claude/Offline, PostCheck, Redact | 3.11 | 3 | 2026-10-21 | 12.0.0 |
| class-domain-workflow.mmd | Class (design) | workflow กับ store หลัก: Sar, Cycle, Action, Notification, AunqaError | 3.12 | 3 | 2026-10-21 | 12.0.0 |
| class-domain-support.mmd | Class (design) | store หลักกับบริการสนับสนุน: Evidence, Assessor, Rbac, Audit, Db | 3.13 | 3 | 2026-10-21 | 12.0.0 |
| deploy-aunqa.mmd | Deployment (ประยุกต์) | Browser + localStorage, Next.js /api/ai, Anthropic API | 3.14 | 3 | 2026-10-21 | 12.0.0 |

## คำบรรยายที่ต้องใส่ใต้รูป (thesis-writer)
- Use Case: ป้าย include/extend หมายถึง «include»/«extend» (Mermaid ไม่แสดง «») · เส้น association มีหัวลูกศร เป็นข้อจำกัดของเครื่องมือ (UML ปกติเป็นเส้นไม่มีหัว) · ทุกบทบาทเข้าสู่ระบบและดู dashboard/อ่านข้อมูลได้ตามสิทธิ์ ไม่ได้วาดเพื่อลดความแน่น · use case "ใช้ AI" เป็น extend ของงานหลัก ผู้ใช้ที่ทำได้ตามตาราง 3.2 (ai.use/ai.check/ai.summarize)
- ER: `||--o{` = หนึ่งต่อศูนย์หรือมาก · `|o--o{` = ศูนย์หรือหนึ่งต่อศูนย์หรือมาก · `requirementId`/`criterionNo` อ้างข้อมูลกรอบ AUN-QA ที่เป็นค่าคงที่ในโค้ด ไม่ใช่ตาราง จึงไม่มีเส้น FK · ระบบจริงเก็บเป็น JSON ใน localStorage (คีย์ `aunqa_*`) แผนผังนี้คือ logical schema ตาม TODO(PostgreSQL) · `ROLE_ASSIGNMENT` ฝังอยู่ใน AppUser.roles และ `COURSE_PREREQUISITE` คือ Course.prerequisiteIds ในโค้ดปัจจุบัน แยกเป็นตารางตาม comment TODO(PostgreSQL) · M:N แตกเป็น EVIDENCE_LINK / CLO_PLO_MAP / COURSE_PREREQUISITE
- Class (3.11–3.13): ในโค้ดเป็นโมดูลฟังก์ชัน (ไม่ใช่ class) จึงใช้ «module» · AiService ไม่พึ่ง transitionCycle/transitionSection (กฎ 7.3: AI เปลี่ยนสถานะไม่ได้) · แสดงเฉพาะการพึ่งพาหลัก
- Deployment (flowchart TB): "แผนภาพนี้ใช้สัญลักษณ์ประยุกต์จาก UML Deployment Diagram" (Mermaid flowchart ไม่ใช่ UML เต็มรูป) · ยังไม่มี server ฐานข้อมูล ข้อมูลอยู่ในเบราว์เซอร์
- State รายข้อ: ไม่มี final state เพราะโค้ดให้ approved กลับเป็น changes_requested ได้
- Activity: ลูกศรส่งกลับทั้งหมดรวมที่ node "เขียน/แก้ SAR" (implicit merge) · วงรอบ assessor ครบทุกคนตรวจที่ `transitionCycle(..., 'assessed')`

## Legacy
Use Case เดิมของระบบโรงเรียน (ล้าสมัย) ย้ายไป `eduflow-next/docs/diagrams/legacy/`
