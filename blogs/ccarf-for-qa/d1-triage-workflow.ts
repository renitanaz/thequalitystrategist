// D1: Deterministic workflow implementation of the triage task.
//
// Fixed execution path, every time: read input -> one classification
// call with a strict schema -> apply the schema's own confidence rule
// -> return a verdict. No branching on what comes back, no tools, no
// second call. If the classification is uncertain, the workflow does
// not loop or investigate further, it returns "file-new" and stops.
//
// Run: npx tsx d1-triage-workflow.ts <path-to-failure.json>
// Needs: ANTHROPIC_API_KEY in the environment.

// "import" pulls in code someone else already wrote, so this file
// doesn't have to reimplement it. Anthropic is the official library
// for talking to Claude; readFileSync is a built-in Node.js function
// for reading a file's contents.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

// Creates one object that knows how to send requests to Claude's API.
// It reads your ANTHROPIC_API_KEY from the environment automatically,
// you never type the key into this file itself.
const anthropic = new Anthropic();

// A "constant" (const) is a named value, set once here, that the rest
// of the file can refer to by name instead of retyping it everywhere.
// This one is a single block of text (everything between the backtick
// characters), the 11-bug catalog, exactly as published on the
// AI-Augmented QA series intro page. This is the workflow's entire
// "knowledge" of what a known bug looks like, there is no live lookup,
// no search, just this fixed text.
const BUG_CATALOG = `
BUG-001: Negative price on a product
BUG-002: Product with an empty name
BUG-003: Price set at $9,999.99
BUG-004: No price validation on the products endpoint
BUG-005: No default sort, non-deterministic results
BUG-006: Registration accepts an empty name field
BUG-007: Cart total trusts client-side prices
BUG-008: No stock check before order placement
BUG-009: Discount code applies 100% off, not 10%
BUG-010: Orders endpoint returns every user's orders
BUG-011: Missing search query crashes the server
`.trim(); // .trim() just removes the stray blank lines/spaces at the
          // start and end of the block above, tidying the text.

// An "interface" is a shape, a rulebook for what fields a value must
// have and what type each one is allowed to be. This doesn't run any
// logic itself, it's a promise to the rest of the file: "whatever is
// labeled a TriageVerdict will always have exactly these three
// fields." TypeScript checks that promise for you automatically.
interface TriageVerdict {
  match: string | null;       // "BUG-001".."BUG-011", or null
  confidence: "high" | "medium" | "low";
  action: "file-new" | "link-existing" | "flag-flaky-retry";
}

// A "function" is a named, reusable block of steps. Everything between
// the { and } below only runs when triage(...) is actually called,
// which happens once, near the bottom of this file. "async" means
// this function does something that takes time (talking to Claude
// over the internet) and won't block the rest of the program while it
// waits. Promise<TriageVerdict> means "when this eventually finishes,
// what comes back will be shaped like a TriageVerdict."
async function triage(failureText: string): Promise<TriageVerdict> {
  // "await" pauses this function specifically (not your whole
  // program) until Claude's response actually arrives, then continues
  // with that response stored in "response".
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    // Single message. No tools. No conversation history. This call
    // either returns a verdict or the workflow has nothing.
    messages: [
      {
        role: "user",
        // Everything between these backticks is one long piece of
        // text, the actual prompt. ${BUG_CATALOG} and ${failureText}
        // are placeholders: at the moment this code runs, each one
        // gets swapped out for the real value it's holding, the bug
        // catalog constant above, and whatever failure text was
        // passed into this function.
        content: `You are classifying ONE failing test's output against a fixed bug catalog. Do not investigate further, you have no other information than what is given here.

Bug catalog:
${BUG_CATALOG}

Failing test output:
${failureText}

Reply with ONLY a raw JSON object matching this exact shape, nothing else, no markdown code fences, no backticks, no explanation:
{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry"}`,
      },
    ],
  });

  // Claude's reply comes back as a list of content blocks. This line
  // checks the first block is plain text (not something else), and
  // pulls out just the text string, "{}" as a fallback if it isn't.
  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  // Asking for "ONLY a JSON object" in plain prose is a request, not
  // a guarantee, unlike tool_use (see D4's Task Statement 4.3), plain
  // text prompting has no hard enforcement. Claude sometimes wraps its
  // answer in a markdown code fence anyway, ```json ... ```, which
  // JSON.parse cannot read as-is. This line strips a fence off the
  // front and back, if one is there, before parsing continues.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // "try" attempts something that might fail; if it does, "catch"
  // below runs instead of crashing the whole script.
  try {
    // JSON.parse turns a text string that looks like {"key": "value"}
    // into a real object the rest of the code can work with.
    return JSON.parse(cleaned);
  } catch {
    // The workflow's only failure handling: if the model didn't return
    // valid JSON, there is no retry, no second attempt. It surfaces as
    // an unclassified case, which is itself a data point on reliability.
    return { match: null, confidence: "low", action: "file-new" };
  }
}

// process.argv is the list of things typed on the command line when
// you ran this script. process.argv[2] is the third item in that
// list, in practice, whatever filename you typed after the script's
// own name, e.g. scenario-1.txt. readFileSync opens that file and
// reads its entire contents in as one text string.
const failureText = readFileSync(process.argv[2], "utf-8");
// Calls triage() with that text. Since triage() is async, this line
// doesn't get the answer immediately, it gets a "Promise", a
// placeholder for an answer that's still on its way. .then(...) says
// "once that answer actually arrives, run this next", with "verdict"
// being the real result once it's ready.
triage(failureText).then((verdict) => {
  // Prints the verdict to your terminal. JSON.stringify turns the
  // verdict object back into readable text; the trailing ", null, 2"
  // just tells it to indent nicely instead of squishing everything
  // onto one line.
  console.log(JSON.stringify(verdict, null, 2));
});
