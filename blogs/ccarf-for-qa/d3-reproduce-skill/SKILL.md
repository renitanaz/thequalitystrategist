---
description: Reproduces a reported PeakAndPack bug against the live API and reports exactly what it observes.
context: fork
allowed-tools: ["Bash(curl:*)", "WebFetch"]
argument-hint: "<bug-id-or-description>"
---

<!--
  Intended location: .claude/skills/reproduce-bug/SKILL.md
  Task Statement 3.2, the frontmatter options that distinguish a skill
  from a plain slash command:

  context: fork    Reproduction output is often noisy (raw HTTP
                    responses, a few retries against a cold-starting
                    Render instance). Forking keeps that out of the
                    main conversation instead of burning its context
                    budget.
  allowed-tools     Naming just "Bash" grants the full shell, any
                    command, not only network calls. "Bash(curl:*)"
                    restricts it to curl invocations specifically,
                    the actual scoping this skill needs. A bare
                    "Bash" entry would let the model run anything,
                    including an unrelated install, if it ever
                    reasoned its way there.
  argument-hint     Shown to a developer who runs /reproduce-bug with
                    no argument, so they know what to pass.

  Usage: place this folder at .claude/skills/reproduce-bug/, the skill's
  invocable name comes from the folder name, not the SKILL.md filename.
  Then type /reproduce-bug BUG-007 (or any bug ID or description) in a
  Claude Code chat. $1 below is that argument.
-->

Given $1, a bug ID or description, call the live PeakAndPack API
(https://peakandpackshopdemo.onrender.com) at the endpoint most likely to
reproduce it. Report exactly what you observe: status code, response
body, and whether it matches the reported symptom. Do not speculate
about root cause, only report what the live call actually returned.

If the endpoint returns a 503, retry once, Render's free tier
cold-starts after idle. A second 503 is a real finding, not a fluke.
