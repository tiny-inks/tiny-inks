import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2, // the shop laptop is memory-starved; 4 workers OOM the runner
  reporter: [['line']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/en',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});
