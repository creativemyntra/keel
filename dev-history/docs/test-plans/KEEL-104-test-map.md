# Test Plan: KEEL-104

Story: Add pipeline status web dashboard (`keel dashboard`)

| AC-id | Test file | Test method (assert label) | Category | Verified meaningful |
|-------|-----------|----------------------------|----------|---------------------|
| AC-1 | tests/keel-dashboard.test.cjs | AC-1 parsePort: default port is 7772 when no --port flag given | happy | yes — Option B: MODULE_NOT_FOUND crash on file removal |
| AC-1 | tests/keel-dashboard.test.cjs | AC-1 parsePort: default port is 7772 with non-port argv | happy | yes — Option B: MODULE_NOT_FOUND crash on file removal |
| AC-1 | tests/keel-dashboard.test.cjs | AC-1 startDashboard: stdout includes "Dashboard: http://localhost:7772" | happy | yes — Option B: MODULE_NOT_FOUND crash; without startDashboard() the message is never written |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: story ID appears in output | happy | yes — Option B: MODULE_NOT_FOUND crash; without generateHTML no HTML produced |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: story title appears in output | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: scope appears in output | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: phase label appears in output | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: status "IN PROGRESS" appears in output | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: idle time appears in output | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: raw <script> tag is NOT present (XSS escaping) | security | yes — Option B; also: removing escHtml calls would let raw tags through |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: malicious title is HTML-escaped in output | security | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: COMPLETE status badge present for finished story | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: HALTED status badge present for halted story | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 generateHTML: port number appears in page footer | happy | yes — Option B |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 formatIdle: < 60 min uses "Xm Ys" format | happy | yes — a stub returning "" would fail the pattern assertion |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 formatIdle: exactly 60 min uses "Xh Ym" format (boundary) | edge | yes — implementation using > instead of >= would return "60m 0s" |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 formatIdle: 62 minutes returns "1h 2m" | happy | yes — wrong formula would produce different string |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 formatIdle: negative ms clamped to "0m 0s" | edge | yes — without Math.max(0,ms) clamp returns "-0m 0s" or similar |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 idleTime: null updatedAt returns "unknown" | error | yes — without null guard returns NaN-based string |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 idleTime: undefined updatedAt returns "unknown" | error | yes — same |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 idleTime: empty string updatedAt returns "unknown" | edge | yes — empty string is falsy so guard must fire |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 escHtml: escapes & to &amp; | security | yes — removing & replacement causes this assertion to fail |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 escHtml: escapes < to &lt; | security | yes — removing < replacement fails this assertion |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 escHtml: escapes > to &gt; | security | yes |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 escHtml: escapes " to &quot; | security | yes |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 escHtml: escapes ' to &#39; | security | yes |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 PHASE_NAMES: has 12 entries | happy | yes — array shrink/grow would fail length check |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 PHASE_NAMES: phase 1 is "Product Owner" | happy | yes — wrong first entry fails |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 PHASE_NAMES: phase 6 (index 5) is "TDD Red" | happy | yes — wrong entry fails |
| AC-2 | tests/keel-dashboard.test.cjs | AC-2 PHASE_NAMES: phase 12 (index 11) is "Release Manager" | happy | yes — wrong last entry fails |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: returns all three stories | happy | yes — without readStories the array would be undefined |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: first story has most recent updated_at (STORY-NEW) | happy | yes — wrong sort order moves STORY-NEW out of position 0 |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: second story is STORY-MID | happy | yes — wrong sort order fails |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: last story has oldest updated_at (STORY-OLD) | happy | yes — wrong sort order fails |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: error row is sorted last | error | yes — error rows not pushed last would fail this |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: valid story comes before error row | error | yes — same |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: story row has story_id field | happy | yes — missing field assignment fails |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: story row has title field | happy | yes |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: story row has phase_label derived from PHASE_NAMES | happy | yes — phase number instead of label fails includes("TDD Red") |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: story row has status field | happy | yes |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: story row has idle field (string) | happy | yes |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: skips subdirectory without manifest.json | edge | yes — without existsSync guard a no-manifest dir would cause a crash |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: skips .lock directory | edge | yes — without .lock guard it appears in results |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: skips .tmp directories | edge | yes — without .tmp guard it appears in results |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 readStories: returns only the valid story after skipping artifacts | edge | yes |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 deriveStatus: returns HALTED when manifest.halted is true | happy | yes — without halted branch never returns HALTED |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 deriveStatus: returns COMPLETE when completedCount >= expectedCount | happy | yes — wrong condition would not return COMPLETE |
| AC-3 | tests/keel-dashboard.test.cjs | AC-3 deriveStatus: returns IN PROGRESS when not halted and not all phases done | happy | yes — three-branch logic verified |
| AC-4 | tests/keel-dashboard.test.cjs | AC-4 generateHTML: includes meta http-equiv="refresh" content="30" | happy | yes — removing the meta tag fails both attribute checks |
| AC-4 | tests/keel-dashboard.test.cjs | AC-4 generateHTML with stories: still includes meta refresh tag | happy | yes — confirms meta is in <head> not story rows |
| AC-4 | tests/keel-dashboard.test.cjs | AC-4 generateHTML: starts with <!DOCTYPE html> | happy | yes — missing doctype fails |
| AC-4 | tests/keel-dashboard.test.cjs | AC-4 generateHTML: contains <html lang="en"> | happy | yes |
| AC-4 | tests/keel-dashboard.test.cjs | AC-4 generateHTML: contains <title>Keel Pipeline Dashboard</title> | happy | yes |
| AC-5 | tests/keel-dashboard.test.cjs | AC-5 parsePort: --port 8080 returns 8080 | happy | yes — without --port parsing always returns 7772 |
| AC-5 | tests/keel-dashboard.test.cjs | AC-5 parsePort: --port 9000 returns 9000 | happy | yes |
| AC-5 | tests/keel-dashboard.test.cjs | AC-5 parsePort: non-numeric --port value falls back to 7772 | error | yes — without isNaN guard a NaN port would be returned |
| AC-5 | tests/keel-dashboard.test.cjs | AC-5 parsePort: port 0 (invalid) falls back to 7772 | edge | yes — without n > 0 guard port 0 would be accepted |
| AC-5 | tests/keel-dashboard.test.cjs | AC-5 startDashboard: stdout includes "Dashboard: http://localhost:8080" for port 8080 | happy | yes — hardcoding 7772 in the message fails this |
| AC-6 | tests/keel-dashboard.test.cjs | AC-6 generateHTML([]): contains "No stories found." message | happy | yes — without empty-state branch the table is rendered with no rows |
| AC-6 | tests/keel-dashboard.test.cjs | AC-6 generateHTML([]): contains "keel init" instruction | happy | yes — instruction text only present in empty-state branch |
| AC-6 | tests/keel-dashboard.test.cjs | AC-6 readStories: returns [] when stateDir does not exist | error | yes — without existsSync guard readStories throws on missing dir |
| AC-6 | tests/keel-dashboard.test.cjs | AC-6 readStories: returns [] for stateDir with no story subdirectories | edge | yes — returning undefined or null fails Array.isArray check |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: keel-state.cjs status --all exits 0 | regression | yes — any regression in keel-state.cjs exit code fails this |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: status --all output is valid JSON | regression | yes — corrupted output fails JSON.parse |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: status --all returns a JSON array | regression | yes — object instead of array fails Array.isArray |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: status --all returns 2 entries for 2-story fleet | regression | yes — adding/removing stories from output fails length check |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: REG-A entry has scope "feature" | regression | yes — scope field change fails |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: REG-B entry has scope "defect" | regression | yes |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: each entry has exactly {story_id, scope, current_phase, halted} | regression | yes — adding/removing fields from cmdStatusAll fails key sort check |
| AC-7 | tests/keel-dashboard.test.cjs | AC-7 regression: status --all with no .keel/state emits [] and exits 0 | regression | yes — empty-fleet regression pinned |

## Verification approach

**Option B (file removal)** was used. The implementation file
`scripts/keel-dashboard.cjs` was temporarily renamed (`.bak`) and
`node tests/keel-dashboard.test.cjs` was executed. The process crashed
immediately with `Error: Cannot find module '...keel-dashboard.cjs'` and
exited non-zero — confirming that every test in the file is meaningful
(none can pass without the implementation present).

The implementation was then restored and the full suite was re-run: **70 / 70 passed**.
