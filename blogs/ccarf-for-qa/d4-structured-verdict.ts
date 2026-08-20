// D4 Task Statement 4.3: structured output via tool_use, not a
// free-text JSON blob the model might malform or embellish.
//
// Extends d1-triage-agent.ts's verdict shape with a proper JSON schema
// and nullable fields, so the model reports "I don't know" instead of
// fabricating a bug ID to satisfy a required field.

// "import type" pulls in Anthropic's own TypeScript type definitions
// only, not any actual running code from the SDK, this file defines a
// tool schema and doesn't call the API itself, so it only needs the
// shapes, not the client.
import type Anthropic from "@anthropic-ai/sdk";

// "const triageVerdictTool: Anthropic.Tool = {...}" declares a
// constant whose shape must match Anthropic's own Tool type, this is
// what actually gets sent to Claude as one of its available tools,
// its own name, description, and input_schema tell Claude when to
// call it and exactly what shape to fill in.
const triageVerdictTool: Anthropic.Tool = {
  name: "report_triage_verdict",
  description: "Reports the final triage verdict for one failing test.",
  input_schema: {
    type: "object",
    properties: {
      // Nullable: forcing a non-null bug ID here would pressure the
      // model to pick SOMETHING from the catalog even when nothing
      // actually matches, exactly the fabrication the guide's 4.3
      // skill point warns against.
      matchedBugId: {
        type: ["string", "null"],
        description: "A catalog bug ID (e.g. BUG-011), or null if nothing matches.",
      },
      confidence: {
        // "unclear" is a real, distinct outcome, not a synonym for
        // "low". It means the available tools couldn't resolve this
        // one, not that a match was found but is shaky.
        type: "string",
        enum: ["high", "medium", "low", "unclear"],
      },
      action: {
        type: "string",
        enum: ["file-new", "link-existing", "flag-flaky-retry", "escalate-to-human"],
      },
      reasoning: { type: "string", description: "One sentence, citing the specific matching criteria met." },
    },
    // "required" lists which of the properties above must be present
    // in every call, missing any of these four would make Claude's
    // tool call itself invalid before this code even runs, this is
    // schema validation, enforced automatically, not something this
    // file has to check by hand.
    required: ["matchedBugId", "confidence", "action", "reasoning"],
  },
};

// "Anthropic.MessageCreateParams["tool_choice"]" reaches into the
// SDK's own MessageCreateParams type and pulls out just the type of
// its tool_choice field, so this constant is guaranteed to match
// whatever shape the real API call expects there, without this file
// having to redeclare that shape itself.
//
// Forcing this specific tool on the FINAL turn only, guarantees the
// model reports through the schema instead of drifting into prose,
// while earlier turns stay tool_choice: "auto" so it can still call
// search_bug_catalog or check_live_api freely first.
const finalTurnToolChoice: Anthropic.MessageCreateParams["tool_choice"] = {
  type: "tool",
  name: "report_triage_verdict",
};

export { triageVerdictTool, finalTurnToolChoice };
