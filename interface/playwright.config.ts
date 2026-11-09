import { defineConfig } from '@playwright/test'

const externalBaseURL = process.env.PLAYWRIGHT_STATIC === '1'
  ? 'http://localhost:4173'
  : process.env.PLAYWRIGHT_BASE_URL
const testURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright-results',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './output/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: externalBaseURL || testURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
        url: testURL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
})
