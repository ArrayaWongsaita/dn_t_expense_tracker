import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ เป็นของ Playwright ไม่ใช่ Vitest
    exclude: ['**/node_modules/**', 'e2e/**'],
    passWithNoTests: true,
  },
})
