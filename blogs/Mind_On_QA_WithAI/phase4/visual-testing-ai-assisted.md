# PeakAndPack Visual Testing (Manual + AI)

**Phase:** 4, Approach B, Manual + AI
**Live UI:** https://peakandpack-ui.onrender.com/
**Author:** RN, with Claude assistance

---

## How this was produced

Capture screenshots of the live UI, hand them to Claude for a second pass, then write up the confirmed issues as formal bug reports. Claude is good at catching small drift that familiarity has made invisible to you, and fast at turning a one-line finding into a structured report. You stay the judge of what is real: Claude works from the pixels in the screenshot, it cannot see intent, so anything it flags gets confirmed against the requirements before it counts.

## Issues confirmed (after review)

### BUG-002, blank product card title

**Severity:** Medium
**Where:** Product listing, any product with an empty name field
**Visible symptom:** The card renders with an empty title area, no fallback text, leaving a gap where the name should be.
**Expected:** A fallback label (for example the SKU or "Unnamed product") so the card never looks broken.
**Screenshot:** product-empty-name.png

### BUG-001, negative price displayed

**Severity:** High
**Where:** Product listing card
**Visible symptom:** Price renders as "-$89.00" in red. A customer sees the store offering to pay them.
**Expected:** A negative price should never reach the UI; the card should show a valid price or hide the product.
**Note:** The data-level cause overlaps with the pricing issues tracked in Phase 3; this entry is specifically the rendering symptom.
**Screenshot:** product-negative-price.png

## Flagged, then ruled out

Claude's first pass over the mobile screenshot also flagged the $9,999.99 price ("large price overflows at narrow widths, below ~400px") as a possible bug. Re-checked against the live UI at 375px: it renders fully on one line, no clipping or wrapping. Not a real issue, dropped from the list below. Worth keeping as a reminder that a screenshot review is a second pair of eyes, not a verdict, anything it flags still needs confirming against the live app before it becomes a bug report.

## What the review pass added over the manual checklist

| Change | Why |
|---|---|
| Turned each checklist FAIL into a structured bug report | A stakeholder needs severity, location, symptom, and expected, not just a ticked box. |
| Ruled out a suspected large-price overflow after re-checking at 375px | A screenshot review can flag things that don't hold up; confirming against the live app caught it before it became a false bug report. |
| Separated visible symptom from root cause | "Shows -$89.00" (visual) versus "API returns a negative price" (data) are two findings, written for two audiences. |

## Review note

AI-assisted, not AI-authored. Every issue above was confirmed on the live UI before being written up. Claude drafted the report wording; the decision that each finding is real stayed with the human.
