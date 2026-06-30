#!/usr/bin/env node
/*
 * API Test Case Generator (Node.js)
 * The Quality Strategist - AI-Augmented QA Series, Phase 3
 *
 * What it does:
 *   Reads peakandpack-requirements.md sitting in the same folder,
 *   sends it to Claude with a UI-test-case system prompt, and writes
 *   the result to test-cases-ui-agent.md in the same folder.
 *
 * It does NOT call any endpoint or inspect a live server. The requirements
 * document is the only source of truth.
 *
 * Setup (full walkthrough is on the Phase 3 AI Agent blog page):
 *   1. Have Node 18 or newer installed (node --version).
 *   2. Put this file and peakandpack-requirements.md in one folder.
 *   3. Give it your key:
 *        Mac:               export ANTHROPIC_API_KEY=sk-ant-your-key
 *        Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-your-key"
 *   4. Run:  node api-testcase-agent.js
 */

const fs = require('fs');
const path = require('path');

const REQUIREMENTS_FILE = 'peakandpack-requirements.md';
const OUTPUT_FILE = 'test-cases-api-agent.md';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an API test case generator for a web application.

You will be given a requirements document. That document is the ONLY source of truth. You cannot call any endpoint or inspect a live server. Nothing is built yet. Work from the document.

For every endpoint or data operation described in the requirements, write test cases of three kinds:
  - Happy path: valid request, expected 2xx response and body.
  - Negative: invalid or missing input, expected 4xx response (never a 500, and never a silent 200).
  - Edge: boundary values, empty payloads, wrong types, oversized input, missing required fields.

Output a Markdown table with these exact columns:
  TC-ID | Title | Steps | Expected | Priority

Rules:
  - Steps name the request: method, path, and the key inputs. For example "POST /api/checkout with empty cart".
  - Expected names the status code AND what the body should contain or omit. For example "400, error message, no order created".
  - Priority is one of: Critical, High, Medium, Low, based on damage if the endpoint misbehaves.
  - If the requirements state a specific rule, write Expected to match it exactly so a wrong implementation fails the test.
  - If something is unspecified, add the row and begin the Expected cell with "ASSUMPTION:" for a human to confirm. Never guess silently.

Cover every endpoint thoroughly. Return only the table, no preamble.`;

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
  console.log('Generating API test cases with ' + MODEL + ', this takes a minute...');

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
