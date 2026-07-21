---
description: Start development directly from a Jira ticket. The human-authored ticket IS the requirements — no AI product-owner or scrum-master involved.
argument-hint: <TICKET-KEY> [--scope=feature|defect] (e.g. HART-287 --scope=defect)
---

Start development from Jira ticket: $ARGUMENTS

Invoke the `keel:orchestrator` agent in **jira-entry mode** with the ticket key.
The orchestrator will:

1. Use the ticket key as the story id and initialize `.keel/state/<key>/` via the
   state engine (or resume from `current_phase` if already initialized).
   **Scope:** if `--scope` is given, use it; otherwise infer from the ticket
   type — Bug/Defect → `--scope defect` (express lane: intake → engineer →
   QA → security, ~5 spawns), anything else → `feature` (all 10 phases).
2. Run phase 1 as a **Jira import** by `keel:business-analyst` (it has the Jira
   MCP read tools): fetch the ticket, transcribe its summary, description, and
   acceptance criteria into `01-business-analyst.json` — numbering the ACs
   `AC-1, AC-2, …` exactly as stated in the ticket. **Transcription, not
   authorship**: if the ticket has no testable acceptance criteria, the import
   stops with a blocker telling the human product owner what to add to the
   ticket. The agent never invents requirements.
3. Continue the normal pipeline from phase 2 (BA elaboration → architect →
   engineer → QA → security → writer → release), with the handshake gate
   between every phase as usual.

Rules:
- No `keel:product-owner` and no `keel:scrum-master` invocation anywhere in
  this flow — those are human roles; the ticket is the human's voice.
- The AC set imported in phase 1 is the anti-drift contract for the whole
  pipeline, same as a PO-authored phase 1.
- The Jira MCP fetch passes through the gate's `PostToolUse` check (matcher `mcp__.*`) if wired — a ticket containing CJIS narrative content is still hard-blocked before it reaches `01-business-analyst.json`.
