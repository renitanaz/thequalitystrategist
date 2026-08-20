# D1: Coordinator-subagent orchestration + hooks (Python version).
#
# Same logic as d1-coordinator-subagents.ts, translated as directly as
# possible. Like that file, this is illustrative of the pattern, not
# meant to run as-is, the Agent SDK's real call shapes may differ from
# what's stubbed out below, check current SDK docs before running this
# for real.
#
# For the same PeakAndPack bug-investigation problem, using the actual
# patterns Task Statements 1.2 through 1.5 test: hub-and-spoke
# delegation via the Task tool, isolated subagent context, and hooks
# for guarantees prompts alone can't give you.

# ---------------------------------------------------------------------
# 1.3: Subagent definitions. Each has its OWN tool set and its OWN
# system prompt. Neither subagent inherits the coordinator's
# conversation history automatically, per Task Statement 1.2's
# "isolated context" knowledge point, whatever it needs, the
# coordinator must put in the prompt explicitly.
#
# Python doesn't need a separate type declaration the way TypeScript's
# "interface AgentDefinition" does, a plain dictionary describes the
# same shape just fine, this is illustrative either way, not something
# that gets type-checked before running.
# ---------------------------------------------------------------------

verify_reproduction_agent = {
    "description": "Checks whether a reported PeakAndPack bug still reproduces against the live API right now.",
    "system_prompt": """You verify bug reproduction against the live PeakAndPack API.
Given a bug description and a suspected endpoint, call the endpoint and
report exactly what you observe: status code, and whether it matches
the reported symptom. Do not speculate about causes, only report what
the live call actually returned.""",
    "tools": ["check_live_api"],  # scoped: this agent cannot search reports, cannot file anything
}

find_related_reports_agent = {
    "description": "Searches the known bug catalog and past incident reports for a matching prior finding.",
    "system_prompt": """You search PeakAndPack's bug catalog and past incident
reports for anything matching the description you're given. Report
every partial match you find with your confidence in it, do not filter
down to only your single best guess.""",
    "tools": ["search_bug_catalog", "search_past_reports"],  # scoped: no live API access
}

# ---------------------------------------------------------------------
# 1.5: Hooks. Two different jobs, both illegal to leave to a prompt
# alone per Task Statement 1.5's "deterministic vs probabilistic
# compliance" distinction. In Python, a hook is just a plain function,
# called automatically at a fixed point, not something Claude decides
# to run.
# ---------------------------------------------------------------------


def normalize_timestamps(tool_result):
    # PostToolUse hook: normalizes heterogeneous data before the
    # coordinator's model ever sees it. The live API and the mock past-
    # reports store don't agree on timestamp format; fixing that in a
    # hook means the model never has to reason about two formats.
    if isinstance(tool_result.get("timestamp"), (int, float)):
        from datetime import datetime, timezone
        # Unix seconds -> ISO 8601, so every downstream consumer sees
        # one format.
        tool_result["timestamp"] = datetime.fromtimestamp(
            tool_result["timestamp"], tz=timezone.utc
        ).isoformat()
    return tool_result


def block_premature_filing(tool_call, state):
    # Tool-call interception hook: a genuine prerequisite gate, not a
    # prompt instruction. Filing a brand-new bug report is blocked at
    # the code level until BOTH subagents have actually returned, the
    # same shape as the exam guide's own example (blocking
    # process_refund until get_customer returns a verified ID).
    if tool_call.get("name") == "file_new_bug_report":
        if not state.get("reproduction_verified") or not state.get("reports_searched"):
            return {
                "blocked": True,
                "reason": "Cannot file a new bug report before both verify-reproduction and find-related-reports have completed. Route to human review instead.",
            }
    return {"blocked": False}

# ---------------------------------------------------------------------
# 1.2 / 1.3: The coordinator. Hub-and-spoke: both subagents report
# back to the coordinator only, never to each other. Spawned in
# parallel, per Task Statement 1.3's "emitting multiple Task tool
# calls in a single response" skill, not sequentially across turns.
# ---------------------------------------------------------------------

coordinator_config = {
    "allowed_tools": ["Task"],  # required: a coordinator can't spawn subagents without this
    "hooks": {
        "post_tool_use": [normalize_timestamps],
        "pre_tool_use": [block_premature_filing],
    },
    "system_prompt": """You are investigating one failing PeakAndPack test.
Delegate to verify-reproduction and find-related-reports IN PARALLEL,
in a single response with two Task calls, not one after the other.
Pass each subagent the full failure text directly, they will not see
your conversation. Once both return, decide: file-new, link-existing,
or flag-flaky-retry. You cannot file a new report until both subagents
have reported back, that's enforced by a hook, not by this prompt.""",
}


def investigate(failure_text):
    # Illustrative invocation shape. In the real SDK, spawning both
    # subagents in parallel means emitting both Task tool_use blocks in
    # the SAME assistant turn, the coordinator's loop then waits for
    # both results before continuing, exactly the stop_reason-driven
    # loop from d1-triage-agent.py, just one level up with subagent
    # results instead of raw tool results.
    #
    # coordinator.run(failure_text) would:
    # 1. Emit two Task tool_use blocks in one turn (parallel spawn)
    # 2. Each subagent runs its own isolated stop_reason loop internally
    # 3. Results return to the coordinator as tool_results
    # 4. block_premature_filing gates any file_new_bug_report call until
    #    both subagent results are present in coordinator state
    # 5. Coordinator reaches stop_reason: "end_turn" with a verdict
    pass
