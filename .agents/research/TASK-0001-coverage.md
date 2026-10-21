# Coverage assessment: TASK-0001 (AUN-QA Copilot) — 2026-10-21

> ผู้จัดทำ: researcher · อิงโค้ด `eduflow-next/lib/api/**`, routes `app/app/**` (15 หน้า), Log ใน `.agents/board/TASK-0001.md`, review รอบ 2 = APPROVE (285 tests ตาม checklist B5), spec `.agents/spec/AUN-QA_Copilot_Spec.md`
> **ข้อจำกัดพื้นฐาน**: ความต้องการที่ยืนยันกับผู้ใช้จริง = **0 ราย** · "ทำแล้ว" = มีฟีเจอร์ในเดโม่ด้วยข้อมูลสมมติและผ่านเทสต์ ไม่ได้แปลว่าแก้ปัญหาผู้ใช้ได้จริงหรือพร้อมใช้งานจริง

## 1. Requirement ใน spec × สถานะ
สูตร: ทำแล้ว = 1, บางส่วน = 0.5, ยังไม่ทำ = 0; % = ผลรวม / จำนวนรายการ (รายการละน้ำหนักเท่ากันในชั้นเดียวกัน; รายการตามบรรทัดใน spec หัวข้อ 14, แยก AI ที่ spec ระบุคู่กับโมดูล). ตัวเลขนี้นับ "ฟีเจอร์ตาม spec" ไม่นับความพร้อมใช้จริง (ดูหัวข้อ 1.4)

### 1.1 Must (16 รายการ)
| รายการ | สถานะ | หลักฐาน / ส่วนที่ขาด |
|---|---|---|
| M1 Auth & org (6 role) | ทำแล้ว | `lib/api/auth.api.ts`, `rbac.ts`, `org.store.ts`; (RBAC อยู่ browser — ดู 1.4) |
| M2 Framework 53 ข้อ | ทำแล้ว | `framework.ts`, หน้า `requirements` |
| M3 Cycle & assignment | ทำแล้ว | `cycle.store.ts`, `cycles/[id]/assign` |
| M4 Curriculum mapping + gap | ทำแล้ว (ไม่มี import Excel) | `curriculum.store.ts`, `curriculum-gap.ts`, หน้า `curriculum`; log B2 "ไม่มี import Excel ของ M4" |
| M5 Evidence repo + AI-1 + PII flag | ทำแล้ว | `evidence.store.ts`, `ai.service.ts:113` |
| M6 Metrics + กราฟ | ทำแล้ว (กรอกมือ ไม่มี import) | `metrics.store.ts` (มีแต่ upsert/delete), `TrendChart.tsx` |
| M8 SAR editor | ทำแล้ว | `sar.store.ts`, `sections/[id]` |
| AI-2 SAR drafter | ทำแล้ว | `ai.service.ts:139` |
| AI-3 SAR reviewer | ทำแล้ว | `ai.service.ts:163` |
| AI-4 Translator TH↔EN | **ยังไม่ทำ** | ไม่มี `runTranslator` ใน `ai.service.ts` (มีแค่พารามิเตอร์ `language` ของ drafter/reviewer) |
| M9 Gap R1–R10 + dashboard | ทำแล้ว | `gap.ts` (R7 เชื่อม M4 แล้ว), `dashboard.ts` |
| M10 Workflow + lock | ทำแล้ว | `workflow.ts` (+ คณบดีส่งกลับ), snapshot sha256 |
| M11 Export | **บางส่วน** | SAR เป็น `.doc` จาก HTML ไม่ใช่ DOCX/PDF จริง (log: "ยังไม่ทำ .doc เป็น HTML"); evidence index/Appendix A เป็น `.xlsx` จริง (`export.ts:195-212`) |
| M16 Notification | ทำแล้ว (in-app เท่านั้น) | `notification.store.ts`; ไม่มีอีเมล |
| M17 Audit log | ทำแล้ว (ไม่มี hash chain) | `audit.store.ts` |
| PII redaction + AI post-check | **บางส่วน** | `ai/redact.ts`, `postcheck.ts`; redaction เป็น regex ไม่มี NER ชื่อคน (log) |
**Must = 14.0 / 16 = 87.5%**

### 1.2 Should (8 รายการ)
| รายการ | สถานะ | หลักฐาน / ส่วนที่ขาด |
|---|---|---|
| M7 Surveys | ยังไม่ทำ | ไม่มีหน้า/ store/ API survey |
| AI-6 Survey summarizer | ยังไม่ทำ | ไม่มีฟังก์ชัน |
| M12 Assessor workspace + Appendix B/D | ทำแล้ว | `assessor.store.ts`, `export-assessment.ts`, `assess/page.tsx` |
| AI-9 Assessor summary | ทำแล้ว | `ai.service.ts:247` |
| M14 Action plan | ทำแล้ว | `action.store.ts`, หน้า `actions` |
| M15 Analytics (AI-7 เต็ม, AI-8) | บางส่วน | AI-7 มี (`runVerbChecker`, Bloom แบบ dictionary); AI-8 Exam–CLO ไม่มี |
| AI-5 Rating suggester | ยังไม่ทำ | ไม่มีฟังก์ชัน |
| มุมมองระดับคณะ | ยังไม่ทำ (ไม่พบหลักฐาน) | `dashboard.ts` ไม่มีการรวมระดับคณะ |
**Should = 3.5 / 8 = 43.8%**

### 1.3 Could (7 รายการ) — M13, AI-10, AI-11, OCR, export CHE QA Online, framework อื่น, เชื่อม Google Drive
ไม่พบหลักฐานในโค้ด/Log ทั้ง 7 รายการ → **Could = 0 / 7 = 0%** (ไม่ได้ตรวจเจาะว่า framework เป็น config ได้ไหม; ถ้าได้อาจ +1)

**รวมถ่วงน้ำหนัก** (Must 3 : Should 2 : Could 1 — น้ำหนักที่ผู้จัดทำเลือกเอง ไม่มีแหล่งอ้างอิง) = (3×87.5 + 2×43.8 + 1×0)/6 = **58.3%** · ถ้าไม่นับ Could = 70.1% (Must 3 : Should 2)

### 1.4 PDPA / NFR หลัก (ตรวจจาก log ไม่ได้อ่านสเปกหัวข้อ 11–12 ครบ)
| ประเด็น | สถานะ |
|---|---|
| ข้อมูลทดสอบเป็นข้อมูลสมมติ | ทำแล้ว |
| PII redaction ก่อนส่ง AI | บางส่วน (regex ไม่มีชื่อคน) |
| RBAC/สิทธิ์ | **ฝั่ง browser/localStorage เท่านั้น** ไม่มี server auth/RLS → หลายคนใช้จริงข้ามเครื่องไม่ได้ (log A: "ต้องย้ายไป server + RLS") |
| `/api/ai` | ตรวจตัวตนผู้ใช้ไม่ได้ กันด้วย same-origin + rate limit + งบรายวัน (review R2 ปิด B1 แล้ว) |
| Claude provider | **ยังไม่เคยเรียก Anthropic จริง** (ไม่มี key) ทดสอบเฉพาะ 503/fallback/mock |
| Audit append-only | ใช่ แต่ไม่มี hash chain; `resetDemo` ล้าง audit (เดโม่) |
| Deploy/ฐานข้อมูลจริง | ไม่มี (ยังไม่ขึ้น server) |
| Playwright E2E | ไม่พบชุด E2E ใน `tests/` (มีแต่ Vitest 17 ไฟล์ + การเปิดหน้าด้วย Playwright ด้วยมือตาม log B3) |
→ ถ้านับ NFR/PDPA เป็น 6 ข้อ (สมมติ, redaction, RBAC จริง, AI route, audit, deploy) ได้ ≈ 2.5/6 ≈ 42% แต่ **ไม่รวมในตัวเลขข้างต้น**

## 2. มุมผู้ใช้จริง — ปัญหา × ระบบแก้ได้แค่ไหน
แหล่งปัญหา: spec หัวข้อ 1.2; งานวิจัยที่เปิดอ่านจริงใน `standards/thesis-th.md` หัวข้อ 6 — พิสิฐ เมธาภัทร (2549) และ อนุพล สิงขรเขตต์ และคณะ (2562) [ระบบ QA ไทย ลดภาระ/ซ้ำซ้อนของข้อมูล]; บรรณกร แซ่ลิ่ม (2567) [9 หลักสูตร คะแนน AUN-QA 3.71–3.88 ไม่ถึง 4.00, AUN 8 ต้องพัฒนาสูงสุด]; Sulton et al. (2026) [ประเมินด้วยมือ 3–5 วัน/หลักสูตร]; ASEAN University Network (2020) [PDCA/สเกล 1–7]. URL อยู่ในไฟล์นั้น
| # | ปัญหา | ระบบทำอะไร | ขาด | ระดับครอบคลุม (เชิงฟีเจอร์) |
|---|---|---|---|---|
| 1 | ภาระเขียน SAR/เก็บข้อมูล | AI-2 ร่างจากหลักฐาน, gap, progress | ไม่เคยวัดเวลาที่ลดจริง; Claude ไม่เคยรันจริง | 70% |
| 2 | หลักฐานกระจาย/copy ซ้ำ | อัปโหลด, รหัส E-x.x-nn, ผูกหลายข้อ, dedupe sha256, PII flag | ไม่เชื่อม Drive, ไม่มี OCR, ไม่ import ของเก่าเป็นชุด | 80% |
| 3 | เขียนหลายคน/รวมเล่ม/ไม่รู้ข้อไหนเสร็จ | assign, workflow, dashboard 53 ช่อง, segregation, lock | export ไม่ใช่ DOCX/PDF จริง ไม่ตรงแม่แบบมหาวิทยาลัย | 65% |
| 4 | PDCA ไม่ครบ/คะแนนไม่ถึง 4 | R2 + AI-3 + action plan + trend chart + curriculum gap | ไม่มี AI-5, ไม่มี benchmark/แนวทางขึ้นระดับ | 75% |
| 5 | ต้องแปลเป็นอังกฤษ | ช่อง narrative TH/EN, drafter/reviewer รับ `language` | ไม่มี AI-4; i18n UI EN ยังไม่ขยาย | 20% |
| 6 | กรรมการ/assessor | workspace, Appendix B/D, AI-9, ซ่อนผลจนกว่า assessed | ยังไม่ทดสอบกับกรรมการจริง; ไม่มี M13 | 80% |
| 7 | ตัวชี้วัด C8/ข้อมูลจากทะเบียน | กรอกมือ + กราฟ | ไม่มี import Excel/CSV | 40% |
| 8 | ใช้ร่วมกันจริงอย่างปลอดภัย | RBAC logic + audit + tests | ไม่มี backend/DB/auth จริง | 15% |
**เฉลี่ยเท่ากัน = 445/8 ≈ 56%** · ช่วงที่สมเหตุสมผล ~45–60% (ขึ้นกับน้ำหนักข้อ 8 และ 5)
**ระดับความมั่นใจ: ต่ำ** — (ก) ปัญหาเก็บจากเอกสาร/งานวิจัย ไม่ใช่สัมภาษณ์ (ข) % ตัดสินโดยผู้จัดทำจากการมีฟีเจอร์ ไม่ใช่ผลการใช้ (ค) ไม่มีผล SUS/เวลา/ความถูกต้อง AI ที่วัดจริง

## 3. ช่องว่างสำคัญที่สุด 5 ข้อ (เรียงตามผลต่อผู้ใช้/การสอบจบ)
1. **ไม่มีผลวัดจริงสำหรับบท 4** — เวลาที่ลด, SUS, ความถูกต้อง AI (eval set), คะแนนผู้เชี่ยวชาญ = 0 ชุด; Claude ไม่เคยเรียกจริง (ห้ามรายงานความแม่นยำ Claude) → กระทบการสอบมากสุด
2. **ไม่มี backend/DB/auth จริง** — RBAC และข้อมูลอยู่ใน localStorage ใช้งานหลายคนไม่ได้ ตอบข้อ 8 ไม่ได้ (เล่มต้องเขียนเป็นขอบเขต/งานอนาคตให้ตรง)
3. **Export ไม่ใช่ DOCX/PDF จริงและไม่ตรงแม่แบบ SAR มหาวิทยาลัย** — ปลายทางของงานอาจารย์ (spec M11 Must)
4. **ไม่มี AI-4 แปลอังกฤษ + EN UI** — เป็นปัญหา 1 ใน 6 ข้อใน spec 1.2 แต่ไม่ได้ทำ
5. **ข้อมูลตัวชี้วัดต้องกรอกมือ (ไม่มี import) + ไม่มี M7 survey/AI-6 + มุมมองระดับคณะ** — กระทบข้อ 7 และเกณฑ์ที่ต้องใช้ผลสำรวจ

### ที่ "ยังไม่รู้" เพราะไม่เคยคุยผู้ใช้จริง (ยืนยันกับผู้ใช้จริง = 0 ราย)
- กลุ่มเป้าหมายจริงคือมหาวิทยาลัย (AUN-QA) หรือครูโรงเรียน (spec ตั้งเป็น ASSUMPTION)
- แต่ละข้อใช้หลักฐานขั้นต่ำอะไร, ใครกรอก→ตรวจ→อนุมัติ กี่รอบ, ใช้แม่แบบ SAR แบบใด
- งานส่วนไหนเสียเวลาที่สุดจริง (ลำดับความสำคัญของ 8 ปัญหาด้านบนเป็นการเดา)
- นโยบายส่งข้อมูลไป AI ภายนอก/เก็บนอกประเทศ; ต้องเข้า CHE QA Online หรือไม่
- ผู้ใช้ไว้ใจ AI ร่าง SAR ระดับไหน และยอมรับการอ้าง [E-…] ไหม
→ แนะนำ: ถามผู้ใช้จริง 3–5 คน (อาจารย์ประจำหลักสูตร/QA คณะ) ด้วยชุดคำถามสั้น spec หัวข้อ 19 ก่อนสรุปในเล่มว่า "ตอบความต้องการผู้ใช้"
