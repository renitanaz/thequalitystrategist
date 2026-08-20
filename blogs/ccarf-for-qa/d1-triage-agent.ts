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

// See d1-triage-workflow.ts for what "import" and "const" mean, this
// file builds on the same basics, comments below focus on what's new.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const anthropic = new Anthropic();
// A plain constant holding one piece of text, the base web address
// every live API check in this file gets appended onto.
const API_BASE = "https://peakandpackshopdemo.onrender.com";
const MAX_ITERATIONS = 6; // safety cap: an agent with no cap can loop forever

// Record<string, string> means "an object where every key and every
// value is text." Unlike the workflow file's BUG_CATALOG (one long
// block of text), this is the catalog as a lookup table, "BUG-001"
// as a key maps directly to its description, which is what lets the
// search_bug_catalog tool below look entries up by keyword instead of
// just dumping the whole list into the prompt.
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
// The square brackets [ ] make this an "array", a numbered list of
// items. Each item here is itself an object with id/summary/relatedBug
// fields, so this is a small list of two report records.
const PAST_REPORTS = [
  { id: "RPT-014", summary: "Checkout occasionally slow after idle period, suspected cold start", relatedBug: null },
  { id: "RPT-022", summary: "Sleeping Bag price displays as negative", relatedBug: "BUG-001" },
];

// This is the list of tools Claude is allowed to call. Each entry
// tells Claude the tool's name, a plain-English description of what
// it does (this is the main thing Claude uses to decide which tool
// fits a given moment), and an input_schema, the shape of the
// arguments Claude must supply when it calls that tool.
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

// This function is what actually DOES the work when Claude asks for a
// tool by name. Claude only ever sends back a tool's name and its
// input, it never runs anything itself, this function is the real
// code standing behind each of the three tool names listed above.
async function runTool(name: string, input: any): Promise<string> {
  // "if" runs the block below it only when the condition in
  // parentheses is true, each of these three checks which tool was
  // actually requested and handles that one case.
  if (name === "search_bug_catalog") {
    const q = input.query.toLowerCase();
    // Object.entries turns the BUG_CATALOG lookup table into a list of
    // [key, value] pairs, .filter keeps only the ones whose
    // description contains the search keyword.
    const matches = Object.entries(BUG_CATALOG).filter(([, desc]) => desc.toLowerCase().includes(q));
    return JSON.stringify(matches.length ? matches : "no matches");
  }
  if (name === "check_live_api") {
    // fetch(...) makes a real network request to the live PeakAndPack
    // site, the same way a browser would. ${API_BASE}${input.endpoint}
    // glues the base address and the specific path together into one
    // full URL, e.g. "https://peakandpackshopdemo.onrender.com/api/products".
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

// The main loop. Unlike the workflow's triage() function (one call, no
// loop), this one can go back and forth with Claude multiple times.
async function triage(failureText: string) {
  // "messages" is the running conversation history, sent to Claude
  // fresh on every call in the loop below since each API call has no
  // memory of previous ones on its own. It starts with just the
  // opening prompt, and more entries get added to it as the loop runs.
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are triaging ONE failing test's output for PeakAndPack. You have tools: search the known bug catalog, check the live API to see if a failure still reproduces right now, and search past reports for similar prior incidents. Use whichever tools help, in whatever order makes sense, then give a final verdict.

Failing test output:
${failureText}

When you have enough information, reply with ONLY a raw JSON object, nothing else, no markdown code fences, no backticks, no explanation:
{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry", "reasoning": "one sentence"}`,
    },
  ];

  // A counter, just a plain number that goes up by one each time a
  // tool actually gets called, purely for reporting at the end.
  let toolCallCount = 0;

  // A "for loop" repeats the block below it, counting i from 0 up to
  // (but not including) MAX_ITERATIONS. This is the actual agentic
  // loop: each pass through is one round trip to Claude.
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      tools,
      messages,
    });

    // Adds Claude's reply onto the running conversation history, so
    // the next loop pass (if there is one) includes everything said
    // so far, not just the original question.
    messages.push({ role: "assistant", content: response.content });

    // Primary termination check: stop_reason, not the shape of the content.
    if (response.stop_reason === "end_turn") {
      // .find looks through Claude's reply for the text part of it
      // (as opposed to a tool-use part) and grabs just that.
      const text = response.content.find((b) => b.type === "text");
      const rawText = text && text.type === "text" ? text.text.trim() : "{}";
      // Same issue as the workflow script: plain-text JSON requests
      // have no hard guarantee, Claude can wrap the answer in a
      // markdown code fence even when told not to. Strip one off the
      // front and back, if present, before parsing.
      const raw = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      try {
        // "{...JSON.parse(raw), toolCallsUsed: ..., iterations: ...}"
        // takes everything Claude's JSON answer contained and adds two
        // extra fields onto it before returning, how many tools were
        // used and how many loop passes it took to get here.
        return { ...JSON.parse(raw), toolCallsUsed: toolCallCount, iterations: i + 1 };
      } catch {
        return { match: null, confidence: "low", action: "file-new", reasoning: "unparseable output", toolCallsUsed: toolCallCount, iterations: i + 1 };
      }
    }

    if (response.stop_reason === "tool_use") {
      // .filter keeps only the parts of Claude's reply that are
      // actual tool requests (Claude can mix text and tool requests
      // in one reply, this line picks out just the tool ones).
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      // Runs every tool Claude asked for in this turn (there can be
      // more than one), and collects each result.
      for (const use of toolUses) {
        toolCallCount++;
        const result = await runTool(use.name, use.input);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      }
      // Adds all those tool results onto the conversation history as
      // the next message, then "continue" jumps back to the top of
      // the for loop for another round trip, now with those results
      // included, so Claude can reason about what it just learned.
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

// Same pattern as d1-triage-workflow.ts: read the file you passed on
// the command line, run triage() on its contents, print the result
// once it's ready.
const failureText = readFileSync(process.argv[2], "utf-8");
triage(failureText).then((verdict) => {
  console.log(JSON.stringify(verdict, null, 2));
});
