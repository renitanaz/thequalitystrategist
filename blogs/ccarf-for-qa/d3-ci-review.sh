#!/usr/bin/env bash
# Intended CI step: runs on every PR touching PeakAndPack's checkout or
# cart code. Task Statement 3.6.
#
#   -p                    Non-interactive mode. Without it, Claude Code
#                         waits for input that a CI runner never sends,
#                         and the job hangs until it times out.
#   --output-format json
#   --json-schema         Machine-parseable findings, so this script can
#                         post them as inline PR comments instead of
#                         dumping prose into a build log nobody reads.
#   CLAUDE.md             Loaded automatically from the repo root, so the
#                         known-bug catalog and review criteria don't
#                         need to be repeated in this script.
#
# Session isolation: this is a fresh `claude -p` invocation, never a
# `--resume` of whatever session wrote the diff. A reviewer with no
# memory of writing the code is more likely to question it, the same
# reasoning D4's Task Statement 4.6 applies to code review generally.
#
# Usage: chmod +x d3-ci-review.sh, then wire it as a step in your CI
# workflow (e.g. GitHub Actions, after actions/checkout with full
# history). Requires: ANTHROPIC_API_KEY set as a repo secret, the gh
# CLI authenticated, and jq on the runner. Only does anything when the
# PR's diff touches src/checkout/** or src/cart/**.

# "set -euo pipefail" is a standard safety header for bash scripts:
# -e   stop immediately if any command fails, instead of plowing on
# -u   error out if the script references a variable that was never set
# -o pipefail   if any command in a pipe (A | B) fails, treat the whole
#               pipe as failed, not just B's exit code
set -euo pipefail

# "$(...)" runs the command inside the parentheses and substitutes its
# output as text. Here, git diff compares the current branch against
# origin/main, restricted to files under src/checkout/ or src/cart/
# only, and DIFF becomes a variable holding whatever that diff prints,
# empty text if nothing in those folders changed.
DIFF=$(git diff "origin/main...HEAD" -- 'src/checkout/**' 'src/cart/**')

# "[ -z "$DIFF" ]" tests whether DIFF is an empty string. If it is (no
# relevant changes in this PR), print a message and exit 0 (0 means
# "success, nothing went wrong") without ever calling Claude, saving
# the API cost and the CI time on PRs this script has nothing to do
# with.
if [ -z "$DIFF" ]; then
  echo "No checkout or cart changes in this PR, skipping review."
  exit 0
fi

# Task Statement 3.6's other skill point: don't re-flag the same issue
# on every push to the same PR. Pull whatever this script has already
# posted (gh pr view reads the current PR's comments; -q applies a jq
# filter to just pull out each comment's text), so this run's prompt
# can ask Claude to skip anything already flagged. "|| true" at the
# end means: if this PR has no comments yet, gh's non-zero exit here
# shouldn't stop the script.
PRIOR_COMMENTS=$(gh pr view --json comments -q '.comments[].body' 2>/dev/null | grep '^\*\*\[' || true)

# The actual review call. The backslashes (\) at the end of these
# lines just mean "this is still one long command, continued on the
# next line," purely for readability, bash treats it as a single
# instruction. ">" at the end redirects the command's output into a
# file instead of printing it to the screen, so review-findings.json
# ends up holding Claude's structured JSON reply.
claude -p "Review this diff for the same class of bug as BUG-007 (cart
trusts a client-supplied price) and BUG-008 (no stock check before order
placement). Flag only genuine issues in this category, nothing about
style.

Issues already flagged in earlier reviews of this PR, do not repeat
these unless they are still present and unaddressed in the current diff:
$PRIOR_COMMENTS

Diff:

$DIFF" \
  --output-format json \
  --json-schema d3-review-schema.json \
  > review-findings.json

# Post each finding as an inline PR comment (requires gh CLI + GITHUB_TOKEN)
#
# jq is a command-line tool for reading and reshaping JSON text.
# `jq -c '.findings[]' review-findings.json` reads the findings array
# out of the file and prints each finding on its own line (-c means
# "compact," one JSON object per line instead of pretty-printed).
# "| while read -r finding; do ... done" pipes each of those lines,
# one at a time, into a loop, so the block below runs once per finding.
jq -c '.findings[]' review-findings.json | while read -r finding; do
  # For each finding (still raw JSON text at this point), jq -r pulls
  # out one field as plain text (-r means "raw," no surrounding
  # quotes). These three lines extract the file path, the line number,
  # and the issue description from that one finding.
  file=$(echo "$finding" | jq -r '.file')
  line=$(echo "$finding" | jq -r '.line')
  body=$(echo "$finding" | jq -r '.issue')
  MARKER="**[$file:$line]**"
  # A deterministic guarantee, not just a prompt instruction: even if
  # Claude repeats a finding despite being told not to (a prompt is a
  # request, not a guarantee, the same reasoning D1's hooks and D3's
  # own hooks discussion make elsewhere in this capsule), this check
  # blocks the duplicate post at the script level, where it can't fail
  # to hold. grep -qF searches PRIOR_COMMENTS for this exact marker,
  # -q silences its output, -F treats it as a literal string, not a
  # pattern, and "continue" skips straight to the next finding without
  # posting anything.
  if echo "$PRIOR_COMMENTS" | grep -qF "$MARKER"; then
    continue
  fi
  # gh is GitHub's official command-line tool. This posts one comment
  # on the current pull request, formatted with the file and line
  # number in bold at the start, for every finding in the loop.
  gh pr comment --body "$MARKER $body"
done
