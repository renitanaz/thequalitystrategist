#!/usr/bin/env node
/*
 * E2E Flow Trace Agent (Node.js)
 * The Quality Strategist - AI-Augmented QA Series, Phase 3
 *
 * What it does:
 *   Reads flow-results.md sitting in the same folder (your saved
 *   sends it to Claude with a UI-test-case system prompt, and writes
 *   the result to test-cases-ui-agent.md in the same folder.
 *
 * step-by-step journey results), analyses the whole journey, and writes
 * e2e-trace-output.md. It does NOT run the flow itself; it reasons from
 * document is the only source of truth.
 *
 * Setup (full walkthrough is on the Phase 3 AI Agent blog page):
 *   1. Have Node 18 or newer installed (node --version).
 *   2. Put this file and flow-results.md in one folder.
 *   3. Give it your key:
 *        Mac:               export ANTHROPIC_API_KEY=sk-ant-your-key
 *        Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-your-key"
 *   4. Run:  node e2e-trace-agent.js
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = 'flow-results.md';
const OUTPUT_FILE = 'e2e-trace-output.md';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an end-to-end flow analyst for PeakAndPack, a trekking and travel gear e-commerce app. You will be given the step-by-step results of one user journey (for example login, add to cart, apply discount, checkout, view orders), and optionally the requirements describing what each step should do. Each step lists what was done and what actually happened (a status code, a response body, or what appeared on screen).

Your job is to analyse the journey as a whole, not step by step in isolation. A flow can have every step return a 200 and still be broken as an experience, because the failure is in how the steps connect.

For the journey given:
- Walk each step in order and give a verdict: pass, or fail with the specific reason.
- Identify the first step where reality diverges from what should happen, and explain how that divergence affects every step after it.
- Call out cross-step problems that no single step reveals: a total that is correct at cart but wrong at checkout, data from one user appearing in another's history, a cart that does not clear after a completed order.
- Judge the journey by its real-world impact: what would an actual customer experience if they walked this exact path?

Rules:
- Reason only from the results you are given. Do not invent steps, responses, or bugs that are not in the provided data. If a step's result is missing or unclear, say so rather than guessing.
- If you are given the requirements, use them to decide what each step should have done, and name the requirement a failure relates to.
- A correct status code is not proof a step passed. If the body or the on-screen result is wrong, the step fails even at 200. Say so explicitly.
- If the whole journey is clean, say that plainly and do not manufacture problems.

Output a short Markdown report: a one-line verdict on the whole journey, then a per-step table (Step, Expected, Actual, Verdict), then a short paragraph on the single most important cross-step issue and its customer impact. End with one line naming anything you could not assess from the provided results alone.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No API key found. Set ANTHROPIC_API_KEY first (see the setup notes at the top of this file).');
    process.exit(1);
  }

  const reqPath = path.join(__dirname, RESULTS_FILE);
  if (!fs.existsSync(reqPath)) {
    console.error('Could not find ' + RESULTS_FILE + ' next to this script.');
    console.error('Put flow-results.md in the same folder as this file.');
    process.exit(1);
  }
  const requirements = fs.readFileSync(reqPath, 'utf8');

  console.log('Reading ' + RESULTS_FILE + ' (' + requirements.length + ' characters).');
  console.log('Analysing the journey with ' + MODEL + ', this takes a minute...');

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
        messages: [{ role: 'user', content: 'Here are the step-by-step results of one user journey. Analyse the whole flow:\n\n' + requirements }]
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
