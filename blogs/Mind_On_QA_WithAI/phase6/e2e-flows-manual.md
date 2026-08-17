# PeakAndPack E2E Flow Results (Manual)

**Phase:** 6, Approach A, Manual, No AI
**UI:** https://peakandpack-ui.onrender.com/  |  **API:** https://peakandpackshopdemo.onrender.com
**Author:** RN

---

Each of the 5 core journeys walked end to end, step by step, recording actual versus expected at every step. Unlike the isolated endpoint checks in Phase 5, these are full sessions: the bugs show up as a real user would hit them.

## Flow 1: Browse and search

| Step | Action | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Open product list | Items load | Items load | PASS |
| 2 | Filter by category | Only matching items | Only matching items | PASS |
| 3 | Search "tent" | Matching results | Matching results | PASS |
| 4 | Search with empty box | Graceful empty state or 400 | Page errors (BUG-011 surfaces via UI) | FAIL |
| 5 | Sort by price | Ascending order | Correct | PASS |

## Flow 2: Register new user

| Step | Action | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Register new email | 201, token returned | 201, token | PASS |
| 2 | Register same email again | 409 conflict | 409 | PASS |

## Flow 3: Login, add to cart, view cart

| Step | Action | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Login | 200, token | 200, token | PASS |
| 2 | Add item to cart | Item added | Item added | PASS |
| 3 | View cart | Item shown at correct price | Correct | PASS |

## Flow 4: Checkout with discount code

| Step | Action | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Complete Flow 3 | Cart has one item | OK | PASS |
| 2 | Apply SAVE10 | 10% off | 100% off, total becomes $0.00 | FAIL (BUG-009) |
| 3 | Submit checkout | Order created, correct charge | Order created at $0.00 | FAIL (BUG-009) |
| 4 | Cart clears after checkout | Cart empty | Cart empty | PASS |

## Flow 5: Order history

| Step | Action | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | View order history | The new order appears | Appears | PASS |
| 2 | Check whose orders show | Only this user's orders | Other users' orders visible too | FAIL (BUG-010) |

## Why walking the full flow matters

Phase 5 found these same issues as isolated endpoint responses. Walking the journey end to end changes what they mean:

**BUG-009 as a lived experience.** A customer adds a backpack, types a promo code, and the total drops to zero. In Phase 5 this was "the checkout response total field is wrong." Here it is "the store gives its products away." Same bug, but the flow makes the business impact impossible to miss.

**BUG-010 across the session.** Logging in as one user and opening order history reveals other people's purchases. As an isolated endpoint it read as a 200 with unexpected rows; as a flow, it is a privacy incident a real user would notice and screenshot.

**BUG-011 through the UI.** The empty-search 500 from Phase 5 surfaces here as a broken-looking page mid-journey, connecting the backend fault to what the user actually sees.

## Notes

Flows 4 and 5 are where the known bugs surface end to end. The value of this approach is not finding new bugs, it is confirming how the known ones feel as a continuous experience, which is exactly what an isolated endpoint test cannot show.
