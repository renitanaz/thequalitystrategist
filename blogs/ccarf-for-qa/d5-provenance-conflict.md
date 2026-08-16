# Provenance and conflict: the BUG-011 case, done correctly

Task Statement 5.6. Post 01's live methodology check turned up a real
conflict: the bug catalog documents BUG-011 as `/api/search` with no
query returning a 500. A live check during that post's write-up
returned 200 with an empty result set instead. That is Task Statement
5.6's "conflicting statistics from credible sources," not a
hypothetical.

## What the workflow implementation did (wrong)

d1-triage-workflow.ts gets the catalog text in its one prompt and
returns a verdict in a single call. Faced with a failure resembling
BUG-011, it has no mechanism to check the live claim against the
catalog claim, it only has the catalog. It reports high confidence in
a value that has already stopped being accurate.

## What the agent implementation did (closer, not fully structured)

d1-triage-agent.ts's live check caught the discrepancy and downgraded
its own confidence. Correct instinct, but the final output shape has
only one `confidence` field and one `reasoning` string, it doesn't
structurally preserve both claims for a human to compare side by side.

## What 5.6 actually asks for

```json
{
  "claims": [
    {
      "source": "bug-catalog",
      "claim": "returns 500 on empty query",
      "asOf": "catalog compiled 2026-06-01, not re-verified since"
    },
    {
      "source": "live-api-check",
      "claim": "returns 200, empty results array",
      "asOf": "2026-08-16T09:14:00Z"
    }
  ],
  "conflictDetected": true,
  "recommendedAction": "escalate-to-human",
  "reasoning": "catalog and live observation disagree, not resolved by picking one"
}
```

Neither claim gets silently dropped. Neither gets arbitrarily picked
as "the real one" for being more recent or more authoritative-sounding.
Both are structurally present, each with its own source and timestamp,
and the conflict itself is a first-class field, not something a human
has to infer by noticing two numbers don't match.

## Why this matters more than it sounds like it would

A catalog entry that's silently wrong doesn't announce itself. The next
triage run, and the one after that, would keep trusting a stale claim
over what the system can currently observe, unless the disagreement is
structurally impossible to lose. That's the actual failure mode 5.6 is
written against: not "the agent doesn't know something," but "the
agent knew two things that disagreed and picked one without saying so."

## How to use it

No script to run. Change any structured-output schema that synthesizes
from more than one source (a catalog plus a live check, multiple
subagent reports) to carry a `claims` array with per-claim source and
timestamp, plus an explicit `conflictDetected` boolean, instead of
collapsing to a single value the moment two sources disagree.
