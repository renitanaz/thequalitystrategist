# D3: Iterative Refinement, Before and After

**Reference note:** this is a worked-through reasoning document, not a file Claude Code loads. It covers Task Statement 3.5, applied to the actual artifacts from Parts 1, 2, and 4 of this post, not a fresh example. None of them worked on the first pass.

---

## Concrete examples: `/triage-bug`'s output format (Part 2)

**First draft prompt** (prose only, no examples):

> Triage the failing test output below against PeakAndPack's known bug catalog. Summarize the failure clearly and say what to do next.

Run against three different failing tests, this produced three differently-shaped replies: one a paragraph, one a bulleted list, one a single sentence with no confidence stated at all. Nothing in the prose said what "clearly" meant, so each run interpreted it fresh.

**What fixed it** wasn't a longer instruction, it was showing the shape directly. The shipped version (`d3-triage-command.md`) replaces "summarize clearly" with an explicit reply contract: *"a matching bug ID and confidence, file-new, or flag-flaky-retry, one sentence of reasoning."* That's the concrete-example principle applied without a literal input/output pair, naming the exact output shape did the same job two examples would have, because the shape itself was the whole ambiguity.

## Interview pattern: a CLAUDE.md conflict case (Part 1)

Before `d3-claude-md/CLAUDE.md` and its path-scoped rules were finalized, the interview pattern surfaced a case that writing the rules alone hadn't:

**Question asked:** "If `.claude/rules/playwright-tests.md` says one thing about assertion style and the project CLAUDE.md says another, which one applies to a test file?"

**What this exposed:** nothing in the original draft answered this. Rules and CLAUDE.md were both being written as if they'd never disagree, an assumption that doesn't survive a real team where a rules file gets updated by someone who didn't re-read the whole CLAUDE.md first.

**Resolution added:** a line in CLAUDE.md stating that path-scoped rules take precedence for files they match, since they're more specific by construction, with CLAUDE.md's conventions as the fallback for anything a rule doesn't mention. This line didn't exist before the interview surfaced the gap.

## Test-driven iteration: the CI reviewer's prompt (Part 4)

`d3-ci-review.sh`'s prompt wasn't trusted after one clean run. It was shaped against three test PRs with pre-decided, known findings:

| Test PR | Known finding | Round 1 result | Round 2 result |
|---|---|---|---|
| Client-supplied price in cart total | Should flag (BUG-007 pattern) | Missed it | Caught, after the prompt named the pattern explicitly instead of "look for pricing bugs" |
| Refactor with no logic change | Should NOT flag | Flagged a false positive on renamed variables | Fixed by adding "do not flag naming or formatting changes" to the criteria |
| Stock check removed before order placement | Should flag (BUG-008 pattern) | Caught immediately | No change needed |

Two of the three findings only converged after a second round, sharing the specific miss or false positive with the model, not re-running the same prompt and hoping.

### Bundled versus sequential

The Round 1 to Round 2 fix for test PR 1 and test PR 2 went into a single message together, not two separate ones. They interacted: naming the BUG-007 pattern more explicitly (fixing the miss) risked making the prompt more trigger-happy overall (worsening the false positive), so both needed to be checked against each other in the same revision. A later, unrelated complaint about comment formatting in the PR body was fixed on its own, in a separate pass, since it didn't touch the same criteria.

## Blueprint tie

D3, 20% of the exam. Task Statement 3.5 isn't about any one artifact, it's the difference between shipping the first thing that ran without an error and shipping the thing that was actually checked against how it failed the first few times.

## What this reference does not solve

It doesn't cover refinement for the plan-vs-direct reasoning in Part 3, that artifact is a one-time worked comparison, not a prompt run repeatedly, so none of these three techniques apply to it the same way. It also doesn't measure how many rounds a real team should budget for, the CI reviewer here took two, a more ambiguous prompt could reasonably take more.
