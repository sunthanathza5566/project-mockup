import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 3917);

/**
 * E2E (TASK-0001 C3b): build production แล้ว next start บน port ว่าง
 * - ใช้ E2E_REUSE=1 เพื่อ reuse เซิร์ฟเวอร์ที่รันอยู่ (ข้ามขั้น build)
 * - ทุก test ใช้ browser context ใหม่ = localStorage/sessionStorage ว่าง (seed ใหม่)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  outputDir: './e2e/artifacts/results',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'off',
    acceptDownloads: true,
    locale: 'th-TH',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !!process.env.E2E_REUSE,
    timeout: 600_000,
    stdout: 'ignore',
  },
});
