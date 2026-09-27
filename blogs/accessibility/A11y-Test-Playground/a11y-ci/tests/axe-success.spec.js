// @ts-check
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');

test('clean page has no critical or serious accessibility violations', async ({ page }) => {
  const filePath = path.join(__dirname, '..', '..', '32 A11y Test Playground - Axe Core CI Pass.html');
  await page.goto(`file://${filePath}`);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const blocking = results.violations.filter(v =>
    ['critical', 'serious'].includes(v.impact)
  );

  expect(blocking).toHaveLength(0);
});
