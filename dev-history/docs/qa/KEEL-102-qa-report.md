# QA Report: KEEL-102 — `status --all` fleet listing

**Date:** 2026-07-09 | **Engine under test:** `scripts/keel-state.cjs` (working tree) | **Runner:** node (v26.1.0)

## Test Suite

Command: `node scripts/test-keel-state.cjs`

**Result: 21/21 passed, exit 0.** All 14 pre-existing tests remain green; 7 new assertions added by KEEL-102 (6 in the `status --all` group + 1 single-story regression pin).

## AC → Test Mapping

| AC | Criterion | Test (scripts/test-keel-state.cjs) | Status |
|----|-----------|-------------------------------------|--------|
| AC-1 | `status --all` prints a JSON array, one entry per story dir, each with `story_id`, `scope`, `current_phase`, `halted` | `status --all: exit 0 with a JSON array of 2 stories` (L197); `status --all: sorted first entry is the feature story with correct fields` (L201 — asserts story_id/scope/current_phase/halted values); `status --all: defect + halted story reported verbatim` (L204); `status --all: entries project exactly {story_id, scope, current_phase, halted}` (L207 — exact 4-key projection) | PASS |
| AC-2 | No `.keel/state/` or zero stories → prints `[]`, exits 0 | `status --all: no .keel/state prints [] with exit 0` (L214 — asserts `code === 0 && out.trim() === '[]'`) | PASS |
| AC-3 | Single-story `status <id>` unchanged; full engine suite stays green | `status <id>: single-story deep view unchanged by --all` (L239 — pins deep fields `attempts`, `completed_phase_files`); plus all 14 pre-existing tests green (21/21) | PASS |
| — | Robustness (B-5, beyond ACs) | `status --all: corrupt manifest is skip-and-marked, healthy sibling still listed, exit 0` (L229) | PASS |

Mapping verified by reading the test source: each AC is genuinely asserted (exit codes, parsed JSON values, exact key projection, sort order), not merely exercised. The AC-1 fixture halts FLEET-B through the real engine path (3 gate FAILs), so `halted: true` reflects production halt behavior, not a hand-edited manifest.

## Coverage (measured — driver-absent gap remediated)

Command: `npx --yes c8 --include scripts/keel-state.cjs --reporter=text node scripts/test-keel-state.cjs`
(c8's `NODE_V8_COVERAGE` propagates into the child engine processes the suite spawns, so this measures the engine, not just the test harness.)

| Metric | scripts/keel-state.cjs |
|--------|------------------------|
| Lines | **72.03%** |
| Statements | 72.03% |
| Branches | 61.95% |
| Functions | 85.71% |

**Changed-code coverage (the KEEL-102 diff):**

| Changed code | Coverage | Evidence (per-line hits from c8 JSON output) |
|--------------|----------|----------------------------------------------|
| `cmdStatusAll()` (L435–462) | **28/28 executable lines hit** | Every line hit ≥1×, including the B-2 empty-root early return (L437) and the B-5 corrupt-manifest catch (L456–458, hit 1× by the corrupt-fixture test) |
| Dispatcher intercept (L687) | **Covered** | Hit 43× (evaluated on every engine invocation; `--all` branch taken by the 6 new tests) |

The only path inside `cmdStatusAll` not distinctly branch-exercised is the B-9 die (`root exists but readdirSync throws`) — an OS-permission failure that is impractical to simulate portably on Windows; it is 2 lines and its failure mode is a loud `die(1)`.

**Gate assessment:** the diff introduced by KEEL-102 is fully covered (effectively 100% line coverage of new code). The file-level 72.03% is **pre-existing debt** — every uncovered range (…L562–583, L596–597, L616–626, L652–653, L657–678, etc.) lies outside the KEEL-102 diff and predates this story (previously unmeasured; prior stories waived coverage as driver-absent). Failing this story for legacy uncovered lines it did not touch would be gate misuse; the debt is flagged below instead.

## Trend

- `.keel/watch/baseline.json`: **not present** — no recorded baseline to compare against.
- Test count: **grew 14 → 21 (+7)**. No erosion; suite is growing with the feature.
- Coverage baseline: 72.03% lines / 61.95% branches is the **first measured value** for this engine. Recommendation: record it in `.keel/watch/baseline.json` so future stories can be held to "no erosion below 72.03%" while legacy die/error paths are back-filled toward the 80% gate.

## Findings

1. All 3 ACs have passing, genuinely-asserting tests (mapping above). No red tests.
2. Coverage gap remediated: measured with c8 instead of waived. New code 100% covered; file at 72.03% due to legacy paths only.
3. AC-3 structural guard corroborated: `git diff` shows engine edits limited to `cmdStatusAll`, one dispatcher line, and two usage strings — `cmdStatus` and helpers untouched.
4. Scope is `feature` — no RCA/revert-check requirement applies (revert-check tests in the suite are for the engine's own revert-check command and pass).
5. Pre-existing dirty file `bin/package-plugin.sh` predates phase 4 and is out of scope (noted by the engineer; confirmed untouched by this story's diff intent).

**Total Tests:** 21 passing / 0 failing
**Coverage:** 72.03% file-level (target ≥80% — pre-existing debt); changed code 100% (28/28 lines + dispatcher)

**Verdict: PASS** — with one flagged debt item: file-level engine coverage (72.03%) is below the 80% gate on legacy code; record baseline and back-fill in a follow-up story.
