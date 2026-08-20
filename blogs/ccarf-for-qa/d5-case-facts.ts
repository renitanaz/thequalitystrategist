// D5 Task Statement 5.1: what stays legible after ten tool calls.
//
// The triage agent from D1 (d1-triage-agent.ts) appends every tool
// result to conversation history verbatim. That's fine for three tools
// across six scenarios. It stops being fine the moment check_live_api
// starts returning full API responses, 40+ fields per order lookup
// when 5 are relevant is the guide's own example, and PeakAndPack's
// endpoints aren't far off that shape.
//
// Two separate problems this addresses:
//  1. Tool results accumulate in context disproportionately to their
//     relevance (5.1 knowledge point).
//  2. Progressive summarization risk: exact values (numbers, statuses,
//     dates) get flattened into vague prose under context pressure
//     (5.1 knowledge point).
//
// Not run against a live key in this environment, see the methodology
// note in the main post. The extraction logic itself is real.

// "interface" names this exact shape, every CaseFacts value has these
// six fields. "string | null" on each one means the value is either
// real text or explicitly null, "we don't know this yet" is a real,
// distinguishable state, not just a missing key.
interface CaseFacts {
  bugIdUnderInvestigation: string | null;
  endpointChecked: string | null;
  observedStatus: number | null;
  liveCheckTimestamp: string | null; // ISO 8601, normalized (see d1-coordinator-subagents.ts)
  catalogClaim: string | null;
  liveClaim: string | null;
}

// Extracts only what the triage verdict actually depends on, discarding
// the rest of a verbose live-API response instead of letting it
// accumulate untouched in conversation history.
function extractCaseFacts(
  toolName: string,
  rawResult: any,
  existing: CaseFacts
): CaseFacts {
  if (toolName === "check_live_api") {
    // "{ ...existing, someField: newValue }" spreads every field from
    // the existing CaseFacts object into a new one, then overwrites
    // just the fields listed after it, so anything already known and
    // not touched here carries forward unchanged. "??" is the
    // nullish-coalescing operator, "use the left side, unless it's
    // null or undefined, then fall back to the right side", so a
    // missing field in this particular tool result doesn't erase a
    // value already captured earlier.
    return {
      ...existing,
      endpointChecked: rawResult.endpoint ?? existing.endpointChecked,
      observedStatus: rawResult.status ?? existing.observedStatus,
      liveCheckTimestamp: new Date().toISOString(),
      // A ternary: condition ? valueIfTrue : valueIfFalse, on one
      // line instead of a full if/else block.
      liveClaim:
        rawResult.status === 200
          ? "reproduces as documented"
          : `returns ${rawResult.status}`,
    };
  }
  if (toolName === "search_bug_catalog") {
    // "const [firstMatch] = rawResult.matches ?? []" is array
    // destructuring: it pulls just the first element out of the
    // matches array and names it firstMatch. The "?? []" means if
    // matches is missing entirely, fall back to an empty array first,
    // so this line can't crash on a result with no matches field.
    // "firstMatch?.[0]" is optional chaining, if firstMatch turned
    // out to be undefined (no matches at all), this evaluates to
    // undefined instead of throwing, rather than crashing trying to
    // read index 0 off of nothing.
    const [firstMatch] = rawResult.matches ?? [];
    return {
      ...existing,
      bugIdUnderInvestigation: firstMatch?.[0] ?? existing.bugIdUnderInvestigation,
      catalogClaim: firstMatch?.[1] ?? existing.catalogClaim,
    };
  }
  return existing;
}

// What actually goes back into the next turn's prompt: the trimmed
// case-facts block, placed at the START of the aggregated input (5.1's
// position-aware ordering skill point), not the raw multi-hundred-byte
// tool result buried in the middle of a growing history.
function caseFactsBlock(facts: CaseFacts): string {
  // Another template literal: everything inside ${ } gets substituted
  // with the real field value at the time this runs, producing one
  // short block of plain text ready to prepend to the next prompt.
  return `CASE FACTS (verified, not summarized):
- Bug under investigation: ${facts.bugIdUnderInvestigation ?? "none yet"}
- Catalog claims: ${facts.catalogClaim ?? "no match found"}
- Live API claims: ${facts.liveClaim ?? "not yet checked"}
- Endpoint: ${facts.endpointChecked ?? "n/a"}, checked at ${facts.liveCheckTimestamp ?? "n/a"}`;
}

export { extractCaseFacts, caseFactsBlock };
export type { CaseFacts };
