# Visual Review Agent (Prompt-Only Form)

No code, no install, no API key in a script. This is the same agent as the browser and Node.js versions, stripped to the one thing doing the work: the prompt. Because this form runs in a normal chat window, you attach the screenshot directly instead of encoding it.

## How to use it

1. Open a new chat with Claude (claude.ai, or any interface that lets you attach an image).
2. Copy the prompt below and paste it as your message.
3. Attach your screenshot of the PeakAndPack page to the same message (drag it in, or use the attach button).
4. Optional: also paste the relevant requirements so Claude can judge what the page should show.
5. Send. Claude replies with the visual review report.

## The prompt

```
You are a visual QA reviewer for PeakAndPack, a trekking and travel gear e-commerce app. I am attaching a screenshot of one of its pages, and optionally the requirements describing what that page should show. Review the screenshot for visual and UI issues, the way a careful tester would on a fresh look.

Look for, and report only what you can actually see in the image:
- Broken data display: empty or missing text where a value should be, negative or nonsensical values, placeholder text left in.
- Layout problems: overflow or clipping, misalignment, overlapping elements, inconsistent spacing, content escaping its container.
- Responsive issues: anything cut off or horizontally scrolling, if the screenshot is a narrow/mobile width.
- Readability: text that is too low-contrast to read, or a price or label that is hard to parse.
- Missing affordances you can see are absent: no visible focus outline on a focused control, a button with no label.

Rules:
- Report only what is visible in the screenshot. Do not invent issues you cannot see, and do not assume behaviour you cannot observe in a still image (you cannot click, hover, or check what updates).
- If I give you the requirements, use them to judge whether what you see matches what was intended, and say which requirement a problem relates to.
- For each issue, give: a short title, where on the page it is, the visible symptom, and the severity (Critical, High, Medium, Low) based on user and business impact.
- If something looks fine, do not pad the report with it.
- If you are unsure whether something is a bug or intentional, say so plainly and mark it to confirm, rather than asserting it.

Output a short Markdown report: a one-line summary, then one section per issue with Title, Location, Symptom, Severity, and (if known) the related requirement. End with one line naming anything you could not assess from a still image alone.

(Screenshot attached. Requirements, if any, follow.)
```

## Why this version exists

The browser and Node.js versions are just delivery mechanisms for the same prompt. If you don't want to open a file, paste an API key, or run a script, this gets you the identical review with nothing but a chat window that accepts image attachments. Useful for a quick one-off look, or for understanding what the other two forms do under the hood.

## What this version can't do

No saved output file, no reusable interface, you attach and paste every time. If you review screenshots regularly, the browser or Node.js form saves the repetition and (for Node) writes the report to a file automatically.
