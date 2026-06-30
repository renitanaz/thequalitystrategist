# PeakAndPack Playwright Test Strategy

This README explains the tagging convention enforced by `playwright.config.ts`. Read this before adding new tests.

---

## The flow, tag to report

```
  write test          tag it             run it                  see it
  ───────────         ──────────         ─────────────────       ──────────────
  test('...', ...) →  @critical    →     npx playwright test  →  playwright-report/
                       @high              --grep @critical        (HTML, pass/fail,
                       @regression                                 screenshots on fail)
```

The tag you choose at write time decides which command picks the test up later. Get the tag wrong and a critical test might only run in the regression sweep, days after it should have blocked a release.

---

## Tag meanings

| Tag | Meaning | When to use |
|---|---|---|
| `@critical` | Failure here means real money lost or a data leak | Checkout discount logic, orders visibility, auth boundaries |
| `@high` | Failure here breaks a core user flow but isn't a money/data risk | Cart totals, stock checks |
| `@regression` | Lower-stakes, but worth re-checking after any change | Sort order, product listing display |

These match the risk ranking in `test-strategy-manual.md` and `test-strategy-ai-assisted.md`. The ranking decided what matters; these tags enforce that ranking in code.

## Running by tag

```bash
# Run only the critical suite before a release
npx playwright test --grep @critical

# Run everything except regression (faster local feedback loop)
npx playwright test --grep-invert @regression
```

## Self-healing pattern

All locators in this suite use role-based selectors or `data-testid`, not CSS classes:

```typescript
// Avoid
page.locator('.btn-checkout-submit')

// Use
page.getByRole('button', { name: 'Place order' })
page.getByTestId('checkout-submit-btn')
```

This means a UI redesign that changes class names or layout doesn't break the test suite, only a change to the actual button text or test ID would.

## Retry behavior

`retries: process.env.CI ? 2 : 1` means a flaky test gets one extra attempt locally, two in CI, before being reported as a real failure. This is configured in `playwright.config.ts`, not per-test, so it applies consistently across the whole suite.
