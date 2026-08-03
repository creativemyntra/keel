import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 1,

  // On local dev: headed + slow-motion so you can watch the browser.
  // In CI (env CI=true): headless, no slowMo.
  use: {
    headless: isCI,
    slowMo: isCI ? 0 : 300,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
    trace: 'on-first-retry',
  },

  reporter: isCI
    ? [['list'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/html' }]],

  outputDir: 'playwright-report/test-results',

  // Test projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server setup for E2E tests
  webServer: process.env.SKIP_SERVER
    ? undefined
    : {
        command: process.env.SERVER_CMD || 'cd tests/fixture-app && php -S localhost:8000',
        url: 'http://localhost:8000',
        timeout: 120 * 1000,
        reuseExistingServer: !isCI,
      },
});
