import { test, expect } from '@playwright/test';

// Baseline screenshots live in snapshots/
// Run `npx playwright test --update-snapshots` once to create baselines,
// then every future run diffs against them.

test.describe('Visual regression', () => {

  test('product listing page visual', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('product-listing.png', {
      maxDiffPixelRatio: 0.02, // 2% tolerance, self-healing for minor rendering noise
    });
  });

  test('sleeping bag card shows negative price visually', async ({ page }) => {
    await page.goto('/');
    const card = page.getByText('Sleeping Bag').locator('..');
    await expect(card).toHaveScreenshot('sleeping-bag-card.png', {
      maxDiffPixelRatio: 0.02,
    });
    // This baseline was captured WITH the bug present.
    // Once BUG-001 is fixed, this test will correctly fail,
    // because the rendered card will no longer match the baseline.
  });

  test('mobile viewport, product grid does not break', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('product-listing-mobile.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('checkout form layout', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveScreenshot('checkout-form.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

});
