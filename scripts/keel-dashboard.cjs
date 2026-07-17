#!/usr/bin/env node
/**
 * keel-dashboard.cjs — local HTTP server that renders a read-only pipeline
 * status dashboard for all Keel stories found under .keel/state/.
 *
 * Why a separate CJS file: bin/keel.js is ESM; the dashboard adds 300+ lines
 * of HTML generation + HTTP server lifecycle that must not conflate with the
 * CLI dispatcher. CJS matches keel-state.cjs convention, is directly
 * require()-able from the CJS test harness, and keeps AC-7 structurally
 * enforced (keel-state.cjs is never touched). — ADR-003.
 *
 * Zero npm dependencies. Node >= 16. Run from the repository root.
 *
 * Usage:
 *   node scripts/keel-dashboard.cjs [--port N]   (default port: 7772)
 */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────

// Display labels for phases 1-10. Parallel to AGENTS in keel-state.cjs but
// NOT shared — sharing would require modifying keel-state.cjs, violating AC-7.
const PHASE_NAMES = [
  'Product Owner',      // phase 1
  'Business Analyst',   // phase 2
  'UI Designer',        // phase 3
  'Solution Architect', // phase 4
  'Software Engineer',  // phase 5
  'QA Engineer',        // phase 6
  'E2E Engineer',       // phase 7
  'Security Engineer',  // phase 8
  'Technical Writer',   // phase 9
  'Release Manager',    // phase 10
];

// Mirrors keel-state.cjs SCOPES — duplicated intentionally to avoid touching
// that file (AC-7). Keep in sync manually on scope additions.
const SCOPES = {
  feature: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  defect:  [1, 5, 6, 8],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts --port N from process.argv. Returns integer, default 7772.
 * @param {string[]} argv
 * @returns {number}
 */
function parsePort(argv) {
  const i = argv.indexOf('--port');
  if (i >= 0 && i + 1 < argv.length) {
    const n = parseInt(argv[i + 1], 10);
    if (!isNaN(n) && n > 0 && n < 65536) return n;
  }
  return 7772;
}

/**
 * Formats elapsed milliseconds as a human-readable idle string.
 * Convention (conventions.md 2026-07-14): Xh Ym when >= 60 min; Xm Ys otherwise.
 * Caller must guard absent updated_at (returns "unknown" for falsy input).
 * Math.max(0, ms) prevents negative display strings from clock skew.
 * @param {number} ms  Elapsed milliseconds (non-negative).
 * @returns {string}
 */
function formatIdle(ms) {
  const safe = Math.max(0, ms);
  if (safe >= 3_600_000) {
    return `${Math.floor(safe / 3600000)}h ${Math.floor((safe % 3600000) / 60000)}m`;
  }
  return `${Math.floor(safe / 60000)}m ${Math.floor((safe % 60000) / 1000)}s`;
}

/**
 * Computes idle time from an ISO 8601 timestamp string.
 * Returns "unknown" if updatedAt is falsy.
 * @param {string|null|undefined} updatedAt
 * @returns {string}
 */
function idleTime(updatedAt) {
  if (!updatedAt) return 'unknown';
  return formatIdle(Date.now() - new Date(updatedAt).getTime());
}

/**
 * HTML-escapes a string to prevent XSS from manifest-sourced content.
 * Escapes: & < > " '
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Loopback-literal Host allowlist (ADR-004, KEEL-105 DNS-rebinding guard).
// Anchored — suffix domains (localhost.evil.com), userinfo (@), trailing dot,
// unbracketed ::1, expanded IPv6, empty/alpha/extra-colon ports, whitespace
// all fail closed. Deliberately NO DNS resolution and NO IP canonicalization
// (127.0.0.2, 0x7f.0.0.1 reject): browsers send these literal forms, and
// canonicalizing would widen the attack surface (ADR-004 D-2).
const ALLOWED_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

/**
 * Fail-closed Host-header allowlist predicate.
 * Allows only loopback literals — localhost, 127.0.0.1, [::1] — with an
 * optional 1-5-digit port suffix, case-insensitive. Any 1-5-digit port is
 * accepted (syntax-only): the rebinding vector lives entirely in the host
 * part, and the client already connected to the real bound port (ADR-004).
 * Non-string input (e.g. undefined from a missing header) returns false.
 * @param {*} host  Raw Host header value (req.headers.host).
 * @returns {boolean}
 */
function isAllowedHost(host) {
  return typeof host === 'string' && ALLOWED_HOST_RE.test(host.toLowerCase());
}

/**
 * Renders a colored status badge as an inline HTML span.
 * Colors: COMPLETE=#16a34a HALTED=#dc2626 IN PROGRESS=#d97706
 * @param {string} status
 * @returns {string}
 */
function badgeHtml(status) {
  const colors = {
    'COMPLETE':    '#16a34a',
    'IN PROGRESS': '#d97706',
    'HALTED':      '#dc2626',
  };
  const bg = colors[status] || '#64748b';
  return `<span style="display:inline-block;padding:3px 10px;border-radius:9999px;` +
    `font-size:12px;font-weight:600;letter-spacing:0.03em;` +
    `background:${bg};color:#ffffff;white-space:nowrap">${escHtml(status)}</span>`;
}

/**
 * Derives story status from manifest state.
 * @param {object} manifest
 * @param {number} completedCount  Number of phase output files found.
 * @param {number} expectedCount   Length of expected_phases array.
 * @returns {'HALTED'|'IN PROGRESS'|'COMPLETE'}
 */
function deriveStatus(manifest, completedCount, expectedCount) {
  if (manifest.halted === true) return 'HALTED';
  if (completedCount >= expectedCount) return 'COMPLETE';
  return 'IN PROGRESS';
}

// ─── State reading ────────────────────────────────────────────────────────────

/**
 * Lock-free fleet read (ADR-001 / ADR-003 pattern).
 * Reads every story manifest under stateDirPath. Corrupt manifests become
 * error StoryRows (never crash the caller). Returns sorted array:
 * valid rows sorted by updated_at DESC, error rows sorted last.
 * @param {string} stateDirPath  Absolute path to .keel/state/
 * @returns {Array}              StoryRow[] — see design §5 for shape.
 */
function readStories(stateDirPath) {
  if (!fs.existsSync(stateDirPath)) return [];

  let entries;
  try {
    entries = fs.readdirSync(stateDirPath, { withFileTypes: true });
  } catch (e) {
    // stateDirPath itself is unreadable — surface as empty (server still starts)
    return [];
  }

  const stories = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    // Skip lock dirs and temp artifacts — same guards as cmdStatusAll in keel-state.cjs
    if (ent.name === '.lock' || ent.name.endsWith('.tmp')) continue;
    if (ent.name === '--all') continue;

    const mf = path.join(stateDirPath, ent.name, 'manifest.json');
    if (!fs.existsSync(mf)) continue; // not a story dir (no manifest)

    try {
      const raw = fs.readFileSync(mf, 'utf8');
      const m   = JSON.parse(raw);

      // Count completed phase output files (same regex as cmdStatus in keel-state.cjs)
      const storyDir    = path.join(stateDirPath, ent.name);
      const phaseFiles  = fs.readdirSync(storyDir).filter((f) => /^\d{2}-.+\.json$/.test(f));
      const completedCount = phaseFiles.length;

      const expected     = m.expected_phases || SCOPES[m.scope] || SCOPES.feature;
      const status       = deriveStatus(m, completedCount, expected.length);
      const phase        = m.current_phase ?? null;
      const phaseLabel   = (phase >= 1 && phase <= 12)
        ? `Phase ${phase} — ${PHASE_NAMES[phase - 1]}`
        : (phase != null ? `Phase ${phase}` : 'unknown');
      const idle         = idleTime(m.updated_at || null);

      stories.push({
        story_id:      m.story_id    || ent.name,
        title:         m.title       || '',
        scope:         m.scope       || 'feature',
        current_phase: phase,
        status,
        phase_label:   phaseLabel,
        idle,
        updated_at:    m.updated_at  || '',
        error:         null,
      });
    } catch (e) {
      // Malformed manifest — skip-and-mark, never abort the sweep
      stories.push({ story_id: ent.name, error: e.message });
    }
  }

  // Valid rows sorted by updated_at DESC (ISO 8601 lexicographic == chronological).
  // Error rows sorted last so operators see healthy stories first.
  stories.sort((a, b) => {
    if (a.error && !b.error)  return  1;
    if (!a.error && b.error)  return -1;
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });

  return stories;
}

// ─── HTML generation ──────────────────────────────────────────────────────────

/**
 * Generates a complete UTF-8 HTML5 document for the dashboard page.
 * Pure function — no I/O, no side effects. Directly testable.
 * @param {Array}  stories  Sorted StoryRow array from readStories().
 * @param {number} port     Listening port (shown in footer).
 * @returns {string}        Full HTML5 string.
 */
function generateHTML(stories, port) {
  const now = new Date().toISOString();

  // Build story count subtitle
  const storyCount  = stories.length;
  const storyWord   = storyCount === 1 ? 'story' : 'stories';
  const subtitle    = `Read-only view &middot; ${storyCount} ${storyWord}`;

  // Build table body or empty state
  let bodyContent;
  if (storyCount === 0) {
    bodyContent = `
      <div style="text-align:center;padding:64px 24px;color:#64748b;` +
        `background:#ffffff;border:1px solid #e2e8f0;border-radius:8px">
        <span style="font-size:48px;display:block;margin-bottom:16px;line-height:1">&#128194;</span>
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#475569;line-height:1.6">` +
          `No stories found.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b">` +
          `Run <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;` +
          `font-size:13px;font-family:'SF Mono','Cascadia Code','Fira Code',monospace;color:#0f172a">` +
          `keel init &lt;story-id&gt;</code> to start.</p>
      </div>`;
  } else {
    const rows = stories.map((s, idx) => {
      if (s.error) {
        // Error row: malformed manifest
        return `<tr style="background:#fef2f2;border-bottom:1px solid #e2e8f0">` +
          `<td style="width:100px;padding:12px 16px;font-weight:600;font-style:italic;` +
            `color:#dc2626;white-space:nowrap">${escHtml(s.story_id)}</td>` +
          `<td style="padding:12px 16px;color:#dc2626">&#9888; ${escHtml(s.error)}</td>` +
          `<td style="padding:12px 16px;color:#64748b">&mdash;</td>` +
          `<td style="padding:12px 16px;color:#64748b">&mdash;</td>` +
          `<td style="padding:12px 16px;color:#64748b">&mdash;</td>` +
          `<td style="padding:12px 16px;text-align:right;color:#64748b">&mdash;</td>` +
          `</tr>`;
      }
      // Normal row — alternating background, hover via inline event handlers
      const rowBg  = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<tr style="background:${rowBg};border-bottom:1px solid #e2e8f0"` +
        ` onmouseover="this.style.background='#f1f5f9'"` +
        ` onmouseout="this.style.background='${rowBg}'"` +
        `>` +
        `<td style="width:100px;padding:12px 16px;font-weight:600;white-space:nowrap">` +
          `${escHtml(s.story_id)}</td>` +
        `<td style="padding:12px 16px">${escHtml(s.title || '')}</td>` +
        `<td style="width:90px;padding:12px 16px;color:#64748b;font-size:13px">` +
          `${escHtml(s.scope)}</td>` +
        `<td style="width:160px;padding:12px 16px;font-size:13px;white-space:nowrap">` +
          `${escHtml(s.phase_label)}</td>` +
        `<td style="width:130px;padding:12px 16px">${badgeHtml(s.status)}</td>` +
        `<td style="width:100px;padding:12px 16px;text-align:right;color:#64748b;` +
          `font-size:13px;white-space:nowrap">${escHtml(s.idle)}</td>` +
        `</tr>`;
    }).join('\n');

    bodyContent = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;background:#ffffff;` +
          `border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:14px">
          <thead>
            <tr style="background:#1e293b;color:#f1f5f9;font-size:12px;` +
              `text-transform:uppercase;letter-spacing:0.05em">
              <th style="width:100px;padding:12px 16px;text-align:left;font-weight:600;` +
                `white-space:nowrap">Story ID</th>
              <th style="padding:12px 16px;text-align:left;font-weight:600">Title</th>
              <th style="width:90px;padding:12px 16px;text-align:left;font-weight:600">Scope</th>
              <th style="width:160px;padding:12px 16px;text-align:left;font-weight:600;` +
                `white-space:nowrap">Current Phase</th>
              <th style="width:130px;padding:12px 16px;text-align:left;font-weight:600">Status</th>
              <th style="width:100px;padding:12px 16px;text-align:right;font-weight:600;` +
                `white-space:nowrap">Idle Time</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
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
<body style="margin:0;padding:0;background:#f8fafc;` +
  `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;` +
  `color:#0f172a;min-height:100vh;display:flex;flex-direction:column">

  <header style="background:#ffffff;border-bottom:1px solid #e2e8f0;padding:24px 24px 16px">
    <div style="max-width:960px;margin:0 auto;display:flex;` +
      `justify-content:space-between;align-items:flex-end">
      <div>
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a">` +
          `Keel Pipeline Dashboard</h1>
        <p style="margin:0;font-size:14px;color:#64748b">${subtitle}</p>
      </div>
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;` +
        `color:#16a34a;font-weight:500;white-space:nowrap;padding-bottom:2px">
        <span style="width:8px;height:8px;border-radius:50%;background:#16a34a;` +
          `display:inline-block;animation:pulse 2s infinite"></span>
        Live &middot; refreshes every 30s
      </span>
    </div>
  </header>

  <main style="flex:1;max-width:960px;width:100%;margin:0 auto;` +
    `padding:24px;box-sizing:border-box">
${bodyContent}
  </main>

  <footer style="border-top:1px solid #e2e8f0;background:#ffffff;padding:12px 24px">
    <div style="max-width:960px;margin:0 auto;display:flex;` +
      `justify-content:space-between;align-items:center;font-size:12px;color:#64748b">
      <span>Last updated: ${escHtml(now)}</span>
      <span>Port ${port}</span>
    </div>
  </footer>

</body>
</html>`;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

/**
 * Writes a static plain-text rejection response (400/403). The body is
 * always a constant string — never request data (Host value, URL, method),
 * so there is no reflected-XSS / log-injection surface (ADR-004 D-3).
 * nosniff for parity with the 200 path; no-store so no intermediary ever
 * caches a rejection. Performs zero fs I/O (zero-fs-writes invariant).
 * @param {import('http').ServerResponse} res
 * @param {number} status  400 or 403.
 * @param {string} body    Constant reason phrase.
 */
function rejectRequest(res, status, body) {
  res.writeHead(status, {
    'Content-Type':           'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control':          'no-store',
  });
  res.end(body);
}

/**
 * Creates and starts the HTTP server. Writes to stdout/stderr only —
 * never to .keel/state/. Blocks the process until killed (Ctrl-C).
 * Binds to 127.0.0.1 (loopback only) — security requirement (ADR-003 §13.1):
 * story metadata must not be reachable from the LAN without explicit intent.
 * @param {{ port: number, stateDir: string }} opts
 */
function startDashboard({ port, stateDir }) {
  const server = http.createServer((req, res) => {
    // Host-header allowlist guard (ADR-004) — MUST stay the first statements
    // so readStories()/generateHTML() are structurally unreachable on
    // rejection and the 404 branch is reachable only with a valid Host.
    const host = req.headers.host; // Node keeps the FIRST value on duplicates
    if (host === undefined) {
      // RFC 9112 §3.2: a Host-less request is malformed → 400. Node's
      // HTTP/1.1 parser already 400s these before the handler runs; this
      // branch covers HTTP/1.0 / raw-socket clients so both layers present
      // one consistent contract (ADR-004 D-1).
      rejectRequest(res, 400, 'Bad Request');
      return;
    }
    if (!isAllowedHost(host)) {
      rejectRequest(res, 403, 'Forbidden');
      return;
    }
    if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
      const stories = readStories(stateDir);
      const html    = generateHTML(stories, port);
      res.writeHead(200, {
        'Content-Type':          'text/html; charset=utf-8',
        'Cache-Control':         'no-store',
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
    // Non-EADDRINUSE errors surface as unhandled exceptions (standard Node.js)
    throw e;
  });

  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Dashboard: http://localhost:${port}\n`);
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function main() {
  const port     = parsePort(process.argv);
  // process.cwd() is the project root — keel-state.cjs uses relative paths
  // from the same root, so we match that convention.
  const stateDir = path.join(process.cwd(), '.keel', 'state');
  startDashboard({ port, stateDir });
}

main();

// ─── Exports (for CJS test harness) ──────────────────────────────────────────

module.exports = {
  escHtml,
  isAllowedHost,
  idleTime,
  formatIdle,
  deriveStatus,
  readStories,
  generateHTML,
  startDashboard,
  parsePort,
  PHASE_NAMES,
  SCOPES,
};
