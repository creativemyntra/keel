# KEEL-104 Implementation Plan — Add Pipeline Status Web Dashboard

> **Historical note:** This artifact was generated under the 12-phase pipeline (v3.14.x). Phase numbers and agent names reflect the schema active at execution time.

**Phase:** 5 (Software Engineer)
**Date:** 2026-07-14
**Story:** KEEL-104

---

## Files to Create / Modify

| File | Action | Rationale |
|---|---|---|
| `scripts/keel-dashboard.cjs` | CREATE (new) | All dashboard logic isolated here per ADR-003 |
| `bin/keel.js` | MODIFY (additive only) | Add ROUTES.dashboard, ctx.port, help text |
| `docs/plans/KEEL-104-implementation-plan.md` | CREATE | This file |

`scripts/keel-state.cjs` is NOT touched (AC-7 regression guard).

---

## AC Rationale

| AC | Implementation |
|---|---|
| AC-1 | `ROUTES.dashboard(c)` in `bin/keel.js` calls `run('node', ['scripts/keel-dashboard.cjs', '--port', c.port])`. `startDashboard` prints `Dashboard: http://localhost:<port>` to stdout on successful bind. |
| AC-2 | `keel-dashboard.cjs` contains zero write operations (`fs.writeFile`, `writeManifest`, etc.). HTTP handler is read-only. No mutating endpoints. |
| AC-3 | `readStories` reads manifest fields; `PHASE_NAMES[phase-1]` maps phase number to display name; `formatIdle` implements the conventions.md 2026-07-14 formula; sort by `updated_at` descending. |
| AC-4 | `generateHTML` includes `<meta http-equiv="refresh" content="30">` in `<head>`. Animated pulse dot indicates live status. |
| AC-5 | `parsePort(argv)` extracts `--port N` from process.argv. `bin/keel.js` passes `c.port` (from `flags.port || '7772'`) as the `--port` argument. Port shown in footer. |
| AC-6 | `readStories` returns `[]` when `.keel/state/` is absent. `generateHTML` renders the empty-state div when `stories.length === 0`. Server still starts and serves. |
| AC-7 | All new logic in new `keel-dashboard.cjs`; only additive changes to `bin/keel.js`; zero changes to `keel-state.cjs`. Verified with `git diff scripts/keel-state.cjs`. |

---

## Impact Analysis

- `bin/keel.js`: sole reverse-dependent — three additive changes (ROUTES entry, ctx field, help text). No existing ROUTES entry is altered.
- `scripts/keel-state.cjs`: NOT in impact set — must be byte-for-byte unchanged.
- Codegraph tracks only PHP classes; JS CLI files have no graph nodes.

---

## Test Scenarios for Phase 6 (tdd-red agent)

1. `escHtml` escapes all five special characters: `&`, `<`, `>`, `"`, `'`
2. `idleTime`/`formatIdle`:
   - Returns "unknown" when updatedAt is falsy/absent
   - Returns "Xh Ym" format when elapsed >= 3,600,000 ms
   - Returns "Xm Ys" format when elapsed >= 60,000 ms but < 3,600,000 ms
   - Returns "0m 0s" (not negative) when ms is zero or negative (clock skew)
3. `readStories`:
   - Returns `[]` when stateDir is absent
   - Skips sub-dirs without `manifest.json`
   - Skips `.lock` and `.tmp` entries
   - Returns error StoryRow for malformed JSON manifest (does not throw)
   - Returns sorted StoryRow[] by updated_at DESC (valid rows before error rows)
4. `generateHTML`:
   - Contains `<meta http-equiv="refresh" content="30">`
   - Renders empty-state div when stories array is empty
   - Renders table with correct rows when stories array non-empty
   - Status badges use correct colors (COMPLETE=#16a34a, IN PROGRESS=#d97706, HALTED=#dc2626)
   - Escapes story_id, title, scope, phase_label, idle in row cells
5. `startDashboard`:
   - Binds to 127.0.0.1 (not 0.0.0.0)
   - Prints `Dashboard: http://localhost:<port>` to stdout on success
   - GET `/` returns 200 with Content-Type text/html
   - GET `/other` returns 404
   - EADDRINUSE → stderr message + exit 1
6. `bin/keel.js` `--help` output contains "dashboard"
7. `bin/keel.js` `--help` output contains "--port"

---

## Risks and Open Questions

- Clock skew: `formatIdle` called with `Math.max(0, ms)` to prevent negative display strings.
- XSS: all manifest-sourced strings pass through `escHtml()` before HTML injection.
- Port conflict: `EADDRINUSE` handler prints to stderr and exits 1.
- `keel-state.cjs` must not be touched — verified by `git diff` before handoff.
