---
description: Keel AI-SDLC pipeline — overview and routing. Run a full story or get directed to the right phase command.
argument-hint: [--story=ID] [request]
---

The user invoked the Keel master command with: $ARGUMENTS

Keel is an 8-phase AI-SDLC pipeline. Available commands:

| Command | Phase |
|---|---|
| `/keel:init` | Scaffold a new project or adopt an existing one |
| `/keel:brainstorm` | Generate feature ideas from a business goal |
| `/keel:req` | BDD requirements, acceptance criteria, API spec |
| `/keel:design` | Architecture, DB schema, API contracts |
| `/keel:tdd-red` | Write failing tests |
| `/keel:tdd-green` | Implement to pass tests |
| `/keel:tdd-refactor` | Refactor with tests green |
| `/keel:test` | Full test suite + coverage gate |
| `/keel:sec` | OWASP Top 10 security scan |
| `/keel:impact` | CodeGraph impact analysis for a class or file |
| `/keel:deploy` | Staged rollout deployment |

If the request is a multi-phase delivery task ("implement this feature", "take story X to production"),
invoke the `keel:orchestrator` agent with the request — it sequences the phase agents
and enforces governance gates. Otherwise, tell the user which command fits.

If asked for the version, read it from `.claude-plugin/plugin.json` in the plugin root.
