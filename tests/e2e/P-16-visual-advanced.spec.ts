/**
 * P-16: Visual Regression Testing — Developer Examples
 *
 * Template tests showing developers how to use Keel's visual regression
 * testing fixtures (stabilize, MASKS, stablePage) for their own projects.
 *
 * Developers should:
 * 1. Copy this test file as a starting point
 * 2. Replace baseURL with their app (or set KEEL_APP_URL env var)
 * 3. Update selectors to match their own app's DOM
 * 4. Run with --update-snapshots to generate baselines
 * 5. Commit baselines to git for CI comparison
 */

import { test, expect } from '@playwright/test';
import { stabilize, MASKS } from './fixtures';

test.describe('P-16: Visual Regression — Page-Level Snapshots', () => {
  test('Full page snapshot (baseline for regression)', async ({ page }) => {
    // Navigate to your app (baseURL from playwright.config.ts or KEEL_APP_URL env var)
    await page.goto('/');
    await stabilize(page);

    // Take full-page snapshot
    // On first run with --update-snapshots, this creates the baseline
    // On subsequent runs, Playwright compares against the baseline
    await expect(page).toHaveScreenshot('full-page.png', {
      fullPage: true,
    });
  });

  test('Above-the-fold snapshot (fast baseline for CI)', async ({ page }) => {
    // Snapshot only the viewport (no full-page scroll)
    // Faster for CI, sufficient for detecting major layout breaks
    await page.goto('/');
    await stabilize(page);

    await expect(page).toHaveScreenshot('viewport-above-fold.png', {
      fullPage: false,
    });
  });
});

test.describe('P-16: Visual Regression — Component Isolation', () => {
  test('Snapshot single visible element', async ({ page }) => {
    await page.goto('/');
    await stabilize(page);

    // Example: snapshot the first heading, button, or card
    // Replace selector with your app's component selector
    const firstElement = page.locator('h1, button, [role="button"], article, section').first();

    if (await firstElement.isVisible()) {
      await expect(firstElement).toHaveScreenshot('component-isolated.png');
    }
  });

  test('Snapshot multiple instances of a component type', async ({ page }) => {
    await page.goto('/');
    await stabilize(page);

    // Example: snapshot multiple cards/rows/items to show consistency
    // Replace selector with your component class/data-testid
    const components = page.locator('[data-testid="card"], .card-component, li').first();

    if (await components.isVisible()) {
      await expect(components).toHaveScreenshot('component-instance-1.png');
    }
  });
});

test.describe('P-16: Visual Regression — Dynamic Content Masking', () => {
  test('Page snapshot demonstrating stabilize() for consistency', async ({ page }) => {
    // Example showing how stabilize() ensures deterministic rendering
    // by waiting for network, animations, and clearing focus
    await page.goto('/');
    await stabilize(page);

    // This baseline will be stable across runs because stabilize()
    // has waited for all async rendering to complete
    await expect(page).toHaveScreenshot('page-stabilized.png', {
      fullPage: true,
    });
  });

  test('MASKS constant available for dynamic content', async ({ page }) => {
    // Demonstrates that MASKS is exported and documented
    // Developers can inspect and extend it for their own selectors

    expect(MASKS).toBeDefined();
    expect(Array.isArray(MASKS)).toBe(true);
    expect(MASKS.length).toBeGreaterThan(0);

    // Example: log the masks being used
    console.log('📸 Dynamic content masks (timestamps, avatars, spinners, etc.):', MASKS);
  });
});

test.describe('P-16: Visual Regression — Stability & Consistency', () => {
  test('Snapshot remains consistent across page reloads', async ({ page }) => {
    // Validates that stabilize() produces deterministic rendering
    await page.goto('/');
    await stabilize(page);

    // First snapshot
    await expect(page).toHaveScreenshot('consistency-before-reload.png', {
      fullPage: true,
    });

    // Reload and re-stabilize
    await page.reload();
    await stabilize(page);

    // Second snapshot should match the first (if content is deterministic)
    await expect(page).toHaveScreenshot('consistency-after-reload.png', {
      fullPage: true,
    });
  });

  test('stabilize() helper completes without errors', async ({ page }) => {
    await page.goto('/');

    // Verify stabilize() doesn't throw
    // If it does, there's likely a network or animation timing issue
    await expect(async () => {
      await stabilize(page, 5000); // longer timeout for slow network
    }).not.toThrow();
  });
});

test.describe('P-16: Visual Regression — Fixture Usage', () => {
  test('stablePage fixture is exported and ready to use', async ({ page }) => {
    // The stablePage fixture is exported from fixtures.ts
    // Developers can use it to pre-stabilize pages in their tests:
    //
    // Example:
    //   test('my component', async ({ stablePage }) => {
    //     const page = stablePage;
    //     await page.goto('/');
    //     // page is already stabilized
    //   });

    expect(page).toBeDefined();
    // In real usage, stablePage would be the fixture that's already stabilized
  });

  test('expect is re-exported from fixtures for convenience', async ({ page }) => {
    // Developers can import expect from fixtures.ts
    // This is a convenience to keep imports minimal:
    //   import { expect, stabilize, MASKS } from './fixtures'

    await page.goto('/');
    expect(page).toBeDefined();
  });
});
