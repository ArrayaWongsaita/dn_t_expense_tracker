import { defineConfig, devices } from '@playwright/test'

// ตั้งค่า Playwright: เปิด Next.js dev server ให้เองแล้วรันเทสด้วย Chromium
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3001' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: true,
  },
})
