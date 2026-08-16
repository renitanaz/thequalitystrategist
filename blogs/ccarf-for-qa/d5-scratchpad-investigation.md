# A scratchpad for a session too long to hold in context

Task Statement 5.4, applied to a PeakAndPack scenario the six-scenario
triage task from Post 01 doesn't need: investigating a suspected
regression that spans multiple files and multiple exploration phases.

## The task

A flaky-looking failure report suggests checkout total calculation
drifted after a recent change. That touches the cart endpoint, the
checkout endpoint, and whatever shared pricing logic they both call,
the kind of open-ended, multi-file investigation 5.4 is written for,
not the single-file triage from Post 01.

## Without a scratchpad

An extended session investigating this starts strong, but past a
certain point, the guide's own failure mode shows up: the agent starts
referencing "typical patterns" instead of the specific function it
found forty tool calls ago, because that finding scrolled past
effective attention even though it's technically still in history.

## With one

1. **Delegate the verbose exploration.** A subagent traces every call
   site that touches cart or checkout pricing and writes its findings,
   not a summary, the actual file paths and line numbers, to
   `scratchpad.md` (see d5-scratchpad-template.md). The main agent
   gets back only a short summary, the detail lives in the file.
2. **Reference the scratchpad on every subsequent question**, instead
   of re-deriving. "Where is checkout total calculated?" gets answered
   by reading the scratchpad's call-sites section, not by re-running
   Grep across the codebase a second time.
3. **Run `/compact` between exploration phases**, once the current
   phase's findings are safely in the scratchpad. The verbose tool
   output that produced them doesn't need to survive in context, the
   scratchpad already has what matters.
4. **Crash recovery.** If the session is interrupted, a fresh session
   reads the scratchpad's manifest section first (see the template)
   instead of re-exploring the codebase from zero.

## The actual difference

Not "the agent remembers more." It's that what the agent needs to
remember lives somewhere designed to hold it accurately (a file,
written once, referenced by path), instead of somewhere that degrades
under pressure (a growing conversation history that eventually gets
summarized, or scrolls past effective attention).

## How to use it

There's no script to run, this is a working pattern: have your
investigating agent write findings to a scratchpad file as it goes
(see the template), point it back at that file instead of re-exploring
when a new question comes up, and run `/compact` once a phase's
findings are safely on disk. On resume, read the manifest section
first.
