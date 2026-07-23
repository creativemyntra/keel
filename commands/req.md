---
description: BDD requirements, acceptance criteria, and API spec for a story. Human owns the requirements -- from a Jira ticket, or confirmed interactively.
argument-hint: --story=FEAT-1 [--jira=TICKET-KEY] [--feature="description"]
---

Create requirements for: $ARGUMENTS

**The product owner is a human, not an agent.** Requirements come from them:

- `--jira=<KEY>` given (or the story id is a Jira key) -> invoke
  `keel:business-analyst` in **import mode**: fetch the ticket, transcribe its
  ACs into the phase-1 output (`01-business-analyst.json`). No testable ACs in
  the ticket -> stop and tell the human what to add. Never invent requirements.
- No ticket -> **first, ask up to 3 targeted clarifying questions** (via
  AskUserQuestion) before drafting anything -- never a generic requirements
  interview, only the specific load-bearing gaps that are easy to miss and
  expensive to catch late:
  1. "Does this feature touch data that must be scoped or isolated to a
     specific user, account, or tenant? If yes, which entity owns that
     scoping?"
  2. "Does this feature call anything external (an API, an LLM, a
     third-party service)? If yes, what should happen if that call times out
     or fails?"
  3. "Does this feature touch payment, authentication, or personal/sensitive
     data?"
  Skip any question the human's `--feature` description already answers.
  Then invoke `keel:business-analyst` to draft Gherkin acceptance criteria as
  a PROPOSAL informed by those answers, then present them to the human for
  confirmation before writing the phase-1 output. The human's confirmed set
  is the contract.
- Only when the human explicitly asks for story drafting help (backlog shaping,
  prioritisation) invoke `keel:product-owner` -- never as an automatic step.

Then invoke `keel:business-analyst` for phase 2 elaboration (functional spec,
data flows, edge cases) and run `keel:handshake-agent` on each phase output.
Outputs go to `.keel/state/<story-id>/` per `agent-output-schema.json`.
A `--jira=<KEY>` fetch is subject to the gate's PostToolUse check like any other MCP call -- see `commands/from-jira.md`.
Once the human confirms requirements, `/keel:task-breakdown` is an optional next step before `/keel:design` -- it decomposes the confirmed ACs into an ordered, estimated task list.
