# PeakAndPack: CLAUDE.md
#
# Intended location: .claude/CLAUDE.md at the project root. Project-scoped,
# version-controlled, shared with every teammate who pulls this repo.
# Task Statement 3.1: this is deliberately NOT ~/.claude/CLAUDE.md. A
# user-level file would only apply to whoever wrote it, and a new team
# member cloning the repo would get none of this until someone noticed
# they weren't following it and traced it back to a missing project-level
# file.

@environment-facts.md

## Testing standards
- Playwright for E2E. One spec file per user flow, not per page.
- No hardcoded waits. Use Playwright's auto-waiting or an explicit
  expect().toBeVisible() poll.
- Every regression test references a bug ID from the known catalog
  (BUG-001 through BUG-011). Exploratory tests with no catalog match get
  tagged @exploratory instead of inventing an ID.

## Known bugs, check before filing
BUG-001 through BUG-011 are the canonical catalog. Full descriptions live
in the Series 1 intro page. Search it before treating a failure as new.

## Review criteria (for CI-invoked reviews, see d3-ci-review.sh)
Flag: broken assertions, missing awaits, hardcoded credentials, price or
currency handled as float instead of integer cents.
Do not flag: naming style, import order, arrow functions vs function
declarations.

# Note: rules/playwright-tests.md and rules/bug-reports.md are NOT
# imported here. They live in .claude/rules/ with path-scoped frontmatter
# (Task Statement 3.3), and Claude Code discovers them on its own,
# loading each only when a file matching its glob is open. @import is
# for content that should always load; path-scoped rules are the
# opposite case, importing them here would defeat the point of scoping
# them at all.

# Usage: place this file at .claude/CLAUDE.md, place environment-facts.md
# alongside it, and place rules/ under .claude/rules/. No further setup,
# Claude Code loads CLAUDE.md every session and discovers the rules
# files on its own. Run /memory inside Claude Code to confirm what
# actually loaded.
