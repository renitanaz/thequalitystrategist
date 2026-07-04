# PeakAndPack E2E Flows (Manual + AI)

**Phase:** 6, Approach B, Manual + AI
**UI:** https://peakandpack-ui.onrender.com/  |  **API:** https://peakandpackshopdemo.onrender.com
**Author:** RN, with Claude assistance

---

## How this was produced

Run the 5 manual flows, capture the results even loosely, then hand them to Claude to do three things: find coverage gaps, formalize the loose notes into real scenarios with pass/fail criteria, and suggest edge-case flows not yet considered. Claude is fast at turning scattered notes into structured scenarios and good at naming journeys you didn't think of. You stay the judge: a suggested flow is a candidate to test, not a confirmed finding, until you walk it.

## Formalized scenarios (from the loose manual notes)

| ID | Scenario | Steps | Pass criteria |
|---|---|---|---|
| E2E-01 | Browse and search | Load list, filter, search, sort | Each step returns correct, ordered results; empty search does not error |
| E2E-02 | Register, duplicate guard | Register new email, then repeat | 201 then 409; no second account |
| E2E-03 | Login to populated cart | Login, add item, view cart | Item present at correct price |
| E2E-04 | Checkout with discount | Add item, apply SAVE10, submit | Total is 10% off, not 100%; cart clears |
| E2E-05 | Order history isolation | Checkout, then view history | New order present; only this user's orders visible |

## The gap this approach caught

**E2E-06, concurrent cart modification (new).** The 5 manual flows tested cart operations one at a time. Asking Claude "what could go wrong between the cart and checkout steps that I haven't tested" surfaced a journey none of the 5 covered: a second browser tab modifying the same cart while a checkout is in progress. This is not one of the known bugs; it is a legitimate coverage gap that single-threaded manual testing structurally cannot find, because one person clicking in sequence never creates the race.

| ID | Scenario | Steps | Pass criteria |
|---|---|---|---|
| E2E-06 | Concurrent cart edit | Start checkout in tab A; in tab B, change the same cart; complete checkout in tab A | Server resolves to one consistent order; no double charge, no lost item, no crash |

## Prompts used

The prompts that did the work, run against the pasted manual notes:

> I tested these 5 e-commerce flows and got these results. What did I miss? [paste results]
>
> Convert these informal notes into formal E2E test scenarios with explicit pass/fail criteria. [paste notes]
>
> What could go wrong between the cart and checkout steps that a single tester clicking in sequence would never hit?

## Review note

AI-assisted, not AI-authored. The five formalized scenarios are the manual run made rigorous. The sixth, concurrency, is a genuine Claude contribution, kept because it named a real structural gap, but marked as a candidate until it is actually walked and confirmed. Speed here is in the write-up, not the discovery.
