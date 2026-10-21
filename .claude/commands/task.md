---
description: เริ่มงานใหม่ตาม workflow ของทีม agent
argument-hint: <อธิบายงาน>
---
งานใหม่จากเจ้าของ: $ARGUMENTS

ทำตาม Workflow ใน CLAUDE.md:
1. หาเลข TASK ถัดไปจาก `.agents/board/` แล้วสร้างไฟล์จาก `_TEMPLATE.md`
2. กำหนด Size S/M/L และ acceptance criteria เบื้องต้น ถ้าโจทย์กำกวมให้ถามเจ้าของก่อน (ไม่เกิน 3 คำถาม)
3. เดินเฟสตามลำดับ มอบหมาย agent ด้วยฟอร์แมต TASK/ROLE/PHASE/GOAL/INPUT/SCOPE/DONE WHEN
4. หยุดรออนุมัติที่ด่านที่กำหนด
5. จบด้วย xp-keeper แล้วสรุปให้เจ้าของ: ทำอะไรไป, ไฟล์ที่เปลี่ยน, ผลเทสต์, XP ที่ได้
