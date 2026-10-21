# FILE OWNERSHIP — ใครแก้ไฟล์ไหนได้
<!-- ADAPT: ปรับ path ตามโครงจริง 2026-10-21 (แอปหลักอยู่ใน eduflow-next/) -->

| โซน | path | เจ้าของ (เขียนได้) | อ่านได้ |
|-----|------|-------------------|--------|
| Frontend | `eduflow-next/app/**`, `eduflow-next/components/**`, `eduflow-next/context/**`, `eduflow-next/lib/ui/**`, `eduflow-next/lib/i18n/**`, `eduflow-next/public/**`, legacy: `index.html`, `css/**`, `js/**` | frontend-dev | ทุกคน |
| Backend | `eduflow-next/lib/api/**`, `eduflow-next/lib/utils/**`, `eduflow-next/lib/report-docs*.ts`, `eduflow-next/lib/types.ts`, (อนาคต) `eduflow-next/app/api/**`, `eduflow-next/server/**` | backend-dev | ทุกคน |
| Database | `eduflow-next/lib/mock-data/**` (seed), (อนาคต) `**/migrations/**`, `**/schema.*`, `prisma/**`, `db/**`, `**/seed*` | db-engineer | ทุกคน |
| Tests | `tests/**`, `e2e/**`, `eduflow-next/tests/**`, `eduflow-next/e2e/**`, `**/*.test.*`, `**/*.spec.*`, `**/playwright.config.*`, `**/vitest.config.*` | qa-tester | ทุกคน |
| Infra | `Dockerfile*`, `docker-compose*`, `.github/**`, `deploy/**`, `nginx/**`, `scripts/deploy/**`, `*.bat` (ตัวเปิดแอป) | devops | ทุกคน |
| Docs | `docs/**` (ยกเว้น `docs/diagrams/**`), `eduflow-next/docs/**` (ยกเว้น `eduflow-next/docs/diagrams/**`), `README*.md`, `CHANGELOG.md` | docs-writer | ทุกคน |
| Diagrams | `docs/diagrams/**` (Mermaid `.mmd` — ที่ build.py ใช้), `eduflow-next/docs/diagrams/**` (Use Case เดิม: svg/pdf/html/gen-usecase.mjs) | diagram-designer | ทุกคน |
| Thesis | `thesis/**`, `scripts/thesis/**` | thesis-writer | ทุกคน |
| System Map | `.agents/SYSTEM_MAP.md` | code-reader | ทุกคน |
| Research | `.agents/research/**` | researcher | ทุกคน |
| Decisions | `.agents/decisions/**` | architect | ทุกคน |
| Reviews | `.agents/reviews/**`, `.agents/screenshots/**` | reviewer, security-auditor, ui-inspector, playtester (เฉพาะไฟล์ชื่อตัวเอง) | ทุกคน |
| Playtest scratch | `.agents/playtest/**` (สคริปต์ทดลองชั่วคราว) | playtester, ui-inspector | ทุกคน |
| XP & Playbook | `.agents/xp/**`, `.agents/memory/**` | xp-keeper | ทุกคน |
| Board | `.agents/board/**` | ทุกคน (เฉพาะส่วนของตัวเองในไฟล์) | ทุกคน |
| Config กลาง | `package.json`, `eduflow-next/package.json`, lockfiles, `eduflow-next/tsconfig*`, `eduflow-next/next.config.*`, `.env.example` | architect ตัดสิน → เจ้าของโซนที่เกี่ยวแก้ | ทุกคน |
| Team setup | `CLAUDE.md`, `.claude/**`, `.agents/*.md` (PROTOCOL, OWNERSHIP, XP_RULES, PROJECT), `scripts/agents/**` | orchestrator (เปลี่ยนกติกาต้องให้เจ้าของอนุมัติ) | ทุกคน |

## หมายเหตุเฉพาะโปรเจกต์
- `lib/types.ts` เป็น contract กลางระหว่าง frontend กับ backend — backend-dev เป็นคนแก้ แต่ต้องตามที่ architect กำหนดใน TASK file
- ตอนนี้ "Database" = mock data + รูปข้อมูลใน localStorage; ฟังก์ชัน `migrate()` ที่อยู่ในไฟล์ store (`lib/api/*.store.ts`) เป็นโซน Backend แต่ต้องให้ db-engineer รีวิวรูปข้อมูล
- `.claude/mods/**` (caveman mod) เป็นของเจ้าของ ไม่มี agent ใดแก้

## กฎ
- ต้องแก้ไฟล์นอกโซน → ห้ามแก้เอง ให้เขียน `HANDOFF REQUEST` ใน TASK file แล้วจบงาน orchestrator จะส่งต่อ
- `.env` และไฟล์ secret: **ไม่มีใครอ่านหรือแก้** ใช้ `.env.example` เป็นตัวอ้างอิง
