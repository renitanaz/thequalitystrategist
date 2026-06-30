# PeakAndPack Visual Testing (Manual + AI)

**Phase:** 4, Approach B, Manual + AI
**Live UI:** https://peakandpack-ui.onrender.com/
**Author:** RN, with Claude assistance

---

## How this was produced

Capture screenshots of the live UI, hand them to Claude for a second pass, then write up the confirmed issues as formal bug reports. Claude is good at catching small drift that familiarity has made invisible to you, and fast at turning a one-line finding into a structured report. You stay the judge of what is real: Claude works from the pixels in the screenshot, it cannot see intent, so anything it flags gets confirmed against the requirements before it counts.

## Issues confirmed (after review)

### BUG-010, blank product card title

**Severity:** Medium
**Where:** Product listing, any product with an empty name field
**Visible symptom:** The card renders with an empty title area, no fallback text, leaving a gap where the name should be.
**Expected:** A fallback label (for example the SKU or "Unnamed product") so the card never looks broken.
**Screenshot:** product-empty-name.png

### BUG-011, negative price displayed

**Severity:** High
**Where:** Product listing card
**Visible symptom:** Price renders as "-$89.00" in red. A customer sees the store offering to pay them.
**Expected:** A negative price should never reach the UI; the card should show a valid price or hide the product.
**Note:** The data-level cause overlaps with the pricing issues tracked in Phase 3; this entry is specifically the rendering symptom.
**Screenshot:** product-negative-price.png

### BUG-012, large price overflows at narrow widths

**Severity:** Low
**Where:** Product card price area, below roughly 400px viewport width
**Visible symptom:** A price like $9,999.99 clips or spills outside its container on mobile.
**Expected:** The price area wraps or scales so the full value stays readable.
**Screenshot:** product-price-overflow.png

## What the review pass added over the manual checklist

| Change | Why |
|---|---|
| Turned each checklist FAIL into a structured bug report | A stakeholder needs severity, location, symptom, and expected, not just a ticked box. |
| Caught the large-price overflow only visible on mobile | Easy to miss at desktop width; a fresh screenshot review at 375px surfaced it. |
| Separated visible symptom from root cause | "Shows -$89.00" (visual) versus "API returns a negative price" (data) are two findings, written for two audiences. |

## Review note

AI-assisted, not AI-authored. Every issue above was confirmed on the live UI before being written up. Claude drafted the report wording; the decision that each finding is real stayed with the human.
