---
paths: ["tests/**/*.spec.ts"]
---

# Playwright conventions

Loaded only when Claude is editing a file matching tests/**/*.spec.ts,
not when it's touching the API code, the UI components, or anything else
in the repo. Task Statement 3.3: this is the reason a glob-scoped rule
file beats a directory-level CLAUDE.md here — PeakAndPack's tests aren't
confined to one directory, they sit wherever the flow they cover lives.

- Page objects live in tests/pages/, one class per page. No inline
  selectors in a spec file.
- Assertions use expect(), never a manual console.log plus an if-check.
- A test exercising a known bug ID names it in the describe block:
  describe("BUG-007: cart trusts client-supplied price", ...).
- Flaky-looking failures get a live-API check before being marked as a
  known issue, see d1-triage-agent.ts's check_live_api pattern.
