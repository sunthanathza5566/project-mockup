# Research: TASK-0001 — ยืนยันอ้างอิงป้ายในเล่ม (B6c → D2)

> researcher · วันที่เข้าถึงแหล่งทั้งหมด **2026-10-22** (คู่มือ AUN ดาวน์โหลดและแปลงข้อความด้วย `pdftotext` วันเดียวกัน) · Study: PROTOCOL ข้อ 5 + `.agents/research/standards/thesis-th.md` (APA 7 ข้อ 5), `ui-ux.md`, `uml.md`
> สถานะไฟล์ก่อนหน้า: **ยังไม่มีไฟล์นี้** (B6c หยุดก่อนเขียน) → รอบนี้ทำใหม่ทั้งไฟล์ เลขบรรทัดอ้างจาก `thesis/chapters/*.md` ที่ commit `b7733a9` (ไม่มี commit ใหม่ของ thesis/ หลังจากนั้น)
> ป้ายสถานะ: **ยืนยัน** = เปิดแหล่งปฐมภูมิ/เอกสารทางการอ่านเอง · **แหล่งรอง** = เปิดได้เฉพาะแหล่งรอง (catalog, บทความที่อ้างถึง, สรุปของหน่วยงาน) หรือพบแหล่งเดียว · **ไม่พบ** = เสนอเปลี่ยนถ้อยคำ · **นอกขอบเขต** = ต้องการข้อมูลเจ้าของ/คู่มือสาขา/ผู้เชี่ยวชาญ ไม่ใช่งานค้นอ้างอิง

## คำถาม
1. ข้อความเรื่อง AUN-QA v4.0 (53 ข้อ, การจัดกลุ่ม, สเกล 1–7, verdict, Appendix A/B/D, PDCA, OBE) อยู่หน้าไหนของคู่มือ
2. แหล่งทฤษฎี OBE/Constructive Alignment/Bloom ฉบับปรับปรุง/PDCA ที่เปิดอ่านได้
3. พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล 2562 (+ม.28 การโอนต่างประเทศ) และกฎกระทรวงมาตรฐานหลักสูตร 2565 — ข้อมูลราชกิจจานุเบกษา
4. เอกสารทางการของเทคโนโลยีที่ใช้ (เวอร์ชันจาก lockfile)
5. SUS (Brooke 1996, สูตร, ฉบับไทย), Likert 1932, เกณฑ์แปลผล 0.80
6. บรรณานุกรมที่ค้างใน `90-references.md` (ผู้แต่งครบ ปี เลขหน้า DOI)
7. ขอบเขตเพิ่ม: OWASP Top 10 2021/ASVS, OWASP LLM01, WCAG 2.2, Playwright, `docx`

## เวอร์ชันจาก lockfile (`eduflow-next/package-lock.json`, อ่าน 2026-10-22)
next 14.2.35 · react 18.3.1 · typescript 5.9.3 · vitest 3.2.7 · exceljs 4.4.0 · docx 9.13.0 · @playwright/test 1.64.1 · Anthropic เรียกตรงด้วย `fetch('https://api.anthropic.com/v1/messages')` header `x-api-key` + `anthropic-version: 2023-06-01` (`eduflow-next/app/api/ai/route.ts:86-88`) ไม่ใช้ SDK · mermaid-cli 12.0.0 / mermaid 12.2.0 (global; `standards/uml.md:22`)

---

## คำตอบ (ยืนยันแล้ว) — ตารางต่อป้าย

### A. คู่มือ AUN-QA v4.0 (แหล่ง: AUN 2020 PDF 111 หน้า; เลขหน้า = เลขที่พิมพ์ท้ายหน้า "N | Page"; Appendix B–D เป็นหน้าแนวนอนไม่มีเลขพิมพ์ → ระบุเป็นหน้าของไฟล์ PDF)

| # | ไฟล์:บรรทัด | ข้อความที่ต้องอ้าง | หลักฐานในคู่มือ | อ้างในเนื้อหา (พร้อมวาง) | สถานะ |
|---|---|---|---|---|---|
| 1 | 01-introduction.md:26 | 8 เกณฑ์ 53 ข้อ | Appendix A "Self-rating for AUN-QA Assessment at Programme Level" น. 63–67 นับข้อย่อยได้ 1.1–1.5, 2.1–2.7, 3.1–3.6, 4.1–4.7, 5.1–5.8, 6.1–6.6, 7.1–7.9, 8.1–8.5 = **5+7+6+7+8+6+9+5 = 53** | (AUN, 2020, pp. 63–67) | **ยืนยัน** |
| 2 | 02-literature.md:11 | จำนวนข้อรายเกณฑ์ + การจัดกลุ่ม 1–4/5–7/8 | Table 1.1 "Criteria Grouping" น. 13: **Programme** (1–4), **Resources** (5–7), **Results** (8). จำนวนข้อรายเกณฑ์ตามข้อ 1 | (AUN, 2020, p. 13) · **แก้ถ้อยคำ**: คู่มือเรียกกลุ่มว่า Programme / Resources / Results ไม่ใช่ "การออกแบบหลักสูตร/ผลผลิต" → ใช้ "กลุ่มหลักสูตร (Programme) กลุ่มทรัพยากร (Resources) และกลุ่มผลลัพธ์ (Results)" และตัดคำว่า "ตามที่ระบุในสเปก" ออก เพราะคู่มือกำหนดเอง | **ยืนยัน** |
| 3 | 01-introduction.md:9 | สเกล 1–7 + กระบวนการ (อ่านเอกสาร → ลงพื้นที่) | สเกล 7 ระดับ น. 57 · Desktop Assessment น. 50 · Site visit/site assessment น. 52 · SAR ตามแบบ Appendix A น. 43 | (AUN, 2020, pp. 50–52, 57) | **ยืนยัน** |
| 4 | 02-literature.md:29 | ระดับ 1 Absolutely Inadequate … 4 Adequate as Expected … 7 Excellent; คะแนนรายเกณฑ์เป็นจำนวนเต็ม; verdict แบบองค์รวม ไม่ใช้ค่าเฉลี่ย | ตารางสเกล น. 57 (ระดับ 7 ชื่อเต็ม "Excellent (Example of World-class or Leading Practices)") · "only whole numbers are used … The overall verdict … based on a holistic assessment rather than the arithmetic average … The arithmetic average is not used." น. 58 (ซ้ำอีกครั้งในหัวข้อ Overall Verdict น. 59) | (AUN, 2020, pp. 57–59) | **ยืนยัน** |
| 5 | 02-literature.md:31 | ชื่อ/เนื้อหา Appendix A, B, D | รายการภาคผนวก น. 62: A Self-rating…, B Template for AUN-QA Assessment Planning…, C Sample of…Planning, D Template for AUN-QA Assessment Report…, E Sample of…Report, F Feedback Report · Appendix B (PDF หน้า 69) คอลัมน์ Strengths / Interview Questions / Sources of Evidence / Areas for Improvement ตรงกับเล่ม · Appendix D (PDF หน้า 84) มี Report Summary, ตาราง Criterion–Score 8 เกณฑ์ และ Overall Verdict · Desktop planning ใช้ Appendix B (น. 50–51) | (AUN, 2020, pp. 50–51, 62–67) | **ยืนยัน** |
| 6 | 02-literature.md:35 | แหล่งทฤษฎี PDCA | "a cycle of planning, doing, checking … then acting … This is the PDCA concept built into all eight criteria." น. 13 · Figure 3.1 PDCA Approach to SAR Development น. 41 · "The Plan-Do-Check-Act (PDCA) or Deming Cycle … is adopted for quality assessment" น. 47 | (AUN, 2020, pp. 13, 41, 47) — ไม่ได้เปิดงานต้นฉบับของ Deming จึง**ไม่แนะนำ**ให้อ้าง Deming ตรง | **ยืนยัน** (ผ่านคู่มือ AUN) |
| 7 | 02-literature.md:39 | OBE + Constructive Alignment | OBE นิยามใน น. 16 ("a way in which a curriculum is defined, organised, and directed based on all the things that learners would learn and demonstrate…") · "Biggs (2003) refers to this process as constructive alignment" น. 20 · บทความต้นฉบับ Biggs (1996) ยืนยัน metadata จาก Crossref | (AUN, 2020, pp. 16, 20; Biggs, 1996) | **ยืนยัน** (Biggs 1996 = metadata Crossref ไม่ได้อ่านเนื้อบทความ เพราะ Springer ต้อง login) |

### B. ทฤษฎี/กฎหมาย

| # | ไฟล์:บรรทัด | ข้อความ | แหล่งที่เปิดได้ (URL, เข้าถึง 2026-10-22) | APA 7 พร้อมวาง | สถานะ |
|---|---|---|---|---|---|
| 8 | 02-literature.md:43 | Bloom ฉบับปรับปรุง | e-teaching.org record https://www.e-teaching.org/materialien/literatur/anderson-krathwohl-2001 (ผู้แต่ง L. W. Anderson & D. R. Krathwohl, 2001, Addison-Wesley) · ISBN 0-321-08405-5 (hardcover) / 0-8013-1903-X (abridged) จากผลค้นหา catalog (eduq.info) · เสริม: เกณฑ์ข้อ 1.1 ของ AUN กำหนดให้ ELO "formulated in accordance with an established learning taxonomy" (AUN, 2020, p. 63) | Anderson, L. W., & Krathwohl, D. R. (2001). *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives*. Longman. | **แหล่งรอง** — ไม่ได้เปิดหน้าลิขสิทธิ์ของเล่ม; สำนักพิมพ์ระบุต่างกัน (Longman / Addison Wesley Longman) และบาง catalog ลงเป็นบรรณาธิการ (Eds.) → ติด `[ต้องตรวจสอบ: สำนักพิมพ์และสถานะ Eds. จากหน้าลิขสิทธิ์]` ไว้ที่บรรณานุกรมเท่านั้น ส่วนเนื้อหาอ้าง (Anderson & Krathwohl, 2001) ได้ |
| 9 | 02-literature.md:53 (ป้ายที่ 1) | พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 | ราชกิจจานุเบกษาเปิดไม่ได้ (HTTP 403) · แหล่งรอง 2 แหล่งตรงกันว่า **เล่ม 136 ตอนที่ 69 ก วันที่ 27 พฤษภาคม 2562**: (1) อินโฟกราฟิก หอสมุดสตางค์ มงคลสุข ม.มหิดล https://stang.sc.mahidol.ac.th/Lib-Infographic/pdf/privacy2.pdf (2) รายการอ้างอิงใน Prutipinyo (2022) https://so05.tci-thaijo.org/index.php/journal_law/article/view/258607 | พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562. (2562, 27 พฤษภาคม). *ราชกิจจานุเบกษา*. เล่ม 136 ตอนที่ 69 ก. · ในเนื้อหา: (พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562, 2562) | **แหล่งรอง** (2 แหล่งตรงกัน) — ไม่ใส่เลขหน้าเพราะยังไม่ได้เห็นราชกิจจาฯ |
| 10 | 01-introduction.md:7 | กฎกระทรวงมาตรฐานหลักสูตรการศึกษาระดับอุดมศึกษา พ.ศ. 2565 | ราชกิจจาฯ เปิดไม่ได้ (403) · ไฟล์ ม.อ. https://dic.sat.psu.ac.th/pdfdoc/undergrad_standard65.pdf ดาวน์โหลดได้แต่ฟอนต์ไทยสกัดข้อความไม่ได้ · ผลค้นหาหลายแหล่งระบุ เล่ม 139 ตอนที่ 20 ก หน้า 12–19 ลงวันที่ 31 มีนาคม 2565 (ไม่ได้เปิดยืนยันเอง) | กฎกระทรวงมาตรฐานหลักสูตรการศึกษาระดับอุดมศึกษา พ.ศ. 2565. (2565, 31 มีนาคม). *ราชกิจจานุเบกษา*. เล่ม 139 ตอนที่ 20 ก. หน้า 12–19. | **แหล่งรอง** (ผลค้นหาเท่านั้น) — **และยังไม่ยืนยันเนื้อหา** ว่ากฎกระทรวงเขียนเรื่อง "เลือกใช้ระบบประกันคุณภาพได้หลายระบบ" → เสนอถ้อยคำ: "สถาบันอุดมศึกษาของไทยต้องจัดให้มีระบบประกันคุณภาพหลักสูตร และหลายสถาบันเลือกใช้เกณฑ์ AUN-QA (บรรณกร แซ่ลิ่ม, 2567)" แล้วคงป้าย `[ต้องตรวจสอบ: ข้อในกฎกระทรวง 2565 ที่กล่าวถึงการประกันคุณภาพ]` จนเจ้าของเปิดราชกิจจาฯ |
| 11 | 01-introduction.md:13 | ครูเปิดสอนพิเศษ/รับเงินจากนักเรียนขัดจรรยาบรรณ/ระเบียบ | ค้น 1 รอบ ไม่พบข้อความระเบียบ ศธ./ข้อบังคับคุรุสภาที่เปิดอ่านได้ | — | **ไม่พบ** → เสนอถ้อยคำ: "ผู้วิจัยยกเลิกแนวทางดังกล่าวเพื่อหลีกเลี่ยงประเด็นผลประโยชน์ทับซ้อนระหว่างครูกับนักเรียนในความรับผิดชอบ และเพื่อให้ขอบเขตโครงงานชัดเจนขึ้น" (ไม่อ้างกฎหมาย) |
| 12 | 05-conclusion.md:18 | การขาดขั้น Check/Act เป็นสาเหตุหนึ่งที่คะแนนไม่ถึงระดับ 4 | ไม่มีงานที่ยืนยันความเป็นเหตุ · ที่มีจริง: ระดับ 4 = "adequate and evidences support that it has been fully implemented … shows consistent results as expected" (AUN, 2020, p. 57) และคู่มือฝังข้อกำหนดการพัฒนาคุณภาพ (PDCA) ไว้ในทุกเกณฑ์ (p. 13) · บรรณกร แซ่ลิ่ม (2567) พบคะแนนรวม 3.71–3.88 ไม่ถึง 4.00 (สาเหตุที่รายงาน = เกณฑ์ 8 และ 7 ไม่ใช่ PDCA) | — | **ไม่พบ** (ข้ออ้างเชิงเหตุ) → เสนอถ้อยคำ: "…ตอบปัญหาการเขียนที่ขาดหลักฐานขั้น Check และ Act ซึ่งคู่มือกำหนดให้เป็นส่วนหนึ่งของทุกเกณฑ์ (AUN, 2020, p. 13) และระดับ 4 ต้องมีหลักฐานว่าดำเนินการครบและให้ผลสม่ำเสมอ (AUN, 2020, p. 57)" — ตัดคำว่า "เป็นสาเหตุ" |
| 13 | 02-literature.md:86 | ช่องว่างงานวิจัย (ค้นซ้ำ) | ค้นซ้ำรอบ 2 (เว็บ ไม่ใช่ฐาน TCI/Scopus โดยตรง) **พบงานใหม่ที่ต้องเพิ่มในบท 2**: (1) Tumthong et al. (2026) GPT-4 จับคู่ CLO–PLO ตาม AUN-QA v4.0, 120 การตัดสิน, precision 0.89 recall 0.85 F1 0.87 Cohen's kappa 0.81, หลักสูตรวิศวกรรมเมคคาทรอนิกส์ มทร.สุวรรณภูมิ — เปิด PDF อ่านจริง (2) Muangsanam (2025) วิเคราะห์ความสัมพันธ์ข้อมูลเพื่อจัดทำ SAR ตาม AUN-QA v4.0, สัมภาษณ์ 30 คน, เสนอแบบจำลองข้อมูล + คุณลักษณะระบบ 4 ด้าน (3) ข่าว คณะศึกษาศาสตร์ มข. อบรม "Writing SAR Using AI for AUN-QA" 12 พ.ค. 2569 (แสดงว่ามีการใช้ AI เขียน SAR ในทางปฏิบัติแล้ว แต่ไม่ใช่งานวิจัย) · **ยังไม่พบ** งานที่ประเมิน LLM ร่าง SAR แบบ grounded + แยกผู้ร่าง/ผู้ตรวจ | ดูรายการ 31–33 | **แหล่งรอง/บางส่วน** → แก้ย่อหน้าให้ระบุว่ามีงานใช้ LLM ช่วย **การจับคู่ CLO–PLO** ในบริบท AUN-QA ไทยแล้ว (Tumthong et al., 2026) แต่ยังไม่พบงานร่าง SAR; คงป้าย `[ต้องตรวจสอบ: ค้นในฐาน TCI/Scopus]` ไว้ได้ หรือเขียนในข้อจำกัดว่า "การสืบค้นใช้เครื่องมือค้นเว็บ 2 รอบ" |

### C. เทคโนโลยี (เอกสารทางการ, เวอร์ชันตาม lockfile)

| # | ไฟล์:บรรทัด | ข้อความ | แหล่ง (เข้าถึง 2026-10-22) | APA 7 พร้อมวาง | สถานะ |
|---|---|---|---|---|---|
| 14 | 02-literature.md:59 | Next.js App Router, Route Handler | https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers — "Route Handlers allow you to create custom request handlers for a given route using the Web Request and Response APIs" + ตัวอย่างเรียก API ภายนอกด้วย `process.env.DATA_API_KEY` ในฝั่งเซิร์ฟเวอร์ (เอกสาร v14 lastUpdated 2024-02-23) | Vercel. (2024). *Route handlers* (Next.js 14 documentation). https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers | **ยืนยัน** |
| 15 | 02-literature.md:60 | TypeScript ตรวจชนิดก่อนรัน | https://www.typescriptlang.org/docs/handbook/2/basic-types.html — "a static type-checker like TypeScript … tells us when things might be going off the rails" / "error message before we run the code" | Microsoft. (n.d.). *The basics*. TypeScript handbook. https://www.typescriptlang.org/docs/handbook/2/basic-types.html | **ยืนยัน** |
| 16 | 02-literature.md:61 | Web Storage | https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API — "provides mechanisms by which browsers can store key/value pairs"; `sessionStorage` แยกตามแท็บ ลบเมื่อปิดแท็บ, `localStorage` คงอยู่หลังปิดเบราว์เซอร์ | MDN contributors. (n.d.). *Web Storage API*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API | **ยืนยัน** (หน้า MDN ไม่มีคำเตือนเรื่องเก็บข้อมูลลับ — ถ้าเล่มจะเขียนว่า localStorage เสี่ยง XSS ให้อ้าง security audit ของโครงงานแทน) |
| 17 | 02-literature.md:62 | Claude API | https://platform.claude.com/docs/en/api/overview — "The Claude API is a RESTful API at `https://api.anthropic.com`"; Messages API `POST /v1/messages`; header `x-api-key` (legacy fallback ของ Authorization, ยังรองรับ), `anthropic-version` (required), `content-type` (required) · (docs.anthropic.com redirect 301 ไป platform.claude.com) | Anthropic. (n.d.). *API overview*. Claude Docs. https://platform.claude.com/docs/en/api/overview | **ยืนยัน** · ข้อสังเกต: ตัวอย่างค่า `anthropic-version` ในหน้าเอกสารเป็นวันที่ใหม่ แต่โค้ดใช้ `2023-06-01` (`route.ts:88`) — ไม่ต้องเขียนเลขนี้ในเล่ม |
| 18 | 02-literature.md:63 | Vitest | https://vitest.dev/guide/ — "Vitest … is a next generation testing framework powered by Vite." (หน้านี้ไม่ได้พูดถึง TypeScript) | Vitest. (n.d.). *Getting started*. https://vitest.dev/guide/ | **ยืนยัน** → แก้ถ้อยคำเล็กน้อย: "เฟรมเวิร์กทดสอบที่ทำงานบน Vite ผู้วิจัยใช้ทดสอบหน่วยของโค้ด TypeScript" (ไม่อ้างว่าเอกสารบอกเรื่อง TS) |
| 19 | 02-literature.md:64 | ExcelJS | https://github.com/exceljs/exceljs — "Excel Workbook Manager", MIT license (ใช้ 4.4.0) | ExcelJS. (n.d.). *ExcelJS* [Computer software]. GitHub. https://github.com/exceljs/exceljs | **ยืนยัน** |
| 20 | 02-literature.md:65 | Mermaid + mermaid-cli | https://mermaid.js.org/intro/ — "Mermaid lets you create diagrams and visualizations using text and code."; หน้าเดียวกันลิงก์ Mermaid CLI เป็นโครงการพี่น้อง | Mermaid. (n.d.). *About Mermaid*. https://mermaid.js.org/intro/ | **ยืนยัน** |

### D. เครื่องมือวัดผล

| # | ไฟล์:บรรทัด | ข้อความ | แหล่ง (เข้าถึง 2026-10-22) | APA 7 พร้อมวาง | สถานะ |
|---|---|---|---|---|---|
| 21 | 03-methodology.md:271 (ป้ายที่ 1) + 90-references.md:13 | Brooke (1996) ปี + เลขหน้า 189–194 + บรรณาธิการ | ปี 1996 และบรรณาธิการ: Routledge https://www.routledge.com/products/9780429157011 (Patrick W. Jordan, B. Thomas, Ian Lyall McClelland, Bernard Weerdmeester, 1996; สารบัญ Part 6 มีบท "SUS - a quick and dirty usability scale") + Bookshare https://bookshare.org/browse/book/5913435 ("Bernard A. Weerdmeester") → อักษรย่อ **B. A. Weerdmeester, I. L. McClelland ถูกต้องแล้ว** (Wikipedia เขียน "A. L." ผิด) · เลขหน้า 189–194: เห็นเฉพาะ BibTeX ของ UCL ConstructDB (เขียนเพี้ยนเป็น volume 189 number 194) https://verdi.cs.ucl.ac.uk/constructDB/publications/brooke-susa-1996.html · ข้อมูล "1986" ใน MeasuringU คือปีที่**สร้าง**แบบวัด ไม่ใช่ปีพิมพ์ | Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis. | **แหล่งรอง** — ปี/บรรณาธิการ/ผู้พิมพ์ยืนยันได้; **เลขหน้ายังไม่ได้เห็นจากตัวเล่ม** → ลดป้ายเป็น `[ต้องตรวจสอบ: เลขหน้า]` จุดเดียวในบรรณานุกรม ลบป้ายในบท 3 |
| 22 | 03-methodology.md:271 (ป้ายที่ 2) | สูตรคำนวณ SUS | Sauro, J. (2011, 3 Feb). https://measuringu.com/sus/ — ข้อคี่ "subtract one from the user response", ข้อคู่ "subtract the user responses from 5", รวมแล้ว "multiply that total by 2.5" (ช่วง 0–100) · หน้า Brooke 2013 (uxpajournal.org) ตอบ 404 | Sauro, J. (2011, February 3). *Measuring usability with the System Usability Scale (SUS)*. MeasuringU. https://measuringu.com/sus/ · ในเนื้อหา: (Brooke, 1996 อ้างถึงใน Sauro, 2011) | **แหล่งรอง** → ใส่สูตรได้โดยอ้างแบบแหล่งรอง |
| 23 | 03-methodology.md:271 (ป้ายที่ 3) | SUS ฉบับภาษาไทยที่ตรวจความตรง | ค้น 2 รอบ (อังกฤษ+ไทย) ไม่พบ SUS ไทยที่ validate · พบเฉพาะเครื่องมืออื่น (T-TUQ) | — | **ไม่พบ** → เสนอถ้อยคำ: "ผู้วิจัยแปล SUS เป็นภาษาไทยเอง และให้ผู้เชี่ยวชาญ [ต้องการข้อมูล: จำนวน] คนตรวจความตรงเชิงเนื้อหาก่อนใช้ เนื่องจากไม่พบฉบับภาษาไทยที่ผ่านการตรวจความตรงจากการสืบค้น" |
| 24 | 03-methodology.md:273 (ป้ายที่ 1) + 90-references.md:23 | Likert (1932) | Wellcome Collection catalogue https://wellcomecollection.org/works/kz3csmxg — Rensis Likert, 1932, New York, 55 หน้า, ชุด Archives of Psychology, เป็นวิทยานิพนธ์ PhD Columbia ด้วย · เลขชุด No. 140 และ volume 22: จากผลค้นหา (GESIS/ruofeidu BibTeX, สแกนปก "No. 140, June 1932") ไม่ได้เปิดเอง | Likert, R. (1932). A technique for the measurement of attitudes. *Archives of Psychology, 22*(140), 1–55. | **ยืนยัน** (ปี ชื่อเรื่อง 55 หน้า จาก catalog ที่เปิดเอง; volume 22 เป็นแหล่งรอง — ถ้าไม่อยากเสี่ยงให้ใช้รูปเดิม *Archives of Psychology, 140*, 1–55 ซึ่งตรงกับหลักฐาน) → ลบป้ายได้ |
| 25 | 03-methodology.md:273 (ป้ายที่ 2) | เกณฑ์แปลผลกว้าง 0.80 | ไม่พบแหล่งที่เปิดอ่านได้ (ค้นหา Best 1977 พบแค่ catalog ของหนังสือ ไม่มีตาราง) | — | **ไม่พบ** → เสนอถ้อยคำ (ไม่ต้องอ้าง เพราะเป็นการคำนวณ): "ผู้วิจัยกำหนดเกณฑ์แปลผลแบบช่วงเท่ากัน ความกว้างอันตรภาคชั้น = (คะแนนสูงสุด − คะแนนต่ำสุด) ÷ จำนวนระดับ = (5 − 1) ÷ 5 = 0.80 ได้ช่วง 1.00–1.80 …" |

### E. บรรณานุกรมที่ค้างใน `90-references.md`

| # | ไฟล์:บรรทัด | ประเด็น | หลักฐาน (เข้าถึง 2026-10-22) | APA 7 พร้อมวาง | สถานะ |
|---|---|---|---|---|---|
| 26 | 90-references.md:5 (R4) | เลขหน้า | หน้า ThaiJO https://so03.tci-thaijo.org/index.php/humsujournal/article/view/266983 : ปีที่ 43 ฉบับที่ 1 (มกราคม–กุมภาพันธ์ 2567) เผยแพร่ 16 ก.พ. 2567 **หน้าไม่แสดงเลขหน้าและ DOI** (หน้าสารบัญฉบับต้อง login) | บรรณกร แซ่ลิ่ม. (2567). แนวทางการพัฒนาคุณภาพระดับหลักสูตรตามเกณฑ์ AUN-QA คณะศิลปศาสตร์ มหาวิทยาลัยสงขลานครินทร์. *วารสารมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยมหาสารคาม, 43*(1). https://so03.tci-thaijo.org/index.php/humsujournal/article/view/266983 | **ยืนยัน** (ข้อมูลเท่าที่แหล่งมี) — APA 7 ละเลขหน้าได้เมื่อแหล่งออนไลน์ไม่มี → ลบป้าย |
| 27 | 90-references.md:7 (R2) | ปีฉบับ vs วันเผยแพร่, เลขหน้า | https://ph01.tci-thaijo.org/index.php/IT_Journal/article/view/74090 : Vol. 2 No. 1 "มกราคม–มิถุนายน 2549" แต่ Published 1 ม.ค. 2007; ไม่มีเลขหน้า/DOI | พิสิฐ เมธาภัทร. (2549). ระบบสารสนเทศเพื่องานประกันคุณภาพการศึกษา. *Information Technology Journal KMUTNB, 2*(1). https://ph01.tci-thaijo.org/index.php/IT_Journal/article/view/74090 | **ยืนยัน** — ใช้ปีของฉบับ (2549) ตามกฎ `thesis-th.md` 5.2 → ลบป้าย |
| 28 | 90-references.md:9 (R3) | ปีฉบับ เลขหน้า DOI | https://so05.tci-thaijo.org/index.php/irdssru/article/view/213882 : ป้ายฉบับ "ปีที่ 9 ฉบับที่ 1 SUP (2017)" เผยแพร่ 2 ก.ย. 2019, เริ่มหน้า 87 (ไม่มีหน้าสุดท้าย), DOI ที่หน้าแสดง `10.53848/irdssru.v9i1 SUP.213882` (มีช่องว่าง; Crossref ตอบ 404) | อนุพล สิงขรเขตต์, เปรมปรีดา ทองลา, ปัชญาภรณ์ เธียรประดิษฐ์ และรัตน์ฟ้า เภกะสุต. (2560). ระบบควบคุมงานประกันคุณภาพการศึกษาภายในระดับหลักสูตรออนไลน์ กรณีศึกษา คณะวิทยาการจัดการ มหาวิทยาลัยราชภัฏรำไพพรรณี. *วารสารวิจัยและพัฒนา มหาวิทยาลัยราชภัฏสวนสุนันทา, 9*(1 ฉบับพิเศษ), 87–. https://so05.tci-thaijo.org/index.php/irdssru/article/view/213882 | **ยืนยัน + แก้**: ปีควรเป็น **2560** (ค.ศ. 2017 ตามป้ายฉบับ) ไม่ใช่ 2562 → ต้องแก้การอ้างในเนื้อหาทุกจุดเป็น (อนุพล สิงขรเขตต์ และคณะ, 2560) · ไม่ใส่ DOI (resolve ไม่ได้) ใช้ URL แทน · หน้าสุดท้ายไม่ทราบ → ใช้ "87–" ไม่ได้ตามหลัก APA ให้ละเลขหน้าออกทั้งหมดดีกว่า |
| 29 | 90-references.md:15 (2 ป้าย) | ชื่อบทความส่วนท้าย + เลขหน้า | PDF ของวารสาร https://aircconline.com/ijmit/V9N2/9217ijmit01.pdf (หน้าแรก "DOI : 10.5121/ijmit.2017.9201", เลขหน้า 1–12) + Crossref https://api.crossref.org/works/10.5121/ijmit.2017.9201 (pages 01-12, 30 May 2017) | Diab, S., & Sartawi, B. (2017). Classification of questions and learning outcome statements (LOS) into Bloom's taxonomy (BT) by similarity measurements towards extracting of learning outcome from learning material. *International Journal of Managing Information Technology, 9*(2), 1–12. https://doi.org/10.5121/ijmit.2017.9201 | **ยืนยัน** (ทั้ง 2 ป้าย) |
| 30 | 90-references.md:21 + 02-literature.md:47 | Ji et al. ผู้แต่งครบ ปี เล่ม ฉบับ หน้า | Crossref https://api.crossref.org/works/10.1145/3571730 : *ACM Computing Surveys* **55**(12), pp. 1–38, published online 3 Mar 2023, print 2023 · ผู้แต่งฉบับ ACM 10 คน (arXiv 2202.03629 มี 13 คน — อ้างฉบับ ACM ให้ใช้รายชื่อ 10 คน) | Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y. J., Madotto, A., & Fung, P. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys, 55*(12), 1–38. https://doi.org/10.1145/3571730 | **ยืนยัน** → ปีในเนื้อหาเปลี่ยนเป็น **Ji et al. (2023)** (บท 2 บรรทัด 47 และทุกจุด) · เลข Article ของ ACM ไม่ปรากฏใน Crossref จึงใช้เลขหน้า |
| 31 | 90-references.md:27 | Rashkin et al. ผู้แต่งครบ | https://arxiv.org/abs/2112.12870 : v1 23 Dec 2021, v2 2 Aug 2022, ไม่มี journal ref | Rashkin, H., Nikolaev, V., Lamm, M., Aroyo, L., Collins, M., Das, D., Petrov, S., Tomar, G. S., Turc, I., & Reitter, D. (2021). *Measuring attribution in natural language generation models* (arXiv:2112.12870). arXiv. https://doi.org/10.48550/arXiv.2112.12870 | **ยืนยัน** |
| 32 | 90-references.md:31 | Verbeken et al. ผู้แต่งครบ | https://arxiv.org/abs/2603.13562 : 13 Mar 2026, 7 ผู้แต่ง, ชื่อเต็มมีชื่อรอง | Verbeken, B. F., Van den Broeck, J., De Cleyn, I., Van Luchene, S., Engels, N., Algaba, A., & Ginis, V. (2026). *Scalable classification of course information sheets using large language models: A reusable institutional method for academic quality assurance* (arXiv:2603.13562). arXiv. https://arxiv.org/abs/2603.13562 | **ยืนยัน** (เพิ่มชื่อรองที่เล่มยังขาด) |

### F. ป้ายนอกขอบเขตงานค้นอ้างอิง (คงป้ายไว้)

| # | ไฟล์:บรรทัด | ป้าย | ต้องการจาก |
|---|---|---|---|
| 33 | 00-front-matter.md:5 | ชื่อเรื่องที่อนุมัติ (ไทย) | เจ้าของ/อาจารย์ที่ปรึกษา |
| 34 | 00-front-matter.md:19 | approved English title | เจ้าของ |
| 35 | 00-front-matter.md:37 | เลขตารางในส่วนนำ | คู่มือสาขา |
| 36 | 03-methodology.md:5 | บทที่วางการวิเคราะห์/ออกแบบ | คู่มือสาขา (`thesis-th.md` 3.1) |
| 37 | 03-methodology.md:15 | การเปิดเผยการใช้ AI | คู่มือสาขา/สถาบัน |
| 38 | 03-methodology.md:279 | จริยธรรมการวิจัยในมนุษย์ | คู่มือสาขา/คณะกรรมการจริยธรรม |
| 39 | 95-appendix.md:88 | ประวัติผู้วิจัย | เจ้าของ + คู่มือสาขา |
| 40 | 02-literature.md:53 (ป้ายที่ 2) | มหาวิทยาลัย = ผู้ควบคุม, ระบบ = ผู้ประมวลผล | ผู้เชี่ยวชาญกฎหมาย (ไม่ได้เปิดตัวบท ม.6 ได้) — เสนอถ้อยคำปลอดภัย: "ผู้วิจัย**ออกแบบโดยสมมติ**ให้มหาวิทยาลัยเป็นผู้ควบคุมข้อมูล…" |
| 41 | 04-results.md:101 | จับคู่ E2E กับ unit test | qa-tester (ไม่ใช่การอ้างอิง) |

---

## แหล่งอ้างอิงเพิ่มตามขอบเขต D2 (สิ่งที่เพิ่มหลังเล่มฉบับก่อน — ยังไม่มีป้ายในเล่ม ให้ thesis-writer ใช้เมื่อเขียนส่วน security/UI/PDPA/การทดสอบ/การส่งออก)

| # | ใช้กับ | ข้อเท็จจริงที่ยืนยัน (เข้าถึง 2026-10-22) | APA 7 พร้อมวาง | สถานะ |
|---|---|---|---|---|
| 42 | security audit (`.agents/reviews/TASK-0001-security.md:4`) | OWASP Top 10:2021 = A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable and Outdated Components, A07 Identification and Authentication Failures, A08 Software and Data Integrity Failures, A09 Security Logging and Monitoring Failures, A10 SSRF — https://top10.owasp.org/2021 (owasp.org/Top10/2021 redirect 308) · **มีฉบับ 2025 แล้ว** https://top10.owasp.org/2025 (หน้าไม่ระบุวันที่/สถานะ final; หน้า 2021 ยังเรียกว่า "2025 Release Candidate") | OWASP Foundation. (2021). *OWASP Top 10:2021*. https://top10.owasp.org/2021 | **ยืนยัน** — เล่มควรระบุว่าตรวจตามฉบับ 2021 (ตามที่ auditor ใช้จริง) และหมายเหตุว่ามีฉบับ 2025 |
| 43 | security audit (ASVS L1, อ้างเลขข้อ "ASVS 2.1" ที่ `TASK-0001-security.md:39`) | ASVS 4.0.3 ออก 28 ต.ค. (ปี 2021 จากผลค้นหาข่าวในหน้า OWASP) https://github.com/OWASP/ASVS/releases/tag/v4.0.3_release · ฉบับเสถียรล่าสุด 5.0.0 ออก 30 พ.ค. (2025 จากผลค้นหา) https://owasp.org/www-project-application-security-verification-standard/ · **เลขหมวด V2 = Authentication เป็นโครงของ 4.x** → auditor ใช้เลขของ 4.0.3 | OWASP Foundation. (2021). *OWASP application security verification standard 4.0.3*. https://github.com/OWASP/ASVS/releases/tag/v4.0.3_release | **แหล่งรอง** สำหรับปี (หน้า GitHub ไม่แสดงปี) — ในเล่มให้เขียน "ASVS 4.0.3 ระดับ 1" ให้ตรงกับเลขข้อที่ใช้ อย่าเขียนแค่ "ASVS" |
| 44 | prompt injection (`TASK-0001-security.md:26` A-3) | LLM01:2025 Prompt Injection: "occurs when user prompts alter the LLM's behavior or output in unintended ways"; indirect injection "when an LLM accepts input from external sources, such as websites or files" — https://genai.owasp.org/llmrisk/llm01-prompt-injection/ | OWASP Gen AI Security Project. (2025). *LLM01:2025 prompt injection*. https://genai.owasp.org/llmrisk/llm01-prompt-injection/ | **ยืนยัน** (ปี 2025 จากรหัส "LLM01:2025") |
| 45 | ข้อกำหนดการเข้าถึง (03-methodology.md:73 "WCAG ระดับ AA") + ui-ux.md | WCAG 2.2 = W3C Recommendation 12 December 2024 (https://www.w3.org/TR/2024/REC-WCAG22-20241212/), บรรณาธิการ Alastair Campbell, Chuck Adams, Rachael Bradley Montgomery, Michael Cooper, Andrew Kirkpatrick · เกณฑ์ย่อยที่ทีมใช้ (1.4.3, 1.4.4, 1.4.12, 2.4.7, 2.5.8) มี URL ใน `standards/ui-ux.md:246-258` | Campbell, A., Adams, C., Bradley Montgomery, R., Cooper, M., & Kirkpatrick, A. (Eds.). (2024). *Web content accessibility guidelines (WCAG) 2.2*. W3C. https://www.w3.org/TR/WCAG22/ | **ยืนยัน** → เล่มบรรทัด 73 ควรระบุ "WCAG 2.2 ระดับ AA" |
| 46 | PDPA กับการส่งข้อมูลให้ LLM ต่างประเทศ (`TASK-0001-security.md:45` B-8) | ม.28: ประเทศปลายทางต้องมี "มาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอ" พิจารณาจาก (1) มาตรการทางกฎหมายสอดคล้องกฎหมายไทย รวมถึงความมั่นคงปลอดภัย สิทธิเจ้าของข้อมูล การเยียวยา (2) มีหน่วยงานบังคับใช้ · ม.29: ใช้ BCR หรือมาตรการคุ้มครองที่เหมาะสม เช่น SCC (แบบไทย/แบบต่างประเทศ) · ประกาศ กคส. ตาม ม.28 และ ม.29 ลงราชกิจจาฯ **25 ธ.ค. 2566 มีผล 24 มี.ค. 2567** — สคส. ผ่าน กรุงเทพธุรกิจ https://www.bangkokbiznews.com/news/news-update/1115730 และ Tilleke & Gibbins (4 ม.ค. 2024) https://www.tilleke.com/insights/thailand-unveils-regulations-for-cross-border-personal-data-transfer | สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล. (ม.ป.ป.). [ชื่อบทความตามหน้าเว็บ — `[ต้องตรวจสอบ: ชื่อบทความ]`]. *กรุงเทพธุรกิจ*. https://www.bangkokbiznews.com/news/news-update/1115730 · Tilleke & Gibbins. (2024, January 4). *Thailand unveils regulations for cross-border personal data transfer*. https://www.tilleke.com/insights/thailand-unveils-regulations-for-cross-border-personal-data-transfer | **แหล่งรอง** (ไม่ได้เปิดตัวบทและประกาศในราชกิจจาฯ) — ใช้ได้ในบท 2/5 แบบ "แนวทาง" ไม่ใช่ข้อวินิจฉัยกฎหมาย · ข้อสังเกตจากผลค้นหา (ไม่ได้เปิด): มีร่างแก้ไข PDPA ปี 2569 เปิดรับฟังความเห็น 16 ก.ค.–15 ส.ค. 2569 — **อย่าใส่ในเล่ม**จนกว่าจะยืนยัน |
| 47 | E2E (03-methodology.md:206, 223) | "Playwright Test is an end-to-end test framework for modern web apps." — https://playwright.dev/docs/intro (ใช้ 1.64.1) | Microsoft. (n.d.). *Installation*. Playwright. https://playwright.dev/docs/intro | **ยืนยัน** |
| 48 | Unit test | ดูข้อ 18 (Vitest 3.2.7) | — | **ยืนยัน** |
| 49 | การส่งออก .docx | `docx`: "Easily generate and modify .docx files with JS/TS with a nice declarative API. Works for Node and on the Browser." MIT, ผู้ดูแล dolanmiu, เอกสาร https://docx.js.org/ — https://github.com/dolanmiu/docx (หน้า npmjs ตอบ 403) (ใช้ 9.13.0) | Dolan, M. [dolanmiu]. (n.d.). *docx* [Computer software]. GitHub. https://github.com/dolanmiu/docx | **ยืนยัน** — ชื่อจริงผู้ดูแลไม่ได้แสดงในหน้า → ใช้ชื่อบัญชี: `dolanmiu. (n.d.). *docx* [Computer software]…` ปลอดภัยกว่า |

---

## อนุมาน / ยังไม่แน่ใจ
- เลขหน้า AUN ใช้เลขพิมพ์ท้ายหน้าที่ `pdftotext` สกัดได้ (เลขพิมพ์ = เลขหน้า PDF − 1) การกำหนดว่าข้อความอยู่หน้าไหนอาศัยตำแหน่งระหว่างบรรทัด "N | Page" ถ้าข้อความคร่อมหน้าอาจคลาด 1 หน้า (โดยเฉพาะข้อ 3 Desktop Assessment น. 50 และ site visit น. 52)
- Volume 22 ของ Likert, ISBN/สำนักพิมพ์ของ Anderson & Krathwohl, เลขหน้า Brooke 189–194, ปีของ ASVS 4.0.3/5.0.0 (2021/2025), ราชกิจจาฯ ของกฎกระทรวง 2565 = มาจากผลค้นหา/แหล่งรอง ไม่ได้เห็นต้นฉบับ
- Volume 18 ของ IJMECS (Tumthong et al.) อนุมานจาก URL `ijmecs-v18-n3`; หัว PDF เขียน "2026, 3, 121-134"
- ข้อ 28: การเลือกปี 2560 สำหรับ R3 ยึดป้ายฉบับ (2017) ตามกฎ 5.2 แต่ "ปีที่ 9 ปี 2017 เผยแพร่ 2019" อาจเป็นข้อมูลผิดของหน้าวารสารเอง

## ทางเลือก
- R3 ปี: (ก) 2560 ตามป้ายฉบับ — ตรงกฎ APA/กฎโครงการ · (ข) 2562 ตามวันเผยแพร่ — ตรงกับที่เล่มเขียนอยู่ แต่ขัดกฎ 5.2 → แนะนำ (ก) + หมายเหตุในไฟล์ research นี้
- Bloom: อ้าง Anderson & Krathwohl (2001) [แหล่งรอง] หรืออ้างผ่านคู่มือ AUN ข้อ 1.1 ("established learning taxonomy") [ยืนยัน] — แนะนำใช้ทั้งคู่: AUN สำหรับข้อกำหนด, Anderson & Krathwohl สำหรับตัวทฤษฎี

## ข้อแนะนำต่อ architect / thesis-writer
1. แทนที่ป้ายตามตาราง A–E; ข้อ 10, 21 (เลขหน้า Brooke), 8 (สำนักพิมพ์ Bloom) ยังคงป้ายสั้นในบรรณานุกรม
2. **แก้ข้อเท็จจริงที่เล่มเขียนต่างจากแหล่ง**: Ji et al. 2022 → **2023**; R3 2562 → **2560**; ชื่อกลุ่มเกณฑ์ → Programme/Resources/Results; ชื่อ Verbeken ต้องมีชื่อรอง; ชื่อ Diab & Sartawi ต้องมีส่วนท้ายครบ
3. เพิ่มงานที่เกี่ยวข้อง Tumthong et al. (2026) ในบท 2.3 (ใกล้กับ AI-7/curriculum mapping ของระบบมาก: kappa 0.81) และ Muangsanam (2025) (เหตุผลการรวมข้อมูล SAR ไว้ศูนย์กลาง) แล้วปรับย่อหน้าช่องว่างงานวิจัย
4. ป้ายที่ไม่พบ 4 จุด (ข้อ 11, 12, 23, 25) ให้ใช้ถ้อยคำที่เสนอ ไม่ต้องหาอ้างอิง
5. ส่วน security ในเล่ม: ระบุเวอร์ชันมาตรฐานให้ตรงกับที่ auditor ใช้ (OWASP Top 10 **2021**, ASVS **4.0.3 L1**, OWASP LLM01:**2025**) และใช้ ม.28/29 แบบแหล่งรอง

## แหล่งอ้างอิงสำหรับเล่ม (APA 7, เข้าถึง 2026-10-22; ตัด "วันที่เข้าถึง" ออกตอนลงเล่ม)
**ไทย**
- กฎกระทรวงมาตรฐานหลักสูตรการศึกษาระดับอุดมศึกษา พ.ศ. 2565. (2565, 31 มีนาคม). *ราชกิจจานุเบกษา*. เล่ม 139 ตอนที่ 20 ก. หน้า 12–19. `[ต้องตรวจสอบ: เปิดราชกิจจาฯ]`
- บรรณกร แซ่ลิ่ม. (2567). (ดูข้อ 26)
- พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562. (2562, 27 พฤษภาคม). *ราชกิจจานุเบกษา*. เล่ม 136 ตอนที่ 69 ก.
- พิสิฐ เมธาภัทร. (2549). (ดูข้อ 27)
- อนุพล สิงขรเขตต์ และคณะ. (2560). (ดูข้อ 28)

**อังกฤษ**
- Anderson, L. W., & Krathwohl, D. R. (2001). *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives*. Longman.
- Anthropic. (n.d.). *API overview*. Claude Docs. https://platform.claude.com/docs/en/api/overview
- ASEAN University Network. (2020). *Guide to AUN-QA assessment at programme level version 4.0*. AUN Secretariat. https://www.aunsec.org/application/files/2816/7290/3752/Guide_to_AUN-QA_Assessment_at_Programme_Level_Version_4.0_4.pdf
- Biggs, J. (1996). Enhancing teaching through constructive alignment. *Higher Education, 32*(3), 347–364. https://doi.org/10.1007/BF00138871
- Brooke, J. (1996). (ดูข้อ 21)
- Campbell, A., et al. (Eds.). (2024). *Web content accessibility guidelines (WCAG) 2.2*. (ดูข้อ 45 — ลงชื่อบรรณาธิการครบ 5 คน)
- Diab, S., & Sartawi, B. (2017). (ดูข้อ 29)
- ExcelJS. (n.d.). (ดูข้อ 19) · dolanmiu. (n.d.). *docx* (ดูข้อ 49) · Mermaid. (n.d.). (ดูข้อ 20) · MDN contributors. (n.d.). (ดูข้อ 16) · Microsoft. (n.d.). *The basics* (ข้อ 15) · Microsoft. (n.d.). *Installation*. Playwright (ข้อ 47) · Vercel. (2024). (ข้อ 14) · Vitest. (n.d.). (ข้อ 18)
- Ji, Z., et al. (2023). (ดูข้อ 30 — ลงชื่อ 10 คน)
- Likert, R. (1932). (ดูข้อ 24)
- Muangsanam, P. (2025). Analysis of data relationships for internal quality assurance at the program level based on AUN-QA criteria. *Journal of Information Science Research and Practice, 43*(4), 20–39. https://doi.org/10.14456/jiskku.2025.22 (ข้อมูลจากหน้า ThaiJO DOI ของ วช. https://doi.nrct.go.th/ListDoi/listDetail/10.14456%2Fjiskku.2025.22 — ชื่อภาษาไทยไม่แสดงในหน้า; ถ้าบทความเป็นภาษาไทยให้ลงชื่อไทย `[ต้องตรวจสอบ: ชื่อไทยและชื่อผู้แต่งภาษาไทย]`)
- OWASP Foundation. (2021). *OWASP Top 10:2021*. (ข้อ 42) · OWASP Foundation. (2021). *ASVS 4.0.3* (ข้อ 43) · OWASP Gen AI Security Project. (2025). (ข้อ 44)
- Rashkin, H., et al. (2021). (ดูข้อ 31 — ลงชื่อ 10 คน)
- Sauro, J. (2011, February 3). *Measuring usability with the System Usability Scale (SUS)*. MeasuringU. https://measuringu.com/sus/
- Tilleke & Gibbins. (2024, January 4). (ข้อ 46)
- Tumthong, S., Samakthai, N., & Tasatanattakool, P. (2026). Evaluating LLM-assisted CLO–PLO alignment decisions for AUN-QA–aligned curriculum mapping. *International Journal of Modern Education and Computer Science, 18*(3), 121–134. https://doi.org/10.5815/ijmecs.2026.03.08 (PDF https://www.mecs-press.org/ijmecs/ijmecs-v18-n3/IJMECS-V18-N3-8.pdf)
- Verbeken, B. F., et al. (2026). (ดูข้อ 32 — ลงชื่อ 7 คน + ชื่อรอง)

**เปิดไม่ได้ / ไม่ใช้เป็นหลักฐาน**: ratchakitcha.soc.go.th (403), dl.acm.org (403), npmjs.com (403), link.springer.com (ต้อง login), uxpajournal.org ทั้ง Brooke 2013 และ Bangor 2009 (404 — **Bangor et al. 2009 ยังไม่ยืนยันรอบนี้ แต่เล่มปัจจุบันไม่ได้อ้าง จึงไม่กระทบ**), ThaiJO หน้าสารบัญฉบับ (ต้อง login), legalaffairs.stou.ac.th (403)

## สรุป
- ป้ายทั้งหมดในเล่ม **45 จุด** (`[ต้องตรวจสอบ…]` + `[ต้องการอ้างอิง…]`, นับรายป้าย) — นอกขอบเขตงานอ้างอิง 9 จุด (ข้อ 33–41)
- ป้ายที่ต้องค้นอ้างอิง **36 จุด**: **ยืนยัน 25** · **แหล่งรอง/แหล่งเดียว 7** (กฎกระทรวง 2565, Bloom, PDPA, Brooke ×2 [บท 3 + บรรณานุกรม], สูตร SUS, ช่องว่างงานวิจัย) · **ไม่พบ 4** (ระเบียบครู, เหตุ PDCA→คะแนน, SUS ไทย, เกณฑ์ 0.80 — เสนอถ้อยคำแทน)
- ขอบเขตเพิ่ม D2: 8 รายการ (ข้อ 42–49) ยืนยัน 6 · แหล่งรอง 2 (ASVS ปี, PDPA ม.28/29)
