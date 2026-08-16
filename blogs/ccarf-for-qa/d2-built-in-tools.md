# Grep, Glob, and when Edit gives up

Task Statement 2.5, using D5's own scratchpad example
(`d5-scratchpad-template.md`'s checkout-drift investigation) as real
material instead of inventing a new one.

## Grep: finding callers

The scratchpad names `computeSubtotal()` as a function of interest.
Finding every place that calls it is a content search, Grep's job:

```
grep -rn "computeSubtotal(" src/
```

Not Glob, Glob matches file paths, not file contents, it would find
files named `computeSubtotal.ts` and miss every caller in unrelated
files.

## Glob: finding files by pattern

Confirming every test file that should exercise `d3-claude-md/rules/playwright-tests.md`'s
conventions is a path-matching job:

```
**/*.spec.ts
```

Not Grep, there's no content to search for yet, the question is which
files exist, not what's inside them.

## Read + Write, when Edit can't find a unique anchor

`src/checkout/discounts.ts:7`'s `SAVE10` constant, from the same
scratchpad, is a short numeric literal like `1.0`. If that exact string
appears more than once in the file (a second discount code also set to
`1.0`, say), `Edit`'s unique-text-match requirement fails, it can't
tell which occurrence to change.

The guide's documented fallback: `Read` the full file, construct the
corrected content with the surrounding context that makes the target
occurrence unique, `Write` the whole file back. Not a special case,
the standard recovery path when anchor text isn't unique.

## How to use it

No script to run. Default to Grep for "where is X used," Glob for
"which files match this pattern," and Edit for targeted single-anchor
changes, dropping to Read + Write only when Edit actually reports a
non-unique match, not preemptively.
