# ทะเบียน Diagram
เครื่องมือ: mmdc 12.0.0 / mermaid 12.2.0 (ห้ามอัปเกรดกลางงาน — `usecase-beta` และ `swimlane-beta` เป็น beta) · render ด้วย `-s 2 -b white`
ชุด D1 (2026-10-23) ตรงโค้ด HEAD หลัง Phase C + U + D-sec · เลขรูปเรียงต่อเนื่องในบทที่ 3 (3.1–3.20) **แทนเลขเดิมทั้งหมด** → thesis-writer ต้องปรับ placeholder/การอ้างอิงรูปในบท 3

| ไฟล์ | ชนิด | เรื่อง | เลขรูปในเล่ม | บทที่ใช้ | อัปเดตล่าสุด | เวอร์ชัน mmdc | ขนาดตัวอักษรเมื่อพิมพ์ (ประมาณ) |
|------|------|--------|-------------|---------|-------------|--------------|------|
| uc-aunqa-programme.mmd | Use Case | งาน SAR ฝั่งหลักสูตร: รอบ/มอบหมาย, เขียน, ร่าง AI-2, แปล AI-4, ประเมินตนเอง, ส่งรอบ, ส่งออก DOCX | 3.1 | 3 | 2026-10-23 | 12.0.0 | ~10 pt |
| uc-aunqa-data.mmd | Use Case | ข้อมูลประกอบ: หลักฐาน (+PII, AI-1), ตัวชี้วัด (+นำเข้า Excel), หลักสูตร PLO/CLO (+AI-7), แผนปรับปรุง | 3.2 | 3 | 2026-10-23 | 12.0.0 | ~7 pt |
| uc-aunqa-review.mmd | Use Case | ฝั่งตรวจ/อนุมัติ: QA คณะ, คณบดี (รวมส่งรอบกลับแก้ไข) | 3.3 | 3 | 2026-10-23 | 12.0.0 | ~9 pt |
| uc-aunqa-assess.mmd | Use Case | ฝั่งประเมินและผู้ดูแล: กรรมการ, ผู้ดูแลมหาวิทยาลัย, ผู้ดูแลระบบ | 3.4 | 3 | 2026-10-23 | 12.0.0 | ~9 pt |
| act-sar-lifecycle.mmd | Activity (swimlane) | จัดทำและอนุมัติ SAR: ประธาน, อาจารย์, QA คณะ, คณบดี จนล็อก + hash | 3.5 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| act-assessment.mmd | Activity (swimlane) | ประเมินโดยกรรมการ → ปิดรอบ → แผนปรับปรุงจาก AFI | 3.6 | 3 | 2026-10-23 | 12.0.0 | ~15 pt |
| seq-evidence-upload.mmd | Sequence | อัปโหลดหลักฐาน: validate, sha256 dedupe, PII scan (normalize), รหัส, ผูกข้อ | 3.7 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| seq-ai-pipeline.mmd | Sequence | AI pipeline ระดับ service: AI-2 ร่าง + AI-4 แปล, redact, post-check, judgement filter, AiRun, accept | 3.8 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| seq-ai-route.mmd | Sequence | claudeProvider → /api/ai → Anthropic: 503/403/429 (rate + daily budget)/413/400/502 และ fallback offline | 3.9 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| seq-session-flush.mmd | Sequence | ออกจากระบบ / หมดอายุ / ข้ามแท็บ → flushAll → saveSection(baseUpdatedAt) conflict → session-lost | 3.10 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| state-cycle.mmd | State | สถานะรอบประเมิน (CYCLE_TRANSITIONS + openRevision ต้องมีหมายเหตุ) | 3.11 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| state-section.mmd | State | สถานะรายข้อ SAR (SECTION_TRANSITIONS) | 3.12 | 3 | 2026-10-23 | 12.0.0 | ~9 pt |
| er-aunqa.mmd | ER (crow's foot) | แกนหลัก: องค์กร, ผู้ใช้/บทบาท, รอบ, SAR รายข้อ, เวอร์ชัน | 3.13 | 3 | 2026-10-23 | 12.0.0 | ~7 pt |
| er-assessment.mmd | ER (crow's foot) | การอนุมัติ/ประเมิน/แผน: review event, rating, finding, verdict, action, notification | 3.14 | 3 | 2026-10-23 | 12.0.0 | ~7 pt |
| er-evidence-ai.mmd | ER (crow's foot) | หลักฐาน, ไฟล์, ลิงก์, AI run, audit log, ตัวชี้วัด | 3.15 | 3 | 2026-10-23 | 12.0.0 | ~9 pt |
| er-curriculum.mmd | ER (crow's foot) | หลักสูตร PLO/COURSE/CLO และตารางเชื่อม | 3.16 | 3 | 2026-10-23 | 12.0.0 | ~7.5 pt |
| class-domain-ai.mmd | Class (design) | บริการ AI: AiService (AI-1/2/3/4/7/9), AiProvider, Claude/Offline, PostCheck, Redact, Glossary | 3.17 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |
| class-domain-workflow.mmd | Class (design) | workflow กับ store: Sar, Cycle, Action, Notification, Preflight, Todo, AunqaError | 3.18 | 3 | 2026-10-23 | 12.0.0 | ~9 pt |
| class-domain-support.mmd | Class (design) | Evidence, PiiScan, MetricsImport (zip guard), Assessor, Rbac, Audit, Db | 3.19 | 3 | 2026-10-23 | 12.0.0 | ~7 pt |
| deploy-aunqa.mmd | Deployment (ประยุกต์) | Browser + localStorage, Next.js /api/ai (rate limit + daily budget), Anthropic API | 3.20 | 3 | 2026-10-23 | 12.0.0 | ~8 pt |

ขนาดตัวอักษรคำนวณจากขนาด SVG เทียบพื้นที่พิมพ์ของ `build.py` (กว้าง 5.77", สูงสูงสุด 8.4") · รูปที่ ~7 pt (ER/use case ข้อมูล/class support) ถ้าต้องการ ≥ 8 pt ต้องวางหน้าแนวนอนหรือแยกรูปเพิ่ม

## หมายเหตุการ render (ทุกไฟล์บรรทัดที่ 2 เป็น `%%{init: …}%%`)
- ขยายตัวอักษร: sequence ใช้ `fontSize` · flowchart/swimlane/state/class/ER ใช้ `themeVariables.fontSize` · use case ใช้ CSS ตัวแปร `--mermaid-usecase-font-size` ผ่าน `themeCSS` (ค่าเริ่มต้น 12px เล็กเกินไป)
- **บั๊ก mermaid 12.2.0**: เส้นประที่ยาว (dependency `..>`, `-.->`, include/extend) ถูกวาดเป็นเส้นทึบ (`stroke-dasharray` คำนวณผิด) → แก้ด้วย `themeCSS: .edge-pattern-dashed{stroke-dasharray: 4 4 !important}` ห้ามลบบรรทัดนี้ ไม่งั้นสัญลักษณ์ UML ผิด
- ER ใช้ `themeCSS: .edgeLabel .label{font-size:22px}` เพราะป้ายความสัมพันธ์ถูกตั้งตายตัว 14px
- บางความสัมพันธ์ใน ER เขียนจากฝั่ง "หลาย" ก่อน (เช่น `PROGRAMME }o--|| FACULTY`) เพื่อจัดชั้น layout ให้เตี้ยลง — cardinality ยังถูกต้องตามสัญลักษณ์ที่ปลายเส้น

## คำบรรยายที่ต้องใส่ใต้รูป (thesis-writer)
- Use Case (3.1–3.4): ป้าย include/extend หมายถึง «include»/«extend» (Mermaid ไม่แสดง «») · เส้น association มีหัวลูกศร เป็นข้อจำกัดของเครื่องมือ (UML ปกติเป็นเส้นไม่มีหัว) · ทุกบทบาทเข้าสู่ระบบ ดู "งานของฉัน"/dashboard และอ่านข้อมูลได้ตามสิทธิ์ ไม่ได้วาดเพื่อลดความแน่น · use case "…ด้วย AI" เป็น extend ของงานหลัก ผู้ใช้ที่ทำได้ตามตาราง 3.2 (ai.use/ai.check/ai.summarize) · 3.1 กับ 3.2 คือระบบเดียวกัน แยกรูปเพื่อให้อ่านได้ · "ส่งรอบกลับแก้ไข" (3.3) ต้องระบุหมายเหตุทุกครั้ง
- Activity 3.5: การส่งกลับทุกระดับ (ประธาน/QA/คณบดี) ไปที่ "แก้ตามข้อเสนอแนะ" แล้วส่งข้อใหม่ · "รอข้อถัดไป" = ประธานตรวจข้ออื่นต่อจนครบ 53 ข้อ · การส่งกลับระดับรอบ (QA/คณบดี) ต้องมีหมายเหตุ และระบบแจ้งเตือนบทบาทถัดไปอัตโนมัติ (notifyCycleChange) · ก่อนเปลี่ยนสถานะรอบ UI แสดงคำเตือน preflight (getTransitionPreflight) ไม่ได้วาดเป็น action แยก
- Activity 3.6: การส่งผล = `transitionCycle(..., 'assessed')` ซึ่งผ่านได้เมื่อกรรมการทุกคนให้คะแนนครบ 8 เกณฑ์และมี verdict · "รอกรรมการคนอื่น" แล้วกดส่งผลใหม่ · ผลดำเนินการตามแผนกลายเป็นหลักฐานขั้น A ในรอบถัดไปอัตโนมัติ
- Sequence 3.7: "linkEvidence*" ทำเมื่อระบุข้อและรอบ · scanPii ตรวจชื่อ คำอธิบาย ข้อความในไฟล์ และชื่อไฟล์ โดย normalize เลขไทย/อักขระเต็มความกว้างก่อน · เมื่อพบไฟล์ซ้ำ (break) ผู้ใช้ยืนยันแล้วเรียก createEvidence ใหม่ด้วย allowDuplicate = true
- Sequence 3.8: "ตัวกรอง*" = AI-2 ตัดประโยคเชิงให้คะแนน/ตัดสิน (judgementFilter); AI-4 ตรวจว่า [E-…] และตัวเลขครบตามต้นฉบับและติดธงประโยคตัดสินที่เพิ่มมา (ไม่ตัดเพราะเป็นเนื้อหาผู้ใช้) · AI-1/3/7/9 ใช้โครงเดียวกัน · AI-4 ที่ได้จาก offline ตั้งธง needsTranslationReview ตอนยอมรับ · การเรียก AiProvider ดูรายละเอียดในรูป 3.9 · AI เปลี่ยนสถานะ/ให้คะแนนไม่ได้ (ai.service ไม่ import transition*)
- Sequence 3.9: ลำดับการตรวจใน route คือ key → origin/header → rate limit ต่อ IP/รวมต่อนาที → ขนาด body/JSON/inputGuards → redact ซ้ำ + prompt v2 → งบรายวัน → เรียก Anthropic (timeout 60 วินาที) · 429 สองกรณีแยกกันในโค้ด (rate_limited ก่อนอ่าน body, daily_limit หลังตรวจ input) รวมไว้กิ่งเดียวเพื่อความกระชับ · ทุกกรณีที่ไม่ได้ 200 ฝั่ง client fallback offline เสมอ
- Sequence 3.10: ก. ผู้ใช้กดออก · ข. AuthContext ตรวจ sessionTimeLeft ทุก 30 วินาที (idle 4 ชม./สูงสุด 12 ชม.; เตือนก่อน 5 นาที) · ค. storage event เมื่อแท็บอื่นออกหรือล็อกอินเป็นคนอื่น · session-lost = หน้าอ่านอย่างเดียวพร้อมปุ่มคัดลอกข้อความ · saveSection ตรวจ conflict เมื่อ `updatedAt` ใหม่กว่า baseUpdatedAt
- State 3.11: ทุกเส้นตรงกับ CYCLE_TRANSITIONS; `cycle.reopen` คือ openRevision (คณบดี, ต้องมีหมายเหตุ) · State 3.12: ไม่มี final state เพราะโค้ดให้ approved กลับเป็น changes_requested ได้
- ER 3.13–3.16: `||--o{` = หนึ่งต่อศูนย์หรือมาก · `|o--o{` = ศูนย์หรือหนึ่งต่อศูนย์หรือมาก · `||--|{` = หนึ่งต่อหนึ่งหรือมาก · กล่องที่มีแค่ `id PK` คือตารางจากรูปอื่น (วาดเพื่อแสดง FK) · แสดงเฉพาะ PK/FK และ attribute สำคัญ (รายละเอียดครบในพจนานุกรมข้อมูล) · `requirementId`/`criterionNo` อ้างกรอบ AUN-QA ที่เป็นค่าคงที่ในโค้ด ไม่ใช่ตาราง · ระบบจริงเก็บเป็น JSON ใน localStorage (คีย์ `aunqa_*`) แผนผังนี้คือ logical schema ตาม TODO(PostgreSQL) · `ROLE_ASSIGNMENT` ฝังอยู่ใน AppUser.roles และ `COURSE_PREREQUISITE` คือ Course.prerequisiteIds · M:N แตกเป็น EVIDENCE_LINK / CLO_PLO_MAP / COURSE_PREREQUISITE
- Class 3.17–3.19: ในโค้ดเป็นโมดูลฟังก์ชัน (ไม่ใช่ class) จึงใช้ «module» · กล่องว่างคือโมดูลจากรูปอื่น · AiService ไม่พึ่ง transitionCycle/transitionSection (AI เปลี่ยนสถานะไม่ได้) · แสดงเฉพาะการพึ่งพาหลัก
- Deployment 3.20: "แผนภาพนี้ใช้สัญลักษณ์ประยุกต์จาก UML Deployment Diagram" · ยังไม่มี server ฐานข้อมูล ข้อมูลและ session อยู่ใน localStorage ของเบราว์เซอร์ · ตัวนับ rate limit/งบรายวันอยู่ในหน่วยความจำของ process เดียว

## Legacy
Use Case เดิมของระบบโรงเรียน (ล้าสมัย) ย้ายไป `eduflow-next/docs/diagrams/legacy/`
