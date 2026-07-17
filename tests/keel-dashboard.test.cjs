#!/usr/bin/env node
/**
 * keel-dashboard.test.cjs
 *
 * Test suite for scripts/keel-dashboard.cjs (KEEL-104).
 *
 * Covers every acceptance criterion:
 *   AC-1  startDashboard() / parsePort() — default port 7772 in stdout
 *   AC-2  generateHTML(stories, port) — story data rendered: ID, title, scope,
 *          phase label, status badge, idle time
 *   AC-3  readStories(stateDir) — sorted by updated_at DESC; error rows last
 *   AC-4  generateHTML() — includes meta http-equiv="refresh" content="30"
 *   AC-5  parsePort(['--port', '8080']) — returns 8080 (port override)
 *   AC-6  generateHTML([]) / readStories() on empty dir — "No stories found."
 *   AC-7  node scripts/keel-state.cjs status --all → valid JSON array (regression)
 *
 * Run:  node tests/keel-dashboard.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 *
 * Style: zero-dependency assert harness identical to keel-state-describe.test.cjs.
 */
'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Module under test ────────────────────────────────────────────────────────

// require() runs main() at the bottom of keel-dashboard.cjs, which calls
// startDashboard() and binds a port. We must suppress that. We do this by
// replacing process.argv so parsePort returns a port we never actually listen
// on. However, the simplest safe approach: stub server.listen not to bind.
// Actually keel-dashboard.cjs calls main() unconditionally at module load.
// To avoid EADDRINUSE in a loop or stray server, we patch http.createServer
// before require so the listen() call is a no-op.
const http = require('http');
const _realCreateServer = http.createServer.bind(http);
http.createServer = function(handler) {
  const srv = _realCreateServer(handler);
  const _realListen = srv.listen.bind(srv);
  srv.listen = function() {
    // no-op: do not actually bind the port during test load
    return srv;
  };
  return srv;
};

const DASHBOARD = path.join(__dirname, '..', 'scripts', 'keel-dashboard.cjs');
const {
  escHtml,
  idleTime,
  formatIdle,
  deriveStatus,
  readStories,
  generateHTML,
  startDashboard,
  parsePort,
  PHASE_NAMES,
  SCOPES,
} = require(DASHBOARD);

// Restore http.createServer for any later use (not needed by tests but clean)
http.createServer = _realCreateServer;

// ─── Harness ──────────────────────────────────────────────────────────────────

const KEEL_STATE = path.join(__dirname, '..', 'scripts', 'keel-state.cjs');
const results    = [];

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || 'assertion failed') });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

/** Create a fresh tmp dir with the given label. */
function makeTmpDir(label) {
  const dir = path.join(
    os.tmpdir(),
    `keel-dash-${label}-${process.pid}-${Date.now()}`
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Build a minimal .keel/state/<storyId>/ directory tree inside tmpDir.
 * Returns the stateDir path.
 */
function makeStateDir(tmpDir) {
  const sd = path.join(tmpDir, '.keel', 'state');
  fs.mkdirSync(sd, { recursive: true });
  return sd;
}

/**
 * Write a manifest.json for a story under stateDir.
 * opts: { story_id, title, scope, current_phase, updated_at, halted }
 */
function writeManifest(stateDir, opts) {
  const storyDir = path.join(stateDir, opts.story_id);
  fs.mkdirSync(storyDir, { recursive: true });
  const manifest = {
    story_id:       opts.story_id,
    title:          opts.title          || 'Untitled',
    scope:          opts.scope          || 'feature',
    current_phase:  opts.current_phase  ?? 1,
    halted:         opts.halted         ?? false,
    updated_at:     opts.updated_at     || new Date().toISOString(),
    expected_phases: opts.expected_phases || SCOPES[opts.scope || 'feature'],
  };
  fs.writeFileSync(
    path.join(storyDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  return storyDir;
}

/** Spawn keel-state.cjs in the given cwd and return { code, stdout, stderr }. */
function spawnEngine(cwd, ...args) {
  const r = spawnSync(process.execPath, [KEEL_STATE, ...args], {
    cwd, encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// ─── AC-1: parsePort() default — 7772 ─────────────────────────────────────────

{
  const port = parsePort([]);

  assert(
    'AC-1 parsePort: default port is 7772 when no --port flag given',
    port === 7772,
    `got ${port}`
  );
}

{
  const port = parsePort(['node', 'keel-dashboard.cjs']);

  assert(
    'AC-1 parsePort: default port is 7772 with non-port argv',
    port === 7772,
    `got ${port}`
  );
}

// ─── AC-1: startDashboard stdout message ──────────────────────────────────────
// We test the startup message by capturing what process.stdout.write would emit.
// We do this at unit level by temporarily monkey-patching process.stdout.write
// while calling startDashboard with a no-op listen. This avoids binding a real
// port and makes the test fast and side-effect-free.

{
  const captured = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => { captured.push(String(chunk)); return true; };

  // Build a server stub that fires the listening callback immediately
  const serverStub = {
    on: () => serverStub,
    listen: (_port, _host, cb) => { if (cb) cb(); return serverStub; },
  };
  const savedCreate = http.createServer;
  http.createServer = () => serverStub;

  const tmpDir   = makeTmpDir('ac1-stdout');
  const stateDir = makeStateDir(tmpDir);
  startDashboard({ port: 7772, stateDir });

  http.createServer = savedCreate;
  process.stdout.write = original;

  const combined = captured.join('');

  assert(
    'AC-1 startDashboard: stdout includes "Dashboard: http://localhost:7772"',
    combined.includes('Dashboard: http://localhost:7772'),
    `captured stdout: "${combined}"`
  );
}

// ─── AC-5: parsePort() port override — 8080 ───────────────────────────────────

{
  const port = parsePort(['node', 'keel-dashboard.cjs', '--port', '8080']);

  assert(
    'AC-5 parsePort: --port 8080 returns 8080',
    port === 8080,
    `got ${port}`
  );
}

{
  const port = parsePort(['--port', '9000']);

  assert(
    'AC-5 parsePort: --port 9000 returns 9000',
    port === 9000,
    `got ${port}`
  );
}

{
  // Invalid port value (NaN) falls back to default
  const port = parsePort(['--port', 'abc']);

  assert(
    'AC-5 parsePort: non-numeric --port value falls back to 7772',
    port === 7772,
    `got ${port}`
  );
}

{
  // Port 0 is invalid (<1), falls back to default
  const port = parsePort(['--port', '0']);

  assert(
    'AC-5 parsePort: port 0 (invalid) falls back to 7772',
    port === 7772,
    `got ${port}`
  );
}

// AC-5: startDashboard with custom port prints correct URL
{
  const captured = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => { captured.push(String(chunk)); return true; };

  const serverStub = {
    on: () => serverStub,
    listen: (_port, _host, cb) => { if (cb) cb(); return serverStub; },
  };
  const savedCreate = http.createServer;
  http.createServer = () => serverStub;

  const tmpDir   = makeTmpDir('ac5-port');
  const stateDir = makeStateDir(tmpDir);
  startDashboard({ port: 8080, stateDir });

  http.createServer = savedCreate;
  process.stdout.write = original;

  const combined = captured.join('');

  assert(
    'AC-5 startDashboard: stdout includes "Dashboard: http://localhost:8080" for port 8080',
    combined.includes('Dashboard: http://localhost:8080'),
    `captured stdout: "${combined}"`
  );
}

// ─── AC-4: generateHTML includes meta http-equiv="refresh" content="30" ───────

{
  const html = generateHTML([], 7772);

  assert(
    'AC-4 generateHTML: includes <meta http-equiv="refresh" content="30">',
    html.includes('http-equiv="refresh"') && html.includes('content="30"'),
    `meta refresh not found in head`
  );
}

{
  // Also valid for non-empty story list
  const story = {
    story_id:     'KEEL-104',
    title:        'Dashboard story',
    scope:        'feature',
    current_phase: 5,
    status:       'IN PROGRESS',
    phase_label:  'Phase 5 — Software Engineer',
    idle:         '3m 10s',
    updated_at:   new Date().toISOString(),
    error:        null,
  };
  const html = generateHTML([story], 7772);

  assert(
    'AC-4 generateHTML with stories: still includes meta refresh tag',
    html.includes('http-equiv="refresh"') && html.includes('content="30"'),
    `meta refresh not found when stories present`
  );
}

// ─── AC-2: generateHTML renders story data ────────────────────────────────────

{
  const story = {
    story_id:     'KEEL-104',
    title:        'Add pipeline status web dashboard',
    scope:        'feature',
    current_phase: 5,
    status:       'IN PROGRESS',
    phase_label:  'Phase 5 — Software Engineer',
    idle:         '7m 42s',
    updated_at:   new Date().toISOString(),
    error:        null,
  };
  const html = generateHTML([story], 7772);

  assert(
    'AC-2 generateHTML: story ID appears in output',
    html.includes('KEEL-104'),
    `story_id "KEEL-104" not found in HTML`
  );

  assert(
    'AC-2 generateHTML: story title appears in output',
    html.includes('Add pipeline status web dashboard'),
    `title not found in HTML`
  );

  assert(
    'AC-2 generateHTML: scope appears in output',
    html.includes('feature'),
    `scope "feature" not found in HTML`
  );

  assert(
    'AC-2 generateHTML: phase label appears in output',
    html.includes('Phase 5') && html.includes('Software Engineer'),
    `phase label not found in HTML`
  );

  assert(
    'AC-2 generateHTML: status "IN PROGRESS" appears in output',
    html.includes('IN PROGRESS'),
    `status badge not found in HTML`
  );

  assert(
    'AC-2 generateHTML: idle time appears in output',
    html.includes('7m 42s'),
    `idle time "7m 42s" not found in HTML`
  );
}

// AC-2: XSS — malicious title is HTML-escaped
{
  const story = {
    story_id:     'XSS-1',
    title:        '<script>alert("xss")</script>',
    scope:        'feature',
    current_phase: 1,
    status:       'IN PROGRESS',
    phase_label:  'Phase 1 — Product Owner',
    idle:         '0m 5s',
    updated_at:   new Date().toISOString(),
    error:        null,
  };
  const html = generateHTML([story], 7772);

  assert(
    'AC-2 generateHTML: raw <script> tag is NOT present (XSS escaping)',
    !html.includes('<script>alert'),
    `raw <script> found — XSS not escaped`
  );

  assert(
    'AC-2 generateHTML: malicious title is HTML-escaped in output',
    html.includes('&lt;script&gt;'),
    `escaped title not found in HTML`
  );
}

// AC-2: HALTED and COMPLETE status badges
{
  const stories = [
    {
      story_id: 'DONE-1', title: 'Done story', scope: 'defect',
      current_phase: 6, status: 'COMPLETE',
      phase_label: 'Phase 6 — QA Engineer', idle: '1h 2m',
      updated_at: new Date().toISOString(), error: null,
    },
    {
      story_id: 'HALT-1', title: 'Halted story', scope: 'feature',
      current_phase: 3, status: 'HALTED',
      phase_label: 'Phase 3 — UI Designer', idle: '5m 0s',
      updated_at: new Date().toISOString(), error: null,
    },
  ];
  const html = generateHTML(stories, 7772);

  assert(
    'AC-2 generateHTML: COMPLETE status badge present for finished story',
    html.includes('COMPLETE'),
    `COMPLETE badge not found`
  );

  assert(
    'AC-2 generateHTML: HALTED status badge present for halted story',
    html.includes('HALTED'),
    `HALTED badge not found`
  );
}

// AC-2: port appears in page footer
{
  const html = generateHTML([], 9999);

  assert(
    'AC-2 generateHTML: port number appears in page footer',
    html.includes('Port 9999') || html.includes('9999'),
    `port 9999 not found in generated HTML`
  );
}

// ─── AC-6: generateHTML([]) — empty state message ─────────────────────────────

{
  const html = generateHTML([], 7772);

  assert(
    'AC-6 generateHTML([]): contains "No stories found." message',
    html.includes('No stories found.'),
    `empty-state message not found in HTML`
  );

  assert(
    'AC-6 generateHTML([]): contains "keel init" instruction',
    html.includes('keel init'),
    `"keel init" instruction not found in empty-state HTML`
  );
}

// ─── AC-6: readStories() on missing directory returns [] ──────────────────────

{
  const missingPath = path.join(os.tmpdir(), `keel-dash-nonexistent-${Date.now()}`);

  const stories = readStories(missingPath);

  assert(
    'AC-6 readStories: returns [] when stateDir does not exist',
    Array.isArray(stories) && stories.length === 0,
    `expected [], got ${JSON.stringify(stories)}`
  );
}

// AC-6: readStories() on empty stateDir (no story sub-dirs) returns []
{
  const tmpDir   = makeTmpDir('ac6-empty');
  const stateDir = makeStateDir(tmpDir);

  const stories = readStories(stateDir);

  assert(
    'AC-6 readStories: returns [] for stateDir with no story subdirectories',
    Array.isArray(stories) && stories.length === 0,
    `expected [], got length ${stories.length}`
  );
}

// ─── AC-3: readStories() sorts by updated_at DESC ─────────────────────────────

{
  const tmpDir   = makeTmpDir('ac3-sort');
  const stateDir = makeStateDir(tmpDir);

  // Write three stories with distinct, controlled updated_at timestamps
  writeManifest(stateDir, {
    story_id:      'STORY-OLD',
    title:         'Oldest story',
    updated_at:    '2026-07-10T00:00:00.000Z',
    current_phase: 2,
  });
  writeManifest(stateDir, {
    story_id:      'STORY-NEW',
    title:         'Newest story',
    updated_at:    '2026-07-14T12:00:00.000Z',
    current_phase: 5,
  });
  writeManifest(stateDir, {
    story_id:      'STORY-MID',
    title:         'Middle story',
    updated_at:    '2026-07-12T06:00:00.000Z',
    current_phase: 3,
  });

  const stories = readStories(stateDir);

  assert(
    'AC-3 readStories: returns all three stories',
    stories.length === 3,
    `expected 3 stories, got ${stories.length}`
  );

  assert(
    'AC-3 readStories: first story has most recent updated_at (STORY-NEW)',
    stories[0] && stories[0].story_id === 'STORY-NEW',
    `first story is "${stories[0] && stories[0].story_id}", expected "STORY-NEW"`
  );

  assert(
    'AC-3 readStories: second story is STORY-MID',
    stories[1] && stories[1].story_id === 'STORY-MID',
    `second story is "${stories[1] && stories[1].story_id}", expected "STORY-MID"`
  );

  assert(
    'AC-3 readStories: last story has oldest updated_at (STORY-OLD)',
    stories[2] && stories[2].story_id === 'STORY-OLD',
    `last story is "${stories[2] && stories[2].story_id}", expected "STORY-OLD"`
  );
}

// AC-3: error rows (malformed manifest) sorted last
{
  const tmpDir   = makeTmpDir('ac3-err-sort');
  const stateDir = makeStateDir(tmpDir);

  // Valid story with an older timestamp
  writeManifest(stateDir, {
    story_id:   'VALID-1',
    title:      'Valid story',
    updated_at: '2026-07-10T00:00:00.000Z',
    current_phase: 1,
  });

  // Malformed manifest — JSON parse will fail
  const badDir = path.join(stateDir, 'BAD-STORY');
  fs.mkdirSync(badDir, { recursive: true });
  fs.writeFileSync(path.join(badDir, 'manifest.json'), '{ this is not valid JSON }');

  const stories = readStories(stateDir);

  assert(
    'AC-3 readStories: error row is sorted last (after valid rows)',
    stories.length === 2 &&
    stories[stories.length - 1] &&
    stories[stories.length - 1].error !== null,
    `last story error field: ${stories[stories.length - 1] && stories[stories.length - 1].error}`
  );

  assert(
    'AC-3 readStories: valid story comes before error row',
    stories[0] && stories[0].story_id === 'VALID-1' && stories[0].error === null,
    `first story: ${JSON.stringify(stories[0])}`
  );
}

// AC-3: readStories() returns correct story row fields
{
  const tmpDir   = makeTmpDir('ac3-fields');
  const stateDir = makeStateDir(tmpDir);

  writeManifest(stateDir, {
    story_id:      'SHAPE-1',
    title:         'Shape test story',
    scope:         'feature',
    current_phase: 6,
    updated_at:    '2026-07-14T10:00:00.000Z',
  });

  const stories = readStories(stateDir);

  assert(
    'AC-3 readStories: story row has story_id field',
    stories.length > 0 && stories[0].story_id === 'SHAPE-1',
    `story_id: ${stories[0] && stories[0].story_id}`
  );

  assert(
    'AC-3 readStories: story row has title field',
    stories.length > 0 && stories[0].title === 'Shape test story',
    `title: ${stories[0] && stories[0].title}`
  );

  assert(
    'AC-3 readStories: story row has phase_label derived from PHASE_NAMES',
    stories.length > 0 && stories[0].phase_label &&
    stories[0].phase_label.includes('QA Engineer'),
    `phase_label: ${stories[0] && stories[0].phase_label}`
  );

  assert(
    'AC-3 readStories: story row has status field',
    stories.length > 0 && ['IN PROGRESS', 'COMPLETE', 'HALTED'].includes(stories[0].status),
    `status: ${stories[0] && stories[0].status}`
  );

  assert(
    'AC-3 readStories: story row has idle field (string)',
    stories.length > 0 && typeof stories[0].idle === 'string' && stories[0].idle.length > 0,
    `idle: ${stories[0] && stories[0].idle}`
  );
}

// AC-3: readStories() skips entries without manifest.json
{
  const tmpDir   = makeTmpDir('ac3-no-manifest');
  const stateDir = makeStateDir(tmpDir);

  // Create a subdirectory with no manifest.json
  fs.mkdirSync(path.join(stateDir, 'NO-MANIFEST-DIR'), { recursive: true });

  // Create a valid story
  writeManifest(stateDir, {
    story_id:   'PRESENT-1',
    title:      'Present story',
    updated_at: '2026-07-14T08:00:00.000Z',
  });

  const stories = readStories(stateDir);

  assert(
    'AC-3 readStories: skips subdirectory without manifest.json',
    stories.length === 1 && stories[0].story_id === 'PRESENT-1',
    `stories count: ${stories.length}, first: ${stories[0] && stories[0].story_id}`
  );
}

// AC-3: readStories() skips .lock and .tmp directories
{
  const tmpDir   = makeTmpDir('ac3-skip-dirs');
  const stateDir = makeStateDir(tmpDir);

  // .lock dir
  const lockDir = path.join(stateDir, '.lock');
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(path.join(lockDir, 'manifest.json'), JSON.stringify({ story_id: '.lock' }));

  // .tmp dir
  const tmpArtDir = path.join(stateDir, 'STORY-1.tmp');
  fs.mkdirSync(tmpArtDir, { recursive: true });
  fs.writeFileSync(path.join(tmpArtDir, 'manifest.json'), JSON.stringify({ story_id: 'tmp-story' }));

  // Valid story
  writeManifest(stateDir, {
    story_id:   'CLEAN-1',
    updated_at: '2026-07-14T09:00:00.000Z',
  });

  const stories = readStories(stateDir);

  assert(
    'AC-3 readStories: skips .lock directory',
    stories.every((s) => s.story_id !== '.lock'),
    `.lock story found in results`
  );

  assert(
    'AC-3 readStories: skips .tmp directories',
    stories.every((s) => s.story_id !== 'tmp-story'),
    `.tmp story found in results`
  );

  assert(
    'AC-3 readStories: returns only the valid story after skipping artifacts',
    stories.length === 1 && stories[0].story_id === 'CLEAN-1',
    `stories: ${JSON.stringify(stories.map((s) => s.story_id))}`
  );
}

// ─── AC-3: deriveStatus logic ─────────────────────────────────────────────────

{
  const halted = deriveStatus({ halted: true }, 3, 6);

  assert(
    'AC-3 deriveStatus: returns HALTED when manifest.halted is true',
    halted === 'HALTED',
    `got "${halted}"`
  );
}

{
  const complete = deriveStatus({ halted: false }, 6, 6);

  assert(
    'AC-3 deriveStatus: returns COMPLETE when completedCount >= expectedCount',
    complete === 'COMPLETE',
    `got "${complete}"`
  );
}

{
  const inProgress = deriveStatus({ halted: false }, 3, 12);

  assert(
    'AC-3 deriveStatus: returns IN PROGRESS when not halted and not all phases done',
    inProgress === 'IN PROGRESS',
    `got "${inProgress}"`
  );
}

// ─── formatIdle / idleTime unit tests (conventions.md 2026-07-14) ─────────────

{
  // Sub-hour: 3m 10s = 190 000 ms
  const result = formatIdle(190_000);

  assert(
    'AC-2 formatIdle: < 60 min uses "Xm Ys" format',
    result === '3m 10s',
    `got "${result}"`
  );
}

{
  // Hour boundary: exactly 3 600 000 ms → 1h 0m
  const result = formatIdle(3_600_000);

  assert(
    'AC-2 formatIdle: exactly 60 min uses "Xh Ym" format (boundary)',
    result === '1h 0m',
    `got "${result}"`
  );
}

{
  // 62 min = 3 720 000 ms → 1h 2m
  const result = formatIdle(3_720_000);

  assert(
    'AC-2 formatIdle: 62 minutes returns "1h 2m"',
    result === '1h 2m',
    `got "${result}"`
  );
}

{
  // Negative input (clock skew) must not produce negative display
  const result = formatIdle(-5000);

  assert(
    'AC-2 formatIdle: negative ms (clock skew) clamped to 0 — returns "0m 0s"',
    result === '0m 0s',
    `got "${result}"`
  );
}

{
  // idleTime with null → "unknown"
  const result = idleTime(null);

  assert(
    'AC-2 idleTime: null updatedAt returns "unknown"',
    result === 'unknown',
    `got "${result}"`
  );
}

{
  // idleTime with undefined → "unknown"
  const result = idleTime(undefined);

  assert(
    'AC-2 idleTime: undefined updatedAt returns "unknown"',
    result === 'unknown',
    `got "${result}"`
  );
}

{
  // idleTime with empty string → "unknown"
  const result = idleTime('');

  assert(
    'AC-2 idleTime: empty string updatedAt returns "unknown"',
    result === 'unknown',
    `got "${result}"`
  );
}

// ─── escHtml unit tests ───────────────────────────────────────────────────────

{
  const result = escHtml('<div class="test">it\'s & fun</div>');

  assert(
    'AC-2 escHtml: escapes & to &amp;',
    result.includes('&amp;'),
    `result: "${result}"`
  );

  assert(
    'AC-2 escHtml: escapes < to &lt;',
    result.includes('&lt;'),
    `result: "${result}"`
  );

  assert(
    'AC-2 escHtml: escapes > to &gt;',
    result.includes('&gt;'),
    `result: "${result}"`
  );

  assert(
    'AC-2 escHtml: escapes " to &quot;',
    result.includes('&quot;'),
    `result: "${result}"`
  );

  assert(
    'AC-2 escHtml: escapes \' to &#39;',
    result.includes('&#39;'),
    `result: "${result}"`
  );
}

// ─── PHASE_NAMES smoke-check ──────────────────────────────────────────────────

{
  assert(
    'AC-2 PHASE_NAMES: has 10 entries',
    Array.isArray(PHASE_NAMES) && PHASE_NAMES.length === 10,
    `length: ${PHASE_NAMES && PHASE_NAMES.length}`
  );

  assert(
    'AC-2 PHASE_NAMES: phase 1 is "Product Owner"',
    PHASE_NAMES[0] === 'Product Owner',
    `PHASE_NAMES[0]: "${PHASE_NAMES[0]}"`
  );

  assert(
    'AC-2 PHASE_NAMES: phase 6 (index 5) is "QA Engineer"',
    PHASE_NAMES[5] === 'QA Engineer',
    `PHASE_NAMES[5]: "${PHASE_NAMES[5]}"`
  );

  assert(
    'AC-2 PHASE_NAMES: phase 10 (index 9) is "Release Manager"',
    PHASE_NAMES[9] === 'Release Manager',
    `PHASE_NAMES[9]: "${PHASE_NAMES[9]}"`
  );
}

// ─── generateHTML: well-formed HTML5 document ─────────────────────────────────

{
  const html = generateHTML([], 7772);

  assert(
    'AC-4 generateHTML: starts with <!DOCTYPE html>',
    html.trimStart().startsWith('<!DOCTYPE html>'),
    `first 30 chars: "${html.slice(0, 30)}"`
  );

  assert(
    'AC-4 generateHTML: contains <html lang="en">',
    html.includes('<html lang="en">'),
    `<html> tag not found`
  );

  assert(
    'AC-4 generateHTML: contains <title>Keel Pipeline Dashboard</title>',
    html.includes('<title>Keel Pipeline Dashboard</title>'),
    `title element not found`
  );
}

// ─── AC-7: keel-state.cjs status --all regression guard ───────────────────────

{
  // Build a 2-story fleet in a tmp project root
  const tmpRoot  = makeTmpDir('ac7-regression');
  const stateDir = makeStateDir(tmpRoot);

  // Init story 1 via engine
  spawnEngine(tmpRoot, 'init', 'REG-A', '--title', 'Regression story A');

  // Init story 2 via engine
  spawnEngine(tmpRoot, 'init', 'REG-B', '--title', 'Regression story B', '--scope', 'defect');

  const r = spawnEngine(tmpRoot, 'status', '--all');

  assert(
    'AC-7 regression: keel-state.cjs status --all exits 0',
    r.code === 0,
    `exit=${r.code} stderr="${r.stderr.slice(0, 200)}"`
  );

  let fleet = null;
  try { fleet = JSON.parse(r.stdout); } catch (_) { /* handled below */ }

  assert(
    'AC-7 regression: status --all output is valid JSON',
    fleet !== null,
    `stdout is not valid JSON: "${r.stdout.slice(0, 200)}"`
  );

  assert(
    'AC-7 regression: status --all returns a JSON array',
    Array.isArray(fleet),
    `expected array, got ${typeof fleet}`
  );

  assert(
    'AC-7 regression: status --all returns 2 entries for 2-story fleet',
    Array.isArray(fleet) && fleet.length === 2,
    `fleet.length=${Array.isArray(fleet) ? fleet.length : 'N/A'}`
  );

  const ra = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'REG-A') : null;
  const rb = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'REG-B') : null;

  assert(
    'AC-7 regression: REG-A entry has scope "feature"',
    ra && ra.scope === 'feature',
    `REG-A: ${JSON.stringify(ra)}`
  );

  assert(
    'AC-7 regression: REG-B entry has scope "defect"',
    rb && rb.scope === 'defect',
    `REG-B: ${JSON.stringify(rb)}`
  );

  assert(
    'AC-7 regression: each entry has exactly {story_id, scope, current_phase, halted}',
    ra && Object.keys(ra).sort().join(',') === 'current_phase,halted,scope,story_id',
    `REG-A keys: ${ra ? Object.keys(ra).sort().join(',') : 'null'}`
  );
}

{
  // AC-7: status --all on pristine tmp dir → [] (empty fleet still valid JSON array)
  const tmpRoot = makeTmpDir('ac7-empty');
  const r = spawnEngine(tmpRoot, 'status', '--all');

  assert(
    'AC-7 regression: status --all with no .keel/state emits [] and exits 0',
    r.code === 0 && r.stdout.trim() === '[]',
    `exit=${r.code} stdout="${r.stdout.slice(0, 80)}"`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KEEL-105 — Host-header allowlist (DNS-rebinding guard, ADR-004)
//
// Appended by phase 6 (tdd-red). The 70 KEEL-104 baseline tests above are the
// frozen AC-5 baseline and MUST NOT be modified.
//
// Assert-name prefix: "K105 AC-n ..." (KEEL-105 acceptance criteria — distinct
// from the KEEL-104 "AC-n" names above).
//
// Red-check hook: KEEL_DASHBOARD_MUTANT=<abs path> points ONLY the KEEL-105
// tests below at a mutated copy of keel-dashboard.cjs, so every new test can
// be proven meaningful (it must FAIL when the guard is neutered). The baseline
// tests above always run against the real module. Production source is never
// modified on disk — mutants are generated into os.tmpdir() by the phase-6
// verification run.
// ══════════════════════════════════════════════════════════════════════════════

const K105_MUTANT = process.env.KEEL_DASHBOARD_MUTANT || null;
let k105mod;
if (K105_MUTANT) {
  // A mutant copy also calls main() at require time (design debt D-6) —
  // suppress its listen() exactly like the top-of-file pattern.
  const saved = http.createServer;
  http.createServer = function (handler) {
    const srv = _realCreateServer(handler);
    srv.listen = function () { return srv; };
    return srv;
  };
  k105mod = require(K105_MUTANT);
  http.createServer = saved;
} else {
  k105mod = require(DASHBOARD); // cache hit — real module already loaded above
}

const k105IsAllowedHost  = k105mod.isAllowedHost;
const k105StartDashboard = k105mod.startDashboard;

/**
 * Captures the request handler that startDashboard registers, without ever
 * binding a port. Returns { handler, listenArgs }.
 */
function k105Capture(stateDir, port) {
  let handler    = null;
  let listenArgs = null;
  const saved = http.createServer;
  http.createServer = (h) => {
    handler = h;
    return {
      on()           { return this; },
      listen(...a)   { listenArgs = a; return this; },
    };
  };
  k105StartDashboard({ port: port || 7772, stateDir });
  http.createServer = saved;
  return { handler, listenArgs };
}

/** Minimal ServerResponse double — records status, headers, body. */
function k105MakeRes() {
  return {
    statusCode: null,
    headers:    null,
    body:       '',
    ended:      false,
    writeHead(status, headers) { this.statusCode = status; this.headers = headers || {}; },
    end(chunk)                 { if (chunk !== undefined) this.body += String(chunk); this.ended = true; },
  };
}

/** Runs the captured handler once against a fake req; returns the res double. */
function k105Dispatch(stateDir, req) {
  const { handler } = k105Capture(stateDir);
  const res = k105MakeRes();
  handler(req, res);
  return res;
}

// Shared fixture: a state dir with one story, so the 200 path renders content.
const k105Tmp      = makeTmpDir('k105-handler');
const k105StateDir = makeStateDir(k105Tmp);
writeManifest(k105StateDir, {
  story_id:      'K105-S1',
  title:         'Host guard fixture story',
  updated_at:    '2026-07-16T00:00:00.000Z',
  current_phase: 6,
});

// ─── K105 AC-1: isAllowedHost() export + predicate table ─────────────────────

{
  assert(
    'K105 AC-1 isAllowedHost: exported as a function from keel-dashboard.cjs',
    typeof k105IsAllowedHost === 'function',
    `typeof isAllowedHost === ${typeof k105IsAllowedHost}`
  );
}

{
  // Allowed loopback literals — case-insensitive, optional 1-5 digit port.
  const allow = [
    'localhost',
    'LOCALHOST',
    'Localhost:7772',
    'localhost:7772',
    '127.0.0.1',
    '127.0.0.1:65535',
    '[::1]',
    '[::1]:80',
    '[::1]:99999', // syntax-only port check (ADR-004 D-2, documented)
  ];
  for (const h of allow) {
    assert(
      `K105 AC-1 isAllowedHost: allows "${h}"`,
      k105IsAllowedHost(h) === true,
      `isAllowedHost("${h}") returned false — loopback literal over-blocked`
    );
  }
}

{
  // Fail-closed rejects — rebinding/suffix/userinfo/malformed forms.
  const reject = [
    '::1',                 // unbracketed IPv6
    '[0:0:0:0:0:0:0:1]',   // expanded IPv6 (no canonicalization by design)
    'localhost:',          // empty port
    'localhost:abc',       // alpha port
    'localhost:123456',    // 6-digit port
    'localhost:7772:80',   // double port
    'evil.com',
    'evil.com:7772',
    'localhost.evil.com',  // DNS-rebinding suffix attack
    '127.0.0.1.evil.com',  // DNS-rebinding suffix attack
    'user@localhost',      // userinfo
    'localhost.',          // trailing dot
    '[::1',                // unterminated bracket
    '[::1]x',              // trailing junk
    '',                    // empty string
    ' localhost',          // leading whitespace
    'localhost ',          // trailing whitespace
    '127.0.0.2',           // non-127.0.0.1 loopback (no canonicalization)
    '0x7f.0.0.1',          // hex-octet loopback encoding
  ];
  for (const h of reject) {
    assert(
      `K105 AC-1 isAllowedHost: rejects "${h}"`,
      k105IsAllowedHost(h) === false,
      `isAllowedHost("${h}") returned true — fail-closed contract broken`
    );
  }
}

{
  // Non-string inputs must return false (never throw).
  const nonStrings = [
    ['undefined', undefined],
    ['null',      null],
    ['number',    12700],
    ['object',    { host: 'localhost' }],
    ['array',     ['localhost']],
  ];
  for (const [label, v] of nonStrings) {
    let result = null;
    let threw  = false;
    try { result = k105IsAllowedHost(v); } catch (_) { threw = true; }
    assert(
      `K105 AC-1 isAllowedHost: non-string input (${label}) returns false without throwing`,
      !threw && result === false,
      threw ? 'threw an exception' : `returned ${result}`
    );
  }
}

// ─── K105 AC-3: missing Host header → 400 Bad Request ────────────────────────

{
  const res = k105Dispatch(k105StateDir, { method: 'GET', url: '/', headers: {} });

  assert(
    'K105 AC-3 handler: missing Host header returns status 400',
    res.statusCode === 400,
    `status=${res.statusCode}`
  );

  assert(
    'K105 AC-3 handler: missing-Host body is exactly "Bad Request"',
    res.body === 'Bad Request',
    `body="${res.body}"`
  );

  assert(
    'K105 AC-3 handler: 400 response has Content-Type text/plain; charset=utf-8',
    res.headers && res.headers['Content-Type'] === 'text/plain; charset=utf-8',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-3 handler: 400 response has X-Content-Type-Options nosniff',
    res.headers && res.headers['X-Content-Type-Options'] === 'nosniff',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-3 handler: 400 response has Cache-Control no-store',
    res.headers && res.headers['Cache-Control'] === 'no-store',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-3 handler: 400 response sends exactly 3 headers',
    res.headers && Object.keys(res.headers).length === 3,
    `header keys: ${res.headers ? Object.keys(res.headers).join(',') : 'null'}`
  );
}

// ─── K105 AC-2: disallowed Host → 403 Forbidden ───────────────────────────────

{
  const res = k105Dispatch(k105StateDir, {
    method: 'GET', url: '/', headers: { host: 'evil.com' },
  });

  assert(
    'K105 AC-2 handler: Host evil.com returns status 403',
    res.statusCode === 403,
    `status=${res.statusCode}`
  );

  assert(
    'K105 AC-2 handler: 403 body is exactly "Forbidden"',
    res.body === 'Forbidden',
    `body="${res.body}"`
  );

  assert(
    'K105 AC-2 handler: 403 response has Content-Type text/plain; charset=utf-8',
    res.headers && res.headers['Content-Type'] === 'text/plain; charset=utf-8',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-2 handler: 403 response has X-Content-Type-Options nosniff',
    res.headers && res.headers['X-Content-Type-Options'] === 'nosniff',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-2 handler: 403 response has Cache-Control no-store',
    res.headers && res.headers['Cache-Control'] === 'no-store',
    `headers=${JSON.stringify(res.headers)}`
  );

  assert(
    'K105 AC-2 handler: 403 response sends exactly 3 headers',
    res.headers && Object.keys(res.headers).length === 3,
    `header keys: ${res.headers ? Object.keys(res.headers).join(',') : 'null'}`
  );
}

// K105 AC-2: rejection echoes zero request data (Host, URL, method)
{
  const res = k105Dispatch(k105StateDir, {
    method: 'POST',
    url:    '/probe-url-marker?q=echo-canary',
    headers: { host: 'evil-echo-check.example' },
  });

  const surface = res.body + JSON.stringify(res.headers);

  assert(
    'K105 AC-2 handler: rejection body/headers echo no Host value',
    res.statusCode === 403 && !surface.includes('evil-echo-check'),
    `status=${res.statusCode} surface="${surface}"`
  );

  assert(
    'K105 AC-2 handler: rejection body/headers echo no request URL',
    !surface.includes('probe-url-marker') && !surface.includes('echo-canary'),
    `surface="${surface}"`
  );
}

// K105 AC-2: renderer is unreachable on rejection — readStories never entered
// (its first statement is fs.existsSync(stateDirPath)), and the body is not HTML.
{
  const { handler } = k105Capture(k105StateDir);
  const res = k105MakeRes();

  const realExists = fs.existsSync;
  let stateDirTouched = false;
  fs.existsSync = (p) => {
    if (String(p) === k105StateDir) stateDirTouched = true;
    return realExists(p);
  };
  handler({ method: 'GET', url: '/', headers: { host: 'evil.com' } }, res);
  fs.existsSync = realExists;

  assert(
    'K105 AC-2 handler: readStories() is NOT invoked on rejection (stateDir never touched)',
    stateDirTouched === false,
    'fs.existsSync(stateDir) was called during a rejected request'
  );

  assert(
    'K105 AC-2 handler: rejection body contains no HTML (generateHTML unreachable)',
    !res.body.includes('<!DOCTYPE') && !res.body.includes('<html'),
    `body="${res.body.slice(0, 120)}"`
  );
}

// K105 AC-2: empty-string Host is present-but-invalid → 403 (not 400)
{
  const res = k105Dispatch(k105StateDir, { method: 'GET', url: '/', headers: { host: '' } });

  assert(
    'K105 AC-2 handler: empty-string Host returns 403 (present but disallowed)',
    res.statusCode === 403 && res.body === 'Forbidden',
    `status=${res.statusCode} body="${res.body}"`
  );
}

// K105 AC-2: guard precedes routing — bad Host + non-/ path → 403, not 404
{
  const res = k105Dispatch(k105StateDir, {
    method: 'GET', url: '/nope', headers: { host: 'evil.com:7772' },
  });

  assert(
    'K105 AC-2 handler: bad Host + non-/ path returns 403 not 404 (guard before routing)',
    res.statusCode === 403,
    `status=${res.statusCode} body="${res.body}"`
  );
}

// ─── K105 AC-1/AC-4: allowed hosts still reach the renderer unchanged ────────

{
  const res = k105Dispatch(k105StateDir, {
    method: 'GET', url: '/', headers: { host: 'localhost:7772' },
  });

  assert(
    'K105 AC-1 handler: Host localhost:7772 returns 200',
    res.statusCode === 200,
    `status=${res.statusCode}`
  );

  assert(
    'K105 AC-1 handler: 200 body is the dashboard HTML with fixture story',
    res.body.includes('<!DOCTYPE html>') && res.body.includes('K105-S1'),
    `body starts "${res.body.slice(0, 60)}"`
  );

  assert(
    'K105 AC-4 handler: 200-path headers unchanged (text/html, no-store, nosniff)',
    res.headers &&
      res.headers['Content-Type'] === 'text/html; charset=utf-8' &&
      res.headers['Cache-Control'] === 'no-store' &&
      res.headers['X-Content-Type-Options'] === 'nosniff',
    `headers=${JSON.stringify(res.headers)}`
  );
}

// K105 AC-1: case-insensitive host part end-to-end through the handler
{
  const res = k105Dispatch(k105StateDir, {
    method: 'GET', url: '/', headers: { host: 'LOCALHOST:7772' },
  });

  assert(
    'K105 AC-1 handler: Host LOCALHOST:7772 (uppercase) returns 200',
    res.statusCode === 200,
    `status=${res.statusCode} body="${res.body.slice(0, 60)}"`
  );
}

// K105 AC-4: valid Host + unknown path still hits the unchanged 404 branch
{
  const res = k105Dispatch(k105StateDir, {
    method: 'GET', url: '/nope', headers: { host: '127.0.0.1:7772' },
  });

  assert(
    'K105 AC-4 handler: valid Host + /nope returns 404 "Not found" (baseline branch intact)',
    res.statusCode === 404 && res.body === 'Not found',
    `status=${res.statusCode} body="${res.body}"`
  );
}

// K105 AC-4: server still binds loopback only
{
  const { listenArgs } = k105Capture(k105StateDir, 7772);

  assert(
    'K105 AC-4 startDashboard: listen() binds 127.0.0.1 (loopback-only invariant)',
    Array.isArray(listenArgs) && listenArgs[0] === 7772 && listenArgs[1] === '127.0.0.1',
    `listen args: ${JSON.stringify(listenArgs)}`
  );
}

// K105 AC-4: rejection path performs zero fs writes
{
  const { handler } = k105Capture(k105StateDir);
  const res = k105MakeRes();

  const spies = ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'renameSync'];
  const saved = {};
  let wrote = null;
  for (const fn of spies) {
    saved[fn] = fs[fn];
    fs[fn] = (...a) => { wrote = `${fn}(${String(a[0])})`; return saved[fn](...a); };
  }
  handler({ method: 'GET', url: '/', headers: { host: 'evil.com' } }, res);
  for (const fn of spies) fs[fn] = saved[fn];

  assert(
    'K105 AC-4 handler: rejection performs zero fs writes (zero-fs-writes invariant)',
    wrote === null && res.statusCode === 403,
    `fs write detected: ${wrote}; status=${res.statusCode}`
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} / ${results.length} passed`);
if (failed.length) {
  console.log('\nFailed tests:');
  failed.forEach((r) => console.log(`  FAIL  ${r.name}  <-- ${r.detail}`));
}
process.exit(failed.length ? 1 : 0);
