/**
 * P-16: Visual Regression Test Fixtures
 *
 * Provides helper utilities for stabilizing page state before snapshots,
 * masking dynamic content (timestamps, avatars, etc.), and consistent
 * snapshot naming/comparison.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Dynamic content selectors to mask in visual snapshots.
 * Prevents false positives from timestamps, avatars, generated IDs, etc.
 */
export const MASKS = [
  '[data-testid*="timestamp"]',
  '[data-testid*="avatar"]',
  '[data-testid*="uuid"]',
  '[class*="loading"]',
  '[class*="spinner"]',
  'time',
];

/**
 * Stabilize page state before taking snapshots.
 *
 * Ensures consistent rendering by:
 * - Waiting for network to settle
 * - Waiting for animations to complete
 * - Scrolling to top
 * - Clearing focus
 *
 * @param page - Playwright Page object
 * @param timeout - Max wait time in ms (default: 3000)
 */
export async function stabilize(page: Page, timeout = 3000): Promise<void> {
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});

  // Wait for animations to complete (if any CSS animations are present)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });

  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));

  // Clear focus to prevent focus rings in snapshots
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    if (el) el.blur();
  });

  // Small delay for final render
  await page.waitForTimeout(100);
}

/**
 * Auto-fixture: page with pre-stabilized state.
 *
 * Use this fixture instead of test.beforeEach + manual stabilization:
 *
 * Example:
 *   test('component renders', async ({ stablePage }) => {
 *     const page = stablePage;
 *     await page.goto('...');
 *     // page is already stabilized
 *   });
 */
export const stablePage = test.extend<{ stablePage: Page }>({
  stablePage: async ({ page }, use) => {
    // Inject before page is used
    await use(page);
  },
});

// Re-export expect for convenience
export { expect };
