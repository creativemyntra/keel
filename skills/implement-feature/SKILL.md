---
name: implement-feature
description: Run the AI-SDLC pipeline from story to tested, reviewed implementation. Scope-aware — feature lane (10 phases) or defect lane (4 phases) depending on the story type.
---

# implement-feature

Run the AI-SDLC pipeline from story to tested, reviewed implementation.

## When to use

Invoke when the user says "implement feature", "build this", "fix this bug",
"/keel implement", or has a story with approved requirements.

## Scope — read the manifest first

The pipeline phase count depends on story scope, not a hardcoded number.
Check the story's `manifest.json` → `expected_phases` before referencing
any phase numbers in your output.

| Scope | Phases | Typical use |
|---|---|---|
| `feature` | 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 | New capabilities, UI changes |
| `defect` | 1 → 5 → 6 → 8 | Bug fixes, regressions |

**Never say "10 phases" as a universal truth** — defect stories run 4.
Always read `manifest.expected_phases` and refer to "N phases in scope".

## Instructions

This skill has exactly one job: hand the story to the pipeline's single entry
point. Do NOT run phases yourself — a second pipeline definition here would
drift from the governed one.

1. Determine the story ID (e.g. `FEAT-12`, `HART-287`). If the user gave none,
   derive a short one from the feature name and confirm it with the user.
2. Check or create the story's scope (`feature` or `defect`). When in doubt,
   ask — running a 10-phase feature pipeline on a 2-line bug fix wastes 3× the
   tokens and time a defect lane would cost.
3. Invoke the **`keel:orchestrator`** agent with:
   - the story ID and the user's description / story reference,
   - any constraints the user stated (deadline, scope, stack),
   - the resolved scope so the orchestrator initialises the right phase set.
4. The orchestrator initializes `.keel/state/<story-id>/` through the state
   engine, sequences every phase agent **in the order defined by
   `manifest.expected_phases`** (not a hardcoded list), runs the handshake gate
   after every phase, and enforces the bounded retry loop
   (3 attempts → halt and escalate).

   **Feature lane agents (scope=feature):**
   ```
   1  Product Owner       -- requirements intake, AC definition
   2  Business Analyst    -- functional spec, data model, validation rules
   3  UI Designer         -- screen flows, mockups, component states
   4  Solution Architect  -- architecture, API contracts, DB schema
   5  Software Engineer   -- production code + unit tests (coverage >= 80%)
   6  QA Engineer         -- AC mapping + integration tests
   7  E2E Engineer        -- Playwright browser tests
   8  Security Engineer   -- OWASP, threat model, dependency audit
   9  Technical Writer    -- docs, changelog, runbook
   10 Release Manager     -- go/no-go, deployment plan
   ```

   **Defect lane agents (scope=defect):**
   ```
   1  Business Analyst    -- triage, RCA import
   5  Software Engineer   -- root-cause fix + regression unit test
   6  QA Engineer         -- validation
   8  Security Engineer   -- diff-scoped security scan
   ```

5. Relay the orchestrator's delivery summary to the user:

```markdown
## Delivery: <STORY-ID> (<scope>) -- <result>

- Scope: <feature|defect>
- Phases completed: <N>/<total in scope> (state: .keel/state/<STORY-ID>/)
- Unit tests: <N> passing, coverage <X>% on changed files
- E2E tests: <N> passing (Playwright) [feature scope only]
- Security: <HIGH finding count> HIGH findings
- Release check: GO / NO-GO / HALTED at phase <N>

Files changed: <from the release-manager phase output's artifacts>
```

If the pipeline HALTED, present every recorded failure reason from the
handshake report — the human decides what happens next.

## Rules

- Never bypass the orchestrator to "just implement it" — the governance gates
  (development before tests, tests before E2E, coverage >= 80%, zero HIGH
  security findings, release approval) only exist inside the pipeline.
- Never touch files under `.keel/state/` directly; the state engine owns them.
- Never hardcode phase numbers in messages — always read `expected_phases`.
- All governance rules from CLAUDE.md apply throughout.
