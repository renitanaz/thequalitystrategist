import { test, expect } from '@playwright/test';

/*
 * PeakAndPack - Checkout test suite
 * Phase 3, Automated approach. Worked example referenced from
 * 03-phase3-automated.html.
 *
 * Locators are self-healing: role-based selectors and data-testid,
 * never CSS classes, so a UI restyle does not break the suite. Only a
 * change to the actual button text or test id would.
 *
 * Two of these tests (TC-101, TC-104) are written to FAIL against the
 * current build. That is intentional: the Expected result is the
 * correct behaviour per the requirements, and the build has known bugs
 * (BUG-009, BUG-008). When those bugs are fixed, these tests turn green
 * on their own. Tags drive which suite each test runs in (see
 * README-strategy.md).
 */

test.describe('Checkout', () => {

  test('TC-101: checkout with valid discount @critical', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByPlaceholder('e.g. SAVE10').fill('SAVE10');
    await page.getByRole('button', { name: 'Place order' }).click();

    // SAVE10 should take 10% off. It currently takes 100% off (BUG-009),
    // so this assertion fails today and will pass once the bug is fixed.
    const total = await page.getByText(/Total charged/).textContent();
    expect(total).not.toContain('$0.00');
  });

  test('TC-102: checkout with empty cart @high', async ({ page }) => {
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();

    // No items: the order must be rejected, not created.
    await expect(page.getByText(/cart is empty/i)).toBeVisible();
    await expect(page.getByText(/order confirmed/i)).toHaveCount(0);
  });

  test('TC-103: checkout with invalid discount code @regression', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByPlaceholder('e.g. SAVE10').fill('FAKE99');
    await page.getByRole('button', { name: 'Place order' }).click();

    // An unknown code is ignored: the customer pays full price.
    await expect(page.getByText(/discount applied/i)).toHaveCount(0);
  });

  test('TC-104: checkout blocks out-of-stock item @high', async ({ page }) => {
    // Assumes a seeded product with stock = 0 and test id 'product-oos'.
    await page.goto('/');
    await page.getByTestId('product-oos').getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();

    // There is no stock check before checkout (BUG-008), so the order
    // goes through today. This assertion fails until the check exists.
    await expect(page.getByText(/out of stock/i)).toBeVisible();
    await expect(page.getByText(/order confirmed/i)).toHaveCount(0);
  });

  test('TC-105: checkout happy path @critical', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });

  test('TC-109: server ignores client-supplied price @critical', async ({ page, request }) => {
    // Direct API check: a tampered price in the payload must be ignored.
    const res = await request.post('/api/checkout', {
      data: { items: [{ id: 1, qty: 1, price: 0.01 }] },
    });
    const body = await res.json();

    // The charged total must come from the server's own price, not 0.01.
    expect(body.totalCharged).not.toBe(0.01);
  });

});
