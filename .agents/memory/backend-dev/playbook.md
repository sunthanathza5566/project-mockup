# Playbook — backend-dev

## RULES
- (ยังไม่มี)

## LESSONS
- [TASK-0001 review #2] store ที่ load ผ่าน readJSON (cache คืน reference ร่วม): validate id/input ทั้งหมดก่อนแก้ object ใดๆ แล้วค่อย save; appendAudit หลัง save สำเร็จเท่านั้น (เคส assignSections, linkEvidence). ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 review #1] getter ที่คืนข้อมูลดิบ (เช่น extracted text) ต้องรับ user และผ่าน guard เดียวกับ getter หลัก; ห้าม export ตัวที่ไม่มี guard ออกจาก facade `@/lib/api`. ใช้ซ้ำแล้ว 0 ครั้ง
- [TASK-0001 review] กฎ "AI ห้ามให้คะแนน/เปลี่ยน state" บังคับด้วยโครงสร้าง import (ai.service ไม่ import workflow/rating) + provider interface ไม่มีเมธอดให้คะแนน ดีกว่าเขียนแค่ใน prompt. ใช้ซ้ำแล้ว 0 ครั้ง

## PROJECT KNOWLEDGE
- facade จุดเดียว `@/lib/api` (lib/api/index.ts); ทุก write รับ `actor: AppUser` และ throw `AunqaError` (.code/.message/.detail)
- storage: localStorage key prefix `aunqa_` ผ่าน lib/api/storage-cache.ts (readJSON/writeJSON); no-op เมื่อไม่มี window
- workflow: ตาราง `CYCLE_TRANSITIONS`/`SECTION_TRANSITIONS` ตัวเดียวใช้ทั้งบังคับใน lib และสร้างปุ่มใน UI
- snapshot hash = stableStringify ของ field สาระ → verifySnapshot ใช้ได้จริง
- PII heuristic: เลขบัตรแบบมีขีดติดธงเสมอ; 13 หลักติดกันต้องผ่าน checksum; ยังไม่มี NER ชื่อคน; ไฟล์ binary ยังไม่ extract text
- `.doc` export เป็น HTML (ไม่ใช่ DOCX จริง); audit ไม่มี hash chain
- RBAC ยังอยู่ฝั่ง browser (MVP) → Phase B ต้องย้ายไป server + RLS
- ค้างจาก review (Phase B): dean ไม่มีทางส่งกลับหลัง faculty_approved (รอ architect ADR); lock หลักฐานข้ามปี (copyFromCycleId); segregation of duties ประธานอนุมัติข้อที่ตัวเองเขียน
- R7 คืน [] รอ M4 (curriculum) — เทสต์ล็อกไว้ ต้องแก้เมื่อทำ M4
