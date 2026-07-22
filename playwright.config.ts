import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,

  // On local dev: headed + slow-motion so you can watch the browser.
  // In CI (env CI=true): headless, no slowMo.
  use: {
    headless: isCI,
    slowMo: isCI ? 0 : 300,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'http://localhost:7891',
  },

  reporter: isCI
    ? [['list'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/html' }]],

  outputDir: 'playwright-report/test-results',
});
