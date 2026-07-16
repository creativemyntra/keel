#!/usr/bin/env node
/**
 * keel-state-describe-e2e.test.cjs
 *
 * Phase-8 E2E subprocess tests for the `describe` command (KEEL-103).
 *
 * These tests differ from keel-state-describe.test.cjs (phase-7 unit tests):
 *   - They spawn `scripts/keel-state.cjs` against the REAL project state, not
 *     isolated tmp fixtures.
 *   - They validate the full stack: CLI dispatch, manifest read, AGENTS lookup,
 *     idle-time formatting — all in one process boundary.
 *   - They save captured output to docs/e2e-evidence/KEEL-103/ as evidence.
 *   - They check stderr for unexpected errors (console-error analogue for CLI).
 *
 * AC coverage:
 *   AC-1  describe <existing-story> → human-readable summary, exit 0
 *   AC-2  describe <missing-story>  → stderr error message, exit 1
 *   AC-3  idle time shown as "Xh Ym" or "Xm Ys"
 *   AC-4  phase names shown (AGENTS array), not just numbers
 *   AC-5  status --all output unchanged (regression guard)
 *
 * Run:  node tests/keel-state-describe-e2e.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const REPO_ROOT  = path.resolve(__dirname, '..');
const ENGINE     = path.join(REPO_ROOT, 'scripts', 'keel-state.cjs');
const EVIDENCE   = path.join(REPO_ROOT, 'docs', 'e2e-evidence', 'KEEL-103');

// Ensure evidence directory exists before any test writes to it.
fs.mkdirSync(EVIDENCE, { recursive: true });

const results = [];

/**
 * Spawn the engine in the given cwd (defaults to repo root) and return
 * { code, stdout, stderr }.  Encoding is utf8; no shell wrapping.
 */
function engine(cwd, ...cliArgs) {
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], {
    cwd: cwd || REPO_ROOT,
    encoding: 'utf8',
  });
  return {
    code:   r.status,
    stdout: r.stdout  || '',
    stderr: r.stderr  || '',
  };
}

function assert(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass, detail: pass ? '' : (detail || 'assertion failed') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

/**
 * Save captured output to a file in docs/e2e-evidence/KEEL-103/.
 * Returns the full path written.
 */
function saveEvidence(filename, content) {
  const p = path.join(EVIDENCE, filename);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ---------------------------------------------------------------------------
// AC-1: describe <existing-story> → human-readable summary, exit 0
//
// Uses the real KEEL-103 story that is currently in progress so we exercise
// the full chain: manifest.json read, phase-file enumeration, AGENTS lookup,
// idle-time calculation, gate-events display.
// ---------------------------------------------------------------------------

console.log('\n--- AC-1: describe existing story (KEEL-103 live) ---');
{
  const r = engine(REPO_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac1-happy-path-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert(
    'AC-1 live describe: exit code is 0',
    r.code === 0,
    `exit=${r.code}  stderr="${r.stderr.slice(0, 200)}"`
  );

  assert(
    'AC-1 live describe: stdout contains story ID KEEL-103',
    r.stdout.includes('KEEL-103'),
    `stdout does not contain "KEEL-103":\n${r.stdout.slice(0, 300)}`
  );

  assert(
    'AC-1 live describe: stdout contains separator line',
    r.stdout.includes('---'),
    `separator "---" missing from stdout:\n${r.stdout.slice(0, 300)}`
  );

  const requiredLabels = ['Scope:', 'Current phase:', 'Halted:', 'Idle:', 'Started:'];
  for (const label of requiredLabels) {
    assert(
      `AC-1 live describe: stdout contains label "${label}"`,
      r.stdout.includes(label),
      `label "${label}" missing:\n${r.stdout.slice(0, 400)}`
    );
  }

  assert(
    'AC-1 live describe: stdout contains "Completed phases:" section',
    r.stdout.includes('Completed phases:'),
    `"Completed phases:" missing:\n${r.stdout.slice(0, 400)}`
  );

  assert(
    'AC-1 live describe: stdout contains "Gate events used:" line',
    r.stdout.includes('Gate events used:'),
    `"Gate events used:" missing:\n${r.stdout.slice(0, 400)}`
  );

  // No unexpected stderr on happy path.
  assert(
    'AC-1 live describe: stderr is empty on success (no unexpected error output)',
    r.stderr.trim() === '',
    `unexpected stderr: "${r.stderr.slice(0, 300)}"`
  );
}

// ---------------------------------------------------------------------------
// AC-2: describe <missing-story> → stderr error, stdout empty, exit 1
// ---------------------------------------------------------------------------

console.log('\n--- AC-2: describe missing story ---');
{
  const r = engine(REPO_ROOT, 'describe', 'KEEL-DOES-NOT-EXIST');

  saveEvidence('ac2-missing-story-output.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert(
    'AC-2 missing story: exit code is 1',
    r.code === 1,
    `exit=${r.code}`
  );

  assert(
    'AC-2 missing story: stderr contains "FAIL: no manifest for story"',
    r.stderr.includes('FAIL: no manifest for story'),
    `stderr: "${r.stderr.slice(0, 300)}"`
  );

  assert(
    'AC-2 missing story: stderr contains the requested story ID',
    r.stderr.includes('KEEL-DOES-NOT-EXIST'),
    `stderr did not echo the story ID: "${r.stderr.slice(0, 300)}"`
  );

  // The error path must NOT produce a stack trace — it should use the die()
  // helper which writes a clean "FAIL:" prefix.  A stack trace would contain
  // "at cmdDescribe" or "Error:" tokens.
  assert(
    'AC-2 missing story: stderr is a clean FAIL message (no unhandled throw / stack trace)',
    !r.stderr.includes('at cmdDescribe') && !r.stderr.includes('Error:'),
    `stderr looks like a stack trace: "${r.stderr.slice(0, 300)}"`
  );

  assert(
    'AC-2 missing story: stdout is empty',
    r.stdout.trim() === '',
    `stdout should be empty on error path:\n"${r.stdout.slice(0, 200)}"`
  );
}

// ---------------------------------------------------------------------------
// AC-3: idle time format — live story must show either "Xh Ym" or "Xm Ys"
//
// KEEL-103 was started hours ago so we expect the "Xh Ym" branch.
// We also verify the format with a fixture story set to a sub-60-minute age.
// ---------------------------------------------------------------------------

console.log('\n--- AC-3: idle time formatting (live + fixture) ---');

// 3a: Live KEEL-103 — expect "Xh Ym" since the story is many hours old.
{
  const r = engine(REPO_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac3-idle-live-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  const hourPattern   = /\d+h \d+m/;
  const minutePattern = /\d+m \d+s/;

  assert(
    'AC-3 live idle format: Idle line shows either "Xh Ym" or "Xm Ys"',
    hourPattern.test(r.stdout) || minutePattern.test(r.stdout),
    `neither "Xh Ym" nor "Xm Ys" found in stdout:\n${r.stdout.slice(0, 400)}`
  );

  // KEEL-103 was initialized at 05:11 today and current time is well past 06:11,
  // so we can assert the hour-format branch is active.
  assert(
    'AC-3 live idle format: KEEL-103 age > 60 min → shows "Xh Ym"',
    hourPattern.test(r.stdout),
    `expected "Xh Ym" for a story that is hours old:\n${r.stdout.slice(0, 400)}`
  );
}

// 3b: Fixture story — set updated_at to 3 minutes ago → must use "Xm Ys".
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-e2e-ac3-'));
  const r0 = engine(tmpDir, 'init', 'E2E-AC3', '--title', 'AC-3 idle fixture');

  // Patch updated_at to exactly 3 minutes 30 seconds ago.
  const mfPath = path.join(tmpDir, '.keel', 'state', 'E2E-AC3', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.updated_at = new Date(Date.now() - (3 * 60 + 30) * 1000).toISOString();
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(tmpDir, 'describe', 'E2E-AC3');

  saveEvidence('ac3-idle-subhour-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert(
    'AC-3 fixture sub-hour: "Xm Ys" format used for 3m30s idle',
    /\d+m \d+s/.test(r.stdout),
    `"Xm Ys" not found for sub-hour idle:\n${r.stdout.slice(0, 400)}`
  );

  assert(
    'AC-3 fixture sub-hour: "Xh Ym" NOT used for 3m30s idle',
    !/\d+h \d+m/.test(r.stdout),
    `"Xh Ym" should not appear for sub-hour idle:\n${r.stdout.slice(0, 400)}`
  );
}

// 3c: Fixture story — set updated_at to exactly 62 minutes ago → "1h 2m".
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-e2e-ac3b-'));
  engine(tmpDir, 'init', 'E2E-AC3B', '--title', 'AC-3 hour boundary fixture');

  const mfPath = path.join(tmpDir, '.keel', 'state', 'E2E-AC3B', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.updated_at = new Date(Date.now() - 62 * 60 * 1000).toISOString();
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(tmpDir, 'describe', 'E2E-AC3B');

  saveEvidence('ac3-idle-hour-boundary-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert(
    'AC-3 fixture 62-min boundary: output contains "1h 2m"',
    r.stdout.includes('1h 2m'),
    `expected "1h 2m":\n${r.stdout.slice(0, 400)}`
  );
}

// ---------------------------------------------------------------------------
// AC-4: phase names shown — not just numbers
//
// Live KEEL-103 output must contain agent names in completed phases and the
// in-progress / remaining sections.
// ---------------------------------------------------------------------------

console.log('\n--- AC-4: phase names from AGENTS array ---');
{
  const r = engine(REPO_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac4-phase-names-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  // Completed phases — must list agent names, not bare numbers.
  const expectedCompletedAgents = [
    'product-owner',
    'business-analyst',
    'solution-architect',
    'software-engineer',
    'tdd-red',
    'tdd-green',
    'qa-engineer',
  ];

  for (const name of expectedCompletedAgents) {
    assert(
      `AC-4 phase names: completed phase shows agent name "${name}"`,
      r.stdout.includes(name),
      `agent name "${name}" missing from stdout:\n${r.stdout.slice(0, 500)}`
    );
  }

  // In-progress phase must be "e2e-engineer" (current_phase = 8).
  assert(
    'AC-4 phase names: in-progress phase shows "e2e-engineer" (AGENTS[7])',
    r.stdout.includes('e2e-engineer'),
    `"e2e-engineer" not found in in-progress section:\n${r.stdout.slice(0, 500)}`
  );

  // Remaining phases must include agent names, not just numbers.
  assert(
    'AC-4 phase names: remaining phases include "security-engineer"',
    r.stdout.includes('security-engineer'),
    `"security-engineer" not found in remaining:\n${r.stdout.slice(0, 500)}`
  );

  assert(
    'AC-4 phase names: remaining phases include "technical-writer"',
    r.stdout.includes('technical-writer'),
    `"technical-writer" not found in remaining:\n${r.stdout.slice(0, 500)}`
  );

  assert(
    'AC-4 phase names: remaining phases include "release-manager"',
    r.stdout.includes('release-manager'),
    `"release-manager" not found in remaining:\n${r.stdout.slice(0, 500)}`
  );
}

// ---------------------------------------------------------------------------
// AC-5: status --all regression guard — JSON shape and exit code unchanged
// ---------------------------------------------------------------------------

console.log('\n--- AC-5: status --all regression guard (live fleet) ---');
{
  const r = engine(REPO_ROOT, 'status', '--all');

  saveEvidence('ac5-status-all-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert(
    'AC-5 regression: status --all exits 0',
    r.code === 0,
    `exit=${r.code}  stderr="${r.stderr.slice(0, 160)}"`
  );

  let fleet = null;
  try { fleet = JSON.parse(r.stdout); } catch (e) { /* assert below handles it */ }

  assert(
    'AC-5 regression: status --all output is valid JSON',
    fleet !== null,
    `stdout is not valid JSON:\n${r.stdout.slice(0, 300)}`
  );

  assert(
    'AC-5 regression: status --all returns a JSON array',
    Array.isArray(fleet),
    `expected array, got ${typeof fleet}`
  );

  // Live fleet has KEEL-101, KEEL-102, KEEL-103 — at least 3 entries.
  assert(
    'AC-5 regression: status --all returns >= 3 stories (KEEL-101/102/103)',
    Array.isArray(fleet) && fleet.length >= 3,
    `fleet.length=${Array.isArray(fleet) ? fleet.length : 'N/A'}`
  );

  // Each entry must project exactly the 4 documented fields: no extra, no missing.
  const expectedKeys = ['current_phase', 'halted', 'scope', 'story_id'];
  for (const entry of (fleet || [])) {
    const keys = Object.keys(entry).sort();
    assert(
      `AC-5 regression: story ${entry.story_id || '?'} has exactly {story_id,scope,current_phase,halted}`,
      keys.join(',') === expectedKeys.join(','),
      `keys=${keys.join(',')} expected=${expectedKeys.join(',')}`
    );
  }

  // KEEL-103 entry must reflect feature scope and mirror the live manifest.
  // KEEL-103 is real, moving state — compare current_phase against the
  // manifest on disk, not a hardcoded number that goes stale as it advances.
  const keel103 = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'KEEL-103') : null;
  assert(
    'AC-5 regression: KEEL-103 entry has scope=feature',
    keel103 && keel103.scope === 'feature',
    `KEEL-103 entry: ${JSON.stringify(keel103)}`
  );

  const keel103Manifest = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, '.keel', 'state', 'KEEL-103', 'manifest.json'), 'utf8'
  ));
  assert(
    'AC-5 regression: KEEL-103 entry current_phase matches live manifest',
    keel103 && keel103.current_phase === keel103Manifest.current_phase,
    `KEEL-103.current_phase=${keel103 ? keel103.current_phase : 'N/A'} manifest=${keel103Manifest.current_phase}`
  );

  assert(
    'AC-5 regression: KEEL-103 entry has halted=false',
    keel103 && keel103.halted === false,
    `KEEL-103.halted=${keel103 ? keel103.halted : 'N/A'}`
  );

  // Entries must be sorted alphabetically by story_id.
  const ids = Array.isArray(fleet) ? fleet.map((s) => s.story_id) : [];
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  assert(
    'AC-5 regression: entries are sorted alphabetically by story_id',
    ids.join(',') === sorted.join(','),
    `order=${ids.join(',')} expected=${sorted.join(',')}`
  );

  // No unexpected stderr when status --all succeeds.
  assert(
    'AC-5 regression: stderr is empty on successful status --all',
    r.stderr.trim() === '',
    `unexpected stderr: "${r.stderr.slice(0, 200)}"`
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const failed  = results.filter((r) => !r.pass);
const total   = results.length;
const passing = total - failed.length;

// Write a summary evidence file that records the final pass/fail tally and
// the full list of test names — equivalent to a browser "screenshot" for CLI.
const summaryLines = [
  `KEEL-103 E2E subprocess test run — ${new Date().toISOString()}`,
  `Node: ${process.version}   Engine: ${ENGINE}`,
  '',
  `Result: ${passing} / ${total} passed`,
  '',
  ...results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  <-- ' + r.detail}`),
];
saveEvidence('e2e-summary.txt', summaryLines.join('\n') + '\n');

console.log(`\n${passing} / ${total} passed`);
if (failed.length) {
  console.log('\nFailed tests:');
  failed.forEach((r) => console.log(`  FAIL  ${r.name}  <-- ${r.detail}`));
}
process.exit(failed.length ? 1 : 0);
