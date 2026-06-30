#!/usr/bin/env node
/*
 * Visual Review Agent (Node.js form)
 * The Quality Strategist - AI-Augmented QA Series, Phase 4
 *
 * The terminal twin of visual-review-agent.html. Give it a screenshot
 * file; it reviews the image for visual and UI issues and writes a
 * short bug report.
 *
 * It reads only the image you pass. It cannot click, hover, or browse
 * the live site, the same limit a tester has when handed a still
 * screenshot.
 *
 * Usage:
 *   node visual-review-agent.js screenshot.png
 *   node visual-review-agent.js screenshot.png requirements.md   (optional 2nd arg)
 *
 * Setup (the blog page has the full walkthrough):
 *   1. Node.js 18+ installed (check: node --version). Not Claude Code,
 *      just Node; this script calls the API on its own.
 *   2. An API key from console.anthropic.com, set in your terminal:
 *        Mac:     export ANTHROPIC_API_KEY=sk-ant-your-key
 *        Windows: set ANTHROPIC_API_KEY=sk-ant-your-key
 *   3. The screenshot file in this folder.
 *
 * Output: prints the report and saves visual-review-output.md here.
 */

const fs = require('fs');
const path = require('path');

const MODEL = 'claude-sonnet-4-6';
const OUTPUT_FILE = 'visual-review-output.md';

const MEDIA_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const SYSTEM_PROMPT = `You are a visual QA reviewer for PeakAndPack, a trekking and travel gear e-commerce app. You will be given a screenshot of one of its pages, and optionally the requirements doc describing what that page should show. Your job is to review the screenshot for visual and UI issues, the way a careful tester would on a fresh look.

Look for, and report only what you can actually see in the image:
- Broken data display: empty or missing text where a value should be, negative or nonsensical values, placeholder text left in.
- Layout problems: overflow or clipping, misalignment, overlapping elements, inconsistent spacing, content escaping its container.
- Responsive issues: anything cut off or horizontally scrolling, if the screenshot is a narrow/mobile width.
- Readability: text that is too low-contrast to read, or a price or label that is hard to parse.
- Missing affordances you can see are absent: no visible focus outline on a focused control, a button with no label.

Rules:
- Report only what is visible in the screenshot. Do not invent issues you cannot see, and do not assume behaviour you cannot observe in a still image (you cannot click, hover, or check what updates).
- If you are given the requirements doc, use it to judge whether what you see matches what was intended, and say which requirement a problem relates to.
- For each issue, give: a short title, where on the page it is, the visible symptom, and the severity (Critical, High, Medium, Low) based on user and business impact.
- If something looks fine, do not pad the report with it. A short, accurate report beats a long, padded one.
- If you are unsure whether something is a bug or intentional, say so plainly and mark it to confirm, rather than asserting it.

Output a short Markdown report: a one-line summary, then one section per issue with Title, Location, Symptom, Severity, and (if known) the related requirement. End with one line naming anything you could not assess from a still image alone.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY. Set it in this terminal first, then run again:');
    console.error('  Mac:     export ANTHROPIC_API_KEY=sk-ant-your-key');
    console.error('  Windows: set ANTHROPIC_API_KEY=sk-ant-your-key');
    process.exit(1);
  }

  const shotArg = process.argv[2];
  if (!shotArg) {
    console.error('Usage: node visual-review-agent.js <screenshot> [requirements.md]');
    console.error('Example: node visual-review-agent.js screenshot.png');
    process.exit(1);
  }

  const shotPath = path.resolve(process.cwd(), shotArg);
  if (!fs.existsSync(shotPath)) {
    console.error('File not found: ' + shotArg);
    process.exit(1);
  }
  const ext = path.extname(shotPath).toLowerCase();
  const mediaType = MEDIA_BY_EXT[ext];
  if (!mediaType) {
    console.error('Unsupported image type: ' + ext + '. Use png, jpg, jpeg, webp, or gif.');
    process.exit(1);
  }
  const imageData = fs.readFileSync(shotPath).toString('base64');

  // Optional requirements file
  let requirements = '';
  const reqArg = process.argv[3];
  if (reqArg) {
    const reqPath = path.resolve(process.cwd(), reqArg);
    if (fs.existsSync(reqPath)) requirements = fs.readFileSync(reqPath, 'utf8');
    else console.error('Note: requirements file not found, reviewing the screenshot on its own.');
  }

  const userText = requirements
    ? 'Review this PeakAndPack screenshot. Here are the relevant requirements:\n\n' + requirements
    : 'Review this PeakAndPack screenshot for visual and UI issues.';

  console.log('Reviewing ' + shotArg + ' with ' + MODEL + ', this takes a minute...\n');

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
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
            { type: 'text', text: userText }
          ]
        }]
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

  console.log(result);
  fs.writeFileSync(path.resolve(process.cwd(), OUTPUT_FILE), result, 'utf8');
  console.log('\n---\nSaved a copy to ' + OUTPUT_FILE + '. Confirm each finding on the live UI before treating it as final.');
}

main();
