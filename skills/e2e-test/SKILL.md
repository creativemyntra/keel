---
name: e2e-test
description: Phase 8 of the keel pipeline — write and run Playwright E2E browser tests for every user-facing AC. Also usable standalone to generate or run E2E tests outside the pipeline.
---

# e2e-test

Write and run Playwright E2E tests for user-facing flows.

## When to use

- **In-pipeline**: invoked automatically by the orchestrator as phase 8
  (after QA Engineer phase 7 passes). Produces `08-e2e-engineer.json`.
- **Standalone**: when the user says "e2e test", "playwright test", or
  "test this flow in the browser" outside a full pipeline run.

## In-pipeline instructions (phase 8)

Invoke the **`keel:e2e-engineer`** agent with:
- the story ID
- path to the phase-7 QA report (`07-qa-engineer.json`)

The agent identifies user-facing ACs, writes Playwright tests, runs them
against the live app, captures screenshots, and produces `08-e2e-engineer.json`.

## Standalone instructions

1. Identify the user flow (e.g., "login → create subscription → see confirmation").
2. Ensure the app is running at `$APP_URL` (default `http://localhost:8080`).
3. Write the Playwright test:

```typescript
// tests/e2e/<feature>.spec.ts
import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('<Feature>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('happy path: <description>', async ({ page }) => {
    await page.goto(`${APP_URL}/path`);
    await page.fill('[data-testid="field"]', 'value');
    await page.click('[data-testid="submit"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    await page.screenshot({ path: 'docs/e2e-evidence/<test-name>.png' });
  });

  test('error path: <description>', async ({ page }) => {
    await page.goto(`${APP_URL}/path`);
    await page.click('[data-testid="submit"]'); // submit empty
    await expect(page.locator('[data-testid="error"]')).toBeVisible();
  });
});
```

4. Run:
   ```bash
   npx playwright test tests/e2e/<feature>.spec.ts --reporter=list
   ```
5. Report: pass/fail count, failed step output, screenshot paths.

## Rules

- Use `data-testid` attributes — not CSS classes or text that can change.
- Never hard-code credentials — use `process.env`.
- Each test must be independent (no shared mutable state between tests).
- Check `browser_console_messages` after each test — JS errors are failures.
- Take a screenshot of the final state of each test.
- Maximum 30s timeout per action.
- Never fabricate results — if the app is not running, say so and stop.
