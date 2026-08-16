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

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const anthropic = new Anthropic();

// The 11-bug catalog, exactly as published on the AI-Augmented QA
// series intro page. This is the workflow's entire "knowledge" of
// what a known bug looks like, there is no live lookup, no search.
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
`.trim();

interface TriageVerdict {
  match: string | null;       // "BUG-001".."BUG-011", or null
  confidence: "high" | "medium" | "low";
  action: "file-new" | "link-existing" | "flag-flaky-retry";
}

async function triage(failureText: string): Promise<TriageVerdict> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    // Single message. No tools. No conversation history. This call
    // either returns a verdict or the workflow has nothing.
    messages: [
      {
        role: "user",
        content: `You are classifying ONE failing test's output against a fixed bug catalog. Do not investigate further, you have no other information than what is given here.

Bug catalog:
${BUG_CATALOG}

Failing test output:
${failureText}

Reply with ONLY a JSON object matching this exact shape, nothing else:
{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry"}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text.trim());
  } catch {
    // The workflow's only failure handling: if the model didn't return
    // valid JSON, there is no retry, no second attempt. It surfaces as
    // an unclassified case, which is itself a data point on reliability.
    return { match: null, confidence: "low", action: "file-new" };
  }
}

const failureText = readFileSync(process.argv[2], "utf-8");
triage(failureText).then((verdict) => {
  console.log(JSON.stringify(verdict, null, 2));
});
