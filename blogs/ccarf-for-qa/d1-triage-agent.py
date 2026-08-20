# D1: Agentic loop implementation of the same triage task (Python version).
#
# Same logic as d1-triage-agent.ts, translated as directly as possible.
# If TypeScript syntax was the confusing part rather than the logic
# itself, read this version instead, everything it does is identical.
#
# No fixed path. The model gets three tools and decides for itself
# whether to use them, how many times, and in what order, before
# producing a verdict. It can check the LIVE app instead of trusting
# the failure text alone, which the workflow version cannot do.
#
# Loop termination follows the exam guide's Task Statement 1.1 exactly:
# the PRIMARY signal is response.stop_reason ("tool_use" means keep
# going, "end_turn" means the model is done). An iteration cap exists
# only as a safety backstop, never as the primary stopping mechanism,
# that's an explicitly named anti-pattern.
#
# Run: python d1-triage-agent.py <path-to-failure.json>
# Needs: ANTHROPIC_API_KEY in the environment. check_live_api calls
# the real PeakAndPack API, so it also needs network access.
# Needs: pip install anthropic requests

import sys
import json
import re         # for stripping markdown code fences from Claude's reply
import anthropic
import requests  # for making the real HTTP call check_live_api needs

client = anthropic.Anthropic()
# A plain variable holding one piece of text, the base web address
# every live API check in this file gets appended onto.
API_BASE = "https://peakandpackshopdemo.onrender.com"
MAX_ITERATIONS = 6  # safety cap: an agent with no cap can loop forever

# A dictionary (Python's lookup table): "BUG-001" as a key maps
# directly to its description, which is what lets the
# search_bug_catalog tool below look entries up by keyword instead of
# just dumping the whole list into the prompt.
BUG_CATALOG = {
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
}

# Mock past-reports store. A real system would query an actual tracker;
# this stands in for one so the tool is real and callable.
# The square brackets [ ] make this a "list", a numbered sequence of
# items. Each item here is itself a dictionary with id/summary/
# related_bug fields, so this is a small list of two report records.
PAST_REPORTS = [
    {"id": "RPT-014", "summary": "Checkout occasionally slow after idle period, suspected cold start", "related_bug": None},
    {"id": "RPT-022", "summary": "Sleeping Bag price displays as negative", "related_bug": "BUG-001"},
]

# This is the list of tools Claude is allowed to call. Each entry
# tells Claude the tool's name, a plain-English description of what it
# does (this is the main thing Claude uses to decide which tool fits a
# given moment), and an input_schema, the shape of the arguments Claude
# must supply when it calls that tool.
tools = [
    {
        "name": "search_bug_catalog",
        "description": "Search the 11 known PeakAndPack bugs by keyword. Returns matching bug IDs and descriptions.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Keyword to search for"}},
            "required": ["query"],
        },
    },
    {
        "name": "check_live_api",
        "description": "Call the real, live PeakAndPack API to check current state. Use this to confirm whether a failure is still reproducible right now, not just at the time the test ran.",
        "input_schema": {
            "type": "object",
            "properties": {"endpoint": {"type": "string", "description": "API path, e.g. /api/products or /health"}},
            "required": ["endpoint"],
        },
    },
    {
        "name": "search_past_reports",
        "description": "Search previously filed bug/incident reports by keyword.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
]


def run_tool(name, tool_input):
    # This function is what actually DOES the work when Claude asks
    # for a tool by name. Claude only ever sends back a tool's name
    # and its input, it never runs anything itself, this function is
    # the real code standing behind each of the three tool names
    # listed above.
    # "if" runs the block below it only when the condition is true,
    # each of these three checks which tool was actually requested and
    # handles that one case.
    if name == "search_bug_catalog":
        q = tool_input["query"].lower()
        # .items() turns the BUG_CATALOG lookup table into pairs of
        # (key, value); this list comprehension (a compact way to
        # build a filtered list) keeps only the pairs whose
        # description contains the search keyword.
        matches = [(k, v) for k, v in BUG_CATALOG.items() if q in v.lower()]
        return json.dumps(matches if matches else "no matches")

    if name == "check_live_api":
        # requests.get(...) makes a real network request to the live
        # PeakAndPack site, the same way a browser would.
        # f"{API_BASE}{...}" glues the base address and the specific
        # path together into one full URL.
        res = requests.get(f"{API_BASE}{tool_input['endpoint']}")
        return json.dumps({"status": res.status_code, "body": res.text[:500]})

    if name == "search_past_reports":
        q = tool_input["query"].lower()
        matches = [r for r in PAST_REPORTS if q in r["summary"].lower()]
        return json.dumps(matches if matches else "no matches")

    return "unknown tool"


def triage(failure_text):
    # The main loop. Unlike the workflow's triage() function (one
    # call, no loop), this one can go back and forth with Claude
    # multiple times.
    # "messages" is the running conversation history, sent to Claude
    # fresh on every call in the loop below since each API call has no
    # memory of previous ones on its own. It starts with just the
    # opening prompt, and more entries get added to it as the loop runs.
    messages = [
        {
            "role": "user",
            "content": f"""You are triaging ONE failing test's output for PeakAndPack. You have tools: search the known bug catalog, check the live API to see if a failure still reproduces right now, and search past reports for similar prior incidents. Use whichever tools help, in whatever order makes sense, then give a final verdict.

Failing test output:
{failure_text}

When you have enough information, reply with ONLY a raw JSON object, nothing else, no markdown code fences, no backticks, no explanation:
{{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry", "reasoning": "one sentence"}}""",
        }
    ]

    # A counter, just a plain number that goes up by one each time a
    # tool actually gets called, purely for reporting at the end.
    tool_call_count = 0

    # A "for loop" repeats the block below it, counting i from 0 up to
    # (but not including) MAX_ITERATIONS. This is the actual agentic
    # loop: each pass through is one round trip to Claude.
    for i in range(MAX_ITERATIONS):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        # Adds Claude's reply onto the running conversation history, so
        # the next loop pass (if there is one) includes everything
        # said so far, not just the original question.
        messages.append({"role": "assistant", "content": response.content})

        # Primary termination check: stop_reason, not the shape of the content.
        if response.stop_reason == "end_turn":
            # Looks through Claude's reply for the text part of it (as
            # opposed to a tool-use part) and grabs just that.
            text_block = next((b for b in response.content if b.type == "text"), None)
            raw_text = text_block.text.strip() if text_block else "{}"
            # Same issue as the workflow script: plain-text JSON requests
            # have no hard guarantee, Claude can wrap the answer in a
            # markdown code fence even when told not to. Strip one off
            # the front and back, if present, before parsing.
            raw = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
            raw = re.sub(r"```\s*$", "", raw, flags=re.IGNORECASE).strip()
            try:
                # {**json.loads(raw), ...} takes everything Claude's
                # JSON answer contained and adds two extra fields onto
                # it before returning, how many tools were used and
                # how many loop passes it took to get here.
                return {**json.loads(raw), "tool_calls_used": tool_call_count, "iterations": i + 1}
            except Exception:
                return {"match": None, "confidence": "low", "action": "file-new", "reasoning": "unparseable output", "tool_calls_used": tool_call_count, "iterations": i + 1}

        if response.stop_reason == "tool_use":
            # Keeps only the parts of Claude's reply that are actual
            # tool requests (Claude can mix text and tool requests in
            # one reply, this line picks out just the tool ones).
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            tool_results = []
            # Runs every tool Claude asked for in this turn (there can
            # be more than one), and collects each result.
            for use in tool_uses:
                tool_call_count += 1
                result = run_tool(use.name, use.input)
                tool_results.append({"type": "tool_result", "tool_use_id": use.id, "content": result})
            # Adds all those tool results onto the conversation
            # history as the next message, then "continue" jumps back
            # to the top of the for loop for another round trip, now
            # with those results included, so Claude can reason about
            # what it just learned.
            messages.append({"role": "user", "content": tool_results})
            continue

        # Any other stop_reason (max_tokens, stop_sequence) is neither
        # "keep going" nor "here is the answer". Surface it rather than
        # silently treating it as either.
        return {"match": None, "confidence": "low", "action": "file-new", "reasoning": f"unexpected stop_reason: {response.stop_reason}", "tool_calls_used": tool_call_count, "iterations": i + 1}

    # Hit MAX_ITERATIONS without stop_reason ever being "end_turn".
    # This is the safety backstop, not the normal exit path, and it's
    # a real failure mode a fixed workflow cannot have, since a
    # workflow has no loop to get stuck in.
    return {"match": None, "confidence": "low", "action": "file-new", "reasoning": "exceeded max iterations without converging", "tool_calls_used": tool_call_count, "iterations": MAX_ITERATIONS}


# Same pattern as d1-triage-workflow.py: read the file you passed on
# the command line, run triage() on its contents, print the result.
with open(sys.argv[1], "r", encoding="utf-8") as f:
    failure_text = f.read()

verdict = triage(failure_text)
print(json.dumps(verdict, indent=2))
