<!--
  Intended location: scratchpad.md, wherever the investigating agent
  is running. Not committed to the repo, this is working memory for
  one session, not documentation.
-->

# Investigation scratchpad: checkout total drift

## Manifest (read this first on resume)
- Started: 2026-08-16T09:00:00Z
- Status: in progress, call sites mapped, root cause not yet confirmed
- Files touched by this investigation: src/cart/pricing.ts,
  src/checkout/total.ts, src/checkout/discounts.ts

## Call sites (verified, with line numbers)
- src/cart/pricing.ts:42: computeSubtotal(), sums line items
- src/checkout/total.ts:18: applyDiscount(), calls computeSubtotal()
  then subtracts discount.amount
- src/checkout/discounts.ts:7: SAVE10 hardcoded at 1.0 not 0.10, this
  is BUG-009 from the known catalog, already filed, not the drift

## What's confirmed
- Subtotal calculation matches expected values for 4 of 5 test
  fixtures.
- Fixture 5 (multi-item cart with a quantity discount) is off by
  exactly the tax amount, suggests tax is applied before the quantity
  discount instead of after.

## What's not yet confirmed
- Whether the tax-before-discount ordering is the actual regression or
  has always been the behavior, needs a git blame on
  src/checkout/total.ts:18 before concluding anything.

## Next step if resuming
Run git blame on total.ts, check whether the ordering changed in the
same commit the bug report references.
