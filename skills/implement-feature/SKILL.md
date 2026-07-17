---
name: implement-feature
description: Run the full 12-phase AI-SDLC pipeline from story to tested, E2E-validated, security-reviewed implementation.
---

# implement-feature

Run the full AI-SDLC pipeline from story to tested, reviewed implementation.

## When to use

Invoke when the user says "implement feature", "build this", "/keel implement",
or has a story with approved requirements and design.

## Instructions

This skill has exactly one job: hand the story to the pipeline's single entry
point. Do NOT run phases yourself — a second pipeline definition here would
drift from the governed one.

1. Determine the story ID (e.g. `FEAT-12`, `HART-287`). If the user gave none,
   derive a short one from the feature name and confirm it with the user.
2. Invoke the **`keel:orchestrator`** agent with:
   - the story ID and the user's feature description / story reference,
   - any constraints the user stated (deadline, scope, stack).
3. The orchestrator owns everything from there: it initializes
   `.keel/state/<story-id>/` through the state engine, sequences the 12 phase
   agents in order, runs the handshake gate after every phase, and enforces the
   bounded retry loop (3 attempts → halt and escalate):

   ```
   1  Product Owner / Business Analyst  — requirements intake
   2  Business Analyst                  — functional spec
   3  UI Designer                       — screen flows, mockups, component states
   4  Solution Architect                — architecture + design (reads UI design)
   5  Software Engineer                 — production code (no tests)
   6  TDD Red                           — test case creation
   7  TDD Green                         — full suite execution + coverage gate
   8  QA Engineer                       — AC mapping + integration tests
   9  E2E Engineer                      — Playwright browser tests
   10 Security Engineer                 — OWASP + dependency audit
   11 Technical Writer                  — docs + changelog
   12 Release Manager                   — go/no-go
   ```

4. Relay the orchestrator's delivery summary to the user:

```markdown
## Feature Implementation: <STORY-ID> — <result>

- Phases completed: <N>/12 (state: .keel/state/<STORY-ID>/)
- Unit tests: <N> passing, coverage <X>% on changed files
- E2E tests: <N> passing (Playwright)
- Security: <HIGH finding count> HIGH findings
- Release check: GO / NO-GO / HALTED at phase <N>

Files changed: <from the release-manager phase output's artifacts>
```

If the pipeline HALTED, present every recorded failure reason from the
handshake report — the human decides what happens next.

## Rules

- Never bypass the orchestrator to "just implement it" — the governance gates
  (development before tests, tests before E2E, coverage ≥ 80%, zero HIGH
  security findings, release approval) only exist inside the pipeline.
- Never touch files under `.keel/state/` directly; the state engine owns them.
- All governance rules from CLAUDE.md apply throughout.
