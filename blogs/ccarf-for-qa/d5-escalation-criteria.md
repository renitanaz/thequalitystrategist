# Escalation criteria for the triage agent

Task Statement 5.2: explicit criteria beat sentiment or self-reported
confidence, and honoring an explicit request beats attempting
resolution first. Applied to d1-triage-agent.ts's three-way verdict
(file-new / link-existing / flag-flaky-retry), adding a fourth option:
escalate-to-human.

## Escalate when

1. **The live check contradicts the catalog.** Exactly the BUG-011 case
   from Post 01: the catalog says this endpoint 500s with no query, the
   live check just returned 200 with an empty result set. That's not
   low confidence, it's a documented fact that has stopped being true,
   or a symptom this agent doesn't have the authority to reinterpret.
   A human decides whether to update the catalog or dig further.
2. **A developer's failing-test output explicitly asks for a human.**
   Comments like "not sure this is even the right bug" get honored
   immediately, not investigated first and escalated only if repeated.
   This is a QA context, not a customer-support one, there's no
   "acknowledge and offer to resolve" step to insert first.
3. **Two or more catalog entries partially match with similar
   confidence.** Never picked heuristically (e.g., "closest keyword
   match"). Escalate with both candidates named, let a human pick.
4. **Three tool calls in and still no verdict above "low" confidence.**
   Not a hard iteration cap (that's the anti-pattern from 1.1), a
   signal that the available tools genuinely can't resolve this one.

## Do not escalate on

- **Self-reported confidence alone.** The guide is explicit: an LLM's
  own confidence score is a poor proxy for actual case complexity. A
  "low confidence" self-report is a reason to gather one more signal
  first (a live check, a past-report search), not a reason to escalate
  by itself, unless it's still low after that signal.
- **Sentiment in the test output.** A frustrated code comment
  ("this is SO broken again") says nothing about whether the bug is
  hard to triage.

## Structured handoff, not a raw ping

```json
{
  "escalate": true,
  "reason": "live-catalog-contradiction",
  "catalogClaim": "BUG-011: missing search query crashes server, 500",
  "liveClaim": "/api/search with no query returns 200, empty results",
  "checkedAt": "2026-08-16T09:14:00Z",
  "recommendedAction": "verify BUG-011 is still accurate; if fixed, close the catalog entry"
}
```

A human reading this doesn't have to re-run the check themselves to
understand what's actually in question.
