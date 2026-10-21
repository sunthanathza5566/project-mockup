# PROTOCOL — กฎกลางทุก agent ต้องทำตาม

## ก่อนเริ่มงาน (ทุกครั้ง)
1. อ่าน `.agents/memory/<ชื่อตัวเอง>/playbook.md` — นี่คือประสบการณ์ของคุณ ใช้มันจริง
2. อ่าน TASK file ที่ได้รับ + ไฟล์ใน INPUT
3. เช็ก `.agents/OWNERSHIP.md` ว่าไฟล์ที่จะแตะอยู่ในโซนตัวเอง
4. ดู level ตัวเอง: `python3 scripts/agents/xp.py status <ชื่อตัวเอง>` แล้วทำตามสิทธิ์ของ level นั้น (ดู XP_RULES.md)
5. **ศึกษาก่อนลงมือ (Study)** — เจ้าของสั่ง 2026-10-21: ก่อนลงมือ ต้องรู้ว่า "แบบที่ถูกต้อง" ของงานตัวเองคืออะไร
   - อ่าน `.agents/research/standards/INDEX.md` แล้วเปิดไฟล์มาตรฐานของโซนตัวเอง (เช่น thesis-writer → `thesis-th.md`, diagram-designer → `uml.md`)
   - ถ้ามาตรฐานที่ต้องใช้ยังไม่มี / ไม่พอ / ล้าสมัย → เขียน `STUDY REQUEST` ใน TASK file (หัวข้อ, คำถามที่ต้องการคำตอบ) แล้วทำส่วนที่ไม่ขึ้นกับมาตรฐานนั้นต่อ — orchestrator จะส่ง researcher
   - เขียนในส่วนของตัวเองใน TASK file ว่า `Study: อ่าน <ไฟล์> — ใช้ข้อ <x,y> กับงานนี้` (1–3 บรรทัด)
   - ความรู้มาตรฐานส่งต่อกันผ่าน `.agents/research/standards/**` (ไม่ต้องรอ orchestrator ส่งให้) — agent ที่พบว่ามาตรฐานผิด/ขาด ให้จดใน `STUDY REQUEST` ไม่แก้ไฟล์มาตรฐานเอง (โซน researcher)

## ระหว่างทำงาน
- ทำเฉพาะ SCOPE ที่ได้รับ เจอปัญหานอก scope → จดใน TASK file หัวข้อ `Found Issues` ไม่ต้องแก้เอง
- ห้ามเดา: ไม่แน่ใจ API/ไลบรารี/พฤติกรรมระบบ → อ่านโค้ดจริงหรือเอกสารก่อน ถ้ายังไม่ชัด → `BLOCKED` พร้อมคำถาม
- รันคำสั่งตรวจของโซนตัวเอง (lint/typecheck/test) ก่อนบอกว่าเสร็จ

## ห้ามเด็ดขาด (ทุก level)
- อ่าน/พิมพ์/commit ค่าใน `.env`, private key, token, password
- คำสั่งทำลายข้อมูล: `rm -rf` นอกโฟลเดอร์ build/temp, `DROP`, `TRUNCATE`, `DELETE` ไม่มี WHERE, `git push --force`, `git reset --hard` บน branch ที่ push แล้ว
- แตะ production (deploy, migrate, restart, แก้ config) โดยไม่มีบรรทัด `OWNER APPROVED: <วันที่>` ใน TASK file
- ใช้ข้อมูลส่วนบุคคลจริงในเทสต์/seed — ใช้ข้อมูลปลอมเสมอ
- แก้ไฟล์ playbook หรือ XP ของตัวเอง (ยกเว้น xp-keeper)

## จบงาน — เขียนส่วนของตัวเองใน TASK file เสมอ
```
### [<ชื่อ agent>] <PHASE> — <DONE | BLOCKED | HANDOFF REQUEST>
- ทำอะไรไป: ...
- ไฟล์ที่แก้: ...
- ตรวจแล้ว: (คำสั่งที่รัน + ผลลัพธ์ย่อ)
- ความเสี่ยง/ข้อควรรู้: ...
- ส่งต่อให้: <agent ถัดไป> เพราะ ...
- LESSON CANDIDATE: (บทเรียนที่คิดว่าควรจำ 0-3 ข้อ, เขียนเป็นกฎสั้นที่นำไปใช้ซ้ำได้)
```
แล้วตอบ orchestrator สั้น ๆ: สถานะ + path ของ TASK file
