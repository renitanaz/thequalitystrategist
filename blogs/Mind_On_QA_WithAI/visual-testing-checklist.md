# PeakAndPack Visual Testing Checklist

**Phase:** 4, Approach A, Manual, No AI
**Tested against:** Live UI at `https://peakandpack-ui.onrender.com`
**Author:** RN

---

## Checklist

| # | Check | Result | Screenshot |
|---|---|---|---|
| 1 | Product card layout, image, name, price, button all present and aligned | Pass | `01-product-cards.png` |
| 2 | Product with empty name shows a blank card title | Fail, confirmed | `02-empty-name.png` |
| 3 | Negative price shows as "-$89.00" on the product card | Fail, confirmed | `03-negative-price.png` |
| 4 | $9,999.99 price overflows its display area at narrow widths | Fail, confirmed at <400px | `04-price-overflow.png` |
| 5 | Cart total updates visually when quantity changes | Pass | `05-cart-update.png` |
| 6 | Checkout form layout holds together, fields usable | Pass | `06-checkout-form.png` |
| 7 | All buttons have a visible focus state when tabbed to | Pass | `07-focus-states.png` |
| 8 | Responsive behavior, resize to mobile width (375px) | Pass, no layout breaks observed | `08-mobile-view.png` |

## Summary

**Checked:** 8 items
**Passed:** 5
**Failed:** 3 (all three trace back to known data issues from Phase 1: empty name, negative price, extreme price value)

## Notes

Items 2, 3, and 4 are not new findings, they're the visible symptoms of bugs already known from the requirements doc. This checklist exists to document *how* they look on screen, which matters when explaining the issue to someone who won't read raw JSON.

The screenshots referenced above should live in a `screenshots/` folder alongside this file, named to match the table exactly.
