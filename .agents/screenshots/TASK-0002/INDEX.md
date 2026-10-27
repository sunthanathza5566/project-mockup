# TASK-0002 — ภาพชุดสุดท้าย (เฟส 7 UI, 2026-10-27)

ถ่ายจาก production build ของ HEAD `1ca6903` (`http://localhost:3950`) ด้วย Playwright chromium, locale th-TH
ชื่อไฟล์: `final-<หน้า>-<light|dark>-<1440|768|390>.png` (1440×900, 768×1024, 390×844 · ส่วนใหญ่เป็นภาพเต็มหน้า)
สคริปต์: `.agents/playtest/final-ui/shoot.mjs` (ภาพหลัก) · `checks.mjs` (125%, text-spacing, 360px, axe, focus) · `crop.mjs`
ข้อมูลที่ใช้: บัญชีเดโม่ (รหัส demo1234) · แจ้งเตือนของ staff1 = ของจริง (chair1 มอบข้อ 3.6) + แถวตัวอย่าง 4 แถว ฉีดลง localStorage เพื่อให้เห็นครบ 3 กลุ่มวัน · คำขอเข้าใช้งาน/คำเชิญสร้างผ่านหน้าจอจริง · หน้า assess ตั้งรอบเป็น under_assessment ใน localStorage ของ browser ที่ถ่ายเท่านั้น

หมายเหตุ: ภาพเต็มหน้าของ `/app/*` แถบเมนูซ้ายสิ้นสุดที่ 900px เพราะเมนูเป็น sticky สูงเท่าจอ (เกิดตอนจับภาพ ไม่ใช่บั๊ก) · แถบ "บันทึก/ส่งตรวจ" ในภาพเต็มหน้าของ section ลอยกลางภาพด้วยเหตุผลเดียวกัน

## หน้าสาธารณะ
| ไฟล์ (prefix) | เนื้อหา | ผู้ใช้ |
|---|---|---|
| `final-landing-*` / `final-landing-fold-*` | หน้าแรก (เต็มหน้า / เฉพาะจอแรก) | — |
| `final-landing-menu-*-390` | แผงเมนูบนมือถือ (มี "การแสดงผล" + ปุ่มเข้าสู่ระบบ) | — |
| `final-login-*` / `final-login-display-*` / `final-login-error-*` | เข้าสู่ระบบ / เมนูการแสดงผล / รหัสผิด | — |
| `final-request-*` / `final-request-error-*` / `final-request-success-*` | ขอเข้าใช้งาน / ส่งแบบผิด (กล่องสรุป error) / ส่งสำเร็จ | — |
| `final-invite-*` / `final-invite-invalid-*` | รับคำเชิญ ตั้งรหัสผ่าน (ลิงก์จริงจากหน้า admin) / ลิงก์เสีย | ผู้ได้รับเชิญ |
| `final-404-*` | ไม่พบหน้า | — |

## โครงแอป + แจ้งเตือน
| ไฟล์ | เนื้อหา | ผู้ใช้ |
|---|---|---|
| `final-shell-*` | จอแรกของแอป (แถบบน + เมนูซ้าย) | chair1 |
| `final-usermenu-*` | เมนูผู้ใช้ (ขนาดตัวอักษร / ธีม / ออกจากระบบ) | chair1 |
| `final-drawer-*-390` | เมนูซ้ายบนมือถือ | chair1 |
| `final-noti-*` | panel แจ้งเตือนมีรายการ (desktop = popover, มือถือ = sheet เต็มจอ) | staff1 |
| `final-noti-empty-*` | panel แจ้งเตือนว่าง | sadmin |
| `final-home-chair1-*` / `final-home-chair1-en-*` | หน้าหลักประธานหลักสูตร (ไทย / English) | chair1 |
| `final-home-staff1-*` | หน้าหลักอาจารย์ผู้เขียน | staff1 |
| `final-home-uadmin-*` | หน้าหลักผู้ดูแล (มีงาน "อนุมัติคำขอเข้าใช้งาน") | uadmin |

## หน้าทำงาน
| ไฟล์ | เนื้อหา | ผู้ใช้ |
|---|---|---|
| `final-review-*` | รอตรวจ | chair1 |
| `final-cycles-*` / `final-cycles-form-*` | รายการรอบ / ฟอร์มสร้างรอบ | chair1 |
| `final-dashboard-*` | แดชบอร์ดรอบ 2569 (KPI, heatmap, ช่องว่าง) | chair1 |
| `final-assign-*` | มอบหมายงาน | chair1 |
| `final-section-*` | เขียน SAR ข้อ 3.6 | chair1 |
| `final-evidence-*` / `final-evidence-form-*` / `final-evidence-detail-*` | คลังหลักฐาน / ฟอร์มเพิ่ม / รายละเอียด | chair1 |
| `final-requirements-*` | คลังเกณฑ์ AUN-QA | chair1 |
| `final-curriculum-*` | หลักสูตร (PLO/รายวิชา) | chair1 |
| `final-metrics-*` | ตัวชี้วัด + กราฟแนวโน้ม | chair1 |
| `final-actions-*` | แผนปรับปรุง | chair1 |
| `final-export-*` | ส่งออกเอกสาร | chair1 |
| `final-assess-*` | พื้นที่ทำงานกรรมการประเมิน | assess1 |
| `final-admin-users-*` | ผู้ดูแลระบบ: แท็บผู้ใช้และบทบาท | uadmin |
| `final-admin-newuser-*` / `final-admin-invite-result-*` | ฟอร์มเพิ่มผู้ใช้ (โหมดเชิญ) / ผลเชิญ + ลิงก์คัดลอก | uadmin |
| `final-admin-requests-*` | แท็บคำขอเข้าใช้งาน (ป้ายเตือนอีเมลยังไม่ยืนยัน) | uadmin |
| `final-admin-audit-*` | แท็บ Audit log | uadmin |
| `final-admin-demo-*` | แท็บข้อมูลเดโม่ (เฉพาะ super admin) | sadmin |

## ภาพตรวจการเข้าถึง
| ไฟล์ | เนื้อหา |
|---|---|
| `final-gray-{dashboard,review,evidence,noti}-*` | ภาพขาวดำ (AC-07 — สถานะแยกได้ด้วยไอคอน+คำ) |
| `final-scale125-{login,app,dashboard,section,evidence-form,admin,topbar,usermenu}-*` | ขนาดตัวอักษร "ใหญ่มาก" 125% (AC-04 ก / AC-17) — ภาพ 390 เป็นจอแรก ความละเอียด 2x |
| `final-spacing-{app,dashboard}-light-*` | ฉีด text-spacing WCAG 1.4.12 (AC-04 ข) |
| `final-zoom200-{app,dashboard}-light-360` | จอ 360×800 เทียบ zoom 200% (AC-04 ค) |

## ภาพแนะนำสำหรับเล่ม (บทผลการออกแบบ)
`final-home-chair1-light-1440`, `final-home-chair1-dark-1440`, `final-noti-light-1440`, `final-noti-light-390`, `final-dashboard-light-1440`, `final-section-light-1440`, `final-admin-invite-result-light-1440`, `final-admin-requests-light-1440`, `final-request-error-light-1440`, `final-invite-light-390`, `final-landing-fold-light-390`, `final-scale125-dashboard-light-390`, `final-gray-dashboard-light-1440`


## Re-check หลังรอบแก้ (2026-10-27, HEAD `58238e4`, server `:3960`)
ภาพ light/dark × 1440/390 ทุกหน้าในตารางข้างบน + `final-scale125-*`, `final-spacing-*`, `final-zoom200-*` **ถ่ายใหม่ทับชื่อเดิม** จาก build ของรอบแก้ · **ภาพ `*-768` ยังเป็นของ build รอบแรก (`1ca6903`) ไม่ได้ถ่ายใหม่** — ไม่สะท้อน M1/m1–m9 ที่แก้แล้ว อย่าใช้ในเล่ม
สคริปต์เพิ่ม: `recheck-misc.mjs`, `recheck-review.mjs`

| ไฟล์ (ใหม่) | เนื้อหา | ผู้ใช้ |
|---|---|---|
| `final-admin-search-*` | ช่องค้นหาผู้ใช้ (พิมพ์ "วิภา") | uadmin |
| `final-admin-panel-*` | แผง "จัดการ" ใต้แถว (บทบาทปัจจุบัน / เพิ่มบทบาท / สถานะบัญชี) | uadmin |
| `final-admin-panel-assessor-*` | เลือกบทบาทกรรมการ → ขอบเขตเหลือเฉพาะรอบ + คำอธิบาย | uadmin |
| `final-dashboard-fqa-*` / `final-assign-fqa-*` | QA คณะ: ปุ่ม "มอบหมายกรรมการ" / หน้ามอบหมายกรรมการพร้อมคำอธิบาย | fqa1 |
| `final-dashboard-return-*` | รอบถูกส่งกลับ: กล่องใคร/เมื่อไร/เหตุผล + ขั้นตอน 1-2-3 (ข้อมูลเหตุผลฉีดลง localStorage) | chair1 |
| `final-section-locked-*` | ข้อ 1.1 ที่อนุมัติแล้ว: หลักฐานล็อก + กล่องเหตุผล | staff1 |
| `final-evidence-form-locked-*` | ฟอร์มเพิ่มหลักฐาน: รายการข้อมีป้าย "ล็อกแล้ว" | staff1 |
| `final-evidence-detail-locked-*` | รายละเอียดหลักฐาน: "ข้อ 1.1 อนุมัติแล้ว — เลิกผูกไม่ได้" | staff1 |
| `final-lang-global-*` | เลือก English ที่หน้าหลักแล้วไปหน้าหลักฐาน ยังเป็น English | chair1 |
| `final-review-light-1280` | ตารางรอตรวจที่ 1280 (หลักฐาน N1 — ปุ่มถูกซ่อน) | chair1 |

## Re-check 2 หลัง R2-F13 (2026-10-27, HEAD `8242151`, server `:3970`) — ชุดภาพ final-* ทั้งหมดเป็นของ build นี้
**ถ่ายใหม่ทับทุกไฟล์ `final-*` (383 ภาพ) รวม `*-768` ทั้ง light/dark** — ตรวจด้วย mtime: ไม่มีไฟล์ `final-*` ที่เก่ากว่า commit `8242151` เหลืออยู่ · ใช้ชุดนี้ในเล่มได้ทั้งหมด (หมายเหตุ "768 ของ build รอบแรก" ข้างบนยกเลิก)
สคริปต์: `shoot.mjs` (6 ชุด light/dark × 1440/768/390) · `checks.mjs` · `recheck2.mjs` (N1–N6, P11–P13, U11 + dialog) · `recheck2-125.mjs` · `recheck2-wrap.mjs` / `recheck2-hidden.mjs` (ตารางที่ซ่อนปุ่ม) · `recheck2-actions1024.mjs` · `recheck2-axe.mjs`

| ไฟล์ (ใหม่/เปลี่ยนความหมาย) | เนื้อหา | ผู้ใช้ |
|---|---|---|
| `final-review-{light,dark}-1280` | ตารางรอตรวจที่ 1280: ปุ่ม 3 ปุ่มเรียงแนวตั้งในกรอบ (N1 ปิด) | chair1 |
| `final-review-{light,dark}-1024` | <1280 แต่ละแถวเป็นการ์ด (รอบ / ส่งโดย 2 คอลัมน์) | chair1 |
| `final-scale125-review-light-1280` | ตัวอักษร 125% ที่ 1280: ปุ่มท้ายแถวยังถูกซ่อน (หลักฐาน N7) | chair1 |
| `final-review-en-light-1440` / `final-actions-en-light-1440` | โหมด English (`<html lang="en">`) | chair1 |
| `final-actions-accept-*` | dialog "ตรวจรับแผนปรับปรุง" (P11) | chair1 |
| `final-actions-{light,dark}-1024` | ตารางแผนปรับปรุงที่ 1024: ปุ่มท้ายแถว/คอลัมน์สถานะถูกซ่อน (หลักฐาน N8) | chair1 |
| `final-admin-reactivate-lect1-*` / `final-admin-reactivate-uadmin-*` | dialog เปิดใช้บัญชี: บัญชีทั่วไปไม่พูดถึงคำเชิญ / ผู้ดูแลพูดถึงคำเชิญ (U11) | sadmin |
| `final-assess-submit-*` | dialog "ส่งผลการประเมินของคุณ" เมื่อรอบมีกรรมการ 2 คน (P12) | assess1 |
| `final-assess-waiting-*` | หลังส่ง: กล่อง "ยังรอ อ.วิภา…" แทน error (บทบาทกรรมการคนที่ 2 ฉีดลง localStorage) | assess1 |
| `final-evidence-detail-picker-*` | picker "ผูกเพิ่ม" ในหน้ารายละเอียด: ข้อที่ล็อกมีป้าย (P13) | staff1 |
