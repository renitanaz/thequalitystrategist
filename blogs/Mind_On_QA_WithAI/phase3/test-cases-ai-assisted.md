# PeakAndPack Test Cases (Manual + AI)

**Phase:** 3, Approach B, Manual + AI
**Based on:** `peakandpack-requirements.md` (Phase 1), drafted with Claude, reviewed by RN
**Author:** RN, with Claude assistance

---

## How this differs from the manual set

Same format and scope as `test-cases-manual.md`, but the first draft came from Claude: paste the requirements per feature area, ask for happy/negative/edge cases, get a table back. The value is in the review pass that followed, not the drafting. Claude is fast and broad at generic edge cases (empty fields, negative numbers, missing params across every endpoint). It cannot know app-specific rules unless the requirements doc tells it, so those had to be added or corrected by hand.

## What the review pass changed

| Change | Why |
|---|---|
| Corrected the SAVE10 expectation to exactly 10 percent off | The draft assumed a generic discount. Only the requirements doc says SAVE10 is 10 percent, not 100. This is what makes TC-201 able to catch BUG-009. |
| Added the stock-check-before-checkout case | The draft had no concept of stock state; the requirements describe it, so the case was added by hand (TC-204). |
| Added the cross-user order access case | The draft tested order retrieval generically but never tested user A reading user B's order, the actual data-leak risk. |
| Removed nine duplicate generic cases | The draft produced near-identical empty-field cases for every endpoint; kept one representative each. |

---

## Test cases (after review)

### Checkout

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-201 | Checkout with valid discount | Add item, apply SAVE10, submit | Total reduced by exactly 10 percent | Critical |
| TC-202 | Checkout with empty cart | Submit checkout with no items | 400, no order created | High |
| TC-203 | Checkout with invalid code | Apply FAKE99, submit | Code ignored, full price charged | Medium |
| TC-204 | Checkout with out-of-stock item | Add item with stock 0, submit | Order rejected, stock checked first | High |
| TC-205 | Price tampering on checkout | Submit checkout with an altered price in the payload | Server ignores client price, uses its own | Critical |

### Auth

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-211 | Register valid | Register with valid email and password | 201, account created | Critical |
| TC-212 | Register no password | Register with password blank | 400, no account created | Critical |
| TC-213 | Login wrong password | Correct email, wrong password | 401, no session | Critical |
| TC-214 | Protected route logged out | Request orders with no session | 401 | Critical |
| TC-215 | Token after expiry | Use a token past its 24-hour window | 401, re-login required | High |

### Orders

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-221 | View own orders | Logged-in user views their orders | 200, only their orders | Critical |
| TC-222 | Cross-user order access | User A requests user B's order id | 403 or 404, never B's data | Critical |
| TC-223 | Order total correct | Open a multi-item order | Total matches amount charged | High |

### Cart

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-231 | Add item, total updates | Add one in-stock product | Item in cart, total correct | High |
| TC-232 | Negative quantity | Set quantity to -1 | Rejected, cart unchanged | High |
| TC-233 | Cart total accuracy | Add three different items | Total equals sum of line totals | Critical |

### Products, search, sort

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-241 | List products | Request the product list | 200, array of products | High |
| TC-242 | Search empty query | Submit a blank search | 400 or full list per spec, never 500 | High |
| TC-243 | Search special characters | Search with a quote or script tag | Handled safely, no injection, no crash | High |
| TC-244 | Sort invalid field | Sort by a non-existent field | Default or 400, no crash | Low |

---

## Review note

This is AI-assisted, not AI-authored. Every case above was checked against the Phase 1 requirements before being kept. The cases that matter most, TC-201 and TC-204, are exactly the ones the AI draft got generically wrong or omitted, which is the whole reason the human review pass exists.
