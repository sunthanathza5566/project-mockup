/**
 * API Layer — พร้อมเชื่อมต่อ PostgreSQL
 *
 * ตอนนี้: ฟังก์ชันทุกตัวใช้ localStorage + mock data
 * อนาคต: แทนที่ด้วย fetch('/api/...') หรือ server action ที่เชื่อม PostgreSQL
 *
 * Pattern ที่จะใช้ตอนเชื่อม PostgreSQL:
 *   - Next.js Route Handler: app/api/[route]/route.ts
 *   - Prisma ORM: lib/prisma.ts  → new PrismaClient()
 *   - หรือ node-postgres (pg) โดยตรง
 */

export * from './auth.api';
export * from './student.api';
export * from './admin.api';
export * from './teacher.api';
