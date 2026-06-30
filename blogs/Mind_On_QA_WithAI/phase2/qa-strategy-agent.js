#!/usr/bin/env node
/*
 * QA Strategy Agent (Node.js form)
 * The Quality Strategist - AI-Augmented QA Series, Phase 2
 *
 * The terminal twin of qa-strategy-agent.html. Same system prompt,
 * same output, run from a terminal instead of a browser tab.
 *
 * It reasons from the requirements document ALONE. There is no live UI
 * and no live API at this stage, by design. It covers both web/functional
 * risk and API risk in one pass; ignore whichever section does not apply
 * to your project.
 *
 * Usage:
 *   node qa-strategy-agent.js peakandpack-requirements.md
 *
 * Setup (the blog page has the full step-by-step):
 *   1. Node 18 or newer installed (check with: node --version)
 *   2. An API key from console.anthropic.com, set in your terminal:
 *        Mac:     export ANTHROPIC_API_KEY=sk-ant-your-key
 *        Windows: set ANTHROPIC_API_KEY=sk-ant-your-key
 *   3. The requirements .md file in the same folder as this script.
 *
 * Output: prints to the terminal AND saves qa-strategy-output.md
 * in the same folder.
 */

const fs = require('fs');
const path = require('path');

const MODEL = 'claude-sonnet-4-6';
const OUTPUT_FILE = 'qa-strategy-output.md';

const SYSTEM_PROMPT = `You are a QA test strategist working on PeakAndPack, a trekking and travel gear e-commerce app. Nothing has been built yet. You only have the requirements document the user gives you. There is no live UI and no live API to inspect.

Your job: reason about test risk the way a strategist would BEFORE anything is built. Cover two kinds of testing:

Web and functional testing: which planned user-facing flows (e.g. product browsing, cart, checkout, auth, order history) carry the most risk if the UI or its behaviour is built wrong, in terms of user impact and business impact.

API testing: which planned API areas (e.g. products, cart, checkout, auth, orders, search) carry the most risk if the contract or logic for them is built wrong, in terms of data integrity, business impact, and security.

Do not invent screenshots, visual descriptions, endpoint names, response shapes, or specific bugs you could not know about from a requirements doc alone. If a project clearly has no UI or no API, say so and skip that section. If you don't have enough information about a given area, say so plainly rather than guessing.

Structure your output as:
1. Web and functional risk: a ranked list of UI risk areas (most risky first), each with a one-line reason
2. API risk: a ranked list of API risk areas (most risky first), each with a one-line reason
3. For the single highest-risk area across both lists, a short paragraph on what could go wrong if it is built carelessly
4. One thing you cannot assess yet because nothing is built, named explicitly

Keep the whole response under 500 words. Plain prose, no markdown headers, no bullet symbols, just short paragraphs and simple numbered lists where structure is needed.`;

async function main() {
  // --- Check the API key (matches the "Missing ANTHROPIC_API_KEY" error on the page) ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY. Set it in this terminal first, then run again:');
    console.error('  Mac:     export ANTHROPIC_API_KEY=sk-ant-your-key');
    console.error('  Windows: set ANTHROPIC_API_KEY=sk-ant-your-key');
    process.exit(1);
  }

  // --- Find the requirements file passed as an argument ---
  const reqArg = process.argv[2];
  if (!reqArg) {
    console.error('Usage: node qa-strategy-agent.js <requirements-file>');
    console.error('Example: node qa-strategy-agent.js peakandpack-requirements.md');
    process.exit(1);
  }

  const reqPath = path.resolve(process.cwd(), reqArg);
  if (!fs.existsSync(reqPath)) {
    console.error('File not found: ' + reqArg);
    console.error('Make sure the requirements file is in this folder and the name is spelled exactly right.');
    process.exit(1);
  }
  const requirements = fs.readFileSync(reqPath, 'utf8');

  console.log('Reading ' + reqArg + ' (' + requirements.length + ' characters).');
  console.log('Thinking through web and API risk areas with ' + MODEL + ', this takes a few seconds...\n');

  // --- Call the API ---
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: 'Here is the requirements document:\n\n' + requirements }
        ]
      })
    });
  } catch (err) {
    console.error('Network error calling the API: ' + err.message);
    process.exit(1);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('API error (' + response.status + '). A 401 usually means the key is wrong.');
    console.error(errText);
    process.exit(1);
  }

  const data = await response.json();
  const textBlock = data.content.find(b => b.type === 'text');
  const result = textBlock ? textBlock.text : 'No response text returned.';

  // --- Print to terminal and save a copy ---
  console.log(result);
  fs.writeFileSync(path.resolve(process.cwd(), OUTPUT_FILE), result, 'utf8');
  console.log('\n---\nSaved a copy to ' + OUTPUT_FILE + '. Review it before treating it as final.');
}

main();
