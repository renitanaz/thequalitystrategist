# PeakAndPack Test Strategy (Manual)

**Phase:** 2, Approach A, Manual, No AI
**Based on:** `peakandpack-requirements.md` (Phase 1)
**Author:** RN

---

## Scope

This strategy covers all 5 feature areas defined in the Phase 1 requirements document: Products, Cart, Checkout, Auth, and Orders.

### In scope
- Functional correctness of all API endpoints
- Business logic correctness (pricing, discounts, stock checks)
- Authorization boundaries (users only seeing their own data)
- Input validation on all write operations

### Out of scope
- Load/performance testing beyond basic response-time spot checks
- Cross-browser visual testing (covered separately in Phase 4)
- Penetration testing or formal security audit

---

## Risk ranking by feature area

Ranked by potential business damage if something breaks in that area, not by how easy a bug would be to spot.

```
Checkout / discount      ████████████████████  Critical
Auth / orders visible    ██████████████████    Critical
Cart totals               ████████████         High
Product listing/search    ██████               Medium
Sort order                 ███                  Low
```

| Rank | Area | Why it's risky |
|---|---|---|
| 1 | Checkout / discount logic | A pricing bug here loses real money, silently, at scale |
| 2 | Auth / orders visibility | One user seeing another's orders is a data leak |
| 3 | Cart totals | Wrong totals erode trust even if the order itself completes |
| 4 | Product listing / search | Annoying if broken, but no money or data at stake |
| 5 | Sort order | Cosmetic, low-stakes nuisance |

---

## Test types planned

| Test type | Applies to |
|---|---|
| Functional (happy path) | All 5 areas |
| Negative (invalid input) | All 5 areas, especially Auth and Checkout |
| Edge case (boundary values) | Products (pricing), Cart (quantities) |
| Authorization | Orders, Cart (must require valid session) |
| API contract | All endpoints (status codes, response shape) |

---

## Entry criteria

Testing for a given feature area can begin once:
- The Phase 1 requirements doc has acceptance criteria written for that area
- The API endpoint is deployed and reachable (`/health` returns 200)

## Exit criteria

A feature area is considered adequately tested when:
- All planned happy-path, negative, and edge-case test types have at least one test case
- Every acceptance criterion in the requirements doc has a corresponding test case
- All Critical and High priority test cases have been executed at least once

---

## Notes

This strategy intentionally does not name specific bugs. At this stage (Phase 2), bugs haven't been systematically discovered yet, that's Phase 7's job. This document ranks risk by feature area so that later phases know where to look hardest, regardless of what's actually found there.
