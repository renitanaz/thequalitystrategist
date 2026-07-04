# PeakAndPack Bug Detection Report

**Phase:** 7 — Bug Detection
**Generated from:** Playwright CI output (Phases 3–6), visual diffs (Phase 4), API contract tests (Phase 5)
**Author:** RN
**Date:** Phase 7

---

## Summary

7 bugs detected across all four testing phases. 2 Critical, 3 High, 1 Medium, 1 Low. All were planted intentionally in the PeakAndPack build at the start of this series. None reached the end of the testing pipeline undetected.

---

## BUG-009 — SAVE10 applies 100% off instead of 10%

**Severity:** Critical
**Steps to reproduce:**
1. Add any in-stock product to the cart via `POST /api/cart`
2. Submit checkout via `POST /api/orders/checkout` with body `{"discount_code":"SAVE10"}`
3. Read the `total` field in the response

**Expected:** Total is 90% of the cart value. A $100 cart becomes $90.00.
**Actual:** Total is $0.00. The entire cart value is discounted.
**Evidence:** TC-101 in `checkout.spec.ts`. API response: `{"total":0.00,"discountApplied":true}`
**First surfaced:** Phase 3, TC-101 (designed to fail)
**Production cost:** Every checkout using SAVE10 results in $0 revenue. At any volume, this is a critical revenue loss.

---

## BUG-013 — Orders endpoint returns all users' order histories

**Severity:** Critical
**Steps to reproduce:**
1. Log in as User A via `POST /api/auth/login`
2. `GET /api/orders` with User A's token in the Authorization header
3. Inspect the `userId` field on each returned order

**Expected:** Every returned order has `userId` matching User A's ID.
**Actual:** Orders belonging to other users appear in the response. User A can see User B's purchase history.
**Evidence:** Orders isolation test in `api.spec.ts` and `e2e-flows.spec.ts`. Multiple distinct `userId` values in the response body.
**Additional risk:** A malicious user could enumerate all customer order histories by iterating user IDs.
**First surfaced:** Phase 5, API contract test (designed to fail)
**Production cost:** Data privacy incident. In a regulated context, a reportable breach.

---

## BUG-008 — No stock check before checkout

**Severity:** High
**Steps to reproduce:**
1. Find a product with `stock = 0` in the database
2. Add it to cart via `POST /api/cart`
3. Submit checkout via `POST /api/orders/checkout`

**Expected:** 400, order rejected: "item out of stock".
**Actual:** 201, order created. The out-of-stock item is sold.
**Evidence:** TC-104 in `checkout.spec.ts` (designed to fail).
**First surfaced:** Phase 3, TC-104 (designed to fail)
**Production cost:** Oversold inventory. Fulfillment fails for the customer. Requires manual intervention and customer communication per incident.

---

## BUG-014 — GET /api/search returns 500 and leaks stack trace when q param is missing

**Severity:** High
**Steps to reproduce:**
1. `GET https://peakandpackshopdemo.onrender.com/api/search` (no `?q=` parameter)
2. Read the status code and response body

**Expected:** 400, validation error: "q parameter is required".
**Actual:** 500, unhandled exception. Response body contains a Node.js stack trace with internal file paths and line numbers.
**Two findings in one:** Wrong status code (server fault vs client input error) and internal implementation leaked to any caller.
**Evidence:** `api.spec.ts` search contract test. `curl -i` confirms HTTP/1.1 500 with stack trace in body.
**First surfaced:** Phase 5, API contract test (designed to fail); also surfaced via UI in Phase 6
**Production cost:** Broken search experience for users who submit an empty query. Internal architecture exposed to anyone who inspects the response.

---

## BUG-011 — Negative price renders as "-$89.00" on product card

**Severity:** High
**Steps to reproduce:**
1. Open the product listing page at `https://peakandpack-ui.onrender.com/`
2. Find the product card whose price field contains a negative value in the database

**Expected:** A valid positive price, or the product hidden/flagged pending data correction.
**Actual:** The price renders as "-$89.00" in red. The store appears to be paying customers to take the product.
**Evidence:** `visual.spec.ts` visual baseline diff. Screenshot: `card-negative-price.png`.
**First surfaced:** Phase 4, visual baseline diff
**Production cost:** Visible to all customers on the listing page. Undermines trust in store pricing.

---

## BUG-010 — Product card renders blank title when name field is empty

**Severity:** Medium
**Steps to reproduce:**
1. Open the product listing page
2. Find the product card whose name field is empty in the database

**Expected:** A fallback label (the product SKU, or "Unnamed product") so the card never appears with a visible gap.
**Actual:** The card renders with an empty title area. The gap is visually obvious.
**Note:** SKU-based fallback preferred over "Unnamed product" because the SKU is searchable in a support context.
**Evidence:** `visual.spec.ts` visual baseline diff. Screenshot: `card-empty-name.png`.
**First surfaced:** Phase 4, visual baseline diff
**Production cost:** Visible to customers. Cosmetic damage to store credibility.

---

## BUG-012 — Large price overflows product card container at mobile width

**Severity:** Low
**Steps to reproduce:**
1. Open the product listing page at 375px viewport width
2. Find the product priced at $9,999.99

**Expected:** The price wraps or scales to fit the card at all widths.
**Actual:** The price clips or overflows its container below roughly 400px. Part of the price string is hidden.
**Evidence:** `visual.spec.ts` mobile viewport visual test. Screenshot: `card-high-price-mobile.png`.
**First surfaced:** Phase 4, mobile visual test
**Production cost:** Affects only high-priced items on narrow screens. Low probability of customer impact. Edge case.

---

## Detection analysis

| Bug | Severity | First caught in | Approach that catches it |
|---|---|---|---|
| BUG-009 (discount) | Critical | Phase 3 | All four |
| BUG-013 (orders leak) | Critical | Phase 5 | Manual (body read), Automated, AI Agent |
| BUG-008 (stock check) | High | Phase 3 | All four |
| BUG-014 (search 500) | High | Phase 5 | All four |
| BUG-011 (negative price) | High | Phase 4 | Manual, Manual+AI, Automated (visual), AI Agent |
| BUG-010 (blank title) | Medium | Phase 4 | Manual, Manual+AI, Automated (visual), AI Agent |
| BUG-012 (overflow) | Low | Phase 4 | Manual (mobile only), Automated (mobile visual), AI Agent |

### Key observation

The two most expensive bugs to reach production (BUG-009 and BUG-013 — revenue loss and data privacy) were catchable in Phase 3 and Phase 5 respectively, long before any user sees the UI. The visual bugs (BUG-010, 011, 012) required Phase 4's screenshot-based approach to surface formally. BUG-013 specifically requires reading the response body — a status-code-only check would have passed it.
