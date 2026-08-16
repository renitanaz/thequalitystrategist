// D1: Agentic loop implementation of the same triage task.
//
// No fixed path. The model gets three tools and decides for itself
// whether to use them, how many times, and in what order, before
// producing a verdict. It can check the LIVE app instead of trusting
// the failure text alone, which the workflow version cannot do.
//
// Loop termination follows the exam guide's Task Statement 1.1 exactly:
// the PRIMARY signal is response.stop_reason ("tool_use" means keep
// going, "end_turn" means the model is done). An iteration cap exists
// only as a safety backstop, never as the primary stopping mechanism,
// that's an explicitly named anti-pattern (so is checking for the
// absence of tool_use blocks or parsing assistant text as a completion
// signal, which is what an earlier draft of this file did before this
// revision).
//
// Run: npx tsx d1-triage-agent.ts <path-to-failure.json>
// Needs: ANTHROPIC_API_KEY in the environment. check_live_api calls
// the real PeakAndPack API, so it also needs network access.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const anthropic = new Anthropic();
const API_BASE = "https://peakandpackshopdemo.onrender.com";
const MAX_ITERATIONS = 6; // safety cap: an agent with no cap can loop forever

const BUG_CATALOG: Record<string, string> = {
  "BUG-001": "Negative price on a product",
  "BUG-002": "Product with an empty name",
  "BUG-003": "Price set at $9,999.99",
  "BUG-004": "No price validation on the products endpoint",
  "BUG-005": "No default sort, non-deterministic results",
  "BUG-006": "Registration accepts an empty name field",
  "BUG-007": "Cart total trusts client-side prices",
  "BUG-008": "No stock check before order placement",
  "BUG-009": "Discount code applies 100% off, not 10%",
  "BUG-010": "Orders endpoint returns every user's orders",
  "BUG-011": "Missing search query crashes the server",
};

// Mock past-reports store. A real system would query an actual tracker;
// this stands in for one so the tool is real and callable.
const PAST_REPORTS = [
  { id: "RPT-014", summary: "Checkout occasionally slow after idle period, suspected cold start", relatedBug: null },
  { id: "RPT-022", summary: "Sleeping Bag price displays as negative", relatedBug: "BUG-001" },
];

const tools: Anthropic.Tool[] = [
  {
    name: "search_bug_catalog",
    description: "Search the 11 known PeakAndPack bugs by keyword. Returns matching bug IDs and descriptions.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Keyword to search for" } },
      required: ["query"],
    },
  },
  {
    name: "check_live_api",
    description: "Call the real, live PeakAndPack API to check current state. Use this to confirm whether a failure is still reproducible right now, not just at the time the test ran.",
    input_schema: {
      type: "object",
      properties: { endpoint: { type: "string", description: "API path, e.g. /api/products or /health" } },
      required: ["endpoint"],
    },
  },
  {
    name: "search_past_reports",
    description: "Search previously filed bug/incident reports by keyword.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

async function runTool(name: string, input: any): Promise<string> {
  if (name === "search_bug_catalog") {
    const q = input.query.toLowerCase();
    const matches = Object.entries(BUG_CATALOG).filter(([, desc]) => desc.toLowerCase().includes(q));
    return JSON.stringify(matches.length ? matches : "no matches");
  }
  if (name === "check_live_api") {
    const res = await fetch(`${API_BASE}${input.endpoint}`);
    const body = await res.text();
    return JSON.stringify({ status: res.status, body: body.slice(0, 500) });
  }
  if (name === "search_past_reports") {
    const q = input.query.toLowerCase();
    const matches = PAST_REPORTS.filter((r) => r.summary.toLowerCase().includes(q));
    return JSON.stringify(matches.length ? matches : "no matches");
  }
  return "unknown tool";
}

async function triage(failureText: string) {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are triaging ONE failing test's output for PeakAndPack. You have tools: search the known bug catalog, check the live API to see if a failure still reproduces right now, and search past reports for similar prior incidents. Use whichever tools help, in whatever order makes sense, then give a final verdict.

Failing test output:
${failureText}

When you have enough information, reply with ONLY a JSON object, nothing else:
{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry", "reasoning": "one sentence"}`,
    },
  ];

  let toolCallCount = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // Primary termination check: stop_reason, not the shape of the content.
    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      const raw = text && text.type === "text" ? text.text.trim() : "{}";
      try {
        return { ...JSON.parse(raw), toolCallsUsed: toolCallCount, iterations: i + 1 };
      } catch {
        return { match: null, confidence: "low", action: "file-new", reasoning: "unparseable output", toolCallsUsed: toolCallCount, iterations: i + 1 };
      }
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        toolCallCount++;
        const result = await runTool(use.name, use.input);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Any other stop_reason (max_tokens, stop_sequence) is neither
    // "keep going" nor "here is the answer". Surface it rather than
    // silently treating it as either.
    return { match: null, confidence: "low", action: "file-new", reasoning: `unexpected stop_reason: ${response.stop_reason}`, toolCallsUsed: toolCallCount, iterations: i + 1 };
  }

  // Hit MAX_ITERATIONS without stop_reason ever being "end_turn". This
  // is the safety backstop, not the normal exit path, and it's a real
  // failure mode a fixed workflow cannot have, since a workflow has no
  // loop to get stuck in.
  return { match: null, confidence: "low", action: "file-new", reasoning: "exceeded max iterations without converging", toolCallsUsed: toolCallCount, iterations: MAX_ITERATIONS };
}

const failureText = readFileSync(process.argv[2], "utf-8");
triage(failureText).then((verdict) => {
  console.log(JSON.stringify(verdict, null, 2));
});
