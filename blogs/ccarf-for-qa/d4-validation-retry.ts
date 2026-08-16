// D4 Task Statement 4.4: retry with the specific error, and knowing
// when retry can't help at all.
//
// Validates report_triage_verdict's output (d4-structured-verdict.ts)
// for a semantic error tool_use schemas don't catch on their own:
// action "link-existing" requires a non-null matchedBugId, but the
// schema alone can't express that cross-field rule.

interface TriageVerdict {
  matchedBugId: string | null;
  confidence: "high" | "medium" | "low" | "unclear";
  action: "file-new" | "link-existing" | "flag-flaky-retry" | "escalate-to-human";
  reasoning: string;
  detectedPattern?: string; // which criterion actually fired, for later false-positive analysis
}

function validateVerdict(v: TriageVerdict): { valid: true } | { valid: false; error: string; retryable: boolean } {
  if (v.action === "link-existing" && v.matchedBugId === null) {
    return {
      valid: false,
      error: `action is "link-existing" but matchedBugId is null, a link needs something to link to`,
      retryable: true, // format/logic error, the model can fix this on a second pass
    };
  }
  if (v.confidence === "high" && v.matchedBugId === null && v.action !== "escalate-to-human") {
    return {
      valid: false,
      error: `confidence is "high" with no matched bug ID, that combination only makes sense for escalate-to-human`,
      retryable: true,
    };
  }
  return { valid: true };
}

// Retry-with-error-feedback: append the SPECIFIC validation error to
// the next request, not a repeat of the original prompt. The model
// needs to know what was wrong, not just try again blind.
function buildRetryPrompt(originalFailureText: string, badVerdict: TriageVerdict, error: string): string {
  return `Your previous verdict was invalid: ${error}

Your previous output:
${JSON.stringify(badVerdict, null, 2)}

Original failing test output:
${originalFailureText}

Correct the specific issue above and report a new verdict.`;
}

// What retry CANNOT fix: if the live API and the catalog both come
// back inconclusive (an endpoint that genuinely doesn't exist anymore,
// say), no amount of re-prompting produces information that isn't
// there. That's an escalate-to-human case, not a retry loop.
function isRetryable(error: string): boolean {
  return !error.includes("no information available");
}

export { validateVerdict, buildRetryPrompt, isRetryable };
export type { TriageVerdict };
