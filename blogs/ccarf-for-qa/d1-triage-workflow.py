# D1: Deterministic workflow implementation of the triage task (Python version).
#
# Same logic as d1-triage-workflow.ts, translated as directly as
# possible. If TypeScript syntax was the confusing part rather than
# the logic itself, read this version instead, everything it does is
# identical.
#
# Fixed execution path, every time: read input -> one classification
# call with a strict schema -> apply the schema's own confidence rule
# -> return a verdict. No branching on what comes back, no tools, no
# second call. If the classification is uncertain, the workflow does
# not loop or investigate further, it returns "file-new" and stops.
#
# Run: python d1-triage-workflow.py <path-to-failure.json>
# Needs: ANTHROPIC_API_KEY in the environment.
# Needs: pip install anthropic   (installs the official Claude library)

import sys        # gives access to command-line arguments
import json       # for converting to/from JSON text
import re         # for stripping markdown code fences from Claude's reply
import anthropic  # the official library for talking to Claude

# Creates one object that knows how to send requests to Claude's API.
# It reads your ANTHROPIC_API_KEY from the environment automatically,
# you never type the key into this file itself.
client = anthropic.Anthropic()

# A variable here is just a named value, set once, that the rest of
# the file can refer to by name instead of retyping it everywhere.
# This one is a single block of text (everything between the triple
# quotes), the 11-bug catalog, exactly as published on the
# AI-Augmented QA series intro page. This is the workflow's entire
# "knowledge" of what a known bug looks like, there is no live lookup,
# no search, just this fixed text.
BUG_CATALOG = """
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
""".strip()  # .strip() removes the stray blank lines/spaces at the
             # start and end of the block above, tidying the text.

# Python doesn't need a separate "interface" declaration the way
# TypeScript does, but here's the shape triage() below always returns,
# for reference:
#   {"match": "BUG-001" or None, "confidence": "high"/"medium"/"low",
#    "action": "file-new"/"link-existing"/"flag-flaky-retry"}


def triage(failure_text):
    # "def" starts a function, a named, reusable block of steps.
    # Everything indented under it only runs when triage(...) is
    # actually called, which happens once, near the bottom of this
    # file. This call simply waits (blocks) until Claude's response
    # comes back before moving to the next line, Python's default
    # client works this way, no separate "async"/"await" needed.
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        # Single message. No tools. No conversation history. This call
        # either returns a verdict or the workflow has nothing.
        messages=[
            {
                "role": "user",
                # Everything inside these triple quotes is one long
                # piece of text, the actual prompt. The f in front of
                # the opening quotes (an "f-string") means {BUG_CATALOG}
                # and {failure_text} are placeholders: at the moment
                # this code runs, each one gets swapped out for the
                # real value it's holding.
                "content": f"""You are classifying ONE failing test's output against a fixed bug catalog. Do not investigate further, you have no other information than what is given here.

Bug catalog:
{BUG_CATALOG}

Failing test output:
{failure_text}

Reply with ONLY a raw JSON object matching this exact shape, nothing else, no markdown code fences, no backticks, no explanation:
{{"match": "BUG-XXX or null", "confidence": "high|medium|low", "action": "file-new|link-existing|flag-flaky-retry"}}""",
            }
        ],
    )

    # Claude's reply comes back as a list of content blocks. This line
    # checks the first block is plain text (not something else), and
    # pulls out just the text string, "{}" as a fallback if it isn't.
    text = response.content[0].text if response.content[0].type == "text" else "{}"
    # Asking for "ONLY a JSON object" in plain prose is a request, not
    # a guarantee, unlike tool_use (see D4's Task Statement 4.3), plain
    # text prompting has no hard enforcement. Claude sometimes wraps its
    # answer in a markdown code fence anyway, ```json ... ```, which
    # json.loads cannot read as-is. re.sub strips a fence off the
    # front and back, if one is there, before parsing continues.
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.IGNORECASE).strip()
    # "try" attempts something that might fail; if it does, "except"
    # below runs instead of crashing the whole script.
    try:
        # json.loads turns a text string that looks like {"key": "value"}
        # into a real Python dictionary the rest of the code can work with.
        return json.loads(cleaned)
    except Exception:
        # The workflow's only failure handling: if the model didn't return
        # valid JSON, there is no retry, no second attempt. It surfaces as
        # an unclassified case, which is itself a data point on reliability.
        return {"match": None, "confidence": "low", "action": "file-new"}


# sys.argv is the list of things typed on the command line when you
# ran this script. sys.argv[1] is the second item in that list (Python
# counts the script's own name as item 0), in practice, whatever
# filename you typed after the script's own name, e.g. scenario-1.txt.
# open(...).read() opens that file and reads its entire contents in as
# one text string.
with open(sys.argv[1], "r", encoding="utf-8") as f:
    failure_text = f.read()

# Calls triage() with that text and prints the result. json.dumps
# turns the verdict dictionary back into readable text; indent=2 tells
# it to indent nicely instead of squishing everything onto one line.
verdict = triage(failure_text)
print(json.dumps(verdict, indent=2))
