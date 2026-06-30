# PeakAndPack Test Strategy (AI QA Agent)

**Phase:** 2, Approach D, AI QA Agent
**Generated from:** Live API data at `https://peakandpackshopdemo.onrender.com`
**Reviewed by:** RN

---

## How this was generated

The AI QA Agent (built later in this series) fetched live data from `/api/products`, `/api/cart`, `/api/orders`, and related endpoints, then generated the risk ranking and strategy outline below. This document is the agent's output after a human review pass, not the raw, unreviewed output.

## Agent-generated risk ranking

| Rank | Area | Agent's stated reasoning |
|---|---|---|
| 1 | Checkout | Observed a discount code path during data scan; flagged as high-impact if logic is wrong |
| 2 | Orders | Observed no per-user filter applied in a sample request; flagged as a possible data exposure risk |
| 3 | Cart | Observed price values passed in request payload; flagged as a possible trust boundary issue |
| 4 | Products | No anomalies observed in this pass |
| 5 | Auth | No anomalies observed in this pass |

## Review notes (human pass)

```
                    AGENT SAID            HUMAN REVIEW SAID
                    ──────────            ─────────────────
  Checkout          Highest risk    →     Confirmed  ✓
  Orders            High risk       →     Confirmed  ✓
  Cart              Medium risk     →     Kept as-is ✓
  Auth              Lowest risk     →     DISAGREE — moved to rank 2  ✗
```

The Auth disagreement is the one that matters most in this document. The agent's "no anomalies observed" reads like a clean bill of health, but it only means the single sample request it made didn't happen to trigger an auth problem. Absence of evidence in one scan is not evidence of absence, and treating it that way is exactly the kind of overconfidence the harness needs to guard against.

| Agent claim | Verdict |
|---|---|
| Checkout flagged as highest risk | Confirmed, matches manual and AI-assisted rankings independently |
| Orders flagged for missing per-user filter | Confirmed and significant, this matches a real issue surfaced later in Phase 7 |
| Cart flagged for client-supplied price | Worth tracking, kept in scope |
| Auth ranked lowest, "no anomalies observed" | Disagree. The agent's data scan wouldn't surface auth issues like missing input validation since those don't show up in a single sample request. Auth stays at medium priority, not lowest, in the final strategy. |

## Final strategy (after review)

| Rank | Area |
|---|---|
| 1 | Checkout |
| 2 | Auth / Orders visibility (combined, both data-exposure risks) |
| 3 | Cart |
| 4 | Products |
| 5 | Search / sort |

This differs from the raw agent output specifically on Auth's ranking, demonstrating why this document is labeled "reviewed," not "generated." An agent's confidence in what it didn't see can be misleading if treated as a finding.
