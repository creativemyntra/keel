---
description: Alias for keel:implement-feature. Run the full 10-phase AI-SDLC pipeline for a feature or defect story.
argument-hint: [--story=ID] [--scope=feature|defect] [<feature description or Jira key>]
---

The user invoked `/keel:implement` with: $ARGUMENTS

This is a short alias for `/keel:implement-feature`. Invoke the `keel:orchestrator` agent
with the full argument string — it sequences all 10 phases, enforces governance gates, and
handles both `feature` and `defect` (express-lane) scope.

**Do NOT route to keel:software-engineer directly.** The software-engineer is phase 5 only;
bypassing the orchestrator skips requirements, architecture, QA, E2E, security, and release
gates. Always go through the orchestrator.

If the argument looks like a Jira ticket key (e.g. `HART-287`, `KEEL-101`), treat it the
same as `/keel:from-jira <KEY>` and follow that command's jira-entry rules.

**Defect scope:** pass `--scope defect` (or infer from a "fix"/"bug" description) to
activate the express lane: phases 1 → 5 → 6 → 8 only (~5 spawns).
