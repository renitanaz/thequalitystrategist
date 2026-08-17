# PeakAndPack Bug Detection Report

**Phase:** 7 (Bug Detection)
**Generated from:** Playwright CI output (Phases 3–6), visual diffs (Phase 4), API contract tests (Phase 5)
**Author:** RN
**Date:** Phase 7

---

## Summary

7 of the 11 bugs seeded intentionally in the PeakAndPack build were detected across the four testing phases run so far: 2 Critical, 3 High, 1 Medium, 1 Low. The remaining four (BUG-004 through BUG-007) are API/data-layer issues with no visible UI symptom, none of the four testing approaches used in Phases 3 to 6 happened to target them, see the note at the end of this report.

---

## BUG-009: SAVE10 applies 100% off instead of 10%

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

## BUG-010: Orders endpoint returns all users' order histories

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

## BUG-008: No stock check before checkout

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

## BUG-011: GET /api/search returns 500 and leaks stack trace when q param is missing

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

## BUG-001: Negative price renders as "-$89.00" on product card

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

## BUG-002: Product card renders blank title when name field is empty

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

## BUG-003: Price set at $9,999.99, no upper bound validation

**Severity:** Low
**Steps to reproduce:**
1. Open the product listing page
2. Find "Insulated Water Bottle," priced at $9,999.99

**Expected:** Product prices are validated against a sane upper bound before they reach the catalog.
**Actual:** The price renders correctly on the card, this is not a display defect, the underlying data value itself is the problem: no validation stopped an absurd price from being seeded.
**Evidence:** `visual-testing-checklist.md` (Manual), confirmed independently by `visual-review-output.md` (AI Agent).
**First surfaced:** Phase 4, visual checklist
**Production cost:** Low likelihood of customer impact on its own, but the same missing validation is the general case behind BUG-004 (no price validation on the products endpoint); this is one instance of that broader gap made visible.

**Ruled out alongside this:** both Manual+AI and Automated initially flagged this same price as *overflowing or clipping its card* below ~400px viewport width. Manual and AI Agent both checked the same product at 375px and found it renders fully on one line, no clipping, re-verified directly against the live UI for this report. The overflow claim was corrected in `visual-testing-ai-assisted.md` and the assertion was removed from `visual.spec.ts`. Two of four approaches produced a false positive on the *display* symptom while all four correctly agreed on the *data* problem, a reminder that a screenshot-based finding is a lead, not a verdict, until it's confirmed against the live app.

---

## Detection analysis

| Bug | Severity | First caught in | Approach that catches it |
|---|---|---|---|
| BUG-009 (discount) | Critical | Phase 3 | All four |
| BUG-010 (orders leak) | Critical | Phase 5 | Manual (body read), Automated, AI Agent |
| BUG-008 (stock check) | High | Phase 3 | All four |
| BUG-011 (search 500) | High | Phase 5 | All four |
| BUG-001 (negative price) | High | Phase 4 | Manual, Manual+AI, Automated (visual), AI Agent |
| BUG-002 (blank title) | Medium | Phase 4 | Manual, Manual+AI, Automated (visual), AI Agent |
| BUG-003 (price $9,999.99) | Low | Phase 4 | Manual, AI Agent |

### Key observation

The two most expensive bugs to reach production (BUG-009 and BUG-010: revenue loss and data privacy) were catchable in Phase 3 and Phase 5 respectively, long before any user sees the UI. The visual bugs (BUG-001, 002, 003) required Phase 4's screenshot-based approach to surface formally. BUG-010 specifically requires reading the response body; a status-code-only check would have passed it.

### Not caught in this pass

BUG-004 (no price validation on the products endpoint), BUG-005 (no default sort), BUG-006 (registration accepts an empty name field), and BUG-007 (cart total trusts client-side prices) were all seeded in the app and named as known risks back in the Phase 1 requirements, but none of the four testing approaches run in Phases 3 through 6 produced a confirmed finding for them. All four are API/data-layer issues without a UI symptom, which is likely why the UI-focused passes (Manual, Manual+AI, AI Agent screenshot review) missed them, and the automated suite never had a spec written against those specific endpoints. A useful, honest result: four different testing approaches, run across six phases, still left a real gap. Closing it would take a pass specifically aimed at request-level validation on the products and cart endpoints.
