# PeakAndPack Test Cases (Manual)

**Phase:** 3, Approach A, Manual, No AI
**Based on:** `test-strategy-manual.md` (Phase 2) and `peakandpack-requirements.md` (Phase 1)
**Author:** RN

---

These test cases were written by hand, working through happy path, negative, and edge cases for each feature area. The riskiest areas from the Phase 2 risk ranking (Checkout, Auth/Orders) get the most coverage. TC-IDs are grouped by area in blocks of ten.

A handful of these are written to fail on purpose, because the expected result is the correct behaviour per the requirements, and the current build has known issues. Those are called out in the Notes column.

## Products (TC-001 to TC-010)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-001 | List all products | GET the product list with no filters | 200, array of products with id, name, price | High |
| TC-002 | Product has valid price | Inspect any product's price field | Price is a positive number, two decimal places | High |
| TC-003 | Single product by id | Request a product by a valid id | 200, the matching product object | Medium |
| TC-004 | Product by missing id | Request a product id that does not exist | 404, clear not-found message | Medium |
| TC-005 | Product price boundary | Inspect a product priced at exactly 0.00 | Either rejected at creation, or clearly marked free, never a silent negative total later | Medium |
| TC-006 | Special characters in name | View a product whose name has an apostrophe or accent | Renders correctly, no broken encoding | Low |

## Search and sort (TC-011 to TC-020)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-011 | Search by keyword | Search for a word in a product name | 200, only matching products returned | Medium |
| TC-012 | Search with no results | Search for a term that matches nothing | 200, empty list, not an error | Medium |
| TC-013 | Search with empty query | Submit search with a blank query | 400 or full list per spec, never a 500 | High |
| TC-014 | Search with special characters | Search using quotes, %, or a script tag | Handled safely, no injection, no crash | High |
| TC-015 | Sort by price ascending | Sort the list low to high | Products ordered by price ascending | Low |
| TC-016 | Sort by invalid field | Sort by a field that does not exist | Falls back to default or 400, never a crash | Low |

## Cart (TC-021 to TC-035)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-021 | Add item to cart | Add one in-stock product | Item in cart, total updates correctly | High |
| TC-022 | Add multiple quantities | Set quantity to 3 for one item | Line total is price times three | High |
| TC-023 | Remove item from cart | Remove an item from a cart with two items | Item gone, total recalculated | High |
| TC-024 | Update quantity to zero | Set an item's quantity to 0 | Item removed or rejected, never a zero-priced ghost line | Medium |
| TC-025 | Negative quantity | Set quantity to -1 | Rejected, cart unchanged | High |
| TC-026 | Very large quantity | Set quantity to 99999 | Handled or capped per spec, no overflow in total | Medium |
| TC-027 | Cart total accuracy | Add three different items | Cart total equals the sum of line totals | Critical |
| TC-028 | Cart persists in session | Add item, reload, check cart | Item still present for the same session | Medium |
| TC-029 | Empty cart total | View an empty cart | Total is 0.00, no error | Low |

## Auth (TC-036 to TC-050)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-036 | Register new user | Register with valid email and password | 201, account created | Critical |
| TC-037 | Register duplicate email | Register with an email already in use | 409 or clear error, no second account | High |
| TC-038 | Register with no password | Submit registration with password blank | 400, account not created | Critical |
| TC-039 | Register weak password | Submit a one-character password | Rejected per password policy in spec | High |
| TC-040 | Login valid credentials | Log in with a correct email and password | 200, session or token issued | Critical |
| TC-041 | Login wrong password | Log in with a correct email, wrong password | 401, no session issued | Critical |
| TC-042 | Login unknown email | Log in with an email never registered | 401, same generic error as wrong password | High |
| TC-043 | Access protected route logged out | Request order history with no session | 401, no data returned | Critical |
| TC-044 | Token after expiry | Use a token after its 24-hour window | 401, forces re-login | High |
| TC-045 | SQL-ish input in login | Enter a quote or SQL fragment in the email field | Treated as invalid input, no injection | High |

## Orders (TC-051 to TC-065)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-051 | View own orders | Logged-in user views their order history | 200, only that user's orders | Critical |
| TC-052 | Cannot view another user's order | User A requests user B's order by id | 403 or 404, never user B's data | Critical |
| TC-053 | Order appears after checkout | Complete a checkout, then view orders | The new order is listed | High |
| TC-054 | Empty order history | New user with no orders views history | 200, empty list, not an error | Low |
| TC-055 | Order shows correct total | Open an order placed with three items | Order total matches what was charged | High |

## Checkout (TC-101 to TC-115)

| TC-ID | Title | Steps | Expected | Priority | Notes |
|---|---|---|---|---|---|
| TC-101 | Checkout with valid discount | Add item, apply SAVE10, submit | Total reduced by 10 percent | Critical | Designed to fail: SAVE10 currently applies 100 percent off (BUG-009) |
| TC-102 | Checkout with empty cart | Submit checkout with no items | 400, no order created | High | |
| TC-103 | Checkout with invalid code | Apply code FAKE99, submit | Code ignored, full price charged | Medium | |
| TC-104 | Checkout with out-of-stock item | Add item with stock 0, submit | Order rejected, stock checked first | High | Designed to fail: there is no stock check before checkout (BUG-008) |
| TC-105 | Checkout happy path | Add in-stock item, no code, submit | 200, order created, correct total charged | Critical | |
| TC-106 | Discount on already-zero total | Apply SAVE10 to an empty-priced cart | No negative total, handled cleanly | Medium | |
| TC-107 | Double-apply discount | Apply SAVE10 twice in one checkout | Applied once only, not stacked | High | |
| TC-108 | Checkout while logged out | Submit checkout with no session | 401, no order created | High | |
| TC-109 | Price tampering | Submit checkout with a modified price in the payload | Server uses its own price, ignores the client value | Critical | |
| TC-110 | Concurrent checkout | Submit the same cart twice in quick succession | One order created, not two | High | |

---

## Coverage summary

| Area | Cases | Risk priority (Phase 2) |
|---|---|---|
| Checkout | 10 | 1 (Critical) |
| Auth | 10 | 2 (Critical) |
| Cart | 9 | 3 (High) |
| Orders | 5 | 2 (Critical) |
| Products | 6 | 4 (Medium) |
| Search / sort | 6 | 4 to 5 |

Total: 46 test cases. The two designed-to-fail cases (TC-101, TC-104) exist to catch BUG-009 and BUG-008 with a written, repeatable check, the same bugs the automated suite encodes in `checkout.spec.ts`.
