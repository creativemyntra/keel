import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// Headed by default everywhere except CI. KEEL_HEADLESS=1 opts out.
const headed = !isCI && process.env.KEEL_HEADLESS !== '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  workers: headed ? 1 : undefined,   // one visible test at a time

  // On local dev: headed + slow-motion so you can watch the browser.
  // In CI (env CI=true): headless, no slowMo.
  use: {
    headless: !headed,
    launchOptions: { slowMo: headed ? 300 : 0 },  // slowMo MUST live in
                                                  // launchOptions — under
                                                  // use{} it is silently
                                                  // ignored (prior bug)
    screenshot: 'only-on-failure',
    video: headed ? 'on' : 'retain-on-failure',
    baseURL: process.env.KEEL_APP_URL ?? process.env.BASE_URL ?? 'http://localhost:8000',
    trace: 'on-first-retry',
  },

  // Visual regression settings — pixel-to-pixel by default
  snapshotPathTemplate:
    'tests/e2e/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: Number(process.env.KEEL_VISUAL_MAXDIFF ?? 0),
      threshold: 0.1,              // per-pixel color tolerance (anti-alias)
      animations: 'disabled',      // CSS animations/transitions frozen
      caret: 'hide',               // blinking cursor never diffs
      scale: 'css',                // DPI-independent screenshots
    },
  },

  // Baseline updates are manual+approved, not auto-generated in CI
  updateSnapshots: isCI ? 'none' : 'missing',

  // Global setup documents the OS-contract for baselines
  globalSetup: 'tests/e2e/visual.setup.ts',

  reporter: isCI
    ? [['list'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : [['list'],
       ['json', { outputFile: 'playwright-report/results.json' }],
       ['html', { open: 'never', outputFolder: 'playwright-report/html' }]],
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
        url: process.env.KEEL_APP_URL ?? 'http://localhost:8000',
        timeout: 120 * 1000,
        reuseExistingServer: !isCI,
      },
});
