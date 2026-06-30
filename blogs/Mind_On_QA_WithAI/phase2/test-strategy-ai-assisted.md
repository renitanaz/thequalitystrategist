# PeakAndPack Test Strategy (Manual + AI)

**Phase:** 2, Approach B, Manual + AI
**Based on:** `peakandpack-requirements.md` (Phase 1), refined with Claude
**Author:** RN, with Claude assistance

---

## How this differs from the manual version

Same structure as `test-strategy-manual.md`, same scope, same exit criteria, but this draft was built by sharing the Phase 1 requirements doc with Claude and using its responses to catch gaps before finalizing.

## Prompts used

```
Here are the PeakAndPack requirements. What are the top 5 riskiest areas
to test and why?

What test types would you recommend for a trekking gear checkout flow
with a discount code?

What am I missing from this test strategy? [pasted manual draft]

Given PeakAndPack's feature areas (products, cart, checkout, auth,
orders), rank them by business risk if something broke there, which
would cause the most damage in production?
```

## What Claude added that the manual draft missed

| Gap Claude surfaced | Why it mattered |
|---|---|
| SQL injection risk in the `sort` query parameter | Manual draft only considered functional sort correctness, not injection risk |
| Token expiry behavior untested | Manual draft covered login/register but not what happens after the 24-hour token window |
| No test type for concurrent cart modification | Two requests modifying the same cart at once wasn't considered |

These three were added to the risk ranking and test type table below.

---

## Risk ranking by feature area (refined)

| Rank | Area | Why it's risky |
|---|---|---|
| 1 | Checkout / discount logic | Silent pricing errors at scale |
| 2 | Auth / orders visibility | Data leak risk between users |
| 3 | Cart totals + concurrency | Wrong totals, or race conditions on simultaneous edits |
| 4 | Product listing / search | Includes injection risk in sort/search params |
| 5 | Sort order | Cosmetic only |

## Test types planned (refined)

Same as the manual version, plus:
- **Security spot-check**: sort/search parameters tested against basic injection strings
- **Session boundary**: behavior immediately after token expiry

---

## Entry / exit criteria

Unchanged from `test-strategy-manual.md`.

## Review note

This is AI-assisted, not AI-authored. Every addition above was evaluated against the actual Phase 1 requirements doc before being kept, not accepted automatically.
