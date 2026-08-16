# D1 Triage Task: Test Scenarios

The task both implementations solve: given the console output of one failing Playwright test run against PeakAndPack, decide:

1. **Match**: which of the 11 known bugs (if any) this failure corresponds to
2. **Confidence**: how sure the classifier is
3. **Action**: `file-new`, `link-existing:<BUG-ID>`, or `flag-flaky-retry`

Six scenarios below. Five map to real, verified PeakAndPack bugs (confirmed live against `peakandpackshopdemo.onrender.com` during this site's Playwright series build). The sixth is deliberately novel, a failure that doesn't match anything in the 11-bug catalog, to see how each approach handles the case the lookup table was never built for.

---

## Scenario 1: Negative price assertion

```
Test: "product list has no negative prices"
Expected: products.every(p => p.price >= 0)
Actual: false. Failing item: { id: 4, name: "Sleeping Bag (-15C)", price: -89 }
```
**Ground truth:** BUG-001 (negative price on a product)

## Scenario 2: Discount total mismatch

```
Test: "SAVE10 reduces total by 10 percent"
Expected: total === 90.00 (on a $100 cart)
Actual: total === 0.00
```
**Ground truth:** BUG-009 (discount code applies 100% off, not 10%)

## Scenario 3: Search endpoint 500

```
Test: "empty search query returns 400, not a crash"
Expected: response.status === 400
Actual: response.status === 500, body: "Internal Server Error"
```
**Ground truth:** BUG-011 (missing search query crashes the server)

## Scenario 4: Cross-user order visibility

```
Test: "user A cannot see user B's orders"
Expected: orders.every(o => o.userId === currentUser.id)
Actual: response includes 14 orders across 3 different userIds
```
**Ground truth:** BUG-010 (orders endpoint returns every user's orders)

## Scenario 5: Empty product name

```
Test: "every product has a non-empty name"
Expected: products.every(p => p.name.length > 0)
Actual: false. Failing item: { id: 6, name: "", description: "Mystery item with no name" }
```
**Ground truth:** BUG-002 (product with an empty name)

## Scenario 6: Novel failure, not in the catalog

```
Test: "checkout completes within 3 seconds"
Expected: checkoutDuration < 3000
Actual: checkoutDuration === 11400 (11.4 seconds), no error thrown, order completed successfully
```
**Ground truth:** not in the 11-bug catalog. This is either a new, real performance bug, or a one-off caused by Render's free-tier cold start (the same cold-start behaviour documented in Phase 0 of the AI-Augmented QA series). A correct triage system should not force this into one of the 11 known buckets, and should not confidently guess which of the two explanations is true without more evidence.
