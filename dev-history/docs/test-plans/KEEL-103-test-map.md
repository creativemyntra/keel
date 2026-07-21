# Test Plan: KEEL-103

> **Historical note:** This artifact was generated under the 12-phase pipeline (v3.14.x). Phase numbers and agent names reflect the schema active at execution time.

Story: Add `describe` command to `keel-state.cjs`

| AC-id | Test file | Test method (assert label) | Category | Verified meaningful |
|-------|-----------|----------------------------|----------|---------------------|
| AC-1  | tests/keel-state-describe.test.js | AC-1 happy-path: exit code is 0 for existing story | happy | yes — stub confirms fail: if `cmdDescribe` throws "not implemented", exit is non-zero |
| AC-1  | tests/keel-state-describe.test.js | AC-1 happy-path: stdout contains the story ID | happy | yes — stub confirms fail: stdout would be empty with a thrown stub |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Scope:" | happy | yes — stub confirms fail: none of the labels would appear without console.log calls |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Current phase:" | happy | yes — stub confirms fail: same reasoning |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Halted:" | happy | yes — stub confirms fail: same reasoning |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Idle:" | happy | yes — stub confirms fail: same reasoning |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Started:" | happy | yes — stub confirms fail: same reasoning |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Completed phases:" section | happy | yes — stub confirms fail: section header never emitted without the function body |
| AC-1  | tests/keel-state-describe.test.js | AC-1 output-structure: stdout contains "Gate events used:" | happy | yes — stub confirms fail: line never emitted without the function body |
| AC-2  | tests/keel-state-describe.test.js | AC-2 missing-story: exit code is 1 | error | yes — stub confirms fail: if `cmdDescribe` is replaced with `throw new Error('not implemented')` the process exits 1 via uncaught exception, but for the wrong reason; without readManifest delegation exit code is 64 (usage error) not 1, causing the assertion to fail unless the exact readManifest path is wired |
| AC-2  | tests/keel-state-describe.test.js | AC-2 missing-story: stderr contains "FAIL: no manifest for story" | error | yes — stub confirms fail: the exact string is only emitted by readManifest's die(1,...) call; any other stub would not produce this string |
| AC-2  | tests/keel-state-describe.test.js | AC-2 missing-story: stderr contains the story ID that was requested | error | yes — stub confirms fail: story ID is interpolated into the message by readManifest |
| AC-2  | tests/keel-state-describe.test.js | AC-2 missing-story: stdout is empty on failure | error | yes — stub confirms fail: a stub that echoes to stdout would break this |
| AC-3  | tests/keel-state-describe.test.js | AC-3 sub-hour idle format: output matches "Xm Ys" pattern | happy | yes — stub confirms fail: without formatIdle the idle line either shows ISO timestamp or crashes |
| AC-3  | tests/keel-state-describe.test.js | AC-3 sub-hour idle format: output does NOT use "Xh Ym" for a 3-minute idle | error | yes — stub confirms fail: an incorrect implementation that always uses "Xh Ym" would fail this |
| AC-3  | tests/keel-state-describe.test.js | AC-3 multi-hour idle format: output matches "Xh Ym" pattern | happy | yes — stub confirms fail: without the >= 3_600_000 branch, the output would show "Xm Ys" not "Xh Ym" |
| AC-3  | tests/keel-state-describe.test.js | AC-3 multi-hour idle format: "1h 2m" for 62-minute idle (floor rounding) | edge | yes — stub confirms fail: ceiling-rounded would produce "1h 2m" by coincidence here but would fail a 61-min test; the exact floor arithmetic is pinned |
| AC-3  | tests/keel-state-describe.test.js | AC-3 edge-case: absent updated_at shows "unknown" without crashing | edge | yes — stub confirms fail: without the defensive `manifest.updated_at ?` guard, NaN would appear in output |
| AC-3  | tests/keel-state-describe.test.js | AC-3 boundary: exactly 60 minutes idle uses "Xh Ym" format | edge | yes — stub confirms fail: an implementation using `> 3_600_000` instead of `>= 3_600_000` would use the wrong branch at boundary |
| AC-3  | tests/keel-state-describe.test.js | AC-3 boundary: exactly 60 minutes shows "1h 0m" | edge | yes — stub confirms fail: wrong formula would produce a different string |
| AC-4  | tests/keel-state-describe.test.js | AC-4 phase-names: "product-owner" appears in completed phases output | happy | yes — stub confirms fail: without AGENTS lookup the phase name would be the raw filename segment |
| AC-4  | tests/keel-state-describe.test.js | AC-4 phase-names: current_phase=5 shows "tdd-red" (AGENTS[4]) | happy | yes — stub confirms fail: hard-coding phase names or using a different array index fails |
| AC-4  | tests/keel-state-describe.test.js | AC-4 halted-flag: describe shows WARNING when manifest.halted is true | error | yes — stub confirms fail: without the `if (manifest.halted === true)` branch the WARNING line is never emitted |
| AC-4  | tests/keel-state-describe.test.js | AC-4 gate-events: output line matches "Gate events used: N / M" | happy | yes — stub confirms fail: without reading manifest.gate_events / manifest.max_gates the line would differ |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: status --all exits 0 | regression | yes — would fail if cmdStatusAll were accidentally modified to exit 1 |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: status --all output is valid JSON | regression | yes — would fail if describe changes corrupted the status path |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: status --all returns a JSON array | regression | yes — pins output type |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: status --all returns exactly 2 stories for 2-story fleet | regression | yes — pins fleet count |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: FLEET-X entry has correct scope and current_phase | regression | yes — pins field values |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: each entry projects exactly {story_id, scope, current_phase, halted} | regression | yes — pins schema: adding extra fields to cmdStatusAll would fail this |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: entries are sorted alphabetically by story_id | regression | yes — pins sort order from BR-5 |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: status --all with no .keel/state emits [] and exits 0 | regression | yes — pins empty-fleet behaviour |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: single-story status exits 0 | regression | yes — pins existing single-story contract |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: single-story status output is valid JSON | regression | yes — pins output format |
| AC-5  | tests/keel-state-describe.test.js | AC-5 regression: single-story status contains field "story_id" (×10 fields) | regression | yes — each field assertion fails if cmdStatus drops that field |

## Verification approach

**Option A (stub method)** was used conceptually for all tests.

For AC-1, AC-3, AC-4: replacing the body of `cmdDescribe` with
`throw new Error('not implemented')` causes the subprocess to exit with a
non-zero code and empty stdout, failing all assertions that check exit 0
or stdout content.

For AC-2: the exact string `"FAIL: no manifest for story"` is only produced
by `readManifest`'s `die(1,...)` call. A stub that throws before calling
`readManifest` would produce a different stderr message or exit code, failing
the AC-2 assertions.

For AC-3 format branches: replacing `formatIdle` with a stub returning `"stub"`
would fail the pattern assertions immediately. Replacing only the `>=3_600_000`
branch condition with `>3_600_000` would fail the boundary test at exactly
60 minutes.

For AC-5: these tests run `status` and `status --all`, which do not invoke
`cmdDescribe` at all. They fail only if `cmdStatusAll`/`cmdStatus` behaviour
changes — the meaningfulness guard is that any regression in those functions
(e.g., adding a field, changing sort order) would produce a mismatch against
the pinned expectations.
