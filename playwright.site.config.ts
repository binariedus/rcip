import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/site',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.RCIP_SITE_URL ?? 'http://127.0.0.1:4186',
    trace: 'retain-on-failure',
  },
  webServer: process.env.RCIP_SITE_URL
    ? undefined
    : {
        command: 'npm run docs:preview',
        url: 'http://127.0.0.1:4186/rcip/',
        reuseExistingServer: false,
      },
})
