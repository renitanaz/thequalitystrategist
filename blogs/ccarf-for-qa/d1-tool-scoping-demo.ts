// D1: Tool scoping, run for real, for Part 2's own claim: an agent
// juggling both live-checks and catalog-search in one context can mix
// up "found in the catalog" with "confirmed still true." Splitting the
// work across two agents that each get only one job's worth of tools
// removes that shortcut structurally, it isn't just a suggestion.
//
// This runs the SAME scenario two ways and prints which tools each
// version actually called, so the difference is something you watch
// happen, not something you take on faith. No Agent SDK needed, the
// plain Messages API is enough, same pattern as d1-triage-agent.ts,
// just with the three tools split differently across two calls.
//
// Run: npx tsx d1-tool-scoping-demo.ts scenario-3.txt
// Needs: ANTHROPIC_API_KEY in the environment, and network access,
// check_live_api calls the real PeakAndPack API.
//
// Use Scenario 3 from d1-triage-scenarios.md for this, it's the one
// built specifically to test whether an agent actually verifies live
// or just trusts what the catalog says:
//   Test: "empty search query returns 400, not a crash"
//   Expected: response.status === 400
//   Actual: response.status === 500, body: "Internal Server Error"

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const anthropic = new Anthropic();
const API_BASE = "https://peakandpackshopdemo.onrender.com";

// Same fixed catalog and mock reports store as d1-triage-agent.ts,
// reused here on purpose: both versions below work against identical
// "known" information. The only difference between them is which
// tools each agent can reach, not what data exists to find.
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

const PAST_REPORTS = [
  { id: "RPT-014", summary: "Checkout occasionally slow after idle period, suspected cold start", relatedBug: null },
  { id: "RPT-022", summary: "Sleeping Bag price displays as negative", relatedBug: "BUG-001" },
];

// The three tool schemas. Each has the same name and behavior as its
// counterpart in d1-triage-agent.ts, split apart here by which agent
// gets which, that split is the entire point of this file.
const searchBugCatalogTool: Anthropic.Tool = {
  name: "search_bug_catalog",
  description: "Search the 11 known PeakAndPack bugs by keyword. Returns matching bug IDs and descriptions.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Keyword to search for" } },
    required: ["query"],
  },
};

const searchPastReportsTool: Anthropic.Tool = {
  name: "search_past_reports",
  description: "Search previously filed bug/incident reports by keyword.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
};

const checkLiveApiTool: Anthropic.Tool = {
  name: "check_live_api",
  description: "Call the real, live PeakAndPack API to check current state. Use this to confirm whether a failure is still reproducible right now, not just at the time the test ran.",
  input_schema: {
    type: "object",
    properties: { endpoint: { type: "string", description: "API path, e.g. /api/products or /health" } },
    required: ["endpoint"],
  },
};

// The actual work behind each tool name, identical to
// d1-triage-agent.ts's runTool, kept in one place here since both
// versions below call into the same three implementations.
async function runTool(name: string, input: any): Promise<string> {
  if (name === "search_bug_catalog") {
    const q = input.query.toLowerCase();
    const matches = Object.entries(BUG_CATALOG).filter(([, desc]) => desc.toLowerCase().includes(q));
    return JSON.stringify(matches.length ? matches : "no matches");
  }
  if (name === "search_past_reports") {
    const q = input.query.toLowerCase();
    const matches = PAST_REPORTS.filter((r) => r.summary.toLowerCase().includes(q));
    return JSON.stringify(matches.length ? matches : "no matches");
  }
  if (name === "check_live_api") {
    const res = await fetch(`${API_BASE}${input.endpoint}`);
    const body = await res.text();
    return JSON.stringify({ status: res.status, body: body.slice(0, 500) });
  }
  return "unknown tool";
}

// Strips a markdown code fence off a model's reply if one is there,
// the same fix Post 01's other scripts needed after a reader hit the
// real bug this caused. See d1-triage-agent.ts's comments for the
// full story.
function stripFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

// A single agentic loop, shared by both versions below, the only
// difference between Version A and Version B is which tools this gets
// called with and whether it runs once or twice in isolation.
async function agenticLoop(
  failureText: string,
  tools: Anthropic.Tool[],
  systemNote: string,
  maxIterations = 6
): Promise<{ verdict: any; toolsCalled: string[] }> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${systemNote}

Failing test output:
${failureText}

When you have enough information, reply with ONLY a raw JSON object, nothing else, no markdown code fences, no backticks, no explanation:
{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry", "reasoning": "one sentence"}`,
    },
  ];

  const toolsCalled: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      const raw = text && text.type === "text" ? stripFence(text.text.trim()) : "{}";
      try {
        return { verdict: JSON.parse(raw), toolsCalled };
      } catch {
        return { verdict: { match: null, confidence: "low", action: "file-new", reasoning: "unparseable output" }, toolsCalled };
      }
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        toolsCalled.push(use.name);
        const result = await runTool(use.name, use.input);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    return { verdict: { match: null, confidence: "low", action: "file-new", reasoning: `unexpected stop_reason: ${response.stop_reason}` }, toolsCalled };
  }

  return { verdict: { match: null, confidence: "low", action: "file-new", reasoning: "exceeded max iterations" }, toolsCalled };
}

// ---------------------------------------------------------------------
// Version A: one agent, all three tools, one shared context. Nothing
// stops it from finding a catalog match and stopping there without
// ever calling check_live_api, the exact shortcut Part 2's callout
// warns about. Whether it actually takes that shortcut on any given
// run is the model's own judgment call, that unpredictability is the
// point, run this a few times and watch toolsCalled change.
// ---------------------------------------------------------------------
async function singleAgentInvestigate(failureText: string) {
  return agenticLoop(
    failureText,
    [searchBugCatalogTool, searchPastReportsTool, checkLiveApiTool],
    `You are triaging ONE failing test's output for PeakAndPack. You have tools: search the known bug catalog, search past incident reports for similar prior incidents, and check the live API to see if a failure still reproduces right now. Use whichever tools help, in whatever order makes sense, then give a final verdict.`
  );
}

// ---------------------------------------------------------------------
// Version B: two isolated agents, run in parallel, neither sees the
// other's conversation. The verifier has ONLY check_live_api, it has
// no other tool to reach for, so calling it is the only way it can do
// its job at all. The searcher has ONLY the catalog tools. A verdict
// only gets produced once BOTH have reported back, and the live
// result wins on disagreement, not a vote between the two.
// ---------------------------------------------------------------------
async function scopedInvestigate(failureText: string) {
  const [verifier, searcher] = await Promise.all([
    agenticLoop(
      failureText,
      [checkLiveApiTool],
      `You verify bug reproduction against the live PeakAndPack API for one failing test. Call the endpoint most likely to reproduce it and report exactly what you observe. Reply with a verdict even though you have no catalog access, use "match": null if you can't name a bug ID, "confidence" and "reasoning" should describe what the live call actually showed.`
    ),
    agenticLoop(
      failureText,
      [searchBugCatalogTool, searchPastReportsTool],
      `You search PeakAndPack's bug catalog and past incident reports for one failing test. Find the closest match, if any. Reply with a verdict even though you have no live-API access, "confidence" and "reasoning" should describe only what the catalog and past reports show, not whether it's still true right now.`
    ),
  ]);

  const toolsCalled = [...verifier.toolsCalled, ...searcher.toolsCalled];

  // Combine deterministically, in code, not with a third model call.
  // If the live check actually reproduced (or didn't) the symptom,
  // that outranks what the catalog says, the catalog can be stale,
  // the live call just happened.
  const liveSaysReproduces = verifier.verdict.confidence !== "low" && verifier.verdict.action !== "file-new";
  const verdict = liveSaysReproduces
    ? { ...verifier.verdict, catalogMatch: searcher.verdict.match, reasoning: `Live check is authoritative: ${verifier.verdict.reasoning}. Catalog search separately found: ${searcher.verdict.reasoning}` }
    : { ...searcher.verdict, liveChecked: true, reasoning: `${searcher.verdict.reasoning} Live check ran and found: ${verifier.verdict.reasoning}` };

  return { verdict, toolsCalled, verifier, searcher };
}

async function main() {
  const failureText = readFileSync(process.argv[2], "utf-8");

  console.log("=== Version A: one agent, all three tools, one context ===");
  const a = await singleAgentInvestigate(failureText);
  console.log(JSON.stringify(a.verdict, null, 2));
  console.log(`Tools called: ${a.toolsCalled.join(", ") || "none"}`);
  console.log(`Called check_live_api: ${a.toolsCalled.includes("check_live_api")}\n`);

  console.log("=== Version B: two isolated, scoped agents ===");
  const b = await scopedInvestigate(failureText);
  console.log(JSON.stringify(b.verdict, null, 2));
  console.log(`Tools called: ${b.toolsCalled.join(", ") || "none"}`);
  console.log(`Called check_live_api: ${b.toolsCalled.includes("check_live_api")} (structurally guaranteed, the verifier has no other tool)\n`);

  console.log("=== What to look at ===");
  console.log("Version A's live-check is optional, a judgment call the model made this run.");
  console.log("Version B's live-check isn't optional, it's the only tool that agent has.");
}

main();
