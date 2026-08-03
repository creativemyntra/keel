# E2E Visual Regression Testing with Keel

**For developers using the Keel framework to build and test their projects.**

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Your project initialized with Keel
- Playwright installed: `npm install --save-dev @playwright/test`

### 2. Copy framework fixtures to your project

The Keel framework provides pre-built fixtures in `tests/e2e/fixtures.ts`. Copy these to your project:

```bash
cp node_modules/@keel/framework/tests/e2e/fixtures.ts tests/e2e/
cp node_modules/@keel/framework/tests/e2e/visual.setup.ts tests/e2e/
```

Or let the setup wizard do this automatically:
```bash
/keel:e2e-setup
```

### 3. Create your first E2E test

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from './fixtures';
import { stabilize } from './fixtures';

test('homepage loads and renders header', async ({ page }) => {
  await page.goto('/');
  await stabilize(page);
  
  await expect(page.locator('h1')).toBeVisible();
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### 4. Set your app URL

```bash
# Option A: Environment variable
export KEEL_APP_URL="http://localhost:3000"
npx playwright test

# Option B: Update playwright.config.ts
baseURL: process.env.KEEL_APP_URL ?? 'http://localhost:YOUR_PORT'
```

### 5. Generate baselines on first run

```bash
npx playwright test --update-snapshots
```

This creates `tests/e2e/__screenshots__/` with baseline images.

### 6. Commit baselines to git

```bash
git add tests/e2e/__screenshots__/
git commit -m "feat: add E2E visual regression baselines"
```

### 7. Run tests in CI/CD

```bash
# Local development (headed browser, slow-motion)
npx playwright test

# CI (headless, fast)
CI=true npx playwright test
```

---

## Understanding the Fixtures

### `stabilize(page, timeout?)`

Ensures deterministic rendering before taking screenshots:

```typescript
await page.goto('/dashboard');
await stabilize(page);  // Waits for network, animations, focus

await expect(page).toHaveScreenshot('dashboard-stable.png');
```

What it does:
- Waits for network requests to complete (networkidle)
- Waits for CSS animations to finish
- Scrolls to top
- Clears input focus
- Small render delay for consistency

### `MASKS` constant

Pre-configured selectors for dynamic content (timestamps, avatars, spinners):

```typescript
await expect(page).toHaveScreenshot('page.png', {
  // MASKS grays out these regions, ignored in comparisons
});
```

Current masks:
- `[data-testid*="timestamp"]` — timestamps
- `[data-testid*="avatar"]` — profile pictures
- `[class*="loading"]` / `[class*="spinner"]` — loading states
- `time` — `<time>` elements

Extend it:
```typescript
// tests/e2e/fixtures.ts
export const MASKS = [
  ...MASKS,
  '[data-testid="generated-id"]',  // Your app's dynamic data
];
```

### `stablePage` fixture

Pre-stabilized page in tests:

```typescript
test('my flow', async ({ stablePage }) => {
  const page = stablePage;
  await page.goto('/');
  // page is already stabilized
});
```

### `expect` re-export

Import directly from fixtures for cleaner imports:

```typescript
import { expect, stabilize, MASKS } from './fixtures';
// Instead of: import { expect } from '@playwright/test'
```

---

## Common Patterns

### Page-level snapshot

Detect layout/style regressions across the whole page:

```typescript
test('full page layout', async ({ page }) => {
  await page.goto('/');
  await stabilize(page);
  
  await expect(page).toHaveScreenshot('full-page.png', {
    fullPage: true,
  });
});
```

### Component isolation

Test individual components for consistency:

```typescript
test('card component styling', async ({ page }) => {
  await page.goto('/products');
  await stabilize(page);
  
  const card = page.locator('[data-testid="product-card"]').first();
  await expect(card).toHaveScreenshot('product-card.png');
});
```

### Multiple viewports

Test responsive design:

```typescript
// playwright.config.ts
use: {
  viewport: { width: 1280, height: 720 },  // Desktop
},
projects: [
  {
    name: 'chromium-mobile',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'chromium-desktop',
    use: { viewport: { width: 1920, height: 1080 } },
  },
];
```

### User flow testing

Test multi-step workflows:

```typescript
test('checkout flow', async ({ page }) => {
  // 1. Browse products
  await page.goto('/products');
  await stabilize(page);
  await expect(page).toHaveScreenshot('products-list.png');
  
  // 2. Add to cart
  await page.click('[data-testid="add-to-cart"]');
  await stabilize(page);
  await expect(page).toHaveScreenshot('item-added.png');
  
  // 3. Checkout
  await page.click('[data-testid="checkout"]');
  await stabilize(page);
  await expect(page).toHaveScreenshot('checkout-form.png');
});
```

---

## Configuration

### playwright.config.ts defaults

```typescript
{
  testDir: './tests/e2e',
  timeout: 30_000,
  
  use: {
    baseURL: process.env.KEEL_APP_URL ?? 'http://localhost:7891',
    headless: process.env.CI ? true : false,  // headed in dev, headless in CI
    slowMo: process.env.CI ? 0 : 300,  // slow-motion in dev
  },
  
  snapshotPathTemplate: 'tests/e2e/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,  // pixel-perfect
      threshold: 0.1,  // anti-alias tolerance
      animations: 'disabled',  // frozen
      caret: 'hide',  // no cursor
    },
  },
  
  updateSnapshots: process.env.CI ? 'none' : 'missing',
}
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `KEEL_APP_URL` | `http://localhost:7891` | Your app's base URL |
| `KEEL_HEADLESS` | — | Set to `1` to force headless mode locally |
| `KEEL_VISUAL_MAXDIFF` | `0` | Max diff pixels allowed (0 = pixel-perfect) |
| `CI` | — | Set by CI systems (GitHub Actions, etc.) |

---

## Troubleshooting

### Tests can't connect to app

**Error:** `net::ERR_CONNECTION_REFUSED`

**Fix:**
```bash
# 1. Check app is running
curl -s $KEEL_APP_URL/health

# 2. Set correct URL
export KEEL_APP_URL="http://localhost:YOUR_PORT"

# 3. Start your app first
npm run dev  # or your app's start command
```

### Snapshots don't match on CI

**Cause:** Cross-platform rendering differences (Windows/Mac/Linux)

**Fix:**
```bash
# Update baselines on the same OS as CI
docker run -it --rm mcr.microsoft.com/playwright:v1.40.0 /bin/bash
# Then run: npx playwright test --update-snapshots
```

Or configure per-platform baselines:

```typescript
// playwright.config.ts
snapshotPathTemplate: 'tests/e2e/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
```

### Tests are flaky (inconsistent)

**Cause:** Missing `stabilize()` or dynamic content

**Fix:**
```typescript
await stabilize(page, 5000);  // Longer timeout

// Mask dynamic content
await expect(page).toHaveScreenshot('page.png', {
  // Remove mask parameter and add this line to fixtures.ts
});
```

### Snapshots are too large

**Cause:** Full-page screenshots with lots of content

**Fix:**
```typescript
// Use viewport-only instead of full-page
await expect(page).toHaveScreenshot('page.png', {
  fullPage: false,  // Just visible area
});

// Or snapshot components instead
const component = page.locator('[data-testid="card"]').first();
await expect(component).toHaveScreenshot('card.png');
```

---

## CI Integration

### GitHub Actions example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run build  # Build your app
      - run: npm run dev &  # Start in background
        env:
          KEEL_APP_URL: http://localhost:3000
      
      - run: npx playwright test
        env:
          CI: true
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Next Steps

- Read the [Keel E2E Engineer Agent Guide](../../agents/e2e-engineer.md) for in-pipeline testing
- Check [Playwright documentation](https://playwright.dev/docs/intro) for advanced features
- Join the [Keel Community](https://github.com/creativemyntra/keel) for questions

---

**Last updated:** 2026-08-03  
**Keel version:** 3.16.9+
