# PeakAndPack Test Strategy (AI QA Agent)

**Phase:** 2, Approach D, AI QA Agent
**Generated from:** `peakandpack-requirements.md` (Phase 1), nothing else built yet
**Reviewed by:** RN

---

## How this was generated

The QA Strategy Agent read the Phase 1 requirements doc and ranked test risk across two disciplines, web/functional and API, in a single pass. Nothing was built at this point, so the agent reasoned from the requirements alone, the same starting point a human strategist has on day one. This document is the agent's output after a human review pass, not the raw, unreviewed output.

## Agent-generated risk ranking

### Web and functional risk

| Rank | Area | Agent's stated reasoning |
|---|---|---|
| 1 | Checkout flow | Discount and total shown to the user must match the charge; a visible pricing error erodes trust instantly |
| 2 | Auth / order history screens | A user seeing another user's orders is a visible data leak |
| 3 | Cart | Quantity and total updates are the most interacted-with surface; wrong totals are obvious to users |
| 4 | Product browsing / search | Broken listings frustrate but don't risk money or data |
| 5 | Sort order | Cosmetic |

### API risk

| Rank | Area | Agent's stated reasoning |
|---|---|---|
| 1 | Checkout / discount logic | Server-side pricing errors lose money silently at scale |
| 2 | Orders endpoint | Missing a per-user filter would expose other users' data |
| 3 | Cart | If price is trusted from the request payload, it's a tamper risk |
| 4 | Auth | Input validation and token handling carry security weight |
| 5 | Products / search | Injection risk in query params worth a spot-check |

## Review notes (human pass)

```
                    AGENT SAID                 HUMAN REVIEW SAID
                    ──────────                 ─────────────────
  Checkout (both)   Highest risk         →     Confirmed  ✓
  Orders (API)      Rank 2               →     Confirmed  ✓
  Cart (both)       Mid risk             →     Kept as-is ✓
  Auth (API)        Rank 4               →     DISAGREE — raised to rank 2  ✗
```

The Auth disagreement is the one that matters most. The agent ranked Auth fourth on the API side because the requirements describe it in fewer words than checkout or orders. But fewer words in a spec doesn't mean lower risk, auth boundaries are exactly where a quiet mistake becomes a data leak. Length of description is not a proxy for risk, and treating it that way is the kind of shortcut the review pass exists to catch.

| Agent claim | Verdict |
|---|---|
| Checkout flagged highest risk on both lists | Confirmed, matches the manual and AI-assisted rankings independently |
| Orders flagged for a missing per-user filter | Confirmed and significant, matches a real issue surfaced later in Phase 7 |
| Cart flagged for client-supplied price | Worth tracking, kept in scope |
| Auth ranked low because the spec is short | Disagree. Auth is raised to rank 2 on the API side in the final strategy. |

## Final strategy (after review)

| Rank | Area | Covers |
|---|---|---|
| 1 | Checkout / discount logic | Web + API |
| 2 | Auth / orders visibility | Web + API |
| 3 | Cart totals | Web + API |
| 4 | Products / search | Web + API (incl. injection spot-check) |
| 5 | Sort order | Web |

This differs from the raw agent output specifically on Auth's API ranking, which is why this document is labeled "reviewed," not "generated." An agent's ranking by how much the spec happened to say can be misleading if treated as a finding.
