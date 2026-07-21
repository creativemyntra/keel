# QA Report: KEEL-101

**Date:** 2026-07-09
**QA Agent:** qa-engineer (phase 5)
**Story type:** Defect (express lane — phases 2-3 skipped per manifest scope)
**Stack note:** Node project (the keel plugin engine itself). Runner is `node`, not phpunit; the spec's intent (suite run, AC→test mapping, coverage gate, error-path/revert checks) is applied to this stack.

## AC → Test Mapping

| AC | Acceptance Criterion (verbatim from 01-business-analyst.json) | Test | Assertion verified in source | Status |
|----|----------------------------------------------------------------|------|------------------------------|--------|
| AC-1 | The stale-check HALTED warning in keel-watch.cjs instructs `node ~/.keel/bin/keel-state.cjs resume <story> --phase <N> --notes "..."` | `scripts/test-halt-message-paths.cjs` (lines 18-25) | Reads `scripts/keel-watch.cjs`, locates the line containing `HALTED`, fails unless it contains `node ~/.keel/bin/keel-state.cjs resume`. `HALTED` occurs exactly once in that file — line 96, the changed line — so the assertion targets the fix, not a coincidental string. | PASS |
| AC-2 | The Slack halt notification text in keel-state.cjs instructs `node ~/.keel/bin/keel-state.cjs resume <story> --phase <N> --notes "..."` | `scripts/test-halt-message-paths.cjs` (lines 27-34) | Reads `scripts/keel-state.cjs`, locates the line containing `Keel pipeline HALTED`, fails unless it contains `node ~/.keel/bin/keel-state.cjs resume`. That string occurs exactly once — line 156, the changed line. | PASS |

Both ACs are genuinely asserted (content assertions on the exact changed lines), not merely named in test output. Negative path is also covered: the test fails distinctly if the message string is missing entirely (guards against deletion, not just wrong path).

## Test Execution Results

| Run | Command | Result |
|-----|---------|--------|
| Full engine suite | `node scripts/test-keel-state.cjs` | **11/11 passed, 0 failing** (exit 0) |
| KEEL-101 regression test | `node scripts/test-halt-message-paths.cjs` | **PASS** (exit 0) — both halt/stale messages instruct `node ~/.keel/bin/keel-state.cjs resume` |
| Independent revert-check (QA re-ran, not just trusting phase 4) | `node ~/.keel/bin/keel-state.cjs revert-check KEEL-101 --test scripts/test-halt-message-paths.cjs --runner node` | **PASS**: "regression test fails without the fix and passes with it — the test proves the fix." (exit 0). Working tree verified restored afterward (both fixes present, regression test re-passes). |

**Total Tests:** 12 passing / 0 failing (11 engine suite + 1 regression script).

## Coverage (honest assessment)

- **Coverage tooling is absent** in this repo: no c8, nyc, or jest installed; no coverage driver exists for the `.cjs` test scripts. A global coverage percentage **cannot be measured** and no number is fabricated here.
- **Change coverage by analysis:** the entire diff for this defect is **2 changed lines** (one message string in `scripts/keel-watch.cjs` line 96, one in `scripts/keel-state.cjs` line 156 — confirmed via `git diff`). Both changed lines are **directly asserted** by the regression test, and the match strings are unique in each file, so the assertions cannot bind to any other line.
- **Statement:** 2/2 changed lines directly asserted by `scripts/test-halt-message-paths.cjs`; global % unmeasurable — driver absent. The ≥80% gate is applied to the changed lines (100% of the change is under test); the repo-wide gate cannot be evaluated.
- **Trend/baseline:** `.keel/watch/baseline.json` does not exist — no coverage/test-count trend comparison possible. Test count moved 11 → 12 (regression test added); no erosion observed.
- `.keel/memory/conventions.md` does not exist; `.keel/memory/lessons.md` (L-1) reviewed — the regression test embodies the recorded prevention rule.

## RCA Gate (defect-fix requirement)

- Engineer's phase output (`.keel/state/KEEL-101/04-software-engineer.json`) references `docs/defects/KEEL-101-rca.md` — **file exists and was read**.
- The RCA names a **cause, not a symptom**: the v3.9.0 engine-path migration (commit `1685e2d`) swept agent instruction files but missed the resume instruction duplicated as hard-coded text in two runtime message strings, with no single source of truth. Includes 5-whys, impact, fix plan, and prevention (migration sweep grep rule + this regression test as permanent CI guard).
- Revert-check requirement satisfied and **independently re-executed by QA** (see table above): the regression test fails when the fix is reverted.

## Patch-Pattern Check

`git diff` of both source files read directly: each hunk changes **only the text inside one template-literal message string**. No control-flow change, no swallowed errors, no added timeouts/retries, no environment- or story-special-casing. Scope matches the BA-defined "message-text-only in two files" exactly.

## Verdict

**PASS**

- 12/12 tests green (11 suite + 1 regression), 0 red.
- Every AC (AC-1, AC-2) maps to a verified, genuinely-asserting passing test.
- RCA present, cause-level, referenced by the engineer's output; revert-check independently confirmed.
- 100% of changed lines under direct assertion; global coverage honestly reported as unmeasurable (no driver installed).
- No patch-patterns in the diff.

Ready for phase 6 (security-engineer).
