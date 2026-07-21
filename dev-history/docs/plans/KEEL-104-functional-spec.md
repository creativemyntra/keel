# KEEL-104 Functional Spec — Add pipeline status web dashboard

> **Historical note:** This artifact was generated under the 12-phase pipeline (v3.14.x). Phase numbers and agent names reflect the schema active at execution time.

**Story:** KEEL-104  
**Phase:** 2 (Business Analyst)  
**Date:** 2026-07-14

---

## 1. Data Flow

```
CLI invocation
  keel dashboard [--port N]
        │
        ▼
bin/keel.js  →  new ROUTES.dashboard(ctx) entry
        │         parses --port flag (default 7772)
        ▼
keel-dashboard.cjs  (new file, Node built-ins only)
        │
        ├── http.createServer()
        │     on each GET /
        │       reads .keel/state/
        │         for each sub-dir: reads manifest.json
        │         derives: display_status, phase_name, idle_time
        │         sorts: updated_at DESC
        │       generates inline HTML string
        │       responds: 200 text/html; charset=utf-8
        │
        ├── on port conflict → exits 1 with message to stderr
        │
        └── on listen success → stdout: "Dashboard: http://localhost:<port>"

Browser
  auto-refreshes every 30 s (meta http-equiv="refresh" content="30"
  OR setInterval(()=>location.reload(),30000))
```

---

## 2. Data Model — manifest.json fields (confirmed from real files)

| Field | Type | Used by dashboard |
|---|---|---|
| `story_id` | string | Row identifier, display |
| `title` | string | Display |
| `scope` | string | Display |
| `current_phase` | integer | Phase name lookup |
| `halted` | boolean (may be absent) | Status derivation |
| `expected_phases` | integer[] | Completion check |
| `gate_events` | integer | Display |
| `max_gates` | integer | Display |
| `started_at` | ISO 8601 string | Display |
| `updated_at` | ISO 8601 string | Idle time, sort key |
| `attempts` | object | Display (failure count) |

Fields confirmed absent from KEEL-104 manifest but present in older stories: `attempt_hashes` (may exist, not displayed). Fields dashboard must not read or rely on: phase output files (dashboard reads manifests only).

---

## 3. Phase Name Mapping Table

| Phase # | Agent key (manifest/filename) | Display name |
|---|---|---|
| 1 | product-owner | Product Owner |
| 2 | business-analyst | Business Analyst |
| 3 | ui-designer | UI Designer |
| 4 | solution-architect | Solution Architect |
| 5 | software-engineer | Software Engineer |
| 6 | tdd-red | TDD Red |
| 7 | tdd-green | TDD Green |
| 8 | qa-engineer | QA Engineer |
| 9 | e2e-engineer | E2E Engineer |
| 10 | security-engineer | Security Engineer |
| 11 | technical-writer | Technical Writer |
| 12 | release-manager | Release Manager |

Source of truth: `AGENTS` array in `keel-state.cjs` lines 36-39 (zero-indexed, so phase N = AGENTS[N-1]).

---

## 4. Status Derivation Rule

```
if manifest.halted === true           → "HALTED"
else if completed_phases >= expected_phases.length  → "COMPLETE"
else                                  → "IN PROGRESS"
```

Where `completed_phases` = count of files matching `/^\d{2}-.+\.json$/` in the story directory (same pattern as `cmdStatus` line 448 of keel-state.cjs).

**Display colours (must match existing `cmdReport` conventions):**
- HALTED: `#dc2626` (red)
- COMPLETE: `#16a34a` (green)
- IN PROGRESS: `#d97706` (amber)

---

## 5. Idle Time Formula

Convention (2026-07-14, conventions.md):

```
elapsed_ms = Date.now() - new Date(manifest.updated_at).getTime()

if manifest.updated_at is absent → display "unknown"
else if elapsed_ms >= 3_600_000  → `${Math.floor(elapsed_ms/3600000)}h ${Math.floor((elapsed_ms%3600000)/60000)}m`
else                              → `${Math.floor(elapsed_ms/60000)}m ${Math.floor((elapsed_ms%60000)/1000)}s`
```

Both values use `Math.floor`. This is already implemented identically in `cmdDescribe` (keel-state.cjs lines 512-521) — the dashboard must use the same formula verbatim.

---

## 6. Edge Cases

| Case | Required behaviour |
|---|---|
| `--port` value already bound | `server.on('error', e => { if (e.code==='EADDRINUSE') ... })` — print error to stderr, exit 1 |
| `.keel/state/` directory absent | Server still starts; page shows: "No stories found. Run keel init &lt;story-id&gt; to start." |
| `.keel/state/` exists but contains no story sub-dirs | Same empty-state message |
| Sub-dir exists but `manifest.json` is missing | Skip silently (same skip logic as `cmdStatusAll` line 487) |
| `manifest.json` present but malformed JSON | Skip and mark as `{ story_id: <dirname>, error: <message> }` — render as error row in table, do not crash server |
| `manifest.halted` field absent | Treat as `false` — same strict check as `cmdStatusAll` line 494 (`m.halted === true`) |
| `manifest.updated_at` absent | Idle = "unknown" |
| `manifest.expected_phases` absent | Fall back to `SCOPES[manifest.scope]` then `SCOPES.feature` — same chain as keel-state.cjs line 452 |

---

## 7. CLI Wiring — bin/keel.js

Current structure: `ROUTES` object keyed by sub-command string; `parseArgs` extracts `--key=value` flags into `flags` object; `ROUTES[sub](ctx)` dispatches.

New entry required:
```js
dashboard(c) {
  // spawn keel-dashboard.cjs with --port flag
  run('node', [resolve(__dirname, '../scripts/keel-dashboard.cjs'), '--port', c.port]);
}
```

`ctx.port` populated from `flags.port || '7772'` in the `ctx` construction block (lines 274-283). Help text updated to list `dashboard` command. `--port` added to OPTIONS section.

---

## 8. AC Coverage Map

| AC | Addressed by |
|---|---|
| AC-1 | `keel dashboard` sub-command in bin/keel.js; stdout `Dashboard: http://localhost:<port>` |
| AC-2 | Read-only server; no write endpoints; no mutation of .keel/state/ |
| AC-3 | Phase name mapping table (section 3); idle time formula (section 5); sort by updated_at DESC |
| AC-4 | Auto-refresh: meta refresh or JS interval every 30 s |
| AC-5 | `--port` flag parsing in bin/keel.js and passed to keel-dashboard.cjs |
| AC-6 | Empty state message when .keel/state/ absent or no stories found |
| AC-7 | keel-dashboard.cjs is a new file; keel-state.cjs is not modified; `status --all` output unchanged |

---

## 9. Constraints

- Zero new npm dependencies: `http`, `fs`, `path` built-ins only.
- HTML generated as an inline template string in keel-dashboard.cjs — no external template files.
- New file: `scripts/keel-dashboard.cjs` (CJS, consistent with keel-state.cjs).
- bin/keel.js is ESM — wires to dashboard via `run('node', [...])` using existing `run()` helper.
- No payment, authentication, or PII data involved.
