# KEEL-104 Technical Design — Add Pipeline Status Web Dashboard

**Story:** KEEL-104  
**Phase:** 4 (Solution Architect)  
**Date:** 2026-07-14  
**ADR:** `.keel/memory/decisions/ADR-003-dashboard-architecture.md`

---

## 1. Architecture Decision Record Summary

See full record at `.keel/memory/decisions/ADR-003-dashboard-architecture.md`.

**Decision:** Dashboard logic lives in a new file `scripts/keel-dashboard.cjs`,
spawned by `bin/keel.js` via the existing `run()` helper.

**Rationale:**

- `bin/keel.js` is ESM; `keel-state.cjs` is CJS. The spawned-child pattern
  already crosses this boundary cleanly without dynamic `import()`.
- The HTML generator will be 300+ lines. Embedding it in the CLI dispatcher
  conflates two separate concerns (argument routing vs. server lifecycle +
  HTML rendering).
- A standalone CJS file is directly `require()`-able from the existing CJS
  test harness style without any ESM interop ceremony.
- AC-7 requires that `keel-state.cjs` remain unmodified. Placing the
  dashboard in a new file makes this structurally impossible to violate.

---

## 2. Component Diagram

```
bin/keel.js (ESM — CLI dispatcher)
  │
  │  ROUTES.dashboard(c)
  │    run('node', ['scripts/keel-dashboard.cjs', '--port', c.port])
  │    (spawnSync — inherits stdio, blocks until server exits)
  │
  └──► scripts/keel-dashboard.cjs (CJS — new file)
         │
         ├── parsePort(argv)
         │     reads process.argv, returns integer, default 7772
         │
         ├── readStories(stateDirPath)
         │     fs.readdirSync → filter directories
         │     per-entry try/catch (NOT readJson/readManifest)
         │     returns StoryRow[] sorted by updated_at DESC
         │
         ├── deriveStatus(manifest, completedPhaseCount, expectedPhaseCount)
         │     → "HALTED" | "IN PROGRESS" | "COMPLETE"
         │
         ├── formatIdle(ms)
         │     → "Xh Ym" | "Xm Ys" | "unknown"  (conventions.md 2026-07-14)
         │
         ├── generateHTML(stories, port)
         │     → complete UTF-8 HTML5 string
         │
         └── startDashboard({ port, stateDir })
               http.createServer(handler)
               server.on('error') → EADDRINUSE → stderr + exit(1)
               server.listen(port) → stdout: "Dashboard: http://localhost:<port>"

.keel/state/                    (read-only, never written by dashboard)
  KEEL-101/manifest.json
  KEEL-102/manifest.json
  KEEL-103/manifest.json
  KEEL-104/manifest.json
  ...

Browser
  GET http://localhost:7772/
    ← 200 text/html; charset=utf-8
    <meta http-equiv="refresh" content="30">  (auto-refresh every 30s)
```

---

## 3. API Contract

The dashboard exposes a single HTTP endpoint. There is no authentication —
the server binds to `localhost` only (implicit via `server.listen(port)`
without a hostname argument; Node.js defaults to `0.0.0.0` — see Technical
Risks §7.1 for the security note on this point and required mitigation).

### GET /

| Property | Value |
|---|---|
| Method | GET |
| Path | `/` |
| Auth | None (localhost, developer tool) |
| Request body | None |
| Content-Type response | `text/html; charset=utf-8` |
| Success status | 200 |
| Body | Full HTML document (see §5 for structure) |

### GET /* (any other path)

| Property | Value |
|---|---|
| Status | 404 |
| Body | Plain text: `Not found` |
| Content-Type | `text/plain` |

### Error responses (server level)

| Condition | Behavior |
|---|---|
| EADDRINUSE on bind | `process.stderr.write(...)` + `process.exit(1)` — no HTTP response |
| Unhandled `server.on('error')` | Re-throw (surfaces as Node.js fatal) |

---

## 4. DB Schema

No database involved. The dashboard reads only from the local filesystem:
`.keel/state/<storyId>/manifest.json`.

### Manifest fields consumed by the dashboard

| Field | Type | Fallback if absent | Used for |
|---|---|---|---|
| `story_id` | string | directory name | Row identifier |
| `title` | string | `""` | Title column |
| `scope` | string | `"feature"` | Scope column |
| `current_phase` | integer | `null` | Phase column (`PHASE_NAMES[n-1]`) |
| `halted` | boolean | `false` (strict `=== true`) | Status derivation |
| `expected_phases` | integer[] | `SCOPES[scope] \|\| SCOPES.feature` | Completion check |
| `updated_at` | ISO 8601 string | absent → idle = `"unknown"` | Idle time, sort key |
| `gate_events` | integer | — | Not displayed (reserved) |
| `max_gates` | integer | — | Not displayed (reserved) |

Fields not read: `started_at`, `attempts`, `max_hours`, `attempt_hashes`.
The dashboard intentionally reads only the minimum set needed to render the
six table columns and status badge.

---

## 5. HTML Generation — `generateHTML(stories, port)`

### Signature

```js
/**
 * @param {StoryRow[]} stories  Sorted array of story display objects.
 * @param {number}     port     Listening port (shown in footer).
 * @returns {string}            Complete UTF-8 HTML5 document.
 */
function generateHTML(stories, port) { ... }
```

### StoryRow shape

Each element of the `stories` array is one of two shapes:

```js
// Normal row
{
  story_id:     string,   // e.g. "KEEL-104"
  title:        string,   // e.g. "Add pipeline status web dashboard"
  scope:        string,   // e.g. "feature"
  current_phase: number,  // e.g. 4
  status:       'COMPLETE' | 'IN PROGRESS' | 'HALTED',
  phase_label:  string,   // e.g. "Phase 4 — Solution Architect"
  idle:         string,   // e.g. "2h 14m" or "unknown"
  error:        null,
}

// Error row (malformed manifest)
{
  story_id: string,   // directory name
  error:    string,   // e.g. "Unexpected token } in JSON at position 42"
  // all other fields absent
}
```

### Document structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>Keel Pipeline Dashboard</title>
  <style>
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
             color:#0f172a;min-height:100vh;display:flex;flex-direction:column">

  <!-- HEADER -->
  <header style="background:#ffffff;border-bottom:1px solid #e2e8f0;padding:24px 24px 16px">
    <div style="max-width:960px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a">
            Keel Pipeline Dashboard
          </h1>
          <p style="margin:0;font-size:14px;color:#64748b">
            Read-only view &middot; ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;
                     color:#16a34a;font-weight:500">
          <span style="width:8px;height:8px;border-radius:50%;background:#16a34a;
                       display:inline-block;animation:pulse 2s infinite"></span>
          Live &middot; refreshes every 30s
        </span>
      </div>
    </div>
  </header>

  <!-- MAIN -->
  <main style="flex:1;padding:24px">
    <div style="max-width:960px;margin:0 auto">
      <!-- TABLE or EMPTY STATE injected here -->
    </div>
  </main>

  <!-- FOOTER -->
  <footer style="border-top:1px solid #e2e8f0;padding:12px 24px;
                 font-size:12px;color:#64748b">
    <div style="max-width:960px;margin:0 auto;
                display:flex;justify-content:space-between">
      <span>Last updated: ${new Date().toISOString()}</span>
      <span>Port ${port}</span>
    </div>
  </footer>

</body>
</html>
```

### Table HTML (when `stories.length > 0`)

```html
<div style="overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;background:#ffffff;
                border-radius:8px;overflow:hidden;
                box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <thead>
      <tr style="background:#1e293b;color:#f1f5f9;font-size:12px;
                 text-transform:uppercase;letter-spacing:0.05em">
        <th style="width:100px;padding:12px 16px;text-align:left;font-weight:600">Story ID</th>
        <th style="padding:12px 16px;text-align:left;font-weight:600">Title</th>
        <th style="width:90px;padding:12px 16px;text-align:left;font-weight:600">Scope</th>
        <th style="width:160px;padding:12px 16px;text-align:left;font-weight:600">Current Phase</th>
        <th style="width:130px;padding:12px 16px;text-align:left;font-weight:600">Status</th>
        <th style="width:100px;padding:12px 16px;text-align:right;font-weight:600">Idle Time</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</div>
```

### Row generation

For each story in the sorted array the generator produces one `<tr>`. The
background alternates: index 0, 2, 4... → `#ffffff`; index 1, 3, 5... →
`#f8fafc`. Error rows always use `#fef2f2`.

```js
// Normal row
`<tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};
            border-bottom:1px solid #e2e8f0"
    onmouseover="this.style.background='#f1f5f9'"
    onmouseout="this.style.background='${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}'">
  <td style="width:100px;padding:12px 16px;font-weight:600">${escHtml(s.story_id)}</td>
  <td style="padding:12px 16px">${escHtml(s.title || '')}</td>
  <td style="width:90px;padding:12px 16px;color:#64748b;font-size:13px">${escHtml(s.scope)}</td>
  <td style="width:160px;padding:12px 16px;font-size:13px">${escHtml(s.phase_label)}</td>
  <td style="width:130px;padding:12px 16px">${badgeHtml(s.status)}</td>
  <td style="width:100px;padding:12px 16px;text-align:right;color:#64748b;
             font-size:13px;white-space:nowrap">${escHtml(s.idle)}</td>
</tr>`

// Error row
`<tr style="background:#fef2f2;border-bottom:1px solid #e2e8f0">
  <td style="width:100px;padding:12px 16px;font-weight:600;font-style:italic;
             color:#dc2626">${escHtml(s.story_id)}</td>
  <td style="padding:12px 16px;color:#dc2626">&#9888; ${escHtml(s.error)}</td>
  <td style="padding:12px 16px;color:#64748b">&mdash;</td>
  <td style="padding:12px 16px;color:#64748b">&mdash;</td>
  <td style="padding:12px 16px;color:#64748b">&mdash;</td>
  <td style="padding:12px 16px;color:#64748b">&mdash;</td>
</tr>`
```

### Badge helper

```js
function badgeHtml(status) {
  const colors = {
    'COMPLETE':    '#16a34a',
    'IN PROGRESS': '#d97706',
    'HALTED':      '#dc2626',
  };
  const bg = colors[status] || '#64748b';
  return `<span style="display:inline-block;padding:3px 10px;border-radius:9999px;
                        font-size:12px;font-weight:600;letter-spacing:0.03em;
                        background:${bg};color:#ffffff;white-space:nowrap">${escHtml(status)}</span>`;
}
```

### HTML-escape helper

Required to prevent XSS from story IDs, titles, or error messages that could
contain `<`, `>`, `&`, `"`, or `'`:

```js
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### Empty state (when `stories.length === 0`)

```html
<div style="text-align:center;padding:64px 24px;color:#64748b">
  <span style="display:block;font-size:48px;margin-bottom:16px">📂</span>
  <p style="font-size:15px;line-height:1.6;margin:0">
    No stories found.<br>
    Run <code style="background:#e2e8f0;padding:2px 6px;
                     border-radius:4px;font-size:13px">keel init &lt;story-id&gt;</code>
    to start.
  </p>
</div>
```

---

## 6. State Reading Logic — `readStories(stateDirPath)`

### Signature

```js
/**
 * Lock-free fleet read (ADR-001 pattern, ADR-003 confirms reuse).
 * @param {string} stateDirPath  Absolute path to .keel/state/
 * @returns {StoryRow[]}         Sorted array, most-recently-updated first.
 *                               Corrupt manifests become error StoryRows.
 */
function readStories(stateDirPath) { ... }
```

### Algorithm

```
1. if (!fs.existsSync(stateDirPath))  → return []

2. entries = fs.readdirSync(stateDirPath, { withFileTypes: true })
   // throws only if stateDirPath itself is unreadable — propagate (server still starts,
   // handler will surface the empty-state page on next request)

3. for each entry:
   a. skip if !entry.isDirectory()
   b. skip if entry.name === '.lock' || entry.name.endsWith('.tmp')
   c. skip if entry.name === '--all'
   d. mf = path.join(stateDirPath, entry.name, 'manifest.json')
   e. if (!fs.existsSync(mf)) → continue   // not a story dir
   f. try {
        const raw = fs.readFileSync(mf, 'utf8');
        const m   = JSON.parse(raw);
        // Enumerate phase files (same regex as cmdStatus line 448)
        const phaseFiles = fs.readdirSync(path.join(stateDirPath, entry.name))
          .filter(f => /^\d{2}-.+\.json$/.test(f));
        const completedCount = phaseFiles.length;
        const expected = m.expected_phases || SCOPES[m.scope] || SCOPES.feature;
        const status = deriveStatus(m, completedCount, expected.length);
        const phase  = m.current_phase;
        const phaseLabel = (phase >= 1 && phase <= 12)
          ? `Phase ${phase} — ${PHASE_NAMES[phase - 1]}`
          : (phase != null ? `Phase ${phase}` : 'unknown');
        const idle = m.updated_at
          ? formatIdle(Date.now() - new Date(m.updated_at).getTime())
          : 'unknown';
        stories.push({
          story_id:     m.story_id || entry.name,
          title:        m.title    || '',
          scope:        m.scope    || 'feature',
          current_phase: phase ?? null,
          status,
          phase_label:  phaseLabel,
          idle,
          updated_at:   m.updated_at || '',
          error:        null,
        });
      } catch (e) {
        stories.push({ story_id: entry.name, error: e.message });
      }

4. Sort: stories with error go last (stable), then sort valid rows by
   updated_at descending.
   Comparator:
     if (a.error && !b.error)  return  1;
     if (!a.error && b.error)  return -1;
     // both valid or both error: sort by updated_at DESC
     return (b.updated_at || '').localeCompare(a.updated_at || '');

5. return stories;
```

### Error handling for missing/malformed manifests

| Condition | Behavior |
|---|---|
| `.keel/state/` does not exist | `readStories` returns `[]`; server starts and serves empty state |
| Sub-dir exists, `manifest.json` absent | `continue` (silent skip, matches ADR-001 B-4) |
| `manifest.json` present, invalid JSON | `try/catch` → error StoryRow with `e.message` |
| `manifest.json` valid JSON but missing fields | Fallback values used (see §4 table); never throws |
| Concurrent write during read | Atomic rename guarantees complete-old or complete-new; if mid-rename yields ENOENT, caught by `try/catch` → error StoryRow (acceptable transient) |

---

## 7. Module: `startDashboard({ port, stateDir })`

### Signature

```js
/**
 * Creates and starts the HTTP server. Writes to stdout/stderr only,
 * never to .keel/state/. Blocks process until killed (Ctrl-C).
 * @param {{ port: number, stateDir: string }} opts
 */
function startDashboard({ port, stateDir }) { ... }
```

### Startup sequence

```js
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
    const stories = readStories(stateDir);
    const html = generateHTML(stories, port);
    res.writeHead(200, {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(html);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    process.stderr.write(
      `Error: port ${port} is already in use. Use --port to specify a different port.\n`
    );
    process.exit(1);
  }
  throw e;
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Dashboard: http://localhost:${port}\n`);
});
```

Note: `server.listen(port, '127.0.0.1', ...)` explicitly binds to loopback
only (see Technical Risks §7.1).

---

## 8. `parsePort(argv)` helper

```js
/**
 * @param {string[]} argv  process.argv slice
 * @returns {number}       Port integer, default 7772
 */
function parsePort(argv) {
  const i = argv.indexOf('--port');
  if (i >= 0 && i + 1 < argv.length) {
    const n = parseInt(argv[i + 1], 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  return 7772;
}
```

---

## 9. `deriveStatus` helper

```js
/**
 * @param {object} manifest
 * @param {number} completedCount   Number of phase output files found.
 * @param {number} expectedCount    Length of expected_phases array.
 * @returns {'HALTED'|'IN PROGRESS'|'COMPLETE'}
 */
function deriveStatus(manifest, completedCount, expectedCount) {
  if (manifest.halted === true) return 'HALTED';
  if (completedCount >= expectedCount) return 'COMPLETE';
  return 'IN PROGRESS';
}
```

---

## 10. `formatIdle` helper

Identical formula to `cmdDescribe` in `keel-state.cjs` (conventions.md 2026-07-14):

```js
function formatIdle(ms) {
  if (ms >= 3_600_000) {
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
```

Called only when `manifest.updated_at` is present (the caller guards the
absent case). If `ms` is negative (system clock skew or future `updated_at`),
the result is `"0m 0s"` — Math.floor of a negative number yields a negative
integer, which will render as e.g. `-1m 0s`. This is acceptable for a
developer tool; a defensive `Math.max(0, ms)` wrapper is recommended.

---

## 11. `bin/keel.js` Changes

### 11.1 ROUTES entry (add after `deploy`)

```js
dashboard(c) {
  run('node', [resolve(__dirname, '../scripts/keel-dashboard.cjs'), '--port', c.port]);
},
```

### 11.2 ctx construction block (add one line after `coverageTarget`)

```js
port: String(flags.port || '7772'),
```

### 11.3 showHelp() additions

In the PIPELINE section, add one row:

```
  --    dashboard        [standalone — starts local HTTP server]
```

In the OPTIONS section, add one line:

```
  --port=<N>               Dashboard port (default: 7772)
```

These are the only three changes to `bin/keel.js`. No other lines change.

---

## 12. Module File Structure (`scripts/keel-dashboard.cjs`)

```
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_NAMES = [ /* 12 entries */ ];

const SCOPES = {
  feature: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  defect:  [1, 5, 6, 7, 8, 10],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePort(argv)  { ... }
function formatIdle(ms)   { ... }
function escHtml(str)     { ... }
function badgeHtml(status){ ... }
function deriveStatus(manifest, completedCount, expectedCount) { ... }

// ─── State reading ────────────────────────────────────────────────────────────

function readStories(stateDirPath) { ... }

// ─── HTML generation ──────────────────────────────────────────────────────────

function generateHTML(stories, port) { ... }

// ─── HTTP server ──────────────────────────────────────────────────────────────

function startDashboard({ port, stateDir }) { ... }

// ─── Entry point ─────────────────────────────────────────────────────────────

function main() {
  const port      = parsePort(process.argv);
  const stateDir  = path.join(process.cwd(), '.keel', 'state');
  startDashboard({ port, stateDir });
}

main();
```

`process.cwd()` is used rather than `__dirname` for `stateDir`, because
`keel-state.cjs` is invoked from the project root (the `run()` helper in
`bin/keel.js` sets `cwd: KEEL_DIR`). This matches the existing `keel-state.cjs`
pattern where `stateDir(id)` is a relative `path.join('.keel', 'state', id)`.

---

## 13. Technical Risks

### 13.1 Server binds to 0.0.0.0 (network exposure)

**Risk:** `server.listen(port)` without an explicit host argument binds to all
interfaces on the development machine. A co-worker on the same LAN could
access the dashboard and read story titles and pipeline phase data.

**Mitigation:** Bind explicitly to `'127.0.0.1'`:
`server.listen(port, '127.0.0.1', callback)`. This is specified in §7 above
and must be implemented exactly — the engineer must not omit the hostname
argument.

**Severity:** Medium (developer tool, no credentials or PII exposed — but
story titles may contain confidential project names).

### 13.2 XSS via manifest content

**Risk:** Story IDs, titles, scope values, or error messages injected into
HTML without escaping could allow a stored-XSS attack if a manifest were
crafted with `<script>` in the title field.

**Mitigation:** All manifest-derived strings are passed through `escHtml()`
before insertion into the template literal. The `escHtml` helper must escape
`&`, `<`, `>`, `"`, `'`. Specified in §5 above.

**Severity:** Low (the manifest files are local, written by the pipeline
engine, not by untrusted users — but defense in depth is cheap here and
required).

### 13.3 Performance — large number of stories

**Risk:** A project with hundreds of stories triggers `fs.readdirSync` +
`JSON.parse` for each story on every GET request (every 30s auto-refresh).

**Mitigation:** For the current scale (< 100 stories typical), synchronous
reads are fine at < 200ms. No caching is implemented in v1.
If this becomes a bottleneck, a future version can add a simple in-memory
cache with a 10s TTL without changing the public interface.

**Target:** p95 response time < 200ms for up to 100 stories.

### 13.4 Port conflict — non-EADDRINUSE errors

**Risk:** `server.on('error')` re-throws errors that are not `EADDRINUSE`.
This produces a stack trace to stderr, which is acceptable but noisy.

**Mitigation:** Acceptable as-is. Future improvement: catch `EACCES` (port
< 1024 on Linux) and emit a human-readable message.

### 13.5 Clock skew producing negative idle time

**Risk:** If `manifest.updated_at` is a future timestamp (clock drift, test
fixture), `Date.now() - new Date(updated_at).getTime()` is negative.
`formatIdle` will produce strings like `"-1m 0s"`.

**Mitigation:** Wrap the `ms` argument: `formatIdle(Math.max(0, Date.now() - ...))`.
Specified in §10 above.

### 13.6 Impact on `bin/keel.js` — reverse-dependency surface

The codegraph (`codegraph.json`) tracks only PHP classes; the JS CLI files
have no graph entries. Manual impact analysis: `bin/keel.js` is the sole
entry point for all Keel CLI sub-commands. Adding a `dashboard` entry to
`ROUTES` and a `port` field to `ctx` is additive only — no existing ROUTES
entry reads `ctx.port`, and no existing test asserts on `ctx` field names.
The `showHelp()` change appends new lines to the help string; no test is
known to assert on help string content verbatim.

**Mitigation:** The engineer should grep for any test that calls `showHelp`
or asserts on `ROUTES` keys before submitting. The test file
`scripts/tests/keel-state.cjs` tests `keel-state.cjs` only; it does not
test `bin/keel.js`.

### 13.7 AC-7 regression guard

**Risk:** A future refactor accidentally touches `keel-state.cjs` while
implementing KEEL-104.

**Mitigation:** AC-7 is structurally enforced by placing all dashboard logic
in a new file. The engineer must confirm via `git diff scripts/keel-state.cjs`
before committing that the file has zero changes.

---

## 14. AC Coverage Map

| AC | Design element |
|---|---|
| AC-1 | `ROUTES.dashboard` in `bin/keel.js`; `startDashboard` stdout: `"Dashboard: http://localhost:<port>\n"` |
| AC-2 | No write endpoints; no `fs.writeFile` / `writeManifest` calls in `keel-dashboard.cjs`; HTTP server is read-only |
| AC-3 | `readStories` reads manifest fields; `PHASE_NAMES` array; `formatIdle` formula; sort by `updated_at` DESC |
| AC-4 | `<meta http-equiv="refresh" content="30">` in HTML head; animated pulse dot indicator |
| AC-5 | `parsePort(argv)` in `keel-dashboard.cjs`; `--port` flag → `ctx.port` in `bin/keel.js`; port shown in footer |
| AC-6 | `readStories` returns `[]` when state dir absent; `generateHTML` renders empty-state div |
| AC-7 | `keel-state.cjs` not modified; confirmed by design: all new logic is in `keel-dashboard.cjs` + minimal `bin/keel.js` additions |
