# Explicit criteria, not "be conservative"

Task Statement 4.1. The guide's own finding: vague instructions like
"be conservative" or "only report high-confidence findings" don't
improve precision compared to specific categorical criteria. Applied to
d1-triage-agent.ts's verdict.

## Vague, and why it doesn't work

> "Only flag a match if you're confident it's the same bug."

"Confident" isn't a criterion, it's a restatement of the problem. Two
runs of the same model can read this instruction and land on different
thresholds, because nothing in it says what confidence is actually
built from.

## Explicit, and what changes

> Flag a catalog match only when at least two of the following hold:
> the failing endpoint matches exactly, the error status code matches
> exactly, and the failure description shares a specific mechanism
> (not just a topic) with the catalog entry. A shared keyword alone
> ("price", "order") is not sufficient on its own.

This is checkable. A reviewer disagreeing with a verdict can point to
which of the three conditions the agent got wrong, instead of arguing
about what "confident" was supposed to mean.

## Applied to a real ambiguous case

"Order total looks wrong after applying a discount" could plausibly
match BUG-007 (cart trusts client-supplied price) or BUG-009 (SAVE10
applies 100% off). Both involve totals, both involve discount-adjacent
logic. Under the vague instruction, a model might average its
uncertainty into "medium confidence, BUG-007." Under the explicit
criteria, it has to check the specific mechanism, an unexpected TOTAL
value with no client-price manipulation in the request points at
BUG-009, not BUG-007, and report accordingly.

## How to use it

No script to run. Rewrite any prompt instruction that names a
confidence adjective ("be conservative," "only high-confidence")
into a checklist of specific, checkable conditions instead. If a
reviewer can't point to which condition failed when they disagree with
a verdict, the criteria aren't explicit enough yet.
