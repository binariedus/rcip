import { defineConfig } from '@playwright/test'

const baseURL = process.env.RCIP_PILOT_URL ?? 'http://127.0.0.1:4000'
const serverCommand = process.env.RCIP_E2E_SERVER_COMMAND ?? 'npm run dev'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
