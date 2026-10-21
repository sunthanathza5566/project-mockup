# Playbook — frontend-dev

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- ทุก call ผ่าน `@/lib/api`; ต้อง `await initAunqa()` ก่อนใช้ (client เท่านั้น)
- ปุ่ม/เมนูซ่อนตาม can() ได้ แต่ lib ตรวจซ้ำเสมอ อย่าถือว่า UI เป็นด่านเดียว
- route ของ section: `/app/sections/[id]` โดย id = encodeURIComponent(cycleId::reqId) เช่น `cycle-demo-2569%3A%3A1.1`
- หน้า Phase B: `/app/curriculum`, `/app/actions`, `/app/cycles/[id]/assess` (กรรมการ); ปุ่มส่งกลับของคณบดีใช้ prompt บังคับ note
- CSS ใหม่ prefix `.aq-*` ต่อท้าย app/globals.css ใช้ตัวแปรธีมเดิม; ล้าง CSS เก่าแล้วใน B3
- lint: ยังไม่มี ESLint config → ข้าม; smoke จริงใช้ Playwright กับ `next start`; demo password demo1234
- ยังไม่ทำ: EN i18n ยังไม่ขยาย dict
- EN i18n (C2): `lib/i18n/dict-aunqa.ts` (EN dict + PATTERNS regex แบบ `^…$`) + `lib/i18n/dom-translate.ts` (แปล text/placeholder/aria-label/title ผ่าน node.data/setAttribute เท่านั้น ห้าม innerHTML); key = ข้อความไทย
- หน้า import metric: `app/app/metrics/page.tsx` + `components/aunqa/MetricImport.tsx`; ปุ่ม DOCX หลัก + `.doc` สำรอง
- ค้างจาก C4 รอบ 1 → ต้องแก้ใน U2 ตาม spec (orchestrator เลื่อนไว้ ไม่หักตอนนี้): C-7 ใส่ `key={programmeId}` ให้ MetricImport และทิ้งผล dryRun ที่ไม่ใช่คำขอล่าสุด; C-10 dom-translate ต้องฟัง attributes และจับค่าเดิมใหม่เมื่อ React เปลี่ยนค่า
