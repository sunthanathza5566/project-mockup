# Playbook — researcher

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 B5s] คู่มือรูปแบบเล่มไทยต่างกันที่ขนาดเนื้อหา เลขหน้าส่วนนำ และคำว่า รูป/ภาพ → ห้ามฮาร์ดโค้ดเป็นค่าเดียว ต้องติดป้าย [ต้องตรวจสอบกับคู่มือสาขา]. ใช้ซ้ำแล้ว 1 ครั้ง (D3 thesis-writer ติดป้ายสาขา 6 จุด) — ใช้ซ้ำอีก 1 ครั้ง → เลื่อนเป็น RULE
- [TASK-0001 B5s] ก่อนเสนอเครื่องมือหรือ dependency ใหม่ เช็ก runtime บนเครื่องก่อน (`where java`, `which pandoc`) แล้วค่อยเสนอ. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D2] PDF ที่ WebFetch อ่านไม่ได้ → ใช้ `pdftotext -layout` กับไฟล์ที่ WebFetch บันทึกไว้ แล้วหาเลขหน้าจากบรรทัด "N | Page" (ได้เลขหน้า Appendix A ของคู่มือ AUN v4.0). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D2] หน้าสำนักพิมพ์ตอบ 403 → ใช้ `api.crossref.org/works/<DOI>` ยืนยันผู้แต่ง/ปี/เล่ม (แก้ Ji et al. เป็น 2023 ACM CSUR 55(12)). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 D2] ฟอนต์ไทยใน PDF เอกสารราชการมักสกัดข้อความไม่ได้ → พึ่งแหล่งรองและติดป้าย "แหล่งรอง" ในตาราง ห้ามนับเป็นยืนยัน. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- คลังมาตรฐาน `.agents/research/standards/`: thesis-th.md, uml.md, ui-ux.md, INDEX.md
- STUDY REQUEST ค้าง (หลัง TASK-0001): `standards/security.md` (ASVS L1 Next.js+Supabase RLS, PDPA ม.28–29 กับ LLM API, Thai NER) จาก security-auditor · `standards/user-docs.md` (คู่มือไทยแบบ task-based, plain language ไทย, Keep a Changelog) จาก docs-writer
- coverage ของ TASK-0001 ที่ `.agents/research/TASK-0001-coverage.md` (% เป็นการตัดสินของ researcher ไม่ใช่การวัด)
- อ้างอิงเล่ม: `.agents/research/TASK-0001-references.md` (D2: 36 จุด ยืนยัน 25 / แหล่งรอง 7 / ไม่พบ 4 + ขอบเขตเพิ่ม OWASP/ASVS 4.0.3/LLM01/WCAG 2.2/PDPA ม.28) · AUN-QA 53 ข้อ = Appendix A น. 63–67 (5/7/6/7/8/6/9/5), กลุ่มเกณฑ์ Programme/Resources/Results (น. 13)
- คู่มือ APA บางแห่งเปิดไม่ได้ → ใช้คู่มือห้องสมุดไทย 2 แห่งแทน
- `standards/ui-ux.md` (U0): ส่วน 3 contrast, 4 palette (คำนวณแล้ว), 5 states, 6 motion, 10 แหล่งอ้างอิง, 11 ช่องว่างถึง architect. ข้อจำกัด: ส่วน 1.2 เรื่องฟอนต์ไทยเป็น [อนุมาน] ทั้งหมด (ไม่พบงานวัดตรง) → ui-inspector ต้อง render จริงก่อนล็อก; Google Fonts และ Material 3 เปิดไม่ได้
