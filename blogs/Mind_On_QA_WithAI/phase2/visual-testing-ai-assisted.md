# PeakAndPack Visual Testing (Manual + AI)

**Phase:** 4, Approach B, Manual + AI
**Based on:** Screenshots reviewed by Claude
**Author:** RN, with Claude assistance

---

## Prompts used

```
Here is a screenshot of the PeakAndPack product page. What visual issues
do you see?

Generate a visual testing checklist for an e-commerce product listing
page covering layout, typography, spacing, and data display.

Write a visual bug report for: product card shows negative price -$89.00
```

## Issues Claude flagged from screenshots

| Issue | Claude's note | Confirmed? |
|---|---|---|
| Negative price displayed in default text color, not visually distinct as an error | Suggested red/warning styling would make the bug more obvious to a real user, though the underlying bug is still the negative value itself | Confirmed, cosmetic observation, not a new bug |
| Empty product name leaves a noticeably blank line in the card header | Recommended a fallback like "Unnamed product" for cases like this | Confirmed, useful UX suggestion beyond just flagging the bug |
| Price overflow at narrow widths slightly clips the decimal portion of $9,999.99 | Flagged this would be easy to miss without testing at a specific breakpoint | Confirmed, this was caught faster than in the manual pass |

## Formal bug report (example, written by Claude, reviewed by RN)

**Bug:** Negative price displayed without visual error indication
**Severity:** Medium (visual/UX, not the root data bug, that's tracked separately)
**Steps to reproduce:** Load product list, locate Sleeping Bag (-15C)
**Expected:** Either the price shouldn't be negative (root cause, see BUG-001), or if displayed, it should be visually flagged as anomalous
**Actual:** Price renders as plain text "-$89.00" with no visual distinction from a normal price
**Business impact:** A real customer seeing this might think it's a glitch or a scam, harming trust even before they understand it's a data bug

## Your deliverable

This file: `visual-testing-ai-assisted.md`, combining the prompts used, what Claude flagged, and at least one formal bug report taken from a confirmed finding.

**Time:** ~45 minutes, most of it spent confirming Claude's flagged issues against the actual screenshots rather than writing from scratch.
