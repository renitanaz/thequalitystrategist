# PeakAndPack API Contract Test Results (Manual)

**Phase:** 5, Approach A, Manual, No AI
**API base URL:** https://peakandpackshopdemo.onrender.com
**Author:** RN

---

Every endpoint hit by hand (Postman or curl), four scenarios where they apply: happy path, wrong input, unauthorized, not-found. Recorded below as endpoint, scenario, expected status, actual status, pass/fail. All paths are relative to the base URL above.

## Results

| # | Endpoint | Scenario | Expected | Actual | Pass |
|---|---|---|---|---|---|
| 1 | GET /health | service up | 200 | 200 | PASS |
| 2 | GET /api/products | list all | 200, array | 200, array | PASS |
| 3 | GET /api/products/:id | valid id | 200, product object | 200 | PASS |
| 4 | GET /api/products/:id | invalid id | 404 | 404 | PASS |
| 5 | GET /api/search?q=tent | valid query | 200, results | 200 | PASS |
| 6 | GET /api/search | missing q param | 400 | 500 | FAIL (BUG-014) |
| 7 | POST /api/auth/login | valid credentials | 200, token | 200 | PASS |
| 8 | POST /api/auth/login | wrong password | 401 | 401 | PASS |
| 9 | POST /api/auth/register | new email | 201 | 201 | PASS |
| 10 | POST /api/auth/register | duplicate email | 409 | 409 | PASS |
| 11 | POST /api/cart | with valid token | 200 | 200 | PASS |
| 12 | POST /api/cart | no token | 401 | 401 | PASS |
| 13 | POST /api/orders/checkout | valid, SAVE10 applied | 201, 10% off total | 201, 100% off (see note) | FAIL (BUG-009) |
| 14 | GET /api/orders | as logged-in user | only that user's orders | all users' orders returned | FAIL (BUG-013) |

## The three confirmed contract violations

**BUG-014, search crashes on missing query.** `GET /api/search` with no `q` parameter should return a 400 (bad request). Instead the endpoint throws and returns 500. A 500 is a server fault; a missing optional parameter is a client input problem and must be a 4xx. This is the clearest contract break in the sweep.

**BUG-013, orders endpoint leaks across users.** `GET /api/orders` should return only the authenticated user's orders. In testing, it returned orders belonging to other users. This is the most serious finding: a status code alone (200) looks fine, only inspecting the body reveals the data leak. A contract test that checks "200" passes here; a contract test that checks "every order in the response belongs to the caller" catches it.

**BUG-009, discount logic (carried from Phase 3).** `POST /api/orders/checkout` with SAVE10 should reduce the total by 10%. It reduces by 100%. Flagged in Phase 3 as a logic bug; it surfaces again here at the API contract level because the checkout response reflects the wrong total.

## Notes

Two of the failures (BUG-014 search, BUG-013 orders) were written down as *expected to fail before the sweep began*, based on the Phase 1 requirements and earlier phases. Recording the expected behaviour first is what makes each failure a confirmed contract violation rather than a surprise found after the fact. BUG-013 in particular is the reason a contract test must inspect the response body, not just its status code.
