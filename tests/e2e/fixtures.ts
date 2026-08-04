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
 * Auto-fixture: page with deterministic state for visual snapshots.
 *
 * Stabilizes page rendering by:
 * - Freezing time (page.clock.install) for consistent timestamps
 * - Waiting for fonts to load (document.fonts.ready)
 * - Seeding Math.random for deterministic dynamic content
 *
 * Use this fixture in visual regression tests:
 *
 * Example:
 *   test('component renders', async ({ stablePage }) => {
 *     await stablePage.goto('...');
 *     await stabilize(stablePage);
 *     await expect(stablePage).toHaveScreenshot('component.png');
 *   });
 */
export const stablePage = test.extend<{ stablePage: Page }>({
  stablePage: async ({ page }, use) => {
    // Freeze time for deterministic rendering
    await page.clock.install();

    // Wait for fonts to load (prevent layout shift from font swap)
    await page.evaluate(() => {
      if ('fonts' in document) {
        return (document as any).fonts.ready;
      }
      return Promise.resolve();
    });

    // Seed Math.random for deterministic content (UUIDs, animations, etc)
    await page.evaluate(() => {
      let seed = 12345;
      (window as any).crypto.getRandomValues = function (arr: any) {
        for (let i = 0; i < arr.length; i++) {
          seed = (seed * 9301 + 49297) % 233280;
          arr[i] = (seed / 233280) * 256;
        }
        return arr;
      };
      Math.random = function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    });

    // Use page with deterministic state
    await use(page);

    // Cleanup: uninstall clock
    await page.clock.runFor(0); // Flush pending timers
  },
});

// Re-export expect for convenience
export { expect };
