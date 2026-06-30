import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Self-healing: auto-retry flaky tests once locally, twice in CI
  retries: process.env.CI ? 2 : 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['line'],
  ],

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],

  use: {
    baseURL: 'https://peakandpackshopdemo.onrender.com',
    trace: 'on-first-retry',
  },
});
