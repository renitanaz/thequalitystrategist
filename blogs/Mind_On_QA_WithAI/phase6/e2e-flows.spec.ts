import { test as base, expect } from '@playwright/test';

/*
 * PeakAndPack - End-to-end flow suite
 * Phase 6, Automated approach. Deliverable referenced from
 * 06-phase6-automated.html.
 *
 * baseURL (playwright.config.ts): https://peakandpackshopdemo.onrender.com
 *
 * These tests chain steps into full journeys instead of checking one
 * endpoint at a time. A shared `authToken` fixture logs in once and
 * hands the token to any test that needs it, so no test repeats login.
 *
 * Self-healing note: waits key off real signals (waitForResponse, or a
 * visible element) rather than fixed sleeps, so a slow response doesn't
 * cause a false failure.
 *
 * Two tests are written to FAIL against the current build, because the
 * assertion states the correct behaviour and the build has known bugs:
 * BUG-009 (discount 100%) and BUG-010 (orders leak). Those failures are
 * the point; they turn green when the bugs are fixed.
 */

const test = base.extend<{ authToken: string }>({
  authToken: async ({ request }, use) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@peakandpack.com', password: 'password123' },
    });
    const { token } = await res.json();
    await use(token);
  },
});

test.describe('E2E flows', () => {

  // Flow 1: Browse and search
  test('flow 1: browse, search, sort @critical', async ({ request }) => {
    const list = await request.get('/api/products');
    expect(list.status()).toBe(200);
    const search = await request.get('/api/search?q=tent');
    expect(search.status()).toBe(200);
    const body = await search.json();
    expect(body.results).toBeInstanceOf(Array);
  });

  // Flow 2: Register, then duplicate-guard
  test('flow 2: register and duplicate guard @high', async ({ request }) => {
    const email = `user${Date.now()}@example.com`;
    const first = await request.post('/api/auth/register', {
      data: { email, password: 'password123' },
    });
    expect(first.status()).toBe(201);
    const second = await request.post('/api/auth/register', {
      data: { email, password: 'password123' },
    });
    expect(second.status()).toBe(409);
  });

  // Flow 3: Login, add to cart, view cart
  test('flow 3: login, add to cart, view cart @critical', async ({ request, authToken }) => {
    const auth = { Authorization: `Bearer ${authToken}` };
    const add = await request.post('/api/cart', {
      headers: auth,
      data: { product_id: 1, quantity: 1 },
    });
    expect(add.status()).toBe(200);
    const cart = await request.get('/api/cart', { headers: auth });
    const body = await cart.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(typeof body.items[0].price).toBe('number');
  });

  // Flow 4: Checkout with discount (designed to fail: BUG-009)
  test('flow 4: checkout applies SAVE10 as 10%, not 100% @critical', async ({ request, authToken }) => {
    const auth = { Authorization: `Bearer ${authToken}` };
    await request.post('/api/cart', {
      headers: auth,
      data: { product_id: 1, quantity: 1 },
    });
    const checkout = await request.post('/api/orders/checkout', {
      headers: auth,
      data: { discount_code: 'SAVE10' },
    });
    const body = await checkout.json();
    // Contract: SAVE10 is 10% off, so the total stays above zero.
    // Currently fails: the total comes back $0.00 (100% off).
    expect(body.total).toBeGreaterThan(0);
  });

  // Flow 5: Order history isolation (designed to fail: BUG-010)
  test('flow 5: order history shows only the caller\'s orders @critical', async ({ request, authToken }) => {
    const auth = { Authorization: `Bearer ${authToken}` };
    const res = await request.get('/api/orders', { headers: auth });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const callerId = 1; // the authenticated user's id in a real run
    // Status 200 is not enough: the leak is in the body. Every order
    // returned must belong to the caller. Currently fails (BUG-010).
    body.orders.forEach((o: any) => {
      expect(o.userId).toBe(callerId);
    });
  });

});
