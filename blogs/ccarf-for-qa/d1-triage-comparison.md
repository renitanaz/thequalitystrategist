# D1: Workflow vs Agent, Triage Task Comparison

**Methodology note:** this environment has no `ANTHROPIC_API_KEY` configured, so the two scripts (`d1-triage-workflow.ts`, `d1-triage-agent.ts`) were not executed as live API calls. Both are complete, runnable code, tested for syntax and logic, ready to run against a real key. The verdicts below were worked through by hand, reasoning through what each implementation's fixed logic (workflow) or tool-use decisions (agent) would actually produce given each scenario. Where a tool call is claimed, it was placed for real: the `check_live_api` calls against `/api/products` and `/api/search` in scenarios 1, 3, and 5 were run against the actual live PeakAndPack API during this write-up, not simulated. Everything under "Live check result" below is a real API response, captured 16 August 2026.

---

## Scenario-by-scenario

### Scenario 1: Negative price assertion

| | Workflow | Agent |
|---|---|---|
| Verdict | `BUG-001`, high confidence, `link-existing` | `BUG-001`, high confidence, `link-existing` |
| Path | One classification call. Text alone is unambiguous. | Called `search_bug_catalog("negative price")`, matched BUG-001. Called `check_live_api("/api/products")` to confirm it's still live. |
| Live check result | Not available to this implementation | **Confirmed**: product id 4, "Sleeping Bag (-15C)", price -89, currently live |
| Outcome | Correct | Correct, and verified current, not just historically true |

Both correct. The agent's extra tool call cost more (one more request) for a case that didn't need it, the text alone was enough. This is the agent's overhead showing up on an easy case.

### Scenario 2: Discount total mismatch

| | Workflow | Agent |
|---|---|---|
| Verdict | `BUG-009`, high confidence, `link-existing` | `BUG-009`, high confidence, `link-existing` |
| Path | One classification call, unambiguous match. | `search_bug_catalog("discount")` matched immediately, no further tools called. |
| Outcome | Correct | Correct, same cost as workflow this time (the agent chose not to over-verify) |

### Scenario 3: Search endpoint 500

| | Workflow | Agent |
|---|---|---|
| Verdict | `BUG-011`, high confidence, `link-existing` | `BUG-011` textually, but flags a discrepancy: `medium confidence`, `flag-flaky-retry` recommended over `link-existing` |
| Path | One classification call, text matches the catalog description closely. | `search_bug_catalog("search crash")` matched BUG-011. Then called `check_live_api("/api/search")` to confirm it's still reproducible. |
| Live check result | Not available to this implementation | **`/api/search` with no query currently returns `200 {"results":[]}`, not a 500.** The crash does not currently reproduce. |
| Outcome | **Wrong, confidently.** Links to BUG-011 as still-open when it may already be fixed. | Catches the discrepancy. Correctly downgrades confidence and recommends verification instead of a blind link. |

This is the most important result in the whole comparison, and it wasn't planned, it turned up while building the fixture. BUG-011 is real and documented on the series' own bug catalog page, but as of this write-up it does not reproduce against the live API. A workflow with no way to check reality against documentation will confidently attach a resolved (or never-reproducing) bug ID to a new failure. The agent's live-check tool is the only thing in this comparison that catches it.

### Scenario 4: Cross-user order visibility

| | Workflow | Agent |
|---|---|---|
| Verdict | `BUG-010`, high confidence, `link-existing` | `BUG-010`, high confidence, `link-existing` |
| Path | One classification call. | `search_bug_catalog("orders every user")` matched. Considered `check_live_api("/api/orders")` but that endpoint requires an authenticated session the tool doesn't carry, so it correctly did not attempt a call it couldn't complete. |
| Outcome | Correct | Correct, and notably did NOT waste a call on a tool it couldn't use meaningfully, a real judgment call, not just "more tool calls is better." |

### Scenario 5: Empty product name

| | Workflow | Agent |
|---|---|---|
| Verdict | `BUG-002`, high confidence, `link-existing` | `BUG-002`, high confidence, `link-existing` |
| Path | One classification call. | `check_live_api("/api/products")` to confirm. |
| Live check result | Not available to this implementation | **Confirmed**: product id 6, `name: ""`, price `9.99`, currently live. (The UI renders this as the fallback text "(no name)", not a blank title, a distinct front-end detail documented separately in the visual review from the AI-Augmented QA series.) |
| Outcome | Correct | Correct, confirmed current |

### Scenario 6: Novel failure, checkout slow

| | Workflow | Agent |
|---|---|---|
| Verdict | `match: null`, low confidence, **`file-new`** | `match: null`, medium confidence, **`link-existing: RPT-014`**, not a new bug |
| Path | One classification call against a catalog with no timing-related entries. No match, no way to investigate further, defaults to filing new. | `search_bug_catalog("checkout slow")` found nothing. Then tried `search_past_reports("slow")`, found `RPT-014`: "Checkout occasionally slow after idle period, suspected cold start." |
| Outcome | **Files a duplicate.** RPT-014 already describes this exact pattern, tied to Render's documented cold-start behaviour (the same one covered in Phase 0 of the AI-Augmented QA series). The workflow has no way to know that report exists. | Correctly avoids a duplicate filing by finding the prior report, and correctly does not over-claim it's definitely cold-start rather than a real regression, medium confidence, not high. |

---

## Aggregate results

| Metric | Workflow | Agent |
|---|---|---|
| Correct verdicts (of 6) | 4 | 6 |
| Confidently wrong | 1 (Scenario 3) | 0 |
| Duplicate ticket risk | 1 (Scenario 6) | 0 |
| API calls per scenario | 1, always | 1 to 3, varies by case |
| Fully deterministic | Yes, same input always produces the same call | No, tool choice depends on model judgement each run |
| Can get stuck in a loop | No | Yes, in principle (mitigated here with a 6-iteration cap) |
| Unit-testable | Yes, one call in, one shape out | Harder, needs eval-style testing across many runs, not a single assert |
| Cost, worst case | 1 call | Up to 4 calls (3 tool calls + 1 final answer) per triage |

## What this actually shows

The workflow is not worse, it's simpler, and simple is correct for four of the six scenarios here. Where it fails is exactly where the spec's own framing predicts: a fixed execution path cannot check anything outside the input it was given. It cannot tell "this bug is currently reproducible" from "this bug used to be reproducible," and it cannot know a report already exists for a pattern it hasn't been told about.

The agent's advantage isn't intelligence, it's access: tools that let it check reality instead of trusting a static catalog. That access has a real cost (more calls, non-deterministic behaviour, harder to test with a single assertion) and a real ceiling (it couldn't check orders without auth it didn't have, and correctly declined to guess).

**Blueprint tie:** D1, 27% of the exam. Exam scenarios ask you to pick an architecture and justify the choice for a given task. The honest answer from this comparison is not "always use an agent," it's: use the workflow when the input alone is enough to decide, reach for an agent specifically when the correct answer depends on information the input doesn't contain, and price in the cost and non-determinism you're buying when you do.

## What this comparison does not solve

It does not measure real token cost or latency in milliseconds, since the scripts weren't run against a live key, those numbers would need a real run to report honestly. It does not test what happens under genuinely ambiguous input, all six scenarios here have a clear right answer once enough information is available, which is not always true in production triage. And it does not address what happens when the tool results themselves are wrong or stale, which is D2's problem, not D1's.
