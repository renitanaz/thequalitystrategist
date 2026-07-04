#!/usr/bin/env node
/*
 * Bug Analysis Agent (Node.js)
 * The Quality Strategist - AI-Augmented QA Series, Phase 3
 *
 * What it does:
 *   Reads peakandpack-requirements.md sitting in the same folder,
 *   sends it to Claude with a UI-test-case system prompt, and writes
 *   the result to test-cases-ui-agent.md in the same folder.
 *
 * It does NOT open or inspect any running site. The requirements
 * document is the only source of truth.
 *
 * Setup (full walkthrough is on the Phase 3 AI Agent blog page):
 *   1. Have Node 18 or newer installed (node --version).
 *   2. Put this file and peakandpack-requirements.md in one folder.
 *   3. Give it your key:
 *        Mac:               export ANTHROPIC_API_KEY=sk-ant-your-key
 *        Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-your-key"
 *   4. Run:  node bug-analysis-agent.js
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = 'ci-output.txt';
const OUTPUT_FILE = 'bug-detection-report.md';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a bug analysis agent for PeakAndPack, a trekking and travel gear e-commerce app. You will be given one or more of the following:
  - Playwright CI output (failing test names, error messages, traces)
  - Visual diff screenshots from a baseline comparison
  - API response bodies that contain unexpected data

Your job is to produce a formal bug detection report covering every failure in the evidence provided.

For each bug, write:
  - Bug ID (use the ID from the failing test name if present, or assign a sequential ID if not)
  - Title (one line, specific to what is broken)
  - Steps to reproduce (numbered, reproducible by a developer who was not present when the bug was found)
  - Expected (what the requirements or reasonable behaviour says should happen)
  - Actual (what the evidence shows actually happened, specific)
  - Severity (Critical / High / Medium / Low with a one-line justification based on user and business impact)
  - Evidence (name the specific test, screenshot, or API call that surfaces this bug)

After all bug reports, write a detection analysis:
  - Which testing phase first surfaced each bug (Phase 3 test cases, Phase 4 visual, Phase 5 API contract, Phase 6 E2E)
  - What the estimated cost would be if the bug reached production (revenue impact, data risk, user trust)

Rules:
  - Base every finding on the evidence you are given. Do not invent bugs you cannot see in the provided output.
  - If a failing test name contains a bug ID, use it.
  - If you cannot determine steps to reproduce from the evidence alone, write the steps you can infer and mark any uncertain step with [CONFIRM].
  - Return only the report. No preamble.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No API key found. Set ANTHROPIC_API_KEY first (see the setup notes at the top of this file).');
    process.exit(1);
  }

  const reqPath = path.join(__dirname, RESULTS_FILE);
  if (!fs.existsSync(reqPath)) {
    console.error('Could not find ' + RESULTS_FILE + ' next to this script.');
    console.error('Put ci-output.txt (your Playwright CI output) in the same folder as this file.');
    process.exit(1);
  }
  const requirements = fs.readFileSync(reqPath, 'utf8');

  console.log('Reading ' + RESULTS_FILE + ' (' + requirements.length + ' characters).');
  console.log('Analysing bug evidence with ' + MODEL + ', this takes a minute...');

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: 'Here is the bug evidence from the test suite:\n\n' + results }]
      })
    });
  } catch (err) {
    console.error('Network error calling the API: ' + err.message);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error('API returned ' + res.status + '. A 401 usually means the key is wrong.');
    console.error(body);
    process.exit(1);
  }

  const data = await res.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');

  fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), text, 'utf8');
  console.log('Done. Wrote ' + OUTPUT_FILE + '.');
  console.log('Review every row before treating it as final.');
}

main();
