# A reviewer with no memory, reviewing more than one file at a time

Task Statement 4.6, and a direct extension of Post 02's Part 4
(`d3-ci-review.sh`), which already applies the session-isolation half
of this. What that post didn't cover: multi-file reviews.

## Self-review vs. independent review, restated

Post 02 already establishes the core point: a Claude session that
wrote a diff retains its own reasoning and is less likely to question
its own decisions than a fresh instance with no memory of writing it.
`d3-ci-review.sh` gets this right, it always runs as a new `claude -p`
invocation.

## What's new here: attention dilution across files

A single review pass across many files produces the failure mode 4.6
names directly: detailed feedback on some files, superficial comments
on others, and contradictory findings, flagging a pattern as
problematic in one file while approving identical code elsewhere in
the same pass, because attention thinned out across all fourteen files
at once, not because the reviewer changed its mind about the pattern.

## The fix: per-file passes, plus one integration pass

Applied to a PeakAndPack PR touching `src/checkout/total.ts`,
`src/cart/pricing.ts`, and `src/checkout/discounts.ts` together (the
same three files from D5's scratchpad investigation):

1. **Per-file pass**: review each file independently, in its own
   request, for local issues, a missing null check, an off-by-one, a
   hardcoded value. Consistent depth per file, since each review isn't
   competing for attention with thirteen others.
2. **Integration pass**: a separate request, given summaries from all
   three per-file passes, checks cross-file issues a local view can't
   see, does `total.ts`'s tax-then-discount ordering actually match
   what `discounts.ts` assumes about when it's called?

Two different questions, two different passes, neither diluted by the
other.

## How to use it

No script to run. When a single review pass produces inconsistent
depth or contradictory verdicts across files, split it: one request
per file for local issues, one additional request fed all the
per-file summaries for cross-file integration concerns.
