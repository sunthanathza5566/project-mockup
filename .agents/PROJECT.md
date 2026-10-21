# PROJECT CONTEXT
<!-- ADAPT: กรอกจากการสำรวจโปรเจกต์ 2026-10-21 -->

## ภาพรวม
- ชื่อโปรเจกต์: EduFlow — ระบบอำนวยความสะดวกโรงเรียน (ใช้เป็นโปรเจกต์วิจัย/เล่มวิจัย)
- เป้าหมาย/ผู้ใช้หลัก: โรงเรียน — 5 บทบาท: `web_admin`, `school_admin`, `teacher`, `student`, `parent`
  (ตารางสอน, บันทึกคะแนน/เกรด/ปพ.1–9, เช็คชื่อ QR, การบ้าน, สื่อการสอน, กระเป๋าเงิน/ร้านค้า, จองหนังสือ/e-book, สอนพิเศษ, ข่าว/แจ้งเตือน)
- สถานะ: prototype → MVP (ฝั่งหน้าเว็บครบหลายโมดูล แต่ข้อมูลทั้งหมดยังอยู่ใน `localStorage` + mock data ยังไม่มี backend/DB จริง)

## โครง repo
- `eduflow-next/` — **แอปหลัก (Active)** Next.js 14 App Router + TypeScript
  - `app/` หน้า (landing, login, register, dashboard, student, teacher, schools, admin/*)
  - `components/` UI แยกตามบทบาท (admin, auth, dashboard, landing, schedule, student, teacher, ui)
  - `context/` AuthContext, DialogContext, LangContext, ToastContext
  - `lib/api/` "API layer" ฝั่ง client — store ต่าง ๆ บน localStorage มี comment `TODO(PostgreSQL)` เตรียมย้ายไป DB
  - `lib/mock-data/` ข้อมูลตัวอย่าง/บัญชีเดโม่ · `lib/types.ts` interface กลาง · `lib/i18n/` ระบบแปลภาษา
- `index.html`, `css/`, `js/` — เว็บ SPA รุ่นเก่า (legacy, ไม่พัฒนาต่อ)

## Stack
- Frontend: Next.js 14.2 (App Router), React 18, TypeScript 5, CSS ล้วน (`eduflow-next/app/globals.css`) — ไม่มี Tailwind
- Backend: ยังไม่มี — logic อยู่ใน `eduflow-next/lib/api/*.ts` ทำงานบน browser
- Database: ยังไม่มี — ใช้ `localStorage` (แผนอนาคต: PostgreSQL ผ่าน Prisma หรือ server action — TODO: ถามเจ้าของ)
- อื่น ๆ: `exceljs` (export ปพ. เป็น Excel), `qrcode` (เช็คชื่อ QR), Google Fonts (Cormorant Garamond, DM Sans, Sarabun)

## คำสั่งที่ใช้บ่อย
- ติดตั้ง: `npm --prefix eduflow-next install`
- รัน dev: `npm run dev` (จาก root → delegate ไป eduflow-next) หรือดับเบิลคลิก `เปิด EduFlow ใหม่ (Next.js).bat` — http://localhost:3000
- เว็บเก่า: `npm run start:old` (port 3001)
- build: `npm run build`
- lint / format: `npm --prefix eduflow-next run lint` — **ยังไม่ได้ตั้งค่า ESLint** (ไม่มี .eslintrc รันแล้วจะขึ้นตัวช่วยตั้งค่าแบบ interactive) TODO: ตั้งค่า `next/core-web-vitals` ผ่าน architect · ไม่มี prettier
- Playwright: ติดตั้งแล้ว (`@playwright/test` devDependency ใน eduflow-next + chromium) ยังไม่มี config/เทสต์
- typecheck: `npx --prefix eduflow-next tsc --noEmit -p eduflow-next`
- test (unit): ยังไม่มี — TODO: qa-tester เสนอ framework (เช่น Vitest) ผ่าน architect
- test (e2e): ยังไม่มี — TODO: ติดตั้ง Playwright (`@playwright/test`)
- migration: ไม่มี (ยังไม่มี DB) — การเปลี่ยนรูปข้อมูลใน localStorage ใช้ฟังก์ชัน `migrate()` ใน store
- บัญชีเดโม่: `student1`, `teacher1` (ดู `eduflow-next/lib/mock-data/index.ts`)

## เครื่องมือของทีม (Windows)
- Python: ใช้ `python3` ตามสคริปต์ ถ้าเครื่องเปิด `python3` ไม่ได้ (Windows Store alias) ให้ใช้ `python` แทน
- XP: `python3 scripts/agents/xp.py ...` · เล่มวิจัย: `python3 scripts/thesis/build.py ...`
- Diagram render: `mmdc` (@mermaid-js/mermaid-cli) · เล่ม: `pandoc` + `python-docx`
- shell ของ Claude Code บนเครื่องนี้: PowerShell 5.1 และ Git Bash

## Environments
| env | ที่อยู่ | ใช้ทำอะไร | agent เขียนได้? |
|-----|--------|-----------|----------------|
| local | localhost:3000 | พัฒนา | ✅ |
| staging | TODO: ถามเจ้าของ (ยังไม่มี) | ทดสอบก่อนขึ้นจริง | ✅ ผ่าน devops |
| production | TODO: ถามเจ้าของ (ยังไม่มี) | ผู้ใช้จริง | ❌ ต้องให้เจ้าของอนุมัติทุกครั้ง |

## Server (เซิร์ฟเวอร์ของเจ้าของ)
- OS / วิธี deploy: TODO: ถามเจ้าของ (ยังไม่มี Dockerfile / CI)
- วิธีเข้าถึง: SSH ผ่าน key ที่เจ้าของตั้งไว้ (agent ห้ามอ่านหรือพิมพ์ private key)
- ที่เก็บ backup: TODO: ถามเจ้าของ

## ข้อตกลงโค้ด
- ภาษา UI: ไทยเป็นหลัก + อังกฤษผ่าน i18n (`lib/i18n/dict.ts` key = ข้อความไทย, ปุ่ม LangToggle)
- comment ในโค้ด: ไทยปนอังกฤษได้
- Theme: warm/cream (โทน `--cream`, `--brown-*` ใน globals.css) ฟอนต์ Cormorant Garamond (หัวเรื่อง) + DM Sans/Sarabun (เนื้อหา) — **ห้ามเปลี่ยนธีม**
- โครงสร้างเดิม: ห้ามทำลาย ทำต่อหรือปรับปรุงเท่านั้น
- store ใหม่ใช้ `readJSON/writeJSON` จาก `lib/api/storage-cache.ts` และตรวจสิทธิ์ด้วย `hasPermission()` (`lib/api/permissions.ts`)
- รูปแบบ commit: Conventional Commits (`feat:`, `fix:`, `chore:` ...)
- branch: `master` (stable — repo นี้ใช้ชื่อ master), `feat/TASK-xxxx-<slug>`
