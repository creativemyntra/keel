---
name: e2e-test
description: Phase 7 of the keel pipeline -- write and run Playwright E2E browser tests for every user-facing AC. Also usable standalone to generate or run E2E tests outside the pipeline.
---

# e2e-test

Write and run Playwright E2E tests for user-facing flows.

## Execution model

| Environment | Headed | slowMo | Workers | Video | CLI --reporter |
|---|---|---|---|---|---|
| **Local (default)** | Yes | 300ms | 1 | every test | NEVER use --reporter (config owns it) |
| **CI** | No | 0ms | auto | on-failure | NEVER use --reporter (config owns it) |
| **Local + KEEL_HEADLESS=1** | No | 0ms | auto | on-failure | NEVER use --reporter (config owns it) |

**Key rule:** Never pass `--reporter` on the CLI. The config file (`playwright.config.ts`) owns the reporter array; CLI --reporter replaces it and destroys the JSON verdict file.

## When to use

- **In-pipeline**: invoked automatically by the orchestrator as phase 7
  (after QA Engineer phase 6 passes). Produces `07-e2e-engineer.json`.
- **Standalone**: when the user says "e2e test", "playwright test", or
  "test this flow in the browser" outside a full pipeline run.

## In-pipeline instructions (phase 7)

Invoke the **`keel:e2e-engineer`** agent with:
- the story ID
- path to the phase-6 QA report (`06-qa-engineer.json`)

The agent identifies user-facing ACs, writes Playwright tests, runs them
against the live app, captures screenshots, and produces `07-e2e-engineer.json`.

## Standalone instructions

1. Identify the user flow (e.g., "login -> create subscription -> see confirmation").
2. Ensure the app is running at the URL from `KEEL_APP_URL` env var (or configure `baseURL` in `playwright.config.ts`).
3. Write the Playwright test:

```typescript
// tests/e2e/<feature>.spec.ts
import { test, expect } from '@playwright/test';

// baseURL comes from playwright.config.ts (KEEL_APP_URL env var or default)
// Use page.goto('/') instead of hardcoding the full URL

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

4. Run (no --reporter flag; the config owns reporters):
   ```bash
   npx playwright test tests/e2e/<feature>.spec.ts
   ```
   A headed browser window will open and execute tests in slow motion. Watch it. Videos land in `playwright-report/`.

5. Report: pass/fail count, failed step output, screenshot paths, video file locations.

## Visual verification (pixel-to-pixel regression)

For any AC with browser UI, add visual assertions to catch unintended rendering
changes:

- **Page-level snapshots:** capture the full screen after the test completes.
  Use `await stabilize(page)` before snapshots to freeze time, disable
  animations, and seed random values deterministically.
- **Component-level snapshots:** for critical UI components, snapshot them
  separately to localize failure diagnosis.
- **Dynamic content masking:** use the shared `MASKS` constant to overlay
  dynamic regions (timestamps, avatars, live values) as solid boxes so they
  don't trigger false diffs.
- **Baseline truth:** baselines are per-project per-viewport
  (`chromium-desktop`, `chromium-mobile-375`). Committed baselines in
  `tests/e2e/__screenshots__/` are the source of truth in CI. Local runs
  generate baselines on first run for convenience.
- **Baseline updates:** never run `--update-snapshots` yourself (forbidden for
  agents). When a design intentionally changes: review the diff images in
  `playwright-report/test-results/` → run `npx playwright test --update-snapshots`
  → run `node ~/.keel/bin/keel-state.cjs visual-baseline-approve <story-id>
  --reviewer <name> --notes "<why>"` — the gate enforces the approval.
- **Tolerance:** default is pixel-to-pixel (zero diff tolerance). Raising
  `max_diff_pixels` above 0 is an explicit owner decision in `.keel/economy.yml`.
- **Test stability:** `stabilize(page)` handles font loading, network idle,
  deterministic RNG, frozen clock, and animation disablement — if a snapshot
  still varies across runs, the UI has a real dynamic element that must be
  masked or investigated.

## Rules

- Use `data-testid` attributes -- not CSS classes or text that can change.
- Never hard-code credentials -- use `process.env`.
- Each test must be independent (no shared mutable state between tests).
- Check `browser_console_messages` after each test -- JS errors are failures.
- Take a screenshot of the final state of each test.
- Maximum 30s timeout per action.
- Never fabricate results -- if the app is not running, say so and stop.
- **Visual assertions:** never loosen tolerance in a spec. Tolerance is a
  project-level policy in `.keel/economy.yml`, not a per-test override.
  Never mask content to hide a real failure — masks are only for correct
  dynamic regions.
