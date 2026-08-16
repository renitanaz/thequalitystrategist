// D5 Task Statement 5.3: what a failed tool call tells the coordinator.
//
// Extends d1-coordinator-subagents.ts's verify-reproduction subagent.
// Its only tool, check_live_api, can fail two genuinely different ways
// that a generic try/catch would treat identically, and shouldn't.
//
// Usage: this is a pattern to adapt into check_live_api's real
// implementation, not a standalone script, it has no entry point of
// its own.

interface StructuredToolError {
  failureType: "access" | "unresolvable";
  attemptedQuery: string;
  partialResult: unknown | null;
  alternatives: string[];
}

// The anti-patterns this replaces, named directly in the guide:
//   - silently suppressing errors (returning empty results as success)
//   - terminating the entire workflow on a single subagent failure
//   - a generic "search unavailable" status that hides what happened
async function checkLiveApiWithStructuredErrors(
  endpoint: string
): Promise<
  | { ok: true; body: unknown }
  | { ok: false; error: StructuredToolError }
> {
  try {
    const res = await fetch(`https://peakandpackshopdemo.onrender.com${endpoint}`);

    if (res.status === 503) {
      // Render cold start. An access failure: the coordinator can
      // reasonably decide to retry.
      return {
        ok: false,
        error: {
          failureType: "access",
          attemptedQuery: endpoint,
          partialResult: null,
          alternatives: ["retry once after a short delay, Render's free tier cold-starts"],
        },
      };
    }

    const body = await res.json();

    // A 200 with no matches is NOT a failure, it's a valid empty
    // result. Conflating it with an access failure is exactly the
    // BUG-011 mistake: treating "the endpoint answered, the answer
    // was empty" as if the endpoint never answered at all.
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      error: {
        failureType: "unresolvable",
        attemptedQuery: endpoint,
        partialResult: null,
        alternatives: ["escalate to human, this subagent has no further recovery option"],
      },
    };
  }
}

// What the coordinator does with each outcome, not one catch-all
// response for every non-2xx result.
function recoveryDecision(
  result: Awaited<ReturnType<typeof checkLiveApiWithStructuredErrors>>
): string {
  if (result.ok) {
    return "valid response, including a valid empty result, treat as real information";
  }
  if (result.error.failureType === "access") {
    return "retry locally within the subagent, don't propagate yet";
  }
  return "propagate to coordinator with partial results and alternatives, don't suppress or silently mark as success";
}

export { checkLiveApiWithStructuredErrors, recoveryDecision };
export type { StructuredToolError };
