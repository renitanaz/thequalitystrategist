# D1: Tool scoping, run for real (Python version). Same logic as
# d1-tool-scoping-demo.ts, translated as directly as possible.
#
# For Part 2's own claim: an agent juggling both live-checks and
# catalog-search in one context can mix up "found in the catalog" with
# "confirmed still true." Splitting the work across two agents that
# each get only one job's worth of tools removes that shortcut
# structurally, it isn't just a suggestion.
#
# This runs the SAME scenario two ways and prints which tools each
# version actually called, so the difference is something you watch
# happen, not something you take on faith.
#
# Run: python d1-tool-scoping-demo.py scenario-3.txt
# Needs: ANTHROPIC_API_KEY in the environment, and network access.
# Needs: pip install anthropic requests
#
# Use Scenario 3 from d1-triage-scenarios.md for this, it's the one
# built specifically to test whether an agent actually verifies live
# or just trusts what the catalog says:
#   Test: "empty search query returns 400, not a crash"
#   Expected: response.status === 400
#   Actual: response.status === 500, body: "Internal Server Error"

import sys
import json
import re
import asyncio
import anthropic
import requests

client = anthropic.Anthropic()
API_BASE = "https://peakandpackshopdemo.onrender.com"

# Same fixed catalog and mock reports store as d1-triage-agent.py,
# reused here on purpose: both versions below work against identical
# "known" information. The only difference between them is which
# tools each agent can reach, not what data exists to find.
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

PAST_REPORTS = [
    {"id": "RPT-014", "summary": "Checkout occasionally slow after idle period, suspected cold start", "related_bug": None},
    {"id": "RPT-022", "summary": "Sleeping Bag price displays as negative", "related_bug": "BUG-001"},
]

# The three tool schemas. Each has the same name and behavior as its
# counterpart in d1-triage-agent.py, split apart here by which agent
# gets which, that split is the entire point of this file.
SEARCH_BUG_CATALOG_TOOL = {
    "name": "search_bug_catalog",
    "description": "Search the 11 known PeakAndPack bugs by keyword. Returns matching bug IDs and descriptions.",
    "input_schema": {
        "type": "object",
        "properties": {"query": {"type": "string", "description": "Keyword to search for"}},
        "required": ["query"],
    },
}

SEARCH_PAST_REPORTS_TOOL = {
    "name": "search_past_reports",
    "description": "Search previously filed bug/incident reports by keyword.",
    "input_schema": {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    },
}

CHECK_LIVE_API_TOOL = {
    "name": "check_live_api",
    "description": "Call the real, live PeakAndPack API to check current state. Use this to confirm whether a failure is still reproducible right now, not just at the time the test ran.",
    "input_schema": {
        "type": "object",
        "properties": {"endpoint": {"type": "string", "description": "API path, e.g. /api/products or /health"}},
        "required": ["endpoint"],
    },
}


# The actual work behind each tool name, identical to
# d1-triage-agent.py's run_tool, kept in one place here since both
# versions below call into the same three implementations.
def run_tool(name, tool_input):
    if name == "search_bug_catalog":
        q = tool_input["query"].lower()
        matches = [(k, v) for k, v in BUG_CATALOG.items() if q in v.lower()]
        return json.dumps(matches if matches else "no matches")

    if name == "search_past_reports":
        q = tool_input["query"].lower()
        matches = [r for r in PAST_REPORTS if q in r["summary"].lower()]
        return json.dumps(matches if matches else "no matches")

    if name == "check_live_api":
        res = requests.get(f"{API_BASE}{tool_input['endpoint']}")
        return json.dumps({"status": res.status_code, "body": res.text[:500]})

    return "unknown tool"


def strip_fence(text):
    # Strips a markdown code fence off a model's reply if one is
    # there, the same fix Post 01's other scripts needed after a
    # reader hit the real bug this caused.
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    return re.sub(r"```\s*$", "", cleaned, flags=re.IGNORECASE).strip()


# A single agentic loop, shared by both versions below, the only
# difference between Version A and Version B is which tools this gets
# called with and whether it runs once or twice in isolation.
def agentic_loop(failure_text, tools, system_note, max_iterations=6):
    messages = [
        {
            "role": "user",
            "content": f"""{system_note}

Failing test output:
{failure_text}

When you have enough information, reply with ONLY a raw JSON object, nothing else, no markdown code fences, no backticks, no explanation:
{{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry", "reasoning": "one sentence"}}""",
        }
    ]

    tools_called = []

    for i in range(max_iterations):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            text_block = next((b for b in response.content if b.type == "text"), None)
            raw_text = text_block.text.strip() if text_block else "{}"
            raw = strip_fence(raw_text)
            try:
                return {"verdict": json.loads(raw), "tools_called": tools_called}
            except Exception:
                return {"verdict": {"match": None, "confidence": "low", "action": "file-new", "reasoning": "unparseable output"}, "tools_called": tools_called}

        if response.stop_reason == "tool_use":
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            tool_results = []
            for use in tool_uses:
                tools_called.append(use.name)
                result = run_tool(use.name, use.input)
                tool_results.append({"type": "tool_result", "tool_use_id": use.id, "content": result})
            messages.append({"role": "user", "content": tool_results})
            continue

        return {"verdict": {"match": None, "confidence": "low", "action": "file-new", "reasoning": f"unexpected stop_reason: {response.stop_reason}"}, "tools_called": tools_called}

    return {"verdict": {"match": None, "confidence": "low", "action": "file-new", "reasoning": "exceeded max iterations"}, "tools_called": tools_called}


# ---------------------------------------------------------------------
# Version A: one agent, all three tools, one shared context. Nothing
# stops it from finding a catalog match and stopping there without
# ever calling check_live_api, the exact shortcut Part 2's callout
# warns about. Whether it actually takes that shortcut on any given
# run is the model's own judgment call, that unpredictability is the
# point, run this a few times and watch tools_called change.
# ---------------------------------------------------------------------
def single_agent_investigate(failure_text):
    return agentic_loop(
        failure_text,
        [SEARCH_BUG_CATALOG_TOOL, SEARCH_PAST_REPORTS_TOOL, CHECK_LIVE_API_TOOL],
        "You are triaging ONE failing test's output for PeakAndPack. You have tools: search the known bug catalog, search past incident reports for similar prior incidents, and check the live API to see if a failure still reproduces right now. Use whichever tools help, in whatever order makes sense, then give a final verdict.",
    )


# ---------------------------------------------------------------------
# Version B: two isolated agents, run concurrently via a thread pool
# (the anthropic client here is synchronous, unlike the TypeScript
# version's native async), neither sees the other's conversation. The
# verifier has ONLY check_live_api, it has no other tool to reach for,
# so calling it is the only way it can do its job at all. The searcher
# has ONLY the catalog tools. A verdict only gets produced once BOTH
# have reported back, and the live result wins on disagreement, not a
# vote between the two.
# ---------------------------------------------------------------------
async def scoped_investigate(failure_text):
    loop = asyncio.get_event_loop()
    verifier_future = loop.run_in_executor(
        None,
        agentic_loop,
        failure_text,
        [CHECK_LIVE_API_TOOL],
        'You verify bug reproduction against the live PeakAndPack API for one failing test. Call the endpoint most likely to reproduce it and report exactly what you observe. Reply with a verdict even though you have no catalog access, use "match": null if you can\'t name a bug ID, "confidence" and "reasoning" should describe what the live call actually showed.',
    )
    searcher_future = loop.run_in_executor(
        None,
        agentic_loop,
        failure_text,
        [SEARCH_BUG_CATALOG_TOOL, SEARCH_PAST_REPORTS_TOOL],
        'You search PeakAndPack\'s bug catalog and past incident reports for one failing test. Find the closest match, if any. Reply with a verdict even though you have no live-API access, "confidence" and "reasoning" should describe only what the catalog and past reports show, not whether it\'s still true right now.',
    )
    verifier, searcher = await asyncio.gather(verifier_future, searcher_future)

    tools_called = verifier["tools_called"] + searcher["tools_called"]

    # Combine deterministically, in code, not with a third model call.
    # If the live check actually reproduced (or didn't) the symptom,
    # that outranks what the catalog says, the catalog can be stale,
    # the live call just happened.
    live_says_reproduces = verifier["verdict"]["confidence"] != "low" and verifier["verdict"]["action"] != "file-new"
    if live_says_reproduces:
        verdict = {**verifier["verdict"], "catalog_match": searcher["verdict"]["match"], "reasoning": f"Live check is authoritative: {verifier['verdict']['reasoning']}. Catalog search separately found: {searcher['verdict']['reasoning']}"}
    else:
        verdict = {**searcher["verdict"], "live_checked": True, "reasoning": f"{searcher['verdict']['reasoning']} Live check ran and found: {verifier['verdict']['reasoning']}"}

    return {"verdict": verdict, "tools_called": tools_called, "verifier": verifier, "searcher": searcher}


async def main():
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        failure_text = f.read()

    print("=== Version A: one agent, all three tools, one context ===")
    a = single_agent_investigate(failure_text)
    print(json.dumps(a["verdict"], indent=2))
    print(f"Tools called: {', '.join(a['tools_called']) or 'none'}")
    print(f"Called check_live_api: {'check_live_api' in a['tools_called']}\n")

    print("=== Version B: two isolated, scoped agents ===")
    b = await scoped_investigate(failure_text)
    print(json.dumps(b["verdict"], indent=2))
    print(f"Tools called: {', '.join(b['tools_called']) or 'none'}")
    print(f"Called check_live_api: {'check_live_api' in b['tools_called']} (structurally guaranteed, the verifier has no other tool)\n")

    print("=== What to look at ===")
    print("Version A's live-check is optional, a judgment call the model made this run.")
    print("Version B's live-check isn't optional, it's the only tool that agent has.")


if __name__ == "__main__":
    asyncio.run(main())
