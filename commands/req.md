---
description: BDD requirements, acceptance criteria, and API spec for a story. Human owns the requirements — from a Jira ticket, or confirmed interactively.
argument-hint: --story=FEAT-1 [--jira=TICKET-KEY] [--feature="description"]
---

Create requirements for: $ARGUMENTS

**The product owner is a human, not an agent.** Requirements come from them:

- `--jira=<KEY>` given (or the story id is a Jira key) → invoke
  `keel:business-analyst` in **import mode**: fetch the ticket, transcribe its
  ACs into the phase-1 output (`01-business-analyst.json`). No testable ACs in
  the ticket → stop and tell the human what to add. Never invent requirements.
- No ticket → elaborate from the human's `--feature` description: invoke
  `keel:business-analyst` to draft Gherkin acceptance criteria as a PROPOSAL,
  then **present them to the human for confirmation before writing the phase-1
  output**. The human's confirmed set is the contract.
- Only when the human explicitly asks for story drafting help (backlog shaping,
  prioritisation) invoke `keel:product-owner` — never as an automatic step.

Then invoke `keel:business-analyst` for phase 2 elaboration (functional spec,
data flows, edge cases) and run `keel:handshake-agent` on each phase output.
Outputs go to `.keel/state/<story-id>/` per `agent-output-schema.json`.
A `--jira=<KEY>` fetch is subject to the gate's PostToolUse check like any other MCP call — see `commands/from-jira.md`.
