# Playbook — backend-dev

## RULES
- [incident: TASK-0001 A#1 เกิดซ้ำที่ B7] ห้าม export ฟังก์ชันที่ข้าม guard ออกจาก facade `@/lib/api` ต้องอยู่ใน `*.internal.ts` เท่านั้น · getter ข้อมูลดิบต้องรับ `user` และผ่าน guard เดียวกับ getter หลัก. ใช้ซ้ำแล้ว 0 ครั้ง (เลื่อนจาก LESSONS เพราะเกิดซ้ำจริง)
- [incident: TASK-0001 BUG-0001-B4-1] regex ที่ตัดข้อความไทย (เช่น JUDGEMENT_RE) ต้องมีตารางเทสต์สองฝั่ง: ต้องตัด (เช่น "ไม่ผ่านเกณฑ์ข้อนี้") และต้องไม่ตัด (เช่น "ความพึงพอใจ 4.51 คะแนน") เพราะประโยคไทยไม่มีตัวแบ่ง ตัด 1 ครั้งอาจหายทั้งย่อหน้า. ใช้ซ้ำแล้ว 1 ครั้ง (C4 รอบ 2 reviewer ยืนยันว่า C-1 test ทำตาม RULE นี้)
- [incident: TASK-0001 C-1 major, DOCX] export ที่สร้าง XML (DOCX/XLSX/SVG) ต้องตัด control char ที่ XML 1.0 ห้าม (`\u0000-\u0008`, `\u000B`, `\u000C`, `\u000E-\u001F`, U+FFFE/FFFF, surrogate เดี่ยว) ก่อนส่งเข้า library เพราะ `docx` escape แค่ `& < >`. ทดสอบด้วย `\u000b` แล้ว unzip `word/document.xml` ดู. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0001 C2-1 major] ถ้า orchestrator/review ระบุพฤติกรรมชัด (เช่น "ป้ายไม่เขียนลง narrative") ให้ทำตามนั้น; ถ้าเห็นว่าไม่ถูก ให้ BLOCKED แล้วถามก่อน ห้ามทำแบบอื่นแล้วเขียนเทสต์ล็อกพฤติกรรมนั้น. ใช้ซ้ำแล้ว 0 ครั้ง
- [incident: TASK-0001 C3-1 major] หลังแก้ regex ทุกครั้ง grep ไฟล์ยืนยันว่า `\` ยังอยู่ครบ (เครื่องมือเขียนไฟล์บางครั้งกิน `\`) และ probe ด้วย node ก่อนส่ง review เช่น `'students meet'.replace(/^\s+/,'')` ต้องยังขึ้นต้นด้วย "students". ใช้ซ้ำแล้ว 0 ครั้ง

## LESSONS
- [TASK-0001 review #2] store ที่ load ผ่าน readJSON (cache คืน reference ร่วม): validate id/input ทั้งหมดก่อนแก้ object ใดๆ แล้วค่อย save; appendAudit หลัง save สำเร็จเท่านั้น. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 review] กฎ "AI ห้ามให้คะแนน/เปลี่ยน state" บังคับด้วยโครงสร้าง import + provider interface ที่ไม่มีเมธอดให้คะแนน ดีกว่าเขียนแค่ใน prompt. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 B2] seed ที่เปลี่ยนสถานะเริ่มต้นของ entity กลางทำให้เทสต์เดิมพัง → แยก helper `freshDemo` (ว่าง) กับ `freshSeededDemo` ตั้งแต่แรก
- [TASK-0001 B2] กฎ segregation "ผู้เขียนล่าสุด" เก็บฟิลด์แยก (`lastAuthorId`) ไม่ใช้ `updatedBy` เพราะ transition ก็อัปเดต updatedBy
- [TASK-0001 B2 + review] ข้อมูลที่ต้องคงค่าหลัง lock: เก็บค่าตอน lock ไว้ใน snapshot แล้ว verify เทียบกับค่าที่เก็บ ไม่เทียบกับค่าปัจจุบัน; snapshot เลือกเฉพาะ field สาระ + stableStringify ให้ hash คงที่
- [TASK-0001 review R2] endpoint ที่ถือ secret/มีค่าใช้จ่าย: cap (global/นาที/รายวัน) ไม่ขึ้นกับ IP จาก client (ไม่เชื่อ x-forwarded-for เว้น TRUST_PROXY), นับหลัง input guard และก่อนยิง upstream, ตรวจ schema output ฝั่ง server ก่อนคืน
- [TASK-0001 review] ตารางการเปลี่ยนสถานะตารางเดียวใช้ทั้งบังคับใน lib และสร้างปุ่มใน UI
- [TASK-0001 review] AI accept ต้องเดินผ่าน store ปกติ (saveSection/linkEvidence) เพื่อได้สิทธิ์ + lock + citation check + audit โดยไม่มีทางลัดให้ AI
- [TASK-0001 C4 review] import ข้อมูลรายบุคคล (cohort): validate ทั้งชุดก่อน แถวผิดแถวเดียว = ไม่เขียนอะไรเลย, ทำ dryRun คืนผลสรุปก่อนเขียนจริง, ไม่เก็บไฟล์/แถวรายคนค้างไว้รอยืนยัน. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 C4 review] งานแปล/สร้างข้อความด้วย AI: post-check แบบ multiset เทียบรหัสและตัวเลขของต้นฉบับกับผลลัพธ์ (ขาด/เกิน = ธง) ดีกว่า check ทั่วไป. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 C4 review] preview ก่อน commit: ผูก actorId + TTL (30 นาที) + ใช้ได้ครั้งเดียว + จำกัดจำนวนรายการใน memory. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- facade จุดเดียว `@/lib/api` (lib/api/index.ts); ทุก write รับ `actor: AppUser` และ throw `AunqaError` (.code/.message/.detail)
- storage: localStorage key prefix `aunqa_` ผ่าน lib/api/storage-cache.ts (readJSON/writeJSON); no-op เมื่อไม่มี window
- workflow: `CYCLE_TRANSITIONS`/`SECTION_TRANSITIONS`; action: `ACTION_TRANSITIONS`
- PII heuristic: เลขบัตรแบบมีขีดติดธงเสมอ; 13 หลักติดกันต้องผ่าน checksum; ยังไม่มี NER ชื่อคน; ไฟล์ binary ยังไม่ extract text
- AI route `app/api/ai/route.ts`: ratelimit/guards ที่ `lib/api/ai/{ratelimit,guards}.ts`; key อ่านจาก env ฝั่ง server เท่านั้น
- `.doc` export เป็น HTML (ไม่ใช่ DOCX จริง); audit ไม่มี hash chain; RBAC ยังอยู่ฝั่ง browser (MVP) → ต้องย้ายไป server + RLS
- ค้างจาก Phase B: หลักฐานข้ามปี (copyFromCycleId) ยังไม่ออกแบบ; dean ส่งกลับได้แล้ว; R7 ทำงานจริงแล้ว (curriculum)
- export DOCX: `lib/api/export-docx.ts` (ไลบรารี `docx`) ใช้ `xmlSafe` ทุก run/title; narrative แบ่งบรรทัดด้วย `/\r\n|\r|\n/`
- `lib/api/export-bundle.internal.ts` = loadBundle ที่ใช้ร่วมกับ export; ไม่ export ออก facade
- AI translate (AI-4): เพดาน 8,000 ตัวอักษร**หลัง** redact, `MAX_TOKENS.translate` 8192; ธง `needsTranslationReview` (R11) ล้างได้ทาง `confirmTranslationReviewed` เท่านั้น; offline translate ไม่มีป้ายใน narrative
- ค้างจาก C4 รอบ 1 ที่ฝั่ง frontend (C-7, C-10) ไม่ใช่งาน backend
