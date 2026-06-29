# PeakAndPack Test Cases (Manual)

**Phase:** 3, Approach A, Manual, No AI
**Based on:** `peakandpack-requirements.md` (Phase 1), `test-strategy-manual.md` (Phase 2)
**Author:** RN

---

## Coverage map

What's actually covered below, happy path (H), negative (N), edge case (E):

```
                 H    N    E
Products         X    X    .
Cart              X    X    .
Checkout          X    X    X
Auth              X    X    .
Orders            X    X    .
```

Checkout is the only area with an edge case in this sample set (TC-022). Products, Cart, Auth, and Orders are missing edge case coverage here, that's a real gap, not an oversight to ignore. The AI-assisted set (`test-cases-ai-assisted.md`) adds several of these edge cases back in.

---

## Format

`TC-ID | Title | Steps | Expected Result | Priority`

---

## Products

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-001 | List all products | GET /api/products | 200, array of products | High |
| TC-002 | Filter by category | GET /api/products?category=Trekking | 200, only Trekking items | Medium |
| TC-003 | Search with valid term | GET /api/products?search=tent | 200, matching items only | Medium |
| TC-004 | Search with no matches | GET /api/products?search=zzz | 200, empty array, not an error | Medium |
| TC-005 | Sort by price ascending | GET /api/products?sort=price_asc | 200, items ordered low to high | Low |
| TC-006 | Product with empty name | Request product list, inspect items | Should not silently allow blank name | High |

## Cart

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-010 | Add item to cart | Login, POST /api/cart with valid product_id | 200, item appears in cart | Critical |
| TC-011 | Add item without auth | POST /api/cart with no token | 401 Unauthorized | Critical |
| TC-012 | Cart total matches DB price | Add item, GET /api/cart | Total uses DB price, not client-supplied | Critical |
| TC-013 | Remove item from cart | Add item, then DELETE /api/cart/:id | 200, item no longer in cart | High |

## Checkout

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-020 | Checkout with valid discount | Add item, apply SAVE10, submit | Total reduced by 10% | Critical |
| TC-021 | Checkout with empty cart | Submit checkout, no items in cart | 400, no order created | High |
| TC-022 | Checkout with invalid code | Apply code "FAKE99", submit | Code ignored, full price charged | Medium |
| TC-023 | Checkout with out-of-stock item | Add item with stock=0, submit | Order rejected | High |

## Auth

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-030 | Register new user | POST /api/auth/register, new email | 201, token returned | Critical |
| TC-031 | Register duplicate email | Register same email twice | 409 Conflict on second attempt | Critical |
| TC-032 | Register with empty name | POST /api/auth/register, name: "" | Should be rejected, not silently accepted | High |
| TC-033 | Login with valid credentials | POST /api/auth/login, correct email/password | 200, token returned | Critical |
| TC-034 | Login with wrong password | POST /api/auth/login, wrong password | 401, no token | Critical |

## Orders

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-040 | View own order history | Login as user A, GET /api/orders | Only user A's orders returned | Critical |
| TC-041 | Cannot view other users' orders | Login as user A, inspect order list | No user B orders present | Critical |
| TC-042 | Order record completeness | Place an order, fetch it | Contains ID, total, status, timestamp | High |

---

## Summary

**Total test cases:** 23 across 5 feature areas (sample set; full suite targets 40-60).
**Priority breakdown:** 9 Critical, 9 High, 5 Medium/Low.

Several test cases above (TC-006, TC-012, TC-020, TC-023, TC-032, TC-040, TC-041) are written to fail against the current app. That's intentional, they're the cases that will surface known risk areas once Phase 7's bug detection runs.
