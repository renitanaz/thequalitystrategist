---
paths: ["reports/**/*.md"]
---

# Bug report conventions

Loaded only when Claude is editing a file under reports/, regardless of
which subdirectory. Same Task Statement 3.3 reasoning as the testing
rule: reports aren't grouped by feature area, a directory-level
CLAUDE.md would miss most of them.

- Every report needs repro steps, expected vs. actual, and a live-API
  check confirming the bug still reproduces today, not just at the time
  it was filed.
- Severity is Sev1 through Sev4, not high/medium/low. Sev1 is reserved
  for data leaks or financial miscalculation (BUG-007, BUG-009,
  BUG-010 are all Sev1 by this definition).
- Cite the specific endpoint and payload that triggered the failure.
  "Checkout is broken" is not a report.
