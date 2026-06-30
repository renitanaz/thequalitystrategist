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
 * treats that bug as "correct". The negative-price and overflow checks
 * below are written so that FIXING the bug changes the pixels and makes
 * the test fail, prompting a re-baseline. That is intentional: it tells
 * you the moment a known-bad state changes.
 */

const TOLERANCE = { maxDiffPixelRatio: 0.02 }; // 2% absorbs font-rendering noise

test.describe('Visual regression', () => {

  test('product listing page @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('product-listing.png', TOLERANCE);
  });

  test('product card with empty name (BUG-010) @high', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Pin to the card whose name is blank. Adjust the test id to match
    // the seeded product in your environment.
    const card = page.getByTestId('product-card-empty-name');
    await expect(card).toHaveScreenshot('card-empty-name.png', TOLERANCE);
    // Baseline shows the blank title. When BUG-010 adds a fallback label,
    // the pixels change and this test fails on purpose, re-baseline then.
  });

  test('product card negative price (BUG-011) @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const card = page.getByText('Sleeping Bag').locator('..');
    await expect(card).toHaveScreenshot('card-negative-price.png', TOLERANCE);
    // Baseline captured WITH the red -$89.00 visible. Fixing BUG-011
    // changes the price text and correctly fails this test.
  });

  test('product card large price overflow at mobile width (BUG-012) @high', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('product-card-high-price');
    await expect(card).toHaveScreenshot('card-high-price-mobile.png', TOLERANCE);
    // At 375px the $9,999.99 price clips today. A fix that wraps or
    // scales the price changes these pixels and flags for re-baseline.
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
