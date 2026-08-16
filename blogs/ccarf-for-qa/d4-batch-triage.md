# Batch processing: which PeakAndPack workflow actually qualifies

Task Statement 4.5. The Message Batches API: 50% cost savings, up to a
24-hour processing window, no guaranteed latency SLA, and no multi-turn
tool calling within a single request.

## What doesn't qualify: D1's live triage agent

d1-triage-agent.ts calls tools mid-conversation and reacts to their
results, `search_bug_catalog`, then conditionally `check_live_api`,
then maybe `search_past_reports`. The Batch API cannot execute a tool
and return its result within the same request, so this agent, as
built, cannot run in batch mode at all. This isn't a latency-tolerance
question, it's a hard capability mismatch.

## What does qualify: a nightly backlog sweep

A different, real PeakAndPack workflow fits: once a week, sweep every
failing test report older than 24 hours that's never been triaged
(low-priority backlog, not blocking anyone's PR) and produce a verdict
for each using d1-triage-workflow.ts's simpler, single-call
implementation, no tools, no mid-request reactions, just catalog text
in, verdict out. That shape is exactly what the Batch API accepts.

```json
{ "custom_id": "report-0091", "params": { "model": "claude-sonnet-4-5", "messages": [...] } }
{ "custom_id": "report-0092", "params": { "model": "claude-sonnet-4-5", "messages": [...] } }
```

## Handling failures

If `report-0047` comes back failed (say its failure text exceeded a
context limit), resubmit only that `custom_id`, chunked, not the whole
batch. A 500-report nightly sweep with 3 failures shouldn't cost
500 re-submissions to fix 3.

## How to use it

No script to run. Before reaching for the Batch API, check two things:
does this workflow need mid-request tool calls (if yes, it can't batch
as-is), and can this workflow tolerate up to 24 hours of latency (if
no, use the synchronous API instead, a CI gate blocking a merge is
never a batch candidate).
