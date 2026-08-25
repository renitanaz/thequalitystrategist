# D1: Coordinator-subagent orchestration + hooks (Python version), for
# the same PeakAndPack bug-investigation problem, using the actual
# patterns Task Statements 1.2 through 1.5 test: hub-and-spoke
# delegation via the Task tool (the exam guide's name for it, see the
# note near allowed_tools below), isolated subagent context, and
# hooks for guarantees prompts alone can't give you.
#
# This is real, current Claude Agent SDK syntax (claude_agent_sdk),
# verified against the SDK's own documentation, not a guessed or
# outdated shape. One detail below (marked explicitly) couldn't be
# confirmed from the fetched docs and needs a 10-second local check
# before this runs for real, everything else here is confirmed.

from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition, HookMatcher

# ---------------------------------------------------------------------
# 1.3: Subagent definitions. Each has its OWN tool set and its OWN
# prompt. Neither subagent inherits the coordinator's conversation
# history automatically, per Task Statement 1.2's "isolated context"
# knowledge point, whatever it needs, the coordinator must put in the
# prompt explicitly.
#
# The real AgentDefinition field is "prompt", not "system_prompt".
# ---------------------------------------------------------------------

AGENTS = {
    "verify-reproduction": AgentDefinition(
        description="Checks whether a reported PeakAndPack bug still reproduces against the live API right now.",
        prompt="""You verify bug reproduction against the live PeakAndPack API.
Given a bug description and a suspected endpoint, call the endpoint and
report exactly what you observe: status code, and whether it matches
the reported symptom. Do not speculate about causes, only report what
the live call actually returned.""",
        tools=["check_live_api"],  # scoped: this agent cannot search reports, cannot file anything
    ),
    "find-related-reports": AgentDefinition(
        description="Searches the known bug catalog and past incident reports for a matching prior finding.",
        prompt="""You search PeakAndPack's bug catalog and past incident
reports for anything matching the description you're given. Report
every partial match you find with your confidence in it, do not filter
down to only your single best guess.""",
        tools=["search_bug_catalog", "search_past_reports"],  # scoped: no live API access
    ),
}

# ---------------------------------------------------------------------
# 1.5: Hooks. Two different jobs, both illegal to leave to a prompt
# alone per Task Statement 1.5's "deterministic vs probabilistic
# compliance" distinction.
#
# Real shape: hooks register through HookMatcher objects, one per
# event name, each carrying its own list of callbacks, e.g.
# {"PreToolUse": [HookMatcher(hooks=[fn])]}, not a plain function.
# Every callback's real signature is async def fn(input_data,
# tool_use_id, context), there is no custom "state" parameter,
# whatever your hook needs to track has to come from closure, same as
# investigation_state below.
# ---------------------------------------------------------------------

# Tracks whether each subagent has reported back yet. A real app would
# update these from the message stream in investigate() below, as
# each subagent's result arrives.
investigation_state = {"reproduction_verified": False, "reports_searched": False}


# PostToolUse hook: normalizes heterogeneous data before the
# coordinator's model ever sees it. The live API and the mock past-
# reports store don't agree on timestamp format; fixing that in a
# hook means the model never has to reason about two formats.
async def normalize_timestamps(input_data, tool_use_id, context):
    if input_data["hook_event_name"] != "PostToolUse":
        return {}
    if input_data.get("tool_name") != "check_live_api":
        return {}

    # UNCONFIRMED FIELD NAME: the PostToolUse input dict carries the
    # raw tool result somewhere in it, the docs fetched for this post
    # didn't surface the exact key name. Before wiring this for real,
    # print(input_data.keys()) from inside this hook during a real run
    # and replace "tool_response" below with whatever key actually
    # holds it.
    raw = input_data.get("tool_response")
    if not raw or not isinstance(raw.get("timestamp"), (int, float)):
        return {}

    from datetime import datetime, timezone

    # Unix seconds -> ISO 8601, so every downstream consumer sees one format.
    normalized = {**raw, "timestamp": datetime.fromtimestamp(raw["timestamp"], tz=timezone.utc).isoformat()}
    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            # updatedToolOutput replaces the tool's result before
            # Claude sees it, confirmed to exist for exactly this
            # purpose, works for any tool in both SDKs.
            "updatedToolOutput": normalized,
        }
    }


# Tool-call interception hook: a genuine prerequisite gate, not a
# prompt instruction. Filing a brand-new bug report is blocked at the
# code level until BOTH subagents have actually returned, the same
# shape as the exam guide's own example (blocking process_refund
# until get_customer returns a verified ID).
async def block_premature_filing(input_data, tool_use_id, context):
    if input_data["hook_event_name"] != "PreToolUse":
        return {}
    if input_data.get("tool_name") != "file_new_bug_report":
        return {}

    if not investigation_state["reproduction_verified"] or not investigation_state["reports_searched"]:
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "Cannot file a new bug report before both verify-reproduction and "
                    "find-related-reports have completed. Route to human review instead."
                ),
            }
        }
    return {}


# ---------------------------------------------------------------------
# 1.2 / 1.3: The coordinator. Hub-and-spoke: both subagents report
# back to the coordinator only, never to each other. Spawned in
# parallel, per Task Statement 1.3's "emitting multiple Task tool
# calls in a single response" skill, not sequentially across turns.
#
# A naming note: the exam guide calls this the "Task tool" (Task
# Statement 1.3's own wording, and what allowed_tools needed to name
# when the guide was written). Claude Code renamed the tool to
# "Agent" in v2.1.63, current SDK releases emit "Agent" in tool_use
# blocks. allowed_tools below uses the current real name, "Agent",
# the prose in this post keeps saying "Task tool" because that's the
# exam's own terminology, not because the code is out of date.
# ---------------------------------------------------------------------


async def investigate(failure_text):
    options = ClaudeAgentOptions(
        allowed_tools=["Agent"],  # required: a coordinator can't spawn subagents without this
        agents=AGENTS,
        hooks={
            "PostToolUse": [HookMatcher(hooks=[normalize_timestamps])],
            "PreToolUse": [HookMatcher(hooks=[block_premature_filing])],
        },
    )

    prompt = f"""You are investigating one failing PeakAndPack test.
Delegate to verify-reproduction and find-related-reports IN PARALLEL,
in a single response with two subagent calls, not one after the other.
Pass each subagent the full failure text directly, they will not see
your conversation. Once both return, decide: file-new, link-existing,
or flag-flaky-retry. You cannot file a new report until both subagents
have reported back, that's enforced by a hook, not by this prompt.

Failing test output:
{failure_text}"""

    async for message in query(prompt=prompt, options=options):
        # Update investigation_state here as each subagent's result
        # comes back through the message stream, the exact check
        # depends on how your app distinguishes one subagent's result
        # from the other's.
        if hasattr(message, "result"):
            return message.result
