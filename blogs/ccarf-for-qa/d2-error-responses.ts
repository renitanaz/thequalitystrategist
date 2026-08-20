// D2 Task Statement 2.2: structured MCP error responses, not a
// generic "operation failed."
//
// Extends check_live_api from d1-triage-agent.ts with the MCP isError
// pattern and four distinct error categories, each demanding a
// different agent response. Not run against a live key in this
// environment, adaptable pattern, not a standalone script.

// "interface" is TypeScript's way of naming a shape of data, every
// value described as an McpToolResult must have these fields. The "?"
// after a field name (errorCategory?, isRetryable?, etc.) means that
// field is optional, some results are plain success and don't need
// an error category at all. The pipe-separated list in quotes,
// "transient" | "validation" | ..., means errorCategory can only ever
// be one of those four exact strings, nothing else, TypeScript will
// flag a typo like "trasient" as an error before this even runs.
interface McpToolResult {
  isError: boolean;
  errorCategory?: "transient" | "validation" | "business" | "permission";
  isRetryable?: boolean;
  message?: string;
  data?: unknown;
}

// "async function" marks this as a function that does work taking
// real time (a network call, here) without freezing everything else
// while it waits. "Promise<McpToolResult>" is the return type, this
// function doesn't hand back an McpToolResult immediately, it hands
// back a promise to eventually produce one, which "await" (used
// below, at the fetch call) then unwraps into the real value once
// it's ready.
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

  // fetch(...) makes the real network call. Backtick-quoted text like
  // `https://...${endpoint}` is a template literal, whatever's inside
  // ${ } gets substituted in as text, so this glues the fixed base URL
  // and whatever endpoint was passed in into one full address. "await"
  // pauses this function (only this function, nothing else in the
  // program) until that network call actually finishes.
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

  // Falls through here only when none of the four error checks above
  // matched: a genuinely successful call. res.json() reads the
  // response body and parses it from text into a real JavaScript
  // value, also an async operation, hence the second "await".
  return { isError: false, data: await res.json() };
}

// "export" makes these two names available to other files that
// import this one, without it they'd be private to just this file.
// "export type" is the same idea, applied to the McpToolResult shape
// itself rather than to a runnable function.
export { checkLiveApiStructured };
export type { McpToolResult };
