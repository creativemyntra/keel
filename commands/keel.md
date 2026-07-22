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
| `/keel:task-breakdown` | between 2 and 3 | Decompose confirmed ACs into an ordered, estimated task list (planning aid, not a gate) |
| `/keel:design` | 3–4 | UI design + architecture, DB schema, API contracts |
| `/keel:test` | 6 | QA: AC mapping + integration tests |
| `/keel:e2e-test` | 7 | Playwright browser E2E tests |
| `/keel:sec` | 8 | OWASP Top 10 security scan |
| `/keel:impact` | Any | CodeGraph impact analysis for a class or file |
| `/keel:health` | Any | Pipeline health sweep — halted/stale stories, memory bounds, coverage trend |
| `/keel:deploy` | 9–10 | Docs + staged rollout deployment |
| `/keel:parallel` | 1-10 (full, N stories) | Run independent stories' full pipelines concurrently in separate git worktrees (throughput, not single-story speedup) |
| `/keel:preview` | Any | Dry-run: show stack detection result, economy settings, pipeline map with model tiers, CJIS gate status, CodeGraph freshness, and estimated spawn count before committing to a pipeline run |

If the request is a multi-phase delivery task ("implement this feature", "take story X to production"),
invoke the `keel:orchestrator` agent with the request — it sequences the phase agents
and enforces governance gates. Otherwise, tell the user which command fits.

**Defect scope:** When the Jira ticket type is Bug/Defect, or the request includes "fix", the orchestrator uses the express lane: phases 1→5→6→8 only (~5 spawns instead of ~14). Pass `--scope defect` to `/keel:implement-feature` or `/keel:from-jira` to force defect mode explicitly.

**Stack support:** CakePHP 4.4/PHP 8.1. This is the only supported stack — other frameworks will be added in a future release.

If asked for the version, read it from `.claude-plugin/plugin.json` in the plugin root.
