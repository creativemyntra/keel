---
name: e2e-test
description: Generate or run Playwright E2E tests for a user flow.
---

# e2e-test

Generate or run Playwright E2E tests for a user flow.

## When to use

Invoke when the user says "e2e test", "playwright test", "/keel e2e", or describes a user flow to test.

## Instructions

1. Identify the user flow (e.g., "login → create item → verify in list").
2. Generate a Playwright test file:

```typescript
// tests/e2e/<feature>.spec.ts
import { test, expect } from '@playwright/test';

test.describe('<Feature> — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.APP_URL ?? 'http://localhost:8080');
  });

  test('happy path: <description>', async ({ page }) => {
    // Steps
    await page.click('...');
    await expect(page.locator('...')).toBeVisible();
  });

  test('error path: <description>', async ({ page }) => {
    // Steps
  });
});
```

3. Save to `tests/e2e/<feature>.spec.ts`.
4. If `--run` flag or "run the tests" is requested, execute:
   `npx playwright test tests/e2e/<feature>.spec.ts --reporter=list`
5. Report: pass/fail count, failed steps, screenshots on failure.

## Rules
- Use `data-testid` attributes for selectors where possible.
- Never hard-code credentials — use environment variables.
- Each test must be independent (no shared state between tests).
- Maximum 30s timeout per test.
