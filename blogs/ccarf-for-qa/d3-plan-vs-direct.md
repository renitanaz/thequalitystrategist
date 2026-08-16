# Plan mode vs. direct execution: two real PeakAndPack tasks

Task Statement 3.4 in the exam guide is a judgment call, not a rule of
thumb. This is that judgment applied to two actual tasks against
PeakAndPack, reasoned through against the guide's own knowledge points,
not run inside a live Claude Code session (no interactive terminal in
this writing environment, see the methodology note in the main post).

## Task A: close BUG-004 and BUG-007 together

BUG-004 is no price validation on the products endpoint. BUG-007 is the
cart trusting a client-supplied price at checkout. They share a root
cause: nothing on the server ever re-validates a price against what it
should be. Fixing them separately risks two inconsistent validation
rules; fixing them together means deciding where validation lives.

Criteria from the guide, checked against this task:
- Multi-file: touches the products endpoint, the cart endpoint, and
  probably a shared validation layer. Yes.
- Multiple valid approaches: middleware that validates every price-
  bearing request, a shared schema both endpoints import, or per-
  endpoint checks that duplicate the same rule. All three work,
  none is obviously correct without looking at what else touches
  pricing.
- Architectural decision: where validation lives affects every future
  endpoint that touches price, not just these two. Yes.

**Verdict: plan mode.** Explore how products, cart, and checkout
currently handle price, identify every call site that would need to
change under each approach, and choose before writing code. Getting this
wrong costs a rewrite across three files, not a one-line fix.

## Task B: close BUG-002

BUG-002 is product registration accepting an empty name field. The fix
is a single required-field check in the product-creation handler.

Criteria from the guide, checked against this task:
- Multi-file: no, one handler.
- Multiple valid approaches: no, "reject empty string" has one
  reasonable shape.
- Well-understood change with clear scope: yes, the guide's own example
  for direct execution is "adding a single validation check to one
  function," which is exactly this.

**Verdict: direct execution.** Planning this would cost more than the
fix itself.

## The pattern, not just the two examples

Task A and Task B aren't chosen to make the contrast easy. BUG-004 and
BUG-007 could each be fixed alone with a single, well-scoped change, the
same shape as Task B. What pushes them into plan-mode territory is
choosing to fix them *together*, because that choice is what turns a
small validation fix into a decision about where validation lives
project-wide. The same underlying bug can sit on either side of this
line depending on scope, which is the actual skill Task Statement 3.4
is testing, not a lookup table of task types.
