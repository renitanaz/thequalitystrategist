# Confidence calibration for triage verdicts

Task Statement 5.5. A triage agent reporting "94% accuracy" in
aggregate can still be systematically wrong on one entire category
while right on everything else, the guide's own warning about
aggregate metrics masking segment-level failures.

## Where an aggregate number hides a real problem

Split d1-triage-comparison.md's six scenarios by category instead of
treating them as one pool:

| Category | Scenarios | Agent correct |
|---|---|---|
| Clean catalog match, no live discrepancy | 4 | 4/4 |
| Live check contradicts catalog | 1 | 1/1, but only because it downgraded confidence instead of asserting |
| Not in catalog at all | 1 | 1/1 |

Six scenarios is too small a sample to prove anything statistically,
that's the point: a real system needs stratified sampling by category,
not just an overall pass rate, because six scenarios is exactly small
enough to make "100% correct" look identical to "got lucky on the one
hard case."

## Field-level confidence, not one verdict-level number

d1-triage-agent.ts currently returns a single confidence value
(high/medium/low) for the whole verdict. Task Statement 5.5 pushes
further: separate confidence per field.

```json
{
  "match": "BUG-011",
  "matchConfidence": "low",
  "liveReproductionConfidence": "high",
  "actionConfidence": "high"
}
```

The agent is highly confident the live check itself is accurate (it
directly observed the response), but only low-confidence that BUG-011
is still the right catalog entry to attach it to. Collapsing that into
one number loses a distinction a human reviewer actually needs.

## Routing

Route to human review when any field's confidence is low, not only
when the overall verdict is. A high-confidence action built on a
low-confidence match is still a bad verdict to auto-file without
review, even though the action itself (file-new) is obviously the
right shape once the match is in doubt.

## How to use it

No script to run. Change the verdict schema to report confidence per
field instead of one number, route to human review on any low field,
and when auditing accuracy, group results by category first (clean
match, live-discrepancy, no-catalog-match) before trusting one overall
percentage.
