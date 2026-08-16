<!--
  Intended location: .claude/commands/triage-bug.md
  Task Statement 3.2: project-scoped, version-controlled. Every teammate
  who pulls this repo gets a working /triage-bug command with no setup,
  the same way they'd get any other file in the repo.

  Usage: in a Claude Code chat, type /triage-bug followed by the failing
  test's console output, pasted directly after the command. Everything
  after /triage-bug becomes $ARGUMENTS below.
-->

Triage the failing test output below against PeakAndPack's known bug
catalog (BUG-001 through BUG-011).

Failing test output:
$ARGUMENTS

Check the catalog first. If nothing matches, check whether the failure
still reproduces against the live API before treating it as new, the
catalog can be stale (see d1-triage-comparison.md for a case where it
was). Reply with a verdict: a matching bug ID and confidence, file-new,
or flag-flaky-retry, one sentence of reasoning.
