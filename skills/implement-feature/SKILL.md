---
name: implement-feature
description: Run the full 11-phase AI-SDLC pipeline from story to tested, E2E-validated, security-reviewed implementation.
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
   `.keel/state/<story-id>/` through the state engine, sequences the 11 phase
   agents in order, runs the handshake gate after every phase, and enforces the
   bounded retry loop (3 attempts → halt and escalate):

   ```
   1  Product Owner / Business Analyst  — requirements intake
   2  Business Analyst                  — functional spec
   3  Solution Architect                — architecture + design
   4  Software Engineer                 — production code (no tests)
   5  TDD Red                           — test case creation
   6  TDD Green                         — full suite execution + coverage gate
   7  QA Engineer                       — AC mapping + integration tests
   8  E2E Engineer                      — Playwright browser tests
   9  Security Engineer                 — OWASP + dependency audit
   10 Technical Writer                  — docs + changelog
   11 Release Manager                   — go/no-go
   ```

4. Relay the orchestrator's delivery summary to the user:

```markdown
## Feature Implementation: <STORY-ID> — <result>

- Phases completed: <N>/11 (state: .keel/state/<STORY-ID>/)
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
