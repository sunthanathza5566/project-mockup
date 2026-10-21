# บทคัดย่อ

<!-- TASK-0001: เขียนหลังบทที่ 1–5 · ผลการประเมินผู้ใช้ยังไม่มี จึงติดป้าย -->

**ชื่อเรื่อง** ระบบผู้ช่วยจัดทำรายงานการประเมินตนเองระดับหลักสูตรตามเกณฑ์ AUN-QA ด้วยปัญญาประดิษฐ์ (AUN-QA Copilot) [ต้องตรวจสอบ: ชื่อเรื่องที่อนุมัติ]

**ผู้วิจัย** [ต้องการข้อมูล: ชื่อ-นามสกุลและรหัสนักศึกษา]

**อาจารย์ที่ปรึกษา** [ต้องการข้อมูล: ชื่ออาจารย์ที่ปรึกษา]

**ประเภท** [ต้องการข้อมูล: เช่น โครงงานปริญญาตรี หลักสูตร สาขา คณะ มหาวิทยาลัย ปีการศึกษา]

**คำสำคัญ** AUN-QA, รายงานการประเมินตนเอง, ประกันคุณภาพการศึกษา, แบบจำลองภาษาขนาดใหญ่, การวิเคราะห์ช่องว่าง

งานวิจัยนี้มีวัตถุประสงค์เพื่อพัฒนาเว็บแอปพลิเคชันสำหรับจัดการเอกสารและหลักฐานประกันคุณภาพระดับหลักสูตรตามเกณฑ์ AUN-QA ฉบับที่ 4.0 จำนวน 8 เกณฑ์ 53 ข้อ พัฒนาระบบปัญญาประดิษฐ์ช่วยร่างรายงานการประเมินตนเอง (SAR) จากหลักฐานที่มีอยู่จริง พัฒนาระบบวิเคราะห์ช่องว่างตามวงจร PDCA และระบบลำดับงานการอนุมัติพร้อมการควบคุมสิทธิ์และบันทึกการตรวจสอบ และประเมินประสิทธิภาพของระบบ ระบบพัฒนาด้วย Next.js และ TypeScript แบบแบ่งระยะ ประกอบด้วยคลังหลักฐานที่ผูกหลักฐานหนึ่งชิ้นกับหลายข้อ ตรวจไฟล์ซ้ำ และสแกนข้อมูลส่วนบุคคล ตัวแก้ไข SAR กฎวิเคราะห์ช่องว่าง 10 ข้อ เครื่องสถานะของรอบการประเมินที่ล็อกพร้อมค่าแฮช พื้นที่ทำงานของกรรมการ และบริการปัญญาประดิษฐ์ 5 ฟีเจอร์ ซึ่งตัดข้อมูลส่วนบุคคลก่อนส่ง ตรวจรหัสหลักฐานและตัวเลขหลังประมวลผล และต้องให้ผู้ใช้กดยอมรับก่อนนำเข้าเอกสาร โดยปัญญาประดิษฐ์ไม่สามารถให้คะแนนหรือเปลี่ยนสถานะเอกสารได้ ผลการทดสอบด้วย Vitest ผ่าน 285 จาก 285 กรณี การตรวจชนิดข้อมูลไม่พบข้อผิดพลาด และการตรวจโค้ดรอบสุดท้ายได้ผลอนุมัติ ส่วนผลการประเมินด้านเวลา ความถูกต้องของปัญญาประดิษฐ์ ความสามารถในการใช้งาน และความพึงพอใจของผู้ใช้ [ต้องการข้อมูล: ผลการประเมินกับผู้ใช้และผู้เชี่ยวชาญ]

# Abstract

**Title** AUN-QA Copilot: An AI-Assisted Web Application for Programme-Level Self-Assessment Report Preparation [ต้องตรวจสอบ: approved English title]

**Author** [ต้องการข้อมูล: author name and student ID]

**Advisor** [ต้องการข้อมูล: advisor name]

**Academic Paper** [ต้องการข้อมูล: degree, programme, faculty, university, academic year]

**Keywords** AUN-QA, self-assessment report, quality assurance, large language model, gap analysis

This research aimed to develop a web application for managing programme-level quality assurance documents and evidence according to the AUN-QA Version 4.0 framework, which comprises 8 criteria and 53 requirements; to develop an AI assistant that drafts Self-Assessment Report (SAR) sections from existing evidence, together with a PDCA-based gap analysis; to develop a review and approval workflow with role-based access control and an audit log; and to evaluate the system. The system was developed iteratively with Next.js and TypeScript. It provided an evidence repository in which one piece of evidence could be linked to multiple requirements, with duplicate-file detection and personal data scanning; a SAR editor; ten gap-analysis rules; an assessment-cycle state machine that locked approved cycles with a snapshot hash; an assessor workspace; and five AI features. Every AI request was redacted for personal data before being sent, every output was post-checked for evidence codes and numbers that did not appear in the input, and every result required explicit user acceptance. The AI could not assign ratings or change document states. All 285 of 285 Vitest test cases passed, type checking reported no errors, and the final code review was approved. The evaluation of time savings, AI accuracy, usability, and user satisfaction [ต้องการข้อมูล: evaluation results with users and experts].

# กิตติกรรมประกาศ

[ต้องการข้อมูล: กิตติกรรมประกาศ — ไม่เกิน 1 หน้า ไม่ระบุวันที่ ไม่ใส่คำนำหน้านามผู้เขียน และลงชื่อผู้วิจัยท้ายข้อความ]

# คำอธิบายสัญลักษณ์และคำย่อ

Table: ตารางที่ 0.1 คำย่อที่ใช้ในเล่ม [ต้องตรวจสอบกับคู่มือสาขา: การกำหนดเลขตารางในส่วนนำ]

| คำย่อ | คำเต็ม |
|---|---|
| AFI | Areas for Improvement |
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| AUN-QA | ASEAN University Network Quality Assurance |
| CLO | Course Learning Outcomes |
| ELO | Expected Learning Outcomes |
| LLM | Large Language Model |
| OBE | Outcome-Based Education |
| PDCA | Plan–Do–Check–Act |
| PII | Personally Identifiable Information |
| PLO | Programme Learning Outcomes |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security |
| SAR | Self-Assessment Report |
| SUS | System Usability Scale |
| UAT | User Acceptance Testing |
