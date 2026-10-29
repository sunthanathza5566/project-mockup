# Playbook — diagram-designer

## RULES
- [incident: TASK-0001 D1] mermaid 12.2.0 วาดเส้นประยาวเป็นเส้นทึบ (dependency/include/extend ผิดสัญลักษณ์ และรูปในเล่มที่ export ก่อน D1 ผิดไปแล้ว) → ทุกรูปที่มีเส้นประใส่ `themeCSS: .edge-pattern-dashed{stroke-dasharray: 4 4 !important}` ในบรรทัดที่ 2 ของไฟล์ แล้วเปิด PNG ดูว่าเป็นเส้นประจริง. ใช้ซ้ำแล้ว 0 ครั้ง · lifeline ของ sequence ก็ทึบ → `.actor-line{stroke-dasharray}` ใน themeCSS (TASK-0002). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002)
- [TASK-0001 B5s, researcher → RULE TASK-0002] "mmdc ไม่ error" ไม่พอ ต้องเปิดดู PNG ทุกรูป เพราะ beta syntax ผิดได้เงียบ ๆ: use case ที่ถูกคือ `A ..> : include B` (`A ..> B : include` เป็น parse error) และ activity ใช้ `swimlane-beta`. ใช้ซ้ำแล้ว 2 ครั้ง (D1; TASK-0002 เปิด PNG ทุกรูปที่แก้/ใหม่) → เลื่อนเป็น RULE

## LESSONS
- [TASK-0001 B6a] ก่อนเสนอ diagram เช็กว่าชนิดนั้นมีใน Mermaid หรือไม่: deployment/component ไม่มี → ประยุกต์ด้วย flowchart + subgraph และเขียนใต้รูปว่า "ประยุกต์จาก UML"; ไม่ติดตั้งเครื่องมือใหม่เองจนกว่าจะได้รับอนุมัติ
- [TASK-0001 D1] วัดความอ่านได้จาก viewBox ของ SVG ก่อนเปิดดูภาพ: pt ≈ font_px × min(415/w, 605/h) (พื้นที่พิมพ์ build.py 5.77" × 8.4") — "ดูในจอแล้วอ่านได้" ไม่พอ (รูปเดิมหลายรูปเหลือ 2–5 pt). ใช้ซ้ำแล้ว 1 ครั้ง (TASK-0002: ทุกรูป ≥ 7 pt ยกเว้น class-domain-workflow 6.9)
- [TASK-0001 D1] ขยายตัวอักษรต่างกันตามชนิด: sequence ใช้ `fontSize`, ชนิดอื่นใช้ `themeVariables.fontSize`, use case ต้องตั้ง CSS var บน `g`; ป้ายเงื่อนไขบนวงย้อนกลับของ swimlane-beta ลอยผิดเส้น → ใส่ guard บนเส้นไปข้างหน้าเท่านั้น (เพิ่ม node รอ/แก้ไข). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 เฟส 8] sequence ของ mermaid: activation (`+`/`-`) ที่ข้ามกิ่ง alt ทำ lifeline ขาดก่อนจบรูป และ `#` ในข้อความตัดข้อความทิ้ง → ไม่ใช้ activation ข้าม alt, ใช้ `#35;`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0002 เฟส 8] deploy/flowchart ที่กว้างเกิน: กลับทิศเส้นให้ไหลทางเดียว (Browser → server → external) ได้รูปแนวตั้งพอดี A4 ดีกว่าเพิ่ม fontSize. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- ไฟล์ diagram อยู่ `docs/diagrams/*.mmd` (ที่ root repo, 26 รูป 3.1–3.26 หลัง TASK-0002 — มีตาราง "เลขเดิม → เลขใหม่" ท้าย INDEX.md + คำบรรยาย + ขนาด pt); ของเดิมอยู่ `docs/diagrams/legacy/`
- เวอร์ชันที่ render ผ่าน: mmdc 12.0.0 / mermaid 12.2.0 (อย่าอัปเกรดกลางงาน); render ด้วย `mmdc -s 2 -b white`
- D1: รูปใหญ่แยกให้อ่านได้ (act ×2, ER ×3, use case ×3+); ER 3.13/3.14/3.16, uc-aunqa-data, class-domain-support ~7 pt — ถ้าสาขาต้องการ ≥8 pt ต้องแยก ER เพิ่ม (แนวนอนไม่ช่วย ER เพราะสัดส่วนเกือบจัตุรัส)
- D1 ไม่ได้ผ่าน reviewer สุ่มตรวจ (orchestrator ข้าม) → +5 "diagram ตรงโค้ด" ยังไม่ได้ ถ้ารอบหน้ามี reviewer/code-reader ตรวจชุด D1 ค่อยให้
- การแปลงไฟล์ด้วยสคริปต์ทำ CRLF → LF (ไม่มีผลต่อ render)
- TASK-0002 ก็ยังไม่มี reviewer/code-reader สุ่มตรวจ diagram → +5 "diagram ตรงโค้ด" ยังไม่ได้ (เสนอ orchestrator ให้ code-reader สุ่ม 3 รูปในงานถัดไป)
