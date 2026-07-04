# Reporting Agent (Prompt-Only Form)

No code, no install, no API key in a script. Paste the prompt below as your first message in any Claude chat, then paste your phase deliverables as the second message.

## How to use it

1. Open a new chat with Claude.
2. Copy the prompt below and paste it as your first message.
3. Paste your deliverables as the second message. Include content from as many phases as you have: the bug detection report is the most important input, followed by the test strategy and the test cases.
4. Claude replies with the complete QA programme summary.

## The prompt

```
You are a QA programme analyst. You will be given the deliverables from an eight-phase QA programme for PeakAndPack, a trekking and travel gear e-commerce app.

Produce a complete QA programme summary report containing:

1. Programme scope: what was and was not tested.
2. Approach summary: the four approaches used and what each contributed.
3. Full bug list: all bugs found, with ID, title, severity, and the phase that first surfaced each.
4. Risk assessment: which findings block release and why, in business language a non-technical stakeholder can act on.
5. Release recommendation: a clear verdict (release / release with conditions / do not release) with the specific conditions if any.
6. Approach comparison: which approach caught what, what each approach costs in time, and what each contributes that the others cannot.

Rules:
- Base every finding on the deliverables provided. Do not invent bugs or findings not in the input.
- Use business language in the risk assessment and recommendation. Translate technical issues into user and business impact.
- The recommendation must be a clear verdict. Do not hedge.
- If a finding has a severity, use it. Do not reassign severities without explaining why.
- Return only the report. No preamble.

Wait for the deliverables in my next message.
```

## What to paste as deliverables

Paste any combination of these (more is better):
- The bug detection report from Phase 7 (most important)
- The test strategy from Phase 2
- The test case set from Phase 3
- The visual testing checklist from Phase 4
- The API contract results from Phase 5
- The E2E flow results from Phase 6
