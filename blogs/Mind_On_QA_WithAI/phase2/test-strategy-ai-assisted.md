# PeakAndPack Test Strategy (Manual + AI)

**Phase:** 2, Approach B, Manual + AI
**Based on:** `peakandpack-requirements.md` (Phase 1), refined with Claude
**Author:** RN, with Claude assistance

---

## Scope

The same scope as `test-strategy-manual.md`: all six PeakAndPack feature areas (products, cart, checkout, auth, orders, search), prioritised by business risk. This version was stress-tested against a second opinion before being finalised, so the risk ranking and test types below include a few areas the first manual pass did not surface (injection risk in query parameters, token expiry behaviour, and concurrent cart modification).

## Risk ranking by feature area

| Rank | Area | Why it's risky |
|---|---|---|
| 1 | Checkout / discount logic | Silent pricing errors at scale |
| 2 | Auth / orders visibility | Data leak risk between users |
| 3 | Cart totals + concurrency | Wrong totals, or race conditions on simultaneous edits |
| 4 | Product listing / search | Includes injection risk in sort/search params |
| 5 | Sort order | Cosmetic only |

## Test types planned

The same test types as the manual version, plus two added during the refinement pass:

- **Functional**: each feature area exercised for happy path, negative, and edge behaviour.
- **Security spot-check**: sort/search parameters tested against basic injection strings.
- **Session boundary**: behaviour immediately after token expiry (the 24-hour window).
- **Concurrency**: two requests modifying the same cart at once.

## Entry / exit criteria

Unchanged from `test-strategy-manual.md`.

## Review note

This is AI-assisted, not AI-authored. Every addition above was evaluated against the actual Phase 1 requirements doc before being kept, not accepted automatically.
