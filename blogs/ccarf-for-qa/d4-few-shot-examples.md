# Few-shot examples for the ambiguous cases, not the easy ones

Task Statement 4.2. Few-shot examples exist to demonstrate judgment on
genuinely ambiguous input, generalizing to novel cases, not to pad a
prompt with more instances of the obvious case the model already
handles correctly.

## Two examples worth including

```
Example 1:
Failure: "GET /api/search returns 500 with no query parameter"
Catalog: BUG-011, "missing search query crashes the server"
Reasoning: endpoint matches exactly, status code matches exactly,
mechanism matches exactly (missing param -> crash). High confidence.
Verdict: match BUG-011.

Example 2:
Failure: "GET /api/search?q= returns 500"
Catalog: BUG-011, "missing search query crashes the server"
Reasoning: endpoint matches, status matches, but the query parameter
IS present, just empty. That's a different mechanism than "missing
entirely." Live-check the endpoint before deciding this is the same
bug or a new one.
Verdict: check_live_api before answering, do not auto-match.
```

Example 1 is the easy case, included only for contrast. Example 2 is
the one doing real work: it shows the model that a surface-similar
failure ("basically no query") isn't automatically the same mechanism
as the catalog entry, and that the correct move is to gather one more
signal, not to average uncertainty into a medium-confidence guess.

## Why not more examples

The guide's own caution: five to eight examples covering minor
variations of the same case add token overhead without improving
anything, once the model has seen the reasoning pattern for one
genuinely hard case, adding three more near-duplicates doesn't teach
it anything new. Two or three well-chosen edge cases outperform a
longer list of similar ones.

## How to use it

No script to run. When writing few-shot examples for a triage or
classification prompt, pick cases where the "obvious" surface signal
(a shared keyword, a similar-looking endpoint) is actually misleading,
not cases where the right answer is already easy to reach.
