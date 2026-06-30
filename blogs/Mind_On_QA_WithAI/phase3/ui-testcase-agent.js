#!/usr/bin/env node
/*
 * UI Test Case Generator (Node.js)
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
 *   4. Run:  node ui-testcase-agent.js
 */

const fs = require('fs');
const path = require('path');

const REQUIREMENTS_FILE = 'peakandpack-requirements.md';
const OUTPUT_FILE = 'test-cases-ui-agent.md';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a UI test case generator for a web application.

You will be given a requirements document. That document is the ONLY source of truth. You cannot see the running app, call any API, or take screenshots. Nothing is built yet. Work from the document.

For every user-facing feature described in the requirements, write test cases of three kinds:
  - Happy path: valid input, the expected success result.
  - Negative: invalid input, the expected failure (a clear error, not a silent success).
  - Edge: boundary values, empty fields, very long input, special characters, unusual but legal states.

Output a Markdown table with these exact columns:
  TC-ID | Title | Steps | Expected | Priority

Rules:
  - Steps are written as user actions: "Click X", "Type Y in field Z".
  - Expected is what the user should SEE, not internal status codes.
  - Priority is one of: Critical, High, Medium, Low. Base it on how much damage the failure would cause, using any risk hints in the requirements.
  - If the requirements state a specific rule (for example a discount code is 10% off), write the Expected to match that rule exactly, so a wrong implementation will fail the test.
  - If the requirements are silent or unclear on something, add a row and put "ASSUMPTION:" at the start of the Expected cell, so a human reviewer can confirm it. Do not guess silently.

Aim for thorough coverage of every feature, not volume for its own sake. Return only the table, no preamble.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No API key found. Set ANTHROPIC_API_KEY first (see the setup notes at the top of this file).');
    process.exit(1);
  }

  const reqPath = path.join(__dirname, REQUIREMENTS_FILE);
  if (!fs.existsSync(reqPath)) {
    console.error('Could not find ' + REQUIREMENTS_FILE + ' next to this script.');
    console.error('Put peakandpack-requirements.md in the same folder as this file.');
    process.exit(1);
  }
  const requirements = fs.readFileSync(reqPath, 'utf8');

  console.log('Reading ' + REQUIREMENTS_FILE + ' (' + requirements.length + ' characters).');
  console.log('Generating UI test cases with ' + MODEL + ', this takes a minute...');

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
        messages: [{ role: 'user', content: 'Here is the requirements document:\n\n' + requirements }]
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
