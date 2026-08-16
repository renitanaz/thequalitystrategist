# How many tools, and who chooses

Task Statement 2.3. Two separate decisions: how many tools does any
one agent see, and when does the caller pick a tool instead of leaving
it to the model.

## Why d1-coordinator-subagents.ts's split isn't arbitrary

`verify-reproduction` gets exactly one tool, `check_live_api`.
`find-related-reports` gets exactly two, `search_bug_catalog` and
`search_past_reports`. Neither gets all three.

The guide's own principle: an agent with 18 tools instead of 4-5 has
measurably worse tool-selection reliability, and an agent holding tools
outside its specialization tends to misuse them, its own example is a
synthesis agent attempting web searches. Give `verify-reproduction`
`search_bug_catalog` too, and a run investigating a live discrepancy
now has to reason about whether to trust the catalog or the live
result, exactly the confusion the split exists to prevent.

## tool_choice, forced

Most turns should leave tool selection to the model
(`tool_choice: "auto"`). One PeakAndPack case benefits from forcing it:
the very first call in a fresh triage session should always be
`search_bug_catalog`, checking the live API before knowing what you're
even looking for wastes a call.

```json
{
  "tool_choice": { "type": "tool", "name": "search_bug_catalog" }
}
```

Set only on the first request. Every request after that reverts to
`tool_choice: "auto"`, once the catalog search has run, which tool
comes next genuinely depends on what it returned, and that's a decision
worth leaving to the model.

## How to use it

No script to run. Audit any agent's tool list: if it's above 5-6, ask
whether every tool is actually inside that agent's specialization, not
just occasionally useful to it. Use forced `tool_choice` only for a
genuinely fixed first step, not as a general-purpose ordering
mechanism, that's what a hook or a prerequisite gate is for (see D1's
`d1-coordinator-subagents.ts`).
