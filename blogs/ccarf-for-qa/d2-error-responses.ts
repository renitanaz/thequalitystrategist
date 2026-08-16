// D2 Task Statement 2.2: structured MCP error responses, not a
// generic "operation failed."
//
// Extends check_live_api from d1-triage-agent.ts with the MCP isError
// pattern and four distinct error categories, each demanding a
// different agent response. Not run against a live key in this
// environment, adaptable pattern, not a standalone script.

interface McpToolResult {
  isError: boolean;
  errorCategory?: "transient" | "validation" | "business" | "permission";
  isRetryable?: boolean;
  message?: string;
  data?: unknown;
}

async function checkLiveApiStructured(endpoint: string, requesterId: string): Promise<McpToolResult> {
  // Validation error: caught before any network call. Non-retryable,
  // retrying an invalid input produces the same invalid input.
  if (!endpoint.startsWith("/api/")) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: false,
      message: `"${endpoint}" is not a valid PeakAndPack API path, expected something starting with /api/`,
    };
  }

  const res = await fetch(`https://peakandpackshopdemo.onrender.com${endpoint}`);

  // Transient: Render's free tier cold start. Retryable, the same
  // request will likely succeed a moment later.
  if (res.status === 503) {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      message: "PeakAndPack API is cold-starting, retry after a short delay",
    };
  }

  // Permission: this is what a correctly-built orders tool returns
  // instead of the actual BUG-010 behavior (leaking every user's
  // orders regardless of who's asking). A tool that enforces
  // ownership returns a permission error here, it does not silently
  // hand back data the requester shouldn't see.
  if (endpoint.startsWith("/api/orders") && !requesterId) {
    return {
      isError: true,
      errorCategory: "permission",
      isRetryable: false,
      message: "Order lookups require a verified requester ID, none was provided",
    };
  }

  // Business: a real policy rule, not a technical failure. Also
  // non-retryable, but for a different reason than validation, the
  // request is well-formed, the answer is just "no."
  if (endpoint.includes("SAVE10") && res.status === 200) {
    const body = await res.json();
    if (body.discountPercent === 100) {
      return {
        isError: true,
        errorCategory: "business",
        isRetryable: false,
        message: "SAVE10 is returning 100% off, not the documented 10% (BUG-009), do not apply this discount",
      };
    }
  }

  return { isError: false, data: await res.json() };
}

export { checkLiveApiStructured };
export type { McpToolResult };
