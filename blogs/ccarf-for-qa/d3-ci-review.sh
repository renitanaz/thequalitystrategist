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

set -euo pipefail

DIFF=$(git diff "origin/main...HEAD" -- 'src/checkout/**' 'src/cart/**')

if [ -z "$DIFF" ]; then
  echo "No checkout or cart changes in this PR, skipping review."
  exit 0
fi

claude -p "Review this diff for the same class of bug as BUG-007 (cart
trusts a client-supplied price) and BUG-008 (no stock check before order
placement). Flag only genuine issues in this category, nothing about
style. Diff:

$DIFF" \
  --output-format json \
  --json-schema d3-review-schema.json \
  > review-findings.json

# Post each finding as an inline PR comment (requires gh CLI + GITHUB_TOKEN)
jq -c '.findings[]' review-findings.json | while read -r finding; do
  file=$(echo "$finding" | jq -r '.file')
  line=$(echo "$finding" | jq -r '.line')
  body=$(echo "$finding" | jq -r '.issue')
  gh pr comment --body "**[$file:$line]** $body"
done
