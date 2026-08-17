import { test, expect } from '@playwright/test';

/*
 * PeakAndPack - Visual regression suite
 * Phase 4, Automated approach. Deliverable referenced from
 * 04-phase4-automated.html.
 *
 * How it works: each test captures a screenshot and compares it to a
 * stored baseline. The first run (with --update-snapshots) creates the
 * baselines; every run after that fails if the page drifts beyond the
 * pixel tolerance.
 *
 * baseURL is set in playwright.config.ts to:
 *   https://peakandpack-ui.onrender.com/
 * so page.goto('/') lands on the live PeakAndPack UI.
 *
 * Note on baselines: a baseline captured while a bug is on screen
 * treats that bug as "correct". The empty-name and negative-price checks
 * below are written so that FIXING the bug changes the pixels and makes
 * the test fail, prompting a re-baseline. That is intentional: it tells
 * you the moment a known-bad state changes.
 *
 * A third suspected bug, a large price ($9,999.99) overflowing its card
 * at mobile width, was checked against the live UI at 375px and does not
 * reproduce: it renders fully on one line. No test for it here.
 */

const TOLERANCE = { maxDiffPixelRatio: 0.02 }; // 2% absorbs font-rendering noise

test.describe('Visual regression', () => {

  test('product listing page @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('product-listing.png', TOLERANCE);
  });

  test('product card with empty name (BUG-002) @high', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The empty-name product renders the literal fallback text "(no name)".
    const card = page.getByText('(no name)').locator('..');
    await expect(card).toHaveScreenshot('card-empty-name.png', TOLERANCE);
    // Baseline shows the blank title. When BUG-002 adds a fallback label,
    // the pixels change and this test fails on purpose, re-baseline then.
  });

  test('product card negative price (BUG-001) @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const card = page.getByText('Sleeping Bag').locator('..');
    await expect(card).toHaveScreenshot('card-negative-price.png', TOLERANCE);
    // Baseline captured WITH the red -$89.00 visible. Fixing BUG-001
    // changes the price text and correctly fails this test.
  });

  test('cart page layout @high', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('cart-page.png', TOLERANCE);
  });

  test('checkout page layout @high', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('checkout-page.png', TOLERANCE);
  });

});
