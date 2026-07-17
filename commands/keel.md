---
description: Keel AI-SDLC pipeline — overview and routing. Run a full story or get directed to the right phase command.
argument-hint: [--story=ID] [request]
---

The user invoked the Keel master command with: $ARGUMENTS

Keel is a 10-phase AI-SDLC pipeline. Available commands:

| Command | Phase | Agent |
|---|---|---|
| `/keel:init` | Setup | Scaffold a new project or adopt an existing one |
| `/keel:setup` | Setup | Interactive integration wizard — Jira, GitHub, Playwright, Slack |
| `/keel:implement-feature` | 1–10 (full) | Orchestrator-driven end-to-end pipeline |
| `/keel:from-jira <KEY>` | 1–10 (full) | Start from a Jira ticket — ticket IS the requirements |
| `/keel:brainstorm` | Pre-1 | Generate feature ideas from a business goal |
| `/keel:req` | 1–2 | BDD requirements, acceptance criteria, API spec |
| `/keel:design` | 3–4 | UI design + architecture, DB schema, API contracts |
| `/keel:test` | 6 | QA: AC mapping + integration tests |
| `/keel:e2e-test` | 7 | Playwright browser E2E tests |
| `/keel:sec` | 8 | OWASP Top 10 security scan |
| `/keel:impact` | Any | CodeGraph impact analysis for a class or file |
| `/keel:health` | Any | Pipeline health sweep — halted/stale stories, memory bounds, coverage trend |
| `/keel:deploy` | 10 | Staged rollout deployment |

If the request is a multi-phase delivery task ("implement this feature", "take story X to production"),
invoke the `keel:orchestrator` agent with the request — it sequences the phase agents
and enforces governance gates. Otherwise, tell the user which command fits.

If asked for the version, read it from `.claude-plugin/plugin.json` in the plugin root.
