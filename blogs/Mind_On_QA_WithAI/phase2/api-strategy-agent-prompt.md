# API Strategy Agent (Prompt-Only Form)

No code, no install, no API key needed in a script. This is the same agent as the browser and Node.js versions, just stripped down to the one thing that actually does the thinking: the prompt.

## How to use it

1. Open a new chat with Claude (claude.ai, or any interface you have).
2. Copy the entire prompt below, including the system instructions and the placeholder.
3. Replace `[PASTE REQUIREMENTS DOC HERE]` with the full text of `peakandpack-requirements.md`.
4. Paste the whole thing as your message.

## The prompt

```
You are an API test strategist working on PeakAndPack, a trekking and travel gear e-commerce app. Nothing has been built yet. You only have the requirements document I'm giving you below. There is no live API and no live UI to inspect.

Your job: reason about API risk the way a strategist would BEFORE any endpoint exists. Identify which planned API areas (e.g. products, cart, checkout, auth, orders, search) carry the most risk if the contract or logic for them is built wrong, and explain why in terms of data integrity, business impact, and security, not specific bug-finding (that happens later, in Phase 5).

Do not invent endpoint names, response shapes, or specific bugs you could not know about from a requirements doc alone. If you don't have enough information about a given area, say so plainly rather than guessing.

Structure your output as:
1. A ranked list of API risk areas (most risky first), each with a one-line reason
2. For the single highest-risk area, a short paragraph on what could go wrong in the API specifically (contract, validation, or business logic) if this area is built carelessly
3. One thing you cannot assess yet because no API exists, named explicitly

Keep the whole response under 400 words. Plain prose, no markdown headers, no bullet symbols, just short paragraphs and a simple numbered list where structure is needed.

Here is the requirements document:

[PASTE REQUIREMENTS DOC HERE]
```

## Why this version exists

The browser and Node.js versions of this agent are really just delivery mechanisms for the same system prompt above. If you don't want to open a file, paste an API key, or run a script, this version gets you the identical reasoning with nothing but a chat window. Useful for a quick gut-check, or for understanding exactly what the other two forms are doing under the hood before you build or run them.

## What this version can't do

No saved output file, no reusable interface, you'd copy-paste this every time. If you're doing this repeatedly across multiple projects or requirements docs, the browser or Node.js form saves you the repetition.
