import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:47822',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
