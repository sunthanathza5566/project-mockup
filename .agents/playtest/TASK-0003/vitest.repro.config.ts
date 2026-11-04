// TASK-0003 S1 (code-reader) — config ชั่วคราวสำหรับรันสคริปต์ทำซ้ำบั๊ก "ประธานไม่ได้แจ้งเตือน"
// รัน: cd eduflow-next && npx vitest run --config ../.agents/playtest/TASK-0003/vitest.repro.config.ts
// ไม่ใช่เทสต์ของ production (ไม่อยู่ใน tests/**) — db-engineer/backend-dev ย้ายเคสที่ใช้ได้ไปเป็นเทสต์กันถอยหลังจริง

import path from 'node:path';

const app = path.resolve(__dirname, '../../../eduflow-next');

export default ({
  root: app,
  resolve: { alias: { '@': app } },
  test: {
    globals: true,
    environment: 'node',
    dir: __dirname,
    include: ['**/*.repro.test.ts'],
    setupFiles: [path.join(app, 'tests/setup.ts')],
    testTimeout: 20000,
  },
});
