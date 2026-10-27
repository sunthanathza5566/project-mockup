# บทคัดย่อ

<!-- TASK-0001: เขียนหลังบทที่ 1–5 (D3 อัปเดต 2026-10-23 ตามตัวเลขในบทที่ 4) · TASK-0002 (2026-10-27): ระยะ R + ตัวเลขทดสอบสุดท้าย (vitest 837/837, e2e 176/2 skip) · ผลการประเมินผู้ใช้ยังไม่มี จึงติดป้าย -->
<!-- [ต้องตรวจสอบกับคู่มือสาขา: ความยาวบทคัดย่อไม่เกิน 1 หน้า] ถ้าเกินให้ตัดประโยคผลการประเมินโดยตัวแทนปัญญาประดิษฐ์ออกก่อน -->

**ชื่อเรื่อง** ระบบผู้ช่วยจัดทำรายงานการประเมินตนเองระดับหลักสูตรตามเกณฑ์ AUN-QA ด้วยปัญญาประดิษฐ์ (AUN-QA Copilot) [ต้องตรวจสอบ: ชื่อเรื่องที่อนุมัติ]

**ผู้วิจัย** [ต้องการข้อมูล: ชื่อ-นามสกุลและรหัสนักศึกษา]

**อาจารย์ที่ปรึกษา** [ต้องการข้อมูล: ชื่ออาจารย์ที่ปรึกษา]

**ประเภท** [ต้องการข้อมูล: เช่น โครงงานปริญญาตรี หลักสูตร สาขา คณะ มหาวิทยาลัย ปีการศึกษา]

**คำสำคัญ** AUN-QA, รายงานการประเมินตนเอง, ประกันคุณภาพการศึกษา, แบบจำลองภาษาขนาดใหญ่, การวิเคราะห์ช่องว่าง

งานวิจัยนี้มีวัตถุประสงค์เพื่อพัฒนาเว็บแอปพลิเคชันสำหรับจัดการเอกสารและหลักฐานประกันคุณภาพระดับหลักสูตรตามเกณฑ์ AUN-QA ฉบับที่ 4.0 จำนวน 8 เกณฑ์ 53 ข้อ พัฒนาระบบปัญญาประดิษฐ์ช่วยร่างรายงานการประเมินตนเอง (SAR) จากหลักฐานที่มีอยู่จริง พัฒนาระบบวิเคราะห์ช่องว่างตามวงจร PDCA และระบบลำดับงานการอนุมัติพร้อมการควบคุมสิทธิ์และบันทึกการตรวจสอบ และประเมินประสิทธิภาพของระบบ ระบบพัฒนาด้วย Next.js และ TypeScript แบบแบ่งระยะ 6 ระยะ ประกอบด้วยคลังหลักฐานที่ผูกหลักฐานหนึ่งชิ้นกับหลายข้อ ตรวจไฟล์ซ้ำ และสแกนข้อมูลส่วนบุคคล ตัวแก้ไข SAR สองภาษา กฎวิเคราะห์ช่องว่าง 11 ข้อ เครื่องสถานะของรอบการประเมินที่ล็อกพร้อมค่าแฮช พื้นที่ทำงานของกรรมการ การนำเข้าตัวชี้วัดจาก Excel การส่งออก SAR เป็นไฟล์ DOCX และบริการปัญญาประดิษฐ์ 6 ฟีเจอร์ รวมถึงการแปลภาษาไทยและอังกฤษ ซึ่งตัดข้อมูลส่วนบุคคลก่อนส่ง ตรวจรหัสหลักฐาน ตัวเลข และประโยคเชิงตัดสินหลังประมวลผล และต้องให้ผู้ใช้กดยอมรับก่อนนำเข้าเอกสาร โดยปัญญาประดิษฐ์ไม่สามารถให้คะแนนหรือเปลี่ยนสถานะเอกสารได้ ระบบรับผู้ใช้ใหม่ด้วยการเชิญหรือคำขอเข้าใช้งานที่ผู้ดูแลอนุมัติและกำหนดบทบาท การระงับบัญชีแทนการลบ และการแจ้งเตือนที่พาไปหน้างาน ส่วนติดต่อผู้ใช้ได้รับการออกแบบใหม่ 2 ครั้งสำหรับผู้ใช้วัยทำงานถึงสูงวัย ครั้งล่าสุดใช้ Tailwind CSS โทนสีธรรมชาติ โหมดสว่างเป็นค่าเริ่มต้นและโหมดมืดที่ไม่ดำสนิท โดยใช้ WCAG 2.2 ระดับ AA เป็นแนวทาง ผลการทดสอบด้วย Vitest ผ่าน 837 จาก 837 กรณี การทดสอบผ่านเบราว์เซอร์ด้วย Playwright ผ่าน 176 กรณีและข้าม 2 กรณีโดยมีเหตุผล การตรวจชนิดข้อมูลไม่พบข้อผิดพลาด การตรวจโค้ดรอบสุดท้ายได้ผลอนุมัติ และการตรวจความมั่นคงปลอดภัยผ่านในขอบเขตการสาธิต โดยมีข้อจำกัดว่าการตรวจสิทธิ์และข้อมูลยังอยู่ในเบราว์เซอร์ การประเมินส่วนติดต่อผู้ใช้โดยตัวแทนปัญญาประดิษฐ์พบว่าไม่มีข้อความที่ความต่างสีต่ำกว่าเกณฑ์ทั้งสองธีม ไม่พบข้อผิดพลาดจากเครื่องมือตรวจการเข้าถึง และทุกบทบาทเริ่มงานจากหน้าหลักหรือการแจ้งเตือนได้ ส่วนผลการประเมินด้านเวลา ความถูกต้องของปัญญาประดิษฐ์ ความสามารถในการใช้งาน และความพึงพอใจของผู้ใช้จริง [ต้องการข้อมูล: ผลการประเมินกับผู้ใช้และผู้เชี่ยวชาญ]

# Abstract

**Title** AUN-QA Copilot: An AI-Assisted Web Application for Programme-Level Self-Assessment Report Preparation [ต้องตรวจสอบ: approved English title]

**Author** [ต้องการข้อมูล: author name and student ID]

**Advisor** [ต้องการข้อมูล: advisor name]

**Academic Paper** [ต้องการข้อมูล: degree, programme, faculty, university, academic year]

**Keywords** AUN-QA, self-assessment report, quality assurance, large language model, gap analysis

This research aimed to develop a web application for managing programme-level quality assurance documents and evidence according to the AUN-QA Version 4.0 framework, which comprises 8 criteria and 53 requirements; to develop an AI assistant that drafts Self-Assessment Report (SAR) sections from existing evidence, together with a PDCA-based gap analysis; to develop a review and approval workflow with role-based access control and an audit log; and to evaluate the system. The system was developed with Next.js and TypeScript in six iterative phases. It provided an evidence repository in which one piece of evidence could be linked to multiple requirements, with duplicate-file detection and personal data scanning; a bilingual SAR editor; eleven gap-analysis rules; an assessment-cycle state machine that locked approved cycles with a snapshot hash; an assessor workspace; Excel import of programme metrics; SAR export to DOCX; six AI features, including Thai–English translation; user onboarding through invitations or access requests approved by an administrator, who assigned the roles; account suspension instead of deletion; and notifications that linked to the related page. Every AI request was redacted for personal data before being sent, every output was post-checked for evidence codes, numbers, and judgement statements, and every result required explicit user acceptance. The AI could not assign ratings or change document states. The user interface was redesigned twice for working-age and older academic staff; the final design used Tailwind CSS, an earth-tone palette, a light theme by default, and a dark theme that avoided pure black, with WCAG 2.2 Level AA as a guideline. All 837 of 837 Vitest test cases passed, 176 Playwright browser tests passed with 2 skipped for documented reasons, type checking reported no errors, the final code review was approved, and the security audit passed within the scope of a local demonstration, with the limitation that access control and data storage remained in the browser. An agent-based interface evaluation found no text below the contrast threshold in either theme and no violations reported by the accessibility checker, and every role could start its work from the home page or a notification. The evaluation of time savings, AI accuracy, usability, and satisfaction with real users [ต้องการข้อมูล: evaluation results with users and experts].

# กิตติกรรมประกาศ

[ต้องการข้อมูล: กิตติกรรมประกาศ — ไม่เกิน 1 หน้า ไม่ระบุวันที่ ไม่ใส่คำนำหน้านามผู้เขียน และลงชื่อผู้วิจัยท้ายข้อความ]

# คำอธิบายสัญลักษณ์และคำย่อ

Table: ตารางที่ 0.1 คำย่อที่ใช้ในเล่ม [ต้องตรวจสอบกับคู่มือสาขา: การกำหนดเลขตารางในส่วนนำ]

| คำย่อ | คำเต็ม |
|---|---|
| ADR | Architecture Decision Record |
| AFI | Areas for Improvement |
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| ASVS | Application Security Verification Standard |
| AUN-QA | ASEAN University Network Quality Assurance |
| CLO | Course Learning Outcomes |
| CSPRNG | Cryptographically Secure Pseudorandom Number Generator |
| CSS | Cascading Style Sheets |
| DOCX | Office Open XML Document (ไฟล์ Microsoft Word) |
| E2E | End-to-End Test |
| ELO | Expected Learning Outcomes |
| LLM | Large Language Model |
| NER | Named Entity Recognition |
| NIST | National Institute of Standards and Technology |
| OBE | Outcome-Based Education |
| OWASP | Open Worldwide Application Security Project |
| PDCA | Plan–Do–Check–Act |
| PDPA | Personal Data Protection Act (พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562) |
| PII | Personally Identifiable Information |
| PLO | Programme Learning Outcomes |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security |
| SAR | Self-Assessment Report |
| SUS | System Usability Scale |
| UAT | User Acceptance Testing |
| UI | User Interface |
| WCAG | Web Content Accessibility Guidelines |
