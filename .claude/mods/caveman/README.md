# caveman 🪨

Mod for Claude Code: ทำให้ Claude ตอบสั้นแบบ "มนุษย์ถ้ำ" เพื่อประหยัด output token (~50-75%)
โดยเนื้อหาเทคนิค, code, คำสั่ง, path, error message ยังครบเหมือนเดิม

## ใช้งาน

| คำสั่ง | ผล |
| --- | --- |
| `/caveman` | ดู level ปัจจุบัน |
| `/caveman lite` | ตัดแค่คำฟุ่มเฟือย/คำอ้อม ยังเป็นประโยคเต็ม |
| `/caveman full` | (ค่าเริ่มต้น) แบบ caveman ตัด article ใช้ประโยคสั้น |
| `/caveman ultra` | บีบสุด ใช้ตัวย่อ ลูกศร X → Y |
| `/caveman off` | ปิด กลับมาพูดปกติ |

Level ถูกจำข้ามเซสชัน (`$.store`) และแสดงใน status line เป็น `🪨 caveman:<level>`.
มีผลตั้งแต่ข้อความถัดไป (เพิ่ม section `caveman:rules` ท้าย system prompt)

Code block, commit message, ไฟล์ที่เขียนลงดิสก์ และคำเตือนด้านความปลอดภัย ยังเขียนแบบปกติ

## ติดตั้งในเครื่อง

```sh
claude --plugin-dir .claude/mods/caveman
```
