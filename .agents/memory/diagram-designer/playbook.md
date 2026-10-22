# Playbook — diagram-designer

## RULES
- [incident: TASK-0001 D1] mermaid 12.2.0 วาดเส้นประยาวเป็นเส้นทึบ (dependency/include/extend ผิดสัญลักษณ์ และรูปในเล่มที่ export ก่อน D1 ผิดไปแล้ว) → ทุกรูปที่มีเส้นประใส่ `themeCSS: .edge-pattern-dashed{stroke-dasharray: 4 4 !important}` ในบรรทัดที่ 2 ของไฟล์ แล้วเปิด PNG ดูว่าเป็นเส้นประจริง. ใช้ซ้ำแล้ว 0 ครั้ง

## LESSONS
- [TASK-0001 B5s, researcher] "mmdc ไม่ error" ไม่พอ ต้องเปิดดู PNG ทุกรูป เพราะ beta syntax ผิดได้เงียบ ๆ: use case ที่ถูกคือ `A ..> : include B` (`A ..> B : include` เป็น parse error) และ activity ใช้ `swimlane-beta`. ใช้ซ้ำแล้ว 1 ครั้ง (D1: เปิดดู PNG จนพบบั๊กเส้นประ) — ใช้ซ้ำอีก 1 ครั้ง → เลื่อนเป็น RULE
- [TASK-0001 B6a] ก่อนเสนอ diagram เช็กว่าชนิดนั้นมีใน Mermaid หรือไม่: deployment/component ไม่มี → ประยุกต์ด้วย flowchart + subgraph และเขียนใต้รูปว่า "ประยุกต์จาก UML"; ไม่ติดตั้งเครื่องมือใหม่เองจนกว่าจะได้รับอนุมัติ
- [TASK-0001 D1] วัดความอ่านได้จาก viewBox ของ SVG ก่อนเปิดดูภาพ: pt ≈ font_px × min(415/w, 605/h) (พื้นที่พิมพ์ build.py 5.77" × 8.4") — "ดูในจอแล้วอ่านได้" ไม่พอ (รูปเดิมหลายรูปเหลือ 2–5 pt). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D1] ขยายตัวอักษรต่างกันตามชนิด: sequence ใช้ `fontSize`, ชนิดอื่นใช้ `themeVariables.fontSize`, use case ต้องตั้ง CSS var บน `g`; ป้ายเงื่อนไขบนวงย้อนกลับของ swimlane-beta ลอยผิดเส้น → ใส่ guard บนเส้นไปข้างหน้าเท่านั้น (เพิ่ม node รอ/แก้ไข). ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- ไฟล์ diagram อยู่ `docs/diagrams/*.mmd` (ที่ root repo, 20 ไฟล์ รูป 3.1–3.20, index + คำบรรยาย + ขนาด pt ที่ INDEX.md); ของเดิมอยู่ `docs/diagrams/legacy/`
- เวอร์ชันที่ render ผ่าน: mmdc 12.0.0 / mermaid 12.2.0 (อย่าอัปเกรดกลางงาน); render ด้วย `mmdc -s 2 -b white`
- D1: รูปใหญ่แยกให้อ่านได้ (act ×2, ER ×3, use case ×3+); ER 3.13/3.14/3.16, uc-aunqa-data, class-domain-support ~7 pt — ถ้าสาขาต้องการ ≥8 pt ต้องแยก ER เพิ่ม (แนวนอนไม่ช่วย ER เพราะสัดส่วนเกือบจัตุรัส)
- D1 ไม่ได้ผ่าน reviewer สุ่มตรวจ (orchestrator ข้าม) → +5 "diagram ตรงโค้ด" ยังไม่ได้ ถ้ารอบหน้ามี reviewer/code-reader ตรวจชุด D1 ค่อยให้
- การแปลงไฟล์ด้วยสคริปต์ทำ CRLF → LF (ไม่มีผลต่อ render)
