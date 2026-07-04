# PeakAndPack Automated Test Summary

**Generated from:** Playwright test suite (Phases 3–7)
**Command:** `npx playwright test --reporter=html`

---

## Results at a glance

| Metric | Value |
|---|---|
| Total tests | 38 |
| Passing | 31 |
| Failing | 7 |
| Suite duration | ~45 seconds |

---

## Failing tests (the 7 planted bugs)

| Test | File | Bug ID | Severity |
|---|---|---|---|
| TC-101: checkout with valid discount | checkout.spec.ts | BUG-009 | Critical |
| TC-104: checkout blocks out-of-stock item | checkout.spec.ts | BUG-008 | High |
| product card with empty name | visual.spec.ts | BUG-010 | Medium |
| product card negative price | visual.spec.ts | BUG-011 | High |
| product card large price overflow at mobile | visual.spec.ts | BUG-012 | Low |
| GET /api/orders returns only caller's orders | api.spec.ts | BUG-013 | Critical |
| GET /api/search without q returns 400 | api.spec.ts | BUG-014 | High |

---

## Passing coverage (31 tests)

Products, search, cart, authentication, orders, and checkout all have passing tests covering happy path and negative scenarios. Visual baselines captured for all key pages. API contract tests passing for all endpoints except the two failing above.

---

## When bugs are fixed

Each failing test is designed to turn green automatically when its corresponding bug is fixed. No test changes required. Run `npx playwright test` after each fix to verify.

---

## Full report

Open the Playwright HTML report for traces, screenshots, and full error details on each failing test: `npx playwright show-report`
