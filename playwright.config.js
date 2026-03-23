/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests/e2e',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node backend/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
};

module.exports = config;
