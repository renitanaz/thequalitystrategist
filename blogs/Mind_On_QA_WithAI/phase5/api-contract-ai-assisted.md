# PeakAndPack API Contract Review (Manual + AI)

**Phase:** 5, Approach B, Manual + AI
**API base URL:** https://peakandpackshopdemo.onrender.com
**Author:** RN, with Claude assistance

---

## How this was produced

Call the endpoints (Postman or curl against the base URL above), then paste the real responses into Claude and ask what is wrong with each. This catches contract violations that are easy to miss when you are only checking "did it return 200," because the status code can be right while the body is wrong. You stay the judge: Claude reasons from the response text you paste, so every flag gets confirmed against the requirements before it counts.

## What Claude caught that a status-only check would miss

| Finding | Why a 200-only check misses it |
|---|---|
| Orders response contains other users' orders (BUG-013) | The status is 200, so a check that only asserts the status passes. Only reading the body reveals order records with different user ids. |
| Checkout total is 0.00 with SAVE10 (BUG-009) | The request succeeds (201), so status looks fine. The violation is in the total field: 100% off instead of 10%. |
| Search returns 500 on missing query (BUG-014) | This one a status check does catch, but Claude also noted the response body is an unstructured stack trace, itself a second issue (internal details leaking to the client). |

## Prompts used

The single prompt that did the work, run once per pasted response:

> Here is a real API response from PeakAndPack's [endpoint]. The requirements say it should [expected behaviour]. Tell me every way this response violates that contract: wrong status code, wrong or missing fields, wrong types, or data that should not be here. Be specific about which part of the response is wrong and why.

## Confirmed contract violations

**BUG-013, cross-user data exposure on GET /api/orders.** Severity: Critical. The response returned orders belonging to users other than the authenticated caller. Status 200 masks it; the body is where the leak shows. A contract test here must assert that every returned order's user id matches the caller.

**BUG-009, discount applies 100% instead of 10%.** Severity: Critical. Carried from Phase 3. The checkout response's total field reflects a full discount. The contract test asserts the charged total equals the pre-discount total times 0.9.

**BUG-014, GET /api/search returns 500 on missing query.** Severity: High. Should be a 400. Secondary issue Claude flagged: the 500 body exposes an internal stack trace, which should never reach a client.

## Review note

AI-assisted, not AI-authored. Every violation above was confirmed against the Phase 1 requirements and the actual response before being kept. Claude was fast at reading a JSON body and naming what was off; the decision that each finding is a real contract break stayed with the human.
