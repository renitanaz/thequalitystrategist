# PeakAndPack Test Cases (AI QA Agent)

**Phase:** 3, Approach D, AI QA Agent
**Generated from:** Live API scan at `https://peakandpackshopdemo.onrender.com`
**Reviewed by:** RN

---

## How this was generated

The agent called every known endpoint, inspected request/response shapes, and generated test cases automatically. Below is the output after human review, cases that were generic boilerplate with no grounding in actual observed behavior were removed.

```
  RAW AGENT OUTPUT          AFTER HUMAN REVIEW
  ─────────────────         ───────────────────
  19 cases generated   →    5 cases kept
                             │
                             ├─ 11 removed: generic "invalid input" templates
                             └─ 3 removed: duplicates of manual TC-001/TC-010

  KEPT (5)
  ████████████████████████  100% grounded in an observed live response,
                             not predicted or templated
```

## Agent-generated cases (kept after review)

| TC-ID | Title | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-A01 | GET /api/products returns valid array | Call endpoint, no params | 200, array of products | High |
| TC-A02 | Search with missing query param | GET /api/search with no ?q | 400 expected; agent observed 500 in live test | Critical |
| TC-A03 | GET /api/orders returns only requester's orders | Call as authenticated user | Agent observed all users' orders returned in live test | Critical |
| TC-A04 | Checkout with SAVE10 code | Apply code, observe total | Agent observed 100% discount applied in live test, expected 10% | Critical |
| TC-A05 | Product with negative price exists in catalog | GET /api/products, inspect prices | Agent observed a negative price value in live response | High |

## What makes TC-A02 through TC-A05 different from the manual/AI-assisted sets

These four aren't hypothetical edge cases, the agent observed the actual failure in a live API call during generation, not just described what could theoretically go wrong. That's the genuine advantage of this approach: grounded findings, not speculation.

## What was removed from the raw agent output

- 11 cases that were template variations of "test with invalid input" with no specific field or value named
- 3 cases that duplicated TC-001 and TC-010 from the manual set without adding anything

## Review note

4 of 5 kept cases above describe behavior the agent actually observed during its scan, not predicted. This is a meaningfully different and higher-confidence kind of test case than what's possible from reading a requirements doc alone, which is the actual value of this approach, not just its speed.
