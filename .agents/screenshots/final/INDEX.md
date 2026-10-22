# ชุด screenshot สุดท้าย (D0, TASK-0001)

- ถ่ายจาก production build ของ HEAD `512d184` (= `6d589de` U3 fix + D-sec fix แล้วตามด้วย chore commit), `next start -p 3951` (ปิดแล้ว), Playwright Chromium, ภาษาไทย, วันที่ 2026-10-22
- เดสก์ท็อป 1440×900 (`guide-*`; ภาพที่สูงกว่า 900 คือถ่ายเต็มหน้า) · มือถือ 390×844 (`mobile-*`, เฉพาะส่วนที่เห็นบนจอ)
- ข้อมูลเป็นเดโม่ล้วน (seed + การกดผ่าน UI จริงตามลำดับ) ภาพ `guide-staff-*` ขึ้นไปถ่ายหลังเดินรอบ: มอบหมาย → staff1 ส่งตรวจ → chair1 อนุมัติ → ส่ง QA → fqa1 อนุมัติ → dean1 อนุมัติสุดท้าย/ล็อก → fqa1 เริ่มประเมิน → assess1
- สคริปต์ที่ใช้ถ่ายซ้ำ: `.agents/playtest/u3/final.mjs` · ผลตรวจ regression ต่อภาพ: `.agents/playtest/u3/final-checks.json`
- ข้อควรรู้: ใน `guide-section-editor-*` แถบบันทึก/ส่งตรวจ (sticky) จะไปโผล่กลางภาพเต็มหน้า เป็นผลจากวิธีถ่าย ไม่ใช่ bug · `guide-dashboard-locked` มี toast "เปลี่ยนสถานะ…" มุมขวาล่าง

## เดสก์ท็อป 1440

| ไฟล์ | หน้า / role | สิ่งที่เห็น |
|---|---|---|
| guide-landing.png | `/` (ยังไม่ล็อกอิน) | หน้าแรก: hero + ring ตัวอย่าง 45/53, จุดเด่น 4 ข้อ, ขั้นตอนใช้งาน 5 ขั้น, ทำไมเชื่อถือได้, แถบเข้มชวนเข้าระบบ |
| guide-login.png | `/login` | แผงแบรนด์สีเข้มซ้าย (ตัวปรับขนาดตัวอักษร ก/ก+/ก++ และสลับภาษา) + ฟอร์มเข้าสู่ระบบขวา |
| guide-login-demo-accounts.png | `/login` | กางรายการบัญชีทดสอบ 11 บัญชี (รหัสผ่าน demo1234) |
| guide-login-error.png | `/login` | ใส่รหัสผ่านผิด → ข้อความ error พร้อมไอคอนใกล้ฟอร์ม |
| guide-loader-login.png | AppLoader ตอนเข้าระบบ | โลโก้ + วงแหวนหมุน + "ยินดีต้อนรับ <ชื่อ>" |
| guide-chair-home.png | `/app` · chair1 (ประธานหลักสูตร) | "สิ่งที่ต้องทำตอนนี้" (รวม 14 งาน): ตรวจ 5 ข้อ, มอบหมาย 7 ข้อ, จัดการ PII + งานอื่น, แจ้งเตือน, การ์ดรอบ 2569 |
| guide-chair-cycles.png | `/app/cycles` · chair1 | รายการรอบประเมินพร้อมสถานะและแถบความคืบหน้า |
| guide-chair-dashboard.png | dashboard รอบ 2569 · chair1 | stepper สถานะรอบ 6 ขั้น, "ขั้นตอนถัดไป" + คำเตือน, ring 45/53, KPI ช่องว่าง, heatmap 53 ข้อ, ช่องว่างจัดกลุ่มตามเกณฑ์, งานค้างรายคน |
| guide-dashboard-heatmap.png | dashboard (ครอบเฉพาะ heatmap) | heatmap 53 ข้อ: สี + ไอคอน + คำสถานะ + ไอคอนอนุมัติมุมขวาบน + legend |
| guide-chair-assign.png | `/app/cycles/…/assign` · chair1 | มอบหมายเจ้าของ/กำหนดส่งรายข้อ จัดกลุ่มตามเกณฑ์ |
| guide-section-editor-chair.png | section editor ข้อ 3.6 · chair1 | stepper 4 ขั้น (หลักฐาน/เขียน/PDCA+คะแนน/ส่งตรวจ), กล่องเขียน SAR ไทย/EN, ปุ่ม AI, PDCA, คะแนนตนเอง, แผงหลักฐานที่ผูก |
| guide-evidence-list.png | `/app/evidence` · chair1 | คลังหลักฐาน: ตัวกรองหลักสูตร/รอบ/ค้นหา + ตาราง รหัส E-x.x-nn ประเภท PDCA ข้อที่ผูก สถานะ (มี pill PII) |
| guide-evidence-form.png | `/app/evidence` เปิดฟอร์ม · chair1 | ฟอร์มเพิ่มหลักฐาน 3 ขั้น + RequirementPicker (ค้นหาเลขข้อ/chip) + ปลายทางหลักสูตร |
| guide-evidence-detail.png | `/app/evidence/{id}` · chair1 | รายละเอียดหลักฐาน: ข้อมูลไฟล์, hash, ข้อที่ผูก, ปุ่มแก้ไข |
| guide-curriculum-plo.png | `/app/curriculum` แท็บ PLO | รายการ PLO ของหลักสูตร + แท็บย่อยของหน้าหลักสูตร |
| guide-curriculum-matrix.png | หลักสูตร แท็บ Matrix CLO→PLO | ตาราง CLO × PLO ระดับ I/R/M |
| guide-curriculum-heat.png | หลักสูตร แท็บ Heatmap วิชา×PLO | heatmap วิชา × PLO ตัวอักษร I/R/M + จำนวนวิชาต่อ PLO |
| guide-curriculum-gaps.png | หลักสูตร แท็บช่องว่างหลักสูตร | ช่องว่างระดับหลักสูตร (เช่น PLO ไม่มีวิชาระดับ M) |
| guide-curriculum-prereq.png | หลักสูตร แท็บผัง prerequisite | ผังวิชาบังคับก่อน (SVG) |
| guide-metrics.png | `/app/metrics` · chair1 | ตัวชี้วัด: กล่องนำเข้า Excel + กราฟแนวโน้ม 3–5 ปี |
| guide-metrics-import.png | `/app/metrics` (ครอบเฉพาะกล่อง import) | กล่องนำเข้าจาก Excel ที่กางแล้ว: คำเตือนความเป็นส่วนตัว + แม่แบบ 2 ชนิด |
| guide-actions.png | `/app/actions` · chair1 | แผนปรับปรุง (PDCA) พร้อมสถานะ |
| guide-chair-review.png | `/app/review` · chair1 | คิวรอตรวจ 5 ข้อ พร้อมสรุป (หลักฐาน/คำ/คะแนนตนเอง/ช่องว่าง) + ปุ่ม เปิดอ่าน/อนุมัติ/ส่งกลับ |
| guide-export.png | `/app/export` · chair1 (รอบกำลังดำเนินการ) | ส่งออก SAR .docx, ดัชนีหลักฐาน .xlsx, Appendix A |
| guide-requirements.png | `/app/requirements` | คลังเกณฑ์ AUN-QA 8 เกณฑ์ 53 ข้อ (ไทย + ชื่ออังกฤษ) |
| guide-lect-home.png | `/app` · lect1 (อาจารย์) | หน้าหลักอาจารย์: งาน "จัดการข้อมูลส่วนบุคคลในหลักฐาน 1 ชิ้น" + ปุ่มเพิ่มหลักฐาน |
| guide-data-home.png | `/app` · data1 (เจ้าหน้าที่ข้อมูล) | หน้าหลักเจ้าหน้าที่ข้อมูล: งาน PII 1 ชิ้น + ปุ่มเพิ่มหลักฐาน |
| guide-uadmin-home.png | `/app` · uadmin (ผู้ดูแลมหาวิทยาลัย) | "ตอนนี้ไม่มีงานรอท่าน" + ปุ่มจัดการผู้ใช้ (empty state) |
| guide-admin.png | `/app/admin` · uadmin | แท็บผู้ใช้และบทบาท/Audit log/ข้อมูลเดโม่: ตารางผู้ใช้ + chip บทบาทพร้อมขอบเขต + เพิ่ม/ลบบทบาท |
| guide-staff-home.png | `/app` · staff1 (ผู้เขียน) | งานเขียน 3 ข้อที่ได้รับมอบหมาย (3.6, 5.1, 7.9) |
| guide-section-editor-staff.png | section editor ข้อ 3.6 · staff1 | มุมมองผู้เขียน (เจ้าของ อ.วิภา) ก่อนส่งตรวจ |
| guide-section-presubmit-checklist.png | dialog ส่งตรวจ · staff1 | checklist ก่อนส่ง: มีเนื้อหา 108 คำ / ผูกหลักฐาน 2 ชิ้น / ประโยคไม่อ้างอิง / คะแนนตนเอง / ขาด Check-Act + "กลับไปเติมก่อน" |
| guide-chair-dashboard-ready.png | dashboard · chair1 (อนุมัติครบ 53/53) | ring 53/53 + ปุ่ม "ส่งให้ QA คณะตรวจ" ใช้ได้ แต่ยังมีคำเตือนช่องว่างวิกฤต |
| guide-dialog-chair-send-qa.png | dialog ส่ง QA คณะ · chair1 | dialog "ส่งให้ QA คณะตรวจ": คำเตือนวิกฤต 36/สูง 71/PII 1 + "กลับไปตรวจก่อน" |
| guide-fqa-home.png | `/app` · fqa1 (QA คณะ) | todo "ตรวจรอบ 2569 ระดับคณะ" + แจ้งเตือน "ส่งมาให้ QA คณะตรวจแล้ว" |
| guide-fqa-dashboard.png | dashboard · fqa1 | สถานะ "รอ QA คณะตรวจ", ขั้นตอนถัดไปพร้อมคำเตือน + ปุ่ม อนุมัติ (QA คณะ) / อ่าน SAR ทั้งรอบ (.docx) / ส่งกลับแก้ไข |
| guide-dean-home.png | `/app` · dean1 (คณบดี) | todo "พิจารณาอนุมัติสุดท้ายรอบ 2569" + แจ้งเตือน "QA คณะอนุมัติแล้ว — รอคณบดี" |
| guide-dean-dashboard.png | dashboard · dean1 | ขั้นตอนถัดไปของคณบดี พร้อมคำเตือนก่อนอนุมัติ |
| guide-dialog-dean-lock-warning.png | dialog อนุมัติสุดท้ายและล็อก · dean1 | คำเตือนก่อนล็อก: ช่องว่างวิกฤต 36, สูง 71, PII ค้าง 1 + "กลับไปตรวจก่อน" / "ยืนยัน…(มีข้อควรระวัง 3 เรื่อง)" |
| guide-dashboard-locked.png | dashboard · dean1 หลังล็อก | stepper ถึงขั้น 5, แถบ "รอบนี้ถูกล็อกเมื่อ… hash …ตรวจแล้ว ตรงกับที่ล็อก", toast สำเร็จ |
| guide-dashboard-under-assessment.png | dashboard · fqa1 หลังเริ่มประเมิน | สถานะรอบ "อยู่ระหว่างประเมิน" |
| guide-assess-home.png | `/app` · assess1 (กรรมการประเมิน) | แถบ "เข้าในฐานะกรรมการ (อ่านอย่างเดียว)" + todo "ประเมินรอบ 2569 (ให้คะแนนแล้ว 0/8)" |
| guide-assess-top.png | `/app/cycles/…/assess` · assess1 (ส่วนบน) | พื้นที่ทำงานกรรมการ: ความคืบหน้า 0/8, verdict, Appendix B/D, แท็บเกณฑ์ 1–8 |
| guide-assess.png | `/app/cycles/…/assess` · assess1 (เต็มหน้า) | ทั้งหน้า: SAR อ่านอย่างเดียวรายข้อ + ช่องข้อค้นพบ Appendix B (จุดแข็ง/ควรปรับปรุง/คำถาม/แหล่งหลักฐาน) |
| guide-export-locked.png | `/app/export` · chair1 (อยู่ระหว่างประเมิน) | ส่งออกหลังล็อก + การ์ด "ผลการประเมินโดยกรรมการ" (Appendix B/D ใช้ได้เมื่อประเมินเสร็จ) |
| guide-loader-logout.png | AppLoader ตอนออก | "กำลังออกจากระบบ… / บันทึกงานที่ค้างแล้ว" |

## มือถือ 390

| ไฟล์ | หน้า / role | สิ่งที่เห็น |
|---|---|---|
| mobile-login.png | `/login` | โลโก้ + ตัวปรับขนาดตัวอักษร/ภาษา + ฟอร์มเข้าสู่ระบบ |
| mobile-chair-home.png | `/app` · chair1 | แถบบนมีปุ่มเมนู (drawer) + "สิ่งที่ต้องทำตอนนี้" การ์ดซ้อนแนวตั้ง |
| mobile-section-editor.png | section editor 3.6 · chair1 | stepper แบบย่อ "ขั้น 4 จาก 4" + กล่องเขียน + แถบบันทึก/ส่งตรวจติดขอบล่าง |
| mobile-dashboard.png | dashboard 2569 · chair1 | หัวรอบ + stepper สถานะ + ขั้นตอนถัดไป (ส่วนบนของหน้า) |

## ตรวจ regression (สุ่มจาก 45 ภาพที่ตรวจ)
- ไม่มีหน้าที่เลื่อนแนวนอน · ไม่มี emoji · ไม่มีข้อความ <13px ที่มองเห็นได้
- `guide-metrics` ถูกนับ 16 ตัวเป็นผลบวกลวง: เป็นชื่อแกน Y ของกราฟที่หมุน −90° (`getScreenCTM().a = 0`) ป้ายกราฟอื่นแสดงที่ 13px ทั้งที่ 1440 และ 390 → BUG-0001-U2Q-1 แก้แล้ว
- U3-1 แก้แล้ว: section editor แสดงกล่องเขียนแค่กล่องเดียว (ภาพเต็มหน้าเตี้ยลงจาก 2,442 เหลือ 1,861px)
