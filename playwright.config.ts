import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://practicesoftwaretesting.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-test',
  },
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: 'https://api.practicesoftwaretesting.com' } },
    { name: 'chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  ],
});
