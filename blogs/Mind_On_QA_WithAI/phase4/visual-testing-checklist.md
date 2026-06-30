# PeakAndPack Visual Testing Checklist (Manual)

**Phase:** 4, Approach A, Manual, No AI
**Live UI:** https://peakandpack-ui.onrender.com/
**Author:** RN

---

Walk the live UI against this checklist, resizing the browser to mobile width (around 375px) for the responsive checks. Document every issue with a screenshot named to match its checklist row, so a reader can pair screenshot to finding without guessing.

## Product listing

| # | Check | Expected | Result | Screenshot |
|---|---|---|---|---|
| V-01 | Product with empty name | A fallback label, not a blank title area | FAIL: renders blank (BUG-010) | product-empty-name.png |
| V-02 | Negative price on a card | No negative price should ever display | FAIL: shows "-$89.00" in red (BUG-011) | product-negative-price.png |
| V-03 | Very large price ($9,999.99) at narrow width | Fits or wraps cleanly inside the price area | FAIL: overflows/clips below ~400px (BUG-012) | product-price-overflow.png |
| V-04 | Product image missing | A placeholder image or graceful gap | Confirm on live UI | product-missing-image.png |
| V-05 | Card grid alignment | Cards align to a consistent grid at all widths | Confirm | grid-alignment.png |

## Cart

| # | Check | Expected | Result | Screenshot |
|---|---|---|---|---|
| V-06 | Cart total updates on quantity change | Total updates immediately, no stale value | Confirm | cart-total-update.png |
| V-07 | Empty cart state | A clear "your cart is empty" message, not a blank panel | Confirm | cart-empty.png |
| V-08 | Long product name in a cart row | Truncates or wraps without breaking the row layout | Confirm | cart-long-name.png |

## Checkout

| # | Check | Expected | Result | Screenshot |
|---|---|---|---|---|
| V-09 | Discount field and applied total | Discount shows the reduced total clearly | Confirm (note: SAVE10 logic bug is BUG-009, backend) | checkout-discount.png |
| V-10 | Form field labels and focus states | Every field has a visible label and a visible focus outline | Confirm | checkout-focus.png |

## Responsive and accessibility

| # | Check | Expected | Result | Screenshot |
|---|---|---|---|---|
| V-11 | Mobile width (375px) layout | No horizontal scroll, nothing clipped | Confirm | mobile-layout.png |
| V-12 | Tab order and focus visibility | Every interactive element gets a visible focus outline when tabbed to | Confirm | focus-states.png |
| V-13 | Text contrast on key text | Price and button text meets readable contrast | Confirm | contrast-check.png |

---

## Notes

This checklist confirms how known issues actually look to a user. The negative price and empty name were already known from the Phase 1 requirements and Phase 3 test cases; here they get a visible face. "The API returns a negative price" and "the product card shows a red -$89.00" are the same root cause but two different deliverables, the second is the one a non-technical stakeholder reacts to.

The three visual bugs confirmed here are BUG-010 (blank name), BUG-011 (negative price display), and BUG-012 (large price overflow).
