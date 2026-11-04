import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 3917);

/**
 * TASK-0003 S6b — วิดีโอ walkthrough ทุก role (V00–V11) พร้อมคำบรรยายภาษาไทยบนจอ
 * รัน: `npx playwright test -c playwright.walkthrough.config.ts` (ในโฟลเดอร์ eduflow-next)
 *   - เซิร์ฟเวอร์ที่รันอยู่แล้ว: `E2E_REUSE=1 E2E_PORT=<port> npx playwright test -c playwright.walkthrough.config.ts`
 *   - ทีละวิดีโอ: เพิ่ม `-g V03`
 * วิดีโอของเทสต์ที่ผ่านถูกคัดลอกไป `../docs/walkthrough/videos/<ชื่อ>.webm` (ดู e2e/walkthrough/narrate.ts saveVideo)
 * config หลัก (playwright.config.ts) ไม่รันโฟลเดอร์นี้ (testIgnore '**\/walkthrough/**')
 */
export default defineConfig({
  testDir: './e2e/walkthrough',
  testMatch: /.*\.spec\.ts/,
  outputDir: './e2e/artifacts/walkthrough',
  timeout: 20 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    launchOptions: { slowMo: 300 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    screenshot: 'only-on-failure',
    trace: 'off',
    acceptDownloads: true,
    actionTimeout: 30_000,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !!process.env.E2E_REUSE,
    timeout: 600_000,
    stdout: 'ignore',
  },
});
