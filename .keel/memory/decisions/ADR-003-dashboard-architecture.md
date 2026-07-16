# ADR-003: Pipeline Status Web Dashboard Architecture

**Status:** Accepted | **Date:** 2026-07-14 | **Story:** KEEL-104 | **Supersedes:** none | **Compatible with:** ADR-001, ADR-002

---

## Context

KEEL-104 adds a `keel dashboard` sub-command that serves a local HTTP page
summarising all pipeline stories. The feature requires:

- An HTTP server (Node.js built-in `http` module).
- State reading identical in pattern to `cmdStatusAll` (ADR-001): lock-free,
  skip-and-mark, exit-0 on per-story problems.
- An inline HTML generator (~300+ lines once styles, table rows, and
  empty/error states are included).
- AC-7 hard constraint: `scripts/keel-state.cjs` must not be modified; the
  `status --all` output contract must remain byte-for-byte unchanged.

The primary architectural question is whether the dashboard logic belongs
inline in `bin/keel.js` or in a dedicated new module.

---

## Options Considered

### Option A: Inline the dashboard in `bin/keel.js`
Add a `dashboard(c)` entry to the existing `ROUTES` object that starts the
HTTP server and generates HTML directly in `bin/keel.js`.

- Pros: one fewer file; no cross-module require.
- Cons: `bin/keel.js` is ESM (`import`/`export`); the server and HTML generator
  together add 300+ lines to a file already serving as the CLI dispatcher.
  Mixing HTTP server lifecycle, HTML string generation, and filesystem traversal
  into the dispatcher makes each concern harder to test in isolation. The
  `generateHTML` function would not be directly require-able from a CJS test
  harness without dynamic `import()`.

### Option B: New file `scripts/keel-dashboard.cjs` spawned by `bin/keel.js` (chosen)
`bin/keel.js` adds a `dashboard(c)` route that calls the existing `run()`
helper to spawn `node scripts/keel-dashboard.cjs --port <N>`. The dashboard
module is self-contained CJS, matching the `keel-state.cjs` convention.

- Pros:
  - `bin/keel.js` stays a pure CLI dispatcher (no new lifecycle concern).
  - CJS module is directly `require()`-able by the existing CJS test harness
    (`scripts/test-keel-state.cjs` style).
  - The 300+ line HTML generator and HTTP server lifecycle are isolated; a
    future engineer can replace or test either without touching the dispatcher.
  - Consistent with the existing pattern: `keel-state.cjs` is also a CJS
    file spawned by the ESM `bin/keel.js` via `run()`.
  - AC-7 compliance is structurally guaranteed: `keel-state.cjs` is never
    touched.

---

## Decision

Implement the dashboard as **`scripts/keel-dashboard.cjs`**, a new CJS file.
`bin/keel.js` wires it via the existing `run()` helper.

### File: `scripts/keel-dashboard.cjs`

Single exported concern (though the file is a CJS script, not a library —
it is run directly by Node.js). Internal structure:

```
PHASE_NAMES constant (12-entry array, 1-indexed via [phase - 1])
SCOPES constant (mirrors keel-state.cjs — not shared, to keep AC-7 safe)
parsePort(argv)         — extracts --port flag, returns integer, default 7772
readStories(stateDir)   — lock-free fleet read, returns StoryRow[]
deriveStatus(m, files)  — "HALTED" | "IN PROGRESS" | "COMPLETE"
formatIdle(ms)          — same formula as cmdDescribe (conventions.md 2026-07-14)
generateHTML(stories, port) — returns full HTML string
startDashboard({ port, stateDir }) — creates http.Server, listens, prints URL
main()                  — called at bottom of file
```

### File: `bin/keel.js`

Two changes only:

1. Add `dashboard` entry to `ROUTES`:
   ```js
   dashboard(c) {
     run('node', [resolve(__dirname, '../scripts/keel-dashboard.cjs'), '--port', c.port]);
   }
   ```

2. Add `port` to the `ctx` construction block:
   ```js
   port: String(flags.port || '7772'),
   ```

3. Update `showHelp()` to list the `dashboard` command and `--port` option.

No other lines in `bin/keel.js` change. `keel-state.cjs` is **not touched**.

---

## State Reading — Lock-Free Pattern

Identical to ADR-001. `readStories` uses:

```js
fs.readdirSync(root, { withFileTypes: true })
```

with a per-entry `try/catch` (not `readJson`/`readManifest`, which call
`die()` and would abort the sweep). Corrupt entries become
`{ story_id: dirname, error: message }` objects rendered as error rows.
The HTTP server never crashes on a bad manifest — it serves the error row.

This is safe for the same reason as ADR-001: `writeManifest()` is atomic
(tmp + rename on NTFS/POSIX), so a concurrent reader sees either the
complete old file or the complete new file, never a torn write.

---

## HTML Generation

`generateHTML(stories, port)` receives the sorted StoryRow array and the
listening port. It returns a complete UTF-8 HTML5 document as a template
literal string. No external template files. The only `<style>` block in
the document contains the single `@keyframes pulse` animation rule (which
cannot be expressed as an inline style attribute). All other CSS is inline.

---

## Port Conflict Handling

```js
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    process.stderr.write(`Error: port ${port} is already in use. Use --port to specify a different port.\n`);
    process.exit(1);
  }
  throw e;
});
```

This is the only `EADDRINUSE` handler needed. Non-EADDRINUSE errors are
re-thrown so they surface as unhandled exceptions (standard Node.js behavior).

---

## Phase Name Mapping

A module-scoped constant in `keel-dashboard.cjs`:

```js
const PHASE_NAMES = [
  'Product Owner',       // phase 1
  'Business Analyst',    // phase 2
  'UI Designer',         // phase 3
  'Solution Architect',  // phase 4
  'Software Engineer',   // phase 5
  'TDD Red',             // phase 6
  'TDD Green',           // phase 7
  'QA Engineer',         // phase 8
  'E2E Engineer',        // phase 9
  'Security Engineer',   // phase 10
  'Technical Writer',    // phase 11
  'Release Manager',     // phase 12
];
```

Access: `PHASE_NAMES[phase - 1] || String(phase)`. The fallback `String(phase)`
handles phases beyond 12 without crashing.

The AGENTS array in `keel-state.cjs` (kebab-case strings) is the source-of-
truth agent key array; `PHASE_NAMES` is the dashboard-only display label
array. They are parallel but not shared — sharing would require modifying
`keel-state.cjs`, violating AC-7.

---

## Consequences

- `scripts/keel-state.cjs` is byte-for-byte unchanged — AC-7 satisfied
  structurally (no edits, not just no behaviour changes).
- The new file is directly testable: `require('./keel-dashboard.cjs')` from a
  CJS test script can call `generateHTML` and `readStories` if they are
  exported, without starting an HTTP server.
- `bin/keel.js` gains exactly three small changes: one ROUTES entry, one ctx
  field, one help-string line. The ESM/CJS boundary is crossed via `spawnSync`
  (the existing `run()` pattern), not dynamic `import()`.
- Zero new npm dependencies — `http`, `fs`, `path` built-ins only.
- The codegraph (`keel/.keel/graph/codegraph.json`) currently tracks only PHP
  classes and has no Node.js nodes; the new file has no reverse-dependency
  exposure in the graph. Impact set for this story: `bin/keel.js` (one
  dispatcher) + new `scripts/keel-dashboard.cjs`.
- L-1 (KEEL-101 lesson: user-facing path strings must be updated on rename)
  applies here: the startup message `'Dashboard: http://localhost:<port>'` must
  reference no path that could diverge from the installed path. The message
  contains only the runtime-determined port, not a file path, so L-1 is
  satisfied.
- Any future `--open` flag (browser auto-open) should use `child_process.exec`
  with the platform-appropriate opener (`open`/`xdg-open`/`start`), not a new
  dependency.
