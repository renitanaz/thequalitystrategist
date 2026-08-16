// D1: Coordinator-subagent orchestration + hooks, for the same
// PeakAndPack bug-investigation problem, using the actual patterns
// Task Statements 1.2 through 1.5 test: hub-and-spoke delegation via
// the Task tool, isolated subagent context, and hooks for guarantees
// prompts alone can't give you.
//
// This models the Claude Agent SDK's documented shape (AgentDefinition,
// allowedTools including "Task", PostToolUse hooks). Treat the SDK
// call signatures below as illustrative of the pattern, not copy-paste
// production code, check the current SDK docs for exact syntax before
// running this for real.

// ---------------------------------------------------------------------
// 1.3: Subagent definitions. Each has its OWN tool set and its OWN
// system prompt. Neither subagent inherits the coordinator's
// conversation history automatically, per Task Statement 1.2's
// "isolated context" knowledge point, whatever it needs, the
// coordinator must put in the prompt explicitly.
// ---------------------------------------------------------------------

const verifyReproductionAgent: AgentDefinition = {
  description: "Checks whether a reported PeakAndPack bug still reproduces against the live API right now.",
  systemPrompt: `You verify bug reproduction against the live PeakAndPack API.
Given a bug description and a suspected endpoint, call the endpoint and
report exactly what you observe: status code, and whether it matches
the reported symptom. Do not speculate about causes, only report what
the live call actually returned.`,
  tools: ["check_live_api"], // scoped: this agent cannot search reports, cannot file anything
};

const findRelatedReportsAgent: AgentDefinition = {
  description: "Searches the known bug catalog and past incident reports for a matching prior finding.",
  systemPrompt: `You search PeakAndPack's bug catalog and past incident
reports for anything matching the description you're given. Report
every partial match you find with your confidence in it, do not filter
down to only your single best guess.`,
  tools: ["search_bug_catalog", "search_past_reports"], // scoped: no live API access
};

// ---------------------------------------------------------------------
// 1.5: Hooks. Two different jobs, both illegal to leave to a prompt
// alone per Task Statement 1.5's "deterministic vs probabilistic
// compliance" distinction.
// ---------------------------------------------------------------------

// PostToolUse hook: normalizes heterogeneous data before the
// coordinator's model ever sees it. The live API and the mock past-
// reports store don't agree on timestamp format; fixing that in a
// hook means the model never has to reason about two formats.
const normalizeTimestamps: PostToolUseHook = (toolResult) => {
  if (typeof toolResult.timestamp === "number") {
    // Unix seconds -> ISO 8601, so every downstream consumer sees one format
    toolResult.timestamp = new Date(toolResult.timestamp * 1000).toISOString();
  }
  return toolResult;
};

// Tool-call interception hook: a genuine prerequisite gate, not a
// prompt instruction. Filing a brand-new bug report is blocked at the
// code level until BOTH subagents have actually returned, the same
// shape as the exam guide's own example (blocking process_refund
// until get_customer returns a verified ID).
const blockPrematureFiling: ToolCallInterceptionHook = (toolCall, state) => {
  if (toolCall.name === "file_new_bug_report") {
    if (!state.reproductionVerified || !state.reportsSearched) {
      return {
        blocked: true,
        reason: "Cannot file a new bug report before both verify-reproduction and find-related-reports have completed. Route to human review instead.",
      };
    }
  }
  return { blocked: false };
};

// ---------------------------------------------------------------------
// 1.2 / 1.3: The coordinator. Hub-and-spoke: both subagents report
// back to the coordinator only, never to each other. Spawned in
// parallel, per Task Statement 1.3's "emitting multiple Task tool
// calls in a single response" skill, not sequentially across turns.
// ---------------------------------------------------------------------

const coordinatorConfig: CoordinatorConfig = {
  allowedTools: ["Task"], // required: a coordinator can't spawn subagents without this
  hooks: {
    postToolUse: [normalizeTimestamps],
    preToolUse: [blockPrematureFiling],
  },
  systemPrompt: `You are investigating one failing PeakAndPack test.
Delegate to verify-reproduction and find-related-reports IN PARALLEL,
in a single response with two Task calls, not one after the other.
Pass each subagent the full failure text directly, they will not see
your conversation. Once both return, decide: file-new, link-existing,
or flag-flaky-retry. You cannot file a new report until both subagents
have reported back, that's enforced by a hook, not by this prompt.`,
};

// Illustrative invocation shape. In the real SDK, spawning both
// subagents in parallel means emitting both Task tool_use blocks in
// the SAME assistant turn, the coordinator's loop then waits for both
// results before continuing, exactly the stop_reason-driven loop from
// d1-triage-agent.ts, just one level up with subagent results instead
// of raw tool results.
async function investigate(failureText: string) {
  // coordinator.run(failureText) would:
  // 1. Emit two Task tool_use blocks in one turn (parallel spawn)
  // 2. Each subagent runs its own isolated stop_reason loop internally
  // 3. Results return to the coordinator as tool_results
  // 4. blockPrematureFiling gates any file_new_bug_report call until
  //    both subagent results are present in coordinator state
  // 5. Coordinator reaches stop_reason: "end_turn" with a verdict
}

// --- Type stubs for the illustrative shapes referenced above ---
type AgentDefinition = { description: string; systemPrompt: string; tools: string[] };
type PostToolUseHook = (toolResult: any) => any;
type ToolCallInterceptionHook = (toolCall: { name: string }, state: any) => { blocked: boolean; reason?: string };
type CoordinatorConfig = { allowedTools: string[]; hooks: { postToolUse: PostToolUseHook[]; preToolUse: ToolCallInterceptionHook[] }; systemPrompt: string };
