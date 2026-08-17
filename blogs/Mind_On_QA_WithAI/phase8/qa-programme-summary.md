# PeakAndPack QA Programme Summary

**Programme:** AI-Augmented QA Series, Series 1
**Application:** PeakAndPack — trekking and travel gear e-commerce
**Phases completed:** 1 through 8
**Author:** RN

---

## Programme scope

**In scope:** All five PeakAndPack feature areas — products (including search), cart, checkout, authentication, and orders. Functional testing, visual regression, API contract testing, and end-to-end flow testing across eight phases using four approaches.

**Out of scope:** Performance testing, security penetration testing, third-party payment provider integration, browser compatibility beyond Chromium, and accessibility testing.

---

## Approach summary

| Approach | Phases | Unique contribution |
|---|---|---|
| Manual, No AI | All | Ground truth. Human judgment on what matters. The baseline everything else is measured against. |
| Manual + AI | All | Speed on write-up. Gap detection on manual output. Richer business-impact language. Surfaced 2 findings the manual pass understated. |
| Automated, Playwright | 3, 4, 5, 6, 7 | Repeatable regression in seconds. Visual baseline comparison. CI-ready bug detection. 7 designed-to-fail tests that turn green automatically when bugs are fixed. |
| AI QA Agent | 2, 3, 4, 5, 6, 7, 8 | Scale at low effort. Strategy reasoning, test case generation, visual review, flow analysis, bug write-up, programme summary — all at agent speed with human review. |

---

## Full bug list

PeakAndPack was seeded with 11 bugs. This programme confirmed 7 of them.

| ID | Bug | Severity | First surfaced in |
|---|---|---|---|
| BUG-009 | SAVE10 discount code applies 100% off instead of 10% | Critical | Phase 3, TC-101 |
| BUG-010 | Orders endpoint returns all users' order histories | Critical | Phase 5, API contract test |
| BUG-008 | No stock check before checkout — out-of-stock items can be ordered | High | Phase 3, TC-104 |
| BUG-011 | GET /api/search returns 500 and leaks stack trace on missing query | High | Phase 5, API contract test |
| BUG-001 | Negative price displays as "-$89.00" on product card | High | Phase 4, visual baseline diff |
| BUG-002 | Product card renders blank title when name field is empty | Medium | Phase 4, visual baseline diff |
| BUG-003 | Price set at $9,999.99, no upper bound validation | Low | Phase 4, visual checklist |

A suspected eighth issue, BUG-003's price overflowing its card at mobile width, was flagged by two of the four approaches (Manual+AI, Automated) but ruled out after re-checking against the live UI at 375px, see `bug-detection-report.md`. The underlying data bug (BUG-003 itself) is real and included above; only the display/overflow symptom was a false positive.

**Not caught in this programme:** BUG-004 (no price validation on the products endpoint), BUG-005 (no default sort), BUG-006 (registration accepts an empty name field), BUG-007 (cart total trusts client-side prices). All four are API/data-layer issues with no UI symptom; none of the four testing approaches run in Phases 3 to 6 happened to target them. See `bug-detection-report.md` for the full account.

---

## Risk assessment

**Two bugs block release.**

BUG-009 means every checkout using the SAVE10 discount code results in $0 revenue. This is not a rare edge case — it applies to every promotional transaction. At any volume, this is an ongoing, direct financial loss that begins the moment the site goes live.

BUG-010 is a data privacy violation. Any authenticated user can read any other user's complete order history. A malicious caller could enumerate all customer purchases by iterating user IDs. In a consumer-facing application, this is the kind of incident that triggers regulatory scrutiny and customer trust loss that is very difficult to recover from.

The remaining five confirmed bugs range from High to Low. They are all worth fixing, but none carries the combination of likelihood and business impact that makes the two Critical findings unacceptable in a production release. The four uncaught bugs (BUG-004 through BUG-007) are unassessed risk, not cleared risk, until a dedicated API/data-layer pass targets them.

---

## Release recommendation

**Do not release to production** until BUG-009 and BUG-010 are resolved and verified.

Conditions for release:
1. BUG-009 fixed: SAVE10 applies 10% off. TC-101 in `checkout.spec.ts` turns green.
2. BUG-010 fixed: GET /api/orders returns only the authenticated user's orders. The orders isolation test in `api.spec.ts` and `e2e-flows.spec.ts` turns green.
3. Both fixes verified by running the automated test suite. No manual re-test required — the tests are already written.

BUG-008, BUG-001, and BUG-011 should be included in the same release cycle. BUG-002 and BUG-003 can follow in a subsequent release. BUG-004 through BUG-007 need a dedicated API/data-layer testing pass before they can be scheduled at all.

---

## Approach comparison

| Approach | Time per phase (approx) | Catches bugs a status-code check misses | Bugs it would have missed alone |
|---|---|---|---|
| Manual, No AI | ~3 hours | Yes (reads the body, not just the status) | None — but slowest to document |
| Manual + AI | ~1.5 hours | Yes | None — added 2 findings the manual understated |
| Automated, Playwright | ~2 hrs setup, ~60 secs to run | Yes (assertion checks the body) | Any bug not written into a test case |
| AI QA Agent | ~10 minutes | Yes (reads provided evidence) | Anything not in the evidence provided |

**The combination is the point.** Each approach found something the others were slower to find or would have understated. The four approaches together produce a result more reliable than any single approach alone.

---

## What the series demonstrated

Testing the same application eight times, four ways, confirmed three things that are easy to assert but hard to show without evidence:

**Earlier detection costs less.** BUG-009 and BUG-010 were catchable in Phase 3 and Phase 5 respectively — long before any user saw the UI. The cost of finding them there is a developer-hour. The cost of finding them in production is that plus incident response, customer communication, and trust recovery.

**A 200 status is not a pass.** BUG-010 returns HTTP 200. A test that only checks the status code passes it. A test that reads the response body catches it. This is the single most important habit the series teaches, and it applies equally to manual testers, automated tests, and AI agents.

**AI augments, it does not replace.** The AI approaches were faster at first drafts and good at gap detection. They were not reliable at severity judgment, release recommendation, or deciding whether a finding is real without human confirmation. The human review pass is not optional — it is what makes the output trustworthy.
