# PeakAndPack Automated Test Summary

**Generated from:** Playwright test suite (Phases 3–7)
**Command:** `npx playwright test --reporter=html`

---

## Results at a glance

| Metric | Value |
|---|---|
| Total tests | 37 |
| Passing | 31 |
| Failing | 6 |
| Suite duration | ~45 seconds |

---

## Failing tests (6 of the 11 planted bugs)

| Test | File | Bug ID | Severity |
|---|---|---|---|
| TC-101: checkout with valid discount | checkout.spec.ts | BUG-009 | Critical |
| TC-104: checkout blocks out-of-stock item | checkout.spec.ts | BUG-008 | High |
| product card with empty name | visual.spec.ts | BUG-002 | Medium |
| product card negative price | visual.spec.ts | BUG-001 | High |
| GET /api/orders returns only caller's orders | api.spec.ts | BUG-010 | Critical |
| GET /api/search without q returns 400 | api.spec.ts | BUG-011 | High |

A suspected large-price overflow (product card at mobile width) was checked at 375px and does not reproduce, no test for it here. BUG-003 (price set at $9,999.99) and BUG-004 through BUG-007 are not covered by this automated suite, they were confirmed or missed by other approaches, see `qa-programme-summary.md`.

---

## Passing coverage (31 tests)

Products, search, cart, authentication, orders, and checkout all have passing tests covering happy path and negative scenarios. Visual baselines captured for all key pages. API contract tests passing for all endpoints except the two failing above.

---

## When bugs are fixed

Each failing test is designed to turn green automatically when its corresponding bug is fixed. No test changes required. Run `npx playwright test` after each fix to verify.

---

## Full report

Open the Playwright HTML report for traces, screenshots, and full error details on each failing test: `npx playwright show-report`
