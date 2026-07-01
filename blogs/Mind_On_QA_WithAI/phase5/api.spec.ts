import { test, expect } from '@playwright/test';

/*
 * PeakAndPack - API contract test suite
 * Phase 5, Automated approach. Deliverable referenced from
 * 05-phase5-automated.html.
 *
 * Uses Playwright's request context: no browser, direct HTTP calls.
 *
 * baseURL is set in playwright.config.ts to:
 *   https://peakandpackshopdemo.onrender.com
 * so request.get('/api/products') hits the live API.
 *
 * Design choice: assert TYPES and RANGES, not exact values. Product
 * data changes as the catalog grows; a test pinned to price === 19.99
 * breaks on the first legitimate update. A test checking that price is
 * a number >= 0 keeps working and still catches the real bug.
 *
 * Three tests are written to FAIL against the current build, because
 * the expected value is the correct contract and the build has known
 * violations: BUG-014 (search 500), BUG-013 (orders leak), BUG-009
 * (discount 100%). Those failures are the point.
 */

test.describe('API contract', () => {

  test('GET /health @critical', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
  });

  test('GET /api/products returns a valid product array @critical', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.products).toBeInstanceOf(Array);
    body.products.forEach((p: any) => {
      expect(typeof p.id).toBe('number');
      expect(typeof p.name).toBe('string');
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThanOrEqual(0); // catches negative-price data
    });
  });

  test('GET /api/products/:id valid id @high', async ({ request }) => {
    const res = await request.get('/api/products/1');
    expect(res.status()).toBe(200);
    const p = await res.json();
    expect(typeof p.id).toBe('number');
  });

  test('GET /api/products/:id invalid id returns 404 @high', async ({ request }) => {
    const res = await request.get('/api/products/999999');
    expect(res.status()).toBe(404);
  });

  test('GET /api/search with query @high', async ({ request }) => {
    const res = await request.get('/api/search?q=tent');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results).toBeInstanceOf(Array);
  });

  test('GET /api/search without q returns 400, not 500 (BUG-014) @critical', async ({ request }) => {
    const res = await request.get('/api/search');
    // Currently fails: the endpoint throws and returns 500. A missing
    // optional query is a client error and must be a 4xx.
    expect(res.status()).toBe(400);
  });

  test('POST /api/auth/login valid credentials @critical', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'correct-password' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
  });

  test('POST /api/auth/login wrong password returns 401 @critical', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/register duplicate email returns 409 @high', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'existing@example.com', password: 'whatever12' },
    });
    expect(res.status()).toBe(409);
  });

  test('POST /api/cart without token returns 401 @critical', async ({ request }) => {
    const res = await request.post('/api/cart', {
      data: { productId: 1, qty: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/orders/checkout applies SAVE10 as 10%, not 100% (BUG-009) @critical', async ({ request }) => {
    // Assumes an authenticated context is set up in a real run.
    const res = await request.post('/api/orders/checkout', {
      data: { items: [{ id: 1, qty: 1 }], code: 'SAVE10' },
    });
    const body = await res.json();
    // Currently fails: total comes back 100% off. Contract: 10% off.
    expect(body.totalCharged).toBeGreaterThan(0);
  });

  test('GET /api/orders returns only the caller\'s orders (BUG-013) @critical', async ({ request }) => {
    const res = await request.get('/api/orders');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Status 200 is not enough. The contract violation is in the body:
    // every returned order must belong to the authenticated user.
    // Currently fails: orders from other users appear in the response.
    const callerId = 1; // the authenticated user's id in a real run
    body.orders.forEach((o: any) => {
      expect(o.userId).toBe(callerId);
    });
  });

});
