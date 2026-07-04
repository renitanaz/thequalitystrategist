#!/usr/bin/env node
/*
 * Reporting Agent (Node.js)
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
 *   4. Run:  node reporting-agent.js
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = 'all-deliverables.md';
const OUTPUT_FILE = 'qa-programme-summary.md';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a QA programme analyst. You will be given the deliverables from an eight-phase QA programme for PeakAndPack, a trekking and travel gear e-commerce app.

Produce a complete QA programme summary report containing:

1. Programme scope: what was and was not tested.
2. Approach summary: the four approaches used and what each contributed.
3. Full bug list: all bugs found, with ID, title, severity, and the phase that first surfaced each.
4. Risk assessment: which findings block release and why, in business language a non-technical stakeholder can act on.
5. Release recommendation: a clear verdict (release / release with conditions / do not release) with the specific conditions if any.
6. Approach comparison: which approach caught what, what each approach costs in time, and what each contributes that the others cannot.

Rules:
- Base every finding on the deliverables provided. Do not invent bugs or findings not in the input.
- Use business language in the risk assessment and recommendation. Translate technical issues into user and business impact.
- The recommendation must be a clear verdict. Do not hedge.
- If a finding has a severity, use it. Do not reassign severities without explaining why.
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
    console.error('Put all-deliverables.md (combined phase deliverables) in the same folder as this file.');
    process.exit(1);
  }
  const requirements = fs.readFileSync(reqPath, 'utf8');

  console.log('Reading ' + RESULTS_FILE + ' (' + requirements.length + ' characters).');
  console.log('Generating QA programme summary with ' + MODEL + ', this takes a minute...');

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
        messages: [{ role: 'user', content: 'Here are the QA programme deliverables:\n\n' + results }]
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
