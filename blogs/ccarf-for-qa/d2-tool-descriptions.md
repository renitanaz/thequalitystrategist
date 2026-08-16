# Splitting an ambiguous PeakAndPack tool in two

Task Statement 2.1. The guide's own example: `analyze_content` vs
`analyze_document` with near-identical descriptions cause misrouting.
Here's PeakAndPack's version of the same mistake, and the fix.

## Before: one tool, two jobs

```json
{
  "name": "check_data",
  "description": "Checks data.",
  "input_schema": {
    "type": "object",
    "properties": { "id": { "type": "string" } },
    "required": ["id"]
  }
}
```

Ambiguous on every axis the guide names: no input format (`id` of
what?), no example queries, no edge cases, no boundary against any other
tool. An agent facing "is this product's price valid?" and "does this
order's total match?" has no way to know both call the same tool, or
whether they should.

## After: two tools, clear boundaries

```json
{
  "name": "verify_product_price",
  "description": "Checks whether a product's listed price is valid: not negative, not zero, under $9,999.99. Takes a product ID. Returns {valid: boolean, reason: string | null}. Use for product-catalog price checks (BUG-001, BUG-003, BUG-004 territory). Does NOT check order totals, cart pricing, or discount math, use verify_order_total for those."
}
```

```json
{
  "name": "verify_order_total",
  "description": "Recomputes an order's total server-side from its line items and compares it to the stored total. Takes an order ID. Returns {matches: boolean, expected: number, stored: number}. Use for cart/checkout total checks (BUG-007, BUG-009 territory). Does NOT validate individual product prices, use verify_product_price for that."
}
```

Each description now states its input, its output shape, which known
bugs it's relevant to, and explicitly rules out the other tool's job.
That last part, the "does NOT" line, is what the guide's own skill
point calls out directly: eliminating functional overlap, not just
describing what a tool does in isolation.

## How to use it

No script to run. When writing an MCP tool description, answer four
things explicitly: input format, output shape, when to use it, and when
NOT to (name the sibling tool that handles the other case). A
description missing the fourth one is usually the one causing
misrouting.
