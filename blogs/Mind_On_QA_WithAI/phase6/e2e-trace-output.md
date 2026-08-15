# E2E Flow Trace: Login → Add to Cart → Checkout with Discount

**Phase:** 6, Approach D, AI Agent
**Journey walked:** live session against https://peakandpack-ui.onrender.com/, test account
**Requirements referenced:** `peakandpack-requirements.md` (Phase 1)
**Author:** Claude (Anthropic), via the E2E flow trace agent prompt, reviewed by RN

---

**Verdict:** The journey completes without a single error response, every step returns success, and it is still broken: the store charges nothing for a real order.

## Step-by-step

| Step | Expected | Actual | Verdict |
|---|---|---|---|
| 1. Log in with test account | Signed in, session established | Signed in, "Hi, Test User" shown | PASS |
| 2. Add "Trekking Poles (Pair)" ($34.99) to cart | Item added | Item added | PASS |
| 3. View cart | Item listed, total = $34.99 | Item listed, total = $34.99 | PASS |
| 4. Proceed to checkout | Checkout page with discount code field | Checkout page shown, discount code field present | PASS |
| 5. Enter discount code `SAVE10`, place order | Total reduced by exactly 10 percent (per Phase 1 acceptance criteria: "$100 total → $90, not $0") | Order placed at **"Total charged: $0.00"** | FAIL |
| 6. Order confirmation | Confirmation naming the order and the amount actually charged | "Order placed!" shown with Order ID, but the charged amount is $0.00 | FAIL |

## The cross-step issue

No individual step in this journey returns an error, a bad status code, or a visibly broken screen. Steps 1 through 4 are indistinguishable from a correct flow. The failure only exists in the relationship between step 5's input (a 10%-off code on a $34.99 item) and step 6's output (a $0.00 charge): each step in isolation looks fine, and the divergence only shows up when you compare what went in against what came out at the end of the journey. This is the exact class of bug an isolated endpoint check misses and a full walkthrough catches: the checkout endpoint likely returns 200/201 regardless, so a test asserting only status codes would pass this journey. The real-world impact is direct: a customer who finds `SAVE10` gets the product for free, and every order placed with that code represents full revenue loss on that order, not a 10 percent discount.

**Could not assess from this session alone:** whether the $0.00 total is applied to every item regardless of price (only one product was tested here), and whether the order is recorded internally at $0.00 or at the correct pre-discount amount with only the customer-facing total displayed wrong, that distinction changes whether this is a display bug or a real financial one, and would need a check against the order record itself (Phase 5's API layer) to confirm.
