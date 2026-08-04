# KEEL-103 Implementation Plan — Add `describe` command to keel-state.cjs

> **Historical note:** This artifact was generated under the 12-phase pipeline (v3.14.x). Phase numbers and agent names reflect the schema active at execution time.

**Story:** KEEL-103  
**Date:** 2026-07-14  
**Author:** software-engineer (phase 4)

---

## Files to Create / Change

| File | Change |
|------|--------|
| `scripts/keel-state.cjs` | Insert `cmdDescribe(storyId)` after `cmdStatusAll` (line 502), add `case 'describe'` to switch, add `describe` to USAGE string |
| `docs/plans/KEEL-103-implementation-plan.md` | This file (artifact) |

No new files. No schema changes. No new npm dependencies.

---

## AC → Implementation Mapping

| AC | How satisfied |
|----|---------------|
| AC-1 | `cmdDescribe` prints a fixed-width labeled text block to stdout via `console.log` and falls through to natural exit 0. |
| AC-2 | `cmdDescribe` first statement is `readManifest(storyId)`, which calls `die(1, 'FAIL: no manifest for story <id>...')` to stderr and exits 1 — no duplicate error string needed. |
| AC-3 | Local `formatIdle(ms)` helper: `ms >= 3_600_000` → `Xh Ym`, else `Xm Ys`. Idle computed from `manifest.updated_at ? formatIdle(Date.now() - new Date(manifest.updated_at).getTime()) : 'unknown'`. |
| AC-4 | Phase names derived from `AGENTS[phaseNum - 1]` — no new data structure needed. Completed phases scanned from stateDir with `/^\d{2}-.+\.json$/`, remaining from `expected_phases` filtered to `> current_phase`. |
| AC-5 | `cmdStatus` (lines 446–468) and `cmdStatusAll` (lines 475–502) are byte-for-byte unchanged. The function is standalone; the only additions to the file are: one new function, one switch case, and one word in USAGE. |

---

## Implementation Detail

### Insertion point

After the closing `}` of `cmdStatusAll` (line 502) and before `function cmdSnapshot` (line 504).

### Function structure

```
function cmdDescribe(storyId) {
  const manifest = readManifest(storyId);          // AC-2 satisfied here

  function formatIdle(ms) { ... }                  // AC-3 helper

  // guard against absent updated_at
  const idle = manifest.updated_at
    ? formatIdle(Date.now() - new Date(manifest.updated_at).getTime())
    : 'unknown';

  // enumerate completed phase files (same regex as cmdStatus line 448)
  const files = fs.readdirSync(stateDir(storyId))
    .filter(f => /^\d{2}-.+\.json$/.test(f)).sort();
  const completedPhaseNums = files.map(f => parseInt(f.slice(0, 2), 10));
  const completedNames = completedPhaseNums.map(n => AGENTS[n - 1]).filter(Boolean);

  // in-progress phase name
  const inProgress = manifest.current_phase > 11
    ? 'complete'
    : (AGENTS[manifest.current_phase - 1] || 'complete');

  // remaining phases
  const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
  const remaining = expected
    .filter(p => p > manifest.current_phase && !completedPhaseNums.includes(p))
    .map(p => AGENTS[p - 1]).filter(Boolean);

  // timestamps for completed phases (read from each phase file)
  // ...

  // emit output
}
```

### Switch / USAGE additions

```js
// USAGE: add 'describe' to the command list
case 'describe': cmdDescribe(storyId); break;
```

---

## Impact Analysis

- **codegraph result:** keel-state.cjs not in PHP codegraph (it is a Node.js file). Single-file change.
- **Dependents with no test coverage:** none known beyond the existing e2e suite.
- **Retest list for tdd-red:** cmdStatus and cmdStatusAll outputs must be verified unchanged (AC-5).

---

## Test Scenarios for Phase 5 (tdd-red)

1. **AC-1 happy path:** `describe KEEL-103` with an initialized story — exits 0, stdout contains story_id, title, scope, current_phase label, idle, gate events line.
2. **AC-2 missing story:** `describe KEEL-MISSING` — exits 1, stderr contains `FAIL: no manifest for story KEEL-MISSING`.
3. **AC-3 idle formatting — sub-hour:** updated_at set 5 minutes 30 seconds ago → idle shows `5m 30s`.
4. **AC-3 idle formatting — multi-hour:** updated_at set 2h 14m ago → idle shows `2h 14m`.
5. **AC-3 missing updated_at:** manifest without `updated_at` field → idle shows `unknown`, no crash.
6. **AC-4 completed phases list:** story with phases 1, 3 written → completed names show `product-owner`, `solution-architect`.
7. **AC-4 remaining phases:** feature story at phase 4 → remaining includes `tdd-red`, `tdd-green`, etc.
8. **AC-4 halted flag:** manifest.halted = true → output contains `WARNING: pipeline is HALTED`.
9. **AC-4 gate events:** manifest.gate_events = 8, max_gates = 44 → output shows `8 / 44`.
10. **AC-5 regression:** `status KEEL-103` JSON output is byte-identical before and after the describe addition.
11. **AC-5 regression:** `status --all` JSON output is byte-identical before and after the describe addition.
12. **Edge case:** `current_phase > 11` → in-progress shows `complete`, remaining is empty.

---

## Risks and Open Questions

- None blocking. The formatIdle NaN guard (absent `updated_at`) is defensive code for pre-field stories — covered by test scenario 5.
- The ADR-002 output format uses a slightly different label style than the implementation requirements doc (ADR uses `Story         :` style, requirements show `Scope:` with tab alignment). Implementation follows the requirements doc format from the task prompt as the authoritative source.
